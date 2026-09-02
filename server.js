const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { SessionStore, isLoopbackAddress } = require('./session-store');
const PetSystem = require('./pet-system');
const ReviewGames = require('./review-games');

const APP_ID = 'word-spirit-planet';
const APP_VERSION = '0.4.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.WORD_SPIRIT_DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const sessionStore = new SessionStore(path.join(DATA_DIR, 'sessions.json'));

function buildTextbookCatalog() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'curriculum.js'), 'utf8'), sandbox, { filename: 'curriculum.js' });
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'textbook-words.generated.js'), 'utf8'), sandbox, { filename: 'textbook-words.generated.js' });
  const content = sandbox.window.GAME_CONTENT || {};
  const records = [
    ...(content.starter || []),
    ...Object.values(content.gradedMain || {}).flat(),
    ...(content.grade4Book?.units || []).flatMap(unit => unit.words || []).map(([word, zh]) => ({ word, zh })),
    ...Object.values(sandbox.window.TEXTBOOK_WORDS?.grades || {}).flat()
  ];
  return new Map(records.filter(item => item?.word && item?.zh).map(item => [String(item.word).trim().toLowerCase(), String(item.zh).trim()]));
}
const TEXTBOOK_CATALOG = buildTextbookCatalog();

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
function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
function safeStringList(input, limit = 100, length = 100) {
  return Array.isArray(input) ? input.slice(-limit).map(value => String(value).slice(0, length)) : [];
}
function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}
function advancePetOnboarding(pet, event) {
  if (!pet || pet.onboardingStep === 'complete') return;
  if (event === 'feed') pet.onboardingStep = 'complete';
  else if (event === 'buy-food') pet.onboardingStep = 'feed';
  else if (event === 'earn-coins' && pet.onboardingStep === 'earn') pet.onboardingStep = 'buy';
}
function onboardingForMigratedPet(progress) {
  const foodCount = Object.values(progress.pet.foodInventory || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  if (foodCount > 0) return 'feed';
  if (progress.coins >= PetSystem.FOODS[0].price) return 'buy';
  return 'earn';
}
function normalizeProgress(progress = {}) {
  const spirits = progress.spirits && typeof progress.spirits === 'object' && !Array.isArray(progress.spirits)
    ? progress.spirits : { lingling: 1 };
  spirits.lingling = Math.max(1, Number(spirits.lingling || 1));
  const learnedSeed = (Array.isArray(progress.learnedWords) && progress.learnedWords.length ? progress.learnedWords : progress.collected || [])
    .map(item => typeof item === 'string'
      ? { word: item, zh: TEXTBOOK_CATALOG.get(String(item).trim().toLowerCase()) || '' }
      : { ...item, zh: item?.zh || TEXTBOOK_CATALOG.get(String(item?.word || '').trim().toLowerCase()) || '' });
  return {
    stage: clamp(progress.stage, 1, 100, 1),
    coins: clamp(progress.coins, 0, 999999, 20),
    xp: clamp(progress.xp, 0, 9999999, 0),
    tickets: clamp(progress.tickets, 0, 9999, 0),
    dust: clamp(progress.dust, 0, 999999, 0),
    streak: clamp(progress.streak, 0, 99999, 0),
    bestCombo: clamp(progress.bestCombo, 0, 9999, 0),
    draws: clamp(progress.draws, 0, 999999, 0),
    pity: clamp(progress.pity, 0, 10, 0),
    collected: Array.isArray(progress.collected) ? progress.collected.slice(0, 1000).map(value => String(value).slice(0, 50)) : [],
    mistakes: progress.mistakes && typeof progress.mistakes === 'object' && !Array.isArray(progress.mistakes) ? progress.mistakes : {},
    spirits: Object.fromEntries(Object.entries(spirits).slice(0, 100).map(([key, value]) => [String(key).slice(0, 40), Math.max(1, Math.min(99, Number(value || 1)))])),
    equipped: Object.hasOwn(spirits, String(progress.equipped || 'lingling')) ? String(progress.equipped || 'lingling') : 'lingling',
    inventory: {
      hint: Math.max(0, Math.min(999, Number(progress.inventory?.hint ?? 3))),
      shuffle: Math.max(0, Math.min(999, Number(progress.inventory?.shuffle ?? 2))),
      addMoves: Math.max(0, Math.min(999, Number(progress.inventory?.addMoves ?? 1)))
    },
    tutorials: {
      match3: Boolean(progress.tutorials?.match3),
      pair: Boolean(progress.tutorials?.pair)
    },
    learnedWords: ReviewGames.normalizeLearnedWords(learnedSeed),
    review: ReviewGames.normalizeReview(progress.review),
    pet: PetSystem.normalizePetState(progress.pet),
    migrationVersion: clamp(progress.migrationVersion, 0, 2, 0),
    processedOperations: safeStringList(progress.processedOperations, 100, 100),
    processedRewards: safeStringList(progress.processedRewards, 100, 100),
    legacy: {
      xp: clamp(progress.legacy?.xp ?? progress.xp, 0, 9999999, 0),
      spirits: progress.legacy?.spirits && typeof progress.legacy.spirits === 'object'
        ? progress.legacy.spirits : { ...spirits },
      equipped: String(progress.legacy?.equipped || progress.equipped || 'lingling').slice(0, 40)
    }
  };
}
function migrateProgress(input = {}) {
  const sourceVersion = clamp(input.migrationVersion, 0, 2, 0);
  const progress = normalizeProgress(input);
  if (sourceVersion < 1) {
    progress.coins = clamp(progress.coins + progress.tickets * 80 + progress.dust * 5, 0, 999999, 0);
    progress.tickets = 0;
    progress.dust = 0;
    progress.draws = 0;
    progress.pity = 0;
  }
  if (sourceVersion < 2) {
    if (progress.pet.needsBreedSelection) {
      progress.pet.onboardingStep = onboardingForMigratedPet(progress);
    } else if (!progress.pet.speciesId) {
      progress.pet.catalogVersion = 2;
      progress.pet.onboardingStep = 'complete';
    }
  }
  progress.migrationVersion = 2;
  return normalizeProgress(progress);
}
function migrateAllUsers() {
  const db = readDb();
  let changed = false;
  db.users.forEach(user => {
    const next = migrateProgress(user.progress);
    if (JSON.stringify(next) !== JSON.stringify(user.progress)) changed = true;
    user.progress = next;
  });
  if (changed) saveDb(db);
}
function publicUser(user) {
  const { phone, passwordHash, salt, ...safe } = user;
  return { ...safe, progress: normalizeProgress(safe.progress), phoneTail: phone.slice(-4) };
}
function targetContext(req) {
  const user = requireUser(req);
  if (!user) return null;
  const db = readDb();
  const target = db.users.find(item => item.id === user.id);
  target.progress = migrateProgress(target.progress);
  return { db, target, progress: target.progress };
}
function operationKey(kind, rawId) {
  const id = String(rawId || '').trim().slice(0, 80);
  if (!id) throw new Error('操作编号无效');
  return `${kind}:${id}`;
}
function rememberOperation(progress, key) {
  progress.processedOperations = [...progress.processedOperations.filter(item => item !== key), key].slice(-100);
}
function rememberReward(progress, runId) {
  progress.processedRewards = [...progress.processedRewards.filter(item => item !== runId), runId].slice(-100);
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
migrateAllUsers();
function serveFile(res, file) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { app: APP_ID, version: APP_VERSION, ok: true });
    }
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
        progress: normalizeProgress({ stage: 1, coins: 30, tickets: 0, dust: 0, migrationVersion: 2 }), createdAt: new Date().toISOString()
      };
      db.users.push(user); saveDb(db);
      return send(res, 201, {
        ok: true,
        message: '注册成功，请使用刚才的手机号和密码登录',
        phone
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await getBody(req); const phone = String(body.phone || '').trim();
      const user = readDb().users.find(item => item.phone === phone);
      if (!user || hash(String(body.password || ''), user.salt) !== user.passwordHash) return send(res, 401, { error: '手机号或密码不正确' });
      return send(res, 200, { token: createSession(user.id), user: publicUser(user) });
    }
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
      target.progress = normalizeProgress({
        ...current,
        stage: body.stage ?? current.stage,
        xp: body.xp ?? current.xp,
        streak: body.streak ?? current.streak,
        bestCombo: body.bestCombo ?? current.bestCombo,
        collected: body.collected ?? current.collected,
        inventory: body.inventory ?? current.inventory,
        tutorials: body.tutorials ?? current.tutorials,
        mistakes
      });
      saveDb(db); return send(res, 200, { user: publicUser(target) });
    }
    if (req.method === 'POST' && url.pathname === '/api/learned-word') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req);
      const word = String(body.word || '').trim().toLowerCase();
      const zh = TEXTBOOK_CATALOG.get(word);
      if (!zh) return send(res, 400, { error: '这个单词不在当前教材词库中' });
      const result = ['correct', 'wrong', 'review'].includes(body.result) ? body.result : 'correct';
      context.progress.learnedWords = ReviewGames.recordLearnedWord(context.progress.learnedWords, word, zh, result);
      if (!context.progress.collected.includes(word)) context.progress.collected.push(word);
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target), learnedWord: context.progress.learnedWords.find(item => item.word === word) });
    }
    if (req.method === 'POST' && url.pathname === '/api/review/assign') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req);
      const level = clamp(body.level, 1, 100, context.progress.stage);
      const baseMode = [1, 2].includes(level % 4) ? 'match3' : 'pair';
      const assignment = ReviewGames.assignReviewMode(context.progress, level, baseMode);
      context.progress.review = assignment.review;
      context.target.progress = context.progress;
      saveDb(context.db);
      const words = ReviewGames.REVIEW_MODES.includes(assignment.mode)
        ? ReviewGames.selectReviewWords(context.progress.learnedWords, assignment.mode === 'spelling' ? 2 : 5)
        : [];
      return send(res, 200, { user: publicUser(context.target), mode: assignment.mode, words });
    }
    if (req.method === 'POST' && url.pathname === '/api/review/tutorial-complete') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      context.progress.review.fallingTutorialDone = true;
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target) });
    }
    if (req.method === 'POST' && url.pathname === '/api/pet/adopt') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req);
      const currentPet = context.progress.pet;
      const isReselection = currentPet.needsBreedSelection;
      if (currentPet.speciesId && !isReselection) return send(res, 409, { error: '每个账号只能领取一只小狗' });
      const dog = PetSystem.petById(body.speciesId);
      const name = String(body.name || '').trim();
      if (!dog) return send(res, 400, { error: '犬种无效' });
      if (!PetSystem.validPetName(name)) return send(res, 400, { error: '小狗名字需为1至8个中文、英文或数字' });
      const basePet = isReselection ? currentPet : {
        adoptedAt: new Date().toISOString(), growth: 0, foodInventory: {}, onboardingStep: 'earn'
      };
      context.progress.pet = PetSystem.normalizePetState({
        ...basePet,
        speciesId: dog.id,
        name,
        catalogVersion: 2,
        needsBreedSelection: false
      });
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target) });
    }
    if (req.method === 'POST' && url.pathname === '/api/pet/visit') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const pet = context.progress.pet;
      if (!pet.speciesId) return send(res, 409, { error: pet.needsBreedSelection ? '请先重新选择小狗' : '请先领取小狗' });
      const today = shanghaiDate();
      const showHungerPrompt = pet.lastFedDate !== today && pet.lastHungerPromptDate !== today;
      if (showHungerPrompt) {
        pet.lastHungerPromptDate = today;
        context.target.progress = context.progress;
        saveDb(context.db);
      }
      return send(res, 200, { user: publicUser(context.target), petVisit: { today, showHungerPrompt } });
    }
    if (req.method === 'PATCH' && url.pathname === '/api/pet/name') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const name = String(body.name || '').trim();
      if (!context.progress.pet.speciesId) return send(res, 409, { error: '请先领取宠物' });
      if (!PetSystem.validPetName(name)) return send(res, 400, { error: '宠物名字需为1至8个中文、英文或数字' });
      context.progress.pet.name = name;
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target) });
    }
    if (req.method === 'POST' && url.pathname === '/api/shop/purchase') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const key = operationKey('buy', body.operationId);
      if (context.progress.processedOperations.includes(key)) return send(res, 200, { user: publicUser(context.target), duplicate: true });
      const food = PetSystem.foodById(body.itemId);
      const tools = {
        hint: { price: 60 },
        shuffle: { price: 90 },
        addMoves: { price: 120 }
      };
      const tool = tools[String(body.itemId || '')];
      if (!food && !tool) return send(res, 400, { error: '商品不存在' });
      if (food && !context.progress.pet.speciesId) return send(res, 409, { error: '请先领取宠物' });
      if (food && context.progress.pet.level >= 10) return send(res, 409, { error: '宠物已经满级' });
      const price = food?.price || tool.price;
      if (context.progress.coins < price) return send(res, 409, { error: `金币不足，还差 ${price - context.progress.coins} 金币` });
      context.progress.coins -= price;
      if (food) {
        context.progress.pet.foodInventory[food.id] += 1;
        advancePetOnboarding(context.progress.pet, 'buy-food');
      }
      else context.progress.inventory[body.itemId] += 1;
      rememberOperation(context.progress, key);
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target), purchased: food || { id: body.itemId, ...tool } });
    }
    if (req.method === 'POST' && url.pathname === '/api/pet/feed') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const key = operationKey('feed', body.operationId);
      if (context.progress.processedOperations.includes(key)) return send(res, 200, { user: publicUser(context.target), duplicate: true });
      const food = PetSystem.foodById(body.foodId);
      if (!food) return send(res, 400, { error: '食物不存在' });
      if (!context.progress.pet.speciesId) return send(res, 409, { error: '请先领取宠物' });
      if (context.progress.pet.level >= 10) return send(res, 409, { error: '小狗已经满级，食物会继续保留在背包里' });
      if (context.progress.pet.foodInventory[food.id] <= 0) return send(res, 409, { error: '背包里没有这种食物' });
      const oldLevel = context.progress.pet.level;
      context.progress.pet.foodInventory[food.id] -= 1;
      context.progress.pet.growth = Math.min(2400, context.progress.pet.growth + food.growth);
      context.progress.pet.level = PetSystem.petLevelForGrowth(context.progress.pet.growth);
      const today = shanghaiDate();
      context.progress.pet.lastFedDate = today;
      advancePetOnboarding(context.progress.pet, 'feed');
      const newLevel = context.progress.pet.level;
      const unlockedTricks = PetSystem.tricksUnlockedBetween(oldLevel, newLevel);
      const nextTrick = PetSystem.nextTrickForLevel(newLevel);
      rememberOperation(context.progress, key);
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, {
        user: publicUser(context.target),
        feeding: {
          foodId: food.id,
          growth: food.growth,
          oldLevel,
          newLevel,
          today,
          growthRemaining: PetSystem.growthRemaining(context.progress.pet.growth),
          nextTrick,
          unlockedTrickIds: unlockedTricks.map(item => item.id)
        }
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/game/complete') {
      const context = targetContext(req); if (!context) return send(res, 401, { error: '请先登录' });
      const body = await getBody(req); const runId = String(body.runId || '').trim().slice(0, 80);
      if (!runId) return send(res, 400, { error: '关卡编号无效' });
      if (context.progress.processedRewards.includes(runId)) {
        return send(res, 200, { user: publicUser(context.target), reward: { duplicate: true, coins: 0, xp: 0 } });
      }
      const level = clamp(body.level, 1, 100, 1);
      const stars = clamp(body.stars, 1, 3, 1);
      const mode = ['match3', 'pair', 'spelling', 'falling'].includes(body.mode) ? body.mode : 'match3';
      const missionType = ['normal', 'treasure', 'boss'].includes(body.missionType) ? body.missionType : 'normal';
      const grade = Math.min(5, Math.ceil(level / 20));
      const sessionCoins = clamp(body.sessionCoins, 0, 999, 0);
      const missionCoins = missionType === 'treasure' ? 30 : missionType === 'boss' ? 20 : 0;
      const specialCoins = mode === 'spelling' ? 20 : mode === 'falling' ? 30 : 0;
      const coins = 12 + grade * 4 + stars * 4 + sessionCoins + missionCoins + specialCoins;
      const xp = 30 + grade * 8 + stars * 5 + (missionType === 'boss' ? 20 : 0);
      context.progress.stage = Math.max(context.progress.stage, Math.min(100, level + 1));
      context.progress.coins = clamp(context.progress.coins + coins, 0, 999999, 0);
      context.progress.xp = clamp(context.progress.xp + xp, 0, 9999999, 0);
      context.progress.streak += 1;
      context.progress.bestCombo = Math.max(context.progress.bestCombo, clamp(body.maxCombo, 0, 9999, 0));
      advancePetOnboarding(context.progress.pet, 'earn-coins');
      rememberReward(context.progress, runId);
      context.target.progress = context.progress;
      saveDb(context.db);
      return send(res, 200, { user: publicUser(context.target), reward: { duplicate: false, coins, xp } });
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
    if (req.method === 'GET' && url.pathname === '/pet-system.js') return serveFile(res, path.join(ROOT, 'pet-system.js'));
    if (req.method === 'GET' && url.pathname === '/review-games.js') return serveFile(res, path.join(ROOT, 'review-games.js'));
    if (req.method === 'GET' && url.pathname === '/styles.css') return serveFile(res, path.join(ROOT, 'styles.css'));
    const dogAsset = PetSystem.PETS.find(dog => dog.asset === url.pathname);
    if (req.method === 'GET' && dogAsset) return serveFile(res, path.join(ROOT, dogAsset.asset.slice(1)));
    if (req.method === 'GET' && url.pathname === '/assets/snake-countdown-bgm.mp3') return serveFile(res, path.join(ROOT, 'assets', 'snake-countdown-bgm.mp3'));
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

server.listen(PORT, '0.0.0.0', () => console.log(`单词消消养宠记试玩版正在运行：http://localhost:${PORT}`));
