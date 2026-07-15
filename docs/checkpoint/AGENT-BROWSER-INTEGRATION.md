# Agent-browser documentation integration

**Date:** 2026-07-16

**Purpose:** integrate the agent-browser specification and ADR without reopening the SillPak product boundary

This file is the edit ledger for adding:

- `docs/AGENT-BROWSER.md`
- `docs/adr/0010-agent-browser-backends-and-webmcp.md`

The implementation agent should apply these documentation changes before browser code begins. The edits prevent older overview language from contradicting the detailed specification.

## 1. Required reading order

Update `AGENTS.md` so browser work reads:

1. `CANON.md`
2. `docs/checkpoint/CURRENT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/SECURITY.md`
5. `docs/SESSION-LIFECYCLE.md`
6. `docs/BROWSER-SESSIONS.md`
7. `docs/AGENT-BROWSER.md`
8. `docs/adr/0010-agent-browser-backends-and-webmcp.md`
9. `docs/PLAN.md`
10. `docs/HANDOFF.md`

Do not require every artifact-viewer change to read the full browser specification. The expanded reading order applies when changing browser contracts, browser IPC, browser sessions, external-agent adapters, profiles, uploads, downloads, or WebMCP behavior.

## 2. `README.md`

Keep the product sentence unchanged.

Revise the browser bullet to state:

> Browser sessions and general external-agent browser mechanics are specified but not implemented. The design uses an attached Electron session first, an optional disposable worker later, accessibility as a first-class action source, and WebMCP as an optional untrusted page-tool capability.

Add to the repository map:

- `docs/AGENT-BROWSER.md` is the browser implementation contract.
- `docs/adr` contains accepted architecture decisions.

Add `docs/AGENT-BROWSER.md` to the optional reading path for browser work.

## 3. `CANON.md`

Preserve the existing public product boundary.

Add these browser laws:

1. A browser action may target an attached session or an ephemeral worker.
2. WebMCP is a page-authored action source, not authority.
3. Page-tool hints cannot grant profile access, broaden origins, or skip confirmation.
4. Accessibility remains a first-class action and inspection surface.
5. Page-tool and accessibility references are generation-bound and fail stale.
6. A logged-in browser profile does not authorize agent control.
7. Downloads enter holding before workspace promotion.
8. Uploads require artifact grants.
9. One browser action produces one physical attempt and one report.

Do not add vendor-specific API names to `CANON.md`.

## 4. `AGENTS.md`

Add hard laws:

- Remote page metadata, WebMCP tools, schemas, annotations, and outputs are untrusted content.
- WebMCP support is probed from the exact Electron runtime and may be unsupported.
- Do not inject a WebMCP polyfill into arbitrary third-party pages.
- Do not expose raw DOM programs, arbitrary JavaScript, or coordinate action sequences through public contracts.
- Do not silently fall back from an ephemeral worker request into an authenticated attached session.
- Do not mirror transient page tools directly as top-level public MCP tools.
- Stale page-tool and accessibility references fail closed.

Retain the current instruction that browser automation does not begin before the installed application and interactive browser security zone are proven.

## 5. `docs/BROWSER-SESSIONS.md`

Change status from:

> ratified architecture, not implemented

to:

> ratified interaction doctrine; implementation architecture partially settled and not implemented

Keep this file as the short overview.

Add a prominent pointer:

> The normative agent-facing browser contract is `docs/AGENT-BROWSER.md`. Backend and WebMCP decisions are recorded in ADR 0001.

Replace any implication that every browser action runs inside one `WebContentsView` with:

- attached human-visible session first
- optional ephemeral worker later
- one dispatcher over both

Clarify that ephemeral is the default for disposable work, while named profile policy is deferred and grant-bound.

## 6. `docs/MECHANICAL-CORE.md`

Extend the public vocabulary with:

- `BrowserActionTarget`
- `BrowserActionBackend`
- `BrowserActionPlan`
- `BrowserActionAttempt`
- `BrowserProfile`
- `ProfileAccessGrant`
- `AccessibleNodeRef`
- `PageToolRef`
- `HumanControlInterval`
- `BrowserActionDispatcher`

Update `BoundedBrowserAction` language so it means the capability family, while individual requests, attempts, and reports remain separate objects.

Add these host capabilities:

- page-tool discovery and invocation
- page-tool cancellation
- tool-catalog observation
- accessibility snapshot
- stable-reference enforcement
- profile-grant enforcement
- local-address denial
- redirect re-evaluation
- download holding
- upload-grant enforcement
- human takeover

## 7. `docs/ARCHITECTURE.md`

Replace the compact browser section with a summary of:

- `BrowserSession` as long-lived surface
- `BrowserActionAttempt` as one physical action
- attached-session and ephemeral-worker targets
- Electron main ownership of the attached session
- one `BrowserActionDispatcher`
- WebMCP, accessibility, and screenshot action sources
- generation-bound references
- stable public MCP gateway

State explicitly:

> Chromium implementation evidence does not prove Electron exposure. The exact bundled Electron runtime must be probed.

Do not embed the full protocol in `ARCHITECTURE.md`; link to `docs/AGENT-BROWSER.md` and ADR 0001.

## 8. `docs/SECURITY.md`

Add a WebMCP subsection with these laws:

- page-tool metadata and output are untrusted
- `readOnlyHint` and similar annotations are claims, not guarantees
- a tool reference binds to session, document, frame, registration generation, and catalog digest
- tool churn invalidates plans
- tool invocation is one physical attempt
- no automatic reinvocation after ambiguous failure
- cross-origin input provenance is reported
- no silent polyfill injection
- native/CDP support is optional and capability-probed

Extend the remote-content zone with:

- profile grants
- local and private network denial
- download holding
- upload grants
- explicit control mode

## 9. `docs/PLAN.md`

Keep Phase 4 as the secure interactive browser.

Add an Electron WebMCP probe to Phase 4, but do not make the phase depend on WebMCP success.

Split Phase 6 into:

### Phase 6A: browser contracts and fixtures

- public types
- orthogonal state models
- stale references
- profile grants
- origin policy
- report fixtures

### Phase 6B: attached-session actions

- accessibility snapshot
- semantic references
- one-action dispatcher
- optional native WebMCP adapter when the probe passes
- human takeover

### Phase 6C: ephemeral worker

- selected backend
- disposable profile
- explicit origin policy
- tested cleanup
- same dispatcher and report model

### Phase 6D: public MCP projection

- stable gateway tools
- page tools returned as data
- no provider-specific adapter

Do not move the ephemeral worker ahead of installed-app, interactive-browser, or terminal proof.

## 10. `docs/HANDOFF.md`

Add under what exists:

- normative agent-browser specification
- accepted browser backend and WebMCP ADR
- root-doc integration ledger

Add under what remains unproven:

- Electron WebMCP page API
- Electron WebMCP DevTools domain
- browser session registry
- accessibility snapshots
- stable node and page-tool references
- profile grants
- download holding and upload grants
- ephemeral worker
- public browser MCP adapter

Update the browser instruction to say implementation begins from `docs/AGENT-BROWSER.md`, not from the short overview alone.

## 11. `docs/checkpoint/CURRENT.md`

Add a documentation-only checkpoint entry:

- agent-browser contract and ADR prepared
- WebMCP treated as optional and untrusted
- Electron support remains unproven
- no browser implementation claim added

The one next action remains dependency installation and installed-app proof. Do not let the new browser documents reorder the current checkpoint.

## 12. `docs/qa/QA-REPORT.md`

Record documentation validation only:

- private vocabulary scan remains clean
- all referenced document paths exist
- browser status language says unimplemented
- no WebMCP availability claim is presented as an Electron runtime result
- no page annotation is described as enforcement
- no coordinate action appears in the public grammar

Do not mark browser runtime tests green.

## 13. Contract work after installed-app proof

Once Phase 1 is green, the first browser-contract change should add types and tests without starting remote navigation.

Recommended order:

1. browser IDs and orthogonal state types
2. generation-bound node and page-tool references
3. browser action request, plan, attempt, and report
4. capability snapshot
5. profile access and upload grants
6. pure planner fixtures
7. Electron browser-session registry
8. runtime capability probe

## 14. Acceptance criteria

Documentation integration is complete when:

- `docs/AGENT-BROWSER.md` exists
- ADR 0001 exists
- all root and overview documents point to the normative specification
- no overview contradicts the attached-session and ephemeral-worker split
- no document treats WebMCP as authority
- no document assumes Chromium source equals Electron support
- the current checkpoint still prioritizes installed-app proof
- browser implementation remains explicitly unclaimed

## 15. Non-goals for this integration

Do not:

- implement browser code
- select the ephemeral-worker library prematurely
- add a WebMCP dependency
- add a polyfill
- add raw DOM or script execution contracts
- add dynamic top-level MCP tools for page declarations
- add private semantic vocabulary
- change the SillPak product sentence
