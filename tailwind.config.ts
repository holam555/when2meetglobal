import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: v("--c-bg"),
        surface: v("--c-surface"),
        surface2: v("--c-surface2"),
        border: v("--c-border"),
        ink: v("--c-ink"),
        mute: v("--c-mute"),
        amber: {
          DEFAULT: v("--c-amber"),
          deep: v("--c-amber-deep"),
          ink: v("--c-amber-ink"),
        },
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
