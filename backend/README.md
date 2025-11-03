# 🔧 Backend API - Colecta ISF

Backend de Cloudflare Worker para el sistema de donaciones de ISF Chile.

## 📝 Descripción

API minimalista con 2 endpoints:

1. **POST /api/donar** - Crea una donación y retorna URL de pago de Payku
2. **POST /api/webhook/payku** - Recibe confirmaciones de pago de Payku

## 🏗️ Arquitectura

```
Usuario → Frontend → Cloudflare Worker → Supabase
                          ↓
                       Payku API
                          ↓
                    Webhook (confirmación)
```

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar template de variables
cp .dev.vars.example .dev.vars

# Editar .dev.vars con tus credenciales reales
nano .dev.vars
```

### 3. Configurar secrets en producción

```bash
# Para cada secret, ejecutar:
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put PAYKU_PUBLIC_KEY
wrangler secret put PAYKU_PRIVATE_KEY
wrangler secret put TURNSTILE_SECRET
```

## 🛠️ Desarrollo local

```bash
# Iniciar servidor de desarrollo (puerto 8787)
npm run dev

# En otra terminal, probar el endpoint
curl -X POST http://localhost:8787/api/donar \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@test.com",
    "monto": 5000,
    "team_slug": "equipo-a",
    "cf-turnstile-response": "test-token"
  }'
```

## 🚢 Deploy a producción

```bash
# Deploy del worker
npm run deploy

# Ver logs en tiempo real
npm run tail
```

Después del deploy, el worker estará disponible en:
`https://colecta-isf-worker.TU-CUENTA.workers.dev`

## 📂 Estructura del proyecto

```
backend/
├── src/
│   ├── index.js              # Router principal
│   ├── handlers/
│   │   ├── donate.js         # POST /api/donar
│   │   └── webhook.js        # POST /api/webhook/payku
│   ├── lib/
│   │   ├── supabase.js       # Cliente Supabase REST API
│   │   ├── payku.js          # Cliente Payku API
│   │   └── validators.js     # Validaciones de datos
│   └── utils/
│       └── response.js       # Helpers HTTP (CORS, JSON)
├── wrangler.toml             # Configuración del Worker
├── package.json
├── .dev.vars.example         # Template de variables
└── README.md                 # Este archivo
```

## 🔑 Variables de entorno necesarias

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Service role key | Dashboard → Settings → API → service_role (secret) |
| `PAYKU_PUBLIC_KEY` | Public key de Payku | Dashboard Payku → API Keys |
| `PAYKU_PRIVATE_KEY` | Private key de Payku | Dashboard Payku → API Keys |
| `TURNSTILE_SECRET` | Secret de Cloudflare Turnstile | CF Dashboard → Turnstile → Settings |
| `FRONTEND_URL` | URL del frontend | `https://colecta.isf.cl` (producción) |
| `WORKER_URL` | URL del worker | `https://api.colecta.isf.cl` (producción) |

## 📡 Endpoints

### POST /api/donar

Crea una donación pendiente y retorna URL de pago de Payku.

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "monto": 10000,
  "mensaje": "¡Vamos equipo!",
  "team_slug": "equipo-a",
  "cf-turnstile-response": "token..."
}
```

**Response exitoso (200):**
```json
{
  "ok": true,
  "url": "https://app.payku.cl/payment/abc123",
  "order": "ISF-1730678400-A1B2C3"
}
```

**Response error (400):**
```json
{
  "ok": false,
  "error": "VALIDATION_ERROR",
  "message": "El monto debe estar entre $1.000 y $500.000"
}
```

### POST /api/webhook/payku

Recibe confirmaciones de pago de Payku (webhook).

**Request (viene de Payku):**
```json
{
  "order": "ISF-1730678400-A1B2C3",
  "status": "success",
  "transaction_id": "9916587765599311",
  "verification_key": "8b3e2202fb..."
}
```

**Response (siempre 200):**
```json
{
  "received": true
}
```

**Nota:** Este endpoint SIEMPRE retorna 200 para evitar reintentos infinitos de Payku, incluso si hay errores internos.

## 🧪 Testing

### Probar endpoint de donación

```bash
curl -X POST http://localhost:8787/api/donar \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@example.com",
    "monto": 5000,
    "mensaje": "Test donation",
    "team_slug": "general",
    "cf-turnstile-response": "test-token"
  }'
```

### Simular webhook de Payku

```bash
curl -X POST http://localhost:8787/api/webhook/payku \
  -H "Content-Type: application/json" \
  -d '{
    "order": "ISF-1234567890-TEST01",
    "status": "success",
    "transaction_id": "999999",
    "verification_key": "abc123..."
  }'
```

## 🔍 Ver logs

```bash
# Ver logs en tiempo real del worker deployado
npm run tail

# Ver logs del worker de desarrollo
# Los logs aparecen automáticamente en la consola donde corriste `npm run dev`
```

## 📚 Documentación externa

- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Supabase REST API:** https://supabase.com/docs/guides/api
- **Payku API:** https://docs.payku.cl
- **Cloudflare Turnstile:** https://developers.cloudflare.com/turnstile/

## 🐛 Troubleshooting

### Error: "Missing secret: SUPABASE_URL"

**Solución:** Asegúrate de tener el archivo `.dev.vars` con todas las variables necesarias (copia de `.dev.vars.example`).

### Error: "Failed to create Payku transaction"

**Posibles causas:**
1. Keys de Payku incorrectas
2. Payku está en modo sandbox y estás usando keys de producción (o viceversa)
3. El monto es inválido para Payku

**Solución:** Verifica tus keys en el dashboard de Payku.

### Error: "permission denied for table donations"

**Causa:** La `SUPABASE_SERVICE_KEY` es incorrecta o estás usando la `anon` key en lugar de la `service_role` key.

**Solución:** Usa la **service_role key** (empieza con `eyJ...`), NO la anon key.

### Los webhooks no llegan

**Posibles causas:**
1. La URL de webhook en Payku está mal configurada
2. El worker no está deployado en producción
3. Firewall o CORS bloqueando el webhook

**Solución:** 
1. Verificar URL en dashboard de Payku: debe ser `https://api.colecta.isf.cl/api/webhook/payku`
2. Verificar logs con `npm run tail`
3. Revisar la tabla `webhook_events` en Supabase para ver si llegaron

### Error: "Turnstile validation failed"

**Causa:** El token de Turnstile es inválido o expiró.

**Solución:** Los tokens de Turnstile expiran rápido. Asegúrate de que el frontend esté generando tokens frescos antes de cada submit.

## 🔐 Seguridad

- ✅ Validación de Turnstile contra bots
- ✅ Validación de firma de Payku (verification_key)
- ✅ RLS habilitado en Supabase
- ✅ Service key nunca expuesta al frontend
- ✅ CORS configurado para permitir solo el dominio del frontend
- ✅ Validación de datos en el backend (no confiar en el frontend)

## 📊 Monitoreo

```bash
# Ver métricas del worker
wrangler metrics

# Ver logs en tiempo real
npm run tail

# Ver errores recientes
wrangler tail --format pretty --status error
```

## 🚀 Próximos pasos

1. ✅ Deploy del worker: `npm run deploy`
2. ✅ Configurar secrets de producción
3. ✅ Verificar que los webhooks lleguen correctamente
4. ✅ Configurar dominio custom (ej: `api.colecta.isf.cl`)
5. ✅ Configurar alertas en Cloudflare para errores 5xx

## 🆘 Soporte

Si encuentras problemas:

1. Verificar logs: `npm run tail`
2. Revisar la tabla `webhook_events` en Supabase
3. Verificar que todas las variables de entorno estén configuradas
4. Revisar la sección de Troubleshooting arriba

---

**💡 Tip:** Durante el desarrollo, deja corriendo `npm run dev` en una terminal y `npm run tail` en otra para ver todos los logs en tiempo real.