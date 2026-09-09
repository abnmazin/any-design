-- AnyDesire.Design schema — paste into Supabase SQL editor and run once.
-- Tables: profiles (one per auth user), designs (user-owned saved templates).
-- Row Level Security is mandatory: every row is readable/writable only by its
-- owner (auth.uid()).

-- This file is idempotent: safe to re-run any number of times.

-- Profile per auth user -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Saved designs -------------------------------------------------------------
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text,
  title text not null,
  size text,
  html text not null,
  css text,
  fonts text,
  thumb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designs_user_idx on public.designs (user_id);

-- Row Level Security --------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.designs enable row level security;

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists designs_all_own on public.designs;
create policy designs_all_own on public.designs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deleted templates (tombstones) --------------------------------------------
-- Marks a template as permanently removed for every user. Home filters these
-- out of the gallery. No update/delete policy on purpose: an accidental delete
-- can only be undone in the SQL editor.
create table if not exists public.deleted_templates (
  id text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

alter table public.deleted_templates enable row level security;

drop policy if exists deleted_templates_select on public.deleted_templates;
create policy deleted_templates_select on public.deleted_templates
  for select to authenticated using (true);

drop policy if exists deleted_templates_insert on public.deleted_templates;
create policy deleted_templates_insert on public.deleted_templates
  for insert to authenticated with check (true);

-- Touch updated_at on save --------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists designs_touch on public.designs;
create trigger designs_touch
  before update on public.designs
  for each row execute function public.touch_updated_at();