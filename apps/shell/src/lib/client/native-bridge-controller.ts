export function bootNativeBridgeControls(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-choose-workspace]')) {
    if (!window.sillpak) {
      button.hidden = true;
      continue;
    }
    if (button.dataset.bound === 'true') continue;
    button.dataset.bound = 'true';
    button.addEventListener('click', async () => {
      const accepted = window.confirm('Changing workspace stops the current terminal session. Continue?');
      if (!accepted) return;
      const workspace = await window.sillpak?.chooseWorkspace();
      if (workspace) {
        localStorage.removeItem('sillpak.explicit-context.v1');
        location.href = workspace.route;
      }
    });
  }
}
