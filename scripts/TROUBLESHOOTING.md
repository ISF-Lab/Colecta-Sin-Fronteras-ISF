# 🔧 Solución de Problemas - Colecta ISF

Guía para diagnosticar y resolver problemas comunes.

---

## 📚 Índice

1. [Webhook no llega](#1-webhook-no-llega)
2. [Donación no se registra](#2-donación-no-se-registra)
3. [Stats no se actualizan](#3-stats-no-se-actualizan)
4. [Turnstile falla](#4-turnstile-falla)
5. [Error CORS en frontend](#5-error-cors-en-frontend)
6. [Worker no responde (500 Error)](#6-worker-no-responde-500-error)
7. [Frontend muestra datos antiguos](#7-frontend-muestra-datos-antiguos)
8. [Payku rechaza transacciones](#8-payku-rechaza-transacciones)
9. [Reconciliación manual](#9-reconciliación-manual)

---

## 1. Webhook no llega

### 🔴 Síntoma
- El usuario paga en Payku
- La donación queda en estado "pendiente"
- No se actualiza a "pagado"

### 🔍 Diagnóstico

**Paso 1: Verificar en tabla `webhook_events`**
```sql
-- En Supabase SQL Editor
SELECT * FROM webhook_events 
WHERE order_id = 'ISF-1730678400-abc123'
ORDER BY created_at DESC;
```

- ✅ **Si hay registros:** El webhook llegó, pero falló el procesamiento
- ❌ **Si está vacío:** El webhook nunca llegó

**Paso 2: Verificar configuración en Payku**
1. Ve a Payku Dashboard → **Configuración** → **Webhooks**
2. Verifica que la URL sea **exactamente**:
   ```
   https://api.colecta.isf.cl/api/webhook/payku
   ```
3. Verifica que los eventos estén activos:
   - `payment.success` ✅
   - `payment.failed` ✅

**Paso 3: Verificar logs del Worker**
```bash
wrangler tail --env production --format pretty
```

Busca líneas con `/api/webhook/payku`. Si no aparece nada, el webhook no está llegando.

### ✅ Solución

**Si el webhook nunca llegó:**
1. Verifica que no haya firewall bloqueando IPs de Payku
2. Prueba manualmente:
   ```bash
   bash scripts/test-webhook.sh https://api.colecta.isf.cl
   ```
3. Contacta a soporte de Payku para verificar que los webhooks están habilitados

**Si el webhook llegó pero falló:**
1. Revisa el `payload` en `webhook_events`:
   ```sql
   SELECT payload FROM webhook_events 
   WHERE order_id = 'ISF-...' LIMIT 1;
   ```
2. Verifica que el `verification_key` sea correcto
3. Verifica que `PAYKU_PRIVATE_KEY` esté configurada:
   ```bash
   wrangler secret list --env production
   ```

---

## 2. Donación no se registra

### 🔴 Síntoma
- El usuario llena el formulario
- Click en "Donar"
- Error o nada pasa

### 🔍 Diagnóstico

**Paso 1: Abrir DevTools del navegador**
1. F12 → **Console**
2. Busca errores en rojo
3. Click en **Network** → Filtrar por `donar`
4. Verifica la respuesta del POST

**Paso 2: Verificar en la base de datos**
```sql
SELECT * FROM donations 
WHERE email = 'usuario@example.com'
ORDER BY created_at DESC;
```

**Paso 3: Verificar logs del Worker**
```bash
wrangler tail --env production
```

Busca el POST a `/api/donar`. Anota el error si aparece.

### ✅ Solución

**Error: "Invalid Turnstile token"**
- Verifica que `TURNSTILE_SECRET` esté configurada en el Worker
- Verifica que `PUBLIC_TURNSTILE_SITE_KEY` esté en el frontend

**Error: "SUPABASE_URL is not defined"**
```bash
# Verificar secrets
wrangler secret list --env production

# Si falta, configurarla
echo "https://xxxx.supabase.co" | wrangler secret put SUPABASE_URL --env production
```

**Error: "Team not found"**
- El `team_slug` no existe en la tabla `teams`
- Agrégalo manualmente:
  ```sql
  INSERT INTO teams (slug, name) VALUES ('nuevo-equipo', 'Nuevo Equipo');
  ```

**Error de Payku: "Invalid credentials"**
- Verifica que `PAYKU_PUBLIC_KEY` y `PAYKU_PRIVATE_KEY` sean correctas
- Asegúrate de usar keys de **producción** (no test)

---

## 3. Stats no se actualizan

### 🔴 Síntoma
- Las donaciones están marcadas como "pagado"
- Pero la barra de progreso muestra $0
- O el ranking no se actualiza

### 🔍 Diagnóstico

**Paso 1: Verificar que las views existen**
```sql
-- Listar views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';

-- Debe incluir: public_stats, team_rankings
```

**Paso 2: Probar query manual**
```sql
-- Stats globales
SELECT * FROM public_stats;
-- Debe devolver: total_recaudado, meta, total_donaciones

-- Ranking de equipos
SELECT * FROM team_rankings;
-- Debe mostrar todos los equipos con sus montos
```

**Paso 3: Verificar permisos**
```sql
-- Verificar que anon puede leer las views
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'public_stats';

-- Debe incluir: anon | SELECT
```

### ✅ Solución

**Si las views no existen:**
```bash
# Ejecutar script de views
# En Supabase SQL Editor, ejecuta: database/02-views.sql
```

**Si no hay permisos:**
```sql
GRANT SELECT ON public_stats TO anon;
GRANT SELECT ON team_rankings TO anon;
```

**Si el frontend no las lee:**
1. Abre DevTools → Network
2. Busca requests a Supabase
3. Verifica que:
   - La URL sea correcta
   - El `apikey` header esté presente
   - La respuesta sea 200

**Si hay cache:**
```javascript
// En el componente React, forzar refetch
useEffect(() => {
  fetchStats();
}, []);
```

---

## 4. Turnstile falla

### 🔴 Síntoma
- El formulario no se envía
- Mensaje: "Verifica que no eres un robot"
- O error en consola sobre Turnstile

### 🔍 Diagnóstico

**Paso 1: Verificar keys**
En frontend:
```javascript
// Busca en el código:
PUBLIC_TURNSTILE_SITE_KEY
// Debe ser: 0x4AAAA...
```

En backend:
```bash
wrangler secret list --env production
# Debe incluir: TURNSTILE_SECRET
```

**Paso 2: Verificar dominio registrado**
1. Cloudflare Dashboard → **Turnstile**
2. Click en tu sitio
3. **Domains:** Debe incluir tu dominio (ej: `colecta.isf.cl`)

**Paso 3: Verificar en DevTools**
```javascript
// En Console, ejecuta:
window.turnstile
// Debe mostrar objeto, no undefined
```

### ✅ Solución

**Key incorrecta en frontend:**
```bash
cd frontend
# Editar .env o astro.config.mjs
PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...

# Rebuild
npm run build
npx wrangler pages deploy dist
```

**Key incorrecta en backend:**
```bash
cd backend
echo "tu_secret_key" | wrangler secret put TURNSTILE_SECRET --env production
```

**Dominio no registrado:**
1. Turnstile Dashboard → **Domains**
2. Agregar tu dominio
3. Esperar ~5 minutos para propagación

**Script bloqueado por AdBlock:**
- Turnstile puede ser bloqueado por adblockers
- Pide al usuario que lo desactive temporalmente
- O implementa fallback sin Turnstile (no recomendado)

---

## 5. Error CORS en frontend

### 🔴 Síntoma
- Error en Console: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Las requests al Worker fallan
- El formulario no envía

### 🔍 Diagnóstico

**Paso 1: Verificar headers del Worker**
```bash
# Test manual
curl -X OPTIONS https://api.colecta.isf.cl/api/donar \
  -H "Origin: https://colecta.isf.cl" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Debe devolver:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: POST, OPTIONS
```

**Paso 2: Revisar código del Worker**
```javascript
// En backend/src/utils/response.js
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### ✅ Solución

**Si los headers no están:**
```javascript
// En backend/src/index.js
export default {
  async fetch(request, env, ctx) {
    // AGREGAR ESTO al principio
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders 
      });
    }
    
    // ... resto del código
  }
};
```

**Si el problema persiste:**
```javascript
// En cada handler (donate.js, webhook.js)
// Asegúrate de incluir corsHeaders en TODAS las respuestas:

return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders  // ← IMPORTANTE
  }
});
```

Redeploy:
```bash
cd backend
wrangler deploy --env production
```

---

## 6. Worker no responde (500 Error)

### 🔴 Síntoma
- Todas las requests devuelven 500
- El sitio no funciona
- "Internal Server Error"

### 🔍 Diagnóstico

**Paso 1: Ver logs en tiempo real**
```bash
wrangler tail --env production --format pretty
```

Intenta hacer una donación y observa los errores.

**Paso 2: Verificar secrets**
```bash
wrangler secret list --env production
```

Deben estar los 5:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- PAYKU_PUBLIC_KEY
- PAYKU_PRIVATE_KEY
- TURNSTILE_SECRET

**Paso 3: Test local**
```bash
cd backend
npm install
wrangler dev

# En otra terminal
curl -X POST http://localhost:8787/api/donar \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@test.com","monto":5000}'
```

### ✅ Solución

**Error: "env.SUPABASE_URL is undefined"**
```bash
# Configurar el secret faltante
bash ../scripts/setup-secrets.sh production
```

**Error de sintaxis en el código**
```bash
# Ver el error exacto en logs
wrangler tail

# Si es error de sintaxis, corregir y redeploy
wrangler deploy
```

**Error de conexión a Supabase**
```bash
# Verificar que la URL sea correcta
echo $SUPABASE_URL

# Test manual
curl https://xxxx.supabase.co/rest/v1/teams \
  -H "apikey: tu_service_key"

# Debe devolver los equipos
```

---

## 7. Frontend muestra datos antiguos

### 🔴 Síntoma
- Los stats no se actualizan automáticamente
- Necesitas refrescar manualmente (F5)

### 🔍 Diagnóstico

**Paso 1: Verificar polling**
```javascript
// En componentes React, busca:
useEffect(() => {
  const interval = setInterval(() => {
    fetchStats();
  }, 10000); // cada 10 segundos
  
  return () => clearInterval(interval);
}, []);
```

**Paso 2: Verificar cache**
```javascript
// En la función fetch, verifica:
fetch(url, {
  cache: 'no-cache',  // ← Importante
  headers: {
    'Cache-Control': 'no-cache'
  }
})
```

### ✅ Solución

**Si no hay polling:**
```javascript
// Agregar en ProgressBar.tsx y TeamRanking.tsx
import { useEffect, useState } from 'react';

export function ProgressBar() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(API_URL + '/public_stats', {
        cache: 'no-cache'
      });
      const data = await res.json();
      setStats(data[0]);
    };
    
    fetchData(); // fetch inicial
    const interval = setInterval(fetchData, 10000); // cada 10s
    
    return () => clearInterval(interval);
  }, []);
  
  // ... resto
}
```

**Si hay cache del navegador:**
1. Hard refresh: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
2. Limpiar cache del sitio en DevTools
3. Agregar versioning a los assets

---

## 8. Payku rechaza transacciones

### 🔴 Síntoma
- Al intentar pagar, Payku muestra error
- "Transacción rechazada"
- O redirect a página de error

### 🔍 Diagnóstico

**Paso 1: Verificar en Payku Dashboard**
1. Ve a **Transacciones**
2. Busca la transacción por `order_id`
3. Ver estado y mensaje de error

**Paso 2: Verificar logs del Worker**
```bash
wrangler tail --env production | grep -i payku
```

**Paso 3: Test con Payku API**
```bash
curl -X POST https://api.payku.cl/api/transaction \
  -H "Authorization: Bearer tu_public_key" \
  -H "Content-Type: application/json" \
  -d '{
    "order": "TEST-123",
    "subject": "Donación Test",
    "amount": 1000,
    "email": "test@example.com"
  }'
```

### ✅ Solución

**Error: "Invalid API credentials"**
- Verifica que estés usando keys de **producción**
- Regenera las keys en Payku Dashboard si es necesario

**Error: "Amount below minimum"**
- Payku tiene un monto mínimo (usualmente $100 CLP)
- Ajusta la validación en el frontend

**Error: "Invalid email format"**
- Payku valida emails estrictamente
- Mejora la validación en el frontend

**Cuenta en modo "test":**
- Asegúrate de haber completado la verificación de negocio
- Contacta a soporte de Payku

---

## 9. Reconciliación manual

### 🔴 Cuándo es necesario
- Webhook falló y no se procesó
- Usuario reporta que pagó pero no aparece
- Discrepancia entre Payku y tu base de datos

### 🔍 Proceso de reconciliación

**Paso 1: Exportar transacciones de Payku**
1. Ve a Payku Dashboard → **Transacciones**
2. Filtrar por fecha
3. **Exportar** a CSV

**Paso 2: Comparar con tu base de datos**
```sql
-- Donaciones en tu DB (últimas 24 hrs)
SELECT 
  order_id,
  estado,
  monto,
  payku_transaction_id,
  created_at
FROM donations
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Paso 3: Identificar discrepancias**
```sql
-- Donaciones pendientes de hace más de 1 hora
SELECT * FROM donations
WHERE estado = 'pendiente'
  AND created_at < NOW() - INTERVAL '1 hour';
```

**Paso 4: Actualizar manualmente**

Para cada transacción exitosa en Payku que está "pendiente" en tu DB:

```sql
-- Verificar primero
SELECT * FROM donations WHERE order_id = 'ISF-1730678400-abc123';

-- Si está pendiente pero Payku dice "success":
UPDATE donations
SET 
  estado = 'pagado',
  payku_status = 'success',
  payku_transaction_id = '9916587765599311',
  paid_at = NOW()
WHERE order_id = 'ISF-1730678400-abc123';

-- Verificar que se actualizó
SELECT * FROM donations WHERE order_id = 'ISF-1730678400-abc123';
```

**Paso 5: Validar stats**
```sql
-- Verificar que el total cuadra
SELECT 
  SUM(monto) as total_db,
  (SELECT SUM(amount) FROM payku_export_csv) as total_payku
FROM donations
WHERE estado = 'pagado';
```

**Paso 6: Documentar**
```sql
-- Registrar la reconciliación
INSERT INTO webhook_events (order_id, payload, status_code)
VALUES (
  'ISF-1730678400-abc123',
  '{"nota": "Reconciliación manual", "fecha": "2024-11-03", "operador": "Admin"}'::jsonb,
  200
);
```

---

## 🆘 Comandos útiles de emergencia

```bash
# Ver todos los logs en tiempo real
wrangler tail --env production --format pretty

# Ver solo errores
wrangler tail --env production | grep -i error

# Rollback inmediato
wrangler rollback --env production

# Listar deployments recientes
wrangler deployments list

# Verificar health
bash scripts/check-health.sh production

# Test webhook manualmente
bash scripts/test-webhook.sh https://api.colecta.isf.cl
```

---

## 📞 Contacto de Soporte

- **Cloudflare Workers:** [developers.cloudflare.com/support](https://developers.cloudflare.com/support)
- **Supabase:** [supabase.com/support](https://supabase.com/support)
- **Payku:** soporte@payku.cl

---

**💡 Tip:** Antes de contactar soporte, ejecuta `bash scripts/check-health.sh` y copia el output. Ayuda a diagnosticar más rápido.