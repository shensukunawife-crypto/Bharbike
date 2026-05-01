-- Migration: Add ticket_number to support_tickets
-- Run this in your Supabase SQL Editor if you get "column ticket_number doesn't exist" error.

-- 1. Add the column
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number INTEGER UNIQUE;

-- 2. Backfill existing rows if any (optional, but good for uniqueness)
-- This simple script assigns random 6-digit numbers to old rows
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id FROM support_tickets WHERE ticket_number IS NULL) LOOP
        UPDATE support_tickets 
        SET ticket_number = floor(random() * (999999-100000+1) + 100000)::int
        WHERE id = r.id;
    END LOOP;
END $$;

-- 3. Make it required for future rows
-- ALTER TABLE support_tickets ALTER COLUMN ticket_number SET NOT NULL;
