# Current checkpoint

**Date:** 2026-07-16
**Branch:** `main`
**State:** Phase 1 installed-application proof complete on Windows 11, now backed by a deterministic regression lane that re-proves the security matrix against the production runtime module. CI is green on Windows, macOS, and Linux (run 29496773793 at `b132ebf`): frozen install, full check, build, and the regression lane pass on all three. Packaged Electron behavior remains unverified.

## Verified in this checkpoint (Windows 11, dev mode)

- exact dependency graph installed; `pnpm-lock.yaml` generated; every pinned version resolved
- node-pty 1.1.0 and @parcel/watcher 2.5.6 load from shipped N-API prebuilds; the Electron-header rebuild step was removed because it demanded a local C++ toolchain to rebuild ABI-stable binaries
- full workspace typecheck green, including `astro check`
- Astro server build and Electron main, preload, and PTY-host builds green
- full `pnpm check` green: architecture QA, handoff QA, 15 law tests, typecheck, Gauntlet, audit
- Electron launches against `examples/workspace` and loads `/w/local` through the authenticated dev origin
- security smoke matrix passed against the dev server: cookie and bearer auth accepted; missing or wrong credentials 401; non-exact Host 421 (foreign hosts are refused earlier by Vite with 403 in dev); cross-site fetch metadata 403; mutation without or with wrong Origin 403; non-JSON mutation 415; traversal 404; stale save 409; valid save 200 with new mtime
- raw reads, byte ranges (206), directory projection, and artifact pages serve correctly
- PTY spawns through the utility process (ConPTY + powershell.exe observed in the host process table)
- hard reload during a streaming command: output kept streaming after reload (operator-observed; host process table confirmed the same PTY host and shell survived renderer loss)
- explicit Restart produced a fresh shell and explicit Stop ended the session (operator-observed; host process table confirmed no shell child after Stop)

## Verified by the regression lane (added after Phase 1)

- the production runtime module (`apps/desktop/src/astro-runtime.ts`) boots the built shell (`apps/shell/dist/server/index.mjs`) and the full security matrix passes through it — auth 200/401, Host 421, cross-site 403, Origin 403, content-type 415, traversal 404, byte range 206, save 200/400/409 (`tests/regression/production-security-matrix.test.mjs`)
- a real PTY child (ConPTY on Windows) observes zero `SILLPAK_*` environment variables at runtime (`tests/regression/pty-environment.test.mjs`)
- `docs/qa/REGRESSION.md` maps every checkpoint claim to its deterministic guard or names it operator-only

## Corrections made during Phase 1

- Electron sandboxed preload scripts must be single-file CommonJS; the preload is now self-contained, built by `apps/desktop/tsconfig.preload.json`, and a repository law asserts its IPC channel names mirror `protocol.ts`
- `@sillpak/contracts` must be built before dependents typecheck or run; the root `typecheck` script and `scripts/dev.mjs` now build it first
- the dev port is configurable via `SILLPAK_DEV_PORT` (default 4321) because loopback ports can be occupied
- `scripts/qa-handoff.mjs` no longer shells out to npm (Windows ENOENT); it resolves the workspace TypeScript directly
- root `qa:audit` uses `pnpm run audit` because `audit` is shadowed by the pnpm built-in
- `packages/quality/src/audit.ts` walks up to the workspace root instead of assuming `process.cwd()`
- `astro-runtime.ts` pointed at `dist/server/entry.mjs`, but Astro 7's node adapter in middleware mode emits `dist/server/index.mjs` — the production launch path could never have booted; the new regression test caught this on its first run

## Known unverified areas

- the production runtime *inside Electron*: the regression lane proves `astro-runtime.ts` and the built server in plain Node, not hosted by the Electron main process
- packaged Electron behavior: cookie installation, permissions, and Host/Origin checks in a built app
- workspace switching does not rebind an existing session (interactive flow not yet exercised)
- old process-generation events ignored after restart (code-level law; event-level runtime assertion not captured)
- output high-water behavior under sustained load
- whole-process-tree cleanup
- microphone and Whisper behavior
- macOS and Linux Electron runtime parity (CI proves install, check, build, security matrix, and PTY environment stripping per OS; it never launches Electron)
- terminal utility-process crash behavior

## One next action

Build and launch the packaged (or at least non-dev) Electron app, prove cookie installation and the authenticated origin inside it, and exercise workspace switching, before Phase 2 LiteShip projection work. The security matrix through `astro-runtime.ts` and runtime `SILLPAK_*` stripping are now automated in `tests/regression/`.
