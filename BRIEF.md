# 🧩 Proyecto: Colecta ISF — Brief Técnico v1.1

## 0) Resumen ejecutivo

Sistema de colecta digital para ISF Chile que permite recibir donaciones en línea con seguimiento en tiempo real.

**Stack tecnológico:**
- **🧱 Frontend:** Cloudflare Pages (Astro estático)
- **⚙️ Backend/API:** Cloudflare Worker único
- **🗄️ Base de datos:** Supabase (PostgreSQL)
- **💳 Pagos:** Payku API
- **🧠 Protección bots:** Cloudflare Turnstile

**Filosofía:** Simplicidad sobre sofisticación. Cada componente resuelve UN problema. Zero premature optimization.

## 1) Alcance MVP (lanzamiento mañana)

### ✅ Lo que SÍ hacemos
- Landing con formulario de donación
- Integración Payku para pagos
- Barra de progreso global
- Ranking de equipos
- Protección anti-bots básica

### ❌ Lo que NO hacemos (todavía)
- Panel de administración
- Login/autenticación
- Múltiples campañas simultáneas
- Reportes o exports
- Recuperación de pagos fallidos automática
- Notificaciones por email

### 🎯 Criterio de éxito
"Usuario puede donar con tarjeta y ver su equipo en el ranking en menos de 2 minutos"

## 2) Reglas de negocio (la verdad del sistema)

1. **Fuente de verdad:** El webhook de Payku es la ÚNICA fuente confiable del estado del pago
2. **Principio de idempotencia:** Recibir el mismo webhook 10 veces = mismo resultado
3. **Equipo default:** Si no hay `?team=` en la URL → `"general"`
4. **Meta fija:** $25,000 CLP (hardcoded por ahora, después migrar a DB)
5. **Montos válidos:** Entre $1,000 y $500,000 CLP
6. **Timeout implícito:** Donaciones pendientes >48hrs se consideran abandonadas (no las tocamos)

## 2.5) Estructura del proyecto

```
colecta-isf/
├── backend/                          # Cloudflare Worker (API)
│   ├── src/
│   │   ├── index.js                  # Router principal
│   │   ├── handlers/
│   │   │   ├── donate.js             # POST /api/donar
│   │   │   └── webhook.js            # POST /api/webhook/payku
│   │   ├── lib/
│   │   │   ├── supabase.js           # Cliente Supabase
│   │   │   ├── payku.js              # Cliente Payku
│   │   │   └── validators.js         # Validaciones
│   │   └── utils/
│   │       └── response.js           # Helpers HTTP
│   ├── wrangler.toml
│   ├── package.json
│   ├── .dev.vars.example             # Copiar a .dev.vars (gitignored)
│   └── README.md                     # Cómo correr y deployar
│
├── frontend/                         # Astro + React islands
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro           # Landing + form
│   │   │   └── gracias.astro         # Thank you
│   │   ├── components/
│   │   │   ├── DonationForm.tsx      # Formulario reactivo
│   │   │   ├── ProgressBar.tsx       # Barra progreso
│   │   │   ├── TeamRanking.tsx       # Tabla ranking
│   │   │   └── Layout.astro          # Layout base
│   │   ├── lib/
│   │   │   └── api.js                # Funciones para llamar backend
│   │   └── env.d.ts
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs           # Tailwind
│   ├── tsconfig.json
│   ├── package.json
│   └── README.md                     # Cómo correr localmente
│
├── database/                         # SQL de Supabase
│   ├── 01-schema.sql                 # Tablas base
│   ├── 02-views.sql                  # Views públicas
│   ├── 03-policies.sql               # RLS policies
│   ├── 04-seed.sql                   # Datos iniciales (equipos)
│   └── README.md                     # Orden de ejecución
│
├── scripts/                          # Utilidades
│   ├── setup-secrets.sh              # Configurar wrangler secrets
│   ├── test-webhook.sh               # Simular webhook de Payku
│   └── check-health.sh               # Verificar que todo funcione
│
├── docs/
│   ├── BRIEF.md                      # Este documento
│   ├── DESARROLLO.md                 # Guía de implementación
│   ├── DEPLOYMENT.md                 # Paso a paso para deployar
│   └── TROUBLESHOOTING.md            # Problemas comunes
│
├── .gitignore
├── .env.example                      # Variables comunes del proyecto
├── README.md                         # Entrada principal del repo
├── DESARROLLO.md                     # Guía de desarrollo por etapas
└── package.json                      # (opcional) Root con workspaces
```

## 3) Arquitectura (el mínimo viable)

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ CF Pages │ (static site)
    └────┬─────┘
         │
    ┌────▼─────┐
    │ CF Worker│ (2 endpoints)
    └────┬─────┘
         │
    ┌────▼─────┐     ┌────────┐
    │ Supabase │◄────┤ Payku  │
    └──────────┘     └────────┘
                     (webhook)
```

**Flujo crítico:**
1. User llena form → Worker crea registro "pendiente" → Payku devuelve URL
2. User paga en Payku → Payku llama webhook → Worker marca "pagado"
3. Frontend lee stats cada 10seg → Muestra progreso actualizado

## 4) API Contracts (mantener simple)

### `POST /api/donar`

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "monto": 10000,
  "mensaje": "Vamos equipo!",
  "team_slug": "equipo-a",
  "cf-turnstile-response": "token..."
}
```

**Validaciones (fail fast):**
- ✅ Turnstile token válido
- ✅ Email válido (regex simple)
- ✅ Monto entre 1000-500000
- ✅ team_slug existe (o default "general")
- ✅ mensaje <500 chars

**Response exitoso:**
```json
{
  "ok": true,
  "url": "https://app.payku.cl/payment/abc123",
  "order": "ISF-1730678400-a1b2c3"
}
```

**Response error:**
```json
{
  "ok": false,
  "error": "MONTO_INVALIDO",
  "message": "El monto debe estar entre $1.000 y $500.000"
}
```

### `POST /api/webhook/payku`

**Request (viene de Payku):**
```json
{
  "order": "ISF-1730678400-a1b2c3",
  "status": "success",
  "transaction_id": "9916587765599311",
  "verification_key": "8b3e2202fb..."
}
```

**Lógica:**
1. Verificar `verification_key` (CRÍTICO para seguridad)
2. Buscar donación por `order` (índice único)
3. Si ya está en estado final (pagado/fallido) → return 200 (idempotente)
4. Si status="success" → marcar pagado, incrementar total equipo
5. Si status="failed" → marcar fallido
6. Guardar evento en `webhook_log` para debugging

**Response:**
```json
{ "received": true }
```

## 5) Modelo de datos (PostgreSQL)

### Tabla: `teams`
```sql
create table teams (
  id bigserial primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz default now()
);

create index idx_teams_slug on teams(slug);

-- Seed inicial
insert into teams (slug, name) values
  ('general', 'Equipo General'),
  ('equipo-a', 'Equipo A'),
  ('equipo-b', 'Equipo B');
```

### Tabla: `donations`
```sql
create table donations (
  id uuid primary key default gen_random_uuid(),
  
  -- Info del donante
  nombre text not null,
  email text not null,
  mensaje text,
  
  -- Info del pago
  monto integer not null check (monto between 1000 and 500000),
  order_id text unique not null,
  
  -- Estado (solo 3 valores posibles)
  estado text not null default 'pendiente' 
    check (estado in ('pendiente', 'pagado', 'fallido')),
  
  -- Tracking de Payku
  payku_transaction_id text,
  payku_status text,
  
  -- Relaciones
  team_id bigint not null references teams(id),
  
  -- Timestamps
  created_at timestamptz default now(),
  paid_at timestamptz,
  
  -- Metadata para debugging
  user_agent text,
  ip_address text
);

create index idx_donations_order on donations(order_id);
create index idx_donations_estado on donations(estado);
create index idx_donations_team on donations(team_id);
```

### Tabla: `webhook_events` (para debugging)
```sql
create table webhook_events (
  id bigserial primary key,
  order_id text not null,
  payload jsonb not null,
  status_code int,
  created_at timestamptz default now()
);

create index idx_webhook_events_order on webhook_events(order_id);
```

### View: `public_stats` (lectura pública)
```sql
create or replace view public_stats as
select
  coalesce(sum(monto), 0) as total_recaudado,
  25000 as meta,
  count(*) as total_donaciones
from donations
where estado = 'pagado';

-- Habilitar acceso público en Supabase
grant select on public_stats to anon;
```

### View: `team_rankings` (lectura pública)
```sql
create or replace view team_rankings as
select
  t.slug,
  t.name,
  coalesce(sum(d.monto), 0) as total,
  count(d.id) filter (where d.estado = 'pagado') as donaciones_count
from teams t
left join donations d on d.team_id = t.id and d.estado = 'pagado'
group by t.id, t.slug, t.name
order by total desc;

grant select on team_rankings to anon;
```

## 6) Implementación del Worker

### `index.js` (router minimalista)
```javascript
import { handleDonate } from './handlers/donate.js';
import { handleWebhook } from './handlers/webhook.js';
import { corsHeaders } from './utils/response.js';

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Solo 2 rutas
    if (url.pathname === '/api/donar' && request.method === 'POST') {
      return handleDonate(request, env);
    }
    
    if (url.pathname === '/api/webhook/payku' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};
```

### Lógica de `handlers/donate.js`

1. Validar Turnstile (fail fast)
2. Validar datos (fail fast)
3. Generar order único: `ISF-{timestamp}-{random6}`
4. Buscar team_id (o usar "general")
5. Crear registro "pendiente" en Supabase
6. Crear transacción en Payku
7. Actualizar con transaction_id de Payku
8. Retornar URL de pago

### Lógica de `handlers/webhook.js`

1. Log SIEMPRE el webhook (antes de validar)
2. Validar firma de Payku (CRÍTICO)
3. Buscar donación por order_id
4. Idempotencia: si ya está en estado final, no hacer nada
5. Actualizar estado según status de Payku
6. Retornar 200 siempre (evitar reintentos infinitos)

## 7) Variables de entorno

### `wrangler.toml`
```toml
name = "colecta-isf-worker"
main = "src/index.js"
compatibility_date = "2024-11-03"

[vars]
FRONTEND_URL = "https://colecta.isf.cl"
WORKER_URL = "https://api.colecta.isf.cl"

# Secrets (agregar con: wrangler secret put NOMBRE)
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - PAYKU_PUBLIC_KEY
# - PAYKU_PRIVATE_KEY
# - TURNSTILE_SECRET
```

### Variables necesarias

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (privada) | Dashboard → Settings → API |
| `PAYKU_PUBLIC_KEY` | Public key de Payku | Dashboard Payku |
| `PAYKU_PRIVATE_KEY` | Private key de Payku | Dashboard Payku |
| `TURNSTILE_SECRET` | Secret key de Turnstile | Cloudflare Dashboard |

## 8) Frontend (Astro estático)

### Componentes principales

1. **DonationForm.tsx** (React):
   - Form con validación client-side
   - Integración Turnstile
   - Submit → POST /api/donar → redirect a Payku

2. **ProgressBar.tsx** (React):
   - Fetch `public_stats` cada 10seg
   - Barra visual con porcentaje
   - Monto formateado

3. **TeamRanking.tsx** (React):
   - Fetch `team_rankings` cada 10seg
   - Tabla responsive
   - Destacar equipo actual

### Páginas

- **index.astro**: Landing + form + stats + ranking
- **gracias.astro**: Thank you page post-pago

## 9) Checklist de lanzamiento

### Pre-deploy
- [ ] Crear cuenta Payku modo producción
- [ ] Configurar secrets en Cloudflare
- [ ] Crear tablas en Supabase
- [ ] Habilitar RLS en Supabase
- [ ] Seed de equipos iniciales
- [ ] Turnstile configurado

### Testing crítico (30 min)
- [ ] Donación exitosa end-to-end
- [ ] Webhook recibido y procesado
- [ ] Stats actualizados
- [ ] Ranking actualizado
- [ ] Webhook duplicado no duplica monto
- [ ] Donación fallida marca correctamente
- [ ] Turnstile bloquea bots

### Deploy
```bash
# Worker
cd backend
wrangler deploy

# Frontend
cd frontend
npm run build
wrangler pages deploy dist
```

## 10) Plan de contingencia

### Si el webhook falla
1. Payku reintenta automáticamente
2. Revisar logs en `webhook_events`
3. Reconciliar manualmente con Payku dashboard

### Rollback rápido
```bash
# Revertir worker
wrangler rollback

# Revertir frontend
wrangler pages deployment rollback [ID]
```

## 11) Deuda técnica aceptada

1. No hay retry automático de webhooks
2. No hay notificaciones por email
3. No hay panel admin
4. Logs básicos
5. Meta hardcoded
6. Sin tests automatizados

## 12) Métricas de éxito

- **Tasa de conversión:** >60% completan pago
- **Disponibilidad:** >99.5% uptime
- **Latencia API:** <500ms p95
- **Webhooks:** 100% procesados en <5seg
- **Donaciones fallidas:** <10%

---

## 📝 Changelog

### v1.1 (2025-11-03)
- ✨ Agregada sección 2.5: Estructura del proyecto
- 📚 Referencia a DESARROLLO.md para guía de implementación
- 🔧 Mejoras menores en redacción

### v1.0 (2025-11-03)
- 🎉 Versión inicial del brief técnico

---

**📄 Versión:** v1.1  
**📅 Fecha:** 2025-11-03  
**👤 Revisado para:** Lanzamiento urgente (24 horas)  
**🎯 Estado:** Ready for implementation