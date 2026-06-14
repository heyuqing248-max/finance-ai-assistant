# Database Schema Draft / 数据库结构草案

## Purpose / 目的
This draft describes the first persistent data model for authentication, watchlists, portfolio input, news, analysis results, reminders, and audit logs.

本文描述第一版持久化数据模型，用于认证、自选股、持仓输入、新闻、分析结果、提醒和审计日志。

## Current Mock Persistence / 当前 Mock 持久化
Before a production database is selected, the no-dependency mock backend can persist development data with `FINANCE_AI_DATA_FILE=./data/mock-backend-state.json node backend/server.mjs`.

在选择生产数据库前，当前无依赖 mock 后端可通过 `FINANCE_AI_DATA_FILE=./data/mock-backend-state.json node backend/server.mjs` 将开发数据写入 JSON 文件。

The JSON file stores:
- `watchlist`: legacy/demo user watchlist codes kept for backward compatibility.
- `watchlists`: user-scoped watchlist codes keyed by `userId`.
- `portfolio`: optional demo portfolio entries.
- `reminders`: demo reminder rules.
- `preferences`: demo user risk profile and notification-channel preferences.
- `analysisHistory`: demo user model-reference analysis history.
- `newsIntelligence`: processed fixture news intelligence with score version, source credibility, duplicate group, and raw source reference metadata.
- `notificationOutbox`: queued/read mock notification delivery records.
- `auditLogs`: safe audit events without secrets or raw sensitive credential data.
- `jobRuns`: recent mock backend job executions.

JSON 文件会保存：
- `watchlist`：为了兼容旧样例数据保留的 demo 用户自选股代码。
- `watchlists`：按 `userId` 分组保存的用户级自选股代码。
- `portfolio`：样例持仓输入。
- `reminders`：样例提醒规则。
- `preferences`：样例用户风险偏好和提醒渠道偏好。
- `analysisHistory`：样例用户模型参考分析历史。
- `newsIntelligence`：处理后的样例新闻情报，包含评分版本、来源可信度、去重分组和原始来源引用元数据。
- `notificationOutbox`：已排队/已读的 mock 通知投递记录。
- `auditLogs`：不包含密钥或原始敏感凭证的安全审计事件。
- `jobRuns`：最近的 mock 后端任务运行记录。

This is only a bridge toward the tables below. Production must replace it with a real database, access control, backups, retention policy, encryption at rest, and stricter audit-log redaction.

这只是通向下方正式数据表的过渡方案。生产环境必须替换为真实数据库、访问控制、备份、保留策略、静态加密和更严格的审计脱敏。

## Repository Contract / 仓储接口契约

Production database work must satisfy `backend/repositories/repository-contract.mjs` before route handlers are switched to a real database adapter.

生产数据库接入前，新的数据库仓储适配器必须满足 `backend/repositories/repository-contract.mjs` 中定义的接口契约。

The contract currently verifies:
- Required repository methods for auth users, auth role grants/events, sessions, watchlists, preferences, news intelligence, analysis history, portfolio, reminders, notification outbox, job runs, and audit events.
- Data-domain-to-table mappings such as `authRoleGrants -> auth_role_grants`, `authRoleEvents -> auth_role_events`, `authSessions -> auth_sessions`, `preferences -> user_preferences`, `newsIntelligence -> news_items`, `notificationOutbox -> notification_outbox`, and `auditLog -> audit_events`.
- Migration checks for repository interface coverage, table mappings, user-scoped records, auth role persistence, audit redaction, notification delivery state, and news-intelligence audit metadata.

当前契约会校验：
- 认证用户、角色授权/事件、会话、自选股、偏好、新闻情报、分析历史、持仓、提醒、通知投递箱、任务记录和审计事件所需的仓储方法。
- 数据域到数据表的映射，例如 `authRoleGrants -> auth_role_grants`、`authRoleEvents -> auth_role_events`、`authSessions -> auth_sessions`、`preferences -> user_preferences`、`newsIntelligence -> news_items`、`notificationOutbox -> notification_outbox`、`auditLog -> audit_events`。
- 仓储接口覆盖、表映射、用户级数据隔离、角色持久化、审计脱敏、通知投递状态、新闻情报审计元数据等迁移检查项。

## Production Adapter Skeleton / 生产适配器骨架

`backend/services/production-database-adapter.mjs` is the current production database adapter skeleton. It does not connect to a real database yet, but it defines the future adapter status shape.

`backend/services/production-database-adapter.mjs` 是当前的生产数据库适配器骨架。它暂时不会连接真实数据库，但已经定义了未来适配器的状态结构。

The skeleton currently:
- Reads future connection config from `FINANCE_AI_DATABASE_URL` or `FINANCE_AI_DB_URL`.
- Redacts configured URLs before returning status.
- Reports whether the adapter is `not_configured` or `configured`.
- Exposes a migration plan with connection, schema migration, repository contract verification, backup, encryption, and adapter-switch steps.
- Exposes a no-write migration dry-run with planned table order, table dependencies, blockers, warnings, and rollback notes.
- Exposes a deterministic PostgreSQL SQL draft with non-destructive `CREATE EXTENSION`, `CREATE TABLE IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS` statements plus checksum and review flags.
- Exposes a versioned migration package with manifest checksum, preflight checks, release gates, pending approvals, and `canExecute: false`.
- Exposes a read-only connection health check with config state, future driver availability, read-only guardrails, blockers, and next steps.
- Keeps fallback active to the mock repository until a real database driver and migrations are implemented.

当前骨架会：
- 从 `FINANCE_AI_DATABASE_URL` 或 `FINANCE_AI_DB_URL` 读取未来连接配置。
- 在返回状态前脱敏连接 URL。
- 报告适配器处于 `not_configured` 还是 `configured`。
- 暴露迁移计划，包括连接配置、结构迁移、仓储契约验证、备份、加密和适配器切换步骤。
- 暴露不会写入数据库的迁移预演，包含计划表顺序、表依赖、阻断原因、提示和回滚说明。
- 暴露确定性的 PostgreSQL SQL 草案，包含非破坏性的 `CREATE EXTENSION`、`CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS` 语句、校验码和人工审查标记。
- 暴露版本化迁移包，包含 manifest 校验码、上线前检查、发布门禁、待审批项和 `canExecute: false`。
- 暴露只读连接健康检查，包含配置状态、未来驱动可用性、只读保护、阻断原因和下一步。
- 在真实数据库驱动和迁移实现前，继续回退到 mock repository。

Current dry-run table order:
1. `users`
2. `auth_role_grants`
3. `auth_role_events`
4. `auth_sessions`
5. `user_preferences`
6. `watchlist_items`
7. `portfolio_positions`
8. `news_items`
9. `compliance_acknowledgements`
10. `suitability_questionnaires`
11. `analysis_results`
12. `reminder_rules`
13. `notification_outbox`
14. `audit_archive_receipts`
15. `job_runs`
16. `queued_jobs`
17. `dead_letter_jobs`
18. `worker_heartbeats`
19. `worker_request_nonces`
20. `audit_events`

当前迁移预演顺序先保证 `users` 存在，再创建角色授权/事件表和用户级业务表；`auth_role_events` 必须排在 `auth_role_grants` 之后，`notification_outbox` 必须排在 `reminder_rules` 之后。dry-run 不执行 `CREATE`、`ALTER` 或 `DROP`，只用于上线前检查。

## SQL Draft Boundary / SQL 草案边界

The SQL draft is exposed through `GET /api/database/migration-sql-draft` and embedded in database status for UI visibility. It is not a migration runner.

SQL 草案通过 `GET /api/database/migration-sql-draft` 暴露，并嵌入数据库状态方便 UI 展示。它不是迁移执行器。

Current rules:
- Generate PostgreSQL-only draft statements from the current table order.
- Include `CREATE EXTENSION IF NOT EXISTS pgcrypto;` for UUID defaults.
- Use only `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Mark `destructive: false` and `reviewRequired: true`.
- Include a checksum so future migration-tool integration can detect drift.
- Do not connect to a database or execute SQL.

当前规则：
- 只从当前表顺序生成 PostgreSQL 草案语句。
- 包含 `CREATE EXTENSION IF NOT EXISTS pgcrypto;` 用于 UUID 默认值。
- 只使用 `CREATE TABLE IF NOT EXISTS` 和 `CREATE INDEX IF NOT EXISTS`。
- 标记 `destructive: false` 和 `reviewRequired: true`。
- 包含校验码，方便后续迁移工具接入时发现草案漂移。
- 不连接数据库，也不执行 SQL。

## Migration Package Boundary / 迁移包边界

The migration package is exposed through `GET /api/database/migration-package` and embedded in database status for UI visibility. It wraps the dry-run and SQL draft into a versioned review package.

迁移包通过 `GET /api/database/migration-package` 暴露，并嵌入数据库状态方便 UI 展示。它把迁移预演和 SQL 草案包装成一个版本化审查包。

Current package:
- Version: `2026.06.01.001_initial_schema`
- Execution mode: `review-only`
- `canExecute`: `false`
- Required gates: live database connection verification, migration-tool version tracking, backup/restore drill, rollback drill, and human approval.

当前迁移包：
- 版本：`2026.06.01.001_initial_schema`
- 执行模式：`review-only`
- `canExecute`：`false`
- 必要门禁：真实数据库连接验证、迁移工具版本记录、备份恢复演练、回滚演练、人工审批。

## Read-Only Connection Health / 只读连接健康检查

`GET /api/database/read-only-health` reports whether the project is ready to attempt a safe production database connectivity probe. It is not a repository adapter and it is not a migration runner.

`GET /api/database/read-only-health` 用于报告项目是否具备安全探测生产数据库连接的条件。它不是仓储适配器，也不是迁移执行器。

Current rules:
- Default status is blocked when database URL or driver availability is missing.
- The future driver package is `pg`.
- The check marks `canWrite: false` and `canMigrate: false`.
- Allowed probe statements are read-only, such as `SELECT 1` and `SHOW transaction_read_only`.
- Network probing is skipped unless a future explicit read-only probe path is enabled.

当前规则：
- 缺少数据库 URL 或驱动可用性时默认阻断。
- 未来驱动包为 `pg`。
- 检查结果标记 `canWrite: false` 和 `canMigrate: false`。
- 允许的探测语句只读，例如 `SELECT 1` 和 `SHOW transaction_read_only`。
- 除非未来显式启用只读探测路径，否则不会发起网络探测。

## Repository Adapter Switch Plan / 仓储适配器切换计划

`GET /api/database/repository-adapter-plan` reports the future switch plan from mock/JSON repository storage to a production PostgreSQL repository adapter. It is metadata-only and does not change runtime storage.

`GET /api/database/repository-adapter-plan` 用于报告未来从 mock/JSON 仓储切换到生产 PostgreSQL 仓储适配器的计划。它只返回元数据，不改变当前运行时存储。

Current rules:
- Runtime mode remains `inactive`.
- `canSwitchAutomatically` must stay `false`.
- The plan must list repository contract method counts, domain-to-table mappings, switch gates, implementation steps, rollback plan, blockers, and pending approvals.
- Mock/JSON fallback must remain required until production repository smoke tests, migration execution, backups, rollback drill, and human approval are complete.

当前规则：
- 运行模式保持 `inactive`。
- `canSwitchAutomatically` 必须保持 `false`。
- 计划必须列出仓储契约方法数量、数据域到表映射、切换门禁、实施步骤、回退方案、阻断项和待审批项。
- 在生产仓储 smoke test、迁移执行、备份、回滚演练和人工审批完成前，必须保留 mock/JSON 回退。

## Production Repository Adapter Skeleton / 生产仓储适配器骨架

`GET /api/database/production-repository-adapter` reports the planned PostgreSQL repository adapter skeleton. It maps repository methods to planned tables and access patterns, but it does not import `pg`, open a network connection, or write data.

`GET /api/database/production-repository-adapter` 用于报告计划中的 PostgreSQL 仓储适配器骨架。它会把仓储方法映射到计划表和访问模式，但不会导入 `pg`、不会联网、也不会写入数据。

Current rules:
- Runtime mode remains `inactive`.
- The adapter skeleton reports method coverage, table coverage, operation contracts, transaction policy, safety flags, blockers, and implementation steps.
- `GET /api/database/repository-runtime-guard` reports `FINANCE_AI_REPOSITORY_MODE`, allowed runtime modes, effective fallback mode, safety checks, and blockers. Requested PostgreSQL modes must remain blocked until cutover evidence and human approval are complete.
- `GET /api/database/production-repository-sql-contract` reports the method-to-SQL contract for the future PostgreSQL repository. It uses repository-contract table names only, PostgreSQL positional parameters for values, table whitelist checks, and explicit transaction/audit flags for writes.
- `GET /api/database/production-repository-execution-plan` reports the future execution wrapper for PostgreSQL repository methods. It defines parameter validators, connection-pool gate, transaction begin/commit/rollback, audit-write policy, rollback behavior, and redaction requirements.
- `GET /api/database/production-repository-parameter-validation-plan` reports local parameter validation rules for the future PostgreSQL repository. It lists validator types, sample pass/block outcomes, redaction checks, and safety flags without opening a database connection or executing SQL.
- `GET /api/database/production-repository-connection-pool-plan` reports the future PostgreSQL connection-pool and transaction-wrapper plan. It lists pool limits, timeout settings, lifecycle steps, connection checks, client release policy, and safety flags without creating a pool or opening a connection.
- `GET /api/database/production-repository-sql-executor-plan` reports the future PostgreSQL SQL executor binding plan. It lists pg parameter-array binding, result-shape mapping, audit envelope fields, lifecycle steps, and safety flags without executing SQL or interpolating user values.
- `GET /api/database/production-repository-result-audit-plan` reports the future PostgreSQL result-mapping and audit-envelope plan. It lists controlled result shapes, empty-result behavior, allowed/forbidden audit fields, validation samples, and safety flags without reading database rows, writing audit records, or executing SQL.
- `GET /api/database/production-repository-read-rehearsal-plan` reports the future PostgreSQL staging read-only query rehearsal plan. It lists read statement coverage, sample query envelopes, row limits, read-only transaction requirements, opt-in checks, and safety flags without opening a connection, executing SQL, reading production data, or writing data.
- `GET /api/database/production-repository-smoke-test` reports the read-only smoke-test plan for the adapter. It lists connection ping, transaction read-only checks, critical table visibility probes, blocked write/DDL statements, blockers, and next steps.
- `GET /api/database/production-repository-parity-plan` reports the dual-read parity plan for comparing mock/JSON repository reads with the future PostgreSQL repository in staging. It defines sample windows, comparison domains, ignored fields, zero-mismatch threshold, audit requirement, and rollback gates.
- `GET /api/database/production-repository-parity-evidence-plan` reports the dual-read parity evidence plan for future staging comparisons. It defines evidence records, mismatch categories, audit envelope fields, zero-mismatch evidence coverage, and cutover-blocking rules without comparing real records, logging raw rows, writing audit records, or switching storage.
- `GET /api/database/production-repository-dual-write-plan` reports the dual-write / controlled migration rehearsal plan. It defines shadow-write domains, transaction/audit requirements, idempotency checks, rollback triggers, and the rule that mock/JSON remains the user-visible source of truth.
- `GET /api/database/production-repository-shadow-write-evidence-plan` reports the shadow-write evidence and idempotency plan for future staging rehearsals. It defines evidence records, idempotency policy, shadow-only audit envelope fields, rollback triggers, and raw-payload redaction rules without performing shadow writes, writing audit records, changing user-visible data, or switching storage.
- `GET /api/database/production-repository-backup-restore-evidence-plan` reports the backup/restore rehearsal evidence plan for future staging rehearsals. It defines RPO/RTO targets, required restore runs, encrypted backup artifacts, checksum evidence, critical tables, blockers, and rollback triggers without creating backups, restoring data, accessing production data, or switching storage.
- `GET /api/database/production-repository-cutover-monitoring-evidence-plan` reports the cutover monitoring evidence plan for future staging rehearsals. It defines pre/post-cutover monitoring windows, failure-rate and latency probes, audit-chain continuity, fallback health, alert routes, rollback owners, blockers, and rollback triggers without subscribing to live monitoring, reading production metrics, writing alerts, or switching storage.
- `GET /api/database/production-repository-rollback-rehearsal-evidence-plan` reports the rollback rehearsal evidence plan for future staging rehearsals. It defines rollback deadlines, RTO targets, feature-flag revert, write freeze, audit export, mock/JSON fallback, post-rollback parity checks, blockers, and rollback triggers without executing runtime rollback, freezing writes, exporting real audit packages, replaying writes, or accessing production data.
- `GET /api/database/production-repository-cutover-audit-trail-evidence-plan` reports the cutover audit trail evidence plan for future staging rehearsals. It defines required cutover audit events, allowed/forbidden audit envelope fields, hash-chain continuity, export package, retention checks, blockers, and rollback triggers without writing audit records, reading production audit events, logging raw payloads, or switching storage.
- `GET /api/database/production-repository-cutover-plan` reports the feature-flag cutover plan. It defines `FINANCE_AI_REPOSITORY_MODE`, manual approval, low-traffic cutover window, backup/restore, rollback plan, audit trail, monitoring, and mock/JSON fallback requirements.
- Write operations must require transactions.
- Audit writes must preserve hash-chain requirements.
- The smoke-test plan is metadata-only and cannot execute SQL, read real user data, or write data until explicit production credentials, driver review, read-only probe opt-in, audit logging, and human approval are complete.
- The SQL contract plan is metadata-only and cannot execute SQL. User-controlled values must be passed as parameter arrays; table names must come only from the repository contract whitelist.
- The execution plan is metadata-only and cannot open a database connection. Parameters must be validated before execution, write methods must be transaction-wrapped, and audit events must redact parameter values while preserving statement id and parameter shape.
- The result-audit plan is metadata-only and cannot read live rows or write audit records. Future mapping must normalize timestamps, parse JSONB safely, preserve explicit empty-result behavior, and log only controlled envelope metadata such as statement id, method, access mode, and row count.
- The read-only rehearsal plan is metadata-only and cannot run staging reads until the explicit read rehearsal opt-in is enabled. Future rehearsal reads must use read-only transactions, parameter arrays, row limits, statement timeouts, and audit envelopes that never include raw rows or raw parameter values.
- The dual-read parity plan is metadata-only and cannot compare live records until read-only smoke tests, parity opt-in, user-data minimization, audit capture, and staging approval are complete.
- The parity evidence plan is metadata-only and cannot compare real records or write audit records. Future evidence capture must classify missing records, extra records, row-count mismatches, value mismatches, ordering mismatches, and ignored timestamp/hash differences; any blocker-level mismatch must prevent dual-write rehearsal and cutover.
- The dual-write rehearsal plan is metadata-only and cannot write to production storage until dual-read parity, explicit dual-write opt-in, transaction audit, idempotency keys, staging approval, and rollback approval are complete.
- The shadow-write evidence plan is metadata-only and cannot perform production writes or write audit records. Future shadow-write evidence must prove every write has an idempotency-key hash, transaction audit, row-count evidence, raw-payload redaction, and rollback-on-mismatch behavior before cutover can proceed.
- The backup/restore evidence plan is metadata-only and cannot execute backups or restores. Future recovery evidence must prove encrypted schema/data artifacts, checksum verification, at least two restore rehearsal runs, RPO/RTO targets, zero critical-table data loss, and mock/JSON fallback before cutover can proceed.
- The cutover monitoring evidence plan is metadata-only and cannot subscribe to live monitoring or read production metrics. Future cutover monitoring evidence must prove write-failure-rate, p95 latency, audit-chain continuity, fallback read health, parity mismatch alerts, alert routing, and rollback ownership before cutover can proceed.
- The rollback rehearsal evidence plan is metadata-only and cannot execute a runtime rollback or freeze writes. Future rollback evidence must prove feature-flag revert, write freeze, audit export, mock/JSON fallback, post-rollback parity checks, rollback owner approval, and completion inside the 15-minute rollback window before cutover can proceed.
- The cutover audit trail evidence plan is metadata-only and cannot write audit records or read production audit events. Future audit evidence must prove required cutover events, 100% hash-chain continuity, export package availability, 90-day minimum retention, raw-payload redaction, and approval traceability before cutover can proceed.
- The cutover plan is metadata-only and cannot promote PostgreSQL to primary storage until dual-write rehearsal, backup/restore evidence, cutover monitoring evidence, rollback rehearsal evidence, cutover audit trail evidence, and explicit human approval are complete. Automatic cutover remains prohibited.
- The runtime guard must keep `mock` or `json` as the effective repository when `FINANCE_AI_REPOSITORY_MODE` requests any PostgreSQL mode before all cutover requirements are proven.
- The skeleton cannot replace mock repository until production connection, migration, smoke test, and rollback gates pass.

当前规则：
- 运行模式保持 `inactive`。
- 适配器骨架会报告方法覆盖、表覆盖、操作契约、事务策略、安全标记、阻断项和实施步骤。
- `GET /api/database/repository-runtime-guard` 会报告 `FINANCE_AI_REPOSITORY_MODE`、允许运行模式、生效回退模式、安全检查和阻断项。在切换证据和人工审批完成前，请求 PostgreSQL 模式必须保持阻断。
- `GET /api/database/production-repository-sql-contract` 会报告未来 PostgreSQL 仓储的方法到 SQL 契约。它只使用仓储契约里的表名、对用户值使用 PostgreSQL 位置参数、检查表白名单，并为写操作明确事务和审计要求。
- `GET /api/database/production-repository-execution-plan` 会报告未来 PostgreSQL 仓储方法执行包装。它会定义参数校验器、连接池门禁、事务 begin/commit/rollback、审计写入策略、回滚行为和脱敏要求。
- `GET /api/database/production-repository-parameter-validation-plan` 会报告未来 PostgreSQL 仓储的本地参数校验规则。它会列出校验器类型、样例通过/阻断结果、脱敏检查和安全标记，但不会打开数据库连接或执行 SQL。
- `GET /api/database/production-repository-connection-pool-plan` 会报告未来 PostgreSQL 连接池与事务包装计划。它会列出连接池上限、超时设置、生命周期步骤、连接检查、客户端释放策略和安全标记，但不会创建连接池或打开连接。
- `GET /api/database/production-repository-sql-executor-plan` 会报告未来 PostgreSQL SQL 执行器绑定计划。它会列出 pg 参数数组绑定、结果形状映射、审计 envelope 字段、生命周期步骤和安全标记，但不会执行 SQL 或拼接用户值。
- `GET /api/database/production-repository-result-audit-plan` 会报告未来 PostgreSQL 结果映射与审计 envelope 计划。它会列出受控结果形状、空结果行为、允许/禁止的审计字段、校验样例和安全标记，但不会读取数据库行、写入审计记录或执行 SQL。
- `GET /api/database/production-repository-read-rehearsal-plan` 会报告未来 PostgreSQL staging 只读查询预演计划。它会列出只读语句覆盖、样例查询 envelope、行数限制、只读事务要求、开关检查和安全标记，但不会打开连接、执行 SQL、读取生产数据或写入数据。
- `GET /api/database/production-repository-smoke-test` 会报告 adapter 的只读冒烟测试计划，包括连接 ping、只读事务检查、关键表可见性探测、被禁止的写入/DDL 语句、阻断项和下一步。
- `GET /api/database/production-repository-parity-plan` 会报告双读一致性计划，用于在 staging 中比较 mock/JSON 仓储读结果与未来 PostgreSQL 仓储读结果。它会定义样本窗口、对比域、可忽略字段、零差异阈值、审计要求和回滚门禁。
- `GET /api/database/production-repository-parity-evidence-plan` 会报告未来 staging 对比用的双读证据计划。它会定义证据记录、差异类别、审计 envelope 字段、零差异证据覆盖和阻断切换规则，但不会比较真实记录、记录原始行、写审计记录或切换存储。
- `GET /api/database/production-repository-dual-write-plan` 会报告双写/受控迁移演练计划。它会定义影子写数据域、事务/审计要求、幂等检查、回滚触发条件，以及 mock/JSON 仍是用户可见主数据源的规则。
- `GET /api/database/production-repository-shadow-write-evidence-plan` 会报告未来 staging 演练用的影子写证据与幂等计划。它会定义证据记录、幂等策略、仅影子写审计 envelope 字段、回滚触发条件和原始 payload 脱敏规则，但不会执行影子写、写审计记录、改变用户可见数据或切换存储。
- `GET /api/database/production-repository-backup-restore-evidence-plan` 会报告未来 staging 演练用的备份恢复证据计划。它会定义 RPO/RTO 目标、恢复演练次数、加密备份 artifact、checksum 校验证据、关键表、阻断项和回滚触发条件，但不会创建备份、恢复数据、访问生产数据或切换存储。
- `GET /api/database/production-repository-cutover-monitoring-evidence-plan` 会报告未来 staging 演练用的切换监控证据计划。它会定义切换前后监控窗口、失败率和延迟探针、审计链连续性、回退健康度、告警路由、回滚负责人、阻断项和回滚触发条件，但不会订阅真实监控、读取生产指标、写入告警或切换存储。
- `GET /api/database/production-repository-rollback-rehearsal-evidence-plan` 会报告未来 staging 演练用的回滚演练证据计划。它会定义回滚截止时间、RTO 目标、feature flag 回退、写入冻结、审计导出、mock/JSON 回退、回滚后一致性检查、阻断项和回滚触发条件，但不会执行运行时回滚、冻结写入、导出真实审计包、重放写入或访问生产数据。
- `GET /api/database/production-repository-cutover-audit-trail-evidence-plan` 会报告未来 staging 演练用的切换审计链证据计划。它会定义必需的切换审计事件、允许/禁止的审计 envelope 字段、Hash 链连续性、导出包、保留策略检查、阻断项和回滚触发条件，但不会写入审计记录、读取生产审计事件、记录原始 payload 或切换存储。
- `GET /api/database/production-repository-cutover-plan` 会报告 feature flag 切换计划。它会定义 `FINANCE_AI_REPOSITORY_MODE`、人工审批、低流量切换窗口、备份恢复、回滚计划、审计链、监控和 mock/JSON 回退要求。
- 写入操作必须要求事务。
- 审计写入必须保留 Hash 链要求。
- 冒烟测试计划仅为元数据；在真实生产凭证、驱动审查、只读探测开关、审计记录和人工审批完成前，不能执行 SQL、不能读取真实用户数据、也不能写入数据。
- SQL 契约计划仅为元数据，不能执行 SQL。用户可控值必须用参数数组传入；表名只能来自仓储契约白名单。
- 执行计划仅为元数据，不能打开数据库连接。执行前必须先校验参数；写方法必须包裹事务；审计事件必须脱敏参数值，同时保留 statement id 和参数形状。
- 参数校验计划仅为本地规则元数据，不能替代数据库约束。它必须先阻断无效邮箱、不安全 ID、超限分页、非对象 JSON 和无效 Hash，并且只展示脱敏样例。
- 连接池计划仅为元数据，不能创建真实连接池。未来执行器必须先校验参数，再 acquire client；读方法使用只读事务或只读角色，写方法必须 begin/commit/rollback，并在 `finally` 中释放客户端。
- SQL 执行器计划仅为元数据，不能执行 SQL。所有用户可控值必须进入 pg 参数数组；审计只能记录 statement id、方法、访问模式、参数名和 row count，不能记录原始参数值。
- 结果审计计划仅为元数据，不能读取真实行或写入审计记录。未来映射必须规范化时间戳、安全解析 JSONB、保留明确的空结果行为，并且审计只记录 statement id、方法、访问模式和 row count 等受控 envelope 元数据。
- 只读查询预演计划仅为元数据，在显式开启只读预演开关前不能运行 staging 读取。未来预演读取必须使用只读事务、参数数组、行数限制、语句超时和不包含原始行或原始参数值的审计 envelope。
- 双读一致性计划仅为元数据；在只读冒烟测试、双读开关、用户数据最小化、审计记录和 staging 审批完成前，不能比较真实记录。
- 双读证据计划仅为元数据，不能比较真实记录或写入审计记录。未来证据采集必须分类缺失记录、多余记录、行数差异、字段值差异、排序差异和可忽略的时间戳/hash 差异；任何 blocker 级差异都必须阻断双写演练和切换。
- 双写演练计划仅为元数据；在双读一致性、双写开关、事务审计、幂等键、staging 审批和回滚审批完成前，不能写入生产仓储。
- 影子写证据计划仅为元数据，不能执行生产写入或写审计记录。未来影子写证据必须证明每次写入都有幂等键 hash、事务审计、row count 证据、原始 payload 脱敏和差异回滚行为，然后才能进入切换门禁。
- 备份恢复证据计划仅为元数据，不能执行备份或恢复。未来恢复证据必须证明加密 schema/data artifact、checksum 校验、至少两次恢复演练、RPO/RTO 目标、关键表零数据丢失和 mock/JSON 回退，然后才能进入切换门禁。
- 切换监控证据计划仅为元数据，不能订阅真实监控或读取生产指标。未来切换监控证据必须证明写入失败率、P95 延迟、审计链连续性、回退读取健康度、一致性差异告警、告警路由和回滚负责人，然后才能进入切换门禁。
- 回滚演练证据计划仅为元数据，不能执行运行时回滚或冻结写入。未来回滚证据必须证明 feature flag 回退、写入冻结、审计导出、mock/JSON 回退、回滚后一致性检查、回滚负责人审批，并在 15 分钟回滚窗口内完成，然后才能进入切换门禁。
- 切换审计链证据计划仅为元数据，不能写审计记录或读取生产审计事件。未来审计证据必须证明必需切换事件、100% Hash 链连续性、导出包可用、至少 90 天保留、原始 payload 脱敏和审批可追溯性，然后才能进入切换门禁。
- 切换计划仅为元数据；在双写演练、备份恢复证据、切换监控证据、回滚演练证据、切换审计链证据和明确人工审批完成前，不能把 PostgreSQL 提升为主数据源。自动切换始终禁止。
- 当 `FINANCE_AI_REPOSITORY_MODE` 在全部切换要求被证明前请求任何 PostgreSQL 模式时，运行时保护器必须继续让 `mock` 或 `json` 成为生效仓储。
- 在生产连接、迁移、smoke test 和回滚门禁通过前，骨架不能替换 mock repository。

## Core Tables / 核心表

### `users`
Stores registered users.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `email` | Text | Optional if phone/OAuth login is used |
| `phone` | Text | Optional |
| `display_name` | Text | User-facing name |
| `risk_profile` | Text | `conservative`, `balanced`, `aggressive` |
| `created_at` | Timestamp | ISO timestamp |
| `updated_at` | Timestamp | ISO timestamp |

### `auth_role_grants`
Stores durable RBAC role grants, expiry, revocation, and grant actor metadata for production authentication.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Target user |
| `role` | Text | `user`, `admin`, `auditor`, `compliance` |
| `status` | Text | `active`, `expired`, `revoked` |
| `granted_by` | UUID | Admin or system actor |
| `granted_at` | Timestamp | Grant time |
| `expires_at` | Timestamp | Optional expiry |
| `revoked_at` | Timestamp | Optional revocation time |
| `source` | Text | Grant source, such as admin panel or IdP sync |
| `metadata` | JSON | Safe metadata only |

Unique index: `(user_id, role)`.

### `auth_role_events`
Stores queryable role assignment, revocation, expiry, and history-review events. It complements redacted `audit_events` so production admin review can search role changes directly.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `actor_user_id` | UUID | Acting admin or system actor |
| `target_user_id` | UUID | Affected user |
| `role_grant_id` | UUID | Related grant when available |
| `event_type` | Text | Role event name |
| `roles` | JSON | Roles affected |
| `metadata` | JSON | Redacted metadata only |
| `created_at` | Timestamp | Event time |

### `watchlist_items`
Stores user watchlists.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `users.id` |
| `market` | Text | `a`, `hk`, `us` |
| `code` | Text | Stock code |
| `name` | Text | Display name |
| `created_at` | Timestamp | Added time |

Unique index: `(user_id, market, code)`.

### `portfolio_positions`
Stores optional user portfolio data. All fields except user and ticker references are optional.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key |
| `market` | Text | Market id |
| `code` | Text | Stock code |
| `buy_price` | Decimal | Optional |
| `holding_qty` | Decimal | Optional |
| `buy_date` | Date | Optional |
| `target_return_pct` | Decimal | Optional |
| `max_loss_pct` | Decimal | Optional |
| `created_at` | Timestamp | Created time |
| `updated_at` | Timestamp | Updated time |

### `news_items`
Stores normalized news, announcements, policy releases, and verified public statements.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `source` | Text | Provider/source name |
| `source_url` | Text | Attribution link when available |
| `title` | Text | Original or translated title |
| `summary` | Text | Short summary |
| `market` | Text | Related market |
| `related_tickers` | JSON | Array of tickers |
| `related_industries` | JSON | Array of industries |
| `importance_score` | Integer | 0-100 |
| `source_credibility_score` | Integer | 0-100 source credibility reference |
| `importance_breakdown` | JSON | Explainable scoring inputs and formula |
| `duplicate_group_key` | Text | Normalized duplicate-news group key |
| `duplicate_ids` | JSON | Original fixture/provider ids merged into this record |
| `raw_source_refs` | JSON | Source references preserved for audit and attribution |
| `source_count` | Integer | Number of sources merged into the record |
| `score_version` | Text | News importance scoring version |
| `deduplication_version` | Text | Duplicate-merge logic version |
| `review_status` | Text | `unreviewed`, `reviewed`, `rejected` |
| `reviewed_by` | UUID | Nullable reviewer user id |
| `reviewed_at` | Timestamp | Human review time |
| `sentiment` | Text | `positive`, `neutral`, `negative`, `mixed` |
| `published_at` | Timestamp | Source publish time |
| `ingested_at` | Timestamp | System ingest time |

### `analysis_results`
Stores model-reference analysis outputs.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Nullable for anonymous sessions |
| `market` | Text | Market id |
| `code` | Text | Stock code |
| `risk_profile` | Text | User-selected profile |
| `upside_probability` | Integer | 0-100 model reference |
| `downside_probability` | Integer | 0-100 model reference |
| `sentiment_score` | Integer | 0-100 |
| `valuation_score` | Integer | 0-100 |
| `technical_score` | Integer | 0-100 |
| `action_reference` | Text | Cautious wording only |
| `reasons` | JSON | List of reasons |
| `risks` | JSON | List of risks |
| `source_refs` | JSON | News/data references |
| `model_version` | Text | AI model or analysis engine version |
| `generated_at` | Timestamp | Generation time |

### `notification_preferences`
Stores user-approved channels.

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | UUID | Primary key, foreign key |
| `in_app` | Boolean | Webpage/local notification permission |
| `email` | Boolean | Email permission |
| `sms` | Boolean | SMS permission |
| `wechat` | Boolean | WeChat permission |
| `telegram` | Boolean | Telegram permission |
| `updated_at` | Timestamp | Update time |

### `reminder_rules`
Stores watchlist/news/price reminder rules.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key |
| `market` | Text | Optional |
| `code` | Text | Optional |
| `rule_type` | Text | `news`, `price`, `risk`, `analysis` |
| `threshold` | JSON | Rule parameters |
| `channels` | JSON | Authorized delivery channels |
| `enabled` | Boolean | Active flag |
| `created_at` | Timestamp | Created time |
| `updated_at` | Timestamp | Updated time |

### `notification_outbox`
Stores queued/read notification records generated from triggered reminder rules. Production delivery workers can consume this table for webpage/local, email, SMS, WeChat, or Telegram channels.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key |
| `rule_id` | UUID | Related reminder rule |
| `market` | Text | Optional |
| `code` | Text | Optional ticker |
| `channel` | Text | `inApp`, `email`, `sms`, `wechat`, `telegram` |
| `status` | Text | `queued`, `sent`, `failed`, `read` |
| `title` | Text | User-facing title |
| `body` | Text | User-facing safe message |
| `observed_value` | Decimal | Trigger value |
| `threshold` | Decimal | Rule threshold |
| `created_at` | Timestamp | Queue time |
| `sent_at` | Timestamp | Optional |
| `read_at` | Timestamp | Optional |

### `audit_logs`
Stores security, analysis, data-source, and notification events.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Nullable |
| `event_type` | Text | Event name |
| `severity` | Text | `info`, `warning`, `error` |
| `message` | Text | Safe, non-sensitive details |
| `metadata` | JSON | No secrets |
| `created_at` | Timestamp | Event time |

### `job_runs`
Stores scheduled and manually triggered backend job executions.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user_id` | UUID | Nullable for system jobs |
| `job_type` | Text | `reminderEvaluation`, ingestion jobs, etc. |
| `status` | Text | `success`, `failed`, `running` |
| `started_at` | Timestamp | Start time |
| `finished_at` | Timestamp | Finish time |
| `summary` | JSON | Safe counters, no secrets |
| `error_message` | Text | Redacted failure reason |

## Privacy And Compliance / 隐私与合规
- Portfolio data is optional and sensitive.
- Never log secrets, raw tokens, or private portfolio details in plain error logs.
- Analysis outputs must retain generated timestamp, model version, and source references when possible.
- Probability fields are model references, not promises or guarantees.
