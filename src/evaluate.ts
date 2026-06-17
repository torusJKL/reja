import * as vscode from 'vscode';
import { ReplSession } from './repl/session';
import { ConnectionState } from './repl/connection';
import { findEnclosingForm, findTopLevelForm } from './editor/forms';

export interface EvalOptions {
  session: ReplSession;
  onResult?: (result: string) => void;
  onError?: (error: string) => void;
  onStream?: (text: string) => void;
}

export async function evaluateCode(
  code: string,
  options: EvalOptions
): Promise<void> {
  const { session, onResult, onError } = options;

  if (session.connection.state === ConnectionState.Disconnected) {
    const action = await vscode.window.showErrorMessage(
      'Not connected to a REPL',
      'Connect'
    );
    if (action === 'Connect') {
      vscode.commands.executeCommand('reja.connect');
    }
    return;
  }

  try {
    const result = await session.connection.replEval(code);

    // Some servers wrap results in (true/false ...) tuples.
    // Unwrap to get the actual value.
    const unwrapped = unwrapResult(result);

    if (unwrapped.startsWith('error:')) {
      if (onError) {
        onError(unwrapped);
      }
    } else {
      if (onResult) {
        onResult(unwrapped);
      }
    }
  } catch (err) {
    const error = err as Error;
    if (onError) {
      onError(error.message);
    }
  }
}

export async function evaluateTopLevelForm(
  editor: vscode.TextEditor,
  options: EvalOptions
): Promise<void> {
  const doc = editor.document;
  const position = editor.selection.active;

  const range = findTopLevelForm(doc, position);

  if (!range) {
    vscode.window.showInformationMessage('Could not find enclosing form');
    return;
  }

  const code = doc.getText(range);
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range);

  await evaluateCode(code, options);
}

export async function evaluateCurrentForm(
  editor: vscode.TextEditor,
  options: EvalOptions
): Promise<void> {
  const doc = editor.document;
  const position = editor.selection.active;

  const range = findEnclosingForm(doc, position);

  if (!range) {
    vscode.window.showInformationMessage('Could not find enclosing form');
    return;
  }

  const code = doc.getText(range);
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range);

  await evaluateCode(code, options);
}

export async function evaluateSelection(
  editor: vscode.TextEditor,
  options: EvalOptions
): Promise<void> {
  const code = editor.document.getText(editor.selection);

  if (!code.trim()) {
    vscode.window.showInformationMessage('No selection to evaluate');
    return;
  }

  await evaluateCode(code, options);
}

export async function evaluateFile(
  editor: vscode.TextEditor,
  options: EvalOptions
): Promise<void> {
  const code = editor.document.getText();
  await evaluateCode(code, options);
}

export async function interrupt(session: ReplSession): Promise<void> {
  try {
    await session.connection.sendCommand('cancel');
  } catch (err) {
    const error = err as Error;
    vscode.window.showErrorMessage(`Interrupt failed: ${error.message}`);
  }
}

function unwrapResult(result: string): string {
  const trimmed = result.trim();
  // Some netrepl servers (e.g., rojcad) wrap results in (true <value>) or (false <error>)
  const trueMatch = trimmed.match(/^\(true\s+(.*)\)$/s);
  if (trueMatch) {
    return trueMatch[1];
  }
  const falseMatch = trimmed.match(/^\(false\s+(.*)\)$/s);
  if (falseMatch) {
    return `error: ${falseMatch[1]}`;
  }
  return result;
}
