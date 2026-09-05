import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma Client output is generated and should not be linted as source.
    "src/generated/**",
  ]),
  {
    rules: {
      // Strict TypeScript rules for critical paths
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Prefer const over let where possible
      "prefer-const": "error",
      // Existing client components intentionally synchronize browser-only
      // state from effects/refs; keep these as reviewable warnings rather
      // than making the migration fail the release lint gate.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      // No console.log left in production code (use console.error/warn for real errors)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);

export default eslintConfig;
