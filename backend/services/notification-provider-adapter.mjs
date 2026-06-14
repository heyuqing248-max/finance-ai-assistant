const requiredEnvVars = [
  "FINANCE_AI_NOTIFICATION_PROVIDER",
  "FINANCE_AI_NOTIFICATION_PROVIDER_API_KEY",
  "FINANCE_AI_NOTIFICATION_WEBHOOK_SECRET",
];
const supportedProviderIds = ["managed-notification-provider"];
const requiredOperationalEnvVars = [
  "FINANCE_AI_NOTIFICATION_RECEIPTS_READY",
  "FINANCE_AI_NOTIFICATION_SUPPRESSION_READY",
  "FINANCE_AI_NOTIFICATION_BOUNCE_READY",
  "FINANCE_AI_NOTIFICATION_WEBHOOK_ENDPOINT_READY",
  "FINANCE_AI_NOTIFICATION_WEBHOOK_REPLAY_READY",
  "FINANCE_AI_NOTIFICATION_RECEIPT_IDEMPOTENCY_READY",
];

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function readConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_NOTIFICATION_PROVIDER")
    ? env.FINANCE_AI_NOTIFICATION_PROVIDER.trim()
    : "";
  const missingEnvVars = requiredEnvVars.filter((name) => !hasEnvValue(env, name));

  return {
    selectedProvider,
    missingEnvVars,
    configured: missingEnvVars.length === 0,
    supported: !selectedProvider || supportedProviderIds.includes(selectedProvider),
    auditReady: env.FINANCE_AI_NOTIFICATION_AUDIT_READY === "true",
    privacyReviewed: env.FINANCE_AI_NOTIFICATION_PRIVACY_REVIEWED === "true",
    channelConsentReviewed: env.FINANCE_AI_NOTIFICATION_CHANNEL_CONSENT_REVIEWED === "true",
    receiptsReady: env.FINANCE_AI_NOTIFICATION_RECEIPTS_READY === "true",
    suppressionReady: env.FINANCE_AI_NOTIFICATION_SUPPRESSION_READY === "true",
    bounceHandlingReady: env.FINANCE_AI_NOTIFICATION_BOUNCE_READY === "true",
    webhookEndpointReady: env.FINANCE_AI_NOTIFICATION_WEBHOOK_ENDPOINT_READY === "true",
    webhookReplayReady: env.FINANCE_AI_NOTIFICATION_WEBHOOK_REPLAY_READY === "true",
    receiptIdempotencyReady: env.FINANCE_AI_NOTIFICATION_RECEIPT_IDEMPOTENCY_READY === "true",
  };
}

function endpointContracts() {
  return [
    {
      id: "sendExternalNotification",
      method: "sendNotification",
      status: "planned",
      input: ["userId", "channel", "templateId", "payload", "idempotencyKey"],
      output: ["deliveryId", "status", "providerMessageId"],
    },
    {
      id: "scheduleExternalReminder",
      method: "scheduleReminder",
      status: "planned",
      input: ["ruleId", "channels", "triggeredAt", "payload"],
      output: ["queuedDeliveries", "skippedChannels"],
    },
    {
      id: "retryExternalDelivery",
      method: "retryDelivery",
      status: "planned",
      input: ["deliveryId", "reason"],
      output: ["attemptCount", "nextRetryAt", "deliveryStatus"],
    },
    {
      id: "deliveryWebhook",
      method: "webhookDeliveryStatus",
      status: "planned",
      input: ["signature", "providerMessageId", "status", "eventTime"],
      output: ["accepted", "auditEventId"],
    },
  ];
}

function channelContracts() {
  return [
    {
      id: "inApp",
      label: "网页内提醒",
      status: "local-ready",
      requiresSystemPermission: true,
      requiresExternalProvider: false,
    },
    {
      id: "email",
      label: "邮件提醒",
      status: "planned",
      requiresSystemPermission: false,
      requiresExternalProvider: true,
    },
    {
      id: "sms",
      label: "短信提醒",
      status: "planned",
      requiresSystemPermission: false,
      requiresExternalProvider: true,
    },
    {
      id: "wechat",
      label: "微信提醒",
      status: "planned",
      requiresSystemPermission: false,
      requiresExternalProvider: true,
    },
    {
      id: "telegram",
      label: "Telegram 提醒",
      status: "planned",
      requiresSystemPermission: false,
      requiresExternalProvider: true,
    },
  ];
}

function deliveryPolicy() {
  return {
    id: "notification-delivery-policy",
    status: "planned",
    requiresIdempotencyKey: true,
    retryBackoff: "exponential",
    maxAttempts: 3,
    rateLimitPerMinute: 60,
    providerWebhookVerification: true,
  };
}

function consentPolicy() {
  return {
    id: "notification-consent-policy",
    status: "planned",
    requiresUserOptIn: true,
    supportsChannelOptOut: true,
    recordsConsentVersion: true,
    blocksSilentExternalDelivery: true,
  };
}

function receiptPolicy(config) {
  return {
    id: "notification-receipt-policy",
    status: config.receiptsReady ? "ready" : "blocked",
    requiredEvents: ["queued", "sent", "delivered", "failed", "bounced", "unsubscribed"],
    webhookSignatureRequired: true,
    idempotencyWindowHours: 24,
    allowedAuditFields: ["deliveryId", "channel", "templateId", "status", "providerEventId", "latencyMs"],
    forbiddenAuditFields: ["messageBody", "emailAddress", "phoneNumber", "wechatOpenId", "telegramChatId"],
  };
}

function suppressionPolicy(config) {
  return {
    id: "notification-suppression-policy",
    status: config.suppressionReady ? "ready" : "blocked",
    suppressesUnsubscribedChannels: true,
    suppressesHardBounces: true,
    suppressesPrivacyErasedUsers: true,
    requiresChannelScopedOptOut: true,
    maxSuppressionLookupMs: 200,
  };
}

function bounceHandlingPolicy(config) {
  return {
    id: "notification-bounce-handling-policy",
    status: config.bounceHandlingReady ? "ready" : "blocked",
    hardBounceAction: "suppress-channel-and-audit",
    softBounceAction: "retry-with-backoff",
    complaintAction: "suppress-all-external-and-audit",
    manualReviewRequiredForComplaint: true,
  };
}

function webhookReceiptVerificationPlan(config) {
  const checks = [
    {
      id: "webhookSecret",
      status: config.configured ? "pass" : "blocked",
      message: config.configured
        ? "Webhook secret 已纳入 provider 配置。"
        : "Webhook secret 尚未完成可用配置。",
    },
    {
      id: "endpointRegistration",
      status: config.webhookEndpointReady ? "pass" : "blocked",
      message: config.webhookEndpointReady
        ? "投递回执 webhook endpoint 注册已确认。"
        : "投递回执 webhook endpoint 尚未注册或验收。",
    },
    {
      id: "signatureTimestampWindow",
      status: config.webhookReplayReady ? "pass" : "blocked",
      message: config.webhookReplayReady
        ? "签名时间窗和重放防护已确认。"
        : "签名时间窗、过期拒绝和重放防护尚未确认。",
    },
    {
      id: "providerEventIdempotency",
      status: config.receiptIdempotencyReady ? "pass" : "blocked",
      message: config.receiptIdempotencyReady
        ? "Provider event id 幂等写入已确认。"
        : "Provider event id 幂等写入和重复回调处理尚未确认。",
    },
    {
      id: "receiptAuditRedaction",
      status: config.receiptsReady && config.auditReady ? "pass" : "blocked",
      message:
        config.receiptsReady && config.auditReady
          ? "回执状态和脱敏审计写入已确认。"
          : "回执状态或脱敏审计写入尚未确认。",
    },
  ];

  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "notification-webhook-receipt-verification-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-smoke",
    mode: "dry-run-no-webhook-accept",
    canAcceptProviderWebhook: false,
    timestampToleranceSeconds: 300,
    replayWindowHours: 24,
    requiresProviderEventId: true,
    checks,
    blockedReasons,
    forbiddenAuditFields: ["rawSignature", "rawPayload", "emailAddress", "phoneNumber"],
  };
}

function deliveryGate(config) {
  const receipts = receiptPolicy(config);
  const suppression = suppressionPolicy(config);
  const bounces = bounceHandlingPolicy(config);
  const webhookPlan = webhookReceiptVerificationPlan(config);
  const checks = [
    {
      id: "providerConfig",
      status: config.configured && config.supported ? "pass" : "blocked",
      message:
        config.configured && config.supported
          ? "通知 provider、API key 和 webhook secret 已配置。"
          : "通知 provider、API key 或 webhook secret 尚未完成可用配置。",
    },
    {
      id: "permissionConsent",
      status: config.channelConsentReviewed ? "pass" : "blocked",
      message: config.channelConsentReviewed
        ? "通知权限、渠道授权和退订规则已确认。"
        : "通知权限、渠道授权和退订规则尚未确认。",
    },
    {
      id: "deliveryPolicy",
      status: "pass",
      message: "生产投递策略要求幂等 key、重试退避、频率限制和 webhook 验签。",
    },
    {
      id: "deliveryReceipts",
      status: receipts.status === "ready" ? "pass" : "blocked",
      message:
        receipts.status === "ready"
          ? "投递回执、状态回调和脱敏审计准备已确认。"
          : "投递回执、状态回调或脱敏审计字段规则尚未确认。",
    },
    {
      id: "webhookReceiptVerification",
      status: webhookPlan.status === "ready-for-manual-smoke" ? "pass" : "blocked",
      message:
        webhookPlan.status === "ready-for-manual-smoke"
          ? "回执 webhook 验签、时间窗、重放防护和幂等规则已确认。"
          : "回执 webhook 验签、时间窗、重放防护或幂等规则尚未确认。",
    },
    {
      id: "suppressionList",
      status: suppression.status === "ready" ? "pass" : "blocked",
      message:
        suppression.status === "ready"
          ? "退订、硬反弹和隐私删除用户 suppression 规则已确认。"
          : "退订、硬反弹或隐私删除用户 suppression 规则尚未确认。",
    },
    {
      id: "bounceHandling",
      status: bounces.status === "ready" ? "pass" : "blocked",
      message:
        bounces.status === "ready"
          ? "邮件/短信反弹、投诉和重试处理策略已确认。"
          : "邮件/短信反弹、投诉或重试处理策略尚未确认。",
    },
    {
      id: "auditReadiness",
      status: config.auditReady ? "pass" : "blocked",
      message: config.auditReady ? "通知投递审计准备已确认。" : "通知投递审计和留存规则尚未确认。",
    },
    {
      id: "privacyReview",
      status: config.privacyReviewed ? "pass" : "blocked",
      message: config.privacyReviewed ? "通知隐私与用户同意文案已复核。" : "通知隐私与用户同意文案尚未复核。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "notification-provider-delivery-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-external-delivery",
    canUseExternalDelivery: blockedReasons.length === 0,
    checks,
    blockedReasons,
    disclaimer:
      "真实外部通知投递必须先通过 provider 配置、用户授权、退订规则、投递审计、webhook 验签和隐私复核门禁。",
  };
}

function externalDeliveryPreflightPlan(config, gate) {
  return {
    id: "notification-external-delivery-preflight-plan",
    mode: "dry-run-no-external-send",
    status: gate.status === "ready-for-external-delivery" ? "ready-for-manual-smoke" : "blocked",
    canExecuteExternalDelivery: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks: gate.checks.map((check) => ({
      id: check.id,
      status: check.status,
      required: true,
    })),
    requestEnvelope: {
      requiredFields: ["userId", "channel", "templateId", "idempotencyKey", "consentVersion"],
      forbiddenFields: ["rawMessageBody", "emailAddress", "phoneNumber", "wechatOpenId", "telegramChatId"],
      redactBeforeAudit: true,
    },
    rollback: {
      fallbackService: "mock-notification-outbox",
      disableFlag: "FINANCE_AI_NOTIFICATION_RUNTIME=inactive",
      suppressPendingExternalRetries: true,
    },
  };
}

function observabilityEvidencePackage() {
  return {
    id: "notification-observability-evidence-package",
    status: "defined",
    mode: "dry-run-no-observability-cutover",
    canEnableExternalDelivery: false,
    canSendExternalAlerts: false,
    requiredManualApproval: true,
    requiredSignals: [
      "delivery-success-rate",
      "delivery-failure-rate",
      "provider-latency-p95",
      "webhook-replay-rejection-rate",
      "suppression-hit-rate",
      "bounce-rate",
      "complaint-rate",
      "outbox-backlog-depth",
    ],
    requiredDashboards: [
      "delivery-health",
      "webhook-integrity",
      "suppression-and-bounce",
      "outbox-backlog",
    ],
    alertThresholds: {
      maxFailureRatePercent: 5,
      maxProviderLatencyP95Ms: 5000,
      maxOutboxBacklogDepth: 1000,
      maxWebhookReplayRatePercent: 1,
    },
    forbiddenAlertFields: ["rawMessageBody", "emailAddress", "phoneNumber", "wechatOpenId", "telegramChatId"],
    fallback: {
      service: "mock-notification-outbox",
      disableFlag: "FINANCE_AI_NOTIFICATION_RUNTIME=inactive",
      preserveAuditTrail: true,
    },
    disclaimer:
      "该可观测性证据包只定义真实外部通知上线前必须准备的监控信号、仪表盘和告警阈值，不会发送外部通知或启用真实投递 runtime。",
  };
}

export function createNotificationProviderAdapter({ env = process.env } = {}) {
  const config = readConfig(env);
  const gate = deliveryGate(config);
  const blockedReasons = [];
  if (!config.configured) {
    blockedReasons.push("通知 provider、API key 或 webhook secret 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`通知 provider 未注册：${config.selectedProvider}。`);
  }
  blockedReasons.push(...gate.blockedReasons.filter((reason) => !blockedReasons.includes(reason)));

  return {
    id: "notification-provider-adapter",
    name: "Notification Provider Adapter Skeleton",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    selectedProvider: config.selectedProvider,
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    canUseExternalDelivery: false,
    deliveryPolicy: deliveryPolicy(),
    consentPolicy: consentPolicy(),
    receiptPolicy: receiptPolicy(config),
    suppressionPolicy: suppressionPolicy(config),
    bounceHandlingPolicy: bounceHandlingPolicy(config),
    webhookReceiptVerificationPlan: webhookReceiptVerificationPlan(config),
    deliveryGate: gate,
    externalDeliveryPreflightPlan: externalDeliveryPreflightPlan(config, gate),
    observabilityEvidencePackage: observabilityEvidencePackage(),
    endpointContracts: endpointContracts(),
    channelContracts: channelContracts(),
    missingEnvVars: [
      ...config.missingEnvVars,
      ...requiredOperationalEnvVars.filter((name) => !hasEnvValue(env, name)),
    ],
    safety: {
      noVendorNetworkCalls: true,
      mockOutboxActive: true,
      requiresUserConsent: true,
      supportsChannelOptOut: true,
      requiresSuppressionList: true,
      requiresReceiptRedaction: true,
      requiresWebhookReplayProtection: true,
      requiresReceiptIdempotency: true,
      requiresBounceHandling: true,
      requiresAuditLog: true,
      forbidsSilentExternalDelivery: true,
      channelWebhookVerification: true,
    },
    blockedReasons,
    nextSteps: [
      "选择已注册通知 provider，并把 API key、webhook secret 和渠道凭证放入安全环境变量。",
      "实现 sendNotification、retryDelivery 和 webhookDeliveryStatus，并保留 mock outbox 作为网页离线回退。",
      "为 webhookDeliveryStatus 增加签名时间窗、provider event id 幂等写入、重复回调拒绝和脱敏审计。",
      "把每次外部投递、失败重试、退订和 webhook 回调写入脱敏审计日志。",
      "完成用户授权、退订文案、隐私复核和渠道 smoke test 后，才允许把 runtimeMode 从 inactive 切换为 external。",
    ],
    disclaimer:
      "当前为生产通知 provider adapter 骨架，不会请求真实推送、邮件、短信、微信或 Telegram 服务；mock outbox 仅用于开发验证。",
  };
}
