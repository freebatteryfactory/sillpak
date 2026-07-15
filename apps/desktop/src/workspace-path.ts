import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { ArtifactAddress } from '@sillpak/contracts';

export function isPathWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export async function canonicalWorkspaceRoot(path: string): Promise<string> {
  const root = await realpath(resolve(path));
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error('workspace root is not a directory');
  return root;
}

export async function resolveWorkspaceArtifact(rootPath: string, address: ArtifactAddress): Promise<string> {
  const root = await canonicalWorkspaceRoot(rootPath);
  const lexicalCandidate = resolve(root, ...address.segments);
  if (!isPathWithin(root, lexicalCandidate)) throw new Error('artifact address escapes the workspace');
  const candidate = await realpath(lexicalCandidate);
  await stat(candidate);
  if (!isPathWithin(root, candidate)) throw new Error('artifact symlink resolves outside the workspace');
  return candidate;
}

export async function assertWorkspaceDirectory(rootPath: string, path: string): Promise<string> {
  const root = await canonicalWorkspaceRoot(rootPath);
  const candidate = await realpath(path);
  if (!isPathWithin(root, candidate)) throw new Error('terminal cwd is outside the active workspace');
  const info = await stat(candidate);
  if (!info.isDirectory()) throw new Error('terminal cwd is not a directory');
  return candidate;
}

export async function resolveWorkspaceDirectory(rootPath: string, address: ArtifactAddress): Promise<string> {
  const candidate = await resolveWorkspaceArtifact(rootPath, address);
  const info = await stat(candidate);
  if (!info.isDirectory()) throw new Error('terminal address is not a directory');
  return candidate;
}
