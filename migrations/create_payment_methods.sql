-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'upi', 'card', 'bank'
    provider VARCHAR(100), -- 'paytm', 'gpay', 'visa', 'mastercard', 'hdfc', etc.
    identifier VARCHAR(255) NOT NULL, -- UPI ID, last 4 digits of card, account number
    display_name VARCHAR(255) NOT NULL, -- e.g., "rahul@paytm", "••••4532", "HDFC Savings ••1234"
    is_default BOOLEAN DEFAULT false,
    metadata JSONB, -- Additional data like card expiry, bank name, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reward_points table
CREATE TABLE IF NOT EXISTS reward_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    cashback_value DECIMAL(10, 2) DEFAULT 0.00, -- ₹ value (points / 10)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reward_transactions table
CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'expired'
    description TEXT,
    reference_id UUID, -- Link to payment, booking, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_reward_points_user_id ON reward_points(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view their own payment methods"
    ON payment_methods FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
    ON payment_methods FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
    ON payment_methods FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
    ON payment_methods FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for reward_points
CREATE POLICY "Users can view their own reward points"
    ON reward_points FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reward points"
    ON reward_points FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reward points"
    ON reward_points FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for reward_transactions
CREATE POLICY "Users can view their own reward transactions"
    ON reward_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reward transactions"
    ON reward_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reward_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

CREATE TRIGGER reward_points_updated_at
    BEFORE UPDATE ON reward_points
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_points_updated_at();

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE payment_methods
        SET is_default = false
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_single_default
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- Function to update cashback_value when points change
CREATE OR REPLACE FUNCTION update_cashback_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cashback_value = NEW.points / 10.0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reward_points_update_cashback
    BEFORE INSERT OR UPDATE ON reward_points
    FOR EACH ROW
    EXECUTE FUNCTION update_cashback_value();

-- Function to create default reward points for new users
CREATE OR REPLACE FUNCTION create_default_reward_points()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reward_points (user_id, points)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_reward_points_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_reward_points();

COMMENT ON TABLE payment_methods IS 'User saved payment methods';
COMMENT ON TABLE reward_points IS 'User reward points balance';
COMMENT ON TABLE reward_transactions IS 'Reward points transaction history';
