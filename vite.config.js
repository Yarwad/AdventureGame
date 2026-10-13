import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function roomSavePlugin() {
  return {
    name: 'room-save',
    configureServer(server) {
      server.middlewares.use('/__save-room', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { roomId, patch } = JSON.parse(body);
            if (!roomId || typeof roomId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(roomId)) {
              res.statusCode = 400;
              res.end('invalid roomId');
              return;
            }
            const filePath = resolve('public/rooms', `${roomId}.json`);
            if (!existsSync(filePath)) {
              res.statusCode = 404;
              res.end('room not found');
              return;
            }
            const existing = JSON.parse(readFileSync(filePath, 'utf8'));
            const merged = { ...existing, ...patch };
            writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e?.message || e));
          }
        });
      });
    },
  };
}

function assetSavePlugin() {
  const ALLOWED_FOLDERS = ['rooms', 'characters', 'items', 'backgrounds', 'assets'];
  return {
    name: 'asset-save',
    configureServer(server) {
      server.middlewares.use('/__save-asset', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { folder, filename, dataUrl } = JSON.parse(body);
            if (!ALLOWED_FOLDERS.includes(folder)) {
              res.statusCode = 400;
              res.end('invalid folder');
              return;
            }
            if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) {
              res.statusCode = 400;
              res.end('invalid filename');
              return;
            }
            const m = String(dataUrl || '').match(/^data:image\/png;base64,(.+)$/);
            if (!m) { res.statusCode = 400; res.end('invalid dataUrl'); return; }
            const buf = Buffer.from(m[1], 'base64');
            const filePath = resolve('public', folder, filename);
            writeFileSync(filePath, buf);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: `public/${folder}/${filename}` }));
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e?.message || e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [roomSavePlugin(), assetSavePlugin()],
});
