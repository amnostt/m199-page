// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Minimal baseline ESLint config for the m199-page monorepo.
 * Uses the ESLint flat config format (ESLint 9+).
 * App and package packages extend this via their own tsconfig/extends in later changes.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "**/dist-legacy/**",
      "**/.astro/**",
      "**/build/**",
      "**/.output/**",
      "**/coverage/**",
      "packages/db/prisma/**",
      "apps/web/astro.config.mjs",
      "apps/web/server-entry.mjs",
      "apps/web/server-port.mjs",
      "docs/**",
      "pnpm-lock.yaml",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
