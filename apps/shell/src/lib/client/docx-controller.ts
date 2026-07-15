import { createHtmlFragment } from '@czap/web';
import { claimIsland } from './island-registry.js';

export function bootDocxViews(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-docx-view]')) {
    const surface = host.querySelector<HTMLElement>('[data-docx-surface]');
    if (!surface) continue;
    claimIsland(surface, () => {
      const controller = new AbortController();
      void fetch(host.dataset.renderUrl ?? '', { signal: controller.signal, cache: 'no-store' })
        .then((response) => response.json())
        .then((payload: { readonly html?: string; readonly error?: string }) => {
          if (!payload.html) throw new Error(payload.error ?? 'DOCX projection failed');
          const fragment = createHtmlFragment(payload.html, { policy: 'sanitized-html' });
          surface.replaceChildren(fragment);
        })
        .catch((error: unknown) => { if (!controller.signal.aborted) surface.textContent = error instanceof Error ? error.message : 'DOCX projection failed'; });
      return () => controller.abort();
    });
  }
}
