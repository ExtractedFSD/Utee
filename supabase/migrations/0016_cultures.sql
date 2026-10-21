-- UTI passport, phase 2: full culture and advanced test results. One row per
-- sample: when, which method, what was found, each organism's sensitivities
-- (S, I or R per antibiotic) and the microscopy counts. Patient-entered, or
-- read from a photographed report and confirmed by the patient; a Utee test
-- result is merged in at read time rather than copied here.
create table if not exists tracker_cultures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  episode_id uuid references tracker_episodes (id) on delete set null,
  sample_on date,
  method text not null default 'standard_culture',
  method_other text,
  outcome text not null default 'unknown' check (outcome in ('pathogens', 'mixed_growth', 'no_significant_growth', 'no_growth', 'unknown')),
  organisms jsonb not null default '[]',
  sensitivities jsonb not null default '{}',
  microscopy jsonb not null default '{}',
  notes text,
  source text not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tracker_cultures_user_idx on tracker_cultures (user_id, sample_on desc);

alter table tracker_cultures enable row level security;
create policy "own rows select" on tracker_cultures for select to authenticated using (user_id = auth.uid());
create policy "own rows insert" on tracker_cultures for insert to authenticated with check (user_id = auth.uid());
create policy "own rows update" on tracker_cultures for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows delete" on tracker_cultures for delete to authenticated using (user_id = auth.uid());
