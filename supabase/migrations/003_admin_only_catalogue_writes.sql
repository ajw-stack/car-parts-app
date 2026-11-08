-- ============================================================
-- Catalogue tables: writes are ADMIN ONLY. Reads stay public.
-- Before this, any signed-in account could insert/update/delete
-- vehicles and parts and insert makes / cross references. With
-- public sign-up open for the VIN decoder that is not acceptable.
-- Uses the existing public.user_has_role(text) helper.
-- ============================================================

-- vehicles
drop policy if exists "Allow insert for authenticated users" on public.vehicles;
drop policy if exists "Allow update for authenticated users" on public.vehicles;
drop policy if exists "Allow delete for authenticated users" on public.vehicles;
create policy "vehicles_admin_insert" on public.vehicles for insert with check (public.user_has_role('admin'));
create policy "vehicles_admin_update" on public.vehicles for update using (public.user_has_role('admin')) with check (public.user_has_role('admin'));
create policy "vehicles_admin_delete" on public.vehicles for delete using (public.user_has_role('admin'));

-- parts
drop policy if exists "Allow insert for authenticated users" on public.parts;
drop policy if exists "Allow update for authenticated users" on public.parts;
drop policy if exists "Allow delete for authenticated users" on public.parts;
create policy "parts_admin_insert" on public.parts for insert with check (public.user_has_role('admin'));
create policy "parts_admin_update" on public.parts for update using (public.user_has_role('admin')) with check (public.user_has_role('admin'));
create policy "parts_admin_delete" on public.parts for delete using (public.user_has_role('admin'));

-- makes
drop policy if exists "Authenticated insert" on public.makes;
drop policy if exists "Authenticated update" on public.makes;
create policy "makes_admin_insert" on public.makes for insert with check (public.user_has_role('admin'));
create policy "makes_admin_update" on public.makes for update using (public.user_has_role('admin')) with check (public.user_has_role('admin'));

-- cross_references
drop policy if exists "Allow authenticated inserts" on public.cross_references;
create policy "cross_references_admin_insert" on public.cross_references for insert with check (public.user_has_role('admin'));
