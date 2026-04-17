import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./vitest/setup.js'],
      include: ['src/**/*.{test,spec}.{js,jsx}', 'tests/**/*.{test,spec}.{js,jsx}'],
      exclude: ['node_modules', 'dist', 'server'],
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['src/**/*.{js,jsx,vue}'],
        exclude: ['src/main.js', 'src/**/*.test.js', 'src/**/*.spec.js'],
        thresholds: {
          lines: 50,
          functions: 50,
          branches: 40,
          statements: 50,
        },
      },
      mockReset: true,
      restoreMocks: true,
    },
  }),
)
