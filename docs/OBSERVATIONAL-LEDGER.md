# Observational history

The local history layer is intentionally shallow and replaceable.

## It may record

- terminal session ID
- workspace generation
- observed command text when shell integration provides it
- observed working directory
- start and finish time
- exit status
- explicit context paths
- workspace change batch IDs
- paths that changed during the observation window

## It must not claim

- event-sourced truth
- replay authority
- semantic intent
- causality
- policy admission
- universal receipts
- logical retry legality
- hidden child operations

The correct statement is:

> These paths changed while this command window was active.

The prohibited statement is:

> This command caused these paths to change.

If no user workflow benefits from the history, delete it. If an external evidence system later becomes authoritative, adapt to it rather than growing a competing local ontology.
