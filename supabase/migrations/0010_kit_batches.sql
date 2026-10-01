-- A print run of kit codes. Super admins create one, download it as CSV for
-- the label printer, and mark it sent, which moves its kits to 'printed'.
create table kit_batches (
  id serial primary key,
  quantity int not null check (quantity > 0),
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_to_printer_at timestamptz,
  sent_to_printer_by uuid references profiles (id) on delete set null
);

alter table kits
  add column batch_id int references kit_batches (id) on delete restrict,
  add column sequence_number int,
  add column voided_at timestamptz,
  add column voided_by uuid references profiles (id) on delete set null,
  add column void_reason text;

-- sequence_number is the print order within a batch.
create unique index kits_batch_sequence_idx on kits (batch_id, sequence_number);
create index kits_batch_idx on kits (batch_id);

alter table kits alter column status set default 'generated';
alter table kit_batches enable row level security;
