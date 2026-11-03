import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The server gates and serves dist/client itself. There is no Vite dev server in
// the running app, and no `define` or env prefix that could carry a server value in.
export default defineConfig({
  plugins: [react()],
  envPrefix: 'MC_PUBLIC_',
  build: { outDir: 'dist/client', emptyOutDir: true, sourcemap: false },
});
