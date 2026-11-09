import type { Config } from "tailwindcss";

// The timer screens use the ported prototype stylesheet (src/styles/timer.css)
// so they match what has run in live services. Tailwind is here for the
// account, settings and billing screens that come in later phases.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0c1a4d", 2: "#132564", 3: "#1b3080" },
        line: "#2a3f93",
        paper: "#f6f4ee",
        mute: "#a9b4dc",
        royal: { DEFAULT: "#3f63e0", hi: "#5f7ff0" },
        gold: "#e9b949",
        coral: "#f08a7a",
        ok: "#5cc79a",
      },
    },
  },
  plugins: [],
};

export default config;
