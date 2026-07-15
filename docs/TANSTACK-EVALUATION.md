# TanStack ecosystem evaluation

The ecosystem was reviewed as a whole rather than selecting only familiar base packages.

| Project | Decision | Reason |
|---|---|---|
| Virtual | use now | Framework-neutral row and grid window calculations are missing from LiteShip and directly useful for directories and sheets. |
| Table | defer | The active v9 core is beta and depends on TanStack Store. Adopt only when spreadsheet behaviors exceed the simple grid. |
| Router | no | Astro routing is the product model. A second router would be contradictory. |
| Start | no | Astro already supplies the application and server architecture. |
| Query | no now | Route loading and local filesystem calls do not need a second cache and invalidation runtime. Reconsider for hosted remote data. |
| Store | no | LiteShip plus the local migration-safe `StatePort` own UI state. |
| Form | no | Native forms and format-specific editors suffice. LiteShip `bindGraphForm` remains available for LiteShip graph mutation. |
| DB | no | The local history is intentionally shallow; an external evidence adapter may replace it later. |
| AI | no | External agent CLIs are the execution product. No second AI SDK. |
| Hotkeys | no | It depends on TanStack Store. A small command and keymap registry is enough. |
| Pacer | no | It imports Store and devtools plumbing for utilities the platform or LiteShip scheduler can cover. |
| Devtools | no | Avoid shipping an additional developer runtime before the product exists. |
| Ranger | no | No first-slice range-control requirement. |
| Time | no | Native `Intl` and temporal data are enough. |
| CLI and Config | no | Root pnpm scripts and Astro configuration already own build orchestration. |

## Adoption law

The second real use case must force a new TanStack dependency. “Could be useful someday” is not an acceptance criterion.

## Virtual Core lifecycle seam

The framework-neutral adapter is isolated in `virtual-list.ts`. It follows the same `_didMount()` and `_willUpdate()` lifecycle calls used by TanStack's official framework adapters and is pinned to 3.17.4. Treat that wrapper as version-sensitive and cover it with browser tests before upgrading. No upstream bug is claimed without an install-time reproduction.
