#!/usr/bin/env node
// Watcher con live reload para index.html (sin dependencias).
// Uso: node watch.js [puerto]   →  http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const RELOAD_SNIPPET = `<script>
new EventSource('/__reload').onmessage = () => location.reload();
</script>`;

const clients = new Set();

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') {
      data = Buffer.from(data.toString().replace('</body>', `${RELOAD_SNIPPET}</body>`));
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

let timer;
fs.watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith('.git') || filename.startsWith('node_modules')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`[${new Date().toLocaleTimeString()}] cambio: ${filename}`);
    for (const res of clients) res.write('data: reload\n\n');
  }, 80);
});

server.listen(PORT, () => {
  console.log(`Sirviendo ${ROOT}\nhttp://localhost:${PORT}  (Ctrl+C para salir)`);
});
