import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        paper: "#f5f5f4",
        accent: "#fca311",
        success: "#1f7a3d",
        warning: "#b45309",
        danger: "#991b1b"
      }
    }
  },
  plugins: []
};

export default config;
