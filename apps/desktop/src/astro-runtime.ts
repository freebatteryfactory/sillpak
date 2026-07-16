import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
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

  // Astro 7's node adapter in middleware mode emits dist/server/index.mjs.
  const entry = resolve(appRoot, 'apps/shell/dist/server/index.mjs');
  const module = await import(pathToFileURL(entry).href) as { readonly handler: AstroNodeHandler };
  let expectedHost = '';
  const server: Server = createServer((request, response) => {
    if (!expectedHost || request.headers.host !== expectedHost) {
      refuseHost(response);
      return;
    }
    void Promise.resolve(module.handler(request, response)).catch((error: unknown) => {
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
