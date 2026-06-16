import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-display)', 'var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        'layered-display': ['var(--layered-font-primary)', 'ui-sans-serif', 'system-ui'],
        'layered-mono': ['var(--layered-font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        /* Layered Design System — UNI-2059 */
        'layered-canvas': 'var(--layered-canvas)',
        'layered-sidebar': 'var(--layered-sidebar)',
        'layered-card': 'var(--layered-card)',
        'layered-elevated': 'var(--layered-elevated)',
        'layered-text-primary': 'var(--layered-text-primary)',
        'layered-text-secondary': 'var(--layered-text-secondary)',
        'layered-text-muted': 'var(--layered-text-muted)',
        'layered-text-faint': 'var(--layered-text-faint)',
        'layered-navy': 'var(--layered-navy)',
        'layered-teal': 'var(--layered-teal)',
        'layered-green-deep': 'var(--layered-green-deep)',
        'layered-green-soft': 'var(--layered-green-soft)',
        'layered-coral-deep': 'var(--layered-coral-deep)',
        'layered-coral-soft': 'var(--layered-coral-soft)',
        'layered-plum-deep': 'var(--layered-plum-deep)',
        'layered-plum-soft': 'var(--layered-plum-soft)',
        'layered-amber-deep': 'var(--layered-amber-deep)',
        'layered-amber-soft': 'var(--layered-amber-soft)',
        'layered-red-deep': 'var(--layered-red-deep)',
        'layered-red-soft': 'var(--layered-red-soft)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'layered-card': 'var(--layered-radius-card)',
        'layered-panel': 'var(--layered-radius-panel)',
        'layered-tile': 'var(--layered-radius-tile)',
        'layered-page': 'var(--layered-radius-page)',
      },
      boxShadow: {
        'layered-1': 'var(--layered-shadow-1)',
        'layered-2': 'var(--layered-shadow-2)',
        'layered-3': 'var(--layered-shadow-3)',
      },
    },
  },
  boxShadow: {
    'layered-1': 'var(--layered-shadow-1)',
    'layered-2': 'var(--layered-shadow-2)',
    'layered-3': 'var(--layered-shadow-3)',
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
