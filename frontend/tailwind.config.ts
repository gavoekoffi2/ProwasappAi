import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf4",
          100: "#d7f7e5",
          200: "#b2edcc",
          300: "#7fdca8",
          400: "#49c380",
          500: "#25a866",
          600: "#198750",
          700: "#166b41",
          800: "#135536",
          900: "#10442d",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
