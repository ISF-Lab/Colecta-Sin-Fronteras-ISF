# 🛠️ Manual Técnico - Colecta ISF

Guía de mantenimiento, despliegue y arquitectura para desarrolladores voluntarios.

---

## 🏗️ Arquitectura del Sistema

El sistema es un **Monolito Serverless** diseñado para ser barato (casi gratis) y aguantar alto tráfico.

- **Frontend:** [Astro](https://astro.build) (Static Site Generation) hospedado en **Cloudflare Pages**.
  - Usa "Islas de React" solo para lo interactivo: Formulario, Barra de Progreso, Ranking.
- **Backend:** [Cloudflare Workers](https://workers.cloudflare.com/).
  - API ligera que maneja la lógica de donación y webhooks de Payku.
- **Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL).
  - Tablas: `donations`, `teams`, `webhook_events`.
  - Vistas: `public_stats`, `team_rankings` (optimizadas para lectura pública).

---

## 🚀 Guía de Despliegue (Deployment)

### Prerrequisitos
- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Acceso a las cuentas de Cloudflare y Supabase de ISF.

### 1. Backend (API)

El backend vive en la carpeta `backend/`.

```bash
cd backend
npm install

# 1. Configurar secretos (solo la primera vez o si cambian)
# Te pedirá las keys de Supabase y Payku
bash ../scripts/setup-secrets.sh production

# 2. Desplegar a producción
npm run deploy
```

La API quedará disponible en: `https://api.colecta.isf.cl` (o la URL que asigne Cloudflare).

### 2. Frontend (Web)

El frontend vive en la carpeta `frontend/`.

```bash
cd frontend
npm install

# 1. Construir el sitio estático
npm run build

# 2. Desplegar a Cloudflare Pages
# Nota: Usualmente esto se conecta automático con GitHub, 
# pero para deploy manual:
npx wrangler pages deploy dist --project-name colecta-isf
```

---

## 🔧 Scripts de Utilidad

En la carpeta `scripts/` hay herramientas para facilitarte la vida:

- **`check-health.sh`**: Revisa que todo esté arriba.
  ```bash
  ./scripts/check-health.sh
  ```
  Verifica: API respondiendo, Web cargando, conexión a BD exitosa.

- **`test-webhook.sh`**: Simula un pago exitoso de Payku (útil para dev).
  ```bash
  ./scripts/test-webhook.sh
  ```

---

## 🚑 Troubleshooting (Solución de Problemas)

### Webhook no actualiza la donación
Si Payku cobra pero la donación sigue "pendiente" en nuestra BD:
1. Revisa la tabla `webhook_events` en Supabase. ¿Llegó el evento?
2. Si llegó pero dio error, revisa los logs del Worker:
   ```bash
   cd backend
   wrangler tail
   ```
3. Verifica que la `PAYKU_PRIVATE_KEY` no haya expirado o cambiado.

### Error CORS en el Frontend
Si la barra de progreso no carga:
1. Verifica que la variable `FRONTEND_URL` en el Backend coincida con el dominio real del frontend.
2. Revisa la consola del navegador (F12) para ver el error exacto.

### Modificar la Meta de Recaudación
La meta está definida en la vista SQL `public_stats`.
Para cambiarla (ej. de 25M a 30M):
1. Ve al SQL Editor de Supabase.
2. Modifica la vista `02-views.sql` y vuelve a ejecutar el `CREATE OR REPLACE VIEW`.

---

## 📂 Estructura de Archivos Clave

- `backend/src/index.js`: Rutas de la API.
- `backend/src/handlers/`: Lógica de negocio (donar, webhook).
- `frontend/src/pages/index.astro`: Página principal.
- `frontend/src/components/`: Componentes React (Form, Ranking).
- `database/`: Scripts SQL de la base de datos (Schema, Views).

---

> **Nota para el futuro:** Este proyecto busca ser simple. Evita agregar frameworks complejos o bases de datos que requieran mantenimiento de servidor (VPS). Mantente en Serverless.
