# Architecture / 系统架构

## High-Level Flow / 高层流程
1. Data ingestion collects news, filings, policy updates, social statements, and market data.
2. Processing classifies market, related tickers, importance, sentiment, and risk.
3. AI analysis summarizes impact and generates quantified reference output.
4. App API serves user-facing data to frontend.
5. Frontend displays market pages, stock detail, watchlist, analysis, explanations, and reminders.
6. Notification service sends alerts only through user-authorized channels.

## Main Modules / 主要模块
- Frontend Web/PWA
- Auth service
- User profile and preference service
- Watchlist service
- News ingestion service
- Market data service
- AI analysis service
- Term explanation dictionary
- Notification service
- Audit and logging service

## Current Mock Backend / 当前 Mock 后端
The first backend implementation is a dependency-free Node mock service under `backend/`. It validates the API contract before real providers and databases are connected.

第一版后端实现位于 `backend/`，使用无第三方依赖的 Node mock 服务。它用于在真实数据源和数据库接入前稳定 API 契约。

Covered mock modules:
- Health check
- Data-source provider status
- Market list
- Stock search
- Market news
- Model-reference analysis
- AI-analysis service status
- Demo login and current user
- Watchlist add/remove/list
- Preferences and analysis-history sync
- Portfolio save and local calculated summary

## Provider Adapter Boundary / 数据源适配边界
- Current sample provider: `backend/providers/mock-provider.mjs`
- API routes call provider methods for market list, stock search, market news, stock lookup, and related news.
- Real providers should be added behind the same boundary, selected by configuration.
- Provider status is exposed through `GET /api/data-sources` so the UI can label sample, delayed, or live data correctly.
- Market-data provider status is exposed through `GET /api/data-sources/market-data-adapter`; real provider requests must stay behind entitlement tiers, exchange agreement checks, sample/delayed/live delay labels, provider preflight, cache/rate-limit/source attribution gates, manual approval, and an inactive runtime switch until production review is complete.
- Market-data audit payloads must exclude raw ticks, full order books, provider API keys, exchange user agreement text, and trading instructions. The UI must keep delay labels near prices and charts so sample or delayed data is not mistaken for live data.
- Vendor-specific SDKs, scraping logic, credentials, and rate-limit handling must stay out of public route handlers.

## Auth Service Boundary / 认证服务边界
- Current sample auth service: `backend/services/mock-auth-service.mjs`
- API routes call the auth service to issue demo login payloads and authenticate bearer-token headers.
- `GET /api/auth/status` reports the active auth service mode, supported login methods, session mode, and disclaimer for frontend labeling.
- Real email/phone/Apple/OAuth integrations should replace or extend the service layer first, while keeping protected route behavior and error shapes stable.
- Production auth must add secure token issuance, refresh/revocation, device/session tracking, rate limits, and secret management before public launch.

## Repository Boundary / 数据仓储边界
- Current mock repository: `backend/repositories/mock-repository.mjs`
- Current repository contract: `backend/repositories/repository-contract.mjs`
- Current mock state store: `backend/repositories/mock-state-store.mjs`
- Current mock database service: `backend/services/mock-database-service.mjs`
- Current production database adapter skeleton: `backend/services/production-database-adapter.mjs`
- Current mock audit service: `backend/services/mock-audit-service.mjs`
- API routes call repository methods for user-owned state such as watchlist, preferences, analysis history, reminders, portfolio entries, job runs, and audit events.
- `GET /api/repository/status` reports the active persistence mode, capabilities, limits, and disclaimer for frontend labeling.
- `GET /api/database/status` reports active storage bridge, planned production tables, repository contract status, migration checks, production database adapter skeleton health, migration phase, and missing production capabilities.
- `GET /api/database/migration-dry-run` reports a no-write production database migration preview, including table creation order, dependency blockers, warnings, and rollback notes.
- `GET /api/database/migration-sql-draft` reports deterministic PostgreSQL migration SQL generated from the dry-run table order, including checksum, safety flags, and review requirement.
- `GET /api/database/migration-package` reports a versioned review-only migration package, including manifest checksum, preflight checks, release gates, pending approvals, and `canExecute=false`.
- `GET /api/database/read-only-health` reports production database connection-readiness metadata, including config state, driver availability, read-only SQL guardrails, and blockers. It must not write data or run schema migrations.
- `GET /api/database/repository-adapter-plan` reports the production repository adapter switch plan, including required methods, data-domain table mappings, switch gates, fallback plan, blockers, and pending approvals. It must not connect to the database or switch runtime storage.
- `GET /api/database/repository-runtime-guard` reports the requested `FINANCE_AI_REPOSITORY_MODE`, effective safe repository mode, fallback state, allowed modes, checks, and blockers. It keeps mock/JSON active when PostgreSQL modes are requested before cutover evidence is complete.
- `GET /api/database/production-repository-adapter` reports the planned PostgreSQL repository adapter skeleton, including method coverage, table coverage, operation contracts, transaction policy, safety flags, and blockers. It must not import a DB driver, connect to the database, write data, or replace the mock repository.
- `GET /api/database/production-repository-smoke-test` reports the planned read-only smoke-test manifest for the PostgreSQL repository adapter, including smoke queries, critical tables, write/DDL guardrails, checks, blockers, and next steps. It must not execute SQL, read real user records, write data, or switch runtime storage.
- `GET /api/database/production-repository-sql-contract` reports the planned PostgreSQL method-to-SQL contract, including parameterized statements, table whitelist, read/write counts, transaction/audit requirements, safety flags, and blockers. It must not execute SQL or connect to PostgreSQL.
- `GET /api/database/production-repository-execution-plan` reports the planned PostgreSQL execution wrapper, including parameter validators, transaction begin/commit/rollback policy, audit-write policy, execution steps, safety flags, and blockers. It must not open a connection or execute SQL.
- `GET /api/database/production-repository-parameter-validation-plan` reports the local parameter validation plan, including validator types, sample pass/block outcomes, redaction checks, safety flags, and blockers. It must not open a database connection, execute SQL, or expose raw sample values.
- `GET /api/database/production-repository-connection-pool-plan` reports the planned PostgreSQL pool configuration, transaction wrapper, lifecycle steps, connection checks, and release-client safety policy. It must not create a pool, open a connection, execute SQL, or switch runtime storage.
- `GET /api/database/production-repository-sql-executor-plan` reports the planned SQL executor binding layer, including pg parameter-array binding, result mapping, audit envelope, lifecycle steps, and safety checks. It must not execute SQL, open connections, interpolate user values, or switch runtime storage.
- `GET /api/database/production-repository-result-audit-plan` reports the planned result-mapping and audit-envelope layer, including controlled result shapes, empty-result behavior, allowed/forbidden audit fields, validation samples, and safety checks. It must not map live rows, write audit records, execute SQL, open connections, or switch runtime storage.
- `GET /api/database/production-repository-read-rehearsal-plan` reports the planned staging read-only query rehearsal layer, including read statement coverage, sample query envelopes, row limits, read-only transaction requirements, opt-in checks, and safety flags. It must not open connections, execute SQL, read production data, write data, or switch runtime storage.
- `GET /api/database/production-repository-parity-plan` reports the planned dual-read parity gate for comparing mock/JSON repository reads with future PostgreSQL reads in staging. It defines comparison domains, ignored fields, zero-mismatch threshold, audit requirements, and rollback gates without reading live records or switching storage.
- `GET /api/database/production-repository-parity-evidence-plan` reports the planned dual-read parity evidence layer, including evidence domains, mismatch categories, audit-envelope fields, zero-mismatch requirements, and cutover-blocking rules. It must not compare live records, log raw rows, write audit records, write data, or switch runtime storage.
- `GET /api/database/production-repository-dual-write-plan` reports the planned dual-write / controlled migration rehearsal gate. It keeps mock/JSON as the user-visible source of truth, limits production writes to shadow-write planning, requires transaction audit and idempotency keys, and defines rollback triggers without writing production records or switching storage.
- `GET /api/database/production-repository-shadow-write-evidence-plan` reports the planned shadow-write evidence and idempotency layer, including evidence domains, idempotency policy, shadow-only audit envelope, rollback triggers, and raw payload redaction rules. It must not connect to PostgreSQL, perform shadow writes, write audit records, change user-visible data, or switch runtime storage.
- `GET /api/database/production-repository-backup-restore-evidence-plan` reports the planned backup/restore rehearsal evidence layer, including RPO/RTO targets, encrypted backup artifacts, checksum requirements, critical tables, restore-run evidence, safety flags, and blockers. It must not connect to PostgreSQL, create backups, restore data, access production data, or switch runtime storage.
- `GET /api/database/production-repository-cutover-monitoring-evidence-plan` reports the planned cutover monitoring evidence layer, including pre/post-cutover monitoring windows, failure-rate and latency probes, audit-chain continuity, fallback read health, alert routes, rollback ownership, safety flags, and blockers. It must not connect to PostgreSQL, subscribe to live monitoring, read production metrics, write alerts, or switch runtime storage.
- `GET /api/database/production-repository-rollback-rehearsal-evidence-plan` reports the planned rollback rehearsal evidence layer, including rollback deadlines, feature-flag revert, write freeze, audit export, mock/JSON fallback, post-rollback parity, safety flags, and blockers. It must not connect to PostgreSQL, execute rollback, freeze writes, export real audit packages, replay writes, access production data, or switch runtime storage.
- `GET /api/database/production-repository-cutover-audit-trail-evidence-plan` reports the planned cutover audit trail evidence layer, including required cutover events, allowed/forbidden audit envelope fields, hash-chain continuity, export package, retention checks, safety flags, and blockers. It must not write audit records, read production audit events, log raw payloads, connect to PostgreSQL, or switch runtime storage.
- `GET /api/database/production-repository-cutover-plan` reports the planned feature-flag cutover gate. It requires dual-write rehearsal, backup/restore, audit trail, rollback plan, monitoring, and human approval before PostgreSQL can become the primary repository; it never switches storage automatically.
- `GET /api/auth/provider-adapter` reports the planned production authentication adapter, including password/session policy, login-risk controls, account-recovery policy, security gate checks, and dry-run production-auth preflight. It must not call a real identity provider, execute production auth, log passwords/tokens/MFA secrets, or replace mock auth until manual approval and runtime switch gates pass.
- `GET /api/notification-services/provider-adapter` reports the planned external notification adapter, including delivery/consent policy, receipt handling, suppression list, bounce/complaint handling, delivery gate checks, and dry-run external-delivery preflight. It must not send real push/email/SMS/WeChat/Telegram messages, log recipient identifiers or raw message bodies, or replace mock outbox until manual approval and runtime switch gates pass.
- `GET /api/scheduler/provider-adapter` reports the planned background scheduler adapter, including queue policy, run safety, backpressure, worker callback auth, operational runbooks, scheduler gate checks, and dry-run worker preflight. It must not start real cron, queue workers, or background network jobs, and must not log worker secrets, cron signing secrets, raw signatures, or raw payloads until manual approval and runtime switch gates pass.
- `GET /api/ai-services/provider-adapter` reports the planned AI provider adapter, including prompt/schema contracts, audit/cost/source-grounding gates, six-factor input coverage, versioned factor weights, and dry-run model-call preflight. It must not call a live model, hide missing factor inputs, or change factor weights without manual approval until provider, audit, cost, source, compliance, and runtime switch gates pass.
- `GET /api/data-sources/news-filings-adapter` reports the planned news/filings/public-statements adapter, including source verification, redistribution boundaries, ingestion precheck, and dry-run provider preflight. It must not fetch real provider content, scrape social pages, store full article bodies, or log raw social/private-message fields until licensing, robots/terms, source verification, smoke tests, manual approval, and runtime switch gates pass.
- `GET /api/data-sources/macro-data-adapter` reports the planned macro-data adapter, including indicator freshness, policy-calendar verification, provider precheck, and dry-run provider preflight. It must not fetch real macro provider data, label stale indicators as current official data, or log raw policy documents/API keys/calendar sessions/trading fields until source, asOf, timezone, smoke-test, manual approval, and runtime switch gates pass.
- `GET /api/audit/status` reports audit retention, metadata redaction, and missing production audit capabilities.
- Repository audit writes use the audit service helper to redact sensitive metadata keys before persistence.
- State creation, JSON serialization, file load, and persistence live in the mock state store so the server does not own raw JSON persistence details.
- The JSON bridge and in-memory structures are implementation details of the mock repository/store path.
- The current repository can run in `memory-only` mode or a `json-file` bridge when `FINANCE_AI_DATA_FILE` is configured; neither is a production database.
- Production database work should replace or extend the repository/database service layer first, while keeping API route behavior and response shapes stable.
- A production repository adapter must satisfy the repository contract before routes are switched to it. The contract maps domains such as `authSessions`, `preferences`, `notificationOutbox`, and `auditLog` to planned production tables and required methods.
- The production database adapter skeleton reads future connection configuration from `FINANCE_AI_DATABASE_URL` or `FINANCE_AI_DB_URL`, redacts the connection URL in status responses, reports a migration plan, and keeps the mock repository fallback active until a real driver and migrations are implemented.
- The production database adapter dry-run resolves planned table order (`users` before user-owned tables, `reminder_rules` before `notification_outbox`) and reports blockers without opening a database connection or executing schema writes.
- The SQL draft generator produces non-destructive PostgreSQL `CREATE EXTENSION`, `CREATE TABLE IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS` statements for review only. It must remain inactive until a real migration tool, database backup, rollback test, and approval process exist.
- The migration package wraps dry-run and SQL draft outputs into a versioned manifest. It is a release-readiness object, not an executor; execution remains blocked until live database connection verification, migration-tool integration, backup/restore drill, rollback drill, and human approval are complete.
- The read-only connection health check is the first production-connection readiness layer. It reports whether connection config and the future `pg` driver are available, but network probing remains skipped unless explicitly enabled through a future read-only probe path.
- The repository adapter switch plan is the next readiness layer after connection and migration planning. It keeps runtime mode inactive and requires mock/JSON fallback until the production adapter passes contract parity, smoke tests, migration approval, and rollback readiness.
- The production repository adapter skeleton defines how repository methods will map to PostgreSQL tables and access patterns before implementation begins. It keeps writes disabled and uses operation contracts so future code can be tested against the repository contract before runtime switching.
- Route handlers should not directly depend on database driver calls or raw JSON-file structure.

## AI Service Boundary / AI 服务边界
- Current sample AI service: `backend/services/mock-ai-service.mjs`
- API routes call the AI service for model-reference analysis instead of embedding model logic directly in route handlers.
- `GET /api/ai-services` reports the active service mode, model version, capabilities, and disclaimer for frontend labeling.
- `GET /api/analysis` now includes factor breakdown, input coverage, confidence score, service identity, warnings, generated timestamp, and disclaimer.
- Real LLM/risk-model integrations should replace or extend the service layer first, while keeping public API response shapes stable and preserving compliance wording.

## Notification Service Boundary / 通知服务边界
- Current sample notification service: `backend/services/mock-notification-service.mjs`
- Reminder evaluation calls the notification service to enqueue outbox records instead of embedding channel delivery logic directly in route handlers.
- `GET /api/notification-services` reports delivery mode, supported channels, capabilities, and disclaimer for frontend labeling.
- The current delivery mode is `outbox-only`: notifications are queued and can be marked read, but no real email, SMS, WeChat, Telegram, or native push is delivered yet.
- Real delivery workers should replace or extend the service layer first, while preserving outbox records, audit metadata, user channel permissions, and safe failure handling.

## Core Data Flow / 核心数据流
- User searches stock.
- System loads market data, related news, and known company context.
- AI analysis combines news, macro, industry, fundamentals, valuation, technicals, and sentiment.
- System returns model-reference probabilities, reasons, risks, and disclaimer.
- If the user is logged in, analysis may be saved to history and alerts may be configured.

## Reminder Flow / 提醒流程
- User chooses reminder channels.
- System requests permission for each channel.
- App creates reminder rule.
- Mock backend can evaluate saved reminder rules through `POST /api/reminders/evaluate` against sample prices and sample news importance.
- Triggered mock rules write safe `reminder.triggered` audit events.
- Triggered mock rules enqueue notification outbox records through the notification service.
- Current mock job runner: `backend/jobs/mock-reminder-job-runner.mjs`
- Current mock scheduler service: `backend/jobs/mock-scheduler-service.mjs`
- Mock backend job-runner status is exposed through `GET /api/job-services`.
- API routes call the job runner for reminder evaluation instead of embedding scheduled-job logic in route handlers.
- Mock backend job runner exposes `POST /api/jobs/run` with `reminderEvaluation` and stores job-run records through `GET /api/jobs`.
- Mock scheduler status is exposed through `GET /api/scheduler/status`.
- Mock scheduler due checks run through `POST /api/scheduler/run-due`, then call the job runner and write `scheduler.run_due` audit events.
- Production scheduled jobs will replace manual mock evaluation and connect real delivery workers.
- News or market event triggers analysis.
- Notification is sent only through approved channels.

## Failure Handling / 失败处理
- If data source fails, show partial data and source status.
- If AI analysis fails, show a retry state and avoid inventing results.
- If user has not provided portfolio data, hide portfolio-only metrics and explain why.
- If notification permission is missing, show setup guidance instead of failing silently.

## Compliance in Architecture / 架构中的合规要求
- Store AI output with generated timestamp and data-source references when possible.
- Keep disclaimer close to analysis output.
- Label probabilities as model references.
- Preserve distinction between source facts and AI interpretation.
