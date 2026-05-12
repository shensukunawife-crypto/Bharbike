-- Run this in Supabase SQL Editor → New Query → Run
-- Creates the admin_users table for Sub-Admin management

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sub_admin',
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (service role key bypasses this)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your backend uses service role key)
CREATE POLICY "service_role_all" ON admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
