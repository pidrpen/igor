/*
 * Mythic Key — лаунчер.
 *
 * 1. Спрашивает у GitHub, какой сейчас последний коммит ветки и какие в нём файлы.
 * 2. Докачивает только изменённые файлы игры в %LOCALAPPDATA%\MythicKey\<канал>\game
 *    (каждый файл сверяется по git-хешу, битый не сохраняется).
 * 3. Если в репозитории новый launcher/MythicKey.exe — обновляет сам себя.
 * 4. Поднимает локальный сервер 127.0.0.1 (спрайтам и Phaser нужен http, не file://)
 *    и открывает игру отдельным окном Edge (Chrome — запасной).
 * Нет интернета — запускает то, что уже скачано.
 *
 * Сборка: sh launcher/build.sh (mingw-w64). Права администратора не нужны.
 */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#define WIN32_LEAN_AND_MEAN
#define _WIN32_WINNT 0x0601
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <winhttp.h>
#include <bcrypt.h>
#include <shlobj.h>
#include <shellapi.h>
#include <commctrl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include "version.h"

#define REPO_OWNER "pidrpen"
#define REPO_NAME "igor"
#define SELF_IN_REPO "launcher/MythicKey.exe"
#define WORKERS 4

#ifndef WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY
#define WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY 4
#endif
#ifndef WINHTTP_OPTION_SECURE_PROTOCOLS
#define WINHTTP_OPTION_SECURE_PROTOCOLS 84
#endif
#ifndef WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2
#define WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2 0x00000800
#endif
#ifndef WINHTTP_OPTION_REDIRECT_POLICY
#define WINHTTP_OPTION_REDIRECT_POLICY 88
#endif
#ifndef WINHTTP_OPTION_REDIRECT_POLICY_ALWAYS
#define WINHTTP_OPTION_REDIRECT_POLICY_ALWAYS 2
#endif

/* ───────────── настройки (launcher.ini рядом с exe, всё необязательно) ───────────── */
static char g_branch[64] = "main";
static char g_channel[16] = "test";  /* test = папка Тест/, main = основа (корень) */
static char g_testBase[256] = "";    /* для проверки: http://127.0.0.1:8123 вместо GitHub */
static int g_port = 0;               /* 0 = по каналу: тест 47619, основа 47620 */
static int g_noSelfUpdate = 0;
static int g_headless = 0;           /* --headless: без окна, только журнал (для проверок) */
static int g_noBrowser = 0;          /* --no-browser: скачать и держать сервер */

static wchar_t g_exePath[MAX_PATH], g_exeDir[MAX_PATH];
static wchar_t g_root[MAX_PATH];     /* %LOCALAPPDATA%\MythicKey */
static wchar_t g_chanDir[MAX_PATH];  /* ...\test или ...\main */
static wchar_t g_gameDir[MAX_PATH];  /* ...\game */
static wchar_t g_logPath[MAX_PATH];

/* ───────────── журнал и состояние окна ───────────── */
static CRITICAL_SECTION g_cs;
static wchar_t g_status[256] = L"Запуск…";
static wchar_t g_detail[256] = L"";
static volatile LONG g_pct = 0;
static HWND g_wnd, g_wStatus, g_wDetail, g_wBar, g_wBtnOpen, g_wBtnClose;
static volatile LONG g_phase = 0; /* 0 проверка, 1 игра открыта, 2 ошибка */
#define WM_APP_REFRESH (WM_APP + 1)
#define WM_APP_READY (WM_APP + 2)
#define WM_APP_FAIL (WM_APP + 3)
#define WM_APP_BROWSER_GONE (WM_APP + 4)

static void logw(const wchar_t *fmt, ...) {
  wchar_t line[1024];
  va_list ap;
  va_start(ap, fmt);
  _vsnwprintf(line, 1023, fmt, ap);
  va_end(ap);
  line[1023] = 0;
  SYSTEMTIME st;
  GetLocalTime(&st);
  char u8[3200];
  int n = snprintf(u8, 40, "%04d-%02d-%02d %02d:%02d:%02d  ", st.wYear, st.wMonth, st.wDay, st.wHour,
                   st.wMinute, st.wSecond);
  n += WideCharToMultiByte(CP_UTF8, 0, line, -1, u8 + n, (int)sizeof(u8) - n - 2, NULL, NULL) - 1;
  u8[n++] = '\r';
  u8[n++] = '\n';
  EnterCriticalSection(&g_cs);
  if (g_logPath[0]) {
    HANDLE h = CreateFileW(g_logPath, FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL,
                           OPEN_ALWAYS, 0, NULL);
    if (h != INVALID_HANDLE_VALUE) {
      DWORD w;
      WriteFile(h, u8, (DWORD)n, &w, NULL);
      CloseHandle(h);
    }
  }
  LeaveCriticalSection(&g_cs);
  if (g_headless) {
    fwrite(u8, 1, (size_t)n, stdout);
    fflush(stdout);
  }
}

static void set_status(const wchar_t *status, const wchar_t *detail) {
  EnterCriticalSection(&g_cs);
  if (status) lstrcpynW(g_status, status, 256);
  if (detail) lstrcpynW(g_detail, detail, 256);
  LeaveCriticalSection(&g_cs);
  if (status) logw(L"%s%s%s", status, (detail && detail[0]) ? L" — " : L"", detail ? detail : L"");
  if (g_wnd) PostMessageW(g_wnd, WM_APP_REFRESH, 0, 0);
}

/* ───────────── строки и пути ───────────── */
static void u8_to_w(const char *s, wchar_t *out, int cap) {
  if (!MultiByteToWideChar(CP_UTF8, 0, s, -1, out, cap)) out[0] = 0;
}
static void w_to_u8(const wchar_t *s, char *out, int cap) {
  if (!WideCharToMultiByte(CP_UTF8, 0, s, -1, out, cap, NULL, NULL)) out[0] = 0;
}

/* путь из репозитория (UTF-8, через /) → полный путь на диске */
static int rel_to_disk(const wchar_t *base, const char *rel, wchar_t *out, int cap) {
  wchar_t w[MAX_PATH];
  u8_to_w(rel, w, MAX_PATH);
  if (!w[0]) return 0;
  for (wchar_t *p = w; *p; p++)
    if (*p == L'/') *p = L'\\';
  if (_snwprintf(out, cap, L"%s\\%s", base, w) >= cap - 1) return 0;
  out[cap - 1] = 0;
  return 1;
}

static void make_dirs_for(const wchar_t *file) {
  wchar_t tmp[MAX_PATH];
  lstrcpynW(tmp, file, MAX_PATH);
  for (wchar_t *p = tmp + 3; *p; p++) {
    if (*p == L'\\') {
      *p = 0;
      CreateDirectoryW(tmp, NULL);
      *p = L'\\';
    }
  }
}

/* в репозитории не должно быть «..», но сервер и загрузчик не верят на слово */
static int rel_is_safe(const char *rel) {
  if (!rel[0] || rel[0] == '/' || strchr(rel, '\\') || strchr(rel, ':')) return 0;
  const char *p = rel;
  while (*p) {
    const char *seg = p;
    while (*p && *p != '/') p++;
    size_t n = (size_t)(p - seg);
    if (n == 0 || (n == 2 && seg[0] == '.' && seg[1] == '.') || (n == 1 && seg[0] == '.')) return 0;
    if (*p == '/') p++;
  }
  return 1;
}

/* ───────────── SHA-1 в формате git blob ───────────── */
static int git_blob_sha(const unsigned char *data, DWORD len, char out[41]) {
  BCRYPT_ALG_HANDLE alg = NULL;
  BCRYPT_HASH_HANDLE h = NULL;
  unsigned char dig[20];
  char hdr[40];
  int hl = snprintf(hdr, sizeof(hdr), "blob %lu", (unsigned long)len) + 1; /* с нулём */
  int ok = 0;
  if (BCryptOpenAlgorithmProvider(&alg, BCRYPT_SHA1_ALGORITHM, NULL, 0) != 0) return 0;
  if (BCryptCreateHash(alg, &h, NULL, 0, NULL, 0, 0) == 0 &&
      BCryptHashData(h, (PUCHAR)hdr, (ULONG)hl, 0) == 0 &&
      (len == 0 || BCryptHashData(h, (PUCHAR)data, len, 0) == 0) &&
      BCryptFinishHash(h, dig, 20, 0) == 0) {
    for (int i = 0; i < 20; i++) snprintf(out + i * 2, 3, "%02x", dig[i]);
    ok = 1;
  }
  if (h) BCryptDestroyHash(h);
  BCryptCloseAlgorithmProvider(alg, 0);
  return ok;
}

static unsigned char *read_file(const wchar_t *path, DWORD *len) {
  HANDLE f = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_DELETE, NULL, OPEN_EXISTING, 0, NULL);
  if (f == INVALID_HANDLE_VALUE) return NULL;
  LARGE_INTEGER sz;
  if (!GetFileSizeEx(f, &sz) || sz.QuadPart > 512LL * 1024 * 1024) {
    CloseHandle(f);
    return NULL;
  }
  unsigned char *buf = (unsigned char *)malloc((size_t)sz.QuadPart + 1);
  DWORD got = 0;
  if (!buf || !ReadFile(f, buf, (DWORD)sz.QuadPart, &got, NULL) || got != (DWORD)sz.QuadPart) {
    free(buf);
    CloseHandle(f);
    return NULL;
  }
  buf[got] = 0;
  CloseHandle(f);
  *len = got;
  return buf;
}

static int write_file_atomic(const wchar_t *path, const unsigned char *data, DWORD len) {
  wchar_t tmp[MAX_PATH];
  _snwprintf(tmp, MAX_PATH, L"%s.part", path);
  tmp[MAX_PATH - 1] = 0;
  make_dirs_for(path);
  HANDLE f = CreateFileW(tmp, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, NULL);
  if (f == INVALID_HANDLE_VALUE) return 0;
  DWORD w = 0;
  BOOL ok = len == 0 || WriteFile(f, data, len, &w, NULL);
  CloseHandle(f);
  if (!ok || w != len) {
    DeleteFileW(tmp);
    return 0;
  }
  if (!MoveFileExW(tmp, path, MOVEFILE_REPLACE_EXISTING)) {
    DeleteFileW(tmp);
    return 0;
  }
  return 1;
}

/* ───────────── HTTP(S) через WinHTTP ───────────── */
static HINTERNET http_session(void) {
  HINTERNET s = WinHttpOpen(L"MythicKeyLauncher/" LAUNCHER_VERSION_W, WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
                            WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
  if (!s)
    s = WinHttpOpen(L"MythicKeyLauncher/" LAUNCHER_VERSION_W, WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                    WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
  if (!s) return NULL;
  DWORD proto = WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2;
#ifdef WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_3
  proto |= WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_3;
#endif
  WinHttpSetOption(s, WINHTTP_OPTION_SECURE_PROTOCOLS, &proto, sizeof(proto));
  DWORD redir = WINHTTP_OPTION_REDIRECT_POLICY_ALWAYS;
  WinHttpSetOption(s, WINHTTP_OPTION_REDIRECT_POLICY, &redir, sizeof(redir));
  WinHttpSetTimeouts(s, 10000, 10000, 30000, 60000);
  return s;
}

/* GET url → тело в malloc-буфере. Возвращает HTTP-код (0 — сеть не ответила). */
static int http_get(HINTERNET ses, const char *url, const wchar_t *hdrs, unsigned char **body, DWORD *blen) {
  *body = NULL;
  *blen = 0;
  wchar_t wurl[2048];
  u8_to_w(url, wurl, 2048);
  URL_COMPONENTS uc;
  wchar_t host[256], path[2048];
  memset(&uc, 0, sizeof(uc));
  uc.dwStructSize = sizeof(uc);
  uc.lpszHostName = host;
  uc.dwHostNameLength = 256;
  uc.lpszUrlPath = path;
  uc.dwUrlPathLength = 2048;
  if (!WinHttpCrackUrl(wurl, 0, 0, &uc)) return 0;
  int status = 0;
  HINTERNET con = WinHttpConnect(ses, host, uc.nPort, 0);
  if (!con) return 0;
  DWORD flags = WINHTTP_FLAG_ESCAPE_DISABLE | (uc.nScheme == INTERNET_SCHEME_HTTPS ? WINHTTP_FLAG_SECURE : 0);
  HINTERNET req = WinHttpOpenRequest(con, L"GET", path, NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
  if (req && WinHttpSendRequest(req, hdrs ? hdrs : WINHTTP_NO_ADDITIONAL_HEADERS, hdrs ? (DWORD)-1L : 0,
                                WINHTTP_NO_REQUEST_DATA, 0, 0, 0) &&
      WinHttpReceiveResponse(req, NULL)) {
    DWORD code = 0, sz = sizeof(code);
    WinHttpQueryHeaders(req, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX,
                        &code, &sz, WINHTTP_NO_HEADER_INDEX);
    status = (int)code;
    size_t cap = 65536, len = 0;
    unsigned char *buf = (unsigned char *)malloc(cap);
    for (;;) {
      DWORD avail = 0, got = 0;
      if (!WinHttpQueryDataAvailable(req, &avail)) {
        status = 0;
        break;
      }
      if (!avail) break;
      if (len + avail + 1 > cap) {
        while (len + avail + 1 > cap) cap *= 2;
        unsigned char *nb = (unsigned char *)realloc(buf, cap);
        if (!nb) {
          status = 0;
          break;
        }
        buf = nb;
      }
      if (!WinHttpReadData(req, buf + len, avail, &got)) {
        status = 0;
        break;
      }
      len += got;
    }
    if (status) {
      buf[len] = 0;
      *body = buf;
      *blen = (DWORD)len;
    } else {
      free(buf);
    }
  }
  if (req) WinHttpCloseHandle(req);
  WinHttpCloseHandle(con);
  return status;
}

static void url_encode_path(const char *in, char *out, int cap) {
  static const char hex[] = "0123456789ABCDEF";
  int o = 0;
  for (const unsigned char *p = (const unsigned char *)in; *p && o < cap - 4; p++) {
    unsigned char c = *p;
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' ||
        c == '.' || c == '~' || c == '/') {
      out[o++] = (char)c;
    } else {
      out[o++] = '%';
      out[o++] = hex[c >> 4];
      out[o++] = hex[c & 15];
    }
  }
  out[o] = 0;
}

/* ───────────── дерево файлов из GitHub API ───────────── */
typedef struct {
  char *path;   /* путь в репозитории, UTF-8 */
  char *rel;    /* путь внутри игры (без префикса канала) */
  char sha[41];
  long long size;
  int want;     /* файл игры этого канала */
  volatile LONG done; /* 1 — на диске и совпадает */
} Entry;

static Entry *g_ent;
static int g_nent, g_capent;

static const char *skip_ws(const char *p) {
  while (*p == ' ' || *p == '\n' || *p == '\r' || *p == '\t') p++;
  return p;
}

/* разбирает JSON-строку, p стоит на открывающей кавычке */
static const char *json_str(const char *p, char *out, int cap) {
  int o = 0;
  if (*p != '"') return NULL;
  p++;
  while (*p && *p != '"') {
    unsigned cp;
    if (*p == '\\') {
      p++;
      switch (*p) {
      case 'n': cp = '\n'; p++; break;
      case 't': cp = '\t'; p++; break;
      case 'r': cp = '\r'; p++; break;
      case 'b': cp = '\b'; p++; break;
      case 'f': cp = '\f'; p++; break;
      case 'u': {
        cp = (unsigned)strtoul((char[5]){p[1], p[2], p[3], p[4], 0}, NULL, 16);
        p += 5;
        if (cp >= 0xD800 && cp <= 0xDBFF && p[0] == '\\' && p[1] == 'u') {
          unsigned lo = (unsigned)strtoul((char[5]){p[2], p[3], p[4], p[5], 0}, NULL, 16);
          if (lo >= 0xDC00 && lo <= 0xDFFF) {
            cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
            p += 6;
          }
        }
        break;
      }
      default: cp = (unsigned char)*p; if (*p) p++; break;
      }
    } else {
      cp = (unsigned char)*p++;
      if (o < cap - 1) out[o++] = (char)cp; /* сырые байты UTF-8 как есть */
      continue;
    }
    if (cp < 0x80) {
      if (o < cap - 1) out[o++] = (char)cp;
    } else if (cp < 0x800) {
      if (o < cap - 2) { out[o++] = (char)(0xC0 | (cp >> 6)); out[o++] = (char)(0x80 | (cp & 63)); }
    } else if (cp < 0x10000) {
      if (o < cap - 3) {
        out[o++] = (char)(0xE0 | (cp >> 12)); out[o++] = (char)(0x80 | ((cp >> 6) & 63));
        out[o++] = (char)(0x80 | (cp & 63));
      }
    } else if (o < cap - 4) {
      out[o++] = (char)(0xF0 | (cp >> 18)); out[o++] = (char)(0x80 | ((cp >> 12) & 63));
      out[o++] = (char)(0x80 | ((cp >> 6) & 63)); out[o++] = (char)(0x80 | (cp & 63));
    }
  }
  out[o] = 0;
  return *p == '"' ? p + 1 : NULL;
}

static const char *json_skip_value(const char *p) {
  static char dummy[4096];
  p = skip_ws(p);
  if (*p == '"') return json_str(p, dummy, sizeof(dummy));
  while (*p && *p != ',' && *p != '}' && *p != ']') p++;
  return p;
}

static int parse_tree(const char *json, int *truncated) {
  *truncated = strstr(json, "\"truncated\":true") != NULL || strstr(json, "\"truncated\": true") != NULL;
  const char *p = strstr(json, "\"tree\"");
  if (!p) return 0;
  p = strchr(p, '[');
  if (!p) return 0;
  p++;
  static char key[64], val[4096];
  for (;;) {
    p = skip_ws(p);
    if (*p == ']') break;
    if (*p == ',') { p++; continue; }
    if (*p != '{') return 0;
    p++;
    Entry e;
    memset(&e, 0, sizeof(e));
    char pathbuf[4096] = "";
    int isBlob = 0;
    for (;;) {
      p = skip_ws(p);
      if (*p == '}') { p++; break; }
      if (*p == ',') { p++; continue; }
      p = json_str(p, key, sizeof(key));
      if (!p) return 0;
      p = skip_ws(p);
      if (*p != ':') return 0;
      p = skip_ws(p + 1);
      if (!strcmp(key, "path") || !strcmp(key, "type") || !strcmp(key, "sha")) {
        p = json_str(p, val, sizeof(val));
        if (!p) return 0;
        if (!strcmp(key, "path")) lstrcpynA(pathbuf, val, sizeof(pathbuf));
        else if (!strcmp(key, "type")) isBlob = !strcmp(val, "blob");
        else lstrcpynA(e.sha, val, 41);
      } else if (!strcmp(key, "size")) {
        e.size = strtoll(p, (char **)&p, 10);
      } else {
        p = json_skip_value(p);
        if (!p) return 0;
      }
    }
    if (isBlob && pathbuf[0] && strlen(e.sha) == 40) {
      if (g_nent == g_capent) {
        g_capent = g_capent ? g_capent * 2 : 2048;
        g_ent = (Entry *)realloc(g_ent, sizeof(Entry) * (size_t)g_capent);
      }
      e.path = _strdup(pathbuf);
      g_ent[g_nent++] = e;
    }
  }
  return g_nent > 0;
}

/* что из репозитория нужно игре выбранного канала */
static int ends_with(const char *s, const char *suf) {
  size_t a = strlen(s), b = strlen(suf);
  return a >= b && _stricmp(s + a - b, suf) == 0;
}
static int is_game_ext(const char *p) {
  static const char *ext[] = {".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
                              ".json", ".mp3", ".ogg", ".wav", ".m4a", ".woff", ".woff2", ".ttf", ".ico", 0};
  for (int i = 0; ext[i]; i++)
    if (ends_with(p, ext[i])) return 1;
  return 0;
}
static const char TEST_PREFIX[] = "\xD0\xA2\xD0\xB5\xD1\x81\xD1\x82/"; /* «Тест/» в UTF-8 */

static void pick_game_files(void) {
  /* папки рядом с игрой, которые игре не нужны (скрипты, черновики, архив) */
  static const char *skipTest[] = {"tools/", "tests/", "game-parts/",
                                   "\xD0\xBF\xD1\x80\xD0\xB5\xD0\xB4\xD0\xBB\xD0\xBE\xD0\xB6\xD0\xB5\xD0\xBD\xD0\xB8\xD1\x8F \xD0\x98\xD0\x98/", /* предложения ИИ/ */
                                   0};
  static const char *skipMain[] = {"launcher/", ".grok/", "tests/", "game-parts/", "Тест/",
                                   "\xD0\x9A\xD0\xBE\xD0\xBF\xD0\xB8\xD1\x8F \xD0\xBD\xD0\xB5 \xD1\x82\xD1\x80\xD0\xBE\xD0\xB3\xD0\xB0\xD1\x82\xD1\x8C/", /* Копия не трогать/ */
                                   "\xD0\xBF\xD1\x80\xD0\xBE\xD0\xBA\xD0\xB0\xD1\x87\xD0\xBA\xD0\xB0/", /* прокачка/ */
                                   0};
  int test = strcmp(g_channel, "main") != 0;
  size_t pl = strlen(TEST_PREFIX);
  for (int i = 0; i < g_nent; i++) {
    Entry *e = &g_ent[i];
    const char *rel = e->path;
    e->want = 0;
    if (test) {
      if (strncmp(rel, TEST_PREFIX, pl) != 0) continue;
      rel += pl;
      int skip = 0;
      for (int k = 0; skipTest[k]; k++)
        if (!strncmp(rel, skipTest[k], strlen(skipTest[k]))) skip = 1;
      if (skip) continue;
    } else {
      int skip = !strncmp(rel, TEST_PREFIX, pl);
      for (int k = 0; skipMain[k]; k++)
        if (!strncmp(rel, skipMain[k], strlen(skipMain[k]))) skip = 1;
      if (skip) continue;
    }
    if (!is_game_ext(rel) || !rel_is_safe(rel)) continue;
    e->rel = (char *)rel;
    e->want = 1;
  }
}

/* ───────────── локальный индекс: что уже скачано ───────────── */
typedef struct {
  char *rel;
  char sha[41];
} IdxRow;
static IdxRow *g_idx;
static int g_nidx;

static void load_index(void) {
  wchar_t p[MAX_PATH];
  _snwprintf(p, MAX_PATH, L"%s\\index.txt", g_chanDir);
  DWORD len;
  char *buf = (char *)read_file(p, &len);
  if (!buf) return;
  int cap = 0;
  for (char *line = strtok(buf, "\n"); line; line = strtok(NULL, "\n")) {
    char *tab = strchr(line, '\t');
    if (!tab || tab - line != 40) continue;
    size_t l = strlen(line);
    if (l && line[l - 1] == '\r') line[l - 1] = 0;
    if (g_nidx == cap) {
      cap = cap ? cap * 2 : 1024;
      g_idx = (IdxRow *)realloc(g_idx, sizeof(IdxRow) * (size_t)cap);
    }
    memcpy(g_idx[g_nidx].sha, line, 40);
    g_idx[g_nidx].sha[40] = 0;
    g_idx[g_nidx].rel = _strdup(tab + 1);
    g_nidx++;
  }
  free(buf);
}

static const char *index_sha(const char *rel) {
  for (int i = 0; i < g_nidx; i++)
    if (!strcmp(g_idx[i].rel, rel)) return g_idx[i].sha;
  return NULL;
}

static void save_index(void) {
  wchar_t p[MAX_PATH];
  _snwprintf(p, MAX_PATH, L"%s\\index.txt", g_chanDir);
  size_t cap = 1 << 16, len = 0;
  char *out = (char *)malloc(cap);
  for (int i = 0; i < g_nent; i++) {
    Entry *e = &g_ent[i];
    if (!e->want || !e->done) continue;
    size_t need = 42 + strlen(e->rel) + 2;
    if (len + need >= cap) {
      cap *= 2;
      out = (char *)realloc(out, cap);
    }
    len += (size_t)sprintf(out + len, "%s\t%s\n", e->sha, e->rel);
  }
  write_file_atomic(p, (unsigned char *)out, (DWORD)len);
  free(out);
}

/* ───────────── скачивание ───────────── */
static char g_sha[48] = "";
static volatile LONG g_next, g_filesDone, g_filesFail;
static volatile LONG64 g_bytesDone;
static LONG g_filesTotal;
static LONG64 g_bytesTotal;
static int *g_queue;

static int fetch_blob(HINTERNET ses, const char *repoPath, const char *wantSha, unsigned char **data, DWORD *len) {
  char enc[4096], url[4400];
  url_encode_path(repoPath, enc, sizeof(enc));
  const char *fmts[3];
  int n = 0;
  if (g_testBase[0]) {
    fmts[n++] = "%s/raw/%s";
  } else {
    fmts[n++] = "https://raw.githubusercontent.com/" REPO_OWNER "/" REPO_NAME "/%s/%s";
    fmts[n++] = "https://cdn.jsdelivr.net/gh/" REPO_OWNER "/" REPO_NAME "@%s/%s";
    fmts[n++] = "https://github.com/" REPO_OWNER "/" REPO_NAME "/raw/%s/%s";
  }
  for (int i = 0; i < n; i++) {
    if (g_testBase[0]) snprintf(url, sizeof(url), fmts[i], g_testBase, enc);
    else snprintf(url, sizeof(url), fmts[i], g_sha, enc);
    for (int attempt = 0; attempt < 2; attempt++) {
      unsigned char *b;
      DWORD bl;
      int st = http_get(ses, url, NULL, &b, &bl);
      if (st == 200 && b) {
        char got[41];
        if (git_blob_sha(b, bl, got) && !strcmp(got, wantSha)) {
          *data = b;
          *len = bl;
          return 1;
        }
        wchar_t wp[1024];
        u8_to_w(repoPath, wp, 1024);
        logw(L"хеш не сошёлся: %s (зеркало %d)", wp, i + 1);
        free(b);
        break; /* другое зеркало */
      }
      free(b);
      if (st == 404) break;
    }
  }
  return 0;
}

static DWORD WINAPI download_worker(LPVOID arg) {
  (void)arg;
  HINTERNET ses = http_session();
  if (!ses) return 0;
  for (;;) {
    LONG k = InterlockedIncrement(&g_next) - 1;
    if (k >= g_filesTotal) break;
    Entry *e = &g_ent[g_queue[k]];
    unsigned char *data = NULL;
    DWORD len = 0;
    wchar_t disk[MAX_PATH];
    if (fetch_blob(ses, e->path, e->sha, &data, &len) && rel_to_disk(g_gameDir, e->rel, disk, MAX_PATH) &&
        write_file_atomic(disk, data, len)) {
      e->done = 1;
    } else {
      InterlockedIncrement(&g_filesFail);
      wchar_t wp[1024];
      u8_to_w(e->path, wp, 1024);
      logw(L"не скачался: %s", wp);
    }
    free(data);
    InterlockedExchangeAdd64(&g_bytesDone, e->size);
    LONG d = InterlockedIncrement(&g_filesDone);
    wchar_t det[256];
    _snwprintf(det, 256, L"%ld из %ld файлов · %.1f из %.1f МБ", d, g_filesTotal,
               (double)g_bytesDone / 1048576.0, (double)g_bytesTotal / 1048576.0);
    det[255] = 0;
    LONG pct = g_bytesTotal > 0 ? (LONG)(g_bytesDone * 100 / g_bytesTotal) : 100;
    InterlockedExchange(&g_pct, pct);
    EnterCriticalSection(&g_cs);
    lstrcpynW(g_detail, det, 256);
    LeaveCriticalSection(&g_cs);
    if (g_wnd) PostMessageW(g_wnd, WM_APP_REFRESH, 0, 0);
  }
  WinHttpCloseHandle(ses);
  return 0;
}

/* ───────────── обновление самого лаунчера ───────────── */
static int self_update(HINTERNET ses) {
  if (g_noSelfUpdate) return 0;
  for (int i = 0; i < g_nent; i++) {
    if (strcmp(g_ent[i].path, SELF_IN_REPO) != 0) continue;
    DWORD len;
    unsigned char *me = read_file(g_exePath, &len);
    char mine[41] = "";
    if (me) git_blob_sha(me, len, mine);
    free(me);
    if (!strcmp(mine, g_ent[i].sha)) return 0;
    set_status(L"Обновляю лаунчер…", L"");
    unsigned char *data;
    DWORD dl;
    if (!fetch_blob(ses, g_ent[i].path, g_ent[i].sha, &data, &dl)) {
      logw(L"новый лаунчер не скачался — играем на старом");
      return 0;
    }
    wchar_t fresh[MAX_PATH], old[MAX_PATH];
    _snwprintf(fresh, MAX_PATH, L"%s.new", g_exePath);
    _snwprintf(old, MAX_PATH, L"%s.old", g_exePath);
    int ok = write_file_atomic(fresh, data, dl);
    free(data);
    if (!ok) {
      logw(L"папка лаунчера только для чтения — обновление пропущено");
      return 0;
    }
    if (!MoveFileExW(g_exePath, old, MOVEFILE_REPLACE_EXISTING)) {
      DeleteFileW(fresh);
      return 0;
    }
    if (!MoveFileExW(fresh, g_exePath, MOVEFILE_REPLACE_EXISTING)) {
      MoveFileExW(old, g_exePath, MOVEFILE_REPLACE_EXISTING);
      return 0;
    }
    wchar_t cmd[MAX_PATH + 64];
    _snwprintf(cmd, MAX_PATH + 64, L"\"%s\" --updated", g_exePath);
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    if (CreateProcessW(g_exePath, cmd, NULL, NULL, FALSE, 0, NULL, g_exeDir, &si, &pi)) {
      CloseHandle(pi.hThread);
      CloseHandle(pi.hProcess);
      logw(L"лаунчер обновлён, перезапуск");
      return 1;
    }
    MoveFileExW(old, g_exePath, MOVEFILE_REPLACE_EXISTING);
    return 0;
  }
  return 0;
}

/* ───────────── локальный веб-сервер ───────────── */
static SOCKET g_listen = INVALID_SOCKET;

static const char *mime_for(const char *p) {
  static const struct { const char *ext, *type; } m[] = {
      {".html", "text/html; charset=utf-8"}, {".js", "text/javascript; charset=utf-8"},
      {".css", "text/css; charset=utf-8"},   {".json", "application/json; charset=utf-8"},
      {".png", "image/png"},                 {".jpg", "image/jpeg"},
      {".jpeg", "image/jpeg"},               {".gif", "image/gif"},
      {".webp", "image/webp"},               {".svg", "image/svg+xml"},
      {".ico", "image/x-icon"},              {".mp3", "audio/mpeg"},
      {".ogg", "audio/ogg"},                 {".wav", "audio/wav"},
      {".m4a", "audio/mp4"},                 {".woff", "font/woff"},
      {".woff2", "font/woff2"},              {".ttf", "font/ttf"},
      {".txt", "text/plain; charset=utf-8"}, {0, 0}};
  for (int i = 0; m[i].ext; i++)
    if (ends_with(p, m[i].ext)) return m[i].type;
  return "application/octet-stream";
}

static void send_all(SOCKET s, const char *b, int n) {
  while (n > 0) {
    int w = send(s, b, n, 0);
    if (w <= 0) return;
    b += w;
    n -= w;
  }
}

static void send_simple(SOCKET s, int code, const char *text, const char *ctype, const char *body) {
  char h[512];
  int bl = (int)strlen(body);
  int n = snprintf(h, sizeof(h),
                   "HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %d\r\nCache-Control: no-store\r\n"
                   "Connection: close\r\n\r\n",
                   code, text, ctype, bl);
  send_all(s, h, n);
  send_all(s, body, bl);
}

static int hexv(int c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

static DWORD WINAPI serve_client(LPVOID arg) {
  SOCKET c = (SOCKET)(ULONG_PTR)arg;
  char req[8192];
  int len = 0;
  DWORD tmo = 10000;
  setsockopt(c, SOL_SOCKET, SO_RCVTIMEO, (const char *)&tmo, sizeof(tmo));
  while (len < (int)sizeof(req) - 1) {
    int r = recv(c, req + len, (int)sizeof(req) - 1 - len, 0);
    if (r <= 0) break;
    len += r;
    req[len] = 0;
    if (strstr(req, "\r\n\r\n")) break;
  }
  req[len] = 0;
  char method[8] = "", target[4096] = "";
  if (sscanf(req, "%7s %4095s", method, target) != 2) {
    closesocket(c);
    return 0;
  }
  int head = !strcmp(method, "HEAD");
  if (strcmp(method, "GET") && !head) {
    send_simple(c, 405, "Method Not Allowed", "text/plain", "405");
    closesocket(c);
    return 0;
  }
  char *q = strpbrk(target, "?#");
  if (q) *q = 0;
  /* раскодировать %XX в байты UTF-8 */
  char path[4096];
  int o = 0;
  for (int i = 0; target[i] && o < (int)sizeof(path) - 1; i++) {
    if (target[i] == '%' && hexv(target[i + 1]) >= 0 && hexv(target[i + 2]) >= 0) {
      path[o++] = (char)(hexv(target[i + 1]) * 16 + hexv(target[i + 2]));
      i += 2;
    } else {
      path[o++] = target[i];
    }
  }
  path[o] = 0;
  if (!strcmp(path, "/__mythickey/ping")) {
    char body[256];
    snprintf(body, sizeof(body), "{\"app\":\"mythickey\",\"launcher\":\"%s\",\"channel\":\"%s\",\"commit\":\"%s\"}",
             LAUNCHER_VERSION_A, g_channel, g_sha);
    send_simple(c, 200, "OK", "application/json", body);
    closesocket(c);
    return 0;
  }
  char rel[4200];
  const char *p = path[0] == '/' ? path + 1 : path;
  snprintf(rel, sizeof(rel), "%s%s", p, (!p[0] || p[strlen(p) - 1] == '/') ? "index.html" : "");
  wchar_t disk[MAX_PATH];
  if (!rel_is_safe(rel) || !rel_to_disk(g_gameDir, rel, disk, MAX_PATH)) {
    send_simple(c, 404, "Not Found", "text/plain; charset=utf-8", "Нет такого файла");
    closesocket(c);
    return 0;
  }
  DWORD attr = GetFileAttributesW(disk);
  if (attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY)) {
    char loc[4400];
    snprintf(loc, sizeof(loc),
             "HTTP/1.1 301 Moved\r\nLocation: %s/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n", target);
    send_all(c, loc, (int)strlen(loc));
    closesocket(c);
    return 0;
  }
  HANDLE f = CreateFileW(disk, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_DELETE, NULL, OPEN_EXISTING, 0, NULL);
  if (f == INVALID_HANDLE_VALUE) {
    send_simple(c, 404, "Not Found", "text/plain; charset=utf-8", "Нет такого файла");
    closesocket(c);
    return 0;
  }
  LARGE_INTEGER sz;
  GetFileSizeEx(f, &sz);
  char h[512];
  int n = snprintf(h, sizeof(h),
                   "HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %lld\r\nCache-Control: no-cache\r\n"
                   "Connection: close\r\n\r\n",
                   mime_for(rel), (long long)sz.QuadPart);
  send_all(c, h, n);
  if (!head) {
    char *buf = (char *)malloc(65536);
    DWORD got;
    while (buf && ReadFile(f, buf, 65536, &got, NULL) && got > 0) send_all(c, buf, (int)got);
    free(buf);
  }
  CloseHandle(f);
  shutdown(c, SD_SEND);
  closesocket(c);
  return 0;
}

static DWORD WINAPI server_loop(LPVOID arg) {
  (void)arg;
  for (;;) {
    SOCKET c = accept(g_listen, NULL, NULL);
    if (c == INVALID_SOCKET) break;
    HANDLE t = CreateThread(NULL, 0, serve_client, (LPVOID)(ULONG_PTR)c, 0, NULL);
    if (t) CloseHandle(t);
    else closesocket(c);
  }
  return 0;
}

/* 1 — наш сервер поднят, 2 — порт уже держит другой наш лаунчер, 0 — ошибка */
static int start_server(void) {
  WSADATA wsa;
  WSAStartup(MAKEWORD(2, 2), &wsa);
  g_listen = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
  struct sockaddr_in a;
  memset(&a, 0, sizeof(a));
  a.sin_family = AF_INET;
  a.sin_port = htons((u_short)g_port);
  a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  BOOL excl = TRUE;
  setsockopt(g_listen, SOL_SOCKET, SO_EXCLUSIVEADDRUSE, (const char *)&excl, sizeof(excl));
  if (bind(g_listen, (struct sockaddr *)&a, sizeof(a)) == 0 && listen(g_listen, 64) == 0) {
    HANDLE t = CreateThread(NULL, 0, server_loop, NULL, 0, NULL);
    if (t) CloseHandle(t);
    logw(L"сервер: http://127.0.0.1:%d/", g_port);
    return 1;
  }
  closesocket(g_listen);
  g_listen = INVALID_SOCKET;
  /* порт занят: если это уже запущенный лаунчер, просто открываем ещё одно окно */
  HINTERNET ses = http_session();
  char url[64];
  snprintf(url, sizeof(url), "http://127.0.0.1:%d/__mythickey/ping", g_port);
  unsigned char *b;
  DWORD bl;
  int st = ses ? http_get(ses, url, NULL, &b, &bl) : 0;
  int ours = st == 200 && b && strstr((char *)b, "mythickey");
  if (st) free(b);
  if (ses) WinHttpCloseHandle(ses);
  return ours ? 2 : 0;
}

/* ───────────── окно игры (Edge / Chrome в режиме приложения) ───────────── */
static HANDLE g_browser; /* первый процесс окна игры: пока он жив, игра открыта */

static int reg_app_path(const wchar_t *exe, wchar_t *out) {
  wchar_t key[160];
  _snwprintf(key, 160, L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\%s", exe);
  HKEY roots[2] = {HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
  for (int i = 0; i < 2; i++) {
    DWORD sz = MAX_PATH * sizeof(wchar_t);
    if (RegGetValueW(roots[i], key, NULL, RRF_RT_REG_SZ, NULL, out, &sz) == ERROR_SUCCESS &&
        GetFileAttributesW(out) != INVALID_FILE_ATTRIBUTES)
      return 1;
  }
  return 0;
}

static int find_browser(wchar_t *out) {
  if (reg_app_path(L"msedge.exe", out)) return 1;
  const wchar_t *envs[] = {L"ProgramFiles(x86)", L"ProgramFiles", L"LOCALAPPDATA"};
  for (int i = 0; i < 3; i++) {
    wchar_t base[MAX_PATH];
    if (!GetEnvironmentVariableW(envs[i], base, MAX_PATH)) continue;
    _snwprintf(out, MAX_PATH, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", base);
    if (GetFileAttributesW(out) != INVALID_FILE_ATTRIBUTES) return 1;
  }
  if (reg_app_path(L"chrome.exe", out)) return 1;
  return 0;
}

/* Повторный запуск Edge с тем же профилем отдаёт окно первому процессу и сразу выходит,
   поэтому закрытие игры считаем только по первому процессу. */
static DWORD WINAPI browser_watch(LPVOID arg) {
  HANDLE h = (HANDLE)arg;
  WaitForSingleObject(h, INFINITE);
  if (g_wnd) PostMessageW(g_wnd, WM_APP_BROWSER_GONE, 0, 0);
  return 0;
}

static void open_game_window(void) {
  wchar_t url[96];
  _snwprintf(url, 96, L"http://127.0.0.1:%d/", g_port);
  wchar_t exe[MAX_PATH];
  if (find_browser(exe)) {
    wchar_t prof[MAX_PATH], cmd[2048];
    _snwprintf(prof, MAX_PATH, L"%s\\browser", g_root);
    CreateDirectoryW(prof, NULL);
    _snwprintf(cmd, 2048,
               L"\"%s\" --app=%s --user-data-dir=\"%s\" --no-first-run --no-default-browser-check "
               L"--window-size=1600,900 --disable-features=Translate",
               exe, url, prof);
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    if (CreateProcessW(exe, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
      CloseHandle(pi.hThread);
      if (!g_browser) {
        g_browser = pi.hProcess;
        HANDLE t = CreateThread(NULL, 0, browser_watch, pi.hProcess, 0, NULL);
        if (t) CloseHandle(t);
      } else {
        CloseHandle(pi.hProcess);
      }
      logw(L"окно игры: %s", exe);
      return;
    }
  }
  /* нет Edge и Chrome — обычный браузер, лаунчер остаётся открытым как сервер */
  ShellExecuteW(NULL, L"open", url, NULL, NULL, SW_SHOWNORMAL);
  logw(L"Edge не найден — открыл браузер по умолчанию");
}

/* ───────────── основной поток обновления ───────────── */
static int game_present(void) {
  wchar_t p[MAX_PATH];
  _snwprintf(p, MAX_PATH, L"%s\\index.html", g_gameDir);
  return GetFileAttributesW(p) != INVALID_FILE_ATTRIBUTES;
}

static int fetch_tree(HINTERNET ses) {
  char url[512];
  unsigned char *b;
  DWORD bl;
  int st;
  if (g_testBase[0]) {
    snprintf(url, sizeof(url), "%s/sha", g_testBase);
    st = http_get(ses, url, NULL, &b, &bl);
  } else {
    snprintf(url, sizeof(url), "https://api.github.com/repos/" REPO_OWNER "/" REPO_NAME "/commits/%s", g_branch);
    st = http_get(ses, url, L"Accept: application/vnd.github.sha\r\nX-GitHub-Api-Version: 2022-11-28", &b, &bl);
  }
  if (st != 200 || !b || bl < 40) {
    logw(L"не узнал последний коммит (код %d)", st);
    free(b);
    return 0;
  }
  memcpy(g_sha, b, 40);
  g_sha[40] = 0;
  free(b);
  wchar_t ws[48];
  u8_to_w(g_sha, ws, 48);
  logw(L"последний коммит ветки %hs: %s", g_branch, ws);
  if (g_testBase[0]) snprintf(url, sizeof(url), "%s/tree.json", g_testBase);
  else
    snprintf(url, sizeof(url),
             "https://api.github.com/repos/" REPO_OWNER "/" REPO_NAME "/git/trees/%s?recursive=1", g_sha);
  st = http_get(ses, url, L"Accept: application/vnd.github+json\r\nX-GitHub-Api-Version: 2022-11-28", &b, &bl);
  if (st != 200 || !b) {
    logw(L"не получил список файлов (код %d)", st);
    free(b);
    return 0;
  }
  int trunc = 0;
  int ok = parse_tree((char *)b, &trunc);
  free(b);
  if (trunc) logw(L"GitHub обрезал список файлов — часть не обновится");
  logw(L"файлов в репозитории: %d", g_nent);
  return ok;
}

static DWORD WINAPI update_thread(LPVOID arg) {
  (void)arg;
  set_status(L"Проверяю обновления…", L"GitHub: " REPO_OWNER L"/" REPO_NAME);
  HINTERNET ses = http_session();
  int online = ses && fetch_tree(ses);
  if (online && self_update(ses)) {
    if (g_wnd) PostMessageW(g_wnd, WM_CLOSE, 0, 0);
    else ExitProcess(0);
    return 0;
  }
  if (online) {
    pick_game_files();
    load_index();
    g_queue = (int *)malloc(sizeof(int) * (size_t)(g_nent + 1));
    for (int i = 0; i < g_nent; i++) {
      Entry *e = &g_ent[i];
      if (!e->want) continue;
      const char *have = index_sha(e->rel);
      wchar_t disk[MAX_PATH];
      if (have && !strcmp(have, e->sha) && rel_to_disk(g_gameDir, e->rel, disk, MAX_PATH) &&
          GetFileAttributesW(disk) != INVALID_FILE_ATTRIBUTES) {
        e->done = 1;
        continue;
      }
      g_queue[g_filesTotal++] = i;
      g_bytesTotal += e->size;
    }
    if (g_filesTotal) {
      wchar_t st[128];
      _snwprintf(st, 128, g_nidx ? L"Скачиваю обновление игры…" : L"Скачиваю игру (первый запуск)…");
      set_status(st, L"");
      HANDLE th[WORKERS];
      for (int i = 0; i < WORKERS; i++) th[i] = CreateThread(NULL, 0, download_worker, NULL, 0, NULL);
      WaitForMultipleObjects(WORKERS, th, TRUE, INFINITE);
      for (int i = 0; i < WORKERS; i++) CloseHandle(th[i]);
    } else {
      logw(L"игра уже последней версии");
    }
    /* убрать файлы, которых больше нет в репозитории */
    for (int i = 0; i < g_nidx; i++) {
      int still = 0;
      for (int k = 0; k < g_nent && !still; k++)
        if (g_ent[k].want && !strcmp(g_ent[k].rel, g_idx[i].rel)) still = 1;
      wchar_t disk[MAX_PATH];
      if (!still && rel_is_safe(g_idx[i].rel) && rel_to_disk(g_gameDir, g_idx[i].rel, disk, MAX_PATH))
        DeleteFileW(disk);
    }
    save_index();
  }
  if (ses) WinHttpCloseHandle(ses);
  InterlockedExchange(&g_pct, 100);
  if (!game_present()) {
    set_status(online ? L"Не удалось скачать игру" : L"Нет связи с GitHub, а игра ещё не скачана",
               L"Проверьте интернет и запустите снова. Подробности — в launcher.log");
    if (g_wnd) PostMessageW(g_wnd, WM_APP_FAIL, 0, 0);
    return 0;
  }
  wchar_t det[256];
  if (!online) _snwprintf(det, 256, L"Нет связи с GitHub — играем в уже скачанную версию");
  else if (g_filesFail) _snwprintf(det, 256, L"%ld файл(ов) не скачалось — попробует в следующий раз", g_filesFail);
  else _snwprintf(det, 256, L"Версия %.7hs", g_sha);
  det[255] = 0;
  int srv = start_server();
  if (!srv) {
    wchar_t e[128];
    _snwprintf(e, 128, L"Порт %d занят другой программой", g_port);
    set_status(L"Не удалось запустить игру", e);
    if (g_wnd) PostMessageW(g_wnd, WM_APP_FAIL, 0, 0);
    return 0;
  }
  set_status(L"Игра открыта", det);
  if (!g_noBrowser) open_game_window();
  if (g_wnd) PostMessageW(g_wnd, WM_APP_READY, 0, 0);
  return 0;
}

/* ───────────── окно лаунчера ───────────── */
static HFONT g_font, g_fontBig;

static LRESULT CALLBACK wnd_proc(HWND h, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
  case WM_CREATE: {
    NONCLIENTMETRICSW ncm;
    ncm.cbSize = sizeof(ncm);
    SystemParametersInfoW(SPI_GETNONCLIENTMETRICS, sizeof(ncm), &ncm, 0);
    g_font = CreateFontIndirectW(&ncm.lfMessageFont);
    ncm.lfMessageFont.lfHeight = ncm.lfMessageFont.lfHeight * 3 / 2;
    ncm.lfMessageFont.lfWeight = FW_SEMIBOLD;
    g_fontBig = CreateFontIndirectW(&ncm.lfMessageFont);
    g_wStatus = CreateWindowW(L"STATIC", g_status, WS_CHILD | WS_VISIBLE, 20, 18, 440, 28, h, NULL, NULL, NULL);
    g_wBar = CreateWindowW(PROGRESS_CLASSW, NULL, WS_CHILD | WS_VISIBLE, 20, 54, 440, 16, h, NULL, NULL, NULL);
    g_wDetail = CreateWindowW(L"STATIC", g_detail, WS_CHILD | WS_VISIBLE, 20, 78, 440, 36, h, NULL, NULL, NULL);
    g_wBtnOpen = CreateWindowW(L"BUTTON", L"Открыть окно игры", WS_CHILD | BS_PUSHBUTTON, 20, 122, 170, 30, h,
                               (HMENU)1, NULL, NULL);
    g_wBtnClose = CreateWindowW(L"BUTTON", L"Закрыть", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON, 360, 122, 100, 30, h,
                                (HMENU)2, NULL, NULL);
    SendMessageW(g_wStatus, WM_SETFONT, (WPARAM)g_fontBig, TRUE);
    SendMessageW(g_wDetail, WM_SETFONT, (WPARAM)g_font, TRUE);
    SendMessageW(g_wBtnOpen, WM_SETFONT, (WPARAM)g_font, TRUE);
    SendMessageW(g_wBtnClose, WM_SETFONT, (WPARAM)g_font, TRUE);
    SendMessageW(g_wBar, PBM_SETRANGE32, 0, 100);
    return 0;
  }
  case WM_APP_REFRESH:
    EnterCriticalSection(&g_cs);
    SetWindowTextW(g_wStatus, g_status);
    SetWindowTextW(g_wDetail, g_detail);
    LeaveCriticalSection(&g_cs);
    SendMessageW(g_wBar, PBM_SETPOS, (WPARAM)g_pct, 0);
    return 0;
  case WM_APP_READY:
    SendMessageW(h, WM_APP_REFRESH, 0, 0);
    InterlockedExchange(&g_phase, 1);
    ShowWindow(g_wBtnOpen, SW_SHOW);
    /* окно игры открыто — лаунчер уходит вниз, но держит сервер */
    if (g_browser) ShowWindow(h, SW_MINIMIZE);
    return 0;
  case WM_APP_FAIL:
    SendMessageW(h, WM_APP_REFRESH, 0, 0);
    InterlockedExchange(&g_phase, 2);
    return 0;
  case WM_APP_BROWSER_GONE:
    DestroyWindow(h); /* закрыли игру — закрываемся и мы */
    return 0;
  case WM_COMMAND:
    if (LOWORD(w) == 1 && g_phase == 1) open_game_window();
    if (LOWORD(w) == 2) DestroyWindow(h);
    return 0;
  case WM_CTLCOLORSTATIC:
    SetBkMode((HDC)w, TRANSPARENT);
    return (LRESULT)GetSysColorBrush(COLOR_WINDOW);
  case WM_DESTROY:
    PostQuitMessage(0);
    return 0;
  }
  return DefWindowProcW(h, m, w, l);
}

/* ───────────── настройки ───────────── */
static void trim(char *s) {
  char *e = s + strlen(s);
  while (e > s && (e[-1] == ' ' || e[-1] == '\r' || e[-1] == '\n' || e[-1] == '\t')) *--e = 0;
  char *b = s;
  while (*b == ' ' || *b == '\t') b++;
  if (b != s) memmove(s, b, strlen(b) + 1);
}

static void load_ini(void) {
  wchar_t p[MAX_PATH];
  _snwprintf(p, MAX_PATH, L"%s\\launcher.ini", g_exeDir);
  DWORD len;
  char *buf = (char *)read_file(p, &len);
  if (!buf) return;
  for (char *line = strtok(buf, "\n"); line; line = strtok(NULL, "\n")) {
    char *eq = strchr(line, '=');
    if (!eq || line[0] == '#' || line[0] == ';') continue;
    *eq = 0;
    char *k = line, *v = eq + 1;
    trim(k);
    trim(v);
    if (!strcmp(k, "branch") && v[0]) lstrcpynA(g_branch, v, sizeof(g_branch));
    else if (!strcmp(k, "channel") && v[0]) lstrcpynA(g_channel, v, sizeof(g_channel));
    else if (!strcmp(k, "test_base")) lstrcpynA(g_testBase, v, sizeof(g_testBase));
    else if (!strcmp(k, "port")) g_port = atoi(v);
    else if (!strcmp(k, "no_self_update")) g_noSelfUpdate = atoi(v);
  }
  free(buf);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, LPWSTR cmdline, int show) {
  (void)prev;
  InitializeCriticalSection(&g_cs);
  GetModuleFileNameW(NULL, g_exePath, MAX_PATH);
  lstrcpynW(g_exeDir, g_exePath, MAX_PATH);
  wchar_t *slash = wcsrchr(g_exeDir, L'\\');
  if (slash) *slash = 0;
  int argc = 0;
  wchar_t **argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  for (int i = 1; i < argc; i++) {
    if (!wcscmp(argv[i], L"--headless")) g_headless = 1;
    else if (!wcscmp(argv[i], L"--no-browser")) g_noBrowser = 1;
    else if (!wcscmp(argv[i], L"--no-self-update")) g_noSelfUpdate = 1;
  }
  (void)cmdline;
  load_ini();
  if (strcmp(g_channel, "main") != 0) lstrcpynA(g_channel, "test", sizeof(g_channel));
  if (!g_port) g_port = strcmp(g_channel, "main") ? 47619 : 47620;

  wchar_t local[MAX_PATH];
  if (!GetEnvironmentVariableW(L"LOCALAPPDATA", local, MAX_PATH)) lstrcpynW(local, g_exeDir, MAX_PATH);
  _snwprintf(g_root, MAX_PATH, L"%s\\MythicKey", local);
  CreateDirectoryW(g_root, NULL);
  wchar_t wch[16];
  u8_to_w(g_channel, wch, 16);
  _snwprintf(g_chanDir, MAX_PATH, L"%s\\%s", g_root, wch);
  CreateDirectoryW(g_chanDir, NULL);
  _snwprintf(g_gameDir, MAX_PATH, L"%s\\game", g_chanDir);
  CreateDirectoryW(g_gameDir, NULL);
  _snwprintf(g_logPath, MAX_PATH, L"%s\\launcher.log", g_root);
  {
    wchar_t old[MAX_PATH];
    _snwprintf(old, MAX_PATH, L"%s.old", g_exePath);
    DeleteFileW(old);
  }
  logw(L"── лаунчер %s · канал %hs · ветка %hs", LAUNCHER_VERSION_W, g_channel, g_branch);

  if (g_headless) {
    update_thread(NULL);
    if (g_listen == INVALID_SOCKET) return 1;
    Sleep(INFINITE);
    return 0;
  }

  INITCOMMONCONTROLSEX icc = {sizeof(icc), ICC_PROGRESS_CLASS | ICC_STANDARD_CLASSES};
  InitCommonControlsEx(&icc);
  WNDCLASSW wc;
  memset(&wc, 0, sizeof(wc));
  wc.lpfnWndProc = wnd_proc;
  wc.hInstance = inst;
  wc.hCursor = LoadCursor(NULL, IDC_ARROW);
  wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
  wc.hIcon = LoadIconW(inst, MAKEINTRESOURCEW(1));
  wc.lpszClassName = L"MythicKeyLauncher";
  RegisterClassW(&wc);
  RECT r = {0, 0, 480, 170};
  AdjustWindowRect(&r, WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX, FALSE);
  g_wnd = CreateWindowW(L"MythicKeyLauncher", L"Mythic Key", WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
                        CW_USEDEFAULT, CW_USEDEFAULT, r.right - r.left, r.bottom - r.top, NULL, NULL, inst, NULL);
  ShowWindow(g_wnd, show);
  UpdateWindow(g_wnd);
  HANDLE t = CreateThread(NULL, 0, update_thread, NULL, 0, NULL);
  if (t) CloseHandle(t);
  MSG msg;
  while (GetMessageW(&msg, NULL, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }
  return 0;
}
