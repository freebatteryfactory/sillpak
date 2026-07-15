# Product definition

## Product noun

SillPak is a routed artifact workspace.

It occupies the missing middle between a naked terminal and a full IDE. Files and directories become addressable pages; terminal sessions persist as instruments; format-specific projections let a human inspect and lightly edit work without loading an entire development environment.

The browser capability extends the same idea to the web: an interactive page can become a persistent tool beside local artifacts without becoming the product's identity.

## Core loop

1. Navigate to a directory or artifact.
2. The route becomes the authoritative selection.
3. Run a shell, CLI agent, script, or tool in the persistent terminal.
4. Inspect the resulting file, document, data, media, or web state as a page.
5. Attach explicit artifact context when useful.
6. See honest status, output, and associated filesystem changes.
7. Continue without opening an IDE merely to regain orientation.

## Product promises

### No IDE tax

The user gets navigation, previews, bounded editing, and a real terminal without language servers, debugger machinery, extension hosts, or a repository-only project model.

### Mixed artifacts

Code remains first-class, but the product also treats Markdown, documents, PDFs, spreadsheets, images, audio, video, logs, archives, and browser captures as legitimate work surfaces.

### Tools remain tools

External agents run through their own CLIs. SillPak does not rebuild model routing, planning loops, provider credentials, or proprietary agent state.

### Context is visible

The explicit context shelf shows what the operator intentionally attached. Ambient access and inferred agent knowledge are not presented as explicit context.

### Mechanics are honest

The UI distinguishes what the host enforced from what it merely observed. An interactive PTY is not called a sandbox. A watcher correlation is not called causality.

## Interaction grammar

- The URL is the selected artifact.
- Back and forward are artifact navigation.
- The artifact page may occupy the normal stage or expand into focus mode.
- The terminal persists beneath or beside it.
- Browser sessions, when implemented, persist as separate untrusted-content views.
- Native file actions remain explicit.
- Destructive or consequential actions are never hidden behind ornamental UI.

## First users

- People using Claude Code, Codex CLI, Gemini CLI, or ordinary shells who want a file tree and previews without a full IDE.
- Technical knowledge workers moving among code, documents, structured data, media, and automation.
- Agent builders who need an open, neutral human interface around a CLI without building their own desktop shell.

## Success test

The first vertical slice succeeds when a user can complete repeated daily work sessions in SillPak and prefers it over either a bare terminal or opening an IDE solely for navigation and inspection.

## Non-goals

- semantic intent or business policy
- agent orchestration
- durable truth or replay
- universal context compilation
- generic workspace-provider abstraction
- raw desktop automation
- custom VT implementation
- full-fidelity office editing
- hidden cloud browser routing
