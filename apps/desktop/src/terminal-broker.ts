import type { WebContents } from 'electron';
import type {
  TerminalHostEvent,
  TerminalOpenRequest,
  TerminalSessionSnapshot,
  TerminalSessionState,
} from '@sillpak/contracts';
import {
  TERMINAL_PROTOCOL_VERSION,
  type PtyHostCommand,
  isPtyHostEvent,
  type PtyHostEvent,
  type ResolvedTerminalLaunch,
} from './protocol.js';

interface TerminalLaunchSpec extends Omit<ResolvedTerminalLaunch, 'processGeneration'> {}

/**
 * The broker's only link to the PTY utility process. The default runtime binds
 * this to an Electron `utilityProcess` (see `electron-pty-host-channel.ts`), but
 * the seam keeps the broker free of any Electron runtime import so its lifecycle
 * logic can be driven directly in a plain-Node regression test.
 */
export interface PtyHostChannel {
  post(command: PtyHostCommand): void;
  onMessage(listener: (event: unknown) => void): void;
  onExit(listener: (code: number) => void): void;
  kill(): void;
}

interface TerminalRecord {
  readonly request: TerminalOpenRequest;
  readonly launch: TerminalLaunchSpec;
  processGeneration: number;
  ownerId: number | undefined;
  state: TerminalSessionState;
  pid: number | undefined;
  startedAt: string | undefined;
  endedAt: string | undefined;
  exitCode: number | undefined;
  signal: number | undefined;
  lastSequence: number;
  replayChunks: string[];
  replayBytes: number;
  droppedOutputBytes: number;
  terminationRequested: boolean;
  endedNoticeSent: boolean;
}

type TerminalEventPayload =
  | { readonly type: 'ready'; readonly pid: number }
  | { readonly type: 'data'; readonly data: string }
  | { readonly type: 'replay'; readonly data: string; readonly droppedBytes: number }
  | { readonly type: 'output-truncated'; readonly droppedBytes: number }
  | { readonly type: 'exit'; readonly exitCode: number; readonly signal?: number }
  | { readonly type: 'error'; readonly code: string; readonly message: string };

const maximumReplayBytes = 2 * 1024 * 1024;

function compatible(existing: TerminalOpenRequest, incoming: TerminalOpenRequest): boolean {
  return existing.profileId === incoming.profileId
    && existing.workspaceId === incoming.workspaceId
    && existing.workspaceGeneration === incoming.workspaceGeneration;
}

export class TerminalBroker {
  private channel: PtyHostChannel | undefined;
  private readonly sessions = new Map<string, TerminalRecord>();
  private readonly contents = new Map<number, WebContents>();

  constructor(private readonly createChannel: () => PtyHostChannel) {}

  start(): void {
    if (this.channel) return;
    const channel = this.createChannel();
    this.channel = channel;
    channel.onMessage((value: unknown) => {
      if (!isPtyHostEvent(value)) {
        for (const record of this.sessions.values()) {
          this.emit(record, {
            type: 'error',
            code: 'malformed-pty-host-event',
            message: 'PTY host emitted an invalid protocol message',
          });
        }
        return;
      }
      this.handleHostEvent(value);
    });
    channel.onExit((code: number) => {
      this.channel = undefined;
      for (const record of this.sessions.values()) {
        if (record.state === 'exited' || record.state === 'killed') continue;
        record.state = 'failed';
        record.endedAt = new Date().toISOString();
        this.emit(record, {
          type: 'error',
          code: 'pty-host-exited',
          message: `PTY host exited with code ${code}`,
        });
      }
    });
  }

  registerWindow(contents: WebContents): () => void {
    this.contents.set(contents.id, contents);
    return () => this.detachOwner(contents.id);
  }

  open(owner: WebContents, request: TerminalOpenRequest, launch: TerminalLaunchSpec): TerminalSessionSnapshot {
    this.contents.set(owner.id, owner);
    const existing = this.sessions.get(request.sessionId);
    if (existing) {
      if (!compatible(existing.request, request)) {
        throw new Error('terminal session ID is already bound to a different workspace lease or profile');
      }
      if (existing.ownerId !== undefined && existing.ownerId !== owner.id) {
        throw new Error('terminal session is owned by another window');
      }
      existing.ownerId = owner.id;
      const snapshot = this.snapshot(existing);
      if (existing.replayBytes > 0 || existing.droppedOutputBytes > 0) {
        setImmediate(() => {
          if (existing.ownerId !== owner.id || owner.isDestroyed()) return;
          this.emit(existing, {
            type: 'replay',
            data: existing.replayChunks.join(''),
            droppedBytes: existing.droppedOutputBytes,
          });
        });
      }
      return snapshot;
    }

    const record: TerminalRecord = {
      request,
      launch,
      processGeneration: 1,
      ownerId: owner.id,
      state: 'starting',
      pid: undefined,
      startedAt: undefined,
      endedAt: undefined,
      exitCode: undefined,
      signal: undefined,
      lastSequence: 0,
      replayChunks: [],
      replayBytes: 0,
      droppedOutputBytes: 0,
      terminationRequested: false,
      endedNoticeSent: false,
    };
    this.sessions.set(request.sessionId, record);
    this.post({
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      type: 'spawn',
      request: { ...launch, processGeneration: record.processGeneration },
    });
    return this.snapshot(record);
  }

  restart(owner: WebContents, sessionId: string): TerminalSessionSnapshot {
    const record = this.owned(owner, sessionId);
    record.processGeneration += 1;
    record.state = 'starting';
    record.pid = undefined;
    record.startedAt = undefined;
    record.endedAt = undefined;
    record.exitCode = undefined;
    record.signal = undefined;
    record.replayChunks = [];
    record.replayBytes = 0;
    record.droppedOutputBytes = 0;
    record.terminationRequested = false;
    record.endedNoticeSent = false;
    this.post({
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      type: 'restart',
      request: { ...record.launch, processGeneration: record.processGeneration },
    });
    return this.snapshot(record);
  }

  write(owner: WebContents, sessionId: string, data: string): void {
    const record = this.owned(owner, sessionId);
    // A write to an ended session must not reach the PTY host: the host would
    // answer with a raw session-not-found protocol error for every keystroke.
    if (!this.live(record)) {
      this.noteEnded(record);
      return;
    }
    this.post({
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      type: 'write',
      sessionId,
      processGeneration: record.processGeneration,
      data,
    });
  }

  resize(owner: WebContents, sessionId: string, cols: number, rows: number): void {
    const record = this.owned(owner, sessionId);
    if (!this.live(record)) return;
    this.post({
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      type: 'resize',
      sessionId,
      processGeneration: record.processGeneration,
      cols,
      rows,
    });
  }

  detach(owner: WebContents, sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record?.ownerId === owner.id) record.ownerId = undefined;
  }

  kill(owner: WebContents, sessionId: string): void {
    const record = this.owned(owner, sessionId);
    if (record.state === 'exited' || record.state === 'killed' || record.state === 'failed') return;
    record.state = 'exiting';
    record.terminationRequested = true;
    this.post({
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      type: 'kill',
      sessionId,
      processGeneration: record.processGeneration,
    });
  }

  detachOwner(ownerId: number): void {
    this.contents.delete(ownerId);
    for (const record of this.sessions.values()) {
      if (record.ownerId === ownerId) record.ownerId = undefined;
    }
  }

  closeWorkspace(workspaceId: string, workspaceGeneration: number): void {
    for (const record of this.sessions.values()) {
      if (record.request.workspaceId !== workspaceId
        || record.request.workspaceGeneration !== workspaceGeneration
        || record.state === 'exited'
        || record.state === 'killed'
        || record.state === 'failed') continue;
      record.state = 'exiting';
      record.terminationRequested = true;
      this.post({
        protocolVersion: TERMINAL_PROTOCOL_VERSION,
        type: 'kill',
        sessionId: record.request.sessionId,
        processGeneration: record.processGeneration,
      });
    }
  }

  stop(): void {
    this.channel?.kill();
    this.channel = undefined;
    this.contents.clear();
  }

  private owned(owner: WebContents, sessionId: string): TerminalRecord {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error('terminal session does not exist');
    if (record.ownerId !== owner.id) throw new Error('terminal session is not owned by this window');
    return record;
  }

  private live(record: TerminalRecord): boolean {
    return record.state === 'starting' || record.state === 'ready';
  }

  private noteEnded(record: TerminalRecord): void {
    // 'exiting' means a stop is already in flight; stay quiet until it lands.
    if (record.state === 'exiting' || record.endedNoticeSent) return;
    record.endedNoticeSent = true;
    this.emit(record, {
      type: 'error',
      code: 'session-ended',
      message: 'This terminal session has ended. Use Restart to start a new shell.',
    });
  }

  private post(command: PtyHostCommand): void {
    if (!this.channel) this.start();
    this.channel?.post(command);
  }

  private handleHostEvent(event: PtyHostEvent): void {
    if (event.type === 'error' && !event.sessionId) {
      for (const record of this.sessions.values()) {
        this.emit(record, { type: 'error', code: event.code, message: event.message });
      }
      return;
    }
    const sessionId = event.sessionId;
    if (!sessionId || event.processGeneration === undefined) return;
    const record = this.sessions.get(sessionId);
    if (!record || event.processGeneration !== record.processGeneration) return;

    if (event.type === 'ready') {
      record.state = 'ready';
      record.pid = event.pid;
      record.startedAt = new Date().toISOString();
      this.emit(record, { type: 'ready', pid: event.pid });
      return;
    }
    if (event.type === 'data') {
      this.retain(record, event.data);
      this.emit(record, { type: 'data', data: event.data });
      return;
    }
    if (event.type === 'exit') {
      record.state = record.terminationRequested ? 'killed' : 'exited';
      record.endedAt = new Date().toISOString();
      record.exitCode = event.exitCode;
      record.signal = event.signal;
      this.emit(record, {
        type: 'exit',
        exitCode: event.exitCode,
        ...(event.signal === undefined ? {} : { signal: event.signal }),
      });
      return;
    }
    if (event.type === 'error') {
      if (record.state === 'starting') record.state = 'failed';
      this.emit(record, { type: 'error', code: event.code, message: event.message });
    }
  }

  private retain(record: TerminalRecord, data: string): void {
    record.replayChunks.push(data);
    record.replayBytes += Buffer.byteLength(data, 'utf8');
    let droppedNow = 0;
    while (record.replayBytes > maximumReplayBytes && record.replayChunks.length > 1) {
      const dropped = record.replayChunks.shift();
      if (dropped === undefined) break;
      const bytes = Buffer.byteLength(dropped, 'utf8');
      record.replayBytes -= bytes;
      record.droppedOutputBytes += bytes;
      droppedNow += bytes;
    }
    if (droppedNow > 0) {
      this.emit(record, { type: 'output-truncated', droppedBytes: record.droppedOutputBytes });
    }
  }

  private emit(record: TerminalRecord, payload: TerminalEventPayload): TerminalHostEvent {
    record.lastSequence += 1;
    const event = {
      protocolVersion: TERMINAL_PROTOCOL_VERSION,
      sessionId: record.request.sessionId,
      sequence: record.lastSequence,
      monotonicMs: performance.now(),
      ...payload,
    } as TerminalHostEvent;
    const owner = record.ownerId === undefined ? undefined : this.contents.get(record.ownerId);
    if (owner && !owner.isDestroyed()) owner.send('sillpak:terminal-event', event);
    return event;
  }

  private snapshot(record: TerminalRecord): TerminalSessionSnapshot {
    return {
      sessionId: record.request.sessionId,
      state: record.state,
      profileId: record.request.profileId,
      workspaceId: record.request.workspaceId,
      workspaceGeneration: record.request.workspaceGeneration,
      initialAddress: record.request.initialAddress,
      attached: record.ownerId !== undefined,
      lastSequence: record.lastSequence,
      retainedOutputBytes: record.replayBytes,
      droppedOutputBytes: record.droppedOutputBytes,
      ...(record.pid === undefined ? {} : { pid: record.pid }),
      ...(record.startedAt === undefined ? {} : { startedAt: record.startedAt }),
      ...(record.endedAt === undefined ? {} : { endedAt: record.endedAt }),
      ...(record.exitCode === undefined ? {} : { exitCode: record.exitCode }),
      ...(record.signal === undefined ? {} : { signal: record.signal }),
    };
  }
}
