import * as vscode from 'vscode';
import { ReplSession } from '../repl/session';

const REPL_FILE_NAME = '.reja/repl.reja-repl';

export class ReplDoc {
  private document: vscode.TextDocument | null = null;
  private disposables: vscode.Disposable[] = [];
  private session: ReplSession | null = null;
  private historyIndex: number = -1;

  setSession(session: ReplSession | null): void {
    this.session = session;
  }

  setPromptInputHandler(handler: (code: string) => Promise<void>): void {
    this.promptInputHandler = handler;
  }

  private promptInputHandler: ((code: string) => Promise<void>) | null = null;

  async ensureDocument(): Promise<vscode.TextDocument> {
    if (this.document) {
      return this.document;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      throw new Error('No workspace folder open');
    }

    const fileUri = vscode.Uri.joinPath(workspaceRoot, REPL_FILE_NAME);

    try {
      this.document = await vscode.workspace.openTextDocument(fileUri);
    } catch {
      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.createFile(fileUri, { ignoreIfExists: true });
      await vscode.workspace.applyEdit(workspaceEdit);

      const doc = await vscode.workspace.openTextDocument(fileUri);
      const edit2 = new vscode.WorkspaceEdit();
      edit2.insert(fileUri, new vscode.Position(0, 0), GREETING);
      await vscode.workspace.applyEdit(edit2);

      this.document = doc;
    }

    return this.document;
  }

  async reveal(): Promise<void> {
    const doc = await this.ensureDocument();
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
    });
    const lastLine = doc.lineCount - 1;
    const pos = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos));
  }

  async append(text: string): Promise<void> {
    const doc = await this.ensureDocument();
    const edit = new vscode.WorkspaceEdit();
    const lastLine = doc.lineCount - 1;
    const endPos = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
    edit.insert(doc.uri, endPos, `\n# ${text}`);
    await vscode.workspace.applyEdit(edit);

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === doc.uri.toString()
    );
    if (editor) {
      const newLastLine = doc.lineCount - 1;
      const cursorPos = new vscode.Position(newLastLine, doc.lineAt(newLastLine).text.length);
      editor.selection = new vscode.Selection(cursorPos, cursorPos);
      editor.revealRange(new vscode.Range(cursorPos, cursorPos));
    }
  }

  async appendError(text: string): Promise<void> {
    const doc = await this.ensureDocument();
    const edit = new vscode.WorkspaceEdit();
    const lastLine = doc.lineCount - 1;
    const endPos = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
    edit.insert(doc.uri, endPos, `\n# error: ${text}`);
    await vscode.workspace.applyEdit(edit);

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === doc.uri.toString()
    );
    if (editor) {
      const newLastLine = doc.lineCount - 1;
      const cursorPos = new vscode.Position(newLastLine, doc.lineAt(newLastLine).text.length);
      editor.selection = new vscode.Selection(cursorPos, cursorPos);
      editor.revealRange(new vscode.Range(cursorPos, cursorPos));
    }
  }

  async evaluateInput(): Promise<void> {
    const doc = this.document;
    if (!doc) {
      return;
    }

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === doc.uri.toString()
    );
    if (!editor) {
      return;
    }

    const cursorPos = editor.selection.active;
    const lastLine = doc.lineCount - 1;
    const cursorAtEnd = cursorPos.line === lastLine &&
      cursorPos.character === doc.lineAt(lastLine).text.length;

    // When Enter is pressed, VS Code inserts a newline before our command runs.
    // The user's code is now on the line above the cursor. Look for it there.
    const sourceLine = cursorPos.line > 0 && cursorPos.line === lastLine && doc.lineAt(lastLine).text === ''
      ? cursorPos.line - 1
      : cursorPos.line;

    const code = doc.lineAt(sourceLine).text.trim();
    if (!code) {
      await vscode.commands.executeCommand('type', { source: 'keyboard', text: '\n' });
      return;
    }

    // Remove the trailing blank line that VS Code inserted
    if (lastLine > sourceLine && doc.lineAt(lastLine).text === '') {
      const lineLen = doc.lineAt(sourceLine).text.length;
      const edit = new vscode.WorkspaceEdit();
      edit.delete(doc.uri, new vscode.Range(sourceLine, lineLen, lastLine, 0));
      await vscode.workspace.applyEdit(edit);
    }

    if (this.session && this.promptInputHandler) {
      this.session.addToHistory(code);
      this.historyIndex = this.session.history.length;
      await this.promptInputHandler(code);
    }
  }

  async clear(): Promise<void> {
    const doc = await this.ensureDocument();
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length)
    );
    edit.replace(doc.uri, fullRange, GREETING);
    await vscode.workspace.applyEdit(edit);
  }

  isActive(doc: vscode.TextDocument): boolean {
    return doc.uri.path.endsWith('repl.reja-repl');
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

const GREETING = `## Reja REPL - Interactive Janet
## Type expressions and press Enter to evaluate.
## Use Ctrl+Enter in .janet files to evaluate enclosing form.
## Use Alt+Enter in .janet files to evaluate top-level form.

`;
