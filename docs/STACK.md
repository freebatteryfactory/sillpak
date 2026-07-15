# Shipping stack

## Host and routing

- Electron 42
- Astro 7
- `@astrojs/node` 11 in middleware mode
- TypeScript 5.9
- pnpm 10
- electron-builder 26

Electron hosts the local application and native authority. Astro owns routes and the web-native page model.

## LiteShip

Direct runtime scopes:

- `@czap/astro`
- `@czap/core`
- `@czap/web`
- `@czap/error`

Development rigor:

- `@czap/gauntlet`
- `@czap/audit`

Astro's LiteShip integration reaches Vite, Detect, Compiler, Quantizer, Edge, Worker, GenUI, and Scene transitively where the host package requires them. Product code imports additional scopes only when it directly uses their public APIs.

## Terminal

- `@xterm/xterm`
- fit, search, serialize, and WebGL addons
- node-pty in one Electron utility process

The renderer owns terminal pixels. Electron main owns session identity and authorization. The utility process owns PTY mechanics.

## Artifacts

- CodeMirror 6 for exact text and code
- Lexical core for rich Markdown editing, without `@lexical/react`
- markdown-it for formatted Markdown
- Mammoth for read-only DOCX projection
- PDF.js for PDF projection
- ExcelJS for read-only XLSX, XLSM, and CSV projection
- native image, audio, and video elements
- TanStack Virtual Core behind a local windowed-projection adapter

Heavy engines load only when their artifact or command activates them.

## Voice

- MediaRecorder and AudioContext
- dedicated module worker
- Transformers.js and a quantized Whisper model
- WebGPU preferred, Wasm fallback

The worker is created only after the first dictation gesture.

## Filesystem

- Node filesystem APIs behind Astro server and Electron main
- Parcel Watcher for coalesced native filesystem events
- sibling temporary files and stale-write checks for text saves

## State

- Astro route for artifact identity
- LiteShip state and projection where it owns adaptation
- small local TypeScript state port for volatile shell state
- no general state framework
- no durable event runtime
