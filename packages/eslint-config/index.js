import js from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      ".next/",
      "build/",
      "*.js.map",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],

    plugins: {
      "simple-import-sort": simpleImportSort,
    },

    rules: {
      // Imports

      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "off",

      "@typescript-eslint/explicit-function-return-type": "off",

      "@typescript-eslint/explicit-module-boundary-types": "off",

      "@typescript-eslint/no-non-null-assertion": "off",

      // General
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],

      "prefer-const": "error",

      "no-var": "error",

      eqeqeq: ["error", "always"],

      curly: ["error", "all"],
    },
  },
);
