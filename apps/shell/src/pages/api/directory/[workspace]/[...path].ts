import type { APIRoute } from 'astro';
import { listDirectory } from '../../../../lib/server/artifacts.js';
import { resolveExistingAddress } from '../../../../lib/server/path-policy.js';

export const GET: APIRoute = async ({ params }) => {
  try {
    const resolved = await resolveExistingAddress(params.workspace ?? 'local', params.path);
    const entries = await listDirectory(resolved.absolutePath, resolved.address);
    return Response.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'directory read failed' }, { status: 404 });
  }
};
