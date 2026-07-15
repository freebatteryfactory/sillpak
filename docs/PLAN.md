# Implementation plan

## Portfolio rule

SillPak is a surface product and mechanical host, not another semantic substrate.

> SillPak works independently and exposes optional adapters for external context, control, execution, and evidence systems.

## Phase 0: canon and corrective pass

**Status:** source-complete, integration-unverified

- rename the product to SillPak
- remove private hierarchy vocabulary from public artifacts
- ratify Astro routing and the HTTP/IPC split
- authenticate all local workspace routes and APIs
- reject Host-header rebinding
- make terminal open attach-first
- detach on renderer loss
- add session ownership, protocol versioning, event sequence, bounded replay, and workspace generations
- make Lexical, Whisper, Mammoth, and ExcelJS lazy
- document browser sessions and mechanical execution without implementing them

Exit: source QA green and documentation coherent.

## Phase 1: installed application proof

- install exact dependencies and generate the lockfile
- run full workspace type checking
- build Astro server output
- build Electron main, preload, and utility process
- rebuild node-pty and Parcel Watcher
- launch Electron against `examples/workspace`
- prove authenticated page load, raw read, projection, and save
- prove invalid Host, missing cookie, wrong Origin, and cross-site requests fail
- prove hard reload reattaches to a running PTY
- prove explicit restart and stop remain explicit

Exit: one local work session survives route swaps and hard reload without killing the agent process.

## Phase 2: real LiteShip projection

- define named compact, balanced, terminal-heavy, artifact-heavy, and focus states
- drive them through LiteShip boundaries and quantization
- add capability detection for rendering and input quality
- compile CSS and ARIA from one projection definition
- use Morph for context, watcher status, session status, and observational history
- preserve xterm, Lexical, CodeMirror, PDF, spreadsheet, and future browser views as opaque islands

Exit: LiteShip owns measurable adaptive behavior rather than ornamental attributes.

## Phase 3: terminal hardening

- add shell integration for observed cwd and command boundaries
- add process-domain teardown per operating system
- verify descendant cleanup independently
- add explicit output high-water behavior and stress tests
- surface host capability assessments
- add shallow command observations and associated watcher batches

Exit: the UI can state exactly what terminal mechanics are enforced, mediated, unsupported, or partially observed.

## Phase 4: interactive browser session

- add browser IDs and orthogonal session, control, action, and document-state types
- add a main-process-owned `WebContentsView`
- create a separate ephemeral partition by default
- deny permissions, new windows, local-address access, and native bridges by default
- coordinate view bounds with a LiteShip opaque browser region
- support attach, detach, human navigation, takeover, capture, and controlled downloads
- keep remote content completely separate from the local application origin
- run the checked-in Electron WebMCP capability probe
- treat WebMCP probe failure as unsupported, not as phase failure

Exit: a user can browse beside artifacts and the terminal without expanding the trusted renderer's authority.

## Phase 5: bounded physical attempts

- add host capability snapshots
- define pure request-to-plan normalization
- implement explicit executable and argv
- implement empty or allowlisted environment
- implement timeout, output caps, exit observation, and process-domain teardown
- return a terminal report on every path
- fail unsupported required constraints before spawn

Exit: one bounded process attempt can be independently verified without claiming semantic authority.

## Phase 6A: browser contracts and fixtures

- define action targets, requests, plans, attempts, and reports
- define orthogonal state models
- define document, frame, snapshot, and tool-catalog generations
- add stale-reference fixtures
- add profile-access and upload-grant fixtures
- add origin, redirect, holding-area, and report fixtures

Exit: browser planning can be tested without remote navigation.

## Phase 6B: attached-session actions

- add accessibility snapshots and stable references
- add one `BrowserActionDispatcher`
- add closed actions for navigate, page-tool discovery and invocation, snapshot, click, type, select, scroll, extract, capture, and takeover
- add the native WebMCP adapter only when the Electron probe passes
- gate screenshots as escalation rather than the default percept
- report origins, generations, page claims, downloads, uploads, captures, and observation coverage

Exit: external tools can drive an attached visible browser through a narrow, inspectable mechanical contract.

## Phase 6C: ephemeral worker

- select a backend only after the action contract is green
- add a disposable profile and explicit origin policy
- prove cleanup and capability reporting
- reuse the same dispatcher and report model
- add a headful human-takeover path

Exit: disposable browser work does not borrow ambient authenticated identity.

## Phase 6D: public MCP projection

- expose stable SillPak browser gateway tools
- return transient page tools as data
- keep provider-specific behavior out of the core
- propagate complete or partial reports

Exit: general external agents can use the browser without a second command language.

## Phase 7: generic adapters

- context attachment port
- external run source
- observation sink
- run-report sink
- browser-action report sink

Keep private mappings and semantic identities outside the public repository.
