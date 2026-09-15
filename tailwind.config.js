/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Theme is driven by the `data-theme` attribute on <html>; enabling the
  // selector strategy lets us add `dark:` variants for the few saturated-tint
  // TEXT colors that need a deeper step on beige (bright on dark, deep on light).
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // brand + ink resolve to CSS vars (channels) so they flip per theme.
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
        },
        // Structural tokens: dividers/borders + hover/pressed fills.
        line: 'rgb(var(--line) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
        'glass-lg': 'var(--shadow-glass-lg)',
        'glass-sm': 'var(--shadow-glass-sm)',
        glow: 'var(--shadow-glow)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-24px) translateX(12px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-slow': 'float 14s ease-in-out infinite',
        'float-slower': 'float 20s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
