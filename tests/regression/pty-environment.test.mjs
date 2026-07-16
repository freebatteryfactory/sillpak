import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Phase 1 checkpoint regression: `SILLPAK_*` values never reach PTY children.
// The first test proves the host-owned profile strips them; the second spawns a
// real PTY child (ConPTY on Windows, forkpty elsewhere) via a captured helper
// subprocess and reads the child's actual environment back, so the proof is
// runtime, not source-level.

process.env.SILLPAK_REGRESSION_SECRET = 'must-not-leak-into-pty-children';
process.env.SILLPAK_SESSION_TOKEN = 'must-not-leak-either';

const { resolveTerminalProfile } = await import('../../apps/desktop/src/terminal-profile.ts');
const probeHelper = fileURLToPath(new URL('./helpers/pty-env-probe.mjs', import.meta.url));

test('terminal profile strips every SILLPAK_* variable and pins TERM', () => {
  const profile = resolveTerminalProfile('default');
  const leaked = Object.keys(profile.env).filter((key) => key.startsWith('SILLPAK_'));
  assert.deepEqual(leaked, []);
  assert.equal(profile.env.TERM, 'xterm-256color');
  assert.ok(profile.executable.length > 0);
});

test('a real PTY child observes zero SILLPAK_* variables', async () => {
  const { stdout, stderr } = await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['--experimental-strip-types', probeHelper],
      { timeout: 60000, windowsHide: true },
      (error, out, err) => {
        if (error) reject(new Error(`PTY probe helper failed: ${error.message}\nstdout: ${out}\nstderr: ${err}`));
        else resolve({ stdout: out, stderr: err });
      },
    );
  });
  const match = stdout.match(/PROBE-RESULT:(\[.*?\]):PID:(\d+)/);
  assert.ok(match, `probe helper reported no result\nstdout: ${stdout}\nstderr: ${stderr}`);
  assert.ok(Number(match[2]) > 0, 'PTY child spawned with a real pid');
  assert.deepEqual(JSON.parse(match[1]), [], 'PTY child environment contains no SILLPAK_* keys');
});
