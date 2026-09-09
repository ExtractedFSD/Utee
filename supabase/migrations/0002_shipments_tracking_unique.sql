-- Carrier tracking events are matched to a shipment by tracking number alone
-- (src/lib/tracking.ts), so the same number can never belong to two
-- shipments. The application also validates this at dispatch time; this is
-- the hard guarantee.
drop index if exists shipments_tracking_idx;
create unique index shipments_tracking_idx on shipments (tracking_number);
