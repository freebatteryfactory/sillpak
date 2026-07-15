# Security model

SillPak renders untrusted files, launches arbitrary local processes, and will eventually display untrusted remote pages. Security is an ownership model, not a final checklist.

## Trust zones

### 1. Local application shell

The Astro and LiteShip renderer is trusted application code delivered from the bound loopback origin.

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- narrow preload API
- top-frame and exact-origin IPC validation
- no direct node-pty or filesystem imports

### 2. Remote browser content

Future remote pages use a main-process-owned `WebContentsView` in a separate session partition.

They receive:

- no preload
- no Node integration
- no SillPak session cookie
- no terminal bridge
- no local artifact API
- deny-by-default permissions
- controlled navigation and new-window behavior
- blocked access to loopback, localhost, link-local, and host-control surfaces

### 3. PTY and child processes

The PTY utility process and its children run outside the renderer.

They receive:

- no local HTTP control token
- no local session secret
- no browser credentials by ambient inheritance
- a host-resolved shell profile
- a workspace-generation-bound working directory
- bounded command payloads
- sequenced output events
- bounded replay retention

The current interactive PTY runs with the signed-in user's normal authority. It is not a sandbox.

## Loopback server

Loopback binding alone is not authorization.

Implemented controls:

- development shell origins restricted to origin-only `http://127.0.0.1:<port>` values
- exact Host and port validation before Astro
- HttpOnly, SameSite Strict session cookie
- timing-safe token comparison
- authentication on every `/w/*` and `/api/*` request
- exact Origin required for mutations
- JSON content type required for current local API mutations
- cross-site fetch metadata refused
- CSP, `frame-ancestors 'none'`, CORP, no-referrer, no-sniff, and frame denial headers
- no-store on workspace pages and APIs

The host bearer token remains available for Electron main's workspace-control call and is stripped before PTY creation.

## IPC

Every terminal and native-action request must satisfy:

- exact local application origin
- top frame only
- strict structural decoding
- protocol version
- payload-size bounds
- session ownership
- workspace generation

One-way invalid IPC is refused without acting. Request-response IPC rejects the call without performing the requested action.

## Paths and writes

- absolute filesystem paths are host-only
- lexical containment is checked
- realpath containment is checked again after symlink resolution
- stale saves are refused using expected modification time
- editable text is bounded to 4 MiB
- a sibling temporary file is used
- original mode is preserved
- temporary files are cleaned after failure
- rename is used for same-filesystem replacement

Crash durability is not yet claimed because file and parent-directory syncing are not yet implemented and tested per operating system.

## Terminal lifecycle

Renderer cleanup detaches. It does not terminate the PTY.

Reattachment requires the same session ID, profile, workspace ID, and generation. The initial address applies only to first spawn and cannot relocate a live shell during reattachment. Main routes events only to the owning window. Restart and stop are explicit. Changing workspace warns the user and explicitly stops sessions tied to the previous workspace generation.

Whole-process-tree cleanup is not yet proven. A future process-domain implementation must demonstrate that no tracked descendant remains after teardown before the UI labels that capability enforced.

## Artifact projections

- Markdown raw HTML is disabled.
- Rendered Markdown and DOCX enter the DOM only through reviewed LiteShip sanitization seams.
- raw responses use `nosniff` and byte ranges
- complex binary formats remain read-only
- remote links open externally only after scheme validation
- no projection receives native authority

## WebMCP and page tools

WebMCP tool metadata, schemas, annotations, and output are untrusted page content.

- `readOnlyHint`, autosubmit state, and future consequence hints are claims, not guarantees.
- a page-tool reference binds to session, document, frame, registration generation, and catalog digest
- tool-catalog churn invalidates a plan
- one invocation is one physical attempt
- ambiguous failure never triggers automatic reinvocation
- page-tool output remains prompt-injection-capable untrusted input
- cross-origin input provenance appears in the browser report
- production code does not silently inject a WebMCP polyfill into arbitrary pages
- native page or DevTools support is optional and capability-probed from the exact Electron runtime

Remote browser security also requires explicit control mode, profile grants for authenticated identity, local and private network denial, download holding, and artifact-addressed upload grants.

## Voice

Microphone access is granted only to the exact local application origin and audio-only requests. Dictation inserts text but never executes a terminal command automatically.

## Claims ceiling

SillPak must never upgrade:

- observation into enforcement
- association into causality
- a PTY kill call into process-tree proof
- a rendered projection into safe round-trip editing
- loopback binding into authentication
