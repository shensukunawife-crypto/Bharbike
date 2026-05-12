-- 1. Create the admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Insert the Master Admin
-- The default password is 'admin123' (we'll hash it in the backend, but for raw SQL we can insert a dummy hash or just handle raw text if the backend supports a fallback for the first login, or we can use a known bcrypt hash for 'admin123').
-- Bcrypt hash for 'admin123' is: $2b$10$wE0v2GqL4xG4X2QvF00vOuS/m0d.2oE.4yvX.4V/0C0Y.4/X/0V/C (Wait, let's just insert it from the backend on startup if the table is empty to avoid manual hash issues).
