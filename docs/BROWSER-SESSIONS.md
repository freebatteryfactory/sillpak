# Browser sessions

**Status:** ratified interaction doctrine; implementation architecture partially settled and not implemented

The browser is a persistent tool inside SillPak, not the product identity and not a semantic authority system.

> The normative agent-facing browser contract is `docs/AGENT-BROWSER.md`. Backend and WebMCP decisions are recorded in `docs/adr/0010-agent-browser-backends-and-webmcp.md`.

## Interactive browser session

A `BrowserSession` is a long-lived, human-visible remote page. The first implementation uses an Electron `WebContentsView` owned by Electron main.

It should support:

- address navigation
- back, forward, and reload
- attach and detach without implicit destruction
- human takeover
- explicit downloads and uploads
- capture
- page metadata
- page-tool discovery when supported
- accessibility snapshots

The profile model distinguishes ephemeral, session, and named state. Ephemeral is the default for disposable work. Named profile use by an agent requires an explicit access grant and remains deferred until storage cleanup and grant enforcement are proven.

## Browser action targets

A browser action may target:

- an attached, human-visible browser session
- an optional disposable worker

Both use one `BrowserActionDispatcher` and one report model. An unavailable disposable-worker backend is reported as unsupported. It never silently falls back into an authenticated attached session.

## Security zone

Remote content receives:

- no SillPak preload
- no Node integration
- process sandboxing and context isolation
- a separate Electron session partition
- no SillPak local cookie
- no PTY access
- no native file bridge
- deny-by-default permissions
- controlled new-window and navigation behavior
- blocked access to loopback, localhost, link-local, private-network, metadata, and host-control surfaces

Electron main creates, owns, positions, and destroys the attached view. The LiteShip shell exposes only an opaque browser rectangle and communicates bounds to main.

## Agent action path

The closed grammar includes:

- navigate
- list and invoke a page tool
- cancel a page-tool invocation
- snapshot accessibility
- click a semantic reference
- type into a semantic reference
- select an option
- scroll
- extract structured content
- capture
- request human takeover

Action-source order:

1. native WebMCP page tool when supported and suitable
2. accessibility action graph with generation-bound references
3. screenshot diagnosis or human takeover when semantics are insufficient

This is not a trust order. Page-tool metadata and output remain untrusted. Raw DOM execution, arbitrary JavaScript, and coordinate clicking are not public primitives.

## WebMCP

WebMCP is a first-class optional capability for the bundled Chromium backend. Chromium implementation work does not prove Electron exposure. The exact Electron version in the lockfile must be probed.

If native support is absent, SillPak reports WebMCP unsupported and continues through accessibility. It does not silently inject a polyfill into arbitrary pages.

## Reports

A browser action report may include:

- session and attempt IDs
- action target and backend
- action type and action source
- start and finish time
- starting and ending origin
- document, frame, snapshot, and tool-catalog generations
- physical outcome
- capability assessments
- observation coverage
- page-tool claims and response status
- accessibility references
- captures, downloads, uploads, and cross-origin transfers
- complete or partial report status

SillPak reports mechanics. External systems decide what an action means and whether it was semantically appropriate.
