# ADR 0001: Browser action backends and WebMCP posture

**Status:** Accepted

**Date:** 2026-07-16

## Context

SillPak is gaining a general browser capability for external agents. Earlier browser work established a mature interaction doctrine: typed page tools when available, accessibility-first semantic actions, screenshot escalation, human takeover, explicit origin handling, and action-level evidence.

The standalone implementation still needed to answer four architectural questions:

1. whether an agent acts in the same browser session as the human or in a disposable worker
2. whether WebMCP becomes the browser substrate or one optional action source
3. whether page tools are projected directly as external MCP tools
4. whether browser lifecycle, control mode, action state, and document identity share one state machine

WebMCP has meaningful Chromium momentum, Web Platform Tests, active W3C review, and experimental DevTools integration. It also has active cross-browser opposition and unresolved consent, security, privacy, and accessibility questions. Electron embeds Chromium, but Electron does not automatically expose every Chrome-specific browser-agent or DevTools surface.

SillPak therefore needs an architecture that benefits from WebMCP without depending on universal support or treating page-authored tool metadata as authority.

## Decision

### 1. Separate browser sessions from action attempts

`BrowserSession` is a long-lived browser surface.

`BrowserActionAttempt` is one planned physical action with one report.

A renderer, panel, or route transition may attach to or detach from a browser session without destroying it. An action attempt never owns the session lifecycle.

### 2. Use orthogonal state

The implementation keeps separate state for:

- session phase
- control mode
- action phase
- document, frame, snapshot, and page-tool catalog generations

Navigation does not become a session-lifecycle state. Human takeover does not become an action outcome. A renderer crash invalidates document-bound identities without inventing continuity.

### 3. Support two action targets

A browser action targets either:

- an attached, human-visible session
- an ephemeral worker

The attached-session backend is implemented first with Electron `WebContentsView`.

The ephemeral-worker backend is a later implementation behind the same dispatcher. Its exact technology is deferred.

An unavailable ephemeral backend is reported as unsupported. It never silently falls back to an authenticated attached session.

### 4. Keep one browser action dispatcher

Electron IPC, public MCP, and any future HTTP or SDK surface project one `BrowserActionDispatcher`.

Adapters contain no duplicated browser planning or policy logic.

### 5. Treat WebMCP as an optional untrusted action source

WebMCP is preferred when:

- the bundled runtime supports it
- the current page exposes an applicable tool
- the tool reference is current
- the tool input validates
- the requested physical constraints are supportable
- the page-tool declaration does not bypass SillPak's own confirmation and profile rules

WebMCP is not:

- the browser substrate
- semantic authorization
- proof of read-only behavior
- proof that tool output is safe
- a universal cross-browser assumption

If Electron does not expose the required native surface, SillPak reports WebMCP unsupported and uses accessibility. SillPak does not silently inject a WebMCP polyfill into arbitrary third-party pages.

### 6. Keep accessibility as a first-class source

SillPak maintains a flat accessibility action graph with generation-bound stable references.

WebMCP tools and accessibility nodes use different reference types. Neither is silently rebound after a document, frame, or registration generation changes.

### 7. Restrict screenshots to escalation

Screenshots support diagnosis, evidence, and human-requested capture. They do not automatically authorize coordinate actions.

### 8. Require explicit profile authority

A logged-in profile does not authorize an agent.

Named or authenticated profile use requires a `ProfileAccessGrant` scoped by origin, action family, subject, and expiration.

### 9. Hold downloads and grant uploads

Downloads enter a session-scoped holding area and require explicit promotion or discard.

Uploads require an artifact-addressed, digest-bound, origin-scoped grant.

### 10. Expose a stable public MCP gateway

The initial public MCP adapter exposes stable SillPak tools such as:

- list page tools
- invoke or cancel one page tool
- snapshot accessibility
- perform one semantic action
- capture
- request or return human control

Dynamic page tools remain data. They are not automatically registered as a changing set of top-level MCP tools.

## Consequences

### Positive

- SillPak can use Chromium's WebMCP work without depending on Safari or Firefox support.
- The visible cooperative browser and disposable worker can evolve independently.
- WebMCP tool churn cannot corrupt the public agent protocol.
- Page-authored descriptions and annotations never become authority.
- Browser mechanics remain useful to any external agent.
- Accessibility remains available when WebMCP is absent, contradicted, or unsuitable.
- Reports preserve the distinction between declared metadata, enforced constraints, and observed outcomes.

### Costs

- The browser subsystem has more explicit identity and generation types.
- Two backends require capability matrices and independent tests.
- Profile grants and holding areas add implementation work before authenticated automation is safe.
- A stable MCP gateway is less magical than directly mirroring every page tool.
- Electron support must be proven by runtime probe rather than inferred from Chromium source.

## Rejected alternatives

### WebMCP-only browser

Rejected because WebMCP is optional, not universal, page-authored, dynamically scoped, and actively disputed across browser vendors.

### Accessibility-only browser

Rejected because native page tools can provide faster, more reliable, and more semantically direct operations when available.

### One browser backend for all work

Rejected because a human-visible authenticated session and a disposable bounded worker have materially different authority and isolation properties.

### Automatic fallback from ephemeral work to a human profile

Rejected because it silently broadens identity and credential authority.

### Dynamic page tools as top-level MCP tools

Rejected because tools change with documents and frames, may collide, and may be attacker-controlled while external clients cache tool lists.

### Silent WebMCP polyfill injection

Rejected because modifying arbitrary third-party pages would manufacture support, alter page behavior, and muddy the evidence boundary.

### Raw DOM or arbitrary JavaScript as the public agent protocol

Rejected because it creates an unbounded execution language and bypasses stable mechanical reports.

### Coordinate clicking as the default fallback

Rejected because screenshots are not authority and visual target selection is not yet a proven public contract.

## Proof obligations

This decision is not complete until the implementation proves:

1. Electron page-API and DevTools support through a checked-in probe
2. remote content receives no SillPak native bridge
3. local and private network denial resists redirects and address resolution tricks
4. stale page-tool and accessibility references fail closed
5. page annotations never skip SillPak confirmation rules
6. named-profile use without a grant is refused
7. downloads enter a holding area
8. uploads require matching grants
9. one action produces one attempt and one report
10. browser-backend failure returns a complete or explicitly partial report
11. public MCP behavior remains stable while page tools change

## Revisit triggers

Revisit this ADR when:

- Electron exposes a stable WebMCP host API that materially changes the adapter seam
- WebMCP reaches multi-engine interoperable status
- WebMCP adds normative consequential-action or consent semantics that SillPak can safely adopt
- an ephemeral worker backend is selected and proves stronger guarantees
- dynamic MCP tool-list support becomes reliable across the target client set
- a reviewed visual-action backend earns coordinate operations
