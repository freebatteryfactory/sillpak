# Artifact viewer matrix

| Artifact | Engine | Preview | Editing | Fidelity claim | Boundary |
|---|---|---:|---:|---|---|
| Directory | Astro plus TanStack Virtual | yes | native actions only | filesystem-native | routed path policy |
| Markdown | markdown-it, Lexical, CodeMirror | formatted | rich and exact-source | source mode exact; rich mode may normalize supported Markdown | raw HTML disabled; reviewed sanitizer |
| Source code | CodeMirror 6 | yes | bounded text | exact UTF-8 text | 4 MiB save cap and stale-write refusal |
| Plain text and logs | CodeMirror 6 | yes | bounded text | exact UTF-8 text | same as source code |
| JSON | CodeMirror 6 | yes | bounded text | exact text; no schema claim | same as source code |
| DOCX | Mammoth | yes | no | readable HTML projection, not Word fidelity | dynamic import and sanitized HTML |
| PDF | PDF.js | page render | no | visual page projection | ranged bytes and no native bridge |
| XLSX or XLSM | ExcelJS plus virtual rows | yes | no | bounded cell projection, not Excel fidelity | file-size, row, and column limits |
| CSV | ExcelJS plus virtual rows | yes | no | bounded table projection | no editing claim |
| Image | native browser image | yes | no | browser decode | no native bridge |
| Audio | native browser audio | yes | no | browser decode | no native bridge |
| Video | native browser video | yes | no | browser decode | no native bridge |
| Archive | metadata and system handoff | limited | no | no archive mutation claim | external handoff only |
| Unknown | metadata and system handoff | limited | no | no parser claim | external handoff only |

## Capability law

A viewer declares preview, edit, search, selectable text, and system handoff independently. One capability never implies another.

## Loading law

The ordinary directory and terminal path must not load Lexical, CodeMirror language packs, Mammoth, ExcelJS, PDF.js, or speech inference until the matching capability activates.
