# Reja - Interactive Janet REPL for VS Code

Reja provides a Calva-like interactive programming experience for Janet in VS Code. Connect to a Janet netrepl server, evaluate code inline, and use a dedicated REPL Editor window.

## Features

- **Jack In** - Launch a Janet REPL server directly from VS Code
- **Connect** - Attach to an existing Janet REPL server
- **Code Evaluation** - Send top-level forms, enclosing forms, selections, or entire files to the REPL
- **Inline Results** - See evaluation results as editor decorations
- **REPL Editor** - Dedicated `.reja-repl` document for interactive evaluation
- **Form Detection** - Uses paren matching to detect expression boundaries

## Requirements

- [Janet](https://janet-lang.org/) 1.40+ installed and on your PATH
- VS Code 1.96+

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or build and install locally:

   ```bash
   # Clone the repository
   git clone https://github.com/torusJKL/reja.git
   cd reja

   # Install dependencies
   npm install

   # Compile TypeScript
   npm run compile

   # Package the extension
   npx @vscode/vsce package

   # Install the generated .vsix file
   code --install-extension reja-*.vsix
   ```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `reja.host` | `127.0.0.1` | Host of the Janet REPL server |
| `reja.port` | `9365` | Port of the Janet REPL server |
| `reja.janetPath` | `janet` | Path to the janet executable |
| `reja.autoConnect` | `false` | Auto-connect on startup |
| `reja.inlineResultMaxLength` | `500` | Max inline decoration length |

## Usage

### Quick Start

1. Open a `.janet` file in your workspace
2. Run **Reja: Jack In** from the command palette
3. Place cursor on an expression and press `Alt+Enter` to evaluate

### Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| Reja: Jack In | - | Launch and connect to REPL |
| Reja: Connect | - | Connect to running REPL |
| Reja: Disconnect | - | Close connection |
| Evaluate Top-Level Form | `Alt+Enter` | Evaluate outermost form |
| Evaluate Current Form | `Ctrl+Enter` | Evaluate enclosing form |
| Evaluate Selection | - | Evaluate selected text |
| Evaluate File | - | Evaluate entire file |
| Reja: Interrupt | - | Cancel running evaluation |
| Clear Inline Results | - | Remove all decorations |
| Clear REPL Editor | - | Reset REPL document |

## License

GPLv3
