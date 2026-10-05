import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // `const { id, ...rest } = row` drops a key on purpose; the dropped name isn't an unused variable.
  { rules: { "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }] } },
  // Import jobs hold database credentials: nothing outside src/jobs may
  // import them (v1 expansion, Section 3.11).
  {
    files: ["src/**"],
    ignores: ["src/jobs/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/jobs", "@/jobs/*", "**/jobs/*"], message: "Only src/jobs may import import-job code." }] },
      ],
    },
  },
  // Jobs run on plain Node, which doesn't understand the "@/" shortcut.
  {
    files: ["src/jobs/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/*"], message: "Use a relative import ending in .ts (jobs run on plain Node)." }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // A memory plugin's scratch files, not project code.
    ".remember/**",
  ]),
]);

export default eslintConfig;
