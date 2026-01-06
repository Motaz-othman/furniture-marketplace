/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          cream: '#FAF8F5',
          beige: '#F0EBE3',
          charcoal: '#2C2C2C',
          muted: '#6B6B6B',
          accent: '#8B7355',
          'accent-hover': '#6B5A45',
          'header-dark': '#4A5440',
          'border-light': '#E8E4DC',
          olive: '#4A5440',
        },
        fontFamily: {
          serif: ['Playfair Display', 'serif'],
          sans: ['Inter', 'sans-serif'],
        },
        boxShadow: {
          'card': '0px 4px 20px rgba(0, 0, 0, 0.08)',
          'button': '0px 4px 12px rgba(139, 115, 85, 0.25)',
        },
      },
    },
    plugins: [],
  }