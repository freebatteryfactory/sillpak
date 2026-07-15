import { timingSafeEqual } from 'node:crypto';

export const SILLPAK_SESSION_COOKIE = 'sillpak_session';

export interface LocalRequestSecurityConfig {
  readonly expectedHost: string;
  readonly allowedOrigin: string;
  readonly sessionToken: string;
  readonly controlToken: string;
}

export type LocalRequestDecision =
  | { readonly ok: true; readonly authenticatedBy: 'none' | 'session-cookie' | 'bearer-token' }
  | { readonly ok: false; readonly status: 401 | 403 | 415 | 421 | 503; readonly reason: string };

function safeEqualText(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const raw = part.slice(index + 1).trim();
    try { return decodeURIComponent(raw); }
    catch { return undefined; }
  }
  return undefined;
}

function bearerValue(header: string | null): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  const value = header.slice('Bearer '.length);
  return value.length > 0 ? value : undefined;
}

export function isProtectedLocalPath(pathname: string): boolean {
  return pathname === '/w' || pathname.startsWith('/w/') || pathname === '/api' || pathname.startsWith('/api/');
}

export function localRequestSecurityFromEnv(): LocalRequestSecurityConfig | undefined {
  const expectedHost = process.env.SILLPAK_EXPECTED_HOST;
  const allowedOrigin = process.env.SILLPAK_ALLOWED_ORIGIN;
  const sessionToken = process.env.SILLPAK_SESSION_TOKEN;
  const controlToken = process.env.SILLPAK_CONTROL_TOKEN;
  if (!expectedHost || !allowedOrigin || !sessionToken || !controlToken) return undefined;
  return { expectedHost, allowedOrigin, sessionToken, controlToken };
}

export function authorizeLocalRequest(
  request: Request,
  config: LocalRequestSecurityConfig | undefined = localRequestSecurityFromEnv(),
): LocalRequestDecision {
  if (!config) return { ok: false, status: 503, reason: 'local request security is not configured' };

  const host = request.headers.get('host');
  if (!host || !safeEqualText(host, config.expectedHost)) {
    return { ok: false, status: 421, reason: 'request host does not match the bound local origin' };
  }

  const url = new URL(request.url);
  if (!isProtectedLocalPath(url.pathname)) return { ok: true, authenticatedBy: 'none' };

  const session = cookieValue(request.headers.get('cookie'), SILLPAK_SESSION_COOKIE);
  const bearer = bearerValue(request.headers.get('authorization'));
  const sessionAuthorized = session !== undefined && safeEqualText(session, config.sessionToken);
  const bearerAuthorized = bearer !== undefined && safeEqualText(bearer, config.controlToken);
  if (!sessionAuthorized && !bearerAuthorized) {
    return { ok: false, status: 401, reason: 'local workspace request is not authorized' };
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return { ok: false, status: 403, reason: 'cross-site local workspace request refused' };
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (!origin || !safeEqualText(origin, config.allowedOrigin)) {
      return { ok: false, status: 403, reason: 'mutation origin does not match the bound local origin' };
    }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
      if (contentType !== 'application/json') {
        return { ok: false, status: 415, reason: 'local API mutations require application/json' };
      }
    }
  }

  return { ok: true, authenticatedBy: bearerAuthorized ? 'bearer-token' : 'session-cookie' };
}
