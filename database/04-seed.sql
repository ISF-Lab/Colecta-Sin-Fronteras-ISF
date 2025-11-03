-- ============================================================================
-- COLECTA ISF - DATOS INICIALES (SEED)
-- Versión: 1.0
-- Fecha: 2025-11-03
-- ============================================================================

-- ============================================================================
-- EQUIPOS INICIALES
-- ============================================================================

-- Insertar los 3 equipos base
INSERT INTO teams (slug, name) VALUES
  ('general', 'Equipo General'),
  ('equipo-a', 'Equipo A'),
  ('equipo-b', 'Equipo B')
ON CONFLICT (slug) DO NOTHING;  -- Evitar errores si ya existen

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count FROM teams;
  
  ASSERT team_count >= 3,
         'Error: No se insertaron todos los equipos';
  
  RAISE NOTICE '✅ Seed completado:';
  RAISE NOTICE '   - % equipos insertados', team_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Equipos disponibles:';
END $$;

-- Mostrar los equipos creados
SELECT 
  id,
  slug,
  name,
  created_at
FROM teams
ORDER BY id;

-- ============================================================================
-- DATOS DE PRUEBA (OPCIONAL - comentado por defecto)
-- ============================================================================

-- Descomentar para agregar donaciones de prueba en desarrollo:

/*
INSERT INTO donations (nombre, email, monto, order_id, estado, team_id, mensaje)
VALUES 
  ('Juan Pérez', 'juan@test.com', 5000, 'ISF-TEST-001', 'pagado', 
   (SELECT id FROM teams WHERE slug = 'equipo-a'), '¡Vamos equipo A!'),
  
  ('María González', 'maria@test.com', 10000, 'ISF-TEST-002', 'pagado',
   (SELECT id FROM teams WHERE slug = 'equipo-b'), 'Apoyo al equipo B'),
  
  ('Pedro Silva', 'pedro@test.com', 3000, 'ISF-TEST-003', 'pagado',
   (SELECT id FROM teams WHERE slug = 'general'), 'Contribución general'),
  
  ('Ana López', 'ana@test.com', 7500, 'ISF-TEST-004', 'pendiente',
   (SELECT id FROM teams WHERE slug = 'equipo-a'), 'Esperando confirmación');

-- Actualizar paid_at para las donaciones pagadas
UPDATE donations 
SET paid_at = NOW() 
WHERE estado = 'pagado' AND paid_at IS NULL;

RAISE NOTICE '✅ Datos de prueba insertados';
*/