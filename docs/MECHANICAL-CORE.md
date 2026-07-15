# SillPak mechanical core

**Status:** public mechanical specification

## Boundary

SillPak owns:

- artifact routing and projection
- workspace identity and path containment
- persistent terminal sessions
- future persistent browser sessions
- process birth, input, output, resize, exit, and teardown
- host capability discovery
- optional bounded physical attempts
- shallow command, filesystem, and browser observations
- mechanical reports for generic adapters

SillPak does not own:

- semantic intent
- business policy
- agent planning or orchestration
- logical retry legality
- durable truth or replay
- context compilation
- universal receipts
- private external-system vocabulary

The core law is:

> SillPak reports what the host was asked to do, what it could actually enforce, what it observed, and how the physical attempt ended. It never invents semantic meaning and never upgrades an observation into a guarantee.

## Physical modes

### TerminalSession

A long-lived interactive PTY for humans, shells, REPLs, build tools, and CLI agents. It normally carries the signed-in user's ambient authority and must not be described as confined unless a concrete backend proves otherwise.

### BrowserSession

A long-lived interactive remote page in an isolated Electron view. It is untrusted content with explicit permissions and no native bridge.

### BoundedRun

A future one-attempt process interface with explicit argv, environment, working directory, timeout, output policy, and requested physical constraints.

### BoundedBrowserAction

A browser capability family in which one `BrowserActionRequest` produces one `BrowserActionPlan`, one physical `BrowserActionAttempt`, and one `BrowserActionReport`. An action targets either an attached human-visible session or an optional ephemeral worker.

The browser vocabulary also includes:

- `BrowserActionTarget`
- `BrowserActionBackend`
- `BrowserActionDispatcher`
- `BrowserProfile`
- `ProfileAccessGrant`
- `AccessibleNodeRef`
- `PageToolRef`
- `HumanControlInterval`

The normative contract is `docs/AGENT-BROWSER.md`.

## Planning law

A bounded attempt follows:

`Request → Plan → Attempt → Report`

Planning is pure. It launches nothing. Every requested constraint is classified before spawn.

## Separate axes

Enforcement:

- enforced
- mediated
- unsupported

Observation coverage:

- complete
- partial
- none

Seeing a behavior does not mean the host could constrain it.

## Host capability examples

- interactive PTY
- process spawn
- process-tree cleanup
- timeout
- output capture and limit
- environment allowlist
- process-count limit
- memory and CPU limits
- filesystem read and write boundaries
- filesystem delta observation
- network deny or allowlist
- browser origin restriction
- browser download and upload mediation
- page-tool discovery, invocation, cancellation, and catalog observation
- accessibility snapshots and stable-reference enforcement
- profile-grant enforcement
- browser redirect re-evaluation
- browser local-address denial
- browser human takeover

The UI mirrors the host snapshot. It never upgrades a claim.
