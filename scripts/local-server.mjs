/**
 * Local dev/demo server: the real API handlers + the production client
 * build, with game state in memory (no Redis, no env vars).
 *
 *   cd client && REACT_APP_API_URL= npm run build   # whenever the client changes
 *   npm run local                                   # play at http://localhost:5180
 *
 * (The explicit empty REACT_APP_API_URL beats client/.env.local's
 * localhost:3001, which is only right for the `vercel dev` workflow.)
 *
 * The in-memory store comes from --import scripts/register-memory-kv.mjs
 * (see package.json), which swaps lib/kv.js for scripts/kv-memory.mjs.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 5180;
const BUILD_DIR = fileURLToPath(new URL('../client/build', import.meta.url));

// (method, URL pattern) -> handler module. Mirrors Vercel's file routing.
const ROUTES = [
  ['POST', /^\/api\/games\/?$/, '../api/games/index.js', []],
  ['GET', /^\/api\/games\/([^/]+)\/?$/, '../api/games/[gameId]/index.js', ['gameId']],
  ['GET', /^\/api\/games\/([^/]+)\/teams\/?$/, '../api/games/[gameId]/teams.js', ['gameId']],
  ['POST', /^\/api\/games\/([^/]+)\/nextround\/?$/, '../api/games/[gameId]/nextround.js', ['gameId']],
  ['POST', /^\/api\/games\/([^/]+)\/restart\/?$/, '../api/games/[gameId]/restart.js', ['gameId']],
  ['GET', /^\/api\/games\/([^/]+)\/team\/([^/]+)\/?$/, '../api/games/[gameId]/team/[teamIndex]/index.js', ['gameId', 'teamIndex']],
  ['POST', /^\/api\/games\/([^/]+)\/team\/([^/]+)\/ready\/?$/, '../api/games/[gameId]/team/[teamIndex]/ready.js', ['gameId', 'teamIndex']],
  ['POST', /^\/api\/games\/([^/]+)\/team\/([^/]+)\/guess\/?$/, '../api/games/[gameId]/team/[teamIndex]/guess.js', ['gameId', 'teamIndex']],
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json', '.map': 'application/json', '.txt': 'text/plain',
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Just enough of Vercel's (req, res) helpers for the handlers
function vercelify(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  for (const [method, pattern, modulePath, paramNames] of ROUTES) {
    const match = url.pathname.match(pattern);
    if (match && req.method === method) {
      const { default: handler } = await import(modulePath);
      req.query = Object.fromEntries(
        paramNames.map((name, i) => [name, decodeURIComponent(match[i + 1])])
      );
      req.body = await readBody(req);
      try {
        await handler(req, vercelify(res));
      } catch (err) {
        console.error(`${req.method} ${url.pathname} failed:`, err);
        if (!res.writableEnded) vercelify(res).status(500).json({ error: 'Server error' });
      }
      return;
    }
  }

  if (url.pathname.startsWith('/api/')) {
    return vercelify(res).status(404).json({ error: 'Not found' });
  }

  // Static client build with SPA fallback
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(BUILD_DIR, safePath);
  try {
    const content = await readFile(filePath);
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(content);
  } catch {
    const index = await readFile(join(BUILD_DIR, 'index.html'));
    res.setHeader('Content-Type', 'text/html');
    res.end(index);
  }
});

server.listen(PORT, () => {
  console.log(`What the Word?! local server → http://localhost:${PORT}`);
});
