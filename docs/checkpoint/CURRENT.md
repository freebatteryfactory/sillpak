# Current checkpoint

**Date:** 2026-07-16
**Branch:** `main`
**State:** Phase 1 installed-application proof complete on Windows 11 in development mode. Packaged application and cross-platform behavior remain unverified.

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

## Corrections made during Phase 1

- Electron sandboxed preload scripts must be single-file CommonJS; the preload is now self-contained, built by `apps/desktop/tsconfig.preload.json`, and a repository law asserts its IPC channel names mirror `protocol.ts`
- `@sillpak/contracts` must be built before dependents typecheck or run; the root `typecheck` script and `scripts/dev.mjs` now build it first
- the dev port is configurable via `SILLPAK_DEV_PORT` (default 4321) because loopback ports can be occupied
- `scripts/qa-handoff.mjs` no longer shells out to npm (Windows ENOENT); it resolves the workspace TypeScript directly
- root `qa:audit` uses `pnpm run audit` because `audit` is shadowed by the pnpm built-in
- `packages/quality/src/audit.ts` walks up to the workspace root instead of assuming `process.cwd()`

## Known unverified areas

- production Astro runtime path inside Electron (`astro-runtime.ts`): the smoke matrix ran against the Vite dev server, not the standalone adapter
- packaged Electron behavior: cookie installation, permissions, and Host/Origin checks in a built app
- workspace switching does not rebind an existing session (interactive flow not yet exercised)
- runtime proof that PTY child environments contain no `SILLPAK_*` values
- old process-generation events ignored after restart (code-level law; event-level runtime assertion not captured)
- output high-water behavior under sustained load
- whole-process-tree cleanup
- microphone and Whisper behavior
- macOS and Linux runtime parity
- terminal utility-process crash behavior

## One next action

Exercise the production runtime path: build and launch the packaged (or at least non-dev) Electron app, prove the same security matrix through `astro-runtime.ts`, verify `SILLPAK_*` stripping from a live PTY (`Get-ChildItem env:SILLPAK*` in the SillPak terminal), and exercise workspace switching, before Phase 2 LiteShip projection work.
