-- ============================================================
-- Stage 1: profiles (role system) + vehicle_sightings
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────────────────
-- Roles: 'admin' = existing site admin
--        'capture' = field photographer, no admin access
--        'viewer'  = default, no special routes

create table if not exists public.profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  constraint profiles_role_check check (role in ('admin', 'capture', 'viewer'))
);

alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

-- Auto-create a 'viewer' profile for every new signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used in RLS policies below
create or replace function public.user_has_role(check_role text)
returns boolean language sql security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = check_role
  );
$$;


-- ── vehicle_sightings ─────────────────────────────────────────────────────

create table public.vehicle_sightings (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null    default now(),
  submitted_by       uuid        not null    references auth.users(id),

  -- required
  make               text        not null,
  model              text        not null,

  -- optional identification
  rego_state         text,
  rego_plate         text,
  vin                text,

  -- optional vehicle detail
  build_year         int,
  series             text,
  badge              text,
  body_style         text,
  engine_capacity    numeric,
  engine_code        text,
  cylinders          int,
  fuel_type          text,
  transmission       text,
  drivetrain         text,
  exhaust_tip_count  int,
  colour             text,
  notes              text,

  -- photos: storage paths, not public URLs
  photo_plate_path   text,
  photo_vin_path     text,
  photo_extra_paths  text[],

  -- review workflow
  status             text        not null    default 'pending',
  verified_vin       text,
  reviewed_at        timestamptz,
  reviewed_by        uuid        references auth.users(id),
  review_note        text,

  -- dedupe: generated on the client before upload, prevents duplicate rows on retry
  client_uuid        uuid        unique      not null,

  constraint vehicle_sightings_status_check
    check (status in ('pending', 'confirmed', 'flagged', 'rejected'))
);

create index on public.vehicle_sightings (status, created_at desc);
create index on public.vehicle_sightings (vin);
create index on public.vehicle_sightings (rego_state, rego_plate);

alter table public.vehicle_sightings enable row level security;

-- Submitters: insert own rows
create policy "sightings_insert_own" on public.vehicle_sightings
  for insert
  with check (submitted_by = auth.uid());

-- Submitters see their own rows; admins see all
create policy "sightings_select" on public.vehicle_sightings
  for select
  using (
    submitted_by = auth.uid()
    or public.user_has_role('admin')
  );

-- Admin only: update + delete
create policy "sightings_update_admin" on public.vehicle_sightings
  for update
  using (public.user_has_role('admin'))
  with check (public.user_has_role('admin'));

create policy "sightings_delete_admin" on public.vehicle_sightings
  for delete
  using (public.user_has_role('admin'));
