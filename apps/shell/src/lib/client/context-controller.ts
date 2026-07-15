const storageKey = 'sillpak.explicit-context.v1';

function readContext(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeContext(paths: readonly string[]): void {
  localStorage.setItem(storageKey, JSON.stringify(paths));
}

function render(): void {
  const shelf = document.querySelector<HTMLElement>('[data-context-shelf]');
  if (!shelf) return;
  const list = shelf.querySelector<HTMLOListElement>('[data-context-list]');
  const empty = shelf.querySelector<HTMLElement>('[data-context-empty]');
  if (!list || !empty) return;
  const paths = readContext();
  list.replaceChildren(...paths.map((path) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = path;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-command';
    remove.textContent = 'remove';
    remove.addEventListener('click', () => {
      writeContext(readContext().filter((candidate) => candidate !== path));
      render();
    });
    item.append(label, remove);
    return item;
  }));
  empty.hidden = paths.length > 0;
  list.hidden = paths.length === 0;
}

export function bootContextShelf(): void {
  render();
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-attach-context]')) {
    if (button.dataset.bound === 'true') continue;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const path = button.dataset.contextPath;
      if (!path) return;
      const paths = readContext();
      if (!paths.includes(path)) writeContext([...paths, path]);
      render();
    });
  }
}
