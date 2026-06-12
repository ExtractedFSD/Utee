-- Utee Portal — initial schema
-- Roles: customer | lab | clinic | admin | super_admin
-- Staff (lab/clinic/admin) access goes through the server with the service
-- role after an app-level role check. RLS below covers customer self-service
-- reads. All writes happen server-side.

create type user_role as enum ('customer', 'lab', 'clinic', 'admin', 'super_admin');

create type kit_status as enum (
  'created',            -- pre-printed label, not yet linked to an order
  'assigned',           -- linked to an order at fulfilment
  'shipped',            -- outbound parcel on its way to the patient
  'delivered',          -- outbound parcel delivered
  'activated',          -- patient scanned QR + submitted triage form
  'in_transit_to_lab',  -- return parcel moving
  'received_by_lab',    -- lab scanned pot and confirmed receipt
  'lab_complete',       -- lab uploaded results
  'clinic_received',    -- clinic acknowledged the case
  'report_ready',       -- clinic uploaded the final patient report
  'closed'
);

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role user_role not null default 'customer',
  shopify_customer_id text,
  created_at timestamptz not null default now()
);

-- Mirror auth.users into profiles. Role/name come from user_metadata set by
-- the admin client when the account is created (webhook or staff script).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role, shopify_customer_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer'),
    new.raw_user_meta_data ->> 'shopify_customer_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Only the auth trigger should ever invoke this; block direct RPC calls.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------------ orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null unique,
  order_number text not null,
  customer_id uuid references profiles (id) on delete set null,
  email text not null,
  total_price numeric(10, 2) not null default 0,
  currency text not null default 'GBP',
  financial_status text,
  fulfillment_status text,
  contains_test_kit boolean not null default false,
  placed_at timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  shopify_line_item_id text,
  title text not null,
  sku text,
  quantity int not null default 1,
  price numeric(10, 2) not null default 0,
  is_test_kit boolean not null default false
);

-- -------------------------------------------------------------------- kits
create table kits (
  id uuid primary key default gen_random_uuid(),
  -- Code printed in the QR (and human readable under it). Lab-facing
  -- identifier: the lab never sees who it belongs to.
  code text not null unique,
  status kit_status not null default 'created',
  order_id uuid references orders (id) on delete set null,
  order_item_id uuid references order_items (id) on delete set null,
  customer_id uuid references profiles (id) on delete set null,
  assigned_at timestamptz,
  activated_at timestamptz,
  received_by_lab_at timestamptz,
  lab_complete_at timestamptz,
  report_ready_at timestamptz,
  created_at timestamptz not null default now()
);

create index kits_customer_idx on kits (customer_id);
create index kits_status_idx on kits (status);

-- --------------------------------------------------------------- shipments
create table shipments (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  direction text not null check (direction in ('outbound', 'return')),
  carrier text not null default 'royal-mail',
  tracking_number text not null,
  status text not null default 'pending',
  last_event text,
  events jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (kit_id, direction)
);

create index shipments_tracking_idx on shipments (tracking_number);

-- -------------------------------------------------------------- kit events
-- Append-only audit trail; rows with visible_to_customer = true form the
-- customer's timeline.
create table kit_events (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  type text not null,
  label text not null,
  detail text,
  actor_role user_role,
  actor_id uuid references profiles (id) on delete set null,
  visible_to_customer boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index kit_events_kit_idx on kit_events (kit_id, created_at);

-- ------------------------------------------------------------------ triage
create table triage_submissions (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null unique references kits (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  symptoms jsonb not null,
  consent_given boolean not null default false,
  consent_text text,
  submitted_at timestamptz not null default now()
);

-- ------------------------------------------------------------- lab results
-- Never visible to customers (no RLS select policy for customers at all).
create table lab_results (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null unique references kits (id) on delete cascade,
  lab_user_id uuid references profiles (id) on delete set null,
  outcome text not null check (outcome in ('positive', 'negative', 'inconclusive')),
  organism text,
  colony_count text,
  sensitivities jsonb,
  comments text,
  report_path text, -- optional PDF in the 'lab-reports' bucket
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------- clinic reports
create table clinic_reports (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null unique references kits (id) on delete cascade,
  clinic_user_id uuid references profiles (id) on delete set null,
  status text not null default 'received' check (status in ('received', 'in_review', 'complete')),
  summary text,
  report_path text, -- final patient-facing PDF in the 'clinic-reports' bucket
  received_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ----------------------------------------------------------- subscriptions
-- Local cache of Recharge subscriptions (synced via webhook / API refresh).
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  recharge_subscription_id text not null unique,
  recharge_customer_id text,
  customer_id uuid references profiles (id) on delete cascade,
  email text,
  product_title text not null,
  variant_title text,
  price numeric(10, 2),
  currency text not null default 'GBP',
  status text not null default 'active',
  order_interval_unit text,
  order_interval_frequency int,
  next_charge_scheduled_at date,
  raw jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index subscriptions_customer_idx on subscriptions (customer_id);

-- ------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', false), ('clinic-reports', 'clinic-reports', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------------- RLS
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table kits enable row level security;
alter table shipments enable row level security;
alter table kit_events enable row level security;
alter table triage_submissions enable row level security;
alter table lab_results enable row level security;
alter table clinic_reports enable row level security;
alter table subscriptions enable row level security;

create policy "own profile" on profiles
  for select using (id = auth.uid());

create policy "own orders" on orders
  for select using (customer_id = auth.uid());

create policy "own order items" on order_items
  for select using (exists (
    select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid()
  ));

create policy "own kits" on kits
  for select using (customer_id = auth.uid());

create policy "own shipments" on shipments
  for select using (exists (
    select 1 from kits k where k.id = shipments.kit_id and k.customer_id = auth.uid()
  ));

create policy "own visible kit events" on kit_events
  for select using (
    visible_to_customer
    and exists (select 1 from kits k where k.id = kit_events.kit_id and k.customer_id = auth.uid())
  );

create policy "own triage" on triage_submissions
  for select using (customer_id = auth.uid());

-- lab_results: intentionally NO customer policy — patients never see raw lab data.

create policy "own completed clinic reports" on clinic_reports
  for select using (
    status = 'complete'
    and exists (select 1 from kits k where k.id = clinic_reports.kit_id and k.customer_id = auth.uid())
  );

create policy "own subscriptions" on subscriptions
  for select using (customer_id = auth.uid());
