#!/bin/sh
# Сборка MythicKey.exe (лаунчер). Одна сборка на всех: mingw-w64, пути только внутри репозитория.
#
# Нужно: x86_64-w64-mingw32-gcc, x86_64-w64-mingw32-windres
#   Debian/Ubuntu: apt install gcc-mingw-w64-x86-64 binutils-mingw-w64-x86-64
#
# Запуск из любого места:  sh launcher/build.sh
# Готовый exe кладётся в launcher/MythicKey.exe. Закоммитил его в main —
# у всех лаунчеров он обновится сам при следующем запуске.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
CC=x86_64-w64-mingw32-gcc
RC=x86_64-w64-mingw32-windres
for tool in "$CC" "$RC"; do
  command -v "$tool" >/dev/null 2>&1 || { echo "нет $tool — см. шапку build.sh"; exit 1; }
done
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cd "$HERE"
$RC -c 65001 launcher.rc -O coff -o "$TMP/launcher.res"
# предупреждение компилятора — это ошибка
$CC -O2 -Wall -Wextra -Werror -Wno-unused-function -Wno-cast-function-type -finput-charset=UTF-8 -municode \
  -o MythicKey.exe launcher.c "$TMP/launcher.res" \
  -lwinhttp -lws2_32 -lbcrypt -lcomctl32 -lshell32 -luser32 -lgdi32 -ladvapi32 \
  -Wl,--subsystem,windows -static -s
echo "MythicKey.exe $(sed -n 's/^#define LAUNCHER_VERSION_A "\(.*\)"/\1/p' version.h)  $(wc -c < MythicKey.exe) байт"
