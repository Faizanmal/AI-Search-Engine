import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        lg: "4rem",
        xl: "5rem",
        "2xl": "6rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "var(--background)",
        foreground: "var(--foreground)",
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
        // Custom gradient colors
        'gradient-start': '#667eea',
        'gradient-end': '#764ba2',
        'gradient-secondary-start': '#f093fb',
        'gradient-secondary-end': '#f5576c',
        'gradient-accent-start': '#4facfe',
        'gradient-accent-end': '#00f2fe',
        'gradient-success-start': '#43e97b',
        'gradient-success-end': '#38f9d7',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      boxShadow: {
        'glass': 'var(--glass-shadow)',
        'glow-primary': 'var(--glow-primary)',
        'glow-secondary': 'var(--glow-secondary)',
        'custom-sm': 'var(--shadow-sm)',
        'custom-md': 'var(--shadow-md)',
        'custom-lg': 'var(--shadow-lg)',
        'custom-xl': 'var(--shadow-xl)',
      },
      backdropBlur: {
        'glass': '10px',
        'glass-strong': '20px',
      },
      animation: {
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'shimmer': 'shimmer 2s infinite',
        'skeleton-loading': 'skeleton-loading 1.5s ease-in-out infinite',
        'blob': 'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
        'shimmer': {
          '0%': { 'background-position': '-1000px 0' },
          '100%': { 'background-position': '1000px 0' },
        },
        'skeleton-loading': {
          '0%': { 'background-position': '-200px 0' },
          '100%': { 'background-position': 'calc(200px + 100%) 0' },
        },
        'blob': {
          '0%, 100%': { 
            'transform': 'translate(0, 0) scale(1)' 
          },
          '33%': { 
            'transform': 'translate(30px, -50px) scale(1.1)' 
          },
          '66%': { 
            'transform': 'translate(-20px, 20px) scale(0.9)' 
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      spacing: {
        'section': '4rem',
        'section-lg': '6rem',
        'container-padding': '1rem',
      },
      maxWidth: {
        'content': '1200px',
        'content-lg': '1400px',
      },
      zIndex: {
        'navbar': '50',
        'modal': '100',
        'tooltip': '200',
      }
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;