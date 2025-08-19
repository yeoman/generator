import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    dangerouslyIgnoreUnhandledErrors: true,
  },
});
