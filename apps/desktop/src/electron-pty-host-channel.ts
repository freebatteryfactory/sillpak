import { utilityProcess, type UtilityProcess } from 'electron';
import { fileURLToPath } from 'node:url';
import type { PtyHostCommand } from './protocol.js';
import type { PtyHostChannel } from './terminal-broker.js';

/**
 * The real runtime transport for the TerminalBroker: an Electron utility process
 * running `pty-host.js`. This is the only place the broker's child I/O touches
 * Electron. Behaviour is byte-for-byte what the broker did inline before the
 * transport seam was introduced — same entry, stdio, SILLPAK_*-stripped env, and
 * stdout/stderr piping — so the default runtime path is unchanged.
 */
export function createElectronPtyHostChannel(): PtyHostChannel {
  const entry = fileURLToPath(new URL('./pty-host.js', import.meta.url));
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && !key.startsWith('SILLPAK_')) env[key] = value;
  }
  const child: UtilityProcess = utilityProcess.fork(entry, [], {
    serviceName: 'sillpak-pty-host',
    stdio: 'pipe',
    env,
  });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  return {
    post(command: PtyHostCommand): void {
      child.postMessage(command);
    },
    onMessage(listener: (event: unknown) => void): void {
      child.on('message', listener);
    },
    onExit(listener: (code: number) => void): void {
      child.on('exit', listener);
    },
    kill(): void {
      child.kill();
    },
  };
}
