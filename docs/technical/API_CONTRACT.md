# API Contract / 后端 API 契约

## Purpose / 目的
This document defines the first backend contract for the AI financial intelligence webpage/PWA. The current implementation starts with a mock Node backend so the frontend can integrate against stable shapes before real data providers, authentication, databases, and AI services are connected.

本文定义 AI 财经情报网页 / PWA 的第一版后端接口契约。当前先使用 mock Node 后端，保证前端可以先对稳定数据结构开发，后续再替换真实数据源、认证、数据库和 AI 服务。

## Common Rules / 通用规则
- All investment outputs must be labeled as model-reference analysis, not investment advice.
- API responses use JSON.
- Errors return a stable shape: `{ "error": { "code": "...", "message": "..." } }`.
- Authenticated endpoints will use `Authorization: Bearer <token>` after real auth is added.
- Timestamps should be ISO 8601 strings.
- Auth must sit behind a service adapter. Public API handlers should consume auth service methods instead of directly comparing tokens or embedding provider-specific login logic in routes.
- `GET /api/auth/status` exposes the active auth service mode, supported methods, session mode, and disclaimer so the frontend can label demo or production account behavior accurately.
- The current browser/local webpage starts in local sample-data mode and can optionally test the mock backend at `http://localhost:4180/health`. If the backend is unavailable, the frontend must fall back to local sample data instead of blocking the webpage.
- The frontend market-news flow now consumes `GET /api/news?market=...` when backend mode is connected. API-provided display strings must be escaped before rendering.
- The frontend stock-search flow now consumes `GET /api/stocks/search?q=...` when backend mode is connected. Empty results must preserve the current selected stock instead of falling back to a default stock.
- The frontend AI-analysis flow now consumes `GET /api/analysis?symbol=...&riskProfile=...` when backend mode is connected. API-provided reasons must be escaped before rendering, and all output must keep model-reference/non-advice wording.
- AI-analysis responses can include `history` and `historySource` so the frontend can render a trend chart and data-source note without treating sample values as real-time prices.
- AI-analysis responses can include `factorBreakdown`, `inputCoverage`, `confidenceScore`, `analysisService`, and `warnings` so the frontend and future audit layer can explain which sample inputs drove the reference output.
- AI services must sit behind service adapters. Public API handlers should consume AI service methods instead of directly embedding model/vendor logic in routes.
- `GET /api/ai-services` exposes the active AI service mode, model version, capabilities, and disclaimer so the frontend can label sample or live model output accurately.
- Authenticated users can save and read model-reference analysis history through `POST/GET /api/analysis/history`. History is for review only and must not be presented as investment advice.
- The frontend watchlist flow now consumes `GET/POST/DELETE /api/watchlist` when backend mode and login are active. Backend watchlists must be scoped by authenticated user; failed sync must preserve local watchlist behavior.
- The frontend portfolio flow now consumes `GET/POST /api/portfolio` when backend mode and login are active. Backend portfolio records must be scoped by authenticated user; `POST` upserts by user and stock code instead of appending duplicate positions. Failed sync must preserve local portfolio data and clearly show that backend sync failed.
- The frontend preference flow now consumes `GET/POST /api/preferences` when backend mode and demo login are active. Failed sync must preserve local risk profile and notification preferences.
- The frontend reminder-rule flow now consumes `GET/POST/DELETE /api/reminders` when backend mode and demo login are active. Failed sync must preserve local reminder rules and clearly show the fallback.
- Reminder rules can be evaluated by `POST /api/reminders/evaluate` in the mock backend. This simulates scheduled rule processing before production notification jobs are added.
- Notification delivery must sit behind a service adapter. Public API handlers should consume notification service methods instead of directly writing provider-specific push/email/WeChat delivery logic in routes.
- `GET /api/notification-services` exposes the active delivery service mode, supported channels, delivery mode, capabilities, and disclaimer so the frontend can label outbox-only, retry, and real-delivery behavior accurately.
- Triggered reminder rules create mock notification outbox records through the notification service. These records include channel-level `deliveryStatus`, attempt counts, attempt history, retry metadata, and can be read through `GET /api/notifications`, marked read with `POST /api/notifications/:id/read`, or retried with `POST /api/notifications/:id/retry`; real push/email/WeChat delivery is still future work.
- Backend jobs must sit behind job-runner modules. Public API handlers should consume job-runner methods instead of embedding scheduled-job execution logic in routes.
- `GET /api/job-services` exposes the active job runner mode, execution mode, supported jobs, capabilities, and disclaimer so the frontend can label manual mock jobs separately from future production schedulers.
- Backend jobs can be run through `POST /api/jobs/run`; current supported job type is `reminderEvaluation`. Job run records can be read through `GET /api/jobs`.
- Scheduled job checks must sit behind scheduler service modules. Public API handlers should consume scheduler methods instead of embedding cron/queue execution logic in routes.
- `GET /api/scheduler/status` exposes the active scheduler service, configured schedules, execution mode, capabilities, timezone, and disclaimer.
- `POST /api/scheduler/run-due` manually simulates a due-job check and bridges schedules to the job runner. This is not a production cron/queue worker.
- Data providers must sit behind provider adapters. Public API handlers should consume provider methods instead of directly importing raw provider SDKs, files, or scraper output.
- `GET /api/data-sources` exposes the active provider mode and capabilities so the frontend can label sample, delayed, or live data accurately.
- `GET /api/data-sources/integration-plan` exposes real data-source readiness without connecting to vendors. It reports required market/news/macro/public-statement providers, env vars, licensing checks, blockers, and next steps.
- `GET /api/data-sources/provider-registry` exposes candidate provider ids, selected provider env config, adapter module names, and missing env vars so real provider rollout can happen behind the provider boundary instead of route handlers.
- `GET /api/data-sources/vendor-readiness` exposes the vendor-selection and licensing checklist, including contact order, required capabilities, licensing gates, cost drivers, and next actions. It must not imply a vendor is signed, paid, or connected.
- `GET /api/data-sources/vendor-contract-handoff` exposes the no-signing vendor contract/licensing handoff package. It must not imply any provider agreement is signed, paid, approved, or runtime-enabled.
- `GET /api/data-sources/provider-secret-quota-runbook` exposes the no-secret-use provider credential, quota, cost, fallback, and audit runbook. It must not read secrets, call provider networks, or enable live data.
- `GET /api/data-sources/provider-setup-guide` exposes the no-secret provider setup guide for real quote/news/macro/public-statement provider env vars, smoke order, and live-runtime gates.
- `GET /api/data-sources/market-data-vendor-checklist` exposes the market-data provider acceptance checklist, including quote/history/calendar/delay-label fields, provider questions, licensing gates, cache/rate-limit/audit checks, and next actions. It must not imply live or delayed market data is connected.
- `GET /api/data-sources/news-filings-vendor-checklist` exposes the news/filings provider acceptance checklist, including headline-summary, short-excerpt, source-link, retention, attribution, and paywall-boundary checks. It must not imply real news, official filings, or public-statement monitoring is connected.
- `GET /api/data-sources/macro-data-vendor-checklist` exposes the macro-data provider acceptance checklist, including rates, FX, inflation, policy events, revision policy, asOf labels, timezone normalization, and audit checks. It must not imply real official macro data is connected.
- `GET /api/data-sources/public-statements-vendor-checklist` exposes the public-statements provider acceptance checklist, including verified identity, source URLs, speaker roles, platform terms, short-excerpt boundaries, manual review queues, and audit checks. It must not imply real social monitoring or public-statement provider access is connected.
- `GET /api/data-sources/market-data-adapter` exposes the first market-data adapter skeleton status. It defines quote, history, and trading-calendar contracts while explicitly keeping vendor network calls and trading actions disabled.
- `GET /api/market-data/quote`, `GET /api/market-data/history`, and `GET /api/market-data/trading-calendar` expose no-network fixture reads for API and UI integration tests. These endpoints must label responses as `mode: "fixture"` and must not be described as live, delayed, or exchange-authorized data.
- `GET /api/data-sources/news-filings-adapter` exposes the news, filings, and public-statements adapter skeleton status, including fixture processing metadata for deduplication, source credibility, explainable importance scoring, persistence state, public-statement identity verification, and manual-review gates. `GET /api/news/intelligence`, `GET /api/news/filings`, and `GET /api/public-statements` expose no-network fixture reads for important news, company filings, and verified-statement integration tests.
- User-owned data must sit behind repository adapters. Public API handlers should consume repository methods instead of directly depending on raw JSON-file structures or future database driver calls.
- Auth-owned sample data, including mock email users and bearer sessions, must also sit behind repository adapters. Auth services may hash passwords and tokens, but should not directly read or write raw state or future database driver structures.
- `GET /api/repository/status` exposes the active repository persistence mode, capabilities, limits, and disclaimer so the frontend can label memory-only, JSON bridge, or future production database behavior accurately.
- Database readiness must sit behind database service modules. Public API handlers should consume database service methods instead of embedding database driver, migration, or storage-health logic in routes.
- Repository implementations must satisfy `backend/repositories/repository-contract.mjs` before production database replacement. The contract defines required repository methods, data-domain-to-table mappings, and migration checks.
- `GET /api/database/status` exposes the active storage bridge, planned tables, repository contract status, migration checks, production database adapter skeleton health, missing production capabilities, and disclaimer before the real database is connected.
- `GET /api/database/migration-dry-run` exposes a no-write migration preview with planned table order, blockers, warnings, and rollback notes. It must not connect to or mutate a database.
- `GET /api/database/migration-sql-draft` exposes reviewable PostgreSQL migration SQL generated from the dry-run table order. It must not execute SQL or open a database connection.
- `GET /api/database/migration-package` exposes a versioned, review-only migration package with manifest checksum, preflight checks, release gates, and `canExecute: false` until a real driver, migration tool, backups, rollback drill, and human approval exist.
- `GET /api/database/read-only-health` exposes a safe production database connection-readiness check. It reports config, driver availability, read-only guardrails, blockers, and next steps; by default it must not open a network connection or execute SQL.
- Audit logging must sit behind audit service/repository helpers. Audit metadata must redact tokens, passwords, secrets, authorization headers, and mask email fields before persistence.
- `GET /api/audit/status` exposes the active audit service mode, retention policy, redaction policy, missing production audit capabilities, and disclaimer before a production audit system is connected.
- The mock backend can optionally persist user data and audit events to a JSON file with `FINANCE_AI_DATA_FILE=...`. This is a development bridge, not the production database.
- Mock state creation, JSON serialization, file load, and persistence must stay behind `backend/repositories/mock-state-store.mjs`; public API handlers should not own raw JSON persistence details.

## Public Endpoints / 公共接口

### `GET /health`
Returns backend status.

`GET /api/health` is a compatibility alias with the same response shape for API-prefixed monitoring and smoke tests.

Response:
```json
{
  "status": "ok",
  "service": "finance-ai-assistant-backend",
  "version": "0.1.0"
}
```

### `GET /api/markets`
Returns supported markets.

Response:
```json
{
  "markets": [
    { "id": "a", "name": "A 股" },
    { "id": "hk", "name": "港股" },
    { "id": "us", "name": "美股" }
  ]
}
```

### `GET /api/project/progress`
Returns the current project-management progress snapshot for the Settings progress panel. Readiness percentages are computed from backend subsystem status checks where available. This is not investment advice, a production-readiness guarantee, or a public-launch commitment.

Response:
```json
{
  "progress": {
    "id": "finance-ai-project-progress",
    "updatedAt": "2026-06-07",
    "source": "mock-backend-computed-readiness",
    "localDemoPercent": 100,
    "publicLaunchPercent": 84.9,
    "completed": ["项目进度已从后端接口提供，前端连接后端时同步显示", "每日开发日志已延续到 2026-06-07"],
    "blockers": ["真实行情/新闻/公告/宏观数据源与授权"],
    "readiness": [
      {
        "id": "data-sources",
        "label": "真实数据源",
        "percent": 100,
        "status": "blocked",
        "blocker": "真实行情、新闻、公告和宏观数据授权/provider 尚未完整配置。",
        "evidence": {
          "passedChecks": 30,
          "totalChecks": 32,
          "blockedChecks": 2,
          "sourceEndpoints": [
            "/api/data-sources",
            "/api/data-sources/vendor-readiness",
            "/api/data-sources/vendor-contract-handoff",
            "/api/data-sources/provider-secret-quota-runbook",
            "/api/data-sources/provider-setup-guide",
            "/api/data-sources/market-data-vendor-checklist",
            "/api/data-sources/news-filings-vendor-checklist",
            "/api/data-sources/macro-data-vendor-checklist",
            "/api/data-sources/public-statements-vendor-checklist",
            "/api/data-sources/integration-plan",
            "/api/data-sources/provider-registry",
            "/api/data-sources/market-data-adapter",
            "/api/market-data/quote",
            "/api/data-sources/macro-data-adapter",
            "/api/data-sources/news-filings-adapter",
            "/api/news/intelligence",
            "/api/news/filings"
          ]
        }
      },
      {
        "id": "ai-analysis",
        "label": "真实 AI 分析",
        "percent": 75,
        "status": "blocked",
        "blocker": "真实模型 provider、引用证据、成本限流、输出校验或人工复核仍未通过。",
        "evidence": {
          "passedChecks": 17,
          "totalChecks": 19,
          "blockedChecks": 2,
          "sourceEndpoints": ["/api/ai-services", "/api/ai-services/provider-adapter", "/api/ai-services/model-provider-setup-guide"]
        }
      },
      {
        "id": "production-database",
        "label": "生产数据库",
        "percent": 64,
        "status": "blocked",
        "blocker": "仍需真实 PostgreSQL 连接、运行时切换和真实恢复演练执行。",
        "evidence": {
          "passedChecks": 25,
          "totalChecks": 27,
          "blockedChecks": 2,
          "sourceEndpoints": [
            "/api/database/status",
            "/api/repository/status",
            "/api/database/production-repository-adapter",
            "/api/database/production-repository-smoke-test",
            "/api/database/production-repository-cutover-plan",
            "/api/database/read-only-health",
            "/api/database/driver-setup-plan"
          ]
        }
      },
      {
        "id": "auth-security",
        "label": "生产认证",
        "percent": 100,
        "status": "blocked",
        "blocker": "仍需生产 IdP、真实 MFA/邮箱验证执行和隐私法务复核落地。",
        "evidence": {
          "passedChecks": 16,
          "totalChecks": 17,
          "blockedChecks": 1,
          "sourceEndpoints": ["/api/auth/status", "/api/auth/provider-adapter"]
        }
      },
      {
        "id": "compliance-release",
        "label": "合规发布",
        "percent": 77,
        "status": "blocked",
        "blocker": "用户风险确认和披露版本记录尚未完成。",
        "evidence": {
          "passedChecks": 15,
          "totalChecks": 18,
          "blockedChecks": 3,
          "sourceEndpoints": ["/api/compliance/status"]
        }
      },
      {
        "id": "deployment-ops",
        "label": "部署运维",
        "percent": 64,
        "status": "blocked",
        "blocker": "仍需真实外部投递 provider、后台 worker、托管环境和监控告警落地；当前只完成 dry-run 预检和运维证据结构。",
        "evidence": {
          "passedChecks": 16,
          "totalChecks": 18,
          "blockedChecks": 2,
          "sourceEndpoints": ["/api/job-services", "/api/scheduler/status", "/api/notification-services", "/api/audit/status"]
        }
      }
    ],
    "readinessEvidence": {
      "mode": "computed-from-backend-status",
      "readinessAverage": 77.8,
      "launchFoundationCredit": 4.9,
      "formula": "publicLaunchPercent = average(readiness.percent) + launchFoundationCredit"
    },
    "disclaimer": "该进度是项目管理参考，不代表投资服务、真实生产可用性或公开上线承诺。"
  }
}
```

### `GET /api/data-sources`
Returns active data-source provider status and capabilities. The provider still falls back to mock/sample data by default, but the provider registry now includes `alpha-vantage` as a market-data candidate, `alpha-vantage-news` as a market-news candidate, and `sec-company-submissions` as a US filings candidate. The market-data adapter exposes an `alphaVantageConnector` for `GLOBAL_QUOTE`, A/HK/US symbol mapping, required API key, explicit network flag, an `alphaVantageSmokeTestPlan` for demo-key field validation, and an `alphaVantageCredentialPreflight` that reports only `missing`, `demo-key-limited`, or `configured-redacted` key state. The news/filings adapter exposes an `alphaVantageNewsConnector` for `NEWS_SENTIMENT` plus a `secFilingsConnector` for SEC EDGAR company submissions. SEC filings require no API key, but require explicit `FINANCE_AI_FILINGS_PROVIDER=sec-company-submissions`, `FINANCE_AI_FILINGS_ALLOW_NETWORK=true`, and a configured `FINANCE_AI_SEC_USER_AGENT`; status output must not expose raw SEC responses or User-Agent details.

### `GET /api/market-data/quote`
Returns fixture quote data by default. When the backend is started with `FINANCE_AI_MARKET_DATA_PROVIDER=alpha-vantage`, `FINANCE_AI_MARKET_DATA_API_KEY`, and `FINANCE_AI_MARKET_DATA_ALLOW_NETWORK=true`, this endpoint can request Alpha Vantage `GLOBAL_QUOTE`, normalize the response into the existing quote shape, redact the provider URL in audit-facing output, and fall back to local fixture data if the provider request fails. The response must still show source, `asOf`, and delay/entitlement labels; it is not a trading signal or investment advice.

### `GET /api/ai-services/provider-adapter`
Returns the AI provider adapter readiness gates. Current runtime stays `inactive`; it exposes `modelEvaluationEvidencePackage` with `dry-run-no-model-certification` and `modelReleaseRollbackEvidencePackage` with `dry-run-no-model-release`. These packages count as defined evidence for launch readiness but do not certify a model, publish user-visible advice, promote a model version, or enable live runtime.

### `GET /api/notification-services/provider-adapter`
Returns notification provider readiness gates. Current runtime stays `inactive`; it exposes `observabilityEvidencePackage` with `dry-run-no-observability-cutover`. This counts monitoring evidence for launch readiness but does not send external notifications, external alerts, or enable external delivery runtime.

### `GET /api/scheduler/provider-adapter`
Returns scheduler provider readiness gates. Current runtime stays `inactive`; it exposes `incidentResponseDrillPackage` with `dry-run-no-worker-incident-cutover`. This counts incident-response evidence for launch readiness but does not start background workers or execute production incident drills.

Response:
```json
{
  "activeProvider": {
    "id": "mock",
    "name": "Mock Sample Provider",
    "mode": "sample",
    "status": "connected",
    "coverage": ["a", "hk", "us"],
    "capabilities": [
      "markets",
      "stockSearch",
      "marketNews",
      "analysisInputs",
      "priceHistory",
      "reminderEvaluation",
      "integrationPlan",
      "providerRegistry",
      "marketDataAdapter"
    ],
    "integrationPlan": {
      "id": "real-data-source-integration-plan",
      "status": "blocked",
      "mode": "planning",
      "targetMarkets": ["a", "hk", "us"],
      "configuredRequiredCount": 0,
      "requiredSourceCount": 3,
      "plannedSources": [
        {
          "id": "marketData",
          "label": "实时/延迟行情",
          "configured": false,
          "required": true,
          "envVars": [
            { "name": "FINANCE_AI_MARKET_DATA_PROVIDER", "configured": false },
            { "name": "FINANCE_AI_MARKET_DATA_API_KEY", "configured": false, "secret": true }
          ]
        }
      ],
      "complianceChecks": [
        { "id": "licenseReview", "label": "数据授权审查", "status": "blocked" }
      ],
      "blockedReasons": ["实时行情、新闻/公告或宏观数据 provider 尚未完整配置。"],
      "disclaimer": "当前为真实数据源接入计划，不代表实时行情、真实新闻、社交媒体监控或投资建议已经接入。"
    },
    "providerRegistry": {
      "id": "real-data-provider-registry",
      "status": "blocked",
      "activeRuntimeProvider": "mock",
      "readyRequiredCount": 0,
      "requiredProviderCount": 3,
      "selectedProviders": [
        {
          "groupId": "marketData",
          "label": "实时/延迟行情",
          "selectedProvider": "",
          "status": "missing-config",
          "missingEnvVars": [
            "FINANCE_AI_MARKET_DATA_PROVIDER",
            "FINANCE_AI_MARKET_DATA_API_KEY"
          ]
        }
      ],
      "candidateProviders": [
        {
          "id": "licensed-market-data",
          "groupId": "marketData",
          "adapterModule": "backend/providers/market-data-provider.mjs"
        }
      ]
    },
    "marketDataAdapter": {
      "id": "market-data-provider-adapter",
      "status": "blocked",
      "runtimeMode": "inactive",
      "selectedProvider": "",
      "canFetchQuotes": false,
      "missingEnvVars": [
        "FINANCE_AI_MARKET_DATA_PROVIDER",
        "FINANCE_AI_MARKET_DATA_API_KEY"
      ]
    },
    "disclaimer": "当前为样例数据源，用于接口联调和网页原型运行，不代表实时行情或真实新闻。"
  },
  "providers": [
    {
      "id": "mock",
      "name": "Mock Sample Provider",
      "mode": "sample",
      "status": "connected"
    }
  ]
}
```

### `GET /api/data-sources/market-data-adapter`
Returns the market-data adapter skeleton status. It is a contract/readiness endpoint only and must not fetch live quotes until provider licensing, credentials, rate limits, source attribution, and adapter implementation are complete.

Response:
```json
{
  "marketDataAdapter": {
    "id": "market-data-provider-adapter",
    "name": "Market Data Provider Adapter Skeleton",
    "status": "blocked",
    "runtimeMode": "inactive",
    "requestedMode": "delayed",
    "selectedProvider": "",
    "configured": false,
    "supported": true,
    "canFetchQuotes": false,
    "canReadFixtures": true,
    "fixtureReadModel": {
      "status": "available",
      "quoteCount": 3,
      "markets": ["a", "hk", "us"],
      "source": "local-fixture-market-data"
    },
    "endpointContracts": [
      { "id": "quote", "method": "getQuote", "status": "planned", "fixtureStatus": "available" },
      { "id": "history", "method": "getPriceHistory", "status": "planned", "fixtureStatus": "available" },
      { "id": "tradingCalendar", "method": "getTradingCalendar", "status": "planned", "fixtureStatus": "available" }
    ],
    "safety": {
      "noVendorNetworkCalls": true,
      "noTradingActions": true,
      "requiresAttribution": true,
      "requiresLicenseReview": true,
      "mockFallbackActive": true
    },
    "blockedReasons": ["行情 provider id 或 API key 尚未配置。"],
    "disclaimer": "当前为行情 provider adapter 骨架，不会请求真实行情，也不代表实时或延迟行情已经接入。"
  }
}
```

### `GET /api/market-data/quote`
Returns a local fixture quote for backend/UI integration. It does not call a vendor provider.

Query:
- `symbol` or `code`: stock code, for example `0700`.
- `market`: optional market id: `a`, `hk`, or `us`.

Response:
```json
{
  "status": "ok",
  "mode": "fixture",
  "quote": {
    "market": "hk",
    "code": "0700",
    "name": "腾讯控股",
    "lastPrice": 386,
    "currency": "HKD",
    "asOf": "2026-06-01T00:00:00.000Z",
    "source": {
      "id": "local-fixture-market-data",
      "label": "Mock 行情样例",
      "licenseTag": "sample-fixture-not-real-time",
      "attributionRequired": true
    },
    "dataDelay": "sample-not-real-time"
  },
  "disclaimer": "当前为本地样例行情读取，不代表实时、延迟或交易所授权行情，不可作为买卖依据。"
}
```

### `GET /api/market-data/history`
Returns local fixture price-history points for backend/UI integration.

Query:
- `symbol` or `code`: stock code.
- `market`: optional market id.
- `range`: optional display range, default `6m`.
- `interval`: optional interval, default `1mo`.

### `GET /api/market-data/trading-calendar`
Returns local weekday fixture sessions for a market. The response is deterministic and capped to a short fixture range; it is not an exchange holiday calendar.

Query:
- `market`: optional market id, default `a`.
- `from`: optional `YYYY-MM-DD`.
- `to`: optional `YYYY-MM-DD`.

### `GET /api/data-sources/provider-registry`
Returns the provider registry used to plan real adapter selection. This endpoint is metadata-only; the active runtime provider remains `mock` until selected providers, credentials, licensing, attribution, and adapter implementation are complete.

Response:
```json
{
  "providerRegistry": {
    "id": "real-data-provider-registry",
    "status": "blocked",
    "activeRuntimeProvider": "mock",
    "readyRequiredCount": 0,
    "requiredProviderCount": 3,
    "candidateProviders": [
      {
        "id": "licensed-market-data",
        "groupId": "marketData",
        "label": "授权行情 Provider",
        "mode": "delayed-or-live",
        "adapterModule": "backend/providers/market-data-provider.mjs"
      },
      {
        "id": "alpha-vantage",
        "groupId": "marketData",
        "label": "Alpha Vantage 行情 Provider",
        "mode": "delayed",
        "adapterModule": "backend/providers/market-data-provider.mjs"
      }
    ],
    "selectedProviders": [
      {
        "groupId": "marketData",
        "label": "实时/延迟行情",
        "required": true,
        "selectedProvider": "",
        "providerEnv": "FINANCE_AI_MARKET_DATA_PROVIDER",
        "credentialEnv": "FINANCE_AI_MARKET_DATA_API_KEY",
        "status": "missing-config",
        "missingEnvVars": [
          "FINANCE_AI_MARKET_DATA_PROVIDER",
          "FINANCE_AI_MARKET_DATA_API_KEY"
        ]
      }
    ],
    "blockedReasons": ["实时/延迟行情 未完成可用 provider 配置。"]
  }
}
```

### `GET /api/data-sources/vendor-readiness`
Returns the real data-source vendor selection and licensing checklist. This is a planning/readiness endpoint only and must not open vendor connections, recommend a paid provider as final, or imply that any data contract has been signed.

Response:
```json
{
  "vendorReadinessChecklist": {
    "id": "real-data-vendor-readiness-checklist",
    "status": "blocked",
    "mode": "planning",
    "preferredContactOrder": ["marketData", "marketNews", "macroData", "publicStatements"],
    "targetMarkets": ["a", "hk", "us"],
    "passedCount": 3,
    "totalCount": 8,
    "blockedCount": 3,
    "pendingCount": 2,
    "groups": [
      {
        "id": "marketData",
        "label": "行情数据",
        "candidateProviderIds": ["licensed-market-data"],
        "requiredCapabilities": ["quotes", "priceHistory", "tradingCalendar", "delayLabel"],
        "requiredLicensing": ["exchangeDisplayRights", "cachePermission", "redistributionBoundary"],
        "costDrivers": ["symbols", "requestVolume", "realTimeVsDelayed", "redistributionRights"],
        "preferredSequence": 1
      }
    ],
    "checklistItems": [
      { "id": "mvpMarketCoverage", "label": "MVP 市场覆盖", "status": "pass" },
      { "id": "licenseReview", "label": "授权审查", "status": "blocked" }
    ],
    "nextActions": ["先联系行情 provider，确认 A/HK/US 延迟数据、缓存和展示条款。"],
    "disclaimer": "该清单用于供应商筛选和授权准备，不代表任何 provider 已签约、已付款、已接入或可用于生产投资服务。"
  }
}
```

### `GET /api/data-sources/vendor-contract-handoff`
Returns the data-source vendor contract, licensing, cost, retention, and review handoff package. This is a dry-run evidence endpoint only and must not sign a vendor agreement, expose unredacted contracts, store payment details, or enable real provider runtime.

Response:
```json
{
  "vendorContractHandoffPackage": {
    "id": "real-data-vendor-contract-handoff-package",
    "status": "defined",
    "mode": "dry-run-no-contract-signing",
    "canSignVendorContract": false,
    "canEnableProviderRuntime": false,
    "requiredManualApproval": true,
    "requiredArtifacts": [
      "exchange-display-rights",
      "cache-redistribution-terms",
      "headline-summary-excerpt-rights",
      "official-macro-source-terms"
    ],
    "forbiddenArtifacts": ["providerApiKey", "unredactedContract", "paymentCard"],
    "reviewRoles": ["product-owner", "data-source-reviewer", "compliance-officer"],
    "disclaimer": "该交接包只定义供应商合同、授权和成本审查所需材料，不代表任何真实数据 provider 已签约、付款、获批或可用于生产。"
  }
}
```

### `GET /api/data-sources/provider-secret-quota-runbook`
Returns the data-provider secret, quota, cost, fallback, and audit runbook. This is a dry-run evidence endpoint only and must not read provider secrets, call vendor networks, or enable live/delayed data.

Response:
```json
{
  "providerSecretQuotaRunbook": {
    "id": "real-data-provider-secret-quota-runbook",
    "status": "defined",
    "mode": "dry-run-no-secret-use",
    "canReadProviderSecrets": false,
    "canCallProviderNetwork": false,
    "requiredManualApproval": true,
    "secretControls": {
      "requiredVaultFields": ["providerId", "credentialRef", "rotationOwner"],
      "forbiddenRuntimeFields": ["apiKey", "clientSecret", "refreshToken"]
    },
    "quotaControls": {
      "requiredLimits": ["requestsPerMinute", "requestsPerDay", "monthlyCostLimit"],
      "fallbackMode": "mock-provider-and-stale-cache",
      "blocksUnboundedRequests": true
    },
    "auditControls": {
      "redactsSecrets": true,
      "recordsProviderRequestId": true,
      "hashChainRequired": true
    }
  }
}
```

### `GET /api/data-sources/provider-setup-guide`
Returns the real-provider setup guide for quote, news sentiment, macro data, and public statements. This is a no-secret configuration guide only and must not read/write API keys, write `.env` files, or enable live runtime.

Response:
```json
{
  "providerSetupGuide": {
    "id": "real-provider-setup-guide",
    "status": "ready-for-user-configuration",
    "mode": "no-secret-provider-setup-guide",
    "activeRuntimeProvider": "mock",
    "setupGroups": [
      {
        "id": "marketData",
        "label": "行情 Provider",
        "requiredEnvVars": [
          "FINANCE_AI_MARKET_DATA_PROVIDER",
          "FINANCE_AI_MARKET_DATA_API_KEY",
          "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK"
        ],
        "smokeEndpoint": "GET /api/market-data/quote?market=us&code=IBM",
        "forbiddenFields": ["apiKey", "providerSecret", "providerResponseRaw"]
      }
    ],
    "smokeOrder": ["marketDataQuote", "newsSentiment", "macroContext", "publicStatements"],
    "forbiddenAuditFields": ["apiKey", "providerSecret", "providerResponseRaw"],
    "canReadProviderSecrets": false,
    "canWriteEnvFile": false,
    "canEnableLiveRuntime": false
  }
}
```

### `GET /api/data-sources/market-data-vendor-checklist`
Returns the market-data provider acceptance checklist. This is a planning/readiness endpoint only and must not open vendor connections, imply live/delayed market data is active, or describe sample fixture data as licensed exchange data.

Response:
```json
{
  "marketDataVendorChecklist": {
    "id": "market-data-vendor-acceptance-checklist",
    "status": "blocked",
    "mode": "planning",
    "targetMarkets": ["a", "hk", "us"],
    "providerCandidateId": "licensed-market-data",
    "passedCount": 3,
    "totalCount": 9,
    "blockedCount": 3,
    "pendingCount": 3,
    "acceptanceAreas": [
      {
        "id": "quoteContract",
        "label": "报价接口",
        "requiredFields": ["symbol", "lastPrice", "changePercent", "currency", "asOf", "delayMinutes", "source"],
        "status": "defined"
      },
      {
        "id": "delayLabel",
        "label": "延迟标签",
        "requiredFields": ["realTimeOrDelayed", "delayMinutes", "displayNearPrice", "displayNearChart"],
        "status": "defined"
      }
    ],
    "checklistItems": [
      { "id": "providerCandidateKnown", "label": "候选 provider 已知", "status": "pass" },
      { "id": "exchangeDisplayRights", "label": "交易所展示授权", "status": "blocked" }
    ],
    "requiredQuestions": ["A 股、港股、美股分别支持实时还是延迟报价，延迟分钟数是多少？"],
    "nextActions": ["优先拿到 A/HK/US 报价和历史走势的展示授权样例条款。"],
    "disclaimer": "该行情验收清单仅用于供应商沟通和接入前评审，不代表真实行情 provider 已签约、已付款、已接入或可用于投资服务。"
  }
}
```

### `GET /api/data-sources/news-filings-vendor-checklist`
Returns the news/filings provider acceptance checklist. This is a planning/readiness endpoint only and must not open vendor connections, imply real news/filings/public statements are active, or describe sample fixture data as licensed content.

Response:
```json
{
  "newsFilingsVendorChecklist": {
    "id": "news-filings-vendor-acceptance-checklist",
    "status": "blocked",
    "mode": "planning",
    "targetMarkets": ["a", "hk", "us"],
    "providerCandidateId": "licensed-news-filings",
    "passedCount": 3,
    "totalCount": 9,
    "blockedCount": 4,
    "pendingCount": 2,
    "acceptanceAreas": [
      {
        "id": "headlineSummary",
        "label": "标题摘要",
        "requiredFields": ["title", "summary", "source.label", "publishedAt", "licenseTag"],
        "status": "defined"
      },
      {
        "id": "paywallBoundary",
        "label": "付费墙边界",
        "requiredFields": ["paywallStatus", "ingestionAllowed", "excerptAllowed", "linkOnlyFallback"],
        "status": "defined"
      }
    ],
    "checklistItems": [
      { "id": "providerCandidateKnown", "label": "候选 provider 已知", "status": "pass" },
      { "id": "headlineRights", "label": "标题摘要授权", "status": "blocked" }
    ],
    "requiredQuestions": ["标题、摘要、短摘录分别允许展示多少字符，是否必须跳转原文？"],
    "nextActions": ["优先确认标题摘要、短摘录、原文链接和保留天数授权。"],
    "disclaimer": "该新闻/公告验收清单仅用于供应商沟通和接入前评审，不代表真实新闻、公告或公开言论 provider 已签约、已付款、已接入或可用于投资服务。"
  }
}
```

### `GET /api/data-sources/macro-data-vendor-checklist`
Returns the macro-data provider acceptance checklist. This is a planning/readiness endpoint only and must not open vendor connections, imply real official macro data is active, or describe sample fixture data as current central-bank/statistics/policy-calendar data.

Response:
```json
{
  "macroDataVendorChecklist": {
    "id": "macro-data-vendor-acceptance-checklist",
    "status": "blocked",
    "mode": "planning",
    "targetMarkets": ["a", "hk", "us"],
    "providerCandidateId": "official-macro-data",
    "passedCount": 3,
    "totalCount": 10,
    "blockedCount": 3,
    "pendingCount": 4,
    "acceptanceAreas": [
      {
        "id": "rateIndicators",
        "label": "利率指标",
        "requiredFields": ["indicatorId", "value", "unit", "region", "asOf", "source.label"],
        "status": "defined"
      },
      {
        "id": "revisionPolicy",
        "label": "修订规则",
        "requiredFields": ["revisionId", "previousValue", "revisedValue", "revisionPublishedAt", "sourceUrl"],
        "status": "defined"
      }
    ],
    "checklistItems": [
      { "id": "providerCandidateKnown", "label": "候选 provider 已知", "status": "pass" },
      { "id": "asOfLabels", "label": "asOf 标签", "status": "blocked" }
    ],
    "requiredQuestions": ["每个指标的 asOf、publishedAt、revisionId 和来源链接字段是否稳定？"],
    "nextActions": ["优先确认利率、汇率、通胀和政策日历的官方来源条款。"],
    "disclaimer": "该宏观数据验收清单仅用于供应商沟通和接入前评审，不代表真实宏观 provider 已签约、已付款、已接入或可用于投资服务。"
  }
}
```

### `GET /api/data-sources/public-statements-vendor-checklist`
Returns the public-statements provider acceptance checklist. This is a planning/readiness endpoint only and must not open vendor connections, scrape social platforms, imply real CEO/government/regulator monitoring is active, or describe sample fixture records as verified public statements.

Response:
```json
{
  "publicStatementsVendorChecklist": {
    "id": "public-statements-vendor-acceptance-checklist",
    "status": "blocked",
    "mode": "planning",
    "targetMarkets": ["a", "hk", "us"],
    "providerCandidateId": "verified-public-statements",
    "passedCount": 3,
    "totalCount": 10,
    "blockedCount": 4,
    "pendingCount": 3,
    "acceptanceAreas": [
      {
        "id": "verifiedIdentity",
        "label": "身份验证",
        "requiredFields": ["speakerId", "speakerName", "speakerRole", "verificationStatus", "verifiedAt"],
        "status": "defined"
      },
      {
        "id": "manualReviewQueue",
        "label": "人工复核队列",
        "requiredFields": ["reviewStatus", "reviewReason", "priority", "reviewerRole", "slaHours"],
        "status": "defined"
      }
    ],
    "checklistItems": [
      { "id": "providerCandidateKnown", "label": "候选 provider 已知", "status": "pass" },
      { "id": "identityVerification", "label": "身份验证规则", "status": "blocked" }
    ],
    "requiredQuestions": ["CEO、公司账号、政府高层和监管账号分别使用哪些身份验证信号？"],
    "nextActions": ["优先确认已验证发言人身份、来源链接和平台条款边界。"],
    "disclaimer": "该公开言论验收清单仅用于供应商沟通和接入前评审，不代表真实公开言论 provider 已签约、已付款、已接入或可用于投资服务。"
  }
}
```

### `GET /api/data-sources/integration-plan`
Returns the real data-source integration plan. It is a planning/readiness endpoint only and must not open vendor connections or imply that live data is active.

Response:
```json
{
  "integrationPlan": {
    "id": "real-data-source-integration-plan",
    "status": "blocked",
    "mode": "planning",
    "targetMarkets": ["a", "hk", "us"],
    "configuredRequiredCount": 0,
    "requiredSourceCount": 3,
    "configuredOptionalCount": 0,
    "plannedSources": [
      {
        "id": "marketData",
        "label": "实时/延迟行情",
        "markets": ["a", "hk", "us"],
        "capabilities": ["quotes", "priceHistory", "tradingCalendar"],
        "required": true,
        "configured": false
      }
    ],
    "complianceChecks": [
      { "id": "licenseReview", "label": "数据授权审查", "status": "blocked" },
      { "id": "sourceAttribution", "label": "来源署名", "status": "blocked" }
    ],
    "blockedReasons": ["尚未确认数据源授权、展示许可、缓存许可和再分发边界。"],
    "nextSteps": ["选择并确认 A 股、港股、美股行情和新闻 provider 的授权条款。"]
  }
}
```

### `GET /api/ai-services`
Returns active AI-analysis service status and capabilities. The current service is mock/sample only.

Response:
```json
{
  "activeService": {
    "id": "mock-ai-analysis",
    "name": "Mock AI 分析服务",
    "mode": "sample",
    "status": "ready",
    "model": "rule-based-sample-v0",
    "capabilities": [
      "riskProfileAdjustment",
      "quantifiedProbability",
      "factorBreakdown",
      "complianceDisclaimer"
    ],
    "disclaimer": "当前为规则样例分析服务，用于验证 API 契约，不代表真实 AI 投资建议。"
  },
  "services": [
    {
      "id": "mock-ai-analysis",
      "name": "Mock AI 分析服务",
      "mode": "sample",
      "status": "ready",
      "model": "rule-based-sample-v0"
    }
  ]
}
```

### `GET /api/auth/status`
Returns active authentication service status and capabilities. The current service is mock/sample only.

Response:
```json
{
  "activeService": {
    "id": "mock-auth",
    "name": "Mock 认证服务",
    "mode": "sample",
    "status": "ready",
    "supportedMethods": ["demoToken", "emailPassword"],
    "sessionMode": "bearer-token-sample-email-password",
    "disclaimer": "当前为样例认证服务，支持 demo 与 mock 邮箱密码登录；密码会哈希保存，但仍不代表生产账号安全方案。"
  },
  "services": [
    {
      "id": "mock-auth",
      "name": "Mock 认证服务",
      "mode": "sample",
      "status": "ready"
    }
  ]
}
```

### `GET /api/notification-services`
Returns active notification delivery service status and capabilities. The current service is mock/sample and outbox-only.

Response:
```json
{
  "activeService": {
    "id": "mock-notification-delivery",
    "name": "Mock 通知投递服务",
    "mode": "sample",
    "status": "ready",
    "deliveryMode": "outbox-only",
    "supportedChannels": ["inApp", "email", "sms", "wechat", "telegram"],
    "capabilities": [
      "outboxQueue",
      "readReceipt",
      "multiChannelRules",
      "deliveryAttempts",
      "retryQueue",
      "channelDeliveryStatus"
    ],
    "channelLabels": {
      "inApp": "网页内提醒",
      "email": "邮件提醒",
      "sms": "短信提醒",
      "wechat": "微信提醒",
      "telegram": "Telegram 提醒"
    },
    "disclaimer": "当前为样例通知投递服务，只写入后端 outbox，不代表真实外部推送已送达。"
  },
  "services": [
    {
      "id": "mock-notification-delivery",
      "name": "Mock 通知投递服务",
      "mode": "sample",
      "status": "ready",
      "deliveryMode": "outbox-only"
    }
  ]
}
```

### `GET /api/repository/status`
Returns active user-data repository status and persistence limits. The current repository is mock/sample only.

Response:
```json
{
  "activeRepository": {
    "id": "mock-user-state-repository",
    "name": "Mock 用户数据仓储",
    "mode": "sample",
    "status": "ready",
    "persistenceMode": "memory-only",
    "persistencePath": "",
    "capabilities": [
      "watchlist",
      "preferences",
      "analysisHistory",
      "reminders",
      "portfolio",
      "notificationOutbox",
      "auditLog",
      "auditRedaction",
      "auditRetention",
      "jobRuns"
    ],
    "limits": {
      "analysisHistory": 500,
      "notificationOutbox": 500,
      "auditLogs": 500,
      "jobRuns": 200
    },
    "disclaimer": "当前为内存样例仓储，服务重启后数据会丢失，不代表生产数据库。"
  },
  "repositories": [
    {
      "id": "mock-user-state-repository",
      "name": "Mock 用户数据仓储",
      "mode": "sample",
      "status": "ready",
      "persistenceMode": "memory-only"
    }
  ]
}
```

### `GET /api/database/status`
Returns active database service status, planned tables, repository contract status, migration checks, production database adapter skeleton health, and production-readiness gaps. The current service is a planning/sample bridge only.

Response:
```json
{
  "activeService": {
    "id": "mock-database-service",
    "name": "Mock 数据库服务",
    "mode": "sample",
    "status": "planning",
    "activeStorage": "memory-only",
    "repositoryId": "mock-user-state-repository",
    "migrationPhase": "pre-production",
    "plannedTables": [
      "users",
      "auth_role_grants",
      "auth_role_events",
      "auth_sessions",
      "watchlist_items",
      "user_preferences",
      "portfolio_positions",
      "news_items",
      "analysis_results",
      "reminder_rules",
      "notification_outbox",
      "audit_events",
      "job_runs"
    ],
    "capabilities": [
      "schemaPlan",
      "repositoryBridge",
      "repositoryContract",
      "migrationChecks",
      "tableMappings",
      "productionAdapter",
      "adapterHealth",
      "migrationPlan",
      "migrationDryRun",
      "migrationSqlDraft",
      "migrationPackage",
      "readOnlyConnectionHealth",
      "jsonBridge",
      "productionGapReport"
    ],
    "repositoryContract": {
      "version": "2026-06-01.repository.v1",
      "status": "pass",
      "missingMethods": [],
      "tableMappings": [
        {
          "domain": "authRoleGrants",
          "table": "auth_role_grants",
          "methods": ["getAuthUser", "updateAuthUserRoles"]
        },
        {
          "domain": "authRoleEvents",
          "table": "auth_role_events",
          "methods": ["recordAudit", "listAuditEvents"]
        },
        {
          "domain": "authSessions",
          "table": "auth_sessions",
          "methods": ["saveAuthSession", "findAuthSessionByTokenHash", "listAuthSessions", "findAuthSession", "removeAuthSession", "removeAuthSessionForUser"]
        },
        {
          "domain": "notificationOutbox",
          "table": "notification_outbox",
          "methods": ["listNotifications", "findNotification", "saveNotification", "updateNotification", "markNotificationRead"]
        }
      ]
    },
    "migrationChecks": [
      {
        "id": "repositoryInterface",
        "label": "Repository interface",
        "status": "pass"
      },
      {
        "id": "tableMappings",
        "label": "Table mappings",
        "status": "pass"
      }
    ],
    "productionAdapter": {
      "id": "production-database-adapter",
      "name": "Production Database Adapter Skeleton",
      "mode": "planned",
      "status": "not_configured",
      "active": false,
      "provider": "postgres",
      "sslMode": "required",
      "connection": {
        "configured": false,
        "status": "missing-config",
        "message": "未配置 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL，继续使用 mock/JSON 存储桥。"
      },
      "migrationPlan": {
        "phase": "configuration-required",
        "mode": "manual",
        "steps": [
          { "id": "configureConnection", "status": "blocked" },
          { "id": "runSchemaMigrations", "status": "pending" },
          { "id": "verifyRepositoryContract", "status": "pass" }
        ]
      },
      "migrationDryRun": {
        "id": "production-db-migration-dry-run",
        "mode": "dry-run",
        "status": "blocked",
        "provider": "postgres",
        "tableOrder": ["users", "auth_role_grants", "auth_role_events", "auth_sessions", "user_preferences"],
        "tablePlan": [
          {
            "order": 1,
            "table": "users",
            "dependsOn": [],
            "domains": ["authUsers"],
            "action": "create-or-migrate",
            "status": "planned"
          }
        ],
        "steps": [
          { "id": "validateConnectionConfig", "status": "blocked" },
          { "id": "validateRepositoryContract", "status": "pass" },
          { "id": "resolveTableOrder", "status": "pass" },
          { "id": "previewSchemaMigrations", "status": "pending" }
        ],
        "blockedReasons": ["缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。"],
        "warnings": ["dry-run 只生成迁移顺序和检查结果，不会连接数据库，也不会执行 CREATE/ALTER/DROP。"],
        "rollbackPlan": ["迁移前保留 mock/JSON repository 作为回退路径。"]
      },
      "migrationSqlDraft": {
        "id": "production-db-sql-draft-001",
        "dialect": "postgresql",
        "status": "generated",
        "destructive": false,
        "reviewRequired": true,
        "statementCount": 22,
        "checksum": "fnv1a-...",
        "preview": [
          "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
          "CREATE TABLE IF NOT EXISTS users (...)"
        ],
        "warnings": ["SQL 草案仅供代码审查和迁移工具接入，不会自动执行。"]
      },
      "migrationPackage": {
        "id": "production-db-migration-package-001",
        "version": "2026.06.01.001_initial_schema",
        "status": "blocked",
        "canExecute": false,
        "executionMode": "review-only",
        "manifestChecksum": "fnv1a-...",
        "preflightChecks": [
          { "id": "connectionConfig", "status": "blocked" },
          { "id": "repositoryContract", "status": "pass" },
          { "id": "liveConnection", "status": "blocked" }
        ],
        "releaseGates": [
          "真实数据库连接已验证",
          "迁移工具已接入并记录版本",
          "SQL 草案已人工审查批准"
        ]
      },
      "readOnlyConnectionHealth": {
        "id": "production-db-readonly-health",
        "mode": "read-only-health",
        "status": "blocked",
        "driver": {
          "package": "pg",
          "available": false
        },
        "safety": {
          "readOnlyOnly": true,
          "canWrite": false,
          "canMigrate": false
        },
        "checks": [
          { "id": "connectionConfig", "status": "blocked" },
          { "id": "driverAvailability", "status": "blocked" },
          { "id": "readOnlyGuard", "status": "pass" },
          { "id": "networkProbe", "status": "skipped" }
        ]
      },
      "fallback": {
        "active": true,
        "reason": "生产数据库连接配置缺失，当前仍回退到 mock repository。"
      }
    },
    "missingProductionCapabilities": [
      "accessControl",
      "encryptionAtRest",
      "backupRestore",
      "schemaMigrations",
      "retentionPolicy",
      "auditRedaction"
    ],
    "disclaimer": "当前为数据库规划与 JSON/内存桥状态，不代表生产数据库已接入；上线前必须补齐权限、加密、备份、迁移和保留策略。"
  },
  "services": [
    {
      "id": "mock-database-service",
      "name": "Mock 数据库服务",
      "mode": "sample",
      "status": "planning"
    }
  ]
}
```

### `GET /api/database/read-only-health`
Returns production database connection-readiness metadata without writing to the database. The current implementation is intentionally conservative: it reports blockers and guardrails, and skips network probing unless a future driver and explicit read-only probe setting are present.

Response:
```json
{
  "readOnlyHealth": {
    "id": "production-db-readonly-health",
    "mode": "read-only-health",
    "status": "blocked",
    "provider": "postgres",
    "driver": {
      "package": "pg",
      "available": false
    },
    "safety": {
      "readOnlyOnly": true,
      "canWrite": false,
      "canMigrate": false,
      "allowedStatements": ["SELECT 1", "SHOW transaction_read_only"],
      "blockedStatements": ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]
    },
    "blockedReasons": ["数据库驱动 pg 尚未安装或未标记可用。"],
    "disclaimer": "只读连接健康检查仅用于上线前准备；当前不会写入数据库，也不会代表生产数据库已经接入。"
  }
}
```

### `GET /api/database/driver-setup-plan`
Returns the production database driver setup checklist without installing packages, reading database secrets, opening network connections, or executing SQL.

Response:
```json
{
  "driverSetupPlan": {
    "id": "production-db-driver-setup-plan",
    "status": "blocked",
    "targetDriver": "pg",
    "canInstallAutomatically": false,
    "canConnectAutomatically": false,
    "smokeOrder": ["configRedaction", "driverAvailability", "readOnlyGuard", "readOnlyHealthPreflight", "repositoryContract", "manualCutoverGate"],
    "secretBoundary": {
      "redactsConnectionUrl": true,
      "canReadDatabaseSecrets": false,
      "canPrintRawConnectionString": false,
      "forbiddenAuditFields": ["databaseUrl", "rawConnectionString", "password", "token", "sslCertificatePrivateKey"]
    }
  }
}
```

### `GET /api/database/repository-adapter-plan`
Returns the production repository adapter switch plan. This endpoint is metadata-only: it does not connect to a database, run migrations, or switch runtime storage.

Response:
```json
{
  "repositoryAdapterPlan": {
    "id": "production-repository-adapter-plan",
    "status": "blocked",
    "targetAdapter": "postgres-repository-adapter",
    "runtimeMode": "inactive",
    "canSwitchAutomatically": false,
    "mockFallbackRequired": true,
    "methodPlan": {
      "requiredCount": 34,
      "missingCount": 0
    },
    "dataDomains": [
      {
        "domain": "authRoleGrants",
        "table": "auth_role_grants",
        "methods": ["getAuthUser", "updateAuthUserRoles"]
      }
    ],
    "switchGates": [
      { "id": "repositoryContract", "status": "pass", "required": true },
      { "id": "driverSetup", "status": "blocked", "required": true },
      { "id": "humanApproval", "status": "pending", "required": true }
    ],
    "blockedReasons": ["数据库驱动或只读探测配置仍未准备好。"],
    "pendingApprovals": ["humanApproval"],
    "disclaimer": "仓储适配器计划只描述生产切换门禁；当前不会连接数据库、不会执行迁移，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/repository-runtime-guard`
Returns the runtime repository-mode guard. It reads `FINANCE_AI_REPOSITORY_MODE`, reports the requested mode, the effective safe repository mode, fallback status, checks, blockers, and allowed modes. This endpoint is metadata-only and cannot switch runtime storage automatically.

Response:
```json
{
  "repositoryRuntimeGuard": {
    "id": "repository-runtime-guard",
    "status": "fallback-active",
    "requestedMode": "postgres-primary",
    "effectiveMode": "mock",
    "currentMode": "mock",
    "allowedModes": ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
    "canUseRequestedMode": false,
    "canSwitchAutomatically": false,
    "checks": [
      { "id": "requestedModeSupported", "status": "pass", "required": true },
      { "id": "productionCutoverReady", "status": "blocked", "required": true },
      { "id": "automaticSwitchDisabled", "status": "pass", "required": true },
      { "id": "mockFallback", "status": "pass", "required": true }
    ],
    "safety": {
      "noAutomaticSwitch": true,
      "mockFallbackRequired": true,
      "requiresHumanApproval": true
    },
    "blockedReasons": ["生产仓储切换门禁未通过，不能把 PostgreSQL 设为主数据源。"],
    "disclaimer": "仓储运行时保护器只选择安全回退路径；当前不会自动切换到 PostgreSQL，也不会把生产数据库设为主数据源。"
  }
}
```

### `GET /api/database/production-repository-adapter`
Returns the production PostgreSQL repository adapter skeleton. This endpoint is metadata-only: it does not import a database driver, open network connections, write data, or replace the mock repository.

Response:
```json
{
  "productionRepositoryAdapter": {
    "id": "production-postgres-repository-adapter",
    "name": "Production PostgreSQL Repository Adapter Skeleton",
    "status": "blocked",
    "runtimeMode": "inactive",
    "active": false,
    "driver": {
      "package": "pg",
      "available": false
    },
    "methodCoverage": {
      "requiredCount": 34,
      "plannedCount": 34,
      "missingCount": 0
    },
    "tableCoverage": [
      {
        "table": "auth_role_grants",
        "operationCount": 2,
        "writeOperationCount": 1
      }
    ],
    "operationContracts": [
      {
        "method": "recordAudit",
        "table": "auth_role_events",
        "accessPattern": "insert-or-upsert",
        "transactionRequired": true,
        "status": "planned"
      }
    ],
    "transactionPolicy": {
      "defaultIsolation": "read committed",
      "writeTransactionsRequired": true,
      "auditWritesRequireHashChain": true
    },
    "safety": {
      "noNetworkCalls": true,
      "noRuntimeSwitch": true,
      "noWrites": true
    },
    "blockedReasons": ["数据库驱动 pg 尚未安装或未标记可用。"],
    "disclaimer": "这是生产 PostgreSQL 仓储适配器骨架；当前不会导入数据库驱动、不会联网、不会写库，也不会替换 mock repository。"
  }
}
```

### `GET /api/database/production-repository-smoke-test`
Returns the production PostgreSQL repository read-only smoke-test plan. This endpoint is metadata-only: it does not import a database driver, connect to PostgreSQL, execute SQL, read real user records, write data, or switch runtime storage.

Response:
```json
{
  "productionRepositorySmokeTest": {
    "id": "production-repository-readonly-smoke-plan",
    "mode": "read-only-smoke-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canExecuteAutomatically": false,
    "driver": {
      "package": "pg",
      "available": false
    },
    "coverage": {
      "readOnlyOperationCount": 12,
      "criticalTableCount": 8,
      "writeOperationCount": 20
    },
    "smokeQueries": [
      {
        "id": "connectionPing",
        "statement": "SELECT 1",
        "safety": "read-only"
      },
      {
        "id": "transactionReadOnly",
        "statement": "SHOW transaction_read_only",
        "safety": "read-only"
      }
    ],
    "checks": [
      { "id": "connectionConfig", "status": "blocked", "required": true },
      { "id": "driverAvailability", "status": "blocked", "required": true },
      { "id": "readOnlyProbeOptIn", "status": "pending", "required": true },
      { "id": "writeGuard", "status": "planned", "required": true }
    ],
    "blockedStatements": ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "TRUNCATE", "CREATE"],
    "blockedReasons": ["只读探测开关未开启，冒烟测试必须保持跳过。"],
    "disclaimer": "这是生产仓储只读冒烟测试计划；当前不会连接数据库、不会执行 SQL、不会读取用户真实数据，也不会写库。"
  }
}
```

### `GET /api/database/production-repository-sql-contract`
Returns the production PostgreSQL repository SQL contract plan. This endpoint is metadata-only: it does not connect to PostgreSQL, execute SQL, write data, or switch runtime storage. Table names come only from the repository contract, while all user values must use PostgreSQL positional parameters.

Response:
```json
{
  "productionRepositorySqlContract": {
    "id": "production-repository-sql-contract",
    "mode": "parameterized-sql-contract",
    "status": "draft-ready",
    "runtimeMode": "inactive",
    "dialect": "postgresql",
    "statementCount": 34,
    "readStatementCount": 14,
    "writeStatementCount": 20,
    "tableWhitelist": ["users", "auth_sessions", "audit_events"],
    "statements": [
      {
        "method": "findAuthUserByEmail",
        "table": "users",
        "accessMode": "read",
        "parameterStyle": "postgres-positional",
        "parameterNames": ["email"],
        "statement": "SELECT * FROM users WHERE email = $1 LIMIT 1",
        "status": "draft"
      }
    ],
    "checks": [
      { "id": "repositoryContract", "status": "pass", "required": true },
      { "id": "tableWhitelist", "status": "pass", "required": true },
      { "id": "parameterizedStatements", "status": "pass", "required": true },
      { "id": "writeTransactions", "status": "planned", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "noRuntimeSwitch": true,
      "tableNamesFromRepositoryContractOnly": true,
      "parameterizedValuesOnly": true,
      "blocksStringInterpolationForValues": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储 SQL 契约草案；当前不会连接数据库、不会执行 SQL、不会写入数据，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-execution-plan`
Returns the production PostgreSQL repository execution plan. This endpoint is metadata-only: it does not open a database connection, execute SQL, write data, or switch runtime storage. It defines the future parameter validation, transaction wrapper, audit-write policy, and rollback requirements.

Response:
```json
{
  "productionRepositoryExecutionPlan": {
    "id": "production-repository-execution-plan",
    "mode": "transaction-audit-execution-plan",
    "status": "draft-ready",
    "runtimeMode": "inactive",
    "canExecuteSql": false,
    "canOpenConnection": false,
    "coverage": {
      "validatorCount": 42,
      "transactionWrappedWriteCount": 20,
      "auditRequiredWriteCount": 20
    },
    "transactionWrapper": {
      "isolationLevel": "read committed",
      "begin": "BEGIN",
      "commit": "COMMIT",
      "rollback": "ROLLBACK",
      "retryPolicy": "no-auto-retry-for-writes"
    },
    "auditWritePolicy": {
      "requiredForWriteMethods": true,
      "eventTypePrefix": "repository.postgres",
      "includeStatementId": true,
      "includeParameterShapeOnly": true,
      "redactParameterValues": true,
      "hashChainRequired": true
    },
    "parameterValidators": [
      { "parameterName": "email", "type": "email", "required": true, "status": "planned" }
    ],
    "executionSteps": [
      { "id": "validateParameters", "status": "planned", "required": true },
      { "id": "openConnectionFromPool", "status": "blocked", "required": true },
      { "id": "executeParameterizedStatement", "status": "blocked", "required": true },
      { "id": "commitOrRollback", "status": "planned", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "validatesBeforeExecution": true,
      "transactionRequiredForWrites": true,
      "auditRequiredForWrites": true,
      "parameterValuesRedactedInAudit": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储执行计划；当前不会打开数据库连接、不会执行 SQL、不会写入数据，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-parameter-validation-plan`
Returns the local parameter validation plan for the future production PostgreSQL repository. This endpoint is metadata-only: it validates sample values against local rules, redacts samples, and does not open a database connection, execute SQL, write data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryParameterValidationPlan": {
    "id": "production-repository-parameter-validation-plan",
    "mode": "local-parameter-validation-plan",
    "status": "draft-ready",
    "runtimeMode": "inactive",
    "canValidateLocally": true,
    "canExecuteSql": false,
    "validatorCount": 42,
    "validatorTypes": ["email", "json-object", "stable-id", "integer"],
    "sampleValidationResults": [
      { "id": "validEmail", "parameterName": "email", "accepted": true, "redactedSample": "[email]" },
      { "id": "invalidEmail", "parameterName": "email", "accepted": false, "errorCode": "INVALID_EMAIL", "redactedSample": "[email]" }
    ],
    "checks": [
      { "id": "repositoryExecutionPlan", "status": "pass", "required": true },
      { "id": "validatorCoverage", "status": "pass", "required": true },
      { "id": "redactionPolicy", "status": "pass", "required": true },
      { "id": "sqlExecutionBlocked", "status": "pass", "required": true }
    ],
    "safety": {
      "localOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "redactsSampleValues": true,
      "validatesBeforeExecution": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储参数校验计划；当前只做本地规则校验，不会打开数据库连接、不会执行 SQL、不会写入数据。"
  }
}
```

### `GET /api/database/production-repository-connection-pool-plan`
Returns the connection-pool and transaction-wrapper plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not create a pool, open a connection, execute SQL, write data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryConnectionPoolPlan": {
    "id": "production-repository-connection-pool-plan",
    "mode": "connection-pool-transaction-wrapper-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canOpenConnection": false,
    "canExecuteSql": false,
    "connection": {
      "configured": false,
      "provider": "postgres",
      "sslMode": "required",
      "sslRequired": true,
      "credentialsSource": "missing"
    },
    "poolConfig": {
      "min": 0,
      "max": 5,
      "idleTimeoutMs": 30000,
      "connectionTimeoutMs": 5000,
      "statementTimeoutMs": 10000,
      "applicationName": "finance-ai-assistant-api"
    },
    "transactionWrapper": {
      "defaultIsolationLevel": "read committed",
      "readOnlyTransactionsForReads": true,
      "writeTransactionsRequired": true,
      "releaseClient": "finally"
    },
    "lifecycleSteps": [
      { "id": "loadConnectionConfig", "status": "blocked", "required": true },
      { "id": "validateParameters", "status": "pass", "required": true },
      { "id": "createPool", "status": "blocked", "required": true },
      { "id": "acquireClient", "status": "blocked", "required": true },
      { "id": "releaseClient", "status": "planned", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "secretsRedacted": true,
      "validatesBeforeAcquire": true,
      "releaseClientFinally": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储连接池与事务包装计划；当前不会创建连接池、不会打开数据库连接、不会执行 SQL、不会写入数据。"
  }
}
```

### `GET /api/database/production-repository-sql-executor-plan`
Returns the SQL executor binding and audit plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not create a pool, open a connection, execute SQL, write data, or switch runtime storage.

Response:
```json
{
  "productionRepositorySqlExecutorPlan": {
    "id": "production-repository-sql-executor-plan",
    "mode": "parameter-binding-result-mapping-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canExecuteSql": false,
    "canOpenConnection": false,
    "statementCount": 34,
    "bindingCoverage": {
      "parameterizedStatementCount": 34,
      "boundParameterCount": 42,
      "redactedBindingCount": 42
    },
    "executableStatements": [
      {
        "method": "findAuthUserByEmail",
        "parameterBindingStyle": "pg-parameter-array",
        "resultShape": "single-row-or-null",
        "status": "blocked"
      }
    ],
    "executorLifecycle": [
      { "id": "validateParameters", "status": "pass", "required": true },
      { "id": "bindParameterArray", "status": "planned", "required": true },
      { "id": "acquireClient", "status": "blocked", "required": true },
      { "id": "executeClientQuery", "status": "blocked", "required": true },
      { "id": "writeAuditEnvelope", "status": "planned", "required": true }
    ],
    "auditEnvelope": {
      "eventTypePrefix": "repository.postgres.execute",
      "includeStatementId": true,
      "redactParameterValues": true,
      "includeRowCountOnly": true
    },
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "parameterArrayOnly": true,
      "noStringInterpolationForValues": true,
      "redactsParameterValues": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储 SQL 执行器绑定计划；当前不会创建连接池、不会打开数据库连接、不会执行 SQL、不会写入数据。"
  }
}
```

### `GET /api/database/production-repository-result-audit-plan`
Returns the result-mapping and audit-envelope plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not map live database rows, write audit records, execute SQL, open a connection, or switch runtime storage.

Response:
```json
{
  "productionRepositoryResultAuditPlan": {
    "id": "production-repository-result-audit-plan",
    "mode": "result-mapping-audit-envelope-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canMapLiveRows": false,
    "canWriteAudit": false,
    "mappingCount": 34,
    "resultShapes": ["single-row-or-null", "inserted-row", "rows"],
    "mappings": [
      {
        "method": "findAuthUserByEmail",
        "resultShape": "single-row-or-null",
        "emptyResult": "null",
        "status": "blocked"
      }
    ],
    "auditEnvelope": {
      "allowedFields": ["eventType", "statementId", "method", "accessMode", "rowCount"],
      "forbiddenFields": ["rawRows", "rawParameterValues", "connectionString"]
    },
    "auditValidationSamples": [
      { "id": "safeSuccessEnvelope", "accepted": true },
      { "id": "unsafeRawRowsEnvelope", "accepted": false }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "noAuditWrite": true,
      "rawRowsNeverLogged": true,
      "rawParameterValuesNeverLogged": true,
      "rowCountOnlyInAudit": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储结果映射与审计 envelope 计划；当前不会读取数据库行、不会执行 SQL、不会写入审计记录。"
  }
}
```

### `GET /api/database/production-repository-read-rehearsal-plan`
Returns the staging read-only query rehearsal plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not open a connection, execute SQL, read production data, write audit records, write business data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryReadRehearsalPlan": {
    "id": "production-repository-readonly-query-rehearsal-plan",
    "mode": "staging-readonly-query-rehearsal-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canRunStagingReads": false,
    "canRunProductionReads": false,
    "canWriteData": false,
    "readOnlyRehearsalEnabled": false,
    "coverage": {
      "readStatementCount": 14,
      "sampleQueryCount": 10,
      "tableCount": 8,
      "parameterizedReadCount": 14
    },
    "rehearsalWindow": {
      "environment": "staging-first",
      "maxRowsPerQuery": 25,
      "statementTimeoutMs": 10000,
      "minimumSuccessfulRuns": 3,
      "maxAllowedErrorCount": 0
    },
    "sampleQueries": [
      {
        "method": "findAuthUserByEmail",
        "resultShape": "single-row-or-null",
        "expectedMapping": "single-or-null",
        "readOnlyTransaction": true,
        "status": "blocked"
      }
    ],
    "checks": [
      { "id": "readOnlySmokePlan", "status": "blocked", "required": true },
      { "id": "resultAuditPlan", "status": "blocked", "required": true },
      { "id": "readOnlyRehearsalOptIn", "status": "pending", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "noWrites": true,
      "noProductionReads": true,
      "readOnlyTransactionsOnly": true,
      "rowLimitRequired": true,
      "rawRowsNeverLogged": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储只读查询预演计划；当前不会打开数据库连接、不会执行 SQL、不会读取生产数据、不会写入数据。"
  }
}
```

### `GET /api/database/production-repository-parity-plan`
Returns the production repository dual-read parity plan. This endpoint is metadata-only: it does not connect to PostgreSQL, compare live records, read production user data, write data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryParityPlan": {
    "id": "production-repository-dual-read-parity-plan",
    "mode": "dual-read-parity-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canCompareAutomatically": false,
    "mockRepositoryRequired": true,
    "productionRepositoryRequired": true,
    "parityWindow": {
      "environment": "staging-first",
      "minimumSampleUsers": 3,
      "minimumRuns": 3,
      "maxAllowedMismatchPercent": 0
    },
    "comparisonPlan": [
      {
        "domain": "authSessions",
        "table": "auth_sessions",
        "methods": ["findAuthSessionByTokenHash", "listAuthSessions", "findAuthSession", "removeAuthSessionForUser"],
        "keyStrategy": "user-scope-and-record-id",
        "status": "planned"
      }
    ],
    "ignoredFields": ["createdAt", "updatedAt", "generatedAt", "hash", "previousHash"],
    "checks": [
      { "id": "repositoryContract", "status": "pass", "required": true },
      { "id": "readOnlySmoke", "status": "blocked", "required": true },
      { "id": "parityOptIn", "status": "pending", "required": true },
      { "id": "zeroMismatchThreshold", "status": "planned", "required": true }
    ],
    "safety": {
      "noWrites": true,
      "noRuntimeSwitch": true,
      "secretsRedacted": true,
      "userDataMinimized": true,
      "mockFallbackRequired": true
    },
    "blockedReasons": ["双读验证开关未开启，当前不能比较 mock/JSON 与生产仓储结果。"],
    "disclaimer": "这是生产仓储双读一致性验证计划；当前不会连接数据库、不会读取真实生产数据、不会写库，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-parity-evidence-plan`
Returns the dual-read parity evidence and mismatch-classification plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, compare real records, write audit records, write business data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryParityEvidencePlan": {
    "id": "production-repository-parity-evidence-plan",
    "mode": "dual-read-parity-evidence-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canCaptureEvidence": false,
    "canReadProductionData": false,
    "canWriteData": false,
    "evidenceCoverage": {
      "domainCount": 8,
      "methodCount": 14,
      "ignoredFieldCount": 8,
      "requiredSuccessfulRuns": 3,
      "maxAllowedMismatchPercent": 0
    },
    "evidenceRecords": [
      {
        "domain": "authSessions",
        "table": "auth_sessions",
        "expectedOutcome": "zero-mismatch",
        "status": "blocked"
      }
    ],
    "mismatchCategories": [
      { "id": "missingRecord", "severity": "blocker", "action": "block-cutover" },
      { "id": "rowCountMismatch", "severity": "blocker", "action": "block-cutover" },
      { "id": "ignoredTimestampOrHash", "severity": "allowed", "action": "normalize-and-ignore" }
    ],
    "auditEnvelope": {
      "eventTypePrefix": "repository.postgres.parity",
      "allowedFields": ["domain", "method", "sampleId", "mockRowCount", "postgresRowCount", "mismatchCount"],
      "forbiddenFields": ["rawMockRows", "rawPostgresRows", "rawParameterValues", "connectionString"],
      "hashChainRequired": true
    },
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "rawRowsNeverLogged": true,
      "mismatchBlocksCutover": true,
      "mockFallbackRequired": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储双读证据与差异评估计划；当前不会连接数据库、不会比较真实记录、不会写库，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-dual-write-plan`
Returns the production repository dual-write / controlled migration rehearsal plan. This endpoint is metadata-only: it does not connect to PostgreSQL, perform shadow writes, change user-visible data, write production records, or switch runtime storage.

Response:
```json
{
  "productionRepositoryDualWritePlan": {
    "id": "production-repository-dual-write-rehearsal-plan",
    "mode": "dual-write-rehearsal-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canWriteAutomatically": false,
    "canSwitchAutomatically": false,
    "mockPrimaryRequired": true,
    "productionShadowWriteOnly": true,
    "rehearsalWindow": {
      "environment": "staging-first",
      "minimumSuccessfulRuns": 3,
      "maxAllowedWriteMismatchPercent": 0,
      "rollbackOnFirstMismatch": true
    },
    "writePlan": [
      {
        "domain": "authUsers",
        "table": "users",
        "methods": ["createAuthUser", "updateAuthUserRoles"],
        "transactionRequired": true,
        "auditRequired": true,
        "status": "planned"
      }
    ],
    "checks": [
      { "id": "repositoryContract", "status": "pass", "required": true },
      { "id": "dualReadParity", "status": "blocked", "required": true },
      { "id": "dualWriteOptIn", "status": "pending", "required": true },
      { "id": "idempotencyKeys", "status": "planned", "required": true }
    ],
    "safety": {
      "noRuntimeSwitch": true,
      "mockRemainsSourceOfTruth": true,
      "productionWritesShadowOnly": true,
      "requiresAuditTrail": true,
      "requiresIdempotencyKeys": true,
      "requiresRollbackApproval": true
    },
    "rollbackTriggers": ["任一写入结果不一致。", "任一幂等键重复或缺失。"],
    "blockedReasons": ["双写演练开关未开启，当前不能把写入同时发送到 mock/JSON 与生产仓储。"],
    "disclaimer": "这是生产仓储双写/受控迁移演练计划；当前不会连接数据库、不会写入生产仓储、不会改变用户可见数据源，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-shadow-write-evidence-plan`
Returns the shadow-write evidence and idempotency plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, perform shadow writes, change user-visible data, write production records, write audit records, or switch runtime storage.

Response:
```json
{
  "productionRepositoryShadowWriteEvidencePlan": {
    "id": "production-repository-shadow-write-evidence-plan",
    "mode": "shadow-write-evidence-idempotency-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canWriteProduction": false,
    "canChangeUserVisibleData": false,
    "canSwitchRuntime": false,
    "evidenceCoverage": {
      "domainCount": 8,
      "methodCount": 12,
      "idempotencyKeyRequiredCount": 8,
      "transactionRequiredCount": 8,
      "auditRequiredCount": 8,
      "requiredSuccessfulRuns": 3,
      "maxAllowedWriteMismatchPercent": 0
    },
    "evidenceRecords": [
      {
        "domain": "authUsers",
        "table": "users",
        "expectedOutcome": "mock-visible-production-shadow-only",
        "idempotencyKeyRequired": true,
        "status": "blocked"
      }
    ],
    "idempotencyPolicy": {
      "duplicateHandling": "block-and-rollback-shadow-write",
      "ttlHours": 24,
      "requiredForEveryWrite": true,
      "rawPayloadHashOnly": true
    },
    "auditEnvelope": {
      "eventTypePrefix": "repository.postgres.shadow_write",
      "allowedFields": ["domain", "method", "sampleId", "idempotencyKeyHash", "rowCount", "durationMs", "status"],
      "forbiddenFields": ["rawPayload", "rawMockRecord", "rawPostgresRecord", "rawParameterValues"],
      "hashChainRequired": true
    },
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noSqlExecution": true,
      "noProductionWrites": true,
      "mockRemainsSourceOfTruth": true,
      "productionWritesShadowOnly": true,
      "idempotencyKeysRequired": true,
      "rawPayloadNeverLogged": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储影子写证据与幂等计划；当前不会连接数据库、不会写入生产仓储、不会改变用户可见数据源，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-backup-restore-evidence-plan`
Returns the backup/restore rehearsal evidence plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, create backups, restore data, access production data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryBackupRestoreEvidencePlan": {
    "id": "production-repository-backup-restore-evidence-plan",
    "mode": "backup-restore-rehearsal-evidence-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canRunBackup": false,
    "canRunRestore": false,
    "canTouchProductionData": false,
    "backupRestoreVerified": false,
    "recoveryObjectives": {
      "targetRpoMinutes": 15,
      "targetRtoMinutes": 30,
      "minimumSuccessfulRestoreRuns": 2,
      "maxAllowedDataLossRecords": 0
    },
    "evidenceCoverage": {
      "tableCount": 12,
      "criticalTableCount": 8,
      "backupArtifactCount": 4,
      "restoreRunCountRequired": 2,
      "checksumRequiredCount": 4
    },
    "criticalTables": ["users", "auth_sessions", "watchlist_items", "portfolio_positions"],
    "rehearsalArtifacts": [
      {
        "id": "schemaDump",
        "artifactType": "schema",
        "encrypted": true,
        "checksumRequired": true,
        "status": "blocked"
      },
      {
        "id": "restoreDryRun",
        "artifactType": "restore-rehearsal",
        "encrypted": true,
        "checksumRequired": true,
        "status": "blocked"
      }
    ],
    "checks": [
      { "id": "shadowWriteEvidence", "status": "blocked", "required": true },
      { "id": "backupRestoreOptIn", "status": "pending", "required": true },
      { "id": "encryptedBackup", "status": "planned", "required": true },
      { "id": "checksumVerification", "status": "planned", "required": true },
      { "id": "restoreRpoRto", "status": "planned", "required": true },
      { "id": "mockFallbackBeforeCutover", "status": "pass", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noBackupExecution": true,
      "noRestoreExecution": true,
      "noProductionDataAccess": true,
      "encryptionRequired": true,
      "checksumRequired": true,
      "mockFallbackRequired": true,
      "cutoverBlockedUntilRestoreVerified": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储备份恢复演练证据计划；当前不会连接数据库、不会执行备份或恢复、不会访问生产数据，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-cutover-monitoring-evidence-plan`
Returns the cutover monitoring evidence plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, subscribe to live monitoring, read production metrics, write alerts, or switch runtime storage.

Response:
```json
{
  "productionRepositoryCutoverMonitoringEvidencePlan": {
    "id": "production-repository-cutover-monitoring-evidence-plan",
    "mode": "cutover-monitoring-evidence-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canStartMonitoring": false,
    "canReadProductionMetrics": false,
    "canSwitchRuntime": false,
    "monitoringVerified": false,
    "monitoringWindow": {
      "environment": "staging-first",
      "preCutoverMinutes": 60,
      "postCutoverMinutes": 120,
      "rollbackDecisionMinutes": 15,
      "minimumHealthyWindows": 2
    },
    "evidenceCoverage": {
      "metricCount": 5,
      "monitoredTableCount": 8,
      "alertRouteCount": 3,
      "rollbackTriggerCount": 5
    },
    "metricProbes": [
      {
        "id": "writeFailureRate",
        "signal": "repository.write.failure_rate",
        "threshold": "<=0.1%",
        "rollbackOnBreach": true,
        "status": "blocked"
      }
    ],
    "alertRoutes": [
      {
        "id": "engineeringOnCall",
        "channel": "internal-on-call",
        "required": true,
        "status": "blocked"
      }
    ],
    "checks": [
      { "id": "backupRestoreEvidence", "status": "blocked", "required": true },
      { "id": "monitoringOptIn", "status": "pending", "required": true },
      { "id": "alertRouting", "status": "planned", "required": true },
      { "id": "rollbackOwner", "status": "planned", "required": true },
      { "id": "auditTrailStreaming", "status": "planned", "required": true },
      { "id": "mockFallbackBeforeCutover", "status": "pass", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noMetricSubscription": true,
      "noProductionMetricsRead": true,
      "noRuntimeSwitch": true,
      "mockFallbackRequired": true,
      "alertsRequiredBeforeCutover": true,
      "rollbackOwnerRequired": true,
      "cutoverBlockedUntilMonitoringVerified": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储切换监控证据计划；当前不会连接数据库、不会订阅真实监控、不会读取生产指标，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-rollback-rehearsal-evidence-plan`
Returns the rollback rehearsal evidence plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, execute a runtime rollback, freeze writes, export real audit packages, replay writes, access production data, or switch runtime storage.

Response:
```json
{
  "productionRepositoryRollbackRehearsalEvidencePlan": {
    "id": "production-repository-rollback-rehearsal-evidence-plan",
    "mode": "rollback-rehearsal-evidence-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canRollbackRuntime": false,
    "canReplayWrites": false,
    "canTouchProductionData": false,
    "rollbackVerified": false,
    "rollbackObjectives": {
      "rollbackDeadlineMinutes": 15,
      "targetRtoMinutes": 10,
      "minimumSuccessfulRollbackRuns": 2,
      "maxAllowedDataLossRecords": 0
    },
    "evidenceCoverage": {
      "rollbackPathCount": 5,
      "rollbackTableCount": 8,
      "requiredAuditPackageCount": 1,
      "requiredSuccessfulRuns": 2
    },
    "rollbackPaths": [
      {
        "id": "featureFlagRevert",
        "action": "set FINANCE_AI_REPOSITORY_MODE back to mock-or-json",
        "expectedDurationMinutes": 2,
        "status": "blocked"
      },
      {
        "id": "auditExport",
        "action": "export-cutover-window-audit-package",
        "expectedDurationMinutes": 5,
        "status": "blocked"
      }
    ],
    "checks": [
      { "id": "cutoverMonitoringEvidence", "status": "blocked", "required": true },
      { "id": "rollbackRehearsalOptIn", "status": "pending", "required": true },
      { "id": "featureFlagRollback", "status": "planned", "required": true },
      { "id": "writeFreeze", "status": "planned", "required": true },
      { "id": "auditExport", "status": "planned", "required": true },
      { "id": "mockJsonFallback", "status": "pass", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noRuntimeRollback": true,
      "noWriteFreezeExecution": true,
      "noAuditExportExecution": true,
      "noProductionDataAccess": true,
      "mockFallbackRequired": true,
      "rollbackOwnerRequired": true,
      "cutoverBlockedUntilRollbackVerified": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储回滚演练证据计划；当前不会连接数据库、不会执行运行时回滚、不会冻结写入、不会导出真实审计包，也不会访问生产数据。"
  }
}
```

### `GET /api/database/production-repository-cutover-audit-trail-evidence-plan`
Returns the cutover audit trail evidence plan for the future production PostgreSQL repository. This endpoint is metadata-only: it does not connect to PostgreSQL, write audit records, read production audit events, log raw payloads, or switch runtime storage.

Response:
```json
{
  "productionRepositoryCutoverAuditTrailEvidencePlan": {
    "id": "production-repository-cutover-audit-trail-evidence-plan",
    "mode": "cutover-audit-trail-evidence-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canWriteAudit": false,
    "canReadProductionAudit": false,
    "canSwitchRuntime": false,
    "auditTrailVerified": false,
    "auditObjectives": {
      "requiredHashChainContinuityPercent": 100,
      "maxAuditLagSeconds": 30,
      "minimumRetentionDays": 90,
      "requiredExportPackageCount": 1
    },
    "evidenceCoverage": {
      "eventTypeCount": 5,
      "auditFieldCount": 10,
      "forbiddenFieldCount": 7,
      "requiredPackageCount": 1
    },
    "auditEvents": [
      {
        "id": "cutoverRequested",
        "eventType": "repository.cutover.requested",
        "status": "blocked"
      },
      {
        "id": "featureFlagChanged",
        "eventType": "repository.cutover.feature_flag_changed",
        "status": "blocked"
      }
    ],
    "auditEnvelope": {
      "allowedFields": ["eventType", "actorId", "approvalId", "repositoryMode", "previousMode", "targetMode", "durationMs", "status", "hash", "previousHash"],
      "forbiddenFields": ["rawPayload", "rawUserRecord", "rawPortfolio", "rawSql", "rawParameterValues", "accessToken", "refreshToken"],
      "hashChainRequired": true,
      "exportPackageRequired": true
    },
    "checks": [
      { "id": "rollbackRehearsalEvidence", "status": "blocked", "required": true },
      { "id": "auditTrailOptIn", "status": "pending", "required": true },
      { "id": "hashChainContinuity", "status": "planned", "required": true },
      { "id": "redactionPolicy", "status": "pass", "required": true },
      { "id": "exportPackage", "status": "planned", "required": true },
      { "id": "retentionPolicy", "status": "planned", "required": true }
    ],
    "safety": {
      "metadataOnly": true,
      "noDatabaseConnection": true,
      "noAuditWrite": true,
      "noProductionAuditRead": true,
      "noRawPayloadLogging": true,
      "hashChainRequired": true,
      "exportPackageRequired": true,
      "cutoverBlockedUntilAuditVerified": true
    },
    "disclaimer": "这是生产 PostgreSQL 仓储切换审计链证据计划；当前不会连接数据库、不会写入审计记录、不会读取生产审计、不会记录原始 payload，也不会切换运行时仓储。"
  }
}
```

### `GET /api/database/production-repository-cutover-plan`
Returns the production repository feature-flag cutover gate. This endpoint is metadata-only: it does not switch `FINANCE_AI_REPOSITORY_MODE`, promote PostgreSQL to primary storage, write production records, or disable the mock/JSON fallback.

Response:
```json
{
  "productionRepositoryCutoverPlan": {
    "id": "production-repository-cutover-plan",
    "mode": "feature-flag-cutover-plan",
    "status": "blocked",
    "runtimeMode": "inactive",
    "canSwitchAutomatically": false,
    "canWriteAutomatically": false,
    "featureFlag": {
      "name": "FINANCE_AI_REPOSITORY_MODE",
      "current": "mock",
      "allowedValues": ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
      "target": "postgres-primary",
      "requiresManualApproval": true
    },
    "cutoverWindow": {
      "environment": "staging-first",
      "preferredWindow": "low-traffic-manual-window",
      "minimumSuccessfulDualWriteRuns": 3,
      "maxAllowedMismatchPercent": 0,
      "rollbackDeadlineMinutes": 15
    },
    "checks": [
      { "id": "repositoryContract", "status": "pass", "required": true },
      { "id": "dualWriteRehearsal", "status": "blocked", "required": true },
      { "id": "humanApproval", "status": "pending", "required": true },
      { "id": "backupRestore", "status": "blocked", "required": true },
      { "id": "monitoring", "status": "blocked", "required": true },
      { "id": "rollbackPlan", "status": "blocked", "required": true }
    ],
    "safety": {
      "noAutomaticSwitch": true,
      "mockFallbackRequired": true,
      "requiresBackup": true,
      "requiresAuditTrail": true,
      "requiresHumanApproval": true,
      "requiresRollbackPlan": true,
      "productionPrimaryWritesDisabled": true
    },
    "rollbackTriggers": ["切换后 15 分钟内出现任何写入失败率异常。", "任一审计事件缺失或 hash 链断裂。"],
    "blockedReasons": ["人工切换批准未记录，不能把生产仓储设为主数据源。"],
    "disclaimer": "这是生产仓储 feature flag 切换计划；当前不会切换运行时仓储、不会把 PostgreSQL 设为主数据源，也不会写入真实生产数据。"
  }
}
```

### `GET /api/database/migration-package`
Returns the versioned migration package that wraps the dry-run and SQL draft. This endpoint is intentionally review-only: `canExecute` must remain `false` until production database connectivity, migration tooling, backup/restore, rollback drill, and human approval are implemented.

Response:
```json
{
  "migrationPackage": {
    "id": "production-db-migration-package-001",
    "version": "2026.06.01.001_initial_schema",
    "status": "blocked",
    "canExecute": false,
    "executionMode": "review-only",
    "targetDialect": "postgresql",
    "manifestChecksum": "fnv1a-...",
    "pendingApprovals": ["backupPlan", "rollbackDrill", "migrationTool", "humanApproval"],
    "releaseGates": [
      "真实数据库连接已验证",
      "迁移工具已接入并记录版本",
      "备份恢复演练已通过",
      "回滚演练已通过",
      "SQL 草案已人工审查批准"
    ],
    "disclaimer": "迁移包当前仅用于审查和上线前检查；canExecute=false，不能直接执行生产数据库迁移。"
  }
}
```

### `GET /api/database/migration-sql-draft`
Returns the reviewable PostgreSQL SQL draft generated from the current repository contract and planned table order. The draft is deterministic and includes a checksum so future migration-tool integration can detect accidental drift.

Response:
```json
{
  "draft": {
    "id": "production-db-sql-draft-001",
    "dialect": "postgresql",
    "status": "generated",
    "destructive": false,
    "reviewRequired": true,
    "statementCount": 22,
    "checksum": "fnv1a-...",
    "statements": [
      "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
      "CREATE TABLE IF NOT EXISTS users (...)"
    ],
    "disclaimer": "SQL 迁移草案只用于审查和后续迁移工具接入；当前不会连接数据库，也不会执行任何 SQL。"
  }
}
```

### `GET /api/database/migration-dry-run`
Returns the same dry-run object from the database service without requiring the frontend to parse the full service-status payload. The endpoint is safe for development checks because it does not open a database connection and does not execute schema writes.

Response:
```json
{
  "dryRun": {
    "id": "production-db-migration-dry-run",
    "mode": "dry-run",
    "status": "blocked",
    "tableOrder": ["users", "auth_sessions", "user_preferences"],
    "blockedReasons": ["缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。"],
    "disclaimer": "迁移 dry-run 只用于开发规划和上线前检查，不代表真实数据库已经创建或数据已经迁移。"
  }
}
```

### `GET /api/audit/status`
Returns active audit service status, sample retention policy, redaction policy, and production-readiness gaps. The current service is a planning/sample bridge only.

Response:
```json
{
  "activeService": {
    "id": "mock-audit-service",
    "name": "Mock 审计服务",
    "mode": "sample",
    "status": "planning",
    "storageMode": "memory-only",
    "retentionPolicy": {
      "maxEvents": 500,
      "windowDays": 90,
      "enforcement": "repository-cap-only"
    },
    "redactionPolicy": {
      "metadata": "sensitive-keys-redacted",
      "email": "masked",
      "redactedFields": [
        "password",
        "passwordHash",
        "token",
        "authorization",
        "secret",
        "credential",
        "refreshToken"
      ]
    },
    "capabilities": [
      "safeMetadata",
      "retentionLimit",
      "userScopedAuditLog",
      "productionGapReport"
    ],
    "missingProductionCapabilities": [
      "tamperEvidentStorage",
      "longTermArchive",
      "adminReviewWorkflow",
      "fieldLevelEncryption",
      "automatedRetentionPurge"
    ],
    "disclaimer": "当前为样例审计服务，只做基础元数据脱敏和数量保留；生产环境还需要防篡改存储、长期归档、管理员审查流和自动保留策略。"
  },
  "services": [
    {
      "id": "mock-audit-service",
      "name": "Mock 审计服务",
      "mode": "sample",
      "status": "planning"
    }
  ]
}
```

### `GET /api/stocks/search?q=Apple`
Searches stock samples by name or code.

Response:
```json
{
  "query": "Apple",
  "provider": "mock",
  "results": [
    { "code": "AAPL", "name": "Apple", "market": "us" }
  ]
}
```

### `GET /api/news?market=a`
Returns market news and source status. Later this will aggregate licensed financial news, announcements, policy updates, and verified public statements.

Response:
```json
{
  "market": "a",
  "sourceStatus": "sample",
  "provider": "mock",
  "items": [
    {
      "id": "a-001",
      "title": "政策继续强调扩大内需，消费与高股息板块受到关注",
      "source": "宏观政策",
      "importance": 82,
      "sentiment": "positive",
      "publishedAt": "2026-06-01T00:00:00.000Z",
      "relatedTickers": ["600519"]
    }
  ]
}
```

### `GET /api/data-sources/news-filings-adapter`
Returns news/filings/public-statements adapter readiness. By default this endpoint is metadata-only and must not call vendor news, filing, exchange, or social-media APIs. When the backend is started with `FINANCE_AI_NEWS_PROVIDER=alpha-vantage-news`, `FINANCE_AI_NEWS_API_KEY`, and `FINANCE_AI_NEWS_ALLOW_NETWORK=true`, `GET /api/news/intelligence` can request Alpha Vantage `NEWS_SENTIMENT` for supported US tickers, normalize title/source URL/published time/sentiment fields into the existing important-news shape, and fall back to local fixture news if the provider request fails. When the backend is started with `FINANCE_AI_FILINGS_PROVIDER=sec-company-submissions`, `FINANCE_AI_FILINGS_ALLOW_NETWORK=true`, and `FINANCE_AI_SEC_USER_AGENT`, `GET /api/news/filings` can request SEC EDGAR company submissions for mapped US tickers, normalize filing type/date/accession/source URL into the existing filings shape, and fall back to fixture filings on provider failure. A 股 and港股 news/filings mapping remains planned/unverified.

Response:
```json
{
  "newsFilingsAdapter": {
    "id": "news-filings-provider-adapter",
    "name": "News, Filings, and Public Statements Adapter Skeleton",
    "status": "blocked",
    "runtimeMode": "inactive",
    "selectedNewsProvider": "",
    "selectedStatementProvider": "",
    "canFetchLiveNews": false,
    "canReadFixtures": true,
    "processing": {
      "deduplication": "normalized-title-related-tickers",
      "sourceCredibility": "fixture-source-classification",
      "importanceScoring": "explainable-weighted-score-v1",
      "persistence": "mock-repository-on-demand"
    },
    "fixtureReadModel": {
      "status": "available",
      "newsCount": 4,
      "filingCount": 3,
      "publicStatementCount": 3,
      "markets": ["a", "hk", "us"],
      "source": "local-fixture-news-filings-statements"
    },
    "alphaVantageNewsConnector": {
      "providerId": "alpha-vantage-news",
      "functionName": "NEWS_SENTIMENT",
      "status": "defined",
      "supportedMarkets": ["us"],
      "plannedMarkets": ["a", "hk"],
      "requiresExplicitNetworkFlag": true,
      "canRequestProvider": false
    },
    "alphaVantageNewsSmokeTestPlan": {
      "id": "real-provider-demo-news-smoke",
      "status": "defined",
      "demoTicker": "AAPL",
      "expectedFields": ["feed", "title", "url", "time_published", "overall_sentiment_score"]
    },
    "alphaVantageNewsCredentialPreflight": {
      "id": "alpha-vantage-news-credential-preflight",
      "status": "blocked",
      "mode": "no-secret-credential-preflight",
      "apiKeyStatus": "missing",
      "networkStatus": "disabled",
      "forbiddenAuditFields": ["apiKey", "providerResponseRaw", "rawArticleBody"]
    },
    "secFilingsConnector": {
      "providerId": "sec-company-submissions",
      "status": "defined",
      "supportedMarkets": ["us"],
      "plannedMarkets": ["a", "hk"],
      "requiresApiKey": false,
      "requiresUserAgent": true,
      "requiresExplicitNetworkFlag": true,
      "canRequestProvider": false
    },
    "secFilingsAccessPreflight": {
      "id": "sec-company-submissions-access-preflight",
      "status": "blocked",
      "mode": "no-secret-public-filings-preflight",
      "networkStatus": "disabled",
      "userAgentStatus": "missing",
      "noApiKeyRequired": true
    },
    "endpointContracts": [
      { "id": "importantNews", "method": "listImportantNews", "status": "planned", "fixtureStatus": "available" },
      { "id": "companyFilings", "method": "listCompanyFilings", "status": "planned", "fixtureStatus": "available" },
      { "id": "publicStatements", "method": "listPublicStatements", "status": "planned", "fixtureStatus": "available" }
    ],
    "publicStatementVerificationPolicy": {
      "id": "public-statement-verification-policy",
      "status": "blocked",
      "requiredSignals": ["speakerId", "speakerName", "speakerRole", "verificationStatus", "sourceUrl", "postedAt", "platformTermsStatus"],
      "blocksUnverifiedHighImpactStatements": true,
      "requiresOfficialChannelOrManualReview": true
    },
    "publicStatementManualReviewPolicy": {
      "id": "public-statement-manual-review-policy",
      "status": "blocked",
      "reviewTriggers": ["unverifiedIdentity", "highMarketImpact", "translatedOrParaphrasedStatement", "screenshotOrRepostOnly", "conflictingSourceSignals"],
      "queueFields": ["reviewStatus", "reviewReason", "priority", "reviewerRole", "slaHours"],
      "defaultSlaHours": 24,
      "canPromoteAfterReview": false
    }
  }
}
```

### `GET /api/news/intelligence`
Returns important news sorted by explainable `importanceScore`. By default it reads local fixture news. With the Alpha Vantage news provider env vars explicitly enabled, it can read `NEWS_SENTIMENT` for supported US tickers and label the response `mode: "real-provider"`. Query params: `market`, `symbol` or `code`, and optional `minImportance`.

Response items include:
- `importanceScore`
- `sourceCredibilityScore`
- `importanceBreakdown`
- `duplicateIds`
- `sourceCount`

The response also includes `deduplication` counts so future real providers can verify duplicate-news merge behavior before live rollout.

### `POST /api/news/intelligence/persist`
Persists the processed fixture-news intelligence output into the mock repository for audit and replay. Query params match `GET /api/news/intelligence`: `market`, `symbol` or `code`, and optional `minImportance`.

Response records include:
- `scoreVersion`
- `deduplicationVersion`
- `sourceCredibilityScore`
- `importanceBreakdown`
- `duplicateGroupKey`
- `duplicateIds`
- `rawSourceRefs`
- `reviewStatus`

This endpoint is a mock persistence bridge only. It must not be described as a licensed news archive or production investment signal store.

### `GET /api/news/intelligence/history`
Returns saved mock news-intelligence records from the repository. Query params: `market`, `symbol` or `code`, and optional `limit`.

The endpoint is intended for audit/replay checks while production database design is still in progress.

### `GET /api/news/filings`
Returns company filing records. By default it reads local fixture filings. With `FINANCE_AI_FILINGS_PROVIDER=sec-company-submissions`, `FINANCE_AI_FILINGS_ALLOW_NETWORK=true`, and `FINANCE_AI_SEC_USER_AGENT` explicitly configured, it can request SEC EDGAR company submissions for mapped US tickers such as `AAPL`, `MSFT`, `NVDA`, `TSLA`, `AMZN`, `GOOGL`, `META`, and `IBM`. Provider responses are normalized into the existing item shape with `filingType`, `accessionNumber`, `publishedAt`, `sourceUrl`, `source.label=SEC EDGAR`, `mode=real-provider`, and visible disclaimer text. If SEC returns an error, timeout, or unsupported symbol response, the endpoint falls back to fixture mode and includes `providerError`. Query params: `market`, `symbol` or `code`.

### `GET /api/public-statements`
Returns verified public-statement fixture records for CEOs, executives, regulators, companies, or government/public-policy sources. Query params: `market`, `symbol` or `code`. Responses must keep `sourceUrl`, `speaker`, `speakerRole`, and `verified` fields when available.

### `GET /api/analysis?symbol=AAPL&riskProfile=balanced`
Returns model-reference analysis for a stock. Real implementation must attach data-source references and generation timestamp.

Response:
```json
{
  "symbol": "AAPL",
  "riskProfile": "balanced",
  "modelReference": true,
  "upsideProbability": 57,
  "downsideProbability": 43,
  "sentimentScore": 65,
  "valuationScore": 52,
  "technicalScore": 61,
  "confidenceScore": 57,
  "actionReference": "偏向持有观察，等待新品周期和业绩指引进一步确认。",
  "history": [
    { "label": "1月", "price": 184 },
    { "label": "2月", "price": 181 },
    { "label": "3月", "price": 188 },
    { "label": "4月", "price": 190 },
    { "label": "5月", "price": 193 },
    { "label": "6月", "price": 196 }
  ],
  "historySource": {
    "label": "Mock 行情样例",
    "frequency": "月度样例",
    "updatedAt": "2026-06-01"
  },
  "factorBreakdown": [
    {
      "key": "macro",
      "label": "宏观经济",
      "score": 58,
      "weight": 20,
      "summary": "当前使用样例宏观与市场流动性输入，真实版本会接入利率、汇率、政策和经济数据。"
    }
  ],
  "inputCoverage": {
    "macro": "sample",
    "industry": "sample",
    "fundamentals": "sample",
    "valuation": "sample",
    "technical": "sample",
    "sentiment": "sample",
    "news": "sample",
    "portfolio": "not_required"
  },
  "analysisService": {
    "id": "mock-ai-analysis",
    "mode": "sample",
    "model": "rule-based-sample-v0"
  },
  "warnings": [
    "当前为样例规则模型，概率仅用于产品流程验证。"
  ],
  "reasons": ["..."],
  "risks": ["..."],
  "disclaimer": "模型参考，不构成投资建议或收益承诺。"
}
```

### `GET /api/analysis/history`
Returns recent model-reference analysis records for the authenticated demo user.

Response:
```json
{
  "items": [
    {
      "id": "analysis-...",
      "symbol": "AAPL",
      "name": "Apple",
      "market": "us",
      "riskProfile": "balanced",
      "upsideProbability": 57,
      "downsideProbability": 43,
      "sentimentScore": 65,
      "valuationScore": 52,
      "technicalScore": 61,
      "generatedAt": "2026-06-01T00:00:00.000Z",
      "savedAt": "2026-06-01T00:00:00.000Z",
      "disclaimer": "历史记录仅用于回看模型参考输出，不构成投资建议或收益承诺。"
    }
  ]
}
```

### `POST /api/analysis/history`
Saves one model-reference analysis record for the authenticated demo user. The backend sanitizes symbol, risk profile, and numeric scores before storing.

Request:
```json
{
  "symbol": "AAPL",
  "riskProfile": "balanced",
  "modelReference": true,
  "upsideProbability": 57,
  "downsideProbability": 43,
  "sentimentScore": 65,
  "valuationScore": 52,
  "technicalScore": 61,
  "actionReference": "偏向持有观察，等待新品周期和业绩指引进一步确认。",
  "generatedAt": "2026-06-01T00:00:00.000Z"
}
```

Response:
```json
{
  "saved": {
    "id": "analysis-...",
    "symbol": "AAPL",
    "riskProfile": "balanced",
    "upsideProbability": 57
  }
}
```

## Auth And User Endpoints / 认证与用户接口

### `POST /api/auth/demo-login`
Temporary mock login endpoint. Real auth should replace this with email/phone/OAuth-based login.

Response:
```json
{
  "token": "demo-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "user": {
    "id": "demo-user",
    "displayName": "样例用户"
  },
  "disclaimer": "当前为样例认证服务，仅用于原型同步测试，不代表真实账号安全方案。"
}
```

### `POST /api/auth/register`
Creates a mock email/password account, stores a hashed password in the sample state, creates a bearer session, and returns the public user. This is still a prototype bridge, not production authentication.

Request:
```json
{
  "email": "investor@example.com",
  "password": "StrongPass123",
  "displayName": "投资者"
}
```

Response:
```json
{
  "token": "mock_...",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "expiresAt": "2026-06-02T00:00:00.000Z",
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "disclaimer": "当前为样例认证服务，支持 demo 与 mock 邮箱密码登录；密码会哈希保存，但仍不代表生产账号安全方案。"
}
```

Errors:
- `INVALID_EMAIL`: email format is invalid.
- `WEAK_PASSWORD`: password is shorter than 8 characters.
- `EMAIL_EXISTS`: email has already been registered.

### `POST /api/auth/login`
Logs into a mock email/password account and returns a bearer session. Invalid credentials return `401`.

Request:
```json
{
  "email": "investor@example.com",
  "password": "StrongPass123"
}
```

Response:
```json
{
  "token": "mock_...",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "expiresAt": "2026-06-02T00:00:00.000Z",
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "disclaimer": "当前为样例认证服务，支持 demo 与 mock 邮箱密码登录；密码会哈希保存，但仍不代表生产账号安全方案。"
}
```

### `POST /api/auth/logout`
Revokes the current mock email/password bearer session. Demo-token logout records the action but has no stored session to revoke.

Headers:
```text
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "revoked": true,
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "disclaimer": "当前为样例退出登录；生产环境还需要刷新令牌、设备列表和风险控制。"
}
```

### `POST /api/auth/session/refresh`
Rotates the current mock email/password bearer session. The old token is revoked and a new token is returned. Demo-token refresh is allowed for local sample compatibility but does not rotate a stored session.

Headers:
```text
Authorization: Bearer <token>
```

Response:
```json
{
  "token": "mock_...",
  "tokenType": "Bearer",
  "expiresInSeconds": 86400,
  "expiresAt": "2026-06-02T00:00:00.000Z",
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "rotated": true,
  "disclaimer": "当前为样例会话刷新；生产环境还需要刷新令牌族、设备绑定、复用检测和风险控制。"
}
```

### `GET /api/auth/sessions`
Returns redacted active session summaries for the current user. The response must never include raw tokens or token hashes.

Headers:
```text
Authorization: Bearer <token>
```

Response:
```json
{
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "items": [
    {
      "id": "session-...",
      "createdAt": "2026-06-02T00:00:00.000Z",
      "expiresAt": "2026-06-03T00:00:00.000Z",
      "current": true,
      "sessionMode": "email-password-session"
    }
  ],
  "sessionPolicy": {
    "redacted": true,
    "tokenHashReturned": false,
    "deviceBindingRequiredForProduction": true
  }
}
```

### `DELETE /api/auth/sessions/:id`
Revokes another active mock email/password session owned by the current user. The current session cannot be revoked through this endpoint; use `POST /api/auth/logout` for the current token.

Headers:
```text
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "revoked": 1,
  "revokedSession": {
    "id": "session-...",
    "createdAt": "2026-06-02T00:00:00.000Z",
    "expiresAt": "2026-06-03T00:00:00.000Z",
    "current": false,
    "sessionMode": "email-password-session"
  },
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com"
  },
  "disclaimer": "当前仅撤销 mock 邮箱会话；生产环境还需要设备名称、IP/地区粗粒度、风险标记和复用检测。"
}
```

Errors:
- `SESSION_NOT_FOUND`: the target session does not exist, is expired, or does not belong to the current user.
- `CURRENT_SESSION_REVOKE_UNSUPPORTED`: the target session is the current bearer token; use logout instead.

### `GET /api/me`
Returns current user for a bearer token.

Public user objects can include mock role metadata:
```json
{
  "user": {
    "id": "user-1",
    "displayName": "投资者",
    "email": "investor@example.com",
    "roles": ["auditor"],
    "roleGrants": [
      {
        "role": "auditor",
        "status": "active",
        "grantedBy": "admin-user",
        "grantedAt": "2026-06-01T00:00:00.000Z",
        "expiresAt": "2026-07-01T00:00:00.000Z"
      }
    ]
  }
}
```

Expired grants are returned in `roleGrants` with `status: "expired"` but are filtered out of `roles`.

### `GET /api/auth/roles`
Returns current mock user roles and role policy. Requires a bearer token.

### `POST /api/auth/roles`
Updates the current mock email user's own sample roles for local authorization testing. Demo-token users cannot self-escalate. Privileged roles receive expiry metadata.

Request:
```json
{
  "roles": ["auditor"],
  "expiresInHours": 720
}
```

### `POST /api/admin/auth/users/roles`
Admin-only mock role assignment endpoint. Requires the authenticated actor to have an active `admin` role. Assigns roles to a target user by email or user id, records `auth.roles.admin_assign`, and stores role grant metadata.

Request:
```json
{
  "email": "target@example.com",
  "roles": ["compliance"],
  "expiresInHours": 336
}
```

Response:
```json
{
  "actor": { "id": "admin-user", "roles": ["admin"] },
  "targetUser": {
    "id": "target-user",
    "email": "target@example.com",
    "roles": ["compliance"],
    "roleGrants": [
      {
        "role": "compliance",
        "status": "active",
        "grantedBy": "admin-user",
        "grantedAt": "2026-06-01T00:00:00.000Z",
        "expiresAt": "2026-06-15T00:00:00.000Z"
      }
    ]
  }
}
```

Errors:
- `ADMIN_ROLE_REQUIRED`: actor is not an active admin.
- `AUTH_TARGET_NOT_FOUND`: target user cannot be found.

### `POST /api/admin/auth/users/roles/revoke`
Admin-only mock role revocation endpoint. Requires the authenticated actor to have an active `admin` role. Revokes selected privileged roles from a target user, records `auth.roles.admin_revoke`, preserves untouched grant metadata, and falls back to `user` when no roles remain.

Request:
```json
{
  "email": "target@example.com",
  "roles": ["compliance"]
}
```

Response:
```json
{
  "actor": { "id": "admin-user", "roles": ["admin"] },
  "targetUser": {
    "id": "target-user",
    "email": "target@example.com",
    "roles": ["user"],
    "roleGrants": [
      {
        "role": "user",
        "status": "active",
        "grantedBy": "",
        "grantedAt": "",
        "expiresAt": ""
      }
    ]
  },
  "revokedRoles": ["compliance"]
}
```

Errors:
- `ADMIN_ROLE_REQUIRED`: actor is not an active admin.
- `AUTH_TARGET_NOT_FOUND`: target user cannot be found.
- `INVALID_REVOKE_ROLES`: no revocable privileged roles were supplied.
- `SELF_ADMIN_REVOKE_BLOCKED`: actor tried to revoke their own admin role.

### `GET /api/admin/auth/roles/history`
Admin-only mock role history endpoint. Requires the authenticated actor to have an active `admin` role. Returns the actor's role-management audit events newest first and keeps audit-service redaction, including masked email metadata.

Response:
```json
{
  "items": [
    {
      "id": "audit-1",
      "eventType": "auth.roles.admin_revoke",
      "createdAt": "2026-06-01T00:00:00.000Z",
      "severity": "info",
      "message": "Mock admin revoked user roles.",
      "metadata": {
        "targetEmail": "ta****@example.com",
        "revokedRoles": ["compliance"],
        "remainingRoles": ["user"]
      }
    }
  ],
  "policy": {
    "status": "sample-ready",
    "requiredRole": "admin",
    "scope": "actor-owned-audit-events",
    "maxItems": 20
  },
  "disclaimer": "当前为 mock 管理员角色历史，用于验证 RBAC 审计需求；生产版仍需要不可篡改存储、审批复核和检索能力。"
}
```

Errors:
- `UNAUTHORIZED`: actor is not logged in.
- `ADMIN_ROLE_REQUIRED`: actor is not an active admin.

## User Data Endpoints / 用户数据接口

### `GET /api/watchlist`
Returns the authenticated user's watchlist. The mock backend stores watchlists by user id; one user's list must never leak into another user's response.

### `POST /api/watchlist`
Adds one stock to the authenticated user's watchlist.

Request:
```json
{ "code": "AAPL" }
```

### `DELETE /api/watchlist/:code`
Removes one stock from the authenticated user's watchlist.

### `GET /api/preferences`
Returns current user risk profile and notification-channel preferences.

Response:
```json
{
  "preferences": {
    "riskProfile": "balanced",
    "notifications": {
      "inApp": true,
      "email": true
    },
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### `POST /api/preferences`
Saves current user risk profile and notification-channel preferences. Unknown notification channels and invalid risk profiles must be ignored or sanitized.

Request:
```json
{
  "riskProfile": "aggressive",
  "notifications": {
    "inApp": true,
    "email": true,
    "telegram": false
  }
}
```

Response:
```json
{
  "preferences": {
    "riskProfile": "aggressive",
    "notifications": {
      "inApp": true,
      "email": true,
      "telegram": false
    },
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### `GET /api/portfolio`
Returns the authenticated user's saved portfolio positions.

Response:
```json
{
  "items": [
    {
      "userId": "demo-user",
      "code": "AAPL",
      "buyPrice": "100",
      "holdingQty": "10",
      "buyDate": "",
      "targetReturn": "15",
      "maxLoss": "8",
      "savedAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/portfolio`
Upserts optional portfolio fields for the authenticated user and stock code, then returns local analysis-ready values. Repeated saves for the same user and stock update the existing position rather than creating duplicates.

Request:
```json
{
  "code": "AAPL",
  "buyPrice": "100",
  "holdingQty": "10",
  "buyDate": "",
  "targetReturn": "",
  "maxLoss": ""
}
```

### `GET /api/reminders`
Returns current user reminder rules. Real delivery channels require explicit permission.

Response:
```json
{
  "items": [
    {
      "id": "reminder-1",
      "userId": "demo-user",
      "code": "AAPL",
      "type": "priceAbove",
      "threshold": "210",
      "channels": ["inApp", "email"],
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/reminders`
Adds a price or important-news reminder rule. `channels` must be sanitized to supported notification channels only: `inApp`, `email`, `sms`, `wechat`, and `telegram`. Unknown channels and duplicate channels must be removed before persistence, audit logging, or notification outbox processing.

Request:
```json
{
  "code": "AAPL",
  "type": "priceAbove",
  "threshold": "210",
  "channels": ["inApp", "email"]
}
```

Response:
```json
{
  "saved": {
    "id": "reminder-1",
    "userId": "demo-user",
    "code": "AAPL",
    "type": "priceAbove",
    "threshold": "210",
    "channels": ["inApp", "email"],
    "createdAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### `DELETE /api/reminders/:id`
Removes one reminder rule.

### `POST /api/reminders/evaluate`
Evaluates current user reminder rules against sample prices and sample news importance. Triggered rules write `reminder.triggered` audit events. This endpoint simulates the future scheduled reminder job.

Response:
```json
{
  "evaluatedAt": "2026-06-01T00:00:00.000Z",
  "checked": 2,
  "triggeredCount": 1,
  "items": [
    {
      "ruleId": "reminder-1",
      "code": "AAPL",
      "type": "priceBelow",
      "triggered": true,
      "observedValue": 196,
      "threshold": 210,
      "channels": ["inApp"],
      "notificationIds": ["notification-..."],
      "reason": "样例价格 196 已低于或等于 210。"
    }
  ]
}
```

### `GET /api/notifications`
Returns queued/read mock notification records for the authenticated demo user. These are backend outbox records with mock delivery status, not proof that a real external channel delivered a message.

Response:
```json
{
  "items": [
    {
      "id": "notification-...",
      "userId": "demo-user",
      "ruleId": "reminder-1",
      "code": "AAPL",
      "type": "priceBelow",
      "channel": "inApp",
      "status": "queued",
      "deliveryStatus": "delivered",
      "attemptCount": 1,
      "deliveryAttempts": [
        {
          "id": "delivery-...",
          "channel": "inApp",
          "status": "delivered",
          "attemptedAt": "2026-06-01T00:00:01.000Z",
          "message": "网页内提醒已写入样例通知中心。",
          "errorCode": ""
        }
      ],
      "lastAttemptAt": "2026-06-01T00:00:01.000Z",
      "deliveredAt": "2026-06-01T00:00:01.000Z",
      "nextRetryAt": "",
      "deliveryError": "",
      "title": "价格提醒触发",
      "body": "样例价格 196 已低于或等于 210。",
      "observedValue": 196,
      "threshold": 210,
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/notifications/:id/retry`
Retries one mock notification delivery for the authenticated demo user. The mock service marks `inApp` as delivered and marks external channels without configured connectors as failed with a retry timestamp.

Response:
```json
{
  "notification": {
    "id": "notification-...",
    "channel": "email",
    "deliveryStatus": "failed",
    "attemptCount": 2,
    "nextRetryAt": "2026-06-01T00:05:01.000Z",
    "deliveryError": "邮件提醒外部投递连接器尚未配置。"
  }
}
```

### `POST /api/notifications/:id/read`
Marks one mock notification record as read for the authenticated demo user.

Response:
```json
{
  "notification": {
    "id": "notification-...",
    "status": "read",
    "readAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### `GET /api/audit-log`
Returns recent safe audit events for the authenticated demo user. Audit metadata must not include secrets, tokens, or raw private portfolio values.

Response:
```json
{
  "items": [
    {
      "id": "audit-...",
      "userId": "demo-user",
      "eventType": "portfolio.save",
      "severity": "info",
      "message": "Portfolio fields saved.",
      "metadata": {
        "code": "AAPL",
        "filledFields": 2
      },
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/jobs/run`
Runs a backend job for the authenticated demo user. Current mock implementation supports `reminderEvaluation`, which calls the same reminder evaluation logic used by `POST /api/reminders/evaluate` and stores a job-run record.

Request:
```json
{ "type": "reminderEvaluation" }
```

Response:
```json
{
  "jobRun": {
    "id": "job-...",
    "userId": "demo-user",
    "type": "reminderEvaluation",
    "status": "success",
    "startedAt": "2026-06-01T00:00:00.000Z",
    "finishedAt": "2026-06-01T00:00:00.000Z",
    "summary": {
      "checked": 1,
      "triggeredCount": 1
    }
  },
  "result": {
    "checked": 1,
    "triggeredCount": 1,
    "items": []
  }
}
```

### `GET /api/job-services`
Returns active job runner status and capabilities. The current runner is manual/mock only.

Response:
```json
{
  "activeService": {
    "id": "mock-reminder-job-runner",
    "name": "Mock 提醒任务运行器",
    "mode": "sample",
    "status": "ready",
    "executionMode": "manual-api",
    "supportedJobs": ["reminderEvaluation"],
    "capabilities": [
      "reminderEvaluation",
      "jobRunRecords",
      "auditEvents",
      "notificationOutbox"
    ],
    "disclaimer": "当前为手动触发的样例任务运行器，不代表真实后台定时任务或系统推送已经部署。"
  },
  "services": [
    {
      "id": "mock-reminder-job-runner",
      "name": "Mock 提醒任务运行器",
      "mode": "sample",
      "status": "ready"
    }
  ]
}
```

### `GET /api/jobs`
Returns recent backend job-run records for the authenticated demo user.

Response:
```json
{
  "items": [
    {
      "id": "job-...",
      "type": "reminderEvaluation",
      "status": "success",
      "summary": {
        "checked": 1,
        "triggeredCount": 1
      }
    }
  ]
}
```

### `GET /api/scheduler/status`
Returns active scheduler service status and configured schedules. The current scheduler is manual/mock only.

Response:
```json
{
  "activeService": {
    "id": "mock-scheduler-service",
    "name": "Mock 后台调度服务",
    "mode": "sample",
    "status": "ready",
    "executionMode": "manual-due-check",
    "timezone": "Australia/Brisbane",
    "schedules": [
      {
        "id": "schedule-reminder-evaluation",
        "jobType": "reminderEvaluation",
        "cadence": "every-15-minutes",
        "timezone": "Australia/Brisbane"
      }
    ],
    "capabilities": [
      "schedulerStatus",
      "manualDueCheck",
      "jobRunnerBridge",
      "auditEvents"
    ],
    "disclaimer": "当前为样例调度服务，只能手动触发 due-job 检查，不代表真实 cron、队列 worker 或外部推送已经部署。"
  },
  "services": [
    {
      "id": "mock-scheduler-service",
      "name": "Mock 后台调度服务",
      "mode": "sample",
      "status": "ready"
    }
  ]
}
```

### `POST /api/scheduler/run-due`
Manually simulates a due-job scheduler check for the authenticated demo user. Current mock implementation bridges the `reminderEvaluation` schedule to the job runner and writes a safe `scheduler.run_due` audit event.

Response:
```json
{
  "schedulerRun": {
    "id": "scheduler-...",
    "userId": "demo-user",
    "status": "success",
    "executionMode": "manual-due-check",
    "requestedBy": "api",
    "checkedSchedules": 1,
    "executedJobs": 1,
    "skippedJobs": 0
  },
  "jobs": [
    {
      "scheduleId": "schedule-reminder-evaluation",
      "jobType": "reminderEvaluation",
      "jobRun": {
        "id": "job-...",
        "type": "reminderEvaluation",
        "status": "success"
      }
    }
  ],
  "errors": [],
  "disclaimer": "当前为手动触发的样例调度检查，不代表真实后台定时器或队列 worker 已部署。"
}
```

## Next Integration Steps / 下一步接入
- Add real provider adapters for market data, news, filings, macro data, and verified public/social statements.
- Add persistent database storage.
- Add real authentication and account sync.
- Add AI service adapter with rate limiting and audit logs.
- Add production notification rule processing and delivery jobs.
