# Task 2 实施报告：移除学习卡、灰色棋盘与中英顺序播报

## 实现内容

- 新增 `createMeaningUtterance(text, voices)` 与 `createLearningUtterances(record, voices)`；每个消除词条按“英文 → 中文”顺序建立朗读队列。
- 新增按语言选择语音的 `selectVoiceForLanguage`，中文优先匹配 `zh-*`，并兼容常见中文语音名称。
- `speakWords(records)` 仅取消一次已有朗读，然后依次入队至多三个词条的英文和中文；`announceElimination` 直接传入完整词条记录。
- 删除顶部目标/学习卡、消除后释义浮层及相关状态和等待动画；紧凑状态区保留剩余步数，并在 `score-row` 显示得分、当前连击和最高连击。
- 三消棋盘和方块切换为指定的统一灰色方案，文本与图片展示面按指定尺寸规则显示；保留选中、提示和特效轮廓。

## 改动文件

- `app.js`
- `styles.css`
- `scripts/smoke_game.js`

## TDD 记录

### RED

命令：`node scripts/smoke_game.js`

关键输出：

```text
Error: 中英文朗读构建器缺失
```

退出码：`1`。失败原因是测试先要求尚不存在的 `createMeaningUtterance` 和 `createLearningUtterances`，符合预期。

### GREEN

命令：`node scripts/smoke_game.js`

关键输出：

```text
GAME_SMOKE=PASS levels=7 board=6x6 match3=PASS pair=PASS missions=PASS praise=PASS pictures=PASS rainbow=PASS audio=PASS tutorial=PASS coverage=PASS auth=PASS register-status=PASS
```

退出码：`0`。

### 语法检查

命令：`npm run check`

关键输出：

```text
> node --check app.js && node --check server.js && node --check session-store.js
```

退出码：`0`，没有 JavaScript 语法错误。

## 自检

- smoke harness 导出了并验证双语语音构建器、`gameView` 与 `tileFaceHtml`。
- 测试确认英文项为 `en-US`、中文项为 `zh-CN`，且中文项选择中文假语音。
- 测试确认游戏 HTML 不再渲染 `target-card`、`target-memory-slot` 或 `meaning-pop`，并保留剩余步数、最高连击和三消展示面。
- 源码范围检查确认 `memoryInline`、`meaningFlash`、`flyMeaningToMemory`、`memoryWords` 与 `.type-0` 至 `.type-5` 均无残留。
- `git diff --check` 没有内容格式错误。

## 疑虑

无功能疑虑。未执行人工浏览器视觉采样；本任务简报要求的 smoke 与语法检查均已通过，棋盘视觉值已按简报逐项写入样式。
