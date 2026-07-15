import { rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface TextSaveRequest {
  readonly content: string;
  readonly expectedMtimeMs: number;
}

export async function saveTextAtomically(path: string, request: TextSaveRequest): Promise<{ readonly modifiedAt: string }> {
  const current = await stat(path);
  if (Math.abs(current.mtimeMs - request.expectedMtimeMs) > 1) {
    throw new Error('The file changed on disk after this page loaded. Reload before saving.');
  }
  const temporary = join(dirname(path), `.${randomUUID()}.sillpak-write`);
  try {
    await writeFile(temporary, request.content, { encoding: 'utf8', mode: current.mode });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  const next = await stat(path);
  return { modifiedAt: next.mtime.toISOString() };
}
