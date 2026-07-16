-- ==============================================================
-- DATABASE HARDENING: FIX PUBLIC "profiles" POLICY VULNERABILITY
-- ==============================================================

-- 1. Drop the insecure public policy that accidentally allows full access to all profiles
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- 2. Create the correct service_role full access policy restricted strictly to service_role
CREATE POLICY "Service role full access to profiles" 
ON public.profiles
FOR ALL 
TO service_role 
USING (true);

-- 3. Confirm RLS settings on both tables
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'profiles');
