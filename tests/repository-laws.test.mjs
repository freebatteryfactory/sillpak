import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const standaloneSentence = 'SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.';

test('the standalone product boundary is preserved', () => {
  assert.match(read('README.md'), new RegExp(standaloneSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(read('AGENTS.md'), new RegExp(standaloneSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(read('CANON.md'), /terminal and browser sessions persist as tools/i);
});

test('the terminal is persisted and opaque', () => {
  const source = read('apps/shell/src/components/TerminalDock.astro');
  assert.match(source, /transition:persist/);
  assert.match(source, /data-czap-morph-opaque/);
});

test('the route is a catch-all Astro artifact route', () => {
  const source = read('apps/shell/src/pages/w/[workspace]/[...path].astro');
  assert.match(source, /resolveExistingAddress/);
  assert.match(source, /ArtifactPage/);
});

test('renderer cleanup detaches rather than killing the terminal', () => {
  const source = read('apps/shell/src/lib/client/terminal-controller.ts');
  assert.match(source, /bridge\?\.detach\(sessionId\)/);
  assert.doesNotMatch(source, /bridge\?\.kill\(sessionId\).*terminal\.dispose/s);
});

test('workspace switching is an explicit terminal stop boundary', () => {
  assert.match(read('apps/shell/src/lib/client/native-bridge-controller.ts'), /Changing workspace stops the current terminal session/);
  assert.match(read('apps/desktop/src/main.ts'), /broker\.closeWorkspace\(previous\.workspaceId, previous\.generation\)/);
});
