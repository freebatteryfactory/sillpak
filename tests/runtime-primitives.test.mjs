import test from 'node:test';
import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const protocol = await import('../apps/desktop/src/protocol.ts');
const state = await import('../apps/shell/src/lib/state/shell-state.ts');
const range = await import('../apps/shell/src/lib/server/byte-range.ts');
const requestAuth = await import('../apps/shell/src/lib/server/request-auth.ts');
const localOrigin = await import('../apps/desktop/src/local-origin.ts');

const openRequest = {
  sessionId: 'primary:1',
  profileId: 'default',
  workspaceId: 'local',
  workspaceGeneration: 1,
  initialAddress: { workspace: 'local', segments: ['docs'] },
  cols: 80,
  rows: 24,
};

test('terminal renderer command validation rejects malformed messages', () => {
  assert.equal(protocol.isTerminalRendererCommand({ type: 'open', request: openRequest }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'restart', sessionId: 'primary:1' }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'write', sessionId: 'primary:1', data: 'pwd' }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'resize', sessionId: 'primary:1', cols: 80, rows: 24 }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'detach', sessionId: 'primary:1' }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'kill', sessionId: 'primary:1' }), true);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'open', request: { ...openRequest, cols: '80' } }), false);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'open', request: { ...openRequest, workspaceGeneration: 0 } }), false);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'write', sessionId: 'primary:1' }), false);
  assert.equal(protocol.isTerminalRendererCommand({ type: 'mystery' }), false);
});

test('PTY host protocol requires explicit version and resolved launch', () => {
  const launch = {
    sessionId: 'primary:1',
    processGeneration: 1,
    executable: '/bin/sh',
    args: [],
    cwd: '/',
    cols: 80,
    rows: 24,
    env: { TERM: 'xterm-256color' },
  };
  assert.equal(protocol.isPtyHostCommand({ protocolVersion: 2, type: 'spawn', request: launch }), true);
  assert.equal(protocol.isPtyHostCommand({ protocolVersion: 1, type: 'spawn', request: launch }), false);
  assert.equal(protocol.isPtyHostCommand({ protocolVersion: 2, type: 'spawn', request: { ...launch, executable: '' } }), false);
  assert.equal(protocol.isPtyHostEvent({ type: 'ready', sessionId: 'primary:1', processGeneration: 1, pid: 42 }), true);
  assert.equal(protocol.isPtyHostEvent({ type: 'data', sessionId: 'primary:1', processGeneration: 1, data: 'ok' }), true);
  assert.equal(protocol.isPtyHostEvent({ type: 'error', code: 'fault', message: 'bad' }), true);
  assert.equal(protocol.isPtyHostEvent({ type: 'ready', sessionId: 'primary:1', processGeneration: 0, pid: 42 }), false);
  assert.equal(protocol.isPtyHostEvent({ type: 'data', sessionId: '../escape', processGeneration: 1, data: 'no' }), false);
});

test('state port keeps explicit context unique and observable', () => {
  const port = state.createShellStatePort();
  const snapshots = [];
  const unsubscribe = port.subscribe((snapshot) => snapshots.push(snapshot));
  port.dispatch({ type: 'context.attached', path: 'notes.md' });
  port.dispatch({ type: 'context.attached', path: 'notes.md' });
  port.dispatch({ type: 'context.detached', path: 'notes.md' });
  unsubscribe();
  assert.deepEqual(snapshots.map((snapshot) => snapshot.contextPaths), [['notes.md'], []]);
});

test('single byte ranges support bounded, open, and suffix forms', () => {
  assert.deepEqual(range.parseByteRange('bytes=10-19', 100), { start: 10, end: 19 });
  assert.deepEqual(range.parseByteRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(range.parseByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(range.parseByteRange('bytes=-200', 100), { start: 0, end: 99 });
  assert.equal(range.parseByteRange('bytes=100-120', 100), undefined);
  assert.equal(range.parseByteRange('bytes=10-9', 100), undefined);
  assert.equal(range.parseByteRange('items=0-1', 100), undefined);
});

test('artifact address validation rejects route traversal segments', () => {
  assert.equal(protocol.isArtifactAddress({ workspace: 'local', segments: ['docs', 'readme.md'] }), true);
  assert.equal(protocol.isArtifactAddress({ workspace: 'local', segments: ['..', 'secret'] }), false);
  assert.equal(protocol.isArtifactAddress({ workspace: 'local', segments: ['a/b'] }), false);
  assert.equal(protocol.isArtifactAddress({ workspace: 'remote', segments: [] }), false);
});

test('workspace path resolver refuses cwd and symlink escape', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'sillpak-root-'));
  const outside = await mkdtemp(join(tmpdir(), 'sillpak-outside-'));
  const nested = join(root, 'nested');
  await mkdir(nested);
  await writeFile(join(nested, 'note.txt'), 'hello');
  const { assertWorkspaceDirectory, resolveWorkspaceArtifact } = await import('../apps/desktop/src/workspace-path.ts');
  assert.equal(await assertWorkspaceDirectory(root, nested), await realpath(nested));
  assert.equal(
    await resolveWorkspaceArtifact(root, { workspace: 'local', segments: ['nested', 'note.txt'] }),
    await realpath(join(nested, 'note.txt')),
  );
  await assert.rejects(() => assertWorkspaceDirectory(root, outside), /outside the active workspace/);
  const link = join(root, 'escape-link');
  try {
    await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    t.diagnostic(`symlink escape branch skipped: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  await assert.rejects(
    () => resolveWorkspaceArtifact(root, { workspace: 'local', segments: ['escape-link'] }),
    /outside the workspace/,
  );
});

test('desktop local origin parser refuses remote or ambiguous application URLs', () => {
  assert.deepEqual(localOrigin.parseLocalOrigin('http://127.0.0.1:4321'), {
    origin: 'http://127.0.0.1:4321',
    expectedHost: '127.0.0.1:4321',
  });
  assert.throws(() => localOrigin.parseLocalOrigin('https://127.0.0.1:4321'), /origin-only/);
  assert.throws(() => localOrigin.parseLocalOrigin('http://localhost:4321'), /origin-only/);
  assert.throws(() => localOrigin.parseLocalOrigin('http://127.0.0.1:4321/w/local'), /origin-only/);
  assert.throws(() => localOrigin.parseLocalOrigin('https://attacker.example'), /origin-only/);
});

test('local request security refuses rebinding and unauthenticated workspace access', () => {
  const config = {
    expectedHost: '127.0.0.1:4321',
    allowedOrigin: 'http://127.0.0.1:4321',
    sessionToken: 'session-secret',
    controlToken: 'control-secret',
  };
  const decide = (path, init = {}) => requestAuth.authorizeLocalRequest(
    new Request(`http://127.0.0.1:4321${path}`, init),
    config,
  );

  assert.deepEqual(
    decide('/w/local', { headers: { Host: 'attacker.example' } }),
    { ok: false, status: 421, reason: 'request host does not match the bound local origin' },
  );
  assert.deepEqual(
    decide('/w/local', { headers: { Host: config.expectedHost } }),
    { ok: false, status: 401, reason: 'local workspace request is not authorized' },
  );
  assert.equal(decide('/w/local', {
    headers: { Host: config.expectedHost, Cookie: 'sillpak_session=session-secret' },
  }).ok, true);
  assert.deepEqual(
    decide('/api/save/local/file.md', {
      method: 'PUT',
      headers: {
        Host: config.expectedHost,
        Cookie: 'sillpak_session=session-secret',
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
    }),
    { ok: false, status: 403, reason: 'mutation origin does not match the bound local origin' },
  );
  assert.equal(decide('/api/save/local/file.md', {
    method: 'PUT',
    headers: {
      Host: config.expectedHost,
      Cookie: 'sillpak_session=session-secret',
      Origin: config.allowedOrigin,
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': 'application/json',
    },
  }).ok, true);
  assert.deepEqual(
    decide('/api/save/local/file.md', {
      method: 'PUT',
      headers: {
        Host: config.expectedHost,
        Cookie: 'sillpak_session=session-secret',
        Origin: config.allowedOrigin,
        'Content-Type': 'text/plain',
      },
    }),
    { ok: false, status: 415, reason: 'local API mutations require application/json' },
  );
  assert.equal(decide('/api/workspace', {
    method: 'PUT',
    headers: {
      Host: config.expectedHost,
      Authorization: 'Bearer control-secret',
      Origin: config.allowedOrigin,
      'Content-Type': 'application/json',
    },
  }).ok, true);
});

test('viewer capability claims match the shipping surfaces', async () => {
  const { capabilitiesFor } = await import('../apps/shell/src/lib/server/artifact-capabilities.ts');
  const csv = capabilitiesFor('spreadsheet', '.csv');
  const pdf = capabilitiesFor('pdf', '.pdf');
  assert.equal(csv.edit, 'none');
  assert.equal(pdf.search, false);
  assert.equal(pdf.selectText, false);
});
