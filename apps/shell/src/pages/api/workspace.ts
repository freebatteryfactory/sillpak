import type { APIRoute } from 'astro';
import { realpath, stat } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';

function authorized(header: string | null): boolean {
  const expected = process.env.SILLPAK_CONTROL_TOKEN;
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const actual = header.slice('Bearer '.length);
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export const PUT: APIRoute = async ({ request }) => {
  if (!authorized(request.headers.get('authorization'))) {
    return Response.json({ error: 'workspace control is not authorized' }, { status: 401 });
  }
  try {
    const payload = await request.json() as { readonly path?: unknown; readonly generation?: unknown };
    if (typeof payload.path !== 'string' || payload.path.length === 0) {
      return Response.json({ error: 'path is required' }, { status: 400 });
    }
    if (!Number.isSafeInteger(payload.generation) || Number(payload.generation) < 1) {
      return Response.json({ error: 'positive workspace generation is required' }, { status: 400 });
    }
    const path = await realpath(payload.path);
    const info = await stat(path);
    if (!info.isDirectory()) return Response.json({ error: 'path is not a directory' }, { status: 400 });
    process.env.SILLPAK_WORKSPACE_ROOT = path;
    process.env.SILLPAK_WORKSPACE_GENERATION = String(payload.generation);
    return Response.json({ route: '/w/local', generation: payload.generation }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'workspace change failed' }, { status: 400 });
  }
};
