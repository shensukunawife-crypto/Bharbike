-- Create payment_configs table for dynamic provider keys
CREATE TABLE IF NOT EXISTS payment_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    key_id TEXT NOT NULL,
    key_secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one key is active per provider
CREATE UNIQUE INDEX IF NOT EXISTS one_active_razorpay_key 
ON payment_configs (provider) 
WHERE (is_active = true);

-- Add initial row (optional)
-- INSERT INTO payment_configs (provider, key_id, key_secret, is_active) 
-- VALUES ('razorpay', 'YOUR_KEY_ID', 'YOUR_KEY_SECRET', true);
