# 三消仅保留中英文方块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三消棋盘只生成和显示英文、中文方块，同时完整保留第二类配对游戏的图片词牌。

**Architecture:** 保留现有 `{ type, face }` 方块模型和所有匹配、提示、补落入口，只把三消展示面来源收窄为 `en`、`zh`。三消渲染统一输出文字并把旧 `image` 数据降级成中文；配对继续通过独立的 `visualForPairWord` 与 `pairFace` 路径显示图片。

**Tech Stack:** 原生 JavaScript、HTML、CSS、Node.js VM 烟雾测试、PowerShell 启动器测试、真实浏览器验收。

## Global Constraints

- 三消初始棋盘、补落、重排只能生成 `en`、`zh`。
- 有效三消必须为同一词条、连续三个以上，并同时包含英文与中文。
- 第二类配对游戏的图片词牌必须保留。
- 不修改音乐、语音、鼓励词、计分、步数、星级、词库或关卡顺序。
- 使用测试先行：先看到新断言按预期失败，再写最小实现。
- 所有用户可读说明使用简体中文；不新增依赖。

---

### Task 1: 收窄三消展示面并保留配对图片

**Files:**
- Modify: `scripts/smoke_game.js:60-65,232-261,337-366`
- Modify: `app.js:459-468,1138-1148`
- Modify: `styles.css:43`

**Interfaces:**
- Consumes: `faceChoicesForWord(word) -> string[]`、`makeTile(type, words) -> { type, face }`、`tileFaceHtml(tile, word) -> string`、`pairFace(card, word) -> string`。
- Produces: 三消展示面集合固定为 `['en', 'zh']`；`tileFaceHtml` 对 `en` 输出英文、对其他旧展示面输出中文；配对图片接口不变。

- [ ] **Step 1: 写入确定性失败测试**

在 `globalThis.__gameTest` 中暴露现有函数：

```js
faceChoicesForWord: typeof faceChoicesForWord === 'function' ? faceChoicesForWord : null,
pairFace: typeof pairFace === 'function' ? pairFace : null,
```

在关卡循环之前加入确定性展示面断言：

```js
if (!test.faceChoicesForWord || Array.from(test.faceChoicesForWord({ word: 'apple', zh: '苹果' })).join(',') !== 'en,zh') {
  throw new Error('三消展示面选择仍包含图片');
}
```

把关卡方块白名单收窄为：

```js
if (game.mode === 'match3' && game.board.some(tile => !Number.isInteger(tile.type) || !['en', 'zh'].includes(tile.face))) {
  throw new Error(`Level ${level} contains an invalid text-only tile`);
}
```

把混合规则夹具改为只包含英文、中文：

```js
const en0 = { type: 0, face: 'en' };
const zh0 = { type: 0, face: 'zh' };

if (!test.findMatchLines(boardWith([en0, en0, zh0])).length) throw new Error('英文与中文混合三连应可消除');
if (test.findMatchLines(boardWith([en0, en0, en0])).length) throw new Error('纯英文三连不应消除');
if (test.findMatchLines(boardWith([zh0, zh0, zh0])).length) throw new Error('纯中文三连不应消除');
```

把三消渲染与兼容断言改为：

```js
if (!gameHtml.includes('tile-text')) throw new Error('三消文字展示面没有渲染');
if (gameHtml.includes('tile-picture')) throw new Error('三消仍在渲染图片方块');
const legacyImageHtml = test.tileFaceHtml({ type: 0, face: 'image' }, { word: 'apple', zh: '苹果' });
if (!legacyImageHtml.includes('tile-text zh') || !legacyImageHtml.includes('苹果') || legacyImageHtml.includes('tile-picture')) {
  throw new Error('旧图片方块没有降级为中文文字');
}
if (!test.pairFace || !test.pairFace({ lang: 'zh', text: '苹果' }, { word: 'apple', zh: '苹果' }).includes('pair-picture')) {
  throw new Error('移除三消图片时误删了配对图片');
}
```

在样式检查处加入：

```js
if (styles.includes('.tile-picture')) throw new Error('三消图片死样式仍然存在');
if (!styles.includes('.pair-picture')) throw new Error('配对图片样式被误删');
```

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `node scripts/smoke_game.js`

Expected: FAIL，首个相关错误为 `三消展示面选择仍包含图片`。

- [ ] **Step 3: 写入最小运行时实现**

在 `app.js` 收窄展示面选择：

```js
function faceChoicesForWord() {
  return ['en', 'zh'];
}
function makeTile(type, words) {
  const faces = faceChoicesForWord(words[type]);
  return { type, face: faces[Math.floor(Math.random() * faces.length)] };
}
```

把三消渲染改为文字输出，并兼容旧 `image` 数据：

```js
function tileFaceHtml(tile, word) {
  const face = tile.face === 'en' ? 'en' : 'zh';
  const text = face === 'zh' ? word.zh : word.word;
  return `<span class="tile-text ${face}">${esc(text)}</span>`;
}
```

在 `styles.css` 的 `.tile` 规则组中删除这一段，保留 `.pair-picture`：

```css
.tile-picture{font-size:clamp(28px,6vw,46px);line-height:1}
```

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `node scripts/smoke_game.js`

Expected: `GAME_SMOKE=PASS ... match3=PASS pair=PASS ... pictures=PASS ...`，退出码为 0。

- [ ] **Step 5: 检查差异并提交运行时变更**

Run: `git diff --check`

Expected: 无错误输出，退出码为 0。

```bash
git add app.js styles.css scripts/smoke_game.js
git commit -m "feat(game): use text-only match-three tiles"
```

---

### Task 2: 更新缓存、说明并完成交付验收

**Files:**
- Modify: `scripts/launcher_test.ps1:195-203`
- Modify: `index.html:9,15`
- Modify: `README.md:21-27`

**Interfaces:**
- Consumes: Task 1 已完成的文字三消运行时和测试断言。
- Produces: `/app.js?v=21`、`/styles.css?v=22` 缓存入口，以及只描述中英文混合三消的 README。

- [ ] **Step 1: 先更新交付断言**

在 `scripts/launcher_test.ps1` 更新缓存断言，并增加 README 行为断言：

```powershell
Assert-Contains $index '/app.js?v=21' 'app.js cache version must be updated'
Assert-Contains $index '/styles.css?v=22' 'styles.css cache version must be updated'
Assert-Contains $readme '同时出现英文与中文' 'README must describe text-only mixed matching'
Assert-True (-not $readme.Contains('中文/图片')) 'README must not advertise match-three picture tiles'
```

- [ ] **Step 2: 运行启动器测试并确认 RED**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/launcher_test.ps1`

Expected: FAIL，错误指出 `app.js cache version must be updated`，因为 `index.html` 仍为 `/app.js?v=20`。

- [ ] **Step 3: 更新缓存入口与用户说明**

把 `index.html` 改为：

```html
<link rel="stylesheet" href="/styles.css?v=22" />
<script src="/app.js?v=21" defer></script>
```

把 README 的三消说明改为：

```markdown
- 6×6 中英文混合三消：同一词条必须同时出现英文与中文，三个以上才能消除
```

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/launcher_test.ps1`

Expected: `LAUNCHER=PASS ...`，退出码为 0。

- [ ] **Step 5: 运行完整自动验证**

Run: `npm test`

Expected: `GAME_SMOKE=PASS`、`SESSION_STORE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`，退出码为 0。

Run: `npm run check`

Expected: 三个 `node --check` 均无错误，退出码为 0。

Run: `git diff --check`

Expected: 无错误输出，退出码为 0。

- [ ] **Step 6: 完成 390×844 真实浏览器验收**

使用当前工作区启动独立本地端口并打开游戏，在浏览器中执行以下验收：

```text
三消关卡：36 个 .tile；36 个方块全部为 .tile-text；.tile-picture 数量为 0；
英文和中文方块都能出现；页面没有横向溢出；完成一次英文+中文混合消除。

配对关卡：至少出现 1 个 .pair-picture；图片词牌仍可与对应英文完成配对。

控制台：error=0，warning=0。
```

验收结束后关闭浏览器，并且只停止本次启动且 PID 已知的临时服务。

- [ ] **Step 7: 提交交付文件**

```bash
git add README.md index.html scripts/launcher_test.ps1
git commit -m "docs(game): describe text-only mixed matching"
```

- [ ] **Step 8: 最终状态核对**

Run: `git status --short --branch`

Expected: `codex/match3-text-only` 工作区干净。

Run: `git log -3 --oneline`

Expected: 顶部依次包含 Task 2、Task 1 和设计说明提交。
