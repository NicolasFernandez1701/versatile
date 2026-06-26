-- ==========================================
-- VERSATILE - MIGRATION 002: Add is_first_payment to payments
-- ==========================================
-- Purpose : Track whether a payment is the student's first payment,
--           used to trigger mid-month proration.
-- Safety  : Additive column with DEFAULT false; existing rows become recurring.
-- Idempotent: Safe to re-run — uses IF NOT EXISTS guard.
-- ==========================================

BEGIN;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS is_first_payment BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- ==========================================
-- END OF MIGRATION 002
-- ==========================================
-- Summary of changes:
--   1. Added is_first_payment BOOLEAN NOT NULL DEFAULT false to public.payments
