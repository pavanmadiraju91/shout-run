import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: {
    compilerOptions: {
      composite: false,
      declaration: true,
      declarationMap: false,
    },
  },
  clean: true,
  splitting: false,
  noExternal: ['@shout/shared'],
  external: ['node:events', 'ws'],
});
