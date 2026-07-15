import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebglAddon } from '@xterm/addon-webgl';
import type { ArtifactAddress, TerminalHostEvent } from '@sillpak/contracts';
import '@xterm/xterm/css/xterm.css';
import { claimIsland } from './island-registry.js';

function parseAddress(raw: string | undefined): ArtifactAddress | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<ArtifactAddress>;
    if (value.workspace !== 'local' || !Array.isArray(value.segments)) return undefined;
    if (!value.segments.every((segment) => typeof segment === 'string')) return undefined;
    return { workspace: 'local', segments: value.segments };
  } catch {
    return undefined;
  }
}

export function bootTerminal(): void {
  const dock = document.querySelector<HTMLElement>('[data-terminal-dock]');
  const surface = dock?.querySelector<HTMLElement>('[data-terminal-surface]');
  if (!dock || !surface) return;

  claimIsland(dock, () => {
    const sessionId = dock.dataset.sessionId;
    const initialAddress = parseAddress(dock.dataset.cwdAddress);
    const workspaceGeneration = Number(dock.dataset.workspaceGeneration ?? '0');
    if (!sessionId || !initialAddress || !Number.isSafeInteger(workspaceGeneration) || workspaceGeneration < 1) {
      surface.textContent = 'Terminal configuration is invalid.';
      return () => undefined;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: 13,
      scrollback: 20_000,
      allowProposedApi: false,
      screenReaderMode: false,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    const serialize = new SerializeAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(search);
    terminal.loadAddon(serialize);
    terminal.open(surface);
    try { terminal.loadAddon(new WebglAddon()); } catch { /* Canvas renderer remains valid. */ }
    fit.fit();

    const bridge = window.sillpak?.terminal;
    const status = dock.querySelector<HTMLElement>('[data-terminal-status]');
    const snapshotKey = `sillpak.terminal.snapshot.${sessionId}`;
    const cached = sessionStorage.getItem(snapshotKey);
    if (cached) terminal.write(cached);

    let lastSequence = 0;
    const noteSequence = (event: TerminalHostEvent) => {
      if (lastSequence > 0 && event.sequence !== lastSequence + 1 && status) {
        status.textContent = `event gap ${lastSequence}→${event.sequence}`;
      }
      lastSequence = Math.max(lastSequence, event.sequence);
    };

    const removeEvent = bridge?.onEvent((event) => {
      if (event.sessionId !== sessionId) return;
      noteSequence(event);
      if (event.type === 'data') terminal.write(event.data);
      if (event.type === 'replay') {
        terminal.reset();
        terminal.write(event.data);
        if (event.droppedBytes > 0 && status) status.textContent = `reattached · ${event.droppedBytes} earlier bytes unavailable`;
      }
      if (event.type === 'ready' && status) status.textContent = `pid ${event.pid}`;
      if (event.type === 'output-truncated' && status) status.textContent = `history bounded · ${event.droppedBytes} bytes omitted`;
      if (event.type === 'exit' && status) status.textContent = `exited ${event.exitCode}`;
      if (event.type === 'error') terminal.writeln(`\r\n[host:${event.code}] ${event.message}`);
    }) ?? (() => undefined);

    const open = async () => {
      if (!bridge) {
        terminal.writeln('Browser mode: terminal transport is not connected.');
        if (status) status.textContent = 'browser mode';
        return;
      }
      const snapshot = await bridge.open({
        sessionId,
        profileId: 'default',
        workspaceId: initialAddress.workspace,
        workspaceGeneration,
        initialAddress,
        cols: terminal.cols,
        rows: terminal.rows,
      });
      lastSequence = Math.max(lastSequence, snapshot.lastSequence);
      if (status) {
        status.textContent = snapshot.pid
          ? `${snapshot.state} · pid ${snapshot.pid}`
          : snapshot.state;
      }
    };
    void open().catch((error: unknown) => {
      terminal.writeln(`\r\n[host] ${error instanceof Error ? error.message : 'terminal open failed'}`);
      if (status) status.textContent = 'open failed';
    });

    const input = terminal.onData((data) => bridge?.write(sessionId, data));
    const observer = new ResizeObserver(() => {
      if (surface.clientWidth < 20 || surface.clientHeight < 20) return;
      fit.fit();
      bridge?.resize(sessionId, terminal.cols, terminal.rows);
    });
    observer.observe(surface);

    const searchInput = dock.querySelector<HTMLInputElement>('[data-terminal-search]');
    const onSearch = (event: KeyboardEvent) => {
      if (!searchInput) return;
      if (event.key === 'Enter' && searchInput.value) {
        event.preventDefault();
        search.findNext(searchInput.value, { incremental: true });
      } else if (event.key === 'Escape') {
        search.clearDecorations();
        searchInput.value = '';
        terminal.focus();
      }
    };
    searchInput?.addEventListener('keydown', onSearch);

    const restartButton = dock.querySelector<HTMLButtonElement>('[data-terminal-restart]');
    const restart = () => {
      if (!bridge) return;
      terminal.reset();
      sessionStorage.removeItem(snapshotKey);
      if (status) status.textContent = 'restarting';
      void bridge.restart(sessionId).catch((error: unknown) => {
        terminal.writeln(`\r\n[host] ${error instanceof Error ? error.message : 'restart failed'}`);
      });
    };
    restartButton?.addEventListener('click', restart);

    const killButton = dock.querySelector<HTMLButtonElement>('[data-terminal-kill]');
    const kill = () => {
      if (!bridge) return;
      if (status) status.textContent = 'stopping';
      void bridge.kill(sessionId).catch((error: unknown) => {
        terminal.writeln(`\r\n[host] ${error instanceof Error ? error.message : 'stop failed'}`);
      });
    };
    killButton?.addEventListener('click', kill);

    const transcript = (event: Event) => {
      const detail = (event as CustomEvent<{ readonly text: string; readonly target: string }>).detail;
      if (detail.target !== 'terminal') return;
      bridge?.write(sessionId, detail.text);
      terminal.focus();
    };
    window.addEventListener('sillpak:transcript', transcript);

    const persistSnapshot = () => {
      try { sessionStorage.setItem(snapshotKey, serialize.serialize()); }
      catch { /* Session restoration remains best-effort; PTY replay is authoritative. */ }
    };
    window.addEventListener('beforeunload', persistSnapshot);

    return () => {
      persistSnapshot();
      observer.disconnect();
      searchInput?.removeEventListener('keydown', onSearch);
      restartButton?.removeEventListener('click', restart);
      killButton?.removeEventListener('click', kill);
      window.removeEventListener('sillpak:transcript', transcript);
      window.removeEventListener('beforeunload', persistSnapshot);
      removeEvent();
      input.dispose();
      bridge?.detach(sessionId);
      terminal.dispose();
    };
  });
}
