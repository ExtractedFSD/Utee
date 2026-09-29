-- What people take or do to help prevent UTIs: supplements, medicines,
-- hormonal options, vaccines, creams and habits. One row per thing, with an
-- optional start and stop so the history is kept, and a self-rating.
create table tracker_preventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  option_key text not null,
  other_name text,
  antibiotic_id text,
  started_on date,
  stopped_on date,
  helping text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracker_preventions_dates check (stopped_on is null or started_on is null or stopped_on >= started_on)
);
create index tracker_preventions_user_idx on tracker_preventions (user_id, stopped_on);

alter table tracker_preventions enable row level security;
create policy "own rows select" on tracker_preventions for select to authenticated using (user_id = auth.uid());
create policy "own rows insert" on tracker_preventions for insert to authenticated with check (user_id = auth.uid());
create policy "own rows update" on tracker_preventions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows delete" on tracker_preventions for delete to authenticated using (user_id = auth.uid());

-- Carry over the single preventive antibiotic that "About you" used to store.
insert into tracker_preventions (user_id, option_key, antibiotic_id, other_name)
select user_id,
       'low_dose_antibiotic',
       case when preventive_treatment_id = 'other' then null else preventive_treatment_id end,
       preventive_treatment_other
from tracker_profiles
where preventive_treatment_id is not null;
