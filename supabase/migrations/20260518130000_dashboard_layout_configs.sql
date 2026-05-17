-- =============================================================================
-- Per-user dashboard layout persistence (Pass F)
-- Idempotent, non-destructive.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_layout_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  page_key text NOT NULL,
  layout jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_layout_configs_user_page_key UNIQUE (user_id, page_key)
);

CREATE INDEX IF NOT EXISTS dashboard_layout_configs_user_page_key_idx
  ON public.dashboard_layout_configs (user_id, page_key);

DROP TRIGGER IF EXISTS dashboard_layout_configs_set_updated_at
  ON public.dashboard_layout_configs;

CREATE TRIGGER dashboard_layout_configs_set_updated_at
  BEFORE UPDATE ON public.dashboard_layout_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.dashboard_layout_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_layout_configs_select_own
  ON public.dashboard_layout_configs;
CREATE POLICY dashboard_layout_configs_select_own
  ON public.dashboard_layout_configs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS dashboard_layout_configs_insert_own
  ON public.dashboard_layout_configs;
CREATE POLICY dashboard_layout_configs_insert_own
  ON public.dashboard_layout_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS dashboard_layout_configs_update_own
  ON public.dashboard_layout_configs;
CREATE POLICY dashboard_layout_configs_update_own
  ON public.dashboard_layout_configs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS dashboard_layout_configs_delete_own
  ON public.dashboard_layout_configs;
CREATE POLICY dashboard_layout_configs_delete_own
  ON public.dashboard_layout_configs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS dashboard_layout_configs_service_role_all
  ON public.dashboard_layout_configs;
CREATE POLICY dashboard_layout_configs_service_role_all
  ON public.dashboard_layout_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_layout_configs TO authenticated;
GRANT ALL ON public.dashboard_layout_configs TO service_role;
