/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from your design
        accent: {
          DEFAULT: '#aa7c6d',
          secondary: '#d4a373',
          dark: '#9a6c5d',
        },
        sale: '#d14444',
        
        // Backgrounds
        'bg-secondary': '#f9f9f9',
        'bg-warm': '#fafaf8',
        'bg-warm-dark': '#f5f4f1',
        
        // Text
        'text-main': '#1a1a1a',
        'text-light': '#555555',
        
        // Border
        'border-main': '#e5e5e5',
      },
      
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      
      maxWidth: {
        'container': '1440px',
      },
      
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 12px 32px rgba(0,0,0,0.14)',
        'proof': '0 2px 4px rgba(0,0,0,0.1)',
      },
      
      backdropBlur: {
        'hero': '12px',
      },
      
      transitionDuration: {
        'card': '400ms',
      },
      
      zIndex: {
        'header': '100',
        'hero': '1',
        'hero-overlay': '2',
        'hero-content': '3',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.8s ease-in-out',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}