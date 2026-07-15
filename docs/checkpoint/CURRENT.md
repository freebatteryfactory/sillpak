# Current checkpoint

**Date:** 2026-07-16
**Branch:** `refactor/sillpak-canon`
**State:** SillPak canon and source corrective pass complete; installed application not yet verified.

## Completed in source

- product renamed from the working title to SillPak
- private hierarchy vocabulary removed from public architecture
- public standalone sentence established
- Astro route-centric model consciously ratified
- HTTP and IPC ownership split documented
- development shell URL restricted to an exact loopback origin
- exact Host validation added before the production Astro handler
- authentication added for all `/w/*` and `/api/*` requests
- mutation Origin and JSON content-type validation added
- HttpOnly SameSite Strict local session cookie added
- terminal renderer requests no longer choose executable, argv, cwd string, or environment
- workspace registry and generations added
- workspace switching explicitly stops the prior generation after a user warning
- terminal sessions attach instead of implicitly respawning
- renderer cleanup detaches instead of killing
- session owner routing added
- explicit restart and stop added
- terminal protocol version, host-event validation, and event sequence added
- bounded replay and truncation disclosure added
- watcher events coalesced, ordered, and sequenced
- heavy document and voice paths made lazy
- browser-session and bounded-mechanics documents added
- agent-browser contract and ADR prepared
- WebMCP treated as optional and untrusted
- Electron WebMCP support remains unproven
- no browser implementation claim added
- LiteShip Effect migration issue filed as `freebatteryfactory/LiteShip#153`
- source-level QA and runtime-law tests updated

## Known unverified areas

- exact npm resolution and lockfile
- vendor-integrated TypeScript
- Astro build
- Electron build and launch
- native addon rebuilds
- local cookie installation in packaged Electron
- Host and Origin behavior through the real Astro adapter
- PTY survival across actual Cmd/Ctrl+R
- replay ordering under live output
- terminal utility-process crash behavior
- microphone and Whisper behavior
- cross-platform process semantics

## One next action

Install dependencies in a networked environment, generate the pnpm lockfile, run `pnpm check`, launch `pnpm dev` against `examples/workspace`, and execute the Phase 1 security and terminal-lifecycle smoke matrix from `docs/PLAN.md` before changing product scope.
