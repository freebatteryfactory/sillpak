# Handoff

## What exists

- SillPak product rename and public canon
- Astro catch-all artifact routing
- authenticated loopback pages and APIs
- exact Host and mutation Origin checks
- Electron sandbox and narrow preload
- host-owned workspace registry with generations
- explicit prior-generation terminal stop on workspace change
- host-owned terminal profile
- attach-first terminal sessions
- one-owner terminal routing
- renderer detach without PTY termination
- explicit restart and stop
- versioned, structurally validated, and sequenced terminal events
- bounded replay with truncation disclosure
- coalesced and sequenced workspace watcher events
- lazy Lexical, CodeMirror, Mammoth, ExcelJS, PDF.js, and voice paths
- browser-session and mechanical-core specifications
- normative agent-browser implementation contract
- accepted browser-backend and WebMCP ADR
- root-document browser integration ledger
- generic external adapter boundary
- upstream LiteShip Effect migration tracking at `freebatteryfactory/LiteShip#153`
- downstream QA and Gauntlet scaffolding

## What has not been claimed

- successful dependency installation
- complete vendor type checking
- Astro production build
- Electron launch
- node-pty or Parcel Watcher native rebuild
- hard-reload PTY survival in a real Electron process
- complete output backpressure
- process-tree cleanup proof
- packaged microphone permission behavior
- local Whisper inference
- browser-session implementation
- Electron WebMCP page API and DevTools domain
- accessibility snapshots and stable references
- profile grants, download holding, and upload grants
- ephemeral browser worker
- public browser MCP adapter
- bounded process execution
- Windows, macOS, and Linux runtime parity

## First implementation agent task

Follow `docs/checkpoint/CURRENT.md` exactly.

Install the exact dependency graph, run the full build and typecheck, launch Electron against `examples/workspace`, then verify the local-auth and terminal-reattachment paths before adding features.

Browser implementation begins from:

- `docs/AGENT-BROWSER.md`
- `docs/adr/0010-agent-browser-backends-and-webmcp.md`
- `docs/checkpoint/AGENT-BROWSER-INTEGRATION.md`

The short browser overview is not sufficient by itself.

## Important code entrypoints

- `CANON.md`
- `apps/shell/src/middleware.ts`
- `apps/shell/src/lib/server/request-auth.ts`
- `apps/shell/src/pages/w/[workspace]/[...path].astro`
- `apps/shell/src/layouts/ShellLayout.astro`
- `apps/shell/src/lib/client/terminal-controller.ts`
- `apps/desktop/src/main.ts`
- `apps/desktop/src/workspace-registry.ts`
- `apps/desktop/src/terminal-broker.ts`
- `apps/desktop/src/pty-host.ts`
- `packages/contracts/src/index.ts`
- `scripts/qa-architecture.mjs`
- `tests/runtime-primitives.test.mjs`

## Do not do next

- no semantic runtime
- no durable event model
- no cloud provider abstraction
- no generic workspace provider
- no browser automation before the interactive browser security zone exists
- no bounded-run backend before terminal lifecycle is proven
- no Rust or Wasm terminal rewrite
- no visual redesign that bypasses LiteShip ownership
