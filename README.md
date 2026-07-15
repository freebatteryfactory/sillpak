# SillPak

**Files are pages. Tools stay with you.**

SillPak is a local-first routed artifact workspace. Every directory or file is an Astro route, the active URL is the selected artifact, and the artifact page can expand from inspection into the main work surface. A persistent terminal remains available while routes change, so external CLI agents and ordinary shells can work without pulling in an entire IDE.

> SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.

The current public boundary is intentionally mechanical. SillPak owns artifact routing, workspace containment, persistent terminal sessions, native file actions, bounded text saves, shallow observations, and the honest presentation of host capabilities. It does not own semantic intent, agent orchestration, durable truth, business policy, or logical retry decisions.

## Current shape

- Astro 7 catch-all routes map one concrete local workspace into `/w/local/...`.
- LiteShip owns adaptive shell projection without React.
- Astro `ClientRouter` preserves the terminal and explicit-context shelf across artifact navigation.
- xterm.js renders the terminal; node-pty runs in an Electron utility process.
- Renderer loss detaches from a PTY session instead of killing it. Reopening the same session reattaches and replays bounded output.
- Local artifact routes and APIs require an HttpOnly session cookie or the host bearer token.
- Exact Host validation, mutation Origin checks, path containment, stale-write refusal, and sandboxed renderers are structural laws.
- Markdown supports formatted preview, lazy Lexical rich editing, and lazy CodeMirror source editing.
- Code and text use CodeMirror; DOCX, PDF, spreadsheets, images, audio, and video use format-specific projections.
- Voice transcription is lazy, local-first, and never auto-executes terminal input.
- Browser sessions and general external-agent browser mechanics are specified but not implemented. The design uses an attached Electron session first, an optional disposable worker later, accessibility as a first-class action source, and WebMCP as an optional untrusted page-tool capability.

## Ownership split

- **Astro:** route identity, history, route data, and artifact-page replacement.
- **LiteShip:** adaptive shell states, capability-aware projection, CSS and ARIA agreement, live non-route regions, and opaque specialist boundaries.
- **Authenticated local HTTP:** artifact reads, projections, directory data, and bounded saves.
- **Electron IPC:** terminal control, workspace selection, native file actions, and future browser-session control.
- **Specialist engines:** terminal, editor, PDF, document, spreadsheet, media, and speech internals.

The split is deliberate. HTTP makes desktop and hosted artifact pages share one web-native model. IPC retains native authority behind a narrow, sender-validated bridge.

## Repository map

- `apps/shell` is the Astro and LiteShip application.
- `apps/desktop` is the Electron host, local Astro runtime, workspace registry, file watcher, preload bridge, and PTY utility process.
- `packages/contracts` is the closed public vocabulary shared by the browser and desktop layers.
- `packages/quality` contains downstream Gauntlet gates and audits.
- `docs` contains product, architecture, security, dependency, browser, execution, and handoff material.
- `docs/AGENT-BROWSER.md` is the normative agent-browser implementation contract.
- `docs/adr` contains accepted architecture decisions.
- `examples/workspace` is a disposable dogfood root.

## Run after cloning

1. Install Node 22.13 or later and pnpm 10.
2. Run `pnpm install`.
3. Set `SILLPAK_WORKSPACE_ROOT` to a directory you are comfortable exposing.
4. Run `pnpm dev`.
5. Run `pnpm check` before committing.

The source-level QA lanes are green in the generation environment. Dependency installation, vendor-integrated type checking, Electron launch, native-module rebuilds, packaged permissions, and cross-platform smoke tests remain the next checkpoint. See `docs/checkpoint/CURRENT.md`.

## Non-goals

SillPak is not a built-in agent runtime, a full IDE, a universal resource graph, a durable event store, a generic orchestration platform, or a custom terminal-emulator research project.

The local observation layer remains deliberately shallow. File changes may be associated with a command window, but are never declared causal without stronger evidence.

## Start here

An implementation agent should read, in order:

1. `CANON.md`
2. `AGENTS.md`
3. `docs/checkpoint/CURRENT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/SECURITY.md`
6. `docs/PLAN.md`
7. `docs/HANDOFF.md`

Browser implementation work additionally reads `docs/AGENT-BROWSER.md` and `docs/adr/0010-agent-browser-backends-and-webmcp.md`.
