/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#028350',
        success: '#22C55E',
        background: '#F5F5F0',
        card: '#FFFFFF',
        muted: '#888888',
        dark: '#1A1A1A',
      },
      borderRadius: {
        'card': '18px',
        'btn': '14px',
        'pill': '100px',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: '#EBEBEB',
      },
      boxShadow: {
        'card': 'none',
        'nav': 'none',
        'float': '0 4px 16px rgba(2,131,80,0.35)',
      },
    },
  },
  plugins: [],
}
