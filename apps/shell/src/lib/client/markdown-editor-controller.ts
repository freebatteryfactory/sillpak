import type { LexicalEditor } from 'lexical';
import type { EditorView } from '@codemirror/view';
import { createHtmlFragment } from '@czap/web';
import { claimIsland } from './island-registry.js';

type MarkdownMode = 'preview' | 'rich' | 'source';

interface RichApi {
  readonly lexical: typeof import('lexical');
  readonly richText: typeof import('@lexical/rich-text');
  readonly list: typeof import('@lexical/list');
  readonly link: typeof import('@lexical/link');
  readonly code: typeof import('@lexical/code');
  readonly markdown: typeof import('@lexical/markdown');
  readonly history: typeof import('@lexical/history');
}

interface SourceApi {
  readonly basicSetup: typeof import('codemirror')['basicSetup'];
  readonly EditorState: typeof import('@codemirror/state')['EditorState'];
  readonly EditorView: typeof import('@codemirror/view')['EditorView'];
  readonly markdown: typeof import('@codemirror/lang-markdown')['markdown'];
}

let richApiPromise: Promise<RichApi> | undefined;

function loadRichApi(): Promise<RichApi> {
  richApiPromise ??= Promise.all([
    import('lexical'),
    import('@lexical/rich-text'),
    import('@lexical/list'),
    import('@lexical/link'),
    import('@lexical/code'),
    import('@lexical/markdown'),
    import('@lexical/history'),
  ]).then(([lexical, richText, list, link, code, markdown, history]) => ({
    lexical,
    richText,
    list,
    link,
    code,
    markdown,
    history,
  }));
  return richApiPromise;
}

let sourceApiPromise: Promise<SourceApi> | undefined;

function loadSourceApi(): Promise<SourceApi> {
  sourceApiPromise ??= Promise.all([
    import('codemirror'),
    import('@codemirror/state'),
    import('@codemirror/view'),
    import('@codemirror/lang-markdown'),
  ]).then(([codemirror, state, view, language]) => ({
    basicSetup: codemirror.basicSetup,
    EditorState: state.EditorState,
    EditorView: view.EditorView,
    markdown: language.markdown,
  }));
  return sourceApiPromise;
}

let previewRendererPromise: Promise<{ render(source: string): string }> | undefined;

function loadPreviewRenderer(): Promise<{ render(source: string): string }> {
  previewRendererPromise ??= import('markdown-it').then(({ default: MarkdownIt }) => {
    const renderer = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });
    const defaultLinkOpen = renderer.renderer.rules.link_open
      ?? ((tokens, index, options, _environment, self) => self.renderToken(tokens, index, options));
    renderer.renderer.rules.link_open = (tokens, index, options, environment, self) => {
      const token = tokens[index];
      const href = token?.attrGet('href') ?? '';
      if (/^(?:https?:|mailto:|tel:)/i.test(href)) {
        token?.attrSet('rel', 'noreferrer noopener');
        token?.attrSet('target', '_blank');
      }
      return defaultLinkOpen(tokens, index, options, environment, self);
    };
    return renderer;
  });
  return previewRendererPromise;
}

export function bootMarkdownEditors(): void {
  for (const host of document.querySelectorAll<HTMLElement>('[data-markdown-view]')) {
    const richMount = host.querySelector<HTMLElement>('[data-markdown-rich-editor]');
    const sourceMount = host.querySelector<HTMLElement>('[data-markdown-source-editor]');
    const preview = host.querySelector<HTMLElement>('[data-markdown-preview]');
    const saveButton = host.querySelector<HTMLButtonElement>('[data-markdown-save]');
    const status = host.querySelector<HTMLElement>('[data-markdown-status]');
    const modeButtons = [...host.querySelectorAll<HTMLButtonElement>('[data-markdown-mode]')];
    if (!richMount || !sourceMount || !preview || !saveButton || !status) continue;

    claimIsland(host, () => {
      let mode: MarkdownMode = 'preview';
      let sourceCache: string | undefined;
      let savedSource: string | undefined;
      let expectedMtimeMs = Number(host.dataset.mtimeMs ?? '0');
      let richEditor: LexicalEditor | undefined;
      let richApi: RichApi | undefined;
      let sourceEditor: EditorView | undefined;
      let sourceApi: SourceApi | undefined;
      let unregisterRichText: () => void = () => undefined;
      let unregisterHistory: () => void = () => undefined;

      const readSource = async (): Promise<string> => {
        if (sourceCache !== undefined) return sourceCache;
        const response = await fetch(host.dataset.sourceUrl ?? '', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Markdown source read failed (${response.status})`);
        sourceCache = await response.text();
        savedSource = sourceCache;
        return sourceCache;
      };

      const richText = (): string => {
        if (!richEditor || !richApi) return sourceCache ?? '';
        let value = '';
        richEditor.getEditorState().read(() => {
          value = richApi?.markdown.$convertToMarkdownString(richApi.markdown.TRANSFORMERS) ?? '';
        });
        return value;
      };

      const activeText = (): string => {
        if (mode === 'rich') return richText();
        if (mode === 'source' && sourceEditor) return sourceEditor.state.doc.toString();
        return sourceCache ?? '';
      };

      const ensureRichEditor = async (source: string): Promise<LexicalEditor> => {
        richApi ??= await loadRichApi();
        if (!richEditor) {
          richEditor = richApi.lexical.createEditor({
            namespace: 'sillpak-markdown',
            nodes: [
              richApi.richText.HeadingNode,
              richApi.richText.QuoteNode,
              richApi.list.ListNode,
              richApi.list.ListItemNode,
              richApi.link.LinkNode,
              richApi.code.CodeNode,
            ],
            onError(error) { status.textContent = error.message; },
          });
          richEditor.setRootElement(richMount);
          unregisterRichText = richApi.richText.registerRichText(richEditor);
          unregisterHistory = richApi.history.registerHistory(
            richEditor,
            richApi.history.createEmptyHistoryState(),
            400,
          );
        }
        const api = richApi;
        richEditor.update(() => {
          api.lexical.$getRoot().clear();
          api.markdown.$convertFromMarkdownString(source, api.markdown.TRANSFORMERS);
        });
        return richEditor;
      };

      const ensureSourceEditor = async (source: string): Promise<EditorView> => {
        sourceApi ??= await loadSourceApi();
        if (!sourceEditor) {
          sourceEditor = new sourceApi.EditorView({
            parent: sourceMount,
            state: sourceApi.EditorState.create({
              doc: source,
              extensions: [sourceApi.basicSetup, sourceApi.markdown()],
            }),
          });
        } else {
          sourceEditor.dispatch({
            changes: { from: 0, to: sourceEditor.state.doc.length, insert: source },
          });
        }
        return sourceEditor;
      };

      const setMode = async (next: MarkdownMode): Promise<void> => {
        if (next === mode) return;
        if (mode !== 'preview') sourceCache = activeText();
        const source = await readSource();
        preview.hidden = next !== 'preview';
        richMount.hidden = next !== 'rich';
        sourceMount.hidden = next !== 'source';
        const dirty = savedSource !== undefined && source !== savedSource;
        saveButton.hidden = next === 'preview' && !dirty;

        if (next === 'rich') {
          status.textContent = 'loading rich editor';
          (await ensureRichEditor(source)).focus();
          status.textContent = 'rich mode · CommonMark normalization';
        } else if (next === 'source') {
          status.textContent = 'loading source editor';
          (await ensureSourceEditor(source)).focus();
          status.textContent = 'source mode · exact text';
        } else {
          const renderer = await loadPreviewRenderer();
          preview.replaceChildren(createHtmlFragment(renderer.render(source), { policy: 'sanitized-html' }));
          status.textContent = dirty ? 'preview · unsaved changes' : 'preview';
        }

        mode = next;
        for (const button of modeButtons) {
          button.setAttribute('aria-pressed', String(button.dataset.markdownMode === mode));
        }
      };

      const save = async (): Promise<void> => {
        const content = activeText();
        status.textContent = 'saving';
        const response = await fetch((host.dataset.sourceUrl ?? '').replace('/api/raw/', '/api/save/'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, expectedMtimeMs }),
        });
        const result = await response.json() as { modifiedAt?: string; error?: string };
        if (!response.ok || !result.modifiedAt) throw new Error(result.error ?? 'save failed');
        sourceCache = content;
        savedSource = content;
        expectedMtimeMs = Date.parse(result.modifiedAt);
        location.reload();
      };

      const modeListeners = modeButtons.map((button) => {
        const listener = () => {
          const next = button.dataset.markdownMode as MarkdownMode | undefined;
          if (next) void setMode(next).catch((error: unknown) => {
            status.textContent = error instanceof Error ? error.message : 'Markdown mode failed';
          });
        };
        button.addEventListener('click', listener);
        return { button, listener };
      });
      const saveListener = () => void save().catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : 'save failed';
      });
      saveButton.addEventListener('click', saveListener);

      const transcript = (event: Event) => {
        const detail = (event as CustomEvent<{ readonly text: string; readonly target: string }>).detail;
        if (detail.target !== 'editor') return;
        if (mode === 'source' && sourceEditor) {
          const range = sourceEditor.state.selection.main;
          sourceEditor.dispatch({ changes: { from: range.from, to: range.to, insert: detail.text } });
          sourceEditor.focus();
          return;
        }
        if (mode !== 'rich' || !richEditor || !richApi) return;
        const api = richApi;
        richEditor.update(() => {
          const selection = api.lexical.$getSelection();
          if (api.lexical.$isRangeSelection(selection)) selection.insertText(detail.text);
          else {
            const paragraph = api.lexical.$createParagraphNode();
            paragraph.append(api.lexical.$createTextNode(detail.text));
            api.lexical.$getRoot().append(paragraph);
          }
        });
        richEditor.focus();
      };
      window.addEventListener('sillpak:transcript', transcript);

      return () => {
        for (const { button, listener } of modeListeners) button.removeEventListener('click', listener);
        saveButton.removeEventListener('click', saveListener);
        window.removeEventListener('sillpak:transcript', transcript);
        unregisterHistory();
        unregisterRichText();
        richEditor?.setRootElement(null);
        sourceEditor?.destroy();
      };
    });
  }
}
