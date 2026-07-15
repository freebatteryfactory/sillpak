import type { APIRoute } from 'astro';
import { describeArtifact } from '../../../../lib/server/artifacts.js';
import { resolveExistingAddress } from '../../../../lib/server/path-policy.js';
import { saveTextAtomically, type TextSaveRequest } from '../../../../lib/server/save-text.js';

const maximumEditableBytes = 4 * 1024 * 1024;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > maximumEditableBytes * 2) {
      return Response.json({ error: 'save request is too large' }, { status: 413 });
    }
    const resolved = await resolveExistingAddress(params.workspace ?? 'local', params.path);
    const descriptor = await describeArtifact(resolved.absolutePath, resolved.address);
    if (!['text', 'code', 'json', 'markdown'].includes(descriptor.kind)) {
      return Response.json({ error: `Editing ${descriptor.kind} is not supported` }, { status: 415 });
    }
    const payload = await request.json() as Partial<TextSaveRequest>;
    if (typeof payload.content !== 'string' || typeof payload.expectedMtimeMs !== 'number') {
      return Response.json({ error: 'content and expectedMtimeMs are required' }, { status: 400 });
    }
    if (Buffer.byteLength(payload.content, 'utf8') > maximumEditableBytes) {
      return Response.json({ error: 'editable text is limited to 4 MiB' }, { status: 413 });
    }
    const result = await saveTextAtomically(resolved.absolutePath, payload as TextSaveRequest);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'save failed' }, { status: 409 });
  }
};
