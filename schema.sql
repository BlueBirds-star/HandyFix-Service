-- HandyFix database schema for Supabase.
-- Run this once in the Supabase dashboard: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Technicians
-- ---------------------------------------------------------------
create table if not exists public.workers (
  id          text primary key,
  name        text not null,
  trade       text not null check (trade in ('Electrical', 'Plumbing')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Jobs (one row per customer request)
-- ---------------------------------------------------------------
create table if not exists public.jobs (
  id            bigint primary key,
  token         text not null unique,          -- tracking code, e.g. HF-1042
  name          text not null,
  phone         text not null,
  email         text,                          -- needed to start a Paystack payment
  address       text not null,
  service       text not null check (service in ('Electrical', 'Plumbing')),
  urgency       text not null default 'Standard' check (urgency in ('Standard', 'Emergency')),
  description   text not null,
  status        text not null default 'requested' check (status in (
                  'requested', 'quoted', 'paid', 'assigned',
                  'enroute', 'onsite', 'completed', 'closed')),
  quote         jsonb,                          -- { "items": [ {d, q, p} ] }
  worker_id     text references public.workers(id) on delete set null,
  checks        boolean[] not null default '{}',
  events        jsonb not null default '[]'::jsonb,
  pay_ref       text,
  paid_at       timestamptz,
  completed_at  timestamptz,
  signed_by     text,
  escrow_status text check (escrow_status in ('held', 'released')),  -- money held until sign-off
  escrow_released_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_worker_idx on public.jobs (worker_id);

-- Keep updated_at current
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_touch on public.jobs;
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------
alter table public.workers enable row level security;
alter table public.jobs    enable row level security;

-- Staff (signed-in users whose app_metadata.role = 'staff') can do everything.
drop policy if exists "staff manage workers" on public.workers;
create policy "staff manage workers" on public.workers
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

drop policy if exists "staff manage jobs" on public.jobs;
create policy "staff manage jobs" on public.jobs
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- Anyone (including logged-out visitors) can submit a new request.
-- They can insert, but never read the table directly.
drop policy if exists "public submit request" on public.jobs;
create policy "public submit request" on public.jobs
  for insert to anon, authenticated
  with check (status = 'requested' and quote is null and worker_id is null);

-- Public workers list is not exposed. Technician names come through the
-- functions below only when needed.

-- ---------------------------------------------------------------
-- Customer tracking by code (no direct table read for the public)
-- ---------------------------------------------------------------
create or replace function public.get_job_by_token(p_token text)
returns table (
  token text, name text, service text, address text, urgency text,
  status text, quote jsonb, pay_ref text, paid_at timestamptz,
  completed_at timestamptz, signed_by text, worker_name text
)
language sql stable security definer set search_path = public as $$
  select j.token, j.name, j.service, j.address, j.urgency,
         j.status, j.quote, j.pay_ref, j.paid_at,
         j.completed_at, j.signed_by,
         case when j.status in ('assigned', 'enroute', 'onsite')
              then w.name end
  from public.jobs j
  left join public.workers w on w.id = j.worker_id
  where j.token = upper(trim(p_token))
  limit 1;
$$;

grant execute on function public.get_job_by_token(text) to anon, authenticated;

-- Customer confirms payment or sign-off using their tracking code.
-- Only the allowed transitions are possible.
create or replace function public.customer_mark_paid(p_token text, p_pay_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.jobs
     set status = 'paid', pay_ref = p_pay_ref, paid_at = now()
   where token = upper(trim(p_token)) and status = 'quoted';
end;
$$;

create or replace function public.customer_sign_off(p_token text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.jobs
     set status = 'closed', signed_by = p_name
   where token = upper(trim(p_token)) and status = 'completed';
end;
$$;

grant execute on function public.customer_mark_paid(text, text) to anon, authenticated;
grant execute on function public.customer_sign_off(text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Seed the three technicians shown in the app
-- ---------------------------------------------------------------
insert into public.workers (id, name, trade) values
  ('w1', 'Emeka Obi', 'Electrical'),
  ('w2', 'Tonye Briggs', 'Plumbing'),
  ('w3', 'Ifeanyi Ade', 'Electrical')
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Making someone staff (run after they sign up in Authentication):
--   update auth.users
--     set raw_app_meta_data = raw_app_meta_data || '{"role":"staff"}'
--   where email = 'owner@example.com';
-- ---------------------------------------------------------------
