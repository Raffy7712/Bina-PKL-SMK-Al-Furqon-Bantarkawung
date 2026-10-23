import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,

  {
    files: ["src/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-undef": "error",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-uji/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
