-- When the patient confirmed the kit was in their hands: by scanning its QR
-- code (or typing the code at /start), or by tapping "I have my kit" on the
-- kit page. The symptom form is only offered after this, so nobody fills it
-- in days before the parcel arrives. Cleared when a kit is passed on.
alter table kits add column if not exists received_at timestamptz;
