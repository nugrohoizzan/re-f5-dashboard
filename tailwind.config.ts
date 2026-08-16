import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Brand palette maps directly onto Tailwind's built-in scales:
      // Primary #DC2626 = red-600, Dark #18181B = zinc-900,
      // Secondary #3F3F46 = zinc-700, Background #FAFAFA = zinc-50,
      // Card #FFFFFF = white. No custom color tokens needed — the app
      // uses red-* and zinc-* utilities directly throughout.
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
