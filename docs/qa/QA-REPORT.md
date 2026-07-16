# QA report

**Date:** 2026-07-16
**Scope:** SillPak source refactor, public-canon correction, agent-browser documentation integration, and Phase 1 installed-application proof

## Phase 1 execution (Windows 11, dev mode)

- `pnpm install` → lockfile generated; native modules load from N-API prebuilds (rebuild step removed; see checkpoint)
- `pnpm check` → green end to end: architecture QA (150 files), handoff QA, 15 law tests, workspace typecheck, Gauntlet, audit (0 errors)
- Electron launched against `examples/workspace`; `/w/local` loads through the authenticated origin
- 17-case security smoke matrix passed (auth, Host, Origin, cross-site, content-type, traversal, stale-write); foreign Host refusal is layered in dev (Vite 403 first, SillPak 421 for hosts Vite allows)
- PTY spawned via utility process; streaming output survived a hard renderer reload; Restart and Stop remained explicit (operator-observed, host process table corroborated)
- fixes this pass: single-file CommonJS sandboxed preload plus channel-mirror law test, contracts built before dependents, configurable dev port, Windows-safe qa-handoff, unshadowed qa:audit, workspace-root-aware audit profile

Not yet verified: production `astro-runtime.ts` path, packaged app behavior, workspace-switch rebind refusal, runtime `SILLPAK_*` stripping proof, process-tree cleanup, cross-platform parity. See `docs/checkpoint/CURRENT.md`.

## Regression lane and CI (Windows 11, same date, after Phase 1)

- tests reorganized into `tests/laws/`, `tests/unit/`, `tests/regression/`; `pnpm test` runs laws + unit, `pnpm run test:regression` runs installed-behavior regressions against built artifacts
- `tests/regression/production-security-matrix.test.mjs` boots the real `apps/desktop/src/astro-runtime.ts` serving `apps/shell/dist/server/index.mjs` with a temporary workspace and passes 18 cases: cookie/bearer 200, missing/wrong credentials 401, non-exact Host 421, cross-site fetch metadata 403, missing/foreign Origin 403, non-JSON mutation 415, encoded traversal 404, raw read 200, byte range 206, directory projection 200, artifact page 200, malformed save 400, valid save 200, stale save 409
- defect found and fixed by that test's first run: `astro-runtime.ts` resolved `dist/server/entry.mjs`, but Astro 7's node middleware adapter emits `dist/server/index.mjs`; the production launch path could never have booted
- `tests/regression/pty-environment.test.mjs` proves the host-owned profile strips `SILLPAK_*` and that a real PTY child (ConPTY) observes zero `SILLPAK_*` variables at runtime
- `docs/qa/REGRESSION.md` maps every checkpoint claim to its guard or names it operator-only
- `.github/workflows/ci.yml` added: Windows, macOS, and Linux matrix running frozen install, `pnpm check`, `pnpm build`, and the regression lane
- CI is green on all three OSes (run 29496773793 at `b132ebf`); the first run failed on Windows and macOS inside the PTY probe and taught two portability facts: node-pty `kill()` forks a console-list agent that dies in console-less Windows CI sessions, and package managers can drop the execute bit on node-pty's prebuilt macOS `spawn-helper` (`posix_spawnp failed`)

## Production runtime inside Electron (Windows 11, non-dev)

- launched Electron with no `SILLPAK_DEV_URL` so `astro-runtime.ts` served the built shell; window loaded the authenticated origin, client JS executed, PTY shell spawned under the Electron tree
- live probes against the bound loopback port: unauthenticated 401, foreign `Host` 421, `/_astro/*.css` 200 `text/css`
- defect found and fixed: in middleware mode the node adapter does not serve `dist/client`; the first non-dev launch had no CSS/JS (and thus no terminal). `astro-runtime.ts` now serves client assets with correct MIME and containment; two regression assertions guard it
- terminal end-of-session polish: writes to an ended session are answered in the broker with a friendly "session has ended — Restart" notice instead of forwarding a raw `session-not-found` to the renderer; a repository law guards this
- `electron-builder --dir` produces `SillPak.exe`; confirming the packaged app runs green is blocked by a Windows Defender directory-handle lock on the signed `artifacts/` output that poisons the next build's project detection (environmental, clears on reboot). Packaging inputs (`electronVersion`, `author`, asar-unpacked shell, `.asar.unpacked` resolution, persisted startup error log) are all in place

## Executed

- Git bundle cloned successfully from the original scaffold
- source renamed to SillPak across packages, channels, environment keys, DOM markers, storage keys, and documents
- `node scripts/qa-handoff.mjs` → passed
- `node scripts/qa-architecture.mjs` → passed, 139 files inspected
- `node --experimental-strip-types --test tests/**/*.test.mjs` → 14 passed, 0 failed
- `tsc -p qa/tsconfig.scaffold.json --noEmit` → passed
- strict desktop-host source type pass against narrow temporary Electron, node-pty, and Parcel Watcher declarations
- private-vocabulary scans
- Git whitespace and status checks
- agent-browser document-path validation
- browser status-language review
- WebMCP claim-ceiling review
- public browser grammar review

## Source-level proof added

- terminal renderer protocol rejects malformed messages
- PTY protocol requires version 2 and resolved host launches
- malformed PTY-host events are rejected before they enter the broker
- artifact addresses reject traversal segments
- workspace resolution rejects lexical and symlink escape
- desktop host refuses remote or ambiguous application URLs
- local request security rejects wrong Host
- local request security rejects missing authentication
- local request security rejects cross-origin mutation
- local API mutation rejects non-JSON content
- cookie-authenticated reads are accepted
- cookie-authenticated same-origin saves are accepted
- bearer-authenticated workspace mutation is accepted
- workspace changes use an explicit prior-generation terminal-stop policy
- viewer capability claims remain conservative
- repository law requires renderer detach rather than kill
- browser documents remain explicit that runtime implementation is absent
- Chromium implementation evidence is not presented as Electron runtime proof
- WebMCP annotations are documented as page claims rather than enforcement
- coordinate actions remain outside the public browser grammar
- private vocabulary scan remains clean after browser documentation

## Not executed

The generation environment does not have the installed workspace dependency graph. Therefore this report does not claim:

- pnpm installation or lockfile resolution
- full vendor type integration
- Astro production build
- Electron launch
- native module rebuild
- packaged application behavior
- terminal reattachment in a real renderer reload
- remote browser security
- Electron WebMCP support
- accessibility snapshots and stable references
- browser action execution
- voice inference
- cross-platform parity

## Required next QA

1. install dependencies
2. run full `pnpm check`
3. launch Electron
4. test invalid Host, missing cookie, wrong Origin, and authenticated reads and saves
5. start a long-running terminal process, hard reload, and verify reattachment
6. verify restart is explicit and old process-generation events are ignored
7. verify workspace switching does not rebind an existing session
8. verify child environments contain no `SILLPAK_*` values
