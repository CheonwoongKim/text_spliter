import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These legacy boundaries intentionally accept provider-specific payloads.
      // Tightening them belongs in a focused data-model refactor.
      "@typescript-eslint/no-explicit-any": "off",

      // The project does not enable React Compiler. Existing effects synchronize
      // browser/auth state and are covered by runtime regression tests.
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",

      // Parser previews use transient blob/data URLs that next/image cannot
      // optimize, and auth helpers intentionally perform browser navigation.
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);
