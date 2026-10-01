-- Kit codes are generated in batches and only become usable stock once the
-- batch has gone to the printer. 'created' (printed, unassigned) becomes
-- 'printed'; 'generated' comes before it; 'voided' is terminal for spoiled
-- labels. Enum values can't be used in the migration that adds them, so the
-- table changes are in 0010.
alter type kit_status rename value 'created' to 'printed';
alter type kit_status add value 'generated' before 'printed';
alter type kit_status add value 'voided';
