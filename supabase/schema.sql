-- Clean slate
drop table if exists public.fateh_exercise_logs cascade;
drop table if exists public.fateh_workout_logs cascade;
drop table if exists public.fateh_plan_exercises cascade;
drop table if exists public.fateh_plan_days cascade;
drop table if exists public.fateh_plans cascade;
drop table if exists public.fateh_body_weight_log cascade;
drop table if exists public.fateh_profiles cascade;
drop trigger if exists fateh_on_auth_user_created on auth.users;
drop function if exists public.fateh_handle_new_user();

create table public.fateh_profiles (
  phone text primary key,
  display_name text,
  current_plan_id uuid,
  created_at timestamptz default now()
);
alter table public.fateh_profiles disable row level security;

create table public.fateh_body_weight_log (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.fateh_profiles(phone) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz default now(),
  unique(phone, date)
);
alter table public.fateh_body_weight_log disable row level security;

create table public.fateh_plans (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.fateh_profiles(phone) on delete cascade,
  name text not null,
  split_type text not null,
  days_per_week int not null,
  duration_mins int not null,
  equipment text[] not null default '{}',
  goal text not null,
  created_at timestamptz default now()
);
alter table public.fateh_plans disable row level security;

create table public.fateh_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.fateh_plans(id) on delete cascade,
  day_of_week int not null,
  label text not null,
  muscle_groups text[] not null default '{}',
  sort_order int not null default 0
);
alter table public.fateh_plan_days disable row level security;

create table public.fateh_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.fateh_plan_days(id) on delete cascade,
  exercise_id text not null,
  sets int not null default 3,
  reps text not null default '10-12',
  rest_seconds int not null default 60,
  sort_order int not null default 0
);
alter table public.fateh_plan_exercises disable row level security;

create table public.fateh_workout_logs (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.fateh_profiles(phone) on delete cascade,
  plan_day_id uuid references public.fateh_plan_days(id),
  date date not null,
  completed_at timestamptz default now(),
  duration_mins int,
  notes text
);
alter table public.fateh_workout_logs disable row level security;

create table public.fateh_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.fateh_workout_logs(id) on delete cascade,
  exercise_id text not null,
  sets jsonb not null default '[]',
  notes text
);
alter table public.fateh_exercise_logs disable row level security;
