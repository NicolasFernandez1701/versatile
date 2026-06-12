-- ==============================================================================
-- FUNCIÓN RPC PARA OBTENER BALANCES FINANCIEROS
-- Copiar y pegar este script en el SQL Editor de Supabase y hacer click en "Run"
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_financial_balance(query_year INT, query_month INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'monthlyTotal', COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE EXTRACT(YEAR FROM payment_date) = query_year 
              AND EXTRACT(MONTH FROM payment_date) = query_month
        ), 0),
        
        'annualTotal', COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE EXTRACT(YEAR FROM payment_date) = query_year
        ), 0),
        
        'monthlyByPlan', COALESCE((
            SELECT jsonb_object_agg(plan_name, total)
            FROM (
                SELECT COALESCE(split_part(plan_details, ' - ', 1), 'Otros') as plan_name, SUM(amount) as total
                FROM public.payments
                WHERE EXTRACT(YEAR FROM payment_date) = query_year 
                  AND EXTRACT(MONTH FROM payment_date) = query_month
                GROUP BY 1
            ) sub
        ), '{}'::jsonb),
        
        'annualByPlan', COALESCE((
            SELECT jsonb_object_agg(plan_name, total)
            FROM (
                SELECT COALESCE(split_part(plan_details, ' - ', 1), 'Otros') as plan_name, SUM(amount) as total
                FROM public.payments
                WHERE EXTRACT(YEAR FROM payment_date) = query_year
                GROUP BY 1
            ) sub
        ), '{}'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;
