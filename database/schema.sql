-- ==========================================
-- VERSATILE - ESQUEMA DE BASE DE DATOS
-- Multi-Tenant Foundation (Phase 1)
-- ==========================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. DROP EXISTING TABLES (correct dependency order)
-- ==========================================
DROP TABLE IF EXISTS public.commissions CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.plan_activities CASCADE;
DROP TABLE IF EXISTS public.teacher_details CASCADE;
DROP TABLE IF EXISTS public.specialties CASCADE;
DROP TABLE IF EXISTS public.student_details CASCADE;
-- studio_members must be dropped before profiles (FK: studio_members.user_id -> profiles.id)
DROP TABLE IF EXISTS public.studio_members CASCADE;
-- studios must be dropped before profiles dependencies are removed
DROP TABLE IF EXISTS public.studios CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;

-- ==========================================
-- 2. STUDIOS TABLE (tenant entity)
-- ==========================================
CREATE TABLE public.studios (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. PLANS TABLE
-- ==========================================
CREATE TABLE public.plans (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id        UUID         NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,          -- e.g. "Basico", "Intermedio A", "Premium"
    price            NUMERIC(10, 2) NOT NULL,        -- Monthly plan price
    classes_per_week INTEGER      NOT NULL,          -- Total weekly class quota
    is_active        BOOLEAN      DEFAULT true,      -- Whether the plan is available for sale
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. PLAN ACTIVITIES TABLE (plan composition)
-- ==========================================
-- Models combinations like "2 Stretching + 1 Pilates"
CREATE TABLE public.plan_activities (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id        UUID         NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    plan_id          UUID         NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    activity_name    VARCHAR(100) NOT NULL,          -- Activity name (e.g. "Stretching", "Pilates")
    classes_per_week INTEGER      NOT NULL,          -- Classes assigned for this specific activity
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 5. USER PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
    id                         UUID    PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name                  VARCHAR(150),
    -- role is nullable during transition; studio_members.role is the source of truth
    role                       VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT NULL,
    email                      VARCHAR(255),         -- Synced from Auth
    phone                      VARCHAR(30),          -- Contact / WhatsApp
    studio_id                  UUID         NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

    -- Active subscription control for students
    plan_id                    UUID         REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_expiration_date       DATE,

    -- Temporary promotions with dynamic duration
    promotion_discount_pct     INTEGER      DEFAULT 0,      -- Discount % (e.g. 50 for 2x1)
    promotion_expiration_date  DATE,                        -- Promotion eligibility deadline

    -- Mandatory onboarding flow
    has_completed_onboarding   BOOLEAN      DEFAULT false,

    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 6. STUDIO MEMBERS TABLE (user-to-tenant mapping)
-- ==========================================
CREATE TABLE public.studio_members (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id  UUID        NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (studio_id, user_id, role)
);

-- Index to speed up the auth_studio_ids() lookup (critical for RLS performance)
CREATE INDEX idx_studio_members_user ON public.studio_members(user_id);

-- ==========================================
-- 7. STUDENT DETAILS TABLE
-- ==========================================
-- Stores medical, personal, and lifestyle data collected during Onboarding
CREATE TABLE public.student_details (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id  UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,

    -- Step 1: Personal Data
    document_id              VARCHAR(50),
    birth_date               DATE,
    age                      INTEGER,
    address                  VARCHAR(255),
    occupation               VARCHAR(100),
    emergency_contact_name   VARCHAR(150),
    emergency_contact_phone  VARCHAR(30),

    -- Step 2: Medical and Health History
    chronic_diseases          VARCHAR(500),
    allergies                 VARCHAR(500),
    recent_injuries           VARCHAR(500),
    medications               VARCHAR(500),
    medical_certificate_url   VARCHAR(500),
    medical_certificate_status VARCHAR(20) CHECK (medical_certificate_status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    medical_certificate_expiration DATE,

    -- Step 3: Lifestyle and Physical Activity
    currently_active      BOOLEAN,
    training_experience   VARCHAR(100),
    daily_work_activity   VARCHAR(100),

    -- Step 4: Goals and Preferences
    main_objectives   VARCHAR(100)[],  -- Array of objectives (Hypertrophy, Tone, etc.)
    preferred_schedule VARCHAR(50),

    -- Step 5: Terms, Conditions, and Legal Consent
    agreed_to_data_protection    BOOLEAN DEFAULT false,
    agreed_to_medical_exoneration BOOLEAN DEFAULT false,
    agreed_to_facility_rules     BOOLEAN DEFAULT false,
    agreed_to_image_rights       BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 8. SPECIALTIES TABLE
-- ==========================================
-- Discipline types taught at the studio — scoped per studio
CREATE TABLE public.specialties (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id  UUID         NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Uniqueness is studio-scoped: two studios can both have "Yoga"
    UNIQUE (studio_id, name)
);

-- NOTE: No default seed for specialties here — they require a studio_id.
-- Seed data should be inserted after a studio is created via migration or setup script.

-- ==========================================
-- 9. TEACHER DETAILS TABLE
-- ==========================================
CREATE TABLE public.teacher_details (
    profile_id  UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id   UUID         NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    address     VARCHAR(255),
    birth_date  DATE,
    specialties UUID[]       DEFAULT '{}',  -- Array of IDs from the specialties table
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 10. CLASSES TABLE
-- ==========================================
CREATE TABLE public.classes (
    id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id              UUID           NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    activity_name          VARCHAR(100)   NOT NULL,        -- Activity/class name (e.g. "Stretching")
    teacher_id             UUID           REFERENCES public.profiles(id) ON DELETE SET NULL,
    day_of_week            INTEGER        CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    start_time             TIME           NOT NULL,
    end_time               TIME           NOT NULL,
    capacity               INTEGER        DEFAULT 15,
    base_price             NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    teacher_commission_pct NUMERIC(5, 2)  DEFAULT 50.00,   -- Teacher commission percentage
    is_active              BOOLEAN        DEFAULT true,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 11. ENROLLMENTS TABLE
-- ==========================================
CREATE TABLE public.enrollments (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id         UUID        NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    student_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id          UUID        NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    reservation_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    attendance_status VARCHAR(20) CHECK (attendance_status IN ('pending', 'attended', 'absent', 'cancelled')) DEFAULT 'pending',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- A student cannot enroll twice in the same class on the same day
    UNIQUE (student_id, class_id, reservation_date)
);

-- ==========================================
-- 12. PAYMENTS TABLE
-- ==========================================
CREATE TABLE public.payments (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id        UUID           NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    student_id       UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id          UUID           REFERENCES public.plans(id) ON DELETE SET NULL,  -- Link to original plan

    amount           NUMERIC(10, 2) NOT NULL,             -- Final charged amount (what actually enters the studio)
    payment_date     DATE           NOT NULL DEFAULT CURRENT_DATE,
    expiration_date  DATE           NOT NULL,
    plan_details     VARCHAR(255),                        -- Readable historical copy (e.g. "Premium - $80000")

    -- Financial audit fields
    payment_method     VARCHAR(20)    CHECK (payment_method IN ('efectivo', 'transferencia')) DEFAULT 'transferencia',
    original_amount    NUMERIC(10, 2) NOT NULL,           -- Base price of the original plan
    discount_applied   NUMERIC(10, 2) DEFAULT 0.00,       -- Total pesos discounted (cash or promo)
    surcharge_applied  NUMERIC(10, 2) DEFAULT 0.00,       -- Total pesos added for late-payment surcharge
    late_payment       BOOLEAN        DEFAULT false,      -- Paid after the 10th of the month?
    late_fee_applied   BOOLEAN        DEFAULT false,      -- Was the 20% surcharge applied?

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 13. COMMISSIONS TABLE
-- ==========================================
CREATE TABLE public.commissions (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id     UUID           NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    teacher_id    UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id      UUID           NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    enrollment_id UUID           REFERENCES public.enrollments(id) ON DELETE CASCADE,
    amount_earned NUMERIC(10, 2) NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 14. TRIGGERS AND AUTOMATIC FUNCTIONS
-- ==========================================

-- A. updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- B. Auto-create profile + studio membership on Auth signup
--    Expects raw_user_meta_data to include: full_name, role, phone, studio_id
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
    ON CONFLICT (studio_id, user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 15. RLS HELPER FUNCTION
-- ==========================================
-- Returns the set of studio IDs the current user belongs to.
-- STABLE + SECURITY DEFINER so it is evaluated once per statement and
-- bypasses RLS on studio_members itself.
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
-- 15. NOTIFICATIONS — Push & In-App Notification System
-- ==========================================
CREATE TYPE public.notification_type AS ENUM (
    'daily_summary',
    'pre_class_reminder',
    'plan_expiration'
);

CREATE TABLE public.notifications (
    id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type          notification_type NOT NULL,
    title         VARCHAR(200)      NOT NULL,
    body          TEXT              NOT NULL,
    reference_id  UUID,
    sent_at       TIMESTAMPTZ       NOT NULL DEFAULT timezone('utc'::text, now()),
    read_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_notifications_unique
    ON public.notifications (user_id, type, reference_id)
    WHERE reference_id IS NOT NULL;

CREATE INDEX idx_notifications_user_unread
    ON public.notifications (user_id, read_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_sent
    ON public.notifications (user_id, sent_at DESC);

CREATE TABLE public.push_subscriptions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint    TEXT         NOT NULL UNIQUE,
    p256dh_key  TEXT         NOT NULL,
    auth_key    TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_push_subscriptions_user
    ON public.push_subscriptions (user_id);

-- ==========================================
-- 16. ROW LEVEL SECURITY
-- ==========================================

-- studios: members can read their own studio; only admin can update
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

CREATE POLICY studios_select ON public.studios
    FOR SELECT TO authenticated
    USING (id = ANY(SELECT public.auth_studio_ids()));

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

-- studio_members: members can read memberships of their studio
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_members_select ON public.studio_members
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- Allow members to insert themselves into studios they already belong to.
-- App-level logic enforces that only admins can add themselves as teachers.
CREATE POLICY studio_members_insert_self ON public.studio_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND studio_id = ANY(SELECT public.auth_studio_ids())
    );

-- profiles: members can read profiles of anyone in their studio
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

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

-- plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_tenant_select ON public.plans
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plans_tenant_insert ON public.plans
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plans_tenant_update ON public.plans
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plans_tenant_delete ON public.plans
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- plan_activities
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_activities_tenant_select ON public.plan_activities
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plan_activities_tenant_insert ON public.plan_activities
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plan_activities_tenant_update ON public.plan_activities
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY plan_activities_tenant_delete ON public.plan_activities
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- specialties
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY specialties_tenant_select ON public.specialties
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY specialties_tenant_insert ON public.specialties
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY specialties_tenant_update ON public.specialties
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY specialties_tenant_delete ON public.specialties
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- student_details: access via JOIN to profiles -> studio_members
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_details_tenant_select ON public.student_details
    FOR SELECT TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

CREATE POLICY student_details_tenant_insert ON public.student_details
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

CREATE POLICY student_details_tenant_update ON public.student_details
    FOR UPDATE TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

-- teacher_details: access via JOIN to profiles -> studio_members
ALTER TABLE public.teacher_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_details_tenant_select ON public.teacher_details
    FOR SELECT TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

CREATE POLICY teacher_details_tenant_insert ON public.teacher_details
    FOR INSERT TO authenticated
    WITH CHECK (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

CREATE POLICY teacher_details_tenant_update ON public.teacher_details
    FOR UPDATE TO authenticated
    USING (
        profile_id IN (
            SELECT sm.user_id
            FROM   public.studio_members sm
            WHERE  sm.studio_id = ANY(SELECT public.auth_studio_ids())
        )
    );

-- classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY classes_tenant_select ON public.classes
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY classes_tenant_insert ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY classes_tenant_update ON public.classes
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY classes_tenant_delete ON public.classes
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_tenant_select ON public.enrollments
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY enrollments_tenant_insert ON public.enrollments
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY enrollments_tenant_update ON public.enrollments
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY enrollments_tenant_delete ON public.enrollments
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_tenant_select ON public.payments
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY payments_tenant_insert ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY payments_tenant_update ON public.payments
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY payments_tenant_delete ON public.payments
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY commissions_tenant_select ON public.commissions
    FOR SELECT TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY commissions_tenant_insert ON public.commissions
    FOR INSERT TO authenticated
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY commissions_tenant_update ON public.commissions
    FOR UPDATE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()))
    WITH CHECK (studio_id = ANY(SELECT public.auth_studio_ids()));

CREATE POLICY commissions_tenant_delete ON public.commissions
    FOR DELETE TO authenticated
    USING (studio_id = ANY(SELECT public.auth_studio_ids()));

-- notifications (user-scoped, not studio-scoped — each user sees their own)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY notifications_insert_own ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- push_subscriptions (user-scoped)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ==========================================
-- 17. RPC FUNCTIONS
-- ==========================================

-- get_financial_balance: now studio-scoped
-- Validates p_studio_id is one the caller belongs to (security boundary).
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
-- BOOTSTRAP — Default studio for fresh installs
-- ==========================================
INSERT INTO public.studios (name, slug)
VALUES ('Mi Estudio', 'mi-estudio')
ON CONFLICT (slug) DO NOTHING;
