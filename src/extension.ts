import * as vscode from 'vscode';
import { ConnectionManager } from './repl/connectionManager';
import { ReplDoc } from './editor/replDoc';
import { InlineDecorations } from './editor/decorations';
import {
  evaluateTopLevelForm,
  evaluateCurrentForm,
  evaluateSelection,
  evaluateFile,
  evaluateCode,
  interrupt,
  EvalOptions,
} from './evaluate';

let connectionManager: ConnectionManager | null = null;
let replDoc: ReplDoc | null = null;
let decorations: InlineDecorations | null = null;

function withSession(fn: (session: import('./repl/session').ReplSession) => void) {
  const session = connectionManager?.getSession();
  if (session) {
    fn(session);
  } else {
    vscode.window.showErrorMessage('Not connected to a REPL');
  }
}

export function activate(context: vscode.ExtensionContext) {
  connectionManager = new ConnectionManager(context);
  replDoc = new ReplDoc();
  decorations = new InlineDecorations();

  context.subscriptions.push(replDoc);
  context.subscriptions.push(decorations);

  replDoc.setPromptInputHandler(async (code: string) => {
    const session = connectionManager?.getSession();
    if (!session) {
      return;
    }
    await evaluateCode(code, {
      session,
      onResult: async (result) => {
        await replDoc?.append(`=> ${result}`);
      },
      onError: async (error) => {
        await replDoc?.appendError(error);
      },
    });
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.jackIn', async () => {
      await connectionManager?.jackIn();
      replDoc?.setSession(connectionManager?.getSession() ?? null);
      await replDoc?.reveal();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.connect', async () => {
      await connectionManager?.connect();
      replDoc?.setSession(connectionManager?.getSession() ?? null);
      await replDoc?.reveal();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.connectToHost', async () => {
      await connectionManager?.connectToHost();
      replDoc?.setSession(connectionManager?.getSession() ?? null);
      await replDoc?.reveal();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.disconnect', () => {
      replDoc?.setSession(null);
      connectionManager?.disconnect();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.evaluateTopLevelForm', async () => {
      withSession(async (session) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const options: EvalOptions = {
          session,
          onResult: async (result) => {
            decorations?.showInlineResult(editor, editor.selection, result, false);
            await replDoc?.append(`=> ${result}`);
          },
          onError: async (error) => {
            decorations?.showInlineResult(editor, editor.selection, error, true);
            await replDoc?.appendError(error);
          },
        };
        await evaluateTopLevelForm(editor, options);
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.evaluateCurrentForm', async () => {
      withSession(async (session) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const options: EvalOptions = {
          session,
          onResult: async (result) => {
            decorations?.showInlineResult(editor, editor.selection, result, false);
            await replDoc?.append(`=> ${result}`);
          },
          onError: async (error) => {
            decorations?.showInlineResult(editor, editor.selection, error, true);
            await replDoc?.appendError(error);
          },
        };
        await evaluateCurrentForm(editor, options);
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.evaluateSelection', async () => {
      withSession(async (session) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const options: EvalOptions = {
          session,
          onResult: async (result) => {
            decorations?.showInlineResult(editor, editor.selection, result, false);
            await replDoc?.append(`=> ${result}`);
          },
          onError: async (error) => {
            decorations?.showInlineResult(editor, editor.selection, error, true);
            await replDoc?.appendError(error);
          },
        };
        await evaluateSelection(editor, options);
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.evaluateFile', async () => {
      withSession(async (session) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const options: EvalOptions = {
          session,
          onResult: async (result) => {
            await replDoc?.append(`=> ${result}`);
          },
          onError: async (error) => {
            await replDoc?.appendError(error);
          },
        };
        await evaluateFile(editor, options);
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.evaluateReplInput', async () => {
      await replDoc?.evaluateInput();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.interrupt', async () => {
      withSession(async (session) => {
        await interrupt(session);
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.clearInlineResults', () => {
      decorations?.clearAll();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.clearReplEditor', () => {
      replDoc?.clear();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('reja.showConnectionMenu', () => {
      if (!connectionManager) {
        return;
      }
      const items: vscode.QuickPickItem[] = [];
      if (connectionManager.isConnected()) {
        items.push({ label: 'Disconnect', description: 'Close REPL connection' });
      } else {
        items.push({ label: 'Jack In', description: 'Launch and connect to REPL' });
        items.push({ label: 'Connect', description: 'Connect to running REPL' });
        items.push({ label: 'Connect to Host...', description: 'Connect to custom host:port' });
      }
      vscode.window.showQuickPick(items).then((item) => {
        if (!item) {
          return;
        }
        switch (item.label) {
          case 'Jack In':
            connectionManager?.jackIn();
            break;
          case 'Connect':
            connectionManager?.connect();
            break;
          case 'Connect to Host...':
            connectionManager?.connectToHost();
            break;
          case 'Disconnect':
            connectionManager?.disconnect();
            break;
        }
      });
    }),
  );
}

export function deactivate() {
  connectionManager?.disconnect();
}
