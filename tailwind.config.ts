import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          "50": "#e7eff7",
          "100": "#b4cde7",
          "200": "#8fb5dc",
          "300": "#5c94cc",
          "400": "#3d7fc2",
          "500": "#0c5fb3",
          "600": "#0b56a3",
          "700": "#09437f",
          "800": "#073462",
          "900": "#05284b",
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          "50": "#fff1e6",
          "100": "#ffd2b0",
          "200": "#ffbd8a",
          "300": "#ff9f54",
          "400": "#ff8c33",
          "500": "#ff6f00",
          "600": "#e86500",
          "700": "#b54f00",
          "800": "#8c3d00",
          "900": "#6b2f00",
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        white: {
          DEFAULT: "#ffffff",
          "600": "#e8e8e8",
          "700": "#b5b5b5",
          "800": "#8c8c8c",
          "900": "#6b6b6b",
        },
        black: {
          "50": "#e6e6e6",
          "100": "#b0b0b0",
          "200": "#8a8a8a",
          "300": "#545454",
          "400": "#333333",
        },
        destructive: {
          "50": "#ffe6e6",
          "100": "#ffb0b0",
          "200": "#ff8a8a",
          "300": "#ff5454",
          "400": "#ff3333",
          "500": "#ff0000",
          "600": "#e80000",
          "700": "#b50000",
          "800": "#8c0000",
          "900": "#6b0000",
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          "50": "#e6f2e6",
          "100": "#b0d8b0",
          "200": "#8ac58a",
          "300": "#54aa54",
          "400": "#339933",
          "500": "#008000",
          "600": "#007400",
          "700": "#005b00",
          "800": "#004600",
          "900": "#003600",
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
