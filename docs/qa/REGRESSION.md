# Regression map

Every claim a checkpoint verifies must either have a deterministic guard that
re-proves it on every run, or be listed here as operator-only so nobody
mistakes a past observation for a standing guarantee.

## Test organization

- `tests/laws/` — repository laws: static assertions about source and documents
  (run by `pnpm test`, no build required)
- `tests/unit/` — runtime primitives: pure functions imported directly from
  source (run by `pnpm test`, no build required)
- `tests/regression/` — installed-behavior regressions that exercise built
  artifacts and real processes (run by `pnpm run test:regression` after
  `pnpm build`)
- `packages/quality/src/gates.ts` — Gauntlet gates: self-proving policy scans
  with red/green/mutation fixtures (run by `pnpm run qa:gauntlet`)

CI (`.github/workflows/ci.yml`) runs the full ladder on Windows, macOS, and
Linux for every push to `main` and every pull request:
`pnpm install --frozen-lockfile` → `pnpm run check` → `pnpm run build` →
`pnpm run test:regression`.

## Phase 1 claim → guard

| Checkpoint claim | Deterministic guard |
| --- | --- |
| exact dependency graph resolves | CI `pnpm install --frozen-lockfile` (three OSes) |
| workspace typecheck and builds green | CI `pnpm run check` and `pnpm run build` |
| architecture, handoff, Gauntlet, audit lanes green | CI `pnpm run check` |
| authenticated reads (cookie and bearer) return 200 | `tests/regression/production-security-matrix.test.mjs` |
| missing or wrong credentials refused 401 | `tests/regression/production-security-matrix.test.mjs` |
| non-exact Host refused 421 before Astro runs | `tests/regression/production-security-matrix.test.mjs` |
| cross-site fetch metadata refused 403 | `tests/regression/production-security-matrix.test.mjs` |
| mutation without or with foreign Origin refused 403 | `tests/regression/production-security-matrix.test.mjs` |
| non-JSON API mutation refused 415 | `tests/regression/production-security-matrix.test.mjs` |
| encoded traversal refused 404 | `tests/regression/production-security-matrix.test.mjs` |
| raw reads and byte ranges (200/206) serve correctly | `tests/regression/production-security-matrix.test.mjs` |
| directory projection serves JSON | `tests/regression/production-security-matrix.test.mjs` |
| valid save succeeds; stale save refused 409 | `tests/regression/production-security-matrix.test.mjs` |
| the production runtime module serves the built shell | `tests/regression/production-security-matrix.test.mjs` boots the real `apps/desktop/src/astro-runtime.ts` against `apps/shell/dist/server/index.mjs` |
| `SILLPAK_*` stripped from PTY child environments | `tests/regression/pty-environment.test.mjs` spawns a real PTY child and reads its environment back |
| terminal/PTY protocol validation | `tests/unit/runtime-primitives.test.mjs` |
| lexical and post-realpath containment | `tests/unit/runtime-primitives.test.mjs` |
| renderer cleanup detaches, never kills | `tests/laws/repository-laws.test.mjs` + `scripts/qa-architecture.mjs` |
| preload channels mirror `protocol.ts` | `tests/laws/repository-laws.test.mjs` |
| workspace switch is an explicit terminal-stop boundary (source law) | `tests/laws/repository-laws.test.mjs` |
| workspace switch posts an explicit `kill` for the prior generation (state → exiting/killed) and renderer detach never kills | `tests/regression/workspace-switch.test.mjs` drives the real built broker through a fake `PtyHostChannel` |
| a bound session ID is never transplanted across generations; the new generation opens a fresh, independent session and leaves the old record untouched | `tests/regression/workspace-switch.test.mjs` |
| input to a stopped generation is not forwarded to the PTY host; it yields the `session-ended` notice | `tests/regression/workspace-switch.test.mjs` |
| banned dependencies and HTML sinks stay out | Gauntlet gates + `scripts/qa-architecture.mjs` |

## Operator-only (no automated guard yet)

These were observed by the operator on Windows 11 during Phase 1 and are not
re-proven by any test. Do not cite them as continuously verified:

- Electron launches and loads `/w/local` through the authenticated origin
- streaming PTY output survives a hard renderer reload
- explicit Restart produces a fresh shell; explicit Stop ends the session
- packaged-application behavior (cookie installation, permissions)
- the interactive native folder-dialog gesture (`dialog.showOpenDialog`): a human
  still clicks a folder. The broker/lifecycle logic that runs after the dialog
  resolves — the explicit stop boundary and no-session-rebind guarantee — is now
  automated in `tests/regression/workspace-switch.test.mjs`; only the GUI click
  remains operator-only.
- output high-water behavior under sustained load
- whole-process-tree cleanup

The next automation candidates are an Electron smoke launch (xvfb on Linux CI)
and a broker-level reattach test, both scoped to the packaged-app checkpoint.
