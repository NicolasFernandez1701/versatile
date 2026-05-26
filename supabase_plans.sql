-- Tabla de Planes de Pago
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Ej: "Pase Libre", "2 veces por semana"
    price DECIMAL(10,2) NOT NULL,
    classes_per_week INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Insertar planes iniciales sugeridos
INSERT INTO public.plans (name, price, classes_per_week) VALUES
('1 clase por semana', 15000.00, 1),
('2 clases por semana', 22000.00, 2),
('3 clases por semana', 28000.00, 3),
('Pase Libre', 35000.00, 99)
ON CONFLICT DO NOTHING;
