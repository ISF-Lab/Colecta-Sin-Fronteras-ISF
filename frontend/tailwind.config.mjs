/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        isf: {
          blue: '#0066CC',
          orange: '#FF6600',
          dark: '#1a1a1a',
          light: '#f8f9fa'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}