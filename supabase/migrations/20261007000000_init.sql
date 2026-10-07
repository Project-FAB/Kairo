-- Kairo — marathon training app schema
-- Every table is private to its owner (Row Level Security on auth.uid()).


-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  weight_kg      numeric(5,1),
  lthr           int,              -- lactate-threshold heart rate (bpm)
  threshold_pace text,             -- e.g. '5:47'
  vo2max         numeric(4,1),
  est_finish     text,             -- e.g. '4:42' (optional manual override)
  theme          text not null default 'dark' check (theme in ('dark', 'light')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- plans (one active plan per athlete) ----------
create table if not exists public.plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  race_name      text not null,
  race_date      date not null,
  start_date     date not null,    -- Monday of week 0 (baseline week)
  target_label   text not null,    -- 'Sub 4:30'
  target_seconds int  not null,    -- 16200
  target_pace    text not null,    -- '6:24'
  template       text not null default 'tokyo-2027-21wk',
  created_at     timestamptz not null default now(),
  unique (user_id)
);

-- ---------- sessions (every planned workout, rest days included) ----------
create table if not exists public.sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id        uuid not null references public.plans (id) on delete cascade,
  date           date not null,
  original_date  date,
  week           int  not null,
  sort           int  not null default 0,
  type           text not null,    -- easy | recovery | long | threshold | interval | mp | test | race | strength | upper | plyo | cross | rest
  kind           text not null check (kind in ('run', 'other', 'rest')),
  title          text not null,
  detail         text,
  km             numeric(5,1),
  minutes        numeric(6,1),
  pace           text,
  zone           text,
  rpe            text,
  intensity      int not null default 0 check (intensity between 0 and 5),
  purpose        text,
  is_key         boolean not null default false,
  steps          jsonb not null default '[]'::jsonb,
  fuel           jsonb,
  strength_ref   text,             -- 'A' | 'B' | 'C' | 'L'
  contacts       int,              -- plyometric foot contacts
  status         text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  completed_at   timestamptz,
  actual_km      numeric(5,2),
  actual_minutes numeric(6,1),
  avg_hr         int,
  notes          text,
  moved          boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists sessions_user_date_idx on public.sessions (user_id, date);
create index if not exists sessions_plan_week_idx on public.sessions (plan_id, week);

-- ---------- strength logs (weight + sets ticked per exercise per session) ----------
create table if not exists public.strength_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  exercise    text not null,
  sets_done   int  not null default 0,
  weight_kg   numeric(6,1),
  updated_at  timestamptz not null default now(),
  unique (session_id, exercise)
);

-- ---------- daily recovery check-in ----------
create table if not exists public.recovery_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date           date not null,
  sleep_minutes  int,
  sleep_quality  text check (sleep_quality in ('Poor', 'Fair', 'Good', 'Great')),
  resting_hr     int,
  hrv            int,
  soreness       int check (soreness between 1 and 5),   -- 1 none … 5 very sore
  energy         int check (energy between 1 and 10),
  stress         int check (stress between 1 and 10),
  shin_pain      int check (shin_pain between 0 and 10),
  checklist      jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- tests & race results ----------
create table if not exists public.test_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  name       text not null,
  value      text not null,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- shoes ----------
create table if not exists public.shoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  note       text,
  km         numeric(6,1) not null default 0,
  max_km     numeric(6,1) not null default 700,
  retired    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists sessions_updated on public.sessions;
create trigger sessions_updated before update on public.sessions for each row execute function public.set_updated_at();
drop trigger if exists strength_updated on public.strength_logs;
create trigger strength_updated before update on public.strength_logs for each row execute function public.set_updated_at();
drop trigger if exists recovery_updated on public.recovery_logs;
create trigger recovery_updated before update on public.recovery_logs for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles      enable row level security;
alter table public.plans         enable row level security;
alter table public.sessions      enable row level security;
alter table public.strength_logs enable row level security;
alter table public.recovery_logs enable row level security;
alter table public.test_results  enable row level security;
alter table public.shoes         enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own strength logs" on public.strength_logs;
create policy "own strength logs" on public.strength_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own recovery logs" on public.recovery_logs;
create policy "own recovery logs" on public.recovery_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own test results" on public.test_results;
create policy "own test results" on public.test_results
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own shoes" on public.shoes;
create policy "own shoes" on public.shoes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
