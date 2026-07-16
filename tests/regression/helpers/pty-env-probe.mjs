// Spawns a real PTY child (ConPTY on Windows, forkpty elsewhere) with the
// host-owned terminal profile environment and prints which SILLPAK_* keys the
// child actually observed. Runs as a subprocess of the regression test so
// node-pty's Windows kill() console-agent noise stays in captured stderr and
// its lingering ConPTY handles cannot keep the test runner's event loop alive.
import { createRequire } from 'node:module';

const { resolveTerminalProfile } = await import('../../../apps/desktop/src/terminal-profile.ts');
const requireFromDesktop = createRequire(new URL('../../../apps/desktop/package.json', import.meta.url));
const pty = requireFromDesktop('node-pty');

const profile = resolveTerminalProfile('default');
const probe = 'process.stdout.write("SILLPAK-ENV-PROBE:" + JSON.stringify(Object.keys(process.env).filter((key) => key.startsWith("SILLPAK_"))) + ":END"); setInterval(() => {}, 1000);';
const child = pty.spawn(process.execPath, ['-e', probe], {
  name: 'xterm-256color',
  cols: 200,
  rows: 30,
  cwd: process.cwd(),
  env: profile.env,
});

let output = '';
// ConPTY may wrap or decorate output; strip ANSI escape sequences and line
// breaks before matching so the probe marker is contiguous.
const probeResult = () => output
  .replace(/\[[0-9;?]*[A-Za-z]/g, '')
  .replace(/[\r\n]/g, '')
  .match(/SILLPAK-ENV-PROBE:(\[.*?\]):END/);

const finish = (code, line) => {
  process.stdout.write(`${line}\n`);
  try { child.kill(); } catch { /* the PTY is already gone */ }
  // node-pty can hold ConPTY handles open after kill; exit explicitly.
  setTimeout(() => process.exit(code), 250);
};

const timer = setTimeout(() => {
  finish(1, `PROBE-TIMEOUT:${JSON.stringify(output)}`);
}, 20000);

child.onData((data) => {
  output += data;
  const match = probeResult();
  if (match) {
    clearTimeout(timer);
    finish(0, `PROBE-RESULT:${match[1]}:PID:${child.pid}`);
  }
});
child.onExit(() => {
  const match = probeResult();
  clearTimeout(timer);
  if (match) finish(0, `PROBE-RESULT:${match[1]}:PID:${child.pid}`);
  else finish(1, `PROBE-EXIT-WITHOUT-OUTPUT:${JSON.stringify(output)}`);
});
