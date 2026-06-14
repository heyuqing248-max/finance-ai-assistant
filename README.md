# AI 财经情报助手 / AI Financial Intelligence Assistant

中文优先的 Web/PWA 财经新闻、自选股和模型参考概率分析原型。

Chinese-first Web/PWA prototype for financial news, watchlists, and model-reference probability analysis.

## Run Locally / 本地运行

Recommended full webpage run command from this folder:

推荐的一键运行网页项目命令：

```bash
node scripts/full-dev-server.mjs
```

This starts the webpage and mock backend together:

这会同时启动网页和 mock 后端：

```text
Web:     http://127.0.0.1:4173
Backend: http://localhost:4180
```

Then open the webpage:

然后打开网页：

```text
http://127.0.0.1:4173
```

When opened from `127.0.0.1:4173` or `localhost:4173`, the webpage automatically tries to connect to the mock backend at `http://localhost:4180`. If the backend is unavailable, it quietly keeps using local sample data.

从 `127.0.0.1:4173` 或 `localhost:4173` 打开时，网页会自动尝试连接 `http://localhost:4180` 的 mock 后端。如果后端不可用，网页会安静地继续使用本机样例数据。

The webpage includes a PWA manifest and service worker. Core files are precached, navigation can fall back to the cached homepage when offline, backend API responses are not cached, and static assets use runtime caching.

网页包含 PWA manifest 和 service worker。核心文件会预缓存，离线导航可回退到缓存首页，后端 API 响应不会被缓存，静态资源会使用运行时缓存。

If `npm` is available, the same full startup can also be run with:

如果本机有 `npm`，也可以用下面命令一键启动：

```bash
npm run dev
```

Real-data local run for the current demo:

当前本地真实数据演示启动方式：

```bash
node scripts/real-data-dev-server.mjs
```

This reads runtime-only provider keys from `/private/tmp/finance_ai_twelve_data_key` and `/private/tmp/finance_ai_alpha_vantage_key`, then enables Twelve Data quotes, Alpha Vantage -> Yahoo Finance RSS -> GDELT public-news relay, SEC EDGAR US filings, and World Bank Open Data annual macro indicators. The script does not print or save API keys.

它会从 `/private/tmp/finance_ai_twelve_data_key` 和 `/private/tmp/finance_ai_alpha_vantage_key` 读取仅本机运行时使用的 provider key，并启用 Twelve Data 行情、Alpha Vantage -> Yahoo Finance RSS -> GDELT 公开新闻接力、SEC EDGAR 美股公告和 World Bank Open Data 年度宏观指标。脚本不会打印或保存 API key。

Optional local real AI model runtime:

可选本机真实 AI 模型运行方式：

```text
/private/tmp/finance_ai_model_key
/private/tmp/finance_ai_model_id
/private/tmp/finance_ai_model_base_url
```

`finance_ai_model_key` and `finance_ai_model_id` enable an OpenAI-compatible `/chat/completions` runtime. `finance_ai_model_base_url` is optional and defaults to an OpenAI-compatible endpoint. When these files are missing, `GET /api/analysis` returns `REAL_AI_MODEL_NOT_CONFIGURED` in strict real-data mode and the webpage stays blank instead of showing sample or rule-based advice. The script does not print or save model keys.

`finance_ai_model_key` 和 `finance_ai_model_id` 会启用 OpenAI-compatible `/chat/completions` 真实模型运行通道。`finance_ai_model_base_url` 是可选项，默认使用 OpenAI-compatible 端点。缺少这些文件时，严格真实数据模式下 `GET /api/analysis` 会返回 `REAL_AI_MODEL_NOT_CONFIGURED`，网页保持空白，不显示样例或规则生成建议。脚本不会打印或保存模型 key。

To test from another device on the same Wi-Fi, start LAN mode on the computer:

如果要用同一 Wi-Fi 下的手机或 iPad 测试，请在电脑上启动局域网模式：

```bash
node scripts/full-dev-server.mjs --lan
```

The terminal will print one or more `LAN:` URLs, such as `http://192.168.x.x:4173`. Open that LAN URL on the phone or iPad. In this mode, the webpage automatically tries the backend on the same host at port `4180`.

终端会打印一个或多个 `LAN:` 地址，例如 `http://192.168.x.x:4173`。请在手机或 iPad 上打开这个局域网地址。此模式下，网页会自动尝试连接同一台电脑 `4180` 端口的后端。

Separate web-only command:

只启动网页的命令：

```bash
node scripts/web-dev-server.mjs
```

Separate backend-only command:

只启动后端的命令：

```bash
node backend/server.mjs
```

Fallback static server for webpage-only preview:

只预览网页时的备用静态服务器：

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Test / 测试

This project has a lightweight no-dependency frontend regression test suite.
Run syntax checks and regression tests directly with Node:

```bash
node --check app.js
node --check backend/server.mjs
node --test tests/*.test.mjs
node --test backend/tests/*.test.mjs
```

If `npm` is available, the same checks can also be run with:

```bash
npm run check
```

当前测试覆盖搜索无结果、后端股票搜索、自选股去重与后端同步、风险偏好联动、后端 AI 分析、历史走势样例与来源说明、持仓本机分析与后端同步、提醒偏好和具体提醒规则保存/删除/后端同步、术语解释弹窗、数据源 API 连接/失败回退、后端新闻读取和异常本地缓存恢复。

当前后端回归也覆盖数据源 provider 能力接口，确认 mock 数据源会明确标记为样例数据。

The current backend regression suite also covers the data-source provider capability endpoint, ensuring the mock provider is clearly labeled as sample data.

前端连接后端后会读取 `GET /api/data-sources`，并在设置区显示当前 provider、样例/实时状态、覆盖市场和能力范围，避免把样例数据误认为真实行情。

After the frontend connects to the backend, it reads `GET /api/data-sources` and shows the active provider, sample/live mode, market coverage, and capability scope in Settings, so sample data is not mistaken for live market data.

## Backend / 后端

The first backend baseline is a no-dependency Node mock API:

```bash
npm run dev:backend
```

Default URL:

```text
http://localhost:4180
```

可选持久化数据文件：

Optional persistent data file:

```bash
FINANCE_AI_DATA_FILE=./data/mock-backend-state.json node backend/server.mjs
```

启用后，登录用户的自选股会按用户隔离保存；持仓、偏好设置、分析历史、提醒规则、通知 outbox 和安全审计事件也会写入 JSON 文件。这个文件是进入真实数据库前的过渡方案，不应保存生产密钥或真实敏感凭证。

When enabled, logged-in user watchlists are stored per user; portfolio entries, preferences, analysis history, reminder rules, notification outbox records, and safe audit events are also written to a JSON file. This is a transition step before a real database and must not store production secrets or real sensitive credentials.

后端持仓现在支持 `GET /api/portfolio` 读取当前登录用户持仓，并且 `POST /api/portfolio` 会按用户和股票代码更新同一条记录，避免重复追加同一只股票的持仓。

Backend portfolio sync now supports `GET /api/portfolio` for the current logged-in user, and `POST /api/portfolio` updates by user and stock code to avoid duplicate positions for the same stock.

Health check:

```text
GET /health
GET /api/health
```

Project progress snapshot:

```text
GET /api/project/progress
```

This endpoint reports local demo progress, public launch readiness, and category readiness for data sources, AI analysis, production database, auth/security, compliance, and deployment operations.

该接口会返回本地 Demo 完成度、面向社会上线准备度，以及真实数据源、AI 分析、生产数据库、认证安全、合规发布、部署运维的分项准备度。

数据源能力检查：

Data-source capability check:

```text
GET /api/data-sources
GET /api/data-sources/vendor-readiness
GET /api/data-sources/market-data-vendor-checklist
GET /api/data-sources/news-filings-vendor-checklist
GET /api/data-sources/macro-data-vendor-checklist
GET /api/data-sources/public-statements-vendor-checklist
```

`GET /api/data-sources/vendor-readiness` 返回真实数据源供应商筛选与授权清单，覆盖行情、新闻/公告、宏观数据、高管/政府公开言论的候选分组、接入顺序、授权检查、成本驱动、下一步动作和未签约/未接入真实 provider 的免责声明。

`GET /api/data-sources/vendor-readiness` returns the real data-source vendor screening and licensing checklist, covering market data, news/filings, macro data, and executive/government public statements with candidate groups, contact order, licensing checks, cost drivers, next actions, and a no-signed-provider/no-live-provider disclaimer.

`GET /api/data-sources/market-data-vendor-checklist` 返回行情 provider 验收清单，覆盖报价、历史走势、交易日历、延迟标签、展示授权、缓存权限、限流成本、审计字段和供应商待确认问题。

`GET /api/data-sources/market-data-vendor-checklist` returns the market-data provider acceptance checklist covering quotes, history, trading calendars, delay labels, display rights, cache permission, rate-limit/cost checks, audit fields, and vendor questions.

`GET /api/data-sources/news-filings-vendor-checklist` 返回新闻/公告 provider 验收清单，覆盖标题摘要、短摘录、原文链接、保留天数、来源署名、付费墙边界和供应商待确认问题。

`GET /api/data-sources/news-filings-vendor-checklist` returns the news/filings provider acceptance checklist covering headline summaries, short excerpts, source links, retention days, attribution, paywall boundaries, and vendor questions.

`GET /api/data-sources/macro-data-vendor-checklist` 返回宏观数据 provider 验收清单，覆盖利率、汇率、通胀、政策事件、修订规则、asOf 标签、时区归一、审计字段和供应商待确认问题。

`GET /api/data-sources/macro-data-vendor-checklist` returns the macro-data provider acceptance checklist covering rates, FX, inflation, policy events, revision policy, asOf labels, timezone normalization, audit fields, and vendor questions.

`GET /api/data-sources/public-statements-vendor-checklist` 返回公开言论 provider 验收清单，覆盖 CEO/公司账号/政府高层/监管账号的身份验证、原始链接、发言人角色、平台条款、短摘录边界、人工复核队列和审计字段。

`GET /api/data-sources/public-statements-vendor-checklist` returns the public-statements provider acceptance checklist covering verified CEO/company/government/regulator identities, source links, speaker roles, platform terms, short-excerpt boundaries, manual review queues, and audit fields.

前端设置区默认使用本机样例数据；启动后端后，可在网页设置区尝试连接 mock API。连接失败时会自动回到本机样例数据，保证网页离线模式仍可运行。

The Settings area uses local sample data by default. After starting the backend, the webpage can test the mock API connection. If the connection fails, it falls back to local sample data so browser/offline mode remains usable.

连接成功后，市场新闻会优先从 `GET /api/news?market=...` 读取；接口失败时会自动回退到本机样例新闻。

After a successful connection, market news is loaded from `GET /api/news?market=...` first. If the API request fails, it automatically falls back to local sample news.

连接成功后，股票搜索会优先从 `GET /api/stocks/search?q=...` 读取；没有搜索结果时会保留当前股票，不会误跳到默认股票。

After a successful connection, stock search is loaded from `GET /api/stocks/search?q=...` first. Empty results preserve the current stock instead of jumping to a default stock.

连接成功后，AI 分析会优先从 `GET /api/analysis?symbol=...&riskProfile=...` 读取；在严格真实数据模式下，未配置真实模型时会保持空白并显示配置缺口，不回退到样例分析。分析响应可携带真实输入来源说明，用于前端展示分析依据。

After a successful connection, AI analysis is loaded from `GET /api/analysis?symbol=...&riskProfile=...` first. In strict real-data mode, if no real model is configured, the page stays blank with setup gaps instead of falling back to sample analysis. Analysis responses can include real input source notes for the frontend evidence view.

AI 分析服务入口仍在 `backend/services/mock-ai-service.mjs`，真实模型供应商适配器在 `backend/services/ai-provider-adapter.mjs`。后端提供 `GET /api/ai-services` 和 `GET /api/ai-services/provider-adapter` 查看当前模型服务状态；配置真实模型后，后端会调用 OpenAI-compatible chat completions，并校验结构化 JSON、风险提示和禁止收益保证表达。未配置真实模型时不会返回样例投资建议。

The AI service entry remains in `backend/services/mock-ai-service.mjs`, with the real model provider adapter in `backend/services/ai-provider-adapter.mjs`. The backend exposes `GET /api/ai-services` and `GET /api/ai-services/provider-adapter` for model-service status. Once a real model is configured, the backend calls OpenAI-compatible chat completions and validates structured JSON, warnings, and forbidden guaranteed-return wording. Without a real model, it returns no sample investment advice.

认证现在通过 `backend/services/mock-auth-service.mjs` 处理，后端提供 `GET /api/auth/status` 查看当前认证服务状态；样例登录会返回 token 类型、过期时间和安全边界提示。当前还支持 mock 邮箱注册/登录：`POST /api/auth/register` 和 `POST /api/auth/login` 会创建样例用户、哈希保存密码并返回 bearer token。当前仍是样例认证，不是真实账号安全方案。

Authentication is now handled through `backend/services/mock-auth-service.mjs`, and the backend exposes `GET /api/auth/status` for current auth-service status. Demo login returns token type, expiry, and a safety-boundary disclaimer. Mock email registration/login is also available through `POST /api/auth/register` and `POST /api/auth/login`; it creates sample users, hashes passwords, and returns bearer tokens. This is still sample auth, not a real account-security solution.

退出登录会优先调用 `POST /api/auth/logout` 撤销当前 mock 邮箱会话，然后清除本机 token。样例 token 没有服务端 session 可撤销，但会记录退出事件。

Sign-out calls `POST /api/auth/logout` first to revoke the current mock email session, then clears the local token. The demo token has no server-side session to revoke, but the logout event is still recorded.

如果本机保存了邮箱登录 token，网页在连接后端时会先调用 `GET /api/me` 校验会话；如果 token 已过期或已被撤销，会自动清除本机登录状态并提示重新登录。

If an email-login token is saved locally, the webpage validates it with `GET /api/me` when the backend is connected. If the token is expired or revoked, it clears local login state and asks the user to sign in again.

前端账户区在连接后端后可以使用邮箱注册/登录，并会用返回的 token 同步自选股、偏好、提醒、通知和持仓流程。

After the frontend connects to the backend, the Account area can register or log in with email and use the returned token to sync watchlists, preferences, reminders, notifications, and portfolio flows.

连接成功并进入样例登录状态后，后端 AI 分析结果会通过 `POST /api/analysis/history` 保存；最近历史可通过 `GET /api/analysis/history` 读取。历史记录仅用于回看模型参考输出，不构成投资建议。

After a successful connection and demo login, backend AI analysis results are saved through `POST /api/analysis/history`; recent history can be read with `GET /api/analysis/history`. History is for reviewing model-reference output only, not investment advice.

连接成功并进入样例登录状态后，自选股会通过 `GET/POST/DELETE /api/watchlist` 同步；接口失败时会继续使用本机自选股。

After a successful connection and demo login, watchlist data syncs through `GET/POST/DELETE /api/watchlist`. If the API request fails, it continues using the local watchlist.

连接成功并进入样例登录状态后，持仓会通过 `POST /api/portfolio` 同步；接口失败时会继续保留本机持仓数据。

After a successful connection and demo login, portfolio data syncs through `POST /api/portfolio`. If the API request fails, it keeps the local portfolio data.

连接成功并进入样例登录状态后，风险偏好和提醒渠道偏好会通过 `GET/POST /api/preferences` 同步；接口失败时会继续保留本机偏好。

After a successful connection and demo login, risk profile and reminder-channel preferences sync through `GET/POST /api/preferences`. If the API request fails, it keeps the local preferences.

连接成功并进入样例登录状态后，价格/重大新闻提醒规则会通过 `GET/POST/DELETE /api/reminders` 同步；接口失败时会继续保留本机提醒规则。

After a successful connection and demo login, price/news reminder rules sync through `GET/POST/DELETE /api/reminders`. If the API request fails, it keeps the local reminder rules.

后端还提供 `POST /api/reminders/evaluate`，用于根据样例价格和样例新闻重要性评估提醒规则是否触发，并写入安全审计事件。真实定时任务和真实推送渠道仍在后续阶段接入。

The backend also provides `POST /api/reminders/evaluate` to evaluate reminder rules against sample prices and sample news importance, then write safe audit events. Real scheduled jobs and real delivery channels are still future work.

提醒触发后会生成 mock 通知 outbox 记录，可通过 `GET /api/notifications` 查看，并通过 `POST /api/notifications/:id/read` 标记已读。当前只是后端排队记录，不代表邮件、微信或系统推送已真实送达。

Triggered reminders create mock notification outbox records. They can be read with `GET /api/notifications` and marked as read with `POST /api/notifications/:id/read`. This is a backend queued record only, not proof of real email, WeChat, or system-push delivery.

通知投递现在通过 `backend/services/mock-notification-service.mjs` 处理，后端提供 `GET /api/notification-services` 查看当前投递模式、支持渠道和能力。当前仍是 `outbox-only`，不会真正发出邮件、短信、微信、Telegram 或系统推送。

Notification delivery is now handled through `backend/services/mock-notification-service.mjs`, and the backend exposes `GET /api/notification-services` for delivery mode, supported channels, and capabilities. It is still `outbox-only`, so it does not actually send email, SMS, WeChat, Telegram, or system push.

用户数据仓储现在通过 `backend/repositories/mock-repository.mjs` 统一管理，后端提供 `GET /api/repository/status` 查看当前是内存样例还是 JSON 文件桥、管理哪些数据域以及样例容量限制。当前仍不是生产数据库。

User data storage is centralized through `backend/repositories/mock-repository.mjs`, and the backend exposes `GET /api/repository/status` to show whether it is memory-only or JSON-file bridge, which data domains it manages, and sample retention limits. This is still not a production database.

Mock 邮箱认证用户和 session 也已经通过 `backend/repositories/mock-repository.mjs` 读写，认证服务不直接依赖原始 state 结构，方便后续替换成真实数据库用户表和 session 表。

Mock email-auth users and sessions are also read and written through `backend/repositories/mock-repository.mjs`; the auth service no longer depends on the raw state shape, making it easier to replace with real users and sessions tables later.

数据库服务现在通过 `backend/services/mock-database-service.mjs` 统一报告，后端提供 `GET /api/database/status` 查看当前存储桥、计划表、迁移阶段和缺失的生产数据库能力。当前仍不是正式数据库。

Database readiness is now reported through `backend/services/mock-database-service.mjs`, and the backend exposes `GET /api/database/status` to show the current storage bridge, planned tables, migration phase, and missing production database capabilities. This is still not a real production database.

设置页连接后端后会显示数据库服务状态，包括当前内存/JSON 桥、计划表、迁移阶段、已具备能力和上线前缺失项，避免用户误以为正式数据库已经接入。

After the Settings page connects to the backend, it displays database service status, including memory/JSON bridge mode, planned tables, migration phase, current capabilities, and missing production requirements so users do not mistake the prototype for a connected production database.

审计服务现在通过 `backend/services/mock-audit-service.mjs` 统一报告，后端提供 `GET /api/audit/status` 查看样例保留策略、脱敏策略和缺失的生产审计能力。仓储写入审计事件时会对 token、密码、密钥、授权头和邮箱等敏感元数据做基础脱敏。

Audit readiness is now reported through `backend/services/mock-audit-service.mjs`, and the backend exposes `GET /api/audit/status` to show sample retention policy, redaction policy, and missing production audit capabilities. Repository audit writes now redact sensitive metadata such as tokens, passwords, secrets, authorization headers, and emails.

状态创建、JSON 序列化、文件读取和持久化现在集中在 `backend/repositories/mock-state-store.mjs`，后端路由只使用仓储/存储接口，不直接管理原始 JSON 文件结构。

State creation, JSON serialization, file loading, and persistence are now centralized in `backend/repositories/mock-state-store.mjs`; backend routes use repository/store interfaces instead of managing raw JSON file structure directly.

设置页的通知中心已经可以读取这些 mock outbox 记录、显示排队/已读状态，并把单条通知标记为已读；真实外部投递仍需后续接入。

The Settings notification center can now read these mock outbox records, show queued/read states, and mark one notification as read. Real external delivery still needs a later integration.

后端任务运行器现在位于 `backend/jobs/mock-reminder-job-runner.mjs`，状态可通过 `GET /api/job-services` 查看。任务入口为 `POST /api/jobs/run`，当前支持 `reminderEvaluation`；任务运行记录可通过 `GET /api/jobs` 查看。后续真实定时器会复用同一条任务执行路径。

The backend job runner now lives in `backend/jobs/mock-reminder-job-runner.mjs`, and its status can be read with `GET /api/job-services`. The job entrypoint is `POST /api/jobs/run`, currently supporting `reminderEvaluation`; job run records can be read with `GET /api/jobs`. A real scheduler will reuse this same execution path later.

后端调度服务现在位于 `backend/jobs/mock-scheduler-service.mjs`，状态可通过 `GET /api/scheduler/status` 查看；`POST /api/scheduler/run-due` 会手动模拟一次到期任务检查，并桥接到任务运行器。当前仍不是生产 cron 或队列 worker。

The backend scheduler service now lives in `backend/jobs/mock-scheduler-service.mjs`, and its status can be read with `GET /api/scheduler/status`; `POST /api/scheduler/run-due` manually simulates one due-job check and bridges to the job runner. This is still not a production cron or queue worker.

前端设置页也会显示任务运行器状态、手动执行模式、支持任务和调度提示，避免用户误以为当前已经部署真实后台定时任务。

The frontend Settings page also shows job-runner status, manual execution mode, supported jobs, and scheduler warnings, so users do not mistake the current prototype for a deployed production scheduler.

前端设置页现在也会显示调度服务状态、手动到期检查模式、时区、任务计划和 cron/队列边界提示。

The frontend Settings page now also shows scheduler service status, manual due-check mode, timezone, configured schedules, and cron/queue boundary warnings.

行情、新闻、搜索和提醒评估现在通过 `backend/providers/mock-provider.mjs` 读取。未来接入真实数据时，应新增 provider adapter，而不是在业务接口中直接读取供应商 SDK 或文件。

Markets, news, stock search, and reminder evaluation now read through `backend/providers/mock-provider.mjs`. Future real-data integration should add provider adapters instead of calling provider SDKs or files directly inside business endpoints.

后端接口契约见 `docs/technical/API_CONTRACT.md`，数据库草案见 `docs/technical/DATABASE_SCHEMA.md`。

## Legacy Xcode Wrapper / 历史 Xcode 封装

The current product direction is browser webpage / Web/PWA. The Xcode wrapper below is kept only as historical packaging reference and is not a current development or QA target unless native packaging is explicitly revived.

当前产品方向是浏览器网页 / Web/PWA。下面的 Xcode 工程仅作为历史封装参考保留；除非明确恢复原生封装，否则不作为当前开发或测试目标。

历史上已经包含可直接用 Xcode 打开的 iOS 工程：

```text
ios/FinanceAIAssistant.xcodeproj
```

打开后选择 iPhone 模拟器，点击 Run 可运行历史原型。这个版本用 SwiftUI + WKWebView 加载本地 Web/PWA 文件，不需要联网下载依赖。

The project now includes an iOS project that opens directly in Xcode:

```text
ios/FinanceAIAssistant.xcodeproj
```

Open it, choose an iPhone simulator, and click Run to run the legacy prototype. This version uses SwiftUI + WKWebView to load the local Web/PWA files, with no dependency download required.

## Important / 重要提示

所有概率和分析都是模型参考，不构成投资建议、买卖推荐或收益承诺。

All probabilities and analysis are model references only, not investment advice, trading recommendations, or return guarantees.
