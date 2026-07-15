# External integration boundary

SillPak is standalone. External systems may extend it through narrow generic ports without importing their private semantics into public contracts.

> SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.

## Input seam

An external controller may provide a generic bounded-run request or ask the host to open a named terminal or browser profile.

SillPak does not receive business policy, private intent graphs, or semantic retry rules.

## Context seam

An external context system may:

- materialize files inside a workspace
- provide explicit artifact attachments
- create a temporary read-only directory
- supply approved environment values through a host-side adapter

SillPak records the attachment mechanically. It does not decide why the context was selected.

## Observation seam

SillPak may emit:

- command observations
- workspace change batches
- terminal session snapshots
- bounded run reports
- browser action reports

An external system may persist, sign, reconcile, or join those records. SillPak does not claim that emission equals durable settlement.

## Adapter law

Public IDs remain public and boring. Any mapping between a SillPak session or run ID and an external system's identity belongs inside that adapter.

Do not add an open-ended private metadata bag to public contracts.
