/// <reference types="astro/client" />

import type {
  ArtifactAddress,
  TerminalBridge,
  WorkspaceSnapshot,
  WorkspaceWatcherEvent,
} from '@sillpak/contracts';

declare global {
  interface Window {
    sillpak?: {
      readonly platform: NodeJS.Platform;
      readonly terminal: TerminalBridge;
      chooseWorkspace(): Promise<WorkspaceSnapshot | null>;
      revealArtifact(address: ArtifactAddress): Promise<void>;
      openArtifact(address: ArtifactAddress): Promise<void>;
      onWorkspaceChanged(listener: (event: WorkspaceWatcherEvent) => void): () => void;
    };
  }
}

export {};
