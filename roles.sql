-- Role-based access for jobs and technicians.
-- Run once in Supabase > SQL Editor > New query > Run. Safe to run again.

-- Admin: full access to jobs and technicians
drop policy if exists "staff manage jobs" on public.jobs;
drop policy if exists "admin manage jobs" on public.jobs;
create policy "admin manage jobs" on public.jobs
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "staff manage workers" on public.workers;
drop policy if exists "admin manage workers" on public.workers;
create policy "admin manage workers" on public.workers
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Signed-in staff can read the technician list (names and trades)
drop policy if exists "signed in read workers" on public.workers;
create policy "signed in read workers" on public.workers
  for select to authenticated
  using (true);

-- Technician: can see and update only jobs assigned to them.
-- Their worker id is 'w' + the first 12 characters of their login id (same rule the server uses).
drop policy if exists "technician read own jobs" on public.jobs;
create policy "technician read own jobs" on public.jobs
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'technician'
    and worker_id = 'w' || substr(replace(auth.uid()::text, '-', ''), 1, 12)
  );

drop policy if exists "technician update own jobs" on public.jobs;
create policy "technician update own jobs" on public.jobs
  for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'technician'
    and worker_id = 'w' || substr(replace(auth.uid()::text, '-', ''), 1, 12)
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'technician'
    and worker_id = 'w' || substr(replace(auth.uid()::text, '-', ''), 1, 12)
  );

-- Customers can still submit new requests without signing in (unchanged from schema.sql).
