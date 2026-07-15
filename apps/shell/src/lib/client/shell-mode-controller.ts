import { createShellStatePort, type ShellMode } from '../state/shell-state.js';

const storageKey = 'sillpak.shell-mode.v1';
const initialMode = (() => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored === 'artifact-focus' || stored === 'terminal-heavy' ? stored : 'balanced';
  } catch {
    return 'balanced';
  }
})();
const state = createShellStatePort({ mode: initialMode, contextPaths: [], voiceState: 'idle' });
let subscribed = false;

function applyMode(mode: ShellMode): void {
  const shell = document.querySelector<HTMLElement>('[data-sillpak]');
  if (shell) shell.dataset.shellMode = mode;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-shell-focus]')) {
    button.textContent = mode === 'artifact-focus' ? 'Restore workspace' : 'Focus artifact';
    button.setAttribute('aria-pressed', String(mode === 'artifact-focus'));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-terminal-focus]')) {
    button.textContent = mode === 'terminal-heavy' ? 'Restore workspace' : 'Focus terminal';
    button.setAttribute('aria-pressed', String(mode === 'terminal-heavy'));
  }
  try { sessionStorage.setItem(storageKey, mode); } catch { /* Session persistence is optional. */ }
}

export function bootShellMode(): void {
  if (!subscribed) {
    subscribed = true;
    state.subscribe((snapshot) => applyMode(snapshot.mode));
  }
  applyMode(state.snapshot().mode);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-shell-focus]')) {
    if (button.dataset.bound === 'true') continue;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const next = state.snapshot().mode === 'artifact-focus' ? 'balanced' : 'artifact-focus';
      state.dispatch({ type: 'mode.changed', mode: next });
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-terminal-focus]')) {
    if (button.dataset.bound === 'true') continue;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const next = state.snapshot().mode === 'terminal-heavy' ? 'balanced' : 'terminal-heavy';
      state.dispatch({ type: 'mode.changed', mode: next });
    });
  }
}
