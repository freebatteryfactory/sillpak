import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface AstroRuntimeSecurity {
  readonly controlToken: string;
  readonly sessionToken: string;
}

export interface AstroRuntime {
  readonly url: string;
  readonly origin: string;
  readonly expectedHost: string;
  close(): Promise<void>;
}

type AstroNodeHandler = (request: IncomingMessage, response: ServerResponse, next?: () => void) => void | Promise<void>;

const staticContentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

// The node adapter runs in middleware mode, so the built client assets in
// apps/shell/dist/client are this server's responsibility, not Astro's.
async function serveClientAsset(
  clientRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://sillpak.invalid').pathname);
  } catch {
    return false;
  }
  if (pathname === '/' || pathname.includes('\0')) return false;
  const candidate = resolve(clientRoot, `.${pathname.replaceAll('\\', '/')}`);
  if (candidate !== clientRoot && !candidate.startsWith(`${clientRoot}${sep}`)) return false;
  let info;
  try {
    info = await stat(candidate);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  response.statusCode = 200;
  response.setHeader('Content-Type', staticContentTypes[extname(candidate).toLowerCase()] ?? 'application/octet-stream');
  response.setHeader('Content-Length', info.size);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  // Hashed build assets are immutable; everything else stays revalidated.
  response.setHeader(
    'Cache-Control',
    pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  );
  if (request.method === 'HEAD') {
    response.end();
    return true;
  }
  await new Promise<void>((resolveDone, reject) => {
    const stream = createReadStream(candidate);
    stream.once('error', reject);
    response.once('close', resolveDone);
    stream.pipe(response);
  });
  return true;
}

function refuseHost(response: ServerResponse): void {
  response.statusCode = 421;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end('request host does not match the bound local origin');
}

export async function startAstroRuntime(
  workspaceRoot: string,
  appRoot: string,
  security: AstroRuntimeSecurity,
): Promise<AstroRuntime> {
  process.env.SILLPAK_WORKSPACE_ROOT = workspaceRoot;
  process.env.SILLPAK_CONTROL_TOKEN = security.controlToken;
  process.env.SILLPAK_SESSION_TOKEN = security.sessionToken;
  process.env.ASTRO_NODE_AUTOSTART = 'disabled';

  // In a packaged app the app root is resources/app.asar; the shell build is
  // asar-unpacked because Node's ESM loader cannot import from the archive.
  const fileRoot = appRoot.endsWith('.asar') ? `${appRoot}.unpacked` : appRoot;
  // Astro 7's node adapter in middleware mode emits dist/server/index.mjs.
  const entry = resolve(fileRoot, 'apps/shell/dist/server/index.mjs');
  const clientRoot = resolve(fileRoot, 'apps/shell/dist/client');
  const module = await import(pathToFileURL(entry).href) as { readonly handler: AstroNodeHandler };
  let expectedHost = '';
  const server: Server = createServer((request, response) => {
    if (!expectedHost || request.headers.host !== expectedHost) {
      refuseHost(response);
      return;
    }
    const respond = async () => {
      if (await serveClientAsset(clientRoot, request, response)) return;
      await module.handler(request, response);
    };
    void respond().catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }
      response.statusCode = 500;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end('local application server failed');
    });
  });

  await new Promise<void>((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveReady());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Astro runtime did not bind a TCP port');

  expectedHost = `127.0.0.1:${address.port}`;
  const origin = `http://${expectedHost}`;
  process.env.SILLPAK_EXPECTED_HOST = expectedHost;
  process.env.SILLPAK_ALLOWED_ORIGIN = origin;

  return {
    url: origin,
    origin,
    expectedHost,
    close: () => new Promise<void>((resolveClose, reject) => {
      server.close((error) => error ? reject(error) : resolveClose());
    }),
  };
}
