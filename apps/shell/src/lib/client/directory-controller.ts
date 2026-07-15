import type { DirectoryEntry } from '@sillpak/contracts';
import { claimIsland } from './island-registry.js';
import { mountVirtualList } from './virtual-list.js';

function renderEntry(entry: DirectoryEntry): HTMLElement {
  const link = document.createElement('a');
  link.className = 'directory-row';
  link.href = entry.route;
  const mark = document.createElement('span');
  mark.className = `kind-mark kind-${entry.artifactKind}`;
  mark.textContent = entry.kind === 'directory' ? 'DIR' : entry.extension.replace('.', '').toUpperCase() || 'FILE';
  const name = document.createElement('span');
  name.className = 'entry-name';
  name.textContent = entry.name;
  const size = document.createElement('span');
  size.className = 'entry-size';
  size.textContent = entry.kind === 'directory' ? '' : entry.size.toLocaleString();
  const time = document.createElement('time');
  time.dateTime = entry.modifiedAt;
  time.textContent = new Date(entry.modifiedAt).toLocaleString();
  link.append(mark, name, size, time);
  return link;
}

export function bootDirectoryViews(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-directory-view]')) {
    const count = Number(host.dataset.entryCount ?? '0');
    if (count <= 250) continue;
    const scroll = host.querySelector<HTMLElement>('[data-directory-scroll]');
    const list = host.querySelector<HTMLElement>('[data-directory-list]');
    if (!scroll || !list) continue;
    claimIsland(list, () => {
      const controller = new AbortController();
      let handle: { dispose(): void } | undefined;
      void fetch(host.dataset.directoryApi ?? '', { signal: controller.signal, cache: 'no-store' })
        .then((response) => response.json())
        .then((payload: { readonly entries: readonly DirectoryEntry[] }) => {
          handle = mountVirtualList({
            scrollElement: scroll,
            host: list,
            items: payload.entries,
            estimateSize: 36,
            key: (entry) => entry.route,
            render: renderEntry,
          });
        });
      return () => { controller.abort(); handle?.dispose(); };
    });
  }
}
