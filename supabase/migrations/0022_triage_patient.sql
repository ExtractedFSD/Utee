-- Who the test is for, recorded with the symptom form, per kit rather than
-- per account: the person themselves (name and date of birth confirmed),
-- or a dependant the account holder looks after and answers for. The
-- report, the clinic case and the passport read this, not the account.
alter table triage_submissions add column if not exists patient jsonb;
