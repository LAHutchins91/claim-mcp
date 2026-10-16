-- Additive only: nullable columns and new tables. No existing data changes.
alter table public.claim_approved_claims add column if not exists expires_at timestamptz;
alter table public.claim_offers add column if not exists expires_at timestamptz;

create table if not exists public.claim_fact_versions (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  fact_type text not null check (fact_type in ('claim', 'offer')),
  fact_id uuid not null,
  revision integer not null,
  snapshot jsonb not null,
  replaced_at timestamptz not null default now()
);
create index if not exists claim_fact_versions_fact on public.claim_fact_versions (brand_id, fact_id, revision desc);

create table if not exists public.claim_fact_usage (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  tool text not null,
  fact_type text not null check (fact_type in ('claim', 'offer')),
  fact_id uuid not null,
  revision integer not null,
  stale boolean not null default false,
  used_at timestamptz not null default now()
);
create index if not exists claim_fact_usage_brand on public.claim_fact_usage (brand_id, used_at desc);

alter table public.claim_fact_versions enable row level security;
alter table public.claim_fact_usage enable row level security;
drop policy if exists claim_fact_versions_owner on public.claim_fact_versions;
create policy claim_fact_versions_owner on public.claim_fact_versions for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));
drop policy if exists claim_fact_usage_owner on public.claim_fact_usage;
create policy claim_fact_usage_owner on public.claim_fact_usage for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));
grant select, insert on public.claim_fact_versions to authenticated;
grant select, insert on public.claim_fact_usage to authenticated;
