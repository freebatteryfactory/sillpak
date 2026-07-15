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
  server: { host: '127.0.0.1', port: 4321 },
  vite: {
    ssr: {
      noExternal: ['mammoth', 'exceljs'],
    },
  },
});
