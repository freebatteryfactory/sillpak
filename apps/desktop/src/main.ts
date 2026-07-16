import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
} from 'electron';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { ArtifactAddress } from '@sillpak/contracts';
import { startAstroRuntime, type AstroRuntime } from './astro-runtime.js';
import { channels, isArtifactAddress, isTerminalRendererCommand } from './protocol.js';
import { parseLocalOrigin } from './local-origin.js';
import { TerminalBroker } from './terminal-broker.js';
import { createElectronPtyHostChannel } from './electron-pty-host-channel.js';
import { resolveTerminalProfile } from './terminal-profile.js';
import { WorkspaceRegistry } from './workspace-registry.js';
import { WorkspaceWatcher } from './workspace-watcher.js';

const broker = new TerminalBroker(createElectronPtyHostChannel);
const workspaceRegistry = new WorkspaceRegistry();
const workspaceWatcher = new WorkspaceWatcher();
let runtime: AstroRuntime | undefined;
let shellBaseUrl = '';
let shellOrigin = '';

function secretFromEnv(name: string): string {
  return process.env[name] ?? randomBytes(32).toString('base64url');
}

const shellControlToken = secretFromEnv('SILLPAK_CONTROL_TOKEN');
const shellSessionToken = secretFromEnv('SILLPAK_SESSION_TOKEN');
process.env.SILLPAK_CONTROL_TOKEN = shellControlToken;
process.env.SILLPAK_SESSION_TOKEN = shellSessionToken;

function safeExternalUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function assertTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): void {
  if (!shellOrigin) throw new Error('SillPak origin is not ready');
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame) throw new Error('IPC is restricted to the top application frame');
  let origin = '';
  try { origin = new URL(frame.url).origin; }
  catch { throw new Error('IPC sender URL is invalid'); }
  if (origin !== shellOrigin) throw new Error('IPC sender origin is not trusted');
}

async function installLocalSessionCookie(): Promise<void> {
  await session.defaultSession.cookies.set({
    url: shellOrigin,
    name: 'sillpak_session',
    value: shellSessionToken,
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
  });
}

function installPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    let requestingOrigin = '';
    try { requestingOrigin = new URL(details.requestingUrl).origin; }
    catch { requestingOrigin = ''; }
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined;
    const audioOnly = !mediaTypes || mediaTypes.every((type) => type === 'audio');
    callback(permission === 'media' && requestingOrigin === shellOrigin && audioOnly);
  });
}

function watchWorkspace(): Promise<void> {
  const workspace = workspaceRegistry.current();
  return workspaceWatcher.watch(workspace.rootRealPath, workspace.generation, (event) => {
    for (const candidate of BrowserWindow.getAllWindows()) {
      if (!candidate.isDestroyed()) candidate.webContents.send(channels.workspaceChanged, event);
    }
  });
}

async function createWindow(): Promise<void> {
  // Sandboxed preload scripts must be CommonJS; tsconfig.preload.json owns this build.
  const preload = fileURLToPath(new URL('./preload-cjs/preload.js', import.meta.url));
  const window = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#151617',
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const detach = broker.registerWindow(window.webContents);
  window.once('closed', detach);
  window.once('ready-to-show', () => window.show());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url }) => {
    const external = safeExternalUrl(url);
    if (external) void shell.openExternal(external.href);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin === shellOrigin) return;
    } catch {
      // Invalid and non-URL navigations are refused below.
    }
    event.preventDefault();
    const external = safeExternalUrl(url);
    if (external) void shell.openExternal(external.href);
  });
  await window.loadURL(`${shellBaseUrl}/w/local`);
}

function installIpc(): void {
  ipcMain.handle(channels.terminalCommand, async (event, value: unknown) => {
    assertTrustedSender(event);
    if (!isTerminalRendererCommand(value)) throw new Error('invalid terminal command');
    if (value.type === 'open') {
      const cwd = await workspaceRegistry.resolveDirectory(value.request.initialAddress, value.request.workspaceGeneration);
      const profile = resolveTerminalProfile(value.request.profileId);
      return broker.open(event.sender, value.request, {
        sessionId: value.request.sessionId,
        executable: profile.executable,
        args: profile.args,
        cwd,
        cols: value.request.cols,
        rows: value.request.rows,
        env: profile.env,
      });
    }
    if (value.type === 'restart') return broker.restart(event.sender, value.sessionId);
    if (value.type === 'kill') {
      broker.kill(event.sender, value.sessionId);
      return undefined;
    }
    throw new Error('only open, restart, and kill use request-response IPC');
  });

  ipcMain.on(channels.terminalCommand, (event, value: unknown) => {
    try {
      assertTrustedSender(event);
      if (!isTerminalRendererCommand(value)) throw new Error('invalid terminal command');
      if (value.type === 'write') broker.write(event.sender, value.sessionId, value.data);
      else if (value.type === 'resize') broker.resize(event.sender, value.sessionId, value.cols, value.rows);
      else if (value.type === 'detach') broker.detach(event.sender, value.sessionId);
    } catch {
      // One-way IPC cannot report synchronously. Invalid messages are simply refused.
    }
  });

  ipcMain.handle(channels.chooseWorkspace, async (event) => {
    assertTrustedSender(event);
    const parent = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions: OpenDialogOptions = { properties: ['openDirectory'] };
    const result = parent
      ? await dialog.showOpenDialog(parent, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled) return null;
    const selected = result.filePaths[0];
    if (!selected) return null;

    const prepared = await workspaceRegistry.prepare(selected);
    const response = await fetch(`${shellBaseUrl}/api/workspace`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${shellControlToken}`,
        'Content-Type': 'application/json',
        Origin: shellOrigin,
      },
      body: JSON.stringify({ path: prepared.rootRealPath, generation: prepared.generation }),
    });
    if (!response.ok) {
      const payload = await response.json() as { readonly error?: string };
      throw new Error(payload.error ?? 'workspace change failed');
    }
    const previous = workspaceRegistry.current();
    broker.closeWorkspace(previous.workspaceId, previous.generation);
    workspaceRegistry.commit(prepared);
    await watchWorkspace();
    return workspaceRegistry.snapshot();
  });

  ipcMain.handle(channels.revealArtifact, async (event, address: unknown) => {
    assertTrustedSender(event);
    if (!isArtifactAddress(address)) throw new Error('invalid artifact address');
    shell.showItemInFolder(await workspaceRegistry.resolveArtifact(address, workspaceRegistry.current().generation));
  });

  ipcMain.handle(channels.openArtifact, async (event, address: unknown) => {
    assertTrustedSender(event);
    if (!isArtifactAddress(address)) throw new Error('invalid artifact address');
    const error = await shell.openPath(await workspaceRegistry.resolveArtifact(address, workspaceRegistry.current().generation));
    if (error) throw new Error(error);
  });
}

function bootTrace(step: string): void {
  if (!process.env.SILLPAK_BOOT_TRACE) return;
  try { writeFileSync(join(app.getPath('userData'), 'boot-trace.log'), `${new Date().toISOString()} ${step}\n`, { flag: 'a' }); }
  catch { /* tracing is best-effort */ }
}

app.whenReady().then(async () => {
  bootTrace('ready');
  const defaultWorkspace = process.env.SILLPAK_WORKSPACE_ROOT ?? resolve(app.getPath('documents'));
  const workspace = await workspaceRegistry.initialize(defaultWorkspace);
  bootTrace('workspace-initialized');
  broker.start();
  bootTrace('broker-started');

  const devUrl = process.env.SILLPAK_DEV_URL;
  if (devUrl) {
    const local = parseLocalOrigin(devUrl);
    shellBaseUrl = local.origin;
    shellOrigin = local.origin;
    process.env.SILLPAK_ALLOWED_ORIGIN = local.origin;
    process.env.SILLPAK_EXPECTED_HOST = local.expectedHost;
  } else {
    bootTrace(`runtime-start appPath=${app.getAppPath()}`);
    runtime = await startAstroRuntime(workspace.rootRealPath, app.getAppPath(), {
      controlToken: shellControlToken,
      sessionToken: shellSessionToken,
    });
    shellBaseUrl = runtime.url;
    shellOrigin = runtime.origin;
    bootTrace(`runtime-ready ${runtime.origin}`);
  }

  await installLocalSessionCookie();
  bootTrace('cookie-installed');
  installPermissions();
  installIpc();
  await watchWorkspace();
  bootTrace('workspace-watched');
  await createWindow();
  bootTrace('window-created');
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  // The dialog is invisible to headless diagnosis, and a packaged Windows GUI
  // process has no usable stderr; persist the failure for post-mortems too.
  console.error(`SillPak failed to start: ${message}`);
  try { writeFileSync(join(app.getPath('userData'), 'startup-error.log'), `${new Date().toISOString()}\n${message}\n`); }
  catch { /* the dialog remains the last resort */ }
  dialog.showErrorBox('SillPak failed to start', message);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  broker.stop();
  void workspaceWatcher.stop();
  void runtime?.close();
});
