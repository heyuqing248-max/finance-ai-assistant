import { createHmac, timingSafeEqual } from "node:crypto";
import { createSchedulerProviderAdapter } from "./scheduler-provider-adapter.mjs";

const schedules = [
  {
    id: "schedule-reminder-evaluation",
    jobType: "reminderEvaluation",
    cadence: "every-15-minutes",
    timezone: "Australia/Brisbane",
    description: "样例提醒规则评估计划，用于未来真实 cron/queue worker 接入。",
  },
];

const idempotencyWindowMs = 10 * 60 * 1000;
const runCooldownMs = 60 * 1000;
const deadLetterMaxAttempts = 3;
const deadLetterBaseRetryMs = 60 * 1000;
const workerHeartbeatTtlMs = 2 * 60 * 1000;
const queueLagWarningMs = 5 * 60 * 1000;
const queueLagCriticalMs = 15 * 60 * 1000;
const queueDepthWarning = 25;
const queueDepthCritical = 100;
const queuedJobMaxAttempts = 3;
const workerSignatureToleranceMs = 5 * 60 * 1000;
const workerNonceRetentionMs = 24 * 60 * 60 * 1000;

function createSchedulerRunId(repository, user) {
  const jobRunCount = repository.listJobRuns(user?.id || "").length;
  return `scheduler-${Date.now()}-${jobRunCount + 1}`;
}

function latestSchedulerAudit(repository, user) {
  return repository
    .listAuditEvents(user?.id || "", 100)
    .find((event) => event.eventType === "scheduler.run_due") || null;
}

function findDuplicateSchedulerAudit(repository, user, idempotencyKey, now) {
  if (!idempotencyKey) return null;
  return repository
    .listAuditEvents(user?.id || "", 100)
    .find((event) => {
      if (event.eventType !== "scheduler.run_due") return false;
      if (event.metadata?.idempotencyKey !== idempotencyKey) return false;
      const createdAt = Date.parse(event.createdAt || "");
      return Number.isFinite(createdAt) && now - createdAt < idempotencyWindowMs;
    }) || null;
}

function buildSkippedRun(repository, user, { requestedBy, idempotencyKey, reason, matchedAudit }) {
  const now = new Date().toISOString();
  return {
    schedulerRun: {
      id: createSchedulerRunId(repository, user),
      userId: user?.id || null,
      status: "skipped",
      executionMode: "manual-due-check",
      requestedBy,
      idempotencyKey,
      startedAt: now,
      finishedAt: now,
      checkedSchedules: schedules.length,
      executedJobs: 0,
      skippedJobs: schedules.length,
      skipReason: reason,
      matchedAuditId: matchedAudit?.id || "",
    },
    schedules: schedules.map((schedule) => ({ ...schedule })),
    jobs: [],
    errors: [],
    idempotency: {
      status: "skipped",
      reason,
      key: idempotencyKey,
      matchedAuditId: matchedAudit?.id || "",
      windowSeconds: idempotencyWindowMs / 1000,
      cooldownSeconds: runCooldownMs / 1000,
    },
    disclaimer: "当前为手动触发的样例调度检查，不代表真实后台定时器或队列 worker 已部署。",
  };
}

function createDeadLetterId(repository, user) {
  const deadLetterCount = repository.listDeadLetterJobs(user?.id || "", 200).length;
  return `dlq-${Date.now()}-${deadLetterCount + 1}`;
}

function nextRetryAt(attempts, now = Date.now()) {
  const retryDelayMs = deadLetterBaseRetryMs * 2 ** Math.max(0, attempts - 1);
  return new Date(now + retryDelayMs).toISOString();
}

function deadLetterSummary(repository, user) {
  const items = repository.listDeadLetterJobs(user?.id || "", 200);
  return {
    total: items.length,
    open: items.filter((item) => item.status === "open").length,
    failed: items.filter((item) => item.status === "failed").length,
    replayed: items.filter((item) => item.status === "replayed").length,
  };
}

function saveDeadLetterJob(repository, user, { schedule, error, payload = {}, attempts = 1 }) {
  const normalizedAttempts =
    Number.isInteger(attempts) && attempts > 0 ? attempts : 1;
  const record = repository.saveDeadLetterJob({
    id: createDeadLetterId(repository, user),
    userId: user?.id || null,
    scheduleId: schedule.id,
    jobType: schedule.jobType,
    status: "open",
    attempts: normalizedAttempts,
    maxAttempts: deadLetterMaxAttempts,
    nextRetryAt: nextRetryAt(normalizedAttempts),
    lastError: {
      code: error?.code || "JOB_FAILED",
      message: error?.message || "调度任务执行失败，已进入死信队列等待重试或人工处理。",
    },
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: "",
    replayedAt: "",
    jobRunId: "",
  });
  repository.recordAudit({
    user,
    eventType: "scheduler.dead_letter.created",
    severity: "warning",
    message: "Scheduler captured a failed job in the dead letter queue.",
    metadata: {
      deadLetterJobId: record.id,
      scheduleId: record.scheduleId,
      jobType: record.jobType,
      attempts: record.attempts,
      errorCode: record.lastError.code,
    },
  });
  return record;
}

function normalizeJobTypes(jobTypes = []) {
  return [
    ...new Set(
      (Array.isArray(jobTypes) ? jobTypes : [])
        .filter((jobType) => typeof jobType === "string" && jobType.trim())
        .map((jobType) => jobType.trim()),
    ),
  ];
}

function sanitizeQueueNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : fallback;
}

function createWorkerHeartbeatId(repository, user) {
  const heartbeatCount = repository.listWorkerHeartbeats(user?.id || "", 100).length;
  return `worker-heartbeat-${Date.now()}-${heartbeatCount + 1}`;
}

function createWorkerRequestNonceId(repository, user) {
  const nonceCount = repository.listWorkerRequestNonces(user?.id || "", 500).length;
  return `worker-nonce-${Date.now()}-${nonceCount + 1}`;
}

function createQueuedJobId(repository, user) {
  const queuedJobCount = repository.listQueuedJobs(user?.id || "", 200).length;
  return `queued-job-${Date.now()}-${queuedJobCount + 1}`;
}

function createQueueRunId(repository, user) {
  const queueRunCount = repository
    .listAuditEvents(user?.id || "", 100)
    .filter((event) => event.eventType === "scheduler.queue.process").length;
  return `queue-run-${Date.now()}-${queueRunCount + 1}`;
}

function workerSignaturePayload({ operation = "", workerId = "", timestamp = "" } = {}) {
  return `${operation}:${workerId}:${timestamp}`;
}

function createWorkerSignature(secret, input = {}) {
  return createHmac("sha256", secret).update(workerSignaturePayload(input)).digest("hex");
}

function safeEqualText(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function statusForQueue(queueDepth, queueLagMs) {
  if (queueDepth >= queueDepthCritical || queueLagMs >= queueLagCriticalMs) return "critical";
  if (queueDepth >= queueDepthWarning || queueLagMs >= queueLagWarningMs) return "warning";
  return "healthy";
}

function queuedJobSummary(repository, user, now = Date.now()) {
  const jobs = repository.listQueuedJobs(user?.id || "", 200);
  const queued = jobs.filter((job) => job.status === "queued");
  const retrying = jobs.filter((job) => job.status === "retrying");
  const running = jobs.filter((job) => job.status === "running");
  const failed = jobs.filter((job) => job.status === "failed");
  const completed = jobs.filter((job) => job.status === "completed");
  const dueJobs = jobs.filter((job) => {
    if (!["queued", "retrying"].includes(job.status)) return false;
    const dueAt = Date.parse(job.nextRetryAt || job.scheduledFor || "");
    return Number.isFinite(dueAt) && dueAt <= now;
  });
  const nextDueAt = jobs
    .filter((job) => ["queued", "retrying"].includes(job.status))
    .map((job) => Date.parse(job.nextRetryAt || job.scheduledFor || ""))
    .filter(Number.isFinite)
    .sort((left, right) => left - right)[0];
  return {
    total: jobs.length,
    queued: queued.length,
    retrying: retrying.length,
    running: running.length,
    failed: failed.length,
    completed: completed.length,
    due: dueJobs.length,
    nextDueAt: Number.isFinite(nextDueAt) ? new Date(nextDueAt).toISOString() : "",
  };
}

function dueQueuedJobs(repository, user, { limit = 10, now = Date.now() } = {}) {
  return repository
    .listQueuedJobs(user?.id || "", 200)
    .filter((job) => {
      if (!["queued", "retrying"].includes(job.status)) return false;
      const dueAt = Date.parse(job.nextRetryAt || job.scheduledFor || "");
      return Number.isFinite(dueAt) && dueAt <= now;
    })
    .sort((left, right) => {
      const priorityDiff = Number(right.priority || 0) - Number(left.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      const leftDueAt = Date.parse(left.nextRetryAt || left.scheduledFor || "");
      const rightDueAt = Date.parse(right.nextRetryAt || right.scheduledFor || "");
      return leftDueAt - rightDueAt;
    })
    .slice(0, limit);
}

function buildQueueAlerts({ queueSummary, deadLetters, workerHealth }) {
  const alerts = [];
  if (queueSummary.failed > 0) {
    alerts.push({
      severity: "warning",
      code: "queued-jobs-failed",
      message: `${queueSummary.failed} 个队列任务处于失败状态，需要排查或重试。`,
    });
  }
  if (queueSummary.due > 0 && workerHealth.activeWorkerCount === 0) {
    alerts.push({
      severity: "critical",
      code: "due-jobs-without-active-worker",
      message: `${queueSummary.due} 个任务已到期，但当前没有活跃 worker 心跳。`,
    });
  }
  if (deadLetters.open > 0) {
    alerts.push({
      severity: "warning",
      code: "open-dead-letter-jobs",
      message: `${deadLetters.open} 个死信任务等待重试或人工处理。`,
    });
  }
  if (workerHealth.queue?.status === "critical") {
    alerts.push({
      severity: "critical",
      code: "queue-lag-critical",
      message: "队列深度或延迟已达到严重阈值。",
    });
  }
  return alerts;
}

function buildQueueState(repository, user) {
  const workerHealth = buildWorkerHealth(repository, user);
  const deadLetters = deadLetterSummary(repository, user);
  const queueSummary = queuedJobSummary(repository, user);
  const alerts = buildQueueAlerts({ queueSummary, deadLetters, workerHealth });
  return {
    status: alerts.some((alert) => alert.severity === "critical")
      ? "critical"
      : alerts.length
        ? "attention"
        : queueSummary.total
          ? "ready"
          : "empty",
    checkedAt: new Date().toISOString(),
    summary: queueSummary,
    deadLetterQueue: deadLetters,
    workerHealth: {
      status: workerHealth.status,
      activeWorkerCount: workerHealth.activeWorkerCount,
      staleWorkerCount: workerHealth.staleWorkerCount,
      queue: workerHealth.queue,
    },
    alerts,
    retryPolicy: {
      maxAttempts: queuedJobMaxAttempts,
      retryBackoff: "exponential",
      baseRetrySeconds: deadLetterBaseRetryMs / 1000,
      deadLetterAfterMaxAttempts: true,
    },
    disclaimer: "当前为样例队列状态，不代表真实队列 provider、后台 worker 或任务调度已经部署。",
  };
}

function buildWorkerHealth(repository, user, now = Date.now()) {
  const workers = repository.listWorkerHeartbeats(user?.id || "", 50).map((heartbeat) => {
    const lastSeenAt = Date.parse(heartbeat.lastSeenAt || "");
    const ageMs = Number.isFinite(lastSeenAt) ? Math.max(0, now - lastSeenAt) : Infinity;
    const stale = !Number.isFinite(ageMs) || ageMs > workerHeartbeatTtlMs;
    return {
      ...heartbeat,
      ageMs: Number.isFinite(ageMs) ? ageMs : null,
      status: stale ? "stale" : heartbeat.status,
    };
  });
  const activeWorkers = workers.filter((worker) => worker.status !== "stale");
  const maxQueueLagMs = workers.reduce(
    (max, worker) => Math.max(max, Number(worker.queueLagMs || 0)),
    0,
  );
  const totalQueueDepth = workers.reduce(
    (total, worker) => total + Number(worker.queueDepth || 0),
    0,
  );
  const openDeadLetters = deadLetterSummary(repository, user).open;
  const queueStatus = statusForQueue(totalQueueDepth + openDeadLetters, maxQueueLagMs);
  const status =
    workers.length === 0
      ? "no-workers"
      : workers.some((worker) => worker.status === "critical") || queueStatus === "critical"
        ? "critical"
        : workers.some((worker) => worker.status === "stale") || queueStatus === "warning"
          ? "degraded"
          : "healthy";

  return {
    status,
    checkedAt: new Date(now).toISOString(),
    workerCount: workers.length,
    activeWorkerCount: activeWorkers.length,
    staleWorkerCount: workers.filter((worker) => worker.status === "stale").length,
    workers,
    queue: {
      status: workers.length ? queueStatus : "no-workers",
      totalDepth: totalQueueDepth,
      openDeadLetters,
      pendingWork: totalQueueDepth + openDeadLetters,
      maxLagMs: maxQueueLagMs,
      warningLagMs: queueLagWarningMs,
      criticalLagMs: queueLagCriticalMs,
      warningDepth: queueDepthWarning,
      criticalDepth: queueDepthCritical,
    },
    policy: {
      heartbeatTtlSeconds: workerHeartbeatTtlMs / 1000,
      queueLagWarningSeconds: queueLagWarningMs / 1000,
      queueLagCriticalSeconds: queueLagCriticalMs / 1000,
      queueDepthWarning,
      queueDepthCritical,
    },
    disclaimer: "当前为样例 worker 心跳与队列延迟遥测，不代表真实后台 worker 已部署。",
  };
}

export function createMockSchedulerService({ jobRunner, env = process.env }) {
  const providerAdapter = createSchedulerProviderAdapter({ env });

  function workerAuthPolicy() {
    const secret =
      typeof env.FINANCE_AI_WORKER_SECRET === "string" && env.FINANCE_AI_WORKER_SECRET.trim()
        ? env.FINANCE_AI_WORKER_SECRET.trim()
        : "";
    const signatureRequired =
      String(env.FINANCE_AI_WORKER_SIGNATURE_REQUIRED || "").toLowerCase() === "true";
    return {
      status: secret ? (signatureRequired ? "signed-required" : "configured") : "sample-bypass",
      configured: Boolean(secret),
      enforcement: secret ? "required" : "sample-bypass",
      signatureRequired: Boolean(secret && signatureRequired),
      nonceRequired: Boolean(secret && signatureRequired),
      signatureAlgorithm: "hmac-sha256",
      timestampToleranceSeconds: workerSignatureToleranceMs / 1000,
      acceptedHeader: "x-worker-secret",
      acceptedBodyField: "workerSecret",
      acceptedSignatureHeader: "x-worker-signature",
      acceptedSignatureBodyField: "workerSignature",
      acceptedTimestampHeader: "x-worker-timestamp",
      acceptedTimestampBodyField: "workerTimestamp",
      acceptedNonceHeader: "x-worker-nonce",
      acceptedNonceBodyField: "workerNonce",
      nonceRetentionLimit: 500,
      nonceRetentionSeconds: workerNonceRetentionMs / 1000,
      nonceCleanupSupported: true,
      appliesTo: ["recordWorkerHeartbeat", "processQueuedJobs"],
      disclaimer: secret
        ? signatureRequired
          ? "已配置 worker secret、签名校验和 nonce 防重放；样例 worker 请求需要匹配凭证、时间戳、HMAC 签名和一次性 nonce。"
          : "已配置 worker secret；样例 worker 心跳和队列处理需要匹配凭证。"
        : "当前未配置 worker secret；网页/本机样例允许手动触发，生产 worker 必须配置凭证。",
    };
  }

  function workerNonceMaintenancePolicy() {
    return {
      status: "sample-ready",
      cleanupSupported: true,
      retentionSeconds: workerNonceRetentionMs / 1000,
      retentionLimit: 500,
      auditTrailRequired: true,
      manualCleanupSupported: true,
      disclaimer:
        "当前为样例 worker nonce 清理策略；生产环境仍需要数据库定时清理任务、告警和运维记录。",
    };
  }

  function verifyWorkerAccess(input = {}) {
    const policy = workerAuthPolicy();
    if (!policy.configured) return { ok: true, policy };
    const providedSecret =
      typeof input.workerSecret === "string" && input.workerSecret.trim()
        ? input.workerSecret.trim()
        : "";
    if (providedSecret !== env.FINANCE_AI_WORKER_SECRET) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_AUTH_REQUIRED",
          message: "worker secret 缺失或不匹配，已阻止样例 worker 写入。",
        },
      };
    }
    if (!policy.signatureRequired) return { ok: true, policy };

    const timestamp =
      typeof input.workerTimestamp === "string" && input.workerTimestamp.trim()
        ? input.workerTimestamp.trim()
        : "";
    const signature =
      typeof input.workerSignature === "string" && input.workerSignature.trim()
        ? input.workerSignature.trim()
        : "";
    const timestampValue = Date.parse(timestamp);
    if (!Number.isFinite(timestampValue)) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_SIGNATURE_REQUIRED",
          message: "worker 时间戳缺失或无效，已阻止样例 worker 写入。",
        },
      };
    }
    if (Math.abs(Date.now() - timestampValue) > workerSignatureToleranceMs) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_SIGNATURE_EXPIRED",
          message: "worker 时间戳超出允许窗口，已阻止可能的重放请求。",
        },
      };
    }
    const expectedSignature = createWorkerSignature(env.FINANCE_AI_WORKER_SECRET, {
      operation: input.operation,
      workerId: input.workerId,
      timestamp,
    });
    if (!signature || !safeEqualText(signature, expectedSignature)) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_SIGNATURE_INVALID",
          message: "worker 签名缺失或不匹配，已阻止样例 worker 写入。",
        },
      };
    }
    const nonce =
      typeof input.workerNonce === "string" && input.workerNonce.trim()
        ? input.workerNonce.trim()
        : "";
    if (!nonce) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_NONCE_REQUIRED",
          message: "worker nonce 缺失，已阻止可能的重复请求。",
        },
      };
    }
    input.repository?.pruneWorkerRequestNonces(input.user?.id || "", Date.now());
    if (input.repository?.findWorkerRequestNonce(input.user?.id || "", nonce)) {
      return {
        ok: false,
        policy,
        error: {
          code: "WORKER_NONCE_REPLAYED",
          message: "worker nonce 已使用，已阻止重复请求。",
        },
      };
    }
    input.repository?.saveWorkerRequestNonce({
      id: createWorkerRequestNonceId(input.repository, input.user),
      userId: input.user?.id || null,
      workerId: input.workerId || "sample-worker",
      operation: input.operation || "unknown",
      nonce,
      timestamp,
      expiresAt: new Date(Date.now() + workerNonceRetentionMs).toISOString(),
      createdAt: new Date().toISOString(),
    });
    return { ok: true, policy };
  }

  function runDueJobs(repository, user, options = {}) {
    const startedAt = new Date().toISOString();
    const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
    const idempotencyKey =
      typeof options.idempotencyKey === "string" && options.idempotencyKey.trim()
        ? options.idempotencyKey.trim()
        : "";
    const now = Date.parse(startedAt);
    const duplicateAudit = findDuplicateSchedulerAudit(repository, user, idempotencyKey, now);
    if (duplicateAudit) {
      const skipped = buildSkippedRun(repository, user, {
        requestedBy,
        idempotencyKey,
        reason: "duplicate-idempotency-key",
        matchedAudit: duplicateAudit,
      });
      repository.recordAudit({
        user,
        eventType: "scheduler.run_due",
        message: "Scheduler due-job check skipped by idempotency key.",
        metadata: {
          schedulerRunId: skipped.schedulerRun.id,
          executionMode: skipped.schedulerRun.executionMode,
          requestedBy,
          idempotencyKey,
          status: skipped.schedulerRun.status,
          skipReason: skipped.schedulerRun.skipReason,
          checkedSchedules: skipped.schedulerRun.checkedSchedules,
          executedJobs: 0,
          skippedJobs: skipped.schedulerRun.skippedJobs,
        },
      });
      return skipped;
    }

    const lastRun = latestSchedulerAudit(repository, user);
    const lastRunAt = Date.parse(lastRun?.createdAt || "");
    if (!idempotencyKey && Number.isFinite(lastRunAt) && now - lastRunAt < runCooldownMs) {
      const skipped = buildSkippedRun(repository, user, {
        requestedBy,
        idempotencyKey,
        reason: "cooldown-active",
        matchedAudit: lastRun,
      });
      repository.recordAudit({
        user,
        eventType: "scheduler.run_due",
        message: "Scheduler due-job check skipped by sample cooldown.",
        metadata: {
          schedulerRunId: skipped.schedulerRun.id,
          executionMode: skipped.schedulerRun.executionMode,
          requestedBy,
          idempotencyKey,
          status: skipped.schedulerRun.status,
          skipReason: skipped.schedulerRun.skipReason,
          checkedSchedules: skipped.schedulerRun.checkedSchedules,
          executedJobs: 0,
          skippedJobs: skipped.schedulerRun.skippedJobs,
        },
      });
      return skipped;
    }

    const jobs = [];
    const errors = [];

    schedules.forEach((schedule) => {
      if (!jobRunner.supports(schedule.jobType)) {
        const error = {
          scheduleId: schedule.id,
          jobType: schedule.jobType,
          code: "UNSUPPORTED_JOB",
          message: "当前任务运行器不支持该调度任务。",
        };
        const deadLetterJob = saveDeadLetterJob(repository, user, { schedule, error });
        errors.push({ ...error, deadLetterJobId: deadLetterJob.id });
        return;
      }

      const job = jobRunner.runJob(repository, user, schedule.jobType);
      if (job.ok) {
        jobs.push({
          scheduleId: schedule.id,
          jobType: schedule.jobType,
          jobRun: job.jobRun,
          result: job.result,
        });
        return;
      }

      const error = {
        scheduleId: schedule.id,
        jobType: schedule.jobType,
        code: job.error?.code || "JOB_FAILED",
        message: job.error?.message || "任务执行失败。",
      };
      const deadLetterJob = saveDeadLetterJob(repository, user, {
        schedule,
        error,
        payload: { requestedBy, idempotencyKey },
      });
      errors.push({ ...error, deadLetterJobId: deadLetterJob.id });
    });

    const finishedAt = new Date().toISOString();
    const schedulerRun = {
      id: createSchedulerRunId(repository, user),
      userId: user?.id || null,
      status: errors.length ? "partial" : "success",
      executionMode: "manual-due-check",
      requestedBy,
      idempotencyKey,
      startedAt,
      finishedAt,
      checkedSchedules: schedules.length,
      executedJobs: jobs.length,
      skippedJobs: errors.length,
    };

    repository.recordAudit({
      user,
      eventType: "scheduler.run_due",
      message: "Scheduler due-job check completed.",
      metadata: {
        schedulerRunId: schedulerRun.id,
        executionMode: schedulerRun.executionMode,
        requestedBy,
        idempotencyKey,
        status: schedulerRun.status,
        checkedSchedules: schedulerRun.checkedSchedules,
        executedJobs: schedulerRun.executedJobs,
        skippedJobs: schedulerRun.skippedJobs,
        deadLetterOpenCount: deadLetterSummary(repository, user).open,
      },
    });

    return {
      schedulerRun,
      schedules: schedules.map((schedule) => ({ ...schedule })),
      jobs,
      errors,
      deadLetterQueue: deadLetterSummary(repository, user),
      idempotency: {
        status: "accepted",
        key: idempotencyKey,
        windowSeconds: idempotencyWindowMs / 1000,
        cooldownSeconds: runCooldownMs / 1000,
      },
      disclaimer: "当前为手动触发的样例调度检查，不代表真实后台定时器或队列 worker 已部署。",
    };
  }

  function replayDeadLetterJob(repository, user, id) {
    const deadLetterJob = repository.findDeadLetterJob(user?.id || "", id);
    if (!deadLetterJob) {
      return {
        ok: false,
        error: {
          code: "DEAD_LETTER_NOT_FOUND",
          message: "未找到该死信任务，可能已被处理或不属于当前用户。",
        },
      };
    }

    if (deadLetterJob.status === "replayed") {
      return {
        ok: false,
        deadLetterJob,
        error: {
          code: "DEAD_LETTER_ALREADY_REPLAYED",
          message: "该死信任务已经重放成功，不能重复重放。",
        },
      };
    }

    const startedAt = new Date().toISOString();
    const nextAttempt = Number(deadLetterJob.attempts || 0) + 1;
    const job = jobRunner.runJob(repository, user, deadLetterJob.jobType);
    if (job.ok) {
      const updated = repository.updateDeadLetterJob(user.id, id, {
        status: "replayed",
        attempts: nextAttempt,
        nextRetryAt: "",
        replayedAt: new Date().toISOString(),
        jobRunId: job.jobRun?.id || "",
        lastError: deadLetterJob.lastError,
      });
      repository.recordAudit({
        user,
        eventType: "scheduler.dead_letter.replay",
        message: "Dead letter job replay succeeded.",
        metadata: {
          deadLetterJobId: id,
          jobType: deadLetterJob.jobType,
          attempts: nextAttempt,
          jobRunId: job.jobRun?.id || "",
          startedAt,
          status: "replayed",
        },
      });
      return {
        ok: true,
        deadLetterJob: updated,
        jobRun: job.jobRun,
        result: job.result,
        deadLetterQueue: deadLetterSummary(repository, user),
      };
    }

    const status = nextAttempt >= deadLetterMaxAttempts ? "failed" : "open";
    const updated = repository.updateDeadLetterJob(user.id, id, {
      status,
      attempts: nextAttempt,
      nextRetryAt: status === "open" ? nextRetryAt(nextAttempt) : "",
      lastError: {
        code: job.error?.code || "JOB_FAILED",
        message: job.error?.message || "死信任务重放失败。",
      },
    });
    repository.recordAudit({
      user,
      eventType: "scheduler.dead_letter.replay",
      severity: "warning",
      message: "Dead letter job replay failed.",
      metadata: {
        deadLetterJobId: id,
        jobType: deadLetterJob.jobType,
        attempts: nextAttempt,
        status,
        errorCode: updated?.lastError?.code || "JOB_FAILED",
      },
    });
    return {
      ok: false,
      deadLetterJob: updated,
      deadLetterQueue: deadLetterSummary(repository, user),
      error: updated?.lastError || { code: "JOB_FAILED", message: "死信任务重放失败。" },
    };
  }

  function recordWorkerHeartbeat(repository, user, input = {}) {
    const now = new Date().toISOString();
    const workerId =
      typeof input.workerId === "string" && input.workerId.trim()
        ? input.workerId.trim()
        : "sample-worker";
    const workerAuth = verifyWorkerAccess({
      ...input,
      operation: "recordWorkerHeartbeat",
      workerId,
      repository,
      user,
    });
    if (!workerAuth.ok) {
      return {
        ok: false,
        workerAuth: workerAuth.policy,
        error: workerAuth.error,
      };
    }
    const queueDepth = sanitizeQueueNumber(input.queueDepth);
    const queueLagMs = sanitizeQueueNumber(input.queueLagMs);
    const heartbeat = repository.saveWorkerHeartbeat({
      id: createWorkerHeartbeatId(repository, user),
      userId: user?.id || null,
      workerId,
      jobTypes: normalizeJobTypes(input.jobTypes).length
        ? normalizeJobTypes(input.jobTypes)
        : ["reminderEvaluation"],
      status: statusForQueue(queueDepth, queueLagMs),
      queueDepth,
      queueLagMs,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    repository.recordAudit({
      user,
      eventType: "scheduler.worker_heartbeat",
      message: "Scheduler worker heartbeat recorded.",
      metadata: {
        workerId: heartbeat.workerId,
        status: heartbeat.status,
        queueDepth: heartbeat.queueDepth,
        queueLagMs: heartbeat.queueLagMs,
        jobTypes: heartbeat.jobTypes,
      },
    });
    return {
      ok: true,
      heartbeat,
      workerHealth: buildWorkerHealth(repository, user),
      workerAuth: workerAuth.policy,
    };
  }

  function enqueueJob(repository, user, input = {}) {
    const jobType =
      typeof input.jobType === "string" && input.jobType.trim()
        ? input.jobType.trim()
        : "reminderEvaluation";
    const now = new Date().toISOString();
    const scheduledFor =
      typeof input.scheduledFor === "string" && input.scheduledFor.trim()
        ? input.scheduledFor.trim()
        : now;
    const priority = Number.isInteger(input.priority)
      ? Math.max(0, Math.min(10, input.priority))
      : 5;
    const job = repository.saveQueuedJob({
      id: createQueuedJobId(repository, user),
      userId: user?.id || null,
      jobType,
      status: "queued",
      priority,
      attempts: 0,
      maxAttempts: queuedJobMaxAttempts,
      scheduledFor,
      nextRetryAt: "",
      payload:
        input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
          ? input.payload
          : {},
      lastError: { code: "", message: "" },
      createdAt: now,
      updatedAt: now,
    });
    repository.recordAudit({
      user,
      eventType: "scheduler.queue.enqueue",
      message: "Scheduler sample job enqueued.",
      metadata: {
        queuedJobId: job.id,
        jobType: job.jobType,
        status: job.status,
        priority: job.priority,
        scheduledFor: job.scheduledFor,
      },
    });
    return {
      queuedJob: job,
      queueState: buildQueueState(repository, user),
    };
  }

  function processQueuedJobs(repository, user, options = {}) {
    const startedAt = new Date().toISOString();
    const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
    const workerId =
      typeof options.workerId === "string" && options.workerId.trim()
        ? options.workerId.trim()
        : "manual-sample-worker";
    const workerAuth = verifyWorkerAccess({
      ...options,
      operation: "processQueuedJobs",
      workerId,
      repository,
      user,
    });
    if (!workerAuth.ok) {
      return {
        ok: false,
        workerAuth: workerAuth.policy,
        error: workerAuth.error,
        queueState: buildQueueState(repository, user),
      };
    }
    const limit = Number.isInteger(options.limit)
      ? Math.max(1, Math.min(20, options.limit))
      : 5;
    const jobsToProcess = dueQueuedJobs(repository, user, { limit });
    const processedJobs = [];
    const errors = [];

    jobsToProcess.forEach((queuedJob) => {
      const attempt = Number(queuedJob.attempts || 0) + 1;
      repository.updateQueuedJob(user.id, queuedJob.id, {
        status: "running",
        attempts: attempt,
        lastError: { code: "", message: "" },
        workerId,
        startedAt,
      });

      const failQueuedJob = (error) => {
        const maxAttempts = Number(queuedJob.maxAttempts || queuedJobMaxAttempts);
        const finalFailure = attempt >= maxAttempts;
        const updated = repository.updateQueuedJob(user.id, queuedJob.id, {
          status: finalFailure ? "failed" : "retrying",
          nextRetryAt: finalFailure ? "" : nextRetryAt(attempt),
          lastError: {
            code: error.code || "JOB_FAILED",
            message: error.message || "队列任务执行失败，已安排重试或进入死信队列。",
          },
        });
        let deadLetterJob = null;
        if (finalFailure) {
          deadLetterJob = saveDeadLetterJob(repository, user, {
            schedule: { id: queuedJob.id, jobType: queuedJob.jobType },
            error: updated?.lastError || error,
            attempts: attempt,
            payload: {
              queuedJobId: queuedJob.id,
              queuedJobPayload: queuedJob.payload || {},
              requestedBy,
              workerId,
            },
          });
        }
        const record = {
          queuedJob: updated,
          status: updated?.status || "failed",
          attempt,
          deadLetterJobId: deadLetterJob?.id || "",
          error: updated?.lastError || error,
        };
        processedJobs.push(record);
        errors.push({
          queuedJobId: queuedJob.id,
          jobType: queuedJob.jobType,
          attempt,
          status: record.status,
          deadLetterJobId: record.deadLetterJobId,
          code: record.error.code,
          message: record.error.message,
        });
      };

      if (!jobRunner.supports(queuedJob.jobType)) {
        failQueuedJob({
          code: "UNSUPPORTED_JOB",
          message: "当前任务运行器不支持该队列任务。",
        });
        return;
      }

      const job = jobRunner.runJob(repository, user, queuedJob.jobType);
      if (!job.ok) {
        failQueuedJob({
          code: job.error?.code || "JOB_FAILED",
          message: job.error?.message || "队列任务执行失败。",
        });
        return;
      }

      const completed = repository.updateQueuedJob(user.id, queuedJob.id, {
        status: "completed",
        nextRetryAt: "",
        lastError: { code: "", message: "" },
        jobRunId: job.jobRun?.id || "",
        completedAt: new Date().toISOString(),
      });
      processedJobs.push({
        queuedJob: completed,
        status: "completed",
        attempt,
        jobRun: job.jobRun,
        result: job.result,
      });
    });

    const finishedAt = new Date().toISOString();
    const completedCount = processedJobs.filter((job) => job.status === "completed").length;
    const retryingCount = processedJobs.filter((job) => job.status === "retrying").length;
    const failedCount = processedJobs.filter((job) => job.status === "failed").length;
    const queueRun = {
      id: createQueueRunId(repository, user),
      userId: user?.id || null,
      status: processedJobs.length === 0 ? "idle" : errors.length ? "partial" : "success",
      executionMode: "manual-queue-drain",
      requestedBy,
      workerId,
      startedAt,
      finishedAt,
      checkedJobs: jobsToProcess.length,
      processedJobs: processedJobs.length,
      completedJobs: completedCount,
      retryScheduledJobs: retryingCount,
      failedJobs: failedCount,
      limit,
    };

    repository.recordAudit({
      user,
      eventType: "scheduler.queue.process",
      severity: failedCount ? "warning" : "info",
      message: "Scheduler sample queue processing completed.",
      metadata: {
        queueRunId: queueRun.id,
        executionMode: queueRun.executionMode,
        requestedBy,
        workerId,
        status: queueRun.status,
        checkedJobs: queueRun.checkedJobs,
        completedJobs: completedCount,
        retryScheduledJobs: retryingCount,
        failedJobs: failedCount,
      },
    });

    return {
      queueRun,
      processedJobs,
      errors,
      queueState: buildQueueState(repository, user),
      workerAuth: workerAuth.policy,
      disclaimer:
        "当前为手动触发的样例队列处理，不代表真实后台 worker、cron 或外部队列 provider 已部署。",
    };
  }

  function cleanupWorkerRequestNonces(repository, user, options = {}) {
    const requestedBy = typeof options.requestedBy === "string" ? options.requestedBy : "api";
    const executedAt = new Date().toISOString();
    const checkedNonces = repository.listWorkerRequestNonces(user?.id || "", 500).length;
    const prunedNonces = repository.pruneWorkerRequestNonces(user?.id || "", Date.parse(executedAt));
    const remainingNonces = repository.listWorkerRequestNonces(user?.id || "", 500).length;
    const cleanupRun = {
      id: `worker-nonce-cleanup-${Date.now()}`,
      userId: user?.id || null,
      status: "success",
      requestedBy,
      retentionSeconds: workerNonceRetentionMs / 1000,
      checkedNonces,
      prunedNonces,
      remainingNonces,
      executedAt,
    };
    repository.recordAudit({
      user,
      eventType: "scheduler.worker_nonce.cleanup",
      severity: prunedNonces > 0 ? "info" : "debug",
      message: "Scheduler worker nonce cleanup completed.",
      metadata: {
        cleanupRunId: cleanupRun.id,
        requestedBy,
        checkedNonces,
        prunedNonces,
        remainingNonces,
        retentionSeconds: cleanupRun.retentionSeconds,
      },
    });
    return {
      cleanupRun,
      workerNonceMaintenancePolicy: workerNonceMaintenancePolicy(),
      disclaimer:
        "当前为手动触发的样例 nonce 清理，不代表生产定时清理任务或数据库保留策略已部署。",
    };
  }

  return {
    id: "mock-scheduler-service",
    status() {
      return {
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        executionMode: "manual-due-check",
        timezone: "Australia/Brisbane",
        schedules: schedules.map((schedule) => ({ ...schedule })),
        runSafety: {
          idempotencyWindowSeconds: idempotencyWindowMs / 1000,
          cooldownSeconds: runCooldownMs / 1000,
          idempotencyKeySupported: true,
          overlappingRunsBlocked: true,
        },
        deadLetterPolicy: {
          status: "sample-ready",
          maxAttempts: deadLetterMaxAttempts,
          retryBackoff: "exponential",
          baseRetrySeconds: deadLetterBaseRetryMs / 1000,
          replaySupported: true,
          requiresAuditTrail: true,
        },
        workerTelemetryPolicy: {
          status: "sample-ready",
          heartbeatTtlSeconds: workerHeartbeatTtlMs / 1000,
          queueLagWarningSeconds: queueLagWarningMs / 1000,
          queueLagCriticalSeconds: queueLagCriticalMs / 1000,
          queueDepthWarning,
          queueDepthCritical,
          heartbeatSupported: true,
          queueLagMonitoringSupported: true,
        },
        workerAuthPolicy: workerAuthPolicy(),
        workerNonceMaintenancePolicy: workerNonceMaintenancePolicy(),
        queuePolicy: {
          status: "sample-ready",
          enqueueSupported: true,
          retryBackoff: "exponential",
          maxAttempts: queuedJobMaxAttempts,
          deadLetterAfterMaxAttempts: true,
          requiresIdempotencyKey: true,
        },
        capabilities: [
          "schedulerStatus",
          "manualDueCheck",
          "jobRunnerBridge",
          "auditEvents",
          "idempotencyKey",
          "cooldownLock",
          "deadLetterQueue",
          "deadLetterReplay",
          "workerHeartbeat",
          "workerSecretAuth",
          "workerNonceCleanup",
          "queueLagMonitoring",
          "enqueueJob",
          "retrySchedule",
          "queueAlerts",
          "processQueue",
        ],
        providerAdapter,
        disclaimer:
          "当前为样例调度服务，只能手动触发 due-job 检查，不代表真实 cron、队列 worker 或外部推送已经部署。",
      };
    },
    providerAdapterStatus() {
      return providerAdapter;
    },
    runDueJobs,
    replayDeadLetterJob,
    recordWorkerHeartbeat,
    workerHealth(repository, user) {
      return buildWorkerHealth(repository, user);
    },
    enqueueJob,
    processQueuedJobs,
    cleanupWorkerRequestNonces,
    queueState(repository, user) {
      return buildQueueState(repository, user);
    },
  };
}
