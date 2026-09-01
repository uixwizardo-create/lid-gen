/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          50: '#EFF6FF',
          400: '#60A5FA',
          500: '#2563EB',  // main CTA, links
          600: '#1D4ED8',  // hover state
          700: '#1E40AF',  // active state
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        darkCanvas: '#090D16',
        glass: {
          DEFAULT: 'rgba(9, 13, 22, 0.6)',
          panel: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.06)',
          highlight: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.1)',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',  // borders, dividers
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',  // secondary text
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',  // primary text
        },
        success: {
          500: '#16A34A',
        },
        warning: {
          500: '#D97706',
        },
        danger: {
          500: '#DC2626',
          600: '#B91C1C',
        },
        info: {
          500: '#3B82F6',
        }
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '24px',
        'space-6': '32px',
        'space-8': '48px',
        'space-10': '64px',
        'space-12': '96px',
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'md': '8px',       // default inputs, buttons, cards
        'lg': '12px',      // modals, large cards
        'xl': '16px',
        'full': '9999px',  // avatars, pills
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15,23,42,0.06)',
        'sm': '0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)',
        'md': '0 4px 6px rgba(15,23,42,0.10), 0 2px 4px rgba(15,23,42,0.06)',
        'lg': '0 10px 15px rgba(15,23,42,0.10), 0 4px 6px rgba(15,23,42,0.05)',
        'xl': '0 20px 25px rgba(15,23,42,0.12), 0 8px 10px rgba(15,23,42,0.06)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      zIndex: {
        'base': '0',
        'dropdown': '10',
        'sticky': '20',
        'overlay': '30',
        'modal': '40',
        'toast': '50',
        'tooltip': '60',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)', boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)' },
          '50%': { opacity: '1', transform: 'scale(1.02)', boxShadow: '0 0 25px rgba(37, 99, 235, 0.4)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
