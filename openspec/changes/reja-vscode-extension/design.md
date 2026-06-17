## Context

Reja is a VS Code extension that provides interactive Janet programming via the Spork netrepl protocol. The target users are Janet developers who want a REPL-connected editing experience in VS Code, analogous to what Calva provides for Clojure.

The project is starting from scratch: no existing source code, just an OpenSpec scaffolding. The extension will be written in TypeScript. The netrepl protocol is text-based over TCP, using length-prefixed messages (4-byte little-endian uint32 + payload).

The extension must work without the user installing Spork — we bundle a self-contained `reja-server.janet` script that implements the server-side netrepl protocol using only Janet's standard library.

### Constraints

- Must work on Linux, macOS, Windows
- Users only need `janet` installed (no `jpm`, no Spork)
- Extension must be publishable to VS Code Marketplace
- No runtime npm dependencies beyond built-in Node.js `net` module and `vscode` types
- Must handle connection interruptions gracefully

## Goals / Non-Goals

### Goals

- Establish a TCP connection to a Janet netrepl server (either launched by us or pre-existing)
- Provide a `.reja-repl` REPL Editor document that shows evaluation results
- Send code from `.janet` files to the REPL: current form, current top-level form, selection, entire file
- Display results inline as editor decorations and in the REPL Editor transcript
- Bundle `reja-server.janet` such that jack-in requires only `janet` on the PATH
- Support per-project settings via VS Code's `contributes.configuration`

### Non-Goals

- Not a full language server (no LSP, no completion, no hover docs — Janet has no LSP yet)
- No structural editing (paredit) — that's a separate effort
- No debugger integration
- No multi-session or ClojureScript-style dual REPL — single connection, single session
- No notebook support

## Decisions

### D1: Bundle netrepl server as a single Janet file

Bundle `reja-server.janet` in the extension's `server/` directory. This file inlines the server-relevant parts of netrepl.janet, msg.janet, and ev-utils.janet, omitting the client/getline code which is not server-side.

Rationale:
- Users don't need Spork installed — only `janet`
- ~140 lines of Janet, fully auditable, trivially diffable against upstream
- No module path resolution issues at runtime
- Avoids platform-specific rawterm dependencies (getline uses rawterm which is complex)

### D2: REPL Editor is a regular `.reja-repl` text file

The REPL Editor is a `.reja-repl` file saved at `.reja/repl.reja-repl` in the project root. It is a plain text document managed via `WorkspaceEdit` operations. No prompts are displayed — results are appended as `# => <value>` lines. The user types code on the last line and presses Enter to evaluate.

Rationale:
- No custom editor/webview needed — lowest complexity, highest compatibility
- Works with all VS Code themes, keybindings, and extensions (diff, git, etc.)
- Proven approach — Calva has used this for years
- File-based means results survive editor restarts

### D3: Local paren-matching for expression boundary detection

Form detection uses a pure JavaScript paren-matching algorithm in `src/editor/forms.ts`. The algorithm walks backward from the cursor to find the opening bracket, then forward to find the matching close. It handles brackets `()`, `[]`, `{}`, strings with escapes, and Janet `#` comments.

Rationale:
- Works with ANY netrepl server — no server-side function injection needed
- Zero latency (no round-trip)
- Same correctness as Janet's parser for the common case of bracket matching
- Simplifies the protocol — the extension never modifies the server's environment

### D4: No runtime npm dependencies

Use only Node.js built-in modules (`net` for TCP, `path`, `fs`). VS Code API provides everything else.

Rationale:
- Zero supply chain risk
- Smaller extension package
- No version compatibility issues
- The `net` module is all we need for a TCP client

### D5: Jack-in launches Janet in a VS Code Terminal

When the user runs "Reja: Jack In", Reja:
1. Opens a VS Code Terminal
2. Runs `janet <extension-path>/server/reja-server.janet <port>`
3. Waits 2 seconds, then connects to the detected host:port

Rationale:
- VS Code Terminal is visible to the user (they can see Janet running)
- User can interact with the terminal directly if needed
- Standard pattern (Calva, PlatformIO, etc. all do this)

### D6: Output destinations: REPL Editor is primary, OutputChannel for logs

Evaluation results go to the REPL Editor document. An OutputChannel ("Reja Log") receives diagnostic messages (connection events, errors, etc.).

Rationale:
- Simple, single destination for results — no confusing routing
- OutputChannel provides a persistent scrollable log separate from the interactive REPL

### D7: Single-message handshake

The client sends exactly one message during the handshake: the client name (`"reja"`). No settings table is sent separately. This is compatible with all Spork netrepl server implementations: vanilla Spork, rojcad, and the bundled server.

Rationale:
- Vanilla Spork's `get-name` reads one message
- Sending a second settings message would be treated as raw REPL input by non-bundled servers
- The `\xFF`-prefixed table format allows bundling name + options in one message if needed

### D8: No idle timeout

The TCP socket has no idle timeout. The connection stays open indefinitely while waiting for user input.

Rationale:
- A 10-second timeout killed idle connections while the user was reading output or thinking
- The server's read loop handles disconnection gracefully (the `net/chunk` returning nil breaks the loop)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `reja-server.janet` diverges from upstream netrepl | Document the origin and diff strategy in a comment header; check upstream changes periodically |
| Janet not installed / wrong path | Detect `janet` availability at jack-in time; provide clear error message; expose `reja.janetPath` config |
| Connection drops mid-evaluation | Show status bar indicator; allow manual reconnect; detect socket close events |
| Large output overwhelms the REPL Editor | Truncate very long results in inline decorations (full result available in REPL log); limit decoration length to 500 chars |
| `.reja-repl` file grows unbounded | Offer "Clear REPL Editor" command; document that file can be manually truncated |
| Multiple workspace folders | Connect to the first workspace's project root; offer workspace picker if ambiguous |
| Server wraps results in `(true/false ...)` tuples | Extension unwraps both `(true ...)` and `(false ...)` formats transparently |

## Open Questions

- What's the initial port selection strategy for jack-in? Currently uses fixed default (9365). Could pick a random available port and communicate it back.
- Should `eval-on-save` evaluate the file or just the top-level forms that changed?
