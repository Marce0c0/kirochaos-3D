/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aws: {
          orange: '#FF9900',
          squid: '#232F3E',
          dark: '#0F172A',
          blue: '#0073BB',
          light: '#F8FAFC',
        },
        kiro: {
          purple: '#A855F7',
          neon: '#C084FC',
          dark: '#3B0764',
          glow: '#9333EA',
          cyan: '#00F0FF',
          crimson: '#EF4444',
          emerald: '#10B981',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}

