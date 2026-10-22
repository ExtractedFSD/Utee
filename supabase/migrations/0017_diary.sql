-- UTI Passport, phase 3: diary and symptom scoring.
-- Each symptom logged on a day can carry how bad it was (1 mild to 10 worst).
alter table tracker_symptoms add column severity integer check (severity between 1 and 10);

-- A day's check-in can carry a short diary note, and a note can stand alone
-- without a feeling, so the feeling is no longer required.
alter table tracker_checkins add column note text;
alter table tracker_checkins alter column feeling drop not null;
