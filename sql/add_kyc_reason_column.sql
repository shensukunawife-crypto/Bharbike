-- Add reason column to kyc_documents table
-- Run this once in Supabase SQL editor: https://supabase.com/dashboard/project/ptrazrloxvknrjjelruw/sql

ALTER TABLE kyc_documents ADD COLUMN IF NOT EXISTS reason TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kyc_documents' 
ORDER BY ordinal_position;
