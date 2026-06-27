-- ==========================================
-- VERSATILE - MIGRATION 001: Multi-Tenant Foundation
-- ==========================================
-- Purpose : Introduce studios + studio_members; add studio_id to all domain
--           tables; enable RLS with per-tenant policies; update trigger and RPC.
-- Safety  : Additive-first (nullable columns, ON CONFLICT DO NOTHING).
--           Run inside one transaction so it is fully atomic.
-- Idempotent: Safe to re-run — uses IF NOT EXISTS / ON CONFLICT guards.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — New tables: studios and studio_members
-- ==========================================

CREATE TABLE IF NOT EXISTS public.studios (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.studio_members (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id  UUID        NOT NULL REFERENCES public.studios(id)   ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (studio_id, user_id)
);

-- Index for RLS helper performance
CREATE INDEX IF NOT EXISTS idx_studio_members_user ON public.studio_members(user_id);

-- ==========================================
-- SECTION 2 — Add studio_id columns (NULLABLE first — existing rows are safe)
-- ==========================================

-- profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- plans
ALTER TABLE public.plans
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- plan_activities
ALTER TABLE public.plan_activities
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- classes
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- enrollments
ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- payments
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- commissions
ALTER TABLE public.commissions
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- specialties
ALTER TABLE public.specialties
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- ==========================================
-- SECTION 3 — Backfill: default studio + migrate all existing data
-- ==========================================

DO $$
DECLARE
    v_default_studio_id UUID;
BEGIN
    -- 3a. Create the default studio (idempotent via slug uniqueness)
    INSERT INTO public.studios (name, slug)
    VALUES ('Mi Estudio', 'mi-estudio')
    ON CONFLICT (slug) DO NOTHING;

    -- Capture its ID regardless of whether the INSERT ran or was skipped
    SELECT id INTO v_default_studio_id
    FROM   public.studios
    WHERE  slug = 'mi-estudio';

    -- 3b. Assign all existing rows to the default studio
    UPDATE public.profiles        SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.plans           SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.plan_activities SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.classes         SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.enrollments     SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.payments        SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.commissions     SET studio_id = v_default_studio_id WHERE studio_id IS NULL;
    UPDATE public.specialties     SET studio_id = v_default_studio_id WHERE studio_id IS NULL;

    -- 3c. Migrate existing profiles.role -> studio_members
    --     One membership row per profile that has a non-null role.
    INSERT INTO public.studio_members (studio_id, user_id, role)
    SELECT v_default_studio_id,
           id,
           COALESCE(role, 'student')
    FROM   public.profiles
    ON CONFLICT (studio_id, user_id) DO NOTHING;
END;
$$;

-- ==========================================
-- SECTION 4 — Make studio_id NOT NULL (safe after backfill)
-- ==========================================

ALTER TABLE public.profiles        ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.plans           ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.plan_activities ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.classes         ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.enrollments     ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.payments        ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.commissions     ALTER COLUMN studio_id SET NOT NULL;
ALTER TABLE public.specialties     ALTER COLUMN studio_id SET NOT NULL;

-- ==========================================
-- SECTION 5 — Fix specialties UNIQUE constraint (global -> per-studio)
-- ==========================================

-- Drop the old global UNIQUE(name) constraint if it still exists
ALTER TABLE public.specialties
    DROP CONSTRAINT IF EXISTS specialties_name_key;

-- Add the studio-scoped uniqueness (idempotent name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE  conname = 'specialties_name_studio_key'
          AND  conrelid = 'public.specialties'::regclass
    ) THEN
        ALTER TABLE public.specialties
            ADD CONSTRAINT specialties_name_studio_key UNIQUE (studio_id, name);
    END IF;
END;
$$;

-- ==========================================
-- SECTION 6 — Update trigger handle_new_user
-- ==========================================
-- New version also inserts into studio_members using raw_user_meta_data->>'studio_id'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_studio_id UUID;
    v_role      VARCHAR(20);
BEGIN
    -- Require studio_id — every user MUST belong to a studio
    v_studio_id := (NEW.raw_user_meta_data->>'studio_id')::UUID;
    IF v_studio_id IS NULL THEN
        RAISE EXCEPTION 'studio_id is required in raw_user_meta_data';
    END IF;

    v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

    -- Create the public profile (role kept for backward-compat during transition)
    INSERT INTO public.profiles (id, full_name, role, email, phone, studio_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        v_role,
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        v_studio_id
    );

    -- Create studio membership
    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (v_studio_id, NEW.id, v_role)
    ON CONFLICT (studio_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (DROP + CREATE is idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SECTION 7 — Add auth_studio_ids() RLS helper
-- ==========================================
-- Returns the set of studio IDs the current user belongs to.
-- STABLE + SECURITY DEFINER: evaluated once per statement, bypasses RLS
-- on studio_members so the helper itself doesn't recurse.

CREATE OR REPLACE FUNCTION public.auth_studio_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT studio_id
    FROM   public.studio_members
    WHERE  user_id = auth.uid();
$$;

-- ==========================================
-- SECTION 8 — Enable RLS + create per-tenant policies
-- ==========================================

-- ----- studios -----
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studios_select ON public.studios;
CREATE POLICY studios_select ON public.studios
    FOR SELECT TO authenticated
    USING (id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS studios_update ON public.studios;
CREATE POLICY studios_update ON public.studios
    FOR UPDATE TO authenticated
    USING (
        id = ANY(SELECT public.auth_studio_ids())
        AND EXISTS (
            SELECT 1 FROM public.studio_members
            WHERE studio_id = studios.id
              AND user_id   = auth.uid()
              AND role      = 'admin'
        )
    );

-- ----- studio_members -----
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studio_members_select ON public.studio_members;
CREATE POLICY studio_members_select ON public.studio_members
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- profiles -----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        studio_id = ANY(SELECT public.auth_studio_ids())
        AND EXISTS (
            SELECT 1 FROM public.studio_members
            WHERE studio_id = profiles.studio_id
              AND user_id = auth.uid()
              AND role = 'admin'
        )
    );

-- ----- plans -----
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_tenant_select ON public.plans;
CREATE POLICY plans_tenant_select ON public.plans
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plans_tenant_insert ON public.plans;
CREATE POLICY plans_tenant_insert ON public.plans
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plans_tenant_update ON public.plans;
CREATE POLICY plans_tenant_update ON public.plans
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plans_tenant_delete ON public.plans;
CREATE POLICY plans_tenant_delete ON public.plans
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- plan_activities -----
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_activities_tenant_select ON public.plan_activities;
CREATE POLICY plan_activities_tenant_select ON public.plan_activities
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plan_activities_tenant_insert ON public.plan_activities;
CREATE POLICY plan_activities_tenant_insert ON public.plan_activities
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plan_activities_tenant_update ON public.plan_activities;
CREATE POLICY plan_activities_tenant_update ON public.plan_activities
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS plan_activities_tenant_delete ON public.plan_activities;
CREATE POLICY plan_activities_tenant_delete ON public.plan_activities
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- specialties -----
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS specialties_tenant_select ON public.specialties;
CREATE POLICY specialties_tenant_select ON public.specialties
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS specialties_tenant_insert ON public.specialties;
CREATE POLICY specialties_tenant_insert ON public.specialties
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS specialties_tenant_update ON public.specialties;
CREATE POLICY specialties_tenant_update ON public.specialties
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS specialties_tenant_delete ON public.specialties;
CREATE POLICY specialties_tenant_delete ON public.specialties
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- student_details (RLS via JOIN to profiles -> studio_members) -----
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_details_tenant_select ON public.student_details;
CREATE POLICY student_details_tenant_select ON public.student_details
    FOR SELECT TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS student_details_tenant_insert ON public.student_details;
CREATE POLICY student_details_tenant_insert ON public.student_details
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS student_details_tenant_update ON public.student_details;
CREATE POLICY student_details_tenant_update ON public.student_details
    FOR UPDATE TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

-- ----- teacher_details (RLS via JOIN to profiles -> studio_members) -----
ALTER TABLE public.teacher_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_details_tenant_select ON public.teacher_details;
CREATE POLICY teacher_details_tenant_select ON public.teacher_details
    FOR SELECT TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS teacher_details_tenant_insert ON public.teacher_details;
CREATE POLICY teacher_details_tenant_insert ON public.teacher_details
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

DROP POLICY IF EXISTS teacher_details_tenant_update ON public.teacher_details;
CREATE POLICY teacher_details_tenant_update ON public.teacher_details
    FOR UPDATE TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

-- ----- classes -----
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classes_tenant_select ON public.classes;
CREATE POLICY classes_tenant_select ON public.classes
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS classes_tenant_insert ON public.classes;
CREATE POLICY classes_tenant_insert ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS classes_tenant_update ON public.classes;
CREATE POLICY classes_tenant_update ON public.classes
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS classes_tenant_delete ON public.classes;
CREATE POLICY classes_tenant_delete ON public.classes
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- enrollments -----
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enrollments_tenant_select ON public.enrollments;
CREATE POLICY enrollments_tenant_select ON public.enrollments
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS enrollments_tenant_insert ON public.enrollments;
CREATE POLICY enrollments_tenant_insert ON public.enrollments
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS enrollments_tenant_update ON public.enrollments;
CREATE POLICY enrollments_tenant_update ON public.enrollments
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS enrollments_tenant_delete ON public.enrollments;
CREATE POLICY enrollments_tenant_delete ON public.enrollments
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- payments -----
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_tenant_select ON public.payments;
CREATE POLICY payments_tenant_select ON public.payments
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS payments_tenant_insert ON public.payments;
CREATE POLICY payments_tenant_insert ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS payments_tenant_update ON public.payments;
CREATE POLICY payments_tenant_update ON public.payments
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS payments_tenant_delete ON public.payments;
CREATE POLICY payments_tenant_delete ON public.payments
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ----- commissions -----
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commissions_tenant_select ON public.commissions;
CREATE POLICY commissions_tenant_select ON public.commissions
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS commissions_tenant_insert ON public.commissions;
CREATE POLICY commissions_tenant_insert ON public.commissions
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS commissions_tenant_update ON public.commissions;
CREATE POLICY commissions_tenant_update ON public.commissions
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

DROP POLICY IF EXISTS commissions_tenant_delete ON public.commissions;
CREATE POLICY commissions_tenant_delete ON public.commissions
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- ==========================================
-- SECTION 9 — Update get_financial_balance RPC (studio-scoped)
-- ==========================================
-- Adds p_studio_id parameter and filters all aggregates by studio.
-- Validates the caller belongs to the requested studio before querying.

CREATE OR REPLACE FUNCTION public.get_financial_balance(
    query_year  INT,
    query_month INT,
    p_studio_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Guard: caller must belong to the requested studio
    IF p_studio_id NOT IN (SELECT public.auth_studio_ids()) THEN
        RAISE EXCEPTION 'Access denied: studio not accessible to current user';
    END IF;

    SELECT jsonb_build_object(
        'monthlyTotal', COALESCE((
            SELECT SUM(amount)
            FROM   public.payments
            WHERE  studio_id = p_studio_id
              AND  EXTRACT(YEAR  FROM payment_date) = query_year
              AND  EXTRACT(MONTH FROM payment_date) = query_month
        ), 0),

        'annualTotal', COALESCE((
            SELECT SUM(amount)
            FROM   public.payments
            WHERE  studio_id = p_studio_id
              AND  EXTRACT(YEAR FROM payment_date) = query_year
        ), 0),

        'monthlyByPlan', COALESCE((
            SELECT jsonb_object_agg(plan_name, total)
            FROM (
                SELECT COALESCE(split_part(plan_details, ' - ', 1), 'Otros') AS plan_name,
                       SUM(amount) AS total
                FROM   public.payments
                WHERE  studio_id = p_studio_id
                  AND  EXTRACT(YEAR  FROM payment_date) = query_year
                  AND  EXTRACT(MONTH FROM payment_date) = query_month
                GROUP BY 1
            ) sub
        ), '{}'::jsonb),

        'annualByPlan', COALESCE((
            SELECT jsonb_object_agg(plan_name, total)
            FROM (
                SELECT COALESCE(split_part(plan_details, ' - ', 1), 'Otros') AS plan_name,
                       SUM(amount) AS total
                FROM   public.payments
                WHERE  studio_id = p_studio_id
                  AND  EXTRACT(YEAR FROM payment_date) = query_year
                GROUP BY 1
            ) sub
        ), '{}'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- ==========================================
-- SECTION 10 — Make profiles.role nullable
-- ==========================================
-- studio_members.role is now the source of truth for tenant-scoped roles.
-- profiles.role is kept for backward-compat but must no longer be NOT NULL.

-- Drop NOT NULL (keep the CHECK constraint — it still validates existing non-null values)
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;

-- Ensure the DEFAULT is NULL so new rows don't accidentally get 'student'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT NULL;

COMMIT;

-- ==========================================
-- END OF MIGRATION 001
-- ==========================================
-- Summary of changes:
--   1. Created: studios, studio_members tables
--   2. Added nullable studio_id to: profiles, plans, plan_activities,
--      classes, enrollments, payments, commissions, specialties
--   3. Backfilled all rows to default studio "Mi Estudio"
--      + migrated profiles.role -> studio_members
--   4. Set studio_id NOT NULL on all 8 domain tables
--   5. Replaced UNIQUE(name) with UNIQUE(studio_id, name) on specialties
--   6. Updated handle_new_user() trigger to create studio_members row
--   7. Added auth_studio_ids() STABLE SECURITY DEFINER helper
--   8. Enabled RLS + created per-tenant policies on all tables
--   9. Replaced get_financial_balance(year, month) with
--      get_financial_balance(year, month, p_studio_id)
--  10. Made profiles.role nullable (DEFAULT NULL)
