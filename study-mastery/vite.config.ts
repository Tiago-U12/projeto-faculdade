/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { offlinePrecache } from './tools/pwa';
import { reactSandboxRuntime } from './tools/react-runtime';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// base relativa: o build funciona em qualquer subcaminho (ex.: GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react(), reactSandboxRuntime(), offlinePrecache(version)],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { chunkSizeWarningLimit: 900 },
  test: {
    // testes de componentes declaram o ambiente no próprio arquivo (// @vitest-environment jsdom)
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts', 'tests/db/**/*.test.ts', 'tests/functions/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
