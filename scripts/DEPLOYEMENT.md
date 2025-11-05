# 🚀 Guía de Deployment - Colecta ISF

Esta guía te llevará paso a paso desde cero hasta tener la plataforma corriendo en producción.

**Tiempo estimado:** 60-90 minutos (primera vez)  
**Dificultad:** Intermedia

---

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener:

### Cuentas necesarias
- ✅ Cuenta de [Cloudflare](https://dash.cloudflare.com) (gratuita)
- ✅ Cuenta de [Supabase](https://supabase.com) (plan gratuito)
- ✅ Cuenta de [Payku](https://payku.cl) (modo producción)
- ✅ Dominio configurado en Cloudflare (opcional pero recomendado)

### Software instalado
```bash
# Node.js 18 o superior
node --version  # debe mostrar v18.x.x o superior

# npm
npm --version

# Wrangler CLI (Cloudflare)
npm install -g wrangler

# Autenticarse en Cloudflare
wrangler login
```

### Verificación rápida
```bash
# Clonar el repositorio
git clone <tu-repo>
cd colecta-isf

# Verificar estructura
ls -la
# Debes ver: backend/, frontend/, database/, scripts/, docs/
```

---

## 1️⃣ Setup Inicial de Cuentas

### 1.1 Crear Proyecto en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click en **"New Project"**
3. Configura:
   - **Name:** `colecta-isf`
   - **Database Password:** (genera una segura y guárdala)
   - **Region:** South America (São Paulo) - más cercano a Chile
4. Click **"Create new project"** (demora ~2 min)
5. Una vez creado, ve a **Settings → API** y copia:
   - `URL` → Lo necesitarás como `SUPABASE_URL`
   - `anon public` → Para el frontend
   - `service_role` → Lo necesitarás como `SUPABASE_SERVICE_KEY` ⚠️ Mantenlo secreto

### 1.2 Configurar Cuenta de Payku

1. Ve a [payku.cl](https://payku.cl) y crea una cuenta
2. Completa el proceso de verificación de negocio
3. Una vez aprobado, ve al Dashboard
4. En **Configuración → API Keys** encontrarás:
   - **Public Key** → Para crear transacciones
   - **Private Key** → Para verificar webhooks ⚠️ Mantenlo secreto
5. Copia ambas, las necesitarás pronto

### 1.3 Configurar Cloudflare Turnstile

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com)
2. En el menú lateral, busca **Turnstile**
3. Click **"Create Site"**
4. Configura:
   - **Site name:** `colecta-isf`
   - **Domain:** `colecta.isf.cl` (o tu dominio)
   - **Widget Mode:** Managed
5. Click **"Create"**
6. Copia:
   - **Site Key** → Para el frontend
   - **Secret Key** → Para el backend ⚠️ Mantenlo secreto

---

## 2️⃣ Configurar Database

### 2.1 Ejecutar Scripts SQL

1. En Supabase Dashboard, ve a **SQL Editor**
2. Click **"New query"**
3. Ejecuta los scripts **en orden**:

#### Script 1: Schema Base
```bash
# Abre: database/01-schema.sql
# Copia todo el contenido y pégalo en el SQL Editor
# Click "Run" (o Ctrl+Enter)
```

Verifica que se crearon las tablas:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Debes ver: teams, donations, webhook_events
```

#### Script 2: Views Públicas
```bash
# Abre: database/02-views.sql
# Copia, pega y ejecuta
```

Verifica:
```sql
SELECT * FROM public_stats;
-- Debe devolver: total_recaudado=0, meta=25000, total_donaciones=0
```

#### Script 3: Políticas RLS
```bash
# Abre: database/03-policies.sql
# Copia, pega y ejecuta
```

#### Script 4: Datos Iniciales
```bash
# Abre: database/04-seed.sql
# Copia, pega y ejecuta
```

Verifica:
```sql
SELECT * FROM teams;
-- Debe mostrar: general, equipo-a, equipo-b
```

### 2.2 Configurar Permisos

En **Settings → API → Schema**, asegúrate de que:
- ✅ Las views `public_stats` y `team_rankings` son accesibles
- ✅ RLS está habilitado en `donations`

---

## 3️⃣ Deploy Backend (Worker)

### 3.1 Preparar el Worker

```bash
cd backend
npm install
```

### 3.2 Configurar Variables de Entorno

Crea un archivo `.dev.vars` para desarrollo local:
```bash
cp .dev.vars.example .dev.vars
nano .dev.vars  # o tu editor favorito
```

Contenido de `.dev.vars`:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  (service_role key)
PAYKU_PUBLIC_KEY=pk_test_...
PAYKU_PRIVATE_KEY=sk_test_...
TURNSTILE_SECRET=0x4AAAA...
```

### 3.3 Configurar Secrets en Producción

```bash
# Ejecutar script interactivo
bash ../scripts/setup-secrets.sh production
```

El script te pedirá cada secret. Si ya están en `.dev.vars`, los detectará automáticamente.

**Verificar:**
```bash
wrangler secret list --env production
```

Debes ver los 5 secrets listados (sin mostrar sus valores).

### 3.4 Deploy del Worker

```bash
# Primera vez
wrangler deploy

# Verificar que está corriendo
curl https://api.colecta.isf.cl/api/donar
# Debe responder con error 405 (Method Not Allowed) - es correcto
```

**Configurar Custom Domain (opcional):**
```bash
wrangler domains add api.colecta.isf.cl
```

---

## 4️⃣ Deploy Frontend (Pages)

### 4.1 Preparar el Frontend

```bash
cd ../frontend
npm install
```

### 4.2 Configurar Variables de Entorno

Edita `astro.config.mjs` y verifica:
```javascript
export default defineConfig({
  // ...
  env: {
    PUBLIC_API_URL: 'https://api.colecta.isf.cl',
    PUBLIC_SUPABASE_URL: 'https://xxxx.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGc...',
    PUBLIC_TURNSTILE_SITE_KEY: '0x4AAA...'
  }
});
```

O usar archivo `.env`:
```bash
cp .env.example .env
nano .env
```

Contenido:
```env
PUBLIC_API_URL=https://api.colecta.isf.cl
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
```

### 4.3 Build y Deploy

```bash
# Build de producción
npm run build

# Verificar que se generó /dist
ls -la dist/

# Deploy a Cloudflare Pages
npx wrangler pages deploy dist --project-name=colecta-isf
```

**Primera vez:** Wrangler creará el proyecto automáticamente.

### 4.4 Configurar Variables en Cloudflare Pages UI

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → `colecta-isf`
3. **Settings** → **Environment variables**
4. Agrega (para Production):
   - `PUBLIC_API_URL`: `https://api.colecta.isf.cl`
   - `PUBLIC_SUPABASE_URL`: (tu URL de Supabase)
   - `PUBLIC_SUPABASE_ANON_KEY`: (anon key de Supabase)
   - `PUBLIC_TURNSTILE_SITE_KEY`: (site key de Turnstile)
5. **Save**

### 4.5 Configurar Custom Domain

1. En Settings de tu proyecto Pages
2. **Custom domains** → **Set up a custom domain**
3. Ingresa: `colecta.isf.cl`
4. Cloudflare configurará automáticamente DNS y SSL

---

## 5️⃣ Configurar Payku Webhook

### 5.1 Agregar URL de Webhook

1. Ve a tu Dashboard de Payku
2. **Configuración** → **Webhooks**
3. Agrega:
   - **URL:** `https://api.colecta.isf.cl/api/webhook/payku`
   - **Eventos:** Selecciona `payment.success` y `payment.failed`
4. **Guardar**

### 5.2 Verificar Configuración

Payku enviará un webhook de prueba. Revisa los logs:
```bash
wrangler tail --env production
```

Debes ver el webhook entrante.

---

## 6️⃣ Testing End-to-End

### 6.1 Donación de Prueba Completa

1. Ve a `https://colecta.isf.cl`
2. Llena el formulario con datos reales
3. Selecciona un equipo (ej: `equipo-a`)
4. Usa monto bajo: `$1,000` CLP
5. Click **"Donar"**
6. Serás redirigido a Payku
7. **Completa el pago** con tarjeta de prueba de Payku

**Tarjetas de prueba de Payku:**
- **Éxito:** 4111 1111 1111 1111
- **Rechazo:** 4000 0000 0000 0002

### 6.2 Verificar que el Webhook Llegó

```bash
# Ver logs en tiempo real
wrangler tail --env production

# O revisar en Supabase
```

En Supabase SQL Editor:
```sql
-- Ver última donación
SELECT * FROM donations ORDER BY created_at DESC LIMIT 1;

-- Ver webhooks recibidos
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;

-- Ver stats actualizados
SELECT * FROM public_stats;
```

### 6.3 Verificar Frontend

1. Recarga `https://colecta.isf.cl`
2. La barra de progreso debe mostrar tu donación
3. El ranking debe mostrar tu equipo con el monto

### 6.4 Script de Health Check

```bash
cd scripts
bash check-health.sh production
```

Debe mostrar ✅ en todos los checks.

---

## 7️⃣ Monitoreo

### 7.1 Logs del Worker

```bash
# Ver logs en tiempo real
wrangler tail --env production

# Filtrar por errores
wrangler tail --env production --format json | grep error

# Ver últimos logs
wrangler tail --env production --tail 100
```

### 7.2 Logs de Supabase

1. Supabase Dashboard → **Logs**
2. Filtrar por:
   - **Postgres Logs:** Queries
   - **API Logs:** Requests a las views

### 7.3 Dashboard de Payku

1. Ve a Payku Dashboard
2. **Transacciones** → Ver todas las donaciones
3. **Webhooks** → Ver status de webhooks enviados

### 7.4 Cloudflare Analytics

1. Cloudflare Dashboard → **Workers & Pages**
2. `colecta-isf` → **Analytics**
3. Métricas disponibles:
   - Requests por segundo
   - Errores (rate)
   - Latencia (p50, p95, p99)

---

## 8️⃣ Rollback Rápido

Si algo sale mal en producción:

### Rollback del Worker

```bash
cd backend

# Ver deployments recientes
wrangler deployments list

# Rollback al anterior
wrangler rollback --message "Rollback por [razón]"
```

### Rollback del Frontend

```bash
cd frontend

# Ver deployments
npx wrangler pages deployments list --project-name=colecta-isf

# Rollback a un deployment específico
npx wrangler pages deployment rollback [DEPLOYMENT_ID] \
  --project-name=colecta-isf
```

### Rollback de Database

⚠️ **Más complejo.** Si hiciste cambios en el schema:

```sql
-- Backup antes de cualquier cambio
pg_dump > backup_$(date +%Y%m%d_%H%M%S).sql

-- Restaurar (si es necesario)
psql < backup_20241103_120000.sql
```

---

## 9️⃣ Checklist Final

Antes de anunciar el lanzamiento:

- [ ] ✅ Database deployada y probada en Supabase
- [ ] ✅ Worker deployado en Cloudflare con todos los secrets
- [ ] ✅ Frontend deployado en Cloudflare Pages
- [ ] ✅ Variables de entorno configuradas en Pages
- [ ] ✅ URL de webhook configurada en Payku
- [ ] ✅ Dominio personalizado configurado y funcionando
- [ ] ✅ SSL activo (https://)
- [ ] ✅ Donación de prueba completada exitosamente
- [ ] ✅ Webhook recibido y procesado
- [ ] ✅ Stats actualizados en frontend (recarga)
- [ ] ✅ Ranking actualizado con el equipo correcto
- [ ] ✅ No hay errores en `wrangler tail`
- [ ] ✅ Health check pasa: `bash scripts/check-health.sh`
- [ ] ✅ Turnstile bloquea formularios automatizados
- [ ] ✅ Probado en móvil (responsive)

---

## 🆘 Problemas Comunes

Si algo no funciona, consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Errores típicos:**
- Worker responde 500 → Revisa secrets con `wrangler secret list`
- Frontend no carga → Verifica variables de entorno en Pages
- Webhook no llega → Verifica URL en Payku Dashboard
- Stats no actualizan → Verifica RLS policies en Supabase

---

## 📞 Soporte

- **Documentación técnica:** Lee [BRIEF.md](./BRIEF.md)
- **Problemas conocidos:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Issues:** Abre un issue en el repositorio

---

**✅ ¡Listo!** Tu plataforma de colecta está en producción.

**Próximos pasos sugeridos:**
1. Configurar alertas de downtime (ej: UptimeRobot)
2. Implementar backup automático de Supabase
3. Agregar Google Analytics (opcional)
4. Documentar proceso de reconciliación manual