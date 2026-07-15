# Dependency register

Versions are exact in `package.json`. The lockfile becomes the executable dependency record after installation.

| Dependency | Version | Ownership | Loading posture |
|---|---:|---|---|
| Astro | 7.0.9 | route identity and SSR | baseline |
| `@astrojs/node` | 11.0.2 | local Node adapter | baseline |
| LiteShip scopes | 0.10.0 | adaptive projection and rigor | targeted scopes only |
| Effect | 4.0.0-beta.32 | temporary LiteShip peer | one compatibility boundary |
| Electron | 42.6.0 | desktop and native authority | baseline |
| electron-builder | 26.0.12 | packaging | build only |
| node-pty | 1.1.0 | PTY mechanics | utility process only |
| xterm.js | 6.0.0 | terminal rendering | terminal route shell |
| xterm fit | 0.11.0 | terminal resize | terminal only |
| xterm search | 0.16.0 | terminal search | terminal only |
| xterm serialize | 0.14.0 | best-effort visual restoration | terminal only |
| xterm WebGL | 0.19.0 | accelerated terminal render | capability fallback |
| Lexical packages | 0.47.0 | rich Markdown editing | lazy on Rich Edit |
| CodeMirror view | 6.41.0 | exact code and text | lazy per editor |
| CodeMirror state | 6.6.0 | editor state | lazy per editor |
| CodeMirror basic setup | 6.0.2 | editor behavior | lazy per editor |
| CodeMirror JavaScript | 6.2.5 | JavaScript and TypeScript syntax | lazy by language |
| CodeMirror Markdown | 6.5.0 | exact Markdown source | lazy on Source Edit |
| markdown-it | 14.3.0 | formatted Markdown | server render; lazy client rerender |
| Mammoth | 1.12.0 | DOCX projection | dynamic server import |
| ExcelJS | 4.4.0 | spreadsheet projection | dynamic server import |
| PDF.js distribution | 5.4.624 | PDF projection | lazy client import |
| TanStack Virtual Core | 3.17.4 | windowed rows | local shim only |
| Parcel Watcher | 2.5.6 | filesystem observations | desktop host |
| Transformers.js | 4.2.0 | local speech transcription | lazy worker after gesture |
| TypeScript | 5.9.3 | language and build | development |
| pnpm | 10.32.1 | package manager | development |

## Admission rule

A dependency must provide a capability missing from Astro, LiteShip, the web platform, Electron, or an already admitted specialist. A framework adapter is rejected when a framework-neutral core exists.

## Known integration risk

- native rebuilds for node-pty and Parcel Watcher
- PDF.js worker URL and CSP behavior
- Astro middleware behavior inside packaged Electron
- Electron cookie installation on the ephemeral local origin
- Whisper model download, cache controls, and WebGPU fallback
- Effect beta peer while LiteShip migration is active
- Electron version alignment with native-addon ABI
