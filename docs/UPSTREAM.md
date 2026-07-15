# Upstream findings

## LiteShip Effect migration boundary

The upstream issue is open as `freebatteryfactory/LiteShip#153`. The local issue packet remains at `docs/upstream/liteship-effect-migration-boundary.issue.md`.

The local shim remains `apps/shell/src/lib/liteship/effect-boundary.ts`, and a Gauntlet rule refuses direct Effect imports elsewhere.

The issue requests documentation or a narrow public adapter for downstream applications that want to isolate current Effect-shaped APIs during LiteShip's migration. It should not request preservation of Effect or a second state framework.

## Windowed projection

TanStack Virtual is currently hidden behind `virtual-list.ts`. Do not upstream a LiteShip primitive yet.

Reconsider only when:

- at least three distinct SillPak surfaces use the same contract, or
- a second independent LiteShip consumer needs it

A future LiteShip primitive should describe windowed projection and may continue using TanStack Virtual as its browser implementation.

## Third-party issues

Do not file dependency issues before an installed, pinned reproduction exists. Version uncertainty and hypothetical bundling friction are not upstream bugs.
