import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { ArtifactAddress, WorkspaceId } from '@sillpak/contracts';
import { WorkspacePathError } from './errors.js';

const LOCAL_WORKSPACE: WorkspaceId = 'local';

export function workspaceGeneration(): number {
  const value = Number(process.env.SILLPAK_WORKSPACE_GENERATION ?? '1');
  if (!Number.isSafeInteger(value) || value < 1) {
    throw WorkspacePathError('workspaceGeneration', String(value), 'workspace generation must be a positive integer');
  }
  return value;
}

export function workspaceRoot(workspace: string): string {
  if (workspace !== LOCAL_WORKSPACE) {
    throw WorkspacePathError('workspaceRoot', workspace, 'only the concrete local workspace exists in v1');
  }
  return resolve(process.env.SILLPAK_WORKSPACE_ROOT ?? process.cwd());
}

export function decodeRouteSegments(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw.split('/').map((encoded) => {
    let value: string;
    try {
      value = decodeURIComponent(encoded);
    } catch (cause) {
      throw WorkspacePathError('decodeRouteSegments', raw, 'invalid percent encoding', cause);
    }
    if (!value || value === '.' || value === '..' || value.includes('\0') || value.includes('/') || value.includes('\\')) {
      throw WorkspacePathError('decodeRouteSegments', raw, `unsafe path segment ${JSON.stringify(value)}`);
    }
    return value;
  });
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export async function resolveExistingAddress(workspace: string, rawPath: string | undefined): Promise<{
  readonly address: ArtifactAddress;
  readonly root: string;
  readonly absolutePath: string;
}> {
  const root = await realpath(workspaceRoot(workspace));
  const segments = decodeRouteSegments(rawPath);
  const lexicalCandidate = resolve(root, ...segments);
  if (!isWithin(root, lexicalCandidate)) {
    throw WorkspacePathError('resolveExistingAddress', lexicalCandidate, 'path escapes workspace root');
  }
  let absolutePath: string;
  try {
    absolutePath = await realpath(lexicalCandidate);
    await stat(absolutePath);
  } catch (cause) {
    throw WorkspacePathError('resolveExistingAddress', lexicalCandidate, 'artifact does not exist', cause);
  }
  if (!isWithin(root, absolutePath)) {
    throw WorkspacePathError('resolveExistingAddress', absolutePath, 'symlink resolves outside workspace root');
  }
  return { address: { workspace: LOCAL_WORKSPACE, segments }, root, absolutePath };
}

export function routeFor(address: ArtifactAddress): string {
  const path = address.segments.map(encodeURIComponent).join('/');
  return `/w/${address.workspace}${path ? `/${path}` : ''}`;
}

export function apiPath(prefix: string, address: ArtifactAddress): string {
  const path = address.segments.map(encodeURIComponent).join('/');
  return `${prefix}/${address.workspace}${path ? `/${path}` : ''}`;
}
