/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o build funciona em qualquer subcaminho (ex.: GitHub Pages) e em arquivo local.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    // testes de componentes declaram o ambiente no próprio arquivo (// @vitest-environment jsdom)
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
