import {
  applyAuditRetention,
  createAuditEvent,
  verifyAuditChain,
} from "../services/mock-audit-service.mjs";

function getWatchlistCodes(state, userId = "demo-user") {
  if (!state.watchlists || typeof state.watchlists !== "object") {
    state.watchlists = {};
  }
  if (!Array.isArray(state.watchlists[userId])) {
    state.watchlists[userId] =
      userId === "demo-user" && state.watchlist instanceof Set ? [...state.watchlist] : [];
  }
  return state.watchlists[userId];
}

export function createMockRepository(state) {
  return {
    status() {
      const persistenceMode = state.persistencePath ? "json-file" : "memory-only";
      return {
        id: "mock-user-state-repository",
        name: "Mock 用户数据仓储",
        mode: "sample",
        status: "ready",
        persistenceMode,
        persistencePath: state.persistencePath ? "configured" : "",
        capabilities: [
          "watchlist",
          "preferences",
          "analysisHistory",
          "reminders",
          "portfolio",
          "notificationOutbox",
          "auditLog",
          "jobRuns",
          "deadLetterQueue",
          "workerHeartbeats",
          "workerRequestNonces",
          "workerRequestNonceCleanup",
          "queuedJobs",
          "queueTelemetry",
          "authUsers",
          "authRoleManagement",
          "authSessions",
          "auditRedaction",
          "auditRetention",
          "auditRetentionPurge",
          "auditExportPackage",
          "auditArchiveReceipts",
          "auditHashChain",
          "newsIntelligence",
          "newsIntelligenceAuditTrail",
          "complianceAcknowledgements",
          "complianceAcknowledgementAuditTrail",
          "suitabilityQuestionnaires",
          "suitabilityQuestionnaireAuditTrail",
        ],
        auditIntegrity: verifyAuditChain(state.auditLogs),
        limits: {
          analysisHistory: 500,
          newsIntelligence: 500,
          notificationOutbox: 500,
          complianceAcknowledgements: 200,
          suitabilityQuestionnaires: 200,
          auditLogs: 500,
          jobRuns: 200,
          deadLetterQueue: 200,
          workerHeartbeats: 100,
          workerRequestNonces: 500,
          auditArchiveReceipts: 200,
          queuedJobs: 200,
        },
        disclaimer:
          persistenceMode === "json-file"
            ? "当前为样例 JSON 文件持久化桥，不具备生产数据库的加密、迁移、索引、备份和权限隔离能力。"
            : "当前为内存样例仓储，服务重启后数据会丢失，不代表生产数据库。",
      };
    },
    listWatchlistCodes(userId = "demo-user") {
      return [...getWatchlistCodes(state, userId)];
    },
    addWatchlistCode(userId, code) {
      const effectiveUserId = code === undefined ? "demo-user" : userId;
      const effectiveCode = code === undefined ? userId : code;
      const codes = getWatchlistCodes(state, effectiveUserId);
      if (!codes.includes(effectiveCode)) {
        codes.push(effectiveCode);
      }
      if (effectiveUserId === "demo-user" && state.watchlist instanceof Set) {
        state.watchlist.add(effectiveCode);
      }
      return codes.length;
    },
    removeWatchlistCode(userId, code) {
      const effectiveUserId = code === undefined ? "demo-user" : userId;
      const effectiveCode = code === undefined ? userId : code;
      state.watchlists[effectiveUserId] = getWatchlistCodes(state, effectiveUserId).filter(
        (item) => item !== effectiveCode,
      );
      if (effectiveUserId === "demo-user" && state.watchlist instanceof Set) {
        state.watchlist.delete(effectiveCode);
      }
      return state.watchlists[effectiveUserId].length;
    },
    getPreferences(userId, fallback) {
      return state.preferences[userId] || fallback;
    },
    savePreferences(userId, preferences) {
      state.preferences[userId] = preferences;
      return preferences;
    },
    listAnalysisHistory(userId, limit = 50) {
      return state.analysisHistory.filter((record) => record.userId === userId).slice(0, limit);
    },
    saveAnalysisHistory(record) {
      state.analysisHistory.unshift(record);
      state.analysisHistory = state.analysisHistory.slice(0, 500);
      return record;
    },
    listNewsIntelligenceRecords({ market = "", symbol = "", limit = 50 } = {}) {
      return state.newsIntelligence
        .filter((record) => {
          const marketMatches = !market || record.market === market;
          const symbolMatches =
            !symbol ||
            record.symbol === symbol ||
            record.code === symbol ||
            (Array.isArray(record.relatedTickers) && record.relatedTickers.includes(symbol));
          return marketMatches && symbolMatches;
        })
        .slice(0, limit);
    },
    saveNewsIntelligenceRecord(record) {
      const existingIndex = state.newsIntelligence.findIndex((item) => item.id === record.id);
      if (existingIndex >= 0) {
        state.newsIntelligence[existingIndex] = {
          ...state.newsIntelligence[existingIndex],
          ...record,
          updatedAt: record.persistedAt || new Date().toISOString(),
        };
        return state.newsIntelligence[existingIndex];
      }
      state.newsIntelligence.unshift(record);
      state.newsIntelligence = state.newsIntelligence.slice(0, 500);
      return record;
    },
    listComplianceAcknowledgements(userId, limit = 20) {
      return (state.complianceAcknowledgements || [])
        .filter((record) => record.userId === userId)
        .slice(0, limit);
    },
    latestComplianceAcknowledgement(userId, version = "") {
      return (
        (state.complianceAcknowledgements || []).find(
          (record) => record.userId === userId && (!version || record.version === version),
        ) || null
      );
    },
    saveComplianceAcknowledgement(record) {
      if (!Array.isArray(state.complianceAcknowledgements)) {
        state.complianceAcknowledgements = [];
      }
      state.complianceAcknowledgements.unshift(record);
      state.complianceAcknowledgements = state.complianceAcknowledgements.slice(0, 200);
      return record;
    },
    listSuitabilityQuestionnaires(userId, limit = 20) {
      return (state.suitabilityQuestionnaires || [])
        .filter((record) => record.userId === userId)
        .slice(0, limit);
    },
    latestSuitabilityQuestionnaire(userId, version = "") {
      return (
        (state.suitabilityQuestionnaires || []).find(
          (record) => record.userId === userId && (!version || record.version === version),
        ) || null
      );
    },
    saveSuitabilityQuestionnaire(record) {
      if (!Array.isArray(state.suitabilityQuestionnaires)) {
        state.suitabilityQuestionnaires = [];
      }
      state.suitabilityQuestionnaires.unshift(record);
      state.suitabilityQuestionnaires = state.suitabilityQuestionnaires.slice(0, 200);
      return record;
    },
    listReminders(userId) {
      return state.reminders.filter((rule) => rule.userId === userId);
    },
    addReminder(rule) {
      state.reminders.unshift(rule);
      return rule;
    },
    nextReminderId() {
      return `reminder-${state.nextReminderId++}`;
    },
    removeReminder(userId, id) {
      state.reminders = state.reminders.filter(
        (rule) => !(rule.userId === userId && rule.id === id),
      );
      return state.reminders.length;
    },
    listPortfolioEntries(userId, limit = 50) {
      return state.portfolio.filter((entry) => entry.userId === userId).slice(0, limit);
    },
    savePortfolioEntry(entry) {
      const existingIndex = state.portfolio.findIndex(
        (item) => item.userId === entry.userId && item.code === entry.code,
      );
      if (existingIndex >= 0) {
        state.portfolio[existingIndex] = {
          ...state.portfolio[existingIndex],
          ...entry,
          updatedAt: entry.savedAt,
        };
        return state.portfolio[existingIndex];
      }
      state.portfolio.unshift(entry);
      state.portfolio = state.portfolio.slice(0, 500);
      return entry;
    },
    findAuthUserByEmail(email) {
      return Object.values(state.authUsers || {}).find((user) => user.email === email) || null;
    },
    getAuthUser(userId) {
      return state.authUsers?.[userId] || null;
    },
    createAuthUser(user) {
      const id = `user-${state.nextAuthUserId++}`;
      state.authUsers[id] = { ...user, id };
      return state.authUsers[id];
    },
    updateAuthUserRoles(userId, roles = [], grant = {}) {
      if (!state.authUsers?.[userId]) return null;
      const currentGrants =
        state.authUsers[userId].roleGrants && typeof state.authUsers[userId].roleGrants === "object"
          ? state.authUsers[userId].roleGrants
          : {};
      const nextRoles = Array.isArray(roles) ? [...roles] : [];
      const nextGrants = Object.fromEntries(
        nextRoles.map((role) => [
          role,
          {
            ...(currentGrants[role] || {}),
            ...(grant && typeof grant === "object" ? grant : {}),
          },
        ]),
      );
      state.authUsers[userId] = {
        ...state.authUsers[userId],
        roles: nextRoles,
        roleGrants: nextGrants,
        updatedAt: new Date().toISOString(),
      };
      return state.authUsers[userId];
    },
    saveAuthSession(session) {
      state.authSessions.unshift(session);
      state.authSessions = state.authSessions.slice(0, 500);
      return session;
    },
    findAuthSessionByTokenHash(tokenHash, now = Date.now()) {
      return (
        (state.authSessions || []).find(
          (session) => session.tokenHash === tokenHash && Date.parse(session.expiresAt) > now,
        ) || null
      );
    },
    listAuthSessions(userId, now = Date.now(), limit = 20) {
      return (state.authSessions || [])
        .filter((session) => session.userId === userId && Date.parse(session.expiresAt) > now)
        .slice(0, limit);
    },
    findAuthSession(userId, sessionId, now = Date.now()) {
      return (
        (state.authSessions || []).find(
          (session) =>
            session.userId === userId &&
            session.id === sessionId &&
            Date.parse(session.expiresAt) > now,
        ) || null
      );
    },
    removeAuthSession(sessionId) {
      const before = state.authSessions.length;
      state.authSessions = state.authSessions.filter((session) => session.id !== sessionId);
      return before - state.authSessions.length;
    },
    removeAuthSessionForUser(userId, sessionId) {
      const before = state.authSessions.length;
      state.authSessions = state.authSessions.filter(
        (session) => !(session.userId === userId && session.id === sessionId),
      );
      return before - state.authSessions.length;
    },
    listNotifications(userId, limit = 50) {
      return state.notificationOutbox
        .filter((notification) => notification.userId === userId)
        .slice(0, limit);
    },
    findNotification(userId, id) {
      return (
        state.notificationOutbox.find(
          (notification) => notification.userId === userId && notification.id === id,
        ) || null
      );
    },
    saveNotification(notification) {
      state.notificationOutbox.unshift(notification);
      state.notificationOutbox = state.notificationOutbox.slice(0, 500);
      return notification;
    },
    updateNotification(userId, id, patch) {
      const notification = this.findNotification(userId, id);
      if (!notification) return null;
      Object.assign(notification, patch, { updatedAt: new Date().toISOString() });
      return notification;
    },
    markNotificationRead(userId, id) {
      const notification = state.notificationOutbox.find(
        (item) => item.userId === userId && item.id === id,
      );
      if (!notification) return null;
      notification.status = "read";
      notification.readAt = new Date().toISOString();
      return notification;
    },
    listJobRuns(userId, limit = 50) {
      return state.jobRuns.filter((jobRun) => jobRun.userId === userId).slice(0, limit);
    },
    saveJobRun(jobRun) {
      state.jobRuns.unshift(jobRun);
      state.jobRuns = state.jobRuns.slice(0, 200);
      return jobRun;
    },
    listDeadLetterJobs(userId, limit = 50) {
      return state.deadLetterQueue
        .filter((job) => job.userId === userId)
        .slice(0, limit);
    },
    findDeadLetterJob(userId, id) {
      return (
        state.deadLetterQueue.find((job) => job.userId === userId && job.id === id) || null
      );
    },
    saveDeadLetterJob(record) {
      state.deadLetterQueue.unshift(record);
      state.deadLetterQueue = state.deadLetterQueue.slice(0, 200);
      return record;
    },
    updateDeadLetterJob(userId, id, patch) {
      const job = this.findDeadLetterJob(userId, id);
      if (!job) return null;
      Object.assign(job, patch, { updatedAt: new Date().toISOString() });
      return job;
    },
    listWorkerHeartbeats(userId, limit = 50) {
      return state.workerHeartbeats
        .filter((heartbeat) => heartbeat.userId === userId)
        .slice(0, limit);
    },
    saveWorkerHeartbeat(record) {
      const existingIndex = state.workerHeartbeats.findIndex(
        (heartbeat) =>
          heartbeat.userId === record.userId && heartbeat.workerId === record.workerId,
      );
      if (existingIndex >= 0) {
        state.workerHeartbeats[existingIndex] = {
          ...state.workerHeartbeats[existingIndex],
          ...record,
          updatedAt: record.lastSeenAt || new Date().toISOString(),
        };
        return state.workerHeartbeats[existingIndex];
      }
      state.workerHeartbeats.unshift(record);
      state.workerHeartbeats = state.workerHeartbeats.slice(0, 100);
      return record;
    },
    listWorkerRequestNonces(userId, limit = 100) {
      return state.workerRequestNonces
        .filter((nonce) => nonce.userId === userId)
        .slice(0, limit);
    },
    findWorkerRequestNonce(userId, nonce) {
      return (
        state.workerRequestNonces.find(
          (record) => record.userId === userId && record.nonce === nonce,
        ) || null
      );
    },
    pruneWorkerRequestNonces(userId, now = Date.now()) {
      const before = state.workerRequestNonces.length;
      state.workerRequestNonces = state.workerRequestNonces.filter((record) => {
        if (record.userId !== userId) return true;
        const expiresAt = Date.parse(record.expiresAt || "");
        return Number.isFinite(expiresAt) && expiresAt > now;
      });
      return before - state.workerRequestNonces.length;
    },
    saveWorkerRequestNonce(record) {
      state.workerRequestNonces.unshift(record);
      state.workerRequestNonces = state.workerRequestNonces.slice(0, 500);
      return record;
    },
    listAuditArchiveReceipts(userId, limit = 50) {
      return state.auditArchiveReceipts
        .filter((receipt) => receipt.userId === userId)
        .slice(0, limit);
    },
    saveAuditArchiveReceipt(record) {
      state.auditArchiveReceipts.unshift(record);
      state.auditArchiveReceipts = state.auditArchiveReceipts.slice(0, 200);
      return record;
    },
    listQueuedJobs(userId, limit = 50) {
      return state.queuedJobs.filter((job) => job.userId === userId).slice(0, limit);
    },
    findQueuedJob(userId, id) {
      return state.queuedJobs.find((job) => job.userId === userId && job.id === id) || null;
    },
    saveQueuedJob(record) {
      state.queuedJobs.unshift(record);
      state.queuedJobs = state.queuedJobs.slice(0, 200);
      return record;
    },
    updateQueuedJob(userId, id, patch) {
      const job = this.findQueuedJob(userId, id);
      if (!job) return null;
      Object.assign(job, patch, { updatedAt: new Date().toISOString() });
      return job;
    },
    recordAudit({ user, eventType, severity = "info", message, metadata = {} }) {
      const previousHead = state.auditLogs[0] || null;
      const event = createAuditEvent({
        user,
        eventType,
        severity,
        message,
        metadata,
        previousHash: previousHead?.hash || "audit-genesis",
        sequence: Number(previousHead?.sequence || 0) + 1,
      });
      state.auditLogs.unshift(event);
      state.auditLogs = applyAuditRetention(state.auditLogs);
      return event;
    },
    listAuditEvents(userId, limit = 50) {
      return state.auditLogs.filter((event) => event.userId === userId).slice(0, limit);
    },
    pruneAuditEvents(userId, { before = "", maxEvents = 500 } = {}) {
      const beforeTimestamp = Date.parse(before || "");
      const userEvents = state.auditLogs.filter((event) => event.userId === userId);
      const keptUserEvents = userEvents
        .filter((event, index) => {
          if (index >= maxEvents) return false;
          if (!Number.isFinite(beforeTimestamp)) return true;
          const createdAt = Date.parse(event.createdAt || "");
          return Number.isFinite(createdAt) && createdAt >= beforeTimestamp;
        });
      const keepIds = new Set(keptUserEvents.map((event) => event.id));
      const prunedCount = userEvents.length - keptUserEvents.length;
      state.auditLogs = applyAuditRetention(
        state.auditLogs.filter((event) => event.userId !== userId || keepIds.has(event.id)),
      );
      return {
        checkedEvents: userEvents.length,
        prunedEvents: prunedCount,
        remainingEvents: keptUserEvents.length,
      };
    },
  };
}
