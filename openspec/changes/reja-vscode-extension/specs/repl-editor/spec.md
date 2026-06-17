## ADDED Requirements

### Requirement: REPL Editor document

The extension SHALL create and manage a REPL Editor document at `.reja/repl.reja-repl` in the project root. The document SHALL be a plain text file with a special file extension (`.reja-repl`) that VS Code opens as a text file. The `.reja-repl` extension SHALL be registered with the `janet` language ID so that keybindings work.

#### Scenario: REPL Editor is created on first jack-in/connect

- **WHEN** user initiates jack-in or connect for the first time in a project
- **THEN** extension creates `.reja/repl.reja-repl` in the project root
- **AND** writes initial `##` comment header explaining usage
- **AND** opens the document in a split editor pane

#### Scenario: REPL Editor already exists on subsequent connect

- **WHEN** user connects to a REPL in a project that already has `.reja/repl.reja-repl`
- **THEN** extension opens the existing document instead of recreating it

### Requirement: Result output format

Evaluation results SHALL be appended to the REPL Editor as `  # => <result>\n`. Error results SHALL be appended as `  # error: <message>\n`. The `#` character SHALL be used for comments (Janet convention). Two spaces SHALL precede the `#` to visually separate results from code.

#### Scenario: Evaluation result is appended to REPL Editor

- **WHEN** user evaluates `(+ 1 2 3)` in a `.janet` file
- **THEN** extension appends to REPL Editor: `  # => 6\n`

#### Scenario: Error result is appended to REPL Editor

- **WHEN** user evaluates `(/ 1 0)` and the server returns an error
- **THEN** extension appends to REPL Editor: `  # error: division by zero\n`

#### Scenario: Multiple evaluations accumulate

- **WHEN** user evaluates three expressions sequentially
- **THEN** the REPL Editor shows all three results, each on their own line

### Requirement: Submit-on-enter in the REPL Editor

When the cursor is on the last line of the REPL Editor, pressing Enter SHALL submit the trimmed text of that line for evaluation.

#### Scenario: Submit at end of document

- **WHEN** user types `(+ 1 2)` on the last line of the REPL Editor
- **AND** presses Enter while cursor is on that line
- **THEN** the text `(+ 1 2)` is sent to the REPL for evaluation
- **AND** the result is appended on the next line

#### Scenario: Enter does not submit mid-document

- **WHEN** user presses Enter with the cursor NOT on the last line
- **THEN** a newline is inserted (normal editing behavior)
- **AND** no evaluation is triggered

### Requirement: REPL history tracking

The REPL Editor SHALL track a history of submitted expressions. Each newly submitted expression SHALL be added to the history.

#### Scenario: History accumulates

- **WHEN** user evaluates several expressions via the REPL Editor
- **THEN** each expression is stored in the session history for potential recall

### Requirement: Clear REPL Editor

The extension SHALL provide a command to clear the REPL Editor content.

#### Scenario: Clear all REPL output

- **WHEN** user runs "Reja: Clear REPL Editor"
- **THEN** the REPL Editor document content is replaced with a fresh greeting header
