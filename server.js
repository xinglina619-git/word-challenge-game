const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SessionStore } = require('./session-store');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.WORD_SPIRIT_DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const sessionStore = new SessionStore(path.join(DATA_DIR, 'sessions.json'));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));

function readDb() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function saveDb(db) { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function hash(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function getBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 100000) reject(new Error('请求过大')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('请求格式不正确')); } });
  });
}
function validPhone(phone) { return /^1\d{10}$/.test(String(phone)); }
function normalizeProgress(progress = {}) {
  const spirits = progress.spirits && typeof progress.spirits === 'object' && !Array.isArray(progress.spirits)
    ? progress.spirits : { lingling: 1 };
  spirits.lingling = Math.max(1, Number(spirits.lingling || 1));
  return {
    stage: Math.max(1, Math.min(100, Number(progress.stage || 1))),
    coins: Math.max(0, Math.min(999999, Number(progress.coins || 20))),
    xp: Math.max(0, Math.min(9999999, Number(progress.xp || 0))),
    tickets: Math.max(0, Math.min(9999, Number(progress.tickets || 0))),
    dust: Math.max(0, Math.min(999999, Number(progress.dust || 0))),
    streak: Math.max(0, Math.min(99999, Number(progress.streak || 0))),
    bestCombo: Math.max(0, Math.min(9999, Number(progress.bestCombo || 0))),
    draws: Math.max(0, Math.min(999999, Number(progress.draws || 0))),
    pity: Math.max(0, Math.min(10, Number(progress.pity || 0))),
    collected: Array.isArray(progress.collected) ? progress.collected.slice(0, 1000).map(value => String(value).slice(0, 50)) : [],
    mistakes: progress.mistakes && typeof progress.mistakes === 'object' && !Array.isArray(progress.mistakes) ? progress.mistakes : {},
    spirits: Object.fromEntries(Object.entries(spirits).slice(0, 100).map(([key, value]) => [String(key).slice(0, 40), Math.max(1, Math.min(99, Number(value || 1)))])),
    equipped: Object.hasOwn(spirits, String(progress.equipped || 'lingling')) ? String(progress.equipped || 'lingling') : 'lingling',
    inventory: {
      hint: Math.max(0, Math.min(999, Number(progress.inventory?.hint ?? 3))),
      shuffle: Math.max(0, Math.min(999, Number(progress.inventory?.shuffle ?? 2))),
      addMoves: Math.max(0, Math.min(999, Number(progress.inventory?.addMoves ?? 1)))
    }
  };
}
function publicUser(user) {
  const { phone, passwordHash, salt, ...safe } = user;
  return { ...safe, progress: normalizeProgress(safe.progress), phoneTail: phone.slice(-4) };
}
function requireUser(req) {
  const rawToken = (req.headers.authorization || '').replace('Bearer ', '');
  const session = sessionStore.get(rawToken);
  if (!session) return null;
  return readDb().users.find(user => user.id === session.userId) || null;
}
function createSession(userId) { return sessionStore.create(userId); }
function profileFrom(body, current = {}) {
  const nickname = String(body.nickname ?? current.nickname ?? '').trim().slice(0, 12);
  const avatar = String(body.avatar ?? current.avatar ?? 'boy_hat');
  if (!nickname) throw new Error('请给玩家起一个昵称');
  if (!['boy_hat', 'boy_hair', 'girl_hat', 'girl_hair', 'tiger', 'rabbit', 'panda', 'fox', 'dragon', 'cat'].includes(avatar)) throw new Error('头像选择无效');
  return { nickname, avatar };
}
function sanitizeMistakes(input, current = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return current;
  return Object.fromEntries(
    Object.entries(input).slice(0, 300).map(([word, value]) => [
      String(word).slice(0, 40),
      {
        wrongCount: Math.max(1, Math.min(999, Number(value?.wrongCount || 1))),
        correctStreak: Math.max(0, Math.min(2, Number(value?.correctStreak || 0))),
        reviewCount: Math.max(0, Math.min(999, Number(value?.reviewCount || 0))),
        lastWrongAt: String(value?.lastWrongAt || new Date().toISOString()).slice(0, 40)
      }
    ])
  );
}
function serveFile(res, file) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname === '/api/register') {
      const body = await getBody(req);
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '');
      if (!validPhone(phone)) return send(res, 400, { error: '请输入 11 位手机号' });
      if (password.length < 6) return send(res, 400, { error: '密码至少需要 6 位' });
      const db = readDb();
      if (db.users.some(user => user.phone === phone)) return send(res, 409, { error: '该手机号已经注册，请直接登录' });
      const salt = crypto.randomBytes(16).toString('hex');
      const profile = profileFrom(body);
      const user = {
        id: crypto.randomUUID(), phone, salt, passwordHash: hash(password, salt), profile,
        progress: normalizeProgress({ stage: 1, coins: 30, tickets: 1 }), createdAt: new Date().toISOString()
      };
      db.users.push(user); saveDb(db);
      return send(res, 201, { token: createSession(user.id), user: publicUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await getBody(req); const phone = String(body.phone || '').trim();
      const user = readDb().users.find(item => item.phone === phone);
      if (!user || hash(String(body.password || ''), user.salt) !== user.passwordHash) return send(res, 401, { error: '手机号或密码不正确' });
      return send(res, 200, { token: createSession(user.id), user: publicUser(user) });
    }
    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = requireUser(req); if (!user) return send(res, 401, { error: '登录已过期' });
      return send(res, 200, { user: publicUser(user) });
    }
    if (req.method === 'PATCH' && url.pathname === '/api/profile') {
      const user = requireUser(req); if (!user) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const db = readDb(); const target = db.users.find(item => item.id === user.id);
      target.profile = profileFrom(body, target.profile); saveDb(db);
      return send(res, 200, { user: publicUser(target) });
    }
    if (req.method === 'PATCH' && url.pathname === '/api/progress') {
      const user = requireUser(req); if (!user) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const db = readDb(); const target = db.users.find(item => item.id === user.id);
      const current = normalizeProgress(target.progress);
      const mistakes = sanitizeMistakes(body.mistakes, current.mistakes || {});
      target.progress = normalizeProgress({ ...current, ...body, mistakes });
      saveDb(db); return send(res, 200, { user: publicUser(target) });
    }
    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      const user = requireUser(req); if (!user) return send(res, 401, { error: '请先登录' });
      const db = readDb();
      const ranked = db.users
        .map(item => {
          const progress = normalizeProgress(item.progress);
          return {
            id: item.id,
            nickname: item.profile.nickname,
            avatar: item.profile.avatar,
            stage: progress.stage,
            coins: progress.coins,
            words: progress.collected.length,
            createdAt: item.createdAt
          };
        })
        .sort((a, b) => b.stage - a.stage || b.words - a.words || b.coins - a.coins || a.createdAt.localeCompare(b.createdAt))
        .map((item, index) => ({ ...item, rank: index + 1 }));
      return send(res, 200, {
        entries: ranked.slice(0, 50),
        currentRank: ranked.find(item => item.id === user.id)?.rank || ranked.length
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sessionStore.delete((req.headers.authorization || '').replace('Bearer ', ''));
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/') return serveFile(res, path.join(ROOT, 'index.html'));
    if (req.method === 'GET' && ['/.js', '/app.js'].includes(url.pathname)) return serveFile(res, path.join(ROOT, 'app.js'));
    if (req.method === 'GET' && url.pathname === '/textbook-words.generated.js') return serveFile(res, path.join(ROOT, 'textbook-words.generated.js'));
    if (req.method === 'GET' && url.pathname === '/curriculum.js') return serveFile(res, path.join(ROOT, 'curriculum.js'));
    if (req.method === 'GET' && url.pathname === '/styles.css') return serveFile(res, path.join(ROOT, 'styles.css'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit.png'));
    if (req.method === 'GET' && url.pathname === '/assets/alphabet-jungle.png') return serveFile(res, path.join(ROOT, 'assets', 'alphabet-jungle.png'));
    if (req.method === 'GET' && url.pathname === '/assets/morning-town.png') return serveFile(res, path.join(ROOT, 'assets', 'morning-town.png'));
    if (req.method === 'GET' && url.pathname === '/assets/cloud-castle.png') return serveFile(res, path.join(ROOT, 'assets', 'cloud-castle.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-boy-hat.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-boy-hat.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-boy-hair.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-boy-hair.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-girl-hat.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-girl-hat.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-girl-hair.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-girl-hair.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-walk-sheet-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-walk-sheet-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-walk-toward-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-walk-toward-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/soldier-walk-away-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'soldier-walk-away-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit-sheet-v2-clean.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit-sheet-v2-clean.png'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit-fly-strip-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit-fly-strip-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit-surprise-strip-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit-surprise-strip-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit-cheer-strip-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit-cheer-strip-v3.png'));
    if (req.method === 'GET' && url.pathname === '/assets/word-spirit-victory-strip-v3.png') return serveFile(res, path.join(ROOT, 'assets', 'word-spirit-victory-strip-v3.png'));
    const spiritAsset = url.pathname.match(/^\/assets\/(spirit-(?:sprout-v2|bubble-v1|candy-v1|spark-v1|cloud-v1|moon-v1|rainbow-v2)\.png)$/);
    if (req.method === 'GET' && spiritAsset) return serveFile(res, path.join(ROOT, 'assets', spiritAsset[1]));
    if (req.method === 'GET' && url.pathname === '/assets/adventure-jungle-v2.png') return serveFile(res, path.join(ROOT, 'assets', 'adventure-jungle-v2.png'));
    if (req.method === 'GET' && url.pathname === '/assets/adventure-town-v2.png') return serveFile(res, path.join(ROOT, 'assets', 'adventure-town-v2.png'));
    if (req.method === 'GET' && url.pathname === '/assets/adventure-castle-v2.png') return serveFile(res, path.join(ROOT, 'assets', 'adventure-castle-v2.png'));
    return send(res, 404, { error: '接口不存在' });
  } catch (error) { return send(res, 400, { error: error.message || '操作失败' }); }
});

server.listen(PORT, '0.0.0.0', () => console.log(`词灵星球试玩版正在运行：http://localhost:${PORT}`));
