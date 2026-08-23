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
const dataFile = path.join(tempDir, 'users.json');
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
    assert.strictEqual(loggedIn.body.user.progress.coins, 30);
    assert.strictEqual(loggedIn.body.user.progress.tickets, 0);
    assert.strictEqual(loggedIn.body.user.progress.migrationVersion, 1);

    assert.strictEqual((await request('POST', '/api/pet/adopt', { speciesId: 'invalid', name: '坏坏' }, originalToken)).status, 400);
    const adopted = await request('POST', '/api/pet/adopt', { speciesId: 'cloud', name: '团团' }, originalToken);
    assert.strictEqual(adopted.status, 200);
    assert.strictEqual(adopted.body.user.progress.pet.speciesId, 'cloud');
    assert.strictEqual(adopted.body.user.progress.pet.name, '团团');
    const duplicateAdoption = await request('POST', '/api/pet/adopt', { speciesId: 'spark', name: '火火' }, originalToken);
    assert.strictEqual(duplicateAdoption.status, 409);

    const renamed = await request('PATCH', '/api/pet/name', { name: '云宝' }, originalToken);
    assert.strictEqual(renamed.status, 200);
    assert.strictEqual(renamed.body.user.progress.pet.speciesId, 'cloud');
    assert.strictEqual(renamed.body.user.progress.pet.name, '云宝');
    assert.strictEqual((await request('PATCH', '/api/pet/name', { name: '<script>' }, originalToken)).status, 400);

    const bought = await request('POST', '/api/shop/purchase', { itemId: 'starBiscuit', operationId: 'buy-1' }, originalToken);
    assert.strictEqual(bought.status, 200);
    assert.strictEqual(bought.body.user.progress.coins, 10);
    assert.strictEqual(bought.body.user.progress.pet.foodInventory.starBiscuit, 1);
    const duplicateBuy = await request('POST', '/api/shop/purchase', { itemId: 'starBiscuit', operationId: 'buy-1' }, originalToken);
    assert.strictEqual(duplicateBuy.status, 200);
    assert.strictEqual(duplicateBuy.body.user.progress.coins, 10);
    assert.strictEqual(duplicateBuy.body.user.progress.pet.foodInventory.starBiscuit, 1);
    assert.strictEqual((await request('POST', '/api/shop/purchase', { itemId: 'celebrationCake', operationId: 'buy-2' }, originalToken)).status, 409);

    const fed = await request('POST', '/api/pet/feed', { foodId: 'starBiscuit', operationId: 'feed-1' }, originalToken);
    assert.strictEqual(fed.status, 200);
    assert.strictEqual(fed.body.user.progress.pet.growth, 10);
    assert.strictEqual(fed.body.user.progress.pet.level, 1);
    assert.strictEqual(fed.body.user.progress.pet.foodInventory.starBiscuit, 0);
    const duplicateFeed = await request('POST', '/api/pet/feed', { foodId: 'starBiscuit', operationId: 'feed-1' }, originalToken);
    assert.strictEqual(duplicateFeed.status, 200);
    assert.strictEqual(duplicateFeed.body.user.progress.pet.growth, 10);
    assert.strictEqual((await request('POST', '/api/pet/feed', { foodId: 'starBiscuit', operationId: 'feed-2' }, originalToken)).status, 409);

    const spellingReward = await request('POST', '/api/game/complete', {
      runId: 'run-spelling-1', level: 1, mode: 'spelling', stars: 3, missionType: 'normal', sessionCoins: 0, maxCombo: 0
    }, originalToken);
    assert.strictEqual(spellingReward.status, 200);
    assert.strictEqual(spellingReward.body.reward.coins, 48);
    assert.strictEqual(spellingReward.body.user.progress.coins, 58);
    const duplicateReward = await request('POST', '/api/game/complete', {
      runId: 'run-spelling-1', level: 1, mode: 'spelling', stars: 3, missionType: 'normal', sessionCoins: 0, maxCombo: 0
    }, originalToken);
    assert.strictEqual(duplicateReward.status, 200);
    assert.strictEqual(duplicateReward.body.reward.duplicate, true);
    assert.strictEqual(duplicateReward.body.user.progress.coins, 58);

    await stopServer(child);
    const legacyDb = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const legacyUser = legacyDb.users.find(item => item.phone === account.phone);
    legacyUser.progress.coins = 0;
    legacyUser.progress.tickets = 2;
    legacyUser.progress.dust = 3;
    legacyUser.progress.migrationVersion = 0;
    fs.writeFileSync(dataFile, JSON.stringify(legacyDb, null, 2));
    child = startServer();
    await waitForServer();
    const migrated = await request('GET', '/api/me', null, originalToken);
    assert.strictEqual(migrated.status, 200);
    assert.strictEqual(migrated.body.user.progress.coins, 175);
    assert.strictEqual(migrated.body.user.progress.tickets, 0);
    assert.strictEqual(migrated.body.user.progress.dust, 0);
    assert.strictEqual(migrated.body.user.progress.migrationVersion, 1);
    await stopServer(child);
    child = startServer();
    await waitForServer();
    assert.strictEqual((await request('GET', '/api/me', null, originalToken)).body.user.progress.coins, 175);

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
    console.log('AUTH_FLOW=PASS register=PASS login=PASS restart=PASS reset=PASS logout=PASS health=PASS pet=PASS shop=PASS feed=PASS migration=PASS idempotency=PASS');
  } finally {
    await stopServer(child);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
