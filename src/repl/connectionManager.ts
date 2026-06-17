import * as vscode from 'vscode';
import * as path from 'path';
import { NetreplConnection, ConnectionState } from './connection';
import { ReplSession } from './session';

export class ConnectionManager {
  private connection: NetreplConnection;
  private session: ReplSession | null = null;
  private statusBarItem: vscode.StatusBarItem;
  private terminal: vscode.Terminal | null = null;
  private outputChannel: vscode.OutputChannel;
  private contextKeys: Map<string, boolean> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.connection = new NetreplConnection();
    this.outputChannel = vscode.window.createOutputChannel('Reja Log');
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.updateStatusBar(ConnectionState.Disconnected);

    this.connection.onStateChange = (state: ConnectionState) => {
      this.updateStatusBar(state);
      this.setContextKey('reja:connected', state === ConnectionState.Connected || state === ConnectionState.JackedIn);
      this.setContextKey('reja:jackedIn', state === ConnectionState.JackedIn);
    };

    this.connection.onError = (error: Error) => {
      this.outputChannel.appendLine(`[Error] ${error.message}`);
    };

    this.connection.onDisconnect = () => {
      vscode.window.showWarningMessage('REPL server disconnected');
      this.outputChannel.appendLine('REPL server disconnected');
    };

    this.connection.onLog = (msg: string) => {
      this.outputChannel.appendLine(msg);
    };

    context.subscriptions.push(this.statusBarItem);
    context.subscriptions.push(this.outputChannel);
  }

  async jackIn(): Promise<void> {
    const config = vscode.workspace.getConfiguration('reja');
    const janetPath = config.get<string>('janetPath', 'janet');
    const port = config.get<number>('port', 9365);

    const extensionPath = this.context.extensionPath;
    const serverScript = path.join(extensionPath, 'server', 'reja-server.janet');

    if (!vscode.workspace.workspaceFolders?.[0]) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    this.outputChannel.appendLine(`Jack-in: launching ${janetPath} ${serverScript} ${port}`);

    const terminal = vscode.window.createTerminal({
      name: 'Reja REPL Server',
      message: `Starting REPL on port ${port}...`,
    });

    terminal.sendText(`${janetPath} "${serverScript}" ${port}`);
    terminal.show();

    this.terminal = terminal;
    this.outputChannel.appendLine('Waiting for REPL server to start...');

    await this.delay(2000);

    try {
      await this.connection.connect('127.0.0.1', port);
      this.connection.sendNoResponse('reja');
      await this.connection.waitForHandshake();
      this.session = new ReplSession(this.connection);
      vscode.window.showInformationMessage(`Jacked in to Janet REPL on port ${port}`);
      this.connection.onStateChange?.(ConnectionState.JackedIn);
    } catch (err) {
      const error = err as Error;
      this.outputChannel.appendLine(`Connection failed: ${error.message}`);
      vscode.window.showErrorMessage(
        `Could not connect to REPL at 127.0.0.1:${port}: ${error.message}`
      );
    }
  }

  async connect(host?: string, port?: number): Promise<void> {
    const config = vscode.workspace.getConfiguration('reja');
    const targetHost = host ?? config.get<string>('host', '127.0.0.1');
    const targetPort = port ?? config.get<number>('port', 9365);

    try {
      await this.connection.connect(targetHost, targetPort);
      this.connection.sendNoResponse('reja');
      await this.connection.waitForHandshake();
      this.session = new ReplSession(this.connection);
      vscode.window.showInformationMessage(
        `Connected to Janet REPL at ${targetHost}:${targetPort}`
      );
    } catch (err) {
      const error = err as Error;
      this.outputChannel.appendLine(`Connection failed: ${error.message}`);
      vscode.window.showErrorMessage(
        `Could not connect to REPL at ${targetHost}:${targetPort}: ${error.message}`
      );
    }
  }

  async connectToHost(): Promise<void> {
    const hostPort = await vscode.window.showInputBox({
      prompt: 'Enter host:port',
      placeHolder: '127.0.0.1:9365',
      value: '127.0.0.1:9365',
    });

    if (!hostPort) {
      return;
    }

    const parts = hostPort.split(':');
    const host = parts[0];
    const port = parseInt(parts[1] || '9365', 10);

    await this.connect(host, port);
  }

  disconnect(): void {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    this.connection.disconnect();
    this.session = null;
    vscode.window.showInformationMessage('Disconnected from REPL');
    this.outputChannel.appendLine('Disconnected from REPL');
  }

  getSession(): ReplSession | null {
    return this.session;
  }

  isConnected(): boolean {
    return this.connection.state !== ConnectionState.Disconnected;
  }

  private updateStatusBar(state: ConnectionState): void {
    const iconMap: Record<ConnectionState, string> = {
      [ConnectionState.Disconnected]: '$(circle-slash)',
      [ConnectionState.Connecting]: '$(sync~spin)',
      [ConnectionState.Connected]: '$(plug)',
      [ConnectionState.JackedIn]: '$(terminal)',
    };
    const labelMap: Record<ConnectionState, string> = {
      [ConnectionState.Disconnected]: 'Reja: disconnected',
      [ConnectionState.Connecting]: 'Reja: connecting...',
      [ConnectionState.Connected]: 'Reja: connected',
      [ConnectionState.JackedIn]: 'Reja: jacked in',
    };

    const icon = iconMap[state];
    const label = labelMap[state];

    this.statusBarItem.text = `${icon} ${label}`;
    this.statusBarItem.tooltip = 'Click to show connection commands';
    this.statusBarItem.command = 'reja.showConnectionMenu';
    this.statusBarItem.show();
  }

  private setContextKey(key: string, value: boolean): void {
    this.contextKeys.set(key, value);
    vscode.commands.executeCommand('setContext', key, value);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
