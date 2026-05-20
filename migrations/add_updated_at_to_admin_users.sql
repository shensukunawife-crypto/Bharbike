-- Migration to add the missing updated_at column to the admin_users table.
-- This fixes the error: record "new" has no field "updated_at" when updating/blocking sub-admins.
-- Run this script in the Supabase Dashboard SQL Editor.

-- 1. Add updated_at column if it does not already exist
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- 2. Verify that the trigger is active and running correctly
-- The trigger update_admin_users_updated_at will now be able to modify the updated_at column on UPDATE!
