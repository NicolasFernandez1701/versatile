-- ==========================================
-- VERSATILE - MIGRATION 005: Multi-Membership Constraint
-- ==========================================
-- Purpose : Allow a single user to hold multiple roles within the same studio
--           (e.g., admin + teacher) by expanding the UNIQUE constraint on
--           studio_members from (studio_id, user_id) to (studio_id, user_id, role).
--           This enables the Profile Switcher feature.
-- Safety  : Modifies an existing constraint. The new constraint is MORE permissive
--           than the old one (adds role to the uniqueness key), so no data loss.
-- Idempotent: Safe to re-run — uses DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — Replace UNIQUE constraint on studio_members
-- ==========================================

-- Drop the old single-role constraint
ALTER TABLE public.studio_members
    DROP CONSTRAINT IF EXISTS studio_members_studio_id_user_id_key;

-- Add the new multi-role constraint
ALTER TABLE public.studio_members
    ADD CONSTRAINT studio_members_studio_id_user_id_role_key
    UNIQUE (studio_id, user_id, role);

-- ==========================================
-- SECTION 2 — Update the signup trigger
-- ==========================================

-- The handle_new_user trigger inserts with ON CONFLICT. Update it to match
-- the new constraint columns so duplicate-role inserts are silently ignored.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMIT;

-- ==========================================
-- END OF MIGRATION 005
-- ==========================================
-- Summary of changes:
--   1. Replaced UNIQUE(studio_id, user_id) with UNIQUE(studio_id, user_id, role)
--      on studio_members — allows multi-role memberships per studio.
--   2. Updated handle_new_user() trigger ON CONFLICT clause to match new
--      constraint columns.
--   NOTE: This migration MUST be applied BEFORE migration 004 (INSERT policy)
--   since 004's policy relies on multi-membership being possible.
