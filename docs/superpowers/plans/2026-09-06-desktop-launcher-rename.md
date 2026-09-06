# 《单词消消养宠记》桌面启动入口彻底更名 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除所有用户可见的旧桌面启动入口，将项目脚本、说明、测试和 Windows 桌面快捷方式统一为“单词消消养宠记”，并把已完成的养狗版本安全交付到主项目。

**Architecture:** 在 `codex/dog-pet-home-dialogue` 专用分支先以 TDD 完成启动脚本硬重命名和中文错误文案更新；整分支复审无阻断后，仅用快进方式把分支交付到主项目。最后创建指向主项目新脚本的桌面快捷方式，验证成功后删除精确的旧快捷方式。

**Tech Stack:** Windows PowerShell、WScript.Shell COM、Node.js、现有 VM/接口/启动器测试、Git worktree。

## Global Constraints

- 用户可见名称和启动入口全部使用“单词消消养宠记”，不保留 `启动词灵星球.ps1`、`词灵星球.lnk` 或兼容包装入口。
- 内部 `word-spirit-planet` 应用标识、`WORD_SPIRIT_*` 环境变量、令牌键和 API 路径保持兼容，不显示给用户。
- 新正式脚本固定为 `启动单词消消养宠记.ps1`，桌面快捷方式固定为 `单词消消养宠记.lnk`。
- 启动端口仍为 `31876`，健康检查版本仍为 `0.4.0`，端口冲突、缺少 Node.js、启动超时和隐藏后台进程行为不变。
- 先完成专用分支实现、自动化验证和整分支复审，再快进合并主项目，最后切换桌面快捷方式。
- 主项目未跟踪 `%SystemDrive%/` 目录保持原样，不暂存、不移动、不删除。
- 不推送远端。

---

### Task 1: 硬重命名启动脚本并更新用户可见文案

**Files:**
- Rename: `启动词灵星球.ps1` → `启动单词消消养宠记.ps1`
- Modify: `启动单词消消养宠记.ps1:12-112`
- Modify: `scripts/launcher_test.ps1:1-205`
- Modify: `README.md:5-8`

**Interfaces:**
- Consumes: 现有 `WORD_SPIRIT_*` 环境变量、`word-spirit-planet` 健康标识、`0.4.0` 健康版本和 `scripts/launcher_process_helper.js`。
- Produces: 唯一正式启动脚本 `启动单词消消养宠记.ps1`，以及明确定位该脚本并拒绝旧文件的启动器回归测试。

- [ ] **Step 1: 先让启动器测试要求新脚本并拒绝旧脚本**

把 `scripts/launcher_test.ps1` 顶部的模糊 `*.ps1` 选择替换为精确路径；在 `Assert-True` 定义后加入存在性断言：

```powershell
$newLauncher = Join-Path $root '启动单词消消养宠记.ps1'
$oldLauncher = Join-Path $root '启动词灵星球.ps1'
$fixture = Join-Path $root 'scripts\launcher_fixture_server.js'
$processHelper = Join-Path $root 'scripts\launcher_process_helper.js'
$testScript = $MyInvocation.MyCommand.Path

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

Assert-True (Test-Path -LiteralPath $newLauncher -PathType Leaf) 'New launcher must exist'
Assert-True (-not (Test-Path -LiteralPath $oldLauncher)) 'Legacy launcher must not exist'
$launcher = $newLauncher
```

在缺少 Node.js 和启动超时断言旁加入新名称断言及旧名称反向断言：

```powershell
$newVisibleName = ConvertFrom-TestText '5Y2V6K+N5raI5raI5YW75a6g6K6w'
$oldVisibleName = ConvertFrom-TestText '6K+N54G15pif55CD'
Assert-Contains $missingNode.Output $newVisibleName 'Missing Node error must use the new game name'
Assert-True (-not $missingNode.Output.Contains($oldVisibleName)) 'Missing Node error must not expose the legacy name'
Assert-Contains $timeout.Output $newVisibleName 'Timeout error must use the new game name'
Assert-True (-not $timeout.Output.Contains($oldVisibleName)) 'Timeout error must not expose the legacy name'
```

在 README 断言区域加入：

```powershell
Assert-Contains $readme '启动单词消消养宠记.ps1' 'README must document the new launcher filename'
Assert-True (-not $readme.Contains('启动词灵星球.ps1')) 'README must not document the legacy launcher filename'
```

- [ ] **Step 2: 运行聚焦测试，确认它因旧脚本仍存在而失败**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\launcher_test.ps1
```

Expected: FAIL，错误为 `New launcher must exist`；同时工作树仍包含 `启动词灵星球.ps1`。

- [ ] **Step 3: 硬重命名脚本并替换全部用户可见错误文案**

Run:

```powershell
git mv -- '启动词灵星球.ps1' '启动单词消消养宠记.ps1'
```

在新脚本中保留内部函数名、环境变量和应用标识，仅替换四段 Base64 用户文案：

```powershell
$title = ConvertFrom-WordSpiritText '5Y2V6K+N5raI5raI5YW75a6g6K6w5ZCv5Yqo5aSx6LSl'

$message = ConvertFrom-WordSpiritText '5rKh5pyJ5om+5YiwIE5vZGUuanPvvIzml6Dms5XlkK/liqjjgIrljZXor43mtojmtojlhbvlrqDorrDjgIvjgILor7flhYjlronoo4UgTm9kZS5qc+OAgg=='

$template = ConvertFrom-WordSpiritText '44CK5Y2V6K+N5raI5raI5YW75a6g6K6w44CL5pyN5Yqh5ZCv5Yqo5aSx6LSl44CC6K+35p+l55yL5pel5b+X77yaezB9'

$template = ConvertFrom-WordSpiritText '44CK5Y2V6K+N5raI5raI5YW75a6g6K6w44CL5ZCv5Yqo6LaF5pe277yI5pyA5aSa562J5b6FIHswfSDnp5LvvInjgILor7fmn6XnnIvml6Xlv5fvvJp7MX0='
```

分别对应“启动失败”标题、缺少 Node.js、服务脚本缺失和启动超时；其它文案与行为不变。

- [ ] **Step 4: 更新 README 的正式启动文件名**

将 README 启动说明改为：

```markdown
双击 `启动单词消消养宠记.ps1` 后访问 `http://127.0.0.1:31876`。桌面启动器会先严格检查 `/api/health` 的应用名与 0.4.0 版本；端口被其他服务占用时会用中文说明原因，不会结束未知进程。
```

README 不再出现 `启动词灵星球.ps1`。

- [ ] **Step 5: 运行聚焦测试并确认新脚本完整通过**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\launcher_test.ps1
```

Expected: `LAUNCHER=PASS reuse=PASS start=PASS mismatch=PASS node-missing=PASS timeout=PASS browser-disabled=PASS`，输出不含“词灵星球”。

- [ ] **Step 6: 运行分支完整验证**

Run:

```powershell
npm test
npm run check
git diff --check
$legacyVisibleNames = rg -n '启动词灵星球|词灵星球' README.md '启动单词消消养宠记.ps1'
if ($LASTEXITCODE -eq 0) { throw "仍有用户可见旧名称：$legacyVisibleNames" }
if ($LASTEXITCODE -ne 1) { throw '旧名称扫描执行失败' }
```

Expected: 三项验证均 exit 0；`GAME_SMOKE=PASS`、`SESSION_STORE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`；最后 `rg` 无匹配。

- [ ] **Step 7: 提交启动入口硬重命名**

```powershell
git add -A -- README.md scripts/launcher_test.ps1 '启动词灵星球.ps1' '启动单词消消养宠记.ps1'
git commit -m "fix: rename desktop launcher for dog pet game"
```

Expected: 提交包含一个 rename、README 和测试更新，工作树干净。

---

### Task 2: 快进交付主项目并彻底替换桌面快捷方式

**Files:**
- Integrate into: `C:\Users\86138\Documents\EnglishlearningGame`
- Delete: `C:\Users\86138\Desktop\词灵星球.lnk`
- Create: `C:\Users\86138\Desktop\单词消消养宠记.lnk`

**Interfaces:**
- Consumes: 已通过任务级审查和整分支最终审查的 `codex/dog-pet-home-dialogue`；主项目 `master`；新脚本 `启动单词消消养宠记.ps1`。
- Produces: 主项目中可运行的新养狗版本，以及唯一指向新脚本的桌面快捷方式。

- [ ] **Step 1: 在交付前验证两个工作树和快进条件**

Run:

```powershell
$featureRoot = 'C:\Users\86138\.codex\visualizations\2026\08\30\01a051d7-62b6-7fd2-9911-942aa1ec9f73\EnglishlearningGame-dog-pet-home-dialogue'
$mainRoot = 'C:\Users\86138\Documents\EnglishlearningGame'
git -C $featureRoot status -sb
git -C $mainRoot status -sb
$trackedMainChanges = git -C $mainRoot status --porcelain --untracked-files=no
if ($trackedMainChanges) { throw "主项目存在已跟踪修改，停止交付：$trackedMainChanges" }
git -C $mainRoot merge-base --is-ancestor master codex/dog-pet-home-dialogue
if ($LASTEXITCODE -ne 0) { throw 'master 不是功能分支祖先，不能安全快进' }
```

Expected: 功能分支干净；主项目无已跟踪修改，仅允许显示 `?? %SystemDrive%/`；快进条件 exit 0。若不满足则停止，不合并。

- [ ] **Step 2: 完成整分支只读复审门禁**

由控制器生成 `master..codex/dog-pet-home-dialogue` 完整差异包，使用新的高能力审查子代理检查全部养狗功能和本次启动入口重命名。

Expected: `Branch quality: Approved`，无 Critical/Important finding。若有阻断项，回到专用分支修复并重新验证，不进入合并。

- [ ] **Step 3: 快进主项目，不触碰未跟踪目录**

Run:

```powershell
git -C 'C:\Users\86138\Documents\EnglishlearningGame' merge --ff-only codex/dog-pet-home-dialogue
```

Expected: `master` 快进到功能分支 HEAD；`%SystemDrive%/` 未被暂存、移动或删除。

- [ ] **Step 4: 在主项目运行完整验证**

Run:

```powershell
npm test
npm run check
git diff --check e2dfafa..HEAD
```

Workdir: `C:\Users\86138\Documents\EnglishlearningGame`

Expected: `GAME_SMOKE=PASS`、`SESSION_STORE=PASS`、`AUTH_FLOW=PASS`、`LAUNCHER=PASS`；语法和差异检查 exit 0。

- [ ] **Step 5: 记录桌面切换前的失败状态**

Run:

```powershell
$desktop = 'C:\Users\86138\Desktop'
$oldShortcut = Join-Path $desktop '词灵星球.lnk'
$newShortcut = Join-Path $desktop '单词消消养宠记.lnk'
$oldExists = Test-Path -LiteralPath $oldShortcut -PathType Leaf
$newExists = Test-Path -LiteralPath $newShortcut -PathType Leaf
Write-Output "DESKTOP_SHORTCUT_RED oldExists=$oldExists newExists=$newExists"
if (-not $oldExists -or $newExists) { throw '桌面前置状态与已确认问题不一致，停止覆盖' }
```

Expected: `DESKTOP_SHORTCUT_RED oldExists=True newExists=False`。

- [ ] **Step 6: 先创建并验证新快捷方式**

Run:

```powershell
$desktop = 'C:\Users\86138\Desktop'
$mainRoot = 'C:\Users\86138\Documents\EnglishlearningGame'
$newLauncher = Join-Path $mainRoot '启动单词消消养宠记.ps1'
$newShortcut = Join-Path $desktop '单词消消养宠记.lnk'
if (-not (Test-Path -LiteralPath $newLauncher -PathType Leaf)) { throw "新启动脚本不存在：$newLauncher" }
if (Test-Path -LiteralPath $newShortcut) { throw "新快捷方式已存在，停止覆盖：$newShortcut" }
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($newShortcut)
$shortcut.TargetPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\86138\Documents\EnglishlearningGame\启动单词消消养宠记.ps1"'
$shortcut.WorkingDirectory = $mainRoot
$shortcut.IconLocation = 'C:\Windows\System32\shell32.dll,14'
$shortcut.Description = '启动单词消消养宠记'
$shortcut.Save()
if (-not (Test-Path -LiteralPath $newShortcut -PathType Leaf)) { throw '新桌面快捷方式创建失败' }
```

Expected: 新快捷方式存在，旧快捷方式暂时仍存在，保证切换过程中始终有可用入口。

- [ ] **Step 7: 读回新快捷方式属性，再删除精确旧快捷方式**

Run:

```powershell
$desktop = 'C:\Users\86138\Desktop'
$featureRoot = 'C:\Users\86138\.codex\visualizations\2026\08\30\01a051d7-62b6-7fd2-9911-942aa1ec9f73\EnglishlearningGame-dog-pet-home-dialogue'
$oldShortcut = Join-Path $desktop '词灵星球.lnk'
$newShortcut = Join-Path $desktop '单词消消养宠记.lnk'
$shell = New-Object -ComObject WScript.Shell
$actual = $shell.CreateShortcut($newShortcut)
$expectedLauncher = 'C:\Users\86138\Documents\EnglishlearningGame\启动单词消消养宠记.ps1'
if ($actual.TargetPath -ne 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe') { throw '快捷方式目标程序错误' }
if (-not $actual.Arguments.Contains($expectedLauncher)) { throw '快捷方式没有指向新启动脚本' }
if ($actual.WorkingDirectory -ne 'C:\Users\86138\Documents\EnglishlearningGame') { throw '快捷方式工作目录错误' }
if ($actual.Description.Contains('词灵星球')) { throw '快捷方式描述仍含旧名称' }
Remove-Item -LiteralPath $oldShortcut -Force
```

Expected: 新快捷方式属性全部正确后，且仅在此后，精确删除 `C:\Users\86138\Desktop\词灵星球.lnk`。

- [ ] **Step 8: 验证桌面与主项目最终状态**

Run:

```powershell
$desktop = 'C:\Users\86138\Desktop'
$featureRoot = 'C:\Users\86138\.codex\visualizations\2026\08\30\01a051d7-62b6-7fd2-9911-942aa1ec9f73\EnglishlearningGame-dog-pet-home-dialogue'
$oldShortcut = Join-Path $desktop '词灵星球.lnk'
$newShortcut = Join-Path $desktop '单词消消养宠记.lnk'
$shell = New-Object -ComObject WScript.Shell
$actual = $shell.CreateShortcut($newShortcut)
if (Test-Path -LiteralPath $oldShortcut) { throw '旧桌面快捷方式仍存在' }
if (-not (Test-Path -LiteralPath $newShortcut -PathType Leaf)) { throw '新桌面快捷方式不存在' }
if ($actual.Arguments.Contains('启动词灵星球.ps1') -or $actual.Description.Contains('词灵星球')) { throw '新快捷方式仍含旧名称' }
git -C 'C:\Users\86138\Documents\EnglishlearningGame' status -sb
git -C $featureRoot status -sb
```

Expected: 桌面只有 `单词消消养宠记.lnk`；其参数与描述均无旧名称；主项目 `master` 指向交付提交，状态只保留原有 `?? %SystemDrive%/`；功能 worktree 干净。
