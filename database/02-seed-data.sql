-- ==========================================
-- VERSATILE - SEED DE DATOS PARA PRUEBAS (END-TO-END)
-- ==========================================
-- INSTRUCCIONES:
-- Ejecutar este script en el SQL Editor de Supabase.
-- Generará: 3 Planes, 2 Profesores extra, 19 Alumnos extra, 
-- Clases semanales, Inscripciones, Asistencias, Pagos y Comisiones.
-- ==========================================

-- 1. LIMPIEZA DE DATOS PREVIOS (Opcional, limpiar tablas sin afectar Auth)
TRUNCATE TABLE public.commissions CASCADE;
TRUNCATE TABLE public.enrollments CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.classes CASCADE;
TRUNCATE TABLE public.plan_activities CASCADE;
TRUNCATE TABLE public.plans CASCADE;

-- ==========================================
-- 2. CREACIÓN DE PLANES
-- ==========================================
DO $$ 
DECLARE 
    plan_basic_id UUID := gen_random_uuid();
    plan_inter_id UUID := gen_random_uuid();
    plan_premium_id UUID := gen_random_uuid();
    
    i INT;
    fake_id UUID;
    t2_id UUID := gen_random_uuid();
    t3_id UUID := gen_random_uuid();
    
    real_teacher UUID;
    real_student UUID;
    
    c1 UUID := gen_random_uuid(); c2 UUID := gen_random_uuid(); c3 UUID := gen_random_uuid();
    c4 UUID := gen_random_uuid(); c5 UUID := gen_random_uuid(); c6 UUID := gen_random_uuid();
    
    student_record RECORD;
    class_record RECORD;
    enr RECORD;
    stu RECORD;
    att_id UUID;
    past_date DATE := CURRENT_DATE - INTERVAL '2 days';
    future_date DATE := CURRENT_DATE + INTERVAL '2 days';
BEGIN
    -- Crear Planes
    INSERT INTO public.plans (id, name, price, classes_per_week, is_active) VALUES
    (plan_basic_id, 'Plan Básico', 25000.00, 2, true),
    (plan_inter_id, 'Plan Intermedio', 32000.00, 3, true),
    (plan_premium_id, 'Plan Premium', 45000.00, 5, true);

    INSERT INTO public.plan_activities (plan_id, activity_name, classes_per_week) VALUES
    (plan_basic_id, 'Pilates', 1), (plan_basic_id, 'Stretching', 1),
    (plan_inter_id, 'Pilates', 2), (plan_inter_id, 'Funcional', 1),
    (plan_premium_id, 'Pilates', 2), (plan_premium_id, 'Stretching', 2), (plan_premium_id, 'Yoga', 1);

    -- ==========================================
    -- 3.B. INYECCIÓN DE USUARIOS FALSOS EN AUTH
    -- ==========================================
    -- Profesores Falsos
    SELECT id INTO t2_id FROM auth.users WHERE email = 'profe2@versatile.com' LIMIT 1;
    IF t2_id IS NULL THEN
        t2_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (t2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe2@versatile.com', 'fake', NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Laura (Profe 2)", "role": "teacher"}'::jsonb, NOW(), NOW());
    END IF;

    SELECT id INTO t3_id FROM auth.users WHERE email = 'profe3@versatile.com' LIMIT 1;
    IF t3_id IS NULL THEN
        t3_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (t3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe3@versatile.com', 'fake', NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Marcos (Profe 3)", "role": "teacher"}'::jsonb, NOW(), NOW());
    END IF;

    -- Alumnos Falsos
    FOR i IN 1..19 LOOP
        SELECT id INTO fake_id FROM auth.users WHERE email = 'alumno' || i || '@versatile.com' LIMIT 1;
        IF fake_id IS NULL THEN
            fake_id := gen_random_uuid();
            INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES (fake_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alumno' || i || '@versatile.com', 'fake', NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, ('{"full_name": "Alumno Fantasma ' || i || '", "role": "student"}')::jsonb, NOW(), NOW());
        END IF;
    END LOOP;
    
    -- Darle un microsegundo a la base de datos para asegurar que los triggers de perfiles se asienten
    PERFORM pg_sleep(1);

    -- ==========================================
    -- 3.C. INYECCIÓN Y RESCATE DE USUARIOS EN PROFILES (SEGURO CONTRA ERRORES)
    -- ==========================================
    -- Si por error se borró la tabla profiles o el trigger falló, esto rescata a TODOS los usuarios y los vuelve a insertar en profiles.
    INSERT INTO public.profiles (id, full_name, role, email, has_completed_onboarding)
    SELECT id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'role', email, false
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;

    -- Buscar usuarios reales o usar los recién creados
    SELECT id INTO real_teacher FROM public.profiles WHERE role = 'teacher' LIMIT 1;
    IF real_teacher IS NULL THEN real_teacher := t2_id; END IF;
    
    SELECT id INTO real_student FROM public.profiles WHERE role = 'student' LIMIT 1;
    IF real_student IS NULL THEN SELECT id INTO real_student FROM public.profiles WHERE email = 'alumno1@versatile.com' LIMIT 1; END IF;

    -- ==========================================
    -- 4. CREACIÓN DE CLASES EN LA GRILLA
    -- ==========================================
    INSERT INTO public.classes (id, activity_name, teacher_id, day_of_week, start_time, end_time, capacity, base_price, teacher_commission_pct) VALUES
    (c1, 'Pilates Mat', real_teacher, 1, '09:00', '10:00', 10, 5000, 50),
    (c2, 'Stretching', real_teacher, 3, '18:00', '19:00', 15, 4500, 50),
    (c3, 'Funcional', real_teacher, 5, '10:00', '11:00', 20, 5000, 50),
    (c4, 'Yoga', t2_id, 2, '19:00', '20:00', 15, 6000, 40),
    (c5, 'Crossfit', t3_id, 4, '17:00', '18:00', 20, 7000, 40),
    (c6, 'Pilates Reformer', t2_id, 1, '11:00', '12:00', 5, 8000, 60);

    -- ==========================================
    -- 5. RESERVAS FLEXIBLES (Enrollments) Y COMISIONES
    -- ==========================================
    -- A) Crear reservas pasadas (asistidas) para generar comisiones
    FOR student_record IN SELECT id FROM public.profiles WHERE role = 'student' LIMIT 5 LOOP
        FOR class_record IN SELECT id, teacher_id, base_price, teacher_commission_pct FROM public.classes ORDER BY random() LIMIT 2 LOOP
            -- Insertar la reserva como 'attended'
            INSERT INTO public.enrollments (id, student_id, class_id, reservation_date, attendance_status) 
            VALUES (gen_random_uuid(), student_record.id, class_record.id, past_date, 'attended') 
            RETURNING id INTO att_id;
            
            -- Pagarle la comisión al profe por esta clase
            INSERT INTO public.commissions (teacher_id, class_id, enrollment_id, amount_earned)
            VALUES (class_record.teacher_id, class_record.id, att_id, (class_record.base_price * class_record.teacher_commission_pct / 100)) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- B) Crear reservas futuras (pendientes)
    FOR student_record IN SELECT id FROM public.profiles WHERE role = 'student' LOOP
        FOR class_record IN SELECT id FROM public.classes ORDER BY random() LIMIT 2 LOOP
            INSERT INTO public.enrollments (id, student_id, class_id, reservation_date, attendance_status) 
            VALUES (gen_random_uuid(), student_record.id, class_record.id, future_date, 'pending') ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- ==========================================
    -- 7. PAGOS (Payments)
    -- ==========================================
    FOR stu IN SELECT id FROM public.profiles WHERE role = 'student' LOOP
        INSERT INTO public.payments (student_id, plan_id, amount, payment_date, expiration_date, plan_details, payment_method, original_amount)
        VALUES (stu.id, plan_premium_id, 45000.00, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'Plan Premium - $45000', 'transferencia', 45000.00);
    END LOOP;
END $$;

-- Fin del Seed
