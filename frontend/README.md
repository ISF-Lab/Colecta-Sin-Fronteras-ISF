# 🎯 Frontend - Colecta ISF

Sistema de frontend para la plataforma de colecta digital de ISF Chile. Construido con Astro + React + Tailwind CSS.

## 📚 Stack Tecnológico

- **Framework:** [Astro](https://astro.build/) v4 (Static Site Generation)
- **UI Interactiva:** [React](https://react.dev/) v18 (Islands Architecture)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) v3
- **Seguridad:** [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
- **Hosting:** Cloudflare Pages

## 🏗️ Estructura del Proyecto

```
frontend/
├── public/
│   └── favicon.svg           # Favicon del sitio
├── src/
│   ├── pages/
│   │   ├── index.astro       # Landing page + formulario
│   │   └── gracias.astro     # Página de agradecimiento
│   ├── components/
│   │   ├── Layout.astro      # Layout base HTML
│   │   ├── DonationForm.tsx  # Formulario de donación (React)
│   │   ├── ProgressBar.tsx   # Barra de progreso (React)
│   │   └── TeamRanking.tsx   # Ranking de equipos (React)
│   ├── lib/
│   │   └── api.js            # Cliente API para backend
│   └── env.d.ts              # Tipos TypeScript
├── astro.config.mjs          # Configuración Astro
├── tailwind.config.mjs       # Configuración Tailwind
├── tsconfig.json             # Configuración TypeScript
└── package.json
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o pnpm

### Pasos

1. **Clonar el repositorio e instalar dependencias:**

```bash
cd frontend
npm install
```

2. **Configurar variables de entorno:**

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
PUBLIC_BACKEND_URL=http://localhost:8787
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
PUBLIC_TURNSTILE_SITE_KEY=tu-site-key-aqui
```

3. **Ejecutar en desarrollo:**

```bash
npm run dev
```

El sitio estará disponible en `http://localhost:4321`

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
```

## 📦 Build y Deploy

### Build Local

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos listos para producción.

### Deploy a Cloudflare Pages

**Opción 1: Desde la línea de comandos**

```bash
# Primera vez: login
npx wrangler login

# Deploy
npx wrangler pages deploy dist --project-name=colecta-isf-lunes
```

**Opción 2: Integración con Git**

1. Conecta tu repositorio en el dashboard de Cloudflare Pages
2. Configura:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Agrega las variables de entorno en Settings > Environment variables
4. Cada push a `main` disparará un deploy automático

### Variables de Entorno en Producción

En Cloudflare Pages Dashboard > Settings > Environment variables:

| Variable | Valor |
|----------|-------|
| `PUBLIC_BACKEND_URL` | `https://colecta-isf-worker.francisco-ruiz.workers.dev` |
| `PUBLIC_SUPABASE_URL` | Tu URL de Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `PUBLIC_TURNSTILE_SITE_KEY` | Tu site key de Turnstile |

## 🎨 Componentes Principales

### DonationForm.tsx

Formulario de donación con:
- Validación client-side
- Integración con Cloudflare Turnstile
- Estados de loading/error/success
- Redirección automática a Payku

### ProgressBar.tsx

Barra de progreso que:
- Hace polling cada 10 segundos
- Obtiene datos de `public_stats` view en Supabase
- Muestra porcentaje visual y montos formateados
- Animaciones suaves

### TeamRanking.tsx

Ranking de equipos que:
- Hace polling cada 10 segundos
- Obtiene datos de `team_rankings` view en Supabase
- Vista adaptativa: tabla en desktop, cards en móvil
- Resalta el equipo actual

## 🔍 Debugging

### El formulario no envía datos

1. Verifica que `PUBLIC_BACKEND_URL` esté correcto
2. Revisa la consola del navegador para errores CORS
3. Confirma que Turnstile esté cargado (puede fallar en localhost)

### Las estadísticas no se actualizan

1. Verifica `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
2. Confirma que las views `public_stats` y `team_rankings` existan
3. Verifica que RLS esté configurado para permitir acceso público

### Turnstile no aparece

1. Verifica que `PUBLIC_TURNSTILE_SITE_KEY` esté configurado
2. Confirma que el script de Turnstile se cargue (ver Network tab)
3. En localhost, Turnstile puede no funcionar correctamente

## 📱 Mobile-First

El diseño está optimizado para móviles primero:
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Grid responsive en componentes principales
- Tabla → Cards en TeamRanking para pantallas pequeñas
- Touch-friendly: botones grandes, espaciado generoso

## ♿ Accesibilidad

- Labels semánticos en todos los inputs
- Focus states visibles
- Colores con contraste WCAG AA
- Textos alternativos en iconos importantes
- Teclado navigation funcional

## 🎯 Performance

- Static Site Generation (SSG) con Astro
- JavaScript solo donde es necesario (React Islands)
- Lazy loading de componentes React
- CSS optimizado con Tailwind purge
- Imágenes optimizadas

## 🐛 Troubleshooting

### Error: "Cannot find module 'react'"

```bash
npm install
```

### Error de CORS en desarrollo

Asegúrate que el backend Worker tenga los headers CORS correctos y que `PUBLIC_BACKEND_URL` apunte al Worker correcto.

### Build falla en Cloudflare Pages

1. Verifica que `astro.config.mjs` tenga `output: 'static'`
2. Confirma que todas las dependencias estén en `package.json`
3. Revisa los logs de build en Cloudflare Dashboard

## 📝 Notas Adicionales

- **Polling interval:** Los componentes hacen polling cada 10 segundos. Ajusta en el código si necesitas otro intervalo.
- **Montos:** Validación client-side entre $1.000 y $500.000 CLP.
- **Team slugs:** Se obtienen del query param `?team=` en la URL.
- **Turnstile:** Puede que no funcione correctamente en `localhost`, pero funcionará en producción con el dominio real.

## 🤝 Contribuir

1. Crea una branch: `git checkout -b feature/mi-feature`
2. Commit cambios: `git commit -m 'Add: mi feature'`
3. Push: `git push origin feature/mi-feature`
4. Abre un Pull Request

## 📄 Licencia

© 2025 ISF Chile. Todos los derechos reservados.

---

**Mantenido por:** ISF Chile  
**Última actualización:** Noviembre 2025