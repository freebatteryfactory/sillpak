# Contributing

Read `AGENTS.md` and `docs/checkpoint/CURRENT.md` before editing. This project intentionally rejects generic UI scaffolding and speculative platform abstractions.

## Setup

1. Use Node 22.13 or later and pnpm 10.
2. Run `pnpm install`.
3. Run `pnpm check` before opening a pull request.
4. Dogfood against a disposable workspace before pointing the shell at valuable files.

## Pull-request expectations

- State which ownership seam changed: Astro route, LiteShip projection, specialist island, Electron authority, or shared contract.
- Update the matching ADR or dependency register when changing stack ownership.
- Add a regression test for security, route identity, persistence, or protocol changes.
- Do not broaden a contract for a hypothetical second backend.
- Do not claim binary round-trip editing without a fidelity test corpus.
- Do not add visual component or icon libraries to accelerate a layout that should be authored directly.

## Upstream work

Issue packets under `docs/upstream` are drafts until an authenticated contributor files them. Link the resulting issue and update the packet status rather than deleting the local rationale.
