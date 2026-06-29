-- ==========================================
-- VERSATILE - MIGRATION 003: Plan Changes + Enrollment Plan Tracking
-- ==========================================
-- Purpose : Track every plan change via plan_changes table; store the active
--           plan_id on each enrollment so quota enforcement can be per-activity.
-- Safety  : Additive (new table + nullable column + index). Backfill is a single
--           UPDATE that copies profile.plan_id into enrollments.plan_id.
-- Idempotent: Safe to re-run — uses IF NOT EXISTS / ON CONFLICT guards.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — New table: plan_changes
-- ==========================================

CREATE TABLE IF NOT EXISTS public.plan_changes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_plan_id UUID        REFERENCES public.plans(id) ON DELETE SET NULL,
    new_plan_id UUID        NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    changed_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_id  UUID        REFERENCES public.payments(id) ON DELETE SET NULL
);

-- ==========================================
-- SECTION 1b — RLS for plan_changes
-- ==========================================

ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_changes_tenant_select ON public.plan_changes;
CREATE POLICY plan_changes_tenant_select ON public.plan_changes
    FOR SELECT TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS plan_changes_tenant_insert ON public.plan_changes;
CREATE POLICY plan_changes_tenant_insert ON public.plan_changes
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

-- ==========================================
-- SECTION 2 — Add plan_id to enrollments
-- ==========================================

ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- ==========================================
-- SECTION 3 — Index for quota queries
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_enrollments_student_date
    ON public.enrollments (student_id, reservation_date);

-- ==========================================
-- SECTION 4 — Backfill enrollments with current profile plan_id
-- ==========================================

UPDATE public.enrollments e
SET    plan_id = p.plan_id
FROM   public.profiles p
WHERE  e.student_id = p.id
  AND  e.plan_id IS NULL
  AND  p.plan_id IS NOT NULL;

COMMIT;

-- ==========================================
-- END OF MIGRATION 003
-- ==========================================
-- Summary of changes:
--   1. Created plan_changes table (audit trail for plan changes)
--   2. Added nullable plan_id FK to enrollments
--   3. Added index on enrollments(student_id, reservation_date)
--   4. Backfilled enrollments.plan_id from profiles.plan_id
