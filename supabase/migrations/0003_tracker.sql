-- UTI tracker: user-owned health diary. Every table is scoped to the owning
-- user by row-level security; the app reads and writes it with the user's
-- own session, never the service role (exceptions: aggregate counts on the
-- super-admin dashboard, and the reminder job, both documented in README).

create table tracker_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('tracker', 'research')),
  consent_version text not null,
  consent_text text not null,
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index tracker_consents_user_idx on tracker_consents (user_id, kind, given_at desc);

create table tracker_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  date_of_birth date,
  age_band text,
  menopause_stage text,
  contraception text,
  pregnant_or_trying text not null default 'no',
  preventive_treatment_id text,
  preventive_treatment_other text,
  reminder_daily boolean not null default false,
  reminder_monthly boolean not null default false,
  last_treatment_source text,
  last_reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tracker_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  started_on date not null,
  ended_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);
create index tracker_episodes_user_idx on tracker_episodes (user_id, started_on desc);

create table tracker_symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid not null references tracker_episodes (id) on delete cascade,
  symptom text not null,
  other_text text,
  logged_on date not null,
  created_at timestamptz not null default now()
);
create index tracker_symptoms_episode_idx on tracker_symptoms (episode_id);
create index tracker_symptoms_user_idx on tracker_symptoms (user_id);

create table tracker_triggers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid not null references tracker_episodes (id) on delete cascade,
  trigger text not null,
  other_text text,
  logged_on date not null,
  created_at timestamptz not null default now()
);
create index tracker_triggers_episode_idx on tracker_triggers (episode_id);
create index tracker_triggers_user_idx on tracker_triggers (user_id);

create table tracker_treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid not null references tracker_episodes (id) on delete cascade,
  antibiotic_id text not null,
  other_name text,
  dmd_code text,
  started_on date,
  days integer check (days is null or (days > 0 and days <= 365)),
  course_type text,
  source text,
  worked text,
  created_at timestamptz not null default now()
);
create index tracker_treatments_episode_idx on tracker_treatments (episode_id);
create index tracker_treatments_user_idx on tracker_treatments (user_id);

create table tracker_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid not null references tracker_episodes (id) on delete cascade,
  kind text not null,
  tested_on date,
  result text,
  notes text,
  kit_id uuid references kits (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tracker_tests_episode_idx on tracker_tests (episode_id);
create index tracker_tests_user_idx on tracker_tests (user_id);

create table tracker_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid references tracker_episodes (id) on delete set null,
  on_date date not null,
  feeling integer not null check (feeling between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, on_date)
);

-- Actions on tracker data (consent changes, exports, deletes, system jobs).
-- Written by the user's own session or by the server; users can read their own.
create table tracker_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  action text not null,
  detail jsonb,
  actor text not null default 'user',
  created_at timestamptz not null default now()
);
create index tracker_audit_log_user_idx on tracker_audit_log (user_id, created_at desc);

-- Row-level security: owner only, on every table.
do $$
declare t text;
begin
  foreach t in array array['tracker_consents','tracker_profiles','tracker_episodes','tracker_symptoms','tracker_triggers','tracker_treatments','tracker_tests','tracker_checkins','tracker_audit_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows select" on %I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on %I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on %I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on %I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Audit rows are append-only for users.
drop policy "own rows update" on tracker_audit_log;
drop policy "own rows delete" on tracker_audit_log;
