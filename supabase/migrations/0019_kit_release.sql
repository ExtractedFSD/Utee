-- A kit bought online belongs to the buyer's account. When the test is for
-- someone else, the buyer releases it: the kit loses its owner and becomes
-- claimable by whoever scans it next, exactly like a kit bought in a shop.
-- The order link stays for records; released_at and released_by say what
-- happened and who did it.
alter table kits
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references profiles (id) on delete set null;

create index if not exists kits_released_idx on kits (released_at) where released_at is not null;
