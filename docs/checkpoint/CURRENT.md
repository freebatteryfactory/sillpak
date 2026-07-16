# Current checkpoint

**Date:** 2026-07-16
**Branch:** `main`
**State:** Phase 1 installed-application proof complete on Windows 11, now backed by a deterministic regression lane. The production runtime path is verified inside a real non-dev Electron main process, **and the fully packaged electron-builder app (`SillPak.exe`) now launches and runs green**: it renders the real workspace page, enforces the loopback security boundary (401/421), serves built client assets, and spawns a live ConPTY shell from the packaged utility process. CI is green on Windows, macOS, and Linux (run 29496773793 at `b132ebf`).

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
- workspace switching is a deterministic terminal stop boundary: a change posts an explicit `kill` for the prior workspace generation (state → exiting/killed), renderer detach never kills, a session ID bound to one generation is never transplanted to another (`broker.open` throws), the new generation opens a fresh independent session, and input to the stopped generation yields the `session-ended` notice rather than reaching the PTY host (`tests/regression/workspace-switch.test.mjs`). The broker gained a transport seam (`PtyHostChannel`) so its lifecycle logic runs in plain Node with a fake channel; the real Electron `utilityProcess` transport moved to `apps/desktop/src/electron-pty-host-channel.ts` with byte-for-byte identical runtime behavior
- `docs/qa/REGRESSION.md` maps every checkpoint claim to its deterministic guard or names it operator-only

## Verified inside a real non-dev Electron main process (Windows 11)

- launched with no `SILLPAK_DEV_URL`, so `astro-runtime.ts` served the built shell on a random loopback port
- the window loaded `/w/local` through the authenticated origin; client JS executed (Astro prefetch initialized)
- unauthenticated `/w/local` → 401; foreign `Host` → 421 (probed against the live port)
- a `/_astro/*.css` asset returned 200 with `text/css` (the middleware-mode asset fix, live)
- a `powershell.exe` shell spawned under the Electron process tree via the PTY utility process
- the end-of-session polish means input after a shell exits shows "This terminal session has ended. Use Restart…" instead of a raw `[host:session-not-found]`

## Verified in the packaged electron-builder app (`SillPak.exe`, Windows 11)

- `electron-builder --dir` produces a runnable `SillPak.exe`; launched, it completed the full boot trace (`ready → workspace-initialized → broker-started → runtime-ready → cookie-installed → workspace-watched → window-created`)
- the window title is the real rendered page (`workspace · SillPak`), not an error page
- live probes against the packaged app's bound port: unauthenticated `/w/local` → 401, foreign `Host` → 421, `/_astro/*.css` → 200 `text/css`
- a `powershell.exe` shell spawned under the packaged process tree — `node-pty` loaded from `app.asar.unpacked` through Electron's `require`

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
- the packaged app included no `node_modules` at first: electron-builder collects production dependencies from the packaged (root) `package.json`, but the native modules were declared only in `apps/desktop/package.json`. `@parcel/watcher` and `node-pty` are now root dependencies so they and their platform-native optional packages are collected; `asarUnpack` widened to `**/node_modules/@parcel/**`
- native modules (`@parcel/watcher`, `node-pty`) are loaded through `createRequire(import.meta.url)` instead of a bare `import`, because Node's ESM loader cannot resolve an asar-unpacked package while Electron's CommonJS `require` can
- the Astro SSR server bundle was not self-contained — its chunks imported `@czap/*` and `markdown-it` at render time, which Node's ESM loader could not resolve from inside the asar (page routes returned 500). `vite.ssr.noExternal` is now `true`, so the packaged server bundles every dependency and needs zero runtime `node_modules`

## Packaging note (electron-builder)

`pnpm package:desktop` (or `electron-builder --dir`) builds a runnable `SillPak.exe`. One environmental caveat on this machine: Windows Defender can hold a directory handle on the freshly code-signed `artifacts/` output, which poisons electron-builder's project-directory detection on the *next* run (`ENOENT ... app.asar.unpacked/electron-builder.yml`). If that happens, build into a clean output directory (`-c.directories.output=<fresh dir>`) or wait for Defender to settle; it is not a code defect.

## Known unverified areas

- the interactive native folder-dialog gesture itself (`dialog.showOpenDialog`) still needs a human; the broker/lifecycle logic it drives afterward — the stop boundary and no-session-rebind guarantee — is now covered by `tests/regression/workspace-switch.test.mjs`
- old process-generation events ignored after restart (code-level law; event-level runtime assertion not captured)
- output high-water behavior under sustained load
- whole-process-tree cleanup
- microphone and Whisper behavior
- macOS and Linux Electron runtime parity (CI proves install, check, build, security matrix, and PTY environment stripping per OS; it never launches Electron)
- terminal utility-process crash behavior

## One next action

Phase 1 is closed. The last named gap — proving the workspace-switch stop
boundary and no-session-rebind guarantee — is now a deterministic regression
(`tests/regression/workspace-switch.test.mjs`) rather than an operator
observation; only the interactive folder-dialog click remains human-driven.
Begin Phase 2 LiteShip projection work (which is also where an IDE-style
directory tree in `NavigatorRail` belongs).
