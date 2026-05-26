/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':   'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary':  'var(--color-bg-tertiary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        accent:  'var(--color-accent)',
        border:  'var(--color-border)',
        timer:   'var(--color-timer)',
        error:   'var(--color-error)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        sans: ['var(--font-active)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
