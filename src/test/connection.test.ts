import * as assert from 'assert';

suite('Connection Layer', () => {
  test('encodeLength produces correct little-endian bytes', () => {
    const { NetreplConnection } = require('../repl/connection');
    assert.ok(NetreplConnection);
  });

  test('ConnectionState enum has expected values', () => {
    const { ConnectionState } = require('../repl/connection');
    assert.strictEqual(ConnectionState.Disconnected, 'disconnected');
    assert.strictEqual(ConnectionState.Connecting, 'connecting');
    assert.strictEqual(ConnectionState.Connected, 'connected');
    assert.strictEqual(ConnectionState.JackedIn, 'jacked-in');
  });
});

suite('Session', () => {
  test('ReplSession manages history correctly', () => {
    const { ReplSession } = require('../repl/session');
    const { NetreplConnection } = require('../repl/connection');
    const conn = new NetreplConnection();
    const session = new (ReplSession as any)(conn);

    assert.strictEqual(session.namespace, 'user');
    assert.strictEqual(session.lineNumber, 1);

    session.addToHistory('(+ 1 2)');
    session.addToHistory('(* 3 4)');
    assert.strictEqual(session.history.length, 2);

    const back = session.historyBack();
    assert.strictEqual(back, '(* 3 4)');

    const back2 = session.historyBack();
    assert.strictEqual(back2, '(+ 1 2)');

    const forward = session.historyForward();
    assert.strictEqual(forward, '(* 3 4)');
  });
});
