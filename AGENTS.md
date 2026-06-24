# Reja

## Build & install

```bash
npm install
npm run compile          # tsc -p ./tsconfig.json
npx @vscode/vsce package # produces reja-*.vsix
code --install-extension reja-*.vsix
```

Watch mode: `npm run watch`

## Architecture

- `src/extension.ts` — entrypoint, registers 12 commands
- `src/repl/` — TCP connection (`NetreplConnection`), session state (`ReplSession`), VS Code integration (`ConnectionManager`)
- `src/editor/` — paren-balanced form detection (`forms.ts`), inline decorations (`decorations.ts`), REPL scratch document (`replDoc.ts`)
- `src/evaluate.ts` — 4 eval strategies: top-level form, enclosing form, selection, file
- `server/reja-server.janet` — self-contained Janet netrepl server (adapted from Spork), single-connection

## Key details

- Protocol: 4-byte little-endian length prefix + UTF-8 payload
- `0xFE` prefix = commands (cancel), `0xFF` prefix = eval without prompt
- Prompt lines matching `/^[a-zA-Z0-9._-]+:\d+:/` are stripped from responses
- Result unwrapper strips `(true ...)` / `(false ...)` wrapping from some servers
- Inline decorations auto-clear on any document edit
- Connection states: `Disconnected`, `Connecting`, `Connected`, `JackedIn`
- `src/test/` excluded from main `tsconfig.json` (no separate test tsconfig). Tests are VS Code extension host tests. `src/test/index.ts` `run()` is a stub.
- `.vscodeignore` excludes `src/`, `tsconfig.json`, `.ts` files, `.map` files from the packaged vsix
- Jack-in launches `jana` with `server/reja-server.janet <port>` in a VS Code terminal, waits 2s, then connects
