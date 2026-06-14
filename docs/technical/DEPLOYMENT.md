# 部署与稳定访问方案 / Deployment And Stable Access

## 当前结论 / Current Decision

本地 `localhost.run` 守护隧道已经能自动重启临时公网链接，但它仍依赖本机电脑、网络和 SSH 隧道服务。用于正式演示或外部持续测试时，应优先准备固定线上测试环境。

The local `localhost.run` watchdog can auto-restart temporary public links, but it still depends on the local Mac, network, and SSH tunnel service. For demos or ongoing external testing, a fixed online test environment should be preferred.

## 访问层级 / Access Levels

1. 固定线上测试环境：首选，适合发给外部用户或长时间测试。
2. 本地守护公网链接：备用，适合临时测试；命令是 `npm run dev:public-preview:watch`。该命令会同步生成 `public-preview-latest.html`，旧 `lhr.life` 链接掉线时可打开这个本地文件查看最新主入口、备用入口和本机入口。
3. 本机地址：最后备用，只能在本机访问；默认 `http://127.0.0.1:4192`。

1. Fixed online test environment: preferred for external users and longer testing.
2. Local watchdog public link: backup for temporary testing; command: `npm run dev:public-preview:watch`. The command also regenerates `public-preview-latest.html`, so when an old `lhr.life` link drops you can open that local file to find the latest primary, standby, and local links.
3. Local-only URL: last fallback, available only on this machine; default: `http://127.0.0.1:4192`.

## Render 蓝图 / Render Blueprint

项目已添加 `render.yaml`，用于创建一个 Node Web Service：

- 启动命令：`npm start`
- 健康检查：`/health`
- 绑定地址：`0.0.0.0`
- 前端和后端 API 同源：`/api/*` 与 `/health`
- 密钥字段：全部通过 Render Dashboard 填写，不写入仓库

The project now includes `render.yaml` for a Node Web Service:

- Start command: `npm start`
- Health check: `/health`
- Bind host: `0.0.0.0`
- Same-origin frontend and backend API: `/api/*` and `/health`
- Secret fields: enter them in the Render Dashboard only; never commit them

## 必填密钥 / Required Secrets

Render 中至少应配置以下密钥，缺失时对应功能会保持空白或降级：

- `FINANCE_AI_TWELVE_DATA_API_KEY`
- `FINANCE_AI_ALPHA_VANTAGE_API_KEY`
- `FINANCE_AI_NEWS_API_KEY`
- `FINANCE_AI_MODEL_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK2_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK3_API_KEY`

At minimum, configure these secrets in Render. Missing keys will leave related features blank or downgraded:

- `FINANCE_AI_TWELVE_DATA_API_KEY`
- `FINANCE_AI_ALPHA_VANTAGE_API_KEY`
- `FINANCE_AI_NEWS_API_KEY`
- `FINANCE_AI_MODEL_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK2_API_KEY`
- `FINANCE_AI_MODEL_FALLBACK3_API_KEY`

## Render AI 接力配置 / Render AI Relay Configuration

`render.yaml` 已包含真实 AI smoke/runtime 所需的非密钥配置：

- 主模型：`FINANCE_AI_MODEL_PROVIDER=openai-compatible`、`FINANCE_AI_MODEL_ID=gpt-5.5`、`FINANCE_AI_MODEL_BASE_URL=https://api.openai.com/v1`、`FINANCE_AI_MODEL_API_STYLE=responses`
- 运行开关：`FINANCE_AI_MODEL_ALLOW_NETWORK=true`、`FINANCE_AI_MODEL_RUNTIME=render-smoke`
- 备用 1：`gemini-2.5-flash`
- 备用 2：`qwen/qwen3-next-80b-a3b-instruct:free`
- 备用 3：`llama-3.1-8b-instant`

真实 key 仍只能在 Render Dashboard 手动填写。部署后若主模型 key 缺失或额度不足，后端会继续尝试已配置 key 的备用模型，不会因为主模型未配置而阻断 Gemini/OpenRouter/Groq 接力。

`render.yaml` now sets `autoDeploy: true`, so future GitHub pushes should redeploy automatically after Render has synced this blueprint. If the existing Render service was created before this change, manually sync the blueprint or trigger one redeploy in the Render Dashboard before expecting the live site to load the latest `app.js?v=` bundle or updated AI relay behavior.

`render.yaml` now contains the non-secret settings required for real AI smoke/runtime:

- Primary model: `FINANCE_AI_MODEL_PROVIDER=openai-compatible`, `FINANCE_AI_MODEL_ID=gpt-5.5`, `FINANCE_AI_MODEL_BASE_URL=https://api.openai.com/v1`, `FINANCE_AI_MODEL_API_STYLE=responses`
- Runtime switches: `FINANCE_AI_MODEL_ALLOW_NETWORK=true`, `FINANCE_AI_MODEL_RUNTIME=render-smoke`
- Fallback 1: `gemini-2.5-flash`
- Fallback 2: `qwen/qwen3-next-80b-a3b-instruct:free`
- Fallback 3: `llama-3.1-8b-instant`

Real keys must still be entered manually in the Render Dashboard. After deployment, if the primary key is missing or quota-limited, the backend continues to try configured fallback keys instead of letting the missing primary block Gemini/OpenRouter/Groq relay.

`render.yaml` 现在设置为 `autoDeploy: true`，Render 同步该蓝图后，后续 GitHub 推送应自动 redeploy。如果现有 Render 服务创建早于本次修改，请先在 Render Dashboard 手动同步蓝图或触发一次 redeploy，线上才会加载最新 `app.js?v=` 和新的 AI 接力行为。

## 部署后验收 / Post-Deploy Verification

如果要先生成固定托管交接包，运行：

```bash
npm run handoff:stable-hosting
```

它会列出 Render 服务名、运行时变量、Dashboard 密钥清单、当前临时公网入口、本机备用入口，以及部署后要执行的连续验收命令。该输出不会包含任何真实 API key。若需要给非技术配置人员使用的可打开页面，运行：

```bash
npm run handoff:stable-hosting:html
```

该命令会生成 `stable-hosting-handoff.html`，用卡片方式展示访问层级、Render 服务、Dashboard 密钥、执行步骤和 180 秒验收命令；密钥仍保持空白，只能在 Render Dashboard 手工填写。

To generate a fixed-hosting handoff package first, run:

```bash
npm run handoff:stable-hosting
```

It lists the Render service name, runtime variables, dashboard secret checklist, current temporary public URL, local fallback URL, and post-deploy continuous validation command. It does not include real API keys. For a user-readable page that can be opened directly, run:

```bash
npm run handoff:stable-hosting:html
```

This generates `stable-hosting-handoff.html` with cards for access levels, Render service settings, dashboard secrets, execution steps, and the 180-second validation command. Secret values remain blank and must be entered manually in Render Dashboard.

当前该交接包是固定托管迁移的首选入口。它的 `accessLevels[0]` 如果显示 `missing`，说明还没有固定 URL；`accessLevels[1]` 即使显示 `healthy-temporary`，也仍然只是 `lhr.life` 短测入口。

This handoff package is now the preferred entry point for fixed-hosting migration. If `accessLevels[0]` is `missing`, there is no fixed URL yet. Even when `accessLevels[1]` is `healthy-temporary`, it is still only a short-lived `lhr.life` test entry.

创建 Render 服务前，可以检查当前 shell 是否已经准备好 Dashboard 密钥变量：

```bash
npm run check:render-readiness
```

该命令只报告变量是否存在，输出中真实值会显示为 `[configured-redacted]`，不会打印 key。若只是检查蓝图而不要求本机 shell 有密钥，可运行：

```bash
node scripts/render-deploy-readiness.mjs --blueprint-only
```

Before creating the Render service, you can check whether the current shell has the dashboard secret variables ready:

```bash
npm run check:render-readiness
```

This command only reports whether variables exist; real values are shown as `[configured-redacted]` and keys are never printed. To check only the blueprint without requiring local secret values:

```bash
node scripts/render-deploy-readiness.mjs --blueprint-only
```

如果严格模式显示缺少密钥，这是正常的安全提示：它表示这些变量还没有出现在当前运行环境里。真正部署时，应在 Render Dashboard 的 Environment 页面填写这些变量，而不是写入仓库。

If strict mode shows missing secrets, that is the intended safety signal: those variables are not present in the current runtime. For real deployment, enter them in the Render Dashboard Environment page, not in the repository.

要生成 Render Dashboard 环境变量模板，运行：

```bash
npm run render:env-template
```

如需 `.env` 风格的清单用于人工核对，运行：

```bash
node scripts/render-dashboard-env-template.mjs --env
```

## Render Secret Source Audit

在创建固定 Render 服务前，可以运行只检查“本机是否存在运行时密钥来源”的审计。它不会读取、打印、复制或保存真实 key，只会显示哪些变量本机有可人工核对的来源，哪些仍缺：

```bash
npm run render:secret-audit
```

Render Dashboard 仍需要你人工填写真实密钥；本机存在运行时文件不等于线上服务已配置完成。

Before creating the fixed Render service, run a presence-only audit for local runtime secret sources. It does not read, print, copy, or save real keys; it only shows which dashboard variables have a local source available for manual checking and which are still missing:

```bash
npm run render:secret-audit
```

Render Dashboard still requires manual secret entry. A local runtime file does not mean the hosted service is configured.

密钥行会保持空值并带注释，只能在 Render Dashboard 里手动粘贴真实值。

To generate the Render Dashboard environment-variable template:

```bash
npm run render:env-template
```

For a `.env`-style checklist for manual review:

```bash
node scripts/render-dashboard-env-template.mjs --env
```

Secret rows stay blank with comments; paste real values only in the Render Dashboard.

当前模板应作为创建 Render 服务时的变量核对表。不要把 `--env` 输出保存为含真实 key 的文件；如果需要临时核对，只保留空白模板。

Use this template as the variable checklist when creating the Render service. Do not save `--env` output with real keys; if you need a temporary checklist, keep it blank.

部署前先运行固定托管预检，确认蓝图、启动命令、健康检查和密钥占位是安全的：

```bash
npm run check:stable-hosting
```

如果当前 shell 没有 `npm`，可直接运行：

```bash
node scripts/stable-hosting-preflight.mjs
```

Before deployment, run the fixed-hosting preflight to verify the blueprint, start command, health check, and dashboard-only secret placeholders:

```bash
npm run check:stable-hosting
```

If the current shell does not have `npm`, run:

```bash
node scripts/stable-hosting-preflight.mjs
```

部署完成后，把 Render 生成的固定 URL 代入：

```bash
FINANCE_AI_PUBLIC_PREVIEW_URL=https://your-render-url.onrender.com npm run check:public-preview
```

也可以使用固定托管预检的 URL 参数，把蓝图检查和公网连续验收放在同一次输出里：

```bash
FINANCE_AI_STABLE_PREVIEW_URL=https://your-render-url.onrender.com npm run check:stable-hosting
```

如果要检查当前固定 Render 网址是否已经部署到本地最新版本，并同时查看 AI 主/备用接力状态，运行：

```bash
npm run status:render-live -- --url https://finance-ai-assistant-web.onrender.com
```

该命令会检查首页脚本版本、`/health`、`/api/health`、`/api/project/progress`、`/api/ai-services/provider-adapter` 和 MSFT 分析接口。它只输出密钥存在性/运行状态，不读取、不打印真实 key。

验收标准：

- 首页 `/` 在 2-3 分钟窗口内持续 `200`
- `/health` 持续 `200`
- `/api/health` 持续 `200`
- `/api/analysis?symbol=MSFT&riskProfile=balanced` 持续 `200`
- `/api/stocks/search?q=Microsoft` 持续 `200`

After deployment, use the Render URL:

```bash
FINANCE_AI_PUBLIC_PREVIEW_URL=https://your-render-url.onrender.com npm run check:public-preview
```

You can also pass the fixed URL to the stable-hosting preflight so blueprint checks and continuous public validation appear in one output:

```bash
FINANCE_AI_STABLE_PREVIEW_URL=https://your-render-url.onrender.com npm run check:stable-hosting
```

To verify whether the fixed Render URL has deployed the latest local version and to inspect the primary/fallback AI relay status, run:

```bash
npm run status:render-live -- --url https://finance-ai-assistant-web.onrender.com
```

This command checks the homepage script version, `/health`, `/api/health`, `/api/project/progress`, `/api/ai-services/provider-adapter`, and an MSFT analysis endpoint. It reports secret presence/runtime status only; it does not read or print real keys.

Acceptance criteria:

- Homepage `/` stays `200` during the 2-3 minute window
- `/health` stays `200`
- `/api/health` stays `200`
- `/api/analysis?symbol=MSFT&riskProfile=balanced` stays `200`
- `/api/stocks/search?q=Microsoft` stays `200`

## 当前固定测试网址 / Current Fixed Test URL

当前已通过稳定访问门禁的固定外部测试网址：

```text
https://finance-ai-assistant-web.onrender.com
```

验收证据：

- 验收时间：2026-06-14
- 验收命令：`node scripts/stable-hosting-preflight.mjs --url https://finance-ai-assistant-web.onrender.com`
- 验收结果：`ok=true`、`externalUseReady=true`、`continuousHealthPassed=true`
- 连续窗口：180 秒
- 轮次：11
- 覆盖端点：`/`、`/health`、`/api/health`、`/api/analysis?symbol=MSFT&riskProfile=balanced`、`/api/stocks/search?q=Microsoft`
- 失败记录：`lastFailure=null`

Current fixed external test URL that passed the stable access gate:

```text
https://finance-ai-assistant-web.onrender.com
```

Validation evidence:

- Validation date: 2026-06-14
- Validation command: `node scripts/stable-hosting-preflight.mjs --url https://finance-ai-assistant-web.onrender.com`
- Result: `ok=true`, `externalUseReady=true`, `continuousHealthPassed=true`
- Continuous window: 180 seconds
- Iterations: 11
- Covered endpoints: `/`, `/health`, `/api/health`, `/api/analysis?symbol=MSFT&riskProfile=balanced`, `/api/stocks/search?q=Microsoft`
- Failure record: `lastFailure=null`

## 限制 / Limits

Render 免费实例可能冷启动，首次访问会慢。该环境仍是测试环境，不等于正式面向社会上线。正式上线仍需要生产数据库、认证、密钥管理、监控告警、数据授权和合规复核。

Render free instances may cold start, so the first request can be slow. This is still a test environment, not a public production launch. Production still needs a production database, authentication, secret management, monitoring, data licensing, and compliance review.
