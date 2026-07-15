import { claimIsland } from './island-registry.js';
import { mountVirtualList } from './virtual-list.js';

interface SheetProjection { readonly name: string; readonly rows: readonly (readonly unknown[])[]; readonly truncated: boolean }

function renderRow(row: readonly unknown[], index: number): HTMLElement {
  const element = document.createElement('div');
  element.className = 'sheet-row';
  const number = document.createElement('span');
  number.className = 'sheet-row-number';
  number.textContent = String(index + 1);
  element.append(number, ...row.map((value) => {
    const cell = document.createElement('span');
    cell.className = 'sheet-cell';
    cell.textContent = String(value ?? '');
    return cell;
  }));
  return element;
}

export function bootSpreadsheetViews(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-spreadsheet-view]')) {
    const surface = host.querySelector<HTMLElement>('[data-spreadsheet-surface]');
    const tabs = host.querySelector<HTMLElement>('[data-sheet-tabs]');
    if (!surface || !tabs) continue;
    claimIsland(surface, () => {
      const controller = new AbortController();
      let virtual: { dispose(): void } | undefined;
      void fetch(host.dataset.renderUrl ?? '', { signal: controller.signal, cache: 'no-store' })
        .then((response) => response.json())
        .then((payload: { readonly sheets?: readonly SheetProjection[]; readonly error?: string }) => {
          const sheets = payload.sheets ?? [];
          if (!sheets.length) throw new Error(payload.error ?? 'Workbook has no sheets');
          const selectSheet = (sheet: SheetProjection) => {
            virtual?.dispose();
            surface.replaceChildren();
            const canvas = document.createElement('div');
            canvas.className = 'sheet-canvas';
            surface.append(canvas);
            virtual = mountVirtualList({
              scrollElement: surface,
              host: canvas,
              items: sheet.rows,
              estimateSize: 32,
              key: (_row, index) => `${sheet.name}:${index}`,
              render: renderRow,
            });
          };
          tabs.replaceChildren(...sheets.map((sheet, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'text-command';
            button.textContent = sheet.name;
            button.addEventListener('click', () => selectSheet(sheet));
            if (index === 0) button.setAttribute('aria-current', 'true');
            return button;
          }));
          selectSheet(sheets[0]!);
        })
        .catch((error: unknown) => { surface.textContent = error instanceof Error ? error.message : 'Workbook projection failed'; });
      return () => { controller.abort(); virtual?.dispose(); };
    });
  }
}
