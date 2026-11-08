-- ============================================================
-- Admins are the only ones who can add, change or delete shared data.
-- Reads of the public catalogue stay open to everyone.
-- Before this, any signed-in account (and for rego_vin_cache anyone at
-- all) could write. Public sign-up is open since the VIN decoder launch.
-- Uses the existing public.user_has_role(text) helper.
-- Server code using the service-role key is not affected by RLS.
-- ============================================================

-- vehicles: admin insert / update / delete
drop policy if exists "Allow insert for authenticated users" on public.vehicles;
drop policy if exists "Allow update for authenticated users" on public.vehicles;
drop policy if exists "Allow delete for authenticated users" on public.vehicles;
drop policy if exists "vehicles_admin_write" on public.vehicles;
create policy "vehicles_admin_write" on public.vehicles for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- parts: admin insert / update / delete
drop policy if exists "Allow insert for authenticated users" on public.parts;
drop policy if exists "Allow update for authenticated users" on public.parts;
drop policy if exists "Allow delete for authenticated users" on public.parts;
drop policy if exists "parts_admin_write" on public.parts;
create policy "parts_admin_write" on public.parts for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- makes: admin insert / update / delete
drop policy if exists "Authenticated insert" on public.makes;
drop policy if exists "Authenticated update" on public.makes;
drop policy if exists "makes_admin_write" on public.makes;
create policy "makes_admin_write" on public.makes for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- cross_references: admin insert / update / delete; reads stay public
drop policy if exists "Allow authenticated inserts" on public.cross_references;
drop policy if exists "cross_references_admin_write" on public.cross_references;
create policy "cross_references_admin_write" on public.cross_references for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- vehicle_part_fitments: admin insert / update / delete (previously nobody could write from the app)
drop policy if exists "fitments_admin_write" on public.vehicle_part_fitments;
create policy "fitments_admin_write" on public.vehicle_part_fitments for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- part_categories: admin insert / update / delete (previously nobody could write from the app)
drop policy if exists "part_categories_admin_write" on public.part_categories;
create policy "part_categories_admin_write" on public.part_categories for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- rego_vin_cache: was writable by ANYONE (even not signed in). Reads stay public.
-- Note: the rego API currently writes with the anon key; when rego is re-enabled
-- it must switch to the service-role key.
drop policy if exists "Public insert" on public.rego_vin_cache;
drop policy if exists "Public update" on public.rego_vin_cache;
drop policy if exists "rego_cache_admin_write" on public.rego_vin_cache;
create policy "rego_cache_admin_write" on public.rego_vin_cache for all
  using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- vehicle_sightings: only capture staff and admins may submit (was any signed-in account)
drop policy if exists "sightings_insert_own" on public.vehicle_sightings;
create policy "sightings_insert_own" on public.vehicle_sightings for insert
  with check (submitted_by = auth.uid() and (public.user_has_role('capture') or public.user_has_role('admin')));

-- capture photo uploads: only capture staff and admins (was any signed-in account)
drop policy if exists "captures_upload_own" on storage.objects;
create policy "captures_upload_own" on storage.objects for insert
  with check (bucket_id = 'captures' and (storage.foldername(name))[1] = auth.uid()::text
              and (public.user_has_role('capture') or public.user_has_role('admin')));
drop policy if exists "sightings_upload_own" on storage.objects;
create policy "sightings_upload_own" on storage.objects for insert
  with check (bucket_id = 'sightings' and (storage.foldername(name))[1] = auth.uid()::text
              and (public.user_has_role('capture') or public.user_has_role('admin')));
