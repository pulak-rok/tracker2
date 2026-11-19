-- Telegram interactive step-by-step wizard state per chat
create table if not exists public.telegram_sessions (
  chat_id    text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  step       text not null default 'IDLE',
  draft      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.telegram_sessions enable row level security;
