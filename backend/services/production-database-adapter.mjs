import { createProductionPostgresRepositoryAdapter } from "../repositories/production-postgres-repository-adapter.mjs";

const defaultMigrationSteps = [
  "configureConnection",
  "runSchemaMigrations",
  "verifyRepositoryContract",
  "enableBackups",
  "enableEncryption",
  "switchRepositoryAdapter",
];

const migrationPackageVersion = "2026.06.01.001_initial_schema";
const migrationPackageGeneratedAt = "2026-06-01T00:00:00+10:00";

const schemaDependencies = {
  users: [],
  auth_role_grants: ["users"],
  auth_role_events: ["users", "auth_role_grants"],
  news_items: ["users"],
  compliance_acknowledgements: ["users"],
  suitability_questionnaires: ["users"],
  job_runs: [],
  auth_sessions: ["users"],
  watchlist_items: ["users"],
  user_preferences: ["users"],
  portfolio_positions: ["users"],
  analysis_results: ["users"],
  reminder_rules: ["users"],
  notification_outbox: ["users", "reminder_rules"],
  audit_archive_receipts: ["users"],
  audit_events: ["users"],
  queued_jobs: ["users"],
  dead_letter_jobs: ["users"],
  worker_heartbeats: ["users"],
  worker_request_nonces: ["users"],
};

const fallbackTableOrder = [
  "users",
  "auth_role_grants",
  "auth_role_events",
  "auth_sessions",
  "user_preferences",
  "watchlist_items",
  "portfolio_positions",
  "news_items",
  "compliance_acknowledgements",
  "suitability_questionnaires",
  "analysis_results",
  "reminder_rules",
  "notification_outbox",
  "audit_archive_receipts",
  "job_runs",
  "queued_jobs",
  "dead_letter_jobs",
  "worker_heartbeats",
  "worker_request_nonces",
  "audit_events",
];

const postgresTableDefinitions = {
  users: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "email TEXT UNIQUE",
    "display_name TEXT",
    "risk_profile TEXT NOT NULL DEFAULT 'balanced'",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  auth_sessions: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "token_hash TEXT NOT NULL UNIQUE",
    "expires_at TIMESTAMPTZ NOT NULL",
    "revoked_at TIMESTAMPTZ",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  auth_role_grants: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "role TEXT NOT NULL",
    "status TEXT NOT NULL DEFAULT 'active'",
    "granted_by UUID REFERENCES users(id) ON DELETE SET NULL",
    "granted_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "expires_at TIMESTAMPTZ",
    "revoked_at TIMESTAMPTZ",
    "source TEXT NOT NULL DEFAULT 'admin-panel'",
    "metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
    "UNIQUE (user_id, role)",
  ],
  auth_role_events: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "target_user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "role_grant_id UUID REFERENCES auth_role_grants(id) ON DELETE SET NULL",
    "event_type TEXT NOT NULL",
    "roles JSONB NOT NULL DEFAULT '[]'::jsonb",
    "metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  user_preferences: [
    "user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE",
    "risk_profile TEXT NOT NULL DEFAULT 'balanced'",
    "notifications JSONB NOT NULL DEFAULT '{}'::jsonb",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  watchlist_items: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "market TEXT NOT NULL",
    "code TEXT NOT NULL",
    "name TEXT",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "UNIQUE (user_id, market, code)",
  ],
  portfolio_positions: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "market TEXT NOT NULL",
    "code TEXT NOT NULL",
    "name TEXT",
    "buy_price NUMERIC(18, 4)",
    "quantity NUMERIC(18, 4)",
    "target_return_percent NUMERIC(8, 4)",
    "max_loss_percent NUMERIC(8, 4)",
    "notes TEXT",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "UNIQUE (user_id, market, code)",
  ],
  news_items: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "source TEXT NOT NULL",
    "source_url TEXT",
    "title TEXT NOT NULL",
    "summary TEXT",
    "market TEXT",
    "related_tickers JSONB NOT NULL DEFAULT '[]'::jsonb",
    "related_industries JSONB NOT NULL DEFAULT '[]'::jsonb",
    "importance_score INTEGER NOT NULL DEFAULT 0",
    "source_credibility_score INTEGER NOT NULL DEFAULT 0",
    "importance_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb",
    "duplicate_group_key TEXT",
    "duplicate_ids JSONB NOT NULL DEFAULT '[]'::jsonb",
    "raw_source_refs JSONB NOT NULL DEFAULT '[]'::jsonb",
    "source_count INTEGER NOT NULL DEFAULT 1",
    "score_version TEXT",
    "deduplication_version TEXT",
    "review_status TEXT NOT NULL DEFAULT 'unreviewed'",
    "reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL",
    "reviewed_at TIMESTAMPTZ",
    "sentiment TEXT NOT NULL DEFAULT 'neutral'",
    "published_at TIMESTAMPTZ",
    "ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  compliance_acknowledgements: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "version TEXT NOT NULL",
    "accepted_disclaimer BOOLEAN NOT NULL DEFAULT false",
    "risk_acknowledged BOOLEAN NOT NULL DEFAULT false",
    "optional_portfolio_notice_acknowledged BOOLEAN NOT NULL DEFAULT false",
    "source TEXT NOT NULL DEFAULT 'settings-panel'",
    "disclosure_text TEXT",
    "accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  suitability_questionnaires: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "version TEXT NOT NULL",
    "answers JSONB NOT NULL DEFAULT '{}'::jsonb",
    "score INTEGER NOT NULL DEFAULT 0",
    "suitability_level TEXT NOT NULL DEFAULT 'balanced'",
    "completed_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  analysis_results: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "market TEXT NOT NULL",
    "code TEXT NOT NULL",
    "risk_profile TEXT NOT NULL DEFAULT 'balanced'",
    "upside_probability INTEGER NOT NULL",
    "downside_probability INTEGER NOT NULL",
    "sentiment_score INTEGER NOT NULL",
    "valuation_score INTEGER NOT NULL",
    "technical_score INTEGER NOT NULL",
    "action_reference TEXT",
    "reasons JSONB NOT NULL DEFAULT '[]'::jsonb",
    "risks JSONB NOT NULL DEFAULT '[]'::jsonb",
    "source_refs JSONB NOT NULL DEFAULT '[]'::jsonb",
    "model_version TEXT",
    "generated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  reminder_rules: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "market TEXT",
    "code TEXT",
    "rule_type TEXT NOT NULL",
    "threshold JSONB NOT NULL DEFAULT '{}'::jsonb",
    "channels JSONB NOT NULL DEFAULT '[]'::jsonb",
    "enabled BOOLEAN NOT NULL DEFAULT true",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
  notification_outbox: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    "rule_id UUID REFERENCES reminder_rules(id) ON DELETE SET NULL",
    "market TEXT",
    "code TEXT",
    "channel TEXT NOT NULL",
    "status TEXT NOT NULL DEFAULT 'queued'",
    "delivery_status TEXT NOT NULL DEFAULT 'queued'",
    "attempt_count INTEGER NOT NULL DEFAULT 0",
    "title TEXT NOT NULL",
    "body TEXT NOT NULL",
    "observed_value NUMERIC(18, 4)",
    "threshold NUMERIC(18, 4)",
    "error_message TEXT",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "sent_at TIMESTAMPTZ",
    "read_at TIMESTAMPTZ",
  ],
  audit_archive_receipts: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "export_id TEXT NOT NULL",
    "status TEXT NOT NULL",
    "accepted BOOLEAN NOT NULL DEFAULT false",
    "archive_mode TEXT NOT NULL DEFAULT 'sample-receipt-only'",
    "immutable BOOLEAN NOT NULL DEFAULT false",
    "checksum_algorithm TEXT NOT NULL",
    "package_checksum TEXT NOT NULL",
    "event_count INTEGER NOT NULL DEFAULT 0",
    "signature_status TEXT NOT NULL",
    "verification_status TEXT NOT NULL",
    "reasons JSONB NOT NULL DEFAULT '[]'::jsonb",
    "archived_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "disclaimer TEXT",
  ],
  job_runs: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "job_type TEXT NOT NULL",
    "status TEXT NOT NULL",
    "started_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "finished_at TIMESTAMPTZ",
    "summary JSONB NOT NULL DEFAULT '{}'::jsonb",
    "error_message TEXT",
  ],
  queued_jobs: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "job_type TEXT NOT NULL",
    "status TEXT NOT NULL DEFAULT 'queued'",
    "priority INTEGER NOT NULL DEFAULT 5",
    "attempts INTEGER NOT NULL DEFAULT 0",
    "max_attempts INTEGER NOT NULL DEFAULT 3",
    "scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now()",
    "next_retry_at TIMESTAMPTZ",
    "payload JSONB NOT NULL DEFAULT '{}'::jsonb",
    "last_error JSONB NOT NULL DEFAULT '{}'::jsonb",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ",
  ],
  dead_letter_jobs: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "schedule_id TEXT",
    "job_type TEXT NOT NULL",
    "status TEXT NOT NULL DEFAULT 'open'",
    "attempts INTEGER NOT NULL DEFAULT 0",
    "max_attempts INTEGER NOT NULL DEFAULT 3",
    "next_retry_at TIMESTAMPTZ",
    "last_error JSONB NOT NULL DEFAULT '{}'::jsonb",
    "payload JSONB NOT NULL DEFAULT '{}'::jsonb",
    "job_run_id UUID REFERENCES job_runs(id) ON DELETE SET NULL",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ",
    "replayed_at TIMESTAMPTZ",
  ],
  worker_heartbeats: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "worker_id TEXT NOT NULL",
    "job_types JSONB NOT NULL DEFAULT '[]'::jsonb",
    "status TEXT NOT NULL DEFAULT 'healthy'",
    "queue_depth INTEGER NOT NULL DEFAULT 0",
    "queue_lag_ms INTEGER NOT NULL DEFAULT 0",
    "last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "updated_at TIMESTAMPTZ",
    "UNIQUE (user_id, worker_id)",
  ],
  worker_request_nonces: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "worker_id TEXT NOT NULL",
    "operation TEXT NOT NULL",
    "nonce TEXT NOT NULL",
    "timestamp TIMESTAMPTZ NOT NULL",
    "expires_at TIMESTAMPTZ NOT NULL",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "UNIQUE (user_id, nonce)",
  ],
  audit_events: [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "user_id UUID REFERENCES users(id) ON DELETE SET NULL",
    "event_type TEXT NOT NULL",
    "severity TEXT NOT NULL DEFAULT 'info'",
    "message TEXT NOT NULL",
    "metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
    "created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
  ],
};

const postgresIndexDefinitions = {
  auth_sessions: ["CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);"],
  auth_role_grants: [
    "CREATE INDEX IF NOT EXISTS idx_auth_role_grants_user_role ON auth_role_grants (user_id, role);",
    "CREATE INDEX IF NOT EXISTS idx_auth_role_grants_status_expiry ON auth_role_grants (status, expires_at);",
    "CREATE INDEX IF NOT EXISTS idx_auth_role_grants_granted_by ON auth_role_grants (granted_by, granted_at DESC);",
  ],
  auth_role_events: [
    "CREATE INDEX IF NOT EXISTS idx_auth_role_events_actor_created ON auth_role_events (actor_user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_auth_role_events_target_created ON auth_role_events (target_user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_auth_role_events_type_created ON auth_role_events (event_type, created_at DESC);",
  ],
  watchlist_items: [
    "CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON watchlist_items (user_id);",
    "CREATE INDEX IF NOT EXISTS idx_watchlist_items_code ON watchlist_items (market, code);",
  ],
  portfolio_positions: [
    "CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user_id ON portfolio_positions (user_id);",
  ],
  news_items: [
    "CREATE INDEX IF NOT EXISTS idx_news_items_market_published ON news_items (market, published_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_news_items_duplicate_group ON news_items (duplicate_group_key);",
    "CREATE INDEX IF NOT EXISTS idx_news_items_score_version ON news_items (score_version, ingested_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_news_items_review_status ON news_items (review_status, ingested_at DESC);",
  ],
  compliance_acknowledgements: [
    "CREATE INDEX IF NOT EXISTS idx_compliance_ack_user_version ON compliance_acknowledgements (user_id, version, accepted_at DESC);",
  ],
  suitability_questionnaires: [
    "CREATE INDEX IF NOT EXISTS idx_suitability_user_version ON suitability_questionnaires (user_id, version, completed_at DESC);",
  ],
  analysis_results: [
    "CREATE INDEX IF NOT EXISTS idx_analysis_results_user_generated ON analysis_results (user_id, generated_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_analysis_results_code_generated ON analysis_results (market, code, generated_at DESC);",
  ],
  reminder_rules: ["CREATE INDEX IF NOT EXISTS idx_reminder_rules_user_id ON reminder_rules (user_id);"],
  notification_outbox: [
    "CREATE INDEX IF NOT EXISTS idx_notification_outbox_user_created ON notification_outbox (user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_notification_outbox_delivery ON notification_outbox (delivery_status, created_at);",
  ],
  audit_archive_receipts: [
    "CREATE INDEX IF NOT EXISTS idx_audit_archive_receipts_user_archived ON audit_archive_receipts (user_id, archived_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_audit_archive_receipts_export ON audit_archive_receipts (export_id);",
    "CREATE INDEX IF NOT EXISTS idx_audit_archive_receipts_checksum ON audit_archive_receipts (package_checksum);",
  ],
  job_runs: ["CREATE INDEX IF NOT EXISTS idx_job_runs_type_started ON job_runs (job_type, started_at DESC);"],
  queued_jobs: [
    "CREATE INDEX IF NOT EXISTS idx_queued_jobs_user_status ON queued_jobs (user_id, status, scheduled_for DESC);",
    "CREATE INDEX IF NOT EXISTS idx_queued_jobs_due ON queued_jobs (status, scheduled_for, priority DESC);",
    "CREATE INDEX IF NOT EXISTS idx_queued_jobs_retry ON queued_jobs (status, next_retry_at);",
  ],
  dead_letter_jobs: [
    "CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_user_status ON dead_letter_jobs (user_id, status, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_retry ON dead_letter_jobs (status, next_retry_at);",
  ],
  worker_heartbeats: [
    "CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_user_seen ON worker_heartbeats (user_id, last_seen_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status_seen ON worker_heartbeats (status, last_seen_at DESC);",
  ],
  worker_request_nonces: [
    "CREATE INDEX IF NOT EXISTS idx_worker_request_nonces_user_created ON worker_request_nonces (user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_worker_request_nonces_worker_operation ON worker_request_nonces (worker_id, operation, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_worker_request_nonces_expires ON worker_request_nonces (expires_at);",
  ],
  audit_events: [
    "CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON audit_events (user_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_audit_events_type_created ON audit_events (event_type, created_at DESC);",
  ],
};

function redactConnectionUrl(url = "") {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = "configured";
    if (parsed.password) parsed.password = "redacted";
    return parsed.toString();
  } catch {
    return "configured";
  }
}

function readEnvConfig(env = {}) {
  return {
    provider: env.FINANCE_AI_DB_PROVIDER || "postgres",
    databaseUrl: env.FINANCE_AI_DATABASE_URL || env.FINANCE_AI_DB_URL || "",
    sslMode: env.FINANCE_AI_DB_SSL || "required",
    migrationMode: env.FINANCE_AI_DB_MIGRATION_MODE || "manual",
    driverPackage: env.FINANCE_AI_DB_DRIVER || "pg",
    driverAvailable: env.FINANCE_AI_DB_DRIVER_AVAILABLE === "true",
    readOnlyProbeEnabled: env.FINANCE_AI_DB_READONLY_PROBE === "true",
    readOnlyRehearsalEnabled: env.FINANCE_AI_DB_READ_REHEARSAL === "true",
    parityVerificationEnabled: env.FINANCE_AI_DB_PARITY_VERIFICATION === "true",
    dualWriteRehearsalEnabled: env.FINANCE_AI_DB_DUAL_WRITE_REHEARSAL === "true",
    backupRestoreVerified: env.FINANCE_AI_DB_BACKUP_RESTORE_VERIFIED === "true",
    cutoverMonitoringVerified: env.FINANCE_AI_DB_CUTOVER_MONITORING_VERIFIED === "true",
    rollbackRehearsalVerified: env.FINANCE_AI_DB_ROLLBACK_REHEARSAL_VERIFIED === "true",
    cutoverAuditTrailVerified: env.FINANCE_AI_DB_CUTOVER_AUDIT_TRAIL_VERIFIED === "true",
    cutoverApproved: env.FINANCE_AI_DB_CUTOVER_APPROVED === "true",
    kmsProvider: env.FINANCE_AI_DB_KMS_PROVIDER || "",
    kmsKeyId: env.FINANCE_AI_DB_KMS_KEY_ID || "",
    encryptionAtRestReady: env.FINANCE_AI_DB_ENCRYPTION_AT_REST_READY === "true",
    fieldEncryptionReady: env.FINANCE_AI_DB_FIELD_ENCRYPTION_READY === "true",
    keyRotationReady: env.FINANCE_AI_DB_KEY_ROTATION_READY === "true",
    backupEncryptionReady: env.FINANCE_AI_DB_BACKUP_ENCRYPTION_READY === "true",
    leastPrivilegeReady: env.FINANCE_AI_DB_LEAST_PRIVILEGE_READY === "true",
    rowLevelSecurityReady: env.FINANCE_AI_DB_RLS_READY === "true",
    serviceRoleAuditReady: env.FINANCE_AI_DB_SERVICE_ROLE_AUDIT_READY === "true",
    adminApprovalReady: env.FINANCE_AI_DB_ADMIN_APPROVAL_READY === "true",
    retentionPolicyReady: env.FINANCE_AI_DB_RETENTION_POLICY_READY === "true",
    erasureWorkflowReady: env.FINANCE_AI_DB_ERASURE_WORKFLOW_READY === "true",
    subjectExportReady: env.FINANCE_AI_DB_SUBJECT_EXPORT_READY === "true",
    privacyAuditReady: env.FINANCE_AI_DB_PRIVACY_AUDIT_READY === "true",
    legalHoldReady: env.FINANCE_AI_DB_LEGAL_HOLD_READY === "true",
    privacyApprovalReady: env.FINANCE_AI_DB_PRIVACY_APPROVAL_READY === "true",
    dataResidencyReady: env.FINANCE_AI_DB_DATA_RESIDENCY_READY === "true",
    crossBorderTransferReady: env.FINANCE_AI_DB_CROSS_BORDER_TRANSFER_READY === "true",
    regionalBackupReady: env.FINANCE_AI_DB_REGIONAL_BACKUP_READY === "true",
    subprocessorReviewReady: env.FINANCE_AI_DB_SUBPROCESSOR_REVIEW_READY === "true",
    residencyApprovalReady: env.FINANCE_AI_DB_RESIDENCY_APPROVAL_READY === "true",
  };
}

function uniqueStrings(values = []) {
  return [
    ...new Set(
      values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()),
    ),
  ];
}

function plannedTablesFromContract(repositoryContract = {}, extraTables = []) {
  const mappedTables = Array.isArray(repositoryContract.tableMappings)
    ? repositoryContract.tableMappings
        .filter((mapping) => mapping && typeof mapping.table === "string")
        .map((mapping) => mapping.table)
    : [];
  return uniqueStrings([...mappedTables, ...extraTables]);
}

function sortTablesByDependency(tables = []) {
  const tableSet = new Set(tables);
  const priority = new Map(fallbackTableOrder.map((table, index) => [table, index]));
  const sorted = [];
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function visit(table, path = []) {
    if (visited.has(table)) return;
    if (visiting.has(table)) {
      cycles.push([...path, table]);
      return;
    }

    visiting.add(table);
    const dependencies = (schemaDependencies[table] || []).filter((dependency) =>
      tableSet.has(dependency),
    );
    dependencies.forEach((dependency) => visit(dependency, [...path, table]));
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }

  [...tableSet]
    .sort((left, right) => (priority.get(left) ?? 999) - (priority.get(right) ?? 999))
    .forEach((table) => visit(table));

  return { tableOrder: sorted, cycles };
}

function domainsByTable(repositoryContract = {}) {
  const mapping = {};
  const tableMappings = Array.isArray(repositoryContract.tableMappings)
    ? repositoryContract.tableMappings
    : [];
  tableMappings.forEach((entry) => {
    if (!entry || typeof entry.table !== "string" || typeof entry.domain !== "string") return;
    mapping[entry.table] = [...(mapping[entry.table] || []), entry.domain];
  });
  return mapping;
}

function createSimpleChecksum(text = "") {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createTableStatement(table) {
  const columns = postgresTableDefinitions[table];
  if (!columns) return "";
  return `CREATE TABLE IF NOT EXISTS ${table} (\n  ${columns.join(",\n  ")}\n);`;
}

function createMigrationSqlDraftFromDryRun(dryRun = {}) {
  const tableOrder = Array.isArray(dryRun.tableOrder) ? dryRun.tableOrder : [];
  const createStatements = tableOrder.map(createTableStatement).filter(Boolean);
  const indexStatements = tableOrder.flatMap((table) => postgresIndexDefinitions[table] || []);
  const statements = ["CREATE EXTENSION IF NOT EXISTS pgcrypto;", ...createStatements, ...indexStatements];
  const missingDefinitions = tableOrder.filter((table) => !postgresTableDefinitions[table]);
  const warnings = [
    "SQL 草案仅供代码审查和迁移工具接入，不会自动执行。",
    "正式执行前必须由迁移工具记录版本，并在测试数据库完成回滚演练。",
    ...missingDefinitions.map((table) => `缺少 ${table} 的 PostgreSQL 表定义。`),
  ];
  const sql = statements.join("\n\n");

  return {
    id: "production-db-sql-draft-001",
    dialect: "postgresql",
    status: missingDefinitions.length ? "blocked" : "generated",
    destructive: false,
    reviewRequired: true,
    statementCount: statements.length,
    checksum: createSimpleChecksum(sql),
    statements,
    preview: statements.slice(0, 3),
    warnings,
    disclaimer:
      "SQL 迁移草案只用于审查和后续迁移工具接入；当前不会连接数据库，也不会执行任何 SQL。",
  };
}

function createMigrationPreflight({ connection, repositoryContract, dryRun, sqlDraft }) {
  const contractReady = repositoryContract.status === "pass";
  const sqlReady = sqlDraft.status === "generated" && sqlDraft.destructive === false;
  return [
    {
      id: "connectionConfig",
      label: "Connection config",
      status: connection.configured ? "pass" : "blocked",
      requiredForExecution: true,
      message: connection.configured
        ? "生产数据库连接配置已提供，但尚未验证真实连接。"
        : "缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。",
    },
    {
      id: "repositoryContract",
      label: "Repository contract",
      status: contractReady ? "pass" : "blocked",
      requiredForExecution: true,
      message: contractReady
        ? "仓储接口契约已通过。"
        : "仓储接口契约未通过，不能安全切换生产数据库。",
    },
    {
      id: "sqlDraft",
      label: "SQL draft",
      status: sqlReady ? "pass" : "blocked",
      requiredForExecution: true,
      message: sqlReady
        ? "SQL 草案已生成且未标记为破坏性迁移。"
        : "SQL 草案缺失、被阻断或包含破坏性风险。",
    },
    {
      id: "dryRunBlockers",
      label: "Dry-run blockers",
      status: dryRun.blockedReasons.length ? "blocked" : "pass",
      requiredForExecution: true,
      message: dryRun.blockedReasons.length
        ? dryRun.blockedReasons.join(" / ")
        : "迁移预演未返回阻断项。",
    },
    {
      id: "backupPlan",
      label: "Backup plan",
      status: "pending",
      requiredForExecution: true,
      message: "正式执行前必须完成生产数据库备份方案和恢复演练。",
    },
    {
      id: "rollbackDrill",
      label: "Rollback drill",
      status: "pending",
      requiredForExecution: true,
      message: "正式执行前必须在测试数据库完成回滚演练。",
    },
    {
      id: "migrationTool",
      label: "Migration tool",
      status: "pending",
      requiredForExecution: true,
      message: "需要接入版本化迁移工具记录执行历史，不能直接手动运行草案 SQL。",
    },
    {
      id: "liveConnection",
      label: "Live connection",
      status: "blocked",
      requiredForExecution: true,
      message: "当前骨架未加载真实数据库驱动，不能验证生产连接或执行迁移。",
    },
    {
      id: "humanApproval",
      label: "Human approval",
      status: "pending",
      requiredForExecution: true,
      message: "需要人工审查 SQL 草案、风险和回滚方案后才能执行。",
    },
  ];
}

function createMigrationPackage({ connection, repositoryContract, dryRun, sqlDraft }) {
  const preflightChecks = createMigrationPreflight({
    connection,
    repositoryContract,
    dryRun,
    sqlDraft,
  });
  const blockedChecks = preflightChecks.filter((check) => check.status === "blocked");
  const pendingChecks = preflightChecks.filter((check) => check.status === "pending");
  const manifest = {
    repositoryContractVersion: repositoryContract.version || "",
    sqlDraftId: sqlDraft.id,
    sqlDraftChecksum: sqlDraft.checksum,
    tableCount: dryRun.tableOrder.length,
    statementCount: sqlDraft.statementCount,
    destructive: sqlDraft.destructive,
    reviewRequired: sqlDraft.reviewRequired,
  };
  const manifestChecksum = createSimpleChecksum(JSON.stringify(manifest));

  return {
    id: "production-db-migration-package-001",
    version: migrationPackageVersion,
    generatedAt: migrationPackageGeneratedAt,
    status: blockedChecks.length ? "blocked" : pendingChecks.length ? "review-required" : "ready",
    canExecute: false,
    executionMode: "review-only",
    targetDialect: sqlDraft.dialect,
    manifest,
    manifestChecksum,
    preflightChecks,
    blockedReasons: blockedChecks.map((check) => check.message),
    pendingApprovals: pendingChecks.map((check) => check.id),
    releaseGates: [
      "真实数据库连接已验证",
      "迁移工具已接入并记录版本",
      "备份恢复演练已通过",
      "回滚演练已通过",
      "SQL 草案已人工审查批准",
    ],
    disclaimer:
      "迁移包当前仅用于审查和上线前检查；canExecute=false，不能直接执行生产数据库迁移。",
  };
}

function createReadOnlyConnectionHealth({ connection, repositoryContract, adapterConfig }) {
  const driverPackage = adapterConfig.driverPackage || "pg";
  const driverAvailable = adapterConfig.driverAvailable === true;
  const readOnlyProbeEnabled = adapterConfig.readOnlyProbeEnabled === true;
  const contractReady = repositoryContract.status === "pass";
  const blockedReasons = [];
  const warnings = [
    "当前只读健康检查默认不发起真实网络连接，也不会执行 SQL。",
    "正式连接探测必须使用只读事务或只读账号，并禁止任何 INSERT/UPDATE/DELETE/DDL。",
  ];

  if (!connection.configured) {
    blockedReasons.push("缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。");
  }
  if (!driverAvailable) {
    blockedReasons.push(`数据库驱动 ${driverPackage} 尚未安装或未标记可用。`);
  }
  if (!contractReady) {
    blockedReasons.push("仓储接口契约未通过，不能进入真实数据库连接阶段。");
  }

  const checks = [
    {
      id: "connectionConfig",
      status: connection.configured ? "pass" : "blocked",
      message: connection.configured ? "生产数据库连接配置已提供。" : "生产数据库连接配置缺失。",
    },
    {
      id: "driverAvailability",
      status: driverAvailable ? "pass" : "blocked",
      message: driverAvailable
        ? `数据库驱动 ${driverPackage} 已标记可用。`
        : `数据库驱动 ${driverPackage} 尚未可用。`,
    },
    {
      id: "repositoryContract",
      status: contractReady ? "pass" : "blocked",
      message: contractReady ? "仓储接口契约已通过。" : "仓储接口契约未通过。",
    },
    {
      id: "readOnlyGuard",
      status: "pass",
      message: "只允许 SELECT/SHOW/SET TRANSACTION READ ONLY 类探测语句。",
    },
    {
      id: "networkProbe",
      status: readOnlyProbeEnabled && !blockedReasons.length ? "ready" : "skipped",
      message: readOnlyProbeEnabled
        ? "只读探测已显式开启；接入真实驱动后可执行只读探测。"
        : "未设置 FINANCE_AI_DB_READONLY_PROBE=true，本轮不会发起网络探测。",
    },
  ];

  return {
    id: "production-db-readonly-health",
    mode: "read-only-health",
    status: blockedReasons.length
      ? "blocked"
      : readOnlyProbeEnabled
        ? "ready-for-readonly-probe"
        : "probe-disabled",
    provider: connection.provider,
    driver: {
      package: driverPackage,
      available: driverAvailable,
      source: driverAvailable ? "configured" : "not-installed",
    },
    connection: {
      configured: connection.configured,
      status: connection.status,
      redactedUrl: connection.redactedUrl,
      sslMode: connection.sslMode,
    },
    safety: {
      readOnlyOnly: true,
      canWrite: false,
      canMigrate: false,
      allowedStatements: ["SELECT 1", "SHOW transaction_read_only", "SET TRANSACTION READ ONLY"],
      blockedStatements: ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"],
    },
    checks,
    blockedReasons,
    warnings,
    nextSteps: [
      "安装并锁定生产数据库驱动版本。",
      "使用只读数据库账号或只读事务执行连接探测。",
      "记录连接探测审计事件，但不要记录密钥或完整连接串。",
      "只在备份、回滚和审批完成后再考虑迁移执行。",
    ],
    disclaimer:
      "只读连接健康检查仅用于上线前准备；当前不会写入数据库，也不会代表生产数据库已经接入。",
  };
}

function createDriverSetupPlan({ connection, adapterConfig, readOnlyHealth }) {
  const driverPackage = adapterConfig.driverPackage || "pg";
  const driverAvailable = adapterConfig.driverAvailable === true;
  const readOnlyProbeEnabled = adapterConfig.readOnlyProbeEnabled === true;
  const envVars = [
    {
      name: "FINANCE_AI_DATABASE_URL",
      required: true,
      configured: connection.configured,
      secret: true,
      purpose: "生产 PostgreSQL/Supabase 连接串。",
    },
    {
      name: "FINANCE_AI_DB_SSL",
      required: true,
      configured: Boolean(adapterConfig.sslMode),
      secret: false,
      value: adapterConfig.sslMode || "required",
      purpose: "SSL 连接策略；生产默认 required。",
    },
    {
      name: "FINANCE_AI_DB_DRIVER",
      required: true,
      configured: Boolean(driverPackage),
      secret: false,
      value: driverPackage,
      purpose: "数据库驱动包名；当前计划使用 pg。",
    },
    {
      name: "FINANCE_AI_DB_DRIVER_AVAILABLE",
      required: true,
      configured: driverAvailable,
      secret: false,
      value: String(driverAvailable),
      purpose: "驱动安装并完成安全审查后才可标记 true。",
    },
    {
      name: "FINANCE_AI_DB_READONLY_PROBE",
      required: false,
      configured: readOnlyProbeEnabled,
      secret: false,
      value: String(readOnlyProbeEnabled),
      purpose: "显式允许只读连接探测；默认 false。",
    },
  ];
  const blockedReasons = [];
  if (!connection.configured) blockedReasons.push("缺少生产数据库连接串。");
  if (!driverAvailable) blockedReasons.push(`驱动 ${driverPackage} 尚未安装或未通过可用性标记。`);
  if (!readOnlyProbeEnabled) blockedReasons.push("只读探测开关未开启；默认不应联网探测。");

  return {
    id: "production-db-driver-setup-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-readonly-probe",
    targetDriver: driverPackage,
    packageManager: "npm-or-future-backend-package-manager",
    installCommand: `npm install ${driverPackage}`,
    canInstallAutomatically: false,
    canConnectAutomatically: false,
    envVars,
    configChecks: [
      {
        id: "databaseUrl",
        status: connection.configured ? "pass" : "blocked",
      },
      {
        id: "driverReviewed",
        status: driverAvailable ? "pass" : "blocked",
      },
      {
        id: "readOnlyProbeOptIn",
        status: readOnlyProbeEnabled ? "pass" : "pending",
      },
      {
        id: "readOnlyHealth",
        status: readOnlyHealth.status,
      },
    ],
    smokeOrder: [
      "configRedaction",
      "driverAvailability",
      "readOnlyGuard",
      "readOnlyHealthPreflight",
      "repositoryContract",
      "manualCutoverGate",
    ],
    secretBoundary: {
      redactsConnectionUrl: true,
      canReadDatabaseSecrets: false,
      canWriteEnvFile: false,
      canPrintRawConnectionString: false,
      forbiddenAuditFields: [
        "databaseUrl",
        "rawConnectionString",
        "password",
        "token",
        "sslCertificatePrivateKey",
      ],
    },
    secretPolicy: [
      "不得提交 .env 或真实数据库连接串。",
      "日志和状态接口只能显示脱敏后的连接串。",
      "连接探测审计事件不得记录密码、token、完整 URL 或用户持仓数据。",
    ],
    blockedReasons,
    nextSteps: [
      "选择生产数据库供应商并创建只读探测账号。",
      "在后端依赖管理确定后安装并锁定 pg 版本。",
      "配置 FINANCE_AI_DATABASE_URL 与 SSL 策略。",
      "通过只读健康检查后，再实现生产 repository adapter。",
    ],
    disclaimer:
      "驱动接入计划只用于准备工作；当前不会安装依赖、不会联网、不会连接数据库。",
  };
}

function createRepositoryAdapterPlan({ connection, repositoryContract, dryRun, readOnlyHealth, setupPlan }) {
  const tableMappings = Array.isArray(repositoryContract.tableMappings)
    ? repositoryContract.tableMappings
    : [];
  const requiredMethods = Array.isArray(repositoryContract.requiredMethods)
    ? repositoryContract.requiredMethods
    : [];
  const missingMethods = Array.isArray(repositoryContract.missingMethods)
    ? repositoryContract.missingMethods
    : [];
  const tableOrder = Array.isArray(dryRun.tableOrder) ? dryRun.tableOrder : [];
  const migrationReady = dryRun.status === "ready-for-driver" && !dryRun.blockedReasons.length;
  const readOnlyReady = readOnlyHealth.status === "ready-for-readonly-probe";
  const driverReady = setupPlan.status === "ready-for-readonly-probe";
  const contractReady = repositoryContract.status === "pass";
  const switchGates = [
    {
      id: "repositoryContract",
      status: contractReady ? "pass" : "blocked",
      required: true,
      message: contractReady
        ? "仓储接口契约已通过。"
        : "仓储接口契约未通过，不能替换 mock repository。",
    },
    {
      id: "productionTables",
      status: tableOrder.length ? "pass" : "blocked",
      required: true,
      message: tableOrder.length
        ? `已规划 ${tableOrder.length} 张生产表。`
        : "未返回生产表迁移顺序。",
    },
    {
      id: "migrationDryRun",
      status: migrationReady ? "pass" : "blocked",
      required: true,
      message: migrationReady
        ? "迁移预演已准备好等待驱动接入。"
        : "迁移预演仍有阻断项，不能切换生产仓储。",
    },
    {
      id: "readOnlyConnection",
      status: readOnlyReady ? "pass" : "blocked",
      required: true,
      message: readOnlyReady
        ? "只读连接检查已准备好。"
        : "只读连接检查未准备好，不能验证生产仓储。",
    },
    {
      id: "driverSetup",
      status: driverReady ? "pass" : "blocked",
      required: true,
      message: driverReady
        ? "数据库驱动和只读探测配置已准备好。"
        : "数据库驱动或只读探测配置仍未准备好。",
    },
    {
      id: "methodParity",
      status: missingMethods.length ? "blocked" : "pass",
      required: true,
      message: missingMethods.length
        ? `仍缺少 ${missingMethods.length} 个仓储方法。`
        : `生产仓储必须实现 ${requiredMethods.length} 个方法。`,
    },
    {
      id: "fallbackPlan",
      status: "pass",
      required: true,
      message: "切换初期必须保留 mock/JSON repository 回退路径和只读 smoke test。",
    },
    {
      id: "humanApproval",
      status: "pending",
      required: true,
      message: "真实切换前需要人工审批迁移、回滚、备份和权限方案。",
    },
  ];
  const blockedReasons = switchGates
    .filter((gate) => gate.status === "blocked")
    .map((gate) => gate.message);
  const pendingApprovals = switchGates
    .filter((gate) => gate.status === "pending")
    .map((gate) => gate.id);

  return {
    id: "production-repository-adapter-plan",
    status: blockedReasons.length ? "blocked" : "implementation-required",
    targetAdapter: "postgres-repository-adapter",
    runtimeMode: "inactive",
    canSwitchAutomatically: false,
    mockFallbackRequired: true,
    connection: {
      configured: connection.configured,
      provider: connection.provider,
      status: connection.status,
    },
    methodPlan: {
      requiredCount: requiredMethods.length,
      missingCount: missingMethods.length,
      requiredMethods,
      missingMethods,
    },
    dataDomains: tableMappings.map((mapping) => ({
      domain: mapping.domain,
      table: mapping.table,
      methods: Array.isArray(mapping.methods) ? mapping.methods : [],
    })),
    switchGates,
    blockedReasons,
    pendingApprovals,
    implementationSteps: [
      "实现 PostgreSQL repository adapter 并满足 repository contract。",
      "用只读账号完成连接健康检查和最小 SELECT smoke test。",
      "使用迁移工具执行已审批的 SQL 草案并记录版本。",
      "在 staging 环境并行读取 mock repository 与 production repository 的关键数据差异。",
      "生产切换时先保持写入双轨审计，再逐步关闭 mock/JSON 回退。",
    ],
    rollbackPlan: [
      "生产适配器保持 feature flag 关闭直到所有门禁通过。",
      "切换后如果 smoke test 失败，立即回退到 mock/JSON repository。",
      "保留迁移前备份与导出包，禁止自动执行破坏性回滚。",
    ],
    disclaimer:
      "仓储适配器计划只描述生产切换门禁；当前不会连接数据库、不会执行迁移，也不会切换运行时仓储。",
  };
}

function createProductionDatabaseEncryptionPlan({ connection, adapterConfig }) {
  const configuredKms = Boolean(adapterConfig.kmsProvider && adapterConfig.kmsKeyId);
  const checks = [
    { id: "connectionConfig", status: connection.configured ? "pass" : "blocked", required: true },
    { id: "kmsProvider", status: configuredKms ? "pass" : "blocked", required: true },
    {
      id: "encryptionAtRest",
      status: adapterConfig.encryptionAtRestReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "fieldLevelEncryption",
      status: adapterConfig.fieldEncryptionReady ? "pass" : "blocked",
      required: true,
    },
    { id: "keyRotation", status: adapterConfig.keyRotationReady ? "pass" : "blocked", required: true },
    {
      id: "backupEncryption",
      status: adapterConfig.backupEncryptionReady ? "pass" : "blocked",
      required: true,
    },
  ];
  const blockedReasons = [];
  if (!connection.configured) blockedReasons.push("生产数据库连接配置缺失，不能验证静态加密或字段级加密。");
  if (!configuredKms) blockedReasons.push("KMS provider 或 key id 尚未配置。");
  if (!adapterConfig.encryptionAtRestReady) blockedReasons.push("数据库静态加密证明尚未确认。");
  if (!adapterConfig.fieldEncryptionReady) {
    blockedReasons.push("字段级加密字段清单、加密 envelope 和解密边界尚未确认。");
  }
  if (!adapterConfig.keyRotationReady) blockedReasons.push("密钥轮换、旧密钥读取和回滚演练尚未确认。");
  if (!adapterConfig.backupEncryptionReady) {
    blockedReasons.push("备份、导出包和恢复 artifact 的加密证明尚未确认。");
  }

  return {
    id: "production-database-encryption-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-smoke",
    mode: "dry-run-no-key-usage",
    provider: adapterConfig.kmsProvider || "missing",
    keyIdConfigured: Boolean(adapterConfig.kmsKeyId),
    canUseProductionKeys: false,
    protectedDataClasses: [
      "email",
      "portfolioPosition",
      "notificationRecipient",
      "authSessionTokenHash",
      "suitabilityQuestionnaire",
      "auditMetadata",
    ],
    forbiddenAuditFields: [
      "rawKmsKey",
      "plaintextEmail",
      "plaintextPhone",
      "rawPortfolioNotes",
      "rawQuestionnaireText",
    ],
    checks,
    safety: {
      noKeyMaterialInApp: true,
      noAutomaticKeyUse: true,
      requiresEnvelopeEncryption: true,
      requiresRotationRunbook: true,
      requiresEncryptedBackups: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "选择 KMS provider，并把 key id、权限策略和轮换手册纳入部署配置。",
      "确认数据库静态加密、字段级 envelope 加密、备份加密和恢复演练证据。",
      "在 staging 只读 smoke test 中验证密文/脱敏边界，再由人工审批生产启用。",
    ],
    disclaimer:
      "加密计划当前只做配置和门禁展示，不读取真实密钥，不解密用户数据，也不会切换生产数据库。",
  };
}

function createProductionDatabaseAccessControlPlan({ connection, adapterConfig }) {
  const checks = [
    { id: "connectionConfig", status: connection.configured ? "pass" : "blocked", required: true },
    {
      id: "leastPrivilegeRoles",
      status: adapterConfig.leastPrivilegeReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "rowLevelSecurity",
      status: adapterConfig.rowLevelSecurityReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "serviceRoleAudit",
      status: adapterConfig.serviceRoleAuditReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "adminApproval",
      status: adapterConfig.adminApprovalReady ? "pass" : "blocked",
      required: true,
    },
  ];
  const blockedReasons = [];
  if (!connection.configured) {
    blockedReasons.push("生产数据库连接配置缺失，不能验证权限隔离。");
  }
  if (!adapterConfig.leastPrivilegeReady) {
    blockedReasons.push("只读、写入、迁移和审计角色的最小权限尚未确认。");
  }
  if (!adapterConfig.rowLevelSecurityReady) {
    blockedReasons.push("用户级行隔离、RLS 策略和跨用户访问拒绝测试尚未确认。");
  }
  if (!adapterConfig.serviceRoleAuditReady) {
    blockedReasons.push("服务角色使用、特权操作和权限变更审计尚未确认。");
  }
  if (!adapterConfig.adminApprovalReady) {
    blockedReasons.push("生产权限策略和管理员审批流程尚未确认。");
  }

  return {
    id: "production-database-access-control-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-smoke",
    mode: "dry-run-no-permission-change",
    canApplyDatabaseRoles: false,
    requiredRoles: ["readonly_app", "write_app", "migration_runner", "audit_reader"],
    protectedScopes: [
      "user-owned-watchlist",
      "portfolio-positions",
      "notification-outbox",
      "audit-events",
      "auth-role-grants",
    ],
    forbiddenAuditFields: ["rawSql", "rawRoleSecret", "accessToken", "refreshToken"],
    checks,
    safety: {
      noPermissionMutation: true,
      noProductionRoleCreation: true,
      requiresRlsPolicies: true,
      requiresLeastPrivilege: true,
      requiresPrivilegedAudit: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "定义 readonly、write、migration 和 audit 角色，并确认每个 API 只使用必要权限。",
      "为用户数据表设计 RLS/用户隔离策略，并加入跨用户拒绝 smoke test。",
      "把管理员权限变更、服务角色使用和特权查询写入脱敏审计链。",
    ],
    disclaimer:
      "权限控制计划当前只做配置和门禁展示，不创建数据库角色，不修改 RLS，也不会切换生产数据库。",
  };
}

function createProductionDatabasePrivacyRetentionPlan({ connection, adapterConfig }) {
  const checks = [
    { id: "connectionConfig", status: connection.configured ? "pass" : "blocked", required: true },
    {
      id: "retentionPolicy",
      status: adapterConfig.retentionPolicyReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "erasureWorkflow",
      status: adapterConfig.erasureWorkflowReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "subjectExport",
      status: adapterConfig.subjectExportReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "privacyAudit",
      status: adapterConfig.privacyAuditReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "legalHold",
      status: adapterConfig.legalHoldReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "privacyApproval",
      status: adapterConfig.privacyApprovalReady ? "pass" : "blocked",
      required: true,
    },
  ];
  const blockedReasons = [];
  if (!connection.configured) {
    blockedReasons.push("生产数据库连接配置缺失，不能验证隐私删除和数据保留流程。");
  }
  if (!adapterConfig.retentionPolicyReady) {
    blockedReasons.push("用户数据、审计数据、通知数据和分析记录的数据保留策略尚未确认。");
  }
  if (!adapterConfig.erasureWorkflowReady) {
    blockedReasons.push("用户删除请求、级联删除、软删除和异步清理流程尚未确认。");
  }
  if (!adapterConfig.subjectExportReady) {
    blockedReasons.push("用户数据导出、字段清单和导出包脱敏边界尚未确认。");
  }
  if (!adapterConfig.privacyAuditReady) {
    blockedReasons.push("隐私请求、删除证据和保留例外的脱敏审计链尚未确认。");
  }
  if (!adapterConfig.legalHoldReady) {
    blockedReasons.push("法定保留、监管留存和删除豁免流程尚未确认。");
  }
  if (!adapterConfig.privacyApprovalReady) {
    blockedReasons.push("隐私删除/保留策略的人工审批流程尚未确认。");
  }

  return {
    id: "production-database-privacy-retention-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-smoke",
    mode: "dry-run-no-data-erasure",
    canEraseProductionData: false,
    governedDataScopes: [
      "account-profile",
      "auth-sessions",
      "watchlist-items",
      "portfolio-positions",
      "analysis-history",
      "notification-outbox",
      "audit-events",
    ],
    retentionClasses: ["user-requested-delete", "regulatory-retention", "security-audit", "legal-hold"],
    forbiddenAuditFields: [
      "plaintextEmail",
      "plaintextPhone",
      "rawPortfolioNotes",
      "rawNotificationRecipient",
      "rawErasurePayload",
    ],
    checks,
    safety: {
      noAutomaticDeletion: true,
      noHardDeleteWithoutTombstone: true,
      requiresSubjectExport: true,
      requiresLegalHoldCheck: true,
      requiresPrivacyAudit: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "定义各数据域的保留期限、删除例外和用户可导出字段清单。",
      "在 staging 演练用户删除请求、导出包生成、法定保留拦截和审计 tombstone。",
      "由隐私/合规负责人审批后，才允许进入人工 smoke test。",
    ],
    disclaimer:
      "隐私保留计划当前只做配置和门禁展示，不导出真实用户数据，不删除生产记录，也不会切换生产数据库。",
  };
}

function createProductionDatabaseResidencyTransferPlan({ connection, adapterConfig }) {
  const checks = [
    { id: "connectionConfig", status: connection.configured ? "pass" : "blocked", required: true },
    {
      id: "dataResidency",
      status: adapterConfig.dataResidencyReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "crossBorderTransfer",
      status: adapterConfig.crossBorderTransferReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "regionalBackup",
      status: adapterConfig.regionalBackupReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "subprocessorReview",
      status: adapterConfig.subprocessorReviewReady ? "pass" : "blocked",
      required: true,
    },
    {
      id: "residencyApproval",
      status: adapterConfig.residencyApprovalReady ? "pass" : "blocked",
      required: true,
    },
  ];
  const blockedReasons = [];
  if (!connection.configured) {
    blockedReasons.push("生产数据库连接配置缺失，不能验证数据驻留区域。");
  }
  if (!adapterConfig.dataResidencyReady) {
    blockedReasons.push("用户数据主存储区域、备份区域和日志区域尚未确认。");
  }
  if (!adapterConfig.crossBorderTransferReady) {
    blockedReasons.push("跨境传输依据、用户同意、监管披露和传输限制尚未确认。");
  }
  if (!adapterConfig.regionalBackupReady) {
    blockedReasons.push("区域备份、恢复演练和跨区复制边界尚未确认。");
  }
  if (!adapterConfig.subprocessorReviewReady) {
    blockedReasons.push("数据库、云厂商、日志和监控供应商的子处理方清单尚未复核。");
  }
  if (!adapterConfig.residencyApprovalReady) {
    blockedReasons.push("数据驻留和跨境传输策略的人工审批尚未确认。");
  }

  return {
    id: "production-database-residency-transfer-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-smoke",
    mode: "dry-run-no-cross-border-transfer",
    canTransferAcrossRegions: false,
    defaultRegion: "unassigned",
    governedRegions: ["primary-region", "backup-region", "analytics-region", "support-access-region"],
    regulatedDataScopes: [
      "account-profile",
      "portfolio-positions",
      "suitability-questionnaires",
      "notification-recipients",
      "audit-events",
      "analysis-history",
    ],
    forbiddenAuditFields: [
      "rawIpAddress",
      "preciseLocation",
      "plaintextEmail",
      "rawTransferPayload",
      "vendorAccessToken",
    ],
    checks,
    safety: {
      noCrossBorderTransfer: true,
      noRegionalReplicationChange: true,
      requiresUserDisclosure: true,
      requiresSubprocessorReview: true,
      requiresRegionalBackupEvidence: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "确定默认数据驻留区域、备份区域和支持访问区域，并写入部署/隐私文档。",
      "复核跨境传输依据、用户告知/同意文案、子处理方清单和监管披露要求。",
      "在 staging 验证区域备份、恢复演练和审计脱敏证据，再由人工审批。",
    ],
    disclaimer:
      "数据驻留计划当前只做配置和门禁展示，不复制真实数据，不改变备份区域，也不会发起跨境传输。",
  };
}

export function createProductionDatabaseAdapter(config = {}) {
  const envConfig = readEnvConfig(config.env || {});
  const adapterConfig = {
    ...envConfig,
    ...Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== "env" && config[key] !== undefined),
    ),
  };
  const repositoryAdapter = createProductionPostgresRepositoryAdapter(adapterConfig);

  function connectionStatus() {
    const configured = Boolean(adapterConfig.databaseUrl);
    return {
      configured,
      status: configured ? "configured-unverified" : "missing-config",
      provider: adapterConfig.provider || "postgres",
      sslMode: adapterConfig.sslMode || "required",
      redactedUrl: redactConnectionUrl(adapterConfig.databaseUrl),
      message: configured
        ? "生产数据库连接配置已提供，但当前骨架未加载真实数据库驱动，尚未执行网络连接。"
        : "未配置 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL，继续使用 mock/JSON 存储桥。",
    };
  }

  function migrationDryRun(repositoryContract = {}, options = {}) {
    const extraTables = Array.isArray(options.plannedTables) ? options.plannedTables : [];
    const plannedTables = plannedTablesFromContract(repositoryContract, extraTables);
    const { tableOrder, cycles } = sortTablesByDependency(plannedTables);
    const connection = connectionStatus();
    const contractReady = repositoryContract.status === "pass";
    const tableDomains = domainsByTable(repositoryContract);
    const blockedReasons = [];
    const warnings = [
      "dry-run 只生成迁移顺序和检查结果，不会连接数据库，也不会执行 CREATE/ALTER/DROP。",
      "真实上线前仍需接入数据库驱动、迁移工具、备份恢复和回滚演练。",
    ];

    if (!connection.configured) {
      blockedReasons.push("缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。");
    }
    if (!contractReady) {
      blockedReasons.push("仓储接口契约未通过，不能安全切换到生产数据库。");
    }
    if (!tableOrder.length) {
      blockedReasons.push("未发现可迁移的计划表。");
    }
    if (cycles.length) {
      blockedReasons.push("计划表依赖存在循环，需要先修正 schemaDependencies。");
    }

    const unmappedTables = tableOrder.filter((table) => !tableDomains[table]?.length);
    if (unmappedTables.length) {
      warnings.push(`以下计划表暂无仓储域映射：${unmappedTables.join(", ")}。`);
    }

    const steps = [
      {
        id: "validateConnectionConfig",
        status: connection.configured ? "pass" : "blocked",
      },
      {
        id: "validateRepositoryContract",
        status: contractReady ? "pass" : "blocked",
      },
      {
        id: "resolveTableOrder",
        status: tableOrder.length && !cycles.length ? "pass" : "blocked",
      },
      {
        id: "previewSchemaMigrations",
        status: blockedReasons.length ? "pending" : "ready",
      },
      {
        id: "prepareRollbackPlan",
        status: "ready",
      },
      {
        id: "keepMockFallbackActive",
        status: "ready",
      },
    ];

    return {
      id: "production-db-migration-dry-run",
      mode: "dry-run",
      status: blockedReasons.length ? "blocked" : "ready-for-driver",
      provider: connection.provider,
      tableOrder,
      tablePlan: tableOrder.map((table, index) => ({
        order: index + 1,
        table,
        dependsOn: (schemaDependencies[table] || []).filter((dependency) =>
          tableOrder.includes(dependency),
        ),
        domains: tableDomains[table] || [],
        action: "create-or-migrate",
        status: "planned",
      })),
      steps,
      blockedReasons,
      warnings,
      rollbackPlan: [
        "迁移前保留 mock/JSON repository 作为回退路径。",
        "正式执行前先备份生产数据库并记录迁移版本。",
        "如 smoke test 失败，保持生产适配器 inactive 并继续使用当前 repository。",
        "dry-run 不执行 DROP；破坏性迁移必须单独审批。",
      ],
      migrationSqlDraft: createMigrationSqlDraftFromDryRun({ tableOrder }),
      disclaimer:
        "迁移 dry-run 只用于开发规划和上线前检查，不代表真实数据库已经创建或数据已经迁移。",
    };
  }

  function migrationSqlDraft(repositoryContract = {}, options = {}) {
    return migrationDryRun(repositoryContract, options).migrationSqlDraft;
  }

  function migrationPackage(repositoryContract = {}, options = {}) {
    const dryRun = migrationDryRun(repositoryContract, options);
    const connection = connectionStatus();
    const sqlDraft = dryRun.migrationSqlDraft;
    return createMigrationPackage({ connection, repositoryContract, dryRun, sqlDraft });
  }

  function readOnlyConnectionHealth(repositoryContract = {}) {
    const connection = connectionStatus();
    return createReadOnlyConnectionHealth({ connection, repositoryContract, adapterConfig });
  }

  function driverSetupPlan(repositoryContract = {}) {
    const connection = connectionStatus();
    const readOnlyHealth = readOnlyConnectionHealth(repositoryContract);
    return createDriverSetupPlan({ connection, adapterConfig, readOnlyHealth });
  }

  function repositoryAdapterPlan(repositoryContract = {}, options = {}) {
    const connection = connectionStatus();
    const dryRun = migrationDryRun(repositoryContract, {
      plannedTables: options.plannedTables || config.plannedTables,
    });
    const readOnlyHealth = readOnlyConnectionHealth(repositoryContract);
    const setupPlan = driverSetupPlan(repositoryContract);
    return createRepositoryAdapterPlan({
      connection,
      repositoryContract,
      dryRun,
      readOnlyHealth,
      setupPlan,
    });
  }

  function productionRepositoryAdapterStatus(repositoryContract = {}) {
    return repositoryAdapter.status(repositoryContract);
  }

  function productionRepositorySmokeTestPlan(repositoryContract = {}) {
    return repositoryAdapter.readOnlySmokeTestPlan(repositoryContract);
  }

  function productionRepositorySqlContract(repositoryContract = {}) {
    return repositoryAdapter.sqlStatementPlan(repositoryContract);
  }

  function productionRepositoryExecutionPlan(repositoryContract = {}) {
    return repositoryAdapter.executionPlan(repositoryContract);
  }

  function productionRepositoryParameterValidationPlan(repositoryContract = {}) {
    return repositoryAdapter.parameterValidationPlan(repositoryContract);
  }

  function productionRepositoryConnectionPoolPlan(repositoryContract = {}) {
    return repositoryAdapter.connectionPoolPlan(repositoryContract);
  }

  function productionRepositorySqlExecutorPlan(repositoryContract = {}) {
    return repositoryAdapter.sqlExecutorPlan(repositoryContract);
  }

  function productionRepositoryResultAuditPlan(repositoryContract = {}) {
    return repositoryAdapter.resultMappingAuditPlan(repositoryContract);
  }

  function productionRepositoryReadRehearsalPlan(repositoryContract = {}) {
    return repositoryAdapter.readOnlyQueryRehearsalPlan(repositoryContract);
  }

  function productionRepositoryParityPlan(repositoryContract = {}) {
    return repositoryAdapter.dualReadVerificationPlan(repositoryContract);
  }

  function productionRepositoryParityEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.parityEvidencePlan(repositoryContract);
  }

  function productionRepositoryDualWritePlan(repositoryContract = {}) {
    return repositoryAdapter.dualWriteRehearsalPlan(repositoryContract);
  }

  function productionRepositoryShadowWriteEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.shadowWriteEvidencePlan(repositoryContract);
  }

  function productionRepositoryBackupRestoreEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.backupRestoreEvidencePlan(repositoryContract);
  }

  function productionRepositoryCutoverMonitoringEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.cutoverMonitoringEvidencePlan(repositoryContract);
  }

  function productionRepositoryRollbackRehearsalEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.rollbackRehearsalEvidencePlan(repositoryContract);
  }

  function productionRepositoryCutoverAuditTrailEvidencePlan(repositoryContract = {}) {
    return repositoryAdapter.cutoverAuditTrailEvidencePlan(repositoryContract);
  }

  function productionRepositoryCutoverPlan(repositoryContract = {}) {
    return repositoryAdapter.cutoverReadinessPlan(repositoryContract);
  }

  function productionDatabaseEncryptionPlan(repositoryContract = {}) {
    return createProductionDatabaseEncryptionPlan({
      connection: connectionStatus(),
      adapterConfig,
      repositoryContract,
    });
  }

  function productionDatabaseAccessControlPlan(repositoryContract = {}) {
    return createProductionDatabaseAccessControlPlan({
      connection: connectionStatus(),
      adapterConfig,
      repositoryContract,
    });
  }

  function productionDatabasePrivacyRetentionPlan(repositoryContract = {}) {
    return createProductionDatabasePrivacyRetentionPlan({
      connection: connectionStatus(),
      adapterConfig,
      repositoryContract,
    });
  }

  function productionDatabaseResidencyTransferPlan(repositoryContract = {}) {
    return createProductionDatabaseResidencyTransferPlan({
      connection: connectionStatus(),
      adapterConfig,
      repositoryContract,
    });
  }

  function migrationPlan(repositoryContract = {}) {
    const contractReady = repositoryContract.status === "pass";
    const connection = connectionStatus();
    return {
      phase: connection.configured ? "configured-skeleton" : "configuration-required",
      mode: adapterConfig.migrationMode || "manual",
      contractReady,
      steps: defaultMigrationSteps.map((step) => ({
        id: step,
        status:
          step === "configureConnection"
            ? connection.configured
              ? "pass"
              : "blocked"
            : step === "verifyRepositoryContract"
              ? contractReady
                ? "pass"
                : "blocked"
              : "pending",
      })),
    };
  }

  function health(repositoryContract = {}) {
    const connection = connectionStatus();
    const plan = migrationPlan(repositoryContract);
    const dryRun = migrationDryRun(repositoryContract, {
      plannedTables: config.plannedTables,
    });
    const readOnlyHealth = readOnlyConnectionHealth(repositoryContract);
    const setupPlan = driverSetupPlan(repositoryContract);
    const repositoryPlan = repositoryAdapterPlan(repositoryContract, {
      plannedTables: config.plannedTables,
    });
    const productionRepositoryAdapter = productionRepositoryAdapterStatus(repositoryContract);
    const productionRepositorySmokeTest = productionRepositorySmokeTestPlan(repositoryContract);
    const productionRepositorySqlContractStatus = productionRepositorySqlContract(repositoryContract);
    const productionRepositoryExecutionPlanStatus = productionRepositoryExecutionPlan(repositoryContract);
    const productionRepositoryParameterValidationPlanStatus =
      productionRepositoryParameterValidationPlan(repositoryContract);
    const productionRepositoryConnectionPoolPlanStatus =
      productionRepositoryConnectionPoolPlan(repositoryContract);
    const productionRepositorySqlExecutorPlanStatus =
      productionRepositorySqlExecutorPlan(repositoryContract);
    const productionRepositoryResultAuditPlanStatus =
      productionRepositoryResultAuditPlan(repositoryContract);
    const productionRepositoryReadRehearsalPlanStatus =
      productionRepositoryReadRehearsalPlan(repositoryContract);
    const productionRepositoryParityPlanStatus = productionRepositoryParityPlan(repositoryContract);
    const productionRepositoryParityEvidencePlanStatus =
      productionRepositoryParityEvidencePlan(repositoryContract);
    const productionRepositoryDualWritePlanStatus = productionRepositoryDualWritePlan(repositoryContract);
    const productionRepositoryShadowWriteEvidencePlanStatus =
      productionRepositoryShadowWriteEvidencePlan(repositoryContract);
    const productionRepositoryBackupRestoreEvidencePlanStatus =
      productionRepositoryBackupRestoreEvidencePlan(repositoryContract);
    const productionRepositoryCutoverMonitoringEvidencePlanStatus =
      productionRepositoryCutoverMonitoringEvidencePlan(repositoryContract);
    const productionRepositoryRollbackRehearsalEvidencePlanStatus =
      productionRepositoryRollbackRehearsalEvidencePlan(repositoryContract);
    const productionRepositoryCutoverAuditTrailEvidencePlanStatus =
      productionRepositoryCutoverAuditTrailEvidencePlan(repositoryContract);
    const productionRepositoryCutoverPlanStatus = productionRepositoryCutoverPlan(repositoryContract);
    const productionDatabaseEncryptionPlanStatus =
      productionDatabaseEncryptionPlan(repositoryContract);
    const productionDatabaseAccessControlPlanStatus =
      productionDatabaseAccessControlPlan(repositoryContract);
    const productionDatabasePrivacyRetentionPlanStatus =
      productionDatabasePrivacyRetentionPlan(repositoryContract);
    const productionDatabaseResidencyTransferPlanStatus =
      productionDatabaseResidencyTransferPlan(repositoryContract);
    const packagePlan = createMigrationPackage({
      connection,
      repositoryContract,
      dryRun,
      sqlDraft: dryRun.migrationSqlDraft,
    });
    return {
      id: "production-database-adapter",
      name: "Production Database Adapter Skeleton",
      mode: "planned",
      status: connection.configured ? "configured" : "not_configured",
      active: false,
      provider: connection.provider,
      sslMode: connection.sslMode,
      connection,
      migrationPlan: plan,
      migrationDryRun: dryRun,
      migrationSqlDraft: dryRun.migrationSqlDraft,
      migrationPackage: packagePlan,
      readOnlyConnectionHealth: readOnlyHealth,
      driverSetupPlan: setupPlan,
      repositoryAdapterPlan: repositoryPlan,
      productionRepositoryAdapter,
      productionRepositorySmokeTest,
      productionRepositorySqlContract: productionRepositorySqlContractStatus,
      productionRepositoryExecutionPlan: productionRepositoryExecutionPlanStatus,
      productionRepositoryParameterValidationPlan: productionRepositoryParameterValidationPlanStatus,
      productionRepositoryConnectionPoolPlan: productionRepositoryConnectionPoolPlanStatus,
      productionRepositorySqlExecutorPlan: productionRepositorySqlExecutorPlanStatus,
      productionRepositoryResultAuditPlan: productionRepositoryResultAuditPlanStatus,
      productionRepositoryReadRehearsalPlan: productionRepositoryReadRehearsalPlanStatus,
      productionRepositoryParityPlan: productionRepositoryParityPlanStatus,
      productionRepositoryParityEvidencePlan: productionRepositoryParityEvidencePlanStatus,
      productionRepositoryDualWritePlan: productionRepositoryDualWritePlanStatus,
      productionRepositoryShadowWriteEvidencePlan: productionRepositoryShadowWriteEvidencePlanStatus,
      productionRepositoryBackupRestoreEvidencePlan: productionRepositoryBackupRestoreEvidencePlanStatus,
      productionRepositoryCutoverMonitoringEvidencePlan:
        productionRepositoryCutoverMonitoringEvidencePlanStatus,
      productionRepositoryRollbackRehearsalEvidencePlan:
        productionRepositoryRollbackRehearsalEvidencePlanStatus,
      productionRepositoryCutoverAuditTrailEvidencePlan:
        productionRepositoryCutoverAuditTrailEvidencePlanStatus,
      productionRepositoryCutoverPlan: productionRepositoryCutoverPlanStatus,
      productionDatabaseEncryptionPlan: productionDatabaseEncryptionPlanStatus,
      productionDatabaseAccessControlPlan: productionDatabaseAccessControlPlanStatus,
      productionDatabasePrivacyRetentionPlan: productionDatabasePrivacyRetentionPlanStatus,
      productionDatabaseResidencyTransferPlan: productionDatabaseResidencyTransferPlanStatus,
      fallback: {
        active: true,
        reason: connection.configured
          ? "真实数据库驱动尚未接入，当前仍回退到 mock repository。"
          : "生产数据库连接配置缺失，当前仍回退到 mock repository。",
      },
      disclaimer:
        "这是生产数据库适配器骨架，只校验配置和迁移计划，不代表真实数据库已经连接或可用于生产。",
    };
  }

  return {
    id: "production-database-adapter",
    connectionStatus,
    migrationPlan,
    migrationDryRun,
    migrationSqlDraft,
    migrationPackage,
    readOnlyConnectionHealth,
    driverSetupPlan,
    repositoryAdapterPlan,
    productionRepositoryAdapterStatus,
    productionRepositorySmokeTestPlan,
    productionRepositorySqlContract,
    productionRepositoryExecutionPlan,
    productionRepositoryParameterValidationPlan,
    productionRepositoryConnectionPoolPlan,
    productionRepositorySqlExecutorPlan,
    productionRepositoryResultAuditPlan,
    productionRepositoryReadRehearsalPlan,
    productionRepositoryParityPlan,
    productionRepositoryParityEvidencePlan,
    productionRepositoryDualWritePlan,
    productionRepositoryShadowWriteEvidencePlan,
    productionRepositoryBackupRestoreEvidencePlan,
    productionRepositoryCutoverMonitoringEvidencePlan,
    productionRepositoryRollbackRehearsalEvidencePlan,
    productionRepositoryCutoverAuditTrailEvidencePlan,
    productionRepositoryCutoverPlan,
    productionDatabaseEncryptionPlan,
    productionDatabaseAccessControlPlan,
    productionDatabasePrivacyRetentionPlan,
    productionDatabaseResidencyTransferPlan,
    health,
  };
}
