-- UTI passport, phase 1. The tracker profile gains contact details, the UTI
-- history baseline, past medical history and antibiotic allergies; treatments
-- and preventions gain the detail a clinician wants (dose, route, product);
-- investigations are new. Everything stays patient-entered and RLS-scoped to
-- the patient, like the rest of the tracker.

alter table tracker_profiles
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postcode text,
  add column if not exists local_hospital text,
  add column if not exists nhs_number text,
  add column if not exists first_uti_onset text check (first_uti_onset is null or first_uti_onset in ('childhood', 'adult', 'unsure')),
  add column if not exists first_uti_year integer check (first_uti_year is null or (first_uti_year >= 1900 and first_uti_year <= 2100)),
  add column if not exists lifetime_utis integer check (lifetime_utis is null or (lifetime_utis >= 0 and lifetime_utis <= 10000)),
  add column if not exists medical_history text[] not null default '{}',
  add column if not exists medical_history_other text,
  add column if not exists allergies jsonb not null default '[]';

alter table tracker_treatments
  add column if not exists dose text,
  add column if not exists frequency text,
  add column if not exists route text check (route is null or route in ('oral', 'iv', 'other')),
  add column if not exists reaction text;

alter table tracker_preventions
  add column if not exists product text,
  add column if not exists dose text,
  add column if not exists frequency text,
  add column if not exists course_weeks integer check (course_weeks is null or (course_weeks > 0 and course_weeks <= 520)),
  add column if not exists completed boolean;

-- One row per investigation: what, when, normal or not, structured findings
-- for that kind of test, the few numbers that matter, and a note.
create table if not exists tracker_investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  performed_on date,
  normal boolean,
  findings text[] not null default '{}',
  body_part text,
  values jsonb not null default '{}',
  notes text,
  source text not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tracker_investigations_user_idx on tracker_investigations (user_id, performed_on desc);

alter table tracker_investigations enable row level security;
create policy "own rows select" on tracker_investigations for select to authenticated using (user_id = auth.uid());
create policy "own rows insert" on tracker_investigations for insert to authenticated with check (user_id = auth.uid());
create policy "own rows update" on tracker_investigations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows delete" on tracker_investigations for delete to authenticated using (user_id = auth.uid());
