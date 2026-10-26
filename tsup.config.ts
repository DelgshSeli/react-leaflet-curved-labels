import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
};

export default defineConfig([
  // Components: marked as client code for React Server Components frameworks (Next.js app router)
  { ...shared, entry: { index: 'src/index.ts' }, clean: true, banner: { js: '"use client";' } },
  { ...shared, entry: { server: 'src/server.ts' }, clean: false },
]);
