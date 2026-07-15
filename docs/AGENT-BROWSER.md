# Agent browser

**Status:** ratified interaction doctrine and public boundary; implementation backends remain unproven

**Decision date:** 2026-07-16

**Scope:** general browser mechanics for SillPak and external agents

SillPak hosts isolated browser sessions and exposes one-action mechanical browser attempts to any external agent. An action may target a human-visible session or a disposable worker. Every backend must report what it enforced, mediated, could not support, or merely observed.

This document is the implementation contract for the browser subsystem. It deliberately excludes agent planning, business meaning, durable truth, context compilation, and external policy.

## 1. Product boundary

SillPak owns:

- browser-session identity and lifecycle
- browser profile and storage partitions
- visible browser attachment and detachment
- browser control ownership
- origin, frame, document, and snapshot identity
- page-tool and accessibility discovery
- bounded browser action planning and execution
- human takeover
- download holding and upload grants
- browser capability assessments
- mechanical browser reports
- generic external-agent projections over one dispatcher

SillPak does not own:

- why an agent chose an action
- whether an action is semantically correct for a larger workflow
- business policy
- agent planning or orchestration
- model routing
- logical retry legality
- durable event history
- cross-system identity mappings
- a universal credential manager
- a hidden control plane

The core law is:

> A page may declare a capability. SillPak decides only whether the current browser backend can execute the requested mechanics under the requested constraints. External systems decide what the action means.

## 2. Browser modes

SillPak has two browser realities. They share contracts and reports, but they must not be collapsed into one permissive implementation.

### 2.1 `BrowserSession`

A long-lived, human-visible browser surface.

The first backend is an Electron `WebContentsView` owned by Electron main.

A browser session supports:

- address navigation
- back, forward, and reload
- page visibility inside the SillPak work surface
- attach and detach without implicit destruction
- human input
- controlled agent input
- capture
- explicit downloads and uploads
- page-tool discovery when supported
- accessibility snapshots
- human takeover

A browser session is not automatically bounded. It may carry authenticated state and normal browser authority. SillPak must display that fact rather than calling it isolated merely because it has a separate partition.

### 2.2 `BrowserActionAttempt`

One declared physical action against one browser target.

Examples:

- navigate once
- discover page tools
- invoke one page tool
- obtain one accessibility snapshot
- click one semantic reference
- type one value into one semantic reference
- select one option
- scroll once
- extract one declared shape
- capture one declared region
- request human takeover

One request produces one plan, one physical attempt, and one report.

SillPak does not silently repeat a click, submit a form twice, reinvoke a page tool after an ambiguous failure, or retry a purchase because a response was missing.

### 2.3 `BrowserActionTarget`

A browser action targets exactly one of:

```ts
export type BrowserActionTarget =
  | {
      readonly kind: 'attached-session';
      readonly sessionId: BrowserSessionId;
    }
  | {
      readonly kind: 'ephemeral-worker';
      readonly workerProfile: EphemeralBrowserProfile;
    };
```

#### Attached session

Properties:

- human-visible
- shares the session's current page and storage state
- may be authenticated
- supports immediate human takeover
- suitable for cooperative work
- requires explicit control transfer before an agent may actuate it
- cannot claim stronger isolation than the Electron backend proves

#### Ephemeral worker

Properties:

- disposable state
- logged out by default
- explicit starting origin
- explicit allowed-origin set
- explicit download and upload rules
- suitable for unattended or more tightly bounded work
- may become visible when human takeover is requested
- must not inherit a named human profile without an explicit grant

The ephemeral worker backend may initially be absent. Its absence must appear as `unsupported`, not as a silent fallthrough into an attached authenticated session.

## 3. One dispatcher

All implementation-bearing browser actions flow through one internal surface:

```ts
export interface BrowserActionDispatcher {
  capabilities(target: BrowserActionTarget): Promise<BrowserCapabilitySnapshot>;

  plan(
    request: BrowserActionRequest,
    snapshot: BrowserCapabilitySnapshot,
  ): Promise<BrowserActionPlan>;

  execute(plan: BrowserActionPlan): Promise<BrowserActionReport>;

  cancel(attemptId: BrowserActionAttemptId): Promise<BrowserCancelResult>;
}
```

Adapters are thin projections:

- Electron IPC for SillPak's trusted application UI
- MCP as the first public external-agent projection
- a small TypeScript client over the same protocol
- local HTTP only after a concrete cross-process or hosted need appears

No agent-specific adapter may introduce a second browser command language.

## 4. Orthogonal state model

Do not create one swollen browser-state enum. Session lifetime, control ownership, document identity, and action activity are separate state machines.

### 4.1 Session phase

```ts
export type BrowserSessionPhase =
  | 'requested'
  | 'creating'
  | 'ready'
  | 'detached'
  | 'suspended'
  | 'closing'
  | 'closed'
  | 'failed';
```

Navigation is not a session phase.

### 4.2 Control mode

```ts
export type BrowserControlMode =
  | 'human'
  | 'agent'
  | 'human-takeover'
  | 'passive-observation';
```

Only one active controller may actuate a session at a time.

### 4.3 Action phase

```ts
export type BrowserActionPhase =
  | 'requested'
  | 'planning'
  | 'executing'
  | 'waiting'
  | 'succeeded'
  | 'failed'
  | 'timed-out'
  | 'cancelled';
```

### 4.4 Document identity

Each active document carries:

- browser session ID
- top-level document generation
- frame ID
- frame generation
- snapshot generation
- page-tool catalog generation

A navigation that creates a new document advances the document generation. A frame replacement advances that frame's generation. A new semantic snapshot advances the snapshot generation.

## 5. Attach, detach, close, and crash

The browser follows attach-first ownership, analogous to terminal sessions.

### 5.1 Renderer reload

A trusted SillPak renderer reload detaches from the view and then reattaches to the existing browser session when:

- the session still exists
- the same SillPak window owns it
- the same workspace generation is active
- the browser session was not explicitly closed

Reload does not imply session destruction.

### 5.2 Panel close

Closing the visible browser panel detaches or hides the view. It does not destroy the browser session.

### 5.3 Explicit close

Only an explicit close operation destroys the session partition and browser view, subject to the declared profile persistence mode.

### 5.4 Crash

A renderer-process crash must produce a browser-session failure event and invalidate the current document, frame, snapshot, and page-tool generations.

Version one may fail the session rather than attempting transparent page restoration. It must not claim the previous page state survived unless a tested backend proves it.

### 5.5 Detached expiration

Detached-session expiration is deferred until measured resource behavior exists. The initial implementation may keep only a small fixed number of detached sessions and must disclose any eviction.

## 6. Profiles and identity

Browser storage state and agent authority are separate concerns.

### 6.1 Profile classes

```ts
export type BrowserProfileClass =
  | 'ephemeral'
  | 'session'
  | 'named';
```

#### Ephemeral

- default for disposable work
- destroyed with the browser session
- logged out unless a human authenticates during the session

#### Session

- survives UI attachment changes
- destroyed on explicit session close
- does not become a reusable named identity

#### Named

- explicitly created by the user
- isolated Electron partition
- may retain cookies, local storage, IndexedDB, cache, and service-worker state as one coherent bundle
- agents receive no ambient authority merely because the profile is logged in

Named profiles are represented in the public model but remain deferred until storage cleanup and access grants are proven.

### 6.2 `ProfileAccessGrant`

An agent may control a named or authenticated profile only through an explicit grant.

```ts
export interface ProfileAccessGrant {
  readonly grantId: string;
  readonly profileId: string;
  readonly subject:
    | { readonly kind: 'session'; readonly sessionId: BrowserSessionId }
    | { readonly kind: 'attempt'; readonly attemptId: BrowserActionAttemptId };
  readonly allowedOrigins: readonly string[];
  readonly allowedActions: readonly BrowserActionKind[];
  readonly allowCredentialEntry: boolean;
  readonly requireHumanTakeoverForAuth: boolean;
  readonly expiresAt: string;
}
```

The law is:

> A browser being logged in does not authorize an agent to use that identity.

## 7. Navigation and origin policy

### 7.1 Human browser session

The default human-visible browser may navigate broadly over HTTPS.

Initial policy:

- `https:` allowed
- `http:` requires an explicit insecure-navigation policy and visible warning
- `file:`, `javascript:`, `chrome:`, `devtools:`, browser-extension URLs, and unknown custom schemes denied
- top-level `data:` navigation denied
- `blob:` allowed only when inherited from an already permitted origin
- certificate failures stop visibly
- mixed active content remains disabled

### 7.2 Bounded action

A bounded action carries an explicit allowed-origin set.

Every top-level navigation and redirect hop is re-evaluated. A redirect outside the set fails before the resulting document is treated as an allowed target.

### 7.3 Host-control denial

Remote content must not access:

- SillPak's local application origin
- loopback addresses
- localhost names
- link-local addresses
- cloud metadata addresses
- private network ranges unless a later explicit capability and threat model earn them
- native control endpoints

The implementation must account for redirects and resolved addresses. A string-only hostname blocklist is insufficient.

### 7.4 Cross-origin data custody

SillPak records mechanical provenance when data moves between origins.

A report may state:

```text
input observed at origin A
input supplied to tool or form at origin B
```

SillPak does not decide whether that transfer is appropriate for a business workflow. It can enforce only the origin restrictions present in the action request or profile grant.

## 8. Action sources

SillPak observes more than one page representation and chooses the narrowest adequate action source.

```text
native WebMCP page tool
  ↓ when absent, stale, unsuitable, contradictory, or unsupported
accessibility action graph
  ↓ when semantics are insufficient
screenshot diagnosis or human takeover
```

This is an action-source ladder, not a trust ladder.

A page tool is not more authoritative merely because it has JSON Schema. An accessibility node is not automatically truthful merely because the browser computed it. A screenshot does not authorize coordinate clicking.

## 9. WebMCP posture

WebMCP is a first-class optional capability for the attached Chromium browser backend.

It is not:

- SillPak's browser substrate
- a semantic authority system
- the backend Model Context Protocol
- a universal cross-browser requirement
- a reason to remove accessibility support
- a reason to trust page-authored descriptions

### 9.1 Standards and implementation status

As of 2026-07-16:

- WebMCP is a W3C Community Group draft.
- Web Platform Tests exist.
- Chromium contains experimental implementation and DevTools integration work.
- Google and Microsoft are active proposal editors.
- the W3C TAG review is active
- Mozilla discussion is cautious and not an implementation commitment
- WebKit has published an opposed position

This is enough to justify an optional capability seam. It is not enough to make WebMCP a portability assumption.

### 9.2 Electron proof requirement

Electron embeds Chromium, but Electron is not Chrome.

The first implementation agent must prove separately:

1. whether the bundled Electron version exposes the page API
2. whether the relevant runtime feature can be enabled safely
3. whether Electron's debugger exposes the experimental `WebMCP` DevTools domain
4. whether tool discovery, invocation, cancellation, and lifecycle events work
5. whether document and frame lifetimes behave as expected

Chromium source presence is not an Electron receipt.

### 9.3 Preferred implementation

When Electron exposes the native DevTools domain, the attached-session backend should use it.

Expected capability family:

- enable page-tool observation
- receive tool additions and removals
- invoke a tool by frame and name
- cancel one invocation
- observe invocation and response lifecycle

If the native domain is absent, the initial production backend reports WebMCP as `unsupported` and uses accessibility. Do not silently inject a polyfill into arbitrary third-party pages.

### 9.4 Tool catalog

The backend maintains a versioned page-tool catalog.

Each catalog update advances:

- catalog generation
- catalog digest
- tool registration generation for affected tools

The catalog is evidence about what the page currently declares. It is not a permanent API contract.

### 9.5 `PageToolRef`

```ts
export interface PageToolRef {
  readonly sessionId: BrowserSessionId;
  readonly documentGeneration: number;
  readonly frameId: string;
  readonly frameGeneration: number;
  readonly toolName: string;
  readonly registrationGeneration: number;
  readonly catalogDigest: string;
}
```

A page-tool reference expires when:

- the owning document changes
- the owning frame changes
- the tool is removed
- the name is re-registered under a new generation
- the observed catalog digest no longer matches the plan
- the browser backend loses the tool registry

Before invocation, SillPak rechecks the current registration.

### 9.6 Page-authored metadata is untrusted

Treat as page claims:

- tool name
- title
- natural-language description
- input schema
- output
- `readOnlyHint`
- `untrustedContentHint`
- declarative autosubmit state
- any future consequential-action hint

These values may influence planning and presentation. They may not:

- grant a capability
- authorize a profile
- skip a SillPak confirmation rule
- prove that an operation is read-only
- prove that output is safe
- broaden origin access

Example report language:

```text
page claim: readOnlyHint = true
host assessment: state modification not independently verified
execution restriction: unsupported
observation coverage: partial
```

### 9.7 Tool and visible-state contradiction

SillPak may compare the page-tool catalog with the visible and accessibility state.

A contradiction is reportable evidence, for example:

- a tool says `return-order`, but no return affordance exists in the visible account state
- a tool says read-only, but invocation causes navigation or a state mutation
- a tool description omits that it transmits uploaded data

SillPak does not infer malicious intent. It reports the mismatch and applies the declared action policy.

## 10. Accessibility snapshot

Accessibility remains a first-class action source even when WebMCP is available.

### 10.1 Flat records

Use flat addressable records with parent references rather than a deeply nested tree.

```ts
export interface AccessibleNodeRecord {
  readonly ref: AccessibleNodeRef;
  readonly frameId: string;
  readonly parentRef?: AccessibleNodeRef;
  readonly role: string;
  readonly name?: string;
  readonly description?: string;
  readonly value?: unknown;
  readonly states: Readonly<Record<string, boolean | string | number>>;
  readonly supportedActions: readonly SemanticBrowserAction[];
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly bounds?: BrowserRect;
}
```

A snapshot should expose:

- node records
- actionable references
- landmarks
- frame records
- coverage and known gaps
- document and snapshot generations

The actionable index may be requested before the full graph to reduce agent context.

### 10.2 `AccessibleNodeRef`

```ts
export interface AccessibleNodeRef {
  readonly sessionId: BrowserSessionId;
  readonly documentGeneration: number;
  readonly frameId: string;
  readonly frameGeneration: number;
  readonly nodeId: string;
}
```

Every semantic action also carries the expected snapshot generation.

### 10.3 Reference lifetime

A reference may survive incremental mutations only when the backend can prove identity continuity.

A reference expires when:

- the top-level document is replaced
- the owning frame is replaced
- identity becomes ambiguous
- the backend loses renderer state
- the action's expected generation no longer matches

A stale reference fails with `StaleReference`.

SillPak never redirects an old click to a node that merely looks similar. Matching heuristics may produce a new reference in a new snapshot.

## 11. Screenshot escalation

Screenshot access is diagnostic and evidentiary. It is not an automatic coordinate-action capability.

```ts
export type ScreenshotEscalationReason =
  | 'canvas-or-webgl'
  | 'accessible-target-missing'
  | 'semantic-visual-contradiction'
  | 'semantic-action-failed'
  | 'human-requested'
  | 'evidence-capture';
```

A screenshot request records:

- reason
- triggering action ID, when applicable
- accessibility snapshot ID, when applicable
- region: viewport, full page, or element
- purpose: diagnosis, evidence, or human request

Possible outcomes after screenshot diagnosis:

- produce a better semantic snapshot
- request human takeover
- return unsupported surface
- use a separately reviewed visual-action backend in a future version

Raw `click(x, y)` is not part of the initial public grammar.

## 12. Human takeover

Human takeover is a control transition, not an ordinary click action.

Protocol:

1. stop admitting new automated actions
2. finish or safely cancel the current declared wait
3. enter `human-takeover`
4. permit human input
5. continue passive observation only
6. record the takeover interval
7. require explicit return of control
8. invalidate prior actionable snapshot generations
9. create a fresh semantic snapshot
10. require a new action request before automation resumes

```ts
export interface HumanControlInterval {
  readonly intervalId: string;
  readonly sessionId: BrowserSessionId;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly originsObserved: readonly string[];
  readonly navigationObserved: boolean;
  readonly downloadsObserved: readonly BrowserDownloadId[];
  readonly uploadsObserved: readonly BrowserUploadId[];
  readonly resultingSnapshotId?: string;
}
```

Do not reconstruct human actions into a fictional list of precise agent operations.

## 13. Downloads

Downloads enter a session-scoped holding area.

```text
download starts
→ allocate download ID
→ stream into holding area
→ compute mechanical metadata and digest
→ report completed, cancelled, or failed
→ explicit promote or discard
```

A downloaded file does not directly overwrite a workspace artifact.

Promotion requires:

- target artifact address
- expected download digest
- collision decision

Collision decisions are:

- rename
- explicit replace
- cancel

No silent overwrite.

## 14. Uploads

An agent cannot upload an arbitrary absolute path.

```ts
export interface UploadGrant {
  readonly grantId: string;
  readonly artifact: ArtifactAddress;
  readonly expectedDigest: string;
  readonly allowedOrigins: readonly string[];
  readonly actionId: BrowserActionAttemptId;
  readonly expiresAt: string;
}
```

The browser backend resolves the artifact through the workspace boundary and supplies only the granted bytes.

Human drag and drop may later reuse the same grant machinery. It is not part of the first implementation.

## 15. Waits and retries

A physical action and a mechanical wait may belong to one attempt.

Example:

```text
click once
→ wait for declared navigation or target-state condition
→ succeed or time out
```

A second click is a new action attempt.

Allowed wait conditions may include:

- document commit
- target becomes visible
- target value matches
- download begins
- download completes
- declared page-tool response arrives
- bounded page-stability interval

A missing report or ambiguous response never authorizes reinvocation.

## 16. Planning

Planning is pure and launches nothing.

A browser plan binds:

- action request
- target backend
- session or worker identity
- profile and profile grant
- starting document generation
- starting origin
- allowed origins
- selected action source
- page-tool or accessibility reference
- catalog and snapshot generations
- required capability assessments
- download and upload policy
- timeout and wait conditions
- confirmation requirements
- capture policy

Unsupported required constraints fail before execution.

## 17. Capability model

Every backend reports enforcement and observation independently.

Enforcement:

- `enforced`
- `mediated`
- `unsupported`

Observation coverage:

- `complete`
- `partial`
- `none`

Candidate browser capabilities:

- browser session creation
- visible attachment
- renderer sandbox
- isolated storage partition
- ephemeral storage destruction
- profile grant enforcement
- navigation scheme restriction
- origin allowlist
- redirect re-evaluation
- local-address denial
- popup denial
- permission denial
- page-tool discovery
- page-tool invocation
- page-tool cancellation
- accessibility snapshot
- semantic node action
- screenshot capture
- download holding
- upload grant enforcement
- clipboard isolation
- human takeover
- passive observation

Example initial matrix:

| Capability | Attached Electron session | Ephemeral worker |
|---|---|---|
| Human-visible interaction | enforced | mediated or optional |
| Existing authenticated state | grant-dependent | unsupported by default |
| Ephemeral storage | mediated | enforced when backend proves cleanup |
| Origin restriction | backend-dependent | backend-dependent |
| Local-address denial | required | required |
| WebMCP page tools | optional native capability | optional capability |
| Accessibility snapshot | required fallback | required fallback |
| Download holding | required | required |
| Upload artifact restriction | required | required |
| Human takeover | native | requires headful attachment |

The actual runtime snapshot, not this design table, is authoritative.

## 18. Action grammar

The public grammar is closed.

```ts
export type BrowserActionKind =
  | 'navigate'
  | 'list-page-tools'
  | 'invoke-page-tool'
  | 'cancel-page-tool'
  | 'snapshot-accessibility'
  | 'click-ref'
  | 'type-ref'
  | 'select-ref'
  | 'scroll'
  | 'extract'
  | 'capture'
  | 'request-takeover';
```

No raw DOM program, arbitrary JavaScript, extension code, or coordinate sequence enters this contract.

## 19. Browser action report

Every attempt returns a browser action report, including failed planning and partial supervisor failure.

```ts
export interface BrowserActionReport {
  readonly reportVersion: 1;
  readonly attemptId: BrowserActionAttemptId;
  readonly sessionId?: BrowserSessionId;
  readonly targetKind: BrowserActionTarget['kind'];
  readonly backendId: string;
  readonly actionKind: BrowserActionKind;
  readonly actionSource:
    | 'webmcp'
    | 'accessibility'
    | 'capture'
    | 'human-takeover'
    | 'host-navigation';
  readonly outcome:
    | 'completed'
    | 'denied'
    | 'failed'
    | 'timed-out'
    | 'cancelled'
    | 'unsupported'
    | 'supervisor-fault';
  readonly startedAt?: string;
  readonly endedAt: string;
  readonly startingOrigin?: string;
  readonly endingOrigin?: string;
  readonly documentGenerationBefore?: number;
  readonly documentGenerationAfter?: number;
  readonly pageTool?: {
    readonly ref: PageToolRef;
    readonly declaredAnnotations: Readonly<Record<string, unknown>>;
    readonly responseStatus?: string;
  };
  readonly accessibility?: {
    readonly snapshotId: string;
    readonly targetRef?: AccessibleNodeRef;
  };
  readonly assessments: readonly CapabilityAssessment[];
  readonly downloads: readonly BrowserDownloadRecord[];
  readonly uploads: readonly BrowserUploadRecord[];
  readonly captures: readonly BrowserCaptureRecord[];
  readonly crossOriginTransfers: readonly BrowserDataTransferRecord[];
  readonly findings: readonly BrowserFinding[];
  readonly completeness: 'complete' | 'partial';
}
```

Page-tool output remains untrusted input to the calling agent.

## 20. Public MCP projection

The first public external-agent adapter exposes a stable SillPak gateway.

Initial tools:

```text
browser.open_session
browser.close_session
browser.list_page_tools
browser.invoke_page_tool
browser.cancel_page_tool
browser.snapshot_accessibility
browser.perform_semantic_action
browser.capture
browser.request_takeover
browser.return_control
```

Dynamic page tools are returned as data from `browser.list_page_tools`. They are not automatically projected as a changing collection of top-level MCP tools.

Reasons:

- page tools change during a session
- tools are scoped to documents and frames
- names may collide across frames
- tools disappear on navigation
- tool metadata is attacker-controlled
- clients may cache tool lists

A later optional direct projection requires proven dynamic tool-list behavior across target MCP clients.

## 21. Implementation sequence

### Phase A: contract and fixtures

- add public browser types
- add pure state-machine tests
- add stale-reference fixtures
- add profile-grant fixtures
- add origin and redirect policy fixtures
- add WebMCP catalog fixtures
- add report completeness fixtures

### Phase B: Electron capability probe

Using the exact Electron version in the lockfile:

1. create a secure local test page
2. test for the current WebMCP page API
3. register a trivial tool
4. attach Electron debugger to the `WebContents`
5. attempt to enable the experimental WebMCP DevTools domain
6. observe tool additions and removals
7. invoke and cancel a tool
8. navigate and verify document-scoped invalidation
9. test same-origin and cross-origin frame exposure
10. record supported, mediated, and unsupported capabilities

The probe produces a checked-in result document or fixture. It does not become a permanent runtime assumption.

### Phase C: attached-session backend

- main-process-owned `WebContentsView`
- owner-aware browser session registry
- isolated partition
- deny-by-default permissions
- navigation and local-address enforcement
- attach and detach
- capture
- download holding
- human takeover
- accessibility snapshot
- optional native WebMCP adapter when the probe passes

### Phase D: bounded action dispatcher

- pure planner
- one-action execution
- generation checks
- waits and timeouts
- reports on every path
- no automatic retry

### Phase E: ephemeral worker

- disposable profile
- explicit origin set
- tested cleanup
- same action dispatcher
- headful takeover path
- capability matrix independent of attached sessions

### Phase F: public MCP adapter

- stable gateway tools
- strict schemas
- report propagation
- no provider-specific behavior

## 22. Proof grid

### Session and ownership

1. renderer reload reattaches without destroying a browser session
2. one SillPak window cannot control another window's session
3. panel detach does not close the session
4. explicit close destroys the intended partition
5. crash invalidates document and tool generations
6. detached-session eviction is disclosed

### Remote-content isolation

7. remote content receives no SillPak preload
8. remote content receives no Node integration
9. remote content cannot call terminal or native artifact IPC
10. remote content cannot access the SillPak local origin
11. redirect and DNS resolution cannot bypass local-address denial
12. denied permissions remain denied in child frames
13. popup and new-window policy is enforced

### References

14. stale accessibility references fail closed
15. stale page-tool references fail closed
16. top-level navigation advances document generation
17. frame replacement advances frame generation
18. ambiguous node identity produces a new reference, not silent rebinding

### WebMCP

19. tool addition and removal advance the catalog generation
20. a tool removed after planning cannot execute
21. same-name re-registration invalidates the old reference
22. page annotations never grant SillPak authority
23. tool output is marked untrusted
24. failure never triggers automatic reinvocation
25. page-tool and visible-state contradiction is reportable
26. WebMCP absence falls back to accessibility
27. no production polyfill is injected into arbitrary pages

### Profiles and origins

28. authenticated profile use without a grant is refused
29. expired profile grants are refused
30. redirect outside the allowed-origin set is refused
31. cross-origin input provenance appears in the report
32. local and metadata addresses are refused
33. certificate errors cannot be silently bypassed

### Downloads and uploads

34. downloads enter the holding area
35. downloads never silently overwrite workspace files
36. upload without an explicit grant is refused
37. upload digest mismatch is refused
38. upload origin mismatch is refused

### Human takeover

39. takeover stops admission of new automated actions
40. passive observation does not actuate the page
41. return of control invalidates prior actionable snapshots
42. human actions are not reconstructed as agent actions

### Reports

43. planning denial returns a report
44. timeout returns a report
45. backend crash returns a partial supervisor-fault report
46. enforcement and observation remain separate
47. report origin and generation fields reflect navigation

## 23. Frozen decisions

1. General external agents may operate SillPak browser mechanics.
2. Browser meaning and agent planning remain outside SillPak.
3. Browser sessions and browser action attempts are separate concepts.
4. Session, control, action, and document state are orthogonal.
5. Actions may target an attached session or an ephemeral worker.
6. Electron main owns attached browser sessions.
7. Remote content receives no native authority bridge.
8. WebMCP is an optional page-authored action source, not authority.
9. Accessibility remains a first-class fallback and inspection surface.
10. Screenshots are an escalation and do not unlock coordinate clicking.
11. Stable references are generation-bound and fail stale.
12. Named profile identity requires an explicit access grant.
13. Downloads enter a holding area.
14. Uploads require artifact grants.
15. One physical action produces one attempt and one report.
16. The implementation has one dispatcher and thin adapters.
17. Public MCP exposes a stable gateway rather than transient page tools directly.
18. Unsupported requirements fail before execution.

## 24. Deferred decisions

- exact ephemeral-worker technology
- exact detached-session resource budget
- named-profile UI
- automatic promotion rules for downloads
- human drag-and-drop policy
- screenshot compression and retention
- optional direct dynamic MCP projection
- visual coordinate-action backend
- service-worker WebMCP support
- cross-platform support outside the bundled Chromium runtime

A deferred choice must not be filled through an implicit default that broadens authority.

## 25. Standards snapshot

This document treats current WebMCP movement as implementation input, not as a settled cross-browser guarantee.

Primary references:

- WebMCP proposal and draft: <https://github.com/webmachinelearning/webmcp>
- WebMCP rendered draft: <https://webmachinelearning.github.io/webmcp/>
- Web Platform Tests: <https://github.com/web-platform-tests/wpt/tree/master/webmcp>
- GoogleChromeLabs tools and demos: <https://github.com/GoogleChromeLabs/webmcp-tools>
- W3C TAG review: <https://github.com/w3ctag/design-reviews/issues/1238>
- Mozilla standards-position discussion: <https://github.com/mozilla/standards-positions/issues/1412>
- WebKit standards position: <https://github.com/WebKit/standards-positions/issues/670>

The implementation agent must prefer runtime probes over assumptions about Electron support.
