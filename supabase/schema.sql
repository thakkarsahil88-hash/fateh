-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  current_plan_id uuid,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Body weight log
create table public.body_weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table public.body_weight_log enable row level security;
create policy "Users manage own weight log" on public.body_weight_log
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  split_type text not null,
  days_per_week int not null,
  duration_mins int not null,
  equipment text[] not null default '{}',
  goal text not null,
  created_at timestamptz default now()
);
alter table public.plans enable row level security;
create policy "Users manage own plans" on public.plans
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Plan days (e.g., Monday = Push, Wednesday = Pull)
create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  day_of_week int not null, -- 0=Monday 6=Sunday
  label text not null,
  muscle_groups text[] not null default '{}',
  sort_order int not null default 0
);
alter table public.plan_days enable row level security;
create policy "Users access own plan days" on public.plan_days
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()));

-- Plan exercises (exercises assigned to a plan day)
create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days(id) on delete cascade,
  exercise_id text not null,
  sets int not null default 3,
  reps text not null default '10-12',
  rest_seconds int not null default 60,
  sort_order int not null default 0
);
alter table public.plan_exercises enable row level security;
create policy "Users access own plan exercises" on public.plan_exercises
  using (exists (
    select 1 from public.plan_days pd
    join public.plans p on p.id = pd.plan_id
    where pd.id = plan_day_id and p.user_id = auth.uid()
  ));

-- Workout logs (completed sessions)
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_day_id uuid references public.plan_days(id),
  date date not null,
  completed_at timestamptz default now(),
  duration_mins int,
  notes text
);
alter table public.workout_logs enable row level security;
create policy "Users manage own workout logs" on public.workout_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exercise logs (sets within a workout session)
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  exercise_id text not null,
  sets jsonb not null default '[]', -- [{reps: int, weight_kg: float}]
  notes text
);
alter table public.exercise_logs enable row level security;
create policy "Users access own exercise logs" on public.exercise_logs
  using (exists (
    select 1 from public.workout_logs wl
    where wl.id = workout_log_id and wl.user_id = auth.uid()
  ));

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
