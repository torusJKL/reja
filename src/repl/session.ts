import { NetreplConnection } from './connection';

export interface ReplSessionState {
  namespace: string;
  prompt: string;
  lineNumber: number;
  history: string[];
  historyIndex: number;
}

export class ReplSession {
  readonly connection: NetreplConnection;
  private _namespace: string = 'user';
  private _prompt: string = '';
  private _lineNumber: number = 1;
  private _history: string[] = [];
  private _historyIndex: number = -1;

  constructor(connection: NetreplConnection) {
    this.connection = connection;
  }

  get namespace(): string {
    return this._namespace;
  }

  set namespace(value: string) {
    this._namespace = value;
  }

  get prompt(): string {
    return this._prompt;
  }

  set prompt(value: string) {
    this._prompt = value;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  set lineNumber(value: number) {
    this._lineNumber = value;
  }

  get history(): string[] {
    return this._history;
  }

  get historyIndex(): number {
    return this._historyIndex;
  }

  addToHistory(code: string): void {
    this._history.push(code);
    this._historyIndex = this._history.length;
  }

  historyBack(): string | null {
    if (this._historyIndex <= 0) {
      return null;
    }
    this._historyIndex--;
    return this._history[this._historyIndex];
  }

  historyForward(): string | null {
    if (this._historyIndex >= this._history.length - 1) {
      this._historyIndex = this._history.length;
      return '';
    }
    this._historyIndex++;
    return this._history[this._historyIndex];
  }

  getSnapshot(): ReplSessionState {
    return {
      namespace: this._namespace,
      prompt: this._prompt,
      lineNumber: this._lineNumber,
      history: [...this._history],
      historyIndex: this._historyIndex,
    };
  }

  restoreSnapshot(state: ReplSessionState): void {
    this._namespace = state.namespace;
    this._prompt = state.prompt;
    this._lineNumber = state.lineNumber;
    this._history = [...state.history];
    this._historyIndex = state.historyIndex;
  }
}
