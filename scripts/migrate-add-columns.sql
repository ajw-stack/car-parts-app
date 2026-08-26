-- Schema migration: add new vehicle classification columns
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- Rename grade to engine_badge
ALTER TABLE vehicles RENAME COLUMN grade TO engine_badge;

-- Add new columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cosmetic_pack TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS awd_system TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS induction TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_system TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS carb_count INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS battery_kwh NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS front_motor_kw INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rear_motor_kw INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission_badge TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission_brand TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vvt TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS edition TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS roof_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS segment TEXT;
