# 合并前最终审查集中修复报告

## 范围与基线

- 工作树：`C:\Users\86138\.codex\visualizations\2026\08\30\01a051d7-62b6-7fd2-9911-942aa1ec9f73\EnglishlearningGame-dog-pet-home-dialogue`
- 分支：`codex/dog-pet-home-dialogue`
- 起始提交：`d14c3a2 fix: rename desktop launcher for dog pet game`
- 本轮只修改本工作树中的 `app.js`、`styles.css`、`scripts/smoke_game.js` 与本报告；未触碰主项目、桌面快捷方式、`%SystemDrive%/`，未推送。
- 实施方法：先完成根因调查；每项行为先增加最小回归测试并运行 `node scripts/smoke_game.js` 看见预期 RED，再做最小实现并运行同一命令确认 GREEN。

## 1. 普通关卡介绍仍出现旧宠物概念

### 根因

`missionForLevel()` 的 Boss 与宝箱分支已使用中性奖励文案，但普通关卡默认分支仍保留旧字符串“完成挑战，积累词灵成长能量”。既有页面边界测试只排除了宠物名字、犬种素材和宠物 DOM 标记，没有检查关卡介绍的语义文案，因此漏过了旧概念。

### RED

- 命令：`node scripts/smoke_game.js`
- 关键失败：`Error: 普通关卡介绍仍含词灵或宠物成长暗示`
- 预期原因：新断言直接检查普通关卡介绍渲染结果不得包含“词灵”或“成长能量”，旧默认文案必然触发。

### GREEN

- 最小实现：普通关卡奖励文案改为“完成挑战，获得学习金币”。
- 证据：同一命令输出 `GAME_SMOKE=PASS ... missions=PASS ... pet=PASS`。

## 2. 特技表演期间其他按钮没有真正禁用

### 根因

点击处理器通过 `state.activeTrickId` 静默拒绝第二次表演，但 `trickBookView()` 没有把该状态投射为原生 `disabled` 和 `aria-disabled` 属性。结果是事件层阻止了动作，视觉、键盘焦点和无障碍状态却仍表示按钮可操作。

### RED

- 命令：`node scripts/smoke_game.js`
- 关键失败：`Error: 特技表演期间其他表演按钮未进入禁用状态`
- 预期原因：测试把等级设为可解锁两个特技并激活其中一个；旧模板渲染的两个“表演一下”按钮都没有禁用属性。

### GREEN

- 最小实现：成长册按 `Boolean(state.activeTrickId)` 为所有已解锁表演按钮输出 `disabled aria-disabled="true"`；状态清空后模板不再输出两属性。
- 证据：同一命令通过；测试同时验证当前按钮、另一个已解锁按钮均禁用，以及动画状态清空后恢复。

## 3. 连续喂食可能重复情绪语句

### 根因

`petSpeech()` 以前使用 `state.lastPetQuote` 作为去重依据；喂食完成后又把该字段覆盖为“情绪句 + 成长目标”。下一次 `quoteFor()` 收到的 previous 不再与任一纯情绪句完全相等，过滤失效，固定随机位置可以立即选回上一句。

### RED

- 命令：`node scripts/smoke_game.js`
- 关键失败：`Error: 连续喂食仍可能重复同一句情绪反馈`
- 预期原因：测试固定 `Math.random()` 为 0，第一次生成情绪句后模拟拼接成长目标，再次进入同一喂食场景；旧逻辑两次选择相同句子。

### GREEN

- 最小实现：新增仅存在于客户端会话的 `lastPetSceneQuotes`，按场景保存上一条纯情绪句；展示用 `lastPetQuote` 继续保存完整气泡。切换账号时清空场景历史。
- 证据：同一命令通过；另有连续两次真实调用 `feedPet('starBiscuit')` 的确定性测试，固定随机源后确认两次情绪句不同。
- 兼容性：没有修改服务端存档、迁移模型或接口字段，名称、等级、成长、金币和食物持久化路径不受影响。

## 4. 犬种图片加载失败时爪印兜底不可靠

### 根因

`dogFigure()` 仅在犬种对象不存在时返回爪印；犬种存在时只渲染带 CSS `background-image` 的空 `span`。CSS 背景加载失败不会生成可监听的 DOM 错误状态，因此损坏或缺失资源会留下空白。

### RED

- 命令：`node scripts/smoke_game.js`
- 关键失败：`Error: 小狗素材加载失败时没有可切换的爪印兜底`
- 预期原因：旧渲染没有默认爪印层、图片探针或加载/错误处理器。

### GREEN

- 最小实现：犬种图默认渲染中性爪印层与隐藏图片探针；文档级捕获 `load`/`error`，仅加载成功时增加 `asset-loaded` 并显示雪碧图，错误时保留爪印并标记 `asset-error`。
- 证据：同一命令通过；行为测试验证处理器真实注册到页面 `load`/`error`，错误与成功事件会正确切换类名；样式断言覆盖探针、成功态和兜底层。
- 自审修正：宠物屋已有后代文字规则会把爪印缩成 10px，已在更高优先级的兜底选择器中明确设置 72px。

## 5. 成长区缺少累计成长值

### 根因

宠物屋成长模板只输出阶段、等级、进度条和距下一等级差值；`pet.growth` 已由现有规范化数据提供，但未渲染。

### RED

- 命令：`node scripts/smoke_game.js`
- 关键失败：`Error: 成长区没有显示累计成长值`
- 预期原因：成长值为 70 的夹具渲染结果中不存在“累计成长值 70”。

### GREEN

- 最小实现：在等级标题与成长条之间增加“累计成长值 X”。
- 证据：同一命令通过，并保留既有“还差 80 成长值”和下一特技断言。

## 完整验证

- `npm test`：退出码 0；`GAME_SMOKE=PASS`、`SESSION_STORE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`。
- `npm run check`：退出码 0；`pet-system.js`、`review-games.js`、`app.js`、`server.js`、`session-store.js`、启动器辅助脚本语法检查通过。
- `git diff --check`：提交后的最终运行退出码 0、无输出。
- 沙箱说明：第一次在受限环境运行 `npm test` 时，`auth_flow_test.js` 启动隔离子进程遭遇 `spawn EPERM`；按环境权限流程重新运行完整同一命令后全部通过。这是测试进程权限问题，不是功能回归。

## 文件与提交

- `app.js`：中性关卡文案、按场景情绪去重、特技禁用态、图片加载兜底、累计成长值。
- `styles.css`：图片成功态、默认爪印层、隐藏加载探针。
- `scripts/smoke_game.js`：五项回归测试与连续两次喂食确定性测试。
- `.superpowers/sdd/2026-09-06-desktop-launcher-rename/final-review-fix-report.md`：本报告。
- 提交：本报告所在提交，subject 为 `fix(pet): resolve final dog room review findings`。

## 自审与顾虑

- 六犬种目录、命名、服务端迁移、北京时间提醒、满级不消耗食物均未修改；内部 `word-spirit-planet` 与 `WORD_SPIRIT_*` 标识未修改。
- 关卡介绍新增的是输出级语义断言；关卡玩法和结算原有无宠物边界断言继续通过。
- 特技按钮同时使用原生禁用与 ARIA 状态，动画结束既有定时器清空 `activeTrickId` 后自然恢复。
- 图片探针与 CSS 背景请求同一路径，浏览器缓存会复用资源；失败仍保留可见且带犬种无障碍名称的中性爪印区域。
- 唯一顾虑是受限 Windows 沙箱不能创建接口测试子进程；已通过授权环境下的完整原命令验证，不影响交付代码。
