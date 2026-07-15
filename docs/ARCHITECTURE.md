# Architecture

## One sentence

SillPak is an Astro-routed artifact application hosted by Electron, projected through LiteShip, with authenticated local HTTP for artifacts and sender-validated IPC for native terminal and operating-system actions.

## 1. Route-centric workspace

The local filesystem is the navigation grammar.

`/w/local/<encoded relative path>` is the public artifact address. Absolute paths never enter URLs. The server decodes one segment at a time, rejects traversal syntax, checks lexical containment, resolves symlinks, checks containment again, and then selects a projection.

A directory route is both navigation and preview. A file route is the artifact page. Browser history therefore becomes artifact history without maintaining a second selected-file authority.

## 2. Deliberately split bridge

The application uses two transport boundaries.

### Authenticated HTTP

HTTP owns:

- routed artifact pages
- directory listings
- raw ranged reads
- DOCX and spreadsheet projections
- bounded text saves
- future hosted equivalents

The Electron host accepts only an origin-only `http://127.0.0.1:<port>` application URL. Every `/w/*` and `/api/*` request requires either the HttpOnly local session cookie or the host bearer token. Mutations require the exact bound Origin. The Node host rejects any mismatched Host header before Astro handles the request.

### Electron IPC

IPC owns:

- terminal open, attach, write, resize, detach, restart, and stop
- native workspace selection
- reveal in system file manager
- open with system application
- future browser-session creation and control

Every IPC message is validated against the top application frame, exact local origin, payload bounds, session owner, and protocol version.

This split is intentional. HTTP keeps the artifact application web-native. IPC keeps native authority out of the renderer.

## 3. Process and trust zones

### Trusted application shell

The Astro and LiteShip renderer is sandboxed, context-isolated, and has no Node integration. It receives one narrow preload object.

### PTY utility process

node-pty runs only in an Electron utility process. The utility receives resolved host launches, never renderer-chosen executables or environments. All `SILLPAK_*` secrets are stripped before the utility or child shell is created.

### Remote browser content

Future remote pages use a main-process-owned `WebContentsView` with a separate session partition, no preload, no Node integration, no local session cookie, deny-by-default permissions, controlled navigation, and explicit download or upload policy.

Remote content is not rendered inside the trusted application DOM.

## 4. Workspace registry

Electron main owns the active local workspace:

- canonical root path
- workspace ID
- monotonically increasing generation
- display name
- watcher subscription
- issued leases

Terminal sessions bind immutably to one workspace generation. Switching the active workspace does not silently transplant a running shell. Version one warns the user and explicitly stops sessions bound to the previous generation before opening the new workspace. The route server receives the new root and generation through the authenticated workspace-control endpoint.

The Astro server still reads the current root from process configuration because it may run in a separate development process. That is an implementation bridge, not the session-authority model.

## 5. Terminal lifecycle

The terminal contract is attach-first.

1. The renderer requests `open` using a session ID, profile ID, workspace generation, and artifact address.
2. Electron main resolves the address and host-owned terminal profile.
3. If a compatible session exists, the renderer reattaches and receives bounded replay.
4. If no session exists, main instructs the utility process to spawn it.
5. Renderer cleanup sends `detach`, not `kill`.
6. Restart and stop are explicit user actions.

Terminal events are versioned and sequenced. Main retains a bounded replay window and discloses dropped history. Session ownership prevents one window from controlling another window's PTY.

The current implementation does not yet prove whole-process-tree cleanup. node-pty termination remains a known ceiling until platform-specific process domains are implemented and tested.

## 6. Interactive versus bounded execution

`TerminalSession` is the daily-driver PTY. It is long-lived and normally has the signed-in user's authority.

`BoundedRun` is a later explicit physical-attempt contract. It will accept an executable, argument vector, environment policy, workspace lease, limits, and required physical constraints. Planning must classify each requirement as enforced, mediated, or unsupported before spawn.

The two contracts may share process supervision and reporting, but they do not share one permissive request type.

## 7. Browser sessions and actions

The browser capability follows the same split as terminal work.

`BrowserSession` is a long-lived browser surface. The first backend is a human-visible, attach-first Electron `WebContentsView` owned by main. A renderer or panel may detach without destroying the session.

`BrowserActionAttempt` is one planned physical action. An action targets either an attached session or an optional ephemeral worker. Both targets project through one `BrowserActionDispatcher` and report their own capability ceilings. An unavailable worker never silently falls back into an authenticated attached session.

The action-source ladder is native WebMCP when available and suitable, accessibility semantics as a first-class fallback, and screenshot diagnosis or human takeover when semantics are insufficient. Page-tool metadata and output remain untrusted. Page-tool and accessibility references bind to document, frame, snapshot, registration, and catalog generations and fail stale.

Chromium implementation evidence does not prove Electron exposure. The exact bundled Electron runtime must be probed before the WebMCP adapter is marked supported.

The first public external-agent adapter exposes a stable SillPak MCP gateway. Transient page tools remain data rather than a changing collection of top-level public MCP tools.

SillPak reports physical browser mechanics and observations. External systems decide what those actions mean. See `docs/AGENT-BROWSER.md` and ADR 0001.

## 8. Artifact projection registry

The server detects an artifact kind from extension, MIME, and bounded content inspection, then chooses a closed projection:

- directory
- Markdown
- source or text
- DOCX
- PDF
- spreadsheet
- image, audio, or video
- archive or unknown

Each projection declares preview, edit, search, text-selection, and system-handoff capabilities. Preview never implies safe round-trip editing.

Specialist surfaces are LiteShip-opaque islands. Astro replaces the route page; LiteShip adapts the shell around it; the specialist owns its internal DOM or canvas.

## 9. LiteShip ownership

LiteShip is consumed, not modified.

Current direct use covers Astro integration, boundaries, sanitized HTML, and opaque ownership. The next interface slice should deepen real LiteShip ownership through named shell states, detection, quantization, compiled CSS and ARIA agreement, and Morph-driven live regions.

Do not route Astro navigation through Morph. Route replacement and live in-page projection are separate ownership domains.

## 10. Observations

Parcel Watcher events are coalesced, normalized, sequenced, and tied to a workspace generation. Errors are surfaced. Future command integration may associate batches with a command window.

The vocabulary remains `associatedChanges`, never `causedChanges`.

## 11. Earned architecture

Deferred until evidence demands it:

- platform process domains and kill-tree proof
- bounded-run backends
- Rust helper
- custom PTY broker
- Wasm terminal engine
- custom GPU terminal renderer
- cloud mounts
- generic plugin system
- durable receipt adapter
