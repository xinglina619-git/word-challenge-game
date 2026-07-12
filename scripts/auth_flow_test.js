const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
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

console.log('SESSION_STORE=PASS hash=PASS restart=PASS revoke=PASS loopback=PASS');

const root = path.resolve(__dirname, '..');
const port = 31873;
const account = { phone: '13800138888', password: 'Family123!', nickname: '登录测试' };

function request(method, pathname, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: pathname,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let parsed = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function startServer() {
  return spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), WORD_SPIRIT_DATA_DIR: tempDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await request('GET', '/')).status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('测试服务器未在 4 秒内启动');
}

async function stopServer(child) {
  if (!child || child.exitCode != null) return;
  child.kill();
  await new Promise(resolve => child.once('exit', resolve));
}

(async () => {
  let child;
  try {
    child = startServer();
    await waitForServer();
    const registered = await request('POST', '/api/register', account);
    assert.strictEqual(registered.status, 201);
    const originalToken = registered.body.token;

    await stopServer(child);
    child = startServer();
    await waitForServer();
    assert.strictEqual((await request('GET', '/api/me', null, originalToken)).status, 200);

    const changed = await request('POST', '/api/password/reset-local', {
      phone: account.phone,
      password: 'NewFamily123!',
      confirmPassword: 'NewFamily123!'
    });
    assert.strictEqual(changed.status, 200);
    assert.strictEqual((await request('GET', '/api/me', null, originalToken)).status, 401);
    assert.strictEqual((await request('GET', '/api/me', null, changed.body.token)).status, 200);
    assert.strictEqual((await request('POST', '/api/logout', null, changed.body.token)).status, 200);
    assert.strictEqual((await request('GET', '/api/me', null, changed.body.token)).status, 401);
    console.log('AUTH_FLOW=PASS restart=PASS reset=PASS logout=PASS');
  } finally {
    await stopServer(child);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
