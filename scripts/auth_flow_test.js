const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SessionStore, isLoopbackAddress } = require('../session-store');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'word-spirit-auth-'));
const sessionFile = path.join(tempDir, 'sessions.json');
const first = new SessionStore(sessionFile, { ttlMs: 60_000 });
const rawToken = first.create('child-1');
const persisted = fs.readFileSync(sessionFile, 'utf8');

assert(!persisted.includes(rawToken), '会话文件不得保存原始令牌');
assert.strictEqual(first.get(rawToken).userId, 'child-1');
assert.strictEqual(new SessionStore(sessionFile).get(rawToken).userId, 'child-1');
first.revokeUser('child-1');
assert.strictEqual(first.get(rawToken), null);
assert.strictEqual(isLoopbackAddress('127.0.0.1'), true);
assert.strictEqual(isLoopbackAddress('::1'), true);
assert.strictEqual(isLoopbackAddress('::ffff:127.0.0.1'), true);
assert.strictEqual(isLoopbackAddress('192.168.1.8'), false);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('SESSION_STORE=PASS hash=PASS restart=PASS revoke=PASS loopback=PASS');
