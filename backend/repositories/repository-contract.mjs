export const repositoryInterfaceVersion = "2026-06-01.repository.v1";

export const repositoryTableMappings = [
  { domain: "authUsers", table: "users", methods: ["findAuthUserByEmail", "getAuthUser", "createAuthUser", "updateAuthUserRoles"] },
  { domain: "authRoleGrants", table: "auth_role_grants", methods: ["getAuthUser", "updateAuthUserRoles"] },
  { domain: "authRoleEvents", table: "auth_role_events", methods: ["recordAudit", "listAuditEvents"] },
  {
    domain: "authSessions",
    table: "auth_sessions",
    methods: [
      "saveAuthSession",
      "findAuthSessionByTokenHash",
      "listAuthSessions",
      "findAuthSession",
      "removeAuthSession",
      "removeAuthSessionForUser",
    ],
  },
  { domain: "watchlist", table: "watchlist_items", methods: ["listWatchlistCodes", "addWatchlistCode", "removeWatchlistCode"] },
  { domain: "preferences", table: "user_preferences", methods: ["getPreferences", "savePreferences"] },
  { domain: "newsIntelligence", table: "news_items", methods: ["listNewsIntelligenceRecords", "saveNewsIntelligenceRecord"] },
  {
    domain: "complianceAcknowledgements",
    table: "compliance_acknowledgements",
    methods: [
      "listComplianceAcknowledgements",
      "latestComplianceAcknowledgement",
      "saveComplianceAcknowledgement",
    ],
  },
  {
    domain: "suitabilityQuestionnaires",
    table: "suitability_questionnaires",
    methods: [
      "listSuitabilityQuestionnaires",
      "latestSuitabilityQuestionnaire",
      "saveSuitabilityQuestionnaire",
    ],
  },
  { domain: "analysisHistory", table: "analysis_results", methods: ["listAnalysisHistory", "saveAnalysisHistory"] },
  { domain: "portfolio", table: "portfolio_positions", methods: ["listPortfolioEntries", "savePortfolioEntry"] },
  { domain: "reminders", table: "reminder_rules", methods: ["listReminders", "addReminder", "nextReminderId", "removeReminder"] },
  { domain: "notificationOutbox", table: "notification_outbox", methods: ["listNotifications", "findNotification", "saveNotification", "updateNotification", "markNotificationRead"] },
  { domain: "jobRuns", table: "job_runs", methods: ["listJobRuns", "saveJobRun"] },
  { domain: "queuedJobs", table: "queued_jobs", methods: ["listQueuedJobs", "findQueuedJob", "saveQueuedJob", "updateQueuedJob"] },
  { domain: "deadLetterQueue", table: "dead_letter_jobs", methods: ["listDeadLetterJobs", "findDeadLetterJob", "saveDeadLetterJob", "updateDeadLetterJob"] },
  { domain: "workerHeartbeats", table: "worker_heartbeats", methods: ["listWorkerHeartbeats", "saveWorkerHeartbeat"] },
  { domain: "workerRequestNonces", table: "worker_request_nonces", methods: ["listWorkerRequestNonces", "findWorkerRequestNonce", "pruneWorkerRequestNonces", "saveWorkerRequestNonce"] },
  { domain: "auditArchiveReceipts", table: "audit_archive_receipts", methods: ["listAuditArchiveReceipts", "saveAuditArchiveReceipt"] },
  { domain: "auditLog", table: "audit_events", methods: ["recordAudit", "listAuditEvents", "pruneAuditEvents"] },
];

export const requiredRepositoryMethods = [
  "status",
  ...repositoryTableMappings.flatMap((mapping) => mapping.methods),
];

export const migrationCheckDefinitions = [
  {
    id: "repositoryInterface",
    label: "Repository interface",
    description: "All API-owned state must be accessed through the repository method contract.",
  },
  {
    id: "tableMappings",
    label: "Table mappings",
    description: "Every repository data domain must have a planned production table mapping.",
  },
  {
    id: "userScopedRecords",
    label: "User-scoped records",
    description: "User-owned records must include user scope before production migration.",
  },
  {
    id: "auditRedaction",
    label: "Audit redaction",
    description: "Audit metadata must be redacted before persistence.",
  },
  {
    id: "notificationDeliveryState",
    label: "Notification delivery state",
    description: "Notification records must separate read state from channel delivery state.",
  },
  {
    id: "newsIntelligencePersistence",
    label: "News intelligence persistence",
    description: "Processed news intelligence must preserve score version, source credibility, duplicate groups, and raw source references.",
  },
  {
    id: "complianceAcknowledgementPersistence",
    label: "Compliance acknowledgement persistence",
    description: "Risk acknowledgement records must be user-scoped, versioned, and audit-linked before public analysis release.",
  },
  {
    id: "suitabilityQuestionnairePersistence",
    label: "Suitability questionnaire persistence",
    description: "Suitability questionnaire records must be user-scoped, versioned, scored, and audit-linked before public analysis release.",
  },
  {
    id: "deadLetterQueuePersistence",
    label: "Dead letter queue persistence",
    description: "Failed background jobs must be user-scoped, retryable, and auditable before production worker rollout.",
  },
  {
    id: "queuedJobPersistence",
    label: "Queued job persistence",
    description: "Background jobs must have durable queue state, retry timing, and auditability before production worker rollout.",
  },
  {
    id: "workerHeartbeatPersistence",
    label: "Worker heartbeat persistence",
    description: "Background workers must publish health and queue-lag telemetry before production worker rollout.",
  },
  {
    id: "workerNoncePersistence",
    label: "Worker nonce persistence",
    description: "Signed worker callbacks must have durable nonce storage to prevent replayed requests.",
  },
  {
    id: "auditArchiveReceiptPersistence",
    label: "Audit archive receipt persistence",
    description: "Audit export archive receipts must be durable and user-scoped before production audit handoff.",
  },
  {
    id: "authRoleGrantPersistence",
    label: "Auth role grant persistence",
    description: "RBAC grants, expiry, revocation, and grant actor metadata must have durable storage before production auth rollout.",
  },
  {
    id: "authRoleEventPersistence",
    label: "Auth role event persistence",
    description: "Admin role assignment, revocation, and role-history review events must have durable queryable storage before production auth rollout.",
  },
];

export function validateRepositoryContract(repository) {
  const implementedMethods = requiredRepositoryMethods.filter(
    (method) => typeof repository?.[method] === "function",
  );
  const missingMethods = requiredRepositoryMethods.filter(
    (method) => typeof repository?.[method] !== "function",
  );
  const repositoryStatus =
    typeof repository?.status === "function" ? repository.status() : { capabilities: [] };
  const capabilities = Array.isArray(repositoryStatus.capabilities)
    ? repositoryStatus.capabilities
    : [];

  const migrationChecks = migrationCheckDefinitions.map((check) => {
    let passed = false;
    if (check.id === "repositoryInterface") passed = missingMethods.length === 0;
    if (check.id === "tableMappings") passed = repositoryTableMappings.length > 0;
    if (check.id === "userScopedRecords") {
      passed = ["watchlist", "preferences", "analysisHistory", "portfolio", "reminders"].every(
        (capability) => capabilities.includes(capability),
      );
    }
    if (check.id === "auditRedaction") {
      passed =
        capabilities.includes("auditRedaction") &&
        capabilities.includes("auditRetentionPurge") &&
        capabilities.includes("auditExportPackage");
    }
    if (check.id === "notificationDeliveryState") passed = capabilities.includes("notificationOutbox");
    if (check.id === "newsIntelligencePersistence") {
      passed = capabilities.includes("newsIntelligence") && capabilities.includes("newsIntelligenceAuditTrail");
    }
    if (check.id === "complianceAcknowledgementPersistence") {
      passed =
        capabilities.includes("complianceAcknowledgements") &&
        capabilities.includes("complianceAcknowledgementAuditTrail");
    }
    if (check.id === "suitabilityQuestionnairePersistence") {
      passed =
        capabilities.includes("suitabilityQuestionnaires") &&
        capabilities.includes("suitabilityQuestionnaireAuditTrail");
    }
    if (check.id === "deadLetterQueuePersistence") {
      passed = capabilities.includes("deadLetterQueue") && capabilities.includes("auditLog");
    }
    if (check.id === "queuedJobPersistence") {
      passed = capabilities.includes("queuedJobs") && capabilities.includes("queueTelemetry");
    }
    if (check.id === "workerHeartbeatPersistence") {
      passed = capabilities.includes("workerHeartbeats") && capabilities.includes("queueTelemetry");
    }
    if (check.id === "workerNoncePersistence") {
      passed =
        capabilities.includes("workerRequestNonces") &&
        capabilities.includes("workerRequestNonceCleanup") &&
        capabilities.includes("auditLog");
    }
    if (check.id === "auditArchiveReceiptPersistence") {
      passed = capabilities.includes("auditArchiveReceipts") && capabilities.includes("auditLog");
    }
    if (check.id === "authRoleGrantPersistence") {
      passed = capabilities.includes("authUsers") && capabilities.includes("authRoleManagement");
    }
    if (check.id === "authRoleEventPersistence") {
      passed =
        capabilities.includes("authRoleManagement") &&
        capabilities.includes("auditLog") &&
        capabilities.includes("auditRedaction");
    }
    return {
      ...check,
      status: passed ? "pass" : "blocked",
    };
  });

  return {
    version: repositoryInterfaceVersion,
    status: missingMethods.length === 0 ? "pass" : "blocked",
    requiredMethods: [...requiredRepositoryMethods],
    implementedMethods,
    missingMethods,
    tableMappings: repositoryTableMappings.map((mapping) => ({ ...mapping })),
    migrationChecks,
  };
}
