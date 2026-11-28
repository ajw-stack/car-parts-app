-- ============================================================
-- Stage 4: vin_feedback — "this decode looks wrong" reports from users.
-- Inserts happen only through /api/vin/feedback (service role, signed-in users, rate-limited).
-- Admins read and triage the reports at /admin/vin-feedback.
-- ============================================================

create table if not exists public.vin_feedback (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null    default now(),
  user_id         uuid        references auth.users(id) on delete set null,
  vin             text        not null check (char_length(vin) = 17),
  decoded         jsonb,                    -- what our decoder said at the time (re-decoded server-side)
  wrong_fields    text[]      not null default '{}',
  correct_make    text,
  correct_model   text,
  correct_year    text,
  correct_details text,                     -- engine / variant / series as the user knows it
  evidence        text,                     -- how they know (compliance plate, build sticker, papers...)
  comment         text,
  status          text        not null default 'new',
  admin_note      text,
  updated_at      timestamptz not null    default now(),
  constraint vin_feedback_status_check check (status in ('new', 'checking', 'fixed', 'not_a_fault'))
);

create index if not exists vin_feedback_status_idx on public.vin_feedback (status, created_at desc);
create index if not exists vin_feedback_user_idx on public.vin_feedback (user_id, created_at desc);

alter table public.vin_feedback enable row level security;

-- No insert/select policy for ordinary users: the API route writes with the service role.
create policy "vin_feedback_admin_select" on public.vin_feedback
  for select using (public.user_has_role('admin'));

create policy "vin_feedback_admin_update" on public.vin_feedback
  for update using (public.user_has_role('admin')) with check (public.user_has_role('admin'));
