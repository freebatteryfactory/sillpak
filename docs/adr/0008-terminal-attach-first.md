# ADR 0008: Terminal sessions attach before they spawn

**Status:** accepted

Opening a known compatible terminal session reattaches to the running PTY and replays bounded output. Renderer cleanup detaches. Restart and stop are explicit. Session IDs bind to one profile and workspace generation.
