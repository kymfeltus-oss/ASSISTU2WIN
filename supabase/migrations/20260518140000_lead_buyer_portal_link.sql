-- Link residential leads to buyer auth accounts (client portal / My Sanctuary)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_buyer_user_id_idx ON public.leads (buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;

COMMENT ON COLUMN public.leads.buyer_user_id IS 'Auth user id for the buyer client portal (My Sanctuary).';

-- Portal invite sets buyers to Active Client
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_current_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_current_status_check CHECK (
    current_status IN (
      'New Lead',
      'Pre-Approved',
      'Denied',
      'No Pre-Approval',
      'Cash',
      'Active Client',
      'Active Searching',
      'Under Contract',
      'Closed'
    )
  );

DROP POLICY IF EXISTS leads_buyer_select ON public.leads;
CREATE POLICY leads_buyer_select ON public.leads
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());
