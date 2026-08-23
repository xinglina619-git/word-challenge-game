# 单宠物养成与统一金币 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将旧多词灵抽卡系统替换为每账号一只、可命名、可喂养升级的学习宠物，并让食物和现有道具全部使用学习金币兑换。

**Architecture:** 新建浏览器与 Node 均可加载的 `pet-system.js`，集中保存宠物目录、语录、食物和成长纯规则；`server.js` 对领取、改名、购买、喂养、迁移和奖励结算实施服务端校验；`app.js` 只负责界面流程和动画。保留原生 JavaScript、本地 JSON 数据库和现有启动方式。

**Tech Stack:** 原生 JavaScript、Node.js `http`/`fs`、HTML/CSS、现有 VM smoke tests 与端到端认证测试。

## Global Constraints

- 每个账号只能免费领取一只宠物；领取后品类永久锁定，名字可免费修改。
- 8种宠物只在外形、性格、动作和语录上不同，不提供任何过关能力。
- 学习金币是唯一消费货币；无充值、广告、付费抽卡或真钱购买。
- 食物价格与成长值固定为：20/+10、50/+30、100/+70、180/+140。
- 宠物共10级，累计成长门槛固定为：0、60、150、280、450、680、980、1360、1830、2400。
- 宠物不饥饿、不生病、不掉级、不责备孩子。
- 保留三消、配对、星级、中英文播报、分级赞美和背景音乐。
- 旧账号每张抽卡券兑换80金币、每点星尘兑换5金币，且只转换一次。
- 不新增外部依赖，不使用网络资源，继续支持 Windows PowerShell 启动器。

---

### Task 1: 宠物目录、语录、食物和成长纯规则

**Files:**
- Create: `pet-system.js`
- Modify: `scripts/smoke_game.js`
- Modify: `index.html`
- Modify: `server.js`

**Interfaces:**
- Produces: `globalThis.PetSystem`
- Produces: `PET_IDS: string[]`
- Produces: `petById(id): PetDefinition`
- Produces: `foodById(id): FoodDefinition | null`
- Produces: `petLevelForGrowth(growth): number`
- Produces: `petStageForLevel(level): 'young' | 'growing' | 'shining' | 'best'`
- Produces: `nextGrowthTarget(level): number | null`
- Produces: `quoteFor(speciesId, scene, previous, random): string`
- Produces: `normalizePetState(input): PetState`

- [ ] **Step 1: 在 smoke test 中写失败断言**

在 `scripts/smoke_game.js` 加载 `pet-system.js`，并断言：

```js
const petSource = fs.readFileSync(path.join(root, 'pet-system.js'), 'utf8');
vm.runInContext(petSource, context, { filename: 'pet-system.js' });
const petSystem = vm.runInContext('PetSystem', context);
assert.deepStrictEqual(Array.from(petSystem.PET_IDS), [
  'lingling', 'sprout', 'bubble', 'candy',
  'spark', 'cloud', 'moon', 'rainbow'
]);
for (const id of petSystem.PET_IDS) {
  const pet = petSystem.petById(id);
  assert.ok(pet.species && pet.personality && pet.asset);
  for (const scene of ['home', 'start', 'combo', 'star1', 'star2', 'star3', 'feedBasic', 'feedPremium', 'levelUp', 'retry', 'tap']) {
    assert.ok(pet.quotes[scene].length >= 4, `${id}/${scene} 语录不足`);
  }
}
assert.strictEqual(petSystem.petLevelForGrowth(0), 1);
assert.strictEqual(petSystem.petLevelForGrowth(60), 2);
assert.strictEqual(petSystem.petLevelForGrowth(2399), 9);
assert.strictEqual(petSystem.petLevelForGrowth(2400), 10);
assert.deepStrictEqual(
  petSystem.FOODS.map(item => [item.price, item.growth]),
  [[20, 10], [50, 30], [100, 70], [180, 140]]
);
const firstQuote = petSystem.quoteFor('cloud', 'retry', '', () => 0);
const secondQuote = petSystem.quoteFor('cloud', 'retry', firstQuote, () => 0);
assert.notStrictEqual(firstQuote, secondQuote);
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `ENOENT pet-system.js` 或 `PetSystem is not defined`。

- [ ] **Step 3: 实现 `pet-system.js`**

使用无依赖全局模块结构：

```js
(function exposePetSystem(root) {
  const LEVEL_THRESHOLDS = [0, 60, 150, 280, 450, 680, 980, 1360, 1830, 2400];
  const FOODS = Object.freeze([
    { id: 'starBiscuit', name: '星星饼干', price: 20, growth: 10, quoteScene: 'feedBasic' },
    { id: 'fruitCup', name: '鲜果杯', price: 50, growth: 30, quoteScene: 'feedBasic' },
    { id: 'nutritionMeal', name: '营养套餐', price: 100, growth: 70, quoteScene: 'feedPremium' },
    { id: 'celebrationCake', name: '庆典蛋糕', price: 180, growth: 140, quoteScene: 'feedPremium' }
  ]);

  const PETS = Object.freeze(buildCompletePetCatalog());

  function petById(id) { return PETS.find(item => item.id === id) || null; }
  function foodById(id) { return FOODS.find(item => item.id === id) || null; }
  function petLevelForGrowth(value) {
    const growth = Math.max(0, Math.min(2400, Number(value) || 0));
    let level = 1;
    LEVEL_THRESHOLDS.forEach((threshold, index) => { if (growth >= threshold) level = index + 1; });
    return level;
  }
  function petStageForLevel(value) {
    const level = Math.max(1, Math.min(10, Number(value) || 1));
    return level === 10 ? 'best' : level >= 7 ? 'shining' : level >= 4 ? 'growing' : 'young';
  }
  function nextGrowthTarget(level) { return level >= 10 ? null : LEVEL_THRESHOLDS[level]; }
  function quoteFor(speciesId, scene, previous = '', random = Math.random) {
    const list = petById(speciesId)?.quotes?.[scene] || [];
    const choices = list.filter(line => line !== previous);
    const source = choices.length ? choices : list;
    return source[Math.floor(random() * source.length)] || '';
  }
  function normalizePetState(input = {}) {
    const speciesId = petById(input.speciesId)?.id || '';
    const growth = Math.max(0, Math.min(2400, Number(input.growth) || 0));
    return {
      speciesId,
      name: speciesId ? String(input.name || petById(speciesId).name).trim().slice(0, 8) : '',
      adoptedAt: speciesId ? String(input.adoptedAt || '') : '',
      growth,
      level: petLevelForGrowth(growth),
      foodInventory: Object.fromEntries(FOODS.map(food => [food.id, Math.max(0, Math.min(999, Number(input.foodInventory?.[food.id]) || 0))]))
    };
  }

  const api = Object.freeze({ PETS, PET_IDS: PETS.map(item => item.id), FOODS, LEVEL_THRESHOLDS, petById, foodById, petLevelForGrowth, petStageForLevel, nextGrowthTarget, quoteFor, normalizePetState });
  root.PetSystem = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : window);
```

`buildCompletePetCatalog()` 按设计说明第5节写入8个完整对象：每种包含 `id/name/species/personality/asset/slogan/quotes`；`quotes` 完整覆盖测试列出的11个场景，每个场景至少4句。把脚本放在 `curriculum.js` 后、`app.js` 前加载；`server.js` 使用 `require('./pet-system')` 读取同一规则，避免服务端复制价格和门槛。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... pet=PASS economy=PASS`。

- [ ] **Step 5: 提交**

```powershell
git add pet-system.js index.html server.js scripts/smoke_game.js
git commit -m "feat(pet): add pet catalog and growth rules"
```

### Task 2: 服务端一次性领取、迁移、购买、喂养与幂等奖励

**Files:**
- Modify: `server.js`
- Modify: `scripts/auth_flow_test.js`
- Modify: `scripts/smoke_game.js`

**Interfaces:**
- Consumes: `PetSystem.petById`, `foodById`, `normalizePetState`, `petLevelForGrowth`
- Produces: `POST /api/pet/adopt`
- Produces: `PATCH /api/pet/name`
- Produces: `POST /api/shop/purchase`
- Produces: `POST /api/pet/feed`
- Produces: `POST /api/game/complete`
- Produces: migration version `1`

- [ ] **Step 1: 扩展认证流程测试并先失败**

在 `scripts/auth_flow_test.js` 注册独立账号后执行：

```js
const adopted = await api('/api/pet/adopt', {
  method: 'POST', token,
  body: { speciesId: 'cloud', name: '团团' }
});
assert.strictEqual(adopted.user.progress.pet.speciesId, 'cloud');
assert.strictEqual(adopted.user.progress.pet.name, '团团');

const duplicate = await apiRaw('/api/pet/adopt', {
  method: 'POST', token,
  body: { speciesId: 'spark', name: '火火' }
});
assert.strictEqual(duplicate.status, 409);

const renamed = await api('/api/pet/name', { method: 'PATCH', token, body: { name: '云宝' } });
assert.strictEqual(renamed.user.progress.pet.speciesId, 'cloud');
assert.strictEqual(renamed.user.progress.pet.name, '云宝');

const beforeCoins = renamed.user.progress.coins;
const bought = await api('/api/shop/purchase', { method: 'POST', token, body: { itemId: 'starBiscuit', operationId: 'buy-1' } });
assert.strictEqual(bought.user.progress.coins, beforeCoins - 20);
assert.strictEqual(bought.user.progress.pet.foodInventory.starBiscuit, 1);
const duplicateBuy = await api('/api/shop/purchase', { method: 'POST', token, body: { itemId: 'starBiscuit', operationId: 'buy-1' } });
assert.strictEqual(duplicateBuy.user.progress.coins, bought.user.progress.coins);

const fed = await api('/api/pet/feed', { method: 'POST', token, body: { foodId: 'starBiscuit', operationId: 'feed-1' } });
assert.strictEqual(fed.user.progress.pet.growth, 10);
assert.strictEqual(fed.user.progress.pet.foodInventory.starBiscuit, 0);
```

再增加：无效品类、空名字、金币不足、库存不足、满级不消耗食物、旧票券/星尘只转换一次、同一 `runId` 只发一次奖励等断言。

- [ ] **Step 2: 运行并确认 RED**

Run: `node scripts/auth_flow_test.js`

Expected: FAIL，首个新接口返回404。

- [ ] **Step 3: 扩展进度规范化与迁移**

`normalizeProgress` 增加：

```js
pet: PetSystem.normalizePetState(progress.pet),
migrationVersion: Math.max(0, Math.min(1, Number(progress.migrationVersion) || 0)),
legacy: {
  xp: Math.max(0, Number(progress.legacy?.xp ?? progress.xp ?? 0)),
  spirits: progress.legacy?.spirits || progress.spirits || {},
  equipped: String(progress.legacy?.equipped || progress.equipped || '')
},
processedOperations: Array.isArray(progress.processedOperations)
  ? progress.processedOperations.slice(-100).map(String)
  : [],
processedRewards: Array.isArray(progress.processedRewards)
  ? progress.processedRewards.slice(-100).map(String)
  : []
```

迁移函数在版本小于1时执行：

```js
function migratePetEconomy(progress) {
  if (progress.migrationVersion >= 1) return progress;
  progress.coins += progress.tickets * 80 + progress.dust * 5;
  progress.tickets = 0;
  progress.dust = 0;
  progress.migrationVersion = 1;
  return progress;
}
```

新注册账号使用 `{ stage: 1, coins: 30, tickets: 0, dust: 0 }`。

- [ ] **Step 4: 实现服务端操作**

每个写接口读取最新数据库记录、规范化、校验、写回并返回 `publicUser`。购买接口只读取 `PetSystem.FOODS` 和固定道具表中的价格，忽略客户端价格。`operationId` 已处理时直接返回当前用户而不重复扣款。关卡结算接口根据服务端公式计算奖励并记录 `runId`。

通用 `/api/progress` 不接受以下客户端覆盖：`coins`、`pet`、`migrationVersion`、`processedOperations`、`processedRewards`、`legacy`。

- [ ] **Step 5: 运行聚焦测试并确认 GREEN**

Run: `node scripts/auth_flow_test.js`

Expected: `AUTH_FLOW=PASS ... pet=PASS shop=PASS feed=PASS migration=PASS idempotency=PASS`。

- [ ] **Step 6: 提交**

```powershell
git add server.js scripts/auth_flow_test.js scripts/smoke_game.js
git commit -m "feat(server): enforce pet and coin economy"
```

### Task 3: 宠物领取、宠物之家、统一商店与学习反馈界面

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `scripts/smoke_game.js`
- Modify: `scripts/launcher_test.ps1`

**Interfaces:**
- Consumes: `PetSystem` 与 Task 2 的5个服务端接口
- Produces: `petStoreView()`, `petHomeView()`, `petSpeech(scene)`, `buyShopItem(id)`, `feedPet(id)`, `adoptPet(id, name)`, `renamePet(name)`

- [ ] **Step 1: 写界面结构失败测试**

在 smoke test 中断言：

```js
assert.ok(source.includes('function petStoreView('));
assert.ok(source.includes('function petHomeView('));
assert.ok(source.includes("data-action=\"pet-home\""));
assert.ok(source.includes("data-action=\"adopt-pet\""));
assert.ok(source.includes("data-action=\"feed-pet\""));
assert.ok(!source.includes('免费成长抽卡'));
assert.ok(!source.includes('词灵图鉴'));
assert.ok(styles.includes('.pet-speech-bubble'));
assert.ok(styles.includes('.pet-growth-bar'));
assert.ok(styles.includes('.food-shop-grid'));
```

更新启动器测试期望的新 `app.js`、`styles.css` 和 `pet-system.js` 缓存版本。

- [ ] **Step 2: 运行并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误指向 `petStoreView` 不存在。

- [ ] **Step 3: 替换旧抽卡和图鉴入口**

首页未领取时显示宠物领取主按钮；已领取时显示宠物名字、品类、等级、成长进度和具体目标。底部导航保留学习相关入口，把抽卡/图鉴替换为宠物之家/金币商店。

`petStoreView()` 在未领取时展示8种宠物卡片、预览和二次确认；领取后只展示当前宠物信息，不提供换品类按钮。`petHomeView()` 展示食物背包、喂养、免费改名和互动。

- [ ] **Step 4: 实现统一商店与乐观回滚**

食品和道具使用同一商店页面分区。操作流程：按钮禁用、请求服务端、成功后替换 `state.user`、失败后恢复按钮并显示明确错误。满级时所有食物购买和喂养按钮显示“已满级”并禁用，道具仍可购买。

- [ ] **Step 5: 接入宠物语录和学习反馈**

使用 `petSpeech(scene)` 记录上一句并替换 `{name}`。在首页、开始、二/三连击、星级结算、喂养、升级、失败和点击互动时选择对应场景。游戏中语录只显示气泡，不进入 SpeechSynthesis 队列；原赞美语音与单词播报保持现状。

- [ ] **Step 6: 更新样式与响应式布局**

宠物领取卡、宠物之家、成长条、语录气泡和食品商店在390×844与桌面尺寸无横向溢出。游戏内宠物位于棋盘外，使用 `pointer-events:none`，不遮挡选项。

- [ ] **Step 7: 运行聚焦与全量测试**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... pet=PASS economy=PASS`。

Run: `npm test`

Expected: GAME、AUTH、LAUNCHER全部 PASS。

Run: `npm run check`

Expected: exit 0。

- [ ] **Step 8: 真实浏览器验收**

在临时端口启动服务，使用390×844和桌面视口完成：旧资源迁移、8种预览、领取云朵兽、二次领取失败、改名、学习赚币、购买4种食物与3种道具、喂养跨级、刷新后状态保留、满级禁用食物。记录控制台错误为0并关闭临时服务。

- [ ] **Step 9: 提交**

```powershell
git add app.js styles.css index.html README.md scripts/smoke_game.js scripts/launcher_test.ps1
git commit -m "feat(ui): add single learning pet experience"
```
