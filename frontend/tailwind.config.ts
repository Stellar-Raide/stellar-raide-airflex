import type { Config } from "tailwindcss";

const config: Config = {
  // Use 'class' strategy so the dark mode is toggled by adding/removing
  // the `dark` class on the <html> element — ThemeToggle controls this.
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
