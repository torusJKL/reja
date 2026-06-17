## 1. Project Scaffolding

- [x] 1.1 Initialize the project with `npm init` and install dev dependencies (`typescript`, `@types/vscode`, `@vscode/test-electron`, `@types/node`)
- [x] 1.2 Create `tsconfig.json` with VS Code extension settings (target ES2022, module CommonJS, outDir out/)
- [x] 1.3 Create `package.json` with Reja metadata (name, displayName, publisher, contributes, activationEvents)
- [x] 1.4 Create `.vscodeignore` to exclude source files from the packaged extension
- [x] 1.5 Create `src/extension.ts` with activate/deactivate stubs that register command stubs
- [x] 1.6 Configure `contributes.configuration` in package.json for Reja settings (`reja.port`, `reja.host`, `reja.janetPath`, `reja.autoConnect`, etc.)
- [x] 1.7 Register Janet language support in `contributes.languages` (`.janet` extension, basic grammar config, `.reja-repl` extension)
- [x] 1.8 Create `.vscode/launch.json` and `.vscode/tasks.json` for F5 debugging

## 2. Bundled Janet Server Script

- [x] 2.1 Create `server/reja-server.janet` with message framing (encode-length, decode-length, read-msg, send-msg)
- [x] 2.2 Implement eval-code function using fiber + eval-string with captured env
- [x] 2.3 Implement handle-client: single-message handshake, \xFF eval, \xFE commands, raw input
- [x] 2.4 Omit all client/getline/rawterm code — no Spork dependency
- [x] 2.5 Expose a clean entry point: read port from command-line args, call (run-server-single)
- [x] 2.6 Document the script's origin and divergence from upstream in a header comment
- [x] 2.7 Verify the script works standalone: `janet server/reja-server.janet 9365`

## 3. TCP Connection Layer

- [x] 3.1 Create `src/repl/connection.ts` with a `NetreplConnection` class that wraps `net.Socket`
- [x] 3.2 Implement the low-level message framing: 4-byte little-endian length prefix + payload
- [x] 3.3 Implement `send(msg: string)` with queue-based pending request/message matching
- [x] 3.4 Implement `sendNoResponse(msg: string)` for fire-and-forget handshake messages
- [x] 3.5 Implement `replEval(code: string)` for `\xFF` side-channel eval (send, receive response)
- [x] 3.6 Implement `replInput(code: string)` for raw REPL input (no prefix)
- [x] 3.7 Implement `sendCommand(cmd: string)` for `\xFE` commands (cancel, etc.)
- [x] 3.8 Handle socket errors, close events gracefully; no idle timeout
- [x] 3.9 Implement handshake phase: waitForHandshake() silently consumes greeting + prompt messages
- [x] 3.10 Implement \xFF/\xFE raw byte encoding (not UTF-8) for protocol bytes
- [x] 3.11 Implement general prompt detection regex for all netrepl prompt formats
- [x] 3.12 Create `src/repl/session.ts` to track REPL state and history

## 4. Connection UI (Jack-in & Connect)

- [x] 4.1 Create "Reja: Jack In" command that opens a VS Code Terminal running `janet <script> <port>`
- [x] 4.2 Wait 2 seconds for server startup, then connect
- [x] 4.3 On successful connection, report "jacked in" state and update status bar
- [x] 4.4 Create "Reja: Connect" command that connects to `reja.host:reja.port`
- [x] 4.5 Create "Reja: Connect to Host" command that prompts for host:port
- [x] 4.6 Create "Reja: Disconnect" command that closes the socket cleanly
- [x] 4.7 Implement status bar indicator showing connection state (disconnected/connecting/connected/jacked-in)
- [x] 4.8 Set VS Code context keys (`reja:connected`, `reja:jackedIn`, etc.) for conditional commands and keybindings
- [x] 4.9 Handle unexpected disconnections with notification

## 5. Expression Boundary Detection

- [x] 5.1 Create `src/editor/forms.ts` with local JavaScript paren-matching algorithm
- [x] 5.2 Implement `findEnclosingFormBounds`: walk backward for opening bracket, forward for matching close
- [x] 5.3 Handle brackets `()`, `[]`, `{}`, string literals with escapes, `#` line comments
- [x] 5.4 Handle cursor positions past the end of a form (walk backward from end)
- [x] 5.5 Handle cursor on whitespace (skip backward to nearest non-whitespace)
- [x] 5.6 Implement `findTopLevelFormBounds`: expand enclosing form to beginning of line, then re-find
- [x] 5.7 Export `findEnclosingForm(doc, position)` and `findTopLevelForm(doc, position)` as sync local functions

## 6. Code Evaluation

- [x] 6.1 Create `src/evaluate.ts` with core `evaluateCode(code, options)` function
- [x] 6.2 Implement `evaluateTopLevelForm` command: find top-level form via forms.ts, send to REPL, route result to inline-decorations + REPL Editor
- [x] 6.3 Implement `evaluateCurrentForm` command: find enclosing form via forms.ts, send, route results
- [x] 6.4 Implement `evaluateSelection` command: send selected text directly
- [x] 6.5 Implement `evaluateFile` command: send entire document contents
- [x] 6.6 Register keyboard shortcuts: Alt+Enter (top-level form), Ctrl+Enter (enclosing form)
- [x] 6.7 Handle disconnected state: show "Not connected" with Connect action button
- [x] 6.8 Implement "Reja: Interrupt" command sending `\xFE:cancel`
- [x] 6.9 Unwrap `(true <value>)` / `(false <error>)` result tuples from `protect`-wrapping servers

## 7. REPL Editor

- [x] 7.1 Create `src/editor/replDoc.ts` to manage the `.reja/repl.reja-repl` document lifecycle
- [x] 7.2 Implement document creation and initialization with `##` greeting header comments
- [x] 7.3 Implement `append(text)` with `  # => <text>\n` and `appendError(text)` with `  # error: <text>\n`
- [x] 7.4 No prompt display — results are appended directly after evaluation
- [x] 7.5 Implement submit-on-enter: cursor on last line submits trimmed text for evaluation
- [x] 7.6 Implement REPL history tracking via session
- [x] 7.7 Implement "Reja: Clear REPL Editor" command
- [x] 7.8 Move cursor to end after appending results (collapsed selection)

## 8. Inline Results

- [x] 8.1 Create `src/editor/decorations.ts` with decoration type definitions
- [x] 8.2 Implement `showInlineResult(codeRange, resultText, isError)` decoration
- [x] 8.3 Implement selection background highlighting (green for success, red for error)
- [x] 8.4 Implement auto-clearing decorations on document edit
- [x] 8.5 Implement "Reja: Clear Inline Results" command
- [x] 8.6 Truncate long results in inline decorations (configurable max length)

## 9. Keybindings & Language Support

- [x] 9.1 Register `.reja-repl` as Janet language extension for keybinding compatibility
- [x] 9.2 Alt+Enter keybinding for `.janet` files: evaluate top-level form
- [x] 9.3 Ctrl+Enter keybinding for `.janet` files: evaluate enclosing form
- [x] 9.4 Enter keybinding for `.reja-repl` files: submit REPL input (when `reja:connected`)
- [x] 9.5 Alt+Enter keybinding for `.reja-repl` files: evaluate as top-level form (when `reja:connected`)

## 10. Project Settings & Polish

- [x] 10.1 Wire up all `contributes.configuration` settings to their usage sites
- [x] 10.2 Create `README.md` with installation, usage, and configuration guide
- [x] 10.3 Create `CHANGELOG.md`
- [x] 10.4 Create `examples/` directory with a basic `.janet` project for testing
- [x] 10.5 Test jack-in on Linux
- [x] 10.6 Write unit tests for connection.ts (mock socket), evaluate.ts, decorations.ts
- [x] 10.7 Verify the extension packages correctly: `tsc` compiles without errors
