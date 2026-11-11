-- ==========================================
-- VERSATILE - MIGRATION 007: Save Teacher Onboarding Details (RPC)
-- ==========================================
-- Purpose : Persist the teacher onboarding details and flag the profile as
--           onboarded in a single transaction, deriving studio_id on the server
--           from auth_studio_ids(). The client used to send current_studio_id
--           from the auth store, which is empty right after signup or a token
--           refresh, making studio_id null and the insert fail with 23502.
--           The upsert also makes a retry safe when a previous attempt landed
--           the row but failed before flagging the profile.
-- Safety  : Additive (new function only). No table or column changes, no data
--           migration.
-- Idempotent: Safe to re-run — uses CREATE OR REPLACE FUNCTION.
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1 — save_teacher_onboarding_details RPC
-- ==========================================

CREATE OR REPLACE FUNCTION public.save_teacher_onboarding_details(
    p_address     VARCHAR(255),
    p_birth_date  DATE,
    p_specialties UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_studio_id UUID;
    v_studios   UUID[];
BEGIN
    v_studios := ARRAY(SELECT public.auth_studio_ids());

    -- Guard: the caller must belong to at least one studio
    IF COALESCE(array_length(v_studios, 1), 0) = 0 THEN
        RAISE EXCEPTION 'Access denied: user does not belong to any studio';
    END IF;

    -- Prefer the studio where the caller holds a teacher membership; fall back to
    -- their only studio when the teacher membership has not been created yet.
    SELECT sm.studio_id INTO v_studio_id
      FROM public.studio_members sm
     WHERE sm.user_id   = auth.uid()
       AND sm.studio_id = ANY(v_studios)
       AND sm.role      = 'teacher'
     ORDER BY sm.created_at
     LIMIT 1;

    IF v_studio_id IS NULL THEN
        v_studio_id := v_studios[1];
    END IF;

    INSERT INTO public.teacher_details (
        profile_id,
        studio_id,
        address,
        birth_date,
        specialties
    )
    VALUES (
        auth.uid(),
        v_studio_id,
        p_address,
        p_birth_date,
        COALESCE(p_specialties, '{}'::UUID[])
    )
    ON CONFLICT (profile_id) DO UPDATE
       SET address     = EXCLUDED.address,
           birth_date  = EXCLUDED.birth_date,
           specialties = EXCLUDED.specialties,
           studio_id   = EXCLUDED.studio_id,
           updated_at  = now();

    UPDATE public.profiles
       SET has_completed_onboarding = true
     WHERE id = auth.uid();

    RETURN v_studio_id;
END;
$$;

COMMIT;

-- ==========================================
-- END OF MIGRATION 007
-- ==========================================
-- Summary of changes:
--   1. Added RPC public.save_teacher_onboarding_details(
--        p_address VARCHAR(255), p_birth_date DATE, p_specialties UUID[])
--      - Derives studio_id from auth_studio_ids() instead of trusting the client
--      - Prefers the studio where the caller holds a teacher membership
--      - Upserts teacher_details on profile_id, so a retry never hits a duplicate
--      - Flags profiles.has_completed_onboarding in the same transaction
--      - Returns the studio_id that was used
--      - Rejected cases raise: the caller belongs to no studio
