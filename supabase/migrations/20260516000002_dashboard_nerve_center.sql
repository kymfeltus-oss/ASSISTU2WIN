-- =============================================================================
-- Dashboard Nerve Center — Phase 1 foundation (PASS 1)
-- Idempotent / production-safe. Preserves legacy rows and columns.
-- Coexists with lead_score, start_time, appointment_type ENUM, …
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. leads — buyer index, motivation, financing, updated_at
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buyer_index_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivation_urgency text,
  ADD COLUMN IF NOT EXISTS financing_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_buyer_index_score_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_buyer_index_score_check CHECK (
    buyer_index_score >= 0 AND buyer_index_score <= 100
  );

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_motivation_urgency_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_motivation_urgency_check CHECK (
    motivation_urgency IS NULL
    OR motivation_urgency IN ('high', 'med', 'low')
  );

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_financing_type_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_financing_type_check CHECK (
    financing_type IS NULL
    OR financing_type IN ('cash', 'conv', 'fha')
  );

COMMENT ON COLUMN public.leads.buyer_index_score IS 'Potential Buyer Index (0–100).';
COMMENT ON COLUMN public.leads.motivation_urgency IS 'Buyer urgency: high | med | low.';
COMMENT ON COLUMN public.leads.financing_type IS 'Financing route: cash | conv | fha.';

-- Backfill from legacy columns only when they exist (preserve existing data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'lead_score'
  ) THEN
    EXECUTE $sql$
      UPDATE public.leads
      SET buyer_index_score = GREATEST(
        0,
        LEAST(100, COALESCE(NULLIF(buyer_index_score, 0), lead_score, 0))
      )
      WHERE buyer_index_score = 0
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'market_readiness_score'
  ) THEN
    EXECUTE $sql$
      UPDATE public.leads
      SET buyer_index_score = GREATEST(
        0,
        LEAST(
          100,
          COALESCE(NULLIF(buyer_index_score, 0), market_readiness_score, buyer_index_score)
        )
      )
      WHERE buyer_index_score = 0
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'loan_type'
  ) THEN
    EXECUTE $sql$
      UPDATE public.leads
      SET financing_type = CASE
        WHEN lower(COALESCE(loan_type, '')) IN ('cash') THEN 'cash'
        WHEN lower(COALESCE(loan_type, '')) IN ('fha', 'va') THEN 'fha'
        WHEN lower(COALESCE(loan_type, '')) IN ('conventional', 'conv', 'usda') THEN 'conv'
        ELSE financing_type
      END
      WHERE financing_type IS NULL AND loan_type IS NOT NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'purchase_timeline'
  ) THEN
    EXECUTE $sql$
      UPDATE public.leads
      SET motivation_urgency = CASE
        WHEN lower(COALESCE(purchase_timeline, '')) LIKE '%immediate%' THEN 'high'
        WHEN lower(COALESCE(purchase_timeline, '')) LIKE '%1-3%' THEN 'med'
        WHEN lower(COALESCE(purchase_timeline, '')) LIKE '%brows%' THEN 'low'
        ELSE motivation_urgency
      END
      WHERE motivation_urgency IS NULL
    $sql$;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS leads_buyer_index_score_idx
  ON public.leads (buyer_index_score);

-- ---------------------------------------------------------------------------
-- 2. activity_logs — engagement ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_logs_activity_type_check CHECK (
    activity_type IN (
      'qr_scan',
      'link_click',
      'video_join',
      'note_added'
    )
  )
);

CREATE INDEX IF NOT EXISTS activity_logs_lead_id_created_at_idx
  ON public.activity_logs (lead_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. appointments — schedule + LiveKit + go-live status machine
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  livekit_room_id text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_event_type_check CHECK (
    event_type IN ('showing', 'consultation')
  ),
  CONSTRAINT appointments_status_check CHECK (
    status IN (
      'scheduled',
      'starting',
      'live',
      'completed',
      'failed'
    )
  )
);

-- Align pre-existing / legacy appointments installs with nerve-center columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill nerve-center fields from legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'type'
  ) THEN
    EXECUTE $sql$
      UPDATE public.appointments
      SET event_type = CASE
        WHEN event_type IS NOT NULL THEN event_type
        WHEN type::text = 'virtual_showing' THEN 'showing'
        WHEN type::text IN ('consultation', 'doc_review') THEN 'consultation'
        ELSE 'consultation'
      END
      WHERE event_type IS NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'start_time'
  ) THEN
    EXECUTE $sql$
      UPDATE public.appointments
      SET scheduled_at = COALESCE(scheduled_at, start_time, created_at)
      WHERE scheduled_at IS NULL
    $sql$;
  END IF;

  -- Ensure scheduled_at is populated for legacy rows without start_time
  EXECUTE $sql$
    UPDATE public.appointments
    SET scheduled_at = COALESCE(scheduled_at, created_at, now())
    WHERE scheduled_at IS NULL
  $sql$;
END
$$;

ALTER TABLE public.appointments
  ALTER COLUMN event_type SET DEFAULT 'consultation';

ALTER TABLE public.appointments
  ALTER COLUMN scheduled_at SET DEFAULT now();

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_event_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_event_type_check CHECK (
    event_type IN ('showing', 'consultation')
  );

-- Text status CHECK (nerve-center + go-live handshake states)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'status'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.appointments
      ALTER COLUMN status SET DEFAULT 'scheduled';

    ALTER TABLE public.appointments
      DROP CONSTRAINT IF EXISTS appointments_status_check;

    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check CHECK (
        status IN (
          'scheduled',
          'starting',
          'live',
          'completed',
          'failed'
        )
      );
  END IF;
END
$$;

-- Legacy ENUM status: extend with starting / failed for go-live API (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'appointment_status'
        AND e.enumlabel = 'starting'
    ) THEN
      ALTER TYPE public.appointment_status ADD VALUE 'starting';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'appointment_status'
        AND e.enumlabel = 'failed'
    ) THEN
      ALTER TYPE public.appointment_status ADD VALUE 'failed';
    END IF;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_livekit_room_id_uidx
  ON public.appointments (livekit_room_id)
  WHERE livekit_room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointments_status_scheduled_at_idx
  ON public.appointments (status, scheduled_at);

CREATE INDEX IF NOT EXISTS appointments_lead_id_scheduled_at_idx
  ON public.appointments (lead_id, scheduled_at);

-- ---------------------------------------------------------------------------
-- 4. transaction_milestones — one row per lead
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transaction_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads (id) ON DELETE CASCADE,
  escrow_status text NOT NULL DEFAULT 'pending',
  appraisal_status text NOT NULL DEFAULT 'pending',
  underwriting_status text NOT NULL DEFAULT 'pending',
  clear_to_close_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_milestones_escrow_status_check CHECK (
    escrow_status IN ('pending', 'in_progress', 'done')
  ),
  CONSTRAINT transaction_milestones_appraisal_status_check CHECK (
    appraisal_status IN ('pending', 'in_progress', 'done')
  ),
  CONSTRAINT transaction_milestones_underwriting_status_check CHECK (
    underwriting_status IN ('pending', 'in_progress', 'done')
  ),
  CONSTRAINT transaction_milestones_clear_to_close_status_check CHECK (
    clear_to_close_status IN ('pending', 'in_progress', 'done')
  )
);

CREATE INDEX IF NOT EXISTS transaction_milestones_lead_id_idx
  ON public.transaction_milestones (lead_id);

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger function + triggers (rerun-safe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Backward-compatible alias used by earlier leads migration
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
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS appointments_set_updated_at ON public.appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS transaction_milestones_set_updated_at ON public.transaction_milestones;
CREATE TRIGGER transaction_milestones_set_updated_at
  BEFORE UPDATE ON public.transaction_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- 6. Realtime publication (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- ---------------------------------------------------------------------------
-- 7. RLS (authenticated dashboard access; service role bypasses)
-- ---------------------------------------------------------------------------

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_authenticated_all ON public.activity_logs;
CREATE POLICY activity_logs_authenticated_all ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS activity_logs_service_role_all ON public.activity_logs;
CREATE POLICY activity_logs_service_role_all ON public.activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS transaction_milestones_authenticated_all ON public.transaction_milestones;
CREATE POLICY transaction_milestones_authenticated_all ON public.transaction_milestones
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS transaction_milestones_service_role_all ON public.transaction_milestones;
CREATE POLICY transaction_milestones_service_role_all ON public.transaction_milestones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_milestones TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
GRANT ALL ON public.transaction_milestones TO service_role;
