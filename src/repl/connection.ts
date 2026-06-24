import * as net from 'net';

export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  JackedIn = 'jacked-in',
}

const MAX_MSG_SIZE = 1 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

function encodeLength(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n, 0);
  return buf;
}

function decodeLength(buf: Buffer): number {
  return buf.readUInt32LE(0);
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}

type LogFn = (msg: string) => void;

export class NetreplConnection {
  private socket: net.Socket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private pendingQueue: PendingRequest[] = [];
  private messageQueue: string[] = [];
  private _state: ConnectionState = ConnectionState.Disconnected;
  private handshakeDone: boolean = false;
  private handshakeResolve: (() => void) | null = null;
  private handshakePromise: Promise<void> = Promise.resolve();

  onStateChange: ((state: ConnectionState) => void) | null = null;
  onError: ((error: Error) => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onLog: LogFn | null = null;

  private log(msg: string): void {
    if (this.onLog) {
      this.onLog(`[Reja] ${msg}`);
    }
  }

  get state(): ConnectionState {
    return this._state;
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._state !== ConnectionState.Disconnected) {
        reject(new Error('Already connected or connecting'));
        return;
      }

      this.setState(ConnectionState.Connecting);
      this.socket = new net.Socket();
      this.handshakeDone = false;
      this.handshakePromise = new Promise((r) => {
        this.handshakeResolve = r;
      });
      this.messageQueue = [];

      this.socket.on('connect', () => {
        this.log(`Connected to ${host}:${port}`);
        this.setState(ConnectionState.Connected);
        this.socket?.setTimeout(0);
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.log(`Received ${data.length} raw bytes`);
        this.buffer = Buffer.concat([this.buffer, data]);
        this.processBuffer();
      });

      this.socket.on('error', (err: Error) => {
        this.log(`Socket error: ${err.message}`);
        this.setState(ConnectionState.Disconnected);
        this.failPending(err);
        if (this.onError) {
          this.onError(err);
        }
      });

      this.socket.on('close', () => {
        this.log('Socket closed');
        this.setState(ConnectionState.Disconnected);
        this.socket = null;
        this.failPending(new Error('Connection closed'));
        if (this.onDisconnect) {
          this.onDisconnect();
        }
      });

      this.socket.connect(port, host);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }
    this.buffer = Buffer.alloc(0);
    this.messageQueue = [];
    this.failPending(new Error('Disconnected'));
    this.setState(ConnectionState.Disconnected);
    this.log('Disconnected');
  }

  send(msg: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this._state === ConnectionState.Disconnected) {
        reject(new Error('Not connected'));
        return;
      }

      const payload = this.encodePayload(msg);
      const header = encodeLength(payload.length);
      this.socket.write(Buffer.concat([header, payload]));

      const timer = setTimeout(() => {
        const idx = this.pendingQueue.indexOf(pending);
        if (idx !== -1) {
          this.pendingQueue.splice(idx, 1);
          this.log(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        }
        reject(new Error('Request timed out'));
      }, REQUEST_TIMEOUT_MS);

      const pending: PendingRequest & { _timer?: NodeJS.Timeout } = {
        resolve: (value: string) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (reason: Error) => {
          clearTimeout(timer);
          reject(reason);
        },
      };
      this.log(`Sending request (${payload.length} bytes payload)`);
      this.pendingQueue.push(pending);
      this.drainMessageQueue();
    });
  }

  sendNoResponse(msg: string): void {
    if (!this.socket || this._state === ConnectionState.Disconnected) {
      return;
    }
    const payload = this.encodePayload(msg);
    const header = encodeLength(payload.length);
    this.socket.write(Buffer.concat([header, payload]));
    this.log(`Sent no-response message (${payload.length} bytes)`);
  }

  private encodePayload(msg: string): Buffer {
    if (msg.length > 0 && (msg.charCodeAt(0) === 0xff || msg.charCodeAt(0) === 0xfe)) {
      const rest = Buffer.from(msg.slice(1), 'utf-8');
      const buf = Buffer.alloc(1 + rest.length);
      buf[0] = msg.charCodeAt(0);
      rest.copy(buf, 1);
      return buf;
    }
    return Buffer.from(msg, 'utf-8');
  }

  private drainMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.pendingQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      const pending = this.pendingQueue.shift()!;
      this.log(`Matched pending request with response (${msg.length} chars)`);
      pending.resolve(msg);
    }
  }

  async waitForHandshake(): Promise<void> {
    await this.handshakePromise;
    this.handshakeDone = true;
    this.log(`Handshake complete, cleared ${this.messageQueue.length} stale messages`);
    this.messageQueue = [];
  }

  private processBuffer(): void {
    if (!this.handshakeDone && this.handshakeResolve) {
      this.handshakeResolve();
      this.handshakeResolve = null;
    }

    while (this.buffer.length >= 4) {
      const length = decodeLength(this.buffer.subarray(0, 4));

      if (length > MAX_MSG_SIZE || length < 0) {
        this.log(`Bad length ${length}, skipping byte to re-sync`);
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const totalMsgSize = 4 + length;

      if (this.buffer.length < totalMsgSize) {
        this.log(`Waiting for more data (need ${totalMsgSize}, have ${this.buffer.length})`);
        break;
      }

      const payload = stripAnsi(this.buffer.subarray(4, totalMsgSize).toString('utf-8'));
      this.buffer = this.buffer.subarray(totalMsgSize);

      if (!this.handshakeDone) {
        this.log(`Handshake: consumed ${payload.length} byte message`);
        continue;
      }

      if (/^[a-zA-Z0-9._-]+:\d+:/.test(payload)) {
        this.log(`Skipped prompt: ${payload.slice(0, 40)}`);
        continue;
      }

      this.log(`Queued response: ${payload.slice(0, 60)}`);
      this.messageQueue.push(payload);
      this.drainMessageQueue();
    }
  }

  private failPending(err: Error): void {
    this.log(`Failing ${this.pendingQueue.length} pending requests: ${err.message}`);
    for (const pending of this.pendingQueue) {
      pending.reject(err);
    }
    this.pendingQueue = [];
    this.messageQueue = [];
  }

  replEval(code: string): Promise<string> {
    // Use raw REPL input (no \xFF prefix) for compatibility with servers
    // whose \xFF handler doesn't use protect and crashes on certain forms.
    // The server sends result + prompt; our prompt skipping handles the extra.
    return this.send(code);
  }

  replInput(code: string): Promise<string> {
    return this.send(code);
  }

  sendCommand(cmd: string): Promise<string> {
    return this.send('\xfe' + cmd);
  }
}
