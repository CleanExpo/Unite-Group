import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Nexus semantic tokens
        danger: {
          DEFAULT: 'var(--color-danger)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
        },
        // Editorial text/surface tokens (globals.css vars; light + dark blocks).
        // Makes text-color-text-*, bg-surface-*, border-surface-* utilities real (UNI-2334).
        'color-text': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        surface: {
          canvas: 'var(--surface-canvas)',
          sidebar: 'var(--surface-sidebar)',
          card: 'var(--surface-card)',
          elevated: 'var(--surface-elevated)',
          overlay: 'var(--surface-overlay)',
          selected: 'var(--surface-selected)',
        },
        // Unite-Hub Brand Colors (from logo)
        'unite': {
          'teal': '#3b9ba8',      // Primary teal from logo circle
          'blue': '#2563ab',      // Navy blue from "Unite" text
          'orange': '#f39c12',    // Orange from "Hub" text
          'gold': '#e67e22',      // Gold accent
          'navy': '#1e3a5f',      // Dark navy
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
