## ADDED Requirements

### Requirement: TCP connection to netrepl server

The extension SHALL establish a TCP socket connection to a Janet Spork netrepl server. The connection SHALL implement the netrepl protocol as defined by msg.janet (4-byte little-endian length prefix + payload). The extension SHALL complete the connection handshake (send client name, consume server greeting and prompt) before reporting connected state.

The handshake SHALL consist of a single message (the client name, `"reja"`). No separate settings message is sent — this is compatible with all Spork netrepl implementations. The first data received from the server (greeting, prompt) SHALL be consumed silently during the handshake phase. After the handshake, messages matching the prompt pattern (`name:number:...`) SHALL be silently skipped to keep eval responses aligned.

#### Scenario: Connect to a running server with default host/port

- **WHEN** user runs "Reja: Connect" and the server is listening at `127.0.0.1:9365`
- **THEN** extension establishes TCP connection, sends client name "reja", consumes handshake messages, and reports "connected" state

#### Scenario: Connect fails when no server is listening

- **WHEN** user runs "Reja: Connect" and no server is listening at `127.0.0.1:9365`
- **THEN** extension shows an error message "Could not connect to REPL at 127.0.0.1:9365" and remains in disconnected state

#### Scenario: Connect to custom host:port

- **WHEN** user runs "Reja: Connect to Host" and enters `localhost:9999`
- **THEN** extension connects to `localhost:9999` instead of the default

### Requirement: Jack-in launches a Janet REPL server

The extension SHALL be able to launch a Janet process running `reja-server.janet` (the bundled server script) in a VS Code Terminal. The server SHALL listen on a configurable port. The extension SHALL wait for the server to start and then connect.

#### Scenario: Successful jack-in with janet on PATH

- **WHEN** user runs "Reja: Jack In" and `janet` is on the system PATH and the port is available
- **THEN** extension opens a VS Code Terminal running `janet <server-script-path> <port>`, waits 2 seconds, connects automatically, and reports "jacked in" state

#### Scenario: Jack-in fails when janet is not found

- **WHEN** user runs "Reja: Jack In" and `janet` is not on the system PATH
- **THEN** extension shows error "Could not find 'janet' executable. Ensure Janet is installed and on your PATH."

### Requirement: Connection state management

The extension SHALL maintain a visible connection state. The state SHALL be one of: `disconnected`, `connecting`, `connected`, `jacked-in`. State changes SHALL be reflected in the VS Code status bar and in `when` clause contexts for conditional keybindings.

#### Scenario: Status bar shows connected state

- **WHEN** extension connects to a REPL server
- **THEN** status bar shows a connected indicator (e.g., "Reja: connected")
- **AND** status bar is clickable to show connection menu

#### Scenario: Context key enables REPL commands

- **WHEN** extension is in `connected` or `jacked-in` state
- **THEN** the `reja:connected` context key is set to `true`
- **AND** eval commands are available in the command palette

### Requirement: Graceful disconnection

The extension SHALL close the TCP socket gracefully when disconnecting. If the server disconnects unexpectedly, the extension SHALL detect this and transition to `disconnected` state, showing a notification.

#### Scenario: Manual disconnect

- **WHEN** user runs "Reja: Disconnect" and extension is connected
- **THEN** extension closes the TCP socket, transitions to `disconnected`, and updates status bar

#### Scenario: Server disconnects unexpectedly

- **WHEN** the server process is killed while extension is connected
- **THEN** extension detects the socket close event, transitions to `disconnected`, and shows a warning notification "REPL server disconnected"

### Requirement: No idle timeout

The TCP socket SHALL NOT have an idle timeout. The connection SHALL remain open indefinitely while waiting for user input.

#### Scenario: Connection stays alive during idle periods

- **WHEN** user connects to a REPL and does not send any evaluations for several minutes
- **THEN** the connection SHALL remain open and the status bar SHALL continue to show "connected"
- **AND** evaluating a form after idle time SHALL still produce correct results

### Requirement: Protocol byte encoding

The `\xFF` (0xFF) and `\xFE` (0xFE) protocol bytes SHALL be sent as single raw bytes, not UTF-8 encoded. The rest of the message payload SHALL be UTF-8 encoded.

#### Scenario: \xFF prefix is sent as raw byte

- **WHEN** extension sends an eval request for code `(+ 1 2)`
- **THEN** the first byte of the message payload SHALL be `0xFF` followed by the UTF-8 encoding of `(+ 1 2)`

### Requirement: Result unwrapping

Some netrepl servers (vanilla Spork, rojcad) wrap eval results in `(true <value>)` or `(false <error>)` tuples via Janet's `protect` macro. The extension SHALL unwrap these transparently.

#### Scenario: Unwrap successful result

- **WHEN** server returns `(true 6)` for an eval
- **THEN** extension treats the result as `6`

#### Scenario: Unwrap error result

- **WHEN** server returns `(false "division by zero")` for an eval
- **THEN** extension treats the result as an error with message `division by zero`
