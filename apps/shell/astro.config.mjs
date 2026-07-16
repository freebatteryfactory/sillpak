import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { integration as liteship } from '@czap/astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'middleware' }),
  integrations: [
    liteship({
      detect: true,
      middleware: true,
      inspector: true,
      stream: { enabled: false },
      llm: { enabled: false },
      gpu: { enabled: false },
      workers: { enabled: false },
      wasm: { enabled: false },
      motion: { enabled: false },
      security: { htmlPolicy: 'sanitized-html' },
    }),
  ],
  server: { host: '127.0.0.1', port: Number(process.env.SILLPAK_DEV_PORT ?? '4321') },
  vite: {
    ssr: {
      // Bundle every server dependency so the packaged desktop app ships a
      // self-contained SSR server with no runtime node_modules to resolve
      // (Node's ESM loader cannot resolve packages from inside an asar).
      noExternal: true,
    },
  },
});
