const requiredEnvVars = [
  "FINANCE_AI_MODEL_PROVIDER",
  "FINANCE_AI_MODEL_API_KEY",
  "FINANCE_AI_MODEL_ID",
];
const supportedProviderIds = ["hosted-llm-provider", "openai-compatible"];
const officialOpenAiCompatibleBaseUrl = "https://api.openai.com/v1";
const defaultOpenAiCompatibleBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
const defaultPrimaryModelId = "gpt-5.5";
const defaultReliableModelId = "gemini-2.5-flash";

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function splitModelIds(value = "") {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandFallbackProviderModels(provider = {}) {
  if (!provider || typeof provider !== "object") return [];
  const modelIds = [
    provider.selectedModel,
    ...splitModelIds(provider.alternateModelIds || ""),
  ].filter(Boolean);
  const uniqueModelIds = [...new Set(modelIds)];
  if (!uniqueModelIds.length) return [provider];
  return uniqueModelIds.map((modelId, index) => ({
    ...provider,
    selectedModel: modelId,
    label: index === 0 ? provider.label : `${provider.label} · 轮换 ${index}`,
    slot: index === 0 ? provider.slot : `${provider.slot}-alt${index}`,
    configured: Boolean(provider.apiKey && modelId),
    alternateOf: index === 0 ? "" : provider.selectedModel || "",
  }));
}

function isGeminiOpenAiCompatibleConfig(config = {}) {
  return (
    String(config.baseUrl || "").includes("generativelanguage.googleapis.com") ||
    String(config.selectedModel || "").startsWith("gemini-")
  );
}

function geminiReasoningEffort(config = {}) {
  return String(config.selectedModel || "").startsWith("gemini-2.5-") ? "none" : "low";
}

function readConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_MODEL_PROVIDER")
    ? env.FINANCE_AI_MODEL_PROVIDER.trim()
    : "";
  const selectedModel = hasEnvValue(env, "FINANCE_AI_MODEL_ID")
    ? env.FINANCE_AI_MODEL_ID.trim()
    : "";
  const missingEnvVars = requiredEnvVars.filter((name) => !hasEnvValue(env, name));
  const requestTimeoutMs = Number(env.FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS);
  const maxTokens = Number(env.FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST);
  const configuredBaseUrl = hasEnvValue(env, "FINANCE_AI_MODEL_BASE_URL")
    ? env.FINANCE_AI_MODEL_BASE_URL.trim().replace(/\/+$/, "")
    : defaultOpenAiCompatibleBaseUrl;
  const apiStyle = hasEnvValue(env, "FINANCE_AI_MODEL_API_STYLE")
    ? env.FINANCE_AI_MODEL_API_STYLE.trim()
    : configuredBaseUrl === officialOpenAiCompatibleBaseUrl
      ? "responses"
      : "chat-completions";
  const fallbackSelectedProvider = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_PROVIDER")
    ? env.FINANCE_AI_MODEL_FALLBACK_PROVIDER.trim()
    : "openai-compatible";
  const fallbackSelectedModel = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_ID")
    ? env.FINANCE_AI_MODEL_FALLBACK_ID.trim()
    : "";
  const fallbackBaseUrl = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_BASE_URL")
    ? env.FINANCE_AI_MODEL_FALLBACK_BASE_URL.trim().replace(/\/+$/, "")
    : defaultOpenAiCompatibleBaseUrl;
  const fallbackApiStyle = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_API_STYLE")
    ? env.FINANCE_AI_MODEL_FALLBACK_API_STYLE.trim()
    : fallbackBaseUrl === officialOpenAiCompatibleBaseUrl
      ? "responses"
      : "chat-completions";
  const fallbackApiKey = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_API_KEY")
    ? env.FINANCE_AI_MODEL_FALLBACK_API_KEY.trim()
    : "";
  const fallbackAlternateModelIds = hasEnvValue(env, "FINANCE_AI_MODEL_FALLBACK_ALT_IDS")
    ? env.FINANCE_AI_MODEL_FALLBACK_ALT_IDS.trim()
    : "";
  const fallbackConfigured = Boolean(fallbackApiKey && fallbackSelectedModel);
  const fallbackProvider = {
    slot: "fallback",
    label: "备用模型 1",
    selectedProvider: fallbackSelectedProvider,
    selectedModel: fallbackSelectedModel,
    apiKey: fallbackApiKey,
    baseUrl: fallbackBaseUrl,
    apiStyle: fallbackApiStyle,
    alternateModelIds: fallbackAlternateModelIds,
    configured: fallbackConfigured,
    supported: supportedProviderIds.includes(fallbackSelectedProvider),
    allowNetwork: env.FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK === "true" || env.FINANCE_AI_MODEL_ALLOW_NETWORK === "true",
  };
  const fallbackProviders = [
    fallbackProvider,
    readAdditionalFallbackProvider(env, 2),
    readAdditionalFallbackProvider(env, 3),
  ].flatMap(expandFallbackProviderModels);

  return {
    selectedProvider,
    selectedModel,
    apiKey: hasEnvValue(env, "FINANCE_AI_MODEL_API_KEY")
      ? env.FINANCE_AI_MODEL_API_KEY.trim()
      : "",
    baseUrl: configuredBaseUrl,
    apiStyle,
    fallbackProvider,
    fallbackProviders,
    recommendedModelId: selectedModel || defaultPrimaryModelId,
    allowNetwork: env.FINANCE_AI_MODEL_ALLOW_NETWORK === "true",
    runtimeMode: hasEnvValue(env, "FINANCE_AI_MODEL_RUNTIME")
      ? env.FINANCE_AI_MODEL_RUNTIME.trim()
      : "inactive",
    missingEnvVars,
    configured: missingEnvVars.length === 0,
    supported: !selectedProvider || supportedProviderIds.includes(selectedProvider),
    auditReady: env.FINANCE_AI_MODEL_AUDIT_READY === "true",
    auditSink: hasEnvValue(env, "FINANCE_AI_MODEL_AUDIT_SINK")
      ? env.FINANCE_AI_MODEL_AUDIT_SINK.trim()
      : "",
    complianceReviewed: env.FINANCE_AI_MODEL_COMPLIANCE_REVIEWED === "true",
    responseValidatorReady: env.FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY === "true",
    probabilityCalibrationReady: env.FINANCE_AI_MODEL_PROBABILITY_CALIBRATION_READY === "true",
    forbiddenClaimFilterReady: env.FINANCE_AI_MODEL_FORBIDDEN_CLAIM_FILTER_READY === "true",
    schemaFailureFallbackReady: env.FINANCE_AI_MODEL_SCHEMA_FAILURE_FALLBACK_READY === "true",
    costBudgetReady: env.FINANCE_AI_MODEL_COST_BUDGET_READY === "true",
    secretManagementReady: env.FINANCE_AI_MODEL_SECRET_MANAGEMENT_READY === "true",
    secretManager: hasEnvValue(env, "FINANCE_AI_MODEL_SECRET_MANAGER")
      ? env.FINANCE_AI_MODEL_SECRET_MANAGER.trim()
      : "",
    sourceCoverageReady: env.FINANCE_AI_MODEL_SOURCE_COVERAGE_READY === "true",
    promptInjectionDefenseReady: env.FINANCE_AI_MODEL_PROMPT_INJECTION_DEFENSE_READY === "true",
    dataMinimizationReady: env.FINANCE_AI_MODEL_DATA_MINIMIZATION_READY === "true",
    factorInputsReady: env.FINANCE_AI_MODEL_FACTOR_INPUTS_READY === "true",
    factorWeightsReady: env.FINANCE_AI_MODEL_FACTOR_WEIGHTS_READY === "true",
    citationPackageReady: env.FINANCE_AI_MODEL_CITATION_PACKAGE_READY === "true",
    evaluationSuiteReady: env.FINANCE_AI_MODEL_EVALUATION_SUITE_READY === "true",
    hallucinationMonitorReady: env.FINANCE_AI_MODEL_HALLUCINATION_MONITOR_READY === "true",
    regressionThresholdReady: env.FINANCE_AI_MODEL_REGRESSION_THRESHOLD_READY === "true",
    humanReviewQueueReady: env.FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY === "true",
    escalationRunbookReady: env.FINANCE_AI_MODEL_ESCALATION_RUNBOOK_READY === "true",
    lowConfidencePolicyReady: env.FINANCE_AI_MODEL_LOW_CONFIDENCE_POLICY_READY === "true",
    releaseCanaryReady: env.FINANCE_AI_MODEL_RELEASE_CANARY_READY === "true",
    versionLockReady: env.FINANCE_AI_MODEL_VERSION_LOCK_READY === "true",
    rollbackSwitchReady: env.FINANCE_AI_MODEL_ROLLBACK_SWITCH_READY === "true",
    releaseApprovalReady: env.FINANCE_AI_MODEL_RELEASE_APPROVAL_READY === "true",
    runtimeMetricsReady: env.FINANCE_AI_MODEL_RUNTIME_METRICS_READY === "true",
    driftMonitorReady: env.FINANCE_AI_MODEL_DRIFT_MONITOR_READY === "true",
    incidentAlertingReady: env.FINANCE_AI_MODEL_INCIDENT_ALERTING_READY === "true",
    userFeedbackMonitorReady: env.FINANCE_AI_MODEL_USER_FEEDBACK_MONITOR_READY === "true",
    maxCallsPerMinute: Number(env.FINANCE_AI_MODEL_MAX_CALLS_PER_MINUTE) || 0,
    maxTokensPerRequest: Number.isFinite(maxTokens) && maxTokens > 0 ? Math.round(maxTokens) : 1400,
    requestTimeoutMs:
      Number.isFinite(requestTimeoutMs) && requestTimeoutMs >= 1000
        ? Math.round(requestTimeoutMs)
        : 45000,
    promptVersion: hasEnvValue(env, "FINANCE_AI_MODEL_PROMPT_VERSION")
      ? env.FINANCE_AI_MODEL_PROMPT_VERSION.trim()
      : "analysis-prompt-v0",
  };
}

function readAdditionalFallbackProvider(env = {}, index = 2) {
  const prefix = `FINANCE_AI_MODEL_FALLBACK${index}`;
  const selectedProvider = hasEnvValue(env, `${prefix}_PROVIDER`)
    ? env[`${prefix}_PROVIDER`].trim()
    : "openai-compatible";
  const selectedModel = hasEnvValue(env, `${prefix}_ID`) ? env[`${prefix}_ID`].trim() : "";
  const alternateModelIds = hasEnvValue(env, `${prefix}_ALT_IDS`) ? env[`${prefix}_ALT_IDS`].trim() : "";
  const baseUrl = hasEnvValue(env, `${prefix}_BASE_URL`)
    ? env[`${prefix}_BASE_URL`].trim().replace(/\/+$/, "")
    : defaultOpenAiCompatibleBaseUrl;
  const apiStyle = hasEnvValue(env, `${prefix}_API_STYLE`)
    ? env[`${prefix}_API_STYLE`].trim()
    : baseUrl === officialOpenAiCompatibleBaseUrl
      ? "responses"
      : "chat-completions";
  const apiKey = hasEnvValue(env, `${prefix}_API_KEY`) ? env[`${prefix}_API_KEY`].trim() : "";
  return {
    slot: `fallback${index}`,
    label: `备用模型 ${index}`,
    selectedProvider,
    selectedModel,
    alternateModelIds,
    apiKey,
    baseUrl,
    apiStyle,
    configured: Boolean(apiKey && selectedModel),
    supported: supportedProviderIds.includes(selectedProvider),
    allowNetwork: env[`${prefix}_ALLOW_NETWORK`] === "true" || env.FINANCE_AI_MODEL_ALLOW_NETWORK === "true",
  };
}

function auditPolicy(config) {
  const configured = config.auditReady && Boolean(config.auditSink);
  return {
    id: "ai-model-audit-policy",
    status: configured ? "ready" : "blocked",
    sink: config.auditSink || "unconfigured",
    requiredEventTypes: ["ai.model.preflight", "ai.model.request", "ai.model.response", "ai.model.error"],
    allowedEnvelopeFields: [
      "eventType",
      "userId",
      "symbol",
      "market",
      "modelId",
      "providerId",
      "promptVersion",
      "sourceRefCount",
      "estimatedTokenCount",
      "latencyMs",
      "gateStatus",
      "schemaVersion",
      "validationStatus",
    ],
    forbiddenEnvelopeFields: [
      "apiKey",
      "rawPrompt",
      "rawModelResponse",
      "rawSourceText",
      "rawPortfolioNotes",
      "personalContact",
    ],
    redactBeforeWrite: true,
    hashChainRequired: true,
    disclaimer: "真实模型请求审计只能写入脱敏摘要、门禁状态和性能指标，禁止写入 API key、原始 prompt 或原文来源。",
  };
}

function budgetPolicy(config) {
  return {
    id: "ai-model-budget-policy",
    status:
      config.costBudgetReady && config.maxCallsPerMinute > 0 && config.maxTokensPerRequest > 0
        ? "ready"
        : "blocked",
    maxCallsPerMinute: config.maxCallsPerMinute,
    maxTokensPerRequest: config.maxTokensPerRequest,
    requiresCostAlerting: true,
    requiresPerUserRateLimit: true,
    disclaimer: "真实模型调用必须先配置成本预算、每用户限流和 token 上限，避免不可控费用。",
  };
}

function secretManagementPolicy(config) {
  return {
    id: "ai-provider-secret-management-policy",
    status: config.secretManagementReady ? "ready" : "blocked",
    mode: config.secretManagementReady
      ? "production-secret-management-ready"
      : "dry-run-no-model-secret-use",
    canUseProductionSecrets: false,
    secretManager: config.secretManager || "unconfigured",
    requiredControls: [
      "managedSecretStore",
      "serverSideOnlyAccess",
      "keyRotation",
      "leastPrivilegeRuntimeRole",
      "secretAccessAudit",
      "frontendSecretExclusion",
    ],
    forbiddenSecretLocations: [
      "clientBundle",
      "localStorage",
      "sourceCode",
      "testFixtures",
      "analyticsEvents",
      "auditEnvelope",
    ],
    rotationTriggers: [
      "scheduledRotation",
      "providerIncident",
      "staffAccessChange",
      "suspectedLeak",
    ],
    rotationCadenceDays: 90,
    requiresBreakGlassProcedure: true,
    requiresRevocationDrill: true,
    disclaimer:
      "真实模型凭证必须只在服务端密钥管理系统读取，并具备轮换、审计、最小权限和前端排除控制；生产密钥不得写入代码、浏览器存储、测试样例或审计 envelope。",
  };
}

function sourceGroundingPolicy(config) {
  return {
    id: "ai-source-grounding-policy",
    status: config.sourceCoverageReady ? "ready" : "blocked",
    minSourceRefs: 2,
    requiresSourceAttribution: true,
    requiresUnknownWhenInsufficientEvidence: true,
    forbiddenBehavior: ["编造来源", "无来源给出确定性结论", "把样例数据描述为实时数据"],
    disclaimer: "真实模型分析必须绑定来源引用；来源不足时只能输出不确定或信息不足。",
  };
}

function promptInjectionDefensePolicy(config) {
  return {
    id: "ai-prompt-injection-defense-policy",
    status: config.promptInjectionDefenseReady ? "ready" : "blocked",
    mode: config.promptInjectionDefenseReady
      ? "production-source-sanitization-ready"
      : "dry-run-no-unsanitized-source-text",
    canUseUnsanitizedSourceText: false,
    detectionSignals: [
      "instructionOverride",
      "promptLeakRequest",
      "toolCallRequest",
      "tradingInstructionInjection",
      "sourceImpersonation",
    ],
    requiredControls: [
      "sourceTextSanitization",
      "instructionStripping",
      "sourceRoleIsolation",
      "quotedEvidenceOnly",
      "unsafeSourceQuarantine",
      "auditFlagging",
    ],
    forbiddenPromptFields: [
      "rawHtml",
      "scriptContent",
      "embeddedInstruction",
      "trackingPixel",
      "privateMessage",
    ],
    requiresQuarantine: true,
    requiresUserVisibleSourceWarning: true,
    disclaimer:
      "真实模型分析必须把新闻、公告和公开言论当作证据而不是指令；疑似提示词注入或来源污染内容必须净化、隔离或降级。",
  };
}

function dataMinimizationPolicy(config) {
  return {
    id: "ai-data-minimization-policy",
    status: config.dataMinimizationReady ? "ready" : "blocked",
    mode: config.dataMinimizationReady
      ? "production-minimized-model-input-ready"
      : "dry-run-no-personal-data-to-model",
    canSendPersonalDataToModel: false,
    allowedPortfolioFields: [
      "positionSide",
      "costBasisBucket",
      "holdingPeriodBucket",
      "riskPreference",
      "targetReturnRange",
      "maxLossRange",
    ],
    forbiddenModelFields: [
      "email",
      "phone",
      "address",
      "brokerAccount",
      "brokerCredentials",
      "tradingPassword",
      "rawPortfolioNotes",
      "governmentId",
      "preciseHoldingQuantity",
    ],
    requiredControls: [
      "fieldAllowlist",
      "pseudonymousUserId",
      "portfolioBucketing",
      "credentialExclusion",
      "preRequestRedaction",
      "privacyAuditFlag",
    ],
    requiresConsentContext: true,
    requiresRedactionAudit: true,
    disclaimer:
      "真实模型请求只能携带最小化、脱敏和分桶后的投资上下文；不得发送联系方式、券商凭证、身份编号、精确持仓数量或原始持仓备注。",
  };
}

function factorInputPolicy(config) {
  return {
    id: "ai-factor-input-policy",
    status: config.factorInputsReady ? "ready" : "blocked",
    requiredFactors: ["macro", "industry", "fundamentals", "valuation", "technical", "sentiment"],
    minReadyFactors: 6,
    requiresCoverageLabels: true,
    requiresStalenessLabels: true,
    requiresUncertaintyWhenMissing: true,
    forbiddenBehavior: ["缺少关键因子仍输出高置信度", "把样例因子描述为实时数据", "隐藏缺失因子"],
    disclaimer:
      "真实模型分析必须标注六因子输入覆盖、新鲜度和缺失项；因子不足时只能降低置信度或输出信息不足。",
  };
}

function factorWeightPolicy(config) {
  return {
    id: "ai-factor-weight-policy",
    status: config.factorWeightsReady ? "ready" : "blocked",
    version: "six-factor-weight-v1",
    weights: {
      macro: 15,
      industry: 15,
      fundamentals: 20,
      valuation: 15,
      technical: 15,
      sentiment: 20,
    },
    requiresVersionedWeights: true,
    requiresManualApprovalForWeightChange: true,
    disclaimer:
      "六因子权重必须版本化并经过人工审批，避免模型或提示词更新后悄悄改变建议倾向。",
  };
}

function citationEvidencePolicy(config) {
  return {
    id: "ai-citation-evidence-policy",
    status: config.citationPackageReady ? "ready" : "blocked",
    mode: config.citationPackageReady
      ? "production-citation-package-ready"
      : "dry-run-no-uncited-model-output",
    canPublishUncitedAnalysis: false,
    minCitationsPerClaim: 1,
    requiredCitationFields: [
      "sourceId",
      "sourceType",
      "publisher",
      "publishedAt",
      "url",
      "credibilityScore",
      "importanceScore",
      "linkedFactor",
    ],
    allowedSourceTypes: ["news", "filing", "publicStatement", "marketData", "macroData"],
    forbiddenEvidenceFields: ["rawArticleText", "rawSocialPost", "paywalledFullText", "personalData"],
    requiresClaimCitationMap: true,
    requiresStalenessWarning: true,
    disclaimer:
      "真实模型输出必须把关键结论映射到来源证据包；不能展示无引用的高置信买卖结论，也不能把原文全文写入模型请求或审计。",
  };
}

function modelEvaluationPolicy(config) {
  const ready =
    config.evaluationSuiteReady &&
    config.hallucinationMonitorReady &&
    config.regressionThresholdReady;
  return {
    id: "ai-model-evaluation-policy",
    status: ready ? "ready" : "blocked",
    requiredSuites: [
      "source-grounded-answer-set",
      "six-factor-analysis-regression",
      "prohibited-claims-red-team",
      "locale-zh-cn-finance-terminology",
    ],
    minimumPassRatePercent: 95,
    maximumHallucinationRatePercent: 1,
    requiresGoldenSetRegression: true,
    requiresHumanReviewQueue: true,
    requiresPostLaunchSampling: true,
    forbiddenBehavior: ["编造来源", "保证收益", "忽略风险偏好", "证据不足仍给出高置信买卖结论"],
    disclaimer:
      "真实模型上线前必须通过离线评测、红队用例、回归阈值和上线后抽样监控，避免错误财经建议被静默发布。",
  };
}

function humanReviewPolicy(config) {
  const ready =
    config.humanReviewQueueReady &&
    config.escalationRunbookReady &&
    config.lowConfidencePolicyReady;
  return {
    id: "ai-human-review-policy",
    status: ready ? "ready" : "blocked",
    queueMode: "dry-run-no-user-visible-escalation",
    canEscalateToHumanReview: false,
    triggerRules: [
      "low-confidence-probability",
      "insufficient-source-evidence",
      "prohibited-claim-detected",
      "factor-coverage-missing",
      "red-team-pattern-match",
    ],
    lowConfidenceThresholdPercent: 55,
    maxReviewLatencyHours: 24,
    requiresReviewerRole: true,
    requiresUserVisibleFallback: true,
    requiresAuditTrail: true,
    forbiddenAutoRelease: ["mustBuy", "mustSell", "guaranteedReturn", "unsupportedHighConfidence"],
    disclaimer:
      "真实模型输出若触发低置信、证据不足或禁止表达，必须进入人工复核或回退展示，不能自动发布为用户建议。",
  };
}

function releasePolicy(config) {
  const ready =
    config.releaseCanaryReady &&
    config.versionLockReady &&
    config.rollbackSwitchReady &&
    config.releaseApprovalReady;
  return {
    id: "ai-model-release-policy",
    status: ready ? "ready" : "blocked",
    releaseMode: "dry-run-no-model-release",
    canPromoteModelVersion: false,
    rolloutStages: ["internal", "1-percent", "10-percent", "50-percent", "100-percent"],
    requiredVersionLocks: ["modelId", "promptVersion", "factorWeightVersion", "responseSchemaVersion"],
    rollbackSwitch: "FINANCE_AI_MODEL_RUNTIME=inactive",
    rollbackTriggers: ["hallucination-rate-breach", "complaint-spike", "schema-error-spike", "latency-budget-breach"],
    requiresCanaryMetrics: true,
    requiresChangeApproval: true,
    requiresRollbackRunbook: true,
    disclaimer:
      "真实模型或提示词版本发布必须灰度、锁定版本、保留回滚开关，并记录审批；不得静默切换用户看到的建议逻辑。",
  };
}

function runtimeMonitoringPolicy(config) {
  const ready =
    config.runtimeMetricsReady &&
    config.driftMonitorReady &&
    config.incidentAlertingReady &&
    config.userFeedbackMonitorReady;
  return {
    id: "ai-runtime-monitoring-policy",
    status: ready ? "ready" : "blocked",
    monitoringMode: "dry-run-no-live-monitoring",
    canOperateLiveMonitoring: false,
    requiredSignals: [
      "hallucinationReports",
      "schemaErrorRate",
      "latencyP95",
      "sourceCoverageRate",
      "userComplaintRate",
      "confidenceDistributionDrift",
    ],
    alertThresholds: {
      maxHallucinationRatePercent: 1,
      maxSchemaErrorRatePercent: 2,
      maxLatencyP95Ms: 8000,
      minSourceCoveragePercent: 95,
      maxComplaintRatePercent: 0.5,
    },
    rollbackEscalation: "manual-review-before-runtime-change",
    requiresDashboard: true,
    requiresOnCallRunbook: true,
    requiresUserFeedbackLoop: true,
    disclaimer:
      "真实模型上线后必须持续监控幻觉、schema 错误、延迟、来源覆盖和用户投诉；异常只能触发人工复核或回滚流程，不能静默继续发布。",
  };
}

function modelEvaluationEvidencePackage() {
  return {
    id: "ai-model-evaluation-evidence-package",
    status: "defined",
    mode: "dry-run-no-model-certification",
    canCertifyModelForProduction: false,
    canPublishUserVisibleAdvice: false,
    requiredManualApproval: true,
    requiredArtifacts: [
      "source-grounded-golden-set",
      "six-factor-regression-report",
      "prohibited-claims-red-team-report",
      "zh-cn-finance-terminology-review",
      "hallucination-sampling-plan",
      "probability-calibration-report",
      "human-review-queue-sla",
      "post-launch-sampling-plan",
    ],
    acceptanceThresholds: {
      minimumPassRatePercent: 95,
      maximumHallucinationRatePercent: 1,
      maximumSchemaErrorRatePercent: 2,
      minimumSourceCoveragePercent: 95,
    },
    forbiddenArtifacts: ["rawPrompt", "rawModelResponse", "modelApiKey", "personalPortfolioRaw"],
    disclaimer:
      "该评测证据包只定义真实模型上线前必须提交的评测材料和阈值，不代表模型已经通过认证、可公开发布或可生成真实投资建议。",
  };
}

function modelReleaseRollbackEvidencePackage() {
  return {
    id: "ai-model-release-rollback-evidence-package",
    status: "defined",
    mode: "dry-run-no-model-release",
    canPromoteModelVersion: false,
    canEnableLiveRuntime: false,
    requiredManualApproval: true,
    requiredArtifacts: [
      "model-version-lock",
      "prompt-version-lock",
      "factor-weight-version-lock",
      "response-schema-version-lock",
      "canary-rollout-plan",
      "rollback-switch-test",
      "user-visible-change-note",
      "incident-escalation-runbook",
    ],
    rollbackControls: {
      disableFlag: "FINANCE_AI_MODEL_RUNTIME=inactive",
      fallbackMode: "empty-no-fixture-no-advice",
      preservesAuditTrail: true,
      requiresHumanApprovalBeforeRollback: true,
    },
    releaseBlockersThatMustRemainBlocked: ["liveModelGate", "providerRuntime"],
    disclaimer:
      "该发布回滚证据包只定义模型或提示词发布前的版本锁、灰度和回滚材料，不会发布模型版本、启用 live runtime 或改变用户可见建议逻辑。",
  };
}

function modelTimeoutFallbackPolicy(config) {
  return {
    id: "ai-model-timeout-fallback-policy",
    status: "defined",
    mode: "empty-no-fixture-no-advice",
    timeoutMs: config.requestTimeoutMs,
    errorCode: "REAL_AI_MODEL_TIMEOUT_EMPTY",
    canShowPartialModelOutput: false,
    canUseFixtureFallback: false,
    canUseMockRuleFallback: false,
    keepsUserVisibleBlankState: true,
    requiresRetryWithBackoff: true,
    requiredUserMessage: "真实 AI 模型响应超时；本次保持空白，未展示非真实分析。",
    forbiddenFallbacks: [
      "fixture-analysis",
      "sample-analysis",
      "mock-rule-based-analysis",
      "local-rule-trade-plan",
      "partial-uncited-model-output",
    ],
    auditEventType: "ai.model.timeout.empty",
    disclaimer:
      "真实模型超时、失败或输出不完整时必须保持空白，不得回退为样例建议、规则建议、未引用片段或收益承诺。",
  };
}

function dataSourceEvidencePackage() {
  return {
    id: "ai-data-source-evidence-package",
    status: "defined",
    mode: "dry-run-no-live-model-grounding",
    canUseUnverifiedSources: false,
    canPublishWithoutSourceRefs: false,
    requiredSourceTypes: ["marketData", "news", "filing", "publicStatement", "macroData"],
    requiredSourceFields: [
      "sourceId",
      "sourceType",
      "publisher",
      "publishedAt",
      "url",
      "providerRuntimeMode",
      "licenseStatus",
      "freshnessLabel",
    ],
    forbiddenSourceFields: ["rawArticleText", "paywalledFullText", "providerApiKey", "rawSocialPost"],
    requiredManualChecks: [
      "providerLicenseReviewed",
      "sourceAttributionVisible",
      "stalenessLabelVisible",
      "fixtureFallbackDisclosed",
      "noRawProviderPayloadInPrompt",
    ],
    disclaimer:
      "真实数据进入 AI 分析前必须形成来源证据包；未授权、无来源、过旧或 fixture 回退数据不能被描述为实时投资依据。",
  };
}

function factorCoverageEvidencePackage() {
  return {
    id: "ai-factor-coverage-evidence-package",
    status: "defined",
    mode: "dry-run-no-factor-overconfidence",
    canUseIncompleteFactorsForHighConfidence: false,
    requiredFactors: ["macro", "industry", "fundamentals", "valuation", "technical", "sentiment"],
    minReadyFactorsForActionableAnalysis: 6,
    minReadyFactorsForEducationalAnalysis: 3,
    requiredLabels: ["ready", "stale", "fixture", "missing", "unlicensed"],
    fallbackRules: [
      "missingRequiredFactorLowersConfidence",
      "fixtureFactorBlocksRealTimeClaim",
      "unlicensedFactorBlocksPersonalizedAdvice",
      "staleFactorRequiresWarning",
    ],
    disclaimer:
      "六因子覆盖不足时，AI 只能降低置信度、显示缺失项或输出教育性分析，不能给出高置信买卖建议。",
  };
}

function dataFreshnessFallbackEvidencePackage() {
  return {
    id: "ai-data-freshness-fallback-evidence-package",
    status: "defined",
    mode: "dry-run-no-stale-data-release",
    canHideFallbackMode: false,
    freshnessWindows: {
      marketDataMaxDelayMinutes: 20,
      newsMaxAgeHours: 24,
      filingsMaxAgeDays: 7,
      macroMaxAgeDays: 45,
    },
    fallbackModes: ["fixture", "provider-error-fixture-fallback", "stale-cache", "insufficient-information"],
    requiredUserVisibleFlags: [
      "providerRuntimeMode",
      "sourceStatus",
      "updatedAt",
      "delayedOrFixtureLabel",
      "insufficientInformationReason",
    ],
    releaseBlockersThatMustRemainBlocked: ["liveModelGate", "providerRuntime"],
    disclaimer:
      "当数据过旧、provider 出错或回退 fixture 时，AI 输出必须清楚标注数据状态，并阻断实时或个性化投资建议表达。",
  };
}

function endpointContracts() {
  return [
    {
      id: "analysisCompletion",
      method: "generateStructuredAnalysis",
      status: "planned",
      input: ["stock", "riskProfile", "sourceRefs", "macroContext", "portfolioContext"],
      output: ["probabilities", "factorBreakdown", "analysisProcess", "tradePlan", "scenarioAnalysis", "disclaimer"],
    },
    {
      id: "termExplanation",
      method: "generateTermExplanation",
      status: "planned",
      input: ["termId", "locale"],
      output: ["title", "plainLanguageExplanation", "riskBoundary"],
    },
  ];
}

function responseSchema() {
  return {
    id: "ai-analysis-response-schema",
    status: "draft",
    requiredFields: [
      "upsideProbability",
      "downsideProbability",
      "sentimentScore",
      "valuationScore",
      "technicalScore",
      "confidenceScore",
      "factorBreakdown",
      "analysisProcess",
      "tradePlan",
      "scenarioAnalysis",
      "disclaimer",
    ],
    probabilityFields: ["upsideProbability", "downsideProbability", "scenarioAnalysis.cases[].probability"],
    forbiddenFields: ["guaranteedReturn", "mustBuy", "mustSell", "riskFree"],
  };
}

function responseJsonSchema() {
  return {
    type: "object",
    additionalProperties: true,
    required: [
      "upsideProbability",
      "downsideProbability",
      "sentimentScore",
      "valuationScore",
      "technicalScore",
      "confidenceScore",
      "factorBreakdown",
      "scenarioAnalysis",
      "disclaimer",
    ],
    properties: {
      upsideProbability: { type: "number", minimum: 0, maximum: 100 },
      downsideProbability: { type: "number", minimum: 0, maximum: 100 },
      sentimentScore: { type: "number", minimum: 0, maximum: 100 },
      valuationScore: { type: "number", minimum: 0, maximum: 100 },
      technicalScore: { type: "number", minimum: 0, maximum: 100 },
      confidenceScore: { type: "number", minimum: 0, maximum: 100 },
      actionReference: { type: "string" },
      reasons: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      factorBreakdown: { type: "array", items: { type: "object", additionalProperties: true } },
      scenarioAnalysis: { type: "object", additionalProperties: true },
      tradePlan: { type: "object", additionalProperties: true },
      analysisProcess: { type: "object", additionalProperties: true },
      warnings: { type: "array", items: { type: "string" } },
      disclaimer: { type: "string" },
    },
  };
}

function responseValidationPolicy(config) {
  const ready =
    config.responseValidatorReady &&
    config.probabilityCalibrationReady &&
    config.forbiddenClaimFilterReady &&
    config.schemaFailureFallbackReady;
  return {
    id: "ai-response-validation-policy",
    status: ready ? "ready" : "blocked",
    validationMode: "dry-run-no-user-visible-invalid-output",
    canPublishValidatedOutput: false,
    requiredValidators: [
      "jsonSchema",
      "probabilityBounds",
      "scenarioProbabilitySum",
      "forbiddenClaimFilter",
      "safetyRepairRetry",
      "disclaimerPresence",
      "sourceReferencePresence",
    ],
    probabilityBounds: {
      minPercent: 0,
      maxPercent: 100,
      maxScenarioSumDeviationPercent: 2,
    },
    fallbackMode: "show-insufficient-information",
    forbiddenClaims: ["guaranteedReturn", "mustBuy", "mustSell", "riskFree", "profitPromise"],
    requiresValidationAudit: true,
    requiresUserVisibleFallback: true,
    disclaimer:
      "真实模型输出必须先通过结构化 schema、概率边界、禁用承诺表达和免责声明校验；校验失败只能展示信息不足或回退内容。",
  };
}

function promptContract(config) {
  return {
    id: "ai-analysis-prompt-contract",
    version: config.promptVersion,
    locale: "zh-CN",
    tone: "professional-educational",
    requiresSourceRefs: true,
    requiresNoGuaranteeDisclaimer: true,
    outputMode: "structured-json",
    probabilityLanguage: "模型参考概率",
    forbiddenClaims: ["保证收益", "稳赚", "无风险", "必须买入", "必须卖出"],
  };
}

function clampPercent(value, fallback = 50) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function sanitizeText(value = "", maxLength = 320) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeSourceRefs(sourceContext = {}) {
  const sourceRefs = Array.isArray(sourceContext.sourceRefs) ? sourceContext.sourceRefs : [];
  return sourceRefs.slice(0, 8).map((ref, index) => ({
    id: `source-${index + 1}`,
    type: sanitizeText(ref.type || "source", 40),
    title: sanitizeText(ref.title, 180),
    sourceLabel: sanitizeText(ref.sourceLabel, 80),
    sentiment: sanitizeText(ref.sentiment || "neutral", 40),
    importanceScore: clampPercent(ref.importanceScore, 0),
    sourceCredibilityScore: clampPercent(ref.sourceCredibilityScore, 0),
  }));
}

function sanitizeMacroContext(macroContext = null) {
  if (!macroContext || macroContext.status !== "ok") return null;
  return {
    market: sanitizeText(macroContext.market, 20),
    region: sanitizeText(macroContext.region, 80),
    summary: sanitizeText(macroContext.summary, 260),
    factorScore: clampPercent(macroContext.factorScore, 50),
    asOf: sanitizeText(macroContext.asOf, 40),
    sourceLabel: sanitizeText(macroContext.source?.label || macroContext.sourceStatus, 80),
    indicators: Array.isArray(macroContext.indicators)
      ? macroContext.indicators.slice(0, 6).map((indicator) => ({
          id: sanitizeText(indicator.id, 40),
          label: sanitizeText(indicator.label, 80),
          value: sanitizeText(indicator.value, 80),
          score: clampPercent(indicator.score, 50),
          asOf: sanitizeText(indicator.asOf, 40),
        }))
      : [],
  };
}

function sanitizePortfolioContext(portfolioEntry = null) {
  if (!portfolioEntry || typeof portfolioEntry !== "object") return { provided: false };
  return {
    provided: true,
    hasBuyPrice: Boolean(portfolioEntry.buyPrice),
    hasHoldingQty: Boolean(portfolioEntry.holdingQty),
    buyDate: sanitizeText(portfolioEntry.buyDate, 40),
    targetReturn: Number(portfolioEntry.targetReturn) || null,
    maxLoss: Number(portfolioEntry.maxLoss) || null,
  };
}

function buildStructuredAnalysisPrompt(input = {}, config) {
  const stock = input.stock || {};
  const payload = {
    stock: {
      code: sanitizeText(stock.code, 30),
      name: sanitizeText(stock.name, 80),
      market: sanitizeText(stock.market, 20),
      latestPrice: Number(stock.samplePrice) || null,
      existingScores: {
        sentiment: clampPercent(stock.sentiment, 50),
        valuation: clampPercent(stock.valuation, 50),
        technical: clampPercent(stock.technical, 50),
        upsideReference: clampPercent(stock.upside, 50),
      },
    },
    riskProfile: sanitizeText(input.riskProfile || "balanced", 40),
    sourceRefs: sanitizeSourceRefs(input.sourceContext),
    macroContext: sanitizeMacroContext(input.macroContext),
    portfolioContext: sanitizePortfolioContext(input.portfolioEntry),
    outputRequirements: {
      language: "zh-CN",
      probabilityLanguage: "使用“模型参考概率”，禁止保证收益或必须买卖。",
      requiredTopLevelFields: [
        "upsideProbability",
        "downsideProbability",
        "sentimentScore",
        "valuationScore",
        "technicalScore",
        "confidenceScore",
        "actionReference",
        "reasons",
        "risks",
        "factorBreakdown",
        "scenarioAnalysis",
        "tradePlan",
        "analysisProcess",
        "warnings",
        "disclaimer",
      ],
    },
  };

  return [
    {
      role: "system",
      content:
        "你是财经分析辅助模型，只能基于用户提供的行情、新闻、公告和宏观证据做中文结构化分析。禁止承诺收益、禁止写必须买入/必须卖出、禁止编造来源。只输出 JSON 对象。",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function buildCompactStructuredAnalysisPrompt(input = {}, config) {
  const stock = input.stock || {};
  const sourceRefs = sanitizeSourceRefs(input.sourceContext).slice(0, 3);
  const macroContext = sanitizeMacroContext(input.macroContext);
  const payload = {
    stock: {
      code: sanitizeText(stock.code, 30),
      name: sanitizeText(stock.name, 80),
      market: sanitizeText(stock.market, 20),
      latestPrice: Number(stock.samplePrice) || null,
    },
    riskProfile: sanitizeText(input.riskProfile || "balanced", 40),
    sourceRefs,
    macroSummary: macroContext?.summary || "macro unavailable",
    outputFields: [
      "upsideProbability",
      "downsideProbability",
      "sentimentScore",
      "valuationScore",
      "technicalScore",
      "confidenceScore",
      "actionReference",
      "reasons",
      "risks",
      "factorBreakdown",
      "scenarioAnalysis",
      "tradePlan",
      "analysisProcess",
      "warnings",
      "disclaimer",
    ],
  };

  return [
    {
      role: "system",
      content:
        "只输出一个 JSON 对象。用中文。不要 Markdown。禁止承诺收益、必须买入、必须卖出。概率必须是 0-100 的整数。",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function buildUltraCompactStructuredAnalysisPrompt(input = {}, config) {
  const stock = input.stock || {};
  const payload = {
    stock: `${sanitizeText(stock.name, 80)} ${sanitizeText(stock.code, 30)}`,
    market: sanitizeText(stock.market, 20),
    riskProfile: sanitizeText(input.riskProfile || "balanced", 40),
    requiredJsonShape: {
      upsideProbability: 55,
      downsideProbability: 45,
      sentimentScore: 50,
      valuationScore: 50,
      technicalScore: 50,
      confidenceScore: 50,
      actionReference: "观察",
      reasons: ["一句中文理由"],
      risks: ["一句中文风险"],
      factorBreakdown: [
        { key: "macro", label: "宏观", score: 50, summary: "一句中文摘要" },
        { key: "industry", label: "行业", score: 50, summary: "一句中文摘要" },
        { key: "fundamental", label: "基本面", score: 50, summary: "一句中文摘要" },
        { key: "valuation", label: "估值", score: 50, summary: "一句中文摘要" },
        { key: "technical", label: "技术面", score: 50, summary: "一句中文摘要" },
        { key: "sentiment", label: "情绪", score: 50, summary: "一句中文摘要" },
      ],
      scenarioAnalysis: {
        horizon: "1-3个月",
        cases: [
          { key: "bull", label: "乐观情景", probability: 25, summary: "一句中文摘要" },
          { key: "base", label: "基准情景", probability: 50, summary: "一句中文摘要" },
          { key: "bear", label: "谨慎情景", probability: 25, summary: "一句中文摘要" },
        ],
        disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
      },
      disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
    },
  };

  return [
    {
      role: "system",
      content:
        "只输出纯 JSON 对象，不要 Markdown，不要代码块，不要解释。字段必须和 requiredJsonShape 一致，包含 6 个 factorBreakdown 和 3 个 scenarioAnalysis.cases。",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function buildSafetyRepairStructuredAnalysisPrompt(input = {}, config) {
  const compactPrompt = buildCompactStructuredAnalysisPrompt(input, config);
  return [
    {
      role: "system",
      content:
        "上一次输出未通过合规校验。只输出纯 JSON 对象，不要 Markdown，不要解释。禁止使用保证收益、稳赚、无风险、必须买入、必须卖出、mustBuy、mustSell、riskFree、guaranteedReturn 等表达。把强制买卖或收益承诺改写为观察、风险提示、条件触发和研究参考。",
    },
    ...compactPrompt.filter((message) => message.role !== "system"),
  ];
}

function buildMetricsRepairStructuredAnalysisPrompt(input = {}, config) {
  const stock = input.stock || {};
  const sourceRefs = sanitizeSourceRefs(input.sourceContext).slice(0, 5);
  const macroContext = sanitizeMacroContext(input.macroContext);
  const payload = {
    stock: `${sanitizeText(stock.name, 80)} ${sanitizeText(stock.code, 30)}`,
    market: sanitizeText(stock.market, 20),
    riskProfile: sanitizeText(input.riskProfile || "balanced", 40),
    sourceRefs,
    macroSummary: macroContext?.summary || "宏观数据不足，请降低置信度。",
    requiredJsonShape: {
      upsideProbability: 55,
      downsideProbability: 45,
      sentimentScore: 50,
      valuationScore: 50,
      technicalScore: 50,
      confidenceScore: 45,
      actionReference: "真实模型参考：保持观察，等待更多真实证据确认。",
      reasons: ["基于已提供真实数据的一句中文理由"],
      risks: ["一句中文风险提示"],
      factorBreakdown: [
        { key: "macro", label: "宏观", score: 50, summary: "一句中文摘要" },
        { key: "industry", label: "行业", score: 50, summary: "一句中文摘要" },
        { key: "fundamental", label: "基本面", score: 50, summary: "一句中文摘要" },
        { key: "valuation", label: "估值", score: 50, summary: "一句中文摘要" },
        { key: "technical", label: "技术面", score: 50, summary: "一句中文摘要" },
        { key: "sentiment", label: "情绪", score: 50, summary: "一句中文摘要" },
      ],
      scenarioAnalysis: {
        horizon: "1-3个月",
        cases: [
          { key: "bull", label: "乐观情景", probability: 25, summary: "一句中文摘要" },
          { key: "base", label: "基准情景", probability: 50, summary: "一句中文摘要" },
          { key: "bear", label: "谨慎情景", probability: 25, summary: "一句中文摘要" },
        ],
        disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
      },
      tradePlan: {
        summary: "仅作观察，不构成买卖建议。",
        disclaimer: "不构成投资建议或收益承诺。",
      },
      analysisProcess: { version: "real-model-analysis-v1", mode: "metric-repair" },
      warnings: ["数据不足时必须降低置信度。"],
      disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
    },
  };

  return [
    {
      role: "system",
      content:
        "上一次输出缺少核心量化指标或结构。只输出纯 JSON 对象，不要 Markdown，不要解释。必须保留 requiredJsonShape 的全部字段和嵌套结构，必须包含 6 个 factorBreakdown 项和 bull/base/bear 3 个 scenario cases；可根据 sourceRefs 和 macroSummary 调整数值与摘要。所有概率和分数必须是 0-100 的整数。禁止保证收益、稳赚、无风险、必须买入、必须卖出。",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function buildForcedMetricsRepairStructuredAnalysisPrompt(input = {}, config) {
  const stock = input.stock || {};
  const sourceRefs = sanitizeSourceRefs(input.sourceContext).slice(0, 3);
  const macroContext = sanitizeMacroContext(input.macroContext);
  const payload = {
    instruction:
      "Return exactly one JSON object. Do not omit any key. Do not add markdown. Use Chinese strings. Adjust numeric values only when the provided evidence supports it; otherwise keep confidence conservative.",
    evidence: {
      stock: {
        code: sanitizeText(stock.code, 30),
        name: sanitizeText(stock.name, 80),
        market: sanitizeText(stock.market, 20),
        latestPrice: Number(stock.samplePrice) || null,
      },
      riskProfile: sanitizeText(input.riskProfile || "balanced", 40),
      sourceRefs,
      macroSummary: macroContext?.summary || "宏观数据不足",
    },
    requiredExactShape: {
      upsideProbability: 52,
      downsideProbability: 48,
      sentimentScore: 50,
      valuationScore: 50,
      technicalScore: 50,
      confidenceScore: 42,
      actionReference: "模型参考：保持观察，等待更多真实证据确认。",
      reasons: ["基于已提供证据的中文理由。"],
      risks: ["数据覆盖不足时需要降低置信度。"],
      factorBreakdown: [
        { key: "macro", label: "宏观", score: 50, summary: "宏观证据摘要。" },
        { key: "industry", label: "行业", score: 50, summary: "行业证据摘要。" },
        { key: "fundamental", label: "基本面", score: 50, summary: "基本面证据摘要。" },
        { key: "valuation", label: "估值", score: 50, summary: "估值证据摘要。" },
        { key: "technical", label: "技术面", score: 50, summary: "技术面证据摘要。" },
        { key: "sentiment", label: "情绪", score: 50, summary: "情绪证据摘要。" },
      ],
      scenarioAnalysis: {
        horizon: "1-3个月",
        cases: [
          { key: "bull", label: "乐观情景", probability: 25, summary: "乐观情景摘要。" },
          { key: "base", label: "基准情景", probability: 50, summary: "基准情景摘要。" },
          { key: "bear", label: "谨慎情景", probability: 25, summary: "谨慎情景摘要。" },
        ],
        disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
      },
      tradePlan: {
        summary: "仅作研究观察，不构成买卖建议。",
        disclaimer: "不构成投资建议、交易指令或收益承诺。",
      },
      analysisProcess: {
        version: "real-model-analysis-v1",
        mode: "forced-metric-shape-repair",
        confidence: 42,
      },
      warnings: ["来源不足或过旧时需要降低置信度。"],
      disclaimer: "模型参考概率仅供研究参考，不构成投资建议、交易指令或收益承诺。",
    },
  };

  return [
    {
      role: "system",
      content:
        "You repair incomplete finance-analysis JSON. Output only valid JSON. The output must contain every key from requiredExactShape, including all 6 factorBreakdown rows and all 3 scenarioAnalysis cases. No markdown. No code fences. No guarantee language. No must-buy or must-sell language.",
    },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];
}

function extractJsonObject(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function providerHttpError(response, label = "真实 AI 模型接口") {
  let providerCode = "";
  let providerMessage = "";
  try {
    const payload = await response.json();
    providerCode = sanitizeText(payload?.error?.code || payload?.error?.type || "", 80);
    providerMessage = sanitizeText(payload?.error?.message || payload?.message || "", 180);
  } catch {
    providerCode = "";
    providerMessage = "";
  }
  const providerDetail = providerMessage ? `：${providerMessage}` : "";
  if (providerCode === "insufficient_quota") {
    return {
      code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
      message: `${label} 返回 429${providerDetail}；当前 OpenAI 项目额度或账单不足；本次保持空白。`,
      providerCode,
      providerMessage,
    };
  }
  if (response.status === 429) {
    return {
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      message: `${label} 返回 429${providerDetail}；当前模型 provider 额度或速率限制触发；本次保持空白。`,
      providerCode,
      providerMessage,
    };
  }
  return {
    code: "REAL_AI_MODEL_HTTP_ERROR",
    message: `${label} 返回 ${response.status}${providerDetail}；本次保持空白。`,
    providerCode,
    providerMessage,
  };
}

function fallbackConfigFromPrimary(config = {}, fallbackProvider = null) {
  const fallback = fallbackProvider || config.fallbackProvider || {};
  return {
    ...config,
    selectedProvider: fallback.selectedProvider || "openai-compatible",
    selectedModel: fallback.selectedModel || defaultReliableModelId,
    apiKey: fallback.apiKey || "",
    baseUrl: fallback.baseUrl || defaultOpenAiCompatibleBaseUrl,
    apiStyle: fallback.apiStyle || "chat-completions",
    configured: Boolean(fallback.configured),
    supported: fallback.supported !== false,
    allowNetwork: fallback.allowNetwork !== false,
  };
}

function fallbackEnvPrefix(index = 1) {
  return index <= 1 ? "FINANCE_AI_MODEL_FALLBACK" : `FINANCE_AI_MODEL_FALLBACK${index}`;
}

function fallbackMissingEnvVars(provider = {}, index = 1) {
  const prefix = fallbackEnvPrefix(index);
  return [
    provider.apiKey ? "" : `${prefix}_API_KEY`,
    provider.selectedModel ? "" : `${prefix}_ID`,
  ].filter(Boolean);
}

function fallbackSetupStatus(provider = {}, index = 1, runtimeMode = "inactive") {
  const missing = fallbackMissingEnvVars(provider, index);
  if (missing.length) return `缺少 ${missing.join(" / ")}`;
  if (provider.supported === false) return "provider 未注册";
  if (provider.allowNetwork === false) return "网络开关未启用";
  if (runtimeMode === "inactive") return "runtime 未启用";
  return "可接力";
}

function shouldAttemptFallback(error = {}) {
  return [
    "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
    "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
    "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
    "REAL_AI_MODEL_HTTP_ERROR",
    "REAL_AI_MODEL_TIMEOUT_EMPTY",
    "REAL_AI_MODEL_REQUEST_FAILED",
    "REAL_AI_MODEL_NOT_CONFIGURED",
  ].includes(error?.code);
}

function modelErrorRetryAfterSeconds(error = {}) {
  if (Number.isFinite(Number(error?.retryAfterSeconds)) && Number(error.retryAfterSeconds) > 0) {
    return Math.ceil(Number(error.retryAfterSeconds));
  }
  const code = String(error?.code || "");
  if (code === "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE") return 10 * 60;
  if (code === "REAL_AI_MODEL_INSUFFICIENT_QUOTA") return 60 * 60;
  if (code === "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA") return 10 * 60;
  if (code === "REAL_AI_MODEL_TIMEOUT_EMPTY") return 2 * 60;
  if (code === "REAL_AI_MODEL_HTTP_ERROR" || code === "REAL_AI_MODEL_REQUEST_FAILED") return 5 * 60;
  if (code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED") return 0;
  if (code === "REAL_AI_MODEL_NOT_CONFIGURED") return 0;
  return 0;
}

function modelErrorPhase(error = {}) {
  const code = String(error?.code || "");
  if (code === "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE") {
    return {
      callStatus: "已跳过",
      outputStatus: "冷却中未请求",
      validationStatus: "未进入校验",
      finalReason: "Provider 冷却中",
    };
  }
  if (code === "REAL_AI_MODEL_INVALID_JSON") {
    return {
      callStatus: "调用成功",
      outputStatus: "JSON 输出不可校验",
      validationStatus: "未通过结构化校验",
      finalReason: "输出格式失败",
    };
  }
  if (code === "REAL_AI_MODEL_MISSING_METRICS") {
    return {
      callStatus: "调用成功",
      outputStatus: "结构化输出不完整",
      validationStatus: "缺少核心指标",
      finalReason: "输出缺少指标",
    };
  }
  if (code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED") {
    return {
      callStatus: "调用成功",
      outputStatus: "输出包含不合规表达",
      validationStatus: "安全校验未通过",
      finalReason: "输出未通过安全校验",
    };
  }
  if (code === "REAL_AI_MODEL_INSUFFICIENT_QUOTA") {
    return {
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      finalReason: "主模型额度不足",
    };
  }
  if (code === "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA") {
    return {
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      finalReason: "额度或速率受限",
    };
  }
  if (code === "REAL_AI_MODEL_TIMEOUT_EMPTY") {
    return {
      callStatus: "调用超时",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      finalReason: "请求超时",
    };
  }
  if (code === "REAL_AI_MODEL_NOT_CONFIGURED") {
    return {
      callStatus: "已跳过",
      outputStatus: "主模型未请求",
      validationStatus: "未进入校验",
      finalReason: "主模型未配置",
    };
  }
  return {
    callStatus: code ? "调用失败" : "未知",
    outputStatus: "无可用输出",
    validationStatus: "未通过",
    finalReason: code ? "模型调用失败" : "等待返回",
  };
}

function modelErrorNextStep(error = {}) {
  const code = String(error?.code || "");
  if (code === "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE") {
    return "等待建议重试时间；系统可继续尝试未冷却的备用模型。";
  }
  if (code === "REAL_AI_MODEL_INSUFFICIENT_QUOTA") {
    return "检查主模型账户额度或账单；继续尝试备用模型。";
  }
  if (code === "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA") {
    return "等待 provider 冷却，或立即尝试下一个已配置备用模型。";
  }
  if (code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED") {
    return error?.safetyRepairAttempted
      ? "已自动安全改写并再次校验，仍失败；本次降级为规则参考。"
      : "自动要求模型改写为合规表达后再次校验。";
  }
  if (code === "REAL_AI_MODEL_INVALID_JSON") {
    return "尝试 JSON 修复或更严格的结构化输出提示。";
  }
  if (code === "REAL_AI_MODEL_MISSING_METRICS") {
    return error?.metricRepairAttempted
      ? "已要求模型补齐完整结构，仍失败；本次降级为规则参考。"
      : "要求模型补齐上涨/下跌/情绪/估值/技术五个核心指标和分析结构。";
  }
  if (code === "REAL_AI_MODEL_TIMEOUT_EMPTY") {
    return "缩短输入或稍后重试。";
  }
  if (code === "REAL_AI_MODEL_NOT_CONFIGURED") {
    return "主模型缺少 provider 或 key；系统可继续尝试已配置的备用模型。";
  }
  return "查看技术诊断后决定是否切换模型或稍后重试。";
}

function createRelayAttempt({ role = "模型", model = "", error = null } = {}) {
  const retryAfterSeconds = modelErrorRetryAfterSeconds(error);
  const failedAt = new Date().toISOString();
  const retryAt = retryAfterSeconds ? new Date(Date.now() + retryAfterSeconds * 1000).toISOString() : "";
  const phase = modelErrorPhase(error);
  return {
    role,
    model,
    code: error?.code || "",
    message: sanitizeText(error?.message || "", 260),
    providerCode: sanitizeText(error?.providerCode || "", 80),
    ...phase,
    retryable: retryAfterSeconds > 0 || error?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED",
    retryAfterSeconds,
    failedAt,
    retryAt,
    cooldownStatus: retryAfterSeconds ? "cooldown-active" : "no-cooldown-required",
    safetyRepairAttempted: error?.safetyRepairAttempted === true,
    safetyRepairStatus: error?.safetyRepairAttempted
      ? error?.safetyRepairPassed
        ? "repair-passed"
        : "repair-failed"
      : error?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED"
        ? "repair-available"
        : "not-required",
    metricRepairAttempted: error?.metricRepairAttempted === true,
    metricRepairStatus: error?.metricRepairAttempted
      ? error?.metricRepairPassed
        ? "repair-passed"
        : "repair-failed"
      : error?.code === "REAL_AI_MODEL_MISSING_METRICS"
        ? "repair-available"
        : "not-required",
    nextStep: modelErrorNextStep(error),
  };
}

function providerCooldownKey(config = {}) {
  return [config.selectedProvider || "", config.baseUrl || "", config.selectedModel || ""].join("|");
}

function getActiveProviderCooldown(config = {}, cooldowns = new Map()) {
  const key = providerCooldownKey(config);
  const entry = cooldowns.get(key);
  if (!entry) return null;
  const remainingMs = Number(entry.retryAtMs || 0) - Date.now();
  if (remainingMs <= 0) {
    cooldowns.delete(key);
    return null;
  }
  const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return {
    code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
    message: `${config.selectedModel || "模型"} 仍在本机冷却中；本次跳过该 provider，避免重复触发 429。`,
    providerCode: entry.providerCode || "local-cooldown",
    retryAfterSeconds,
    failedAt: entry.failedAt || "",
    retryAt: new Date(Number(entry.retryAtMs)).toISOString(),
  };
}

function recordProviderCooldown(config = {}, error = {}, cooldowns = new Map()) {
  const retryAfterSeconds = modelErrorRetryAfterSeconds(error);
  if (!retryAfterSeconds) return;
  cooldowns.set(providerCooldownKey(config), {
    retryAtMs: Date.now() + retryAfterSeconds * 1000,
    failedAt: new Date().toISOString(),
    providerCode: error?.providerCode || "",
  });
}

async function callProviderWithCooldown(input = {}, config = {}, cooldowns = new Map()) {
  const cooldownError = getActiveProviderCooldown(config, cooldowns);
  if (cooldownError) {
    return {
      status: "provider-error",
      error: cooldownError,
    };
  }
  const result = await callStructuredAnalysisProvider(input, config);
  if (result.status === "ok") {
    cooldowns.delete(providerCooldownKey(config));
    return result;
  }
  recordProviderCooldown(config, result.error, cooldowns);
  return result;
}

async function callStructuredAnalysisProvider(input = {}, config) {
  if (config.apiStyle === "responses") {
    return callOpenAiResponsesStructuredAnalysis(input, config);
  }
  return callOpenAiCompatibleStructuredAnalysis(input, config);
}

function extractResponsesText(payload = {}) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text;
      if (typeof part?.content === "string" && part.content.trim()) return part.content;
    }
  }
  return "";
}

function validateForbiddenClaims(text = "") {
  return !/(保证收益|稳赚|无风险|必须买入|必须卖出|guaranteedReturn|mustBuy|mustSell|riskFree)/i.test(
    String(text || ""),
  );
}

const requiredQuantMetricFields = [
  "upsideProbability",
  "downsideProbability",
  "sentimentScore",
  "valuationScore",
  "technicalScore",
];

function readRequiredPercentMetric(payload = {}, field) {
  const number = Number(payload[field]);
  if (!Number.isFinite(number)) {
    const error = new Error(`真实 AI 模型缺少核心量化指标：${field}；本次保持空白，不使用默认值补齐。`);
    error.code = "REAL_AI_MODEL_MISSING_METRICS";
    error.missingMetric = field;
    throw error;
  }
  return clampPercent(number, 0);
}

function normalizeModelArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeStructuredAnalysisResponse(parsed = {}, input = {}, config) {
  const stock = input.stock || {};
  const serialized = JSON.stringify(parsed);
  if (!validateForbiddenClaims(serialized)) {
    const error = new Error("模型输出包含禁止的收益承诺或强制买卖表达。");
    error.code = "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED";
    throw error;
  }

  const factorBreakdown = normalizeModelArray(parsed.factorBreakdown).slice(0, 6);
  const scenarioCases = normalizeModelArray(parsed.scenarioAnalysis?.cases).slice(0, 3);
  if (!factorBreakdown.length || !scenarioCases.length) {
    const error = new Error("模型输出缺少六因子或情景分析结构。");
    error.code = "REAL_AI_MODEL_MISSING_METRICS";
    throw error;
  }

  const missingMetrics = requiredQuantMetricFields.filter(
    (field) => !Number.isFinite(Number(parsed[field])),
  );
  if (missingMetrics.length) {
    const error = new Error(
      `真实 AI 模型缺少核心量化指标：${missingMetrics.join("、")}；本次保持空白，不使用默认值补齐。`,
    );
    error.code = "REAL_AI_MODEL_MISSING_METRICS";
    error.missingMetrics = missingMetrics;
    throw error;
  }

  const upsideProbability = readRequiredPercentMetric(parsed, "upsideProbability");
  const downsideProbability = readRequiredPercentMetric(parsed, "downsideProbability");
  const sentimentScore = readRequiredPercentMetric(parsed, "sentimentScore");
  const valuationScore = readRequiredPercentMetric(parsed, "valuationScore");
  const technicalScore = readRequiredPercentMetric(parsed, "technicalScore");
  const confidenceScore = clampPercent(parsed.confidenceScore, 50);

  return {
    symbol: stock.code,
    name: stock.name,
    market: stock.market,
    riskProfile: input.riskProfile || "balanced",
    modelReference: true,
    upsideProbability,
    downsideProbability,
    sentimentScore,
    valuationScore,
    technicalScore,
    confidenceScore,
    actionReference: sanitizeText(parsed.actionReference || "真实模型未给出明确操作边界，保持观察。", 800),
    reasons: normalizeModelArray(parsed.reasons).map((item) => sanitizeText(item, 300)).filter(Boolean),
    risks: normalizeModelArray(parsed.risks).map((item) => sanitizeText(item, 300)).filter(Boolean),
    history: Array.isArray(stock.history) ? stock.history : [],
    historySource: stock.historySource || {},
    factorBreakdown,
    scenarioAnalysis: {
      mode: "real-model-reference",
      horizon: sanitizeText(parsed.scenarioAnalysis?.horizon || "未标注", 80),
      cases: scenarioCases.map((item) => ({
        key: sanitizeText(item.key, 40),
        label: sanitizeText(item.label, 80),
        probability: clampPercent(item.probability, 0),
        targetPrice: Number(item.targetPrice) || null,
        expectedReturnPct: Number(item.expectedReturnPct) || null,
        summary: sanitizeText(item.summary, 300),
      })),
      disclaimer: sanitizeText(
        parsed.scenarioAnalysis?.disclaimer ||
          "情景概率为模型参考，不构成收益预测、买卖建议或承诺。",
        300,
      ),
    },
    tradePlan: {
      ...(typeof parsed.tradePlan === "object" && parsed.tradePlan ? parsed.tradePlan : {}),
      mode: "real-model-reference",
      disclaimer: sanitizeText(
        parsed.tradePlan?.disclaimer ||
          "仅为模型参考边界，不构成买入、卖出、加仓、减仓或收益承诺。",
        300,
      ),
    },
    analysisProcess:
      typeof parsed.analysisProcess === "object" && parsed.analysisProcess
        ? {
            ...parsed.analysisProcess,
            mode: parsed.analysisProcess.mode || "real-model-structured-json",
          }
        : {
            version: "real-model-analysis-v1",
            mode: "real-model-structured-json",
            confidence: confidenceScore,
            disclaimer: "真实模型分析过程仅解释模型参考概率，不构成投资建议、交易指令或收益承诺。",
          },
    inputCoverage: {
      macro: input.macroContext?.status === "ok" ? "backend-real-provider-macro" : "missing",
      news: sanitizeSourceRefs(input.sourceContext).some((ref) => ref.type === "news")
        ? "backend-real-provider-news"
        : "missing",
      filings: sanitizeSourceRefs(input.sourceContext).some((ref) => ref.type === "filing")
        ? "backend-real-provider-filings"
        : "missing",
      publicStatements: sanitizeSourceRefs(input.sourceContext).some((ref) => ref.type === "statement")
        ? "backend-real-provider-statements"
        : "missing",
      model: "real-provider-model",
      portfolio: input.portfolioEntry ? "backend-saved-position-or-partial" : "not_required",
    },
    macroContext: sanitizeMacroContext(input.macroContext),
    portfolioContext: sanitizePortfolioContext(input.portfolioEntry),
    analysisService: {
      id: "real-ai-analysis",
      mode: "real-provider",
      provider: config.selectedProvider,
      model: config.selectedModel,
    },
    warnings: normalizeModelArray(parsed.warnings, [
      "真实模型输出仅为分析参考，不构成投资建议或收益承诺。",
    ]).map((item) => sanitizeText(item, 260)),
    disclaimer: sanitizeText(
      parsed.disclaimer || "模型参考概率和操作边界仅供研究参考，不构成投资建议或收益承诺。",
      300,
    ),
    generatedAt: new Date().toISOString(),
  };
}

async function callOpenAiCompatibleStructuredAnalysis(input = {}, config, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const compact = options.compact === true;
  const ultraCompact = options.ultraCompact === true;
  const safetyRepair = options.safetyRepair === true;
  const metricRepair = options.metricRepair === true;
  const forcedMetricShapeRepair = options.forcedMetricShapeRepair === true;
  const retryCount = Number(options.retryCount || 0);
  const omitResponseFormat = options.omitResponseFormat === true;
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.selectedModel,
        messages: safetyRepair
          ? buildSafetyRepairStructuredAnalysisPrompt(input, config)
          : forcedMetricShapeRepair
            ? buildForcedMetricsRepairStructuredAnalysisPrompt(input, config)
          : metricRepair
            ? buildMetricsRepairStructuredAnalysisPrompt(input, config)
            : ultraCompact
              ? buildUltraCompactStructuredAnalysisPrompt(input, config)
              : compact
                ? buildCompactStructuredAnalysisPrompt(input, config)
                : buildStructuredAnalysisPrompt(input, config),
        temperature: 0.2,
        max_tokens: ultraCompact
          ? Math.min(config.maxTokensPerRequest, 512)
          : compact
            ? Math.min(config.maxTokensPerRequest, 900)
            : config.maxTokensPerRequest,
        ...(isGeminiOpenAiCompatibleConfig(config)
          ? { reasoning_effort: geminiReasoningEffort(config) }
          : {}),
        ...(isGeminiOpenAiCompatibleConfig(config) || omitResponseFormat
          ? {}
          : { response_format: { type: "json_object" } }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await providerHttpError(response);
      if (isGeminiOpenAiCompatibleConfig(config) && !compact && response.status >= 500) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, { compact: true });
      }
      if (isGeminiOpenAiCompatibleConfig(config) && compact && !ultraCompact && response.status >= 500) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          compact: true,
          ultraCompact: true,
        });
      }
      if (!isGeminiOpenAiCompatibleConfig(config) && response.status === 400 && !omitResponseFormat) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          ...options,
          omitResponseFormat: true,
          compact: true,
        });
      }
      return {
        status: "provider-error",
        error,
      };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(content);
    if (!parsed) {
      if (!compact) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          ...options,
          compact: true,
        });
      }
      if (!ultraCompact) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          ...options,
          compact: true,
          ultraCompact: true,
        });
      }
      return {
        status: "provider-error",
        error: {
          code: "REAL_AI_MODEL_INVALID_JSON",
          message: "真实 AI 模型未返回可校验 JSON；本次保持空白。",
        },
      };
    }

    try {
      return {
        status: "ok",
        analysis: normalizeStructuredAnalysisResponse(parsed, input, config),
        provider: {
          id: config.selectedProvider,
          model: config.selectedModel,
          endpoint: `${config.baseUrl}/chat/completions`,
          compactPrompt: compact,
          ultraCompactPrompt: ultraCompact,
          responseFormatOmitted: omitResponseFormat,
          safetyRepairPrompt: safetyRepair,
          metricRepairPrompt: metricRepair,
          forcedMetricShapeRepairPrompt: forcedMetricShapeRepair,
        },
      };
    } catch (validationError) {
      if (validationError?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED" && !safetyRepair) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          compact: true,
          ultraCompact: true,
          safetyRepair: true,
        });
      }
      if (validationError?.code === "REAL_AI_MODEL_MISSING_METRICS" && !metricRepair) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          metricRepair: true,
        });
      }
      if (
        validationError?.code === "REAL_AI_MODEL_MISSING_METRICS" &&
        metricRepair &&
        !forcedMetricShapeRepair
      ) {
        return callOpenAiCompatibleStructuredAnalysis(input, config, {
          metricRepair: true,
          forcedMetricShapeRepair: true,
        });
      }
      return {
        status: "provider-error",
        error: {
          code: validationError?.code || "REAL_AI_MODEL_RESPONSE_VALIDATION_FAILED",
          message: validationError?.message || "真实 AI 模型输出未通过校验；本次保持空白。",
          safetyRepairAttempted: safetyRepair,
          safetyRepairPassed: false,
          metricRepairAttempted: metricRepair || forcedMetricShapeRepair,
          metricRepairPassed: false,
          forcedMetricShapeRepairAttempted: forcedMetricShapeRepair,
        },
      };
    }
  } catch (error) {
    if (!error?.code && isGeminiOpenAiCompatibleConfig(config) && retryCount < 2) {
      return callOpenAiCompatibleStructuredAnalysis(input, config, {
        compact: true,
        ultraCompact: true,
        retryCount: retryCount + 1,
      });
    }
    return {
      status: "provider-error",
      error: {
        code:
          error?.code ||
          (error?.name === "AbortError" ? "REAL_AI_MODEL_TIMEOUT_EMPTY" : "REAL_AI_MODEL_REQUEST_FAILED"),
        message:
          error?.message ||
          (error?.name === "AbortError"
            ? "真实 AI 模型响应超时；本次保持空白。"
            : "真实 AI 模型请求失败；本次保持空白。"),
        providerCode: sanitizeText(error?.cause?.code || error?.code || error?.name || "", 80),
        safetyRepairAttempted: safetyRepair && error?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED",
        safetyRepairPassed: false,
        metricRepairAttempted: metricRepair && error?.code === "REAL_AI_MODEL_MISSING_METRICS",
        metricRepairPassed: false,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiResponsesStructuredAnalysis(input = {}, config, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const compact = options.compact === true;
  const ultraCompact = options.ultraCompact === true;
  const safetyRepair = options.safetyRepair === true;
  const metricRepair = options.metricRepair === true;
  const forcedMetricShapeRepair = options.forcedMetricShapeRepair === true;
  const promptMessages = safetyRepair
    ? buildSafetyRepairStructuredAnalysisPrompt(input, config)
    : forcedMetricShapeRepair
      ? buildForcedMetricsRepairStructuredAnalysisPrompt(input, config)
    : metricRepair
      ? buildMetricsRepairStructuredAnalysisPrompt(input, config)
    : ultraCompact
      ? buildUltraCompactStructuredAnalysisPrompt(input, config)
    : compact
      ? buildCompactStructuredAnalysisPrompt(input, config)
    : buildStructuredAnalysisPrompt(input, config);
  try {
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.selectedModel,
        input: promptMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        max_output_tokens: ultraCompact
          ? Math.min(config.maxTokensPerRequest, 512)
          : compact
            ? Math.min(config.maxTokensPerRequest, 900)
            : config.maxTokensPerRequest,
        text: {
          format: {
            type: "json_schema",
            name: "finance_ai_analysis",
            strict: false,
            schema: responseJsonSchema(),
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await providerHttpError(response, "真实 AI 模型 Responses API");
      return {
        status: "provider-error",
        error,
      };
    }

    const payload = await response.json();
    const parsed = extractJsonObject(extractResponsesText(payload));
    if (!parsed) {
      if (!compact) {
        return callOpenAiResponsesStructuredAnalysis(input, config, {
          ...options,
          compact: true,
        });
      }
      if (!ultraCompact) {
        return callOpenAiResponsesStructuredAnalysis(input, config, {
          ...options,
          compact: true,
          ultraCompact: true,
        });
      }
      return {
        status: "provider-error",
        error: {
          code: "REAL_AI_MODEL_INVALID_JSON",
          message: "真实 AI 模型 Responses API 未返回可校验 JSON；本次保持空白。",
        },
      };
    }

    try {
      return {
        status: "ok",
        analysis: normalizeStructuredAnalysisResponse(parsed, input, config),
        provider: {
          id: config.selectedProvider,
          model: config.selectedModel,
          endpoint: `${config.baseUrl}/responses`,
          apiStyle: "responses",
          compactPrompt: compact,
          ultraCompactPrompt: ultraCompact,
          safetyRepairPrompt: safetyRepair,
          metricRepairPrompt: metricRepair,
          forcedMetricShapeRepairPrompt: forcedMetricShapeRepair,
        },
      };
    } catch (validationError) {
      if (validationError?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED" && !safetyRepair) {
        return callOpenAiResponsesStructuredAnalysis(input, config, { safetyRepair: true });
      }
      if (validationError?.code === "REAL_AI_MODEL_MISSING_METRICS" && !metricRepair) {
        return callOpenAiResponsesStructuredAnalysis(input, config, { metricRepair: true });
      }
      if (
        validationError?.code === "REAL_AI_MODEL_MISSING_METRICS" &&
        metricRepair &&
        !forcedMetricShapeRepair
      ) {
        return callOpenAiResponsesStructuredAnalysis(input, config, {
          metricRepair: true,
          forcedMetricShapeRepair: true,
        });
      }
      return {
        status: "provider-error",
        error: {
          code: validationError?.code || "REAL_AI_MODEL_RESPONSE_VALIDATION_FAILED",
          message: validationError?.message || "真实 AI 模型 Responses API 输出未通过校验；本次保持空白。",
          safetyRepairAttempted: safetyRepair,
          safetyRepairPassed: false,
          metricRepairAttempted: metricRepair || forcedMetricShapeRepair,
          metricRepairPassed: false,
          forcedMetricShapeRepairAttempted: forcedMetricShapeRepair,
        },
      };
    }
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code:
          error?.code ||
          (error?.name === "AbortError" ? "REAL_AI_MODEL_TIMEOUT_EMPTY" : "REAL_AI_MODEL_REQUEST_FAILED"),
        message:
          error?.message ||
          (error?.name === "AbortError"
            ? "真实 AI 模型响应超时；本次保持空白。"
            : "真实 AI 模型 Responses API 请求失败；本次保持空白。"),
        safetyRepairAttempted: safetyRepair && error?.code === "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED",
        safetyRepairPassed: false,
        metricRepairAttempted: metricRepair && error?.code === "REAL_AI_MODEL_MISSING_METRICS",
        metricRepairPassed: false,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function complianceGate(config) {
  const modelBudgetPolicy = budgetPolicy(config);
  const modelSecretManagementPolicy = secretManagementPolicy(config);
  const modelSourceGroundingPolicy = sourceGroundingPolicy(config);
  const modelPromptInjectionDefensePolicy = promptInjectionDefensePolicy(config);
  const modelDataMinimizationPolicy = dataMinimizationPolicy(config);
  const modelAuditPolicy = auditPolicy(config);
  const modelResponseValidationPolicy = responseValidationPolicy(config);
  const modelFactorInputPolicy = factorInputPolicy(config);
  const modelFactorWeightPolicy = factorWeightPolicy(config);
  const modelCitationEvidencePolicy = citationEvidencePolicy(config);
  const modelEvalPolicy = modelEvaluationPolicy(config);
  const modelHumanReviewPolicy = humanReviewPolicy(config);
  const modelReleasePolicy = releasePolicy(config);
  const modelRuntimeMonitoringPolicy = runtimeMonitoringPolicy(config);
  const checks = [
    {
      id: "providerConfig",
      status: config.configured && config.supported ? "pass" : "blocked",
      message:
        config.configured && config.supported
          ? "AI provider、API key 和模型 id 已配置。"
          : "AI provider、API key 或模型 id 尚未完成可用配置。",
    },
    {
      id: "promptContract",
      status: "pass",
      message: "结构化提示词契约要求中文、来源引用、概率语言和免责声明。",
    },
    {
      id: "responseSchema",
      status: "pass",
      message: "响应 schema 禁止收益保证、必须买卖和无风险字段。",
    },
    {
      id: "responseValidation",
      status: modelResponseValidationPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelResponseValidationPolicy.status === "ready"
          ? "模型输出 schema、概率边界、禁用承诺表达和失败回退校验已确认。"
          : "模型输出 schema、概率边界、禁用承诺表达或失败回退校验尚未确认。",
    },
    {
      id: "auditReadiness",
      status: modelAuditPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelAuditPolicy.status === "ready"
          ? "模型请求审计接收端、脱敏和留存规则已确认。"
          : "模型请求审计接收端、脱敏和留存规则尚未确认。",
    },
    {
      id: "costControls",
      status: modelBudgetPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelBudgetPolicy.status === "ready"
          ? "模型调用成本预算、限流和 token 上限已配置。"
          : "模型调用成本预算、限流或 token 上限尚未配置。",
    },
    {
      id: "secretManagement",
      status: modelSecretManagementPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelSecretManagementPolicy.status === "ready"
          ? "模型凭证密钥管理、轮换、服务端访问和前端排除控制已确认。"
          : "模型凭证密钥管理、轮换、服务端访问或前端排除控制尚未确认。",
    },
    {
      id: "sourceGrounding",
      status: modelSourceGroundingPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelSourceGroundingPolicy.status === "ready"
          ? "模型来源覆盖和信息不足处理规则已确认。"
          : "模型来源覆盖、引用归因或信息不足处理规则尚未确认。",
    },
    {
      id: "promptInjectionDefense",
      status: modelPromptInjectionDefensePolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelPromptInjectionDefensePolicy.status === "ready"
          ? "来源文本净化、指令剥离、来源角色隔离和污染隔离已确认。"
          : "来源文本净化、指令剥离、来源角色隔离或污染隔离尚未确认。",
    },
    {
      id: "dataMinimization",
      status: modelDataMinimizationPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelDataMinimizationPolicy.status === "ready"
          ? "模型输入字段白名单、持仓分桶、凭证排除和脱敏审计已确认。"
          : "模型输入字段白名单、持仓分桶、凭证排除或脱敏审计尚未确认。",
    },
    {
      id: "factorInputs",
      status: modelFactorInputPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelFactorInputPolicy.status === "ready"
          ? "六因子输入覆盖、新鲜度和缺失项标注已确认。"
          : "六因子输入覆盖、新鲜度或缺失项标注尚未确认。",
    },
    {
      id: "factorWeights",
      status: modelFactorWeightPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelFactorWeightPolicy.status === "ready"
          ? "六因子权重版本和人工变更审批已确认。"
          : "六因子权重版本或人工变更审批尚未确认。",
    },
    {
      id: "citationEvidence",
      status: modelCitationEvidencePolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelCitationEvidencePolicy.status === "ready"
          ? "模型结论引用证据包、claim-citation 映射和新鲜度提示已确认。"
          : "模型结论引用证据包、claim-citation 映射或新鲜度提示尚未确认。",
    },
    {
      id: "modelEvaluation",
      status: modelEvalPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelEvalPolicy.status === "ready"
          ? "模型离线评测、红队用例、回归阈值和上线后监控已确认。"
          : "模型离线评测、红队用例、回归阈值或上线后监控尚未确认。",
    },
    {
      id: "humanReview",
      status: modelHumanReviewPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelHumanReviewPolicy.status === "ready"
          ? "低置信和异常模型输出的人工复核队列、升级手册和回退策略已确认。"
          : "低置信和异常模型输出的人工复核队列、升级手册或回退策略尚未确认。",
    },
    {
      id: "modelRelease",
      status: modelReleasePolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelReleasePolicy.status === "ready"
          ? "模型/提示词发布灰度、版本锁、回滚开关和审批流程已确认。"
          : "模型/提示词发布灰度、版本锁、回滚开关或审批流程尚未确认。",
    },
    {
      id: "runtimeMonitoring",
      status: modelRuntimeMonitoringPolicy.status === "ready" ? "pass" : "blocked",
      message:
        modelRuntimeMonitoringPolicy.status === "ready"
          ? "模型上线运行监控、漂移检测、告警和用户反馈闭环已确认。"
          : "模型上线运行监控、漂移检测、告警或用户反馈闭环尚未确认。",
    },
    {
      id: "complianceReview",
      status: config.complianceReviewed ? "pass" : "blocked",
      message: config.complianceReviewed ? "AI 投资分析合规文案已复核。" : "AI 投资分析合规文案尚未复核。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "ai-provider-compliance-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-live-model",
    canCallLiveModel: blockedReasons.length === 0,
    checks,
    blockedReasons,
    budgetPolicy: modelBudgetPolicy,
    secretManagementPolicy: modelSecretManagementPolicy,
    sourceGroundingPolicy: modelSourceGroundingPolicy,
    promptInjectionDefensePolicy: modelPromptInjectionDefensePolicy,
    dataMinimizationPolicy: modelDataMinimizationPolicy,
    auditPolicy: modelAuditPolicy,
    responseValidationPolicy: modelResponseValidationPolicy,
    factorInputPolicy: modelFactorInputPolicy,
    factorWeightPolicy: modelFactorWeightPolicy,
    citationEvidencePolicy: modelCitationEvidencePolicy,
    modelEvaluationPolicy: modelEvalPolicy,
    humanReviewPolicy: modelHumanReviewPolicy,
    releasePolicy: modelReleasePolicy,
    runtimeMonitoringPolicy: modelRuntimeMonitoringPolicy,
    disclaimer:
      "真实 AI 模型调用必须先通过 provider 配置、结构化输出、输出校验、免责声明、审计留存、成本限流、来源覆盖、模型评测、人工复核、发布控制、运行监控和合规复核门禁。",
  };
}

function modelCallPreflightPlan(config, gate) {
  const modelAuditPolicy = auditPolicy(config);
  const modelSecretManagementPolicy = secretManagementPolicy(config);
  return {
    id: "ai-model-call-preflight-plan",
    mode: "dry-run-no-model-call",
    status: gate.canCallLiveModel ? "ready-for-manual-smoke" : "blocked",
    canExecuteLiveCall: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks: gate.checks.map((check) => ({
      id: check.id,
      status: check.status,
    })),
    auditEnvelope: {
      schemaVersion: "ai-audit-envelope-v1",
      sink: modelAuditPolicy.sink,
      allowedFields: modelAuditPolicy.allowedEnvelopeFields,
      forbiddenFields: modelAuditPolicy.forbiddenEnvelopeFields,
      redactBeforeWrite: modelAuditPolicy.redactBeforeWrite,
      hashChainRequired: modelAuditPolicy.hashChainRequired,
    },
    requestEnvelope: {
      requiredFields: [
        "symbol",
        "market",
        "riskProfile",
        "sourceRefs",
        "sourceSanitizationReport",
        "unsafeSourceFlags",
        "privacyMinimizationReport",
        "redactedPortfolioContext",
        "factorCoverage",
        "citationPackage",
        "claimCitationMap",
        "factorWeightVersion",
        "portfolioContext",
        "promptVersion",
      ],
      forbiddenFields: [
        "apiKey",
        "modelApiKey",
        "providerSecret",
        "clientSecret",
        "rawPersonalData",
        "email",
        "phone",
        "brokerAccount",
        "brokerCredentials",
        "tradingPassword",
        "governmentId",
        "rawPortfolioNotes",
      ],
      schemaValidationRequired: true,
      responseValidationRequired: true,
      secretManagementRequired: true,
      sourceGroundingRequired: true,
      promptInjectionDefenseRequired: true,
      dataMinimizationRequired: true,
      citationPackageRequired: true,
      factorCoverageRequired: true,
    },
    secretHandling: {
      secretManager: modelSecretManagementPolicy.secretManager,
      serverSideOnly: true,
      frontendExposureForbidden: true,
      rotationCadenceDays: modelSecretManagementPolicy.rotationCadenceDays,
      forbiddenLocations: modelSecretManagementPolicy.forbiddenSecretLocations,
      requiredControls: modelSecretManagementPolicy.requiredControls,
    },
    rollback: {
      fallbackMode: "empty-no-fixture-no-advice",
      disableFlag: "FINANCE_AI_MODEL_RUNTIME=inactive",
      userVisibleFallbackRequired: true,
    },
    disclaimer:
      "这是模型调用预检计划，不会请求真实模型；生产执行前必须经过人工审批、审计接收端验证和 smoke test。",
  };
}

function modelProviderSetupGuide(config) {
  const primaryRuntimeReady =
    config.configured &&
    config.supported &&
    config.allowNetwork &&
    config.runtimeMode !== "inactive";
  const fallbackRuntimeReady = (Array.isArray(config.fallbackProviders)
    ? config.fallbackProviders
    : [config.fallbackProvider]
  ).some(
    (provider) =>
      provider?.configured &&
      provider?.supported &&
      provider?.allowNetwork &&
      config.runtimeMode !== "inactive",
  );
  const localRuntimeReady = primaryRuntimeReady || fallbackRuntimeReady;
  const setupGroups = [
    {
      id: "modelProvider",
      label: "模型 Provider",
      preferredProviderIds: supportedProviderIds,
      requiredEnvVars: [
        "FINANCE_AI_MODEL_PROVIDER",
        "FINANCE_AI_MODEL_API_KEY",
        "FINANCE_AI_MODEL_ID",
      ],
      optionalEnvVars: [
        "FINANCE_AI_MODEL_BASE_URL",
        "FINANCE_AI_MODEL_ALLOW_NETWORK",
        "FINANCE_AI_MODEL_RUNTIME",
      "FINANCE_AI_MODEL_PROMPT_VERSION",
      "FINANCE_AI_MODEL_MAX_CALLS_PER_MINUTE",
      "FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST",
      "FINANCE_AI_MODEL_API_STYLE",
      ],
      smokeEndpoint: "GET /api/analysis?symbol=MSFT&riskProfile=balanced",
      priority: 1,
    },
    {
      id: "modelSafety",
      label: "模型安全门禁",
      preferredProviderIds: ["hosted-llm-provider"],
      requiredEnvVars: [
        "FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY",
        "FINANCE_AI_MODEL_SOURCE_COVERAGE_READY",
        "FINANCE_AI_MODEL_CITATION_PACKAGE_READY",
      ],
      optionalEnvVars: [
        "FINANCE_AI_MODEL_PROMPT_INJECTION_DEFENSE_READY",
        "FINANCE_AI_MODEL_DATA_MINIMIZATION_READY",
      ],
      smokeEndpoint: "GET /api/ai-services/provider-adapter",
      priority: 2,
    },
    {
      id: "modelGovernance",
      label: "模型评测与发布",
      preferredProviderIds: ["hosted-llm-provider"],
      requiredEnvVars: [
        "FINANCE_AI_MODEL_EVALUATION_SUITE_READY",
        "FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY",
        "FINANCE_AI_MODEL_RELEASE_APPROVAL_READY",
      ],
      optionalEnvVars: [
        "FINANCE_AI_MODEL_HALLUCINATION_MONITOR_READY",
        "FINANCE_AI_MODEL_ROLLBACK_SWITCH_READY",
      ],
      smokeEndpoint: "GET /api/project/progress",
      priority: 3,
    },
  ].map((group) => {
    const envReadyByName = {
      FINANCE_AI_MODEL_PROVIDER: Boolean(config.selectedProvider),
      FINANCE_AI_MODEL_API_KEY: !config.missingEnvVars.includes("FINANCE_AI_MODEL_API_KEY"),
      FINANCE_AI_MODEL_ID: Boolean(config.selectedModel),
      FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY: config.responseValidatorReady,
      FINANCE_AI_MODEL_SOURCE_COVERAGE_READY: config.sourceCoverageReady,
      FINANCE_AI_MODEL_CITATION_PACKAGE_READY: config.citationPackageReady,
      FINANCE_AI_MODEL_EVALUATION_SUITE_READY: config.evaluationSuiteReady,
      FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY: config.humanReviewQueueReady,
      FINANCE_AI_MODEL_RELEASE_APPROVAL_READY: config.releaseApprovalReady,
    };
    const configuredRequiredEnvVars = group.requiredEnvVars.filter(
      (name) => envReadyByName[name],
    );
    const missingEnvVars = group.requiredEnvVars.filter((name) => {
      return !envReadyByName[name];
    });
    const requiredReady =
      group.id === "modelProvider"
        ? config.configured && config.supported
        : group.id === "modelSafety"
          ? config.responseValidatorReady &&
            config.sourceCoverageReady &&
            config.citationPackageReady
          : config.evaluationSuiteReady &&
            config.humanReviewQueueReady &&
            config.releaseApprovalReady;

    return {
      ...group,
      selectedProvider: group.id === "modelProvider" ? config.selectedProvider : "",
      selectedModel: group.id === "modelProvider" ? config.selectedModel : "",
      status: requiredReady ? "ready-for-smoke" : config.configured ? "partial-config" : "missing-config",
      configuredRequiredEnvVars:
        group.id === "modelProvider"
          ? group.requiredEnvVars.filter((name) => !config.missingEnvVars.includes(name))
          : configuredRequiredEnvVars,
      missingEnvVars,
      secretHandling: "model-api-key-server-side-redacted",
      forbiddenFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText"],
    };
  });
  const smokeOrder = [
    "providerCredentialPreflight",
    "structuredSchemaValidation",
    "sourceGroundingCheck",
    "humanReviewFallback",
    "releaseRollbackGate",
  ];
  const checklistItems = [
    {
      id: "modelProviderSetupGuideDefined",
      label: "模型 Provider 配置向导",
      status: "pass",
      evidence: "模型 provider、模型安全、评测发布三组配置已定义。",
    },
    {
      id: "modelProviderSmokeOrderDefined",
      label: "模型 smoke 顺序",
      status: "pass",
      evidence: "模型凭证预检、结构化 schema、来源引用、人工复核和回滚门禁顺序已定义。",
    },
    {
      id: "modelProviderEnvReady",
      label: "模型环境变量已填写",
      status: config.configured && config.supported ? "pass" : "blocked",
      evidence:
        config.configured && config.supported
          ? "模型 provider、模型 id 和凭证引用已配置。"
          : "仍需填写模型 provider、模型 id 和服务端凭证引用。",
    },
  ];

  return {
    id: "ai-model-provider-setup-guide",
    status: config.configured && config.supported ? "partial-model-configuration" : "ready-for-user-configuration",
    mode: "no-secret-model-provider-setup-guide",
    activeRuntimeMode: localRuntimeReady ? config.runtimeMode : "inactive",
    setupGroups,
    smokeOrder,
    checklistItems,
    passedCount: checklistItems.filter((item) => item.status === "pass").length,
    totalCount: checklistItems.length,
    requiredManualActions: [
      "把模型 API key 只放入服务端密钥管理或本地环境变量，不写入代码、浏览器或测试样例。",
      "先验证结构化 JSON、引用证据、禁止收益承诺、成本限流和失败回退。",
      "完成评测、人工复核、法律合规和回滚演练后，才允许考虑真实模型 runtime。",
    ],
    forbiddenAuditFields: [
      "modelApiKey",
      "rawPrompt",
      "rawModelResponse",
      "rawSourceText",
      "rawPortfolioNotes",
      "personalContact",
    ],
    canReadModelSecrets: false,
    canWriteEnvFile: false,
    canCallLiveModel: localRuntimeReady,
    canEnableLiveRuntime: localRuntimeReady,
    disclaimer:
      localRuntimeReady
        ? "该配置向导显示本机真实模型 smoke/runtime 已具备调用条件；模型密钥仍只在服务端运行时读取，不会返回给前端或写入审计。"
        : "该配置向导只说明真实模型 provider 接入步骤和安全边界；不会读取、保存、显示模型密钥，也不会执行真实模型调用或发布投资建议。",
  };
}

export function createAiProviderAdapter({ env = process.env } = {}) {
  const config = readConfig(env);
  const providerCooldowns = new Map();
  const gate = complianceGate(config);
  const canCallPrimaryModel =
    config.configured &&
    config.supported &&
    config.allowNetwork &&
    config.runtimeMode !== "inactive";
  const callableFallbackProviders = (Array.isArray(config.fallbackProviders)
    ? config.fallbackProviders
    : [config.fallbackProvider]
  ).filter(
    (provider) =>
      provider?.configured &&
      provider?.supported &&
      provider?.allowNetwork &&
      config.runtimeMode !== "inactive",
  );
  const canCallFallbackModel = callableFallbackProviders.length > 0;
  const canCallLiveModel = canCallPrimaryModel || canCallFallbackModel;
  const modelEvalEvidencePackage = modelEvaluationEvidencePackage();
  const modelReleaseRollbackPackage = modelReleaseRollbackEvidencePackage();
  const modelDataSourceEvidencePackage = dataSourceEvidencePackage();
  const modelFactorCoverageEvidencePackage = factorCoverageEvidencePackage();
  const modelDataFreshnessFallbackEvidencePackage = dataFreshnessFallbackEvidencePackage();
  const modelTimeoutFallback = modelTimeoutFallbackPolicy(config);
  const blockedReasons = [];
  if (!config.configured) {
    blockedReasons.push("AI provider、API key 或模型 id 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`AI provider 未注册：${config.selectedProvider}。`);
  }
  blockedReasons.push(...gate.blockedReasons.filter((reason) => !blockedReasons.includes(reason)));
  const status = canCallLiveModel
    ? "ready-for-local-real-model"
    : blockedReasons.length
      ? "blocked"
      : "ready-for-implementation";

  return {
    id: "ai-provider-adapter",
    name: canCallLiveModel ? "AI Provider Adapter" : "AI Provider Adapter Skeleton",
    status,
    runtimeMode: canCallLiveModel ? config.runtimeMode : "inactive",
    selectedProvider: config.selectedProvider,
    selectedModel: config.selectedModel,
    baseUrlStatus: config.configured ? "configured-redacted" : "unconfigured",
    apiStyle: config.apiStyle,
    recommendedModelId: config.recommendedModelId,
    freeModelProviderPreset: {
      id: "gemini-free",
      label: "Google Gemini 2.5 Flash 免费备用",
      provider: "openai-compatible",
      modelId: defaultReliableModelId,
      baseUrlStatus: "runtime-configurable-redacted",
      apiStyle: "chat-completions",
      docsUrl: "https://ai.google.dev/gemini-api/docs/openai",
      requiresUserApiKey: true,
    },
    fallbackModelProvider: {
      id: "gemini-fallback",
      label: "Gemini 备用模型",
      provider: config.fallbackProvider.selectedProvider || "openai-compatible",
      modelId: config.fallbackProvider.selectedModel || defaultReliableModelId,
      baseUrlStatus: config.fallbackProvider.configured ? "configured-redacted" : "unconfigured",
      apiStyle: config.fallbackProvider.apiStyle || "chat-completions",
      configured: config.fallbackProvider.configured,
      supported: config.fallbackProvider.supported,
      missingEnvVars: fallbackMissingEnvVars(config.fallbackProvider, 1),
      allowNetwork: config.fallbackProvider.allowNetwork !== false,
      runtimeReady: config.runtimeMode !== "inactive",
      setupStatus: fallbackSetupStatus(config.fallbackProvider, 1, config.runtimeMode),
      canCallLiveModel:
        config.fallbackProvider.configured &&
        config.fallbackProvider.supported &&
        config.fallbackProvider.allowNetwork &&
        config.runtimeMode !== "inactive",
    },
    fallbackModelProviders: (Array.isArray(config.fallbackProviders)
      ? config.fallbackProviders
      : [config.fallbackProvider]
    ).map((provider, index) => {
      const slotIndex = index + 1;
      const missingEnvVars = fallbackMissingEnvVars(provider, slotIndex);
      return {
        id: provider.slot || (index === 0 ? "fallback" : `fallback${slotIndex}`),
        label: provider.label || `备用模型 ${slotIndex}`,
        provider: provider.selectedProvider || "openai-compatible",
        modelId: provider.selectedModel || (index === 0 ? defaultReliableModelId : ""),
        baseUrlStatus: provider.configured ? "configured-redacted" : "unconfigured",
        apiStyle: provider.apiStyle || "chat-completions",
        configured: provider.configured === true,
        supported: provider.supported !== false,
        missingEnvVars,
        allowNetwork: provider.allowNetwork !== false,
        runtimeReady: config.runtimeMode !== "inactive",
        setupStatus: fallbackSetupStatus(provider, slotIndex, config.runtimeMode),
        canCallLiveModel:
          provider.configured === true &&
          provider.supported !== false &&
          provider.allowNetwork !== false &&
          config.runtimeMode !== "inactive",
      };
    }),
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    networkEnabled: config.allowNetwork,
    canCallLiveModel,
    promptContract: promptContract(config),
    responseSchema: responseSchema(),
    auditPolicy: auditPolicy(config),
    responseValidationPolicy: responseValidationPolicy(config),
    budgetPolicy: budgetPolicy(config),
    secretManagementPolicy: secretManagementPolicy(config),
    sourceGroundingPolicy: sourceGroundingPolicy(config),
    promptInjectionDefensePolicy: promptInjectionDefensePolicy(config),
    dataMinimizationPolicy: dataMinimizationPolicy(config),
    factorInputPolicy: factorInputPolicy(config),
    factorWeightPolicy: factorWeightPolicy(config),
    citationEvidencePolicy: citationEvidencePolicy(config),
    modelEvaluationPolicy: modelEvaluationPolicy(config),
    modelEvaluationEvidencePackage: modelEvalEvidencePackage,
    dataSourceEvidencePackage: modelDataSourceEvidencePackage,
    factorCoverageEvidencePackage: modelFactorCoverageEvidencePackage,
    dataFreshnessFallbackEvidencePackage: modelDataFreshnessFallbackEvidencePackage,
    humanReviewPolicy: humanReviewPolicy(config),
    releasePolicy: releasePolicy(config),
    modelReleaseRollbackEvidencePackage: modelReleaseRollbackPackage,
    modelTimeoutFallbackPolicy: modelTimeoutFallback,
    runtimeMonitoringPolicy: runtimeMonitoringPolicy(config),
    complianceGate: gate,
    modelCallPreflightPlan: modelCallPreflightPlan(config, gate),
    modelProviderSetupGuide: modelProviderSetupGuide(config),
    endpointContracts: endpointContracts(),
    missingEnvVars: config.missingEnvVars,
    safety: {
      noVendorNetworkCalls: !canCallLiveModel,
      noTradingActions: true,
      requiresAuditLog: true,
      requiresResponseValidation: true,
      requiresCostControls: true,
      requiresSecretManagement: true,
      requiresSourceGrounding: true,
      requiresPromptInjectionDefense: true,
      requiresDataMinimization: true,
      requiresFactorCoverage: true,
      requiresVersionedFactorWeights: true,
      requiresCitationEvidence: true,
      requiresModelEvaluation: true,
      requiresHumanReviewPolicy: true,
      requiresReleaseControls: true,
      requiresRuntimeMonitoring: true,
      forbidsGuaranteedReturns: true,
      mockFallbackActive: false,
      emptyOnModelFailure: true,
    },
    blockedReasons,
    nextSteps: [
      "选择已注册 AI provider，并把模型 id、API key 和审计配置放入安全环境变量。",
      "实现 generateStructuredAnalysis，同时强制结构化 JSON schema、免责声明和来源引用。",
      "把模型请求与响应写入脱敏审计日志，并保留 provider latency、model id、prompt version 和合规门禁状态。",
      "配置模型输出校验器、概率边界、禁用承诺表达过滤和失败回退，校验失败不能展示为建议。",
      "配置模型成本预算、每用户限流、token 上限和来源覆盖率门禁，来源不足时必须输出信息不足。",
      "配置 AI provider 密钥管理、轮换、最小权限和前端排除控制，真实模型密钥只能由服务端密钥管理读取。",
      "配置来源文本净化、提示词注入检测和不安全来源隔离，新闻或社交文本只能作为证据，不能作为模型指令。",
      "配置 AI 请求个人数据最小化、持仓字段分桶和预请求脱敏，真实模型不得接收联系方式、券商凭证、身份编号或原始持仓备注。",
      "配置六因子输入覆盖和权重版本门禁，因子缺失时必须降低置信度或输出信息不足。",
      "配置引用证据包和 claim-citation 映射，关键结论必须能追溯到新闻、公告、公开言论、行情或宏观来源。",
      "配置模型离线评测、红队用例、回归阈值和上线后抽样监控，错误建议必须进入人工复核。",
      "配置人工复核队列、低置信阈值和升级手册，异常输出必须回退或进入人工处理。",
      "配置模型/提示词灰度发布、版本锁和回滚开关，任何建议逻辑变化都必须可追踪可回退。",
      "配置上线运行监控、漂移检测、告警和值班手册，异常指标必须进入人工复核或回滚流程。",
      "通过合规复核和 smoke test 后，才允许把 runtimeMode 从 inactive 切换为 live。",
    ],
    disclaimer:
      canCallLiveModel
        ? "当前允许本机真实模型 smoke/runtime 调用；输出必须通过结构化 JSON、禁用承诺表达和免责声明校验，失败时保持空白，不构成投资建议或收益承诺。"
        : "当前为 AI provider adapter 骨架，不会请求真实模型；规则样例仅用于 contract 测试，严格真实数据模式不会把它展示为个股 AI 分析。真实模型未来必须通过引用证据包门禁，不构成投资建议或收益承诺。",
    async generateStructuredAnalysis(input = {}) {
      if (!canCallLiveModel) {
        return {
          status: "not-configured",
          error: {
            code: "REAL_AI_MODEL_NOT_CONFIGURED",
            message: "真实 AI 模型 provider、模型 id、key、网络开关或 runtime 尚未配置；本次保持空白。",
          },
        };
      }
      if (canCallPrimaryModel && config.selectedProvider !== "openai-compatible") {
        return {
          status: "provider-error",
          error: {
            code: "REAL_AI_MODEL_PROVIDER_UNSUPPORTED_RUNTIME",
            message: `当前 provider ${config.selectedProvider} 尚未实现真实调用；本次保持空白。`,
          },
        };
      }
      const primaryResult = canCallPrimaryModel
        ? await callProviderWithCooldown(input, config, providerCooldowns)
        : {
            status: "provider-error",
            error: {
              code: "REAL_AI_MODEL_NOT_CONFIGURED",
              message: "主模型 provider、模型 id、key、网络开关或 runtime 尚未完整配置；本次跳过主模型。",
            },
          };
      if (primaryResult.status === "ok") {
        return {
          ...primaryResult,
          providerRelay: {
            attempted: [config.selectedModel],
            used: config.selectedModel,
            fallbackUsed: false,
            attempts: [
              {
                role: "主模型",
                model: config.selectedModel,
                code: "",
                callStatus: "调用成功",
                outputStatus: "完整 AI 输出可用",
                validationStatus: "校验通过",
                finalReason: "完整 AI 分析已生成",
                retryable: false,
                retryAfterSeconds: 0,
                failedAt: "",
                retryAt: "",
                cooldownStatus: "not-required",
                safetyRepairAttempted: primaryResult.provider?.safetyRepairPrompt === true,
                safetyRepairStatus: primaryResult.provider?.safetyRepairPrompt ? "repair-passed" : "not-required",
                metricRepairAttempted: primaryResult.provider?.metricRepairPrompt === true,
                metricRepairStatus: primaryResult.provider?.metricRepairPrompt ? "repair-passed" : "not-required",
                nextStep: "显示完整 AI 分析。",
              },
            ],
          },
        };
      }
      if (canCallFallbackModel && shouldAttemptFallback(primaryResult.error)) {
        const attempted = [config.selectedModel];
        const primaryAttempt = createRelayAttempt({
          role: "主模型",
          model: config.selectedModel,
          error: primaryResult.error,
        });
        const fallbackErrors = [];
        const attempts = [primaryAttempt];
        let lastResult = primaryResult;
        for (const fallbackProvider of callableFallbackProviders) {
          const fallbackConfig = fallbackConfigFromPrimary(config, fallbackProvider);
          attempted.push(fallbackConfig.selectedModel);
          const fallbackResult = await callProviderWithCooldown(input, fallbackConfig, providerCooldowns);
          if (fallbackResult.status === "ok") {
            return {
              ...fallbackResult,
              providerRelay: {
                attempted,
                used: fallbackConfig.selectedModel,
                fallbackUsed: true,
                primaryErrorCode: primaryResult.error?.code || "",
                fallbackErrorCodes: fallbackErrors,
                attempts: [
                  ...attempts,
                  {
                    role: `备用 ${attempts.length}`,
                    model: fallbackConfig.selectedModel,
                    code: "",
                    callStatus: "调用成功",
                    outputStatus: "完整 AI 输出可用",
                    validationStatus: "校验通过",
                    finalReason: "完整 AI 分析已生成",
                    retryable: false,
                    retryAfterSeconds: 0,
                    failedAt: "",
                    retryAt: "",
                    cooldownStatus: "not-required",
                    safetyRepairAttempted: fallbackResult.provider?.safetyRepairPrompt === true,
                    safetyRepairStatus: fallbackResult.provider?.safetyRepairPrompt ? "repair-passed" : "not-required",
                    metricRepairAttempted: fallbackResult.provider?.metricRepairPrompt === true,
                    metricRepairStatus: fallbackResult.provider?.metricRepairPrompt ? "repair-passed" : "not-required",
                    nextStep: "显示完整 AI 分析。",
                  },
                ],
              },
            };
          }
          const fallbackAttempt = createRelayAttempt({
            role: `备用 ${attempts.length}`,
            model: fallbackConfig.selectedModel,
            error: fallbackResult.error,
          });
          fallbackErrors.push({
            model: fallbackConfig.selectedModel,
            code: fallbackResult.error?.code || "",
            message: fallbackResult.error?.message || "",
            callStatus: fallbackAttempt.callStatus,
            outputStatus: fallbackAttempt.outputStatus,
            validationStatus: fallbackAttempt.validationStatus,
            finalReason: fallbackAttempt.finalReason,
            retryable: fallbackAttempt.retryable,
            retryAfterSeconds: fallbackAttempt.retryAfterSeconds,
            failedAt: fallbackAttempt.failedAt,
            retryAt: fallbackAttempt.retryAt,
            cooldownStatus: fallbackAttempt.cooldownStatus,
            safetyRepairAttempted: fallbackAttempt.safetyRepairAttempted,
            safetyRepairStatus: fallbackAttempt.safetyRepairStatus,
            metricRepairAttempted: fallbackAttempt.metricRepairAttempted,
            metricRepairStatus: fallbackAttempt.metricRepairStatus,
            nextStep: fallbackAttempt.nextStep,
          });
          attempts.push(fallbackAttempt);
          lastResult = fallbackResult;
          if (!shouldAttemptFallback(fallbackResult.error)) break;
        }
        return {
          ...lastResult,
          providerRelay: {
            attempted,
            used: "",
            fallbackUsed: attempted.length > 1,
            primaryErrorCode: primaryResult.error?.code || "",
            fallbackErrorCode: fallbackErrors[fallbackErrors.length - 1]?.code || "",
            fallbackErrorCodes: fallbackErrors,
            attempts,
          },
        };
      }
      return {
        ...primaryResult,
        providerRelay: {
          attempted: [config.selectedModel],
          used: "",
          fallbackUsed: false,
          fallbackReady: canCallFallbackModel,
          attempts: [
            createRelayAttempt({
              role: "主模型",
              model: config.selectedModel,
              error: primaryResult.error,
            }),
          ],
        },
      };
    },
  };
}
