# 低频拼写与单词落体关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变三消与配对主节奏的前提下，以约8%的持久化随机概率插入只复习已学单词的2题拼写关和5题落体释义关。

**Architecture:** 新建浏览器与 Node 共用的 `review-games.js`，集中处理已学词规范化、特殊关资格、随机排布、类型平衡、选题、星级和计时常量；`app.js` 负责两种玩法的运行状态与页面；`server.js` 保存模式分配和已学词统计。特殊关是现有关卡模式的低频覆盖层，资格不足时安全回退到原模式。

**Tech Stack:** 原生 JavaScript、Node.js、本地 JSON 数据库、CSS 动画、SpeechSynthesis、现有 smoke/auth/launcher tests。

## Global Constraints

- 特殊关约8%随机出现，两次特殊关不得连续。
- 至少有12个已学单词才有资格触发。
- 模式生成后保存；刷新、退出、登录或失败重试不得重抽。
- 拼写与落体优先选择历史出现次数较少的一种。
- 题目只能来自此前三消有效混合消除或配对正确匹配过的单词。
- 拼写关每次2题；首次拼错纠正后重试，同词第二次错误则失败。
- 落体关每次5题；任意一题选错或超时立即失败。
- 落体时长：一二年级7秒、三四年级6秒、五年级5秒。
- 首次落体先完成1题不计成败的引导题。
- 正确后先朗读英文和中文，朗读期间不计时。
- 页面进入后台时暂停，离开关卡时清理全部计时器和语音。
- 拼写通关额外20金币，落体通关额外30金币。
- 三消混合规则、配对图片与星级、赞美和背景音乐不得回归。

---

### Task 1: 已学词统计与特殊关纯规则

**Files:**
- Create: `review-games.js`
- Modify: `index.html`
- Modify: `server.js`
- Modify: `scripts/smoke_game.js`
- Modify: `scripts/auth_flow_test.js`

**Interfaces:**
- Produces: `globalThis.ReviewGames`
- Produces: `normalizeLearnedWords(input): LearnedWord[]`
- Produces: `recordLearnedWord(list, word, result, now): LearnedWord[]`
- Produces: `eligibleForSpecial(progress, level): boolean`
- Produces: `assignReviewMode(progress, level, baseMode, random): { mode: 'match3' | 'pair' | 'spelling' | 'falling', review: ReviewState }`
- Produces: `selectReviewWords(entries, count, random): LearnedWord[]`
- Produces: `fallDurationForGrade(grade): number`
- Produces: `starsForSpelling(retryCount): number`
- Produces: `starsForFalling(remainingRatios): number`

- [ ] **Step 1: 写纯规则失败测试**

在 `scripts/smoke_game.js` 加载 `review-games.js` 并断言：

```js
const reviewSource = fs.readFileSync(path.join(root, 'review-games.js'), 'utf8');
vm.runInContext(reviewSource, context, { filename: 'review-games.js' });
const review = vm.runInContext('ReviewGames', context);
assert.strictEqual(review.SPECIAL_RATE, 0.08);
assert.strictEqual(review.MIN_LEARNED_WORDS, 12);
assert.strictEqual(review.fallDurationForGrade(1), 7000);
assert.strictEqual(review.fallDurationForGrade(2), 7000);
assert.strictEqual(review.fallDurationForGrade(3), 6000);
assert.strictEqual(review.fallDurationForGrade(4), 6000);
assert.strictEqual(review.fallDurationForGrade(5), 5000);
assert.strictEqual(review.starsForSpelling(0), 3);
assert.strictEqual(review.starsForSpelling(1), 2);
assert.strictEqual(review.starsForSpelling(2), 1);
assert.strictEqual(review.starsForFalling([.7, .6, .5, .8, .6]), 3);
assert.strictEqual(review.starsForFalling([.3, .3, .3, .3, .3]), 2);
assert.strictEqual(review.starsForFalling([.1, .1, .1, .1, .1]), 1);
```

构造12个已学词和固定随机数，验证随机值小于0.08时产生特殊关、大于等于0.08时保留原模式、上一关为特殊关时不连续、次数少的类型优先、同一关已有分配时直接复用。

- [ ] **Step 2: 运行并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `ENOENT review-games.js`。

- [ ] **Step 3: 实现纯规则模块**

模块公开常量与纯函数：

```js
(function exposeReviewGames(root) {
  const SPECIAL_RATE = 0.08;
  const MIN_LEARNED_WORDS = 12;
  function fallDurationForGrade(grade) { return grade <= 2 ? 7000 : grade <= 4 ? 6000 : 5000; }
  function starsForSpelling(retryCount) { return retryCount <= 0 ? 3 : retryCount === 1 ? 2 : 1; }
  function starsForFalling(ratios) {
    const average = ratios.reduce((sum, value) => sum + value, 0) / Math.max(1, ratios.length);
    return average >= .5 ? 3 : average >= .25 ? 2 : 1;
  }
  function eligibleForSpecial(progress, level) {
    return progress.learnedWords.length >= MIN_LEARNED_WORDS && progress.review.lastSpecialLevel !== level - 1;
  }
  root.ReviewGames = Object.freeze({ SPECIAL_RATE, MIN_LEARNED_WORDS, fallDurationForGrade, starsForSpelling, starsForFalling, eligibleForSpecial, normalizeLearnedWords, recordLearnedWord, assignReviewMode, selectReviewWords, buildMeaningChoices, shuffledLetters });
})(typeof globalThis === 'object' ? globalThis : window);
```

`assignReviewMode` 先读取 `review.assignments[level]`；无分配时检查资格、防连续和 `random() < 0.08`；触发时选择计数较少的类型，计数相同再随机；最后返回包含更新后 `review` 的结果。`selectReviewWords` 按错误次数降序、最近复习时间升序、复习次数升序排序，同分时使用注入随机数。

- [ ] **Step 4: 服务端保存已学词与模式分配**

`normalizeProgress` 增加：

```js
learnedWords: ReviewGames.normalizeLearnedWords(progress.learnedWords || progress.collected),
review: {
  assignments: sanitizeAssignments(progress.review?.assignments),
  lastSpecialLevel: clamp(progress.review?.lastSpecialLevel, 0, 100),
  counts: {
    spelling: clamp(progress.review?.counts?.spelling, 0, 100),
    falling: clamp(progress.review?.counts?.falling, 0, 100)
  },
  fallingTutorialDone: Boolean(progress.review?.fallingTutorialDone)
}
```

新增服务端接口：

- `POST /api/review/assign`：根据账号当前数据生成或返回某关模式；
- `POST /api/learned-word`：只接受教材词库中存在的词，更新接触统计；
- `POST /api/review/tutorial-complete`：标记落体引导完成。

- [ ] **Step 5: 运行聚焦测试并确认 GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... review-rules=PASS`。

Run: `node scripts/auth_flow_test.js`

Expected: `AUTH_FLOW=PASS ... learned=PASS review-assignment=PASS`。

- [ ] **Step 6: 提交**

```powershell
git add review-games.js index.html server.js scripts/smoke_game.js scripts/auth_flow_test.js
git commit -m "feat(review): add learned-word scheduling rules"
```

### Task 2: 拼写复习关

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/smoke_game.js`

**Interfaces:**
- Consumes: `ReviewGames.selectReviewWords`, `shuffledLetters`, `starsForSpelling`
- Produces: `newSpellingGame(level, words)`, `spellingView(game)`, `chooseSpellingLetter(index)`, `undoSpellingLetter()`, `submitSpellingAnswer()`

- [ ] **Step 1: 写拼写状态机失败测试**

在 smoke test 中断言：

```js
const spelling = newSpellingGame(20, [
  { word: 'apple', zh: '苹果' },
  { word: 'cloud', zh: '云' }
]);
assert.strictEqual(spelling.mode, 'spelling');
assert.strictEqual(spelling.questions.length, 2);
assert.strictEqual(spelling.questionIndex, 0);
assert.strictEqual(spelling.retryCount, 0);
assert.strictEqual(spelling.done, 0);
assert.deepStrictEqual([...spelling.questions[0].letters].sort(), [...'apple'].sort());
assert.ok(spellingView(spelling).includes('苹果'));
```

再用纯处理函数验证：两题首次正确为三星；一题首次错误后同词重试并最终二星；同一词第二次错误返回失败；撤回后字母恢复可用；重复字母索引互不冲突。

- [ ] **Step 2: 运行并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `newSpellingGame is not defined`。

- [ ] **Step 3: 实现拼写状态与页面**

`newGame(level)` 收到服务端模式 `spelling` 时创建2题状态。页面显示中文、播放按钮、已选择字母槽、乱序字母按钮、撤回和清空。完整拼写后才启用提交。

第一次错误：记录一次重试、显示正确单词、按现有顺序播放英文和中文、清空选择并保留同一题。第二次错误：进入失败结算。两题正确：调用通用关卡结算并附加 `mode:'spelling'` 与星级。

- [ ] **Step 4: 接入宠物与音频边界**

答对后显示当前宠物 `combo` 场景短动作；首次错误显示 `retry` 气泡但不朗读宠物语录。进入下一题前取消上一段语音，避免叠音。

- [ ] **Step 5: 样式与无障碍**

字母按钮最小44×44像素，重复字母保持独立按钮；中文提示和拼写槽在390像素宽度不溢出；按钮包含清晰 `aria-label`。

- [ ] **Step 6: 运行测试并提交**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... spelling=PASS`。

```powershell
git add app.js styles.css scripts/smoke_game.js
git commit -m "feat(game): add two-word spelling review"
```

### Task 3: 单词落体复习关

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `scripts/smoke_game.js`

**Interfaces:**
- Consumes: `ReviewGames.fallDurationForGrade`, `buildMeaningChoices`, `starsForFalling`
- Produces: `newFallingGame(level, words)`, `fallingView(game)`, `startFallingQuestion()`, `chooseFallingMeaning(index)`, `pauseFallingTimer()`, `resumeFallingTimer()`, `clearFallingTimer()`

- [ ] **Step 1: 写落体状态机失败测试**

断言5题、三个唯一释义、年级时间、错误与超时立即失败、五题成功星级，以及引导题不计入正式5题：

```js
const falling = newFallingGame(60, reviewWords);
assert.strictEqual(falling.mode, 'falling');
assert.strictEqual(falling.questions.length, 5);
assert.strictEqual(falling.durationMs, 6000);
assert.ok(falling.questions.every(question => question.choices.length === 3));
assert.ok(falling.questions.every(question => new Set(question.choices).size === 3));
```

- [ ] **Step 2: 运行并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，错误包含 `newFallingGame is not defined`。

- [ ] **Step 3: 实现落体状态与动画**

每题创建 `startedAt`、`remainingMs` 和唯一计时句柄。CSS 使用受 `--fall-duration` 控制的 `transform:translateY` 动画；JavaScript 超时器是唯一成败来源。正确选择时立即清理计时、记录剩余比例、播放英文和中文，语音结束后再启动下一题。

错误或超时立即进入失败结算。完成5题后使用平均剩余比例评星并以 `mode:'falling'` 结算。

- [ ] **Step 4: 首次引导与页面可见性**

若 `fallingTutorialDone` 为 false，先显示一题带箭头说明的引导题；答错不失败并重复解释，答对后调用服务端标记，再进入正式5题。监听 `visibilitychange`：隐藏时计算并保存剩余毫秒、暂停 CSS 与超时器；恢复时从剩余时间继续。离开、重试或切换视图必须调用 `clearFallingTimer()`。

- [ ] **Step 5: 样式与无障碍**

落体区域与三个中文按钮不重叠；按钮在390×844视口全部可见且至少44像素高；进度条和“第n/5题”始终可见；使用 `prefers-reduced-motion` 时将连续下落替换为等价倒计时进度，不改变时限。

- [ ] **Step 6: 运行测试并提交**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... falling=PASS timer=PASS`。

```powershell
git add app.js styles.css scripts/smoke_game.js
git commit -m "feat(game): add falling meaning review"
```

### Task 4: 奖励、回归、文档和真实浏览器验收

**Files:**
- Modify: `app.js`
- Modify: `server.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `scripts/smoke_game.js`
- Modify: `scripts/auth_flow_test.js`
- Modify: `scripts/launcher_test.ps1`

**Interfaces:**
- Consumes: 前三任务的全部接口与宠物经济计划的结算接口
- Produces: 完整四模式游戏与本地启动验收版本

- [ ] **Step 1: 增加集成失败测试**

断言 `newGame` 在固定分配下分别创建 `spelling`、`falling`、`match3` 和 `pair`；特殊关奖励分别只增加20/30金币；重复 `runId` 不重复奖励；未满12词时回退；特殊关失败不推进关卡、不扣金币。

- [ ] **Step 2: 运行并确认 RED**

Run: `npm test`

Expected: 至少一个新增集成断言失败，现有三消与配对断言仍通过。

- [ ] **Step 3: 完成模式路由与结算集成**

进入关卡前从服务端取得持久化模式；原 `match3`/`pair` 创建逻辑保持原函数；特殊关使用独立构造函数。统一结算只接受服务端返回的金币与进度，页面不自行累加金币。

- [ ] **Step 4: 更新文档和缓存版本**

README 说明单宠物、金币食物、2题拼写关、5题落体关、8%低频与只复习已学词。`index.html` 提升 `pet-system.js`、`review-games.js`、`app.js`、`styles.css` 缓存版本；启动器测试同步精确版本。

- [ ] **Step 5: 全量自动验证**

Run: `npm test`

Expected: GAME、AUTH_FLOW、LAUNCHER全部 PASS，GAME 输出包含 `pet=PASS economy=PASS review=PASS spelling=PASS falling=PASS`。

Run: `npm run check`

Expected: exit 0，且包含新增两个脚本的 `node --check`。

Run: `git diff --check`

Expected: 无输出。

- [ ] **Step 6: 真实浏览器验收**

使用临时账号和390×844视口完成：

1. 预置12个已学词并固定分配拼写关，完成2题、一次纠错和星级结算；
2. 固定分配落体关，验证首次引导、5题、7/6/5秒配置、正确朗读、错误与超时失败、后台暂停；
3. 验证特殊关失败刷新后仍为同模式；
4. 完成三消英文+中文混合消除与配对图片匹配；
5. 验证宠物气泡不遮挡、无横向溢出，浏览器控制台 error/warning 为0。

- [ ] **Step 7: 提交**

```powershell
git add app.js server.js styles.css index.html README.md package.json pet-system.js review-games.js scripts/smoke_game.js scripts/auth_flow_test.js scripts/launcher_test.ps1
git commit -m "feat(game): integrate motivational review progression"
```
