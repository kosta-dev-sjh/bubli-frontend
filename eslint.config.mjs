import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "src-tauri/target/**"],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
