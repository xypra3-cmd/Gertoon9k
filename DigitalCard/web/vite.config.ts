import { defineConfig } from 'vitest/config';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // React Compiler memoizes components and hooks at build time (no manual useMemo/useCallback).
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${r('./src')}/` },
      // sub-path imports keep zod (validation) out of the public card bundle
      { find: /^@digitalcard\/shared\/(.+)$/, replacement: `${r('../packages/shared/src')}/$1` },
      { find: /^@digitalcard\/shared$/, replacement: r('../packages/shared/src/index.ts') },
      // single zod instance for web + shared
      { find: /^zod$/, replacement: r('./node_modules/zod') },
    ],
  },
  // host: true → listen on IPv4 too, so the Android emulator (10.0.2.2) and phones on the LAN can reach it
  server: { port: 5173, host: true, fs: { allow: ['..'] } },
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
