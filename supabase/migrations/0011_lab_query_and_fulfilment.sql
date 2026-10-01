-- A lab result whose controls failed holds the kit in 'lab_query' until the
-- lab re-runs the test or Utee resolves it. A 'fulfilment' user sees only
-- the packing tools. Enum values can't be used in the migration that adds
-- them, so the table changes are in 0012.
alter type kit_status add value 'lab_query' after 'received_by_lab';
alter type user_role add value 'fulfilment' after 'clinic';
