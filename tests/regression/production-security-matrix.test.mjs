import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 1 checkpoint regression: the security smoke matrix, re-run deterministically
// against the real production runtime module (apps/desktop/src/astro-runtime.ts)
// serving the built Astro server (apps/shell/dist/server/entry.mjs).
// Requires `pnpm build:shell` first; the missing build fails loudly, never skips.

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const entryPath = join(repoRoot, 'apps/shell/dist/server/index.mjs');
const sessionToken = 'regression-session-token';
const controlToken = 'regression-control-token';

let workspaceRoot;
let runtime;
let port;

function send(path, { method = 'GET', headers = {}, body } = {}) {
  const cleaned = Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined));
  return new Promise((resolveResponse, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, path, method, headers: cleaned },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolveResponse({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }));
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const asCookie = { Cookie: `sillpak_session=${sessionToken}` };
const asBearer = { Authorization: `Bearer ${controlToken}` };

function saveHeaders(overrides = {}) {
  return {
    ...asCookie,
    Origin: runtime.origin,
    'Content-Type': 'application/json',
    ...overrides,
  };
}

before(async () => {
  assert.ok(
    existsSync(entryPath),
    `built Astro server missing at ${entryPath}; run \`pnpm build:shell\` before the regression lane`,
  );
  workspaceRoot = await mkdtemp(join(tmpdir(), 'sillpak-regression-'));
  await writeFile(join(workspaceRoot, 'notes.md'), '# notes\nhello from the regression workspace\n');
  await mkdir(join(workspaceRoot, 'sub'));
  await writeFile(join(workspaceRoot, 'sub', 'data.txt'), '0123456789');
  await writeFile(join(workspaceRoot, 'save-target.md'), 'original content\n');

  const { startAstroRuntime } = await import('../../apps/desktop/src/astro-runtime.ts');
  runtime = await startAstroRuntime(workspaceRoot, repoRoot, { controlToken, sessionToken });
  port = Number(runtime.expectedHost.split(':')[1]);
});

after(async () => {
  await runtime?.close();
  if (workspaceRoot) await rm(workspaceRoot, { recursive: true, force: true });
});

test('cookie-authenticated workspace page read succeeds', async () => {
  const response = await send('/w/local', { headers: asCookie });
  assert.equal(response.status, 200);
});

test('bearer-authenticated workspace page read succeeds', async () => {
  const response = await send('/w/local', { headers: asBearer });
  assert.equal(response.status, 200);
});

test('missing credentials are refused with 401', async () => {
  const response = await send('/w/local');
  assert.equal(response.status, 401);
});

test('wrong session cookie is refused with 401', async () => {
  const response = await send('/w/local', { headers: { Cookie: 'sillpak_session=wrong' } });
  assert.equal(response.status, 401);
});

test('wrong bearer token is refused with 401', async () => {
  const response = await send('/w/local', { headers: { Authorization: 'Bearer wrong' } });
  assert.equal(response.status, 401);
});

test('non-exact Host is refused with 421 before Astro runs', async () => {
  const foreign = await send('/w/local', { headers: { ...asCookie, Host: 'attacker.example' } });
  assert.equal(foreign.status, 421);
  const portless = await send('/w/local', { headers: { ...asCookie, Host: '127.0.0.1' } });
  assert.equal(portless.status, 421);
});

test('cross-site fetch metadata is refused with 403 even when authenticated', async () => {
  const response = await send('/w/local', { headers: { ...asCookie, 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(response.status, 403);
});

test('artifact page for a workspace file renders', async () => {
  const response = await send('/w/local/notes.md', { headers: asCookie });
  assert.equal(response.status, 200);
});

test('raw artifact read returns file bytes', async () => {
  const response = await send('/api/raw/local/notes.md', { headers: asCookie });
  assert.equal(response.status, 200);
  assert.match(response.body, /hello from the regression workspace/);
});

test('raw byte range returns 206 with the requested slice', async () => {
  const response = await send('/api/raw/local/sub/data.txt', {
    headers: { ...asCookie, Range: 'bytes=2-5' },
  });
  assert.equal(response.status, 206);
  assert.equal(response.body, '2345');
});

test('directory projection returns JSON entries', async () => {
  const response = await send('/api/directory/local', { headers: asCookie });
  assert.equal(response.status, 200);
  const payload = JSON.parse(response.body);
  const names = JSON.stringify(payload);
  assert.match(names, /notes\.md/);
});

test('encoded traversal segments are refused with 404', async () => {
  const response = await send('/api/raw/local/%2e%2e/notes.md', { headers: asCookie });
  assert.equal(response.status, 404);
});

test('unauthenticated mutation is refused with 401', async () => {
  const response = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: { Origin: runtime.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'x', expectedMtimeMs: 0 }),
  });
  assert.equal(response.status, 401);
});

test('mutation without an Origin header is refused with 403', async () => {
  const response = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders({ Origin: undefined }),
    body: JSON.stringify({ content: 'x', expectedMtimeMs: 0 }),
  });
  assert.equal(response.status, 403);
});

test('mutation with a foreign Origin is refused with 403', async () => {
  const response = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders({ Origin: 'https://attacker.example' }),
    body: JSON.stringify({ content: 'x', expectedMtimeMs: 0 }),
  });
  assert.equal(response.status, 403);
});

test('non-JSON mutation content type is refused with 415', async () => {
  const response = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders({ 'Content-Type': 'text/plain' }),
    body: 'plain text',
  });
  assert.equal(response.status, 415);
});

test('save without required fields is refused with 400', async () => {
  const response = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders(),
    body: JSON.stringify({ content: 'missing mtime' }),
  });
  assert.equal(response.status, 400);
});

test('valid save succeeds and a stale expectedMtimeMs is then refused with 409', async () => {
  const target = join(workspaceRoot, 'save-target.md');
  const original = await stat(target);
  const first = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders(),
    body: JSON.stringify({ content: 'updated by regression test\n', expectedMtimeMs: original.mtimeMs }),
  });
  assert.equal(first.status, 200);
  const saved = JSON.parse(first.body);
  assert.equal(typeof saved.modifiedAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(saved.modifiedAt)));
  assert.equal(await readFile(target, 'utf8'), 'updated by regression test\n');

  const stale = await send('/api/save/local/save-target.md', {
    method: 'PUT',
    headers: saveHeaders(),
    body: JSON.stringify({ content: 'stale write must lose\n', expectedMtimeMs: original.mtimeMs }),
  });
  assert.equal(stale.status, 409);
  assert.equal(await readFile(target, 'utf8'), 'updated by regression test\n');
});
