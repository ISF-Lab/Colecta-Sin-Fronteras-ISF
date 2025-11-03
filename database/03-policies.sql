-- ============================================================================
-- COLECTA ISF - ROW LEVEL SECURITY (RLS) POLICIES
-- Versión: 1.0
-- Fecha: 2025-11-03
-- ============================================================================

-- IMPORTANTE: Solo las VIEWS son públicas, las TABLAS son privadas

-- ============================================================================
-- TABLAS BASE: Acceso PRIVADO (solo service_key del backend)
-- ============================================================================

-- Habilitar RLS en todas las tablas base
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- NO crear policies para estas tablas = acceso denegado para usuarios anon
-- Solo el backend con service_key puede leer/escribir

COMMENT ON TABLE teams IS 'PRIVADA: Solo accesible via service_key del backend';
COMMENT ON TABLE donations IS 'PRIVADA: Solo accesible via service_key del backend';
COMMENT ON TABLE webhook_events IS 'PRIVADA: Solo accesible via service_key del backend';

-- ============================================================================
-- VIEWS PÚBLICAS: Acceso de LECTURA para usuarios anónimos
-- ============================================================================

-- Habilitar RLS en las views
ALTER VIEW public_stats SET (security_invoker = true);
ALTER VIEW team_rankings SET (security_invoker = true);

-- GRANT SELECT para usuarios anónimos (rol 'anon' en Supabase)
GRANT SELECT ON public_stats TO anon;
GRANT SELECT ON team_rankings TO anon;

-- También dar permisos al rol authenticated (usuarios logueados en el futuro)
GRANT SELECT ON public_stats TO authenticated;
GRANT SELECT ON team_rankings TO authenticated;

-- ============================================================================
-- VERIFICACIÓN DE SEGURIDAD
-- ============================================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
BEGIN
  -- Verificar que RLS está habilitado en las 3 tablas
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('teams', 'donations', 'webhook_events')
    AND rowsecurity = true;
  
  ASSERT rls_enabled_count = 3,
         'Error: RLS no está habilitado en todas las tablas';
  
  RAISE NOTICE '✅ RLS configurado correctamente:';
  RAISE NOTICE '   - Tablas base: PRIVADAS (solo service_key)';
  RAISE NOTICE '   - Views: PÚBLICAS (lectura para anon)';
END $$;

-- ============================================================================
-- TESTING DE PERMISOS (ejecutar como usuario anon)
-- ============================================================================

-- Para probar acceso anónimo, puedes ejecutar en el SQL Editor:
-- SET ROLE anon;
-- SELECT * FROM public_stats;           -- ✅ Debe funcionar
-- SELECT * FROM team_rankings;          -- ✅ Debe funcionar
-- SELECT * FROM donations;              -- ❌ Debe fallar (permission denied)
-- RESET ROLE;