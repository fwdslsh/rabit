import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte(),
    // Serve examples directory at /examples/
    {
      name: 'serve-examples',
      configureServer(server) {
        server.middlewares.use('/examples', (req, res, next) => {
          // Serve from examples directory
          const filePath = resolve(__dirname, '../../examples', req.url?.slice(1) || '');
          import('fs').then(fs => {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath);
              const ext = filePath.split('.').pop();
              const mimeTypes: Record<string, string> = {
                'json': 'application/json',
                'md': 'text/markdown',
                'txt': 'text/plain',
                'html': 'text/html'
              };
              res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
            } else {
              next();
            }
          });
        });
      }
    }
  ],
  server: {
    fs: {
      allow: ['..', '../../examples']
    }
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['svelte', 'svelte/internal']
    }
  }
});
