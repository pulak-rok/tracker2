-- Roadmap Tracker: schema, integrity triggers, RLS. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency     text not null default 'USD',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- roadmaps ----------
create table public.roadmaps (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null check (char_length(trim(name)) between 1 and 80),
  profit_target        numeric(14,2) not null check (profit_target > 0),
  starting_balance     numeric(14,2) not null default 0 check (starting_balance >= 0),
  risk_per_trade       numeric(14,2) not null check (risk_per_trade > 0),
  rr_ratio             numeric(6,2)  not null check (rr_ratio > 0),
  win_rate_assumption  numeric(5,2)  check (win_rate_assumption between 0 and 100),
  start_date           date not null,
  target_date          date not null,
  max_drawdown         numeric(14,2) check (max_drawdown > 0),
  daily_trade_limit    integer check (daily_trade_limit > 0),
  notes                text,
  status               text not null default 'active' check (status in ('active','archived','completed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint roadmaps_dates_ok check (target_date >= start_date)
);
create index roadmaps_user_idx on public.roadmaps (user_id, status);
create trigger trg_roadmaps_updated before update on public.roadmaps
  for each row execute function public.set_updated_at();

-- ---------- daily_records (one row per roadmap per day) ----------
create table public.daily_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  roadmap_id    uuid not null references public.roadmaps(id) on delete cascade,
  trade_date    date not null,
  entry_mode    text not null default 'detailed' check (entry_mode in ('summary','detailed')),
  session       text check (session in ('London','New York','Asian','Other')),
  total_trades  integer not null default 0 check (total_trades >= 0),
  wins          integer not null default 0 check (wins >= 0),
  losses        integer not null default 0 check (losses >= 0),
  break_evens   integer not null default 0 check (break_evens >= 0),
  gross_profit  numeric(14,2) not null default 0 check (gross_profit >= 0),
  gross_loss    numeric(14,2) not null default 0 check (gross_loss >= 0),
  net_pl        numeric(14,2) generated always as (gross_profit - gross_loss) stored,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint daily_records_one_per_day unique (roadmap_id, trade_date),
  constraint daily_records_id_roadmap  unique (id, roadmap_id),
  constraint daily_records_counts_ok   check (wins + losses + break_evens = total_trades)
);
create index daily_records_user_idx    on public.daily_records (user_id, trade_date);
create index daily_records_roadmap_idx on public.daily_records (roadmap_id, trade_date);
create trigger trg_daily_updated before update on public.daily_records
  for each row execute function public.set_updated_at();

-- ---------- trades ----------
create table public.trades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  roadmap_id       uuid not null,
  daily_record_id  uuid not null,
  trade_no         integer not null,
  symbol           text not null default 'XAUUSD',
  session          text check (session in ('London','New York','Asian','Other')),
  outcome          text not null check (outcome in ('WIN','LOSS','BE')),
  risk_amount      numeric(14,2) not null default 0 check (risk_amount >= 0),
  rr_achieved      numeric(8,2),
  pnl              numeric(14,2) not null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint trades_day_fk foreign key (daily_record_id, roadmap_id)
    references public.daily_records (id, roadmap_id) on delete cascade,
  constraint trades_roadmap_fk foreign key (roadmap_id)
    references public.roadmaps (id) on delete cascade,
  constraint trades_outcome_sign check (
    (outcome = 'WIN' and pnl > 0) or (outcome = 'LOSS' and pnl < 0) or (outcome = 'BE' and pnl = 0)),
  constraint trades_unique_no unique (daily_record_id, trade_no)
);
create index trades_user_idx    on public.trades (user_id);
create index trades_roadmap_idx on public.trades (roadmap_id);
create index trades_day_idx     on public.trades (daily_record_id);
create trigger trg_trades_updated before update on public.trades
  for each row execute function public.set_updated_at();

create or replace function public.trades_before_insert() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.daily_records d where d.id = new.daily_record_id and d.entry_mode = 'summary') then
    raise exception 'Quick-summary days cannot hold individual trades';
  end if;
  if new.trade_no is null then
    select coalesce(max(trade_no), 0) + 1 into new.trade_no
    from public.trades where daily_record_id = new.daily_record_id;
  end if;
  return new;
end $$;
create trigger trg_trades_before_insert before insert on public.trades
  for each row execute function public.trades_before_insert();

create or replace function public.recalc_daily_record() returns trigger
language plpgsql as $$
declare rid uuid;
begin
  rid := case when tg_op = 'DELETE' then old.daily_record_id else new.daily_record_id end;
  update public.daily_records d set
    total_trades = s.n, wins = s.w, losses = s.l, break_evens = s.b,
    gross_profit = s.gp, gross_loss = s.gl
  from (
    select count(*)::int n,
           (count(*) filter (where outcome = 'WIN'))::int w,
           (count(*) filter (where outcome = 'LOSS'))::int l,
           (count(*) filter (where outcome = 'BE'))::int b,
           coalesce(sum(pnl) filter (where pnl > 0), 0) gp,
           coalesce(-sum(pnl) filter (where pnl < 0), 0) gl
    from public.trades where daily_record_id = rid
  ) s
  where d.id = rid;
  return null;
end $$;
create trigger trg_trades_recalc after insert or update or delete on public.trades
  for each row execute function public.recalc_daily_record();

create or replace function public.create_detailed_day(
  p_roadmap_id uuid, p_trade_date date, p_session text, p_notes text, p_trades jsonb
) returns uuid language plpgsql security invoker as $$
declare v_id uuid; t jsonb;
begin
  insert into public.daily_records (user_id, roadmap_id, trade_date, entry_mode, session, notes)
  values (auth.uid(), p_roadmap_id, p_trade_date, 'detailed', nullif(p_session,''), nullif(p_notes,''))
  returning id into v_id;

  for t in select * from jsonb_array_elements(coalesce(p_trades, '[]'::jsonb)) loop
    insert into public.trades (user_id, roadmap_id, daily_record_id, symbol, session, outcome,
                               risk_amount, rr_achieved, pnl, notes)
    values (auth.uid(), p_roadmap_id, v_id, coalesce(nullif(t->>'symbol',''), 'XAUUSD'),
            nullif(t->>'session',''), t->>'outcome',
            coalesce((t->>'risk_amount')::numeric, 0), nullif(t->>'rr_achieved','')::numeric,
            (t->>'pnl')::numeric, nullif(t->>'notes',''));
  end loop;
  return v_id;
end $$;

-- RLS
alter table public.profiles      enable row level security;
alter table public.roadmaps      enable row level security;
alter table public.daily_records enable row level security;
alter table public.trades        enable row level security;

create policy profiles_select on public.profiles for select using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy roadmaps_select on public.roadmaps for select using (user_id = (select auth.uid()));
create policy roadmaps_insert on public.roadmaps for insert with check (user_id = (select auth.uid()));
create policy roadmaps_update on public.roadmaps for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy roadmaps_delete on public.roadmaps for delete using (user_id = (select auth.uid()));

create policy daily_select on public.daily_records for select using (user_id = (select auth.uid()));
create policy daily_insert on public.daily_records for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.roadmaps r where r.id = roadmap_id and r.user_id = (select auth.uid())));
create policy daily_update on public.daily_records for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy daily_delete on public.daily_records for delete using (user_id = (select auth.uid()));

create policy trades_select on public.trades for select using (user_id = (select auth.uid()));
create policy trades_insert on public.trades for insert with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.roadmaps r where r.id = roadmap_id and r.user_id = (select auth.uid())));
create policy trades_update on public.trades for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy trades_delete on public.trades for delete using (user_id = (select auth.uid()));

grant execute on function public.create_detailed_day(uuid, date, text, text, jsonb) to authenticated;
