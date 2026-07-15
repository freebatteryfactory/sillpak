import type {
  ArtifactAddress,
  TerminalHostEvent,
  TerminalOpenRequest,
  TerminalProfileId,
  TerminalSessionId,
  WorkspaceId,
} from '@sillpak/contracts';

export const TERMINAL_PROTOCOL_VERSION = 2 as const;

export const channels = {
  terminalCommand: 'sillpak:terminal-command',
  terminalEvent: 'sillpak:terminal-event',
  chooseWorkspace: 'sillpak:choose-workspace',
  revealArtifact: 'sillpak:reveal-artifact',
  openArtifact: 'sillpak:open-artifact',
  workspaceChanged: 'sillpak:workspace-changed',
} as const;

export type TerminalRendererCommand =
  | { readonly type: 'open'; readonly request: TerminalOpenRequest }
  | { readonly type: 'restart'; readonly sessionId: TerminalSessionId }
  | { readonly type: 'write'; readonly sessionId: TerminalSessionId; readonly data: string }
  | { readonly type: 'resize'; readonly sessionId: TerminalSessionId; readonly cols: number; readonly rows: number }
  | { readonly type: 'detach'; readonly sessionId: TerminalSessionId }
  | { readonly type: 'kill'; readonly sessionId: TerminalSessionId };

export interface ResolvedTerminalLaunch {
  readonly sessionId: TerminalSessionId;
  readonly processGeneration: number;
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly cols: number;
  readonly rows: number;
  readonly env: Readonly<Record<string, string>>;
}

export type PtyHostCommand =
  | { readonly protocolVersion: 2; readonly type: 'spawn'; readonly request: ResolvedTerminalLaunch }
  | { readonly protocolVersion: 2; readonly type: 'restart'; readonly request: ResolvedTerminalLaunch }
  | { readonly protocolVersion: 2; readonly type: 'write'; readonly sessionId: TerminalSessionId; readonly processGeneration: number; readonly data: string }
  | { readonly protocolVersion: 2; readonly type: 'resize'; readonly sessionId: TerminalSessionId; readonly processGeneration: number; readonly cols: number; readonly rows: number }
  | { readonly protocolVersion: 2; readonly type: 'kill'; readonly sessionId: TerminalSessionId; readonly processGeneration: number };

export type PtyHostEvent =
  | { readonly type: 'ready'; readonly sessionId: TerminalSessionId; readonly processGeneration: number; readonly pid: number }
  | { readonly type: 'data'; readonly sessionId: TerminalSessionId; readonly processGeneration: number; readonly data: string }
  | { readonly type: 'exit'; readonly sessionId: TerminalSessionId; readonly processGeneration: number; readonly exitCode: number; readonly signal?: number }
  | { readonly type: 'error'; readonly sessionId?: TerminalSessionId; readonly processGeneration?: number; readonly code: string; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isSessionId(value: unknown): value is TerminalSessionId {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

function isDimension(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 1_000;
}

export function isArtifactAddress(value: unknown): value is ArtifactAddress {
  if (!isRecord(value) || value.workspace !== 'local' || !Array.isArray(value.segments)) return false;
  return value.segments.length <= 512 && value.segments.every((segment) =>
    typeof segment === 'string'
    && segment.length > 0
    && segment.length <= 255
    && segment !== '.'
    && segment !== '..'
    && !segment.includes('/')
    && !segment.includes('\\')
    && !segment.includes('\0'));
}

function isTerminalProfileId(value: unknown): value is TerminalProfileId {
  return value === 'default';
}

function isWorkspaceId(value: unknown): value is WorkspaceId {
  return value === 'local';
}

export function isTerminalOpenRequest(value: unknown): value is TerminalOpenRequest {
  if (!isRecord(value)) return false;
  return isSessionId(value.sessionId)
    && isTerminalProfileId(value.profileId)
    && isWorkspaceId(value.workspaceId)
    && Number.isSafeInteger(value.workspaceGeneration)
    && Number(value.workspaceGeneration) >= 1
    && isArtifactAddress(value.initialAddress)
    && value.initialAddress.workspace === value.workspaceId
    && isDimension(value.cols)
    && isDimension(value.rows);
}

export function isTerminalRendererCommand(value: unknown): value is TerminalRendererCommand {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'open') return isTerminalOpenRequest(value.request);
  if (value.type === 'restart' || value.type === 'detach' || value.type === 'kill') return isSessionId(value.sessionId);
  if (value.type === 'write') {
    return isSessionId(value.sessionId) && typeof value.data === 'string' && utf8Length(value.data) <= 64 * 1024;
  }
  if (value.type === 'resize') return isSessionId(value.sessionId) && isDimension(value.cols) && isDimension(value.rows);
  return false;
}

function isResolvedTerminalLaunch(value: unknown): value is ResolvedTerminalLaunch {
  if (!isRecord(value)) return false;
  return isSessionId(value.sessionId)
    && Number.isSafeInteger(value.processGeneration)
    && Number(value.processGeneration) >= 1
    && typeof value.executable === 'string'
    && value.executable.length > 0
    && Array.isArray(value.args)
    && value.args.every((item) => typeof item === 'string')
    && typeof value.cwd === 'string'
    && value.cwd.length > 0
    && isDimension(value.cols)
    && isDimension(value.rows)
    && isRecord(value.env)
    && Object.values(value.env).every((item) => typeof item === 'string');
}

export function isPtyHostCommand(value: unknown): value is PtyHostCommand {
  if (!isRecord(value) || value.protocolVersion !== TERMINAL_PROTOCOL_VERSION || typeof value.type !== 'string') return false;
  if (value.type === 'spawn' || value.type === 'restart') return isResolvedTerminalLaunch(value.request);
  if (!isSessionId(value.sessionId) || !Number.isSafeInteger(value.processGeneration) || Number(value.processGeneration) < 1) return false;
  if (value.type === 'write') return typeof value.data === 'string' && utf8Length(value.data) <= 64 * 1024;
  if (value.type === 'resize') return isDimension(value.cols) && isDimension(value.rows);
  return value.type === 'kill';
}

export function isPtyHostEvent(value: unknown): value is PtyHostEvent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'error') {
    const sessionValid = value.sessionId === undefined || isSessionId(value.sessionId);
    const generationValid = value.processGeneration === undefined
      || (Number.isSafeInteger(value.processGeneration) && Number(value.processGeneration) >= 1);
    return sessionValid
      && generationValid
      && typeof value.code === 'string'
      && value.code.length > 0
      && typeof value.message === 'string';
  }
  if (!isSessionId(value.sessionId)
    || !Number.isSafeInteger(value.processGeneration)
    || Number(value.processGeneration) < 1) return false;
  if (value.type === 'ready') return Number.isSafeInteger(value.pid) && Number(value.pid) > 0;
  if (value.type === 'data') return typeof value.data === 'string';
  if (value.type === 'exit') {
    return Number.isInteger(value.exitCode)
      && (value.signal === undefined || Number.isInteger(value.signal));
  }
  return false;
}

export type { TerminalHostEvent };
