/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        nepal: {
          red: '#c8102e',
          blue: '#1e3a5f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      height: {
        'screen-d': '100dvh',
      },
      minHeight: {
        'screen-d': '100dvh',
      },
      maxHeight: {
        'screen-d': '100dvh',
        'screen-d90': '90dvh',
      },
      zIndex: {
        base: '0',
        sticky: '20',
        header: '30',
        fab: '35',
        scrim: '40',
        sheet: '50',
        toast: '60',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        180: '180ms',
        220: '220ms',
        280: '280ms',
      },
      boxShadow: {
        fab:   '0 8px 24px -4px rgba(200,16,46,0.35), 0 4px 8px -4px rgba(0,0,0,0.15)',
        sheet: '0 -8px 32px -8px rgba(0,0,0,0.18)',
      },
      keyframes: {
        sheetIn:   { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        sheetInSm: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        scrimIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        'sheet-in':    'sheetIn 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        'sheet-in-sm': 'sheetInSm 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'scrim-in':    'scrimIn 180ms ease-out',
      },
    },
  },
  plugins: [],
}
