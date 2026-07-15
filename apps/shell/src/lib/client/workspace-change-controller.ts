let dispose: (() => void) | undefined;

export function bootWorkspaceChangeIndicator(): void {
  if (dispose || !window.sillpak?.onWorkspaceChanged) return;
  const status = document.querySelector<HTMLElement>('[data-workspace-status]');
  dispose = window.sillpak.onWorkspaceChanged((event) => {
    if (!status) return;
    if (event.type === 'watcher-error') {
      status.textContent = 'watcher fault';
      status.dataset.changed = 'true';
      return;
    }
    const count = event.changes.length;
    status.textContent = count === 1 ? '1 filesystem change' : `${count} filesystem changes`;
    status.dataset.changed = 'true';
  });
}
