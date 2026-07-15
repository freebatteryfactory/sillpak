import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type {
  ArtifactAddress,
  ArtifactDescriptor,
  ArtifactKind,
  DirectoryEntry,
} from '@sillpak/contracts';
import { apiPath, routeFor } from './path-policy.js';
import { capabilitiesFor } from './artifact-capabilities.js';

const codeExtensions = new Set([
  '.astro', '.c', '.cc', '.cpp', '.cs', '.css', '.go', '.h', '.hpp', '.html', '.java', '.js', '.jsx',
  '.kt', '.lua', '.mdx', '.mjs', '.php', '.py', '.rb', '.rs', '.sh', '.sql', '.svelte', '.swift', '.toml', '.ts',
  '.tsx', '.vue', '.xml', '.yaml', '.yml', '.zig',
]);
const textExtensions = new Set(['.txt', '.log', '.ini', '.env', '.gitignore', '.csv']);
const imageExtensions = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const audioExtensions = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav']);
const videoExtensions = new Set(['.m4v', '.mkv', '.mov', '.mp4', '.webm']);
const archiveExtensions = new Set(['.7z', '.gz', '.rar', '.tar', '.tgz', '.zip']);

export function detectArtifactKind(name: string, isDirectory = false): ArtifactKind {
  if (isDirectory) return 'directory';
  const extension = extname(name).toLowerCase();
  if (extension === '.md') return 'markdown';
  if (extension === '.json') return 'json';
  if (extension === '.docx') return 'docx';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.xlsx' || extension === '.xlsm' || extension === '.ods' || extension === '.csv') return 'spreadsheet';
  if (imageExtensions.has(extension)) return 'image';
  if (audioExtensions.has(extension)) return 'audio';
  if (videoExtensions.has(extension)) return 'video';
  if (archiveExtensions.has(extension)) return 'archive';
  if (codeExtensions.has(extension)) return 'code';
  if (textExtensions.has(extension) || extension === '') return 'text';
  return 'unknown';
}

function mimeFor(kind: ArtifactKind, extension: string): string {
  if (kind === 'markdown' || kind === 'text' || kind === 'code') return 'text/plain; charset=utf-8';
  if (kind === 'json') return 'application/json';
  if (kind === 'pdf') return 'application/pdf';
  if (kind === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (kind === 'spreadsheet' && extension === '.csv') return 'text/csv; charset=utf-8';
  if (kind === 'spreadsheet') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (kind === 'image') {
    if (extension === '.jpg') return 'image/jpeg';
    if (extension === '.svg') return 'image/svg+xml';
    return `image/${extension.replace('.', '') || 'png'}`;
  }
  if (kind === 'audio') {
    if (extension === '.mp3') return 'audio/mpeg';
    if (extension === '.m4a') return 'audio/mp4';
    return `audio/${extension.replace('.', '') || 'mpeg'}`;
  }
  if (kind === 'video') {
    if (extension === '.m4v') return 'video/mp4';
    if (extension === '.mkv') return 'video/x-matroska';
    return `video/${extension.replace('.', '') || 'mp4'}`;
  }
  return 'application/octet-stream';
}

export async function describeArtifact(absolutePath: string, address: ArtifactAddress): Promise<ArtifactDescriptor> {
  const info = await stat(absolutePath);
  const name = address.segments.at(-1) ?? basename(absolutePath);
  const extension = extname(name).toLowerCase();
  const kind = detectArtifactKind(name, info.isDirectory());
  return {
    address,
    kind,
    name,
    extension,
    mime: mimeFor(kind, extension),
    size: info.size,
    modifiedAt: info.mtime.toISOString(),
    route: routeFor(address),
    ...(info.isDirectory() ? {} : { rawUrl: apiPath('/api/raw', address) }),
    capabilities: capabilitiesFor(kind, extension),
  };
}

export async function listDirectory(absolutePath: string, address: ArtifactAddress): Promise<readonly DirectoryEntry[]> {
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const rows = await Promise.all(entries.map(async (entry): Promise<DirectoryEntry> => {
    const childAddress: ArtifactAddress = { ...address, segments: [...address.segments, entry.name] };
    const childPath = join(absolutePath, entry.name);
    // Do not follow directory symlinks while listing. A route click still passes
    // through resolveExistingAddress(), which refuses symlink escapes before reading.
    const info = await lstat(childPath);
    const extension = extname(entry.name).toLowerCase();
    return {
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
      artifactKind: detectArtifactKind(entry.name, entry.isDirectory()),
      extension,
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      route: routeFor(childAddress),
    };
  }));
  return rows.sort((a, b) => {
    if (a.kind === 'directory' && b.kind !== 'directory') return -1;
    if (a.kind !== 'directory' && b.kind === 'directory') return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function readText(absolutePath: string, maximumBytes = 4 * 1024 * 1024): Promise<string> {
  const info = await stat(absolutePath);
  if (info.size > maximumBytes) throw new Error(`Text preview limit exceeded: ${info.size} bytes`);
  return readFile(absolutePath, 'utf8');
}
