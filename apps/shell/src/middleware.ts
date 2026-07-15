import { defineMiddleware } from 'astro:middleware';
import { authorizeLocalRequest } from './lib/server/request-auth.js';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' ws: wss: https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.xethub.hf.co",
].join('; ');

function refusal(request: Request, status: number, reason: string): Response {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return Response.json({ error: reason }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  return new Response(reason, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const decision = authorizeLocalRequest(request);
  if (!decision.ok) return refusal(request, decision.status, decision.reason);

  const response = await next();
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  if (new URL(request.url).pathname.startsWith('/w/') || new URL(request.url).pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
});
