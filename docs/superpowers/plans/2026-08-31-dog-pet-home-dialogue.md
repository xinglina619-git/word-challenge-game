# 《单词消消养宠记》小狗宠物屋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有八词灵宠物系统升级为六犬种、仅宠物屋出现、具有每日温柔提醒、新手养宠任务、喂食升级反馈和九级纯展示特技的《单词消消养宠记》，并保证旧账号无损迁移。

**Architecture:** 保留原生 JavaScript、Node HTTP 服务和 JSON 存档结构。`pet-system.js` 提供无副作用的犬种、成长、语录、特技和规范化规则；`server.js` 负责迁移、每日状态、任务推进和幂等写入；`app.js` 只渲染服务端已确认的数据，并把小狗严格限制在领取页和宠物屋。六套 2×2 透明姿态图由图片生成技能创建，CSS 用姿态切换和轻量变换组合九种表演。

**Tech Stack:** 原生 JavaScript、Node.js 内置模块、HTML、CSS、现有 VM 烟雾测试、现有端到端接口测试、Playwright 真实浏览器检查、内置图片生成工具。

## Global Constraints

- 游戏面向用户的名称统一为《单词消消养宠记》，内部 `word-spirit-planet` 标识、令牌键和接口路径保持兼容。
- 六种犬种固定为贵宾犬、哈士奇、藏獒、金毛寻回犬、柯基犬、柴犬；所有犬种价格、成长速度、特技和能力相同。
- 新用户领取名字输入框为空且必须自行命名；旧用户一次性重选时预填旧名字。
- 小狗形象和小狗台词只允许出现在领取页和宠物屋；主页、关卡列表、关卡介绍、全部玩法和结算页不得出现。
- 每日提醒按 `Asia/Shanghai` 自然日计算，每天最多一次，不增加饥饿值、生病、掉级或任何惩罚。
- 特技只在宠物屋展示，不改变分数、金币、步数、提示次数或关卡难度。
- Lv.10 后不再消耗食物，食物保留在背包，点击改为满级摸摸互动。
- 老用户重选犬种时必须保留名字、首次领取时间、成长、等级、金币、食物、道具、关卡、星级、错词和已学单词。
- 现有四种食物价格和成长值、十级门槛、三消、配对、拼写、落体、登录、商店和启动器行为保持兼容。
- 所有设计说明、计划、用户文案和新增解释性注释使用简体中文；不推送远端。

---

### Task 1: 六犬种、每日语录、成长差值与特技纯规则

**Files:**
- Modify: `pet-system.js:1-131`
- Modify: `app.js:415-421`
- Modify: `app.js:1615-1629`
- Modify: `scripts/smoke_game.js:61-82`
- Modify: `scripts/smoke_game.js:294-324`
- Modify: `scripts/auth_flow_test.js:152-184`

**Interfaces:**
- Consumes: 现有 `LEVEL_THRESHOLDS`、`FOODS`、`validPetName(value)`。
- Produces: `PETS`、`PET_IDS`、`TRICKS`、`LEGACY_PET_IDS`、`petById(id)`、`trickById(id)`、`nextTrickForLevel(level)`、`unlockedTricks(level)`、`tricksUnlockedBetween(oldLevel, newLevel)`、`growthRemaining(growth)`、`feedingGoal(feeding)`、`quoteFor(speciesId, scene, previous, random)`、`normalizePetState(input)`。

- [ ] **Step 1: 先把旧目录断言改成六犬种和特技断言**

在 `scripts/smoke_game.js` 替换现有八词灵断言，并在成长门槛断言后加入：

```js
if (Array.from(petSystem.PET_IDS).join(',') !== 'poodle,husky,tibetanMastiff,goldenRetriever,corgi,shibaInu') {
  throw new Error('六犬种目录不完整');
}
for (const id of petSystem.PET_IDS) {
  const dog = petSystem.petById(id);
  if (!dog?.species || !dog?.personality || !dog?.asset) throw new Error(`${id} 犬种资料不完整`);
  if (Object.hasOwn(dog, 'name')) throw new Error(`${id} 不应提供系统默认宠物名`);
  for (const scene of petSystem.QUOTE_SCENES) {
    if (!Array.isArray(dog.quotes?.[scene]) || dog.quotes[scene].length < 4) throw new Error(`${id}/${scene} 语录不足`);
  }
}
if (petSystem.TRICKS.length !== 9 || petSystem.TRICKS.map(item => item.level).join(',') !== '2,3,4,5,6,7,8,9,10') {
  throw new Error('Lv.2 至 Lv.10 特技映射不完整');
}
if (petSystem.nextTrickForLevel(4)?.name !== '握手' || petSystem.unlockedTricks(5).at(-1)?.name !== '握手') {
  throw new Error('下一特技或已解锁特技计算错误');
}
if (petSystem.growthRemaining(250) !== 30 || petSystem.growthRemaining(2400) !== 0) {
  throw new Error('距离升级成长值计算错误');
}
const unlocked = petSystem.tricksUnlockedBetween(3, 6).map(item => item.name).join(',');
if (unlocked !== '转圈圈,握手,打滚') throw new Error('跨级特技解锁计算错误');
const pendingLegacy = petSystem.normalizePetState({
  speciesId: 'cloud', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }
});
if (!pendingLegacy.needsBreedSelection || pendingLegacy.speciesId || pendingLegacy.name !== '小云' || pendingLegacy.growth !== 70 || pendingLegacy.foodInventory.starBiscuit !== 2) {
  throw new Error('旧宠物规范化丢失养成数据');
}
const firstHunger = petSystem.quoteFor('corgi', 'hunger', '', () => 0);
const secondHunger = petSystem.quoteFor('corgi', 'hunger', firstHunger, () => 0);
if (!firstHunger || firstHunger === secondHunger) throw new Error('每日提醒语录没有避免连续重复');
```

- [ ] **Step 2: 运行烟雾测试，确认它因旧目录失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `六犬种目录不完整`。

- [ ] **Step 3: 用六犬种目录和宠物屋专用语录替换旧目录**

在 `pet-system.js` 使用以下常量。对象不得增加默认 `name` 字段：

```js
const LEGACY_PET_IDS = Object.freeze(['lingling', 'sprout', 'bubble', 'candy', 'spark', 'cloud', 'moon', 'rainbow']);
const QUOTE_SCENES = Object.freeze(['welcome', 'hunger', 'feedBasic', 'feedPremium', 'levelUp', 'tap', 'maxLevel']);
const PET_SEEDS = Object.freeze([
  { id: 'poodle', species: '贵宾犬', personality: '聪明、亲人', asset: '/assets/dogs/poodle-poses.png', cue: '小卷毛', mood: '开心' },
  { id: 'husky', species: '哈士奇', personality: '活泼、好奇', asset: '/assets/dogs/husky-poses.png', cue: '亮眼睛', mood: '神气' },
  { id: 'tibetanMastiff', species: '藏獒', personality: '稳重、勇敢', asset: '/assets/dogs/tibetan-mastiff-poses.png', cue: '暖鬃毛', mood: '安心' },
  { id: 'goldenRetriever', species: '金毛寻回犬', personality: '温柔、可靠', asset: '/assets/dogs/golden-retriever-poses.png', cue: '金耳朵', mood: '温暖' },
  { id: 'corgi', species: '柯基犬', personality: '热情、机灵', asset: '/assets/dogs/corgi-poses.png', cue: '小短腿', mood: '有精神' },
  { id: 'shibaInu', species: '柴犬', personality: '独立、可爱', asset: '/assets/dogs/shiba-inu-poses.png', cue: '卷尾巴', mood: '满足' }
]);

function buildQuotes(seed) {
  return Object.freeze({
    welcome: Object.freeze([`我的${seed.cue}已经准备好啦！`, '谢谢你选择我，我们会成为好朋友！', '这里就是我们的宠物屋啦！', '以后请多多关照，我会陪你一起成长！']),
    hunger: Object.freeze(['主人，我的肚子咕咕叫啦。', '我有一点点饿，可以陪我吃点东西吗？', `我的${seed.cue}在提醒我该吃饭啦。`, '闻到香香的味道，我想吃一小口啦！']),
    feedBasic: Object.freeze(['谢谢主人，这一口真香！', `吃完点心，我感觉${seed.mood}极了！`, '肚子和心情都暖暖的。', '我吃得好饱呀！', '谢谢你认真学习换来的点心！', '吃饱啦，我想去散散步！']),
    feedPremium: Object.freeze(['哇，好丰盛的大餐，谢谢主人！', '成长能量满满，我想跳起来啦！', `我的${seed.cue}都开心起来啦！`, '吃得好满足，我要睡个香香的午觉！', '这顿饭让我充满了力量！', '谢谢你一直这么认真地照顾我！']),
    levelUp: Object.freeze(['我升级啦，快看我的新特技！', '我们的努力变成新的本领啦！', '长大一点点，也开心一大步！', '谢谢主人，我学会新动作啦！']),
    tap: Object.freeze(['我听见你来找我啦！', `摸摸${seed.cue}，今天也很开心！`, '我在宠物屋等你回来呢。', '要不要看看我学会的特技？']),
    maxLevel: Object.freeze(['我已经长大啦，谢谢主人一直陪着我！', '所有特技都学会啦，摸摸我吧！', '我们是最棒的学习伙伴！', '食物留在背包里，今天陪我玩一会儿吧！'])
  });
}

const PETS = Object.freeze(PET_SEEDS.map(seed => Object.freeze({
  id: seed.id,
  species: seed.species,
  personality: seed.personality,
  asset: seed.asset,
  quotes: buildQuotes(seed)
})));
```

- [ ] **Step 4: 增加九个特技和成长反馈纯函数**

在 `pet-system.js` 的食物定义后加入：

```js
const TRICKS = Object.freeze([
  Object.freeze({ id: 'tailWelcome', level: 2, name: '摇尾欢迎', pose: 'stand', animation: 'wag', effect: 'hearts' }),
  Object.freeze({ id: 'happyBounce', level: 3, name: '开心蹦跳', pose: 'stand', animation: 'bounce', effect: 'stars' }),
  Object.freeze({ id: 'spin', level: 4, name: '转圈圈', pose: 'stand', animation: 'spin', effect: 'stars' }),
  Object.freeze({ id: 'shakePaw', level: 5, name: '握手', pose: 'paw', animation: 'paw', effect: 'hearts' }),
  Object.freeze({ id: 'rollOver', level: 6, name: '打滚', pose: 'stand', animation: 'roll', effect: 'stars' }),
  Object.freeze({ id: 'chaseTail', level: 7, name: '追尾巴', pose: 'stand', animation: 'chase', effect: 'paws' }),
  Object.freeze({ id: 'dance', level: 8, name: '跳舞', pose: 'paw', animation: 'dance', effect: 'stars' }),
  Object.freeze({ id: 'takeWalk', level: 9, name: '散步出发', pose: 'walk', animation: 'walk', effect: 'paws' }),
  Object.freeze({ id: 'sleepWell', level: 10, name: '安心睡觉', pose: 'sleep', animation: 'sleep', effect: 'sleep' })
]);

function trickById(id) { return TRICKS.find(item => item.id === String(id || '')) || null; }
function nextTrickForLevel(level) {
  const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
  return TRICKS.find(item => item.level > safeLevel) || null;
}
function unlockedTricks(level) {
  const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
  return TRICKS.filter(item => item.level <= safeLevel);
}
function tricksUnlockedBetween(oldLevel, newLevel) {
  const before = Math.max(1, Number(oldLevel) || 1);
  const after = Math.max(before, Math.min(10, Number(newLevel) || before));
  return TRICKS.filter(item => item.level > before && item.level <= after);
}
function growthRemaining(growth) {
  const safeGrowth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(growth) || 0));
  const level = petLevelForGrowth(safeGrowth);
  const target = nextGrowthTarget(level);
  return target === null ? 0 : target - safeGrowth;
}
function feedingGoal(feeding = {}) {
  const oldLevel = Math.max(1, Number(feeding.oldLevel) || 1);
  const newLevel = Math.max(oldLevel, Math.min(10, Number(feeding.newLevel) || oldLevel));
  const unlocked = tricksUnlockedBetween(oldLevel, newLevel);
  if (unlocked.length) {
    const latest = unlocked.at(-1);
    return unlocked.length === 1
      ? `我升到 Lv.${newLevel} 啦，已经学会${latest.name}！`
      : `我升到 Lv.${newLevel} 啦，这次解锁了 ${unlocked.length} 个新特技！`;
  }
  const next = nextTrickForLevel(newLevel);
  return next ? `再获得 ${Math.max(0, Number(feeding.growthRemaining) || 0)} 成长值，我就能升到 Lv.${next.level}，学会${next.name}啦！` : '';
}
```

- [ ] **Step 5: 让规范化函数保留旧宠物并增加每日字段**

用以下返回结构替换 `normalizePetState(input)`；日期仅接受 `YYYY-MM-DD`：

```js
function normalizePetState(input = {}) {
  const dog = petById(input.speciesId);
  const rawLegacyId = String(input.legacySpeciesId || (!dog ? input.speciesId : '') || '');
  const legacySpeciesId = LEGACY_PET_IDS.includes(rawLegacyId) ? rawLegacyId : '';
  const requestedName = String(input.name || '').trim();
  const growth = Math.max(0, Math.min(LEVEL_THRESHOLDS.at(-1), Number(input.growth) || 0));
  const hasOldPet = Boolean(dog || legacySpeciesId || input.needsBreedSelection || input.adoptedAt || validPetName(requestedName));
  const dateValue = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  const onboardingStep = ['earn', 'buy', 'feed', 'complete'].includes(input.onboardingStep)
    ? input.onboardingStep
    : hasOldPet ? 'earn' : 'complete';
  return {
    speciesId: dog?.id || '',
    name: hasOldPet && validPetName(requestedName) ? requestedName : '',
    adoptedAt: hasOldPet ? String(input.adoptedAt || '').slice(0, 40) : '',
    growth,
    level: petLevelForGrowth(growth),
    foodInventory: Object.fromEntries(FOODS.map(food => [
      food.id,
      Math.max(0, Math.min(999, Number(input.foodInventory?.[food.id]) || 0))
    ])),
    catalogVersion: dog ? 2 : Math.max(0, Math.min(2, Number(input.catalogVersion) || 0)),
    needsBreedSelection: Boolean(!dog && (legacySpeciesId || input.needsBreedSelection)),
    onboardingStep,
    lastFedDate: dateValue(input.lastFedDate),
    lastHungerPromptDate: dateValue(input.lastHungerPromptDate),
    legacySpeciesId
  };
}
```

冻结导出对象使用完整清单：

```js
return Object.freeze({
  LEVEL_THRESHOLDS,
  QUOTE_SCENES,
  FOODS,
  PETS,
  PET_IDS,
  TRICKS,
  LEGACY_PET_IDS,
  petById,
  foodById,
  trickById,
  petLevelForGrowth,
  petStageForLevel,
  nextGrowthTarget,
  nextTrickForLevel,
  unlockedTricks,
  tricksUnlockedBetween,
  growthRemaining,
  feedingGoal,
  quoteFor,
  validPetName,
  normalizePetState
});
```

- [ ] **Step 6: 同步现有领取页和旧测试，使目录切换后应用仍可运行**

在 `spiritFigure()` 中把无障碍名称改为 `spirit.species || spirit.name || '学习伙伴'`。在现有 `petStoreView()` 中把标题改为“6种小狗，只领取其中一只”，卡片标题使用 `spirit.species`，新用户名字输入值固定为空，只有 `p.pet.needsBreedSelection` 时才预填 `p.pet.name`：

```js
const initialPetName = p.pet.needsBreedSelection ? p.pet.name : '';
// 名字输入框
value="${esc(initialPetName)}"
```

把烟雾测试中的宠物商店数量从 8 改为 6，已领取测试数据从 `cloud` 改为 `corgi`。把接口测试中的 `cloud`/`spark` 分别改为 `poodle`/`husky`，对应断言同步改为新标识。这一步只保证目录切换期间现有页面和接口不崩溃；完整重选说明、空名字提示和新宠物屋在 Tasks 4-5 完成。

- [ ] **Step 7: 运行完整现有测试，确认目录切换没有制造中间态回归**

Run: `npm test`

Expected: `GAME_SMOKE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`；六犬种、特技、成长差值、旧状态保留和语录断言通过。

- [ ] **Step 8: 提交纯规则任务**

```powershell
git add pet-system.js app.js scripts/smoke_game.js scripts/auth_flow_test.js
git commit -m "feat(pet): add dog catalog and trick rules"
```

---

### Task 2: 生成六套透明小狗姿态素材并做项目内验证

**Files:**
- Create: `assets/dogs/poodle-poses.png`
- Create: `assets/dogs/husky-poses.png`
- Create: `assets/dogs/tibetan-mastiff-poses.png`
- Create: `assets/dogs/golden-retriever-poses.png`
- Create: `assets/dogs/corgi-poses.png`
- Create: `assets/dogs/shiba-inu-poses.png`
- Modify: `scripts/smoke_game.js:99-108`

**Interfaces:**
- Consumes: Task 1 中每个犬种的 `asset` 路径。
- Produces: 六张 1024×1024 的透明 2×2 姿态图；象限固定为左上站立、右上抬爪、左下走动、右下睡觉。

- [ ] **Step 1: 使用 imagegen 技能前完整读取其 `SKILL.md`**

Run: `Get-Content -Raw -Encoding UTF8 C:\Users\86138\.codex\skills\.system\imagegen\SKILL.md`

Expected: 完整读到文件结尾，并按项目素材流程使用内置图片生成工具、保存最终文件、逐张视觉检查。

- [ ] **Step 2: 先增加素材存在性失败测试**

在 `scripts/smoke_game.js` 读取样式前加入：

```js
for (const asset of [
  'poodle-poses.png', 'husky-poses.png', 'tibetan-mastiff-poses.png',
  'golden-retriever-poses.png', 'corgi-poses.png', 'shiba-inu-poses.png'
]) {
  const assetPath = path.join(root, 'assets', 'dogs', asset);
  if (!fs.existsSync(assetPath)) throw new Error(`小狗素材缺失：${asset}`);
  if (fs.statSync(assetPath).size < 20_000) throw new Error(`小狗素材文件异常：${asset}`);
}
```

- [ ] **Step 3: 运行测试确认素材缺失**

Run: `node scripts/smoke_game.js`

Expected: FAIL，第一条错误为 `小狗素材缺失：poodle-poses.png`。

- [ ] **Step 4: 使用内置图片生成工具分别生成六张姿态图**

每次生成均使用 `stylized-concept`，要求真实透明背景，并保存到对应项目路径。六条最终提示词如下：

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable apricot toy poodle in four consistent full-body poses.
Subject: The same poodle in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, fur color and proportions in all four poses; no text, labels, grid lines, accessories, props, shadows, border or watermark.
```

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable gray-and-white Siberian husky in four consistent full-body poses.
Subject: The same friendly husky with clear gray-white face markings and upright ears in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, markings and proportions in all four poses; friendly expression; no text, labels, grid lines, accessories, props, shadows, border or watermark.
```

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable dark-brown Tibetan mastiff in four consistent full-body poses.
Subject: The same friendly Tibetan mastiff with a soft rounded mane in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, mane and proportions in all four poses; gentle smiling child-friendly expression; no bared teeth, aggression, chain, text, labels, grid lines, accessories, props, shadows, border or watermark.
```

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable warm-golden golden retriever in four consistent full-body poses.
Subject: The same friendly golden retriever with floppy ears and a gentle smile in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, fur color and proportions in all four poses; no text, labels, grid lines, accessories, props, shadows, border or watermark.
```

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable fawn-and-white Pembroke Welsh corgi in four consistent full-body poses.
Subject: The same friendly short-legged corgi with large upright ears in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, coat pattern, short legs and proportions in all four poses; no text, labels, grid lines, accessories, props, shadows, border or watermark.
```

```text
Use case: stylized-concept
Asset type: 2x2 game pet pose sheet for children
Primary request: Create one adorable red-and-cream Shiba Inu in four consistent full-body poses.
Subject: The same friendly Shiba Inu with cream muzzle, upright ears and curled tail in every quadrant; top-left standing front three-quarter view, top-right sitting and raising one paw, bottom-left taking a small walking step, bottom-right curled up sleeping.
Style/medium: simple polished 2D children's sticker illustration, rounded proportions, warm colors, thick clean dark-brown outline.
Composition/framing: exact 2x2 equal grid, one centered pose per quadrant, equal scale and generous transparent padding.
Constraints: genuinely transparent background; same face, coat colors, curled tail and proportions in all four poses; no text, labels, grid lines, accessories, props, shadows, border or watermark.
```

- [ ] **Step 5: 逐张检查并仅做单一目标返修**

对六张项目内文件逐一使用本地图片查看工具。每张必须满足：四象限无串位、同一只狗身份一致、犬种可辨认、透明背景、无文字和水印、睡姿没有被裁切。若一张不合格，只对该张用“保持其余不变，只修复具体问题”的单项提示重新生成。

- [ ] **Step 6: 运行素材烟雾测试**

Run: `node scripts/smoke_game.js`

Expected: 六个素材文件存在性和文件大小断言通过。

- [ ] **Step 7: 提交素材任务**

```powershell
git add assets/dogs scripts/smoke_game.js
git commit -m "feat(pet): add six cartoon dog pose sheets"
```

---

### Task 3: 服务端版本 2 迁移、每日提醒、任务推进和喂食结果

**Files:**
- Modify: `server.js:10-137`
- Modify: `server.js:302-401`
- Modify: `scripts/auth_flow_test.js:122-218`
- Modify: `启动词灵星球.ps1:4-8`

**Interfaces:**
- Consumes: Task 1 的 `normalizePetState`、`growthRemaining`、`nextTrickForLevel`、`tricksUnlockedBetween`。
- Produces: `progress.migrationVersion=2`、`POST /api/pet/adopt` 的首次领取/一次性重选双模式、`POST /api/pet/visit`、购买/过关/喂食任务推进、扩展后的 `feeding` 响应。

- [ ] **Step 1: 先把接口测试改为版本 2 行为**

在登录断言处把迁移版本改为 2，并用以下流程替换旧宠物领取、购买、喂养断言：

```js
assert.strictEqual(loggedIn.body.user.progress.migrationVersion, 2);
assert.strictEqual((await request('POST', '/api/pet/adopt', { speciesId: 'invalid', name: '坏坏' }, originalToken)).status, 400);
assert.strictEqual((await request('POST', '/api/pet/adopt', { speciesId: 'poodle', name: '' }, originalToken)).status, 400);

const adopted = await request('POST', '/api/pet/adopt', { speciesId: 'poodle', name: '团团' }, originalToken);
assert.strictEqual(adopted.status, 200);
assert.strictEqual(adopted.body.user.progress.pet.speciesId, 'poodle');
assert.strictEqual(adopted.body.user.progress.pet.name, '团团');
assert.strictEqual(adopted.body.user.progress.pet.catalogVersion, 2);
assert.strictEqual(adopted.body.user.progress.pet.onboardingStep, 'earn');
assert.strictEqual((await request('POST', '/api/pet/adopt', { speciesId: 'husky', name: '火火' }, originalToken)).status, 409);

const firstVisit = await request('POST', '/api/pet/visit', {}, originalToken);
const secondVisit = await request('POST', '/api/pet/visit', {}, originalToken);
assert.strictEqual(firstVisit.body.petVisit.showHungerPrompt, true);
assert.strictEqual(secondVisit.body.petVisit.showHungerPrompt, false);

const earned = await request('POST', '/api/game/complete', {
  runId: 'pet-onboarding-earn', level: 1, mode: 'match3', stars: 3, missionType: 'normal', sessionCoins: 0, maxCombo: 0
}, originalToken);
assert.strictEqual(earned.body.user.progress.pet.onboardingStep, 'buy');

const bought = await request('POST', '/api/shop/purchase', { itemId: 'starBiscuit', operationId: 'buy-1' }, originalToken);
assert.strictEqual(bought.status, 200);
assert.strictEqual(bought.body.user.progress.pet.onboardingStep, 'feed');
assert.strictEqual(bought.body.user.progress.pet.foodInventory.starBiscuit, 1);

const fed = await request('POST', '/api/pet/feed', { foodId: 'starBiscuit', operationId: 'feed-1' }, originalToken);
assert.strictEqual(fed.status, 200);
assert.strictEqual(fed.body.user.progress.pet.onboardingStep, 'complete');
assert.strictEqual(fed.body.user.progress.pet.lastFedDate, fed.body.feeding.today);
assert.strictEqual(fed.body.feeding.growthRemaining, 50);
assert.strictEqual(fed.body.feeding.nextTrick.id, 'tailWelcome');
assert.deepStrictEqual(fed.body.feeding.unlockedTrickIds, []);
const afterFeedVisit = await request('POST', '/api/pet/visit', {}, originalToken);
assert.strictEqual(afterFeedVisit.body.petVisit.showHungerPrompt, false);
```

在重启迁移段构造旧词灵宠物，并在重选前后保存快照：

```js
legacyUser.progress.pet = {
  speciesId: 'cloud', name: '云宝', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2, fruitCup: 1, nutritionMeal: 0, celebrationCake: 0 }
};
legacyUser.progress.migrationVersion = 1;
const preserved = {
  coins: legacyUser.progress.coins,
  inventory: legacyUser.progress.inventory,
  stage: legacyUser.progress.stage,
  mistakes: legacyUser.progress.mistakes,
  learnedWords: legacyUser.progress.learnedWords,
  pet: { name: '云宝', adoptedAt: legacyUser.progress.pet.adoptedAt, growth: 70, foodInventory: legacyUser.progress.pet.foodInventory }
};
```

重启后加入：

```js
const pending = await request('GET', '/api/me', null, originalToken);
assert.strictEqual(pending.body.user.progress.migrationVersion, 2);
assert.strictEqual(pending.body.user.progress.pet.speciesId, '');
assert.strictEqual(pending.body.user.progress.pet.needsBreedSelection, true);
assert.strictEqual(pending.body.user.progress.pet.name, '云宝');
assert.strictEqual(pending.body.user.progress.pet.growth, 70);
assert.strictEqual(pending.body.user.progress.pet.foodInventory.starBiscuit, 2);
const reselected = await request('POST', '/api/pet/adopt', { speciesId: 'husky', name: '云宝' }, originalToken);
assert.strictEqual(reselected.status, 200);
assert.strictEqual(reselected.body.user.progress.pet.speciesId, 'husky');
assert.strictEqual(reselected.body.user.progress.pet.needsBreedSelection, false);
assert.strictEqual(reselected.body.user.progress.pet.adoptedAt, preserved.pet.adoptedAt);
assert.strictEqual(reselected.body.user.progress.pet.growth, preserved.pet.growth);
assert.deepStrictEqual(reselected.body.user.progress.pet.foodInventory, preserved.pet.foodInventory);
assert.strictEqual(reselected.body.user.progress.coins, preserved.coins);
assert.deepStrictEqual(reselected.body.user.progress.inventory, preserved.inventory);
assert.strictEqual(reselected.body.user.progress.stage, preserved.stage);
assert.deepStrictEqual(reselected.body.user.progress.mistakes, preserved.mistakes);
assert.deepStrictEqual(reselected.body.user.progress.learnedWords, preserved.learnedWords);
```

- [ ] **Step 2: 运行接口测试确认版本和犬种失败**

Run: `node scripts/auth_flow_test.js`

Expected: FAIL，首先在 `migrationVersion` 或 `poodle` 领取处失败。

- [ ] **Step 3: 增加北京时间和任务推进纯辅助函数**

在 `server.js` 的字符串辅助函数后加入：

```js
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
```

- [ ] **Step 4: 将账号迁移上限提升到 2 并安全处理旧宠物**

把 `normalizeProgress` 中迁移版本上限改为 2。用以下函数替换 `migrateProgress`：

```js
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
```

新注册账号初始化使用 `migrationVersion: 2`。保持 `APP_ID='word-spirit-planet'`，把 `APP_VERSION` 和启动脚本 `$appVersion` 同步提升为 `0.4.0`。

- [ ] **Step 5: 把领取接口改成首次领取和旧用户重选双模式**

用以下核心逻辑替换 `/api/pet/adopt` 的状态构造：

```js
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
```

- [ ] **Step 6: 增加宠物屋访问接口**

在改名接口前加入：

```js
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
```

- [ ] **Step 7: 在购买、过关和喂食成功时推进任务**

购买食物写入库存后调用 `advancePetOnboarding(context.progress.pet, 'buy-food')`。关卡奖励真正发放后调用 `advancePetOnboarding(context.progress.pet, 'earn-coins')`。喂食扣减库存和增加成长后加入：

```js
const today = shanghaiDate();
context.progress.pet.lastFedDate = today;
advancePetOnboarding(context.progress.pet, 'feed');
const newLevel = context.progress.pet.level;
const unlockedTricks = PetSystem.tricksUnlockedBetween(oldLevel, newLevel);
const nextTrick = PetSystem.nextTrickForLevel(newLevel);
```

并把 `feeding` 响应替换为：

```js
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
```

保留满级检查在扣库存之前，错误文案改为“小狗已经满级，食物会继续保留在背包里”。

- [ ] **Step 8: 运行接口测试与语法检查**

Run: `node scripts/auth_flow_test.js`

Expected: `AUTH_FLOW=PASS`，并包含 pet、migration、onboarding、visit、feed、idempotency 全部断言。

Run: `npm run check`

Expected: exit 0，无语法错误。

- [ ] **Step 9: 提交服务端任务**

```powershell
git add server.js scripts/auth_flow_test.js 启动词灵星球.ps1
git commit -m "feat(pet): persist dog migration and daily care"
```

---

### Task 4: 游戏改名并从主页、关卡和结算移除宠物

**Files:**
- Modify: `app.js:1-445`
- Modify: `app.js:638-1055`
- Modify: `app.js:1280-1338`
- Modify: `app.js:1386-1613`
- Modify: `app.js:1841-1853`
- Modify: `index.html:6-18`
- Modify: `package.json:2-6`
- Modify: `server.js:463`
- Modify: `scripts/smoke_game.js:99-165`
- Modify: `scripts/smoke_game.js:294-324`

**Interfaces:**
- Consumes: Task 1 新版 `PetSystem`，Task 3 的 `lastFedDate` 与 `onboardingStep`。
- Produces: `shanghaiDateForUi(now)`、`petNeedsAttention(progress, today)`，以及不含玩家小狗的 `homeView`、`levelIntroView`、`gameView`、`resultView`。

- [ ] **Step 1: 先增加改名和页面可见性失败测试**

把 `levelIntroView`、`resultView`、`petNeedsAttention` 加入烟雾测试的 `__gameTest` 导出，然后加入：

```js
if (!indexSource.includes('<title>单词消消养宠记</title>')) throw new Error('浏览器标题尚未改名');
if (packageJson.description !== '《单词消消养宠记》试玩版') throw new Error('项目说明尚未改名');
test.gameState.view = 'login';
if (!test.authView().includes('单词消消养宠记') || test.authView().includes('词灵星球')) throw new Error('登录页名称尚未统一');
if (test.authView().includes('/assets/dogs/')) throw new Error('登录页错误展示了已领养小狗素材');

test.gameState.user = {
  profile: { nickname: '小测试员' },
  progress: {
    stage: 1, coins: 30, collected: [], mistakes: {}, inventory: { hint: 3, shuffle: 2, addMoves: 1 },
    tutorials: { match3: false, pair: false }, review: {}, learnedWords: [],
    pet: { speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70, level: 2,
      foodInventory: {}, catalogVersion: 2, needsBreedSelection: false, onboardingStep: 'buy', lastFedDate: '' }
  }
};
const homeWithoutDog = test.homeView();
if (homeWithoutDog.includes('豆豆') || homeWithoutDog.includes('/assets/dogs/') || homeWithoutDog.includes('dog-figure')) {
  throw new Error('主页仍然展示已领取小狗');
}
if (!homeWithoutDog.includes('pet-attention-dot') || !homeWithoutDog.includes('快去帮你的小狗赚金币')) {
  throw new Error('主页缺少宠物屋红点或任务摘要');
}
test.gameState.game = test.newGame(1);
const introWithoutDog = test.levelIntroView();
const gameWithoutDog = test.gameView();
test.gameState.result = { win: true, level: 1, mode: 'match3', score: 100, combo: 2, learned: 4, stars: 3, xp: 20, coins: 24, mission: { type: 'normal' } };
const resultWithoutDog = test.resultView();
for (const [viewName, html] of [['关卡介绍', introWithoutDog], ['闯关', gameWithoutDog], ['结算', resultWithoutDog]]) {
  if (html.includes('豆豆') || html.includes('/assets/dogs/') || html.includes('pet-speech-bubble') || html.includes('dog-figure')) {
    throw new Error(`${viewName}仍然展示宠物`);
  }
}
```

- [ ] **Step 2: 运行烟雾测试确认旧名称或主页宠物失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `浏览器标题尚未改名` 或 `主页仍然展示已领取小狗`。

- [ ] **Step 3: 更新所有用户可见游戏名称**

执行以下明确替换：

- `index.html` 标题改为 `单词消消养宠记`。
- `package.json` description 改为 `《单词消消养宠记》试玩版`，version 改为 `0.4.0`。
- `app.js` 顶栏品牌显示 `<b>单词消消养宠记</b><small>闯关赚金币，回家养小狗</small>`。
- 登录页标题改为“单词消消养宠记”，登录按钮改为“进入单词消消养宠记”。
- 底部“星球”改为“主页”，所有“返回星球”改为“返回主页”。
- `server.js` 启动日志改为“单词消消养宠记试玩版正在运行”。

不要修改 `APP_ID`、`WORD_SPIRIT_*` 环境变量、令牌键或接口路径。

同时定义固定的非宠物装饰：

```js
const NEUTRAL_MASCOT = Object.freeze({ species: '单词小助手', asset: '/assets/word-spirit.png' });
function mascotFigure(className = '') {
  return `<span class="spirit-figure unique-spirit ${className}" style="--spirit-image:url('${NEUTRAL_MASCOT.asset}')" role="img" aria-label="${NEUTRAL_MASCOT.species}"></span>`;
}
```

登录、密码恢复、排行榜、空状态和个人资料如需保留装饰，只能调用 `mascotFigure()`；不得从 `PetSystem.PETS` 或当前账号宠物读取素材。顶栏、关卡介绍和结算按后续步骤使用文字或中性 emoji。

- [ ] **Step 4: 增加主页红点纯函数并重写主页主视觉**

在宠物辅助函数旁加入：

```js
function shanghaiDateForUi(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}
function petNeedsAttention(progress, today = shanghaiDateForUi()) {
  const pet = progress?.pet || {};
  if (pet.needsBreedSelection) return true;
  if (!pet.speciesId) return false;
  return pet.onboardingStep !== 'complete' || pet.lastFedDate !== today;
}
```

`homeView()` 的主视觉只显示玩家昵称、当前称号、关卡和“开始学习”；删除 `spiritFigure`、宠物名字、犬种、成长条和主页宠物气泡。宠物屋奖励卡固定为：

```js
<button class="pet-room-entry" data-action="pet-home">
  <span>🐾${petNeedsAttention(p) ? '<i class="pet-attention-dot" aria-label="小狗需要你的关注"></i>' : ''}</span>
  <b>宠物屋</b>
  <small>${p.pet.needsBreedSelection ? '重新选择并保留养成进度' : p.pet.onboardingStep === 'earn' ? '快去帮你的小狗赚金币' : p.pet.onboardingStep === 'buy' ? '去兑换一份小狗食物' : p.pet.onboardingStep === 'feed' ? '带着食物回宠物屋' : p.pet.lastFedDate !== shanghaiDateForUi() ? '今天还没有喂食' : '今天已经照顾好啦'}</small>
</button>
```

未领取状态只显示文字和“领取我的小狗”，不显示任何宠物图片。

- [ ] **Step 5: 从所有关卡状态和页面删除宠物语句**

删除 `newSpellingGame`、`newFallingGame` 和普通游戏状态中的 `petQuote` 字段；删除所有 `game.petQuote = petSpeech(...)`；删除拼写、落体、普通游戏视图中的 `.pet-speech-bubble`；删除失败和成功结算对象中的 `petQuote`；删除进入关卡时的 `petSpeech('start')`。

`levelIntroView()` 用 `<div class="mission-mascot" aria-hidden="true">🎯</div>` 替换 `spiritFigure('intro-spirit')`。`resultView()` 用 `<div class="result-badge" aria-hidden="true">${r.win ? '🏆' : '🌱'}</div>` 替换宠物图，标题只使用“漂亮！全部消掉啦”“这关也被你拿下了”“今天又认识了新单词”等中性文案，不引用宠物名字。

- [ ] **Step 6: 运行烟雾测试和全文可见性检查**

Run: `node scripts/smoke_game.js`

Expected: 页面可见性和标题断言通过。

Run: `rg -n "petQuote|petSpeech\('(start|combo|retry|star1|star2|star3)'\)|hero-spirit-wrap|result-pet-speech" app.js`

Expected: 无匹配。

- [ ] **Step 7: 提交改名与页面边界任务**

```powershell
git add app.js index.html package.json server.js scripts/smoke_game.js
git commit -m "feat(ui): keep dogs out of learning screens"
```

---

### Task 5: 领取重选、宠物屋气泡、新手任务、喂食反馈和特技成长册

**Files:**
- Modify: `app.js:110-186`
- Modify: `app.js:406-445`
- Modify: `app.js:1615-1650`
- Modify: `app.js:1721-1779`
- Modify: `app.js:1821-1969`
- Modify: `scripts/smoke_game.js:109-165`
- Modify: `scripts/smoke_game.js:294-330`

**Interfaces:**
- Consumes: Task 1 全部犬种/特技/喂食目标纯函数，Task 3 的 `/api/pet/adopt`、`/api/pet/visit`、`feeding` 响应。
- Produces: `dogFigure(className, dog, pose, trick)`、`petOnboardingCard(progress)`、`trickBookView(progress)`、`openPetHome()`、新版 `petStoreView()`、新版 `petHomeView()`。

- [ ] **Step 1: 先增加领取、气泡、任务和成长册失败测试**

把 `dogFigure`、`petOnboardingCard`、`trickBookView` 加入烟雾测试导出，并替换旧领取/宠物屋断言：

```js
test.gameState.user.progress.pet = petSystem.normalizePetState({});
const unclaimedStore = test.petStoreView();
if ((unclaimedStore.match(/class="pet-catalog-card/g) || []).length !== 6) throw new Error('领取页没有展示六种小狗');
if (!unclaimedStore.includes('value=""') || !unclaimedStore.includes('必须由你亲自命名')) throw new Error('新用户名字输入框不是空白');

test.gameState.user.progress.pet = petSystem.normalizePetState({
  speciesId: 'cloud', name: '小云', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }, needsBreedSelection: true
});
const migrationStore = test.petStoreView();
if (!migrationStore.includes('保留原有等级、成长值、金币和食物') || !migrationStore.includes('value="小云"')) {
  throw new Error('旧用户重选提示或旧名字预填缺失');
}

test.gameState.user.progress.pet = petSystem.normalizePetState({
  speciesId: 'corgi', name: '豆豆', adoptedAt: '2026-08-24T00:00:00.000Z', growth: 70,
  foodInventory: { starBiscuit: 2 }, catalogVersion: 2, onboardingStep: 'feed'
});
test.gameState.lastPetQuote = '主人，我的肚子咕咕叫啦。';
const petHome = test.petHomeView();
if (!petHome.includes('dog-speech-bubble') || !petHome.includes('主人，我的肚子咕咕叫啦')) throw new Error('头顶气泡缺失');
if (!petHome.includes('带着食物回宠物屋') || !petHome.includes('新手小任务')) throw new Error('三步养宠任务缺失');
if (!petHome.includes('查看下一级特技') || !petHome.includes('还差 80 成长值')) throw new Error('升级差值或特技入口缺失');
const trickBook = test.trickBookView(test.gameState.user.progress);
if (!trickBook.includes('摇尾欢迎') || !trickBook.includes('开心蹦跳') || !trickBook.includes('data-action="perform-trick"')) {
  throw new Error('特技成长册缺少解锁和预告');
}
```

- [ ] **Step 2: 运行烟雾测试确认六犬种领取页失败**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `领取页没有展示六种小狗`。

- [ ] **Step 3: 增加宠物屋专用状态和小狗姿态渲染器**

在 `state` 增加：

```js
petVisitBusy: false,
showTrickBook: false,
activeTrickId: '',
trickTimer: null
```

用以下渲染器替代宠物页面对 `spiritFigure` 的使用：

```js
function dogFigure(className = '', dog, pose = 'stand', trick = null) {
  if (!dog) return '<span class="dog-figure dog-fallback" role="img" aria-label="小狗">🐾</span>';
  const safePose = ['stand', 'paw', 'walk', 'sleep'].includes(pose) ? pose : 'stand';
  const trickClass = trick ? ` trick-${trick.animation} effect-${trick.effect}` : '';
  return `<span class="dog-figure pose-${safePose}${trickClass} ${className}" style="--dog-sheet:url('${dog.asset}')" role="img" aria-label="${esc(dog.species)}"></span>`;
}
```

- [ ] **Step 4: 重写领取页，区分新领取与一次性重选**

`petStoreView()` 必须按以下规则渲染：

- 已有新版犬种且 `needsBreedSelection=false` 时进入宠物屋。
- 默认只选中第一种犬种预览，不把犬种名写入名字输入框。
- `needsBreedSelection=true` 时显示“重新选择不会清空养成数据”和“保留原有等级、成长值、金币和食物”，名字输入值为旧名字。
- 六张卡片显示 `dog.species`、`dog.personality` 和站立姿态，不显示系统宠物名或口号。
- 输入框在新领取时使用 `value=""` 和提示“必须由你亲自命名”；重选时使用转义后的旧名字。
- 确认弹窗写明“选择后犬种不能再次更换，名字仍可免费修改”。

- [ ] **Step 5: 增加三步任务卡和成长册渲染器**

实现以下函数：

```js
function petOnboardingCard(progress) {
  const step = progress.pet.onboardingStep;
  if (step === 'complete') return '';
  const currentIndex = { earn: 0, buy: 1, feed: 2 }[step] ?? 0;
  const labels = ['去闯关赚金币', '去商店兑换食物', '回宠物屋喂食'];
  const action = step === 'earn' ? 'play' : step === 'buy' ? 'shop' : 'focus-food';
  const button = step === 'earn' ? '快去帮你的小狗赚金币吧' : step === 'buy' ? '去兑换一份食物' : '现在喂给小狗';
  return `<section class="pet-onboarding-card"><b>新手小任务</b><ol>${labels.map((label, index) => `<li class="${index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}">${index < currentIndex ? '✓' : index + 1} ${label}</li>`).join('')}</ol><button class="primary" data-action="${action}">${button}</button></section>`;
}

function trickBookView(progress) {
  const pet = progress.pet;
  const next = PetSystem.nextTrickForLevel(pet.level);
  return `<section class="trick-book" aria-label="小狗特技成长册"><div class="trick-book-head"><div><small>成长期待</small><h2>小狗特技成长册</h2></div><button data-action="close-tricks" aria-label="关闭特技成长册">×</button></div><div class="trick-grid">${PetSystem.TRICKS.map(trick => {
    const unlocked = trick.level <= pet.level;
    const isNext = next?.id === trick.id;
    return `<article class="trick-card ${unlocked ? 'unlocked' : 'locked'} ${isNext ? 'next' : ''}"><span>${unlocked ? '✨' : '🔒'}</span><b>${trick.name}</b><small>Lv.${trick.level} ${unlocked ? '已解锁' : isNext ? `还差 ${PetSystem.growthRemaining(pet.growth)} 成长值` : '等待解锁'}</small>${unlocked ? `<button data-action="perform-trick" data-trick-id="${trick.id}">表演一下</button>` : ''}</article>`;
  }).join('')}</div></section>`;
}
```

- [ ] **Step 6: 重写宠物屋并把气泡锚定在小狗头顶**

`petHomeView()` 顶部结构使用：

```js
const activeTrick = PetSystem.trickById(state.activeTrickId);
const pose = activeTrick?.pose || 'stand';
const nextTrick = PetSystem.nextTrickForLevel(p.pet.level);
const remaining = PetSystem.growthRemaining(p.pet.growth);
```

宠物房结构必须包含：

```js
<section class="pet-room-card">
  <div class="pet-stage">
    ${state.lastPetQuote ? `<div class="dog-speech-bubble" role="status"><b>${esc(p.pet.name)}说</b><p>${esc(state.lastPetQuote)}</p></div>` : ''}
    <button class="pet-room-figure" data-action="pet-tap">${dogFigure('home-dog', dog, pose, activeTrick)}<span>轻轻摸摸我</span></button>
  </div>
  <div class="pet-room-info">
    <small>${esc(dog.species)} · ${esc(dog.personality)} · ${growthName(p.pet.level)}</small>
    <h1>${esc(p.pet.name)} · Lv.${p.pet.level}</h1>
    <i class="pet-growth-bar"><em style="width:${petGrowthPercent(p.pet)}%"></em></i>
    <b>${p.pet.level >= 10 ? '已达到最高等级' : `还差 ${remaining} 成长值升级`}</b>
    <button data-action="show-tricks">${p.pet.level >= 10 ? '查看全部特技' : `查看下一级特技：${nextTrick.name}`}</button>
  </div>
</section>
${petOnboardingCard(p)}
${state.showTrickBook ? trickBookView(p) : ''}
```

食物按钮在 Lv.10 时使用 `data-action="pet-tap"`、不带 `data-food-id`，文案为“已经满级，摸摸它吧”；未满级保持喂食操作。

- [ ] **Step 7: 增加宠物屋访问、喂食反馈和特技事件**

实现访问函数：

```js
async function openPetHome() {
  const pet = normalizedProgress().pet;
  if (!pet.speciesId || pet.needsBreedSelection) {
    state.view = 'pet-store';
    render();
    return;
  }
  state.view = 'pet-home';
  state.lastPetQuote = '';
  render();
  state.petVisitBusy = true;
  try {
    const data = await api('/api/pet/visit', { method: 'POST', body: '{}' });
    state.user = data.user;
    if (data.petVisit?.showHungerPrompt) state.lastPetQuote = petSpeech('hunger');
  } catch {
    toast('宠物屋已经打开，今日提醒暂时没有同步');
  } finally {
    state.petVisitBusy = false;
    render();
  }
}
```

领取成功后设置 `state.lastPetQuote=petSpeech('welcome')` 并直接进入宠物屋，不调用 visit。喂食成功后：

```js
const scene = data.feeding.unlockedTrickIds?.length ? 'levelUp' : food.quoteScene;
const emotion = petSpeech(scene);
const goal = PetSystem.feedingGoal(data.feeding);
state.lastPetQuote = [emotion, goal].filter(Boolean).join(' ');
```

事件处理增加：

```js
if (action === 'show-tricks') { state.showTrickBook = true; render(); }
if (action === 'close-tricks') { state.showTrickBook = false; render(); }
if (action === 'focus-food') { document.querySelector('.food-shop-grid')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }
if (action === 'perform-trick') {
  const trick = PetSystem.trickById(event.target.closest('[data-trick-id]')?.dataset.trickId);
  if (!trick || trick.level > normalizedProgress().pet.level || state.activeTrickId) return;
  state.activeTrickId = trick.id;
  state.lastPetQuote = `看我的${trick.name}！`;
  render();
  state.trickTimer = setTimeout(() => { state.activeTrickId = ''; state.trickTimer = null; render(); }, 1800);
}
```

把现有 `pet-home` 事件改为调用 `openPetHome()`。`pet-tap` 在 Lv.10 使用 `maxLevel` 语录，其余等级使用 `tap`。离开宠物屋、退出登录和开始关卡时清理 `trickTimer`、`activeTrickId` 与 `showTrickBook`。

- [ ] **Step 8: 运行烟雾测试和语法检查**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS`，新增 pet catalog、adoption、bubble、onboarding、growth、tricks 标记均通过。

Run: `npm run check`

Expected: exit 0。

- [ ] **Step 9: 提交宠物屋交互任务**

```powershell
git add app.js scripts/smoke_game.js
git commit -m "feat(pet): add guided dog room interactions"
```

---

### Task 6: 犬种网格、头顶气泡、成长册与九种响应式动画

**Files:**
- Modify: `styles.css:68-86`
- Modify: `scripts/smoke_game.js:219-224`

**Interfaces:**
- Consumes: Task 5 的 `.dog-figure`、`.pose-*`、`.trick-*`、`.effect-*`、`.pet-onboarding-card`、`.trick-book`、`.trick-card`、`.pet-attention-dot`。
- Produces: 2×2 姿态裁切、九种轻量动画、手机/桌面布局和 `prefers-reduced-motion` 降级。

- [ ] **Step 1: 先扩展样式选择器失败测试**

把烟雾测试的样式选择器数组替换为：

```js
for (const selector of [
  '.dog-figure', '.pose-paw', '.pose-walk', '.pose-sleep', '.dog-speech-bubble',
  '.pet-attention-dot', '.pet-onboarding-card', '.trick-book', '.trick-card',
  '.trick-wag', '.trick-bounce', '.trick-spin', '.trick-paw', '.trick-roll',
  '.trick-chase', '.trick-dance', '.trick-walk', '.trick-sleep',
  '@media (prefers-reduced-motion: reduce)'
]) {
  if (!stylesSource.includes(selector)) throw new Error(`宠物界面样式缺失：${selector}`);
}
```

- [ ] **Step 2: 运行烟雾测试确认新样式缺失**

Run: `node scripts/smoke_game.js`

Expected: FAIL，第一条缺失项为 `.dog-figure`。

- [ ] **Step 3: 增加姿态裁切、网格、气泡和成长册基础样式**

在 `styles.css` 宠物区域用以下规则作为新版基础，删除旧 `.unique-spirit` 在宠物页的依赖：

```css
.dog-figure{--dog-size:220px;width:var(--dog-size);height:var(--dog-size);display:block;background-image:var(--dog-sheet);background-repeat:no-repeat;background-size:200% 200%;background-position:0 0;filter:drop-shadow(0 12px 16px #38443f2d);transform-origin:50% 82%}
.dog-figure.pose-stand{background-position:0 0}.dog-figure.pose-paw{background-position:100% 0}.dog-figure.pose-walk{background-position:0 100%}.dog-figure.pose-sleep{background-position:100% 100%}
.dog-fallback{display:grid;place-items:center;background:none;font-size:72px}
.pet-stage{position:relative;display:grid;place-items:center;min-height:300px}.pet-room-figure{display:grid;place-items:center;background:transparent}.pet-room-figure>span:last-child{margin-top:-8px;color:#65736d;font-size:12px;font-weight:900}
.dog-speech-bubble{position:absolute;z-index:3;top:0;left:50%;width:min(310px,92%);padding:13px 16px;border:2px solid #d7d9d4;border-radius:20px;background:#fff;color:#35423e;box-shadow:0 8px 22px #46514d24;transform:translateX(-50%);animation:dog-bubble-in .28s ease-out}
.dog-speech-bubble:after{content:"";position:absolute;left:50%;bottom:-9px;width:16px;height:16px;border-right:2px solid #d7d9d4;border-bottom:2px solid #d7d9d4;background:#fff;transform:translateX(-50%) rotate(45deg)}
.dog-speech-bubble b,.dog-speech-bubble p{position:relative;z-index:1;margin:0}.dog-speech-bubble b{color:#678878;font-size:11px}.dog-speech-bubble p{margin-top:3px;font-weight:850;line-height:1.5}
.pet-attention-dot{position:absolute;top:-3px;right:-8px;width:11px;height:11px;border:2px solid #fff;border-radius:50%;background:#ff5b6e;box-shadow:0 0 0 3px #ff5b6e33}.pet-room-entry>span{position:relative;width:max-content}
.pet-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pet-catalog-card{min-height:245px}.catalog-dog{--dog-size:150px;margin:auto}
.pet-adopt-preview{grid-template-columns:220px 1fr}.adopt-preview-dog{--dog-size:210px;margin:auto}
.pet-onboarding-card{margin:18px 0;padding:18px;border:2px solid #d9c9ee;border-radius:22px;background:#fbf8ff}.pet-onboarding-card ol{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0;list-style:none}.pet-onboarding-card li{padding:10px;border-radius:14px;background:#eee9f4;color:#756d7c;font-size:12px;font-weight:850}.pet-onboarding-card li.current{background:#fff0bc;color:#6e5424;box-shadow:0 0 0 2px #e8bd50}.pet-onboarding-card li.done{background:#dff4e7;color:#44705a}
.trick-book{margin:18px 0;padding:18px;border-radius:24px;background:#fff;box-shadow:0 10px 28px #38433f1c}.trick-book-head{display:flex;justify-content:space-between;align-items:center}.trick-book-head h2{margin:3px 0}.trick-book-head>button{width:38px;height:38px;border-radius:50%;background:#ece7f2;font-size:22px}.trick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.trick-card{display:grid;gap:5px;padding:13px;border:2px solid #e2e0e4;border-radius:17px;background:#f7f6f8}.trick-card.next{border-color:#e6b84f;background:#fff8dc}.trick-card.locked{filter:saturate(.35);color:#8b8790}.trick-card button{margin-top:5px;padding:8px;border-radius:11px;background:#6f9f8a;color:#fff;font-weight:900}
```

- [ ] **Step 4: 增加九种动画和视觉效果**

```css
.dog-figure.trick-wag{animation:dog-wag 1.2s ease-in-out}.dog-figure.trick-bounce{animation:dog-bounce 1.2s ease-out}.dog-figure.trick-spin{animation:dog-spin 1.2s ease-in-out}.dog-figure.trick-paw{animation:dog-paw 1.2s ease-in-out}.dog-figure.trick-roll{animation:dog-roll 1.35s ease-in-out}.dog-figure.trick-chase{animation:dog-chase 1.35s ease-in-out}.dog-figure.trick-dance{animation:dog-dance 1.4s ease-in-out}.dog-figure.trick-walk{animation:dog-walk 1.5s ease-in-out}.dog-figure.trick-sleep{animation:dog-sleep 1.6s ease-in-out}
.pet-stage:has(.effect-hearts):after{content:"♥  ♥"}.pet-stage:has(.effect-stars):after{content:"✦  ★  ✦"}.pet-stage:has(.effect-paws):after{content:"🐾  🐾"}.pet-stage:has(.effect-sleep):after{content:"Z  z  z"}.pet-stage:after{position:absolute;z-index:2;top:74px;right:12%;color:#f0a650;font-size:24px;letter-spacing:8px;pointer-events:none;animation:dog-effect 1.4s ease-out both}
@keyframes dog-bubble-in{from{opacity:0;transform:translate(-50%,10px) scale(.94)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes dog-wag{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@keyframes dog-bounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-26px) scale(1.04)}65%{transform:translateY(-8px)}}
@keyframes dog-spin{to{transform:rotate(360deg)}}
@keyframes dog-paw{0%,100%{transform:rotate(0)}45%{transform:rotate(-5deg) translateY(-8px)}}
@keyframes dog-roll{0%,100%{transform:rotate(0)}50%{transform:rotate(330deg) translateY(10px)}}
@keyframes dog-chase{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(300deg) scale(.92)}}
@keyframes dog-dance{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-8deg) translateY(-12px)}75%{transform:rotate(8deg) translateY(-12px)}}
@keyframes dog-walk{0%,100%{transform:translateX(0)}35%{transform:translateX(34px)}70%{transform:translateX(-28px)}}
@keyframes dog-sleep{0%,100%{transform:scale(1)}50%{transform:scale(.97)}}
@keyframes dog-effect{from{opacity:0;transform:translateY(18px) scale(.6)}40%{opacity:1}to{opacity:0;transform:translateY(-34px) scale(1.15)}}
```

- [ ] **Step 5: 增加手机布局和减少动态效果**

```css
@media(max-width:680px){.pet-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.pet-catalog-card{min-height:205px;padding:10px}.catalog-dog{--dog-size:118px}.pet-adopt-preview{grid-template-columns:1fr}.adopt-preview-dog{--dog-size:180px}.pet-room-card{grid-template-columns:1fr;padding:16px}.dog-figure{--dog-size:190px}.pet-stage{min-height:270px}.pet-onboarding-card ol{grid-template-columns:1fr}.trick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dog-speech-bubble{top:4px}}
@media (prefers-reduced-motion: reduce){.dog-speech-bubble,.dog-figure,.pet-stage:after{animation:none!important;transition:none!important}.dog-figure[class*="trick-"]{transform:none!important}}
```

- [ ] **Step 6: 运行烟雾测试和样式差异检查**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS`，全部新增选择器存在。

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 7: 提交响应式样式任务**

```powershell
git add styles.css scripts/smoke_game.js
git commit -m "feat(pet): style dog room and trick animations"
```

---

### Task 7: 文档、缓存、全量验证与真实浏览器验收

**Files:**
- Modify: `README.md:1-40`
- Modify: `index.html:8-17`
- Modify: `scripts/smoke_game.js:99-108`
- Verify: `pet-system.js`
- Verify: `server.js`
- Verify: `app.js`
- Verify: `styles.css`
- Verify: `scripts/auth_flow_test.js`
- Verify: `scripts/launcher_test.ps1`

**Interfaces:**
- Consumes: Tasks 1-6 的完整功能。
- Produces: 最终用户说明、新缓存版本、自动化验证证据、390×844 与 1280×800 浏览器证据。

- [ ] **Step 1: 更新 README 和静态缓存版本**

README 标题改为 `# 《单词消消养宠记》试玩版`，宠物能力说明改为：六犬种、自主命名、旧账号无损重选、只在宠物屋出现、每日一次温柔提醒、三步引导、喂食升级差值、九种纯展示特技、满级不消耗食物。保留“不含充值、付费、随机抽取或能力加成”。

`index.html` 固定使用：

```html
<link rel="stylesheet" href="/styles.css?v=24" />
<script src="/pet-system.js?v=3" defer></script>
<script src="/review-games.js?v=2" defer></script>
<script src="/app.js?v=23" defer></script>
```

同步把烟雾测试中的静态版本断言更新为上述值。

- [ ] **Step 2: 运行完整自动化验证**

Run: `npm test`

Expected: `GAME_SMOKE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`，0 failures。

Run: `npm run check`

Expected: exit 0，所有 JavaScript 语法检查通过。

Run: `git diff --check`

Expected: 无输出，exit 0。

- [ ] **Step 3: 启动隔离测试服务**

在专用 worktree 中使用端口 `31877` 和 worktree 内 `.tmp-dog-qa-data` 启动服务，避免读取主目录账号：

```powershell
$env:PORT='31877'
$env:WORD_SPIRIT_DATA_DIR=(Join-Path (Get-Location) '.tmp-dog-qa-data')
node server.js
```

Expected: 控制台显示“单词消消养宠记试玩版正在运行：http://localhost:31877”。

- [ ] **Step 4: 使用 Playwright 技能完成手机流程**

在调用浏览器自动化前完整读取 `C:\Users\86138\.codex\skills\playwright\SKILL.md`。以 390×844 视口完成：

1. 注册并登录新账号。
2. 验证主页没有小狗图片，宠物屋入口存在。
3. 进入领取页，确认六张卡片、两列布局和空名字不能提交。
4. 选择柯基并命名“豆豆”，确认领取后进入宠物屋。
5. 确认欢迎气泡和三步任务；返回主页确认红点与“快去帮你的小狗赚金币”。
6. 完成一关、兑换星星饼干、回宠物屋喂食。
7. 确认感谢语句、`还差 50 成长值`、`摇尾欢迎`预告和任务收起。
8. 刷新并再次进入宠物屋，确认当天不再喊饿。
9. 人工调整测试账号成长到 60 后刷新，打开成长册并表演“摇尾欢迎”。
10. 进入关卡介绍、闯关和结算，确认没有小狗、名字或宠物气泡。
11. 检查 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`，控制台无 error。

- [ ] **Step 5: 使用 Playwright 技能完成桌面和旧账号流程**

以 1280×800 视口：

1. 把一个测试账号存档构造成旧 `cloud` 宠物，记录名字、领取时间、成长、金币、库存、道具和学习数据。
2. 登录后确认被引导到重选页，三列犬种卡片和旧名字预填正确。
3. 选择哈士奇并保持原名，逐项读取页面/API 数据确认快照全部保留。
4. 把 `lastFedDate` 与 `lastHungerPromptDate` 设置为旧日期，第一次进入宠物屋显示饥饿气泡，第二次进入不显示。
5. 把成长设为 2400，确认食物按钮不调用喂食、库存不变、点击显示满级感谢、九种特技全部解锁。
6. 检查气泡、成长条、任务卡和成长册无重叠、无横向溢出，控制台无 error。

- [ ] **Step 6: 视觉检查六犬种和关键页面截图**

分别截取领取页手机/桌面、柯基宠物屋、哈士奇宠物屋、特技成长册、喂食反馈和满级状态。逐张确认：犬种可辨认、透明背景无方框、头顶气泡箭头指向小狗、按钮未遮挡、藏獒表情友善、姿态切换无串格。发现问题时只修改对应素材或对应样式，再重跑 Step 2、4、5。

- [ ] **Step 7: 停止服务并安全移除隔离测试数据**

停止本任务启动的 `31877` 服务。仅当解析后的 `.tmp-dog-qa-data` 路径位于当前专用 worktree 内时删除该目录；不得操作主目录 `data/`、其他 worktree 或 `%SystemDrive%/`。

- [ ] **Step 8: 再次运行最终验证并提交**

Run: `npm test`

Expected: `GAME_SMOKE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`。

Run: `npm run check`

Expected: exit 0。

Run: `git diff --check`

Expected: exit 0。

```powershell
git add README.md index.html scripts/smoke_game.js
git commit -m "docs: update dog pet game guidance"
```

- [ ] **Step 9: 最终工作区证据**

Run: `git status -sb`

Expected: 仅显示 `## codex/dog-pet-home-dialogue`，无未提交文件。

Run: `git log --oneline -8`

Expected: 包含设计、纯规则、素材、服务端、页面边界、宠物屋、样式和最终文档提交；不包含远端推送。
