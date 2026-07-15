import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { claimIsland } from './island-registry.js';

function languageFor(extension: string) {
  return ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(extension) ? javascript({ typescript: extension.includes('ts'), jsx: extension.includes('x') }) : [];
}

export function bootCodeEditors(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-code-view]')) {
    const mount = host.querySelector<HTMLElement>('[data-code-editor]');
    if (!mount) continue;
    claimIsland(mount, () => {
      let expectedMtimeMs = Number(host.dataset.mtimeMs ?? '0');
      let original = '';
      let view: EditorView | undefined;
      const sourceUrl = host.dataset.sourceUrl ?? '';
      const status = host.querySelector<HTMLElement>('[data-code-status]');
      const save = host.querySelector<HTMLButtonElement>('[data-code-save]');
      const boot = async () => {
        const size = Number(host.dataset.size ?? '0');
        if (size > 4 * 1024 * 1024) {
          if (status) status.textContent = 'preview limit: 4 MiB';
          mount.textContent = 'This text artifact is too large for the bounded editor. Use the terminal or an external application.';
          return;
        }
        const response = await fetch(sourceUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`source read failed (${response.status})`);
        original = await response.text();
        const state = EditorState.create({
          doc: original,
          extensions: [
            basicSetup,
            languageFor(host.dataset.language ?? ''),
            EditorView.updateListener.of((update) => {
              if (update.docChanged && status) status.textContent = update.state.doc.toString() === original ? 'clean' : 'modified';
            }),
            keymap.of([]),
          ],
        });
        view = new EditorView({ state, parent: mount });
      };
      void boot().catch((error: unknown) => {
        if (status) status.textContent = error instanceof Error ? error.message : 'editor load failed';
      });

      const saveCurrent = async () => {
        if (!view) return;
        if (status) status.textContent = 'saving';
        const response = await fetch(sourceUrl.replace('/api/raw/', '/api/save/'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: view.state.doc.toString(), expectedMtimeMs }),
        });
        const result = await response.json() as { modifiedAt?: string; error?: string };
        if (!response.ok || !result.modifiedAt) {
          if (status) status.textContent = result.error ?? 'save failed';
          return;
        }
        original = view.state.doc.toString();
        expectedMtimeMs = Date.parse(result.modifiedAt);
        if (status) status.textContent = 'saved';
      };
      save?.addEventListener('click', saveCurrent);

      const transcript = (event: Event) => {
        const detail = (event as CustomEvent<{ readonly text: string; readonly target: string }>).detail;
        if (detail.target !== 'editor' || !view) return;
        const range = view.state.selection.main;
        view.dispatch({ changes: { from: range.from, to: range.to, insert: detail.text } });
        view.focus();
      };
      window.addEventListener('sillpak:transcript', transcript);

      return () => {
        save?.removeEventListener('click', saveCurrent);
        window.removeEventListener('sillpak:transcript', transcript);
        view?.destroy();
      };
    });
  }
}
