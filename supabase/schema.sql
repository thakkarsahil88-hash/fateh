-- Run this in your Supabase SQL editor (safe to run alongside existing tables)

-- Fateh: user profiles
create table public.fateh_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  current_plan_id uuid,
  created_at timestamptz default now()
);
alter table public.fateh_profiles enable row level security;
create policy "fateh: view own profile" on public.fateh_profiles for select using (auth.uid() = id);
create policy "fateh: update own profile" on public.fateh_profiles for update using (auth.uid() = id);
create policy "fateh: insert own profile" on public.fateh_profiles for insert with check (auth.uid() = id);

-- Fateh: body weight log
create table public.fateh_body_weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.fateh_profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table public.fateh_body_weight_log enable row level security;
create policy "fateh: manage own weight log" on public.fateh_body_weight_log
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fateh: workout plans
create table public.fateh_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.fateh_profiles(id) on delete cascade,
  name text not null,
  split_type text not null,
  days_per_week int not null,
  duration_mins int not null,
  equipment text[] not null default '{}',
  goal text not null,
  created_at timestamptz default now()
);
alter table public.fateh_plans enable row level security;
create policy "fateh: manage own plans" on public.fateh_plans
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fateh: plan days
create table public.fateh_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.fateh_plans(id) on delete cascade,
  day_of_week int not null,
  label text not null,
  muscle_groups text[] not null default '{}',
  sort_order int not null default 0
);
alter table public.fateh_plan_days enable row level security;
create policy "fateh: access own plan days" on public.fateh_plan_days
  using (exists (select 1 from public.fateh_plans p where p.id = plan_id and p.user_id = auth.uid()));

-- Fateh: plan exercises
create table public.fateh_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.fateh_plan_days(id) on delete cascade,
  exercise_id text not null,
  sets int not null default 3,
  reps text not null default '10-12',
  rest_seconds int not null default 60,
  sort_order int not null default 0
);
alter table public.fateh_plan_exercises enable row level security;
create policy "fateh: access own plan exercises" on public.fateh_plan_exercises
  using (exists (
    select 1 from public.fateh_plan_days pd
    join public.fateh_plans p on p.id = pd.plan_id
    where pd.id = plan_day_id and p.user_id = auth.uid()
  ));

-- Fateh: workout logs
create table public.fateh_workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.fateh_profiles(id) on delete cascade,
  plan_day_id uuid references public.fateh_plan_days(id),
  date date not null,
  completed_at timestamptz default now(),
  duration_mins int,
  notes text
);
alter table public.fateh_workout_logs enable row level security;
create policy "fateh: manage own workout logs" on public.fateh_workout_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fateh: exercise logs
create table public.fateh_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.fateh_workout_logs(id) on delete cascade,
  exercise_id text not null,
  sets jsonb not null default '[]',
  notes text
);
alter table public.fateh_exercise_logs enable row level security;
create policy "fateh: access own exercise logs" on public.fateh_exercise_logs
  using (exists (
    select 1 from public.fateh_workout_logs wl
    where wl.id = workout_log_id and wl.user_id = auth.uid()
  ));

-- Trigger: auto-create fateh profile on signup
create or replace function public.fateh_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.fateh_profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists fateh_on_auth_user_created on auth.users;
create trigger fateh_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.fateh_handle_new_user();
