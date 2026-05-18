-- Admin intake pipeline statuses (Pre-Approved, Denied, No Pre-Approval, Cash)
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
      'Active Searching',
      'Under Contract',
      'Closed'
    )
  );
