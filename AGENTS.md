# SillPak agent contract

Read this file before changing code. The repository is intentionally narrow: a routed artifact workspace with persistent terminal sessions, future browser sessions, and honest physical mechanics.

## Canon sentence

> SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.

This sentence must remain in both `README.md` and `AGENTS.md`. It replaces every private portfolio or hierarchy statement.

## Required reading order

1. `CANON.md`
2. `docs/checkpoint/CURRENT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/SECURITY.md`
5. `docs/SESSION-LIFECYCLE.md`
6. `docs/BROWSER-SESSIONS.md`
7. `docs/AGENT-BROWSER.md`
8. `docs/adr/0010-agent-browser-backends-and-webmcp.md`
9. `docs/PLAN.md`
10. `docs/HANDOFF.md`

## Ratified ownership

- Astro owns route identity and route-level replacement.
- LiteShip owns adaptive shell projection and opaque specialist boundaries.
- Authenticated local HTTP owns artifact delivery and bounded saves.
- Electron IPC owns terminal control and native actions.
- The PTY utility process owns PTY mechanics only.
- Specialist libraries own their internal surfaces.
- External adapters remain optional and generic.

Do not re-litigate this split by silently moving artifact reads into preload or terminal control into HTTP.

## Hard architectural laws

1. The artifact route is the artifact identity.
2. There is one concrete workspace source: the local filesystem.
3. Do not create a generic workspace-provider graph before a second backend exists.
4. Renderer cleanup detaches from a live terminal. Only explicit user action terminates or restarts it.
5. Terminal session IDs bind to one workspace generation and one profile.
6. The renderer never chooses an executable, arguments, working-directory string, or child environment.
7. Remote web content receives no SillPak preload, native bridge, local session cookie, or PTY authority.
8. Enforcement and observation are separate axes.
9. Watcher changes are associated, never claimed causal.
10. The local observation store must remain disposable and non-authoritative.
11. No semantic-intent, orchestration, durable-truth, or private policy vocabulary enters public contracts.
12. A custom Rust supervisor, Wasm terminal, cloud mount, or plugin system must be earned by measured pain.
13. Remote page metadata, WebMCP tools, schemas, annotations, and outputs are untrusted content.
14. WebMCP support is probed from the exact Electron runtime and may be unsupported.
15. Do not inject a WebMCP polyfill into arbitrary third-party pages.
16. Do not expose raw DOM programs, arbitrary JavaScript, or coordinate action sequences through public contracts.
17. Do not silently fall back from an ephemeral-worker request into an authenticated attached session.
18. Do not mirror transient page tools directly as top-level public MCP tools.
19. Stale page-tool and accessibility references fail closed.

## Security laws

- Reject a local request whose Host header does not exactly match the bound `127.0.0.1:port`.
- Require authentication for every `/w/*` and `/api/*` request.
- Require the exact local Origin for every mutation.
- Keep the session cookie HttpOnly and SameSite Strict.
- Strip every `SILLPAK_*` secret from PTY and agent environments.
- Validate IPC sender origin, top-frame status, payload size, session ownership, and protocol version.
- Preserve lexical and post-realpath containment checks.
- Never describe a plain interactive PTY as sandboxed.
- Never use `shell.openExternal` on an unvalidated scheme.

## Dependency laws

React, `react-dom`, `@lexical/react`, TipTap, Tailwind, Lucide, Material UI, Chakra, Ant, and generic component kits are prohibited.

Dependencies use exact versions. Framework-neutral cores are preferred over framework wrappers.

Heavy capabilities must load on demand:

- Lexical only when Rich Edit is selected.
- CodeMirror language support only for the active artifact.
- Whisper only after a dictation gesture.
- Mammoth only for DOCX projection.
- ExcelJS only for spreadsheet projection.
- PDF.js only for PDF projection.

Direct Effect imports are confined to `apps/shell/src/lib/liteship/effect-boundary.ts` while LiteShip migrates away from Effect.

## LiteShip posture

SillPak consumes LiteShip. Do not add terminal, browser, filesystem, or desktop responsibilities to LiteShip merely to reduce local code.

Use LiteShip where it owns the problem: adaptive states, detection, compilation, CSS and ARIA alignment, Morph, physical-state preservation, diagnostics, safe HTML, worker boundaries, Audit, and Gauntlet.

TanStack Virtual remains behind the local windowed-projection shim. Do not upstream a LiteShip virtualization primitive until at least three distinct surfaces or a second consumer prove the contract.

## Visual laws

This is a workstation, not an AI landing page.

No gradients, glass blur, glowing card grids, generic assistant orbs, unexplained sparkle icons, fake KPI tiles, giant marketing copy inside the work surface, or icon-only navigation copied from an IDE.

Use text, hierarchy, spacing, platform manners, restrained separators, and explicit status language.

## Current implementation task

Follow `docs/checkpoint/CURRENT.md`. Do not add browser automation, bounded execution, cloud providers, or new product features before the installed application builds, launches, authenticates its local routes, and preserves a PTY across renderer reload.

## QA

Run:

- `pnpm qa:architecture`
- `pnpm qa:handoff`
- `pnpm test`
- `pnpm typecheck:scaffold`
- after installation, `pnpm typecheck`
- after installation, `pnpm qa:gauntlet`
- after installation, `pnpm qa:audit`

Never convert a missing runtime verification into a green claim. Record it in `docs/qa/QA-REPORT.md` and `docs/checkpoint/CURRENT.md`.
