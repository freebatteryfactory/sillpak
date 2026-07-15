import type { APIRoute } from 'astro';
import { renderDocxHtml, projectWorkbook } from '../../../../lib/server/projections.js';
import { describeArtifact } from '../../../../lib/server/artifacts.js';
import { resolveExistingAddress } from '../../../../lib/server/path-policy.js';

export const GET: APIRoute = async ({ params }) => {
  try {
    const resolved = await resolveExistingAddress(params.workspace ?? 'local', params.path);
    const descriptor = await describeArtifact(resolved.absolutePath, resolved.address);
    if (descriptor.kind === 'docx') {
      const html = await renderDocxHtml(resolved.absolutePath);
      return Response.json({ type: 'docx-html', html }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (descriptor.kind === 'spreadsheet') {
      const sheets = await projectWorkbook(resolved.absolutePath);
      return Response.json({ type: 'workbook', sheets }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: `No structured projection for ${descriptor.kind}` }, { status: 415 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'projection failed' }, { status: 500 });
  }
};
