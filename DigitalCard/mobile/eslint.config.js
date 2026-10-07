const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = defineConfig([
  expoConfig,
  // React Compiler rules (the compiler is on: app.config.ts → experiments.reactCompiler)
  { rules: reactHooks.configs.flat.recommended.rules },
  { ignores: ['dist*/*', 'android/*', 'ios/*'] },
]);
