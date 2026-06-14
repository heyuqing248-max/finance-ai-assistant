import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const validRiskProfiles = new Set(["balanced", "conservative", "aggressive"]);
const validNotificationChannels = new Set(["inApp", "email", "sms", "wechat", "telegram"]);
const validReminderTypes = new Set(["priceAbove", "priceBelow", "importantNews"]);
const validDeadLetterStatuses = new Set(["open", "failed", "replayed"]);
const validWorkerStatuses = new Set(["healthy", "warning", "critical", "stale"]);
const validQueuedJobStatuses = new Set(["queued", "running", "retrying", "completed", "failed"]);
const defaultComplianceAcknowledgementVersion = "compliance-ack-v0";
const defaultWorkerNonceRetentionMs = 24 * 60 * 60 * 1000;
const validSuitabilityValues = {
  riskTolerance: new Set(["low", "medium", "high"]),
  investmentExperience: new Set(["new", "some", "experienced"]),
  investmentHorizon: new Set(["short", "medium", "long"]),
  liquidityNeed: new Set(["high", "medium", "low"]),
};

function sanitizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function sanitizePreferences(input = {}, fallback = {}) {
  const riskProfile = validRiskProfiles.has(input.riskProfile)
    ? input.riskProfile
    : validRiskProfiles.has(fallback.riskProfile)
      ? fallback.riskProfile
      : "balanced";
  const sourceNotifications =
    input.notifications && typeof input.notifications === "object"
      ? input.notifications
      : fallback.notifications || {};
  const notifications = Object.fromEntries(
    Object.entries(sourceNotifications).filter(
      ([channel, enabled]) => validNotificationChannels.has(channel) && typeof enabled === "boolean",
    ),
  );

  return {
    riskProfile,
    notifications,
  };
}

export function serializeState(state) {
  const demoWatchlist = Array.isArray(state.watchlists?.["demo-user"])
    ? state.watchlists["demo-user"]
    : [...(state.watchlist || [])];
  return {
    watchlist: demoWatchlist,
    watchlists: state.watchlists || {},
    portfolio: state.portfolio,
    reminders: state.reminders,
    preferences: state.preferences,
    analysisHistory: state.analysisHistory,
    newsIntelligence: state.newsIntelligence,
    complianceAcknowledgements: state.complianceAcknowledgements,
    suitabilityQuestionnaires: state.suitabilityQuestionnaires,
    notificationOutbox: state.notificationOutbox,
    authUsers: state.authUsers,
    authSessions: state.authSessions,
    nextAuthUserId: state.nextAuthUserId,
    nextReminderId: state.nextReminderId,
    auditLogs: state.auditLogs,
    jobRuns: state.jobRuns,
    deadLetterQueue: state.deadLetterQueue,
    workerHeartbeats: state.workerHeartbeats,
    workerRequestNonces: state.workerRequestNonces,
    queuedJobs: state.queuedJobs,
    auditArchiveReceipts: state.auditArchiveReceipts,
  };
}

function inferNextReminderId(reminders = []) {
  const maxId = reminders.reduce((max, rule) => {
    const match = typeof rule.id === "string" ? rule.id.match(/^reminder-(\d+)$/) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return maxId + 1;
}

function sanitizeWatchlists(seed = {}) {
  const legacyWatchlist = Array.isArray(seed.watchlist) ? [...new Set(seed.watchlist)] : [];
  const seededWatchlists =
    seed.watchlists && typeof seed.watchlists === "object" && !Array.isArray(seed.watchlists)
      ? Object.fromEntries(
          Object.entries(seed.watchlists)
            .filter(([userId, codes]) => typeof userId === "string" && Array.isArray(codes))
            .map(([userId, codes]) => [
              userId,
              [...new Set(codes.filter((code) => typeof code === "string" && code.trim()))],
            ]),
        )
      : {};

  if (!seededWatchlists["demo-user"] && legacyWatchlist.length) {
    seededWatchlists["demo-user"] = legacyWatchlist;
  }

  return seededWatchlists;
}

function sanitizeReminder(rule = {}) {
  return {
    ...rule,
    id: typeof rule.id === "string" && rule.id.trim() ? rule.id.trim() : "",
    userId: typeof rule.userId === "string" && rule.userId.trim() ? rule.userId.trim() : "demo-user",
    code: typeof rule.code === "string" ? rule.code : "",
    type: validReminderTypes.has(rule.type) ? rule.type : "priceAbove",
    threshold:
      typeof rule.threshold === "string" ? rule.threshold : String(rule.threshold || "").trim(),
    channels: Array.isArray(rule.channels)
      ? [
          ...new Set(
            rule.channels.filter(
              (channel) => typeof channel === "string" && validNotificationChannels.has(channel),
            ),
          ),
        ]
      : [],
    createdAt: typeof rule.createdAt === "string" ? rule.createdAt : new Date().toISOString(),
  };
}

function sanitizeNotification(notification = {}) {
  const deliveryStatus = ["queued", "delivered", "failed"].includes(notification.deliveryStatus)
    ? notification.deliveryStatus
    : "queued";
  const attempts = Array.isArray(notification.deliveryAttempts)
    ? notification.deliveryAttempts
        .filter((attempt) => attempt && typeof attempt === "object" && !Array.isArray(attempt))
        .map((attempt) => ({
          id: typeof attempt.id === "string" ? attempt.id : "",
          channel:
            typeof attempt.channel === "string" && validNotificationChannels.has(attempt.channel)
              ? attempt.channel
              : "inApp",
          status: ["queued", "delivered", "failed"].includes(attempt.status)
            ? attempt.status
            : "failed",
          attemptedAt: typeof attempt.attemptedAt === "string" ? attempt.attemptedAt : "",
          message: typeof attempt.message === "string" ? attempt.message : "",
          errorCode: typeof attempt.errorCode === "string" ? attempt.errorCode : "",
        }))
        .filter((attempt) => attempt.id)
    : [];

  return {
    ...notification,
    id: typeof notification.id === "string" ? notification.id : "",
    userId:
      typeof notification.userId === "string" && notification.userId.trim()
        ? notification.userId
        : "demo-user",
    channel:
      typeof notification.channel === "string" && validNotificationChannels.has(notification.channel)
        ? notification.channel
        : "inApp",
    status: notification.status === "read" ? "read" : "queued",
    deliveryStatus,
    attemptCount: Number.isInteger(notification.attemptCount)
      ? notification.attemptCount
      : attempts.length,
    deliveryAttempts: attempts,
    lastAttemptAt: typeof notification.lastAttemptAt === "string" ? notification.lastAttemptAt : "",
    deliveredAt: typeof notification.deliveredAt === "string" ? notification.deliveredAt : "",
    nextRetryAt: typeof notification.nextRetryAt === "string" ? notification.nextRetryAt : "",
    deliveryError:
      typeof notification.deliveryError === "string" ? notification.deliveryError : "",
    createdAt:
      typeof notification.createdAt === "string" ? notification.createdAt : new Date().toISOString(),
  };
}

function sanitizeDeadLetterJob(record = {}) {
  const attempts = Number.isInteger(record.attempts) && record.attempts >= 0 ? record.attempts : 0;
  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `dlq-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    scheduleId: typeof record.scheduleId === "string" ? record.scheduleId : "",
    jobType: typeof record.jobType === "string" ? record.jobType : "",
    status: validDeadLetterStatuses.has(record.status) ? record.status : "open",
    attempts,
    maxAttempts:
      Number.isInteger(record.maxAttempts) && record.maxAttempts > 0 ? record.maxAttempts : 3,
    nextRetryAt: typeof record.nextRetryAt === "string" ? record.nextRetryAt : "",
    lastError:
      record.lastError && typeof record.lastError === "object" && !Array.isArray(record.lastError)
        ? {
            code: typeof record.lastError.code === "string" ? record.lastError.code : "JOB_FAILED",
            message: typeof record.lastError.message === "string" ? record.lastError.message : "",
          }
        : { code: "JOB_FAILED", message: "" },
    payload:
      record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
        ? record.payload
        : {},
    createdAt:
      typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    replayedAt: typeof record.replayedAt === "string" ? record.replayedAt : "",
    jobRunId: typeof record.jobRunId === "string" ? record.jobRunId : "",
  };
}

function sanitizeWorkerHeartbeat(record = {}) {
  const now = new Date().toISOString();
  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `worker-heartbeat-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    workerId:
      typeof record.workerId === "string" && record.workerId.trim()
        ? record.workerId.trim()
        : "sample-worker",
    jobTypes: Array.isArray(record.jobTypes)
      ? [
          ...new Set(
            record.jobTypes.filter((jobType) => typeof jobType === "string" && jobType.trim()),
          ),
        ]
      : [],
    status: validWorkerStatuses.has(record.status) ? record.status : "healthy",
    queueDepth:
      Number.isFinite(Number(record.queueDepth)) && Number(record.queueDepth) >= 0
        ? Number(record.queueDepth)
        : 0,
    queueLagMs:
      Number.isFinite(Number(record.queueLagMs)) && Number(record.queueLagMs) >= 0
        ? Number(record.queueLagMs)
        : 0,
    lastSeenAt: typeof record.lastSeenAt === "string" ? record.lastSeenAt : now,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

function sanitizeQueuedJob(record = {}) {
  const now = new Date().toISOString();
  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `queued-job-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    jobType: typeof record.jobType === "string" && record.jobType.trim() ? record.jobType.trim() : "",
    status: validQueuedJobStatuses.has(record.status) ? record.status : "queued",
    priority:
      Number.isInteger(record.priority) && record.priority >= 0 && record.priority <= 10
        ? record.priority
        : 5,
    attempts: Number.isInteger(record.attempts) && record.attempts >= 0 ? record.attempts : 0,
    maxAttempts:
      Number.isInteger(record.maxAttempts) && record.maxAttempts > 0 ? record.maxAttempts : 3,
    scheduledFor: typeof record.scheduledFor === "string" ? record.scheduledFor : now,
    nextRetryAt: typeof record.nextRetryAt === "string" ? record.nextRetryAt : "",
    payload:
      record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
        ? record.payload
        : {},
    lastError:
      record.lastError && typeof record.lastError === "object" && !Array.isArray(record.lastError)
        ? {
            code: typeof record.lastError.code === "string" ? record.lastError.code : "",
            message: typeof record.lastError.message === "string" ? record.lastError.message : "",
          }
        : { code: "", message: "" },
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

function sanitizeWorkerRequestNonce(record = {}) {
  const now = new Date().toISOString();
  const timestampValue = Date.parse(record.timestamp || record.createdAt || now);
  const fallbackExpiresAt = new Date(
    (Number.isFinite(timestampValue) ? timestampValue : Date.now()) + defaultWorkerNonceRetentionMs,
  ).toISOString();
  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `worker-nonce-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    workerId:
      typeof record.workerId === "string" && record.workerId.trim()
        ? record.workerId.trim()
        : "sample-worker",
    operation:
      typeof record.operation === "string" && record.operation.trim()
        ? record.operation.trim()
        : "unknown",
    nonce:
      typeof record.nonce === "string" && record.nonce.trim() ? record.nonce.trim() : "",
    timestamp: typeof record.timestamp === "string" ? record.timestamp : now,
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : fallbackExpiresAt,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
  };
}

function sanitizeAuditArchiveReceipt(record = {}) {
  const now = new Date().toISOString();
  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `audit-archive-receipt-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    exportId: typeof record.exportId === "string" ? record.exportId : "",
    status:
      typeof record.status === "string" && record.status.trim() ? record.status.trim() : "unknown",
    accepted: record.accepted === true,
    archiveMode:
      typeof record.archiveMode === "string" && record.archiveMode.trim()
        ? record.archiveMode.trim()
        : "sample-receipt-only",
    immutable: record.immutable === true,
    checksumAlgorithm:
      typeof record.checksumAlgorithm === "string" && record.checksumAlgorithm.trim()
        ? record.checksumAlgorithm.trim()
        : "sha256-stable-json",
    packageChecksum:
      typeof record.packageChecksum === "string" && record.packageChecksum.trim()
        ? record.packageChecksum.trim()
        : "",
    eventCount: Number.isFinite(Number(record.eventCount)) ? Number(record.eventCount) : 0,
    signatureStatus:
      typeof record.signatureStatus === "string" && record.signatureStatus.trim()
        ? record.signatureStatus.trim()
        : "unknown",
    verificationStatus:
      typeof record.verificationStatus === "string" && record.verificationStatus.trim()
        ? record.verificationStatus.trim()
        : "unknown",
    reasons: Array.isArray(record.reasons)
      ? record.reasons.filter((reason) => typeof reason === "string")
      : [],
    archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : now,
    disclaimer: typeof record.disclaimer === "string" ? record.disclaimer : "",
  };
}

function sanitizeNewsIntelligenceRecord(record = {}) {
  const source =
    record.source && typeof record.source === "object" && !Array.isArray(record.source)
      ? record.source
      : {};

  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `news-${Date.now()}`,
    market: typeof record.market === "string" ? record.market : "",
    symbol:
      typeof record.symbol === "string"
        ? record.symbol
        : typeof record.code === "string"
          ? record.code
          : "",
    title: typeof record.title === "string" ? record.title : "",
    source: {
      id: typeof source.id === "string" ? source.id : "",
      label:
        typeof source.label === "string"
          ? source.label
          : typeof record.source === "string"
            ? record.source
            : "",
      licenseTag: typeof source.licenseTag === "string" ? source.licenseTag : "",
      attributionRequired: source.attributionRequired === true,
    },
    importanceScore: Math.max(0, Math.min(100, sanitizeNumber(record.importanceScore))),
    sourceCredibilityScore: Math.max(
      0,
      Math.min(100, sanitizeNumber(record.sourceCredibilityScore)),
    ),
    importanceBreakdown:
      record.importanceBreakdown &&
      typeof record.importanceBreakdown === "object" &&
      !Array.isArray(record.importanceBreakdown)
        ? record.importanceBreakdown
        : {},
    duplicateGroupKey:
      typeof record.duplicateGroupKey === "string" ? record.duplicateGroupKey : record.id || "",
    duplicateIds: Array.isArray(record.duplicateIds)
      ? record.duplicateIds.filter((id) => typeof id === "string")
      : [],
    rawSourceRefs: Array.isArray(record.rawSourceRefs)
      ? record.rawSourceRefs.filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        )
      : [],
    scoreVersion: typeof record.scoreVersion === "string" ? record.scoreVersion : "",
    persistedAt:
      typeof record.persistedAt === "string" ? record.persistedAt : new Date().toISOString(),
  };
}

function sanitizeComplianceAcknowledgement(record = {}) {
  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `compliance-ack-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    version:
      typeof record.version === "string" && record.version.trim()
        ? record.version.trim()
        : defaultComplianceAcknowledgementVersion,
    acceptedDisclaimer: record.acceptedDisclaimer === true,
    riskAcknowledged: record.riskAcknowledged === true,
    optionalPortfolioNoticeAcknowledged: record.optionalPortfolioNoticeAcknowledged === true,
    source:
      typeof record.source === "string" && record.source.trim()
        ? record.source.trim()
        : "settings-panel",
    disclosureText:
      typeof record.disclosureText === "string" && record.disclosureText.trim()
        ? record.disclosureText.trim()
        : "",
    acceptedAt:
      typeof record.acceptedAt === "string" ? record.acceptedAt : new Date().toISOString(),
  };
}

function sanitizeSuitabilityQuestionnaire(record = {}) {
  const answers =
    record.answers && typeof record.answers === "object" && !Array.isArray(record.answers)
      ? record.answers
      : record;

  const riskTolerance = validSuitabilityValues.riskTolerance.has(answers.riskTolerance)
    ? answers.riskTolerance
    : "medium";
  const investmentExperience = validSuitabilityValues.investmentExperience.has(
    answers.investmentExperience,
  )
    ? answers.investmentExperience
    : "new";
  const investmentHorizon = validSuitabilityValues.investmentHorizon.has(answers.investmentHorizon)
    ? answers.investmentHorizon
    : "medium";
  const liquidityNeed = validSuitabilityValues.liquidityNeed.has(answers.liquidityNeed)
    ? answers.liquidityNeed
    : "medium";

  return {
    id:
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `suitability-${Date.now()}`,
    userId:
      typeof record.userId === "string" && record.userId.trim()
        ? record.userId.trim()
        : "demo-user",
    version:
      typeof record.version === "string" && record.version.trim()
        ? record.version.trim()
        : "suitability-v0",
    answers: {
      riskTolerance,
      investmentExperience,
      investmentHorizon,
      liquidityNeed,
    },
    score: Number.isFinite(Number(record.score)) ? Number(record.score) : 0,
    suitabilityLevel:
      typeof record.suitabilityLevel === "string" && record.suitabilityLevel.trim()
        ? record.suitabilityLevel.trim()
        : "balanced",
    completedAt:
      typeof record.completedAt === "string" ? record.completedAt : new Date().toISOString(),
    disclaimer:
      typeof record.disclaimer === "string" && record.disclaimer.trim()
        ? record.disclaimer.trim()
        : "适当性问卷仅用于样例个性化和风险提示，不构成投资建议。",
  };
}

export function createMockState(seed = {}) {
  const reminders = Array.isArray(seed.reminders)
    ? seed.reminders
        .filter((rule) => rule && typeof rule === "object" && !Array.isArray(rule))
        .map(sanitizeReminder)
        .filter((rule) => rule.id && rule.code && rule.threshold)
    : [];
  const legacyWatchlist = Array.isArray(seed.watchlist) ? [...new Set(seed.watchlist)] : [];
  return {
    watchlist: new Set(legacyWatchlist),
    watchlists: sanitizeWatchlists(seed),
    portfolio: Array.isArray(seed.portfolio) ? seed.portfolio : [],
    reminders,
    preferences:
      seed.preferences && typeof seed.preferences === "object" && !Array.isArray(seed.preferences)
        ? Object.fromEntries(
            Object.entries(seed.preferences).map(([userId, preferences]) => [
              userId,
              {
                ...sanitizePreferences(preferences),
                updatedAt:
                  typeof preferences?.updatedAt === "string" ? preferences.updatedAt : new Date().toISOString(),
              },
            ]),
          )
        : {},
    analysisHistory: Array.isArray(seed.analysisHistory) ? seed.analysisHistory : [],
    newsIntelligence: Array.isArray(seed.newsIntelligence)
      ? seed.newsIntelligence
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeNewsIntelligenceRecord)
          .filter((record) => record.id && record.title)
      : [],
    complianceAcknowledgements: Array.isArray(seed.complianceAcknowledgements)
      ? seed.complianceAcknowledgements
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeComplianceAcknowledgement)
          .filter(
            (record) =>
              record.id && record.userId && record.acceptedDisclaimer && record.riskAcknowledged,
          )
      : [],
    suitabilityQuestionnaires: Array.isArray(seed.suitabilityQuestionnaires)
      ? seed.suitabilityQuestionnaires
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeSuitabilityQuestionnaire)
          .filter((record) => record.id && record.userId)
      : [],
    notificationOutbox: Array.isArray(seed.notificationOutbox)
      ? seed.notificationOutbox
          .filter(
            (notification) =>
              notification && typeof notification === "object" && !Array.isArray(notification),
          )
          .map(sanitizeNotification)
          .filter((notification) => notification.id)
      : [],
    authUsers:
      seed.authUsers && typeof seed.authUsers === "object" && !Array.isArray(seed.authUsers)
        ? seed.authUsers
        : {},
    authSessions: Array.isArray(seed.authSessions) ? seed.authSessions : [],
    nextAuthUserId:
      Number.isInteger(seed.nextAuthUserId) && seed.nextAuthUserId > 0 ? seed.nextAuthUserId : 1,
    nextReminderId:
      Number.isInteger(seed.nextReminderId) && seed.nextReminderId > 0
        ? seed.nextReminderId
        : inferNextReminderId(reminders),
    auditLogs: Array.isArray(seed.auditLogs) ? seed.auditLogs : [],
    jobRuns: Array.isArray(seed.jobRuns) ? seed.jobRuns : [],
    deadLetterQueue: Array.isArray(seed.deadLetterQueue)
      ? seed.deadLetterQueue
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeDeadLetterJob)
          .filter((record) => record.id && record.jobType)
      : [],
    workerHeartbeats: Array.isArray(seed.workerHeartbeats)
      ? seed.workerHeartbeats
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeWorkerHeartbeat)
          .filter((record) => record.id && record.workerId)
      : [],
    workerRequestNonces: Array.isArray(seed.workerRequestNonces)
      ? seed.workerRequestNonces
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeWorkerRequestNonce)
          .filter((record) => record.id && record.nonce)
      : [],
    auditArchiveReceipts: Array.isArray(seed.auditArchiveReceipts)
      ? seed.auditArchiveReceipts
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeAuditArchiveReceipt)
          .filter((record) => record.id && record.exportId)
      : [],
    queuedJobs: Array.isArray(seed.queuedJobs)
      ? seed.queuedJobs
          .filter((record) => record && typeof record === "object" && !Array.isArray(record))
          .map(sanitizeQueuedJob)
          .filter((record) => record.id && record.jobType)
      : [],
    persistencePath: typeof seed.persistencePath === "string" ? seed.persistencePath : "",
  };
}

export async function loadStateFromFile(filePath) {
  try {
    const rawValue = await readFile(filePath, "utf8");
    const parsed = JSON.parse(rawValue);
    return createMockState({ ...parsed, persistencePath: filePath });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return createMockState({ persistencePath: filePath });
  }
}

export async function persistState(state) {
  if (!state.persistencePath) return;
  const tempPath = `${state.persistencePath}.tmp`;
  await mkdir(dirname(state.persistencePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(serializeState(state), null, 2)}\n`);
  await rename(tempPath, state.persistencePath);
}

export async function persistAndReturn(state, result) {
  await persistState(state);
  return result;
}
