// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  // Name the React version so eslint-plugin-react doesn't try to detect it (its detector fails on ESLint 10).
  { settings: { react: { version: "19.3" } } },
  { ignores: ["dist/*", "android/*", "ios/*", ".expo/*"] },
]);
