# ADR 0004: Isolate Effect during LiteShip migration

**Status:** accepted

Direct Effect imports are limited to one bridge. Application-owned state uses a tiny TypeScript port. This preserves current LiteShip compatibility while making Effect removal a local refactor.
