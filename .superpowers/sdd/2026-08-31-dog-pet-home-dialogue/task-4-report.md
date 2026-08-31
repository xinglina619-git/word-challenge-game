# Task 4：游戏改名与学习页宠物展示边界

## 实现范围

- 浏览器标题、项目说明、顶栏、登录按钮和服务启动日志统一为“单词消消养宠记”，版本更新为 `0.4.0`。
- 主页只保留玩家学习信息和中性宠物屋入口；已领取小狗的名字、形象、成长条和台词不再出现在主页。
- 新增上海日期与宠物屋关注状态纯函数；入口始终给出文字化照顾摘要，待关注时同时提供语义红点标记。
- 关卡介绍改用 🎯，结算改用 🏆/🌱，三消、配对、拼写、落体和结算不再写入或渲染宠物台词、姓名或小狗素材。
- 登录、密码恢复、错词本空状态、排行榜和玩家档案的装饰统一为中性“单词小助手”；狗狗素材仅保留在领取页和宠物屋。
- 启动器测试的版本断言同步为 `0.4.0`，以覆盖版本升级。

## RED / GREEN 证据

- RED：`node scripts/smoke_game.js` 在新增标题断言后失败，错误为“浏览器标题尚未改名”。
- GREEN：最小实现后，`node scripts/smoke_game.js` 通过，输出 `GAME_SMOKE=PASS`，包括新增的名称、主页红点/摘要及关卡、闯关、结算无小狗断言。

## 测试证据

- 聚焦烟雾：`node scripts/smoke_game.js` 通过。
- 语法检查：`npm run check` 通过。
- 完整套件首次执行：`npm test` 中烟雾和会话存储通过；认证流程在受限沙箱创建临时本地服务器时因 `spawn EPERM` 中断。
- 环境核实后：授权环境执行 `node scripts/auth_flow_test.js` 通过，输出 `AUTH_FLOW=PASS`。
- 启动器：先因旧版本断言 `0.3.0` 失败；同步测试断言后，在授权环境执行 `scripts/launcher_test.ps1` 通过，输出 `LAUNCHER=PASS`。

## 改动文件

- `app.js`
- `index.html`
- `package.json`
- `server.js`
- `scripts/smoke_game.js`
- `scripts/launcher_test.ps1`

## 自查与担忧

- `rg -n "petQuote|petSpeech\\('(start|combo|retry|star1|star2|star3)'\\)|hero-spirit-wrap|result-pet-speech" app.js` 无匹配。
- 主页、关卡介绍、闯关与结算的烟雾渲染均检查了宠物名字、狗狗资产路径、狗气泡和狗形象标记均不出现。
- 依据任务边界，本任务不修改 `styles.css`：`pet-attention-dot` 和 `pet-room-entry` 是可读文案之外的语义标记；专门视觉样式留给 Task 6。当前入口不依赖颜色本身传达照顾状态。
- 无功能性担忧；完整套件的一次性命令受沙箱子进程权限影响，但其被中断的认证与启动器组成步骤已在授权环境分别通过。
