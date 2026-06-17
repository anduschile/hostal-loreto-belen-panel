-- Catálogo de platos. Sin precio acá.
CREATE TABLE hostal_menus (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    foto_url TEXT,
    ingredientes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Precios del menú por empresa y tipo de servicio
CREATE TABLE hostal_menu_prices (
    id BIGSERIAL PRIMARY KEY,
    menu_id BIGINT NOT NULL REFERENCES hostal_menus(id) ON DELETE CASCADE,
    company_id BIGINT REFERENCES hostal_companies(id) ON DELETE CASCADE,
    tipo_servicio TEXT NOT NULL CHECK (tipo_servicio IN ('almuerzo', 'cena')),
    precio NUMERIC NOT NULL CHECK (precio >= 0),
    vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (menu_id, company_id, tipo_servicio, vigente_desde)
);

-- Programación del día: qué se va a servir
CREATE TABLE hostal_meal_services (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_servicio TEXT NOT NULL CHECK (tipo_servicio IN ('almuerzo', 'cena')),
    menu_a_id BIGINT NOT NULL REFERENCES hostal_menus(id),
    menu_b_id BIGINT NOT NULL REFERENCES hostal_menus(id),
    notas TEXT,
    created_by BIGINT REFERENCES hostal_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (fecha, tipo_servicio),
    CHECK (menu_a_id <> menu_b_id)
);

-- Consumo: un registro por huésped que come
CREATE TABLE hostal_meal_consumption (
    id BIGSERIAL PRIMARY KEY,
    meal_service_id BIGINT NOT NULL REFERENCES hostal_meal_services(id) ON DELETE CASCADE,
    guest_id BIGINT NOT NULL REFERENCES hostal_guests(id),
    reservation_id BIGINT REFERENCES hostal_reservations(id),
    company_id BIGINT REFERENCES hostal_companies(id),
    eleccion TEXT CHECK (eleccion IN ('A', 'B') OR eleccion IS NULL),
    estado_whatsapp TEXT DEFAULT 'pendiente' CHECK (estado_whatsapp IN ('pendiente', 'enviado', 'respondido', 'sin_respuesta')),
    whatsapp_enviado_at TIMESTAMPTZ,
    precio_snapshot NUMERIC,
    menu_servido_id BIGINT REFERENCES hostal_menus(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (meal_service_id, guest_id)
);

-- Índices para performance
CREATE INDEX idx_meal_services_fecha ON hostal_meal_services(fecha);
CREATE INDEX idx_meal_consumption_service ON hostal_meal_consumption(meal_service_id);
CREATE INDEX idx_meal_consumption_guest ON hostal_meal_consumption(guest_id);
CREATE INDEX idx_menu_prices_lookup ON hostal_menu_prices(menu_id, company_id, tipo_servicio) WHERE is_active = true;

-- RLS: Enable all access for admins and reception
ALTER TABLE hostal_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostal_menu_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostal_meal_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostal_meal_consumption ENABLE ROW LEVEL SECURITY;

-- RLS Policy: replica el patrón de hostal_companies (acceso abierto a autenticados)
CREATE POLICY "Enable all access for admins and reception" ON hostal_menus
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for admins and reception" ON hostal_menu_prices
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for admins and reception" ON hostal_meal_services
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for admins and reception" ON hostal_meal_consumption
    FOR ALL
    USING (true)
    WITH CHECK (true);