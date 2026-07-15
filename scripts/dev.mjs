import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const shellOrigin = 'http://127.0.0.1:4321';
const shellUrl = `${shellOrigin}/w/local`;
const workspaceRoot = process.env.SILLPAK_WORKSPACE_ROOT ?? resolve(process.cwd(), 'examples/workspace');
const controlToken = process.env.SILLPAK_CONTROL_TOKEN ?? randomUUID();
const sessionToken = process.env.SILLPAK_SESSION_TOKEN ?? randomUUID();
const commonEnv = {
  ...process.env,
  SILLPAK_WORKSPACE_ROOT: workspaceRoot,
  SILLPAK_CONTROL_TOKEN: controlToken,
  SILLPAK_SESSION_TOKEN: sessionToken,
  SILLPAK_EXPECTED_HOST: '127.0.0.1:4321',
  SILLPAK_ALLOWED_ORIGIN: shellOrigin,
};
const childOptions = { stdio: 'inherit', shell: process.platform === 'win32', env: commonEnv };
const shell = spawn('pnpm', ['--filter', '@sillpak/shell', 'dev'], childOptions);
let desktop;
let stopped = false;

async function waitForShell() {
  for (;;) {
    if (stopped || shell.exitCode !== null) return;
    try {
      const response = await fetch(shellUrl, {
        redirect: 'manual',
        headers: {
          Host: '127.0.0.1:4321',
          Cookie: `sillpak_session=${encodeURIComponent(sessionToken)}`,
        },
      });
      if (response.status > 0 && response.status !== 503) break;
    } catch {
      // The Astro process is still binding. Keep polling without hiding its logs.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  if (stopped) return;
  desktop = spawn('pnpm', ['--filter', '@sillpak/desktop', 'dev'], {
    ...childOptions,
    env: { ...commonEnv, SILLPAK_DEV_URL: shellOrigin },
  });
}

void waitForShell();

const stop = () => {
  stopped = true;
  if (shell.exitCode === null) shell.kill();
  if (desktop?.exitCode === null) desktop.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
shell.on('exit', (code) => {
  if (!stopped && code && code !== 0) process.exitCode = code;
  if (desktop?.exitCode === null) desktop.kill();
});
