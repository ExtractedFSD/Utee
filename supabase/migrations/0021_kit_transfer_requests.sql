-- Someone scans a kit that belongs to another account (a gift bought
-- online) and asks to use it. The buyer gets an email naming them and
-- passes the kit on with one tap from that email, no sign-in needed. The
-- link is a one-time token (stored hashed) that expires after a week.
create table kit_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  requester_id uuid not null references profiles (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  decided_at timestamptz,
  decided_via text check (decided_via in ('email', 'portal'))
);

create index kit_transfer_requests_kit_idx on kit_transfer_requests (kit_id, status);
create index kit_transfer_requests_requester_idx on kit_transfer_requests (requester_id, status);

alter table kit_transfer_requests enable row level security;

create policy "own transfer requests" on kit_transfer_requests
  for select using (requester_id = auth.uid() or owner_id = auth.uid());
