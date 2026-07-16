# Current checkpoint

**Date:** 2026-07-16
**Branch:** `main`
**State:** Phase 1 installed-application proof complete on Windows 11, now backed by a deterministic regression lane that re-proves the security matrix against the production runtime module. The production runtime path has been exercised **inside a real Electron main process** (non-dev, no Vite): the window loads the authenticated origin, the loopback security boundary answers 401/421, built client assets serve with correct MIME types, and a ConPTY shell spawns under the Electron process tree. CI is green on Windows, macOS, and Linux (run 29496773793 at `b132ebf`). The fully packaged (electron-builder) app is code-ready but not yet observed green — see the packaging note below.

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
- built client assets serve with correct MIME types and cannot escape the client root (`tests/regression/production-security-matrix.test.mjs`)
- a real PTY child (ConPTY on Windows) observes zero `SILLPAK_*` environment variables at runtime (`tests/regression/pty-environment.test.mjs`)
- `docs/qa/REGRESSION.md` maps every checkpoint claim to its deterministic guard or names it operator-only

## Verified inside a real non-dev Electron main process (Windows 11)

- launched with no `SILLPAK_DEV_URL`, so `astro-runtime.ts` served the built shell on a random loopback port
- the window loaded `/w/local` through the authenticated origin; client JS executed (Astro prefetch initialized)
- unauthenticated `/w/local` → 401; foreign `Host` → 421 (probed against the live port)
- a `/_astro/*.css` asset returned 200 with `text/css` (the middleware-mode asset fix, live)
- a `powershell.exe` shell spawned under the Electron process tree via the PTY utility process
- the end-of-session polish means input after a shell exits shows "This terminal session has ended. Use Restart…" instead of a raw `[host:session-not-found]`

## Corrections made during Phase 1

- Electron sandboxed preload scripts must be single-file CommonJS; the preload is now self-contained, built by `apps/desktop/tsconfig.preload.json`, and a repository law asserts its IPC channel names mirror `protocol.ts`
- `@sillpak/contracts` must be built before dependents typecheck or run; the root `typecheck` script and `scripts/dev.mjs` now build it first
- the dev port is configurable via `SILLPAK_DEV_PORT` (default 4321) because loopback ports can be occupied
- `scripts/qa-handoff.mjs` no longer shells out to npm (Windows ENOENT); it resolves the workspace TypeScript directly
- root `qa:audit` uses `pnpm run audit` because `audit` is shadowed by the pnpm built-in
- `packages/quality/src/audit.ts` walks up to the workspace root instead of assuming `process.cwd()`
- `astro-runtime.ts` pointed at `dist/server/entry.mjs`, but Astro 7's node adapter in middleware mode emits `dist/server/index.mjs` — the production launch path could never have booted; the new regression test caught this on its first run
- the node adapter runs in **middleware mode**, so the built client assets in `dist/client` are the wrapping server's responsibility; `astro-runtime.ts` now serves them (correct MIME, immutable caching for `/_astro/`, contained to the client root). Without this the first production launch loaded a page with no CSS or client JS, so the terminal never booted
- `astro-runtime.ts` resolves the shell build from `app.asar.unpacked` when packaged, because Node's ESM `import()` cannot load from inside an asar archive; `electron-builder.yml` unpacks `apps/shell/dist/**` accordingly
- `electron-builder.yml` pins `electronVersion` (pnpm hides electron under `apps/desktop`) and `package.json` gained an `author`, both required by electron-builder

## Packaging note (electron-builder)

The `electron-builder --dir` build succeeds and produces `SillPak.exe`. Confirming the packaged app runs green is currently blocked by a Windows environmental issue on this machine, not a code defect: Windows Defender real-time protection holds a directory handle on the freshly code-signed 150 MB `artifacts/` output, which then poisons electron-builder's project-directory detection on the next run (`ENOENT ... app.asar.unpacked/electron-builder.yml`). The lock clears on reboot or once Defender finishes scanning. The packaging inputs the build needs — `electronVersion`, `author`, asar-unpacked shell build, `.asar.unpacked` path resolution, and a persisted `startup-error.log` / `SILLPAK_BOOT_TRACE` for post-mortems — are all in place. Re-running `pnpm package:desktop` from a clean `artifacts/` is the remaining step.

## Known unverified areas

- fully packaged (electron-builder) app behavior: cookie installation, permissions, and Host/Origin checks in the built `.exe` (blocked as above; the non-dev Electron runtime itself is verified)
- workspace switching does not rebind an existing session (interactive flow not yet exercised)
- old process-generation events ignored after restart (code-level law; event-level runtime assertion not captured)
- output high-water behavior under sustained load
- whole-process-tree cleanup
- microphone and Whisper behavior
- macOS and Linux Electron runtime parity (CI proves install, check, build, security matrix, and PTY environment stripping per OS; it never launches Electron)
- terminal utility-process crash behavior

## One next action

From a clean `artifacts/` (reboot or after Defender settles), run `pnpm package:desktop`, launch the packaged `SillPak.exe`, and confirm cookie installation and the authenticated origin inside it; then exercise workspace switching. After that, Phase 2 LiteShip projection work begins. The non-dev Electron runtime, the security matrix through `astro-runtime.ts`, and runtime `SILLPAK_*` stripping are already proven (the latter two automated in `tests/regression/`).
