import { createHash, createHmac } from "node:crypto";

const retentionLimit = 500;
const retentionWindowDays = 90;
const genesisHash = "audit-genesis";
const sensitiveKeyPattern = /(password|token|authorization|secret|credential|passwordHash|refreshToken)/i;
const emailKeyPattern = /email/i;

const redactedFields = [
  "password",
  "passwordHash",
  "token",
  "authorization",
  "secret",
  "credential",
  "refreshToken",
];
const auditExportSigningSecretEnv = "FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET";
const auditExportSigningKeyIdEnv = "FINANCE_AI_AUDIT_EXPORT_KEY_ID";
const auditDownloadRequiresRoleEnv = "FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE";
const auditRetentionSchedulerReadyEnv = "FINANCE_AI_AUDIT_RETENTION_SCHEDULER_READY";
const auditRetentionLockReadyEnv = "FINANCE_AI_AUDIT_RETENTION_LOCK_READY";
const auditRetentionWormArchiveReadyEnv = "FINANCE_AI_AUDIT_RETENTION_WORM_ARCHIVE_READY";
const auditRetentionApprovalReadyEnv = "FINANCE_AI_AUDIT_RETENTION_APPROVAL_READY";
const auditRetentionRollbackReadyEnv = "FINANCE_AI_AUDIT_RETENTION_ROLLBACK_READY";
const auditDownloadRoles = ["admin", "auditor", "compliance"];

const capabilities = [
  "safeMetadata",
  "retentionLimit",
  "retentionPurge",
  "auditExportPackage",
  "auditExportSigningPolicy",
  "auditExportVerification",
  "auditExportArchiveReceipt",
  "auditExportDownloadPackage",
  "auditExportReplayPreview",
  "auditRetentionAutomationPlan",
  "userScopedAuditLog",
  "hashChainIntegrity",
  "productionGapReport",
];

const missingProductionCapabilities = [
  "externalWormArchive",
  "signatureKeyManagement",
  "longTermArchive",
  "adminReviewWorkflow",
  "fieldLevelEncryption",
  "automatedRetentionPurge",
  "signedAuditExports",
  "immutableArchiveWrite",
  "externalVerifierTooling",
  "auditExportDownloadWorkflow",
  "auditReplayImportWorkflow",
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function envValue(env, key) {
  return typeof env?.[key] === "string" && env[key].trim() ? env[key].trim() : "";
}

export function auditExportSigningPolicy({ env = process.env } = {}) {
  const signingSecretConfigured = Boolean(envValue(env, auditExportSigningSecretEnv));
  const keyId = envValue(env, auditExportSigningKeyIdEnv) || "env-default-audit-export-key";
  return {
    status: signingSecretConfigured ? "ready" : "sample-unsigned",
    algorithm: "hmac-sha256",
    canonicalization: "stable-json-v1",
    signingSecretConfigured,
    signedExportsSupported: signingSecretConfigured,
    required: env?.FINANCE_AI_AUDIT_EXPORT_SIGNING_REQUIRED === "true",
    keyId: signingSecretConfigured ? keyId : "",
    secretEnv: auditExportSigningSecretEnv,
    keyIdEnv: auditExportSigningKeyIdEnv,
    disclaimer: signingSecretConfigured
      ? "当前审计证据包会使用环境密钥生成 HMAC-SHA256 签名；生产仍需要密钥轮换、KMS/HSM 和审批留痕。"
      : "当前未配置审计导出签名密钥，证据包会以未签名样例形式导出。",
  };
}

export function auditExportDownloadAuthorizationPolicy({ env = process.env } = {}) {
  const requiresPrivilegedRole = env?.[auditDownloadRequiresRoleEnv] === "true";
  return {
    status: requiresPrivilegedRole ? "role-enforced" : "sample-bypass",
    requiresPrivilegedRole,
    allowedRoles: [...auditDownloadRoles],
    roleSource: "authenticated-user.roles",
    enforcementEnv: auditDownloadRequiresRoleEnv,
    disclaimer: requiresPrivilegedRole
      ? "审计下载包已要求 admin、auditor 或 compliance 角色；生产仍需要后端 RBAC、审批和下载链接有效期。"
      : "当前样例模式不强制审计下载角色；生产环境应开启角色门禁和审批流。",
  };
}

function authorizeAuditExportDownload(user, { env = process.env } = {}) {
  const policy = auditExportDownloadAuthorizationPolicy({ env });
  const userRoles = Array.isArray(user?.roles)
    ? user.roles.filter((role) => typeof role === "string").map((role) => role.trim())
    : [];
  const hasRequiredRole = userRoles.some((role) => policy.allowedRoles.includes(role));
  return {
    allowed: !policy.requiresPrivilegedRole || hasRequiredRole,
    reason: policy.requiresPrivilegedRole && !hasRequiredRole ? "audit-download-role-required" : "",
    userRoles,
    policy,
  };
}

export function createAuditHash(event) {
  const hashInput = {
    id: event.id,
    userId: event.userId,
    eventType: event.eventType,
    severity: event.severity,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt,
    sequence: event.sequence,
    previousHash: event.previousHash,
  };
  return createHash("sha256").update(stableStringify(hashInput)).digest("hex");
}

function rebuildAuditEventHash(event, previousHash, sequence) {
  const rebuilt = {
    ...event,
    sequence,
    previousHash,
  };
  return { ...rebuilt, hash: createAuditHash(rebuilt) };
}

export function rechainAuditEvents(auditLogs = []) {
  const events = Array.isArray(auditLogs) ? auditLogs : [];
  const rebuilt = [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const previous = rebuilt[0] || null;
    rebuilt.unshift(
      rebuildAuditEventHash(
        events[index],
        previous?.hash || genesisHash,
        Number(previous?.sequence || 0) + 1,
      ),
    );
  }
  return rebuilt;
}

function maskEmail(value) {
  const [name, domain] = String(value).split("@");
  if (!name || !domain) return "[masked]";
  const visiblePrefix = name.slice(0, 2);
  return `${visiblePrefix}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export function redactAuditMetadata(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditMetadata(item, depth + 1));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (sensitiveKeyPattern.test(key)) {
        return [key, "[redacted]"];
      }
      if (emailKeyPattern.test(key) && typeof entry === "string") {
        return [key, maskEmail(entry)];
      }
      return [key, redactAuditMetadata(entry, depth + 1)];
    }),
  );
}

export function createAuditEvent({
  user,
  eventType,
  severity = "info",
  message,
  metadata = {},
  previousHash = genesisHash,
  sequence = 1,
}) {
  const validSeverities = new Set(["info", "warning", "error"]);
  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user?.id || null,
    eventType: typeof eventType === "string" && eventType.trim() ? eventType.trim() : "unknown",
    severity: validSeverities.has(severity) ? severity : "info",
    message:
      typeof message === "string" && message.trim()
        ? message.trim().slice(0, 240)
        : "Audit event recorded.",
    metadata: redactAuditMetadata(metadata),
    createdAt: new Date().toISOString(),
    sequence: Number.isFinite(Number(sequence)) && Number(sequence) > 0 ? Number(sequence) : 1,
    previousHash:
      typeof previousHash === "string" && previousHash.trim() ? previousHash.trim() : genesisHash,
  };
  return { ...event, hash: createAuditHash(event) };
}

export function applyAuditRetention(auditLogs = []) {
  return rechainAuditEvents(auditLogs.slice(0, retentionLimit));
}

export function auditRetentionPolicy() {
  return {
    maxEvents: retentionLimit,
    windowDays: retentionWindowDays,
    enforcement: "repository-cap-and-manual-purge",
    manualPurgeSupported: true,
    rechainAfterPurge: true,
  };
}

export function auditRetentionAutomationPlan({ env = process.env } = {}) {
  const checks = [
    {
      id: "scheduler",
      status: env?.[auditRetentionSchedulerReadyEnv] === "true" ? "pass" : "blocked",
      message: "生产定时调度器必须可审计、可暂停，并支持失败告警。",
    },
    {
      id: "singleFlightLock",
      status: env?.[auditRetentionLockReadyEnv] === "true" ? "pass" : "blocked",
      message: "自动清理必须具备分布式锁，避免多 worker 同时删除审计记录。",
    },
    {
      id: "wormArchive",
      status: env?.[auditRetentionWormArchiveReadyEnv] === "true" ? "pass" : "blocked",
      message: "清理前必须先写入不可变归档或外部审计存证。",
    },
    {
      id: "approvalWorkflow",
      status: env?.[auditRetentionApprovalReadyEnv] === "true" ? "pass" : "blocked",
      message: "保留策略、清理窗口和例外规则必须经过管理员/合规审批。",
    },
    {
      id: "rollbackDrill",
      status: env?.[auditRetentionRollbackReadyEnv] === "true" ? "pass" : "blocked",
      message: "必须完成恢复演练，确认误清理后可以从归档证据恢复。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);
  return {
    id: "audit-retention-automation-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-enable",
    mode: "dry-run-no-scheduler-start",
    canStartAutomatedPurge: false,
    schedule: {
      timezone: "Australia/Brisbane",
      cadence: "daily",
      localTime: "06:00",
      jitterMinutes: 15,
    },
    requiredEnvVars: [
      auditRetentionSchedulerReadyEnv,
      auditRetentionLockReadyEnv,
      auditRetentionWormArchiveReadyEnv,
      auditRetentionApprovalReadyEnv,
      auditRetentionRollbackReadyEnv,
    ],
    checks,
    blockedReasons,
    safety: {
      noAutomaticSchedulerStart: true,
      requiresSingleFlightLock: true,
      requiresArchiveBeforeDelete: true,
      requiresHumanApproval: true,
      requiresRollbackDrill: true,
    },
    nextSteps: [
      "接入可暂停的生产调度器，并把每次清理写入审计事件。",
      "在清理前写入不可变归档并记录 checksum。",
      "完成保留策略审批、恢复演练和人工启用开关后，再允许自动清理。",
    ],
    disclaimer:
      "当前仅为自动审计保留清理计划，不会启动 cron、worker 或删除任何生产审计记录。",
  };
}

export function verifyAuditChain(auditLogs = []) {
  const events = Array.isArray(auditLogs) ? auditLogs : [];
  const brokenEvents = [];
  events.forEach((event, index) => {
    const expectedPreviousHash = index + 1 < events.length ? events[index + 1].hash : genesisHash;
    const recomputedHash = createAuditHash(event);
    if (event.hash !== recomputedHash || event.previousHash !== expectedPreviousHash) {
      brokenEvents.push({
        id: event.id || "",
        index,
        reason: event.hash !== recomputedHash ? "hash-mismatch" : "previous-hash-mismatch",
      });
    }
  });

  return {
    status: brokenEvents.length ? "broken" : "verified",
    eventCount: events.length,
    latestHash: events[0]?.hash || "",
    genesisHash,
    algorithm: "sha256-stable-json",
    brokenEvents,
    disclaimer:
      "当前 hash chain 用于样例完整性校验；生产仍需要不可变归档、签名密钥管理和权限隔离。",
  };
}

function auditExportCanonicalPayload(exportPackage) {
  return {
    manifest: exportPackage?.manifest || {},
    integrity: exportPackage?.integrity || {},
    events: Array.isArray(exportPackage?.events) ? exportPackage.events : [],
  };
}

function auditExportPayloadHash(exportPackage) {
  return createHash("sha256")
    .update(stableStringify(auditExportCanonicalPayload(exportPackage)))
    .digest("hex");
}

function auditExportPackageChecksum(exportPackage) {
  return createHash("sha256").update(stableStringify(exportPackage || {})).digest("hex");
}

export function createAuditExportSignature(exportPackage, { env = process.env } = {}) {
  const policy = auditExportSigningPolicy({ env });
  const payloadHash = auditExportPayloadHash(exportPackage);
  if (!policy.signingSecretConfigured) {
    return {
      status: "unsigned",
      algorithm: policy.algorithm,
      canonicalization: policy.canonicalization,
      keyId: "",
      payloadHash,
      signature: "",
      signedAt: "",
      disclaimer: policy.disclaimer,
    };
  }

  const canonicalPayload = stableStringify(auditExportCanonicalPayload(exportPackage));
  return {
    status: "signed",
    algorithm: policy.algorithm,
    canonicalization: policy.canonicalization,
    keyId: policy.keyId,
    payloadHash,
    signature: createHmac("sha256", envValue(env, auditExportSigningSecretEnv))
      .update(canonicalPayload)
      .digest("hex"),
    signedAt: new Date().toISOString(),
    disclaimer: policy.disclaimer,
  };
}

export function verifyAuditExportPackageSignature(exportPackage, { env = process.env } = {}) {
  const signature = exportPackage?.signature || {};
  if (signature.status !== "signed" || !signature.signature) {
    return {
      status: "unsigned",
      verified: false,
      reason: "export-not-signed",
    };
  }

  const expected = createAuditExportSignature(
    {
      manifest: exportPackage.manifest,
      integrity: exportPackage.integrity,
      events: exportPackage.events,
    },
    { env },
  );
  if (expected.status !== "signed") {
    return {
      status: "cannot-verify",
      verified: false,
      reason: "signing-secret-not-configured",
    };
  }

  const matches =
    signature.signature === expected.signature && signature.payloadHash === expected.payloadHash;
  return {
    status: matches ? "verified" : "invalid",
    verified: matches,
    reason: matches ? "" : "signature-mismatch",
    algorithm: expected.algorithm,
    keyId: expected.keyId,
    payloadHash: expected.payloadHash,
  };
}

export function verifyAuditExportPackage(exportPackage, { env = process.env } = {}) {
  if (!exportPackage || typeof exportPackage !== "object") {
    return {
      status: "invalid",
      verified: false,
      reasons: ["invalid-package"],
      checks: {
        manifest: "missing",
        integrity: "missing",
        signature: "missing",
        payloadHash: "missing",
      },
    };
  }

  const manifest = exportPackage.manifest || {};
  const events = Array.isArray(exportPackage.events) ? exportPackage.events : [];
  const integrity = verifyAuditChain(events);
  const signature = verifyAuditExportPackageSignature(exportPackage, { env });
  const expectedPayloadHash = auditExportPayloadHash(exportPackage);
  const packagePayloadHash =
    typeof exportPackage.signature?.payloadHash === "string"
      ? exportPackage.signature.payloadHash
      : "";
  const reasons = [];

  if (manifest.version !== "audit-export-v0") reasons.push("unsupported-version");
  if (Number(manifest.eventCount) !== events.length) reasons.push("event-count-mismatch");
  if ((manifest.latestHash || "") !== integrity.latestHash) reasons.push("latest-hash-mismatch");
  if ((manifest.integrityStatus || "") !== integrity.status) {
    reasons.push("integrity-status-mismatch");
  }
  if (integrity.status !== "verified") reasons.push("hash-chain-broken");
  if (packagePayloadHash && packagePayloadHash !== expectedPayloadHash) {
    reasons.push("payload-hash-mismatch");
  }
  if (!packagePayloadHash) reasons.push("payload-hash-missing");
  if (!signature.verified) reasons.push(signature.reason || signature.status || "signature-invalid");
  if (auditExportSigningPolicy({ env }).required && signature.status === "unsigned") {
    reasons.push("signed-export-required");
  }

  const uniqueReasons = [...new Set(reasons.filter(Boolean))];
  return {
    status: uniqueReasons.length ? signature.status || "invalid" : "verified",
    verified: uniqueReasons.length === 0,
    reasons: uniqueReasons,
    checks: {
      manifest:
        uniqueReasons.some((reason) =>
          ["unsupported-version", "event-count-mismatch", "latest-hash-mismatch", "integrity-status-mismatch"].includes(
            reason,
          ),
        )
          ? "failed"
          : "passed",
      integrity: integrity.status,
      signature: signature.status,
      payloadHash: packagePayloadHash === expectedPayloadHash ? "matched" : "failed",
    },
    signature,
    integrity,
    expectedPayloadHash,
    manifestSummary: {
      id: typeof manifest.id === "string" ? manifest.id : "",
      version: typeof manifest.version === "string" ? manifest.version : "",
      eventCount: events.length,
      latestHash: integrity.latestHash,
      signed: manifest.signed === true,
      generatedAt: typeof manifest.generatedAt === "string" ? manifest.generatedAt : "",
    },
    disclaimer:
      "当前为样例审计证据包校验；生产仍需要独立 verifier、KMS/HSM 公钥或密钥策略、归档校验和审计交接流程。",
  };
}

export function createAuditExportArchiveReceipt(exportPackage, { requestedBy = "api", env = process.env } = {}) {
  const verification = verifyAuditExportPackage(exportPackage, { env });
  const signingPolicy = auditExportSigningPolicy({ env });
  const sampleUnsignedAllowed =
    !signingPolicy.required &&
    verification.reasons.length === 1 &&
    verification.reasons[0] === "export-not-signed" &&
    verification.checks?.manifest === "passed" &&
    verification.checks?.integrity === "verified" &&
    verification.checks?.payloadHash === "matched";
  const accepted = verification.verified || sampleUnsignedAllowed;
  const checksum = auditExportPackageChecksum(exportPackage);
  const receipt = {
    id: `audit-archive-receipt-${Date.now()}`,
    exportId: verification.manifestSummary?.id || exportPackage?.manifest?.id || "",
    requestedBy,
    status: accepted ? (verification.verified ? "archived" : "sample-archived") : "rejected",
    accepted,
    archiveMode: "sample-receipt-only",
    immutable: false,
    checksumAlgorithm: "sha256-stable-json",
    packageChecksum: checksum,
    eventCount: verification.manifestSummary?.eventCount || 0,
    signatureStatus: verification.signature?.status || "unknown",
    verificationStatus: verification.status,
    reasons: verification.reasons,
    archivedAt: new Date().toISOString(),
    disclaimer:
      "当前仅生成样例归档回执，不代表生产 WORM/不可变归档、外部审计存证或下载交接已完成。",
  };
  return {
    receipt,
    verification,
    disclaimer:
      "归档回执用于开发期追踪证据包交接；生产仍需要不可变存储、审批、访问控制和外部校验工具。",
  };
}

export function createAuditExportDownloadPackage(
  exportPackage,
  { requestedBy = "api", env = process.env } = {},
) {
  const verification = verifyAuditExportPackage(exportPackage, { env });
  const signingPolicy = auditExportSigningPolicy({ env });
  const sampleUnsignedAllowed =
    !signingPolicy.required &&
    verification.reasons.length === 1 &&
    verification.reasons[0] === "export-not-signed" &&
    verification.checks?.manifest === "passed" &&
    verification.checks?.integrity === "verified" &&
    verification.checks?.payloadHash === "matched";
  const accepted = verification.verified || sampleUnsignedAllowed;
  const exportId = verification.manifestSummary?.id || exportPackage?.manifest?.id || "";
  const generatedAt = new Date().toISOString();
  const packageJson = accepted ? stableStringify(exportPackage || {}) : "";
  const packageBytes = Buffer.byteLength(packageJson, "utf8");
  const checksum = auditExportPackageChecksum(exportPackage);

  return {
    download: {
      id: `audit-export-download-${Date.now()}`,
      exportId,
      requestedBy,
      status: accepted ? "prepared" : "rejected",
      accepted,
      filename: `${exportId || "audit-export"}-${generatedAt.slice(0, 10)}.json`,
      mimeType: "application/json",
      encoding: "base64",
      contentBase64: accepted ? Buffer.from(packageJson, "utf8").toString("base64") : "",
      byteSize: packageBytes,
      checksumAlgorithm: "sha256-stable-json",
      packageChecksum: checksum,
      signatureStatus: verification.signature?.status || "unknown",
      verificationStatus: verification.status,
      reasons: accepted ? [] : verification.reasons,
      warnings: sampleUnsignedAllowed ? ["unsigned-sample-download"] : [],
      generatedAt,
      disclaimer:
        "当前仅生成样例 JSON 下载交接包；生产仍需要访问控制、短期下载链接、不可变归档对象、下载审计和外部校验工具。",
    },
    verification,
  };
}

export function createAuditExportReplayPreview(
  exportPackage,
  { currentEvents = [], requestedBy = "api", env = process.env } = {},
) {
  const verification = verifyAuditExportPackage(exportPackage, { env });
  const signingPolicy = auditExportSigningPolicy({ env });
  const sampleUnsignedAllowed =
    !signingPolicy.required &&
    verification.reasons.length === 1 &&
    verification.reasons[0] === "export-not-signed" &&
    verification.checks?.manifest === "passed" &&
    verification.checks?.integrity === "verified" &&
    verification.checks?.payloadHash === "matched";
  const accepted = verification.verified || sampleUnsignedAllowed;
  const events = Array.isArray(exportPackage?.events) ? exportPackage.events : [];
  const existingEvents = Array.isArray(currentEvents) ? currentEvents : [];
  const existingHashes = new Set(existingEvents.map((event) => event.hash).filter(Boolean));
  const existingIds = new Set(existingEvents.map((event) => event.id).filter(Boolean));
  const duplicateEvents = events.filter(
    (event) => (event.hash && existingHashes.has(event.hash)) || (event.id && existingIds.has(event.id)),
  );
  const duplicateKeys = new Set(duplicateEvents.map((event) => event.hash || event.id).filter(Boolean));
  const importableEvents = accepted
    ? events.filter((event) => !duplicateKeys.has(event.hash || event.id))
    : [];
  const eventTypeCounts = Object.values(
    events.reduce((counts, event) => {
      const eventType = typeof event.eventType === "string" && event.eventType.trim()
        ? event.eventType.trim()
        : "unknown";
      counts[eventType] = counts[eventType] || { eventType, count: 0 };
      counts[eventType].count += 1;
      return counts;
    }, {}),
  ).sort((left, right) => right.count - left.count || left.eventType.localeCompare(right.eventType));
  const warnings = [];
  if (sampleUnsignedAllowed) warnings.push("unsigned-sample-preview");
  if (duplicateEvents.length) warnings.push("duplicate-events-detected");

  return {
    preview: {
      id: `audit-replay-preview-${Date.now()}`,
      exportId: verification.manifestSummary?.id || exportPackage?.manifest?.id || "",
      requestedBy,
      dryRun: true,
      status: accepted ? (warnings.length ? "ready-with-warnings" : "ready") : "rejected",
      accepted,
      totalEvents: events.length,
      duplicateEvents: duplicateEvents.length,
      wouldImportEvents: importableEvents.length,
      currentAuditEvents: existingEvents.length,
      eventTypeCounts,
      firstEventAt: events.at(-1)?.createdAt || "",
      latestEventAt: events[0]?.createdAt || "",
      reasons: accepted ? [] : verification.reasons,
      warnings,
      generatedAt: new Date().toISOString(),
      disclaimer:
        "当前仅为审计证据包回放预演，不会导入旧事件；生产导入仍需要审批、去重策略、回滚方案和外部审计记录。",
    },
    verification,
  };
}

export function createAuditExportPackage(
  events = [],
  { user = null, requestedBy = "api", env = process.env } = {},
) {
  const safeEvents = Array.isArray(events) ? events : [];
  const integrity = verifyAuditChain(safeEvents);
  const signingPolicy = auditExportSigningPolicy({ env });
  const manifest = {
    id: `audit-export-${Date.now()}`,
    version: "audit-export-v0",
    userId: user?.id || null,
    requestedBy,
    generatedAt: new Date().toISOString(),
    eventCount: safeEvents.length,
    firstEventAt: safeEvents.at(-1)?.createdAt || "",
    latestEventAt: safeEvents[0]?.createdAt || "",
    latestHash: integrity.latestHash,
    algorithm: integrity.algorithm,
    integrityStatus: integrity.status,
    redaction: "sensitive metadata redacted before export",
    retentionPolicy: auditRetentionPolicy(),
    signed: signingPolicy.signedExportsSupported,
    signingAlgorithm: signingPolicy.algorithm,
    signatureKeyId: signingPolicy.signedExportsSupported ? signingPolicy.keyId : "",
  };
  const exportPackage = {
    manifest,
    integrity,
    events: safeEvents.map((event) => ({ ...event })),
    signingPolicy: {
      status: signingPolicy.status,
      algorithm: signingPolicy.algorithm,
      canonicalization: signingPolicy.canonicalization,
      signingSecretConfigured: signingPolicy.signingSecretConfigured,
      signedExportsSupported: signingPolicy.signedExportsSupported,
      required: signingPolicy.required,
      keyId: signingPolicy.signedExportsSupported ? signingPolicy.keyId : "",
    },
    disclaimer:
      "当前为样例审计导出证据包；生产仍需要不可变归档、审批记录和外部审计存证。",
  };
  return {
    ...exportPackage,
    signature: createAuditExportSignature(exportPackage, { env }),
  };
}

export function createMockAuditService() {
  return {
    id: "mock-audit-service",

    status(repositoryStatus = {}) {
      const integrity = repositoryStatus.auditIntegrity || verifyAuditChain([]);
      const signingPolicy = auditExportSigningPolicy();
      const activeCapabilities = signingPolicy.signedExportsSupported
        ? [...capabilities, "signedAuditExports"]
        : [...capabilities];
      const activeMissingCapabilities = signingPolicy.signedExportsSupported
        ? missingProductionCapabilities.filter((capability) => capability !== "signedAuditExports")
        : [...missingProductionCapabilities];
      return {
        id: "mock-audit-service",
        name: "Mock 审计服务",
        mode: "sample",
        status: "planning",
        storageMode: repositoryStatus.persistenceMode || "memory-only",
        retentionPolicy: auditRetentionPolicy(),
        maintenancePolicy: {
          retentionPurgeSupported: true,
          manualPurgeSupported: true,
          exportPackageSupported: true,
          auditTrailRequired: true,
          rechainAfterPurge: true,
          disclaimer:
            "当前支持样例手动保留清理；生产仍需要定时任务、不可变归档和审批记录。",
        },
        automationPlan: auditRetentionAutomationPlan(),
        redactionPolicy: {
          metadata: "sensitive-keys-redacted",
          email: "masked",
          redactedFields: [...redactedFields],
        },
        signingPolicy,
        downloadAuthorizationPolicy: auditExportDownloadAuthorizationPolicy(),
        integrity,
        capabilities: activeCapabilities,
        missingProductionCapabilities: activeMissingCapabilities,
        disclaimer:
          "当前为样例审计服务，支持基础元数据脱敏、数量保留和 hash chain 完整性校验；生产环境还需要不可变归档、签名密钥管理、管理员审查流和自动保留策略。",
      };
    },

    purgeRetention(repository, user, options = {}) {
      const policy = auditRetentionPolicy();
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const cutoff = new Date(Date.now() - policy.windowDays * 24 * 60 * 60 * 1000).toISOString();
      const result = repository.pruneAuditEvents(user?.id || "", {
        before: cutoff,
        maxEvents: policy.maxEvents,
      });
      const purgeRun = {
        id: `audit-retention-purge-${Date.now()}`,
        userId: user?.id || null,
        status: "success",
        requestedBy,
        retentionWindowDays: policy.windowDays,
        maxEvents: policy.maxEvents,
        checkedEvents: result.checkedEvents,
        prunedEvents: result.prunedEvents,
        remainingEvents: result.remainingEvents,
        cutoff,
        executedAt: new Date().toISOString(),
      };
      repository.recordAudit({
        user,
        eventType: "audit.retention.purge",
        severity: result.prunedEvents > 0 ? "info" : "debug",
        message: "Audit retention purge completed.",
        metadata: {
          purgeRunId: purgeRun.id,
          requestedBy,
          retentionWindowDays: policy.windowDays,
          maxEvents: policy.maxEvents,
          checkedEvents: result.checkedEvents,
          prunedEvents: result.prunedEvents,
          remainingEvents: result.remainingEvents,
          cutoff,
        },
      });
      const integrity = repository.status().auditIntegrity || verifyAuditChain([]);
      return {
        purgeRun: {
          ...purgeRun,
          finalEventCount: repository.listAuditEvents(user?.id || "", policy.maxEvents).length,
        },
        retentionPolicy: policy,
        integrity,
        disclaimer:
          "当前为手动触发的样例审计保留清理，不代表生产不可变归档、审批流或定时清理任务已部署。",
      };
    },

    exportPackage(repository, user, options = {}) {
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const limit = Number.isInteger(options.limit) ? Math.max(1, Math.min(500, options.limit)) : 100;
      const events = repository.listAuditEvents(user?.id || "", limit);
      const exportPackage = createAuditExportPackage(events, { user, requestedBy });
      repository.recordAudit({
        user,
        eventType: "audit.export.package",
        severity: "info",
        message: "Audit export package generated.",
        metadata: {
          exportId: exportPackage.manifest.id,
          requestedBy,
          eventCount: exportPackage.manifest.eventCount,
          latestHash: exportPackage.manifest.latestHash,
          integrityStatus: exportPackage.manifest.integrityStatus,
          signed: exportPackage.manifest.signed,
          signatureStatus: exportPackage.signature.status,
          signatureKeyId: exportPackage.signature.keyId,
        },
      });
      return exportPackage;
    },

    verifyExportPackage(repository, user, exportPackage, options = {}) {
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const verification = verifyAuditExportPackage(exportPackage);
      repository.recordAudit({
        user,
        eventType: "audit.export.verify",
        severity: verification.verified ? "info" : "warning",
        message: "Audit export package verification completed.",
        metadata: {
          exportId: verification.manifestSummary?.id || "",
          requestedBy,
          status: verification.status,
          verified: verification.verified,
          reasons: verification.reasons,
          signatureStatus: verification.signature?.status || "",
          payloadHash: verification.expectedPayloadHash || "",
        },
      });
      return verification;
    },

    archiveExportPackage(repository, user, exportPackage, options = {}) {
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const result = createAuditExportArchiveReceipt(exportPackage, { requestedBy });
      const receipt = repository.saveAuditArchiveReceipt({
        ...result.receipt,
        userId: user?.id || null,
      });
      repository.recordAudit({
        user,
        eventType: "audit.export.archive",
        severity: result.receipt.accepted ? "info" : "warning",
        message: "Audit export archive receipt generated.",
        metadata: {
          receiptId: result.receipt.id,
          exportId: result.receipt.exportId,
          requestedBy,
          status: result.receipt.status,
          accepted: result.receipt.accepted,
          immutable: result.receipt.immutable,
          archiveMode: result.receipt.archiveMode,
          packageChecksum: result.receipt.packageChecksum,
          signatureStatus: result.receipt.signatureStatus,
          verificationStatus: result.receipt.verificationStatus,
          reasons: result.receipt.reasons,
        },
      });
      return {
        ...result,
        receipt,
      };
    },

    prepareDownload(repository, user, exportPackage, options = {}) {
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const authorization = authorizeAuditExportDownload(user);
      if (!authorization.allowed) {
        repository.recordAudit({
          user,
          eventType: "audit.export.download.denied",
          severity: "warning",
          message: "Audit export download package denied by role policy.",
          metadata: {
            requestedBy,
            reason: authorization.reason,
            userRoles: authorization.userRoles,
            requiredRoles: authorization.policy.allowedRoles,
            policyStatus: authorization.policy.status,
          },
        });
        return {
          download: {
            id: `audit-export-download-denied-${Date.now()}`,
            exportId: exportPackage?.manifest?.id || "",
            requestedBy,
            status: "denied",
            accepted: false,
            filename: "",
            mimeType: "application/json",
            encoding: "base64",
            contentBase64: "",
            byteSize: 0,
            checksumAlgorithm: "sha256-stable-json",
            packageChecksum: "",
            signatureStatus: "not-checked",
            verificationStatus: "not-checked",
            reasons: [authorization.reason],
            warnings: [],
            generatedAt: new Date().toISOString(),
            disclaimer:
              "审计下载包被角色门禁拒绝；需要具备 admin、auditor 或 compliance 角色后再尝试。",
          },
          authorization,
        };
      }
      const result = createAuditExportDownloadPackage(exportPackage, { requestedBy });
      repository.recordAudit({
        user,
        eventType: "audit.export.download.prepare",
        severity: result.download.accepted ? "info" : "warning",
        message: "Audit export download package prepared.",
        metadata: {
          downloadId: result.download.id,
          exportId: result.download.exportId,
          requestedBy,
          status: result.download.status,
          accepted: result.download.accepted,
          filename: result.download.filename,
          byteSize: result.download.byteSize,
          packageChecksum: result.download.packageChecksum,
          signatureStatus: result.download.signatureStatus,
          verificationStatus: result.download.verificationStatus,
          warnings: result.download.warnings,
          reasons: result.download.reasons,
        },
      });
      return result;
    },

    listArchiveReceipts(repository, user, options = {}) {
      const limit = Number.isInteger(options.limit) ? Math.max(1, Math.min(200, options.limit)) : 50;
      return {
        items: repository.listAuditArchiveReceipts(user?.id || "", limit),
        retentionLimit: 200,
        disclaimer:
          "当前为样例归档回执列表，不代表生产不可变归档对象、下载交接或外部审计系统已接入。",
      };
    },

    replayPreview(repository, user, exportPackage, options = {}) {
      const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
      const currentEvents = repository.listAuditEvents(user?.id || "", 500);
      const result = createAuditExportReplayPreview(exportPackage, {
        currentEvents,
        requestedBy,
      });
      repository.recordAudit({
        user,
        eventType: "audit.export.replay.preview",
        severity: result.preview.accepted ? "info" : "warning",
        message: "Audit export replay preview generated.",
        metadata: {
          previewId: result.preview.id,
          exportId: result.preview.exportId,
          requestedBy,
          status: result.preview.status,
          dryRun: true,
          totalEvents: result.preview.totalEvents,
          duplicateEvents: result.preview.duplicateEvents,
          wouldImportEvents: result.preview.wouldImportEvents,
          warnings: result.preview.warnings,
          reasons: result.preview.reasons,
        },
      });
      return result;
    },
  };
}
