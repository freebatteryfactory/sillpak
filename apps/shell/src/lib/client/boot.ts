import { bootArtifactSystemActions } from './artifact-system-controller.js';
import { bootCodeEditors } from './code-editor-controller.js';
import { bootContextShelf } from './context-controller.js';
import { bootDirectoryViews } from './directory-controller.js';
import { bootDocxViews } from './docx-controller.js';
import { bootMarkdownEditors } from './markdown-editor-controller.js';
import { bootNativeBridgeControls } from './native-bridge-controller.js';
import { bootPdfViews } from './pdf-controller.js';
import { bootSpreadsheetViews } from './spreadsheet-controller.js';
import { bootTerminal } from './terminal-controller.js';
import { bootVoiceControl } from './voice/voice-controller.js';
import { bootWorkspaceChangeIndicator } from './workspace-change-controller.js';
import { bootShellMode } from './shell-mode-controller.js';
import { installIslandLifecycle, releaseDisconnectedIslands } from './island-registry.js';

export function bootShell(): void {
  installIslandLifecycle();
  releaseDisconnectedIslands();
  bootShellMode();
  bootTerminal();
  bootContextShelf();
  bootNativeBridgeControls();
  bootArtifactSystemActions();
  bootDirectoryViews();
  bootCodeEditors();
  bootMarkdownEditors();
  bootDocxViews();
  bootPdfViews();
  bootSpreadsheetViews();
  bootVoiceControl();
  bootWorkspaceChangeIndicator();
}
