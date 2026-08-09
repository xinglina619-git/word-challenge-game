# 《词灵星球》桌面真实登录交付实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注册只创建账号，显式登录才创建持久会话；桌面入口只启动健康身份匹配的 0.3.0 服务。

**Architecture:** 保持现有 Node.js、Vanilla JavaScript 和文件存储。认证、前端状态、PowerShell 启动器各做一个独立 RED→GREEN 循环，最后用隔离数据完成浏览器与桌面链路验收。

**Tech Stack:** Node.js CommonJS、原生 HTTP、HTML/CSS、PowerShell 5.1、Playwright CLI。

## Global Constraints

- 当前分支 `codex/desktop-auth-delivery`，基线包含 `d2a1e0f`；不再创建或切换分支。
- 不触碰真实 `data/users.json`、用户进度、原目录 `%SystemDrive%/` 或无关 worktree。
- 测试只用随机端口和隔离数据；不输出手机号、密码或原始 token。
- 每项生产改动前先执行能按预期失败的测试；每个 RED→GREEN 循环单独提交。
- 不推送远端。

### Task 1: 健康接口与真实注册/登录

**Files:** `scripts/auth_flow_test.js`, `server.js`, `package.json`

- [ ] 扩展测试：`GET /api/health` 严格返回 `{app:'word-spirit-planet',version:'0.3.0',ok:true}`；注册响应只有 `ok/message/phone` 且会话数不变；无 token 的 `/api/me` 为 401；显式登录后再验证重启恢复、重置与退出。
- [ ] RED：运行 `node scripts/auth_flow_test.js`，确认因 health 404 或注册仍返回 token 而失败。
- [ ] GREEN：新增 health 路由，把注册响应改为：

```js
{ ok: true, message: '注册成功，请使用刚才的手机号和密码登录', phone }
```

- [ ] 将 `package.json` 版本改为 `0.3.0`，运行 `node scripts/auth_flow_test.js` 和 `node --check server.js`。
- [ ] 提交：`fix: require login after registration`。

### Task 2: 前端内联反馈和可访问性状态

**Files:** `scripts/smoke_game.js`, `app.js`, `styles.css`

- [ ] 扩展测试：无 token 默认登录；页签为 `type=button`、`role=tab`、正确 `aria-selected`；忙碌文案分别为“正在登录…”和“正在注册…”；错误 `role=alert`；成功 `role=status`；注册成功保留手机号、清空密码、不设置用户/token。
- [ ] RED：运行 `node scripts/smoke_game.js`，确认因新认证语义缺失而失败。
- [ ] GREEN：认证状态加入 `success/phone`；注册成功切回登录并聚焦密码框；登录成功才保存 token 和进入首页；`busy` 同时阻止重复提交；无 token 时默认 `login`。
- [ ] 运行 `node scripts/smoke_game.js` 和 `node --check app.js`。
- [ ] 提交：`fix: make registration return to login`。

### Task 3: 31876 健康自检启动器

**Files:** `scripts/launcher_fixture_server.js`, `scripts/launcher_test.ps1`, `启动词灵星球.ps1`

- [ ] 写可重复测试：匹配健康复用、空闲端口启动、不匹配占用不杀进程、Node 缺失、8 秒超时、测试模式禁开浏览器。
- [ ] RED：运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/launcher_test.ps1`，确认旧脚本因只检查 3000 监听而失败。
- [ ] GREEN：默认端口 31876；严格校验 app/version/ok；隐藏启动 `node server.js`；日志写 `output/`；最长轮询 8 秒；所有失败中文报错；只在健康成功后打开浏览器；不结束未知进程。
- [ ] 运行启动器测试和 `node scripts/auth_flow_test.js`。
- [ ] 提交：`fix: verify desktop service before launch`。

### Task 4: 缓存、命令与说明

**Files:** `scripts/launcher_test.ps1`, `package.json`, `index.html`, `README.md`

- [ ] 先在启动器测试加入元数据断言并跑 RED：`npm test` 包含启动器测试、缓存版本更新、README 写明 31876 和注册后登录。
- [ ] GREEN：`app.js?v=19`、`styles.css?v=20`；`npm test` 串行运行 game/auth/launcher；README 更新桌面启动与真实登录说明。
- [ ] 运行 `npm run check`、`npm test`。
- [ ] 提交：`docs: document reliable desktop login`。

### Task 5: 隔离浏览器验收

**Files:** 只检查生产文件；运行数据放在 `output/qa-*`。

- [ ] 用随机端口、隔离数据目录和隔离浏览器会话验证：默认登录→注册忙碌→成功状态→回登录→手机号保留/密码清空/焦点正确→登录忙碌→进入首页。
- [ ] 重启同一隔离服务后刷新，确认持久登录恢复；控制台错误为 0。
- [ ] 运行 `npm run check`、`npm test`、`git diff --check d2a1e0f..HEAD` 并核对提交范围。

### Task 6: 桌面交付

**Files:** 原目录 `C:\Users\86138\Documents\EnglishlearningGame` 和桌面快捷方式。

- [ ] 只读确认原 `master` 可快进，且除已知 `%SystemDrive%/` 外没有冲突性改动。
- [ ] 若权限和状态允许，执行 `git merge --ff-only codex/desktop-auth-delivery`；否则报告可快进提交和准确命令，绝不 reset/clean。
- [ ] 从 `词灵星球.lnk` 启动并验证 `/api/health`、注册→回登录→显式登录→首页→服务重启后仍登录，控制台错误为 0。
- [ ] 最终再跑完整检查，报告提交、测试、桌面交付状态；不 push。
