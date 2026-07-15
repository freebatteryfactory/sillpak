export type WorkspaceId = 'local';
export type WorkspaceGeneration = number;
export type TerminalSessionId = string;
export type BrowserSessionId = string;

export type ArtifactKind =
  | 'directory'
  | 'markdown'
  | 'code'
  | 'text'
  | 'json'
  | 'docx'
  | 'pdf'
  | 'spreadsheet'
  | 'image'
  | 'audio'
  | 'video'
  | 'archive'
  | 'unknown';

export interface ArtifactAddress {
  readonly workspace: WorkspaceId;
  readonly segments: readonly string[];
}

export interface ArtifactCapabilities {
  readonly preview: boolean;
  readonly edit: 'none' | 'text' | 'markdown' | 'csv';
  readonly search: boolean;
  readonly selectText: boolean;
  readonly openExternal: boolean;
}

export interface ArtifactDescriptor {
  readonly address: ArtifactAddress;
  readonly kind: ArtifactKind;
  readonly name: string;
  readonly extension: string;
  readonly mime: string;
  readonly size: number;
  readonly modifiedAt: string;
  readonly route: string;
  readonly rawUrl?: string;
  readonly capabilities: ArtifactCapabilities;
}

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: 'directory' | 'file' | 'symlink';
  readonly artifactKind: ArtifactKind;
  readonly extension: string;
  readonly size: number;
  readonly modifiedAt: string;
  readonly route: string;
}

export interface WorkspaceSnapshot {
  readonly workspaceId: WorkspaceId;
  readonly generation: WorkspaceGeneration;
  readonly displayName: string;
  readonly route: string;
}

export interface WorkspaceLease {
  readonly workspaceId: WorkspaceId;
  readonly generation: WorkspaceGeneration;
  readonly issuedAt: string;
}

export interface WorkspacePathChange {
  readonly type: 'create' | 'update' | 'delete';
  readonly relativePath: string;
}

export interface WorkspaceChangeBatch {
  readonly type: 'changes';
  readonly workspaceId: WorkspaceId;
  readonly generation: WorkspaceGeneration;
  readonly sequence: number;
  readonly observedAt: string;
  readonly changes: readonly WorkspacePathChange[];
}

export interface WorkspaceWatcherFault {
  readonly type: 'watcher-error';
  readonly workspaceId: WorkspaceId;
  readonly generation: WorkspaceGeneration;
  readonly sequence: number;
  readonly observedAt: string;
  readonly message: string;
}

export type WorkspaceWatcherEvent = WorkspaceChangeBatch | WorkspaceWatcherFault;

export type TerminalProfileId = 'default';

export interface TerminalOpenRequest {
  readonly sessionId: TerminalSessionId;
  readonly profileId: TerminalProfileId;
  readonly workspaceId: WorkspaceId;
  readonly workspaceGeneration: WorkspaceGeneration;
  readonly initialAddress: ArtifactAddress;
  readonly cols: number;
  readonly rows: number;
}

export type TerminalSessionState =
  | 'starting'
  | 'ready'
  | 'exiting'
  | 'exited'
  | 'failed'
  | 'killed';

export interface TerminalSessionSnapshot {
  readonly sessionId: TerminalSessionId;
  readonly state: TerminalSessionState;
  readonly profileId: TerminalProfileId;
  readonly workspaceId: WorkspaceId;
  readonly workspaceGeneration: WorkspaceGeneration;
  readonly initialAddress: ArtifactAddress;
  readonly attached: boolean;
  readonly lastSequence: number;
  readonly retainedOutputBytes: number;
  readonly droppedOutputBytes: number;
  readonly pid?: number;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly exitCode?: number;
  readonly signal?: number;
}

export interface TerminalEventBase {
  readonly protocolVersion: 2;
  readonly sessionId: TerminalSessionId;
  readonly sequence: number;
  readonly monotonicMs: number;
}

export type TerminalHostEvent =
  | (TerminalEventBase & { readonly type: 'ready'; readonly pid: number })
  | (TerminalEventBase & { readonly type: 'data'; readonly data: string })
  | (TerminalEventBase & { readonly type: 'replay'; readonly data: string; readonly droppedBytes: number })
  | (TerminalEventBase & { readonly type: 'cwd'; readonly address: ArtifactAddress })
  | (TerminalEventBase & { readonly type: 'command-start'; readonly commandId: string; readonly text?: string })
  | (TerminalEventBase & { readonly type: 'command-end'; readonly commandId: string; readonly exitCode?: number })
  | (TerminalEventBase & { readonly type: 'output-truncated'; readonly droppedBytes: number })
  | (TerminalEventBase & { readonly type: 'exit'; readonly exitCode: number; readonly signal?: number })
  | (TerminalEventBase & { readonly type: 'error'; readonly code: string; readonly message: string });

export interface TerminalBridge {
  open(request: TerminalOpenRequest): Promise<TerminalSessionSnapshot>;
  restart(sessionId: TerminalSessionId): Promise<TerminalSessionSnapshot>;
  write(sessionId: TerminalSessionId, data: string): void;
  resize(sessionId: TerminalSessionId, cols: number, rows: number): void;
  detach(sessionId: TerminalSessionId): void;
  kill(sessionId: TerminalSessionId): Promise<void>;
  onEvent(listener: (event: TerminalHostEvent) => void): () => void;
}

export type Enforcement = 'enforced' | 'mediated' | 'unsupported';
export type ObservationCoverage = 'complete' | 'partial' | 'none';

export interface CapabilityAssessment {
  readonly capability: string;
  readonly enforcement: Enforcement;
  readonly observation: ObservationCoverage;
  readonly mechanism?: string;
  readonly reason?: string;
}

export interface BrowserSessionOpenRequest {
  readonly sessionId: BrowserSessionId;
  readonly profile: 'ephemeral' | 'persistent';
  readonly initialUrl?: string;
  readonly allowedOrigins?: readonly string[];
}

export type BrowserActionRequest =
  | { readonly type: 'navigate'; readonly url: string }
  | { readonly type: 'snapshot' }
  | { readonly type: 'click'; readonly ref: string }
  | { readonly type: 'type'; readonly ref: string; readonly text: string }
  | { readonly type: 'select'; readonly ref: string; readonly value: string }
  | { readonly type: 'scroll'; readonly direction: 'up' | 'down'; readonly amount?: number }
  | { readonly type: 'extract'; readonly refs?: readonly string[] }
  | { readonly type: 'capture' }
  | { readonly type: 'takeover' };

export interface BrowserActionReport {
  readonly sessionId: BrowserSessionId;
  readonly action: BrowserActionRequest['type'];
  readonly startedAt: string;
  readonly endedAt: string;
  readonly origin?: string;
  readonly outcome: 'completed' | 'refused' | 'failed' | 'human-takeover';
  readonly assessments: readonly CapabilityAssessment[];
  readonly observation: ObservationCoverage;
  readonly message?: string;
}

export interface TranscriptionRequest {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly language?: string;
}

export interface TranscriptionResult {
  readonly text: string;
  readonly model: string;
  readonly elapsedMs: number;
}

export interface TranscriptionPort {
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  dispose(): Promise<void>;
}

export interface CommandObservation {
  readonly id: string;
  readonly sessionId: TerminalSessionId;
  readonly workspaceId: WorkspaceId;
  readonly workspaceGeneration: WorkspaceGeneration;
  readonly observedCwd?: ArtifactAddress;
  readonly text?: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly exitCode?: number;
  readonly source: 'shell-integration' | 'host-launch';
  readonly coverage: ObservationCoverage;
  readonly associatedChangeBatchIds: readonly string[];
}
