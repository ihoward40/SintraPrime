// Flat config for ESLint (v9+ / v10 compatible)
const noUnsafeMapRule = require("./eslint-rules/no-unsafe-map.cjs");

const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["**/*.{js,ts,tsx,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        // project: "./tsconfig.json", // omitted to avoid project file errors in small test paths
      },
      globals: {
        browser: true,
        node: true,
      },
    },
    plugins: {
      local: {
        rules: {
          "no-unsafe-map": noUnsafeMapRule,
        },
      },
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "local/no-unsafe-map": "error",
      // you can add TS-specific rules here if desired
    },
  },
];
