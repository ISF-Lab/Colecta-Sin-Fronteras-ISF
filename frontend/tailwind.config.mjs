/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        isf: {
          // Colores institucionales ISF Chile
          celeste: '#64A7DB',
          verde: '#BEC625',
          naranja: '#FF961F',
          azul: '#0920A6',
          rosa: '#FF2CAC',
          
          // Aliases para compatibilidad
          blue: '#0920A6',      // azul institucional
          orange: '#FF961F',    // naranja institucional
          dark: '#1a1a1a',
          light: '#f8f9fa'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif']
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}