## Why

Janet is a delightful Lisp, but lacks a proper interactive development experience in VS Code. Developers writing Janet must either use the terminal REPL or basic text editing with no connection between editor and runtime. The Spork library provides `netrepl` — a TCP-based REPL server — but there's no VS Code extension that speaks the netrepl protocol. Reja fills this gap, providing a Calva-like interactive programming experience for Janet.

## What Changes

- Create a VS Code extension "Reja" that connects to a Janet Spork netrepl server over TCP
- Provide a REPL Editor window (`.reja-repl` file) for interactive eval
- Support both **jack-in** (extension launches the Janet REPL) and **connect** (attach to existing REPL)
- Send individual expressions, selections of multiple expressions, or entire file contents to the REPL
- Display evaluation results both inline (decorations) and in the REPL Editor log
- Bundle a self-contained Janet server script (`reja-server.janet`) so users only need `janet` installed — no additional library setup
- Use a local JavaScript paren-matching algorithm for expression boundary detection (no server-side injection needed)
- Support per-project configuration via VS Code settings (`.vscode/settings.json`)
- Include examples, comprehensive README

## Capabilities

### New Capabilities

- `repl-connection`: TCP connection lifecycle — jack-in (launch Janet process), connect (attach to running REPL), disconnect, connection state management, host/port configuration. Compatible with Spork netrepl, rojcad, and the bundled server.
- `repl-editor`: A REPL Editor document (`.reja-repl`) that shows evaluation results — supporting submit-on-enter and history tracking
- `code-evaluation`: Send expressions to the REPL — current top-level form, current enclosing form, selection, file contents, with result capture and error handling. Form detection uses a local paren-matching algorithm, no server dependency.
- `inline-results`: Decorate source code with inline evaluation results and selection highlighting

### Modified Capabilities

None — this is a new project with no existing specs.

## Impact

- New VS Code extension published to marketplace
- New Janet source file (`reja-server.janet`) bundled and maintained in the project
- Project structure: TypeScript extension source, Janet server script, documentation, examples
- Dependencies: `@types/vscode`, `@vscode/test-electron`, TypeScript (dev); no runtime Node dependencies beyond built-in `net`, `path`, `fs` modules
- No changes to existing Janet tooling or libraries
