-- Optional: run after add_support_tickets_ticket_number.sql if RLS blocks direct API access.
-- Backend uses service_role (bypasses RLS). Open policies only if needed for anon/authenticated clients.

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all insert" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow read" ON public.support_tickets;

CREATE POLICY "Allow all insert" ON public.support_tickets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read" ON public.support_tickets
  FOR SELECT
  USING (true);
