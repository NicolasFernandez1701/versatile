-- ==========================================
-- VERSATILE - MIGRATION 004: Studio Members INSERT Policy
-- ==========================================
-- Purpose : Allow authenticated users to insert themselves into studio_members
--           for studios they already belong to. Required by the Profile Switcher
--           feature so admins can add themselves as teachers via addSelfAsTeacher.
-- Safety  : Additive (new RLS policy only). No schema changes, no data migration.
-- Idempotent: Safe to re-run — uses DROP POLICY IF EXISTS / CREATE POLICY.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — INSERT policy for studio_members
-- ==========================================

DROP POLICY IF EXISTS studio_members_insert_self ON public.studio_members;
CREATE POLICY studio_members_insert_self ON public.studio_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND studio_id = ANY(SELECT public.auth_studio_ids())
    );

COMMIT;

-- ==========================================
-- END OF MIGRATION 004
-- ==========================================
-- Summary of changes:
--   1. Added INSERT policy studio_members_insert_self on studio_members
--      - Only allows inserting yourself (user_id = auth.uid())
--      - Only into studios you already belong to (auth_studio_ids)
--      - App-level logic (canAddSelfAsTeacher) handles role-based restrictions
