# 🗄️ Database Setup - Colecta ISF

Guía paso a paso para configurar la base de datos en Supabase.

## 📋 Pre-requisitos

- Cuenta en [Supabase](https://supabase.com)
- Proyecto creado en Supabase
- Acceso al SQL Editor del proyecto

## 🚀 Instalación (5 minutos)

### Paso 1: Acceder al SQL Editor

1. Ir a tu proyecto en Supabase: https://supabase.com/dashboard/project/[TU-PROJECT-ID]
2. En el menú lateral, hacer clic en **SQL Editor**
3. Hacer clic en el botón **+ New query**

### Paso 2: Ejecutar los scripts en orden

**⚠️ IMPORTANTE: Los scripts deben ejecutarse en el orden indicado.**

#### 2.1 Schema (Tablas e Índices)

```bash
# Copiar el contenido de: 01-schema.sql
```

1. Pegar el contenido completo de `01-schema.sql` en el SQL Editor
2. Hacer clic en **Run** (o Ctrl/Cmd + Enter)
3. Verificar mensaje: ✅ "Esquema creado exitosamente: 3 tablas + índices"

**Qué se creó:**
- Tabla `teams` (equipos)
- Tabla `donations` (donaciones)
- Tabla `webhook_events` (log de webhooks)
- 8 índices para optimizar queries

#### 2.2 Views (Vistas públicas)

```bash
# Copiar el contenido de: 02-views.sql
```

1. Pegar el contenido completo de `02-views.sql` en el SQL Editor
2. Hacer clic en **Run**
3. Verificar mensaje: ✅ "Views creadas exitosamente: public_stats, team_rankings"

**Qué se creó:**
- View `public_stats` (estadísticas globales)
- View `team_rankings` (ranking de equipos)

#### 2.3 Policies (Seguridad)

```bash
# Copiar el contenido de: 03-policies.sql
```

1. Pegar el contenido completo de `03-policies.sql` en el SQL Editor
2. Hacer clic en **Run**
3. Verificar mensaje: ✅ "RLS configurado correctamente"

**Qué se configuró:**
- RLS habilitado en las 3 tablas (acceso PRIVADO)
- Permisos de lectura pública en las 2 views

#### 2.4 Seed (Datos iniciales)

```bash
# Copiar el contenido de: 04-seed.sql
```

1. Pegar el contenido completo de `04-seed.sql` en el SQL Editor
2. Hacer clic en **Run**
3. Verificar que aparecen los 3 equipos:
   - `general` - Equipo General
   - `equipo-a` - Equipo A
   - `equipo-b` - Equipo B

## ✅ Verificación

### Test 1: Verificar tablas creadas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Esperado:** Debe mostrar 3 tablas: `donations`, `teams`, `webhook_events`

### Test 2: Verificar views públicas

```sql
SELECT * FROM public_stats;
```

**Esperado:**
```
total_recaudado | meta  | total_donaciones
----------------+-------+-----------------
              0 | 25000 |               0
```

```sql
SELECT * FROM team_rankings;
```

**Esperado:**
```
slug      | name           | total | donaciones_count
----------+----------------+-------+-----------------
general   | Equipo General |     0 |                0
equipo-a  | Equipo A       |     0 |                0
equipo-b  | Equipo B       |     0 |                0
```

### Test 3: Verificar RLS (Seguridad)

```sql
-- Cambiar al rol anónimo
SET ROLE anon;

-- ✅ Esto debe funcionar (views públicas)
SELECT * FROM public_stats;
SELECT * FROM team_rankings;

-- ❌ Esto debe fallar con "permission denied" (tablas privadas)
SELECT * FROM donations;

-- Volver al rol normal
RESET ROLE;
```

### Test 4: Verificar índices

```sql
SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

**Esperado:** Debe mostrar los 8 índices creados:
- `idx_donations_created`
- `idx_donations_estado`
- `idx_donations_order`
- `idx_donations_team`
- `idx_teams_slug`
- `idx_webhook_events_created`
- `idx_webhook_events_order`

## 🔧 Troubleshooting

### Problema: "relation already exists"

**Causa:** Las tablas ya existen de una instalación anterior.

**Solución:**
```sql
-- ⚠️ CUIDADO: Esto borrará TODOS los datos
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Luego ejecutar nuevamente 01-schema.sql
```

### Problema: "permission denied for table donations"

**Causa:** Estás intentando acceder a las tablas directamente como usuario anónimo.

**Solución:** Las tablas son privadas por diseño. Usa las views públicas:
- `SELECT * FROM public_stats;` ✅
- `SELECT * FROM team_rankings;` ✅

### Problema: Las views no devuelven datos

**Causa:** No hay donaciones con estado 'pagado' todavía.

**Verificación:**
```sql
SELECT estado, COUNT(*) 
FROM donations 
GROUP BY estado;
```

Esto es normal en una instalación nueva. Las views se actualizarán automáticamente cuando haya donaciones pagadas.

### Problema: No aparecen los equipos en el seed

**Causa:** Puede haber un error en la ejecución del seed.

**Solución:**
```sql
-- Verificar cuántos equipos hay
SELECT COUNT(*) FROM teams;

-- Si no hay equipos, ejecutar manualmente:
INSERT INTO teams (slug, name) VALUES
  ('general', 'Equipo General'),
  ('equipo-a', 'Equipo A'),
  ('equipo-b', 'Equipo B')
ON CONFLICT (slug) DO NOTHING;
```

## 📊 Obtener las credenciales del proyecto

Para conectar el backend, necesitarás:

1. **SUPABASE_URL**: 
   - Dashboard → Settings → API → Project URL
   - Ejemplo: `https://abc123.supabase.co`

2. **SUPABASE_SERVICE_KEY**:
   - Dashboard → Settings → API → Project API keys → `service_role` (secret)
   - ⚠️ **NUNCA** expongas esta key en el frontend

## 🧪 Datos de prueba (opcional)

Si quieres agregar donaciones de prueba para ver el sistema funcionando:

```sql
-- Insertar donaciones de ejemplo
INSERT INTO donations (nombre, email, monto, order_id, estado, team_id, paid_at, mensaje)
VALUES 
  ('Juan Pérez', 'juan@test.com', 5000, 'ISF-TEST-001', 'pagado', 
   (SELECT id FROM teams WHERE slug = 'equipo-a'), NOW(), '¡Vamos equipo A!'),
  
  ('María González', 'maria@test.com', 10000, 'ISF-TEST-002', 'pagado',
   (SELECT id FROM teams WHERE slug = 'equipo-b'), NOW(), 'Apoyo al equipo B'),
  
  ('Pedro Silva', 'pedro@test.com', 3000, 'ISF-TEST-003', 'pagado',
   (SELECT id FROM teams WHERE slug = 'general'), NOW(), 'Contribución general');

-- Verificar que las views se actualizaron
SELECT * FROM public_stats;
SELECT * FROM team_rankings;
```

## 📚 Próximos pasos

Una vez completada la configuración de la base de datos:

1. ✅ Copiar las credenciales (URL y service_key)
2. ✅ Configurar las variables de entorno en el backend
3. ✅ Continuar con la implementación del Cloudflare Worker

Ver: `../backend/README.md` para instrucciones del backend.

## 🆘 Soporte

Si encuentras problemas:

1. Verificar los logs en Supabase: Dashboard → Logs
2. Revisar la sección de Troubleshooting arriba
3. Verificar que seguiste el orden de ejecución (01 → 02 → 03 → 04)

---

**📌 Checklist final:**

- [ ] ✅ Todas las tablas creadas sin errores
- [ ] ✅ Views `public_stats` y `team_rankings` funcionando
- [ ] ✅ `SELECT * FROM public_stats;` devuelve 1 fila
- [ ] ✅ `SELECT * FROM team_rankings;` devuelve 3 equipos
- [ ] ✅ RLS habilitado (verificado con `SET ROLE anon;`)
- [ ] ✅ Los 3 equipos están en la tabla `teams`
- [ ] ✅ No puedes acceder a `donations` directamente sin service_key
- [ ] ✅ Credenciales copiadas (URL y service_key)

**🎉 ¡Base de datos lista para usar!**