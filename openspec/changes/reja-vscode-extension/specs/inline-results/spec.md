## ADDED Requirements

### Requirement: Inline result decoration

The extension SHALL display the result of an evaluation as an inline decoration immediately after the evaluated code. The decoration SHALL appear as ` => <result-text>` in a subdued color. The result text SHALL be truncated to a configurable maximum length (default 500 characters). Full results SHALL always be available in the REPL Editor transcript.

#### Scenario: Successful evaluation shows inline result

- **WHEN** user evaluates `(+ 1 2 3)` and the server returns `6`
- **THEN** the extension shows ` => 6 ` as an inline decoration at the end of the evaluated line

#### Scenario: Long result is truncated

- **WHEN** user evaluates `(range 1000)` and the result is 3000+ characters
- **THEN** the inline decoration shows ` => (0 1 2 3 ...` (truncated to 500 chars)
- **AND** the full result is available in the REPL Editor

### Requirement: Selection highlighting

The extension SHALL highlight the evaluated code range with a background color. The highlight SHALL remain visible until the user edits the document or runs another evaluation. Successful evaluations SHALL use a green-tinted highlight; errors SHALL use a red-tinted highlight.

#### Scenario: Successful evaluation highlight

- **WHEN** user evaluates `(+ 1 2 3)` successfully
- **THEN** the code `(+ 1 2 3)` is highlighted with a green-tinted background

#### Scenario: Error evaluation highlight

- **WHEN** user evaluates `(/ 1 0)` and the server returns a division-by-zero error
- **THEN** the code `(/ 1 0)` is highlighted with a red-tinted background

#### Scenario: Edit clears decorations

- **WHEN** user starts typing in a document that has inline results
- **THEN** all decorations in that document are cleared

### Requirement: Inline error display

When an evaluation produces an error, the extension SHALL display the error message inline (similar to successful results) using the error decoration color. The error text SHALL be shown instead of the result value.

#### Scenario: Error shown inline

- **WHEN** user evaluates `(/ 1 0)` which raises an error
- **THEN** the error message (e.g., ` => error: division by zero`) is shown as an inline decoration in red
- **AND** the error is also appended to the REPL Editor

### Requirement: Clear all inline results

The extension SHALL provide a command to clear all inline decorations across all visible editors.

#### Scenario: Clear all decorations

- **WHEN** user runs "Reja: Clear Inline Results"
- **THEN** all inline result decorations and selection highlights are removed from all visible editors
