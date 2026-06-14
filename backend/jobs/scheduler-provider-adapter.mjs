const requiredEnvVars = [
  "FINANCE_AI_SCHEDULER_PROVIDER",
  "FINANCE_AI_QUEUE_URL",
  "FINANCE_AI_WORKER_SECRET",
  "FINANCE_AI_CRON_SIGNING_SECRET",
];
const supportedProviderIds = ["managed-queue-scheduler"];
const requiredOperationalEnvVars = [
  "FINANCE_AI_SCHEDULER_BACKPRESSURE_READY",
  "FINANCE_AI_SCHEDULER_WORKER_AUTH_READY",
  "FINANCE_AI_SCHEDULER_RUNBOOK_READY",
];

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function readConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_SCHEDULER_PROVIDER")
    ? env.FINANCE_AI_SCHEDULER_PROVIDER.trim()
    : "";
  const missingEnvVars = requiredEnvVars.filter((name) => !hasEnvValue(env, name));

  return {
    selectedProvider,
    missingEnvVars,
    configured: missingEnvVars.length === 0,
    supported: !selectedProvider || supportedProviderIds.includes(selectedProvider),
    auditReady: env.FINANCE_AI_SCHEDULER_AUDIT_READY === "true",
    deadLetterReady: env.FINANCE_AI_SCHEDULER_DLQ_READY === "true",
    workerHealthReady: env.FINANCE_AI_SCHEDULER_WORKER_HEALTH_READY === "true",
    backpressureReady: env.FINANCE_AI_SCHEDULER_BACKPRESSURE_READY === "true",
    workerAuthReady: env.FINANCE_AI_SCHEDULER_WORKER_AUTH_READY === "true",
    runbookReady: env.FINANCE_AI_SCHEDULER_RUNBOOK_READY === "true",
  };
}

function endpointContracts() {
  return [
    {
      id: "enqueueJob",
      method: "enqueueJob",
      status: "planned",
      input: ["jobType", "payload", "runAt", "idempotencyKey"],
      output: ["jobId", "queueStatus", "scheduledFor"],
    },
    {
      id: "scheduleRecurringJob",
      method: "scheduleRecurringJob",
      status: "planned",
      input: ["scheduleId", "cadence", "timezone", "jobType"],
      output: ["scheduleId", "nextRunAt", "enabled"],
    },
    {
      id: "workerHeartbeat",
      method: "recordWorkerHeartbeat",
      status: "planned",
      input: ["workerId", "jobTypes", "lastSeenAt"],
      output: ["healthy", "lagSeconds"],
    },
    {
      id: "deadLetterReplay",
      method: "replayDeadLetterJob",
      status: "planned",
      input: ["deadLetterId", "reason"],
      output: ["requeued", "newJobId"],
    },
  ];
}

function scheduleContracts() {
  return [
    {
      id: "schedule-news-ingestion",
      jobType: "newsIngestion",
      cadence: "every-5-minutes",
      timezone: "Australia/Brisbane",
      status: "planned",
    },
    {
      id: "schedule-market-refresh",
      jobType: "marketDataRefresh",
      cadence: "market-hours-every-1-minute",
      timezone: "exchange-local",
      status: "planned",
    },
    {
      id: "schedule-reminder-evaluation",
      jobType: "reminderEvaluation",
      cadence: "every-15-minutes",
      timezone: "Australia/Brisbane",
      status: "sample-ready",
    },
    {
      id: "schedule-macro-refresh",
      jobType: "macroDataRefresh",
      cadence: "daily-06-00",
      timezone: "Australia/Brisbane",
      status: "planned",
    },
  ];
}

function queuePolicy() {
  return {
    id: "scheduler-queue-policy",
    status: "planned",
    requiresIdempotencyKey: true,
    maxAttempts: 3,
    retryBackoff: "exponential",
    deadLetterQueueRequired: true,
    workerHeartbeatSeconds: 60,
  };
}

function runSafetyPolicy() {
  return {
    id: "scheduler-run-safety-policy",
    status: "planned",
    requiresCronSignature: true,
    limitsConcurrentRuns: true,
    recordsJobLag: true,
    blocksOverlappingRuns: true,
    requiresAuditTrail: true,
  };
}

function backpressurePolicy(config) {
  return {
    id: "scheduler-backpressure-policy",
    status: config.backpressureReady ? "ready" : "blocked",
    maxQueueDepth: 1000,
    maxLagSeconds: 300,
    pauseLowPriorityJobs: true,
    protectsJobTypes: ["newsIngestion", "marketDataRefresh", "macroDataRefresh"],
    alertRoutesRequired: true,
  };
}

function workerAuthPolicy(config) {
  return {
    id: "scheduler-worker-auth-policy",
    status: config.workerAuthReady ? "ready" : "blocked",
    requiresHmacSignature: true,
    timestampSkewSeconds: 300,
    nonceRequired: true,
    rotatesSecrets: true,
    forbiddenAuditFields: ["workerSecret", "cronSigningSecret", "rawSignature", "rawPayload"],
  };
}

function runbookPolicy(config) {
  return {
    id: "scheduler-runbook-policy",
    status: config.runbookReady ? "ready" : "blocked",
    requiredRunbooks: ["queue-drain", "dlq-replay", "worker-secret-rotation", "provider-outage"],
    manualApprovalRequiredForReplay: true,
    rollbackToManualDueCheck: true,
  };
}

function schedulerGate(config) {
  const backpressure = backpressurePolicy(config);
  const workerAuth = workerAuthPolicy(config);
  const runbook = runbookPolicy(config);
  const checks = [
    {
      id: "providerConfig",
      status: config.configured && config.supported ? "pass" : "blocked",
      message:
        config.configured && config.supported
          ? "调度 provider、队列 URL、worker secret 和 cron signing secret 已配置。"
          : "调度 provider、队列 URL、worker secret 或 cron signing secret 尚未完成可用配置。",
    },
    {
      id: "queuePolicy",
      status: "pass",
      message: "队列策略要求幂等 key、重试退避、死信队列和 worker 心跳。",
    },
    {
      id: "deadLetterQueue",
      status: config.deadLetterReady ? "pass" : "blocked",
      message: config.deadLetterReady ? "死信队列准备已确认。" : "死信队列、重放规则和人工处理流程尚未确认。",
    },
    {
      id: "workerHealth",
      status: config.workerHealthReady ? "pass" : "blocked",
      message: config.workerHealthReady ? "worker 健康检查准备已确认。" : "worker 健康检查、延迟监控和告警尚未确认。",
    },
    {
      id: "backpressure",
      status: backpressure.status === "ready" ? "pass" : "blocked",
      message:
        backpressure.status === "ready"
          ? "队列背压、低优先级暂停和延迟告警准备已确认。"
          : "队列背压、低优先级暂停或延迟告警策略尚未确认。",
    },
    {
      id: "workerAuth",
      status: workerAuth.status === "ready" ? "pass" : "blocked",
      message:
        workerAuth.status === "ready"
          ? "worker 回调签名、时间窗、nonce 和密钥轮换准备已确认。"
          : "worker 回调签名、时间窗、nonce 或密钥轮换策略尚未确认。",
    },
    {
      id: "runbook",
      status: runbook.status === "ready" ? "pass" : "blocked",
      message:
        runbook.status === "ready"
          ? "队列排空、死信重放、密钥轮换和 provider 故障 runbook 已确认。"
          : "队列排空、死信重放、密钥轮换或 provider 故障 runbook 尚未确认。",
    },
    {
      id: "auditReadiness",
      status: config.auditReady ? "pass" : "blocked",
      message: config.auditReady ? "调度任务审计准备已确认。" : "调度任务审计、留存和失败追踪尚未确认。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "scheduler-provider-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-background-workers",
    canUseBackgroundWorkers: blockedReasons.length === 0,
    checks,
    blockedReasons,
    disclaimer:
      "真实后台调度必须先通过 provider 配置、队列策略、死信队列、worker 健康检查、cron 签名和审计门禁。",
  };
}

function backgroundWorkerPreflightPlan(config, gate) {
  return {
    id: "scheduler-background-worker-preflight-plan",
    mode: "dry-run-no-worker-start",
    status: gate.status === "ready-for-background-workers" ? "ready-for-manual-smoke" : "blocked",
    canStartBackgroundWorkers: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks: gate.checks.map((check) => ({
      id: check.id,
      status: check.status,
      required: true,
    })),
    requestEnvelope: {
      requiredFields: ["jobType", "idempotencyKey", "runAt", "workerId", "signature"],
      forbiddenFields: ["workerSecret", "cronSigningSecret", "rawPayload", "rawSignature"],
      redactBeforeAudit: true,
    },
    rollback: {
      fallbackService: "manual-due-job-check",
      disableFlag: "FINANCE_AI_SCHEDULER_RUNTIME=inactive",
      drainQueueBeforeRollback: true,
    },
  };
}

function incidentResponseDrillPackage() {
  return {
    id: "scheduler-incident-response-drill-package",
    status: "defined",
    mode: "dry-run-no-worker-incident-cutover",
    canEnableBackgroundWorkers: false,
    canExecuteProductionIncidentDrill: false,
    requiredManualApproval: true,
    requiredDrills: [
      "queue-backlog-spike",
      "worker-heartbeat-stale",
      "dead-letter-replay",
      "worker-secret-rotation",
      "cron-signature-rejection",
      "provider-outage-fallback",
      "manual-due-job-check-fallback",
      "audit-export-handoff",
    ],
    requiredArtifacts: [
      "incident-commander-checklist",
      "rollback-timeline",
      "customer-impact-template",
      "post-incident-review-template",
    ],
    rollbackControls: {
      fallbackService: "manual-due-job-check",
      disableFlag: "FINANCE_AI_SCHEDULER_RUNTIME=inactive",
      drainQueueBeforeRollback: true,
      preserveDeadLetterEvidence: true,
    },
    releaseBlockersThatMustRemainBlocked: ["backgroundWorkers"],
    forbiddenDrillFields: ["workerSecret", "cronSigningSecret", "rawPayload", "rawSignature"],
    disclaimer:
      "该事故响应演练包只定义真实 worker 上线前必须演练的事故场景、回滚材料和复盘模板，不会启动后台 worker 或执行生产事故演练。",
  };
}

export function createSchedulerProviderAdapter({ env = process.env } = {}) {
  const config = readConfig(env);
  const gate = schedulerGate(config);
  const blockedReasons = [];
  if (!config.configured) {
    blockedReasons.push("调度 provider、队列 URL、worker secret 或 cron signing secret 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`调度 provider 未注册：${config.selectedProvider}。`);
  }
  blockedReasons.push(...gate.blockedReasons.filter((reason) => !blockedReasons.includes(reason)));

  return {
    id: "scheduler-provider-adapter",
    name: "Scheduler Provider Adapter Skeleton",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    selectedProvider: config.selectedProvider,
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    canUseBackgroundWorkers: false,
    queuePolicy: queuePolicy(),
    runSafetyPolicy: runSafetyPolicy(),
    backpressurePolicy: backpressurePolicy(config),
    workerAuthPolicy: workerAuthPolicy(config),
    runbookPolicy: runbookPolicy(config),
    schedulerGate: gate,
    backgroundWorkerPreflightPlan: backgroundWorkerPreflightPlan(config, gate),
    incidentResponseDrillPackage: incidentResponseDrillPackage(),
    endpointContracts: endpointContracts(),
    scheduleContracts: scheduleContracts(),
    missingEnvVars: [
      ...config.missingEnvVars,
      ...requiredOperationalEnvVars.filter((name) => !hasEnvValue(env, name)),
    ],
    safety: {
      noExternalWorkers: true,
      manualFallbackActive: true,
      requiresSignedCron: true,
      requiresIdempotency: true,
      requiresDeadLetterQueue: true,
      requiresWorkerHeartbeat: true,
      requiresBackpressure: true,
      requiresWorkerCallbackAuth: true,
      requiresRunbookApproval: true,
      requiresAuditLog: true,
    },
    blockedReasons,
    nextSteps: [
      "选择已注册调度 provider，并把队列 URL、worker secret 和 cron signing secret 放入安全环境变量。",
      "实现 enqueueJob、scheduleRecurringJob、workerHeartbeat 和 deadLetterReplay，并保留手动 due-job 检查作为网页离线回退。",
      "把新闻采集、行情刷新、提醒评估和宏观刷新任务接入幂等 key、重试退避、死信队列和 worker 心跳。",
      "通过 worker 健康检查、失败重放、审计留存和队列延迟 smoke test 后，才允许把 runtimeMode 从 inactive 切换为 workers。",
    ],
    disclaimer:
      "当前为生产调度 provider adapter 骨架，不会启动真实 cron、队列 worker 或后台网络任务；手动样例调度仍是默认回退。",
  };
}
