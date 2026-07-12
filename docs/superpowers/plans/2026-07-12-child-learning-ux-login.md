# 《词灵星球》小学生学习体验与登录可靠性优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复服务重启后无法继续登录的问题，并完成分轨声音、首次教学、词汇覆盖通关、常驻学习卡和手机端信息层级优化。

**Architecture:** 保持现有原生 Node.js HTTP 服务和 Vanilla JavaScript 单页结构。服务端新增独立的哈希会话存储模块；客户端把音频、教程和学习覆盖拆成可烟雾测试的纯函数，再接入现有渲染与事件流；不新增第三方运行时依赖。

**Tech Stack:** Node.js CommonJS、原生 HTTP、Web Audio API、SpeechSynthesis API、HTML/CSS、Node.js `assert`/VM 烟雾测试、Playwright CLI。

## Global Constraints

- 保留现有 `data/users.json`，不得提交、重置或迁移真实用户数据。
- 会话文件只保存令牌 SHA-256 哈希，不保存原始令牌。
- 密码重置只允许回环地址访问；局域网客户端不能重置。
- 音乐、游戏音效、单词朗读必须独立开关。
- 三消通关必须同时满足积分和不同词汇覆盖目标。
- 不新增付费、广告、短信、云端依赖、语音识别或家长后台。
- 面向用户的文案和代码解释性注释使用简体中文。
- 每项生产代码修改必须先有能按预期失败的测试。

---

## 文件结构

- Create: `session-store.js` — 持久会话、令牌哈希、撤销和回环地址判断。
- Create: `scripts/auth_flow_test.js` — 独立临时数据目录中的注册、登录、重启恢复、退出和密码重置集成测试。
- Modify: `server.js` — 使用会话存储、增加本机密码重置、保留原 API 响应结构。
- Modify: `app.js` — 登录状态、声音设置、教程、覆盖目标、学习卡和首页渲染。
- Modify: `styles.css` — 登录反馈、设置弹层、教程遮罩、学习卡、首页分组和移动端可读性。
- Modify: `scripts/smoke_game.js` — 客户端纯函数、声音通道、教程、覆盖与学习卡测试。
- Modify: `package.json` — 统一 `npm test`、语法检查和集成测试入口。
- Modify: `index.html` — 更新脚本和样式缓存版本。
- Modify: `README.md` — 说明登录恢复、声音设置和新的学习通关规则。

---

### Task 1: 哈希持久会话存储

**Files:**
- Create: `session-store.js`
- Create: `scripts/auth_flow_test.js`
- Modify: `server.js:1-75,105-133,172,203`

**Interfaces:**
- Produces: `SessionStore.create(userId): string`
- Produces: `SessionStore.get(rawToken): { userId, expiresAt } | null`
- Produces: `SessionStore.delete(rawToken): void`
- Produces: `SessionStore.revokeUser(userId): void`
- Produces: `isLoopbackAddress(address): boolean`
- Consumes: `WORD_SPIRIT_DATA_DIR` for isolated integration tests.

- [ ] **Step 1: 写会话存储失败测试**

在 `scripts/auth_flow_test.js` 先加入以下独立模块测试：

```js
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
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node scripts/auth_flow_test.js`

Expected: FAIL，错误为 `Cannot find module '../session-store'`。

- [ ] **Step 3: 实现最小会话存储模块**

创建 `session-store.js`，实现以下完整行为：

```js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function isLoopbackAddress(address = '') {
  const normalized = String(address).toLowerCase();
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '::ffff:127.0.0.1';
}

class SessionStore {
  constructor(file, options = {}) {
    this.file = file;
    this.ttlMs = Number(options.ttlMs || DEFAULT_TTL_MS);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) this.write({ sessions: [] });
  }

  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
    } catch (error) {
      console.error(`会话文件读取失败：${error.message}`);
      return { sessions: [] };
    }
  }

  write(data) {
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
    fs.renameSync(temporary, this.file);
  }

  active() {
    const now = Date.now();
    return this.read().sessions.filter(item => Number(item.expiresAt) > now);
  }

  create(userId) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sessions = this.active();
    sessions.push({ tokenHash: hashToken(rawToken), userId, expiresAt: Date.now() + this.ttlMs });
    this.write({ sessions });
    return rawToken;
  }

  get(rawToken) {
    if (!rawToken) return null;
    const tokenHash = hashToken(rawToken);
    const sessions = this.active();
    const found = sessions.find(item => item.tokenHash === tokenHash) || null;
    this.write({ sessions });
    return found;
  }

  delete(rawToken) {
    const tokenHash = hashToken(rawToken);
    this.write({ sessions: this.active().filter(item => item.tokenHash !== tokenHash) });
  }

  revokeUser(userId) {
    this.write({ sessions: this.active().filter(item => item.userId !== userId) });
  }
}

module.exports = { DEFAULT_TTL_MS, SessionStore, hashToken, isLoopbackAddress };
```

- [ ] **Step 4: 接入 `server.js`**

用 `WORD_SPIRIT_DATA_DIR` 替换固定数据目录，实例化 `SessionStore`，并把三个会话操作替换为：

```js
const { SessionStore } = require('./session-store');
const DATA_DIR = process.env.WORD_SPIRIT_DATA_DIR || path.join(ROOT, 'data');
const sessionStore = new SessionStore(path.join(DATA_DIR, 'sessions.json'));

function requireUser(req) {
  const rawToken = (req.headers.authorization || '').replace('Bearer ', '');
  const session = sessionStore.get(rawToken);
  if (!session) return null;
  return readDb().users.find(user => user.id === session.userId) || null;
}

function createSession(userId) { return sessionStore.create(userId); }
```

退出接口使用 `sessionStore.delete(rawToken)`，删除旧的 `Map` 和 `token()`。

- [ ] **Step 5: 运行模块测试和原烟雾测试**

Run: `node scripts/auth_flow_test.js`

Expected: PASS，且无原始 token 泄漏断言失败。

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS`。

- [ ] **Step 6: 提交会话存储**

```powershell
git add session-store.js server.js scripts/auth_flow_test.js
git commit -m "fix: persist hashed login sessions"
```

---

### Task 2: 登录反馈、密码显示与本机恢复

**Files:**
- Modify: `scripts/auth_flow_test.js`
- Modify: `server.js:105-140`
- Modify: `app.js:147-160,973-986,1310-1390`
- Modify: `styles.css:24-28`

**Interfaces:**
- Produces: `POST /api/password/reset-local`
- Produces: `state.auth = { busy, error, passwordVisible }`
- Produces: `state.view === 'reset-password'`
- Consumes: `isLoopbackAddress(req.socket.remoteAddress)`.

- [ ] **Step 1: 写 HTTP 登录恢复失败测试**

在 Task 1 的模块断言后追加以下集成测试主体；它使用临时 `WORD_SPIRIT_DATA_DIR` 和端口 `31873`，不会读写真实账号：

```js
const http = require('http');
const { spawn } = require('child_process');

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
```

- [ ] **Step 2: 运行集成测试并确认端点缺失**

Run: `node scripts/auth_flow_test.js`

Expected: FAIL，`/api/password/reset-local` 返回 404，消息为 `接口不存在`。

- [ ] **Step 3: 实现本机密码重置端点**

在 `server.js` 引入 `isLoopbackAddress`，在 `/api/login` 后加入：

```js
if (req.method === 'POST' && url.pathname === '/api/password/reset-local') {
  if (!isLoopbackAddress(req.socket.remoteAddress)) {
    return send(res, 403, { error: '请在运行游戏的电脑上重置密码' });
  }
  const body = await getBody(req);
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  if (!validPhone(phone)) return send(res, 400, { error: '请输入 11 位手机号' });
  if (password.length < 6) return send(res, 400, { error: '新密码至少需要 6 位' });
  if (password !== String(body.confirmPassword || '')) return send(res, 400, { error: '两次输入的密码不一致' });
  const db = readDb();
  const user = db.users.find(item => item.phone === phone);
  if (!user) return send(res, 404, { error: '没有找到这个家庭账号' });
  user.salt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = hash(password, user.salt);
  saveDb(db);
  sessionStore.revokeUser(user.id);
  return send(res, 200, { token: createSession(user.id), user: publicUser(user) });
}
```

- [ ] **Step 4: 写客户端登录视图失败断言**

把 `authView` 和新的 `resetPasswordView` 暴露给 `__gameTest`，断言 HTML 包含：

```js
assert(test.authView().includes('autocomplete="current-password"'));
assert(test.authView().includes('data-action="toggle-password"'));
assert(test.authView().includes('data-action="forgot-password"'));
assert(test.resetPasswordView().includes('autocomplete="new-password"'));
assert(test.resetPasswordView().includes('id="reset-password-form"'));
```

- [ ] **Step 5: 运行客户端烟雾测试并确认失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，`resetPasswordView` 或密码操作不存在。

- [ ] **Step 6: 实现登录状态与恢复界面**

在 `state` 增加：

```js
auth: { busy: false, error: '', passwordVisible: false }
```

`authView()` 使用 `type="${state.auth.passwordVisible ? 'text' : 'password'}"`、`autocomplete="current-password"`、表单内 `.form-error` 和“忘记密码？”按钮。新增 `resetPasswordView()`，字段为 `phone`、`password`、`confirmPassword`，两个密码字段使用 `autocomplete="new-password"`。提交时先设置 `busy=true`，失败时保留表单视图并写入 `state.auth.error`，成功时保存 token 并进入首页。

点击处理加入：

```js
if (action === 'toggle-password') { state.auth.passwordVisible = !state.auth.passwordVisible; render(); }
if (action === 'forgot-password') { state.auth.error = ''; state.view = 'reset-password'; render(); }
if (action === 'back-login') { state.auth.error = ''; state.view = 'login'; render(); }
```

- [ ] **Step 7: 增加表单视觉反馈**

在 `styles.css` 增加 `.password-field`、`.password-toggle`、`.form-error`、`.auth-help`，错误区域使用 `role="alert"`，按钮禁用态降低透明度但保持文字对比度。

- [ ] **Step 8: 验证并提交登录修复**

Run: `node scripts/auth_flow_test.js`

Expected: `AUTH_FLOW=PASS restart=PASS reset=PASS logout=PASS`。

Run: `node scripts/smoke_game.js`

Expected: PASS。

```powershell
git add server.js app.js styles.css scripts/auth_flow_test.js scripts/smoke_game.js
git commit -m "feat: add reliable local account recovery"
```

---

### Task 3: 背景音乐、音效与朗读独立控制

**Files:**
- Modify: `scripts/smoke_game.js`
- Modify: `app.js:147-160,223-455,956-972,1339`
- Modify: `styles.css:10-12`

**Interfaces:**
- Produces: `readAudioSettings(storage)`
- Produces: `audioEnabled(channel)`
- Produces: `toggleAudioChannel(channel)`
- Produces: `audioSettingsPanel()`

- [ ] **Step 1: 写声音通道失败测试**

暴露并断言：

```js
const audio = test.readAudioSettings({
  getItem: key => ({ word_spirit_music: 'off', word_spirit_effects: 'on', word_spirit_speech: 'off' })[key]
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(audio)), { music: false, effects: true, speech: false });
assert.strictEqual(test.audioIcon({ music: false, effects: false, speech: false }), '静音');
assert(test.audioSettingsPanel().includes('背景音乐'));
assert(test.audioSettingsPanel().includes('游戏音效'));
assert(test.audioSettingsPanel().includes('单词朗读'));
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，`readAudioSettings` 不存在。

- [ ] **Step 3: 实现声音设置纯函数和状态**

新增：

```js
function readAudioSettings(storage = localStorage) {
  const enabled = key => storage.getItem(key) !== 'off';
  return {
    music: enabled('word_spirit_music'),
    effects: enabled('word_spirit_effects'),
    speech: enabled('word_spirit_speech')
  };
}

function audioIcon(audio) {
  if (!audio.music && !audio.effects && !audio.speech) return '静音';
  return '声音';
}

function audioEnabled(channel) { return Boolean(state.audio[channel]); }
```

把 `state.music` 替换为 `state.audio = readAudioSettings()`，增加 `state.audioPanel = false`。

- [ ] **Step 4: 分别门控三个播放通道**

- `tone` 与 `noise` 首行在 `effects` 关闭时返回。
- `bgmTone`、`bgmNoise`、`scheduleMusic`、`startMusic` 只读取 `music`，不能被 `effects` 阻断。
- `speakWord`、`speakWords`、`speakPraiseFallback` 在 `speech` 关闭时返回。
- `toggleAudioChannel(channel)` 只允许 `music/effects/speech`，写入对应 localStorage；关闭音乐时调用 `stopMusic()`。

- [ ] **Step 5: 实现声音设置弹层**

顶部按钮改为：

```html
<button class="audio-settings-button" data-action="audio-settings" aria-label="声音设置">🔊<span>声音</span></button>
```

`audioSettingsPanel()` 输出三个 44px 以上的开关，按钮分别携带 `data-audio="music|effects|speech"`，朗读项附加“建议保留，帮助学习发音”。`shell()` 在 `state.audioPanel` 为真时追加设置弹层；事件委托处理打开、关闭和切换。

- [ ] **Step 6: 验证并提交声音设置**

Run: `node scripts/smoke_game.js`

Expected: PASS，三个通道配置断言通过。

Run: `node --check app.js`

Expected: exit 0。

```powershell
git add app.js styles.css scripts/smoke_game.js
git commit -m "feat: split music effects and speech controls"
```

---

### Task 4: 首次三消与配对教学

**Files:**
- Modify: `scripts/smoke_game.js`
- Modify: `server.js:34-58`
- Modify: `app.js:180-215,589-638,760-875,1087-1130,1310-1350`
- Modify: `styles.css:44-50,69-80`

**Interfaces:**
- Produces: `tutorialForGame(game, progress)`
- Produces: `completeTutorial(game)`
- Produces: `progress.tutorials = { match3, pair }`

- [ ] **Step 1: 写教程失败测试**

在烟雾测试中断言：

```js
const tutorialGame = test.newGame(1);
const tutorial = test.tutorialForGame(tutorialGame, { tutorials: { match3: false, pair: false } });
assert.strictEqual(tutorial.active, true);
assert.strictEqual(tutorial.mode, 'match3');
assert.strictEqual(tutorial.cells.length, 2);
assert(test.adjacent(tutorial.cells[0], tutorial.cells[1]));
assert(test.findMatchLines(test.swap(tutorialGame.board, tutorial.cells[0], tutorial.cells[1])).length > 0);

const pairTutorial = test.tutorialForGame(test.newGame(3), { tutorials: { match3: true, pair: false } });
assert.strictEqual(pairTutorial.mode, 'pair');
assert.strictEqual(pairTutorial.cells.length, 2);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，`tutorialForGame` 不存在。

- [ ] **Step 3: 归一化教程进度**

服务端 `normalizeProgress(progress)` 的返回对象加入：

```js
tutorials: {
  match3: Boolean(progress.tutorials?.match3),
  pair: Boolean(progress.tutorials?.pair)
}
```

客户端 `normalizedProgress()` 加入：

```js
p.tutorials = {
  match3: Boolean(p.tutorials?.match3),
  pair: Boolean(p.tutorials?.pair)
};
```

确保旧账号没有该字段时默认为 `false`，PATCH 进度后不会丢失。

- [ ] **Step 4: 实现真实棋盘教程选择器**

实现以下纯函数；三消使用真实可行移动，配对使用同词型不同语言的一对牌：

```js
function tutorialForGame(game, progress) {
  const mode = game.mode;
  if (progress.tutorials?.[mode]) return { active: false, mode, cells: [], step: 0 };
  if (mode === 'match3') {
    const move = possibleMoves(game.board)[0];
    return { active: Boolean(move), mode, cells: move ? [move.a, move.b] : [], step: 0 };
  }
  const first = game.pairs.findIndex(card => !card.matched);
  const second = game.pairs.findIndex((card, index) => (
    index !== first && !card.matched && card.type === game.pairs[first]?.type && card.lang !== game.pairs[first]?.lang
  ));
  return { active: first >= 0 && second >= 0, mode, cells: first >= 0 && second >= 0 ? [first, second] : [], step: 0 };
}
```

`newGame` 增加 `tutorial` 字段；进入关卡时根据当前账号进度赋值。教程高亮使用独立 `.tutorial-focus`，不修改库存。

- [ ] **Step 5: 接入操作流**

三消教程第一步只接受第一个高亮格，第二步接受相邻目标格；配对教程只接受高亮搭档。成功后调用：

```js
function completeTutorial(game) {
  if (!game?.tutorial?.active) return;
  const progress = normalizedProgress();
  progress.tutorials[game.mode] = true;
  game.tutorial = { ...game.tutorial, active: false };
  persistProgress().catch(() => {});
}
```

“我会了”按钮也调用该函数；“玩法帮助”使用 `tutorialForGame(game, { tutorials: { [game.mode]: false } })` 重新打开但不修改库存。

无效交换后设置：

```js
game.message = '这两个相邻词块还不能组成三连，看看发光提示';
game.hintCells = possibleMoves(game.board)[0]
  ? [possibleMoves(game.board)[0].a, possibleMoves(game.board)[0].b]
  : [];
```

- [ ] **Step 6: 实现教程遮罩样式**

新增 `.tutorial-layer`、`.tutorial-card`、`.tutorial-focus` 和两格之间的箭头。遮罩不覆盖返回按钮；`prefers-reduced-motion` 下箭头不循环移动。

- [ ] **Step 7: 验证并提交教程**

Run: `node scripts/smoke_game.js`

Expected: PASS，教程格是实际可行移动且不依赖库存。

```powershell
git add app.js server.js styles.css scripts/smoke_game.js
git commit -m "feat: guide first match and pairing moves"
```

---

### Task 5: 词汇覆盖通关与常驻学习卡

**Files:**
- Modify: `scripts/smoke_game.js`
- Modify: `app.js:589-638,657-824,884-930,1080-1130,1310-1350`
- Modify: `styles.css:40-45,51-58,69-80`

**Interfaces:**
- Produces: `coverageGoalFor(words): number`
- Produces: `coverageComplete(game): boolean`
- Produces: `levelComplete(game): boolean`
- Produces: `unlearnedMove(game): { a, b } | null`
- Consumes: `game.learnedTypes: number[]` and `game.memoryWords`.

- [ ] **Step 1: 写覆盖通关失败测试**

加入：

```js
const coverageGame = test.newGame(1);
coverageGame.score = coverageGame.scoreGoal;
assert.strictEqual(coverageGame.coverageGoal, 4);
assert.strictEqual(test.levelComplete(coverageGame), false);
coverageGame.learnedTypes = [0, 1, 2, 3];
assert.strictEqual(test.coverageComplete(coverageGame), true);
assert.strictEqual(test.levelComplete(coverageGame), true);
coverageGame.score = coverageGame.scoreGoal - 1;
assert.strictEqual(test.levelComplete(coverageGame), false);
```

学习卡断言更新为：

```js
const card = test.memoryInline({ memoryWords: [{ word: 'pencil', zh: '铅笔', icon: '✏️' }] });
assert(card.includes('pencil'));
assert(card.includes('铅笔'));
assert(card.includes('✏️'));
assert(card.includes('data-speak-word="pencil"'));
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，`levelComplete` 不存在或积分达标时错误返回 true。

- [ ] **Step 3: 实现覆盖状态纯函数**

新增：

```js
function coverageGoalFor(words) { return Math.min(4, words.length); }
function coverageComplete(game) { return game.mode !== 'match3' || game.learnedTypes.length >= game.coverageGoal; }
function levelComplete(game) {
  return game.mode === 'match3'
    ? game.score >= game.scoreGoal && coverageComplete(game)
    : game.done >= game.goal;
}

function unlearnedMove(game) {
  const learned = new Set(game.learnedTypes);
  return possibleMoves(game.board).find(move => move.words.some(type => !learned.has(type))) || null;
}
```

`newGame` 增加 `learnedTypes: []` 和 `coverageGoal: coverageGoalFor(words)`。

- [ ] **Step 4: 在真实消除处记录不同词型**

`announceElimination(game, types)` 先执行：

```js
game.learnedTypes = [...new Set([...game.learnedTypes, ...types])];
```

主动消除与连锁消除都通过该函数记录。将 `selectCell` 的通关判断替换为 `if (levelComplete(game)) return finishLevel(true);`。

积分达到但覆盖不足时设置：

```js
game.message = `积分达标！再认识 ${game.coverageGoal - game.learnedTypes.length} 个新词`;
```

- `unlearnedMove(game)` 优先返回能消除未学词型的移动。
- 找到时免费高亮 `a/b`；找不到时用 `makeBoard` 安全重排，不扣重排道具。

- [ ] **Step 5: 升级常驻学习卡与朗读动作**

`memoryInline` 为每个最近单词输出图示、英文、中文和：

```html
<button type="button" data-speak-word="pencil" aria-label="再次朗读 pencil">🔊 再听</button>
```

事件委托优先读取 `[data-speak-word]` 并调用 `speakWord`。学习卡最多保留三个不同词，新的词排在前面；棋盘 settle 不清空 `memoryWords`。

目标卡增加“已学 `${game.learnedTypes.length}/${game.coverageGoal}`”，结果页显示“本关认识 N 个词”。

- [ ] **Step 6: 增加学习卡可读样式**

`.target-memory-slot` 允许最多三项横向排列；手机端只显示最新一项，按钮触控高度至少 44px。中文胶囊和再听按钮保持白底深紫字，避免紫色背景低对比度。

- [ ] **Step 7: 验证并提交学习闭环**

Run: `node scripts/smoke_game.js`

Expected: PASS，积分与覆盖双条件、学习卡和朗读动作断言通过。

```powershell
git add app.js styles.css scripts/smoke_game.js
git commit -m "feat: require vocabulary coverage for level completion"
```

---

### Task 6: 首页学习优先级与手机可读性

**Files:**
- Modify: `scripts/smoke_game.js`
- Modify: `app.js:956-1020`
- Modify: `styles.css:10-35,69-84`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `.home-section.learning` and `.home-section.rewards`
- Produces: 390×844 无重叠响应式布局。

- [ ] **Step 1: 写首页分组失败断言**

在 `__gameTest` 暴露 `gameState: state` 和 `homeView`，然后构造最小用户并断言：

```js
test.gameState.user = {
  profile: { nickname: '小测试员' },
  progress: {
    stage: 1, coins: 30, xp: 0, tickets: 1, dust: 0, streak: 0, bestCombo: 0,
    draws: 0, pity: 0, collected: [], mistakes: {}, spirits: { lingling: 1 },
    equipped: 'lingling', inventory: { hint: 3, shuffle: 2, addMoves: 1 }
  }
};
const home = test.homeView();
assert(home.includes('继续学习'));
assert(home.includes('成长奖励'));
assert(home.indexOf('继续学习') < home.indexOf('成长奖励'));
assert(home.includes('开始消除'));
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，首页没有“继续学习”分组标题。

- [ ] **Step 3: 重排首页信息层级**

保留 hero 与唯一 `.play-main` 主按钮。把“选择关卡、错词本”放进：

```html
<section class="home-section learning">
  <h2>继续学习</h2>
  <div class="learning-grid">
    <button data-action="play"><span>▶️</span><b>继续第 ${level} 关</b><small>${gradeFor(level)}年级</small></button>
    <button data-action="levels"><span>🗺️</span><b>选择关卡</b><small>1～${level} 关可玩</small></button>
    <button data-action="mistakes"><span>📝</span><b>错词本</b><small>${Object.keys(p.mistakes).length} 个待复习</small></button>
  </div>
</section>
```

把“免费抽卡、词灵图鉴、金币道具屋”放进：

```html
<section class="home-section rewards">
  <h2>成长奖励</h2>
  <div class="reward-grid">
    <button data-action="draw"><span>🎟</span><b>免费抽卡</b><small>${p.tickets} 张抽卡券</small></button>
    <button data-action="collection"><span>✨</span><b>词灵图鉴</b><small>已收集 ${owned} 只</small></button>
    <button data-action="shop"><span>🛍️</span><b>金币道具屋</b><small>只使用游戏金币</small></button>
  </div>
</section>
```

学习卡保持白底和较强阴影，奖励区降低阴影与图标尺寸。第一关且无收集词时提示固定为“先完成第 1 关，消除后可以再听单词发音”。

- [ ] **Step 4: 修正手机端文字和触控尺寸**

在 `@media(max-width:430px)` 中：

```css
.profile{max-width:72px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile span{font-size:11px}
.tile small{display:none}
.tools button,.memory-word button,.auth-card button{min-height:44px}
.game-message,.target-memory-slot.empty>span{font-size:11px}
```

桌面和手机辅助文字下限分别保持 11px/10px。加入：

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}
}
```

- [ ] **Step 5: 更新缓存版本、命令和说明**

`index.html` 更新为 `/styles.css?v=19` 与 `/app.js?v=18`。`package.json` 增加：

```json
"scripts": {
  "start": "node server.js",
  "check": "node --check app.js && node --check server.js && node --check session-store.js",
  "test": "node scripts/smoke_game.js && node scripts/auth_flow_test.js"
}
```

README 增加“登录状态可跨重启保留”“本机忘记密码恢复”“三轨声音设置”“三消需积分和词汇覆盖同时达标”。

- [ ] **Step 6: 运行自动验证并提交界面优化**

Run: `npm run check`

Expected: exit 0。

Run: `npm test`

Expected: `GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS audio=PASS tutorial=PASS coverage=PASS` 和 `AUTH_FLOW=PASS restart=PASS reset=PASS logout=PASS`。

```powershell
git add app.js styles.css scripts/smoke_game.js index.html README.md package.json
git commit -m "feat: prioritize learning and improve mobile readability"
```

---

### Task 7: 桌面与手机浏览器验收

**Files:**
- Test: `scripts/smoke_game.js`
- Test: `scripts/auth_flow_test.js`
- Inspect: `app.js`, `server.js`, `session-store.js`, `styles.css`

**Interfaces:**
- Consumes all prior tasks.
- Produces fresh verification evidence and a clean task branch.

- [ ] **Step 1: 运行完整自动验证**

Run: `npm run check`

Expected: exit 0。

Run: `npm test`

Expected: 两个测试套件全部 PASS，无未处理 Promise rejection。

- [ ] **Step 2: 启动隔离验收服务**

使用独立数据目录，避免触碰真实账号：

```powershell
$env:PORT='31874'
$env:WORD_SPIRIT_DATA_DIR="$PWD\output\qa-data"
npm start
```

Expected: 输出 `词灵星球试玩版正在运行：http://localhost:31874`。

- [ ] **Step 3: 验收登录与重启恢复**

用 Playwright CLI 在 `http://localhost:31874` 注册测试账号，检查密码显示、退出、登录和错误区域；保存 token 后停止并重启服务，刷新确认自动进入首页；调用本机密码重置，确认旧密码失败、新密码成功。

- [ ] **Step 4: 验收声音、教程和学习通关**

分别关闭背景音乐、游戏音效、单词朗读，确认设置状态独立保存。首次进入三消确认真实移动高亮、完成后不重复弹出；达到积分但覆盖不足时不得提前结算，补足覆盖后进入结果页；“再听”按钮能重复触发英文朗读。

- [ ] **Step 5: 验收 390×844 手机布局**

调整视口为 390×844，截图登录、首页、三消教程、棋盘学习卡和声音设置。确认昵称单行省略、棋盘文字约 11px、按钮不重叠、底部导航不遮挡道具区、页面无横向滚动。

- [ ] **Step 6: 检查控制台、差异和分支状态**

Run: `git diff master...HEAD --check`

Expected: 无空白错误。

Run: `git status --short --branch`

Expected: `## codex/child-ux-login` 且无未提交文件。

浏览器控制台 Expected: Errors 0。

- [ ] **Step 7: 记录验收修正或完成证据**

若浏览器验收发现问题，先为问题增加失败测试，再做单一修复并重新执行 Step 1～6。全部通过后不创建额外提交；最终交付列出提交、测试结果、桌面/手机截图结论和仍未覆盖的短信/云同步边界。
