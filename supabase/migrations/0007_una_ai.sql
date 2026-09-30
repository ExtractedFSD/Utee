-- Whether Una may use the AI reader on what this person types (Settings).
alter table tracker_profiles add column una_ai boolean not null default true;
