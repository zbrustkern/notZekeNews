import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F5EF",
        ink: {
          DEFAULT: "#182B33",
          light: "#3A4D56",
          muted: "#667A83",
        },
        teal: {
          DEFAULT: "#21665D",
          dark: "#174E47",
          light: "#2B8277",
        },
        brand: {
          orange: "#C9633F",
          sage: "#EDF2EB",
        },
        border: {
          subtle: "#E5E1D5",
          DEFAULT: "#DCD6C7",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
