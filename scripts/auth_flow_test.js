const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
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
let port;
const account = { phone: '13800138888', password: 'Family123!', nickname: '登录测试' };

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const assigned = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(assigned));
    });
  });
}

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
        resolve({ status: res.statusCode, body: parsed, headers: res.headers, raw });
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
    try { if ((await request('GET', '/api/health')).status === 200) return; } catch {}
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
    port = await findFreePort();
    child = startServer();
    await waitForServer();
    const health = await request('GET', '/api/health');
    assert.deepStrictEqual(health.body, {
      app: 'word-spirit-planet', version: '0.3.0', ok: true
    });

    const backgroundMusic = await request('GET', '/assets/snake-countdown-bgm.mp3');
    assert.strictEqual(backgroundMusic.status, 200, '背景音乐资源必须可通过静态服务访问');
    assert(backgroundMusic.raw.length > 0, '背景音乐响应不能为空');
    assert(/^audio\/(?:mpeg|mp3)(?:;|$)/i.test(String(backgroundMusic.headers['content-type'] || '')), '背景音乐必须返回音频 Content-Type');

    const sessionsBefore = JSON.parse(fs.readFileSync(sessionFile, 'utf8')).sessions.length;
    const registered = await request('POST', '/api/register', account);
    assert.strictEqual(registered.status, 201);
    assert.deepStrictEqual(registered.body, {
      ok: true,
      message: '注册成功，请使用刚才的手机号和密码登录',
      phone: account.phone
    });
    assert.strictEqual(Object.hasOwn(registered.body, 'token'), false);
    assert.strictEqual(Object.hasOwn(registered.body, 'user'), false);
    assert.strictEqual(JSON.parse(fs.readFileSync(sessionFile, 'utf8')).sessions.length, sessionsBefore);
    assert.strictEqual((await request('GET', '/api/me')).status, 401);

    const loggedIn = await request('POST', '/api/login', {
      phone: account.phone,
      password: account.password
    });
    assert.strictEqual(loggedIn.status, 200);
    assert.strictEqual(typeof loggedIn.body.token, 'string');
    assert(loggedIn.body.token.length >= 32);
    const originalToken = loggedIn.body.token;

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
    assert.strictEqual((await request('POST', '/api/login', {
      phone: account.phone,
      password: account.password
    })).status, 401);
    assert.strictEqual((await request('POST', '/api/login', {
      phone: account.phone,
      password: 'NewFamily123!'
    })).status, 200);
    assert.strictEqual((await request('POST', '/api/logout', null, changed.body.token)).status, 200);
    assert.strictEqual((await request('GET', '/api/me', null, changed.body.token)).status, 401);
    console.log('AUTH_FLOW=PASS register=PASS login=PASS restart=PASS reset=PASS logout=PASS health=PASS');
  } finally {
    await stopServer(child);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
