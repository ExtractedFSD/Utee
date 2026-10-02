-- A problem the lab could not resolve on its own: a sample that arrived
-- unusable, or a test that failed twice. Parks the kit in 'lab_query' and
-- gives Utee one record to act on.
create table lab_issues (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits (id) on delete cascade,
  kind text not null check (kind in ('sample_problem', 'failed_runs')),
  fault text,
  note text,
  reported_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id) on delete set null,
  resolution text
);
create index lab_issues_kit_idx on lab_issues (kit_id, created_at desc);
alter table lab_issues enable row level security;
