import * as vscode from 'vscode';

const MAX_INLINE_LENGTH = 500;

export class InlineDecorations {
  private successDecoration: vscode.TextEditorDecorationType;
  private errorDecoration: vscode.TextEditorDecorationType;
  private selectionHighlightSuccess: vscode.TextEditorDecorationType;
  private selectionHighlightError: vscode.TextEditorDecorationType;
  private resultDecorations: Map<string, vscode.DecorationOptions[]> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.successDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        color: { id: 'editorCodeLens.foreground' },
      },
    });

    this.errorDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        color: 'rgba(255, 80, 80, 0.8)',
      },
    });

    this.selectionHighlightSuccess = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(0, 200, 80, 0.15)',
      border: '1px solid rgba(0, 200, 80, 0.3)',
    });

    this.selectionHighlightError = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 80, 80, 0.15)',
      border: '1px solid rgba(255, 80, 80, 0.3)',
    });

    this.disposables.push(
      this.successDecoration,
      this.errorDecoration,
      this.selectionHighlightSuccess,
      this.selectionHighlightError
    );

    vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (event.contentChanges.length > 0) {
          this.clearDecorationsForEditor(event.document.uri.toString());
        }
      },
      null,
      this.disposables
    );
  }

  showInlineResult(
    editor: vscode.TextEditor,
    range: vscode.Range,
    result: string,
    isError: boolean
  ): void {
    const uri = editor.document.uri.toString();
    if (!this.resultDecorations.has(uri)) {
      this.resultDecorations.set(uri, []);
    }

    const truncated =
      result.length > MAX_INLINE_LENGTH
        ? result.substring(0, MAX_INLINE_LENGTH) + '...'
        : result;

    const decoration = {
      range: range,
      renderOptions: {
        after: {
          contentText: ` => ${truncated} `,
        },
      },
    };

    const decorations = this.resultDecorations.get(uri)!;
    decorations.push(decoration);

    const decoType = isError ? this.errorDecoration : this.successDecoration;
    editor.setDecorations(decoType, decorations);

    const highlightDeco = isError
      ? this.selectionHighlightError
      : this.selectionHighlightSuccess;
    editor.setDecorations(highlightDeco, [range]);
  }

  clearDecorationsForEditor(uri: string): void {
    this.resultDecorations.set(uri, []);
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === uri) {
        editor.setDecorations(this.successDecoration, []);
        editor.setDecorations(this.errorDecoration, []);
        editor.setDecorations(this.selectionHighlightSuccess, []);
        editor.setDecorations(this.selectionHighlightError, []);
      }
    }
  }

  clearAll(): void {
    this.resultDecorations.clear();
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.successDecoration, []);
      editor.setDecorations(this.errorDecoration, []);
      editor.setDecorations(this.selectionHighlightSuccess, []);
      editor.setDecorations(this.selectionHighlightError, []);
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
