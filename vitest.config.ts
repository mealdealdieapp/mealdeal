import { defineConfig } from 'vitest/config'

// Eigene Vitest-Konfiguration, getrennt von vite.config.ts:
// reine Unit-Tests im Node-Environment, ohne React-Plugin/Proxy.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
