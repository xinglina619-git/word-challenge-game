# 三消词义混合与反馈优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三消改成必须混合英文与中文/图片才能消除，替换全局背景音乐与鼓励词，移除顶部学习区，并按配对准确率正确计算星级。

**Architecture:** 棋盘格由数字词条编号升级为 `{ type, face }`，所有匹配、提示、重排和级联共用同一个“同词条且中英两侧混合”判定。界面只负责按 `face` 渲染英文、中文或图片；音频改为单一循环 MP3，朗读建立英文和中文顺序队列；结算按游戏模式选择独立星级规则。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Web Audio API、Web Speech API、HTMLAudioElement、Node.js `vm` 冒烟测试、PowerShell 启动器测试。

## Global Constraints

- 三消有效组合必须至少三个同义方块，并同时包含英文侧和中文/图片释义侧。
- 三消普通方块统一使用柔和灰色背景；图片或文字只改变内容，不改变底色。
- 删除整块顶部学习卡和消除后的词义卡；保留紧凑关卡、得分、步数与连击信息。
- 背景音乐固定使用 `assets/snake-countdown-bgm.mp3`，继续受现有背景音乐开关控制。
- 鼓励词只能是 `GOOD JOB`、`NICE`、`GREAT`、`EXCELLENT`、`UNBELIEVABLE`。
- 配对关零失误三星、1～2 次失误二星、3 次及以上失误一星；三消规则保持原样。
- 不改变词库、关卡数量、账号、抽卡、道具和配对卡片玩法。
- 允许在专用分支 `codex/mixed-meaning-match3` 创建本地审查提交；不得推送到远程。

---

## File Map

- `app.js`：棋盘数据、匹配判定、渲染、语音、背景音乐、鼓励词和星级计算。
- `styles.css`：灰色三消棋盘、放大文字/图片、紧凑状态区域及删除旧学习卡样式。
- `scripts/smoke_game.js`：全部规则与静态渲染回归测试。
- `index.html`：脚本和样式缓存版本号。
- `assets/snake-countdown-bgm.mp3`：用户提供的循环背景音乐副本。
- `README.md`：同步已实现玩法说明。

---

### Task 1: 中英混合棋盘数据与有效消除规则

**Files:**
- Modify: `scripts/smoke_game.js:32-56, 180-205`
- Modify: `app.js:542-740, 827-922, 1026-1058, 1263-1269`

**Interfaces:**
- Produces: `tileType(tile): number`
- Produces: `makeTile(type, words): { type: number, face: 'en' | 'zh' | 'image' }`
- Produces: `isMixedMeaningLine(line, board): boolean`
- Changes: `findMatchLines(board)` returns only same-`type` lines that contain both English and meaning sides.
- Changes: `makeBoard(words)` and `collapseBoard(game, removed)` always create object tiles.

- [ ] **Step 1: Export the new rule helpers in the smoke harness**

Add these names to `globalThis.__gameTest`:

```js
tileType, makeTile, isMixedMeaningLine,
```

- [ ] **Step 2: Write failing mixed-line tests**

Add before the existing five-match test:

```js
const boardWith = cells => {
  const board = Array.from({ length: 36 }, (_, index) => ({ type: index + 10, face: 'en' }));
  cells.forEach((tile, index) => { board[index] = tile; });
  return board;
};
const en0 = { type: 0, face: 'en' };
const zh0 = { type: 0, face: 'zh' };
const image0 = { type: 0, face: 'image' };

if (!test.findMatchLines(boardWith([en0, en0, zh0])).length) throw new Error('英文与中文混合三连应可消除');
if (!test.findMatchLines(boardWith([en0, en0, image0])).length) throw new Error('英文与图片混合三连应可消除');
if (test.findMatchLines(boardWith([en0, en0, en0])).length) throw new Error('纯英文三连不应消除');
if (test.findMatchLines(boardWith([zh0, image0, zh0])).length) throw new Error('只有释义侧的三连不应消除');
```

Update the existing level loop:

```js
if (game.mode === 'match3' && game.board.some(tile => !Number.isInteger(tile.type) || !['en', 'zh', 'image'].includes(tile.face))) {
  throw new Error(`Level ${level} contains an invalid mixed-meaning tile`);
}
for (const move of test.possibleMoves(game.board).slice(0, 5)) {
  if (!test.findMatchLines(test.swap(game.board, move.a, move.b)).length) throw new Error(`Level ${level} exposes an invalid hint move`);
}
```

- [ ] **Step 3: Run the smoke test and verify RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL because `tileType`, `makeTile` or `isMixedMeaningLine` is not defined, before implementation changes.

- [ ] **Step 4: Implement tile helpers and mixed-line filtering**

Add near `const SIZE = 6`:

```js
function tileType(tile) { return typeof tile === 'object' ? tile.type : tile; }
function tileFace(tile) { return typeof tile === 'object' ? tile.face : 'en'; }
function faceChoicesForWord(word) {
  return visualForPairWord(word.word) ? ['en', 'zh', 'image'] : ['en', 'zh'];
}
function makeTile(type, words) {
  const faces = faceChoicesForWord(words[type]);
  return { type, face: faces[Math.floor(Math.random() * faces.length)] };
}
function isMixedMeaningLine(line, board) {
  const faces = line.map(index => tileFace(board[index]));
  return faces.includes('en') && faces.some(face => face !== 'en');
}
```

In `findMatchLines`, compare `tileType(...)` instead of raw board entries and filter the collected lines:

```js
return lines.filter(line => isMixedMeaningLine(line, board));
```

In `possibleMoves`, compare `tileType(board[index])`, and return matched word types with:

```js
words: [...new Set(lines.map(line => tileType(changed[line[0]])))]
```

- [ ] **Step 5: Convert board construction, collapse and special removal to object tiles**

Replace the board constructor with:

```js
function makeBoard(words) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const board = [];
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const { row, col } = cellOf(index);
      const blocked = new Set();
      if (col >= 2 && tileType(board[index - 1]) === tileType(board[index - 2])) blocked.add(tileType(board[index - 1]));
      if (row >= 2 && tileType(board[index - SIZE]) === tileType(board[index - SIZE * 2])) blocked.add(tileType(board[index - SIZE]));
      const choices = words.map((_, type) => type).filter(type => !blocked.has(type));
      const type = choices[Math.floor(Math.random() * choices.length)];
      board.push(makeTile(type, words));
    }
    if (possibleMoves(board).length) return board;
  }
  throw new Error('无法生成含有中英混合消除机会的棋盘');
}
```

Update all callers from `makeBoard(game.words.length)` or `makeBoard(words.length)` to `makeBoard(game.words)` or `makeBoard(words)`.

In `collapseBoard`, replace the refill number with:

```js
const type = Math.floor(Math.random() * game.words.length);
board[indexOf(row, col)] = i < kept.length ? kept[i] : makeTile(type, game.words);
```

In `expandedRemoval`, read the matched type with `tileType(...)` and compare every board entry using `tileType(value) === type`.

- [ ] **Step 6: Update selection, target type and board rendering**

When resolving matches use:

```js
const matchedTypes = new Set(lines.map(line => tileType(game.board[line[0]])));
```

Render a tile through a focused helper:

```js
function tileFaceHtml(tile, word) {
  if (tile.face === 'image') {
    return `<span class="tile-picture" role="img" aria-label="${esc(word.zh)}">${visualForPairWord(word.word)}</span>`;
  }
  const text = tile.face === 'zh' ? word.zh : word.word;
  return `<span class="tile-text ${tile.face}">${esc(text)}</span>`;
}
```

The match-three render loop must read `const word = game.words[tile.type]`, use `type-${tile.type}`, and call `tileFaceHtml(tile, word)`.

- [ ] **Step 7: Run the smoke test and verify GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS` and every generated match-three board has object tiles and at least one valid mixed move.

---

### Task 2: 删除顶部学习区、统一灰色棋盘并顺序播报中英文

**Files:**
- Modify: `scripts/smoke_game.js:32-56, 153-174, 230-239`
- Modify: `app.js:407-485, 778-826, 1237-1278`
- Modify: `styles.css:40-60, 75-87`

**Interfaces:**
- Produces: `createMeaningUtterance(text, voices): SpeechSynthesisUtterance`
- Produces: `createLearningUtterances(record, voices): SpeechSynthesisUtterance[]`
- Changes: `speakWords(records)` queues English then Chinese for each record.
- Removes from active rendering: `memoryInline`, `meaningFlash`, `flyMeaningToMemory`, `.target-card`, `.meaning-pop`.

- [ ] **Step 1: Write failing bilingual-speech and no-learning-card tests**

Export `createMeaningUtterance`, `createLearningUtterances`, `gameView`, and `tileFaceHtml` from the smoke harness. Add a Chinese fake voice:

```js
{ name: 'Microsoft Xiaoxiao', lang: 'zh-CN', voiceURI: 'voice-chinese' }
```

Add:

```js
const bilingual = test.createLearningUtterances({ word: 'apple', zh: '苹果' }, fakeVoices);
if (bilingual.length !== 2 || bilingual[0].text !== 'apple' || bilingual[0].lang !== 'en-US') throw new Error('英文朗读项不正确');
if (bilingual[1].text !== '苹果' || bilingual[1].lang !== 'zh-CN') throw new Error('中文朗读项不正确');

test.gameState.game = test.newGame(2);
const gameHtml = test.gameView();
if (gameHtml.includes('target-card') || gameHtml.includes('target-memory-slot') || gameHtml.includes('meaning-pop')) {
  throw new Error('游戏顶部学习区或消除后学习卡仍在渲染');
}
if (!gameHtml.includes('剩余步数') || !gameHtml.includes('最高连击')) throw new Error('删除学习区后必要状态信息缺失');
if (!gameHtml.includes('tile-text') && !gameHtml.includes('tile-picture')) throw new Error('三消展示面没有渲染');
```

Replace old `memoryInline` expectations with an assertion that the function is no longer exported or rendered.

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL because `createLearningUtterances` and the compact game rendering do not exist.

- [ ] **Step 3: Implement separate English and Chinese utterance builders**

Add:

```js
function createMeaningUtterance(text, voices = systemVoices()) {
  const line = new SpeechSynthesisUtterance(text);
  line.lang = 'zh-CN';
  line.rate = .86;
  line.pitch = 1.08;
  line.volume = 1;
  line.voiceRole = 'meaning';
  line.voice = selectVoiceForLanguage(cacheSystemVoices(voices), 'zh');
  return line;
}
function createLearningUtterances(record, voices = systemVoices()) {
  return [createLearningUtterance(record.word, voices), createMeaningUtterance(record.zh, voices)];
}
```

Add this language-specific voice selector:

```js
function selectVoiceForLanguage(voices = [], language = 'zh') {
  const prefix = `${language}`.toLowerCase();
  return voices.find(voice => `${voice.lang || ''}`.toLowerCase().startsWith(prefix))
    || voices.find(voice => language === 'zh' && /xiaoxiao|huihui|yaoyao|chinese|mandarin/i.test(voice.name || ''))
    || null;
}
```

Change `speakWords` to accept word records, cancel once, and queue the two utterances per record in order:

```js
async function speakWords(records) {
  if (!state.audio.speech || !('speechSynthesis' in window) || !records.length) return;
  const voices = await waitForSystemVoices();
  window.speechSynthesis.cancel();
  records.slice(0, 3).flatMap(record => createLearningUtterances(record, voices)).forEach((line, index) => {
    if (!index) lastLearningVoiceURI = line.voice?.voiceURI || '';
    window.speechSynthesis.speak(line);
  });
}
```

Update `announceElimination` to call `speakWords(learned)`.

- [ ] **Step 4: Remove persistent and transient learning-card state**

Remove `memoryWords` and `meaningFlash` from `newGame`, delete `memoryInline` and `flyMeaningToMemory`, and remove the wait/call that flies meanings to the top. `announceElimination` should update coverage/mastery and trigger bilingual speech without storing display state.

In `gameView`, remove the entire `target-card` section and `meaning-pop` markup. Keep `game-head`, `goal-progress`, `game-message`, board, tools and `score-row`. Extend `score-row` to show the current combo alongside score and highest combo.

- [ ] **Step 5: Apply the uniform gray visual system**

Replace the active match-three board and tile rules with:

```css
.board{background:#d6d8d7;box-shadow:inset 0 3px #ffffffb8,0 12px 26px #4f555634}
.tile{background:#f3f4f2;border-color:#fff;box-shadow:inset 0 2px #fff,0 4px 0 #a8acab;color:#26302e}
.tile-text{max-width:100%;font-size:clamp(13px,2.7vw,20px);font-weight:950;line-height:1.05;white-space:normal;overflow-wrap:anywhere}
.tile-text.zh{font-size:clamp(16px,3.2vw,23px)}
.tile-picture{font-size:clamp(28px,6vw,46px);line-height:1}
```

Remove `.type-0` through `.type-5` background declarations and obsolete target-memory/meaning-pop responsive rules. Keep selected, hint and effect outlines.

- [ ] **Step 6: Run smoke and syntax checks**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS`.

Run: `npm run check`

Expected: exit code 0 with no JavaScript syntax error.

---

### Task 3: 使用用户 MP3 并收敛为五级鼓励词

**Files:**
- Create: `assets/snake-countdown-bgm.mp3`
- Modify: `scripts/smoke_game.js:8-27, 140-174, 200-205`
- Modify: `app.js:17-70, 183-390, 433-470, 789-801, 1424-1438, 1470, 1518, 1540, 1570, 1593`

**Interfaces:**
- Produces: `BACKGROUND_MUSIC_SRC = '/assets/snake-countdown-bgm.mp3'`
- Produces: `backgroundMusic: HTMLAudioElement` with `loop === true`
- Changes: `startMusic()` plays the single MP3; `stopMusic(reset = false)` pauses it.
- Changes: `praiseForEffect(kind, count, combo)` returns only the approved five phrases.

- [ ] **Step 1: Add an Audio stub and write failing music tests**

Add a minimal `Audio` stub to the VM context:

```js
Audio: class Audio {
  constructor(src) { this.src = src; this.loop = false; this.currentTime = 0; this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
},
```

Export `BACKGROUND_MUSIC_SRC`, `backgroundMusic`, `startMusic`, and `stopMusic`. Replace the old per-spirit music assertions with:

```js
if (test.backgroundMusicSrc !== '/assets/snake-countdown-bgm.mp3') throw new Error('背景音乐资源路径不正确');
if (!test.backgroundMusic?.loop) throw new Error('背景音乐没有循环播放');
if (!fs.existsSync(path.join(root, 'assets', 'snake-countdown-bgm.mp3'))) throw new Error('背景音乐文件缺失');
```

Replace the encouragement expectations with:

```js
const praiseWords = ['GOOD JOB', 'NICE', 'GREAT', 'EXCELLENT', 'UNBELIEVABLE'];
if (!test.praiseVoiceProfiles || praiseWords.some(word => !test.praiseVoiceProfiles[word])) throw new Error('五级鼓励词配置不完整');
for (const removed of ['GOOD', 'AMAZING', 'BONUS TIME']) {
  if (test.praiseVoiceProfiles[removed]) throw new Error(`旧鼓励词 ${removed} 未删除`);
}
if (test.praiseForEffect('pop', 3, 1) !== 'GOOD JOB') throw new Error('基础鼓励等级错误');
if (test.praiseForEffect('pop', 4, 2) !== 'NICE') throw new Error('二级鼓励等级错误');
if (test.praiseForEffect('cascade', 6, 3) !== 'GREAT') throw new Error('三级鼓励等级错误');
if (test.praiseForEffect('rocket', 8, 3) !== 'EXCELLENT') throw new Error('四级鼓励等级错误');
if (test.praiseForEffect('rainbow', 12, 4) !== 'UNBELIEVABLE') throw new Error('五级鼓励等级错误');
```

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL because the MP3 asset/config and new praise ladder are absent.

- [ ] **Step 3: Copy the user-provided MP3 into the project**

Run:

```powershell
Copy-Item -LiteralPath 'C:\KuGou\草莓酱紫 - 倒计时BGM.mp3' -Destination 'assets\snake-countdown-bgm.mp3'
```

Verify:

```powershell
Get-Item -LiteralPath 'assets\snake-countdown-bgm.mp3' | Select-Object Name,Length
```

Expected: `snake-countdown-bgm.mp3`, length `1305112` bytes.

- [ ] **Step 4: Replace synthesized themes with one looping HTML audio element**

Delete `SPIRIT_MUSIC_THEMES`, `musicThemeForSpirit`, scheduled BGM nodes/timers and oscillator scheduling. Add:

```js
const BACKGROUND_MUSIC_SRC = '/assets/snake-countdown-bgm.mp3';
const backgroundMusic = new Audio(BACKGROUND_MUSIC_SRC);
backgroundMusic.loop = true;
backgroundMusic.preload = 'auto';
backgroundMusic.volume = .28;

function startMusic() {
  if (!state.audio.music || !backgroundMusic.paused) return;
  backgroundMusic.play().catch(() => {});
}
function stopMusic(reset = false) {
  backgroundMusic.pause();
  if (reset) backgroundMusic.currentTime = 0;
}
```

Update music toggle to resume/pause without resetting. Update logout to `stopMusic(true)`. Replace all per-spirit restart calls and the related toast text with generic `startMusic()` behavior.

- [ ] **Step 5: Implement the five approved praise levels**

Replace profiles and mapping so that the only keys are:

```js
const PRAISE_VOICE_PROFILES = {
  'GOOD JOB': { rate: 1.05, pitch: 1.42, volume: .90, chime: [784, 988], cheerBursts: 2 },
  NICE: { rate: 1.04, pitch: 1.45, volume: .92, chime: [784, 988, 1175], cheerBursts: 2 },
  GREAT: { rate: 1.01, pitch: 1.48, volume: .94, chime: [659, 880, 1175], cheerBursts: 3 },
  EXCELLENT: { rate: .96, pitch: 1.52, volume: .96, chime: [659, 880, 1175, 1397], cheerBursts: 3 },
  UNBELIEVABLE: { rate: .88, pitch: 1.58, volume: .98, chime: [659, 988, 1319, 1760, 1976], cheerBursts: 4 }
};
```

Use this exact five-level mapping:

```js
function praiseForEffect(kind, count = 3, combo = 1) {
  if (kind === 'rainbow' || combo >= 5) return 'UNBELIEVABLE';
  if (kind === 'coin-burst' || kind === 'rocket' || kind === 'burst' || count >= 9) return 'EXCELLENT';
  if (kind === 'cascade' || combo >= 3 || count >= 6) return 'GREAT';
  if (combo >= 2 || count >= 4) return 'NICE';
  return 'GOOD JOB';
}
```

- [ ] **Step 6: Run the smoke test and verify GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS`, MP3 asset exists, and only the five approved encouragement phrases remain.

---

### Task 4: 修复配对关星级算法

**Files:**
- Modify: `scripts/smoke_game.js:32-56, 200-205`
- Modify: `app.js:642-680, 924-1024`

**Interfaces:**
- Produces: `starsForGame(game): 1 | 2 | 3`
- Adds: `game.pairMistakes: number`
- Changes: `finishLevel(true)` calls `starsForGame(game)`.

- [ ] **Step 1: Write failing star-grade tests**

Export `starsForGame`, then add:

```js
const pairStars = test.newGame(3);
pairStars.moves = 5;
pairStars.pairMistakes = 0;
if (test.starsForGame(pairStars) !== 3) throw new Error('配对零失误应获得三星');
pairStars.pairMistakes = 1;
if (test.starsForGame(pairStars) !== 2) throw new Error('配对一次失误应获得二星');
pairStars.pairMistakes = 2;
if (test.starsForGame(pairStars) !== 2) throw new Error('配对两次失误应获得二星');
pairStars.pairMistakes = 3;
if (test.starsForGame(pairStars) !== 1) throw new Error('配对三次失误应获得一星');

const matchStars = test.newGame(2);
matchStars.moves = 10;
if (test.starsForGame(matchStars) !== 3) throw new Error('三消三星阈值不应改变');
matchStars.moves = 5;
if (test.starsForGame(matchStars) !== 2) throw new Error('三消二星阈值不应改变');
```

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL because `starsForGame` is not defined.

- [ ] **Step 3: Track pair mistakes and calculate stars by mode**

Initialize `pairMistakes: 0` in `newGame`. Increment only in the incorrect branch of `selectPair`:

```js
game.pairMistakes += 1;
```

Add:

```js
function starsForGame(game) {
  if (game.mode === 'pair') {
    if (game.pairMistakes === 0) return 3;
    if (game.pairMistakes <= 2) return 2;
    return 1;
  }
  return game.moves >= 10 ? 3 : game.moves >= 5 ? 2 : 1;
}
```

Replace the inline expression in `finishLevel` with `const stars = starsForGame(game);`.

- [ ] **Step 4: Run the smoke test and verify GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS`, including all four pair-star assertions and unchanged match-three thresholds.

---

### Task 5: 文档同步、缓存刷新与全量验证

**Files:**
- Modify: `README.md:15-35`
- Modify: `index.html:8-15`
- Verify: `app.js`, `styles.css`, `assets/snake-countdown-bgm.mp3`

**Interfaces:**
- No new runtime interface.
- Produces a user-visible build whose browser cache loads the updated CSS and JavaScript.

- [ ] **Step 1: Update README behavior bullets**

Replace outdated bullets so the README explicitly states:

```markdown
- 6×6 词义混合三消：同一词条必须同时出现英文与中文/图片，三个以上才能消除
- 消除时依次朗读英文和中文，方块随后直接消失，不保留顶部学习卡
- 分级英文赞美声：GOOD JOB、NICE、GREAT、EXCELLENT、UNBELIEVABLE
- 使用统一循环背景音乐；背景音乐、游戏音效和单词朗读可分别开关
- 中英配对按失误次数评定一至三星
```

- [ ] **Step 2: Refresh asset cache versions**

Set the stylesheet and script query versions in `index.html` to:

```html
<link rel="stylesheet" href="/styles.css?v=21" />
<script src="/app.js?v=20" defer></script>
```

- [ ] **Step 3: Run the complete automated suite**

Run: `npm test`

Expected:

```text
GAME_SMOKE=PASS
AUTH_FLOW=PASS
LAUNCHER=PASS
```

Run: `npm run check`

Expected: exit code 0.

- [ ] **Step 4: Start the app for browser verification**

Run the existing launcher in a hidden/background process, wait for `/api/health`, and open `http://127.0.0.1:31876` with the existing browser test session.

Expected health response: `ok: true`, app name `word-spirit-planet`, version `0.3.0`.

- [ ] **Step 5: Verify the game at desktop and phone sizes**

At `1280×900` and `390×844`, verify:

- a match-three level renders 36 gray tiles with a visible mix of English and meaning faces;
- the board has no horizontal overflow;
- the old target/learning card and meaning popup are absent;
- creating a pure-English semantic triple does not remove it;
- creating a mixed English-plus-Chinese/image semantic triple removes it;
- the audio setting starts/pauses the MP3 without affecting effects or speech;
- a zero-error pair level reaches a three-star result;
- browser console has no uncaught errors.

Capture one desktop and one phone screenshot for visual review.

- [ ] **Step 6: Inspect the final diff and workspace state**

Run:

```powershell
git diff --check
git status --short
git diff -- app.js styles.css scripts/smoke_game.js index.html README.md docs/superpowers/specs/2026-08-19-mixed-meaning-match3-design.md docs/superpowers/plans/2026-08-19-mixed-meaning-match3.md
```

Expected: no whitespace errors; only the planned source, test, documentation and MP3 asset changes are present. Do not commit or push.
