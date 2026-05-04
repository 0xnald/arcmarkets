import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Safelist all the bento span classes since they are sometimes referenced via template literals
  safelist: [
    "col-span-1", "col-span-2", "col-span-3", "col-span-4", "col-span-5",
    "col-span-6", "col-span-7", "col-span-8", "col-span-9", "col-span-10",
    "col-span-11", "col-span-12",
    "lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4",
    "lg:col-span-5", "lg:col-span-6", "lg:col-span-7", "lg:col-span-8",
    "sm:col-span-1", "sm:col-span-2",
    "row-span-1", "row-span-2", "row-span-3",
  ],
  theme: {
    extend: {
      colors: {
        arc: {
          purple: "#8B5CF6",
          violet: "#A855F7",
          blue: "#3B82F6",
          cyan: "#22D3EE",
        },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter Tight", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
