# Effect migration seam

LiteShip 0.10 still exposes Effect-shaped state primitives while its implementation is moving away from Effect.

## SillPak posture

- use current LiteShip APIs honestly
- do not spread Effect through product modules
- isolate direct imports in one compatibility file
- keep application services behind plain TypeScript ports
- remove the shim when LiteShip's public surface permits it

## Current files

- `apps/shell/src/lib/liteship/effect-boundary.ts`
- `apps/shell/src/lib/state/shell-state.ts`
- downstream Gauntlet rule `sillpak/effect-boundary`

## Removal checklist

1. identify remaining LiteShip APIs that return Effect values
2. replace the compatibility functions with the new LiteShip surface
3. remove the direct Effect dependency when peer resolution permits
4. change the Gauntlet rule from one sanctioned import to zero imports
5. avoid rewriting unrelated shell state merely to follow an upstream implementation detail

## Upstream tracking

The migration boundary is tracked in `freebatteryfactory/LiteShip#153`.
