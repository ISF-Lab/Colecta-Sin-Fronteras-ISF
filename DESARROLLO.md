# 🚀 Guía de Desarrollo: Colecta ISF

Este documento contiene los prompts para implementar el sistema en 4 etapas secuenciales.

**📖 Referencia:** Ver `docs/BRIEF.md` (v1.1) para arquitectura completa y decisiones técnicas.

---

## 📁 Estructura del Proyecto

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
│   ├── .dev.vars.example
│   └── README.md
│
├── frontend/                         # Astro + React islands
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro           # Landing + form
│   │   │   └── gracias.astro         # Thank you
│   │   ├── components/
│   │   │   ├── DonationForm.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── TeamRanking.tsx
│   │   │   └── Layout.astro
│   │   ├── lib/
│   │   │   └── api.js
│   │   └── env.d.ts
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   ├── package.json
│   └── README.md
│
├── database/                         # SQL de Supabase
│   ├── 01-schema.sql
│   ├── 02-views.sql
│   ├── 03-policies.sql
│   ├── 04-seed.sql
│   └── README.md
│
├── scripts/
│   ├── setup-secrets.sh
│   ├── test-webhook.sh
│   └── check-health.sh
│
├── docs/
│   ├── BRIEF.md                      # Brief técnico v1.1
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
│
├── .gitignore
├── .env.example
├── README.md
├── DESARROLLO.md                     # Este archivo
└── package.json                      # (opcional) Root con workspaces
```

---

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener:

- [ ] Cuenta de Cloudflare (con Workers y Pages habilitados)
- [ ] Cuenta de Supabase (proyecto creado)
- [ ] Cuenta de Payku (con API keys de producción)
- [ ] Node.js 18+ instalado
- [ ] Git configurado
- [ ] Editor de código (VS Code recomendado)

---

## 🎯 Etapa 1: Database

**⏱️ Tiempo estimado:** 15-20 minutos

### Prompt para el Asistente:

```
Necesito implementar la base de datos para el proyecto Colecta ISF según el brief técnico v1.1.

ESTRUCTURA ESPERADA:
database/
├── 01-schema.sql
├── 02-views.sql
├── 03-policies.sql
├── 04-seed.sql
└── README.md

Por favor, genera los siguientes archivos SQL:

1. **01-schema.sql**: 
   - Tabla `teams`: id, slug (unique), name, created_at
   - Tabla `donations`: id (uuid), nombre, email, mensaje, monto (integer con check 1000-500000), 
     order_id (unique), estado (check: pendiente/pagado/fallido), payku_transaction_id, 
     payku_status, team_id (FK), created_at, paid_at, user_agent, ip_address
   - Tabla `webhook_events`: id, order_id, payload (jsonb), status_code, created_at
   - Todos los índices necesarios (idx_teams_slug, idx_donations_order, idx_donations_estado, 
     idx_donations_team, idx_webhook_events_order)
   - Comentarios explicativos en español

2. **02-views.sql**:
   - View `public_stats`: total_recaudado (sum de montos pagados), meta (25000), total_donaciones (count)
   - View `team_rankings`: slug, name, total (sum de montos pagados por equipo), donaciones_count
     ordenado por total DESC

3. **03-policies.sql**:
   - Habilitar RLS en ambas views
   - Policy "Allow public read" en public_stats para SELECT
   - Policy "Allow public read" en team_rankings para SELECT
   - IMPORTANTE: Las tablas base (teams, donations, webhook_events) NO deben ser accesibles 
     públicamente, solo a través del service_key del backend

4. **04-seed.sql**:
   - Insertar equipos: 'general' (Equipo General), 'equipo-a' (Equipo A), 'equipo-b' (Equipo B)

5. **README.md**:
   - Título: "Database Setup - Colecta ISF"
   - Instrucciones paso a paso:
     a. Cómo acceder al SQL Editor en Supabase
     b. Orden de ejecución (01 → 02 → 03 → 04)
     c. Cómo verificar que las tablas se crearon correctamente
     d. Cómo probar que las views funcionan (query de ejemplo)
     e. Cómo verificar que RLS está activo
   - Troubleshooting común (ej: si ya existen las tablas, hacer DROP primero)

IMPORTANTE: 
- Seguir EXACTAMENTE el esquema del brief v1.1 (sección 5)
- Los montos son INTEGER (CLP, sin decimales)
- order_id debe tener índice UNIQUE para idempotencia
- Las views deben usar GRANT SELECT ON ... TO anon
```

### ✅ Checklist de Validación

Después de ejecutar los scripts en Supabase:

- [ ] Todas las tablas creadas sin errores
- [ ] Views `public_stats` y `team_rankings` creadas
- [ ] Puedes hacer `SELECT * FROM public_stats;` (devuelve 1 fila con 0s)
- [ ] Puedes hacer `SELECT * FROM team_rankings;` (devuelve 3 equipos con 0s)
- [ ] RLS está habilitado en las views (verificar en Table Editor)
- [ ] Los 3 equipos están en la tabla `teams`
- [ ] No puedes acceder a `donations` directamente sin service_key

---

## 🎯 Etapa 2: Backend (Cloudflare Worker)

**⏱️ Tiempo estimado:** 45-60 minutos

### Prompt para el Asistente:

```
Necesito implementar el backend (Cloudflare Worker) para Colecta ISF según el brief v1.1.

ESTRUCTURA ESPERADA:
backend/
├── src/
│   ├── index.js
│   ├── handlers/
│   │   ├── donate.js
│   │   └── webhook.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── payku.js
│   │   └── validators.js
│   └── utils/
│       └── response.js
├── wrangler.toml
├── package.json
├── .dev.vars.example
└── README.md

Genera TODOS los archivos necesarios:

**1. package.json:**
- name: "colecta-isf-backend"
- type: "module"
- scripts: dev, deploy, tail (para logs)
- dependencies MÍNIMAS (solo lo esencial, preferir fetch nativo)

**2. wrangler.toml:**
- name: "colecta-isf-worker"
- main: "src/index.js"
- compatibility_date: "2024-11-03"
- vars: FRONTEND_URL, WORKER_URL
- Comentarios sobre los secrets que se deben configurar

**3. .dev.vars.example:**
- Template de todas las variables de entorno necesarias
- Con comentarios sobre dónde obtener cada key
- Estructura: SUPABASE_URL, SUPABASE_SERVICE_KEY, PAYKU_PUBLIC_KEY, 
  PAYKU_PRIVATE_KEY, TURNSTILE_SECRET, FRONTEND_URL, WORKER_URL

**4. src/index.js:**
- Router principal con CORS
- Manejo de OPTIONS (preflight)
- 2 rutas: POST /api/donar, POST /api/webhook/payku
- 404 para todo lo demás
- Importar handlers

**5. src/handlers/donate.js:**
- export async function handleDonate(request, env)
- Pasos según brief v1.1 sección 6:
  1. Validar Turnstile
  2. Validar datos del body
  3. Generar order_id único: `ISF-${Date.now()}-${randomString(6)}`
  4. Buscar team por slug (o usar 'general')
  5. Crear registro pendiente en Supabase
  6. Llamar Payku API para crear transacción
  7. Actualizar con payku_transaction_id
  8. Retornar { ok: true, url, order }
- Manejo de errores con try-catch
- Logs informativos

**6. src/handlers/webhook.js:**
- export async function handleWebhook(request, env)
- Pasos según brief v1.1 sección 6:
  1. Loguear SIEMPRE en webhook_events (ANTES de validar)
  2. Validar verification_key de Payku
  3. Buscar donación por order_id
  4. Implementar idempotencia (si ya está pagado/fallido → return 200)
  5. Actualizar estado según body.status
  6. Si pagado: actualizar paid_at, payku_transaction_id, payku_status
  7. Retornar { received: true } SIEMPRE (status 200)
- CRÍTICO: Nunca retornar error 500, siempre 200 para evitar reintentos infinitos

**7. src/lib/supabase.js:**
- export function getSupabaseClient(env)
- export async function createPendingDonation(data, env)
- export async function getDonationByOrder(orderId, env)
- export async function updateDonationStatus(data, env)
- export async function getTeamBySlug(slug, env)
- export async function logWebhookEvent(payload, env)
- Usar fetch directamente a la REST API de Supabase
- Headers: apikey, Authorization (Bearer service_key)

**8. src/lib/payku.js:**
- export async function createPaykuTransaction(data, env)
- POST a https://app.payku.cl/api/transaction
- Headers: Authorization (Bearer PAYKU_PRIVATE_KEY)
- Body según spec de Payku (brief v1.1 sección 4)
- export function validatePaykuSignature(verificationKey, order, privateKey)
- Validar que verification_key coincida

**9. src/lib/validators.js:**
- export function validateEmail(email)
- export function validateMonto(monto) // 1000-500000
- export function validateTeamSlug(slug)
- export function validateMessage(mensaje) // max 500 chars
- export function validateDonationData(body) // retorna array de errores
- export async function validateTurnstile(token, secret)
- Usar regex simples, nada fancy

**10. src/utils/response.js:**
- export const corsHeaders = { ... }
- export function jsonResponse(data, status = 200)
- export function jsonError(code, message, status = 400)

**11. README.md:**
- Título: "Backend API - Colecta ISF"
- Qué hace este backend (2 endpoints)
- Cómo instalar: npm install
- Cómo configurar: copiar .dev.vars.example a .dev.vars
- Cómo correr local: npm run dev
- Cómo deployar: npm run deploy
- Cómo ver logs: npm run tail
- Estructura de carpetas explicada
- Links a docs de Payku y Supabase

IMPORTANTE:
- Código 100% funcional, sin TODOs ni placeholders
- Comentarios en español en puntos críticos
- Manejo robusto de errores
- Logs informativos con console.log/error
- Seguir EXACTAMENTE los contratos del brief v1.1 sección 4
```

### ✅ Checklist de Validación

Después de implementar:

- [ ] `npm install` funciona sin errores
- [ ] Copiar `.dev.vars.example` a `.dev.vars` y llenar con keys reales
- [ ] `npm run dev` levanta el worker en localhost:8787
- [ ] Puedes hacer `curl localhost:8787/api/test` (debe dar 404)
- [ ] Puedes hacer OPTIONS request (debe retornar CORS headers)
- [ ] El código no tiene errores de sintaxis
- [ ] Todos los imports/exports están correctos

---

## 🎯 Etapa 3: Frontend (Astro + React)

**⏱️ Tiempo estimado:** 60-75 minutos

### Prompt para el Asistente:

```
Necesito implementar el frontend para Colecta ISF usando Astro con islas de React.

ESTRUCTURA ESPERADA:
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   └── gracias.astro
│   ├── components/
│   │   ├── DonationForm.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── TeamRanking.tsx
│   │   └── Layout.astro
│   ├── lib/
│   │   └── api.js
│   └── env.d.ts
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── .env.example
└── README.md

Genera TODOS los archivos:

**1. package.json:**
- name: "colecta-isf-frontend"
- scripts: dev, build, preview
- dependencies: astro, @astrojs/react, @astrojs/tailwind, react, react-dom, 
  @cloudflare/turnstile (o similar), tailwindcss

**2. astro.config.mjs:**
- import { defineConfig } from 'astro/config'
- import react from '@astrojs/react'
- import tailwind from '@astrojs/tailwind'
- output: 'static'
- integrations: [react(), tailwind()]

**3. tailwind.config.mjs:**
- Configuración básica
- theme.extend con colores personalizados de ISF si quieres

**4. tsconfig.json:**
- Configuración estándar para Astro + React

**5. .env.example:**
- PUBLIC_BACKEND_URL=http://localhost:8787 (para dev) o https://api.colecta.isf.cl (prod)
- PUBLIC_SUPABASE_URL=...
- PUBLIC_SUPABASE_ANON_KEY=... (para leer views públicas)
- PUBLIC_TURNSTILE_SITE_KEY=...

**6. src/pages/index.astro:**
- Layout base con Layout.astro
- Hero section: título "Colecta ISF 2025", descripción breve
- Leer ?team= del query param (Astro.url.searchParams)
- Componente <ProgressBar client:load />
- Componente <DonationForm client:load teamSlug={team} />
- Componente <TeamRanking client:load currentTeam={team} />
- Diseño mobile-first con Tailwind

**7. src/pages/gracias.astro:**
- Layout base
- Mensaje: "¡Gracias por tu donación!"
- Leer ?order= del query param
- Mostrar: "Tu código de orden es: {order}"
- Mensaje: "Recibirás confirmación por email"
- Botón: "Volver al inicio"

**8. src/components/Layout.astro:**
- HTML base con <!DOCTYPE html>
- <head>: charset, viewport, title, meta description, Tailwind CSS
- <body>: <slot />, footer con "ISF Chile 2025"
- Estilos globales mínimos

**9. src/components/DonationForm.tsx:**
- Componente React con useState
- Props: teamSlug (string)
- Form con campos:
  * nombre (text, required)
  * email (email, required)
  * monto (number, min 1000, max 500000, required)
  * mensaje (textarea, optional, maxlength 500)
- Integrar Cloudflare Turnstile (widget visible)
- Estados: idle, loading, error, success
- onSubmit:
  1. Validar datos client-side
  2. Obtener turnstile token
  3. POST a /api/donar con todos los datos
  4. Si ok: window.location.href = response.url (redirigir a Payku)
  5. Si error: mostrar mensaje de error
- Diseño: formulario limpio con Tailwind, labels claros, botón grande
- Mensajes de error user-friendly

**10. src/components/ProgressBar.tsx:**
- Componente React con useState, useEffect
- Fetch a Supabase view public_stats cada 10 segundos
- Mostrar:
  * Barra de progreso visual (div con width: {percentage}%)
  * "Recaudado: $XX.XXX de $25.000"
  * "XX% de la meta"
- Diseño: barra grande, colores vivos, animación suave
- Formatear números con separador de miles

**11. src/components/TeamRanking.tsx:**
- Componente React con useState, useEffect
- Props: currentTeam (string, opcional)
- Fetch a Supabase view team_rankings cada 10 segundos
- Tabla con columnas:
  * Posición (1, 2, 3...)
  * Nombre del equipo
  * Total recaudado
  * Donaciones (count)
- Destacar fila del currentTeam (background diferente)
- Diseño: tabla responsive, en móvil colapsar a cards
- Ordenado por total DESC

**12. src/lib/api.js:**
- export async function fetchStats(supabaseUrl, anonKey)
- export async function fetchRanking(supabaseUrl, anonKey)
- export async function submitDonation(backendUrl, data)
- Usar fetch con error handling
- Retornar { ok: boolean, data?, error? }

**13. README.md:**
- Título: "Frontend - Colecta ISF"
- Stack: Astro + React + Tailwind
- Cómo instalar: npm install
- Cómo configurar: copiar .env.example a .env
- Cómo correr: npm run dev
- Cómo buildear: npm run build
- Cómo deployar a Cloudflare Pages
- Estructura explicada

IMPORTANTE:
- Mobile-first (debe verse perfecto en celular)
- Componentes React SOLO donde necesario (form y polling)
- Turnstile correctamente integrado
- Validación client-side (mismas reglas que backend)
- Loading states claros (skeleton o spinner)
- Error handling user-friendly
- Código limpio, comentado en español
- Polling simple con setInterval, limpiar en cleanup
```

### ✅ Checklist de Validación

Después de implementar:

- [ ] `npm install` funciona
- [ ] Copiar `.env.example` a `.env` y configurar URLs
- [ ] `npm run dev` levanta el sitio en localhost:4321
- [ ] La landing carga correctamente
- [ ] El formulario muestra todos los campos
- [ ] Turnstile se carga (puede que no funcione en localhost)
- [ ] ProgressBar intenta hacer fetch (puede fallar por CORS)
- [ ] TeamRanking intenta hacer fetch
- [ ] `/gracias` carga sin errores
- [ ] El diseño se ve bien en móvil (usar DevTools responsive)

---

## 🎯 Etapa 4: Deployment & Documentation

**⏱️ Tiempo estimado:** 30-45 minutos

### Prompt para el Asistente:

```
Necesito la documentación y scripts para deployar Colecta ISF a producción.

ESTRUCTURA ESPERADA:
scripts/
├── setup-secrets.sh
├── test-webhook.sh
└── check-health.sh

docs/
├── DEPLOYMENT.md
└── TROUBLESHOOTING.md

Genera los siguientes archivos:

**1. scripts/setup-secrets.sh:**
- Script bash interactivo
- Leer variables de .env o .dev.vars (si existe)
- Para cada secret necesario:
  * SUPABASE_URL
  * SUPABASE_SERVICE_KEY
  * PAYKU_PUBLIC_KEY
  * PAYKU_PRIVATE_KEY
  * TURNSTILE_SECRET
- Preguntar al usuario: "Ingresa NOMBRE_SECRET: "
- Ejecutar: wrangler secret put NOMBRE_SECRET
- Al final, listar todos los secrets configurados con: wrangler secret list
- Incluir --env production si se pasa como parámetro
- Comentarios claros en español

**2. scripts/test-webhook.sh:**
- Script bash para simular webhook de Payku
- Recibe URL como parámetro (default: http://localhost:8787/api/webhook/payku)
- Payload de ejemplo (JSON) con:
  * order: "ISF-TEST-123456"
  * status: "success"
  * transaction_id: "9916587765599311"
  * verification_key: "dummy_key_for_testing"
- Usar curl con -X POST, -H "Content-Type: application/json", -d @-
- Mostrar response
- Comentarios sobre cómo usarlo

**3. scripts/check-health.sh:**
- Script bash que verifica:
  1. Worker: curl https://api.colecta.isf.cl/api/donar (espera 404 o error de validación)
  2. Frontend: curl https://colecta.isf.cl (espera 200)
  3. Supabase: curl con anon key a view public_stats
- Imprimir ✅ o ❌ para cada check
- Exit code 0 si todo ok, 1 si algo falla

**4. docs/DEPLOYMENT.md:**
Título: "Guía de Deployment - Colecta ISF"

Secciones:
- **Prerequisitos**: Cuentas necesarias, CLI instalados
- **1. Setup inicial de cuentas**:
  * Crear proyecto Supabase
  * Crear cuenta Payku
  * Configurar Turnstile en Cloudflare
- **2. Configurar Database**:
  * Paso a paso: ejecutar SQLs en orden
  * Verificación: queries de ejemplo
- **3. Deploy Backend (Worker)**:
  * cd backend
  * npm install
  * Configurar secrets: bash ../scripts/setup-secrets.sh
  * wrangler deploy
  * Verificar: curl al endpoint
- **4. Deploy Frontend (Pages)**:
  * cd frontend
  * npm install
  * Configurar variables de entorno en Cloudflare Pages UI
  * npm run build
  * wrangler pages deploy dist
  * Configurar custom domain (opcional)
- **5. Configurar Payku**:
  * Agregar URL de webhook en dashboard Payku
  * URL: https://api.colecta.isf.cl/api/webhook/payku
- **6. Testing end-to-end**:
  * Hacer una donación de prueba
  * Verificar que webhook llega
  * Verificar que stats se actualizan
- **7. Monitoreo**:
  * Cloudflare Workers logs: wrangler tail
  * Supabase logs: desde el dashboard
  * Payku dashboard: ver transacciones
- **Rollback rápido**: comandos para revertir

**5. docs/TROUBLESHOOTING.md:**
Título: "Solución de Problemas - Colecta ISF"

Secciones:
- **Webhook no llega**:
  * Verificar URL configurada en Payku
  * Revisar logs del Worker
  * Verificar que no hay firewall bloqueando
  * Usar tabla webhook_events para debugging
- **Donación no se registra**:
  * Verificar en tabla donations (usar SQL editor)
  * Revisar logs del Worker
  * Verificar que Supabase service_key es correcta
- **Stats no se actualizan**:
  * Verificar que las views existen
  * Probar query manual: SELECT * FROM public_stats;
  * Verificar CORS en frontend
- **Turnstile falla**:
  * Verificar que SITE_KEY es correcta (frontend)
  * Verificar que SECRET_KEY es correcta (backend)
  * Verificar que el dominio está registrado en Turnstile
- **Error CORS en frontend**:
  * Verificar corsHeaders en backend
  * Verificar que OPTIONS está manejado
- **Worker no responde**:
  * wrangler tail para ver logs en tiempo real
  * Verificar que no hay errores de sintaxis
  * Verificar que todas las variables están configuradas
- **Cómo hacer reconciliación manual**:
  * Exportar transacciones de Payku
  * Comparar con tabla donations
  * UPDATE manual si es necesario

Cada problema debe tener:
- Síntoma
- Causa probable
- Solución paso a paso
- Comando o query de ejemplo

IMPORTANTE:
- Scripts compatibles con bash (Linux/Mac)
- Documentación clara para no-técnicos
- Instrucciones paso a paso con ejemplos
- No asumir conocimiento avanzado
```

### ✅ Checklist Final de Deployment

- [ ] Database deployada y probada en Supabase
- [ ] Worker deployado en Cloudflare
- [ ] Todos los secrets configurados
- [ ] Frontend deployado en Cloudflare Pages
- [ ] Variables de entorno configuradas en Pages
- [ ] URL de webhook configurada en Payku
- [ ] Dominio personalizado configurado (opcional)
- [ ] Donación de prueba completada exitosamente
- [ ] Webhook recibido y procesado
- [ ] Stats actualizados en frontend
- [ ] Ranking actualizado
- [ ] No hay errores en logs de Cloudflare
- [ ] Documentación revisada y actualizada

---

## 📊 Orden de Ejecución Recomendado

```
Día 1 (Preparación - 2 horas):
├─ 1. Database (20 min)
│  └─ Ejecutar SQLs en Supabase
│  └─ Verificar con queries de prueba
│
├─ 2. Backend (60 min)
│  └─ Implementar código
│  └─ Probar localmente con wrangler dev
│  └─ Deploy a Cloudflare Workers (producción)
│
└─ 3. Frontend (60 min)
   └─ Implementar componentes
   └─ Probar localmente
   └─ Build y deploy a Cloudflare Pages

Día 2 (Testing & Docs - 1 hora):
└─ 4. Deployment (60 min)
   └─ Configurar todos los secretos
   └─ Validar end-to-end
   └─ Generar documentación
   └─ Hacer donación de prueba REAL
```

---

## 💡 Tips Generales

### Durante desarrollo:
- **Commits frecuentes**: Cada archivo funcional = 1 commit
- **Testing incremental**: Probar cada handler antes de seguir
- **Logs everywhere**: console.log en cada paso crítico
- **No optimizar prematuramente**: Que funcione primero, optimizar después

### Durante deployment:
- **Backup de secrets**: Guardar en gestor de contraseñas (1Password, Bitwarden)
- **Testing en orden**: Database → Backend → Frontend
- **Un deployment a la vez**: No deployar todo junto
- **Keep calm**: Si algo falla, revisar logs y TROUBLESHOOTING.md

### Post-deployment:
- **Monitorear primera hora**: Tener logs abiertos
- **Donación de prueba**: Usar monto bajo ($1.000)
- **Verificar webhooks**: Revisar tabla webhook_events
- **Share & celebrate**: El sistema está vivo 🎉

---

## 🆘 ¿Necesitas ayuda?

Si te atascas en cualquier etapa:

1. ✅ Revisa el **Brief v1.1** (`docs/BRIEF.md`)
2. ✅ Consulta **TROUBLESHOOTING.md** (cuando esté creado)
3. ✅ Revisa los **logs de Cloudflare Workers**: `wrangler tail`
4. ✅ Verifica **todas las variables de entorno**
5. ✅ Pregunta al asistente con:
   - Contexto específico del error
   - Logs completos
   - Qué ya intentaste

---

## 📝 Changelog

### v1.1 (2025-11-03)
- ✨ Agregada estructura del proyecto al inicio
- 📚 Referencias actualizadas a Brief v1.1
- 🔧 Prompts más detallados y específicos
- ✅ Checklists mejorados por etapa

### v1.0 (2025-11-03)
- 🎉 Versión inicial de la guía de desarrollo

---

**Última actualización:** 2025-11-03  
**Versión:** 1.1  
**Para usar con:** Brief Técnico v1.1  
**Mantenedor:** Voluntario ISF