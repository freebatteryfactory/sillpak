import type { APIRoute } from 'astro';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { describeArtifact } from '../../../../lib/server/artifacts.js';
import { resolveExistingAddress } from '../../../../lib/server/path-policy.js';

import { parseByteRange } from '../../../../lib/server/byte-range.js';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const resolved = await resolveExistingAddress(params.workspace ?? 'local', params.path);
    const descriptor = await describeArtifact(resolved.absolutePath, resolved.address);
    if (descriptor.kind === 'directory') {
      return Response.json({ error: 'directories do not have a raw byte stream' }, { status: 415 });
    }
    const info = await stat(resolved.absolutePath);
    const requestedRange = request.headers.get('range');
    const range = parseByteRange(requestedRange, info.size);
    if (requestedRange && !range) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    }
    const stream = createReadStream(resolved.absolutePath, range ? { start: range.start, end: range.end } : undefined);
    const length = range ? range.end - range.start + 1 : info.size;
    const headers = new Headers({
      'Content-Type': descriptor.mime,
      'Content-Length': String(length),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(descriptor.name)}`,
    });
    if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'read failed' }, { status: 404 });
  }
};
