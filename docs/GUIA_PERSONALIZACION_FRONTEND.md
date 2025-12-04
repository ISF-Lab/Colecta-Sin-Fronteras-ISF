# Guía de Personalización Visual (Frontend)

Esta guía está diseñada para miembros de la fundación y voluntarios que deseen realizar cambios visuales o de texto en la página web de la Colecta, sin necesidad de ser expertos en programación.

## 📂 Estructura Básica

Los archivos que modificaremos se encuentran principalmente en la carpeta `frontend/src`.

- **Colores**: `frontend/tailwind.config.mjs`
- **Textos Generales y Estructura**: `frontend/src/pages/index.astro`
- **Componentes Específicos** (Hero, Footer, etc.): `frontend/src/components/`

---

## 🎨 1. Colores

Los colores del sitio están definidos en un archivo de configuración central. Esto asegura que si cambias un color aquí, cambie en toda la página.

**Archivo:** `frontend/tailwind.config.mjs`

Busca la sección `colors` dentro de `extend`:

```javascript
colors: {
  isf: {
    celeste: '#64A7DB', // Color principal
    verde: '#BEC625',   // Color secundario
    naranja: '#FF961F', // Color de énfasis (botones)
    azul: '#0920A6',    // Color oscuro/texto
    rosa: '#FF2CAC',    // Color de acento
    // ...
  }
}
```

Para cambiar un color, simplemente reemplaza el código hexadecimal (ej: `#64A7DB`) por el nuevo color que desees.

---

## ✍️ 2. Textos e Imágenes Principales

### Portada (Hero Section)
La imagen grande al inicio, el título principal y el subtítulo.

**Archivo:** `frontend/src/components/Hero.astro` (o a veces configurado desde `index.astro`)

En `frontend/src/pages/index.astro`, busca la etiqueta `<Hero ... />`:

```html
<Hero 
  title="COLECTA ISF 2025" 
  subtitle="Apoya proyectos de impacto social..."
  backgroundImage="/hero-background.jpg"
  ctaText="Donar Ahora"
/>
```
- **title**: El título grande.
- **subtitle**: El texto pequeño debajo del título.
- **ctaText**: El texto del botón principal.
- **backgroundImage**: La imagen de fondo (debe estar en la carpeta `frontend/public`).

### Pie de Página (Footer)
Información de contacto, redes sociales y enlaces finales.

**Archivo:** `frontend/src/components/Layout.astro`

Busca la etiqueta `<footer>` casi al final del archivo. Ahí encontrarás:
- Textos de "Sobre Nosotros".
- Enlaces de navegación.
- Datos de contacto (correo, dirección).
- Enlaces a redes sociales (Facebook, Instagram, Twitter).

### Textos "Sobre Nosotros" y "¿Por qué Donar?"
**Archivos:** 
- `frontend/src/components/AboutUs.astro`
- `frontend/src/components/WhyDonate.astro`

Estos archivos contienen texto HTML simple. Busca el texto blanco y modifícalo con cuidado de no borrar las etiquetas `<p>`, `<h1>`, `<div>`, etc.

---

## 🔤 3. Tipografía (Letras)

La fuente (tipo de letra) se carga en el archivo principal de diseño.

**Archivo:** `frontend/src/components/Layout.astro`

Busca en la sección `<head>` las líneas que importan Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=NombreDeLaFuente..." rel="stylesheet">
```

Y luego en la sección `<style>` o en `tailwind.config.mjs` se define cuál usar. Si deseas cambiarla, necesitarás:
1. Buscar la nueva fuente en Google Fonts.
2. Copiar el link de "Embed" y reemplazar el existente en `Layout.astro`.
3. Actualizar el nombre de la familia en `tailwind.config.mjs` bajo `fontFamily`.

---

## 🖼️ 4. Imágenes y Logos

Todas las imágenes públicas deben guardarse en la carpeta:
`frontend/public/`

- **Logo**: Generalmente `favicon.svg` o definido dentro de `Layout.astro`.
- **Fondo**: `hero-background.jpg` (o el nombre que hayas puesto en la sección Hero).

Para cambiar una imagen, lo más fácil es reemplazar el archivo en esa carpeta manteniendo el **mismo nombre**. Si usas un nombre nuevo, debes actualizar la referencia en el código (como vimos en la sección Hero).

---

## ⚠️ Consejos Importantes

1. **Haz una copia de seguridad**: Antes de modificar un archivo, guárdalo con otro nombre (ej: `Hero.astro.bak`) por si algo sale mal.
2. **Cuidado con las comillas**: Al editar textos en código (ej: `title="Texto"`), asegúrate de no borrar las comillas que encierran el texto.
3. **Prueba tus cambios**: Si es posible, visualiza la página localmente (`npm run dev`) para asegurar que todo se ve bien antes de publicar.
