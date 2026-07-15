# Terminal session lifecycle

## Goal

A long-running CLI agent must survive route changes and renderer reloads. Renderer lifecycle and process lifecycle are separate.

## Open

The renderer sends:

- session ID
- host-owned profile ID
- workspace ID and generation
- initial artifact address
- terminal dimensions

Electron main resolves the address and profile. The renderer never sends an executable, argument vector, absolute working directory, or child environment.

If a compatible session already exists, `open` attaches to it. If not, main creates a new session and sends a resolved launch to the PTY utility process.

## Attach

A compatible attachment requires the same:

- session ID
- profile
- workspace ID
- workspace generation

The initial artifact address is used only when the session is first spawned. A compatible reattach does not move the shell to the route that happened to be open after reload.

A live session may have one owning `WebContents`. A detached session may be claimed by a later trusted application window.

On attach, main sends a bounded replay window and discloses any earlier bytes that were dropped.

## Detach

Renderer cleanup, Astro island release, and hard reload send `detach`.

Detach:

- removes the current visual owner
- keeps the PTY alive
- keeps collecting bounded replay output
- does not send a signal to the child

## Workspace switch

Version one has no session-discovery UI. Changing workspace is therefore an explicit stop boundary: the interface warns the user, main terminates sessions bound to the prior workspace generation, and the new workspace opens a new terminal session. A running shell is never silently transplanted to another root.

## Restart

Restart is explicit. It increments the PTY process generation, clears replay state, and replaces the underlying process. Late exit events from an older process generation are ignored.

## Stop

Stop is explicit. The current implementation asks node-pty to kill the session. It does not yet claim complete descendant cleanup.

## Events

Renderer-visible events carry:

- protocol version
- session ID
- monotonically increasing sequence
- monotonic host time

The current event vocabulary includes ready, data, replay, output-truncated, exit, and error. Cwd and command-boundary events are reserved for later shell integration.

## Current ceiling

- replay is bounded, not durable
- output transport does not yet have a complete pause-and-ack protocol
- process-tree cleanup is not independently proven
- only one default terminal profile exists
- session discovery UI does not yet exist
