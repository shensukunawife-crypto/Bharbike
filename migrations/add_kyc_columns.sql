-- Add PAN Card and Electricity Bill columns to delivery_partners table
ALTER TABLE delivery_partners 
ADD COLUMN IF NOT EXISTS pan_url TEXT,
ADD COLUMN IF NOT EXISTS electricity_bill_url TEXT;

-- Optional: If you use a separate kyc_documents table
-- ALTER TABLE kyc_documents
-- ADD COLUMN IF NOT EXISTS electricity_bill_url TEXT;
