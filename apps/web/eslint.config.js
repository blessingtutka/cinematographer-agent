import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"

import sharedConfig from "@ca/eslint-config"

export default [
  ...sharedConfig,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      globals: globals.browser,
    },

    rules: {
      // React
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",

      // others
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]
