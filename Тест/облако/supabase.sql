-- Mythic Key — облачные сохранения (логин + пароль, без почты).
-- Выполнить ОДИН раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен: всё создаётся через «if not exists» / «or replace».
--
-- Как устроено:
--   • таблицы закрыты для всех (RLS без правил) — напрямую их не прочитать даже с ключом;
--   • игра зовёт только функции mk_* ниже; пароль хранится хешем bcrypt, не текстом;
--   • вход выдаёт токен сессии, сейв читается и пишется только по своему токену;
--   • если сейв в облаке новее того, от которого играешь (другой компьютер),
--     запись не пройдёт молча — игра спросит, что оставить.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mk_players (
  login       text primary key,
  pass_hash   text not null,
  created_at  timestamptz not null default now(),
  fails       int not null default 0,          -- неудачные входы подряд
  locked_till timestamptz                      -- пауза после 10 неудач подряд
);
create table if not exists public.mk_sessions (
  token      text primary key,
  login      text not null references public.mk_players(login) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at    timestamptz not null default now()
);
create table if not exists public.mk_saves (
  login      text primary key references public.mk_players(login) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  device     text
);

alter table public.mk_players  enable row level security;
alter table public.mk_sessions enable row level security;
alter table public.mk_saves    enable row level security;
revoke all on public.mk_players, public.mk_sessions, public.mk_saves from anon, authenticated;

-- логин без регистра: «Igor» и «igor» — один игрок
create or replace function public.mk_norm_login(p text) returns text
language sql immutable as $$ select lower(btrim(coalesce(p, ''))) $$;

create or replace function public.mk_new_session(p_login text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into mk_sessions(token, login) values (t, p_login);
  -- у игрока не больше 10 живых сессий (старые устройства выпадают)
  delete from mk_sessions where login = p_login and token not in (
    select token from mk_sessions where login = p_login order by seen_at desc limit 10);
  return t;
end $$;

create or replace function public.mk_session_login(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare l text;
begin
  update mk_sessions set seen_at = now() where token = p_token returning login into l;
  if l is null then raise exception 'mk_bad_session' using errcode = 'P0001'; end if;
  return l;
end $$;

create or replace function public.mk_register(p_login text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare l text := mk_norm_login(p_login);
begin
  if l !~ '^[a-z0-9а-яё_.-]{3,24}$' then raise exception 'mk_bad_login' using errcode = 'P0001'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'mk_short_password' using errcode = 'P0001'; end if;
  if exists (select 1 from mk_players where login = l) then raise exception 'mk_login_taken' using errcode = 'P0001'; end if;
  insert into mk_players(login, pass_hash) values (l, extensions.crypt(p_password, extensions.gen_salt('bf', 10)));
  return json_build_object('token', mk_new_session(l), 'login', l);
end $$;

create or replace function public.mk_login(p_login text, p_password text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare l text := mk_norm_login(p_login); r mk_players;
begin
  select * into r from mk_players where login = l;
  if r.login is null then raise exception 'mk_bad_credentials' using errcode = 'P0001'; end if;
  if r.locked_till is not null and r.locked_till > now() then raise exception 'mk_locked' using errcode = 'P0001'; end if;
  if extensions.crypt(coalesce(p_password, ''), r.pass_hash) <> r.pass_hash then
    -- не raise: исключение откатило бы и счётчик неудач
    update mk_players set fails = fails + 1,
      locked_till = case when fails + 1 >= 10 then now() + interval '5 minutes' else null end
      where login = l;
    return json_build_object('error', 'mk_bad_credentials');
  end if;
  update mk_players set fails = 0, locked_till = null where login = l;
  return json_build_object('token', mk_new_session(l), 'login', l);
end $$;

create or replace function public.mk_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from mk_sessions where token = p_token $$;

create or replace function public.mk_save_get(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare l text := mk_session_login(p_token); s mk_saves;
begin
  select * into s from mk_saves where login = l;
  if s.login is null then return json_build_object('login', l, 'data', null); end if;
  return json_build_object('login', l, 'data', s.data, 'updated_at', s.updated_at, 'device', s.device);
end $$;

-- p_base — updated_at облачного сейва, от которого играет это устройство (null — «я его не видел»).
-- Если в облаке уже что-то новее и p_force = false — ничего не пишем, отвечаем conflict.
create or replace function public.mk_save_put(p_token text, p_data jsonb, p_device text,
                                              p_base timestamptz, p_force boolean default false) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare l text := mk_session_login(p_token); cur mk_saves; t timestamptz := clock_timestamp();
begin
  if p_data is null or pg_column_size(p_data) > 2000000 then raise exception 'mk_save_too_big' using errcode = 'P0001'; end if;
  select * into cur from mk_saves where login = l for update;
  if cur.login is not null and not p_force
     and (p_base is null or cur.updated_at > p_base + interval '1 millisecond') then
    return json_build_object('ok', false, 'conflict', true, 'updated_at', cur.updated_at, 'device', cur.device);
  end if;
  insert into mk_saves(login, data, updated_at, device) values (l, p_data, t, left(p_device, 60))
    on conflict (login) do update set data = excluded.data, updated_at = excluded.updated_at, device = excluded.device;
  return json_build_object('ok', true, 'conflict', false, 'updated_at', t);
end $$;

revoke all on function public.mk_new_session(text), public.mk_session_login(text) from public, anon, authenticated;
grant execute on function public.mk_register(text, text), public.mk_login(text, text), public.mk_logout(text),
  public.mk_save_get(text), public.mk_save_put(text, jsonb, text, timestamptz, boolean) to anon, authenticated;
