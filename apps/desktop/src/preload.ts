import { contextBridge, ipcRenderer } from 'electron';
import type {
  ArtifactAddress,
  TerminalBridge,
  TerminalHostEvent,
  TerminalOpenRequest,
  WorkspaceSnapshot,
  WorkspaceWatcherEvent,
} from '@sillpak/contracts';
// Sandboxed preload scripts cannot require local modules, so the preload stays
// self-contained. These channel names must mirror `channels` in protocol.ts;
// tests/repository-laws.test.mjs asserts the two stay in agreement.
const channels = {
  terminalCommand: 'sillpak:terminal-command',
  terminalEvent: 'sillpak:terminal-event',
  chooseWorkspace: 'sillpak:choose-workspace',
  revealArtifact: 'sillpak:reveal-artifact',
  openArtifact: 'sillpak:open-artifact',
  workspaceChanged: 'sillpak:workspace-changed',
} as const;

const terminal: TerminalBridge = {
  open: (request: TerminalOpenRequest) => ipcRenderer.invoke(channels.terminalCommand, { type: 'open', request }),
  restart: (sessionId) => ipcRenderer.invoke(channels.terminalCommand, { type: 'restart', sessionId }),
  write: (sessionId, data) => ipcRenderer.send(channels.terminalCommand, { type: 'write', sessionId, data }),
  resize: (sessionId, cols, rows) => ipcRenderer.send(channels.terminalCommand, { type: 'resize', sessionId, cols, rows }),
  detach: (sessionId) => ipcRenderer.send(channels.terminalCommand, { type: 'detach', sessionId }),
  kill: (sessionId) => ipcRenderer.invoke(channels.terminalCommand, { type: 'kill', sessionId }),
  onEvent(listener) {
    const handler = (_event: Electron.IpcRendererEvent, payload: TerminalHostEvent) => listener(payload);
    ipcRenderer.on(channels.terminalEvent, handler);
    return () => ipcRenderer.removeListener(channels.terminalEvent, handler);
  },
};

contextBridge.exposeInMainWorld('sillpak', {
  platform: process.platform,
  terminal,
  chooseWorkspace: (): Promise<WorkspaceSnapshot | null> => ipcRenderer.invoke(channels.chooseWorkspace),
  revealArtifact: (address: ArtifactAddress) => ipcRenderer.invoke(channels.revealArtifact, address),
  openArtifact: (address: ArtifactAddress) => ipcRenderer.invoke(channels.openArtifact, address),
  onWorkspaceChanged: (listener: (event: WorkspaceWatcherEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: WorkspaceWatcherEvent) => listener(payload);
    ipcRenderer.on(channels.workspaceChanged, handler);
    return () => ipcRenderer.removeListener(channels.workspaceChanged, handler);
  },
});
