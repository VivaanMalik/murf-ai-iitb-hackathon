import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        'brand-blue': { 
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // <-- Used for Light Mode User Bubble (bg-brand-blue-500)
          600: '#2563eb', // <-- Used for Border in Light Mode
          700: '#1d4ed8', // <-- Used for Dark Mode User Bubble (dark:bg-brand-blue-700)
          800: '#1e40af', // <-- Used for Border in Dark Mode
          900: '#1e3a8a',
          950: '#172554',
        },

        // 2. Brand Purple (Example: Alternative Accent)
        'brand-purple': { 
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // <-- Used for Light Mode User Bubble
          600: '#7c3aed', // <-- Used for Border in Light Mode
          700: '#6d28d9', // <-- Used for Dark Mode User Bubble
          800: '#5b21b6', // <-- Used for Border in Dark Mode
          900: '#4c1d95',
          950: '#2e1065',
        },

        // 3. Brand Teal (Example: Alternative Accent)
        'brand-teal': { 
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // <-- Used for Light Mode User Bubble
          600: '#0d9488', // <-- Used for Border in Light Mode
          700: '#0f766e', // <-- Used for Dark Mode User Bubble
          800: '#115e59', // <-- Used for Border in Dark Mode
          900: '#134e4a',
          950: '#042f2e',
        },
        
        // 4. Brand Amber (Example: Alternative Accent)
        'brand-amber': {
          50: '#fffdf0',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // <-- Used for Light Mode User Bubble
          600: '#d97706', // <-- Used for Border in Light Mode
          700: '#b45309', // <-- Used for Dark Mode User Bubble
          800: '#92400e', // <-- Used for Border in Dark Mode
          900: '#78350f',
          950: '#451a03',
        },
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "user-bubble": "hsl(var(--user-bubble))",
        "user-bubble-glow": "hsl(var(--user-bubble-glow))",
        "agent-bubble": "hsl(var(--agent-bubble))",
        "agent-bubble-border": "hsl(var(--agent-bubble-border))",
        "record-button": "hsl(var(--record-button))",
        "record-button-active": "hsl(var(--record-button-active))",
        "record-button-glow": "hsl(var(--record-button-glow))",
        "waveform": "hsl(var(--waveform))",
        "citation-card": "hsl(var(--citation-card))",
        "citation-card-border": "hsl(var(--citation-card-border))",
        "citation-label": "hsl(var(--citation-label))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)"
          },
          "50%": {
            opacity: "0.8",
            transform: "scale(1.05)"
          }
        },
        "wave": {
          "0%, 100%": {
            transform: "scaleY(0.5)"
          },
          "50%": {
            transform: "scaleY(1)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "wave": "wave 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
