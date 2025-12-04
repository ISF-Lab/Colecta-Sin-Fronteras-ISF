# 🧩 Proyecto: Colecta ISF — Especificación Técnica

> **Nota:** Este documento define las reglas de negocio, contratos de API y arquitectura del sistema. Para guías de uso, ver `MANUAL_OPERACIONES.md` o `MANUAL_TECNICO.md`.

## 1) Resumen Ejecutivo
Sistema de colecta digital para ISF Chile. Permite donaciones seguras vía Payku, seguimiento en tiempo real y ranking de equipos.
**Estado:** Producción.

**Stack Tecnológico:**
- **Frontend:** Astro (Static) + React Islands (Interactive) + TailwindCSS
- **Backend:** Cloudflare Workers (Serverless)
- **Database:** Supabase (PostgreSQL)
- **Pagos:** Payku API
- **Seguridad:** Cloudflare Turnstile

## 2) Estructura del Proyecto
```
colecta-isf/
├── backend/ (Cloudflare Worker)
│   ├── src/
│   │   ├── index.js                  # Router (3 endpoints)
│   │   ├── handlers/
│   │   │   ├── donate.js             # POST /api/donar
│   │   │   ├── webhook.js            # POST /api/webhook/payku
│   │   │   └── check-donation.js     # GET /api/donacion/:id
│   │   └── lib/                      # Supabase & Payku clients
│
├── frontend/ (Astro + React)
│   ├── src/
│   │   ├── pages/                    # index.astro, gracias.astro
│   │   ├── components/
│   │   │   ├── DonationForm.tsx      # Formulario reactivo
│   │   │   ├── ProgressBar.tsx       # Barra progreso real-time
│   │   │   ├── TeamRanking.tsx       # Ranking equipos real-time
│   │   │   ├── Hero.astro            # Banner principal
│   │   │   ├── AboutUs.astro         # Sección impacto/video
│   │   │   └── ... (UI components)
│
├── database/ (SQL Scripts)
│   ├── 01-schema.sql                 # Tablas
│   └── 02-views.sql                  # Vistas públicas
```

## 3) Arquitectura & Flujo
1. **Donación:** Usuario llena form → Worker crea registro "pendiente" → Redirige a Payku.
2. **Pago:** Usuario paga en Payku → Payku notifica vía Webhook → Worker marca "pagado".
3. **Feedback:** Frontend consulta stats cada 10s y actualiza barra/ranking.

## 4) API Contracts

### `POST /api/donar`
Crea intención de donación.
- **Body:** `{ nombre, email, monto, team_slug, cf-turnstile-response }`
- **Response:** `{ ok: true, url: "https://payku...", order: "ISF-..." }`

### `POST /api/webhook/payku`
Recibe confirmación de pago (Server-to-Server).
- **Lógica:** Verifica firma, busca orden, actualiza estado a 'pagado'/'fallido'.
- **Idempotencia:** Si ya está pagado, retorna 200 sin cambios.

### `GET /api/donacion/:orderId`
Consulta estado (usado en página de gracias).
- **Response:** `{ ok: true, pagado: true/false, estado: "..." }`

## 5) Base de Datos (Supabase)
- **Tablas:** `teams` (equipos), `donations` (transacciones), `webhook_events` (logs).
- **Vistas Públicas:**
  - `public_stats`: Total recaudado y meta.
  - `team_rankings`: Total por equipo.
- **Seguridad:** RLS habilitado. Solo el Worker tiene acceso de escritura (Service Role).

## 6) Frontend Features
- **Landing Page:** Hero, Barra Progreso, Formulario Donación, Ranking, Sección "Por qué donar", Video Impacto, CTA Voluntariado.
- **Página Gracias:** Confirmación de estado de pago.
- **Optimizaciones:** Carga diferida de islas React (`client:load`), animaciones CSS, validación local.
