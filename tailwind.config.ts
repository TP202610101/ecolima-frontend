import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#16a34a',
        'primary-foreground': '#ffffff',
        'primary-hover': '#15803d',
        secondary: '#f5f5f5',
        'secondary-foreground': '#1a1a1a',
        muted: '#f5f5f5',
        'muted-foreground': '#737373',
        border: '#e5e5e5',
        'input-bg': '#f9f9f9',
        accent: '#f0fdf4',
        'accent-foreground': '#166534',
        destructive: '#dc2626',
        background: '#ffffff',
        foreground: '#1a1a1a'
      },
      borderRadius: {
        lg: '0.5rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
} as Config
