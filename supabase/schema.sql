-- Claim brand guide. Apply in the Supabase SQL editor. No secrets belong in this file.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'trial',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  voice_summary text,
  voice_traits text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_approved_claims (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  statement text not null check (char_length(statement) between 1 and 12000),
  status text not null default 'APPROVED' check (status in ('APPROVED', 'RETIRED')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_offers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  terms text not null check (char_length(terms) between 1 and 12000),
  active boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_proof (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  claim_id uuid references public.claim_approved_claims (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  source text not null check (char_length(source) between 1 and 500),
  summary text not null check (char_length(summary) between 1 and 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_banned_phrases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.claim_brands (id) on delete cascade,
  phrase text not null check (char_length(phrase) between 2 and 200),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_support_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_request_buckets (
  user_id uuid primary key,
  window_start timestamptz not null,
  hits integer not null
);

create index if not exists claim_brands_owner_idx on public.claim_brands (owner_id, updated_at desc);
create index if not exists claim_approved_claims_brand_idx on public.claim_approved_claims (brand_id, updated_at desc);
create index if not exists claim_offers_brand_idx on public.claim_offers (brand_id, updated_at desc);
create index if not exists claim_proof_brand_idx on public.claim_proof (brand_id, updated_at desc);
create index if not exists claim_banned_phrases_brand_idx on public.claim_banned_phrases (brand_id, phrase);

alter table public.profiles enable row level security;
alter table public.claim_brands enable row level security;
alter table public.claim_approved_claims enable row level security;
alter table public.claim_offers enable row level security;
alter table public.claim_proof enable row level security;
alter table public.claim_banned_phrases enable row level security;
alter table public.claim_support_requests enable row level security;
alter table public.claim_request_buckets enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "own brands" on public.claim_brands
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own claims" on public.claim_approved_claims
  for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));

create policy "own offers" on public.claim_offers
  for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));

create policy "own proof" on public.claim_proof
  for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));

create policy "own banned phrases" on public.claim_banned_phrases
  for all to authenticated
  using (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.claim_brands b where b.id = brand_id and b.owner_id = auth.uid()));

create or replace function public.handle_new_claim_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_claim on auth.users;
create trigger on_auth_user_created_claim
  after insert on auth.users
  for each row execute function public.handle_new_claim_user();

create or replace function public.verify_claim_connection()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select auth.uid() is not null
$$;

create or replace function public.consume_claim_request(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket_start timestamptz := date_trunc('minute', now());
  next_hits integer;
begin
  if auth.role() is distinct from 'service_role' then
    return false;
  end if;
  insert into public.claim_request_buckets as bucket (user_id, window_start, hits)
  values (p_user, bucket_start, 1)
  on conflict (user_id) do update
    set hits = case when bucket.window_start = excluded.window_start then bucket.hits + 1 else 1 end,
        window_start = excluded.window_start
  returning hits into next_hits;
  return next_hits <= 60;
end;
$$;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.claim_brands to authenticated;
grant select, insert, update, delete on public.claim_approved_claims to authenticated;
grant select, insert, update, delete on public.claim_offers to authenticated;
grant select, insert, update, delete on public.claim_proof to authenticated;
grant select, insert, update, delete on public.claim_banned_phrases to authenticated;
grant execute on function public.verify_claim_connection() to authenticated;
grant execute on function public.consume_claim_request(uuid) to service_role;
