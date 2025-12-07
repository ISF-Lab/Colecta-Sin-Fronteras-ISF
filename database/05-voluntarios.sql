-- ============================================================================
-- GESTIÓN DE VOLUNTARIOS - Importación desde Google Sheets
-- ============================================================================
-- 
-- ⚠️  IMPORTANTE: LEER ANTES DE EJECUTAR
-- ============================================================================
-- 
-- Este script está diseñado para funcionar con el flujo actual de inscripción
-- de voluntarios mediante Google Forms. Si este flujo cambia o si las 
-- preguntas del formulario se modifican, DEBERÁS ADAPTAR ESTE SCRIPT.
--
-- FLUJO ACTUAL:
-- 1. Los voluntarios se inscriben mediante Google Forms
-- 2. Las respuestas se guardan automáticamente en Google Sheets
-- 3. El administrador descarga el Sheets como CSV
-- 4. El CSV se importa a Supabase (tabla 'voluntarios_raw')
-- 5. Este script extrae los equipos únicos y los migra a 'teams'
--
-- ============================================================================
-- COLUMNAS DEL GOOGLE FORM (A DICIEMBRE 2025)
-- ============================================================================
-- 
-- Las columnas actuales del Google Sheets generado por el Form son:
--   - Timestamp
--   - Nombre
--   - Número de contacto
--   - Correo
--   - "Equipo al que perteneces"   ← ESTA ES LA COLUMNA CLAVE
--   - ¿Cómo te enteraste...?
--   - Primer Apellido
--   - Segundo Apellido
--
-- SI EL FORMULARIO CAMBIA:
-- 1. Revisa las columnas del nuevo Google Sheets
-- 2. Identifica cuál columna contiene el nombre del equipo
-- 3. Modifica la línea marcada con "COLUMNA_EQUIPO" en el script de abajo
--
-- ============================================================================


-- ============================================================================
-- PARTE 1: PREPARAR LA TABLA DE IMPORTACIÓN
-- ============================================================================
-- 
-- OPCIÓN A (RECOMENDADA): Importación automática
-- Supabase puede crear la tabla automáticamente al importar el CSV:
--   Table Editor → Import data from CSV
-- 
-- OPCIÓN B: Crear tabla manualmente (estructura de referencia)
-- Descomenta y adapta según las columnas de tu CSV:
-- 
-- CREATE TABLE IF NOT EXISTS voluntarios_raw (
--   id BIGSERIAL PRIMARY KEY,
--   "Timestamp" TEXT,
--   "Nombre" TEXT,
--   "Número de contacto" TEXT,
--   "Correo" TEXT,
--   "Equipo al que perteneces" TEXT,    -- ← COLUMNA_EQUIPO
--   "¿Cómo te enteraste d...?" TEXT,
--   "Primer Apellido" TEXT,
--   "Segundo Apellido" TEXT
-- );
-- 
-- NOTA: Los nombres de columna deben coincidir EXACTAMENTE con el CSV.
--       Usa comillas dobles para nombres con espacios o caracteres especiales.


-- ============================================================================
-- PARTE 2: ASEGURAR CONSTRAINT UNIQUE EN TABLA 'teams'
-- ============================================================================

-- Este constraint permite usar ON CONFLICT para evitar duplicados.
-- Si ya existe, el comando dará un error inofensivo que puedes ignorar.
ALTER TABLE public.teams
ADD CONSTRAINT teams_name_unique UNIQUE (name);


-- ============================================================================
-- PARTE 3: MIGRAR EQUIPOS DE 'voluntarios_raw' A 'teams'
-- ============================================================================
-- 
-- ⚠️  ANTES DE EJECUTAR: Verifica que la columna "Equipo al que perteneces"
--     coincida con el nombre de columna de tu CSV. Si es diferente,
--     modifica las líneas marcadas con "COLUMNA_EQUIPO".

WITH source_teams AS (
  SELECT DISTINCT
    -- ↓↓↓ COLUMNA_EQUIPO: Cambiar si el nombre de columna del equipo es diferente ↓↓↓
    TRIM("Equipo al que perteneces") AS cleaned_name
    -- ↑↑↑ COLUMNA_EQUIPO ↑↑↑
  FROM
    public.voluntarios_raw
  WHERE
    -- ↓↓↓ COLUMNA_EQUIPO: Cambiar aquí también ↓↓↓
    "Equipo al que perteneces" IS NOT NULL 
    AND TRIM("Equipo al que perteneces") <> ''
    -- ↑↑↑ COLUMNA_EQUIPO ↑↑↑
)
INSERT INTO public.teams (name, slug)
SELECT
  st.cleaned_name,
  -- Genera un slug URL-friendly a partir del nombre
  -- Ejemplo: "Equipo Norte 2025" → "equipo-norte-2025"
  trim(both '-' from regexp_replace(lower(st.cleaned_name), '[^a-z0-9\-]+', '-', 'g')) AS generated_slug
FROM
  source_teams st
-- Si el equipo ya existe, lo ignora (evita duplicados)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- PARTE 4: VERIFICACIÓN
-- ============================================================================

-- Después de ejecutar, verifica cuántos equipos fueron creados/existen:
SELECT 
  COUNT(*) as total_equipos,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as nuevos_equipos
FROM public.teams;

-- Listar todos los equipos:
SELECT id, name, slug, created_at 
FROM public.teams 
ORDER BY name;


-- ============================================================================
-- LIMPIEZA OPCIONAL (después de verificar que todo está correcto)
-- ============================================================================
-- 
-- Si ya no necesitas la tabla de importación, puedes eliminarla:
-- DROP TABLE IF EXISTS voluntarios_raw;
-- 
-- O truncarla para la próxima importación:
-- TRUNCATE TABLE voluntarios_raw;
