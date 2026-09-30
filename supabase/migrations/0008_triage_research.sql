-- Optional research consent given on the pre-sample questionnaire, separate
-- from the consent needed to test the sample. Off unless the patient ticks it.
alter table triage_submissions
  add column if not exists research_consent boolean not null default false,
  add column if not exists research_consent_text text;
