-- Return postage is bought on demand: when the patient has done the symptom
-- form and is ready to post, one call to Royal Mail creates a Tracked
-- Returns label for that kit. Every label is kept here (the QR for the
-- Post Office counter, the PDF, the tracking number, who asked and when)
-- so the patient can see it again, an admin can reissue it, and the
-- monthly statement can list what was spent on whose account.
create table return_labels (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  tracking_number text not null,
  unique_item_id text,
  service_code text not null,
  provider text not null check (provider in ('click_and_drop', 'stub')),
  customer_reference text not null,
  qr_png text,
  label_pdf text,
  sender jsonb not null,
  requested_by uuid references profiles (id) on delete set null,
  requested_role user_role,
  cost_pence int not null default 0,
  created_at timestamptz not null default now(),
  replaced_at timestamptz,
  replaced_by uuid references return_labels (id) on delete set null
);

create index return_labels_kit_idx on return_labels (kit_id, created_at desc);
create index return_labels_created_idx on return_labels (created_at desc);

alter table return_labels enable row level security;

create policy "own return labels" on return_labels
  for select using (exists (
    select 1 from kits k where k.id = return_labels.kit_id and k.customer_id = auth.uid()
  ));
