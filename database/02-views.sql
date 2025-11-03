-- ============================================================================
-- COLECTA ISF - VIEWS PÚBLICAS
-- Versión: 1.0
-- Fecha: 2025-11-03
-- ============================================================================

-- ============================================================================
-- VIEW: public_stats
-- Descripción: Estadísticas globales de la colecta
-- Acceso: Público (anon) - lectura en tiempo real desde el frontend
-- Actualización: Automática cuando cambia el estado de donations
-- ============================================================================

CREATE OR REPLACE VIEW public_stats AS
SELECT
  COALESCE(SUM(monto), 0) AS total_recaudado,
  25000 AS meta,  -- Meta fija de $25,000 CLP (después migrar a config table)
  COUNT(*) AS total_donaciones
FROM donations
WHERE estado = 'pagado';  -- Solo contar donaciones confirmadas

COMMENT ON VIEW public_stats IS 'Estadísticas globales de la colecta (acceso público)';

-- ============================================================================
-- VIEW: team_rankings
-- Descripción: Ranking de equipos por monto total recaudado
-- Acceso: Público (anon) - lectura en tiempo real desde el frontend
-- Orden: Descendente por total recaudado
-- ============================================================================

CREATE OR REPLACE VIEW team_rankings AS
SELECT
  t.slug,
  t.name,
  COALESCE(SUM(d.monto), 0) AS total,
  COUNT(d.id) FILTER (WHERE d.estado = 'pagado') AS donaciones_count
FROM teams t
LEFT JOIN donations d ON d.team_id = t.id AND d.estado = 'pagado'
GROUP BY t.id, t.slug, t.name
ORDER BY total DESC;

COMMENT ON VIEW team_rankings IS 'Ranking de equipos ordenado por monto total recaudado (acceso público)';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las views se crearon correctamente
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name IN ('public_stats', 'team_rankings')) = 2,
         'Error: No se crearon todas las views';
  
  RAISE NOTICE '✅ Views creadas exitosamente: public_stats, team_rankings';
END $$;