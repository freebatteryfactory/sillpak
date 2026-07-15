import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions,
} from '@tanstack/virtual-core';

export interface VirtualListHandle { dispose(): void; refresh(): void }

export function mountVirtualList<T>(options: {
  readonly scrollElement: HTMLElement;
  readonly host: HTMLElement;
  readonly items: readonly T[];
  readonly estimateSize: number;
  readonly key: (item: T, index: number) => string;
  readonly render: (item: T, index: number) => HTMLElement;
}): VirtualListHandle {
  let virtualizer: Virtualizer<HTMLElement, HTMLElement>;
  const renderRows = () => {
    const rows = virtualizer.getVirtualItems();
    options.host.style.height = `${virtualizer.getTotalSize()}px`;
    options.host.replaceChildren(...rows.map((row) => {
      const element = options.render(options.items[row.index]!, row.index);
      element.style.position = 'absolute';
      element.style.insetInline = '0';
      element.style.transform = `translateY(${row.start}px)`;
      element.style.height = `${row.size}px`;
      element.dataset.index = String(row.index);
      return element;
    }));
  };
  const config: VirtualizerOptions<HTMLElement, HTMLElement> = {
    count: options.items.length,
    getScrollElement: () => options.scrollElement,
    estimateSize: () => options.estimateSize,
    getItemKey: (index) => options.key(options.items[index]!, index),
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    overscan: 8,
    onChange: renderRows,
  };
  virtualizer = new Virtualizer(config);
  const cleanup = virtualizer._didMount();
  virtualizer._willUpdate();
  renderRows();
  return {
    dispose: cleanup,
    refresh() { virtualizer._willUpdate(); renderRows(); },
  };
}
