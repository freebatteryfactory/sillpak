import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import { isPtyHostCommand, type PtyHostCommand, type PtyHostEvent, type ResolvedTerminalLaunch } from './protocol.js';

interface PtyRecord {
  readonly child: IPty;
  readonly processGeneration: number;
}

const sessions = new Map<string, PtyRecord>();
const detectedParentPort = process.parentPort;
if (!detectedParentPort) throw new Error('PTY host must run as an Electron utility process');
const parentPort = detectedParentPort;

function post(event: PtyHostEvent): void {
  parentPort.postMessage(event);
}

function start(request: ResolvedTerminalLaunch, replace: boolean): void {
  const existing = sessions.get(request.sessionId);
  if (existing && !replace) {
    post({
      type: 'error',
      sessionId: request.sessionId,
      processGeneration: existing.processGeneration,
      code: 'duplicate-session',
      message: 'terminal session already exists; attach or explicitly restart it',
    });
    return;
  }
  if (existing) {
    sessions.delete(request.sessionId);
    existing.child.kill();
  }

  const child = pty.spawn(request.executable, [...request.args], {
    name: 'xterm-256color',
    cols: Math.max(1, request.cols),
    rows: Math.max(1, request.rows),
    cwd: request.cwd,
    env: { ...request.env, TERM: 'xterm-256color' },
    handleFlowControl: true,
  });
  const record: PtyRecord = { child, processGeneration: request.processGeneration };
  sessions.set(request.sessionId, record);

  child.onData((data) => {
    post({
      type: 'data',
      sessionId: request.sessionId,
      processGeneration: request.processGeneration,
      data,
    });
  });
  child.onExit(({ exitCode, signal }) => {
    const current = sessions.get(request.sessionId);
    if (current?.processGeneration === request.processGeneration) sessions.delete(request.sessionId);
    post({
      type: 'exit',
      sessionId: request.sessionId,
      processGeneration: request.processGeneration,
      exitCode,
      ...(signal === undefined ? {} : { signal }),
    });
  });
  post({
    type: 'ready',
    sessionId: request.sessionId,
    processGeneration: request.processGeneration,
    pid: child.pid,
  });
}

function handle(command: PtyHostCommand): void {
  if (command.type === 'spawn') {
    start(command.request, false);
    return;
  }
  if (command.type === 'restart') {
    start(command.request, true);
    return;
  }

  const record = sessions.get(command.sessionId);
  if (!record || record.processGeneration !== command.processGeneration) {
    post({
      type: 'error',
      sessionId: command.sessionId,
      processGeneration: command.processGeneration,
      code: 'session-not-found',
      message: 'terminal session does not exist for this process generation',
    });
    return;
  }

  if (command.type === 'write') record.child.write(command.data);
  if (command.type === 'resize') record.child.resize(Math.max(1, command.cols), Math.max(1, command.rows));
  if (command.type === 'kill') {
    sessions.delete(command.sessionId);
    record.child.kill();
  }
}

parentPort.on('message', (event) => {
  const command = event.data;
  if (!isPtyHostCommand(command)) {
    post({ type: 'error', code: 'malformed-command', message: 'PTY host refused a malformed command' });
    return;
  }
  try {
    handle(command);
  } catch (error) {
    post({
      type: 'error',
      code: 'pty-host-failure',
      message: error instanceof Error ? error.message : 'PTY host failure',
    });
  }
});

process.on('exit', () => {
  for (const record of sessions.values()) record.child.kill();
});
