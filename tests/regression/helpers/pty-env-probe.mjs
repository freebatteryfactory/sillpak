// Spawns a real PTY child (ConPTY on Windows, forkpty elsewhere) with the
// host-owned terminal profile environment and prints which SILLPAK_* keys the
// child actually observed. Runs as a subprocess of the regression test so
// node-pty's platform noise stays in captured stderr and its lingering PTY
// handles cannot keep the test runner's event loop alive.
import { chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const { resolveTerminalProfile } = await import('../../../apps/desktop/src/terminal-profile.ts');
const requireFromDesktop = createRequire(new URL('../../../apps/desktop/package.json', import.meta.url));

// package managers can drop the execute bit on node-pty's prebuilt macOS
// spawn-helper, which surfaces as `posix_spawnp failed` at pty.spawn.
if (process.platform === 'darwin') {
  const ptyPackageDir = dirname(requireFromDesktop.resolve('node-pty/package.json'));
  for (const arch of ['darwin-arm64', 'darwin-x64']) {
    try { chmodSync(join(ptyPackageDir, 'prebuilds', arch, 'spawn-helper'), 0o755); }
    catch { /* that prebuild is not installed */ }
  }
}

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
  .replace(/\[[0-9;?]*[A-Za-z]/g, '')
  .replace(/[\r\n]/g, '')
  .match(/SILLPAK-ENV-PROBE:(\[.*?\]):END/);

// Exit without calling node-pty kill(): on Windows kill() forks a console-list
// agent that dies with `AttachConsole failed` in console-less CI sessions and
// can take this helper down through an unhandled rejection. Process exit tears
// down the PTY pair, and the pair takes the child with it.
const finish = (code, line) => {
  process.stdout.write(`${line}\n`, () => process.exit(code));
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
