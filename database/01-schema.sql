-- ============================================================================
-- COLECTA ISF - ESQUEMA DE BASE DE DATOS
-- Versión: 1.0
-- Fecha: 2025-11-03
-- ============================================================================

-- ============================================================================
-- TABLA: teams
-- Descripción: Equipos participantes en la colecta
-- ============================================================================

CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por slug
CREATE INDEX idx_teams_slug ON teams(slug);

COMMENT ON TABLE teams IS 'Equipos participantes en la colecta';
COMMENT ON COLUMN teams.slug IS 'Identificador único del equipo para URLs (ej: equipo-a)';
COMMENT ON COLUMN teams.name IS 'Nombre visible del equipo (ej: Equipo A)';

-- ============================================================================
-- TABLA: donations
-- Descripción: Registro de todas las donaciones (pendientes, pagadas, fallidas)
-- Fuente de verdad: El webhook de Payku actualiza el estado
-- ============================================================================

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del donante
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  mensaje TEXT,
  
  -- Información del pago
  monto INTEGER NOT NULL CHECK (monto BETWEEN 1000 AND 500000),
  order_id TEXT UNIQUE NOT NULL,
  
  -- Estado del pago (solo 3 valores posibles)
  estado TEXT NOT NULL DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'pagado', 'fallido')),
  
  -- Tracking de Payku
  payku_transaction_id TEXT,
  payku_status TEXT,
  
  -- Relación con equipo
  team_id BIGINT NOT NULL REFERENCES teams(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  
  -- Metadata para debugging y analytics
  user_agent TEXT,
  ip_address TEXT
);

-- Índices para optimizar queries frecuentes
CREATE INDEX idx_donations_order ON donations(order_id);
CREATE INDEX idx_donations_estado ON donations(estado);
CREATE INDEX idx_donations_team ON donations(team_id);
CREATE INDEX idx_donations_created ON donations(created_at DESC);

COMMENT ON TABLE donations IS 'Registro de todas las donaciones del sistema';
COMMENT ON COLUMN donations.order_id IS 'ID único de la orden (ej: ISF-1730678400-a1b2c3) - CRÍTICO para idempotencia';
COMMENT ON COLUMN donations.estado IS 'Estado actual: pendiente (creada), pagado (confirmado por webhook), fallido (rechazado)';
COMMENT ON COLUMN donations.monto IS 'Monto en CLP (pesos chilenos) sin decimales';
COMMENT ON COLUMN donations.payku_transaction_id IS 'ID de transacción de Payku (llega en webhook)';
COMMENT ON COLUMN donations.paid_at IS 'Timestamp cuando se confirmó el pago (cuando webhook marca como pagado)';

-- ============================================================================
-- TABLA: webhook_events
-- Descripción: Log de todos los webhooks recibidos de Payku
-- Propósito: Debugging, auditoría, reconciliación manual
-- ============================================================================

CREATE TABLE webhook_events (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar eventos por order_id
CREATE INDEX idx_webhook_events_order ON webhook_events(order_id);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);

COMMENT ON TABLE webhook_events IS 'Log de todos los webhooks recibidos de Payku para debugging';
COMMENT ON COLUMN webhook_events.payload IS 'Contenido completo del webhook en formato JSON';
COMMENT ON COLUMN webhook_events.status_code IS 'Código HTTP devuelto al procesar el webhook';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name IN ('teams', 'donations', 'webhook_events')) = 3,
         'Error: No se crearon todas las tablas';
  
  RAISE NOTICE '✅ Esquema creado exitosamente: 3 tablas + índices';
END $$;