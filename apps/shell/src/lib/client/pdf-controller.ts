import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { claimIsland } from './island-registry.js';

export function bootPdfViews(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-pdf-view]')) {
    const surface = host.querySelector<HTMLElement>('[data-pdf-surface]');
    if (!surface) continue;
    claimIsland(surface, () => {
      let disposed = false;
      let pageNumber = 1;
      let totalPages = 1;
      let documentHandle: { getPage(page: number): Promise<any>; destroy(): Promise<void>; numPages: number } | undefined;
      const label = host.querySelector<HTMLElement>('[data-pdf-page-label]');

      const render = async () => {
        if (!documentHandle || disposed) return;
        const page = await documentHandle.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        surface.replaceChildren(canvas);
        await page.render({ canvasContext: context, viewport }).promise;
        if (label) label.textContent = `page ${pageNumber} of ${totalPages}`;
      };

      void import('pdfjs-dist')
        .then(async (pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
          const loaded = await pdfjs.getDocument(host.dataset.sourceUrl ?? '').promise;
          documentHandle = loaded;
          totalPages = loaded.numPages;
          await render();
        })
        .catch((error: unknown) => {
          surface.textContent = error instanceof Error ? error.message : 'PDF projection failed';
        });

      const previous = () => { pageNumber = Math.max(1, pageNumber - 1); void render(); };
      const next = () => { pageNumber = Math.min(totalPages, pageNumber + 1); void render(); };
      host.querySelector('[data-pdf-previous]')?.addEventListener('click', previous);
      host.querySelector('[data-pdf-next]')?.addEventListener('click', next);
      return () => {
        disposed = true;
        host.querySelector('[data-pdf-previous]')?.removeEventListener('click', previous);
        host.querySelector('[data-pdf-next]')?.removeEventListener('click', next);
        void documentHandle?.destroy();
      };
    });
  }
}
