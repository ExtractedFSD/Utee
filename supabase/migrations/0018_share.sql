-- UTI Passport, phase 4: sharing, clinician verification.

-- A share is a time-limited code that opens a read-only copy of the passport
-- without signing in. The code is the only credential, so it is long and
-- random; it is normalised to upper case with no separators before lookup.
create table tracker_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  code text not null unique,
  label text,
  consent_text text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0
);
create index tracker_shares_user_idx on tracker_shares (user_id, created_at desc);

-- A clinician's confirmation that one patient-entered entry matches the
-- original report. Written by the server after a staff role check, never
-- by the patient; editing or deleting the entry removes it.
create table tracker_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  entity text not null check (entity in ('investigation', 'culture')),
  entity_id uuid not null,
  verified_by uuid not null references profiles (id) on delete cascade,
  verified_name text not null,
  verified_at timestamptz not null default now(),
  share_id uuid references tracker_shares (id) on delete set null,
  unique (entity, entity_id)
);
create index tracker_verifications_user_idx on tracker_verifications (user_id);

alter table tracker_shares enable row level security;
create policy "own rows select" on tracker_shares for select to authenticated using (user_id = auth.uid());
create policy "own rows insert" on tracker_shares for insert to authenticated with check (user_id = auth.uid());
create policy "own rows update" on tracker_shares for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows delete" on tracker_shares for delete to authenticated using (user_id = auth.uid());

-- Patients can read who verified what; only the server writes.
alter table tracker_verifications enable row level security;
create policy "own rows select" on tracker_verifications for select to authenticated using (user_id = auth.uid());
