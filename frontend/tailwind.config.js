import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-tema="oscuro"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: 'var(--fondo)',
        superficie: {
          DEFAULT: 'var(--superficie)',
          2: 'var(--superficie-2)',
        },
        borde: {
          DEFAULT: 'var(--borde)',
          fuerte: 'var(--borde-fuerte)',
        },
        texto: {
          DEFAULT: 'var(--texto)',
          2: 'var(--texto-2)',
          3: 'var(--texto-3)',
        },
        'sobre-acento': 'var(--sobre-acento)',
        asfalto: 'var(--asfalto)',
        'acento-texto': 'var(--acento-texto)',
        hover: 'var(--hover)',
        correcto: {
          DEFAULT: 'var(--correcto)',
          texto: 'var(--correcto-texto)',
          fondo: 'var(--correcto-fondo)',
        },
        error: {
          DEFAULT: 'var(--error)',
          fondo: 'var(--error-fondo)',
        },
        aviso: {
          texto: 'var(--aviso-texto)',
          fondo: 'var(--aviso-fondo)',
        },
        peligro: {
          DEFAULT: 'var(--peligro)',
          hover: '#8F1B12',
        },
        marca: {
          amarillo: '#FCBD17',
          'amarillo-hover': '#E5A800',
          'amarillo-activo': '#CC9600',
          naranja: '#EC7502',
          'secundario-activo': '#E4E0D6',
        },
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindAnimate],
};
