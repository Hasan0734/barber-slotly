-- Enable GiST support for equality operators
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- Prevent overlapping active appointments
ALTER TABLE appointments
ADD CONSTRAINT appointments_no_overlapping_active
EXCLUDE USING gist (
    shop_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (
    status IN ('pending', 'confirmed')
);