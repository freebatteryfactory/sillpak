# Issue draft: document an Effect-migration boundary for downstream LiteShip consumers

**Repository:** `freebatteryfactory/LiteShip`

**Status:** filed on 2026-07-15 as `freebatteryfactory/LiteShip#153`. This file is the local issue packet and implementation reference.

## Title

Document or expose a narrow Effect-migration boundary for downstream application state

## Problem

LiteShip 0.10 currently exposes `Cell`, `Derived`, and `Store` as Effect-shaped primitives. LiteShip is migrating away from Effect. A downstream Astro application that wants to remain migration-ready must either import Effect throughout application code or invent a local execution boundary without official guidance.

SillPak needs only adaptive definitions, Morph, diagnostics, and a small amount of state coordination. It should not deepen Effect coupling while the upstream migration is active.

## Requested outcome

One of the following, whichever matches the migration plan:

1. A documented downstream pattern that isolates Effect execution to one module while keeping ordinary application state framework-neutral.
2. A small public adapter that runs current Effect-shaped primitives behind Promise and synchronous boundaries, explicitly marked temporary.
3. Migration documentation naming which current public primitives will remain source-compatible and which will change.

## Local shim

`apps/shell/src/lib/liteship/effect-boundary.ts`

A downstream Gauntlet gate refuses every other direct Effect import.

## Why upstream

This is not a request to preserve Effect or add another state framework. It is a request to make the migration seam explicit so downstream consumers do not accidentally spread coupling that LiteShip itself intends to remove.
