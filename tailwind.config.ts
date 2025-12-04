import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        laundry: {
          blue: "#0066cc",
          "blue-light": "#e6f2ff",
          "blue-dark": "#0052a3",
          "blue-hover": "#0052a3",
        },
      },
    },
  },
  plugins: [],
};
export default config;

