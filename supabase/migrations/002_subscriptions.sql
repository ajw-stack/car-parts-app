-- ============================================================
-- Stage 2: VIN decoder subscriptions (Stripe) + decode usage
-- Run in the Supabase SQL editor (or via the MCP apply_migration).
-- ============================================================

-- One row per user. Written ONLY by the Stripe webhook / billing routes
-- (service role). Users may read their own row.
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text not null default 'none',   -- none | trialing | active | past_due | canceled | unpaid | incomplete | incomplete_expired | paused | blocked
  price_id               text,
  trial_start            timestamptz,
  trial_end              timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_used             boolean not null default false, -- set once a trial has been granted; a later signup gets no trial
  note                   text,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_self_select" on public.subscriptions;
create policy "subscriptions_self_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- One row per successful decode. Written by the decode API (service role).
create table if not exists public.decode_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vin        text not null,
  created_at timestamptz not null default now()
);

create index if not exists decode_usage_user_created_idx on public.decode_usage (user_id, created_at desc);

alter table public.decode_usage enable row level security;

drop policy if exists "decode_usage_self_select" on public.decode_usage;
create policy "decode_usage_self_select" on public.decode_usage
  for select using (auth.uid() = user_id);

-- One free trial per card. The webhook records the Stripe card fingerprint when a
-- trial starts; a second trial on the same card is cancelled immediately.
create table if not exists public.trial_cards (
  fingerprint text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.trial_cards enable row level security;
-- no user-facing policies: service role only
