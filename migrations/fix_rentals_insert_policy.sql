-- Fix: Allow service role and users to insert into rentals
-- Run this in Supabase SQL Editor

-- Allow inserts (service role bypasses RLS, but add policy for safety)
CREATE POLICY "Service role can insert rentals"
  ON rentals FOR INSERT
  WITH CHECK (true);

-- Allow updates (for ending rentals)
CREATE POLICY "Service role can update rentals"
  ON rentals FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Also fix bike statuses while we're at it
UPDATE public.bikes SET status = 'available' WHERE id IN (1, 2, 3, 4);
UPDATE public.bikes SET booked = false WHERE booked = true;
