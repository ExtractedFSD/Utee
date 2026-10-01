-- Lab results as the Lodestar rapid culture sheet records them: which of the
-- six uropathogens were positive, plus the three controls that decide
-- whether the run was valid. Earlier attempts on the same specimen are kept.
alter table lab_results
  add column organisms text[] not null default '{}',
  add column controls jsonb,
  add column valid boolean not null default true,
  add column previous_attempts jsonb not null default '[]';

-- Every email the portal sends, so a missing one can be found.
create table email_log (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid references kits (id) on delete set null,
  to_email text not null,
  subject text not null,
  kind text,
  status text not null default 'sent',
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_log_kit_idx on email_log (kit_id, created_at desc);
create index email_log_created_idx on email_log (created_at desc);
create index email_log_provider_idx on email_log (provider_id);
alter table email_log enable row level security;
