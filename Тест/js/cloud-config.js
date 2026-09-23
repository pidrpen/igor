/* Облачные сохранения: адрес и публичный ключ проекта Supabase.
 * Где взять: supabase.com → твой проект → Project Settings → API:
 *   url     — Project URL, вида https://abcdefgh.supabase.co
 *   anonKey — ключ «anon public» (или «publishable»). Он публичный, его можно держать в игре.
 * Ключ service_role / secret сюда НЕ класть — игра откажется с ним работать.
 * Базу один раз готовит скрипт Тест/облако/supabase.sql (как — в Тест/облако/README.md).
 * Пусто — облако выключено, игра сохраняется только на этом компьютере, как раньше. */
window.MK_CLOUD = {
  url: '',
  anonKey: '',
};
