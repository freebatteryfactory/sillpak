import * as os from 'node:os';
import type { TerminalProfileId } from '@sillpak/contracts';

export interface TerminalProfileLaunch {
  readonly executable: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

function inheritedEnvironment(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && !key.startsWith('SILLPAK_')) env[key] = value;
  }
  env.TERM = 'xterm-256color';
  return env;
}

export function resolveTerminalProfile(profileId: TerminalProfileId): TerminalProfileLaunch {
  if (profileId !== 'default') throw new Error(`unsupported terminal profile ${profileId}`);
  if (process.platform === 'win32') {
    return {
      executable: process.env.ComSpec?.toLowerCase().includes('cmd.exe') ? 'powershell.exe' : (process.env.ComSpec ?? 'powershell.exe'),
      args: [],
      env: inheritedEnvironment(),
    };
  }
  return {
    executable: process.env.SHELL ?? '/bin/sh',
    args: [],
    env: { ...inheritedEnvironment(), HOME: process.env.HOME ?? os.homedir() },
  };
}
