# 公开预览说明 / Public Preview Notes

## 当前用途 / Current Purpose

公开预览用于把本机 Demo 临时暴露成公网网址，方便外部浏览器或手机测试同一个网页。它不是正式生产部署，也不代表面向社会上线完成。

Public preview temporarily exposes the local demo as a public URL so external browsers or phones can test the same webpage. It is not a production deployment and does not mean the app is ready for public launch.

## 启动方式 / Startup

本机同源预览服务：

```bash
FINANCE_AI_PUBLIC_PORT=4192 FINANCE_AI_PUBLIC_HOST=127.0.0.1 node scripts/public-preview-server.mjs
```

临时公网隧道：

```bash
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:127.0.0.1:4192 nokey@localhost.run
```

推荐：本机服务 + 自动守护隧道：

```bash
npm run dev:public-preview:supervise
```

该命令会先确认本机 `http://127.0.0.1:4192/health` 可用；如果本机预览服务未运行，会先拉起 `public-preview-server`，再启动公网 watchdog。公网掉线时重启隧道；本机服务掉线时会尝试重启本机服务，避免只换隧道但后端仍不可用。

Recommended: local service + auto-restarting tunnel:

```bash
npm run dev:public-preview:supervise
```

This first verifies local `http://127.0.0.1:4192/health`. If the local preview server is not running, it starts `public-preview-server`, then starts the public watchdog. If the public URL drops, it restarts the tunnel; if the local server drops, it attempts to restart the local service so the tunnel is not rotating against a dead backend.

只守护公网隧道：

```bash
npm run dev:public-preview:watch
```

该命令会启动 `localhost.run` 隧道，读取新的 `https://*.lhr.life` 地址，连续检查 3 分钟关键端点。守护模式默认需要连续 2 次失败才重启隧道，避免短暂 DNS 抖动误杀；如果确认公网返回 `503 / no tunnel here` 或关键接口连续非 `200`，会停止旧隧道并重新拉起新隧道。每轮守护检查也会确认本机备用地址 `http://127.0.0.1:4192/health`，当前状态会写入 `/private/tmp/finance_ai_public_preview_status.json`，并同步生成 `public-preview-latest.html` 访问卡片，列出当前主入口、备用入口和本机入口；不写入任何 API key。

Auto-restarting tunnel watchdog:

```bash
npm run dev:public-preview:watch
```

This starts the `localhost.run` tunnel, reads the new `https://*.lhr.life` address, and checks key endpoints for 3 minutes. Watchdog mode now requires 2 consecutive failed iterations by default before restarting the tunnel, which avoids killing a working tunnel on a brief DNS blip. If the public URL confirms `503 / no tunnel here` or key endpoints stay non-`200`, it stops the old tunnel and starts a new one. Each watchdog cycle also checks local fallback `http://127.0.0.1:4192/health`. Runtime status is written to `/private/tmp/finance_ai_public_preview_status.json`, and `public-preview-latest.html` is regenerated with the current primary, standby, and local links; no API keys are written.

当前公网状态：

```bash
npm run status:public-preview
```

如果当前环境没有 `npm` 命令，也可以直接运行：

```bash
node scripts/public-preview-status.mjs
```

该命令会读取 `/private/tmp/finance_ai_public_preview_status.json`，显示当前公网 URL、本机备用地址、本机备用是否确认可用、状态是否过期、重启次数、健康检查轮数、连续失败阈值和短暂失败次数。

Current public-preview status:

```bash
npm run status:public-preview
```

If `npm` is unavailable in the current shell, run:

```bash
node scripts/public-preview-status.mjs
```

This reads `/private/tmp/finance_ai_public_preview_status.json` and prints the current public URL, local fallback URL, whether local fallback was confirmed, stale status, restart count, health-check count, consecutive-failure threshold, and transient-failure count.

实时访问报告：

```bash
npm run access:public-preview
```

如果当前环境没有 `npm`，可直接运行：

```bash
node scripts/public-preview-access-report.mjs
```

该命令会读取状态文件，并实时探测公网关键端点和本机备用 `/health`，最后输出当前推荐入口：

- `public`：公网临时链接当前可用。
- `local-fallback`：公网不可用，但本机备用地址可用。
- `none`：公网和本机备用都未确认可用，需要先启动本机服务或 supervisor。

Live access report:

```bash
npm run access:public-preview
```

If `npm` is unavailable, run:

```bash
node scripts/public-preview-access-report.mjs
```

This reads the status file, live-probes the public key endpoints and local fallback `/health`, then prints the recommended entry:

- `public`: the temporary public URL currently works.
- `local-fallback`: public access is unavailable, but local fallback works.
- `none`: neither public nor local fallback is confirmed; start the local service or supervisor first.

演示前只想做一次守护脚本烟雾测试时，可以运行：

```bash
npm run dev:public-preview:watch -- --once
```

`--once` 成功后会退出并清理这条测试隧道；正式临时分享时不要加 `--once`，让守护脚本持续运行。

For a one-shot watchdog smoke test before a demo:

```bash
npm run dev:public-preview:watch -- --once
```

With `--once`, the command exits after success and cleans up that test tunnel. For an actual temporary share, run it without `--once` so the watchdog keeps running.

连续健康检查：

```bash
FINANCE_AI_PUBLIC_PREVIEW_URL=https://b11e232b5188e3.lhr.life npm run check:public-preview
```

默认会连续监控 3 分钟，每 15 秒检查一次：

- 首页 `/`
- `/health`
- `/api/health`
- `/api/analysis?symbol=MSFT&riskProfile=balanced`
- `/api/stocks/search?q=Microsoft`

默认发布验收仍然严格：任何一次检查返回非 `200`，脚本会失败并提示本机备用地址和隧道重启建议。演示前必须跑完整 2-3 分钟，而不是只看一次打开成功。只有 watchdog 守护模式会使用连续失败阈值来处理短暂网络抖动。

Continuous health check:

```bash
FINANCE_AI_PUBLIC_PREVIEW_URL=https://b11e232b5188e3.lhr.life npm run check:public-preview
```

By default it monitors for 3 minutes and checks every 15 seconds:

- Homepage `/`
- `/health`
- `/api/health`
- `/api/analysis?symbol=MSFT&riskProfile=balanced`
- `/api/stocks/search?q=Microsoft`

The default release validation is still strict: if any check returns non-`200`, the script fails and prints local fallback plus tunnel restart guidance. Before a demo, run the full 2-3 minute monitor instead of checking the page only once. Only watchdog mode uses a consecutive-failure threshold to handle brief network jitter.

当前临时公网地址：

```text
https://b11e232b5188e3.lhr.life
```

The local preview server serves the web shell and backend API from the same origin. Public pages should call `/api/*` and `/health`, not `localhost`.

## 限制 / Limits

- 该网址是临时链接，电脑睡眠、网络断开、本地预览服务停止或 SSH 隧道停止后都会失效。
- 该网址可能在下次启动隧道时变化。
- 拥有链接的人都可能访问本机预览页面；不要把它当作正式生产环境或公开投资服务。
- API key 和模型 key 只能从运行时环境或 `/private/tmp` 读取，不得写入代码、文档、日志或浏览器存储。
- 正式上线仍需要生产托管、正式域名、生产数据库、生产认证、密钥管理、监控告警、法律合规复核和数据授权确认。

- This URL is temporary. It stops working if the computer sleeps, the network drops, the local preview server stops, or the SSH tunnel stops.
- The URL may change when the tunnel is restarted.
- Anyone with the link may access the local preview page; do not treat it as production or a public investment service.
- API keys and model keys must only be read from runtime environment variables or `/private/tmp`; never write them to code, docs, logs, or browser storage.
- Production launch still needs hosting, a real domain, production database, production auth, secret management, monitoring, legal/compliance review, and confirmed data licenses.

## 备用访问方案 / Backup Access Plan

1. 首选：当前公网临时地址，用于手机或外部浏览器快速测试。
2. 公网失败时：使用本机地址 `http://127.0.0.1:4192`，只能在本机浏览器访问。
3. 临时隧道失败时：优先使用 `npm run dev:public-preview:watch` 自动重启 localhost.run 隧道；如果手动重启，则复制新的 `https://*.lhr.life` 地址，并立即运行连续健康检查。
4. 正式演示前：准备固定线上测试环境，当前首选 Render 蓝图见 `docs/technical/DEPLOYMENT.md`。静态托管只能托管前端，真实 API 仍需要后端运行环境。
5. 公开分享前：必须配置正式域名、密钥管理、访问控制、监控告警和合规提示。

1. Primary: the current temporary public URL for quick phone or external-browser testing.
2. If public access fails: use local URL `http://127.0.0.1:4192`, available only on this machine.
3. If the tunnel fails: prefer `npm run dev:public-preview:watch` to auto-restart the localhost.run tunnel. If restarting manually, copy the new `https://*.lhr.life` URL, then immediately run the continuous health check.
4. Before formal demos: prepare a fixed online test environment. The current preferred Render blueprint is documented in `docs/technical/DEPLOYMENT.md`. Static hosting alone can host the frontend only; real APIs still need a backend runtime.
5. Before public sharing: configure a real domain, secret management, access controls, monitoring alerts, and compliance notices.

## 验证记录 / Verification

- 2026-06-13：临时隧道域名已再次轮换，当前可访问地址为 `https://28b5bb85d09317.lhr.life`，`/health` 返回 `200`。
- 2026-06-13：公网页面 `https://28b5bb85d09317.lhr.life/?refresh=public-v69-improvements#overview` 加载 `app.js?v=69`，显示 `406 条自动化回归目标`，首页隐藏设置/诊断区。
- 2026-06-13：`https://28b5bb85d09317.lhr.life` 已返回 `503`；当前可访问地址轮换为 `https://c45546cd10371b.lhr.life`，`/health` 和首页返回 `200`。
- 2026-06-13：公网页面 `https://c45546cd10371b.lhr.life/?refresh=public-v69-recovered#overview` 加载 `app.js?v=69`，右侧浏览器标题为 `AI 财经情报助手`。
- 2026-06-13：接入 OpenRouter 第二备用和 Groq 第三备用后，临时地址轮换为 `https://7a92f1e3f16542.lhr.life`，`/health` 和首页返回 `200`。
- 2026-06-13：公网页面 `https://7a92f1e3f16542.lhr.life/?refresh=public-v70-ai-fallback-keys#settings` 加载 `app.js?v=70`，AI 设置区显示 OpenAI 主模型、Gemini、OpenRouter、Groq 四段接力。
- 2026-06-13：v71 发布后临时地址轮换为 `https://6dd798809f453c.lhr.life`，`/health` 和首页返回 `200`。
- 2026-06-13：公网页面 `https://6dd798809f453c.lhr.life/?refresh=public-v71-final#overview` 加载 `app.js?v=71`；设置页验证后端连接、`408 条自动化回归目标` 和四段 AI 接力。
- 2026-06-14：旧地址 `https://6dd798809f453c.lhr.life` 返回 `503`；本机服务 `/health` 返回 `200`，临时隧道最新可用地址轮换为 `https://7f2e8f2bee6109.lhr.life`。
- 2026-06-14：公网页面 `https://7f2e8f2bee6109.lhr.life/?refresh=public-v71-recovered-20260614#overview` 返回 `200`，右侧浏览器已打开并确认加载 `app.js?v=71`。
- 2026-06-14：地址 `https://7f2e8f2bee6109.lhr.life` 后续出现不可用；本机服务仍为 `200`，临时隧道最新可用地址轮换为 `https://6d02161f4ff8f4.lhr.life`。
- 2026-06-14：公网页面 `https://6d02161f4ff8f4.lhr.life/?refresh=public-v71-monitor-20260614#overview` 返回 `200`，右侧浏览器已打开并确认加载 `app.js?v=71`、`408 条自动化回归目标` 和后端连接。
- 2026-06-14：新增 `scripts/public-preview-watchdog.mjs` 和 `npm run dev:public-preview:watch`，在公网健康检查失败时自动停止旧 SSH 隧道并重新拉起新隧道，同时把状态写入 `/private/tmp/finance_ai_public_preview_status.json`。
- 2026-06-14：旧地址 `https://6d02161f4ff8f4.lhr.life` 后续再次返回 `503`；守护脚本生成当前地址 `https://973242c60d6e48.lhr.life`，短健康检查 5 个端点全部返回 `200`。
- 2026-06-14：右侧浏览器打开 `https://973242c60d6e48.lhr.life/?refresh=public-v71-watchdog-20260614#overview`，确认加载 `app.js?v=71`、`408 条自动化回归目标`、后端连接和行情已连接。
- 2026-06-14：持久在线守护进程第一轮 3 分钟连续健康检查通过，状态文件 `/private/tmp/finance_ai_public_preview_status.json` 显示 `healthy`、`healthCycleCount=1`、`lastFailure=null`。
- 2026-06-14：尝试把守护进程放入后台后，当前运行环境会清理后台子进程，`nohup` 后台方式未能持久化；因此本地守护仍应作为前台进程运行，固定线上测试环境应走 `docs/technical/DEPLOYMENT.md` 的 Render 蓝图。
- 2026-06-14：恢复前台守护进程后，当前可用地址为 `https://107eb711c26c7e.lhr.life`；短健康检查 5 个端点全部返回 `200`，随后第一轮 3 分钟连续健康检查通过，`healthCycleCount=1`、`iterationCount=8`。
- 2026-06-14：旧前台守护地址 `https://107eb711c26c7e.lhr.life` 后续返回 `503`；守护脚本自动轮换为当前可用地址 `https://d4b7968023ae84.lhr.life`。短健康检查确认首页、`/health`、`/api/health`、MSFT 分析接口和股票搜索接口全部返回 `200`，首页 HTML 加载 `app.js?v=72`。
- 2026-06-14：`https://d4b7968023ae84.lhr.life` 后续真实复现 `503 / no tunnel here :(`。健康检查脚本新增 `curl` 兜底确认，避免 Node `fetch` 传输失败时误杀可用隧道。
- 2026-06-14：当前可用地址轮换为 `https://0a74bbb77e9d75.lhr.life`；新版 watchdog 完成 3 分钟健康窗口，输出 `health-ok`、`healthCycleCount=1`、`iterationCount=8`。`/health`、`/api/project/progress` 和 MSFT 分析接口均返回 `200`，页面加载 `app.js?v=73`，后端进度为 `414 条自动化回归目标`。
- 2026-06-14：旧地址 `https://0a74bbb77e9d75.lhr.life` 后续返回 `503 / no tunnel here`；状态文件显示当前地址轮换为 `https://3f480bec5ea9fb.lhr.life`，`/health`、`/api/project/progress` 和本机 MSFT 分析接口返回 `200`。该地址仍是临时隧道，不等于固定线上环境。
- 2026-06-14：实时访问报告确认当前公网地址轮换为 `https://b11e232b5188e3.lhr.life`；首页、`/health`、`/api/health`、MSFT 分析接口和股票搜索接口全部返回 `200`，MSFT 分析约 `5.15s`，本机备用 `http://127.0.0.1:4192/health` 也返回 `200`。
- 2026-06-14：对 `https://b11e232b5188e3.lhr.life` 运行 3 分钟连续健康检查通过：检查窗口 `180s`、间隔 `15s`、共 `8` 轮，首页、`/health`、`/api/health`、MSFT 分析接口和股票搜索接口持续返回 `200`，`transientFailureCount=0`，`lastFailure=null`。
- 2026-06-13：右侧浏览器验证 AI 规则参考面板显示 `当前仅为规则分析`、第二备用 OpenRouter 未配置 key、第三备用 Groq 未配置 key、`Provider 未返回剩余额度`。
- 2026-06-13：右侧浏览器验证搜索 `腾讯控股` 后同时显示 `常用：腾讯控股` 和 `最近：腾讯控股`，可访问名称不同。
- 2026-06-13：上一临时地址 `https://f703e59436bb1e.lhr.life` 已返回 `503`。
- 2026-06-13：上一轮临时地址为 `https://f703e59436bb1e.lhr.life`，`/health` 曾返回 `200`。
- 2026-06-13：公网页面 `https://f703e59436bb1e.lhr.life/?refresh=public-v68-improvements#overview` 加载 `app.js?v=68`，显示 `402 条自动化回归目标`，首页隐藏设置/诊断区。
- 2026-06-13：右侧浏览器验证 AI 规则参考面板显示 `gpt-5.5 -> gemini-2.5-flash` 接力、`REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA`、`429` 和冷却提示。
- 2026-06-13：右侧浏览器验证搜索 `腾讯控股` 切换到 `腾讯控股 · 0700`，搜索 `贵州茅台` 切换到 `贵州茅台 · 600519`。
- 2026-06-13：上一临时地址 `https://2ca08760dbbf39.lhr.life` 已返回 `503`。
- 2026-06-13：上一轮临时地址为 `https://2ca08760dbbf39.lhr.life`，`/health` 曾返回 `200`。
- 2026-06-13：公网页面 `https://2ca08760dbbf39.lhr.life/?refresh=public-v67-report-fixes#overview` 加载 `app.js?v=67`，显示 `399 条自动化回归目标`。
- 2026-06-13：右侧浏览器验证快捷按钮可从当前状态切换到 `腾讯控股 · 0700` 和 `贵州茅台 · 600519`。
- 2026-06-13：390px 移动视口验证 `clientWidth=390`、`scrollWidth=390`，未再复现横向溢出。

- 2026-06-13: The temporary tunnel domain rotated again; the current reachable address is `https://28b5bb85d09317.lhr.life`, and `/health` returned `200`.
- 2026-06-13: Public page `https://28b5bb85d09317.lhr.life/?refresh=public-v69-improvements#overview` loaded `app.js?v=69`, showed `406 automated regression targets`, and hid settings/diagnostics on the homepage.
- 2026-06-13: `https://28b5bb85d09317.lhr.life` now returns `503`; the current reachable address rotated to `https://c45546cd10371b.lhr.life`, and `/health` plus the homepage returned `200`.
- 2026-06-13: Public page `https://c45546cd10371b.lhr.life/?refresh=public-v69-recovered#overview` loaded `app.js?v=69`, and the right-side browser title was `AI 财经情报助手`.
- 2026-06-13: After adding OpenRouter as fallback 2 and Groq as fallback 3, the temporary address rotated to `https://7a92f1e3f16542.lhr.life`; `/health` and the homepage returned `200`.
- 2026-06-13: Public page `https://7a92f1e3f16542.lhr.life/?refresh=public-v70-ai-fallback-keys#settings` loaded `app.js?v=70`, and the AI settings panel showed the OpenAI primary, Gemini, OpenRouter, and Groq relay chain.
- 2026-06-13: After v71, the temporary address rotated to `https://6dd798809f453c.lhr.life`; `/health` and the homepage returned `200`.
- 2026-06-13: Public page `https://6dd798809f453c.lhr.life/?refresh=public-v71-final#overview` loaded `app.js?v=71`; the settings page verified backend connection, `408 automated regression targets`, and the four-model AI relay chain.
- 2026-06-14: The old address `https://6dd798809f453c.lhr.life` returned `503`; local service `/health` returned `200`, and the latest working temporary tunnel address rotated to `https://7f2e8f2bee6109.lhr.life`.
- 2026-06-14: Public page `https://7f2e8f2bee6109.lhr.life/?refresh=public-v71-recovered-20260614#overview` returned `200`; the right-side browser opened it and confirmed `app.js?v=71`.
- 2026-06-14: Address `https://7f2e8f2bee6109.lhr.life` later became unavailable; the local service still returned `200`, and the latest working temporary tunnel address rotated to `https://6d02161f4ff8f4.lhr.life`.
- 2026-06-14: Public page `https://6d02161f4ff8f4.lhr.life/?refresh=public-v71-monitor-20260614#overview` returned `200`; the right-side browser opened it and confirmed `app.js?v=71`, `408 automated regression targets`, and backend connection.
- 2026-06-14: Added `scripts/public-preview-watchdog.mjs` and `npm run dev:public-preview:watch`; when public health checks fail, it stops the old SSH tunnel, starts a new one, and writes runtime status to `/private/tmp/finance_ai_public_preview_status.json`.
- 2026-06-14: Old address `https://6d02161f4ff8f4.lhr.life` later returned `503` again; the watchdog generated current address `https://973242c60d6e48.lhr.life`, and the short health check returned `200` for all five endpoints.
- 2026-06-14: The right-side browser opened `https://973242c60d6e48.lhr.life/?refresh=public-v71-watchdog-20260614#overview` and confirmed `app.js?v=71`, `408 automated regression targets`, backend connection, and quote coverage connected.
- 2026-06-14: The persistent watchdog passed its first 3-minute continuous health window. Status file `/private/tmp/finance_ai_public_preview_status.json` showed `healthy`, `healthCycleCount=1`, and `lastFailure=null`.
- 2026-06-14: Attempting to move the watchdog to the background showed this runtime cleans up background child processes, and `nohup` did not persist. The local watchdog should therefore run as a foreground process, while fixed online testing should use the Render blueprint in `docs/technical/DEPLOYMENT.md`.
- 2026-06-14: After restoring the foreground watchdog, the current reachable address is `https://107eb711c26c7e.lhr.life`; the short health check returned `200` for all five endpoints, then the first 3-minute continuous health window passed with `healthCycleCount=1` and `iterationCount=8`.
- 2026-06-14: Old address `https://0a74bbb77e9d75.lhr.life` later returned `503 / no tunnel here`; the status file now reports current address `https://3f480bec5ea9fb.lhr.life`, with `/health`, `/api/project/progress`, and local MSFT analysis returning `200`. This is still a temporary tunnel, not a fixed hosted environment.
- 2026-06-14: The live access report confirmed the current public address rotated to `https://b11e232b5188e3.lhr.life`; homepage, `/health`, `/api/health`, MSFT analysis, and stock search all returned `200`, MSFT analysis took about `5.15s`, and local fallback `http://127.0.0.1:4192/health` also returned `200`.
- 2026-06-14: A 3-minute continuous health check against `https://b11e232b5188e3.lhr.life` passed: `180s` window, `15s` interval, `8` iterations, homepage, `/health`, `/api/health`, MSFT analysis, and stock search stayed `200`, with `transientFailureCount=0` and `lastFailure=null`.
- 2026-06-14: v74 adds `GET /api/public-preview/access-status` and an in-app access recovery summary. The page now reports the currently reachable public origin, local fallback `http://127.0.0.1:4192`, fixed-hosting gap, temporary `lhr.life` warning, and the 2-3 minute health-gate requirement.
- 2026-06-14: Current temporary URL rotated to `https://dbf317670bd216.lhr.life`; a 30-second continuous check passed for `/`, `/health`, `/api/health`, `/api/analysis?symbol=MSFT&riskProfile=balanced`, and `/api/stocks/search?q=Microsoft`. The settings page loaded `app.js?v=74` and displayed `当前公网入口可达`, `固定托管未配置`, and the `503 / no tunnel here :(` warning.
- 2026-06-14: The user-reported old URL `https://6dd798809f453c.lhr.life` returned `503`. The local preview server stayed healthy at `http://127.0.0.1:4192/health`, and the watchdog rotated the active temporary public URL to `https://737c15352c8b1e.lhr.life`. Direct checks returned `200` for `/health` and `/api/project/progress`, and the right-side browser loaded `https://737c15352c8b1e.lhr.life/?refresh=public-v74-recovered-20260614#overview` with `app.js?v=74`.
- 2026-06-14: v75 adds a strict stability gate. Public access reports and `/api/public-preview/access-status` now separate temporary tunnel availability from stable external readiness: `temporaryAccessReady` can be true for a healthy `lhr.life` URL, while `externalUseReady` remains false until fixed hosting is configured and a 2-3 minute health gate passes. The current temporary URL is `https://19d08811a76336.lhr.life`; direct checks returned `200` for the homepage, `/health`, `/api/health`, MSFT analysis, and stock search, but the UI correctly shows `稳定访问门禁：未通过`.
- 2026-06-14: v76 public preview URL rotated to `https://7973effd93a31b.lhr.life`; the homepage loaded `app.js?v=76` and `/health` returned `200`. Browser verification showed the tightened MSFT news relevance filter: unrelated Meta/Ryanair-style headlines were absent from the first-screen news list, while unmatched intelligence was folded with a clear relevance reason.
- 2026-06-14: v76 backend news relevance hardening was published through the public preview server. Current temporary URL is `https://1802e190bd887d.lhr.life`; elevated access report returned `200` for the homepage, `/health`, `/api/health`, MSFT analysis, and stock search. This release filters weak Yahoo/GDELT/Google headlines at provider-normalization time instead of relying only on frontend folding, but the URL remains a temporary tunnel with `externalUseReady=false`.
- 2026-06-14: v77 adds continuous-monitor evidence to the watchdog status file and public access UI. Status now records the latest health window, iteration count, required endpoint coverage, started/ended timestamps, local fallback health, and recent failure type. Backend `/api/public-preview/access-status` exposes these values so the page can show `最近监控` and `最近失败` instead of relying on a one-time `200`.
- 2026-06-14: P0 was reproduced after v77: `https://5126e40a65aba7.lhr.life` passed a `180s` public health window (`8` iterations, all five endpoints checked), then shortly afterward returned `503 / no tunnel here :(`. The watchdog classified the failure as `tunnel-503` and rotated the tunnel to `https://09010024c65874.lhr.life`.
- 2026-06-14: Current temporary URL is `https://09010024c65874.lhr.life`; `/health` returns `200`, the homepage loads `app.js?v=77`, and a later watchdog cycle reported `health-ok` with `healthCycleCount=5` and `transientFailureCount=0`. It must still be treated as a temporary test URL because the previous temporary tunnel failed immediately after a successful 180-second window. Fixed hosting through Render/Vercel/Netlify or equivalent remains the required solution for stable external access.
- 2026-06-14: During v80 verification, `https://09010024c65874.lhr.life` again returned `503 / no tunnel here :(`. The watchdog classified the failure as `tunnel-503` and rotated to `https://064c252a1f874a.lhr.life`; `/health` returns `200` and the homepage loads `app.js?v=80`. This new URL is still temporary and its first continuous 180-second gate is pending.
- 2026-06-14: v81 adds an in-page fallback access list from the shared `accessEntries` model: fixed hosting, current temporary public URL, and local fallback. The current temporary URL `https://064c252a1f874a.lhr.life` loads `app.js?v=81`; `/api/public-preview/access-status` now returns all three entries and recommends the watchdog public URL even when the endpoint is called from local `127.0.0.1`. A later watchdog window passed `180s / 8` endpoint checks with `healthCycleCount=14`, `lastFailure=null`, and `transientFailureCount=2`. This is improved recovery guidance, not fixed hosting.
- 2026-06-14: v82 adds optional standby tunnel mode: run `FINANCE_AI_PUBLIC_PORT=4192 node scripts/public-preview-watchdog.mjs --standby-count 1` to maintain a primary temporary `lhr.life` URL plus one standby `lhr.life` URL. The status file now includes `standbyPublicUrls` and `standbyPromotionCount`; `/api/public-preview/access-status` renders the standby entry. Real runtime proof: an old URL failed with `tunnel-503`; another primary `https://34493dd993a1cb.lhr.life` passed `180s / 8` and then immediately failed with `503`; the watchdog promoted standby to current URL `https://613abca30c360b.lhr.life`, which then passed a fresh `180s / 8` window and loads `app.js?v=82`. Current standby `https://f00c16274864e8.lhr.life` is healthy after a short check. `externalUseReady=false` remains correct because fixed hosting is still missing. This is a stronger temporary fallback, not fixed hosting.
- 2026-06-14: v83/v84 improves public health-gate speed and visibility. v83 makes each monitor iteration probe `/`, `/health`, `/api/health`, `/api/analysis?symbol=MSFT&riskProfile=balanced`, and `/api/stocks/search?q=Microsoft` in parallel. v84 writes a `checking` status before the 180-second gate begins, including required endpoints and guidance, and backend/frontend access status renders this as `检查中`; `localFallbackOk=null` remains unknown/pending instead of being displayed as unhealthy; previous successful gate evidence remains visible while the next cycle is checking. Runtime proof: first v84 primary `https://3d66877b017927.lhr.life` passed `180s / 10` with zero transient failures; after restart, primary `https://cb9957c5e0162c.lhr.life` and standby `https://b9f795ff98ad59.lhr.life` both failed with `tunnel-503` during the gate, while local fallback stayed healthy. The latest current primary is `https://7c0e480c0515a5.lhr.life`; latest standby is `https://dbaf82d58c1120.lhr.life`; both `/health` checks returned `200`, the primary homepage loads `app.js?v=84`, and the latest completed gate passed `180s / 9` with zero transient failures. The next cycle is already `checking`, but status keeps `ok=true`, `continuousHealthPassed=true`, `healthIterationCount=9`, and healthy standby/local fallback evidence. The old user-visible URL `https://7973effd93a31b.lhr.life` returns `503 / no tunnel here :(`. This is better temporary recovery and status transparency, but not fixed hosting; `externalUseReady=false` remains correct until Render/Vercel/Netlify or equivalent fixed hosting is deployed and passes the same continuous gate.
- 2026-06-14: v85 adds `scripts/stable-access-gate.mjs` and `npm run gate:stable-access`. It combines fixed-hosting readiness, stable URL preflight, Render dashboard secret checklist, current temporary public preview, standby URL, and local fallback. A healthy `lhr.life` URL is reported as temporary only; `externalUseReady=false` remains correct until a fixed hosted URL is configured and passes the continuous public smoke endpoints.
- 2026-06-14: v86 keeps the current public-preview access model unchanged but updates the browser bundle to `app.js?v=86` / `finance-ai-assistant-v86`. The user-visible AI relay panel now also handles legacy `fallbackErrorCodes` without structured `attempts`, so third fallback failures such as `llama-3.1-8b-instant` keep their own safety/validation reason instead of being collapsed into quota/rate-limit wording.
- 2026-06-14: v86 runtime restart published the current code through the public preview server. Current temporary primary is `https://f860f2753da627.lhr.life`; current standby is `https://dd3bd8c04c4346.lhr.life`; both `/health` endpoints returned `200`. The homepage loads `app.js?v=86`, `/api/project/progress` returns `427 条自动化回归目标`, and the watchdog passed a `180s / 9` gate with zero transient failures. `scripts/stable-access-gate.mjs` still reports `externalUseReady=false`, because this is a temporary `lhr.life` tunnel and no fixed hosted URL has been configured.
- 2026-06-14: v87 updates the browser bundle to `app.js?v=87` / `finance-ai-assistant-v87` and project progress to `428 条自动化回归目标`. The stock coverage row now includes per-category update labels when data is available: quote, news, filings, public statements, and macro context. This is a frontend visibility improvement only; it does not change the fact that `lhr.life` is temporary and fixed hosting is still required for stable external access.
- 2026-06-14: v87 runtime proof again reproduced the core P0 issue. First v87 public URL `https://828be41b641413.lhr.life` initially returned `200` and loaded `app.js?v=87`, then failed during the 180-second gate with `tunnel-503` for all required endpoints. The watchdog rotated to current primary `https://8c56e589e08484.lhr.life` and standby `https://4edd8607801b7a.lhr.life`; current primary passed `180s / 9` with zero transient failures and standby is healthy after a short check. Stable external readiness remains false until fixed hosting is deployed.
- 2026-06-14: v88 updates the browser bundle to `app.js?v=88` / `finance-ai-assistant-v88` and project progress to `429 条自动化回归目标`. Rule-reference AI panels now include visible tags for `规则参考`, `完整 AI 未生成`, and `基于真实数据规则计算`, making rule-based output visually distinct from full AI output. This is a frontend clarity improvement; stable external readiness still depends on fixed hosting.
- 2026-06-14: v88 runtime verification published the current code through `https://78d667946f6616.lhr.life`, with standby `https://2c76a69e6ce931.lhr.life`. Primary and standby `/health` returned `200`, the primary homepage loads `app.js?v=88`, `/api/project/progress` returns `429 条自动化回归目标`, and the primary passed `180s / 9` with zero transient failures. `externalUseReady=false` remains correct because this is still temporary `lhr.life` access.
- 2026-06-14: v89 updates the browser bundle to `app.js?v=89` / `finance-ai-assistant-v89` and project progress to `430 条自动化回归目标`. The project-progress panel now keeps ordinary settings view short and folds production gates, database, audit, task queue, source endpoints, completed-item overflow, and blockers under `展开开发诊断`.
- 2026-06-14: v89 runtime verification published the current code through `https://1515ae173ad333.lhr.life`, with standby `https://90e56a803371fa.lhr.life`. Primary and standby `/health` returned `200`, the primary homepage loads `app.js?v=89`, `/api/project/progress` returns `430 条自动化回归目标`, and the primary passed `180s / 9` with zero transient failures. `scripts/stable-access-gate.mjs` still reports `externalUseReady=false`, because `lhr.life` remains temporary and fixed hosting is still missing.
- 2026-06-14: v90 updates the browser bundle to `app.js?v=90` / `finance-ai-assistant-v90` and project progress to `431 条自动化回归目标`. Added `npm run render:secret-audit` for a no-secret, presence-only audit of local runtime secret sources before manually configuring Render Dashboard secrets. The current audit reports 5 local runtime secret sources available and 2 local sources still unavailable (`FINANCE_AI_ALPHA_VANTAGE_API_KEY`, `FINANCE_AI_NEWS_API_KEY`); it still exits non-zero because Render Dashboard itself is not configured and no fixed hosted URL has passed the stable gate.
- 2026-06-14: v90 runtime verification published the current code through `https://31e54d41a78df8.lhr.life`, with standby `https://b9715dc3742d1f.lhr.life`. Primary and standby `/health` returned `200`, the primary homepage loads `app.js?v=90`, `/api/project/progress` returns `431 条自动化回归目标`, and the primary passed `180s / 9` with zero transient failures. `scripts/stable-access-gate.mjs` still reports `externalUseReady=false`, but now includes `localRuntimeSecretSourceKeys`, `unavailableSecretSourceKeys`, and `runtimeFileAudit` in the Render readiness section.
- 2026-06-14: v91 updates the browser bundle to `app.js?v=91` / `finance-ai-assistant-v91` and project progress to `432 条自动化回归目标`. AI relay technical diagnostics now include explicit `上次失败时间`, `建议重试时间`, `Provider 冷却`, and `备用尝试` rows, so 429/quota states no longer appear as an ambiguous “no local cooldown timer” state.
- 2026-06-14: v91 runtime proof again reproduced the temporary tunnel risk. First v91 URL `https://a8de71ac20a65c.lhr.life` initially loaded `app.js?v=91` and returned progress `432 条自动化回归目标`, then failed during the gate with `tunnel-503` on all required endpoints. The watchdog rotated to current primary `https://2b3382e2161ee1.lhr.life` and standby `https://d63dd82fddd8d5.lhr.life`; current primary passed `180s / 9` with zero transient failures and standby is healthy after a short check. Stable external readiness still requires fixed hosting.
- 2026-06-14: v92 updates the browser bundle to `app.js?v=92` / `finance-ai-assistant-v92` and project progress to `433 条自动化回归目标`. News now renders explicit grouped sections for company-direct, supply-chain/regulatory, industry, and broad-market background items; the first screen still prioritizes direct stock relevance and folds weak/background news. This improves P1 news quality but does not change the fixed-hosting requirement.
- 2026-06-14: v92 runtime verification published through current temporary primary `https://817a9e183b745e.lhr.life` with standby `https://c17fe010f50abb.lhr.life`. Primary homepage and `/health` returned `200`, standby `/health` returned `200`, the homepage loads `app.js?v=92`, and browser verification showed progress `433 条自动化回归目标` plus news grouped under `公司直接新闻（4）`. Manual health gate passed `180s / 10` across `/`, `/health`, `/api/health`, MSFT analysis, and stock search with zero transient failures; watchdog access-status also reports a completed `180s / 9` gate, healthy standby/local fallback, `temporaryAccessReady=true`, and `externalUseReady=false` because fixed hosting is still missing.
- 2026-06-14: v93 updates the browser bundle to `app.js?v=93` / `finance-ai-assistant-v93` and project progress to `434 条自动化回归目标`. OpenAI Responses API now has the same safety-repair flow as chat-completions: unsafe full-AI output triggers a second compliance-rewrite prompt, then publishes only if the repaired JSON passes validation. Full real-AI success now shows `完整 AI 分析已生成` with safety-repair status. This improves P1/P2 AI recovery; fixed hosting is still not complete until a stable hosted URL passes the gate.
- 2026-06-14: v93 runtime verification published through current temporary primary `https://22ec30beaf7120.lhr.life` with standby `https://9a49d0b8b010d0.lhr.life`. Primary homepage and `/health` returned `200`, standby `/health` returned `200`, the homepage loads `app.js?v=93`, and `/api/project/progress` returns `434 条自动化回归目标` with the Responses safety-repair item. Manual health gate passed `180s / 10` across `/`, `/health`, `/api/health`, MSFT analysis, and stock search with zero transient failures; watchdog access-status also reports a completed `180s / 10`, healthy standby/local fallback, `temporaryAccessReady=true`, and fixed hosting still missing.
- 2026-06-14: v94 adds a local access-card recovery file at `public-preview-latest.html`. The watchdog regenerates it whenever status changes, listing the current temporary primary URL, standby URL, and local fallback. This helps recover from old `lhr.life` links returning `503 / no tunnel here :(`, but it is still not fixed hosting. Current temporary primary is `https://7d31c3e5bb98de.lhr.life`; standby is `https://6b157ff09bf83a.lhr.life`; local fallback is `http://127.0.0.1:4192`. Primary, standby, and local `/health` returned `200`, the homepage loads `app.js?v=94`, and the first continuous watchdog gate passed `180s / 9` with `transientFailureCount=0`. `externalUseReady=false` remains correct until a stable hosted URL passes the same gate.
- 2026-06-14: The old foreground watchdog URL `https://107eb711c26c7e.lhr.life` later returned `503`; the watchdog rotated to the current reachable address `https://d4b7968023ae84.lhr.life`. The short health check confirmed `200` for the homepage, `/health`, `/api/health`, the MSFT analysis API, and stock search, and the homepage HTML loaded `app.js?v=72`.
- 2026-06-14: `https://d4b7968023ae84.lhr.life` later reproduced `503 / no tunnel here :(`. The health-check script now uses a `curl` fallback after Node `fetch` transport failures so a false negative does not kill a working tunnel.
- 2026-06-14: The current reachable address rotated to `https://0a74bbb77e9d75.lhr.life`; the updated watchdog completed a 3-minute health window with `health-ok`, `healthCycleCount=1`, and `iterationCount=8`. `/health`, `/api/project/progress`, and the MSFT analysis API returned `200`; the page loads `app.js?v=73`, and backend progress is `414 automated regression targets`.
- 2026-06-13: Browser verification confirmed the AI rule-reference panel shows `当前仅为规则分析`, OpenRouter second fallback not configured, Groq third fallback not configured, and `Provider 未返回剩余额度`.
- 2026-06-13: Browser verification confirmed searching `腾讯控股` shows both `常用：腾讯控股` and `最近：腾讯控股` with distinct accessible labels.
- 2026-06-13: The previous temporary URL `https://f703e59436bb1e.lhr.life` now returns `503`.
- 2026-06-13: The previous temporary URL was `https://f703e59436bb1e.lhr.life`, and `/health` had returned `200`.
- 2026-06-13: Public page `https://f703e59436bb1e.lhr.life/?refresh=public-v68-improvements#overview` loaded `app.js?v=68` and showed `402 automated regression targets`.
- 2026-06-13: Browser verification confirmed the AI rule-reference panel shows the `gpt-5.5 -> gemini-2.5-flash` relay, `REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA`, `429`, and cooldown guidance.
- 2026-06-13: Browser verification confirmed searching `腾讯控股` switches to `腾讯控股 · 0700`, and searching `贵州茅台` switches to `贵州茅台 · 600519`.
- 2026-06-13: The previous temporary URL `https://2ca08760dbbf39.lhr.life` now returns `503`.
- 2026-06-13: The previous temporary URL was `https://2ca08760dbbf39.lhr.life`, and `/health` had returned `200`.
- 2026-06-13: Public page `https://2ca08760dbbf39.lhr.life/?refresh=public-v67-report-fixes#overview` loaded `app.js?v=67` and showed `399 automated regression targets`.
- 2026-06-13: Right-side browser verification confirmed quick buttons can switch to `腾讯控股 · 0700` and `贵州茅台 · 600519`.
- 2026-06-13: 390px mobile viewport verification showed `clientWidth=390` and `scrollWidth=390`, so horizontal overflow was no longer reproduced.

- 2026-06-13：临时隧道域名已轮换，当前可访问地址为 `https://d069977f6f5437.lhr.life`，`/health` 返回 `200`。

- 2026-06-13: The temporary tunnel domain rotated; the current reachable address is `https://d069977f6f5437.lhr.life`, and `/health` returned `200`.

- 2026-06-13：公网页面 `https://de33a135f02a5b.lhr.life/?refresh=public-v66-same-origin-label#settings` 加载 `app.js?v=66`。
- 2026-06-13：公网页面显示 `后端 API 已连接`、`当前后端连接：同源 /api`、`395 条自动化回归目标`。
- 2026-06-13：公网同源 API 状态不再显示空地址文案，例如 `当前后端地址：。` 或 `正在连接 。`。

- 2026-06-13: Public page `https://de33a135f02a5b.lhr.life/?refresh=public-v66-same-origin-label#settings` loaded `app.js?v=66`.
- 2026-06-13: Public page showed backend connected, `当前后端连接：同源 /api`, and `395 automated regression targets`.
- 2026-06-13: Public same-origin API state no longer showed empty-address copy such as `当前后端地址：。` or `正在连接 。`.

- 2026-06-13：公网页面 `https://de33a135f02a5b.lhr.life/?refresh=public-v65-provider-copy#settings` 加载 `app.js?v=65`。
- 2026-06-13：公网 `/health` 返回 `200`。
- 2026-06-13：公网页面显示 `后端 API 已连接`、`394 条自动化回归目标`。
- 2026-06-13：数据源技术详情显示 `离线契约演练可用，不作为真实数据兜底`，未再暴露旧的 `fixture` 或 `开发样例开关开启` 文案。

- 2026-06-13: Public page `https://de33a135f02a5b.lhr.life/?refresh=public-v65-provider-copy#settings` loaded `app.js?v=65`.
- 2026-06-13: Public `/health` returned `200`.
- 2026-06-13: Public page showed backend connected and `394 automated regression targets`.
- 2026-06-13: Data-source technical details showed `离线契约演练可用，不作为真实数据兜底` and no longer exposed the old `fixture` or `开发样例开关开启` wording.

- 2026-06-13：公网页面 `https://de33a135f02a5b.lhr.life/?refresh=public-v64-browser-final#overview` 加载 `app.js?v=64`。
- 2026-06-13：公网 `/health` 返回 `200`。
- 2026-06-13：公网 `/api/project/progress` 返回 `200`，并显示 `393 条自动化回归目标`。
- 2026-06-13：右侧浏览器验证显示 `后端 API 已连接`、`AI 规则参考`、上涨参考概率 `48%`、下跌风险概率 `52%`。

- 2026-06-13: Public page `https://de33a135f02a5b.lhr.life/?refresh=public-v64-browser-final#overview` loaded `app.js?v=64`.
- 2026-06-13: Public `/health` returned `200`.
- 2026-06-13: Public `/api/project/progress` returned `200` and showed `393 automated regression targets`.
- 2026-06-13: Right-side browser verification showed backend connected, `AI 规则参考`, upside probability `48%`, and downside risk probability `52%`.

- 2026-06-14：固定 Render 测试网址已建立：`https://finance-ai-assistant-web.onrender.com`。
- 2026-06-14：即时检查返回 `200`：首页、`/health`、`/api/health`、股票搜索接口。
- 2026-06-14：固定托管门禁通过：`node scripts/stable-hosting-preflight.mjs --url https://finance-ai-assistant-web.onrender.com` 返回 `ok=true`、`externalUseReady=true`、`continuousHealthPassed=true`。
- 2026-06-14：连续验收窗口为 180 秒，共 11 轮，覆盖 `/`、`/health`、`/api/health`、`/api/analysis?symbol=MSFT&riskProfile=balanced`、`/api/stocks/search?q=Microsoft`，`lastFailure=null`。
- 2026-06-14：固定 Render 网址首页加载 `app.js?v=107`。该网址替代 `lhr.life` 临时链接作为当前外部测试入口。

- 2026-06-14: Fixed Render test URL is now available: `https://finance-ai-assistant-web.onrender.com`.
- 2026-06-14: Immediate checks returned `200` for the homepage, `/health`, `/api/health`, and stock search endpoint.
- 2026-06-14: The fixed-hosting gate passed: `node scripts/stable-hosting-preflight.mjs --url https://finance-ai-assistant-web.onrender.com` returned `ok=true`, `externalUseReady=true`, and `continuousHealthPassed=true`.
- 2026-06-14: The continuous validation window was 180 seconds with 11 iterations, covering `/`, `/health`, `/api/health`, `/api/analysis?symbol=MSFT&riskProfile=balanced`, and `/api/stocks/search?q=Microsoft`; `lastFailure=null`.
- 2026-06-14: The fixed Render homepage loads `app.js?v=107`. This URL replaces temporary `lhr.life` links as the current external test entry.
