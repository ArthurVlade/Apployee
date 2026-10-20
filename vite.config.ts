import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function binaryDownloadPlugin(): Plugin {
  return {
    name: 'binary-download-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const urlPath = rawUrl.split('?')[0];

        if (urlPath.startsWith('/downloads/') || urlPath.startsWith('/api/download')) {
          let filename = '';
          if (urlPath.startsWith('/downloads/')) {
            filename = decodeURIComponent(urlPath.replace('/downloads/', ''));
          } else {
            const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
            filename = parsedUrl.searchParams.get('file') || 'Apploye-Tracker-Setup.exe';
          }

          // Security check to avoid directory traversal
          filename = path.basename(filename);
          const filePath = path.resolve(__dirname, 'public/downloads', filename);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const stat = fs.statSync(filePath);
            const isExe = filename.endsWith('.exe');
            const isZip = filename.endsWith('.zip');

            res.writeHead(200, {
              'Content-Type': isExe
                ? 'application/vnd.microsoft.portable-executable'
                : isZip
                ? 'application/zip'
                : 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*'
            });

            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), binaryDownloadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
