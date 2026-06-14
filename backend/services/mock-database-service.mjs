import { validateRepositoryContract } from "../repositories/repository-contract.mjs";
import { createProductionDatabaseAdapter } from "./production-database-adapter.mjs";

const plannedTables = [
  "users",
  "auth_role_grants",
  "auth_role_events",
  "auth_sessions",
  "watchlist_items",
  "user_preferences",
  "portfolio_positions",
  "news_items",
  "compliance_acknowledgements",
  "suitability_questionnaires",
  "analysis_results",
  "reminder_rules",
  "notification_outbox",
  "audit_archive_receipts",
  "audit_events",
  "job_runs",
  "queued_jobs",
  "dead_letter_jobs",
  "worker_heartbeats",
  "worker_request_nonces",
];

const productionRequirements = [
  "accessControl",
  "encryptionAtRest",
  "backupRestore",
  "schemaMigrations",
  "retentionPolicy",
  "auditRedaction",
];

const capabilityLabels = {
  schemaPlan: "Schema plan",
  repositoryBridge: "Repository bridge",
  repositoryContract: "Repository contract",
  migrationChecks: "Migration checks",
  tableMappings: "Table mappings",
  productionAdapter: "Production adapter",
  adapterHealth: "Adapter health",
  migrationPlan: "Migration plan",
  migrationDryRun: "Migration dry-run",
  migrationSqlDraft: "Migration SQL draft",
  migrationPackage: "Migration package",
  readOnlyConnectionHealth: "Read-only connection health",
  driverSetupPlan: "Driver setup plan",
  repositoryAdapterPlan: "Repository adapter switch plan",
  repositoryRuntimeGuard: "Repository runtime mode guard",
  productionRepositoryAdapter: "Production repository adapter skeleton",
  productionRepositorySmokeTest: "Production repository read-only smoke test plan",
  productionRepositorySqlContract: "Production repository SQL contract plan",
  productionRepositoryExecutionPlan: "Production repository execution plan",
  productionRepositoryParameterValidationPlan: "Production repository parameter validation plan",
  productionRepositoryConnectionPoolPlan: "Production repository connection pool plan",
  productionRepositorySqlExecutorPlan: "Production repository SQL executor plan",
  productionRepositoryResultAuditPlan: "Production repository result mapping and audit plan",
  productionRepositoryReadRehearsalPlan: "Production repository read-only query rehearsal plan",
  productionRepositoryParityPlan: "Production repository dual-read parity plan",
  productionRepositoryParityEvidencePlan: "Production repository parity evidence plan",
  productionRepositoryDualWritePlan: "Production repository dual-write rehearsal plan",
  productionRepositoryShadowWriteEvidencePlan: "Production repository shadow-write evidence plan",
  productionRepositoryBackupRestoreEvidencePlan: "Production repository backup/restore evidence plan",
  productionRepositoryCutoverMonitoringEvidencePlan: "Production repository cutover monitoring evidence plan",
  productionRepositoryRollbackRehearsalEvidencePlan: "Production repository rollback rehearsal evidence plan",
  productionRepositoryCutoverAuditTrailEvidencePlan: "Production repository cutover audit trail evidence plan",
  productionRepositoryCutoverPlan: "Production repository feature-flag cutover plan",
  productionDatabaseEncryptionPlan: "Production database encryption and key custody plan",
  productionDatabaseAccessControlPlan: "Production database access control and RLS plan",
  productionDatabasePrivacyRetentionPlan: "Production database privacy deletion and retention plan",
  productionDatabaseResidencyTransferPlan: "Production database residency and transfer plan",
  jsonBridge: "JSON bridge",
  productionGapReport: "Production gap report",
};

function getMissingProductionCapabilities() {
  return productionRequirements;
}

const allowedRepositoryModes = ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"];

function createRepositoryRuntimeGuard(repositoryStatus = {}, productionAdapterHealth = {}, env = {}) {
  const requestedMode = typeof env.FINANCE_AI_REPOSITORY_MODE === "string" && env.FINANCE_AI_REPOSITORY_MODE.trim()
    ? env.FINANCE_AI_REPOSITORY_MODE.trim()
    : "mock";
  const supportedMode = allowedRepositoryModes.includes(requestedMode);
  const jsonConfigured =
    repositoryStatus.persistenceMode === "json-file" ||
    repositoryStatus.activeStorage === "json-file-bridge";
  const currentMode = jsonConfigured ? "json" : "mock";
  const cutoverPlan = productionAdapterHealth.productionRepositoryCutoverPlan || {};
  const cutoverReady = cutoverPlan.status === "ready-for-manual-cutover";
  const usesPostgres = requestedMode.startsWith("postgres");
  const blockedReasons = [];

  if (!supportedMode) {
    blockedReasons.push(`仓储模式 ${requestedMode} 不在允许列表中，已回退到当前安全仓储。`);
  }
  if (requestedMode === "json" && !jsonConfigured) {
    blockedReasons.push("请求使用 JSON 仓储，但 FINANCE_AI_DATA_FILE 未配置，当前只能使用内存 mock 仓储。");
  }
  if (usesPostgres && requestedMode !== "postgres-readonly") {
    blockedReasons.push("PostgreSQL 主写入或 shadow 写入模式尚未启用，运行时必须继续使用 mock/JSON 仓储。");
  }
  if (requestedMode === "postgres-readonly") {
    blockedReasons.push("PostgreSQL 只读模式仍为探测计划，尚不能作为 API 运行时仓储。");
  }
  if (requestedMode === "postgres-primary" && !cutoverReady) {
    blockedReasons.push("生产仓储切换门禁未通过，不能把 PostgreSQL 设为主数据源。");
  }

  return {
    id: "repository-runtime-guard",
    mode: "runtime-repository-selection",
    status: blockedReasons.length ? "fallback-active" : "active",
    requestedMode,
    effectiveMode: requestedMode === "json" && jsonConfigured ? "json" : currentMode,
    currentMode,
    allowedModes: [...allowedRepositoryModes],
    activeRepositoryId: repositoryStatus.id || "mock-user-state-repository",
    fallbackRepositoryId: "mock-user-state-repository",
    canUseRequestedMode: blockedReasons.length === 0,
    canSwitchAutomatically: false,
    checks: [
      {
        id: "requestedModeSupported",
        status: supportedMode ? "pass" : "blocked",
        required: true,
      },
      {
        id: "jsonPersistenceConfigured",
        status: requestedMode === "json" ? (jsonConfigured ? "pass" : "blocked") : "skipped",
        required: requestedMode === "json",
      },
      {
        id: "productionCutoverReady",
        status: usesPostgres ? (cutoverReady ? "pass" : "blocked") : "skipped",
        required: usesPostgres,
      },
      {
        id: "automaticSwitchDisabled",
        status: "pass",
        required: true,
      },
      {
        id: "mockFallback",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      noAutomaticSwitch: true,
      mockFallbackRequired: true,
      productionPrimaryDisabled: requestedMode !== "postgres-primary" || !cutoverReady,
      requiresHumanApproval: true,
    },
    blockedReasons,
    nextSteps: [
      "保持 FINANCE_AI_REPOSITORY_MODE 为 mock 或 json，直到 PostgreSQL 仓储实现和门禁验证完成。",
      "若需要 JSON 持久化，先配置 FINANCE_AI_DATA_FILE 并验证备份路径。",
      "若需要 PostgreSQL，先完成只读冒烟、双读一致性、双写演练、备份恢复和人工切换审批。",
    ],
    disclaimer:
      "仓储运行时保护器只选择安全回退路径；当前不会自动切换到 PostgreSQL，也不会把生产数据库设为主数据源。",
  };
}

export function createMockDatabaseService(options = {}) {
  const env = options.env || (typeof process !== "undefined" && process.env ? process.env : {});
  const productionAdapter = createProductionDatabaseAdapter({
    env,
    plannedTables,
  });

  return {
    id: "mock-database-service",

    status(repositoryStatus = {}, repository = null) {
      const persistenceMode =
        repositoryStatus.persistenceMode ||
        (repositoryStatus.activeStorage === "json-file-bridge" ? "json-file" : "memory-only");
      const repositoryContract = validateRepositoryContract(repository);
      const adapterHealth = productionAdapter.health(repositoryContract);
      const repositoryRuntimeGuard = createRepositoryRuntimeGuard(
        repositoryStatus,
        adapterHealth,
        env,
      );
      return {
        id: "mock-database-service",
        name: "Mock 数据库服务",
        mode: "sample",
        status: "planning",
        activeStorage: persistenceMode === "json-file" ? "json-file-bridge" : "memory-only",
        repositoryId: repositoryStatus.id || "mock-user-state-repository",
        migrationPhase: "pre-production",
        plannedTables: [...plannedTables],
        repositoryContract,
        migrationChecks: repositoryContract.migrationChecks,
        productionAdapter: adapterHealth,
        capabilities: [
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
          "driverSetupPlan",
          "repositoryAdapterPlan",
          "repositoryRuntimeGuard",
          "productionRepositoryAdapter",
          "productionRepositorySmokeTest",
          "productionRepositorySqlContract",
          "productionRepositoryExecutionPlan",
          "productionRepositoryParameterValidationPlan",
          "productionRepositoryConnectionPoolPlan",
          "productionRepositorySqlExecutorPlan",
          "productionRepositoryResultAuditPlan",
          "productionRepositoryReadRehearsalPlan",
          "productionRepositoryParityPlan",
          "productionRepositoryParityEvidencePlan",
          "productionRepositoryDualWritePlan",
          "productionRepositoryShadowWriteEvidencePlan",
          "productionRepositoryBackupRestoreEvidencePlan",
          "productionRepositoryCutoverMonitoringEvidencePlan",
          "productionRepositoryRollbackRehearsalEvidencePlan",
          "productionRepositoryCutoverAuditTrailEvidencePlan",
          "productionRepositoryCutoverPlan",
          "productionDatabaseEncryptionPlan",
          "productionDatabaseAccessControlPlan",
          "productionDatabasePrivacyRetentionPlan",
          "productionDatabaseResidencyTransferPlan",
          "jsonBridge",
          "productionGapReport",
        ],
        capabilityLabels: { ...capabilityLabels },
        missingProductionCapabilities: getMissingProductionCapabilities(),
        migrationDryRun: adapterHealth.migrationDryRun,
        migrationSqlDraft: adapterHealth.migrationDryRun.migrationSqlDraft,
        migrationPackage: adapterHealth.migrationPackage,
        readOnlyConnectionHealth: adapterHealth.readOnlyConnectionHealth,
        driverSetupPlan: adapterHealth.driverSetupPlan,
        repositoryAdapterPlan: adapterHealth.repositoryAdapterPlan,
        repositoryRuntimeGuard,
        productionRepositoryAdapter: adapterHealth.productionRepositoryAdapter,
        productionRepositorySmokeTest: adapterHealth.productionRepositorySmokeTest,
        productionRepositorySqlContract: adapterHealth.productionRepositorySqlContract,
        productionRepositoryExecutionPlan: adapterHealth.productionRepositoryExecutionPlan,
        productionRepositoryParameterValidationPlan:
          adapterHealth.productionRepositoryParameterValidationPlan,
        productionRepositoryConnectionPoolPlan: adapterHealth.productionRepositoryConnectionPoolPlan,
        productionRepositorySqlExecutorPlan: adapterHealth.productionRepositorySqlExecutorPlan,
        productionRepositoryResultAuditPlan: adapterHealth.productionRepositoryResultAuditPlan,
        productionRepositoryReadRehearsalPlan: adapterHealth.productionRepositoryReadRehearsalPlan,
        productionRepositoryParityPlan: adapterHealth.productionRepositoryParityPlan,
        productionRepositoryParityEvidencePlan: adapterHealth.productionRepositoryParityEvidencePlan,
        productionRepositoryDualWritePlan: adapterHealth.productionRepositoryDualWritePlan,
        productionRepositoryShadowWriteEvidencePlan: adapterHealth.productionRepositoryShadowWriteEvidencePlan,
        productionRepositoryBackupRestoreEvidencePlan:
          adapterHealth.productionRepositoryBackupRestoreEvidencePlan,
        productionRepositoryCutoverMonitoringEvidencePlan:
          adapterHealth.productionRepositoryCutoverMonitoringEvidencePlan,
        productionRepositoryRollbackRehearsalEvidencePlan:
          adapterHealth.productionRepositoryRollbackRehearsalEvidencePlan,
        productionRepositoryCutoverAuditTrailEvidencePlan:
          adapterHealth.productionRepositoryCutoverAuditTrailEvidencePlan,
        productionRepositoryCutoverPlan: adapterHealth.productionRepositoryCutoverPlan,
        productionDatabaseEncryptionPlan: adapterHealth.productionDatabaseEncryptionPlan,
        productionDatabaseAccessControlPlan: adapterHealth.productionDatabaseAccessControlPlan,
        productionDatabasePrivacyRetentionPlan: adapterHealth.productionDatabasePrivacyRetentionPlan,
        productionDatabaseResidencyTransferPlan: adapterHealth.productionDatabaseResidencyTransferPlan,
        disclaimer:
          "当前为数据库规划与 JSON/内存桥状态，不代表生产数据库已接入；上线前必须补齐权限、加密、备份、迁移和保留策略。",
      };
    },

    migrationDryRun(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.migrationDryRun(repositoryContract, { plannedTables });
    },

    migrationSqlDraft(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.migrationSqlDraft(repositoryContract, { plannedTables });
    },

    migrationPackage(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.migrationPackage(repositoryContract, { plannedTables });
    },

    readOnlyConnectionHealth(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.readOnlyConnectionHealth(repositoryContract);
    },

    driverSetupPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.driverSetupPlan(repositoryContract);
    },

    repositoryAdapterPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.repositoryAdapterPlan(repositoryContract, { plannedTables });
    },

    repositoryRuntimeGuard(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      const adapterHealth = productionAdapter.health(repositoryContract);
      return createRepositoryRuntimeGuard(repositoryStatus, adapterHealth, env);
    },

    productionRepositoryAdapter(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryAdapterStatus(repositoryContract);
    },

    productionRepositorySmokeTest(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositorySmokeTestPlan(repositoryContract);
    },

    productionRepositorySqlContract(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositorySqlContract(repositoryContract);
    },

    productionRepositoryExecutionPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryExecutionPlan(repositoryContract);
    },

    productionRepositoryParameterValidationPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryParameterValidationPlan(repositoryContract);
    },

    productionRepositoryConnectionPoolPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryConnectionPoolPlan(repositoryContract);
    },

    productionRepositorySqlExecutorPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositorySqlExecutorPlan(repositoryContract);
    },

    productionRepositoryResultAuditPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryResultAuditPlan(repositoryContract);
    },

    productionRepositoryReadRehearsalPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryReadRehearsalPlan(repositoryContract);
    },

    productionRepositoryParityPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryParityPlan(repositoryContract);
    },

    productionRepositoryParityEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryParityEvidencePlan(repositoryContract);
    },

    productionRepositoryDualWritePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryDualWritePlan(repositoryContract);
    },

    productionRepositoryShadowWriteEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryShadowWriteEvidencePlan(repositoryContract);
    },

    productionRepositoryBackupRestoreEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryBackupRestoreEvidencePlan(repositoryContract);
    },

    productionRepositoryCutoverMonitoringEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryCutoverMonitoringEvidencePlan(repositoryContract);
    },

    productionRepositoryRollbackRehearsalEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryRollbackRehearsalEvidencePlan(repositoryContract);
    },

    productionRepositoryCutoverAuditTrailEvidencePlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryCutoverAuditTrailEvidencePlan(repositoryContract);
    },

    productionRepositoryCutoverPlan(repositoryStatus = {}, repository = null) {
      const repositoryContract = validateRepositoryContract(repository);
      return productionAdapter.productionRepositoryCutoverPlan(repositoryContract);
    },

    productionReadiness(repositoryStatus = {}) {
      const status = this.status(repositoryStatus);
      return {
        ready: false,
        phase: status.migrationPhase,
        activeStorage: status.activeStorage,
        productionAdapterStatus: status.productionAdapter.status,
        missingCapabilities: status.missingProductionCapabilities,
        nextStep: "Replace the mock repository/store bridge with a production database adapter.",
      };
    },
  };
}
