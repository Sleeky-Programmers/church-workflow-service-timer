import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The service worker is plain JS that runs in the browser's worker scope.
    files: ["public/sw.js"],
    languageOptions: {
      sourceType: "script",
      globals: Object.fromEntries(
        ["self", "caches", "fetch", "Request", "Response", "URL", "setTimeout"].map((g) => [g, "readonly"]),
      ),
    },
  },
  {
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
