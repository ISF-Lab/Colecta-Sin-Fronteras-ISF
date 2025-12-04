# 📋 Backlog y Roadmap del Proyecto: Colecta ISF

Este documento detalla las tareas, historias de usuario y fases de implementación del sistema de colecta digital. Utilízalo para poblar tu **GitHub Project** (Kanban/Roadmap).

---

## 🗺️ Roadmap (Fases)

El proyecto se divide en 5 Fases principales (Epics):

1.  **Fase 1: Infraestructura y Base de Datos** (Cimientos)
2.  **Fase 2: Backend y API** (Lógica de Negocio)
3.  **Fase 3: Frontend y UI** (Experiencia de Usuario)
4.  **Fase 4: Integración de Pagos** (Payku)
5.  **Fase 5: Documentación y Despliegue** (Entrega)

---

## 📝 Backlog de Tareas (Por Fase)

### 🏗️ Fase 1: Infraestructura y Base de Datos

*Objetivo: Establecer el almacenamiento de datos y la configuración inicial.*

- [ ] **Configuración del Repositorio**
    - Crear repositorio en GitHub.
    - Definir estructura de carpetas (`backend/`, `frontend/`, `database/`, `docs/`).
    - Configurar `.gitignore` global.
- [ ] **Diseño de Base de Datos (Supabase)**
    - Crear proyecto en Supabase.
    - Diseñar esquema SQL (`01-schema.sql`): Tablas `teams`, `donations`, `webhook_events`.
    - Definir políticas de seguridad RLS (Row Level Security).
- [ ] **Vistas y Procedimientos**
    - Crear vistas SQL (`02-views.sql`): `public_stats` (meta y total), `team_rankings`.
    - Script de datos semilla (`04-seed.sql`) para pruebas locales.

### ⚙️ Fase 2: Backend y API (Cloudflare Workers)

*Objetivo: Crear la API que procesa donaciones y conecta con la BD.*

- [ ] **Setup del Worker**
    - Inicializar proyecto con Wrangler (`npm init cloudflare`).
    - Configurar `wrangler.toml` (variables de entorno, compatibilidad).
- [ ] **Definición del Contrato de API (Interface)**
    - Definir endpoints, métodos HTTP, inputs y outputs (JSON).
    - Documentar contrato en `ESPECIFICACION_TECNICA.md` para alinear Frontend y Backend.
- [ ] **Conexión a Base de Datos**
    - Implementar cliente de Supabase (`@supabase/supabase-js`) en el Worker.
    - Crear utilidades de conexión segura.
- [ ] **Endpoint: Crear Donación (`POST /api/donar`)**
    - Validar input (nombre, email, monto, equipo).
    - Validar token de seguridad (Cloudflare Turnstile).
    - Insertar registro en estado "pendiente" en Supabase.
- [ ] **Endpoint: Webhook Payku (`POST /api/webhook/payku`)**
    - Validar firma criptográfica de Payku.
    - Actualizar estado de donación a "pagado" o "fallido".
    - Registrar evento en `webhook_events` (idempotencia).
- [ ] **Endpoint: Consultar Estado (`GET /api/donacion/:id`)**
    - Lógica para verificar si una orden específica fue pagada.

### 🎨 Fase 3: Frontend y UI (Astro + React)

*Objetivo: Crear la interfaz pública para los donantes.*

- [ ] **Setup del Frontend**
    - Inicializar proyecto Astro (`npm create astro@latest`).
    - Configurar integración con React y TailwindCSS.
- [ ] **Diseño y Layout**
    - Implementar `Layout.astro` (Header, Footer, Meta tags).
    - Configurar tema de colores ISF en `tailwind.config.mjs`.
    - Implementar fuente 'Outfit'.
- [ ] **Componente: Hero Section**
    - Banner principal con imagen de fondo, título y CTA.
    - Animaciones de entrada.
- [ ] **Componente: Formulario de Donación (React)**
    - Crear `DonationForm.tsx` interactivo.
    - Validación de campos (monto mínimo, email).
    - Integración con `POST /api/donar`.
    - Manejo de estados (cargando, error, éxito).
- [ ] **Componentes de Tiempo Real**
    - `ProgressBar.tsx`: Consultar y mostrar progreso vs meta.
    - `TeamRanking.tsx`: Listado de equipos ordenados por recaudación.
- [ ] **Páginas Auxiliares**
    - Página de agradecimiento (`gracias.astro`) con verificación de estado.
    - Sección "Sobre Nosotros" y "FAQ".

### 💳 Fase 4: Integración de Pagos y Seguridad

*Objetivo: Conectar el flujo con la pasarela real y asegurar el sitio.*

- [ ] **Integración Payku**
    - Crear cuenta y obtener llaves de API (Dev/Prod).
    - Implementar lógica de redirección a Payku tras crear donación.
- [ ] **Seguridad (Cloudflare Turnstile)**
    - Configurar widget en el Frontend.
    - Validar token en el Backend antes de procesar.
- [ ] **CORS y Headers**
    - Configurar políticas CORS en el Worker para aceptar peticiones solo del dominio frontend.
    - Configurar Content Security Policy (CSP) en el Frontend.

### 📚 Fase 5: Documentación y Despliegue

*Objetivo: Dejar el proyecto listo para producción y mantenible.*

- [ ] **Documentación Técnica**
    - Redactar `ESPECIFICACION_TECNICA.md` (Arquitectura, API).
    - Redactar `MANUAL_TECNICO.md` (Deploy, Troubleshooting).
    - Redactar `MANUAL_OPERACIONES.md` (Uso para no técnicos).
    - Redactar `GUIA_PERSONALIZACION_FRONTEND.md`.
- [ ] **Scripts de Automatización**
    - `setup-secrets.sh`: Carga de variables de entorno.
    - `check-health.sh`: Verificación de estado del sistema.
- [ ] **Despliegue a Producción**
    - Deploy del Backend a Cloudflare Workers.
    - Deploy del Frontend a Cloudflare Pages.
    - Verificación final de flujo completo (Donación -> Pago -> Confirmación).

---

## 📊 Sugerencia para Kanban (Columnas)

Si usas GitHub Projects, te sugiero estas columnas:

1.  **Backlog**: Todas las tareas pendientes (copia la lista de arriba aquí).
2.  **Todo (Esta semana)**: Lo que planeas hacer pronto.
3.  **In Progress**: Lo que estás programando ahora.
4.  **Review / Testing**: Tareas terminadas que necesitan prueba.
5.  **Done**: Tareas completadas y verificadas.

## 🏷️ Etiquetas (Labels) Sugeridas

- `frontend`
- `backend`
- `database`
- `devops`
- `documentation`
- `bug`
- `enhancement`
