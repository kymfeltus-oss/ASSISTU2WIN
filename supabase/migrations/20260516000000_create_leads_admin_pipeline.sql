-- Admin flag on profiles (safe for future portal RLS expansion)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS 'Platform admin: full access to leads intake pipeline.';

-- Residential lead intake (central record for future buyer/lender/title portals)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name text NOT NULL,
  lead_source text NOT NULL,
  target_budget numeric,
  current_status text NOT NULL DEFAULT 'New Lead',
  phone_number text,
  email_address text,
  raw_transcript text,
  ai_summary text,
  ai_extracted_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_ai_parsed boolean NOT NULL DEFAULT false,
  assigned_admin_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_current_status_check CHECK (
    current_status IN (
      'New Lead',
      'Pre-Approved',
      'Active Searching',
      'Under Contract',
      'Closed'
    )
  )
);

CREATE INDEX IF NOT EXISTS leads_current_status_idx ON public.leads (current_status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leads_updated_at();

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles AS p WHERE p.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_admin_select ON public.leads;
CREATE POLICY leads_admin_select ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS leads_admin_insert ON public.leads;
CREATE POLICY leads_admin_insert ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS leads_admin_update ON public.leads;
CREATE POLICY leads_admin_update ON public.leads
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS leads_admin_delete ON public.leads;
CREATE POLICY leads_admin_delete ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());
