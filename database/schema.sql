-- ==========================================
-- VERSATILE - ESQUEMA DE BASE DE DATOS
-- ==========================================

-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ELIMINAR TABLAS PREVIAS (En orden correcto de dependencias)
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
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

-- ==========================================
-- 2. TABLA DE PLANES DE PAGO (plans)
-- ==========================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,                 -- Ej: "Básico", "Intermedio A", "Premium"
    price NUMERIC(10, 2) NOT NULL,              -- Precio mensual del plan (precio del paquete cerrado)
    classes_per_week INTEGER NOT NULL,          -- Cupo TOTAL de clases semanales (ej: 2, 3, 5, etc.)
    is_active BOOLEAN DEFAULT true,             -- Si el plan está vigente para venta
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. COMPOSICIÓN DE PLANES POR ACTIVIDAD (plan_activities)
-- ==========================================
-- Modela combinaciones del estilo "2 clases de Stretching + 1 clase de Pilates" (Opción A)
CREATE TABLE public.plan_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    activity_name VARCHAR(100) NOT NULL,        -- Nombre de la actividad (ej: "Stretching", "Pilates")
    classes_per_week INTEGER NOT NULL,          -- Clases asignadas de esta actividad específica
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. TABLA DE PERFILES DE USUARIO (profiles)
-- ==========================================
-- ACTUALIZACIÓN: Incluye campos de promociones temporales con vencimiento
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name VARCHAR(150),
    role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
    email VARCHAR(255),                         -- Correo sincronizado desde Auth
    phone VARCHAR(30),                          -- Teléfono de contacto / WhatsApp

    -- Columnas relacionales para control de suscripción activa de alumnos
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_expiration_date DATE,

    -- NUEVO: Promociones temporales asignadas al alumno con duración dinámica
    promotion_discount_pct INTEGER DEFAULT 0,    -- Descuento en % (ej. 50 para 2x1)
    promotion_expiration_date DATE,              -- Fecha límite de la promoción elegible por el admin

    -- NUEVO: Flujo de Onboarding obligatorio
    has_completed_onboarding BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4.5. TABLA DE DETALLES DEL ALUMNO (student_details)
-- ==========================================
-- Guarda todos los datos médicos, personales y de estilo de vida recolectados en el Onboarding
CREATE TABLE public.student_details (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Paso 1: Datos Personales
    document_id VARCHAR(50),
    birth_date DATE,
    age INTEGER,
    address VARCHAR(255),
    occupation VARCHAR(100),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),

    -- Paso 2: Historial Médico y de Salud
    chronic_diseases VARCHAR(500),
    allergies VARCHAR(500),
    recent_injuries VARCHAR(500),
    medications VARCHAR(500),
    medical_certificate_url VARCHAR(500),
    medical_certificate_status VARCHAR(20) CHECK (medical_certificate_status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    medical_certificate_expiration DATE,

    -- Paso 3: Estilo de Vida y Actividad Física
    currently_active BOOLEAN,
    training_experience VARCHAR(100),
    daily_work_activity VARCHAR(100),

    -- Paso 4: Objetivos y Preferencias
    main_objectives VARCHAR(100)[], -- Array de objetivos (Hipertrofia, Tonificar, etc.)
    preferred_schedule VARCHAR(50),

    -- Paso 5: Términos, Condiciones y Consentimiento Legal
    agreed_to_data_protection BOOLEAN DEFAULT false,
    agreed_to_medical_exoneration BOOLEAN DEFAULT false,
    agreed_to_facility_rules BOOLEAN DEFAULT false,
    agreed_to_image_rights BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4.6. TABLA DE ESPECIALIDADES (specialties)
-- ==========================================
-- Tipos de disciplinas que se dictan en el gimnasio
CREATE TABLE public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insertar algunas especialidades por defecto
INSERT INTO public.specialties (name) VALUES 
('Funcional'), ('Pilates'), ('Yoga'), ('Musculación'), ('Zumba'), ('Crossfit')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 4.7. TABLA DE DETALLES DEL PROFESOR (teacher_details)
-- ==========================================
CREATE TABLE public.teacher_details (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    address VARCHAR(255),
    birth_date DATE,
    specialties UUID[] DEFAULT '{}', -- Array de IDs de la tabla specialties
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 5. TABLA DE CLASES (classes)
-- ==========================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name VARCHAR(100) NOT NULL,        -- Nombre de la actividad/clase (ej: "Stretching")
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER DEFAULT 15,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    teacher_commission_pct NUMERIC(5, 2) DEFAULT 50.00, -- Porcentaje de comisión asignado al profesor
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 6. TABLA DE INSCRIPCIONES (enrollments)
-- ==========================================
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Un alumno no puede inscribirse dos veces a la misma clase
    UNIQUE (student_id, class_id)
);

-- ==========================================
-- 7. TABLA DE HISTORIAL DE PAGOS (payments)
-- ==========================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL, -- Relación al plan original
    
    amount NUMERIC(10, 2) NOT NULL,             -- Monto final cobrado (el que realmente entra al estudio)
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL,
    plan_details VARCHAR(255),                  -- Copia histórica legible (ej: "Premium - $80000")
    
    -- NUEVOS: Campos de auditoría financiera
    payment_method VARCHAR(20) CHECK (payment_method IN ('efectivo', 'transferencia')) DEFAULT 'transferencia',
    original_amount NUMERIC(10, 2) NOT NULL,     -- Precio base del plan original
    discount_applied NUMERIC(10, 2) DEFAULT 0.00,-- Total pesos descontados (por efectivo o por promo)
    surcharge_applied NUMERIC(10, 2) DEFAULT 0.00,-- Total pesos sumados por recargo de mora
    late_payment BOOLEAN DEFAULT false,          -- ¿Se abonó después del día 10 del mes?
    late_fee_applied BOOLEAN DEFAULT false,      -- ¿Se le cobró el recargo del 20%?

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 8. TABLA DE ASISTENCIA (attendance)
-- ==========================================
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'confirmed', 'cancelled')) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Solo un registro de asistencia por alumno/clase al día
    UNIQUE (enrollment_id, date)
);

-- ==========================================
-- 9. TABLA DE COMISIONES DE PROFESORES (commissions)
-- ==========================================
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    amount_earned NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 10. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==========================================

-- A. Trigger para updated_at en la tabla plans
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

-- B. Trigger para crear automáticamente el perfil en public.profiles al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 11. DESHABILITAR SEGURIDAD DE FILAS (RLS) - Desarrollo simplificado
-- ==========================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions DISABLE ROW LEVEL SECURITY;