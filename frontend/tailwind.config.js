/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        army: {
          green: {
            50: '#f4f7ed',
            100: '#e6ecdb',
            200: '#cddbb5',
            300: '#b2c78c',
            400: '#96b366',
            500: '#789a47',
            600: '#61812f',
            700: '#4d672a',
            800: '#3f5226',
            900: '#374623',
            950: '#1e2812',
          },
          khaki: {
            50: '#f9f8f0',
            100: '#f4f1dd',
            200: '#e7dfbd',
            300: '#d8ca97',
            400: '#caaf6e',
            500: '#c09c53',
            600: '#b08446',
            700: '#92693b',
            800: '#775437',
            900: '#634632',
            950: '#36251a',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
        },
        /* Indian Army / Tricolour accents */
        saffron: '#FF9933',
        'saffron-dark': '#E88B2E',
        'india-green': '#138808',
        'india-green-dark': '#0D6606',
        'army-gold': '#C5A028',
        'army-olive': '#4A5D23',
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'sans-serif'],
        headline: ['"Rajdhani"', 'sans-serif'],
      },
      backgroundImage: {
        'hero-pattern': "url('https://images.unsplash.com/photo-1589320010412-63b0d0157533?auto=format&fit=crop&w=1470&q=80')",
        'camo-pattern': "url('https://images.unsplash.com/photo-1589320010412-63b0d0157533?auto=format&fit=crop&w=1470&q=80')",
        'base-pattern': 'linear-gradient(135deg, rgba(30,40,18,0.97) 0%, rgba(55,70,35,0.95) 50%, rgba(30,40,18,0.97) 100%)',
      },
      boxShadow: {
        'army': '0 4px 14px 0 rgba(0,0,0,0.25)',
        'army-lg': '0 10px 40px -10px rgba(0,0,0,0.35)',
        'inner-badge': 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
      },
      borderWidth: {
        'stripe': '3px',
      },
    },
  },
  plugins: [],
};