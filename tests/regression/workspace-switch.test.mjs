import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Phase 1 checkpoint regression: workspace switching is an explicit terminal
// stop boundary (CANON hard laws 4 and 5). This test drives the REAL
// TerminalBroker lifecycle logic deterministically, with no Electron and no
// real PTY, by handing the broker a fake PtyHostChannel through its transport
// seam. It proves:
//   (a) a workspace change explicitly STOPS the prior generation's session
//       (a `kill` command is posted for that generation; state -> exiting/killed),
//       and renderer detach never kills — only the explicit action does;
//   (b) a session ID already bound to one workspace generation is never reused
//       for a different generation (broker.open throws), while the new
//       generation's own session ID opens a FRESH, independent session and
//       leaves the old record untouched;
//   (c) after the prior generation is stopped, input to that ended session is
//       NOT forwarded to the PTY host — it yields the friendly `session-ended`
//       notice instead.
//
// The broker is imported from the BUILT desktop output. Its source imports
// `./protocol.js`, a specifier Node's type-stripping resolves only against a
// real `.js` file (i.e. `dist/` after `pnpm build`), which is exactly this
// lane's charter of exercising built artifacts. The compiled broker contains no
// Electron runtime import (the utility-process transport lives in the separate
// `electron-pty-host-channel.js` adapter, which this test never imports), so it
// loads and runs under plain Node.
//
// What this test does NOT prove: the interactive native folder-dialog flow
// (`dialog.showOpenDialog` in main.ts) still requires a human click; this test
// proves the broker/lifecycle logic that main.ts invokes after that dialog
// resolves, not the GUI gesture itself.

const brokerUrl = new URL('../../apps/desktop/dist/terminal-broker.js', import.meta.url);
if (!existsSync(fileURLToPath(brokerUrl))) {
  throw new Error(
    `built broker missing at ${fileURLToPath(brokerUrl)}; run \`pnpm --filter @sillpak/desktop build\` before the regression lane`,
  );
}
const { TerminalBroker } = await import(brokerUrl.href);

const TERMINAL_PROTOCOL_VERSION = 2;

// A synchronous stand-in for the Electron utility-process transport. It records
// every command the broker posts and lets the test push PtyHostEvents back in.
function makeFakeChannel() {
  const posted = [];
  let killed = false;
  let onMessage = () => {};
  let onExit = () => {};
  const channel = {
    post(command) {
      posted.push(command);
    },
    onMessage(listener) {
      onMessage = listener;
    },
    onExit(listener) {
      onExit = listener;
    },
    kill() {
      killed = true;
    },
  };
  return {
    channel,
    posted,
    wasKilled: () => killed,
    emit: (event) => onMessage(event),
    hostExit: (code) => onExit(code),
  };
}

// Duck-typed fake WebContents owner, matching the surface the broker touches.
function makeOwner(id, sent) {
  return {
    id,
    isDestroyed: () => false,
    send: (channelName, event) => sent.push({ channelName, event }),
  };
}

function openRequest(generation) {
  return {
    sessionId: `primary:${generation}`,
    profileId: 'default',
    workspaceId: 'local',
    workspaceGeneration: generation,
    initialAddress: { workspace: 'local', segments: [] },
    cols: 80,
    rows: 24,
  };
}

function launchSpec(generation) {
  return {
    sessionId: `primary:${generation}`,
    executable: 'test-shell',
    args: [],
    cwd: '/workspace',
    cols: 80,
    rows: 24,
    env: { TERM: 'xterm-256color' },
  };
}

// Mirror how main.ts opens a session: open, then the host reports it ready.
function openAndReady(broker, fake, owner, generation, pid) {
  const snapshot = broker.open(owner, openRequest(generation), launchSpec(generation));
  fake.emit({
    type: 'ready',
    sessionId: `primary:${generation}`,
    processGeneration: 1,
    pid,
  });
  return snapshot;
}

function commandsFor(posted, sessionId) {
  return posted.filter((command) => command.sessionId === sessionId
    || command.request?.sessionId === sessionId);
}

test('(a) a workspace change explicitly stops the prior generation session; detach never kills', () => {
  const fake = makeFakeChannel();
  const broker = new TerminalBroker(() => fake.channel);
  const sent = [];
  const owner = makeOwner(1, sent);
  broker.start();

  openAndReady(broker, fake, owner, 1, 4242);

  // A spawn was posted for generation 1 and the session is live.
  const spawn = fake.posted.find((command) => command.type === 'spawn');
  assert.ok(spawn, 'a spawn command was posted for the opened session');
  assert.equal(spawn.request.sessionId, 'primary:1');
  assert.equal(spawn.request.processGeneration, 1);

  // Renderer detach must NOT terminate the session (CANON hard law 4).
  const postedBeforeDetach = fake.posted.length;
  broker.detach(owner, 'primary:1');
  assert.equal(fake.posted.length, postedBeforeDetach, 'detach posts nothing to the PTY host');
  assert.ok(
    !fake.posted.some((command) => command.type === 'kill'),
    'detach never posts a kill command',
  );
  // Re-attach so the owner can drive the session again (as a reload would).
  broker.open(owner, openRequest(1), launchSpec(1));

  // The workspace switch: main.ts calls closeWorkspace(previous.workspaceId,
  // previous.generation) BEFORE committing the new workspace.
  broker.closeWorkspace('local', 1);

  const killGen1 = fake.posted.find(
    (command) => command.type === 'kill' && command.sessionId === 'primary:1',
  );
  assert.ok(killGen1, 'closeWorkspace posts an explicit kill for the prior generation');
  assert.equal(killGen1.processGeneration, 1);
  assert.equal(killGen1.protocolVersion, TERMINAL_PROTOCOL_VERSION);

  // The session state becomes exiting immediately, then killed once the host
  // confirms the child exited (terminationRequested distinguishes kill/exit).
  const afterKill = broker.open(owner, openRequest(1), launchSpec(1));
  assert.equal(afterKill.state, 'exiting', 'state is exiting once the stop is in flight');

  fake.emit({ type: 'exit', sessionId: 'primary:1', processGeneration: 1, exitCode: 0 });
  const afterExit = broker.open(owner, openRequest(1), launchSpec(1));
  assert.equal(afterExit.state, 'killed', 'an acknowledged stop lands as killed, not exited');

  const exitToRenderer = sent.find((message) => message.event.type === 'exit');
  assert.ok(exitToRenderer, 'the renderer was told the session exited');
});

test('(b) a bound session ID is never transplanted across generations; the new generation opens fresh', () => {
  const fake = makeFakeChannel();
  const broker = new TerminalBroker(() => fake.channel);
  const sent = [];
  const owner = makeOwner(1, sent);
  broker.start();

  openAndReady(broker, fake, owner, 1, 4242);
  broker.closeWorkspace('local', 1);
  fake.emit({ type: 'exit', sessionId: 'primary:1', processGeneration: 1, exitCode: 0 });

  // Refusing the transplant: opening the SAME session id (`primary:1`) with a
  // different workspace generation must throw — the id is bound to generation 1.
  assert.throws(
    () => broker.open(owner, { ...openRequest(1), workspaceGeneration: 2 }, launchSpec(1)),
    /already bound to a different workspace lease or profile/,
    'reusing a bound session id under a new generation is refused',
  );

  // The generation-2 session uses its OWN id (`primary:2`, per TerminalDock),
  // which opens a fresh, independent session.
  const postedBefore = fake.posted.length;
  const gen2 = broker.open(owner, openRequest(2), launchSpec(2));
  assert.equal(gen2.sessionId, 'primary:2');
  assert.equal(gen2.workspaceGeneration, 2);
  assert.equal(gen2.state, 'starting', 'the generation-2 session is a fresh, independent session');

  const gen2Spawn = fake.posted
    .slice(postedBefore)
    .find((command) => command.type === 'spawn' && command.request.sessionId === 'primary:2');
  assert.ok(gen2Spawn, 'opening the generation-2 session posts its own spawn');

  // The old record is left untouched: still present, still killed.
  const gen1After = broker.open(owner, openRequest(1), launchSpec(1));
  assert.equal(gen1After.sessionId, 'primary:1');
  assert.equal(gen1After.state, 'killed', 'the prior generation record is untouched by the new open');
  assert.equal(gen1After.workspaceGeneration, 1);
});

test('(c) input to the stopped generation is not forwarded; it yields the session-ended notice', () => {
  const fake = makeFakeChannel();
  const broker = new TerminalBroker(() => fake.channel);
  const sent = [];
  const owner = makeOwner(1, sent);
  broker.start();

  openAndReady(broker, fake, owner, 1, 4242);
  broker.closeWorkspace('local', 1);
  fake.emit({ type: 'exit', sessionId: 'primary:1', processGeneration: 1, exitCode: 0 });

  const postedBeforeWrite = fake.posted.length;
  broker.write(owner, 'primary:1', 'ls -la\n');

  // No write command reaches the PTY host for the ended session.
  assert.equal(
    fake.posted.length,
    postedBeforeWrite,
    'a write to an ended session posts nothing to the PTY host',
  );
  assert.ok(
    !commandsFor(fake.posted, 'primary:1').some((command) => command.type === 'write'),
    'no write command is forwarded for the ended session',
  );

  // The renderer instead receives the friendly end-of-session notice.
  const notice = sent.find((message) => message.event.code === 'session-ended');
  assert.ok(notice, 'the renderer receives the session-ended notice');
  assert.equal(notice.event.type, 'error');
  assert.match(notice.event.message, /has ended/);
});
