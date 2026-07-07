-- ==========================================
-- VERSATILE - MIGRATION: Notifications Tables
-- ==========================================
-- Purpose : Add notification storage and push subscription tables
--           for automated push and in-app notifications.
-- Safety  : Creates new objects only. Wrapped in a transaction.
-- Idempotent: Re-runs safely via DROP POLICY IF EXISTS.
-- ==========================================

BEGIN;

-- ==========================================
-- 1. NOTIFICATION TYPE ENUM
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'notification_type'
    ) THEN
        CREATE TYPE public.notification_type AS ENUM (
            'daily_summary',
            'pre_class_reminder',
            'plan_expiration'
        );
    END IF;
END$$;

-- ==========================================
-- 2. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.notifications (
    id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type          notification_type NOT NULL,
    title         VARCHAR(200)      NOT NULL,
    body          TEXT              NOT NULL,
    reference_id  UUID,              -- Optional: class_id, plan_id, etc.
    sent_at       TIMESTAMPTZ       NOT NULL DEFAULT timezone('utc'::text, now()),
    read_at       TIMESTAMPTZ
);

-- Unique constraints via partial indexes (PostgreSQL doesn't allow expressions in UNIQUE)
CREATE UNIQUE INDEX idx_notifications_unique_daily
    ON public.notifications (user_id, type, DATE(sent_at))
    WHERE reference_id IS NULL;

CREATE UNIQUE INDEX idx_notifications_unique_daily_ref
    ON public.notifications (user_id, type, reference_id, DATE(sent_at))
    WHERE reference_id IS NOT NULL;

CREATE INDEX idx_notifications_user_unread
    ON public.notifications (user_id, read_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_sent
    ON public.notifications (user_id, sent_at DESC);

-- ==========================================
-- 3. PUSH SUBSCRIPTIONS TABLE
-- ==========================================
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
-- 4. ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to make re-runs safe
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;

CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY notifications_insert_own ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

COMMIT;

-- ==========================================
-- END OF MIGRATION
-- ==========================================
-- Summary of changes:
--   1. Added public.notification_type enum.
--   2. Added public.notifications table with unique day-level deduplication.
--   3. Added public.push_subscriptions table for Web Push endpoints.
--   4. Enabled RLS with user-scoped policies on both tables.
