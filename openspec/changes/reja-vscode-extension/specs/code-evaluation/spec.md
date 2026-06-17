## ADDED Requirements

### Requirement: Evaluate current top-level form

The extension SHALL detect the top-level form at the cursor position and send it to the REPL. Top-level form detection SHALL use a local JavaScript paren-matching algorithm (no server call). If the cursor is inside a nested form, the outermost enclosing form that starts at column 0 (or is a complete top-level expression) SHALL be selected. The algorithm first finds the enclosing form, then expands backward to the beginning of the line.

#### Scenario: Evaluate form at cursor

- **WHEN** cursor is inside `(defn greet [name] (string "Hello, " name))` on a `.janet` file
- **AND** user presses `Alt+Enter`
- **THEN** the full `defn` form is sent to the REPL
- **AND** the result is displayed inline and in the REPL Editor

#### Scenario: No connected REPL

- **WHEN** user presses `Alt+Enter` while extension is in `disconnected` state
- **THEN** extension shows "Not connected to a REPL" with a "Connect" action button

### Requirement: Evaluate current form (enclosing)

The extension SHALL detect the immediately enclosing form at the cursor position (innermost balanced expression) and send it to the REPL. This is for evaluating sub-expressions. The local algorithm walks backward from the cursor to find the nearest unmatched opening bracket, then forward to find its matching close.

#### Scenario: Evaluate enclosing form

- **WHEN** cursor is at `(+ 1 (* 2| 3) 4)` (where `|` is cursor)
- **AND** user presses `Ctrl+Enter`
- **THEN** the form `(* 2 3)` is sent to the REPL and evaluated

#### Scenario: Cursor on or after closing bracket

- **WHEN** cursor is at `(+ 1 3|)` (right after the closing paren)
- **AND** user presses `Alt+Enter` or `Ctrl+Enter`
- **THEN** the form `(+ 1 3)` is found and evaluated (cursor-past-end handling)

### Requirement: Evaluate selection

The extension SHALL send the exact text of the current selection to the REPL.

#### Scenario: Evaluate selected text

- **WHEN** user selects `(map inc [1 2 3])` in a `.janet` file
- **AND** runs "Reja: Evaluate Selection"
- **THEN** the selected text is sent to the REPL and evaluated

### Requirement: Evaluate file contents

The extension SHALL send the entire contents of the current file to the REPL for evaluation. This SHALL use the `\xFF` eval mechanism, sending the full file content as a single chunk.

#### Scenario: Evaluate whole file

- **WHEN** user runs "Reja: Evaluate File"
- **THEN** the full contents of the current `.janet` file are sent to the REPL
- **AND** the result is displayed

### Requirement: Expression boundary detection via local paren matching

The extension SHALL implement form detection using a pure JavaScript algorithm in `src/editor/forms.ts`. The algorithm SHALL:
- Support `()`, `[]`, `{}` bracket matching
- Handle string literals with escape sequences
- Skip `#` line comments
- Skip backward past whitespace to find a non-whitespace character
- Handle cursor positions past the end of a form (walk backward from the end)
- Return `byte-offsets` of the start and end of the enclosing expression

#### Scenario: Find enclosing form at offset

- **WHEN** the local form finder is called with source `"(+ 1 2)"` and offset 4 (pointing at `1`)
- **THEN** returns `{ start: 0, end: 7 }` (the full form `(+ 1 2)`)

#### Scenario: Find top-level form at offset

- **WHEN** the local form finder is called with source `"(defn a [] 1)\n(defn b [] 2)"` and offset 20 (within `b`)
- **THEN** returns the bounds of `(defn b [] 2)` (start expanded to beginning of line)

### Requirement: Interrupt running evaluation

The extension SHALL support sending a `\xFE:cancel` command to the REPL to interrupt a long-running evaluation.

#### Scenario: Interrupt hanging evaluation

- **WHEN** user evaluates an expression that does not complete (e.g., infinite loop)
- **AND** user runs "Reja: Interrupt"
- **THEN** extension sends `\xFE:cancel` to the server
- **AND** the server stops the current evaluation
