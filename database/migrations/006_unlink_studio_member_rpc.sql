-- ==========================================
-- VERSATILE - MIGRATION 006: Unlink Studio Member (RPC)
-- ==========================================
-- Purpose : Allow a studio admin to unlink a member (e.g. a teacher) from their
--           studio in one atomic operation: unassign the classes they teach inside
--           that studio and delete every studio_members row of that user in it.
--           Access is derived from studio_members through auth_studio_ids(), so
--           removing the rows revokes access to the studio while preserving the
--           profile, the historical classes and the commission records.
-- Safety  : Additive (new function + removal of an unused policy). No table or
--           column changes, no data migration.
-- Idempotent: Safe to re-run — uses CREATE OR REPLACE FUNCTION and
--           DROP POLICY IF EXISTS.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — Remove the direct DELETE policy
-- ==========================================
-- Deleting studio_members must only happen through the RPC below, which enforces
-- the admin check and unassigns the classes atomically. A direct DELETE policy
-- would duplicate that authorization logic and allow an inconsistent state
-- (membership removed while classes still reference the teacher).

DROP POLICY IF EXISTS studio_members_delete ON public.studio_members;

-- ==========================================
-- SECTION 2 — unlink_studio_member RPC
-- ==========================================

CREATE OR REPLACE FUNCTION public.unlink_studio_member(
    p_studio_id UUID,
    p_user_id   UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin        BOOLEAN;
    v_target_is_admin BOOLEAN;
    v_admin_count     INTEGER;
    v_removed         INTEGER;
BEGIN
    -- Guard: caller must belong to the requested studio
    IF p_studio_id NOT IN (SELECT public.auth_studio_ids()) THEN
        RAISE EXCEPTION 'Access denied: studio not accessible to current user';
    END IF;

    -- Guard: caller must hold an admin membership in that studio
    SELECT EXISTS (
        SELECT 1
        FROM   public.studio_members me
        WHERE  me.studio_id = p_studio_id
          AND  me.user_id   = auth.uid()
          AND  me.role      = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: only a studio admin can unlink members';
    END IF;

    -- Guard: target user must currently belong to that studio
    IF NOT EXISTS (
        SELECT 1
        FROM   public.studio_members t
        WHERE  t.studio_id = p_studio_id
          AND  t.user_id   = p_user_id
    ) THEN
        RAISE EXCEPTION 'User % is not a member of this studio', p_user_id;
    END IF;

    -- Guard: the last admin of a studio can never be unlinked
    SELECT EXISTS (
        SELECT 1
        FROM   public.studio_members t
        WHERE  t.studio_id = p_studio_id
          AND  t.user_id   = p_user_id
          AND  t.role      = 'admin'
    ) INTO v_target_is_admin;

    IF v_target_is_admin THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM   public.studio_members
        WHERE  studio_id = p_studio_id
          AND  role      = 'admin';

        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot unlink the last admin of the studio';
        END IF;
    END IF;

    -- Unassign the classes taught by this member inside this studio
    UPDATE public.classes
       SET teacher_id = NULL
     WHERE studio_id  = p_studio_id
       AND teacher_id = p_user_id;

    -- Remove every membership of that user in that studio
    DELETE FROM public.studio_members
     WHERE studio_id = p_studio_id
       AND user_id   = p_user_id;

    GET DIAGNOSTICS v_removed = ROW_COUNT;

    RETURN v_removed;
END;
$$;

COMMIT;

-- ==========================================
-- END OF MIGRATION 006
-- ==========================================
-- Summary of changes:
--   1. Added RPC public.unlink_studio_member(p_studio_id UUID, p_user_id UUID)
--      - Caller must belong to the studio and hold an admin membership there
--      - The target user must currently belong to the studio
--      - The last admin of a studio can never be unlinked
--      - Sets classes.teacher_id = NULL for the classes taught inside that studio
--      - Deletes every studio_members row of that user in that studio
--      - Returns the number of membership rows removed
--   2. Dropped the unused studio_members_delete policy: unlinking must go through
--      the RPC so the class reassignment and the membership removal stay atomic
--      - The profile, the classes and the commission history are preserved
