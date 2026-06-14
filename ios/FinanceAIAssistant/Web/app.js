const stocks = [
  {
    code: "600519",
    name: "贵州茅台",
    market: "a",
    impact: "偏利好",
    impactTone: "positive",
    upside: 64,
    downside: 36,
    sentiment: 72,
    valuation: 58,
    technical: 66,
    samplePrice: 1488,
    history: [
      { label: "1月", price: 1418 },
      { label: "2月", price: 1436 },
      { label: "3月", price: 1452 },
      { label: "4月", price: 1461 },
      { label: "5月", price: 1474 },
      { label: "6月", price: 1488 },
    ],
    historySource: {
      label: "本机样例行情",
      frequency: "月度样例",
      updatedAt: "2026-06-01",
    },
    action: "谨慎持有，等待成交量确认后再考虑加仓。",
    reasons: [
      "消费板块情绪回暖，龙头公司更容易获得资金关注。",
      "基本面仍具稳定性，但估值修复空间需要结合业绩增速确认。",
      "技术面短期偏强，若成交量继续放大，趋势确认度会提高。",
    ],
    risk: "若宏观消费数据弱于预期，或高端白酒需求恢复不及预期，短期估值可能继续承压。",
  },
  {
    code: "0700",
    name: "腾讯控股",
    market: "hk",
    impact: "偏利好",
    impactTone: "positive",
    upside: 61,
    downside: 39,
    sentiment: 69,
    valuation: 63,
    technical: 59,
    samplePrice: 386,
    history: [
      { label: "1月", price: 360 },
      { label: "2月", price: 368 },
      { label: "3月", price: 364 },
      { label: "4月", price: 375 },
      { label: "5月", price: 381 },
      { label: "6月", price: 386 },
    ],
    historySource: {
      label: "本机样例行情",
      frequency: "月度样例",
      updatedAt: "2026-06-01",
    },
    action: "适合继续观察，若回调后情绪未转弱，可关注分批机会。",
    reasons: [
      "互联网平台监管预期趋稳，有助于市场重新评估盈利质量。",
      "游戏、广告和金融科技业务改善会影响中期估值弹性。",
      "港股整体流动性仍是关键变量，需观察南向资金变化。",
    ],
    risk: "若港股市场风险偏好下降，或核心业务增长低于预期，股价可能出现较大波动。",
  },
  {
    code: "AAPL",
    name: "Apple",
    market: "us",
    impact: "中性偏多",
    impactTone: "neutral",
    upside: 57,
    downside: 43,
    sentiment: 65,
    valuation: 52,
    technical: 61,
    samplePrice: 196,
    history: [
      { label: "1月", price: 184 },
      { label: "2月", price: 181 },
      { label: "3月", price: 188 },
      { label: "4月", price: 190 },
      { label: "5月", price: 193 },
      { label: "6月", price: 196 },
    ],
    historySource: {
      label: "本机样例行情",
      frequency: "月度样例",
      updatedAt: "2026-06-01",
    },
    action: "偏向持有观察，等待新品周期和业绩指引进一步确认。",
    reasons: [
      "硬件需求、服务收入和 AI 设备叙事共同影响市场预期。",
      "公司现金流稳健，但估值处于较高区间时需要业绩支撑。",
      "技术面保持韧性，但突破需要新的成交量配合。",
    ],
    risk: "如果新品需求低于预期，或美股整体估值压缩，短期上涨空间可能受限。",
  },
];

const newsByMarket = {
  a: [
    {
      title: "政策继续强调扩大内需，消费与高股息板块受到关注",
      source: "宏观政策",
      impact: "重要性 82/100",
    },
    {
      title: "部分龙头公司披露回购和分红计划，稳定预期增强",
      source: "公司公告",
      impact: "重要性 76/100",
    },
    {
      title: "人民币汇率波动收窄，外资风险偏好小幅修复",
      source: "市场资金",
      impact: "重要性 68/100",
    },
  ],
  hk: [
    {
      title: "南向资金继续流入互联网与高股息资产",
      source: "市场资金",
      impact: "重要性 79/100",
    },
    {
      title: "港股成交额回升，市场关注大型科技股业绩弹性",
      source: "市场情绪",
      impact: "重要性 73/100",
    },
    {
      title: "地产链政策预期改善，但基本面修复仍待验证",
      source: "行业新闻",
      impact: "重要性 66/100",
    },
  ],
  us: [
    {
      title: "美联储官员讲话影响降息预期，成长股波动加大",
      source: "政府高层言论",
      impact: "重要性 84/100",
    },
    {
      title: "大型科技公司继续加码 AI 基础设施投资",
      source: "CEO / 公司动态",
      impact: "重要性 81/100",
    },
    {
      title: "市场等待通胀数据，短期风险偏好保持谨慎",
      source: "宏观数据",
      impact: "重要性 74/100",
    },
  ],
};

const terms = {
  marketSentiment: {
    title: "市场情绪",
    body: "市场情绪是投资者整体偏乐观还是偏谨慎的参考。它通常来自新闻、资金流、涨跌比例和成交活跃度等信号。",
  },
  sentiment: {
    title: "市场情绪",
    body: "市场情绪是投资者整体偏乐观还是偏谨慎的参考。它通常来自新闻、资金流、涨跌比例和成交活跃度等信号。",
  },
  valuation: {
    title: "估值吸引力",
    body: "估值吸引力用于判断当前价格是否相对合理。分数越高，代表模型认为价格相对盈利、成长或资产质量更有吸引力。",
  },
  technical: {
    title: "技术面强弱",
    body: "技术面强弱主要看价格趋势、成交量、均线和突破情况。它适合辅助判断短期节奏，但不能单独决定买卖。",
  },
  macro: {
    title: "宏观经济",
    body: "宏观经济关注利率、汇率、通胀、政策和流动性等大环境。它会影响整个市场的风险偏好和估值水平。",
  },
  industry: {
    title: "行业分析",
    body: "行业分析关注行业景气度、竞争格局、政策环境和需求变化，用来判断公司所处赛道是否有顺风或压力。",
  },
  fundamentals: {
    title: "公司基本盘",
    body: "公司基本盘关注收入、利润、现金流、资产负债、管理层和竞争优势，是判断长期质量的重要部分。",
  },
  factorBreakdown: {
    title: "因子拆解",
    body: "因子拆解把模型参考结论拆成宏观、行业、基本盘、估值、技术和情绪等部分，方便你看到结论主要来自哪里。",
  },
  tradePlan: {
    title: "操作边界",
    body: "操作边界把模型参考结论转成观察区间、触发位、止损位和止盈观察位。它不是买卖指令，也不代表收益保证。",
  },
  scenarioAnalysis: {
    title: "情景分析",
    body: "情景分析把未来走势拆成乐观、基准和悲观三种路径，用概率和目标区间表达不确定性。它不是收益预测或承诺。",
  },
};

const validMarkets = ["a", "hk", "us"];
const validRiskProfiles = ["balanced", "conservative", "aggressive"];
const validReminderTypes = ["priceAbove", "priceBelow", "importantNews"];
const notificationChannelIds = ["inApp", "email", "sms", "wechat", "telegram"];
const defaultApiBaseUrl = "http://localhost:4180";
const providerModeLabels = {
  sample: "样例数据",
  delayed: "延迟数据",
  live: "实时数据",
};
const providerCapabilityLabels = {
  markets: "市场列表",
  stockSearch: "股票搜索",
  marketNews: "市场新闻",
  analysisInputs: "分析输入",
  priceHistory: "历史走势",
  reminderEvaluation: "提醒评估",
  integrationPlan: "真实数据源计划",
  providerRegistry: "Provider 注册表",
  marketDataAdapter: "行情适配器",
  fixtureMarketDataRead: "样例行情读取",
  macroDataAdapter: "宏观数据适配器",
  fixtureMacroDataRead: "样例宏观数据读取",
  marketDataRuntime: "行情运行时",
  newsFilingsAdapter: "新闻公告适配器",
  fixtureNewsIntelligenceRead: "样例新闻情报读取",
  newsIngestionRuntime: "新闻采集运行时",
};
const marketDataRuntimeCapabilityLabels = {
  cacheLookupTelemetry: "缓存查询遥测",
  cacheFreshnessTelemetry: "缓存新鲜度遥测",
  rateLimitTelemetry: "限流遥测",
  rateLimitWindowTelemetry: "限流窗口遥测",
  circuitBreakerTelemetry: "熔断器遥测",
  fallbackTelemetry: "降级遥测",
  auditEventDraftExecution: "审计草案执行",
};
const newsIngestionRuntimeCapabilityLabels = {
  sourcePollingTelemetry: "来源轮询遥测",
  deduplicationTelemetry: "去重遥测",
  attributionGateTelemetry: "署名门禁遥测",
  licenseBoundaryTelemetry: "授权边界遥测",
  publicStatementSafetyTelemetry: "公开言论安全遥测",
};
const aiServiceCapabilityLabels = {
  riskProfileAdjustment: "风险偏好调整",
  quantifiedProbability: "量化概率",
  factorBreakdown: "因子拆解",
  sourceLinkedAnalysis: "来源联动分析",
  quantifiedTradeBoundaries: "量化操作边界",
  scenarioAnalysis: "情景分析",
  complianceDisclaimer: "合规提示",
};
const complianceCapabilityLabels = {
  requiredDisclaimer: "固定免责声明",
  prohibitedClaimFilter: "禁用承诺收益",
  probabilityLabeling: "概率语言标注",
  riskAcknowledgement: "风险确认",
  suitabilityQuestionnaire: "适当性问卷",
  analysisBoundaryAudit: "分析边界审计",
  productionGapReport: "生产缺口报告",
  complianceAcknowledgementRecords: "风险确认记录",
};
const complianceRequirementLabels = {
  legalReviewWorkflow: "法律复核流程",
  jurisdictionPolicy: "地区展示策略",
  suitabilityQuestionnaire: "适当性问卷",
  disclosureVersioning: "披露版本管理",
  licensedAdviserReview: "持牌资质判断",
};
const suitabilityAnswerLabels = {
  riskTolerance: { low: "低", medium: "中", high: "高" },
  investmentExperience: { new: "新手", some: "有一定经验", experienced: "经验较多" },
  investmentHorizon: { short: "短期", medium: "中期", long: "长期" },
  liquidityNeed: { high: "高", medium: "中", low: "低" },
};
const authMethodLabels = {
  demoToken: "样例登录",
  emailPassword: "邮箱密码",
};
const authRoleLabels = {
  sample: "样例用户",
  user: "普通用户",
  auditor: "审计员",
  compliance: "合规员",
  admin: "管理员",
};
const notificationServiceCapabilityLabels = {
  outboxQueue: "投递箱排队",
  readReceipt: "已读状态",
  multiChannelRules: "多渠道规则",
  deliveryAttempts: "投递尝试记录",
  retryQueue: "失败重试",
  channelDeliveryStatus: "渠道状态",
};
const jobRunnerCapabilityLabels = {
  reminderEvaluation: "提醒评估",
  jobRunRecords: "任务记录",
  auditEvents: "审计事件",
  notificationOutbox: "通知投递箱",
  duplicateNotificationSuppression: "重复通知抑制",
};
const schedulerCapabilityLabels = {
  schedulerStatus: "调度状态",
  manualDueCheck: "手动到期检查",
  jobRunnerBridge: "任务运行器桥接",
  auditEvents: "审计事件",
  idempotencyKey: "幂等键",
  cooldownLock: "冷却锁",
  deadLetterQueue: "死信队列",
  deadLetterReplay: "死信重放",
  workerHeartbeat: "Worker 心跳",
  workerSecretAuth: "Worker 凭证",
  workerNonceCleanup: "Nonce 清理",
  queueLagMonitoring: "队列延迟监控",
  enqueueJob: "任务入队",
  retrySchedule: "重试计划",
  queueAlerts: "队列告警",
  processQueue: "队列处理",
};
const sourceRefTypeLabels = {
  news: "关键新闻",
  filing: "公司公告",
  statement: "公开言论",
};
const inputCoverageLabels = {
  macro: "宏观",
  industry: "行业",
  fundamentals: "基本盘",
  valuation: "估值",
  technical: "技术",
  sentiment: "情绪",
  news: "新闻",
  filings: "公告",
  publicStatements: "公开言论",
  marketData: "行情",
  portfolio: "持仓",
  compliance: "合规确认",
};
const repositoryCapabilityLabels = {
  watchlist: "自选股",
  preferences: "偏好设置",
  analysisHistory: "分析历史",
  newsIntelligence: "新闻情报",
  newsIntelligenceAuditTrail: "新闻情报审计链",
  reminders: "提醒规则",
  portfolio: "持仓记录",
  notificationOutbox: "通知投递箱",
  auditLog: "审计日志",
  auditRedaction: "审计脱敏",
  auditRetention: "审计保留",
  auditRetentionPurge: "审计保留清理",
  auditExportPackage: "审计证据包",
  auditExportSigningPolicy: "审计签名策略",
  auditExportArchiveReceipt: "审计归档回执",
  auditHashChain: "审计 Hash 链",
  jobRuns: "任务记录",
  complianceAcknowledgements: "风险确认记录",
  complianceAcknowledgementAuditTrail: "风险确认审计链",
};
const databaseCapabilityLabels = {
  schemaPlan: "表结构规划",
  repositoryBridge: "仓储桥接",
  repositoryContract: "仓储接口契约",
  migrationChecks: "迁移检查",
  tableMappings: "表映射",
  productionAdapter: "生产适配器",
  adapterHealth: "适配器健康",
  migrationPlan: "迁移计划",
  migrationDryRun: "迁移预演",
  migrationSqlDraft: "SQL 草案",
  migrationPackage: "迁移包",
  readOnlyConnectionHealth: "只读连接检查",
  driverSetupPlan: "驱动接入计划",
  repositoryAdapterPlan: "仓储切换计划",
  repositoryRuntimeGuard: "仓储运行时保护器",
  productionRepositoryAdapter: "生产仓储适配器骨架",
  productionRepositorySmokeTest: "生产仓储只读冒烟计划",
  productionRepositorySqlContract: "生产仓储 SQL 契约计划",
  productionRepositoryExecutionPlan: "生产仓储执行计划",
  productionRepositoryParameterValidationPlan: "生产仓储参数校验计划",
  productionRepositoryConnectionPoolPlan: "生产仓储连接池计划",
  productionRepositorySqlExecutorPlan: "生产仓储 SQL 执行器计划",
  productionRepositoryResultAuditPlan: "生产仓储结果审计计划",
  productionRepositoryReadRehearsalPlan: "生产仓储只读查询预演计划",
  productionRepositoryParityPlan: "生产仓储双读一致性计划",
  productionRepositoryParityEvidencePlan: "生产仓储双读证据计划",
  productionRepositoryDualWritePlan: "生产仓储双写演练计划",
  productionRepositoryShadowWriteEvidencePlan: "生产仓储影子写证据计划",
  productionRepositoryBackupRestoreEvidencePlan: "生产仓储备份恢复证据计划",
  productionRepositoryCutoverMonitoringEvidencePlan: "生产仓储切换监控证据计划",
  productionRepositoryRollbackRehearsalEvidencePlan: "生产仓储回滚演练证据计划",
  productionRepositoryCutoverPlan: "生产仓储切换门禁计划",
  jsonBridge: "JSON 桥接",
  productionGapReport: "生产缺口报告",
};
const databaseRequirementLabels = {
  accessControl: "权限控制",
  encryptionAtRest: "静态加密",
  backupRestore: "备份恢复",
  schemaMigrations: "结构迁移",
  retentionPolicy: "保留策略",
  auditRedaction: "审计脱敏",
};
const auditCapabilityLabels = {
  safeMetadata: "敏感元数据脱敏",
  retentionLimit: "数量保留上限",
  retentionPurge: "保留清理",
  auditExportPackage: "审计证据包",
  auditExportSigningPolicy: "审计签名策略",
  auditExportVerification: "审计证据包校验",
  auditExportArchiveReceipt: "审计归档回执",
  auditExportDownloadPackage: "审计下载交接包",
  auditExportReplayPreview: "审计回放预演",
  userScopedAuditLog: "用户范围审计",
  hashChainIntegrity: "Hash 链完整性",
  productionGapReport: "生产缺口报告",
};
const auditRequirementLabels = {
  tamperEvidentStorage: "防篡改存储",
  externalWormArchive: "不可变归档",
  signatureKeyManagement: "签名密钥管理",
  longTermArchive: "长期归档",
  adminReviewWorkflow: "管理员审查流",
  fieldLevelEncryption: "字段级加密",
  automatedRetentionPurge: "自动保留清理",
  signedAuditExports: "签名审计导出",
  immutableArchiveWrite: "不可变归档写入",
  externalVerifierTooling: "外部校验工具",
  auditExportDownloadWorkflow: "审计下载交接流程",
  auditReplayImportWorkflow: "审计回放导入流程",
};
const databaseTableLabels = {
  users: "用户",
  auth_role_grants: "角色授权",
  auth_role_events: "角色事件",
  auth_sessions: "登录会话",
  watchlist_items: "自选股",
  user_preferences: "用户偏好",
  portfolio_positions: "持仓",
  news_items: "新闻",
  analysis_results: "分析记录",
  reminder_rules: "提醒规则",
  notification_outbox: "通知投递箱",
  audit_archive_receipts: "审计归档回执",
  audit_events: "审计事件",
  job_runs: "任务记录",
  queued_jobs: "队列任务",
  dead_letter_jobs: "死信任务",
  worker_heartbeats: "Worker 心跳",
  worker_request_nonces: "Worker 防重放 Nonce",
};
const databaseMigrationCheckLabels = {
  repositoryInterface: "仓储接口",
  tableMappings: "表映射",
  userScopedRecords: "用户隔离记录",
  authRoleGrantPersistence: "角色授权持久化",
  authRoleEventPersistence: "角色事件持久化",
  auditRedaction: "审计脱敏",
  notificationDeliveryState: "通知投递状态",
};
const databaseDryRunStepLabels = {
  validateConnectionConfig: "连接配置",
  validateRepositoryContract: "仓储契约",
  resolveTableOrder: "表顺序",
  previewSchemaMigrations: "结构预演",
  prepareRollbackPlan: "回滚方案",
  keepMockFallbackActive: "保留回退",
};
let activeNewsRequestId = 0;
let activeAnalysisRequestId = 0;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeRiskProfile(value) {
  return validRiskProfiles.includes(value) ? value : "balanced";
}

function sanitizeMarket(value) {
  return validMarkets.includes(value) ? value : "a";
}

function sanitizeApiMode(value) {
  return value === "backend" ? "backend" : "local";
}

function sanitizeProviderIntegrationPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const mode = typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "planning";
  const targetMarkets = Array.isArray(value.targetMarkets)
    ? value.targetMarkets.filter((market) => validMarkets.includes(market))
    : [];
  const configuredRequiredCount = Number.isFinite(Number(value.configuredRequiredCount))
    ? Number(value.configuredRequiredCount)
    : 0;
  const requiredSourceCount = Number.isFinite(Number(value.requiredSourceCount))
    ? Number(value.requiredSourceCount)
    : 0;
  const configuredOptionalCount = Number.isFinite(Number(value.configuredOptionalCount))
    ? Number(value.configuredOptionalCount)
    : 0;
  const plannedSources = Array.isArray(value.plannedSources)
    ? value.plannedSources
        .filter((source) => isPlainObject(source))
        .map((source) => ({
          id: typeof source.id === "string" ? source.id : "",
          label: typeof source.label === "string" ? source.label : "",
          required: source.required === true,
          configured: source.configured === true,
          markets: Array.isArray(source.markets)
            ? source.markets.filter((market) => validMarkets.includes(market))
            : [],
          capabilities: Array.isArray(source.capabilities)
            ? source.capabilities.filter((capability) => typeof capability === "string" && capability.trim())
            : [],
          envVars: Array.isArray(source.envVars)
            ? source.envVars
                .filter((entry) => isPlainObject(entry))
                .map((entry) => ({
                  name: typeof entry.name === "string" ? entry.name : "",
                  configured: entry.configured === true,
                  secret: entry.secret === true,
                }))
                .filter((entry) => entry.name)
            : [],
        }))
        .filter((source) => source.id)
    : [];
  const complianceChecks = Array.isArray(value.complianceChecks)
    ? value.complianceChecks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          label: typeof check.label === "string" ? check.label : "",
          status: typeof check.status === "string" ? check.status : "unknown",
        }))
        .filter((check) => check.id)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    status,
    mode,
    targetMarkets,
    configuredRequiredCount,
    requiredSourceCount,
    configuredOptionalCount,
    plannedSources,
    complianceChecks,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProviderRegistry(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const activeRuntimeProvider =
    typeof value.activeRuntimeProvider === "string" && value.activeRuntimeProvider.trim()
      ? value.activeRuntimeProvider.trim()
      : "";
  const readyRequiredCount = Number.isFinite(Number(value.readyRequiredCount))
    ? Number(value.readyRequiredCount)
    : 0;
  const requiredProviderCount = Number.isFinite(Number(value.requiredProviderCount))
    ? Number(value.requiredProviderCount)
    : 0;
  const candidateProviders = Array.isArray(value.candidateProviders)
    ? value.candidateProviders
        .filter((candidate) => isPlainObject(candidate))
        .map((candidate) => ({
          id: typeof candidate.id === "string" ? candidate.id : "",
          groupId: typeof candidate.groupId === "string" ? candidate.groupId : "",
          label: typeof candidate.label === "string" ? candidate.label : "",
          mode: typeof candidate.mode === "string" ? candidate.mode : "",
          adapterModule: typeof candidate.adapterModule === "string" ? candidate.adapterModule : "",
        }))
        .filter((candidate) => candidate.id)
    : [];
  const selectedProviders = Array.isArray(value.selectedProviders)
    ? value.selectedProviders
        .filter((provider) => isPlainObject(provider))
        .map((provider) => ({
          groupId: typeof provider.groupId === "string" ? provider.groupId : "",
          label: typeof provider.label === "string" ? provider.label : "",
          required: provider.required === true,
          selectedProvider:
            typeof provider.selectedProvider === "string" ? provider.selectedProvider : "",
          providerEnv: typeof provider.providerEnv === "string" ? provider.providerEnv : "",
          credentialEnv: typeof provider.credentialEnv === "string" ? provider.credentialEnv : "",
          configured: provider.configured === true,
          supported: provider.supported !== false,
          status: typeof provider.status === "string" ? provider.status : "unknown",
          candidateIds: Array.isArray(provider.candidateIds)
            ? provider.candidateIds.filter((id) => typeof id === "string")
            : [],
          missingEnvVars: Array.isArray(provider.missingEnvVars)
            ? provider.missingEnvVars.filter((name) => typeof name === "string")
            : [],
        }))
        .filter((provider) => provider.groupId)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    status,
    activeRuntimeProvider,
    readyRequiredCount,
    requiredProviderCount,
    candidateProviders,
    selectedProviders,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeMarketDataPolicyGate(value) {
  if (!isPlainObject(value)) return null;
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          message: typeof check.message === "string" ? check.message : "",
        }))
        .filter((check) => check.id)
    : [];
  return {
    id: typeof value.id === "string" ? value.id : "",
    status:
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim()
        : "unknown",
    requestKind:
      typeof value.requestKind === "string" && value.requestKind.trim()
        ? value.requestKind.trim()
        : "",
    requestedMode:
      typeof value.requestedMode === "string" && value.requestedMode.trim()
        ? value.requestedMode.trim()
        : "",
    runtimeMode:
      typeof value.runtimeMode === "string" && value.runtimeMode.trim()
        ? value.runtimeMode.trim()
        : "",
    selectedProvider:
      typeof value.selectedProvider === "string" && value.selectedProvider.trim()
        ? value.selectedProvider.trim()
        : "",
    canUseProvider: value.canUseProvider === true,
    canUseFixture: value.canUseFixture === true,
    fallback:
      typeof value.fallback === "string" && value.fallback.trim()
        ? value.fallback.trim()
        : "",
    requiredAttributionFields: Array.isArray(value.requiredAttributionFields)
      ? value.requiredAttributionFields.filter((field) => typeof field === "string")
      : [],
    missingAttributionFields: Array.isArray(value.missingAttributionFields)
      ? value.missingAttributionFields.filter((field) => typeof field === "string")
      : [],
    checks,
    blockedReasons: Array.isArray(value.blockedReasons)
      ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
      : [],
  };
}

function sanitizeMarketDataExecutionPlan(value) {
  if (!isPlainObject(value)) return null;
  const cache = isPlainObject(value.cache) ? value.cache : {};
  const rateLimit = isPlainObject(value.rateLimit) ? value.rateLimit : {};
  const fallback = isPlainObject(value.fallback) ? value.fallback : {};
  const auditDraft = isPlainObject(value.auditDraft) ? value.auditDraft : {};
  const metadata = isPlainObject(auditDraft.metadata) ? auditDraft.metadata : {};

  return {
    id: typeof value.id === "string" ? value.id : "",
    status:
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim()
        : "unknown",
    mode:
      typeof value.mode === "string" && value.mode.trim()
        ? value.mode.trim()
        : "",
    requestKind:
      typeof value.requestKind === "string" && value.requestKind.trim()
        ? value.requestKind.trim()
        : "",
    cache: {
      key: typeof cache.key === "string" ? cache.key : "",
      ttlSeconds: Number.isFinite(Number(cache.ttlSeconds)) ? Number(cache.ttlSeconds) : 0,
      maxStaleSeconds: Number.isFinite(Number(cache.maxStaleSeconds))
        ? Number(cache.maxStaleSeconds)
        : 0,
      outcome: typeof cache.outcome === "string" ? cache.outcome : "",
      lookup: typeof cache.lookup === "string" ? cache.lookup : "",
      write: typeof cache.write === "string" ? cache.write : "",
    },
    rateLimit: {
      applies: rateLimit.applies === true,
      maxRequestsPerMinute: Number.isFinite(Number(rateLimit.maxRequestsPerMinute))
        ? Number(rateLimit.maxRequestsPerMinute)
        : 0,
      burstLimit: Number.isFinite(Number(rateLimit.burstLimit))
        ? Number(rateLimit.burstLimit)
        : 0,
      tokenCost: Number.isFinite(Number(rateLimit.tokenCost)) ? Number(rateLimit.tokenCost) : 0,
      outcome: typeof rateLimit.outcome === "string" ? rateLimit.outcome : "",
    },
    fallback: {
      selected: typeof fallback.selected === "string" ? fallback.selected : "",
      reason: typeof fallback.reason === "string" ? fallback.reason : "",
      localSampleAllowed: fallback.localSampleAllowed === true,
    },
    auditDraft: {
      eventType: typeof auditDraft.eventType === "string" ? auditDraft.eventType : "",
      metadata: {
        gateStatus: typeof metadata.gateStatus === "string" ? metadata.gateStatus : "",
        cacheKey: typeof metadata.cacheKey === "string" ? metadata.cacheKey : "",
        fallback: typeof metadata.fallback === "string" ? metadata.fallback : "",
      },
    },
  };
}

function sanitizeMarketDataAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const requestedMode =
    typeof value.requestedMode === "string" && value.requestedMode.trim()
      ? value.requestedMode.trim()
      : "";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canFetchQuotes = value.canFetchQuotes === true;
  const canReadFixtures = value.canReadFixtures === true;
  const fixtureReadModel = isPlainObject(value.fixtureReadModel)
    ? {
        status:
          typeof value.fixtureReadModel.status === "string" && value.fixtureReadModel.status.trim()
            ? value.fixtureReadModel.status.trim()
            : "unknown",
        quoteCount: Number.isFinite(Number(value.fixtureReadModel.quoteCount))
          ? Number(value.fixtureReadModel.quoteCount)
          : 0,
        markets: Array.isArray(value.fixtureReadModel.markets)
          ? value.fixtureReadModel.markets.filter((market) => validMarkets.includes(market))
          : [],
        source:
          typeof value.fixtureReadModel.source === "string" && value.fixtureReadModel.source.trim()
            ? value.fixtureReadModel.source.trim()
            : "",
      }
    : null;
  const supportedProviderIds = Array.isArray(value.supportedProviderIds)
    ? value.supportedProviderIds.filter((id) => typeof id === "string")
    : [];
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
          fixtureStatus:
            typeof contract.fixtureStatus === "string" ? contract.fixtureStatus : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const cachePolicy = isPlainObject(value.cachePolicy)
    ? {
        id: typeof value.cachePolicy.id === "string" ? value.cachePolicy.id : "",
        status:
          typeof value.cachePolicy.status === "string" && value.cachePolicy.status.trim()
            ? value.cachePolicy.status.trim()
            : "unknown",
        quoteTtlSeconds: Number.isFinite(Number(value.cachePolicy.quoteTtlSeconds))
          ? Number(value.cachePolicy.quoteTtlSeconds)
          : 0,
        historyTtlSeconds: Number.isFinite(Number(value.cachePolicy.historyTtlSeconds))
          ? Number(value.cachePolicy.historyTtlSeconds)
          : 0,
        rawRedistribution:
          typeof value.cachePolicy.rawRedistribution === "string" &&
          value.cachePolicy.rawRedistribution.trim()
            ? value.cachePolicy.rawRedistribution.trim()
            : "",
      }
    : null;
  const rateLimitPolicy = isPlainObject(value.rateLimitPolicy)
    ? {
        id: typeof value.rateLimitPolicy.id === "string" ? value.rateLimitPolicy.id : "",
        status:
          typeof value.rateLimitPolicy.status === "string" && value.rateLimitPolicy.status.trim()
            ? value.rateLimitPolicy.status.trim()
            : "unknown",
        maxRequestsPerMinute: Number.isFinite(Number(value.rateLimitPolicy.maxRequestsPerMinute))
          ? Number(value.rateLimitPolicy.maxRequestsPerMinute)
          : 0,
        burstLimit: Number.isFinite(Number(value.rateLimitPolicy.burstLimit))
          ? Number(value.rateLimitPolicy.burstLimit)
          : 0,
        fallback:
          typeof value.rateLimitPolicy.fallback === "string" &&
          value.rateLimitPolicy.fallback.trim()
            ? value.rateLimitPolicy.fallback.trim()
            : "",
      }
    : null;
  const attributionPolicy = isPlainObject(value.attributionPolicy)
    ? {
        id: typeof value.attributionPolicy.id === "string" ? value.attributionPolicy.id : "",
        status:
          typeof value.attributionPolicy.status === "string" &&
          value.attributionPolicy.status.trim()
            ? value.attributionPolicy.status.trim()
            : "unknown",
        requiredFields: Array.isArray(value.attributionPolicy.requiredFields)
          ? value.attributionPolicy.requiredFields.filter((field) => typeof field === "string")
          : [],
        displayRequired: value.attributionPolicy.displayRequired === true,
      }
    : null;
  const requestPolicyGate = sanitizeMarketDataPolicyGate(value.requestPolicyGate);
  const requestExecutionPlan = sanitizeMarketDataExecutionPlan(value.requestExecutionPlan);
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    requestedMode,
    selectedProvider,
    configured,
    supported,
    canFetchQuotes,
    canReadFixtures,
    fixtureReadModel,
    supportedProviderIds,
    missingEnvVars,
    endpointContracts,
    cachePolicy,
    rateLimitPolicy,
    attributionPolicy,
    requestPolicyGate,
    requestExecutionPlan,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeMarketDataRuntimeStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const mode = typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const executionMode =
    typeof value.executionMode === "string" && value.executionMode.trim()
      ? value.executionMode.trim()
      : "unknown";
  const cacheStore =
    typeof value.cacheStore === "string" && value.cacheStore.trim()
      ? value.cacheStore.trim()
      : "unknown";
  const cachePolicy = isPlainObject(value.cachePolicy)
    ? {
        freshnessModel:
          typeof value.cachePolicy.freshnessModel === "string"
            ? value.cachePolicy.freshnessModel
            : "",
        maxRecords: Number.isFinite(Number(value.cachePolicy.maxRecords))
          ? Number(value.cachePolicy.maxRecords)
          : 0,
        staleFallback:
          typeof value.cachePolicy.staleFallback === "string"
            ? value.cachePolicy.staleFallback
            : "",
      }
    : null;
  const cacheRecordCount = Number.isFinite(Number(value.cacheRecordCount))
    ? Number(value.cacheRecordCount)
    : 0;
  const rateLimitWindowCount = Number.isFinite(Number(value.rateLimitWindowCount))
    ? Number(value.rateLimitWindowCount)
    : 0;
  const rateLimitWindowSeconds = Number.isFinite(Number(value.rateLimitWindowSeconds))
    ? Number(value.rateLimitWindowSeconds)
    : 0;
  const circuitBreakerPolicy = isPlainObject(value.circuitBreakerPolicy)
    ? {
        failureThreshold: Number.isFinite(Number(value.circuitBreakerPolicy.failureThreshold))
          ? Number(value.circuitBreakerPolicy.failureThreshold)
          : 0,
        coolDownSeconds: Number.isFinite(Number(value.circuitBreakerPolicy.coolDownSeconds))
          ? Number(value.circuitBreakerPolicy.coolDownSeconds)
          : 0,
        halfOpenProbe:
          typeof value.circuitBreakerPolicy.halfOpenProbe === "string"
            ? value.circuitBreakerPolicy.halfOpenProbe
            : "",
      }
    : null;
  const cacheRecords = Array.isArray(value.cacheRecords)
    ? value.cacheRecords
        .filter((record) => isPlainObject(record))
        .map((record) => ({
          key: typeof record.key === "string" ? record.key : "",
          kind: typeof record.kind === "string" ? record.kind : "",
          cachedAt: typeof record.cachedAt === "string" ? record.cachedAt : "",
          freshUntil: typeof record.freshUntil === "string" ? record.freshUntil : "",
          maxStaleUntil: typeof record.maxStaleUntil === "string" ? record.maxStaleUntil : "",
          state: typeof record.state === "string" ? record.state : "unknown",
        }))
        .filter((record) => record.key)
    : [];
  const rateLimitWindows = Array.isArray(value.rateLimitWindows)
    ? value.rateLimitWindows
        .filter((windowItem) => isPlainObject(windowItem))
        .map((windowItem) => ({
          key: typeof windowItem.key === "string" ? windowItem.key : "",
          count: Number.isFinite(Number(windowItem.count)) ? Number(windowItem.count) : 0,
          limit: Number.isFinite(Number(windowItem.limit)) ? Number(windowItem.limit) : 0,
          remaining: Number.isFinite(Number(windowItem.remaining)) ? Number(windowItem.remaining) : 0,
          windowEndsAt: typeof windowItem.windowEndsAt === "string" ? windowItem.windowEndsAt : "",
        }))
        .filter((windowItem) => windowItem.key)
    : [];
  const recentExecutions = Array.isArray(value.recentExecutions)
    ? value.recentExecutions
        .filter((execution) => isPlainObject(execution))
        .map((execution) => ({
          executedAt: typeof execution.executedAt === "string" ? execution.executedAt : "",
          requestKind: typeof execution.requestKind === "string" ? execution.requestKind : "",
          cacheKey: typeof execution.cacheKey === "string" ? execution.cacheKey : "",
          cacheState: typeof execution.cacheState === "string" ? execution.cacheState : "unknown",
          cacheHit: execution.cacheHit === true,
          refreshed: execution.refreshed === true,
          rateLimitKey: typeof execution.rateLimitKey === "string" ? execution.rateLimitKey : "",
          rateLimitCount: Number.isFinite(Number(execution.rateLimitCount))
            ? Number(execution.rateLimitCount)
            : 0,
          fallback: typeof execution.fallback === "string" ? execution.fallback : "",
          circuitState: typeof execution.circuitState === "string" ? execution.circuitState : "",
        }))
        .filter((execution) => execution.requestKind || execution.cacheKey)
    : [];
  const circuitBreakers = Array.isArray(value.circuitBreakers)
    ? value.circuitBreakers
        .filter((breaker) => isPlainObject(breaker))
        .map((breaker) => ({
          key: typeof breaker.key === "string" ? breaker.key : "",
          state: typeof breaker.state === "string" ? breaker.state : "unknown",
          consecutiveFailures: Number.isFinite(Number(breaker.consecutiveFailures))
            ? Number(breaker.consecutiveFailures)
            : 0,
          coolDownUntil: typeof breaker.coolDownUntil === "string" ? breaker.coolDownUntil : "",
          reason: typeof breaker.reason === "string" ? breaker.reason : "",
        }))
        .filter((breaker) => breaker.key)
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.filter((capability) => typeof capability === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    executionMode,
    cacheStore,
    cachePolicy,
    cacheRecordCount,
    rateLimitWindowCount,
    rateLimitWindowSeconds,
    circuitBreakerPolicy,
    cacheRecords,
    rateLimitWindows,
    circuitBreakers,
    recentExecutions,
    capabilities,
    safety,
    disclaimer,
  };
}

function sanitizeNewsIngestionRuntimeStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名新闻采集运行时";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const executionMode =
    typeof value.executionMode === "string" && value.executionMode.trim()
      ? value.executionMode.trim()
      : "unknown";
  const sourceTypes = Array.isArray(value.sourceTypes)
    ? value.sourceTypes.filter((sourceType) => typeof sourceType === "string" && sourceType.trim())
    : [];
  const cooldownWindowSeconds = Number.isFinite(Number(value.cooldownWindowSeconds))
    ? Number(value.cooldownWindowSeconds)
    : 0;
  const dedupeRecordCount = Number.isFinite(Number(value.dedupeRecordCount))
    ? Number(value.dedupeRecordCount)
    : 0;
  const sourceCooldowns = Array.isArray(value.sourceCooldowns)
    ? value.sourceCooldowns
        .filter((cooldown) => isPlainObject(cooldown))
        .map((cooldown) => ({
          key: typeof cooldown.key === "string" ? cooldown.key : "",
          runCount: Number.isFinite(Number(cooldown.runCount)) ? Number(cooldown.runCount) : 0,
          cooldownUntil:
            typeof cooldown.cooldownUntil === "string" ? cooldown.cooldownUntil : "",
          status: typeof cooldown.status === "string" ? cooldown.status : "unknown",
        }))
        .filter((cooldown) => cooldown.key)
    : [];
  const recentRuns = Array.isArray(value.recentRuns)
    ? value.recentRuns
        .filter((run) => isPlainObject(run))
        .map((run) => ({
          sourceKey: typeof run.sourceKey === "string" ? run.sourceKey : "",
          sourceType: typeof run.sourceType === "string" ? run.sourceType : "",
          acceptedCount: Number.isFinite(Number(run.acceptedCount)) ? Number(run.acceptedCount) : 0,
          duplicateCount: Number.isFinite(Number(run.duplicateCount)) ? Number(run.duplicateCount) : 0,
          attributionMissingCount: Number.isFinite(Number(run.attributionMissingCount))
            ? Number(run.attributionMissingCount)
            : 0,
          blockedCount: Number.isFinite(Number(run.blockedCount)) ? Number(run.blockedCount) : 0,
          cooldownStatus:
            typeof run.cooldownStatus === "string" ? run.cooldownStatus : "unknown",
        }))
        .filter((run) => run.sourceKey)
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.filter((capability) => typeof capability === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    executionMode,
    sourceTypes,
    cooldownWindowSeconds,
    dedupeRecordCount,
    sourceCooldowns,
    recentRuns,
    capabilities,
    safety,
    disclaimer,
  };
}

function sanitizeNewsFilingsAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedNewsProvider =
    typeof value.selectedNewsProvider === "string" && value.selectedNewsProvider.trim()
      ? value.selectedNewsProvider.trim()
      : "";
  const selectedStatementProvider =
    typeof value.selectedStatementProvider === "string" && value.selectedStatementProvider.trim()
      ? value.selectedStatementProvider.trim()
      : "";
  const configured = value.configured === true;
  const statementConfigured = value.statementConfigured === true;
  const supported = value.supported !== false;
  const canFetchLiveNews = value.canFetchLiveNews === true;
  const canReadFixtures = value.canReadFixtures === true;
  const processing = isPlainObject(value.processing)
    ? {
        deduplication:
          typeof value.processing.deduplication === "string" && value.processing.deduplication.trim()
            ? value.processing.deduplication.trim()
            : "",
        sourceCredibility:
          typeof value.processing.sourceCredibility === "string" &&
          value.processing.sourceCredibility.trim()
            ? value.processing.sourceCredibility.trim()
            : "",
        importanceScoring:
          typeof value.processing.importanceScoring === "string" &&
          value.processing.importanceScoring.trim()
            ? value.processing.importanceScoring.trim()
            : "",
        persistence:
          typeof value.processing.persistence === "string" && value.processing.persistence.trim()
            ? value.processing.persistence.trim()
            : "",
      }
    : null;
  const fixtureReadModel = isPlainObject(value.fixtureReadModel)
    ? {
        status:
          typeof value.fixtureReadModel.status === "string" && value.fixtureReadModel.status.trim()
            ? value.fixtureReadModel.status.trim()
            : "unknown",
        newsCount: Number.isFinite(Number(value.fixtureReadModel.newsCount))
          ? Number(value.fixtureReadModel.newsCount)
          : 0,
        filingCount: Number.isFinite(Number(value.fixtureReadModel.filingCount))
          ? Number(value.fixtureReadModel.filingCount)
          : 0,
        publicStatementCount: Number.isFinite(Number(value.fixtureReadModel.publicStatementCount))
          ? Number(value.fixtureReadModel.publicStatementCount)
          : 0,
        markets: Array.isArray(value.fixtureReadModel.markets)
          ? value.fixtureReadModel.markets.filter((market) => validMarkets.includes(market))
          : [],
        source:
          typeof value.fixtureReadModel.source === "string" && value.fixtureReadModel.source.trim()
            ? value.fixtureReadModel.source.trim()
            : "",
      }
    : null;
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
          fixtureStatus:
            typeof contract.fixtureStatus === "string" ? contract.fixtureStatus : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedNewsProvider,
    selectedStatementProvider,
    configured,
    statementConfigured,
    supported,
    canFetchLiveNews,
    canReadFixtures,
    processing,
    fixtureReadModel,
    missingEnvVars,
    endpointContracts,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeMacroDataAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canFetchLiveMacro = value.canFetchLiveMacro === true;
  const canReadFixtures = value.canReadFixtures === true;
  const processing = isPlainObject(value.processing)
    ? {
        macroFactorLinking:
          typeof value.processing.macroFactorLinking === "string" &&
          value.processing.macroFactorLinking.trim()
            ? value.processing.macroFactorLinking.trim()
            : "",
        indicatorNormalization:
          typeof value.processing.indicatorNormalization === "string" &&
          value.processing.indicatorNormalization.trim()
            ? value.processing.indicatorNormalization.trim()
            : "",
        policyEventScoring:
          typeof value.processing.policyEventScoring === "string" &&
          value.processing.policyEventScoring.trim()
            ? value.processing.policyEventScoring.trim()
            : "",
      }
    : null;
  const fixtureReadModel = isPlainObject(value.fixtureReadModel)
    ? {
        status:
          typeof value.fixtureReadModel.status === "string" && value.fixtureReadModel.status.trim()
            ? value.fixtureReadModel.status.trim()
            : "unknown",
        contextCount: Number.isFinite(Number(value.fixtureReadModel.contextCount))
          ? Number(value.fixtureReadModel.contextCount)
          : 0,
        indicatorCount: Number.isFinite(Number(value.fixtureReadModel.indicatorCount))
          ? Number(value.fixtureReadModel.indicatorCount)
          : 0,
        policyEventCount: Number.isFinite(Number(value.fixtureReadModel.policyEventCount))
          ? Number(value.fixtureReadModel.policyEventCount)
          : 0,
        markets: Array.isArray(value.fixtureReadModel.markets)
          ? value.fixtureReadModel.markets.filter((market) => validMarkets.includes(market))
          : [],
        source:
          typeof value.fixtureReadModel.source === "string" && value.fixtureReadModel.source.trim()
            ? value.fixtureReadModel.source.trim()
            : "",
      }
    : null;
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
          fixtureStatus:
            typeof contract.fixtureStatus === "string" ? contract.fixtureStatus : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedProvider,
    configured,
    supported,
    canFetchLiveMacro,
    canReadFixtures,
    processing,
    fixtureReadModel,
    missingEnvVars,
    endpointContracts,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeProviderStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名数据源";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const coverage = Array.isArray(value.coverage)
    ? value.coverage.filter((market) => validMarkets.includes(market))
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const integrationPlan = sanitizeProviderIntegrationPlan(value.integrationPlan);
  const providerRegistry = sanitizeProviderRegistry(value.providerRegistry);
  const marketDataAdapter = sanitizeMarketDataAdapterStatus(value.marketDataAdapter);
  const macroDataAdapter = sanitizeMacroDataAdapterStatus(value.macroDataAdapter);
  const newsFilingsAdapter = sanitizeNewsFilingsAdapterStatus(value.newsFilingsAdapter);

  return {
    id,
    name,
    mode,
    status,
    coverage,
    capabilities,
    integrationPlan,
    providerRegistry,
    marketDataAdapter,
    macroDataAdapter,
    newsFilingsAdapter,
    disclaimer,
  };
}

function sanitizeAiServiceStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名 AI 服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const model =
    typeof value.model === "string" && value.model.trim() ? value.model.trim() : "未标注模型";
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const providerAdapter = sanitizeAiProviderAdapterStatus(value.providerAdapter);

  return { id, name, mode, status, model, capabilities, providerAdapter, disclaimer };
}

function sanitizeAiProviderAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const selectedModel =
    typeof value.selectedModel === "string" && value.selectedModel.trim()
      ? value.selectedModel.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canCallLiveModel = value.canCallLiveModel === true;
  const promptContract = isPlainObject(value.promptContract)
    ? {
        version:
          typeof value.promptContract.version === "string" && value.promptContract.version.trim()
            ? value.promptContract.version.trim()
            : "",
        outputMode:
          typeof value.promptContract.outputMode === "string" ? value.promptContract.outputMode : "",
        probabilityLanguage:
          typeof value.promptContract.probabilityLanguage === "string"
            ? value.promptContract.probabilityLanguage
            : "",
        requiresNoGuaranteeDisclaimer:
          value.promptContract.requiresNoGuaranteeDisclaimer === true,
      }
    : null;
  const responseSchema = isPlainObject(value.responseSchema)
    ? {
        status:
          typeof value.responseSchema.status === "string" ? value.responseSchema.status : "unknown",
        requiredFields: Array.isArray(value.responseSchema.requiredFields)
          ? value.responseSchema.requiredFields.filter((field) => typeof field === "string")
          : [],
        forbiddenFields: Array.isArray(value.responseSchema.forbiddenFields)
          ? value.responseSchema.forbiddenFields.filter((field) => typeof field === "string")
          : [],
      }
    : null;
  const complianceGate = isPlainObject(value.complianceGate)
    ? {
        status:
          typeof value.complianceGate.status === "string" ? value.complianceGate.status : "unknown",
        canCallLiveModel: value.complianceGate.canCallLiveModel === true,
        checks: Array.isArray(value.complianceGate.checks)
          ? value.complianceGate.checks
              .filter((check) => isPlainObject(check))
              .map((check) => ({
                id: typeof check.id === "string" ? check.id : "",
                status: typeof check.status === "string" ? check.status : "unknown",
              }))
              .filter((check) => check.id)
          : [],
        blockedReasons: Array.isArray(value.complianceGate.blockedReasons)
          ? value.complianceGate.blockedReasons.filter(
              (reason) => typeof reason === "string" && reason.trim(),
            )
          : [],
      }
    : null;
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedProvider,
    selectedModel,
    configured,
    supported,
    canCallLiveModel,
    promptContract,
    responseSchema,
    complianceGate,
    endpointContracts,
    missingEnvVars,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeAuthServiceStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名认证服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const sessionMode =
    typeof value.sessionMode === "string" && value.sessionMode.trim()
      ? value.sessionMode.trim()
      : "未标注会话模式";
  const supportedMethods = Array.isArray(value.supportedMethods)
    ? [
        ...new Set(
          value.supportedMethods
            .filter((method) => typeof method === "string" && method.trim())
            .map((method) => method.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const providerAdapter = sanitizeAuthProviderAdapterStatus(value.providerAdapter);
  const rolePolicy = sanitizeAuthRolePolicy(value.rolePolicy);

  return { id, name, mode, status, sessionMode, supportedMethods, rolePolicy, providerAdapter, disclaimer };
}

function sanitizeAuthRolePolicy(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode = typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const allowedRoles = Array.isArray(value.allowedRoles)
    ? [
        ...new Set(
          value.allowedRoles
            .filter((role) => typeof role === "string" && role.trim())
            .map((role) => role.trim()),
        ),
      ]
    : [];
  const privilegedRoles = Array.isArray(value.privilegedRoles)
    ? [
        ...new Set(
          value.privilegedRoles
            .filter((role) => typeof role === "string" && role.trim())
            .map((role) => role.trim()),
        ),
      ]
    : [];
  const roleSource =
    typeof value.roleSource === "string" && value.roleSource.trim()
      ? value.roleSource.trim()
      : "";
  const productionSelfServiceAllowed = value.productionSelfServiceAllowed === true;
  const adminAssignmentPolicy = isPlainObject(value.adminAssignmentPolicy)
    ? {
        status:
          typeof value.adminAssignmentPolicy.status === "string"
            ? value.adminAssignmentPolicy.status
            : "unknown",
        requiredRole:
          typeof value.adminAssignmentPolicy.requiredRole === "string"
            ? value.adminAssignmentPolicy.requiredRole
            : "admin",
        defaultPrivilegedRoleExpiryHours: Number.isFinite(
          Number(value.adminAssignmentPolicy.defaultPrivilegedRoleExpiryHours),
        )
          ? Number(value.adminAssignmentPolicy.defaultPrivilegedRoleExpiryHours)
          : 0,
        maxRoleExpiryHours: Number.isFinite(Number(value.adminAssignmentPolicy.maxRoleExpiryHours))
          ? Number(value.adminAssignmentPolicy.maxRoleExpiryHours)
          : 0,
        productionReviewRequired: value.adminAssignmentPolicy.productionReviewRequired === true,
      }
    : null;
  const adminRevocationPolicy = isPlainObject(value.adminRevocationPolicy)
    ? {
        status:
          typeof value.adminRevocationPolicy.status === "string"
            ? value.adminRevocationPolicy.status
            : "unknown",
        requiredRole:
          typeof value.adminRevocationPolicy.requiredRole === "string"
            ? value.adminRevocationPolicy.requiredRole
            : "admin",
        revocableRoles: Array.isArray(value.adminRevocationPolicy.revocableRoles)
          ? value.adminRevocationPolicy.revocableRoles.filter(
              (role) => typeof role === "string" && role.trim(),
            )
          : [],
        preventsSelfAdminRevoke: value.adminRevocationPolicy.preventSelfAdminRevoke === true ||
          value.adminRevocationPolicy.preventsSelfAdminRevoke === true,
        productionReviewRequired: value.adminRevocationPolicy.productionReviewRequired === true,
      }
    : null;
  const adminRoleHistoryPolicy = isPlainObject(value.adminRoleHistoryPolicy)
    ? {
        status:
          typeof value.adminRoleHistoryPolicy.status === "string"
            ? value.adminRoleHistoryPolicy.status
            : "unknown",
        requiredRole:
          typeof value.adminRoleHistoryPolicy.requiredRole === "string"
            ? value.adminRoleHistoryPolicy.requiredRole
            : "admin",
        scope:
          typeof value.adminRoleHistoryPolicy.scope === "string"
            ? value.adminRoleHistoryPolicy.scope
            : "",
        maxItems: Number.isFinite(Number(value.adminRoleHistoryPolicy.maxItems))
          ? Number(value.adminRoleHistoryPolicy.maxItems)
          : 0,
        eventTypes: Array.isArray(value.adminRoleHistoryPolicy.eventTypes)
          ? value.adminRoleHistoryPolicy.eventTypes.filter(
              (type) => typeof type === "string" && type.trim(),
            )
          : [],
        productionReviewRequired: value.adminRoleHistoryPolicy.productionReviewRequired === true,
      }
    : null;
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  return {
    id,
    mode,
    status,
    allowedRoles,
    privilegedRoles,
    roleSource,
    productionSelfServiceAllowed,
    adminAssignmentPolicy,
    adminRevocationPolicy,
    adminRoleHistoryPolicy,
    disclaimer,
  };
}

function sanitizeAuthProviderAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canUseProductionAuth = value.canUseProductionAuth === true;
  const passwordPolicy = isPlainObject(value.passwordPolicy)
    ? {
        status:
          typeof value.passwordPolicy.status === "string" ? value.passwordPolicy.status : "unknown",
        minLength: Number.isFinite(Number(value.passwordPolicy.minLength))
          ? Number(value.passwordPolicy.minLength)
          : 0,
        breachCheckRequired: value.passwordPolicy.breachCheckRequired === true,
      }
    : null;
  const sessionPolicy = isPlainObject(value.sessionPolicy)
    ? {
        status:
          typeof value.sessionPolicy.status === "string" ? value.sessionPolicy.status : "unknown",
        accessTokenMinutes: Number.isFinite(Number(value.sessionPolicy.accessTokenMinutes))
          ? Number(value.sessionPolicy.accessTokenMinutes)
          : 0,
        refreshTokenDays: Number.isFinite(Number(value.sessionPolicy.refreshTokenDays))
          ? Number(value.sessionPolicy.refreshTokenDays)
          : 0,
        rotationRequired: value.sessionPolicy.rotationRequired === true,
        deviceBindingRequired: value.sessionPolicy.deviceBindingRequired === true,
      }
    : null;
  const securityGate = isPlainObject(value.securityGate)
    ? {
        status: typeof value.securityGate.status === "string" ? value.securityGate.status : "unknown",
        canUseProductionAuth: value.securityGate.canUseProductionAuth === true,
        checks: Array.isArray(value.securityGate.checks)
          ? value.securityGate.checks
              .filter((check) => isPlainObject(check))
              .map((check) => ({
                id: typeof check.id === "string" ? check.id : "",
                status: typeof check.status === "string" ? check.status : "unknown",
              }))
              .filter((check) => check.id)
          : [],
        blockedReasons: Array.isArray(value.securityGate.blockedReasons)
          ? value.securityGate.blockedReasons.filter(
              (reason) => typeof reason === "string" && reason.trim(),
            )
          : [],
      }
    : null;
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedProvider,
    configured,
    supported,
    canUseProductionAuth,
    passwordPolicy,
    sessionPolicy,
    securityGate,
    endpointContracts,
    missingEnvVars,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeAuthUser(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const displayName =
    typeof value.displayName === "string" && value.displayName.trim()
      ? value.displayName.trim()
      : "用户";
  const email =
    typeof value.email === "string" && value.email.trim() ? value.email.trim().toLowerCase() : "";
  const roles = Array.isArray(value.roles)
    ? [
        ...new Set(
          value.roles
            .filter((role) => typeof role === "string" && role.trim())
            .map((role) => role.trim()),
        ),
      ]
    : [];
  const roleGrants = Array.isArray(value.roleGrants)
    ? value.roleGrants
        .filter((grant) => isPlainObject(grant) && typeof grant.role === "string")
        .map((grant) => ({
          role: grant.role.trim(),
          status: typeof grant.status === "string" && grant.status.trim() ? grant.status.trim() : "active",
          grantedBy:
            typeof grant.grantedBy === "string" && grant.grantedBy.trim()
              ? grant.grantedBy.trim()
              : "",
          grantedAt:
            typeof grant.grantedAt === "string" && grant.grantedAt.trim()
              ? grant.grantedAt.trim()
              : "",
          expiresAt:
            typeof grant.expiresAt === "string" && grant.expiresAt.trim()
              ? grant.expiresAt.trim()
              : "",
        }))
        .filter((grant) => grant.role)
    : [];
  if (!id) return null;
  return { id, displayName, email, roles, roleGrants };
}

function sanitizeNotificationServiceStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名通知服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const deliveryMode =
    typeof value.deliveryMode === "string" && value.deliveryMode.trim()
      ? value.deliveryMode.trim()
      : "未标注投递模式";
  const supportedChannels = Array.isArray(value.supportedChannels)
    ? [
        ...new Set(
          value.supportedChannels
            .filter((channel) => typeof channel === "string" && channel.trim())
            .map((channel) => channel.trim()),
        ),
      ]
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const providerAdapter = sanitizeNotificationProviderAdapterStatus(value.providerAdapter);

  return {
    id,
    name,
    mode,
    status,
    deliveryMode,
    supportedChannels,
    capabilities,
    providerAdapter,
    disclaimer,
  };
}

function sanitizeNotificationProviderAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canUseExternalDelivery = value.canUseExternalDelivery === true;
  const deliveryPolicy = isPlainObject(value.deliveryPolicy)
    ? {
        status:
          typeof value.deliveryPolicy.status === "string" ? value.deliveryPolicy.status : "unknown",
        retryBackoff:
          typeof value.deliveryPolicy.retryBackoff === "string"
            ? value.deliveryPolicy.retryBackoff
            : "unknown",
        maxAttempts: Number.isFinite(Number(value.deliveryPolicy.maxAttempts))
          ? Number(value.deliveryPolicy.maxAttempts)
          : 0,
        rateLimitPerMinute: Number.isFinite(Number(value.deliveryPolicy.rateLimitPerMinute))
          ? Number(value.deliveryPolicy.rateLimitPerMinute)
          : 0,
        requiresIdempotencyKey: value.deliveryPolicy.requiresIdempotencyKey === true,
        providerWebhookVerification: value.deliveryPolicy.providerWebhookVerification === true,
      }
    : null;
  const consentPolicy = isPlainObject(value.consentPolicy)
    ? {
        status:
          typeof value.consentPolicy.status === "string" ? value.consentPolicy.status : "unknown",
        requiresUserOptIn: value.consentPolicy.requiresUserOptIn === true,
        supportsChannelOptOut: value.consentPolicy.supportsChannelOptOut === true,
        recordsConsentVersion: value.consentPolicy.recordsConsentVersion === true,
        blocksSilentExternalDelivery: value.consentPolicy.blocksSilentExternalDelivery === true,
      }
    : null;
  const deliveryGate = isPlainObject(value.deliveryGate)
    ? {
        status: typeof value.deliveryGate.status === "string" ? value.deliveryGate.status : "unknown",
        canUseExternalDelivery: value.deliveryGate.canUseExternalDelivery === true,
        checks: Array.isArray(value.deliveryGate.checks)
          ? value.deliveryGate.checks
              .filter((check) => isPlainObject(check))
              .map((check) => ({
                id: typeof check.id === "string" ? check.id : "",
                status: typeof check.status === "string" ? check.status : "unknown",
              }))
              .filter((check) => check.id)
          : [],
        blockedReasons: Array.isArray(value.deliveryGate.blockedReasons)
          ? value.deliveryGate.blockedReasons.filter(
              (reason) => typeof reason === "string" && reason.trim(),
            )
          : [],
      }
    : null;
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const channelContracts = Array.isArray(value.channelContracts)
    ? value.channelContracts
        .filter((channel) => isPlainObject(channel))
        .map((channel) => ({
          id: typeof channel.id === "string" ? channel.id : "",
          label: typeof channel.label === "string" ? channel.label : "",
          status: typeof channel.status === "string" ? channel.status : "unknown",
        }))
        .filter((channel) => channel.id)
    : [];
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedProvider,
    configured,
    supported,
    canUseExternalDelivery,
    deliveryPolicy,
    consentPolicy,
    deliveryGate,
    endpointContracts,
    channelContracts,
    missingEnvVars,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeJobRunnerStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名任务运行器";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const executionMode =
    typeof value.executionMode === "string" && value.executionMode.trim()
      ? value.executionMode.trim()
      : "unknown";
  const supportedJobs = Array.isArray(value.supportedJobs)
    ? [
        ...new Set(
          value.supportedJobs
            .filter((job) => typeof job === "string" && job.trim())
            .map((job) => job.trim()),
        ),
      ]
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const duplicateSuppression = isPlainObject(value.duplicateSuppression)
    ? {
        notificationWindowSeconds: Number.isFinite(
          Number(value.duplicateSuppression.notificationWindowSeconds),
        )
          ? Number(value.duplicateSuppression.notificationWindowSeconds)
          : 0,
        scope:
          typeof value.duplicateSuppression.scope === "string"
            ? value.duplicateSuppression.scope
            : "",
      }
    : null;
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    executionMode,
    supportedJobs,
    capabilities,
    duplicateSuppression,
    disclaimer,
  };
}

function sanitizeSchedulerStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名调度服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const executionMode =
    typeof value.executionMode === "string" && value.executionMode.trim()
      ? value.executionMode.trim()
      : "unknown";
  const timezone =
    typeof value.timezone === "string" && value.timezone.trim()
      ? value.timezone.trim()
      : "未标注时区";
  const schedules = Array.isArray(value.schedules)
    ? value.schedules
        .filter((schedule) => isPlainObject(schedule))
        .map((schedule) => ({
          id: typeof schedule.id === "string" ? schedule.id : "",
          jobType: typeof schedule.jobType === "string" ? schedule.jobType : "",
          cadence: typeof schedule.cadence === "string" ? schedule.cadence : "",
          timezone: typeof schedule.timezone === "string" ? schedule.timezone : "",
        }))
        .filter((schedule) => schedule.id && schedule.jobType)
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const runSafety = isPlainObject(value.runSafety)
    ? {
        idempotencyWindowSeconds: Number.isFinite(Number(value.runSafety.idempotencyWindowSeconds))
          ? Number(value.runSafety.idempotencyWindowSeconds)
          : 0,
        cooldownSeconds: Number.isFinite(Number(value.runSafety.cooldownSeconds))
          ? Number(value.runSafety.cooldownSeconds)
          : 0,
        idempotencyKeySupported: value.runSafety.idempotencyKeySupported === true,
        overlappingRunsBlocked: value.runSafety.overlappingRunsBlocked === true,
      }
    : null;
  const deadLetterPolicy = isPlainObject(value.deadLetterPolicy)
    ? {
        status:
          typeof value.deadLetterPolicy.status === "string"
            ? value.deadLetterPolicy.status
            : "unknown",
        maxAttempts: Number.isFinite(Number(value.deadLetterPolicy.maxAttempts))
          ? Number(value.deadLetterPolicy.maxAttempts)
          : 0,
        retryBackoff:
          typeof value.deadLetterPolicy.retryBackoff === "string"
            ? value.deadLetterPolicy.retryBackoff
            : "unknown",
        baseRetrySeconds: Number.isFinite(Number(value.deadLetterPolicy.baseRetrySeconds))
          ? Number(value.deadLetterPolicy.baseRetrySeconds)
          : 0,
        replaySupported: value.deadLetterPolicy.replaySupported === true,
        requiresAuditTrail: value.deadLetterPolicy.requiresAuditTrail === true,
      }
    : null;
  const workerTelemetryPolicy = isPlainObject(value.workerTelemetryPolicy)
    ? {
        status:
          typeof value.workerTelemetryPolicy.status === "string"
            ? value.workerTelemetryPolicy.status
            : "unknown",
        heartbeatTtlSeconds: Number.isFinite(
          Number(value.workerTelemetryPolicy.heartbeatTtlSeconds),
        )
          ? Number(value.workerTelemetryPolicy.heartbeatTtlSeconds)
          : 0,
        queueLagWarningSeconds: Number.isFinite(
          Number(value.workerTelemetryPolicy.queueLagWarningSeconds),
        )
          ? Number(value.workerTelemetryPolicy.queueLagWarningSeconds)
          : 0,
        queueLagCriticalSeconds: Number.isFinite(
          Number(value.workerTelemetryPolicy.queueLagCriticalSeconds),
        )
          ? Number(value.workerTelemetryPolicy.queueLagCriticalSeconds)
          : 0,
        queueDepthWarning: Number.isFinite(Number(value.workerTelemetryPolicy.queueDepthWarning))
          ? Number(value.workerTelemetryPolicy.queueDepthWarning)
          : 0,
        queueDepthCritical: Number.isFinite(Number(value.workerTelemetryPolicy.queueDepthCritical))
          ? Number(value.workerTelemetryPolicy.queueDepthCritical)
          : 0,
        heartbeatSupported: value.workerTelemetryPolicy.heartbeatSupported === true,
        queueLagMonitoringSupported:
          value.workerTelemetryPolicy.queueLagMonitoringSupported === true,
      }
    : null;
  const workerAuthPolicy = isPlainObject(value.workerAuthPolicy)
    ? {
        status:
          typeof value.workerAuthPolicy.status === "string"
            ? value.workerAuthPolicy.status
            : "unknown",
        configured: value.workerAuthPolicy.configured === true,
        enforcement:
          typeof value.workerAuthPolicy.enforcement === "string"
            ? value.workerAuthPolicy.enforcement
            : "unknown",
        signatureRequired: value.workerAuthPolicy.signatureRequired === true,
        nonceRequired: value.workerAuthPolicy.nonceRequired === true,
        signatureAlgorithm:
          typeof value.workerAuthPolicy.signatureAlgorithm === "string"
            ? value.workerAuthPolicy.signatureAlgorithm
            : "",
        timestampToleranceSeconds: Number.isFinite(
          Number(value.workerAuthPolicy.timestampToleranceSeconds),
        )
          ? Number(value.workerAuthPolicy.timestampToleranceSeconds)
          : 0,
        acceptedHeader:
          typeof value.workerAuthPolicy.acceptedHeader === "string"
            ? value.workerAuthPolicy.acceptedHeader
            : "",
        acceptedSignatureHeader:
          typeof value.workerAuthPolicy.acceptedSignatureHeader === "string"
            ? value.workerAuthPolicy.acceptedSignatureHeader
            : "",
        acceptedTimestampHeader:
          typeof value.workerAuthPolicy.acceptedTimestampHeader === "string"
            ? value.workerAuthPolicy.acceptedTimestampHeader
            : "",
        acceptedNonceHeader:
          typeof value.workerAuthPolicy.acceptedNonceHeader === "string"
            ? value.workerAuthPolicy.acceptedNonceHeader
            : "",
        acceptedBodyField:
          typeof value.workerAuthPolicy.acceptedBodyField === "string"
            ? value.workerAuthPolicy.acceptedBodyField
            : "",
        acceptedNonceBodyField:
          typeof value.workerAuthPolicy.acceptedNonceBodyField === "string"
            ? value.workerAuthPolicy.acceptedNonceBodyField
            : "",
        nonceRetentionLimit: Number.isFinite(Number(value.workerAuthPolicy.nonceRetentionLimit))
          ? Number(value.workerAuthPolicy.nonceRetentionLimit)
          : 0,
        nonceRetentionSeconds: Number.isFinite(Number(value.workerAuthPolicy.nonceRetentionSeconds))
          ? Number(value.workerAuthPolicy.nonceRetentionSeconds)
          : 0,
        nonceCleanupSupported: value.workerAuthPolicy.nonceCleanupSupported === true,
        appliesTo: Array.isArray(value.workerAuthPolicy.appliesTo)
          ? value.workerAuthPolicy.appliesTo.filter((item) => typeof item === "string")
          : [],
        disclaimer:
          typeof value.workerAuthPolicy.disclaimer === "string"
            ? value.workerAuthPolicy.disclaimer
            : "",
      }
    : null;
  const queuePolicy = isPlainObject(value.queuePolicy)
    ? {
        status: typeof value.queuePolicy.status === "string" ? value.queuePolicy.status : "unknown",
        enqueueSupported: value.queuePolicy.enqueueSupported === true,
        retryBackoff:
          typeof value.queuePolicy.retryBackoff === "string"
            ? value.queuePolicy.retryBackoff
            : "unknown",
        maxAttempts: Number.isFinite(Number(value.queuePolicy.maxAttempts))
          ? Number(value.queuePolicy.maxAttempts)
          : 0,
        deadLetterAfterMaxAttempts: value.queuePolicy.deadLetterAfterMaxAttempts === true,
        requiresIdempotencyKey: value.queuePolicy.requiresIdempotencyKey === true,
      }
    : null;
  const workerNonceMaintenancePolicy = isPlainObject(value.workerNonceMaintenancePolicy)
    ? {
        status:
          typeof value.workerNonceMaintenancePolicy.status === "string"
            ? value.workerNonceMaintenancePolicy.status
            : "unknown",
        cleanupSupported: value.workerNonceMaintenancePolicy.cleanupSupported === true,
        retentionSeconds: Number.isFinite(
          Number(value.workerNonceMaintenancePolicy.retentionSeconds),
        )
          ? Number(value.workerNonceMaintenancePolicy.retentionSeconds)
          : 0,
        retentionLimit: Number.isFinite(Number(value.workerNonceMaintenancePolicy.retentionLimit))
          ? Number(value.workerNonceMaintenancePolicy.retentionLimit)
          : 0,
        auditTrailRequired: value.workerNonceMaintenancePolicy.auditTrailRequired === true,
        manualCleanupSupported:
          value.workerNonceMaintenancePolicy.manualCleanupSupported === true,
        disclaimer:
          typeof value.workerNonceMaintenancePolicy.disclaimer === "string"
            ? value.workerNonceMaintenancePolicy.disclaimer
            : "",
      }
    : null;
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const providerAdapter = sanitizeSchedulerProviderAdapterStatus(value.providerAdapter);

  return {
    id,
    name,
    mode,
    status,
    executionMode,
    timezone,
    schedules,
    runSafety,
    deadLetterPolicy,
    workerTelemetryPolicy,
    workerAuthPolicy,
    workerNonceMaintenancePolicy,
    queuePolicy,
    capabilities,
    providerAdapter,
    disclaimer,
  };
}

function sanitizeDeadLetterJobs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isPlainObject(item))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      userId: typeof item.userId === "string" ? item.userId : "",
      scheduleId: typeof item.scheduleId === "string" ? item.scheduleId : "",
      jobType: typeof item.jobType === "string" ? item.jobType : "",
      status: typeof item.status === "string" ? item.status : "open",
      attempts: Number.isFinite(Number(item.attempts)) ? Number(item.attempts) : 0,
      maxAttempts: Number.isFinite(Number(item.maxAttempts)) ? Number(item.maxAttempts) : 3,
      nextRetryAt: typeof item.nextRetryAt === "string" ? item.nextRetryAt : "",
      lastError: isPlainObject(item.lastError)
        ? {
            code: typeof item.lastError.code === "string" ? item.lastError.code : "JOB_FAILED",
            message: typeof item.lastError.message === "string" ? item.lastError.message : "",
          }
        : { code: "JOB_FAILED", message: "" },
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      replayedAt: typeof item.replayedAt === "string" ? item.replayedAt : "",
      jobRunId: typeof item.jobRunId === "string" ? item.jobRunId : "",
    }))
    .filter((item) => item.id && item.jobType);
}

function sanitizeWorkerHealth(value) {
  if (!isPlainObject(value)) return null;
  const queue = isPlainObject(value.queue)
    ? {
        status: typeof value.queue.status === "string" ? value.queue.status : "unknown",
        totalDepth: Number.isFinite(Number(value.queue.totalDepth))
          ? Number(value.queue.totalDepth)
          : 0,
        openDeadLetters: Number.isFinite(Number(value.queue.openDeadLetters))
          ? Number(value.queue.openDeadLetters)
          : 0,
        pendingWork: Number.isFinite(Number(value.queue.pendingWork))
          ? Number(value.queue.pendingWork)
          : 0,
        maxLagMs: Number.isFinite(Number(value.queue.maxLagMs)) ? Number(value.queue.maxLagMs) : 0,
        warningLagMs: Number.isFinite(Number(value.queue.warningLagMs))
          ? Number(value.queue.warningLagMs)
          : 0,
        criticalLagMs: Number.isFinite(Number(value.queue.criticalLagMs))
          ? Number(value.queue.criticalLagMs)
          : 0,
      }
    : null;
  const workers = Array.isArray(value.workers)
    ? value.workers
        .filter((worker) => isPlainObject(worker))
        .map((worker) => ({
          id: typeof worker.id === "string" ? worker.id : "",
          workerId: typeof worker.workerId === "string" ? worker.workerId : "",
          status: typeof worker.status === "string" ? worker.status : "unknown",
          jobTypes: Array.isArray(worker.jobTypes)
            ? worker.jobTypes.filter((jobType) => typeof jobType === "string")
            : [],
          queueDepth: Number.isFinite(Number(worker.queueDepth)) ? Number(worker.queueDepth) : 0,
          queueLagMs: Number.isFinite(Number(worker.queueLagMs)) ? Number(worker.queueLagMs) : 0,
          ageMs: Number.isFinite(Number(worker.ageMs)) ? Number(worker.ageMs) : null,
          lastSeenAt: typeof worker.lastSeenAt === "string" ? worker.lastSeenAt : "",
        }))
        .filter((worker) => worker.workerId)
    : [];
  return {
    status: typeof value.status === "string" ? value.status : "unknown",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
    workerCount: Number.isFinite(Number(value.workerCount)) ? Number(value.workerCount) : workers.length,
    activeWorkerCount: Number.isFinite(Number(value.activeWorkerCount))
      ? Number(value.activeWorkerCount)
      : 0,
    staleWorkerCount: Number.isFinite(Number(value.staleWorkerCount))
      ? Number(value.staleWorkerCount)
      : 0,
    workers,
    queue,
    policy: isPlainObject(value.policy) ? value.policy : {},
    disclaimer: typeof value.disclaimer === "string" ? value.disclaimer : "",
  };
}

function sanitizeQueuedJobs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isPlainObject(item))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      userId: typeof item.userId === "string" ? item.userId : "",
      jobType: typeof item.jobType === "string" ? item.jobType : "",
      status: typeof item.status === "string" ? item.status : "queued",
      priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 5,
      attempts: Number.isFinite(Number(item.attempts)) ? Number(item.attempts) : 0,
      maxAttempts: Number.isFinite(Number(item.maxAttempts)) ? Number(item.maxAttempts) : 3,
      scheduledFor: typeof item.scheduledFor === "string" ? item.scheduledFor : "",
      nextRetryAt: typeof item.nextRetryAt === "string" ? item.nextRetryAt : "",
      lastError: isPlainObject(item.lastError)
        ? {
            code: typeof item.lastError.code === "string" ? item.lastError.code : "",
            message: typeof item.lastError.message === "string" ? item.lastError.message : "",
          }
        : { code: "", message: "" },
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    }))
    .filter((item) => item.id && item.jobType);
}

function sanitizeSchedulerQueueState(value) {
  if (!isPlainObject(value)) return null;
  const summary = isPlainObject(value.summary)
    ? {
        total: Number.isFinite(Number(value.summary.total)) ? Number(value.summary.total) : 0,
        queued: Number.isFinite(Number(value.summary.queued)) ? Number(value.summary.queued) : 0,
        retrying: Number.isFinite(Number(value.summary.retrying)) ? Number(value.summary.retrying) : 0,
        running: Number.isFinite(Number(value.summary.running)) ? Number(value.summary.running) : 0,
        failed: Number.isFinite(Number(value.summary.failed)) ? Number(value.summary.failed) : 0,
        completed: Number.isFinite(Number(value.summary.completed))
          ? Number(value.summary.completed)
          : 0,
        due: Number.isFinite(Number(value.summary.due)) ? Number(value.summary.due) : 0,
        nextDueAt: typeof value.summary.nextDueAt === "string" ? value.summary.nextDueAt : "",
      }
    : { total: 0, queued: 0, retrying: 0, running: 0, failed: 0, completed: 0, due: 0, nextDueAt: "" };
  const alerts = Array.isArray(value.alerts)
    ? value.alerts
        .filter((alert) => isPlainObject(alert))
        .map((alert) => ({
          severity: typeof alert.severity === "string" ? alert.severity : "info",
          code: typeof alert.code === "string" ? alert.code : "",
          message: typeof alert.message === "string" ? alert.message : "",
        }))
        .filter((alert) => alert.code || alert.message)
    : [];
  return {
    status: typeof value.status === "string" ? value.status : "unknown",
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : "",
    summary,
    alerts,
    items: sanitizeQueuedJobs(value.items),
    retryPolicy: isPlainObject(value.retryPolicy) ? value.retryPolicy : {},
    disclaimer: typeof value.disclaimer === "string" ? value.disclaimer : "",
  };
}

function sanitizeSchedulerProviderAdapterStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const selectedProvider =
    typeof value.selectedProvider === "string" && value.selectedProvider.trim()
      ? value.selectedProvider.trim()
      : "";
  const configured = value.configured === true;
  const supported = value.supported !== false;
  const canUseBackgroundWorkers = value.canUseBackgroundWorkers === true;
  const queuePolicy = isPlainObject(value.queuePolicy)
    ? {
        status: typeof value.queuePolicy.status === "string" ? value.queuePolicy.status : "unknown",
        retryBackoff:
          typeof value.queuePolicy.retryBackoff === "string"
            ? value.queuePolicy.retryBackoff
            : "unknown",
        maxAttempts: Number.isFinite(Number(value.queuePolicy.maxAttempts))
          ? Number(value.queuePolicy.maxAttempts)
          : 0,
        workerHeartbeatSeconds: Number.isFinite(Number(value.queuePolicy.workerHeartbeatSeconds))
          ? Number(value.queuePolicy.workerHeartbeatSeconds)
          : 0,
        requiresIdempotencyKey: value.queuePolicy.requiresIdempotencyKey === true,
        deadLetterQueueRequired: value.queuePolicy.deadLetterQueueRequired === true,
      }
    : null;
  const runSafetyPolicy = isPlainObject(value.runSafetyPolicy)
    ? {
        status:
          typeof value.runSafetyPolicy.status === "string"
            ? value.runSafetyPolicy.status
            : "unknown",
        requiresCronSignature: value.runSafetyPolicy.requiresCronSignature === true,
        limitsConcurrentRuns: value.runSafetyPolicy.limitsConcurrentRuns === true,
        recordsJobLag: value.runSafetyPolicy.recordsJobLag === true,
        blocksOverlappingRuns: value.runSafetyPolicy.blocksOverlappingRuns === true,
        requiresAuditTrail: value.runSafetyPolicy.requiresAuditTrail === true,
      }
    : null;
  const schedulerGate = isPlainObject(value.schedulerGate)
    ? {
        status:
          typeof value.schedulerGate.status === "string" ? value.schedulerGate.status : "unknown",
        canUseBackgroundWorkers: value.schedulerGate.canUseBackgroundWorkers === true,
        checks: Array.isArray(value.schedulerGate.checks)
          ? value.schedulerGate.checks
              .filter((check) => isPlainObject(check))
              .map((check) => ({
                id: typeof check.id === "string" ? check.id : "",
                status: typeof check.status === "string" ? check.status : "unknown",
              }))
              .filter((check) => check.id)
          : [],
        blockedReasons: Array.isArray(value.schedulerGate.blockedReasons)
          ? value.schedulerGate.blockedReasons.filter(
              (reason) => typeof reason === "string" && reason.trim(),
            )
          : [],
      }
    : null;
  const endpointContracts = Array.isArray(value.endpointContracts)
    ? value.endpointContracts
        .filter((contract) => isPlainObject(contract))
        .map((contract) => ({
          id: typeof contract.id === "string" ? contract.id : "",
          method: typeof contract.method === "string" ? contract.method : "",
          status: typeof contract.status === "string" ? contract.status : "unknown",
        }))
        .filter((contract) => contract.id)
    : [];
  const scheduleContracts = Array.isArray(value.scheduleContracts)
    ? value.scheduleContracts
        .filter((schedule) => isPlainObject(schedule))
        .map((schedule) => ({
          id: typeof schedule.id === "string" ? schedule.id : "",
          jobType: typeof schedule.jobType === "string" ? schedule.jobType : "",
          cadence: typeof schedule.cadence === "string" ? schedule.cadence : "",
          status: typeof schedule.status === "string" ? schedule.status : "unknown",
        }))
        .filter((schedule) => schedule.id && schedule.jobType)
    : [];
  const missingEnvVars = Array.isArray(value.missingEnvVars)
    ? value.missingEnvVars.filter((name) => typeof name === "string")
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    selectedProvider,
    configured,
    supported,
    canUseBackgroundWorkers,
    queuePolicy,
    runSafetyPolicy,
    schedulerGate,
    endpointContracts,
    scheduleContracts,
    missingEnvVars,
    safety,
    blockedReasons,
    disclaimer,
  };
}

function sanitizeRepositoryStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名数据仓储";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const persistenceMode =
    typeof value.persistenceMode === "string" && value.persistenceMode.trim()
      ? value.persistenceMode.trim()
      : "unknown";
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const limits = isPlainObject(value.limits) ? value.limits : {};
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return { id, name, mode, status, persistenceMode, capabilities, limits, disclaimer };
}

function sanitizeDatabaseMigrationSqlDraft(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const dialect =
    typeof value.dialect === "string" && value.dialect.trim() ? value.dialect.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const destructive = value.destructive === true;
  const reviewRequired = value.reviewRequired !== false;
  const statementCount = Number.isFinite(Number(value.statementCount))
    ? Number(value.statementCount)
    : 0;
  const checksum =
    typeof value.checksum === "string" && value.checksum.trim() ? value.checksum.trim() : "";
  const preview = Array.isArray(value.preview)
    ? value.preview.filter((statement) => typeof statement === "string" && statement.trim())
    : [];
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((warning) => typeof warning === "string" && warning.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    dialect,
    status,
    destructive,
    reviewRequired,
    statementCount,
    checksum,
    preview,
    warnings,
    disclaimer,
  };
}

function sanitizeDatabaseMigrationPackage(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const version =
    typeof value.version === "string" && value.version.trim() ? value.version.trim() : "";
  const generatedAt =
    typeof value.generatedAt === "string" && value.generatedAt.trim()
      ? value.generatedAt.trim()
      : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const canExecute = value.canExecute === true;
  const executionMode =
    typeof value.executionMode === "string" && value.executionMode.trim()
      ? value.executionMode.trim()
      : "";
  const targetDialect =
    typeof value.targetDialect === "string" && value.targetDialect.trim()
      ? value.targetDialect.trim()
      : "";
  const manifest = isPlainObject(value.manifest) ? value.manifest : {};
  const manifestChecksum =
    typeof value.manifestChecksum === "string" && value.manifestChecksum.trim()
      ? value.manifestChecksum.trim()
      : "";
  const preflightChecks = Array.isArray(value.preflightChecks)
    ? value.preflightChecks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          label: typeof check.label === "string" ? check.label : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          message: typeof check.message === "string" ? check.message : "",
          requiredForExecution: check.requiredForExecution === true,
        }))
        .filter((check) => check.id)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const pendingApprovals = Array.isArray(value.pendingApprovals)
    ? value.pendingApprovals.filter((approval) => typeof approval === "string" && approval.trim())
    : [];
  const releaseGates = Array.isArray(value.releaseGates)
    ? value.releaseGates.filter((gate) => typeof gate === "string" && gate.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    version,
    generatedAt,
    status,
    canExecute,
    executionMode,
    targetDialect,
    manifest,
    manifestChecksum,
    preflightChecks,
    blockedReasons,
    pendingApprovals,
    releaseGates,
    disclaimer,
  };
}

function sanitizeDatabaseReadOnlyConnectionHealth(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "read-only-health";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const provider =
    typeof value.provider === "string" && value.provider.trim() ? value.provider.trim() : "";
  const driver = isPlainObject(value.driver) ? value.driver : {};
  const connection = isPlainObject(value.connection) ? value.connection : {};
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          message: typeof check.message === "string" ? check.message : "",
        }))
        .filter((check) => check.id)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((warning) => typeof warning === "string" && warning.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    provider,
    driver,
    connection,
    safety,
    checks,
    blockedReasons,
    warnings,
    nextSteps,
    disclaimer,
  };
}

function sanitizeDatabaseDriverSetupPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const targetDriver =
    typeof value.targetDriver === "string" && value.targetDriver.trim()
      ? value.targetDriver.trim()
      : "";
  const packageManager =
    typeof value.packageManager === "string" && value.packageManager.trim()
      ? value.packageManager.trim()
      : "";
  const installCommand =
    typeof value.installCommand === "string" && value.installCommand.trim()
      ? value.installCommand.trim()
      : "";
  const canInstallAutomatically = value.canInstallAutomatically === true;
  const canConnectAutomatically = value.canConnectAutomatically === true;
  const envVars = Array.isArray(value.envVars)
    ? value.envVars
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          name: typeof entry.name === "string" ? entry.name : "",
          required: entry.required === true,
          configured: entry.configured === true,
          secret: entry.secret === true,
          value: typeof entry.value === "string" ? entry.value : "",
          purpose: typeof entry.purpose === "string" ? entry.purpose : "",
        }))
        .filter((entry) => entry.name)
    : [];
  const configChecks = Array.isArray(value.configChecks)
    ? value.configChecks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
        }))
        .filter((check) => check.id)
    : [];
  const secretPolicy = Array.isArray(value.secretPolicy)
    ? value.secretPolicy.filter((item) => typeof item === "string" && item.trim())
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    status,
    targetDriver,
    packageManager,
    installCommand,
    canInstallAutomatically,
    canConnectAutomatically,
    envVars,
    configChecks,
    secretPolicy,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeDatabaseRepositoryAdapterPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const targetAdapter =
    typeof value.targetAdapter === "string" && value.targetAdapter.trim()
      ? value.targetAdapter.trim()
      : "";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const canSwitchAutomatically = value.canSwitchAutomatically === true;
  const mockFallbackRequired = value.mockFallbackRequired !== false;
  const methodPlan = isPlainObject(value.methodPlan) ? value.methodPlan : {};
  const dataDomains = Array.isArray(value.dataDomains)
    ? value.dataDomains
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          domain: typeof entry.domain === "string" ? entry.domain : "",
          table: typeof entry.table === "string" ? entry.table : "",
          methods: Array.isArray(entry.methods)
            ? entry.methods.filter((method) => typeof method === "string")
            : [],
        }))
        .filter((entry) => entry.domain && entry.table)
    : [];
  const switchGates = Array.isArray(value.switchGates)
    ? value.switchGates
        .filter((gate) => isPlainObject(gate))
        .map((gate) => ({
          id: typeof gate.id === "string" ? gate.id : "",
          status: typeof gate.status === "string" ? gate.status : "unknown",
          message: typeof gate.message === "string" ? gate.message : "",
          required: gate.required === true,
        }))
        .filter((gate) => gate.id)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const pendingApprovals = Array.isArray(value.pendingApprovals)
    ? value.pendingApprovals.filter((approval) => typeof approval === "string" && approval.trim())
    : [];
  const implementationSteps = Array.isArray(value.implementationSteps)
    ? value.implementationSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const rollbackPlan = Array.isArray(value.rollbackPlan)
    ? value.rollbackPlan.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    status,
    targetAdapter,
    runtimeMode,
    canSwitchAutomatically,
    mockFallbackRequired,
    methodPlan,
    dataDomains,
    switchGates,
    blockedReasons,
    pendingApprovals,
    implementationSteps,
    rollbackPlan,
    disclaimer,
  };
}

function sanitizeDatabaseRepositoryRuntimeGuard(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const requestedMode =
    typeof value.requestedMode === "string" && value.requestedMode.trim()
      ? value.requestedMode.trim()
      : "mock";
  const effectiveMode =
    typeof value.effectiveMode === "string" && value.effectiveMode.trim()
      ? value.effectiveMode.trim()
      : "mock";
  const currentMode =
    typeof value.currentMode === "string" && value.currentMode.trim()
      ? value.currentMode.trim()
      : effectiveMode;
  const allowedModes = Array.isArray(value.allowedModes)
    ? value.allowedModes.filter((mode) => typeof mode === "string" && mode.trim())
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    status,
    requestedMode,
    effectiveMode,
    currentMode,
    allowedModes,
    activeRepositoryId:
      typeof value.activeRepositoryId === "string" ? value.activeRepositoryId : "",
    fallbackRepositoryId:
      typeof value.fallbackRepositoryId === "string" ? value.fallbackRepositoryId : "",
    canUseRequestedMode: value.canUseRequestedMode === true,
    canSwitchAutomatically: value.canSwitchAutomatically === true,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryAdapter(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : "Production Repository Adapter";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const driver = isPlainObject(value.driver) ? value.driver : {};
  const methodCoverage = isPlainObject(value.methodCoverage) ? value.methodCoverage : {};
  const tableCoverage = Array.isArray(value.tableCoverage)
    ? value.tableCoverage
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          table: typeof entry.table === "string" ? entry.table : "",
          operationCount: Number.isFinite(Number(entry.operationCount))
            ? Number(entry.operationCount)
            : 0,
          writeOperationCount: Number.isFinite(Number(entry.writeOperationCount))
            ? Number(entry.writeOperationCount)
            : 0,
          domains: Array.isArray(entry.domains)
            ? entry.domains.filter((domain) => typeof domain === "string")
            : [],
        }))
        .filter((entry) => entry.table)
    : [];
  const operationContracts = Array.isArray(value.operationContracts)
    ? value.operationContracts
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          method: typeof entry.method === "string" ? entry.method : "",
          table: typeof entry.table === "string" ? entry.table : "",
          status: typeof entry.status === "string" ? entry.status : "unknown",
          accessPattern: typeof entry.accessPattern === "string" ? entry.accessPattern : "",
          transactionRequired: entry.transactionRequired === true,
        }))
        .filter((entry) => entry.method)
    : [];
  const transactionPolicy = isPlainObject(value.transactionPolicy) ? value.transactionPolicy : {};
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const implementationSteps = Array.isArray(value.implementationSteps)
    ? value.implementationSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    status,
    runtimeMode,
    driver,
    methodCoverage,
    tableCoverage,
    operationContracts,
    transactionPolicy,
    safety,
    blockedReasons,
    implementationSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositorySmokeTest(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "read-only-smoke-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const driver = isPlainObject(value.driver) ? value.driver : {};
  const connection = isPlainObject(value.connection) ? value.connection : {};
  const coverage = isPlainObject(value.coverage) ? value.coverage : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const smokeQueries = Array.isArray(value.smokeQueries)
    ? value.smokeQueries
        .filter((query) => isPlainObject(query))
        .map((query) => ({
          id: typeof query.id === "string" ? query.id : "",
          statement: typeof query.statement === "string" ? query.statement : "",
          expected: typeof query.expected === "string" ? query.expected : "",
          safety: typeof query.safety === "string" ? query.safety : "",
        }))
        .filter((query) => query.id)
    : [];
  const criticalTables = Array.isArray(value.criticalTables)
    ? value.criticalTables.filter((table) => typeof table === "string" && table.trim())
    : [];
  const blockedStatements = Array.isArray(value.blockedStatements)
    ? value.blockedStatements.filter((statement) => typeof statement === "string" && statement.trim())
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canExecuteAutomatically: value.canExecuteAutomatically === true,
    driver,
    connection,
    coverage,
    checks,
    smokeQueries,
    criticalTables,
    blockedStatements,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositorySqlContract(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "parameterized-sql-contract";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const statements = Array.isArray(value.statements)
    ? value.statements
        .filter((statement) => isPlainObject(statement))
        .map((statement) => ({
          id: typeof statement.id === "string" ? statement.id : "",
          method: typeof statement.method === "string" ? statement.method : "",
          domain: typeof statement.domain === "string" ? statement.domain : "",
          table: typeof statement.table === "string" ? statement.table : "",
          accessMode: typeof statement.accessMode === "string" ? statement.accessMode : "",
          accessPattern: typeof statement.accessPattern === "string" ? statement.accessPattern : "",
          transactionRequired: statement.transactionRequired === true,
          auditRequired: statement.auditRequired === true,
          parameterStyle: typeof statement.parameterStyle === "string" ? statement.parameterStyle : "",
          placeholderCount: Number.isFinite(Number(statement.placeholderCount))
            ? Number(statement.placeholderCount)
            : 0,
          statement: typeof statement.statement === "string" ? statement.statement : "",
          resultShape: typeof statement.resultShape === "string" ? statement.resultShape : "",
          status: typeof statement.status === "string" ? statement.status : "unknown",
        }))
        .filter((statement) => statement.method)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const tableWhitelist = Array.isArray(value.tableWhitelist)
    ? value.tableWhitelist.filter((table) => typeof table === "string" && table.trim())
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    dialect: typeof value.dialect === "string" ? value.dialect : "",
    statementCount: Number.isFinite(Number(value.statementCount)) ? Number(value.statementCount) : 0,
    writeStatementCount: Number.isFinite(Number(value.writeStatementCount))
      ? Number(value.writeStatementCount)
      : 0,
    readStatementCount: Number.isFinite(Number(value.readStatementCount))
      ? Number(value.readStatementCount)
      : 0,
    tableWhitelist,
    statements,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryExecutionPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "transaction-audit-execution-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const coverage = isPlainObject(value.coverage) ? value.coverage : {};
  const transactionWrapper = isPlainObject(value.transactionWrapper)
    ? value.transactionWrapper
    : {};
  const auditWritePolicy = isPlainObject(value.auditWritePolicy) ? value.auditWritePolicy : {};
  const parameterValidators = Array.isArray(value.parameterValidators)
    ? value.parameterValidators
        .filter((validator) => isPlainObject(validator))
        .map((validator) => ({
          id: typeof validator.id === "string" ? validator.id : "",
          method: typeof validator.method === "string" ? validator.method : "",
          parameterName: typeof validator.parameterName === "string" ? validator.parameterName : "",
          type: typeof validator.type === "string" ? validator.type : "",
          required: validator.required === true,
          status: typeof validator.status === "string" ? validator.status : "unknown",
        }))
        .filter((validator) => validator.id)
    : [];
  const executionSteps = Array.isArray(value.executionSteps)
    ? value.executionSteps
        .filter((step) => isPlainObject(step))
        .map((step) => ({
          id: typeof step.id === "string" ? step.id : "",
          status: typeof step.status === "string" ? step.status : "unknown",
          required: step.required === true,
        }))
        .filter((step) => step.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canExecuteSql: value.canExecuteSql === true,
    canOpenConnection: value.canOpenConnection === true,
    coverage,
    transactionWrapper,
    auditWritePolicy,
    parameterValidators,
    executionSteps,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryParameterValidationPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "local-parameter-validation-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const validatorTypes = Array.isArray(value.validatorTypes)
    ? value.validatorTypes.filter((type) => typeof type === "string" && type.trim())
    : [];
  const validators = Array.isArray(value.validators)
    ? value.validators
        .filter((validator) => isPlainObject(validator))
        .map((validator) => ({
          id: typeof validator.id === "string" ? validator.id : "",
          method: typeof validator.method === "string" ? validator.method : "",
          parameterName: typeof validator.parameterName === "string" ? validator.parameterName : "",
          type: typeof validator.type === "string" ? validator.type : "",
          required: validator.required === true,
          status: typeof validator.status === "string" ? validator.status : "unknown",
        }))
        .filter((validator) => validator.id)
    : [];
  const sampleValidationResults = Array.isArray(value.sampleValidationResults)
    ? value.sampleValidationResults
        .filter((result) => isPlainObject(result))
        .map((result) => ({
          id: typeof result.id === "string" ? result.id : "",
          validatorType: typeof result.validatorType === "string" ? result.validatorType : "",
          parameterName: typeof result.parameterName === "string" ? result.parameterName : "",
          accepted: result.accepted === true,
          errorCode: typeof result.errorCode === "string" ? result.errorCode : "",
          redactedSample: typeof result.redactedSample === "string" ? result.redactedSample : "",
        }))
        .filter((result) => result.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canValidateLocally: value.canValidateLocally === true,
    canExecuteSql: value.canExecuteSql === true,
    validatorCount: Number.isFinite(Number(value.validatorCount)) ? Number(value.validatorCount) : 0,
    validatorTypes,
    validators,
    sampleValidationResults,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryConnectionPoolPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "connection-pool-transaction-wrapper-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const driver = isPlainObject(value.driver) ? value.driver : {};
  const connection = isPlainObject(value.connection) ? value.connection : {};
  const poolConfig = isPlainObject(value.poolConfig) ? value.poolConfig : {};
  const transactionWrapper = isPlainObject(value.transactionWrapper)
    ? value.transactionWrapper
    : {};
  const lifecycleSteps = Array.isArray(value.lifecycleSteps)
    ? value.lifecycleSteps
        .filter((step) => isPlainObject(step))
        .map((step) => ({
          id: typeof step.id === "string" ? step.id : "",
          status: typeof step.status === "string" ? step.status : "unknown",
          required: step.required === true,
        }))
        .filter((step) => step.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canOpenConnection: value.canOpenConnection === true,
    canExecuteSql: value.canExecuteSql === true,
    driver,
    connection,
    poolConfig,
    transactionWrapper,
    lifecycleSteps,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositorySqlExecutorPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "parameter-binding-result-mapping-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const bindingCoverage = isPlainObject(value.bindingCoverage) ? value.bindingCoverage : {};
  const executableStatements = Array.isArray(value.executableStatements)
    ? value.executableStatements
        .filter((statement) => isPlainObject(statement))
        .map((statement) => ({
          id: typeof statement.id === "string" ? statement.id : "",
          method: typeof statement.method === "string" ? statement.method : "",
          table: typeof statement.table === "string" ? statement.table : "",
          accessMode: typeof statement.accessMode === "string" ? statement.accessMode : "",
          parameterBindingStyle:
            typeof statement.parameterBindingStyle === "string"
              ? statement.parameterBindingStyle
              : "",
          resultShape: typeof statement.resultShape === "string" ? statement.resultShape : "",
          status: typeof statement.status === "string" ? statement.status : "unknown",
        }))
        .filter((statement) => statement.id)
    : [];
  const executorLifecycle = Array.isArray(value.executorLifecycle)
    ? value.executorLifecycle
        .filter((step) => isPlainObject(step))
        .map((step) => ({
          id: typeof step.id === "string" ? step.id : "",
          status: typeof step.status === "string" ? step.status : "unknown",
          required: step.required === true,
        }))
        .filter((step) => step.id)
    : [];
  const auditEnvelope = isPlainObject(value.auditEnvelope) ? value.auditEnvelope : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canExecuteSql: value.canExecuteSql === true,
    canOpenConnection: value.canOpenConnection === true,
    statementCount: Number.isFinite(Number(value.statementCount)) ? Number(value.statementCount) : 0,
    writeStatementCount: Number.isFinite(Number(value.writeStatementCount))
      ? Number(value.writeStatementCount)
      : 0,
    readStatementCount: Number.isFinite(Number(value.readStatementCount))
      ? Number(value.readStatementCount)
      : 0,
    bindingCoverage,
    executableStatements,
    executorLifecycle,
    auditEnvelope,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryResultAuditPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "result-mapping-audit-envelope-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const resultShapes = Array.isArray(value.resultShapes)
    ? value.resultShapes.filter((shape) => typeof shape === "string" && shape.trim())
    : [];
  const mappings = Array.isArray(value.mappings)
    ? value.mappings
        .filter((mapping) => isPlainObject(mapping))
        .map((mapping) => ({
          id: typeof mapping.id === "string" ? mapping.id : "",
          method: typeof mapping.method === "string" ? mapping.method : "",
          table: typeof mapping.table === "string" ? mapping.table : "",
          resultShape: typeof mapping.resultShape === "string" ? mapping.resultShape : "",
          mappingMode: typeof mapping.mappingMode === "string" ? mapping.mappingMode : "",
          emptyResultPolicy:
            typeof mapping.emptyResultPolicy === "string" ? mapping.emptyResultPolicy : "",
          rawRowsLogged: mapping.rawRowsLogged === true,
          status: typeof mapping.status === "string" ? mapping.status : "unknown",
        }))
        .filter((mapping) => mapping.id)
    : [];
  const auditEnvelope = isPlainObject(value.auditEnvelope) ? value.auditEnvelope : {};
  const auditValidationSamples = Array.isArray(value.auditValidationSamples)
    ? value.auditValidationSamples
        .filter((sample) => isPlainObject(sample))
        .map((sample) => ({
          id: typeof sample.id === "string" ? sample.id : "",
          accepted: sample.accepted === true,
          blockedFields: Array.isArray(sample.blockedFields)
            ? sample.blockedFields.filter((field) => typeof field === "string")
            : [],
        }))
        .filter((sample) => sample.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canMapLiveRows: value.canMapLiveRows === true,
    canWriteAudit: value.canWriteAudit === true,
    mappingCount: Number.isFinite(Number(value.mappingCount)) ? Number(value.mappingCount) : 0,
    resultShapes,
    mappings,
    auditEnvelope,
    auditValidationSamples,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryReadRehearsalPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "staging-readonly-query-rehearsal-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const coverage = isPlainObject(value.coverage) ? value.coverage : {};
  const rehearsalWindow = isPlainObject(value.rehearsalWindow) ? value.rehearsalWindow : {};
  const sampleQueries = Array.isArray(value.sampleQueries)
    ? value.sampleQueries
        .filter((query) => isPlainObject(query))
        .map((query) => ({
          id: typeof query.id === "string" ? query.id : "",
          method: typeof query.method === "string" ? query.method : "",
          table: typeof query.table === "string" ? query.table : "",
          resultShape: typeof query.resultShape === "string" ? query.resultShape : "",
          expectedMapping: typeof query.expectedMapping === "string" ? query.expectedMapping : "",
          maxRows: Number.isFinite(Number(query.maxRows)) ? Number(query.maxRows) : 0,
          readOnlyTransaction: query.readOnlyTransaction === true,
          status: typeof query.status === "string" ? query.status : "unknown",
        }))
        .filter((query) => query.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canRunStagingReads: value.canRunStagingReads === true,
    canRunProductionReads: value.canRunProductionReads === true,
    canWriteData: value.canWriteData === true,
    readOnlyRehearsalEnabled: value.readOnlyRehearsalEnabled === true,
    coverage,
    rehearsalWindow,
    sampleQueries,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryParityPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "dual-read-parity-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const parityWindow = isPlainObject(value.parityWindow) ? value.parityWindow : {};
  const comparisonPlan = Array.isArray(value.comparisonPlan)
    ? value.comparisonPlan
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          domain: typeof entry.domain === "string" ? entry.domain : "",
          table: typeof entry.table === "string" ? entry.table : "",
          methods: Array.isArray(entry.methods)
            ? entry.methods.filter((method) => typeof method === "string")
            : [],
          keyStrategy: typeof entry.keyStrategy === "string" ? entry.keyStrategy : "",
          status: typeof entry.status === "string" ? entry.status : "unknown",
        }))
        .filter((entry) => entry.domain)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const ignoredFields = Array.isArray(value.ignoredFields)
    ? value.ignoredFields.filter((field) => typeof field === "string" && field.trim())
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canCompareAutomatically: value.canCompareAutomatically === true,
    mockRepositoryRequired: value.mockRepositoryRequired === true,
    productionRepositoryRequired: value.productionRepositoryRequired === true,
    parityWindow,
    comparisonPlan,
    ignoredFields,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryParityEvidencePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "dual-read-parity-evidence-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const evidenceCoverage = isPlainObject(value.evidenceCoverage) ? value.evidenceCoverage : {};
  const evidenceRecords = Array.isArray(value.evidenceRecords)
    ? value.evidenceRecords
        .filter((record) => isPlainObject(record))
        .map((record) => ({
          id: typeof record.id === "string" ? record.id : "",
          domain: typeof record.domain === "string" ? record.domain : "",
          table: typeof record.table === "string" ? record.table : "",
          methods: Array.isArray(record.methods)
            ? record.methods.filter((method) => typeof method === "string")
            : [],
          keyStrategy: typeof record.keyStrategy === "string" ? record.keyStrategy : "",
          sampleScope: typeof record.sampleScope === "string" ? record.sampleScope : "",
          expectedOutcome:
            typeof record.expectedOutcome === "string" ? record.expectedOutcome : "",
          status: typeof record.status === "string" ? record.status : "unknown",
        }))
        .filter((record) => record.id)
    : [];
  const mismatchCategories = Array.isArray(value.mismatchCategories)
    ? value.mismatchCategories
        .filter((category) => isPlainObject(category))
        .map((category) => ({
          id: typeof category.id === "string" ? category.id : "",
          severity: typeof category.severity === "string" ? category.severity : "",
          action: typeof category.action === "string" ? category.action : "",
        }))
        .filter((category) => category.id)
    : [];
  const auditEnvelope = isPlainObject(value.auditEnvelope) ? value.auditEnvelope : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canCaptureEvidence: value.canCaptureEvidence === true,
    canReadProductionData: value.canReadProductionData === true,
    canWriteData: value.canWriteData === true,
    evidenceCoverage,
    evidenceRecords,
    mismatchCategories,
    auditEnvelope,
    checks,
    safety,
    blockedReasons,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryDualWritePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "dual-write-rehearsal-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const rehearsalWindow = isPlainObject(value.rehearsalWindow) ? value.rehearsalWindow : {};
  const writePlan = Array.isArray(value.writePlan)
    ? value.writePlan
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          domain: typeof entry.domain === "string" ? entry.domain : "",
          table: typeof entry.table === "string" ? entry.table : "",
          methods: Array.isArray(entry.methods)
            ? entry.methods.filter((method) => typeof method === "string")
            : [],
          transactionRequired: entry.transactionRequired === true,
          auditRequired: entry.auditRequired === true,
          status: typeof entry.status === "string" ? entry.status : "unknown",
        }))
        .filter((entry) => entry.domain)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canWriteAutomatically: value.canWriteAutomatically === true,
    canSwitchAutomatically: value.canSwitchAutomatically === true,
    mockPrimaryRequired: value.mockPrimaryRequired === true,
    productionShadowWriteOnly: value.productionShadowWriteOnly === true,
    rehearsalWindow,
    writePlan,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryShadowWriteEvidencePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "shadow-write-evidence-idempotency-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const evidenceCoverage = isPlainObject(value.evidenceCoverage) ? value.evidenceCoverage : {};
  const evidenceRecords = Array.isArray(value.evidenceRecords)
    ? value.evidenceRecords
        .filter((record) => isPlainObject(record))
        .map((record) => ({
          id: typeof record.id === "string" ? record.id : "",
          domain: typeof record.domain === "string" ? record.domain : "",
          table: typeof record.table === "string" ? record.table : "",
          methods: Array.isArray(record.methods)
            ? record.methods.filter((method) => typeof method === "string")
            : [],
          transactionRequired: record.transactionRequired === true,
          auditRequired: record.auditRequired === true,
          idempotencyKeyRequired: record.idempotencyKeyRequired === true,
          expectedOutcome:
            typeof record.expectedOutcome === "string" ? record.expectedOutcome : "",
          status: typeof record.status === "string" ? record.status : "unknown",
        }))
        .filter((record) => record.id)
    : [];
  const idempotencyPolicy = isPlainObject(value.idempotencyPolicy) ? value.idempotencyPolicy : {};
  const auditEnvelope = isPlainObject(value.auditEnvelope) ? value.auditEnvelope : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canWriteProduction: value.canWriteProduction === true,
    canChangeUserVisibleData: value.canChangeUserVisibleData === true,
    canSwitchRuntime: value.canSwitchRuntime === true,
    evidenceCoverage,
    evidenceRecords,
    idempotencyPolicy,
    auditEnvelope,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryBackupRestoreEvidencePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "backup-restore-rehearsal-evidence-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const recoveryObjectives = isPlainObject(value.recoveryObjectives)
    ? value.recoveryObjectives
    : {};
  const evidenceCoverage = isPlainObject(value.evidenceCoverage) ? value.evidenceCoverage : {};
  const criticalTables = Array.isArray(value.criticalTables)
    ? value.criticalTables.filter((table) => typeof table === "string" && table.trim())
    : [];
  const rehearsalArtifacts = Array.isArray(value.rehearsalArtifacts)
    ? value.rehearsalArtifacts
        .filter((artifact) => isPlainObject(artifact))
        .map((artifact) => ({
          id: typeof artifact.id === "string" ? artifact.id : "",
          artifactType:
            typeof artifact.artifactType === "string" ? artifact.artifactType : "",
          required: artifact.required === true,
          encrypted: artifact.encrypted === true,
          checksumRequired: artifact.checksumRequired === true,
          status: typeof artifact.status === "string" ? artifact.status : "unknown",
        }))
        .filter((artifact) => artifact.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canRunBackup: value.canRunBackup === true,
    canRunRestore: value.canRunRestore === true,
    canTouchProductionData: value.canTouchProductionData === true,
    backupRestoreVerified: value.backupRestoreVerified === true,
    recoveryObjectives,
    evidenceCoverage,
    criticalTables,
    rehearsalArtifacts,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryCutoverMonitoringEvidencePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "cutover-monitoring-evidence-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const monitoringWindow = isPlainObject(value.monitoringWindow) ? value.monitoringWindow : {};
  const evidenceCoverage = isPlainObject(value.evidenceCoverage) ? value.evidenceCoverage : {};
  const monitoredTables = Array.isArray(value.monitoredTables)
    ? value.monitoredTables.filter((table) => typeof table === "string" && table.trim())
    : [];
  const metricProbes = Array.isArray(value.metricProbes)
    ? value.metricProbes
        .filter((probe) => isPlainObject(probe))
        .map((probe) => ({
          id: typeof probe.id === "string" ? probe.id : "",
          signal: typeof probe.signal === "string" ? probe.signal : "",
          threshold: typeof probe.threshold === "string" ? probe.threshold : "",
          rollbackOnBreach: probe.rollbackOnBreach === true,
          status: typeof probe.status === "string" ? probe.status : "unknown",
        }))
        .filter((probe) => probe.id)
    : [];
  const alertRoutes = Array.isArray(value.alertRoutes)
    ? value.alertRoutes
        .filter((route) => isPlainObject(route))
        .map((route) => ({
          id: typeof route.id === "string" ? route.id : "",
          channel: typeof route.channel === "string" ? route.channel : "",
          required: route.required === true,
          status: typeof route.status === "string" ? route.status : "unknown",
        }))
        .filter((route) => route.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canStartMonitoring: value.canStartMonitoring === true,
    canReadProductionMetrics: value.canReadProductionMetrics === true,
    canSwitchRuntime: value.canSwitchRuntime === true,
    monitoringVerified: value.monitoringVerified === true,
    monitoringWindow,
    evidenceCoverage,
    monitoredTables,
    metricProbes,
    alertRoutes,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryRollbackRehearsalEvidencePlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "rollback-rehearsal-evidence-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const rollbackObjectives = isPlainObject(value.rollbackObjectives)
    ? value.rollbackObjectives
    : {};
  const evidenceCoverage = isPlainObject(value.evidenceCoverage) ? value.evidenceCoverage : {};
  const rollbackTables = Array.isArray(value.rollbackTables)
    ? value.rollbackTables.filter((table) => typeof table === "string" && table.trim())
    : [];
  const rollbackPaths = Array.isArray(value.rollbackPaths)
    ? value.rollbackPaths
        .filter((path) => isPlainObject(path))
        .map((path) => ({
          id: typeof path.id === "string" ? path.id : "",
          action: typeof path.action === "string" ? path.action : "",
          expectedDurationMinutes:
            typeof path.expectedDurationMinutes === "number"
              ? path.expectedDurationMinutes
              : null,
          status: typeof path.status === "string" ? path.status : "unknown",
        }))
        .filter((path) => path.id)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canRollbackRuntime: value.canRollbackRuntime === true,
    canReplayWrites: value.canReplayWrites === true,
    canTouchProductionData: value.canTouchProductionData === true,
    rollbackVerified: value.rollbackVerified === true,
    rollbackObjectives,
    evidenceCoverage,
    rollbackTables,
    rollbackPaths,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    nextSteps,
    disclaimer,
  };
}

function sanitizeProductionRepositoryCutoverPlan(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode =
    typeof value.mode === "string" && value.mode.trim()
      ? value.mode.trim()
      : "feature-flag-cutover-plan";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const runtimeMode =
    typeof value.runtimeMode === "string" && value.runtimeMode.trim()
      ? value.runtimeMode.trim()
      : "inactive";
  const featureFlag = isPlainObject(value.featureFlag) ? value.featureFlag : {};
  const cutoverWindow = isPlainObject(value.cutoverWindow) ? value.cutoverWindow : {};
  const checks = Array.isArray(value.checks)
    ? value.checks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          required: check.required === true,
        }))
        .filter((check) => check.id)
    : [];
  const safety = isPlainObject(value.safety) ? value.safety : {};
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const rollbackTriggers = Array.isArray(value.rollbackTriggers)
    ? value.rollbackTriggers.filter((trigger) => typeof trigger === "string" && trigger.trim())
    : [];
  const rollbackPlan = Array.isArray(value.rollbackPlan)
    ? value.rollbackPlan.filter((step) => typeof step === "string" && step.trim())
    : [];
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    mode,
    status,
    runtimeMode,
    canSwitchAutomatically: value.canSwitchAutomatically === true,
    canWriteAutomatically: value.canWriteAutomatically === true,
    featureFlag,
    cutoverWindow,
    checks,
    safety,
    blockedReasons,
    rollbackTriggers,
    rollbackPlan,
    nextSteps,
    disclaimer,
  };
}

function sanitizeDatabaseMigrationDryRun(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "";
  const mode = typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "dry-run";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const provider =
    typeof value.provider === "string" && value.provider.trim() ? value.provider.trim() : "";
  const tableOrder = Array.isArray(value.tableOrder)
    ? value.tableOrder.filter((table) => typeof table === "string" && table.trim())
    : [];
  const tablePlan = Array.isArray(value.tablePlan)
    ? value.tablePlan
        .filter((entry) => isPlainObject(entry))
        .map((entry) => ({
          order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 0,
          table: typeof entry.table === "string" ? entry.table : "",
          dependsOn: Array.isArray(entry.dependsOn)
            ? entry.dependsOn.filter((table) => typeof table === "string")
            : [],
          domains: Array.isArray(entry.domains)
            ? entry.domains.filter((domain) => typeof domain === "string")
            : [],
          action: typeof entry.action === "string" ? entry.action : "",
          status: typeof entry.status === "string" ? entry.status : "unknown",
        }))
        .filter((entry) => entry.table)
    : [];
  const steps = Array.isArray(value.steps)
    ? value.steps
        .filter((step) => isPlainObject(step))
        .map((step) => ({
          id: typeof step.id === "string" ? step.id : "",
          status: typeof step.status === "string" ? step.status : "unknown",
        }))
        .filter((step) => step.id)
    : [];
  const blockedReasons = Array.isArray(value.blockedReasons)
    ? value.blockedReasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((warning) => typeof warning === "string" && warning.trim())
    : [];
  const rollbackPlan = Array.isArray(value.rollbackPlan)
    ? value.rollbackPlan.filter((item) => typeof item === "string" && item.trim())
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";
  const migrationSqlDraft = sanitizeDatabaseMigrationSqlDraft(value.migrationSqlDraft);

  return {
    id,
    mode,
    status,
    provider,
    tableOrder,
    tablePlan,
    steps,
    blockedReasons,
    warnings,
    rollbackPlan,
    migrationSqlDraft,
    disclaimer,
  };
}

function sanitizeDatabaseStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名数据库服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const activeStorage =
    typeof value.activeStorage === "string" && value.activeStorage.trim()
      ? value.activeStorage.trim()
      : "unknown";
  const repositoryId =
    typeof value.repositoryId === "string" && value.repositoryId.trim()
      ? value.repositoryId.trim()
      : "unknown";
  const migrationPhase =
    typeof value.migrationPhase === "string" && value.migrationPhase.trim()
      ? value.migrationPhase.trim()
      : "unknown";
  const plannedTables = Array.isArray(value.plannedTables)
    ? [
        ...new Set(
          value.plannedTables
            .filter((table) => typeof table === "string" && table.trim())
            .map((table) => table.trim()),
        ),
      ]
    : [];
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const missingProductionCapabilities = Array.isArray(value.missingProductionCapabilities)
    ? [
        ...new Set(
          value.missingProductionCapabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const repositoryContract = isPlainObject(value.repositoryContract)
    ? {
        version:
          typeof value.repositoryContract.version === "string"
            ? value.repositoryContract.version
            : "",
        status:
          typeof value.repositoryContract.status === "string"
            ? value.repositoryContract.status
            : "unknown",
        missingMethods: Array.isArray(value.repositoryContract.missingMethods)
          ? value.repositoryContract.missingMethods.filter((method) => typeof method === "string")
          : [],
        tableMappings: Array.isArray(value.repositoryContract.tableMappings)
          ? value.repositoryContract.tableMappings
              .filter((mapping) => isPlainObject(mapping))
              .map((mapping) => ({
                domain: typeof mapping.domain === "string" ? mapping.domain : "",
                table: typeof mapping.table === "string" ? mapping.table : "",
              }))
              .filter((mapping) => mapping.domain && mapping.table)
          : [],
      }
    : null;
  const productionAdapter = isPlainObject(value.productionAdapter)
    ? {
        id: typeof value.productionAdapter.id === "string" ? value.productionAdapter.id : "",
        name: typeof value.productionAdapter.name === "string" ? value.productionAdapter.name : "",
        status:
          typeof value.productionAdapter.status === "string"
            ? value.productionAdapter.status
            : "unknown",
        provider:
          typeof value.productionAdapter.provider === "string"
            ? value.productionAdapter.provider
            : "",
        sslMode:
          typeof value.productionAdapter.sslMode === "string"
            ? value.productionAdapter.sslMode
            : "",
        fallback: isPlainObject(value.productionAdapter.fallback)
          ? value.productionAdapter.fallback
          : {},
        connection: isPlainObject(value.productionAdapter.connection)
          ? value.productionAdapter.connection
          : {},
        migrationPlan: isPlainObject(value.productionAdapter.migrationPlan)
          ? value.productionAdapter.migrationPlan
          : {},
        migrationDryRun: sanitizeDatabaseMigrationDryRun(value.productionAdapter.migrationDryRun),
        migrationSqlDraft: sanitizeDatabaseMigrationSqlDraft(value.productionAdapter.migrationSqlDraft),
        migrationPackage: sanitizeDatabaseMigrationPackage(value.productionAdapter.migrationPackage),
        readOnlyConnectionHealth: sanitizeDatabaseReadOnlyConnectionHealth(
          value.productionAdapter.readOnlyConnectionHealth,
        ),
        driverSetupPlan: sanitizeDatabaseDriverSetupPlan(value.productionAdapter.driverSetupPlan),
        repositoryAdapterPlan: sanitizeDatabaseRepositoryAdapterPlan(
          value.productionAdapter.repositoryAdapterPlan,
        ),
        repositoryRuntimeGuard: sanitizeDatabaseRepositoryRuntimeGuard(
          value.productionAdapter.repositoryRuntimeGuard,
        ),
        productionRepositoryAdapter: sanitizeProductionRepositoryAdapter(
          value.productionAdapter.productionRepositoryAdapter,
        ),
        productionRepositorySmokeTest: sanitizeProductionRepositorySmokeTest(
          value.productionAdapter.productionRepositorySmokeTest,
        ),
        productionRepositorySqlContract: sanitizeProductionRepositorySqlContract(
          value.productionAdapter.productionRepositorySqlContract,
        ),
        productionRepositoryExecutionPlan: sanitizeProductionRepositoryExecutionPlan(
          value.productionAdapter.productionRepositoryExecutionPlan,
        ),
        productionRepositoryParameterValidationPlan:
          sanitizeProductionRepositoryParameterValidationPlan(
            value.productionAdapter.productionRepositoryParameterValidationPlan,
          ),
        productionRepositoryConnectionPoolPlan:
          sanitizeProductionRepositoryConnectionPoolPlan(
            value.productionAdapter.productionRepositoryConnectionPoolPlan,
          ),
        productionRepositorySqlExecutorPlan:
          sanitizeProductionRepositorySqlExecutorPlan(
            value.productionAdapter.productionRepositorySqlExecutorPlan,
          ),
        productionRepositoryResultAuditPlan:
          sanitizeProductionRepositoryResultAuditPlan(
            value.productionAdapter.productionRepositoryResultAuditPlan,
          ),
        productionRepositoryReadRehearsalPlan:
          sanitizeProductionRepositoryReadRehearsalPlan(
            value.productionAdapter.productionRepositoryReadRehearsalPlan,
          ),
        productionRepositoryParityPlan: sanitizeProductionRepositoryParityPlan(
          value.productionAdapter.productionRepositoryParityPlan,
        ),
        productionRepositoryParityEvidencePlan:
          sanitizeProductionRepositoryParityEvidencePlan(
            value.productionAdapter.productionRepositoryParityEvidencePlan,
          ),
        productionRepositoryDualWritePlan: sanitizeProductionRepositoryDualWritePlan(
          value.productionAdapter.productionRepositoryDualWritePlan,
        ),
        productionRepositoryShadowWriteEvidencePlan:
          sanitizeProductionRepositoryShadowWriteEvidencePlan(
            value.productionAdapter.productionRepositoryShadowWriteEvidencePlan,
          ),
        productionRepositoryBackupRestoreEvidencePlan:
          sanitizeProductionRepositoryBackupRestoreEvidencePlan(
            value.productionAdapter.productionRepositoryBackupRestoreEvidencePlan,
          ),
        productionRepositoryCutoverMonitoringEvidencePlan:
          sanitizeProductionRepositoryCutoverMonitoringEvidencePlan(
            value.productionAdapter.productionRepositoryCutoverMonitoringEvidencePlan,
          ),
        productionRepositoryRollbackRehearsalEvidencePlan:
          sanitizeProductionRepositoryRollbackRehearsalEvidencePlan(
            value.productionAdapter.productionRepositoryRollbackRehearsalEvidencePlan,
          ),
        productionRepositoryCutoverPlan: sanitizeProductionRepositoryCutoverPlan(
          value.productionAdapter.productionRepositoryCutoverPlan,
        ),
        disclaimer:
          typeof value.productionAdapter.disclaimer === "string"
            ? value.productionAdapter.disclaimer
            : "",
      }
    : null;
  const migrationDryRun = sanitizeDatabaseMigrationDryRun(
    value.migrationDryRun || productionAdapter?.migrationDryRun,
  );
  const migrationSqlDraft = sanitizeDatabaseMigrationSqlDraft(
    value.migrationSqlDraft ||
      productionAdapter?.migrationSqlDraft ||
      migrationDryRun?.migrationSqlDraft,
  );
  const migrationPackage = sanitizeDatabaseMigrationPackage(
    value.migrationPackage || productionAdapter?.migrationPackage,
  );
  const readOnlyConnectionHealth = sanitizeDatabaseReadOnlyConnectionHealth(
    value.readOnlyConnectionHealth || productionAdapter?.readOnlyConnectionHealth,
  );
  const driverSetupPlan = sanitizeDatabaseDriverSetupPlan(
    value.driverSetupPlan || productionAdapter?.driverSetupPlan,
  );
  const repositoryAdapterPlan = sanitizeDatabaseRepositoryAdapterPlan(
    value.repositoryAdapterPlan || productionAdapter?.repositoryAdapterPlan,
  );
  const repositoryRuntimeGuard = sanitizeDatabaseRepositoryRuntimeGuard(
    value.repositoryRuntimeGuard || productionAdapter?.repositoryRuntimeGuard,
  );
  const productionRepositoryAdapter = sanitizeProductionRepositoryAdapter(
    value.productionRepositoryAdapter || productionAdapter?.productionRepositoryAdapter,
  );
  const productionRepositorySmokeTest = sanitizeProductionRepositorySmokeTest(
    value.productionRepositorySmokeTest || productionAdapter?.productionRepositorySmokeTest,
  );
  const productionRepositorySqlContract = sanitizeProductionRepositorySqlContract(
    value.productionRepositorySqlContract || productionAdapter?.productionRepositorySqlContract,
  );
  const productionRepositoryExecutionPlan = sanitizeProductionRepositoryExecutionPlan(
    value.productionRepositoryExecutionPlan || productionAdapter?.productionRepositoryExecutionPlan,
  );
  const productionRepositoryParameterValidationPlan =
    sanitizeProductionRepositoryParameterValidationPlan(
      value.productionRepositoryParameterValidationPlan ||
        productionAdapter?.productionRepositoryParameterValidationPlan,
    );
  const productionRepositoryConnectionPoolPlan = sanitizeProductionRepositoryConnectionPoolPlan(
    value.productionRepositoryConnectionPoolPlan ||
      productionAdapter?.productionRepositoryConnectionPoolPlan,
  );
  const productionRepositorySqlExecutorPlan = sanitizeProductionRepositorySqlExecutorPlan(
    value.productionRepositorySqlExecutorPlan ||
      productionAdapter?.productionRepositorySqlExecutorPlan,
  );
  const productionRepositoryResultAuditPlan = sanitizeProductionRepositoryResultAuditPlan(
    value.productionRepositoryResultAuditPlan ||
      productionAdapter?.productionRepositoryResultAuditPlan,
  );
  const productionRepositoryReadRehearsalPlan = sanitizeProductionRepositoryReadRehearsalPlan(
    value.productionRepositoryReadRehearsalPlan ||
      productionAdapter?.productionRepositoryReadRehearsalPlan,
  );
  const productionRepositoryParityPlan = sanitizeProductionRepositoryParityPlan(
    value.productionRepositoryParityPlan || productionAdapter?.productionRepositoryParityPlan,
  );
  const productionRepositoryParityEvidencePlan = sanitizeProductionRepositoryParityEvidencePlan(
    value.productionRepositoryParityEvidencePlan ||
      productionAdapter?.productionRepositoryParityEvidencePlan,
  );
  const productionRepositoryDualWritePlan = sanitizeProductionRepositoryDualWritePlan(
    value.productionRepositoryDualWritePlan || productionAdapter?.productionRepositoryDualWritePlan,
  );
  const productionRepositoryShadowWriteEvidencePlan =
    sanitizeProductionRepositoryShadowWriteEvidencePlan(
      value.productionRepositoryShadowWriteEvidencePlan ||
        productionAdapter?.productionRepositoryShadowWriteEvidencePlan,
    );
  const productionRepositoryBackupRestoreEvidencePlan =
    sanitizeProductionRepositoryBackupRestoreEvidencePlan(
      value.productionRepositoryBackupRestoreEvidencePlan ||
        productionAdapter?.productionRepositoryBackupRestoreEvidencePlan,
    );
  const productionRepositoryCutoverMonitoringEvidencePlan =
    sanitizeProductionRepositoryCutoverMonitoringEvidencePlan(
      value.productionRepositoryCutoverMonitoringEvidencePlan ||
        productionAdapter?.productionRepositoryCutoverMonitoringEvidencePlan,
    );
  const productionRepositoryRollbackRehearsalEvidencePlan =
    sanitizeProductionRepositoryRollbackRehearsalEvidencePlan(
      value.productionRepositoryRollbackRehearsalEvidencePlan ||
        productionAdapter?.productionRepositoryRollbackRehearsalEvidencePlan,
    );
  const productionRepositoryCutoverPlan = sanitizeProductionRepositoryCutoverPlan(
    value.productionRepositoryCutoverPlan || productionAdapter?.productionRepositoryCutoverPlan,
  );
  const migrationChecks = Array.isArray(value.migrationChecks)
    ? value.migrationChecks
        .filter((check) => isPlainObject(check))
        .map((check) => ({
          id: typeof check.id === "string" ? check.id : "",
          label: typeof check.label === "string" ? check.label : "",
          status: typeof check.status === "string" ? check.status : "unknown",
          description: typeof check.description === "string" ? check.description : "",
        }))
        .filter((check) => check.id)
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    activeStorage,
    repositoryId,
    migrationPhase,
    plannedTables,
    capabilities,
    missingProductionCapabilities,
    repositoryContract,
    productionAdapter,
    migrationDryRun,
    migrationSqlDraft,
    migrationPackage,
    readOnlyConnectionHealth,
    driverSetupPlan,
    repositoryAdapterPlan,
    repositoryRuntimeGuard,
    productionRepositoryAdapter,
    productionRepositorySmokeTest,
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
    productionRepositoryCutoverPlan,
    migrationChecks,
    disclaimer,
  };
}

function sanitizeAuditServiceStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名审计服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const storageMode =
    typeof value.storageMode === "string" && value.storageMode.trim()
      ? value.storageMode.trim()
      : "unknown";
  const retentionPolicy = isPlainObject(value.retentionPolicy) ? value.retentionPolicy : {};
  const maintenancePolicy = isPlainObject(value.maintenancePolicy)
    ? {
        retentionPurgeSupported: value.maintenancePolicy.retentionPurgeSupported === true,
        manualPurgeSupported: value.maintenancePolicy.manualPurgeSupported === true,
        exportPackageSupported: value.maintenancePolicy.exportPackageSupported === true,
        auditTrailRequired: value.maintenancePolicy.auditTrailRequired === true,
        rechainAfterPurge: value.maintenancePolicy.rechainAfterPurge === true,
        disclaimer:
          typeof value.maintenancePolicy.disclaimer === "string"
            ? value.maintenancePolicy.disclaimer
            : "",
      }
    : null;
  const redactionPolicy = isPlainObject(value.redactionPolicy) ? value.redactionPolicy : {};
  const signingPolicy = isPlainObject(value.signingPolicy)
    ? {
        status:
          typeof value.signingPolicy.status === "string" && value.signingPolicy.status.trim()
            ? value.signingPolicy.status.trim()
            : "unknown",
        algorithm:
          typeof value.signingPolicy.algorithm === "string" &&
          value.signingPolicy.algorithm.trim()
            ? value.signingPolicy.algorithm.trim()
            : "",
        canonicalization:
          typeof value.signingPolicy.canonicalization === "string" &&
          value.signingPolicy.canonicalization.trim()
            ? value.signingPolicy.canonicalization.trim()
            : "",
        signingSecretConfigured: value.signingPolicy.signingSecretConfigured === true,
        signedExportsSupported: value.signingPolicy.signedExportsSupported === true,
        required: value.signingPolicy.required === true,
        keyId:
          typeof value.signingPolicy.keyId === "string" && value.signingPolicy.keyId.trim()
            ? value.signingPolicy.keyId.trim()
            : "",
        secretEnv:
          typeof value.signingPolicy.secretEnv === "string" && value.signingPolicy.secretEnv.trim()
            ? value.signingPolicy.secretEnv.trim()
            : "",
        keyIdEnv:
          typeof value.signingPolicy.keyIdEnv === "string" && value.signingPolicy.keyIdEnv.trim()
            ? value.signingPolicy.keyIdEnv.trim()
            : "",
        disclaimer:
          typeof value.signingPolicy.disclaimer === "string"
            ? value.signingPolicy.disclaimer
            : "",
      }
    : null;
  const downloadAuthorizationPolicy = isPlainObject(value.downloadAuthorizationPolicy)
    ? {
        status:
          typeof value.downloadAuthorizationPolicy.status === "string" &&
          value.downloadAuthorizationPolicy.status.trim()
            ? value.downloadAuthorizationPolicy.status.trim()
            : "unknown",
        requiresPrivilegedRole:
          value.downloadAuthorizationPolicy.requiresPrivilegedRole === true,
        allowedRoles: Array.isArray(value.downloadAuthorizationPolicy.allowedRoles)
          ? value.downloadAuthorizationPolicy.allowedRoles
              .filter((role) => typeof role === "string" && role.trim())
              .map((role) => role.trim())
          : [],
        roleSource:
          typeof value.downloadAuthorizationPolicy.roleSource === "string"
            ? value.downloadAuthorizationPolicy.roleSource
            : "",
        enforcementEnv:
          typeof value.downloadAuthorizationPolicy.enforcementEnv === "string"
            ? value.downloadAuthorizationPolicy.enforcementEnv
            : "",
        disclaimer:
          typeof value.downloadAuthorizationPolicy.disclaimer === "string"
            ? value.downloadAuthorizationPolicy.disclaimer
            : "",
      }
    : null;
  const integrity = isPlainObject(value.integrity)
    ? {
        status:
          typeof value.integrity.status === "string" && value.integrity.status.trim()
            ? value.integrity.status.trim()
            : "unknown",
        eventCount: Number.isFinite(Number(value.integrity.eventCount))
          ? Number(value.integrity.eventCount)
          : 0,
        latestHash:
          typeof value.integrity.latestHash === "string" && value.integrity.latestHash.trim()
            ? value.integrity.latestHash.trim()
            : "",
        algorithm:
          typeof value.integrity.algorithm === "string" && value.integrity.algorithm.trim()
            ? value.integrity.algorithm.trim()
            : "",
        brokenEvents: Array.isArray(value.integrity.brokenEvents)
          ? value.integrity.brokenEvents.filter((event) => isPlainObject(event))
          : [],
      }
    : null;
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const missingProductionCapabilities = Array.isArray(value.missingProductionCapabilities)
    ? [
        ...new Set(
          value.missingProductionCapabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    storageMode,
    retentionPolicy,
    maintenancePolicy,
    redactionPolicy,
    signingPolicy,
    downloadAuthorizationPolicy,
    integrity,
    capabilities,
    missingProductionCapabilities,
    disclaimer,
  };
}

function sanitizeComplianceServiceStatus(value) {
  if (!isPlainObject(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : "unknown";
  const name =
    typeof value.name === "string" && value.name.trim() ? value.name.trim() : "未命名合规服务";
  const mode =
    typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : "unknown";
  const status =
    typeof value.status === "string" && value.status.trim() ? value.status.trim() : "unknown";
  const reviewMode =
    typeof value.reviewMode === "string" && value.reviewMode.trim()
      ? value.reviewMode.trim()
      : "unknown";
  const requiredDisclaimer =
    typeof value.requiredDisclaimer === "string" && value.requiredDisclaimer.trim()
      ? value.requiredDisclaimer.trim()
      : "";
  const prohibitedClaims = Array.isArray(value.prohibitedClaims)
    ? value.prohibitedClaims.filter((claim) => typeof claim === "string" && claim.trim())
    : [];
  const outputPolicy = isPlainObject(value.outputPolicy) ? value.outputPolicy : {};
  const acknowledgementPolicy = isPlainObject(value.acknowledgementPolicy)
    ? value.acknowledgementPolicy
    : {};
  const suitabilityPolicy = isPlainObject(value.suitabilityPolicy)
    ? value.suitabilityPolicy
    : {};
  const complianceGate = isPlainObject(value.complianceGate)
    ? {
        status:
          typeof value.complianceGate.status === "string" && value.complianceGate.status.trim()
            ? value.complianceGate.status.trim()
            : "unknown",
        canReleasePublicAnalysis: value.complianceGate.canReleasePublicAnalysis === true,
        checks: Array.isArray(value.complianceGate.checks)
          ? value.complianceGate.checks
              .filter((check) => isPlainObject(check))
              .map((check) => ({
                id: typeof check.id === "string" ? check.id : "",
                status: typeof check.status === "string" ? check.status : "unknown",
              }))
              .filter((check) => check.id)
          : [],
        blockedReasons: Array.isArray(value.complianceGate.blockedReasons)
          ? value.complianceGate.blockedReasons.filter(
              (reason) => typeof reason === "string" && reason.trim(),
            )
          : [],
      }
    : null;
  const capabilities = Array.isArray(value.capabilities)
    ? [
        ...new Set(
          value.capabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const missingProductionCapabilities = Array.isArray(value.missingProductionCapabilities)
    ? [
        ...new Set(
          value.missingProductionCapabilities
            .filter((capability) => typeof capability === "string" && capability.trim())
            .map((capability) => capability.trim()),
        ),
      ]
    : [];
  const disclaimer =
    typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "";

  return {
    id,
    name,
    mode,
    status,
    reviewMode,
    requiredDisclaimer,
    prohibitedClaims,
    outputPolicy,
    acknowledgementPolicy,
    suitabilityPolicy,
    complianceGate,
    capabilities,
    missingProductionCapabilities,
    disclaimer,
  };
}

function sanitizeComplianceAcknowledgements(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((record) => isPlainObject(record))
    .map((record) => ({
      id: typeof record.id === "string" ? record.id : "",
      userId: typeof record.userId === "string" ? record.userId : "",
      version: typeof record.version === "string" ? record.version : "",
      acceptedDisclaimer: record.acceptedDisclaimer === true,
      riskAcknowledged: record.riskAcknowledged === true,
      optionalPortfolioNoticeAcknowledged: record.optionalPortfolioNoticeAcknowledged === true,
      source: typeof record.source === "string" ? record.source : "",
      acceptedAt: typeof record.acceptedAt === "string" ? record.acceptedAt : "",
      disclaimer: typeof record.disclaimer === "string" ? record.disclaimer : "",
    }))
    .filter((record) => record.id && record.acceptedDisclaimer && record.riskAcknowledged);
}

function sanitizeSuitabilityQuestionnaires(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((record) => isPlainObject(record))
    .map((record) => {
      const answers = isPlainObject(record.answers) ? record.answers : {};
      const score = Number(record.score);
      return {
        id: typeof record.id === "string" ? record.id : "",
        userId: typeof record.userId === "string" ? record.userId : "",
        version: typeof record.version === "string" ? record.version : "",
        answers: {
          riskTolerance: typeof answers.riskTolerance === "string" ? answers.riskTolerance : "",
          investmentExperience:
            typeof answers.investmentExperience === "string" ? answers.investmentExperience : "",
          investmentHorizon:
            typeof answers.investmentHorizon === "string" ? answers.investmentHorizon : "",
          liquidityNeed: typeof answers.liquidityNeed === "string" ? answers.liquidityNeed : "",
        },
        score: Number.isFinite(score) ? score : 0,
        suitabilityLevel:
          typeof record.suitabilityLevel === "string" ? record.suitabilityLevel : "",
        levelLabel: typeof record.levelLabel === "string" ? record.levelLabel : "",
        completedAt: typeof record.completedAt === "string" ? record.completedAt : "",
        disclaimer: typeof record.disclaimer === "string" ? record.disclaimer : "",
      };
    })
    .filter((record) => record.id && record.version);
}

function sanitizeWatchlist(value) {
  if (!Array.isArray(value)) return [];
  const validCodes = new Set(stocks.map((stock) => stock.code));
  return [...new Set(value.filter((code) => validCodes.has(code)))];
}

function normalizeWatchlistItems(items) {
  if (!Array.isArray(items)) return [];
  return sanitizeWatchlist(
    items
      .map((item) => {
        if (typeof item === "string") return item;
        if (isPlainObject(item) && typeof item.code === "string") return item.code;
        return "";
      })
      .filter(Boolean),
  );
}

function sanitizeNotifications(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, enabled]) => typeof enabled === "boolean"),
  );
}

function sanitizeAuditArchiveReceipts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((receipt) => isPlainObject(receipt))
    .map((receipt) => ({
      id: typeof receipt.id === "string" ? receipt.id : "",
      exportId: typeof receipt.exportId === "string" ? receipt.exportId : "",
      status: typeof receipt.status === "string" ? receipt.status : "unknown",
      accepted: receipt.accepted === true,
      immutable: receipt.immutable === true,
      archiveMode: typeof receipt.archiveMode === "string" ? receipt.archiveMode : "",
      packageChecksum: typeof receipt.packageChecksum === "string" ? receipt.packageChecksum : "",
      signatureStatus: typeof receipt.signatureStatus === "string" ? receipt.signatureStatus : "",
      verificationStatus:
        typeof receipt.verificationStatus === "string" ? receipt.verificationStatus : "",
      reasons: Array.isArray(receipt.reasons)
        ? receipt.reasons.filter((reason) => typeof reason === "string")
        : [],
      archivedAt: typeof receipt.archivedAt === "string" ? receipt.archivedAt : "",
    }))
    .filter((receipt) => receipt.id && receipt.exportId);
}

function sanitizeReminderRules(value) {
  if (!Array.isArray(value)) return [];
  const validCodes = new Set(stocks.map((stock) => stock.code));
  return value
    .filter((rule) => isPlainObject(rule))
    .map((rule) => ({
      id: typeof rule.id === "string" && rule.id ? rule.id : `local-${Date.now()}`,
      code: validCodes.has(rule.code) ? rule.code : "",
      type: validReminderTypes.includes(rule.type) ? rule.type : "priceAbove",
      threshold: typeof rule.threshold === "string" ? rule.threshold : String(rule.threshold || ""),
      channels: Array.isArray(rule.channels)
        ? [
            ...new Set(
              rule.channels.filter((channel) => notificationChannelIds.includes(channel)),
            ),
          ]
        : [],
      source: rule.source === "backend" ? "backend" : "local",
    }))
    .filter((rule) => rule.code && rule.threshold.trim());
}

function sanitizePortfolio(value) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    ["buyPrice", "holdingQty", "buyDate", "targetReturn", "maxLoss"].map((key) => [
      key,
      typeof value[key] === "string" ? value[key] : "",
    ]),
  );
}

function sanitizeRecentSearches(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((keyword) => typeof keyword === "string" && keyword.trim())
        .map((keyword) => keyword.trim()),
    ),
  ].slice(0, 5);
}

function sanitizeNotificationItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isPlainObject(item) && typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      ruleId: typeof item.ruleId === "string" ? item.ruleId : "",
      code: typeof item.code === "string" ? item.code : "",
      type: typeof item.type === "string" ? item.type : "",
      channel: typeof item.channel === "string" ? item.channel : "inApp",
      status: item.status === "read" ? "read" : "queued",
      title: typeof item.title === "string" ? item.title : "提醒通知",
      body: typeof item.body === "string" ? item.body : "",
      deliveryStatus: ["queued", "delivered", "failed"].includes(item.deliveryStatus)
        ? item.deliveryStatus
        : "queued",
      attemptCount: Number.isFinite(Number(item.attemptCount)) ? Number(item.attemptCount) : 0,
      deliveryError: typeof item.deliveryError === "string" ? item.deliveryError : "",
      nextRetryAt: typeof item.nextRetryAt === "string" ? item.nextRetryAt : "",
      deliveredAt: typeof item.deliveredAt === "string" ? item.deliveredAt : "",
      deliveryAttempts: Array.isArray(item.deliveryAttempts)
        ? item.deliveryAttempts
            .filter((attempt) => isPlainObject(attempt))
            .map((attempt) => ({
              id: typeof attempt.id === "string" ? attempt.id : "",
              status: typeof attempt.status === "string" ? attempt.status : "",
              attemptedAt: typeof attempt.attemptedAt === "string" ? attempt.attemptedAt : "",
              message: typeof attempt.message === "string" ? attempt.message : "",
              errorCode: typeof attempt.errorCode === "string" ? attempt.errorCode : "",
            }))
        : [],
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      readAt: typeof item.readAt === "string" ? item.readAt : "",
    }));
}

function sanitizeNewsIntelligenceRecords(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isPlainObject(item) && typeof item.title === "string")
    .map((item) => {
      const source = isPlainObject(item.source) ? item.source : {};
      const importanceScore = Number(item.importanceScore);
      const sourceCredibilityScore = Number(item.sourceCredibilityScore);
      return {
        id: typeof item.id === "string" ? item.id : "",
        market: validMarkets.includes(item.market) ? item.market : "",
        symbol:
          typeof item.symbol === "string"
            ? item.symbol
            : typeof item.code === "string"
              ? item.code
              : "",
        title: item.title,
        sourceLabel:
          typeof source.label === "string"
            ? source.label
            : typeof item.source === "string"
              ? item.source
              : "未知来源",
        importanceScore: Number.isFinite(importanceScore) ? importanceScore : 0,
        sourceCredibilityScore: Number.isFinite(sourceCredibilityScore)
          ? sourceCredibilityScore
          : 0,
        scoreVersion: typeof item.scoreVersion === "string" ? item.scoreVersion : "",
        deduplicationVersion:
          typeof item.deduplicationVersion === "string" ? item.deduplicationVersion : "",
        reviewStatus: typeof item.reviewStatus === "string" ? item.reviewStatus : "unreviewed",
        persistedAt: typeof item.persistedAt === "string" ? item.persistedAt : "",
      };
    });
}

function readJsonStorage(key, fallback, sanitize = (value) => value) {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) return fallback;

  try {
    return sanitize(JSON.parse(rawValue)) ?? fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

const savedMarket = sanitizeMarket(localStorage.getItem("selectedMarket"));
const savedStockCode = localStorage.getItem("selectedStockCode");
const savedStock =
  stocks.find((stock) => stock.code === savedStockCode) ||
  stocks.find((stock) => stock.market === savedMarket) ||
  stocks[0];

const state = {
  selectedMarket: savedStock.market,
  selectedStock: savedStock,
  riskProfile: sanitizeRiskProfile(localStorage.getItem("riskProfile")),
  apiMode: sanitizeApiMode(localStorage.getItem("apiMode")),
  apiBaseUrl: (localStorage.getItem("apiBaseUrl") || defaultApiBaseUrl).trim(),
  providerStatus: readJsonStorage("apiProviderStatus", null, sanitizeProviderStatus),
  marketDataRuntimeStatus: readJsonStorage(
    "apiMarketDataRuntimeStatus",
    null,
    sanitizeMarketDataRuntimeStatus,
  ),
  newsIngestionRuntimeStatus: readJsonStorage(
    "apiNewsIngestionRuntimeStatus",
    null,
    sanitizeNewsIngestionRuntimeStatus,
  ),
  aiServiceStatus: readJsonStorage("apiAiServiceStatus", null, sanitizeAiServiceStatus),
  complianceServiceStatus: readJsonStorage(
    "apiComplianceServiceStatus",
    null,
    sanitizeComplianceServiceStatus,
  ),
  authServiceStatus: readJsonStorage("apiAuthServiceStatus", null, sanitizeAuthServiceStatus),
  notificationServiceStatus: readJsonStorage(
    "apiNotificationServiceStatus",
    null,
    sanitizeNotificationServiceStatus,
  ),
  jobRunnerStatus: readJsonStorage("apiJobRunnerStatus", null, sanitizeJobRunnerStatus),
  schedulerStatus: readJsonStorage("apiSchedulerStatus", null, sanitizeSchedulerStatus),
  deadLetterJobs: readJsonStorage("schedulerDeadLetterJobs", [], sanitizeDeadLetterJobs),
  workerHealth: readJsonStorage("schedulerWorkerHealth", null, sanitizeWorkerHealth),
  schedulerQueueState: readJsonStorage(
    "schedulerQueueState",
    null,
    sanitizeSchedulerQueueState,
  ),
  schedulerMaintenanceStatus: "",
  schedulerMaintenanceMessage: "",
  repositoryStatus: readJsonStorage("apiRepositoryStatus", null, sanitizeRepositoryStatus),
  databaseStatus: readJsonStorage("apiDatabaseStatus", null, sanitizeDatabaseStatus),
  auditServiceStatus: readJsonStorage("apiAuditServiceStatus", null, sanitizeAuditServiceStatus),
  auditMaintenanceStatus: "",
  auditMaintenanceMessage: "",
  auditExportStatus: "",
  auditExportMessage: "",
  auditVerificationStatus: "",
  auditVerificationMessage: "",
  auditArchiveStatus: "",
  auditArchiveMessage: "",
  auditArchiveReceipts: [],
  auditDownloadStatus: "",
  auditDownloadMessage: "",
  auditReplayStatus: "",
  auditReplayMessage: "",
  lastAuditExportPackage: null,
  watchlist: readJsonStorage("watchlist", [], sanitizeWatchlist),
  notifications: readJsonStorage("notifications", {}, sanitizeNotifications),
  reminderRules: readJsonStorage("reminderRules", [], sanitizeReminderRules),
  notificationItems: [],
  newsIntelligenceRecords: readJsonStorage(
    "newsIntelligenceRecords",
    [],
    sanitizeNewsIntelligenceRecords,
  ),
  complianceAcknowledgements: readJsonStorage(
    "complianceAcknowledgements",
    [],
    sanitizeComplianceAcknowledgements,
  ),
  suitabilityQuestionnaires: readJsonStorage(
    "suitabilityQuestionnaires",
    [],
    sanitizeSuitabilityQuestionnaires,
  ),
  complianceAcknowledgementStatus: "",
  complianceAcknowledgementMessage: "",
  suitabilityStatus: "",
  suitabilityMessage: "",
  newsIntelligenceStatus: "",
  newsIntelligenceMessage: "",
  deadLetterStatus: "",
  deadLetterMessage: "",
  workerHealthStatus: "",
  workerHealthMessage: "",
  schedulerQueueStatus: "",
  schedulerQueueMessage: "",
  portfolio: readJsonStorage("portfolio", {}, sanitizePortfolio),
  recentSearches: readJsonStorage("recentSearches", [], sanitizeRecentSearches),
  analysisStock: null,
  authToken: localStorage.getItem("apiAuthToken") || "",
  authUser: readJsonStorage("apiAuthUser", null, sanitizeAuthUser),
  authRoleStatus: "",
  authRoleMessage: "",
  adminRoleStatus: "",
  adminRoleMessage: "",
  adminRoleHistoryStatus: "",
  adminRoleHistoryMessage: "",
  adminRoleHistory: [],
  portfolioSyncStatus: "",
  portfolioSyncMessage: "",
};

const elements = {
  stockSearch: document.querySelector("#stockSearch"),
  searchButton: document.querySelector("#searchButton"),
  statusMessage: document.querySelector("#statusMessage"),
  suggestionChips: document.querySelector("#suggestionChips"),
  recentSearchBlock: document.querySelector("#recentSearchBlock"),
  recentSearchChips: document.querySelector("#recentSearchChips"),
  riskProfile: document.querySelector("#riskProfile"),
  selectedStockName: document.querySelector("#selectedStockName"),
  impactBadge: document.querySelector("#impactBadge"),
  upsideRing: document.querySelector("#upsideRing"),
  upsideValue: document.querySelector("#upsideValue"),
  downsideValue: document.querySelector("#downsideValue"),
  sentimentScore: document.querySelector("#sentimentScore"),
  valuationScore: document.querySelector("#valuationScore"),
  technicalScore: document.querySelector("#technicalScore"),
  actionText: document.querySelector("#actionText"),
  tradePlan: document.querySelector("#tradePlan"),
  trendSummary: document.querySelector("#trendSummary"),
  trendSource: document.querySelector("#trendSource"),
  trendChart: document.querySelector("#trendChart"),
  scenarioAnalysis: document.querySelector("#scenarioAnalysis"),
  analysisState: document.querySelector("#analysisState"),
  reasonList: document.querySelector("#reasonList"),
  factorBreakdown: document.querySelector("#factorBreakdown"),
  analysisBasis: document.querySelector("#analysisBasis"),
  riskBox: document.querySelector("#riskBox"),
  riskText: document.querySelector("#riskText"),
  newsTitle: document.querySelector("#newsTitle"),
  newsList: document.querySelector("#newsList"),
  addWatchButton: document.querySelector("#addWatchButton"),
  watchlistItems: document.querySelector("#watchlistItems"),
  watchlistHint: document.querySelector("#watchlistHint"),
  dataSourceState: document.querySelector("#dataSourceState"),
  aiServiceState: document.querySelector("#aiServiceState"),
  complianceServiceState: document.querySelector("#complianceServiceState"),
  repositoryState: document.querySelector("#repositoryState"),
  databaseState: document.querySelector("#databaseState"),
  auditServiceState: document.querySelector("#auditServiceState"),
  jobRunnerState: document.querySelector("#jobRunnerState"),
  schedulerState: document.querySelector("#schedulerState"),
  accountState: document.querySelector("#accountState"),
  notificationStatus: document.querySelector("#notificationStatus"),
  notificationChannelState: document.querySelector("#notificationChannelState"),
  notificationInputs: document.querySelectorAll("[data-notification]"),
  notificationServiceState: document.querySelector("#notificationServiceState"),
  reminderForm: document.querySelector("#reminderForm"),
  reminderStock: document.querySelector("#reminderStock"),
  reminderType: document.querySelector("#reminderType"),
  reminderThreshold: document.querySelector("#reminderThreshold"),
  reminderRules: document.querySelector("#reminderRules"),
  notificationCenter: document.querySelector("#notificationCenter"),
  portfolioForm: document.querySelector("#portfolioForm"),
  buyPrice: document.querySelector("#buyPrice"),
  holdingQty: document.querySelector("#holdingQty"),
  buyDate: document.querySelector("#buyDate"),
  targetReturn: document.querySelector("#targetReturn"),
  maxLoss: document.querySelector("#maxLoss"),
  portfolioSyncState: document.querySelector("#portfolioSyncState"),
  portfolioSummary: document.querySelector("#portfolioSummary"),
  termDialog: document.querySelector("#termDialog"),
  termTitle: document.querySelector("#termTitle"),
  termBody: document.querySelector("#termBody"),
  closeTermDialog: document.querySelector("#closeTermDialog"),
  installButton: document.querySelector("#installButton"),
};

function getMarketName(market) {
  return { a: "A 股", hk: "港股", us: "美股" }[market];
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function getProfileAdjustment() {
  return {
    conservative: { upside: -6, sentiment: -6, valuation: 4, technical: -3 },
    aggressive: { upside: 6, sentiment: 5, valuation: -2, technical: 5 },
    balanced: { upside: 0, sentiment: 0, valuation: 0, technical: 0 },
  }[sanitizeRiskProfile(state.riskProfile)];
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parsePositiveNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function persistSelection() {
  localStorage.setItem("selectedMarket", state.selectedMarket);
  localStorage.setItem("selectedStockCode", state.selectedStock.code);
}

function showStatus(message, tone = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message is-visible ${tone}`;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => {
    elements.statusMessage.className = "status-message";
    elements.statusMessage.textContent = "";
  }, 3200);
}

function getApiConfig() {
  const savedBaseUrl = (localStorage.getItem("apiBaseUrl") || state.apiBaseUrl || defaultApiBaseUrl).trim();
  return {
    mode: sanitizeApiMode(localStorage.getItem("apiMode") || state.apiMode),
    baseUrl: savedBaseUrl.replace(/\/+$/, "") || defaultApiBaseUrl,
  };
}

function shouldUseBackendDataSource() {
  const config = getApiConfig();
  return config.mode === "backend" && localStorage.getItem("apiHealthStatus") === "connected";
}

function getProviderStatus() {
  return state.providerStatus || readJsonStorage("apiProviderStatus", null, sanitizeProviderStatus);
}

function getMarketDataRuntimeStatus() {
  return (
    state.marketDataRuntimeStatus ||
    readJsonStorage("apiMarketDataRuntimeStatus", null, sanitizeMarketDataRuntimeStatus)
  );
}

function getNewsIngestionRuntimeStatus() {
  return (
    state.newsIngestionRuntimeStatus ||
    readJsonStorage("apiNewsIngestionRuntimeStatus", null, sanitizeNewsIngestionRuntimeStatus)
  );
}

function getAiServiceStatus() {
  return (
    state.aiServiceStatus ||
    readJsonStorage("apiAiServiceStatus", null, sanitizeAiServiceStatus)
  );
}

function getComplianceServiceStatus() {
  return (
    state.complianceServiceStatus ||
    readJsonStorage("apiComplianceServiceStatus", null, sanitizeComplianceServiceStatus)
  );
}

function getAuthServiceStatus() {
  return (
    state.authServiceStatus ||
    readJsonStorage("apiAuthServiceStatus", null, sanitizeAuthServiceStatus)
  );
}

function getNotificationServiceStatus() {
  return (
    state.notificationServiceStatus ||
    readJsonStorage("apiNotificationServiceStatus", null, sanitizeNotificationServiceStatus)
  );
}

function getJobRunnerStatus() {
  return (
    state.jobRunnerStatus ||
    readJsonStorage("apiJobRunnerStatus", null, sanitizeJobRunnerStatus)
  );
}

function getSchedulerStatus() {
  return (
    state.schedulerStatus ||
    readJsonStorage("apiSchedulerStatus", null, sanitizeSchedulerStatus)
  );
}

function getRepositoryStatus() {
  return (
    state.repositoryStatus ||
    readJsonStorage("apiRepositoryStatus", null, sanitizeRepositoryStatus)
  );
}

function getDatabaseStatus() {
  return (
    state.databaseStatus ||
    readJsonStorage("apiDatabaseStatus", null, sanitizeDatabaseStatus)
  );
}

function getAuditServiceStatus() {
  return (
    state.auditServiceStatus ||
    readJsonStorage("apiAuditServiceStatus", null, sanitizeAuditServiceStatus)
  );
}

async function requestApi(path, options = {}) {
  const fetcher = window.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new Error("当前运行环境暂不支持网络请求。");
  }

  const config = getApiConfig();
  const response = await fetcher(`${config.baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `后端接口返回 ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      // Keep the status-based fallback when the response body is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

async function loadProviderStatus() {
  const payload = await requestApi("/api/data-sources");
  const provider = sanitizeProviderStatus(payload?.activeProvider);
  if (!provider) {
    localStorage.removeItem("apiProviderStatus");
    state.providerStatus = null;
    return null;
  }

  state.providerStatus = provider;
  localStorage.setItem("apiProviderStatus", JSON.stringify(provider));
  return provider;
}

async function loadMarketDataRuntimeStatus() {
  const payload = await requestApi("/api/market-data/runtime-status");
  const runtime = sanitizeMarketDataRuntimeStatus(payload?.activeRuntime);
  if (!runtime) {
    localStorage.removeItem("apiMarketDataRuntimeStatus");
    state.marketDataRuntimeStatus = null;
    return null;
  }

  state.marketDataRuntimeStatus = runtime;
  localStorage.setItem("apiMarketDataRuntimeStatus", JSON.stringify(runtime));
  return runtime;
}

async function loadNewsIngestionRuntimeStatus() {
  const payload = await requestApi("/api/news/ingestion-runtime/status");
  const runtime = sanitizeNewsIngestionRuntimeStatus(payload?.activeRuntime);
  if (!runtime) {
    localStorage.removeItem("apiNewsIngestionRuntimeStatus");
    state.newsIngestionRuntimeStatus = null;
    return null;
  }

  state.newsIngestionRuntimeStatus = runtime;
  localStorage.setItem("apiNewsIngestionRuntimeStatus", JSON.stringify(runtime));
  return runtime;
}

async function loadAiServiceStatus() {
  const payload = await requestApi("/api/ai-services");
  const aiService = sanitizeAiServiceStatus(payload?.activeService);
  if (!aiService) {
    localStorage.removeItem("apiAiServiceStatus");
    state.aiServiceStatus = null;
    return null;
  }

  state.aiServiceStatus = aiService;
  localStorage.setItem("apiAiServiceStatus", JSON.stringify(aiService));
  return aiService;
}

async function loadComplianceServiceStatus() {
  const payload = await requestApi("/api/compliance/status");
  const complianceService = sanitizeComplianceServiceStatus(payload?.activeService);
  if (!complianceService) {
    localStorage.removeItem("apiComplianceServiceStatus");
    state.complianceServiceStatus = null;
    return null;
  }

  state.complianceServiceStatus = complianceService;
  localStorage.setItem("apiComplianceServiceStatus", JSON.stringify(complianceService));
  return complianceService;
}

async function loadComplianceAcknowledgements() {
  if (!shouldUseBackendDataSource() || getAccountState().status !== "authenticated") {
    state.complianceAcknowledgementStatus = "local";
    state.complianceAcknowledgementMessage = "登录并连接后端后，可同步风险确认记录。";
    return { status: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const version = encodeURIComponent(
      getComplianceServiceStatus()?.acknowledgementPolicy?.version || "compliance-ack-v0",
    );
    const payload = await requestApi(`/api/compliance/acknowledgements?version=${version}`, {
      headers: authHeaders(token),
    });
    state.complianceAcknowledgements = sanitizeComplianceAcknowledgements(payload.items);
    localStorage.setItem(
      "complianceAcknowledgements",
      JSON.stringify(state.complianceAcknowledgements),
    );
    state.complianceAcknowledgementStatus = "ready";
    state.complianceAcknowledgementMessage = payload.latest
      ? "已读取最近一次风险确认记录。"
      : "尚未记录当前披露版本的风险确认。";
    renderComplianceServiceState("connected");
    return { status: "ready", source: "backend", latest: payload.latest || null };
  } catch (error) {
    state.complianceAcknowledgementStatus = "error";
    state.complianceAcknowledgementMessage = `风险确认记录同步失败：${error.message}`;
    renderComplianceServiceState("connected");
    return { status: "error", error };
  }
}

async function saveComplianceAcknowledgement() {
  if (!shouldUseBackendDataSource() || getAccountState().status !== "authenticated") {
    showStatus("请先连接后端并登录，再记录风险确认。", "warning");
    return { status: "blocked" };
  }

  try {
    state.complianceAcknowledgementStatus = "saving";
    state.complianceAcknowledgementMessage = "正在记录风险确认。";
    renderComplianceServiceState("connected");
    const complianceService = getComplianceServiceStatus();
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/compliance/acknowledgements", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        version: complianceService?.acknowledgementPolicy?.version || "compliance-ack-v0",
        acceptedDisclaimer: true,
        riskAcknowledged: true,
        optionalPortfolioNoticeAcknowledged: true,
        source: "settings-panel",
        disclosureText: complianceService?.requiredDisclaimer || "",
      },
    });
    const saved = sanitizeComplianceAcknowledgements([payload.saved])[0];
    state.complianceAcknowledgements = sanitizeComplianceAcknowledgements([
      saved,
      ...state.complianceAcknowledgements,
    ]);
    localStorage.setItem(
      "complianceAcknowledgements",
      JSON.stringify(state.complianceAcknowledgements),
    );
    state.complianceAcknowledgementStatus = "ready";
    state.complianceAcknowledgementMessage = "已记录本次风险确认和免责声明确认。";
    renderComplianceServiceState("connected");
    showStatus("风险确认已记录。后续公开版仍需法律复核和地区策略。", "success");
    return { status: "ready", saved };
  } catch (error) {
    state.complianceAcknowledgementStatus = "error";
    state.complianceAcknowledgementMessage = `风险确认记录失败：${error.message}`;
    renderComplianceServiceState("connected");
    showStatus(state.complianceAcknowledgementMessage, "warning");
    return { status: "error", error };
  }
}

async function loadSuitabilityQuestionnaires() {
  if (!shouldUseBackendDataSource() || getAccountState().status !== "authenticated") {
    state.suitabilityStatus = "local";
    state.suitabilityMessage = "登录并连接后端后，可同步适当性问卷。";
    return { status: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const version = encodeURIComponent(
      getComplianceServiceStatus()?.suitabilityPolicy?.version || "suitability-v0",
    );
    const payload = await requestApi(`/api/compliance/suitability?version=${version}`, {
      headers: authHeaders(token),
    });
    state.suitabilityQuestionnaires = sanitizeSuitabilityQuestionnaires(payload.items);
    localStorage.setItem(
      "suitabilityQuestionnaires",
      JSON.stringify(state.suitabilityQuestionnaires),
    );
    state.suitabilityStatus = "ready";
    state.suitabilityMessage = payload.latest
      ? "已读取最近一次适当性问卷。"
      : "尚未填写当前版本适当性问卷。";
    renderComplianceServiceState("connected");
    return { status: "ready", source: "backend", latest: payload.latest || null };
  } catch (error) {
    state.suitabilityStatus = "error";
    state.suitabilityMessage = `适当性问卷同步失败：${error.message}`;
    renderComplianceServiceState("connected");
    return { status: "error", error };
  }
}

function readSuitabilityFormPayload() {
  const form = elements.complianceServiceState;
  return {
    riskTolerance: form.querySelector?.("[data-suitability-risk-tolerance]")?.value || "medium",
    investmentExperience:
      form.querySelector?.("[data-suitability-investment-experience]")?.value || "new",
    investmentHorizon:
      form.querySelector?.("[data-suitability-investment-horizon]")?.value || "medium",
    liquidityNeed: form.querySelector?.("[data-suitability-liquidity-need]")?.value || "medium",
  };
}

async function saveSuitabilityQuestionnaire() {
  if (!shouldUseBackendDataSource() || getAccountState().status !== "authenticated") {
    showStatus("请先连接后端并登录，再保存适当性问卷。", "warning");
    return { status: "blocked" };
  }

  try {
    state.suitabilityStatus = "saving";
    state.suitabilityMessage = "正在保存适当性问卷。";
    renderComplianceServiceState("connected");
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/compliance/suitability", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        version: getComplianceServiceStatus()?.suitabilityPolicy?.version || "suitability-v0",
        ...readSuitabilityFormPayload(),
      },
    });
    const saved = sanitizeSuitabilityQuestionnaires([payload.saved])[0];
    state.suitabilityQuestionnaires = sanitizeSuitabilityQuestionnaires([
      saved,
      ...state.suitabilityQuestionnaires,
    ]);
    localStorage.setItem(
      "suitabilityQuestionnaires",
      JSON.stringify(state.suitabilityQuestionnaires),
    );
    state.suitabilityStatus = "ready";
    state.suitabilityMessage = `已保存适当性问卷：${saved.levelLabel || saved.suitabilityLevel}。`;
    renderComplianceServiceState("connected");
    showStatus("适当性问卷已保存。公开版仍需完整适当性评估和合规复核。", "success");
    return { status: "ready", saved };
  } catch (error) {
    state.suitabilityStatus = "error";
    state.suitabilityMessage = `适当性问卷保存失败：${error.message}`;
    renderComplianceServiceState("connected");
    showStatus(state.suitabilityMessage, "warning");
    return { status: "error", error };
  }
}

async function loadAuthServiceStatus() {
  const payload = await requestApi("/api/auth/status");
  const authService = sanitizeAuthServiceStatus(payload?.activeService);
  if (!authService) {
    localStorage.removeItem("apiAuthServiceStatus");
    state.authServiceStatus = null;
    return null;
  }

  state.authServiceStatus = authService;
  localStorage.setItem("apiAuthServiceStatus", JSON.stringify(authService));
  return authService;
}

async function loadNotificationServiceStatus() {
  const payload = await requestApi("/api/notification-services");
  const notificationService = sanitizeNotificationServiceStatus(payload?.activeService);
  if (!notificationService) {
    localStorage.removeItem("apiNotificationServiceStatus");
    state.notificationServiceStatus = null;
    return null;
  }

  state.notificationServiceStatus = notificationService;
  localStorage.setItem("apiNotificationServiceStatus", JSON.stringify(notificationService));
  return notificationService;
}

async function loadJobRunnerStatus() {
  const payload = await requestApi("/api/job-services");
  const jobRunner = sanitizeJobRunnerStatus(payload?.activeService);
  if (!jobRunner) {
    localStorage.removeItem("apiJobRunnerStatus");
    state.jobRunnerStatus = null;
    return null;
  }

  state.jobRunnerStatus = jobRunner;
  localStorage.setItem("apiJobRunnerStatus", JSON.stringify(jobRunner));
  return jobRunner;
}

async function loadSchedulerStatus() {
  const payload = await requestApi("/api/scheduler/status");
  const scheduler = sanitizeSchedulerStatus(payload?.activeService);
  if (!scheduler) {
    localStorage.removeItem("apiSchedulerStatus");
    state.schedulerStatus = null;
    return null;
  }

  state.schedulerStatus = scheduler;
  localStorage.setItem("apiSchedulerStatus", JSON.stringify(scheduler));
  return scheduler;
}

async function loadDeadLetterJobs({ allowDemoLogin = false } = {}) {
  if (!shouldUseBackendDataSource() && !allowDemoLogin) {
    state.deadLetterStatus = "local";
    state.deadLetterMessage = "当前为本机样例模式，未连接后端死信队列。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "idle");
    return { source: "local", items: [] };
  }

  if (!state.authToken && !allowDemoLogin) {
    state.deadLetterStatus = "auth-required";
    state.deadLetterMessage = "登录后可查看死信任务。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "auth-required", items: state.deadLetterJobs };
  }

  try {
    const token = state.authToken || (allowDemoLogin ? await ensureDemoAuthToken() : "");
    const payload = await requestApi("/api/scheduler/dead-letter", {
      headers: authHeaders(token),
    });
    const items = sanitizeDeadLetterJobs(payload.items);
    state.deadLetterJobs = items;
    state.deadLetterStatus = "synced";
    state.deadLetterMessage = items.length
      ? `已同步 ${items.length} 条死信任务。`
      : "死信队列为空。";
    localStorage.setItem("schedulerDeadLetterJobs", JSON.stringify(items));
    renderSchedulerState("connected");
    return { source: "backend", items };
  } catch (error) {
    state.deadLetterStatus = "error";
    state.deadLetterMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "local", items: state.deadLetterJobs, error };
  }
}

async function replayDeadLetterJob(id) {
  if (!id) return;
  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi(
      `/api/scheduler/dead-letter/${encodeURIComponent(id)}/replay`,
      {
        method: "POST",
        headers: authHeaders(token),
      },
    );
    const updated = sanitizeDeadLetterJobs([payload.deadLetterJob])[0];
    if (updated) {
      state.deadLetterJobs = [
        updated,
        ...state.deadLetterJobs.filter((item) => item.id !== updated.id),
      ];
      localStorage.setItem("schedulerDeadLetterJobs", JSON.stringify(state.deadLetterJobs));
    }
    state.deadLetterStatus = "synced";
    state.deadLetterMessage = "死信任务已重放成功。";
    renderSchedulerState("connected");
    showStatus("死信任务已重放成功，并记录审计事件。", "success");
  } catch (error) {
    state.deadLetterStatus = "error";
    state.deadLetterMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`死信任务重放失败：${error.message}`, "warning");
  }
}

async function loadWorkerHealth({ allowDemoLogin = false } = {}) {
  if (!shouldUseBackendDataSource() && !allowDemoLogin) {
    state.workerHealthStatus = "local";
    state.workerHealthMessage = "当前为本机样例模式，未连接 worker 健康状态。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "idle");
    return { source: "local", workerHealth: null };
  }

  if (!state.authToken && !allowDemoLogin) {
    state.workerHealthStatus = "auth-required";
    state.workerHealthMessage = "登录后可查看 worker 心跳与队列延迟。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "auth-required", workerHealth: state.workerHealth };
  }

  try {
    const token = state.authToken || (allowDemoLogin ? await ensureDemoAuthToken() : "");
    const payload = await requestApi("/api/scheduler/worker-health", {
      headers: authHeaders(token),
    });
    const workerHealth = sanitizeWorkerHealth(payload);
    state.workerHealth = workerHealth;
    state.workerHealthStatus = "synced";
    state.workerHealthMessage = workerHealth?.workerCount
      ? `已同步 ${workerHealth.workerCount} 个 worker 心跳。`
      : "暂无 worker 心跳。";
    localStorage.setItem("schedulerWorkerHealth", JSON.stringify(workerHealth));
    renderSchedulerState("connected");
    return { source: "backend", workerHealth };
  } catch (error) {
    state.workerHealthStatus = "error";
    state.workerHealthMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "local", workerHealth: state.workerHealth, error };
  }
}

async function recordSampleWorkerHeartbeat() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/scheduler/worker-heartbeat", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        workerId: "sample-reminder-worker",
        jobTypes: ["reminderEvaluation"],
        queueDepth: state.deadLetterJobs.filter((item) => item.status === "open").length,
        queueLagMs: 0,
      },
    });
    const workerHealth = sanitizeWorkerHealth(payload.workerHealth);
    state.workerHealth = workerHealth;
    state.workerHealthStatus = "synced";
    state.workerHealthMessage = "样例 worker 心跳已记录。";
    localStorage.setItem("schedulerWorkerHealth", JSON.stringify(workerHealth));
    renderSchedulerState("connected");
    showStatus("样例 worker 心跳已记录，并写入审计事件。", "success");
    return { source: "backend", workerHealth };
  } catch (error) {
    state.workerHealthStatus = "error";
    state.workerHealthMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`worker 心跳记录失败：${error.message}`, "warning");
    return { source: "local", workerHealth: state.workerHealth, error };
  }
}

async function loadSchedulerQueue({ allowDemoLogin = false } = {}) {
  if (!shouldUseBackendDataSource() && !allowDemoLogin) {
    state.schedulerQueueStatus = "local";
    state.schedulerQueueMessage = "当前为本机样例模式，未连接队列状态。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "idle");
    return { source: "local", queueState: state.schedulerQueueState };
  }

  if (!state.authToken && !allowDemoLogin) {
    state.schedulerQueueStatus = "auth-required";
    state.schedulerQueueMessage = "登录后可查看队列任务。";
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "auth-required", queueState: state.schedulerQueueState };
  }

  try {
    const token = state.authToken || (allowDemoLogin ? await ensureDemoAuthToken() : "");
    const payload = await requestApi("/api/scheduler/queue", {
      headers: authHeaders(token),
    });
    const queueState = sanitizeSchedulerQueueState(payload);
    state.schedulerQueueState = queueState;
    state.schedulerQueueStatus = "synced";
    state.schedulerQueueMessage = queueState?.summary?.total
      ? `已同步 ${queueState.summary.total} 个队列任务。`
      : "队列任务为空。";
    localStorage.setItem("schedulerQueueState", JSON.stringify(queueState));
    renderSchedulerState("connected");
    return { source: "backend", queueState };
  } catch (error) {
    state.schedulerQueueStatus = "error";
    state.schedulerQueueMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    return { source: "local", queueState: state.schedulerQueueState, error };
  }
}

async function enqueueSampleSchedulerJob() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/scheduler/enqueue", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        jobType: "reminderEvaluation",
        priority: 5,
        payload: { source: "settings-panel-sample" },
      },
    });
    const queueState = sanitizeSchedulerQueueState({
      ...payload.queueState,
      items: [payload.queuedJob, ...(state.schedulerQueueState?.items || [])],
    });
    state.schedulerQueueState = queueState;
    state.schedulerQueueStatus = "synced";
    state.schedulerQueueMessage = "样例队列任务已创建。";
    localStorage.setItem("schedulerQueueState", JSON.stringify(queueState));
    renderSchedulerState("connected");
    showStatus("样例队列任务已创建，并写入审计事件。", "success");
    return { source: "backend", queueState };
  } catch (error) {
    state.schedulerQueueStatus = "error";
    state.schedulerQueueMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`样例队列任务创建失败：${error.message}`, "warning");
    return { source: "local", queueState: state.schedulerQueueState, error };
  }
}

async function processSampleSchedulerQueue() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/scheduler/process-queue", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        workerId: "manual-sample-worker",
        limit: 5,
      },
    });
    const queueState = sanitizeSchedulerQueueState(payload.queueState);
    state.schedulerQueueState = queueState;
    state.schedulerQueueStatus = "synced";
    const run = payload.queueRun || {};
    state.schedulerQueueMessage =
      run.processedJobs > 0
        ? `已处理 ${run.processedJobs} 个队列任务：完成 ${run.completedJobs || 0}，重试 ${run.retryScheduledJobs || 0}，失败 ${run.failedJobs || 0}。`
        : "当前没有到期队列任务。";
    localStorage.setItem("schedulerQueueState", JSON.stringify(queueState));
    renderSchedulerState("connected");
    showStatus(
      run.processedJobs > 0 ? "队列任务已处理，状态已刷新。" : "当前没有到期队列任务。",
      run.failedJobs ? "warning" : "success",
    );
    return { source: "backend", queueState, queueRun: run };
  } catch (error) {
    state.schedulerQueueStatus = "error";
    state.schedulerQueueMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`队列任务处理失败：${error.message}`, "warning");
    return { source: "local", queueState: state.schedulerQueueState, error };
  }
}

async function cleanupWorkerNonces() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/scheduler/worker-nonces/cleanup", {
      method: "POST",
      headers: authHeaders(token),
      body: { requestedBy: "settings-panel" },
    });
    const run = payload.cleanupRun || {};
    state.schedulerMaintenanceStatus = "synced";
    state.schedulerMaintenanceMessage = `Worker nonce 清理完成：检查 ${run.checkedNonces || 0}，清理 ${run.prunedNonces || 0}，剩余 ${run.remainingNonces || 0}。`;
    renderSchedulerState("connected");
    showStatus("Worker nonce 清理完成，并写入审计事件。", "success");
    return { source: "backend", cleanupRun: run };
  } catch (error) {
    state.schedulerMaintenanceStatus = "error";
    state.schedulerMaintenanceMessage = error.message;
    renderSchedulerState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`Worker nonce 清理失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function loadRepositoryStatus() {
  const payload = await requestApi("/api/repository/status");
  const repository = sanitizeRepositoryStatus(payload?.activeRepository);
  if (!repository) {
    localStorage.removeItem("apiRepositoryStatus");
    state.repositoryStatus = null;
    return null;
  }

  state.repositoryStatus = repository;
  localStorage.setItem("apiRepositoryStatus", JSON.stringify(repository));
  return repository;
}

async function loadDatabaseStatus() {
  const payload = await requestApi("/api/database/status");
  const database = sanitizeDatabaseStatus(payload?.activeService);
  if (!database) {
    localStorage.removeItem("apiDatabaseStatus");
    state.databaseStatus = null;
    return null;
  }

  state.databaseStatus = database;
  localStorage.setItem("apiDatabaseStatus", JSON.stringify(database));
  return database;
}

async function loadAuditServiceStatus() {
  const payload = await requestApi("/api/audit/status");
  const auditService = sanitizeAuditServiceStatus(payload?.activeService);
  if (!auditService) {
    localStorage.removeItem("apiAuditServiceStatus");
    state.auditServiceStatus = null;
    state.auditMaintenanceStatus = "";
    state.auditMaintenanceMessage = "";
    state.auditExportStatus = "";
    state.auditExportMessage = "";
    state.auditVerificationStatus = "";
    state.auditVerificationMessage = "";
    state.auditArchiveStatus = "";
    state.auditArchiveMessage = "";
    state.auditArchiveReceipts = [];
    state.auditDownloadStatus = "";
    state.auditDownloadMessage = "";
    state.auditReplayStatus = "";
    state.auditReplayMessage = "";
    state.lastAuditExportPackage = null;
    return null;
  }

  state.auditServiceStatus = auditService;
  localStorage.setItem("apiAuditServiceStatus", JSON.stringify(auditService));
  return auditService;
}

async function purgeAuditRetention() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/retention/purge", {
      method: "POST",
      headers: authHeaders(token),
      body: { requestedBy: "settings-panel" },
    });
    const run = payload.purgeRun || {};
    state.auditMaintenanceStatus = "synced";
    state.auditMaintenanceMessage = `审计保留清理完成：检查 ${run.checkedEvents || 0}，清理 ${run.prunedEvents || 0}，剩余 ${run.finalEventCount ?? run.remainingEvents ?? 0}。`;
    if (payload.integrity && state.auditServiceStatus) {
      state.auditServiceStatus = {
        ...state.auditServiceStatus,
        integrity: payload.integrity,
        retentionPolicy: payload.retentionPolicy || state.auditServiceStatus.retentionPolicy,
      };
      localStorage.setItem("apiAuditServiceStatus", JSON.stringify(state.auditServiceStatus));
    }
    renderAuditServiceState("connected");
    showStatus("审计保留清理完成，并写入审计事件。", "success");
    return { source: "backend", purgeRun: run };
  } catch (error) {
    state.auditMaintenanceStatus = "error";
    state.auditMaintenanceMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计保留清理失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function exportAuditPackage() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export", {
      headers: authHeaders(token),
    });
    const manifest = payload.manifest || {};
    const signature = payload.signature || {};
    const signatureLabel =
      signature.status === "signed" || manifest.signed
        ? `已签名${signature.keyId ? ` (${signature.keyId})` : ""}`
        : "样例未签名";
    state.auditExportStatus = "synced";
    state.auditExportMessage = `审计证据包已生成：事件 ${manifest.eventCount || 0}，完整性 ${manifest.integrityStatus || "unknown"}，签名 ${signatureLabel}。`;
    state.lastAuditExportPackage = payload;
    state.auditVerificationStatus = "";
    state.auditVerificationMessage = "";
    state.auditArchiveStatus = "";
    state.auditArchiveMessage = "";
    state.auditDownloadStatus = "";
    state.auditDownloadMessage = "";
    state.auditReplayStatus = "";
    state.auditReplayMessage = "";
    if (payload.integrity && state.auditServiceStatus) {
      state.auditServiceStatus = {
        ...state.auditServiceStatus,
        integrity: payload.integrity,
      };
      localStorage.setItem("apiAuditServiceStatus", JSON.stringify(state.auditServiceStatus));
    }
    renderAuditServiceState("connected");
    showStatus("审计证据包已生成，并写入审计事件。", "success");
    return { source: "backend", exportPackage: payload };
  } catch (error) {
    state.auditExportStatus = "error";
    state.auditExportMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计证据包生成失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function verifyLastAuditPackage() {
  if (!state.lastAuditExportPackage) {
    state.auditVerificationStatus = "error";
    state.auditVerificationMessage = "请先生成审计证据包，再进行校验。";
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus("请先生成审计证据包。", "warning");
    return { source: "local", error: new Error("No audit export package") };
  }

  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export/verify", {
      method: "POST",
      headers: authHeaders(token),
      body: { exportPackage: state.lastAuditExportPackage },
    });
    const reasonText = Array.isArray(payload.reasons) && payload.reasons.length
      ? `，原因 ${payload.reasons.join(" / ")}`
      : "";
    state.auditVerificationStatus = payload.verified ? "synced" : "error";
    state.auditVerificationMessage = `审计证据包校验：${payload.verified ? "通过" : "未通过"}，状态 ${payload.status || "unknown"}${reasonText}。`;
    renderAuditServiceState("connected");
    showStatus(
      payload.verified ? "审计证据包校验通过。" : "审计证据包校验未通过，请查看原因。",
      payload.verified ? "success" : "warning",
    );
    return { source: "backend", verification: payload };
  } catch (error) {
    state.auditVerificationStatus = "error";
    state.auditVerificationMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计证据包校验失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function archiveLastAuditPackage() {
  if (!state.lastAuditExportPackage) {
    state.auditArchiveStatus = "error";
    state.auditArchiveMessage = "请先生成审计证据包，再生成归档回执。";
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus("请先生成审计证据包。", "warning");
    return { source: "local", error: new Error("No audit export package") };
  }

  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export/archive", {
      method: "POST",
      headers: authHeaders(token),
      body: { exportPackage: state.lastAuditExportPackage },
    });
    const receipt = payload.receipt || {};
    const checksum = typeof receipt.packageChecksum === "string" ? receipt.packageChecksum : "";
    const reasonText = Array.isArray(receipt.reasons) && receipt.reasons.length
      ? `，原因 ${receipt.reasons.join(" / ")}`
      : "";
    state.auditArchiveStatus = receipt.accepted ? "synced" : "error";
    state.auditArchiveMessage = `审计归档回执：${receipt.status || "unknown"}，Checksum ${checksum.slice(0, 12) || "未生成"}${receipt.immutable ? "，不可变归档" : "，样例非不可变归档"}${reasonText}。`;
    if (receipt.id) {
      state.auditArchiveReceipts = sanitizeAuditArchiveReceipts([
        receipt,
        ...state.auditArchiveReceipts.filter((item) => item.id !== receipt.id),
      ]).slice(0, 5);
    }
    renderAuditServiceState("connected");
    showStatus(
      receipt.accepted ? "审计归档回执已生成。" : "审计归档回执被拒绝，请查看原因。",
      receipt.accepted ? "success" : "warning",
    );
    return { source: "backend", archive: payload };
  } catch (error) {
    state.auditArchiveStatus = "error";
    state.auditArchiveMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计归档回执生成失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function loadAuditArchiveReceipts() {
  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export/archive", {
      headers: authHeaders(token),
    });
    state.auditArchiveReceipts = sanitizeAuditArchiveReceipts(payload.items || []);
    state.auditArchiveStatus = "synced";
    state.auditArchiveMessage = `已加载 ${state.auditArchiveReceipts.length} 条审计归档回执。`;
    renderAuditServiceState("connected");
    showStatus("审计归档回执已刷新。", "success");
    return { source: "backend", items: state.auditArchiveReceipts };
  } catch (error) {
    state.auditArchiveStatus = "error";
    state.auditArchiveMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计归档回执刷新失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

function triggerAuditDownloadFile(download) {
  const nativeAuditDownload = window?.webkit?.messageHandlers?.auditDownload;
  if (
    download?.accepted &&
    typeof download.contentBase64 === "string" &&
    download.contentBase64 &&
    nativeAuditDownload &&
    typeof nativeAuditDownload.postMessage === "function"
  ) {
    try {
      nativeAuditDownload.postMessage({
        filename: download.filename || "audit-export.json",
        mimeType: download.mimeType || "application/json",
        contentBase64: download.contentBase64,
        packageChecksum: download.packageChecksum || "",
      });
      return "native";
    } catch {
      // Fall through to browser download when the native bridge is unavailable.
    }
  }

  if (
    !download?.accepted ||
    typeof download.contentBase64 !== "string" ||
    !download.contentBase64 ||
    typeof document.createElement !== "function" ||
    typeof Blob !== "function" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof atob !== "function"
  ) {
    return "";
  }

  try {
    const binary = atob(download.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const blob = new Blob([bytes], { type: download.mimeType || "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = download.filename || "audit-export.json";
    link.style.display = "none";
    document.body?.appendChild?.(link);
    link.click();
    link.remove?.();
    URL.revokeObjectURL?.(url);
    return "browser";
  } catch {
    return "";
  }
}

async function prepareAuditDownload() {
  if (!state.lastAuditExportPackage) {
    state.auditDownloadStatus = "error";
    state.auditDownloadMessage = "请先生成审计证据包，再准备下载交接包。";
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus("请先生成审计证据包。", "warning");
    return { source: "local", error: new Error("No audit export package") };
  }

  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export/download", {
      method: "POST",
      headers: authHeaders(token),
      body: { exportPackage: state.lastAuditExportPackage },
    });
    const download = payload.download || {};
    const checksum =
      typeof download.packageChecksum === "string" ? download.packageChecksum.slice(0, 12) : "";
    const warningText = Array.isArray(download.warnings) && download.warnings.length
      ? `，提示 ${download.warnings.join(" / ")}`
      : "";
    const reasonText = Array.isArray(download.reasons) && download.reasons.length
      ? `，原因 ${download.reasons.join(" / ")}`
      : "";
    const downloadTriggered = triggerAuditDownloadFile(download);
    const downloadText = download.accepted
      ? downloadTriggered === "native"
        ? "，已交给 iOS 原生分享保存"
        : downloadTriggered === "browser"
          ? "，已触发浏览器下载"
          : "，当前环境仅显示交接信息"
      : "";
    state.auditDownloadStatus = download.accepted ? "synced" : "error";
    state.auditDownloadMessage = `审计下载交接包：${download.status || "unknown"}，文件 ${download.filename || "未生成"}，大小 ${download.byteSize || 0} bytes，Checksum ${checksum || "未生成"}${warningText}${reasonText}${downloadText}。`;
    renderAuditServiceState("connected");
    showStatus(
      download.accepted ? "审计下载交接包已准备。" : "审计下载交接包被拒绝，请查看原因。",
      download.accepted ? "success" : "warning",
    );
    return { source: "backend", download: payload };
  } catch (error) {
    state.auditDownloadStatus = "error";
    state.auditDownloadMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计下载交接包准备失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

async function previewAuditReplay() {
  if (!state.lastAuditExportPackage) {
    state.auditReplayStatus = "error";
    state.auditReplayMessage = "请先生成审计证据包，再预演导入。";
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus("请先生成审计证据包。", "warning");
    return { source: "local", error: new Error("No audit export package") };
  }

  try {
    const token = state.authToken || (await ensureDemoAuthToken());
    const payload = await requestApi("/api/audit/export/replay-preview", {
      method: "POST",
      headers: authHeaders(token),
      body: { exportPackage: state.lastAuditExportPackage },
    });
    const preview = payload.preview || {};
    const warningText = Array.isArray(preview.warnings) && preview.warnings.length
      ? `，提示 ${preview.warnings.join(" / ")}`
      : "";
    const reasonText = Array.isArray(preview.reasons) && preview.reasons.length
      ? `，原因 ${preview.reasons.join(" / ")}`
      : "";
    state.auditReplayStatus = preview.accepted ? "synced" : "error";
    state.auditReplayMessage = `审计回放预演：${preview.status || "unknown"}，总数 ${preview.totalEvents || 0}，重复 ${preview.duplicateEvents || 0}，拟导入 ${preview.wouldImportEvents || 0}${warningText}${reasonText}。`;
    renderAuditServiceState("connected");
    showStatus(
      preview.accepted ? "审计回放预演已生成。" : "审计回放预演被拒绝，请查看原因。",
      preview.accepted ? "success" : "warning",
    );
    return { source: "backend", preview: payload };
  } catch (error) {
    state.auditReplayStatus = "error";
    state.auditReplayMessage = error.message;
    renderAuditServiceState(localStorage.getItem("apiHealthStatus") || "connected");
    showStatus(`审计回放预演失败：${error.message}`, "warning");
    return { source: "local", error };
  }
}

function saveRecentSearch(keyword) {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return;
  state.recentSearches = [
    cleanKeyword,
    ...state.recentSearches.filter((item) => item !== cleanKeyword),
  ].slice(0, 5);
  localStorage.setItem("recentSearches", JSON.stringify(state.recentSearches));
  renderSearchAssist();
}

function getPortfolioContext(stock = state.selectedStock) {
  const buyPrice = parsePositiveNumber(state.portfolio.buyPrice);
  const holdingQty = parsePositiveNumber(state.portfolio.holdingQty);
  const targetReturn = parsePositiveNumber(state.portfolio.targetReturn);
  const maxLoss = parsePositiveNumber(state.portfolio.maxLoss);
  const filledFields = Object.values(state.portfolio).filter(Boolean).length;
  const samplePrice = parsePositiveNumber(stock.samplePrice);
  const hasPosition = Boolean(buyPrice && holdingQty && samplePrice);
  const cost = hasPosition ? buyPrice * holdingQty : null;
  const sampleMarketValue = hasPosition ? samplePrice * holdingQty : null;
  const estimatedReturn =
    hasPosition && cost > 0 ? ((sampleMarketValue - cost) / cost) * 100 : null;

  return {
    buyPrice,
    holdingQty,
    targetReturn,
    maxLoss,
    filledFields,
    samplePrice,
    hasAnyInput: filledFields > 0,
    hasPosition,
    cost,
    sampleMarketValue,
    estimatedReturn,
  };
}

function buildPortfolioOverlay(stock) {
  const context = getPortfolioContext(stock);
  if (!context.hasAnyInput) {
    return {
      upsideAdjustment: 0,
      sentimentAdjustment: 0,
      technicalAdjustment: 0,
      actionNotes: [],
      reasons: [],
      riskNotes: [],
    };
  }

  const overlay = {
    upsideAdjustment: 0,
    sentimentAdjustment: 0,
    technicalAdjustment: 0,
    actionNotes: [],
    reasons: [],
    riskNotes: [],
  };

  if (!context.hasPosition) {
    overlay.reasons.push(
      `持仓联动：你已填写 ${context.filledFields}/5 项持仓字段；补充买入价和数量后，模型可估算样例盈亏与止盈止损距离。`,
    );
    return overlay;
  }

  const returnText = `${context.estimatedReturn >= 0 ? "+" : ""}${context.estimatedReturn.toFixed(2)}%`;
  overlay.reasons.push(
    `持仓联动：按样例现价 ${context.samplePrice} 测算，当前持仓相对买入价的样例浮动收益率为 ${returnText}。`,
  );

  if (context.targetReturn) {
    const remainingToTarget = context.targetReturn - context.estimatedReturn;
    if (context.estimatedReturn >= context.targetReturn) {
      overlay.upsideAdjustment -= 4;
      overlay.technicalAdjustment -= 1;
      overlay.actionNotes.push(
        `已达到你填写的目标收益率 ${context.targetReturn}%，更适合分批止盈或抬高保护位，而不是盲目加仓。`,
      );
      overlay.riskNotes.push("目标收益已达成时，继续持有的核心风险是回撤吞噬已获得收益。");
    } else if (context.estimatedReturn >= context.targetReturn * 0.8) {
      overlay.upsideAdjustment -= 2;
      overlay.actionNotes.push(
        `样例浮盈已接近目标收益率 ${context.targetReturn}%，建议提前规划分批止盈条件。`,
      );
    } else {
      overlay.reasons.push(
        `距离你填写的目标收益率 ${context.targetReturn}% 还差约 ${remainingToTarget.toFixed(2)} 个百分点，需结合新闻催化和趋势确认。`,
      );
    }
  }

  if (context.maxLoss) {
    const stopLossLine = -context.maxLoss;
    if (context.estimatedReturn <= stopLossLine) {
      overlay.upsideAdjustment -= 6;
      overlay.sentimentAdjustment -= 2;
      overlay.technicalAdjustment -= 3;
      overlay.actionNotes.push(
        `样例浮动收益率已低于你填写的最大可接受亏损 -${context.maxLoss}%，建议优先复核止损纪律和仓位。`,
      );
      overlay.riskNotes.push("当前样例亏损已触及你填写的风险边界，继续持有需要更强的基本面或趋势证据支撑。");
    } else if (context.estimatedReturn <= stopLossLine * 0.7) {
      overlay.upsideAdjustment -= 3;
      overlay.technicalAdjustment -= 1;
      overlay.actionNotes.push(
        `样例浮亏已接近最大可接受亏损 -${context.maxLoss}%，建议减少情绪化补仓。`,
      );
    } else {
      const lossBuffer = context.estimatedReturn + context.maxLoss;
      overlay.reasons.push(
        `距离你填写的最大可接受亏损线仍有约 ${lossBuffer.toFixed(2)} 个百分点缓冲。`,
      );
    }

    if (stock.downside > 45) {
      overlay.riskNotes.push(
        `模型下跌参考概率为 ${stock.downside}%，高于中性区间；即使样例盈亏尚可，也应关注仓位暴露。`,
      );
    }
  }

  return overlay;
}

function applyPortfolioOverlay(stock) {
  if (stock.portfolioContext?.source === "backend-saved") {
    return stock;
  }

  const overlay = buildPortfolioOverlay(stock);
  if (
    overlay.reasons.length === 0 &&
    overlay.riskNotes.length === 0 &&
    overlay.actionNotes.length === 0
  ) {
    return stock;
  }

  const upside = clamp(stock.upside + overlay.upsideAdjustment, 5, 95);
  return {
    ...stock,
    upside,
    downside: 100 - upside,
    sentiment: clamp(stock.sentiment + overlay.sentimentAdjustment),
    technical: clamp(stock.technical + overlay.technicalAdjustment),
    action: [stock.action, ...overlay.actionNotes].filter(Boolean).join(" "),
    reasons: [...stock.reasons, ...overlay.reasons],
    risk: [stock.risk, ...overlay.riskNotes].filter(Boolean).join(" "),
  };
}

function getRiskAdjustedStock() {
  const adjustment = getProfileAdjustment();
  const stock = state.selectedStock;
  const upside = clamp(stock.upside + adjustment.upside, 5, 95);
  const sentiment = clamp(stock.sentiment + adjustment.sentiment);
  const valuation = clamp(stock.valuation + adjustment.valuation);
  const technical = clamp(stock.technical + adjustment.technical);
  return {
    ...stock,
    upside,
    downside: 100 - upside,
    sentiment,
    valuation,
    technical,
    action:
      state.riskProfile === "conservative"
        ? `${stock.action} 当前为稳健模式，模型更重视回撤、估值安全边际和风险暴露。`
        : state.riskProfile === "aggressive"
          ? `${stock.action} 当前为积极模式，模型更重视趋势和机会，但仍需设置风险边界。`
          : stock.action,
  };
}

function getAdjustedStock() {
  return applyPortfolioOverlay(getRiskAdjustedStock());
}

function buildLocalFactorBreakdown(stock) {
  return [
    {
      key: "macro",
      label: "宏观经济",
      score: clamp(Math.round((stock.sentiment + stock.valuation) / 2)),
      weight: 20,
      summary: "当前为样例宏观输入，真实版本会接入利率、汇率、政策和经济数据。",
    },
    {
      key: "industry",
      label: "行业分析",
      score: clamp(Math.round((stock.sentiment + stock.technical) / 2)),
      weight: 18,
      summary: "当前使用样例行业热度和新闻强度，真实版本会接入行业景气度与竞争格局。",
    },
    {
      key: "fundamentals",
      label: "公司基本盘",
      score: clamp(Math.round((stock.valuation + stock.sentiment) / 2)),
      weight: 22,
      summary: "当前为样例公司质量输入，真实版本会接入财报、现金流、盈利预测和公告。",
    },
    {
      key: "valuation",
      label: "估值分析",
      score: stock.valuation,
      weight: 16,
      summary: "当前使用样例估值分，真实版本会接入 PE、PB、PS、股息率和行业分位数。",
    },
    {
      key: "technical",
      label: "技术分析",
      score: stock.technical,
      weight: 14,
      summary: "当前使用样例走势，真实版本会接入均线、成交量、波动率和趋势强度。",
    },
    {
      key: "marketSentiment",
      label: "市场情绪",
      score: stock.sentiment,
      weight: 10,
      summary: "当前使用样例新闻情绪，真实版本会接入新闻、社交媒体和资金情绪。",
    },
  ];
}

function roundTradePrice(value) {
  const number = Number(value) || 0;
  if (number >= 1000) return String(Math.round(number));
  if (number >= 100) return number.toFixed(1);
  return number.toFixed(2);
}

function buildLocalTradePlan(stock) {
  const currentPrice = parsePositiveNumber(stock.samplePrice) || parsePositiveNumber(stock.history?.at(-1)?.price);
  if (!currentPrice) return null;
  const configs = {
    conservative: {
      entryLow: 0.96,
      entryHigh: 0.99,
      addOn: 1.025,
      reduce: 0.955,
      stopLoss: 0.94,
      takeProfit: 1.08,
      positionSizing: "稳健模式：单次不超过计划仓位 20%-30%，等待回撤或确认后分批。",
      holdingHorizon: "4-12 周样例观察",
    },
    balanced: {
      entryLow: 0.97,
      entryHigh: 1.005,
      addOn: 1.035,
      reduce: 0.94,
      stopLoss: 0.925,
      takeProfit: 1.12,
      positionSizing: "平衡模式：单次不超过计划仓位 30%-40%，保留现金应对波动。",
      holdingHorizon: "2-8 周样例观察",
    },
    aggressive: {
      entryLow: 0.98,
      entryHigh: 1.02,
      addOn: 1.04,
      reduce: 0.925,
      stopLoss: 0.9,
      takeProfit: 1.18,
      positionSizing: "积极模式：仍建议分批，不用单一信号一次性满仓。",
      holdingHorizon: "1-6 周样例观察",
    },
  };
  const config = configs[state.riskProfile] || configs.balanced;
  const entryHighFactor = stock.upside >= 62 ? config.entryHigh : Math.min(config.entryHigh, 0.98);
  const stance = stock.upside >= 65 ? "分批观察" : stock.upside >= 52 ? "等待确认" : "降低追高";

  return {
    mode: "local-sample",
    stance,
    currentPrice,
    entryZone: {
      low: currentPrice * config.entryLow,
      high: currentPrice * entryHighFactor,
    },
    addOnTrigger: currentPrice * config.addOn,
    reduceTrigger: currentPrice * config.reduce,
    stopLoss: currentPrice * config.stopLoss,
    takeProfit: currentPrice * config.takeProfit,
    positionSizing: config.positionSizing,
    holdingHorizon: config.holdingHorizon,
    rationale: `基于样例现价、${stock.upside}% 上涨参考概率、情绪 ${stock.sentiment}/100、估值 ${stock.valuation}/100 和技术 ${stock.technical}/100 生成操作边界。`,
    disclaimer: "仅为模型参考边界，不构成买入、卖出、加仓、减仓或收益承诺。",
  };
}

function buildLocalScenarioAnalysis(stock) {
  const currentPrice = parsePositiveNumber(stock.samplePrice) || parsePositiveNumber(stock.history?.at(-1)?.price);
  if (!currentPrice) return null;
  const riskMultiplier =
    state.riskProfile === "aggressive" ? 1.18 : state.riskProfile === "conservative" ? 0.82 : 1;
  const confidence = Math.round((stock.sentiment + stock.valuation + stock.technical) / 3);
  const bullProbability = clamp(Math.round(stock.upside * 0.62 + confidence * 0.18));
  const bearProbability = clamp(Math.round((100 - stock.upside) * 0.72));
  const baseProbability = Math.max(0, 100 - bullProbability - bearProbability);
  const bullReturn = (0.08 + stock.upside / 500) * riskMultiplier;
  const baseReturn = ((stock.upside - 50) / 350) * riskMultiplier;
  const bearReturn = -(0.06 + (100 - stock.upside) / 550) * riskMultiplier;
  const buildCase = (key, label, probability, expectedReturnPct, summary) => ({
    key,
    label,
    probability,
    targetPrice: currentPrice * (1 + expectedReturnPct),
    expectedReturnPct: Number((expectedReturnPct * 100).toFixed(1)),
    summary,
  });

  return {
    mode: "local-sample",
    horizon:
      state.riskProfile === "aggressive"
        ? "1-6 周样例"
        : state.riskProfile === "conservative"
          ? "4-12 周样例"
          : "2-8 周样例",
    cases: [
      buildCase("bull", "乐观情景", bullProbability, bullReturn, "情绪和技术面继续改善，价格向上测试高位区间。"),
      buildCase("base", "基准情景", baseProbability, baseReturn, "主要信息已被部分计入，价格围绕当前区间震荡。"),
      buildCase("bear", "悲观情景", bearProbability, bearReturn, "风险偏好下降或催化不足，价格回落到风险控制区间。"),
    ],
    disclaimer: "情景概率和目标价为样例模型参考，不构成收益预测、买卖建议或承诺。",
  };
}

function normalizeHistoryPoints(points, fallbackPoints = []) {
  const sourcePoints = Array.isArray(points) ? points : fallbackPoints;
  return sourcePoints
    .filter((point) => isPlainObject(point) && Number.isFinite(Number(point.price)))
    .map((point, index) => ({
      label:
        typeof point.label === "string" && point.label.trim()
          ? point.label.trim()
          : `第 ${index + 1} 期`,
      price: Number(point.price),
    }))
    .slice(-8);
}

function normalizeHistorySource(source, fallbackSource = {}) {
  if (!isPlainObject(source)) return fallbackSource;
  return {
    label:
      typeof source.label === "string" && source.label.trim()
        ? source.label.trim()
        : fallbackSource.label || "样例行情",
    frequency:
      typeof source.frequency === "string" && source.frequency.trim()
        ? source.frequency.trim()
        : fallbackSource.frequency || "样例频率",
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim()
        ? source.updatedAt.trim()
        : fallbackSource.updatedAt || "未标注",
  };
}

function normalizeInputCoverage(value = {}) {
  if (!isPlainObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, status]) => typeof key === "string" && typeof status === "string")
      .map(([key, status]) => [key, status]),
  );
}

function formatMarketDataDate(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "未标注";
  return text.includes("T") ? text.slice(0, 10) : text;
}

function formatDateTime(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "未标注";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")} ${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function normalizeMarketDataQuote(payload = {}) {
  if (!isPlainObject(payload) || payload.status !== "ok" || !isPlainObject(payload.quote)) {
    return null;
  }

  const price = parsePositiveNumber(payload.quote.lastPrice);
  if (!price) return null;

  return {
    price,
    asOf: formatMarketDataDate(payload.quote.asOf || payload.asOf),
    sourceLabel:
      typeof payload.quote.source?.label === "string" && payload.quote.source.label.trim()
        ? payload.quote.source.label.trim()
        : "后端行情样例",
    mode: typeof payload.mode === "string" && payload.mode.trim() ? payload.mode.trim() : "fixture",
  };
}

function normalizeMarketDataHistory(payload = {}) {
  if (!isPlainObject(payload) || payload.status !== "ok") return null;

  const points = Array.isArray(payload.points)
    ? payload.points
        .filter((point) => isPlainObject(point) && Number.isFinite(Number(point.close)))
        .map((point, index) => ({
          label:
            typeof point.label === "string" && point.label.trim()
              ? point.label.trim()
              : typeof point.date === "string" && point.date.trim()
                ? point.date.trim()
                : `第 ${index + 1} 期`,
          price: Number(point.close),
        }))
    : [];

  if (points.length < 2) return null;

  const sourceLabel =
    typeof payload.source?.label === "string" && payload.source.label.trim()
      ? payload.source.label.trim()
      : "后端行情样例";

  return {
    points: normalizeHistoryPoints(points),
    source: {
      label: sourceLabel,
      frequency:
        typeof payload.interval === "string" && payload.interval.trim()
          ? `${payload.interval.trim()} · ${payload.range || "历史样例"}`
          : "后端历史样例",
      updatedAt: formatMarketDataDate(payload.asOf),
    },
    mode: typeof payload.mode === "string" && payload.mode.trim() ? payload.mode.trim() : "fixture",
  };
}

async function loadMarketDataSnapshot(stock) {
  if (!shouldUseBackendDataSource() || !stock?.code) return null;

  const params = `market=${encodeURIComponent(stock.market)}&code=${encodeURIComponent(stock.code)}`;
  const [quoteResult, historyResult] = await Promise.allSettled([
    requestApi(`/api/market-data/quote?${params}`),
    requestApi(`/api/market-data/history?${params}&range=6m&interval=1mo`),
  ]);

  const quote =
    quoteResult.status === "fulfilled" ? normalizeMarketDataQuote(quoteResult.value) : null;
  const history =
    historyResult.status === "fulfilled" ? normalizeMarketDataHistory(historyResult.value) : null;

  if (!quote && !history) return null;

  return {
    quote,
    history,
    coverage:
      quote && history
        ? "backend-fixture-quote-history"
        : quote
          ? "backend-fixture-quote"
          : "backend-fixture-history",
  };
}

function applyMarketDataSnapshot(stock, snapshot) {
  if (!snapshot) return stock;

  const historySource =
    snapshot.history?.source ||
    (snapshot.quote
      ? {
          label: snapshot.quote.sourceLabel,
          frequency: "后端报价样例",
          updatedAt: snapshot.quote.asOf,
        }
      : stock.historySource);

  const updatedStock = {
    ...stock,
    samplePrice: snapshot.quote?.price || stock.samplePrice,
    history: snapshot.history?.points?.length ? snapshot.history.points : stock.history,
    historySource,
    inputCoverage: {
      ...(stock.inputCoverage || {}),
      marketData: snapshot.coverage,
    },
  };

  return {
    ...updatedStock,
    tradePlan:
      !updatedStock.tradePlan || updatedStock.tradePlan.mode === "local-sample"
        ? buildLocalTradePlan(updatedStock)
        : updatedStock.tradePlan,
    scenarioAnalysis:
      !updatedStock.scenarioAnalysis || updatedStock.scenarioAnalysis.mode === "local-sample"
        ? buildLocalScenarioAnalysis(updatedStock)
        : updatedStock.scenarioAnalysis,
  };
}

function normalizeSourceRefs(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isPlainObject(item) && typeof item.title === "string" && item.title.trim())
    .map((item) => {
      const importanceScore = Number(item.importanceScore);
      const sourceCredibilityScore = Number(item.sourceCredibilityScore);
      return {
        type: typeof item.type === "string" ? item.type : "news",
        title: item.title.trim(),
        sourceLabel:
          typeof item.sourceLabel === "string" && item.sourceLabel.trim()
            ? item.sourceLabel.trim()
            : "来源待确认",
        importanceScore: Number.isFinite(importanceScore) ? importanceScore : 0,
        sourceCredibilityScore: Number.isFinite(sourceCredibilityScore)
          ? sourceCredibilityScore
          : 0,
      };
    })
    .slice(0, 6);
}

function normalizeFactorBreakdown(value = [], fallbackStock = null) {
  const fallback = fallbackStock ? buildLocalFactorBreakdown(fallbackStock) : [];
  const source = Array.isArray(value) && value.length ? value : fallback;
  return source
    .filter((item) => isPlainObject(item) && typeof item.label === "string" && item.label.trim())
    .map((item) => {
      const score = Number(item.score);
      const weight = Number(item.weight);
      return {
        key: typeof item.key === "string" && item.key.trim() ? item.key.trim() : "factorBreakdown",
        label: item.label.trim(),
        score: Number.isFinite(score) ? clamp(score) : 0,
        weight: Number.isFinite(weight) ? Math.max(0, Math.min(100, Math.round(weight))) : 0,
        summary:
          typeof item.summary === "string" && item.summary.trim()
            ? item.summary.trim()
            : "当前因子说明待补充，真实版本会保留数据来源和计算口径。",
      };
    })
    .slice(0, 6);
}

function normalizeTradePlan(value = {}, fallbackStock = null) {
  const fallback = fallbackStock ? buildLocalTradePlan(fallbackStock) : null;
  const source = isPlainObject(value) ? value : {};
  const entryZone = isPlainObject(source.entryZone) ? source.entryZone : {};
  const currentPrice = Number(source.currentPrice);
  const entryLow = Number(entryZone.low);
  const entryHigh = Number(entryZone.high);
  const addOnTrigger = Number(source.addOnTrigger);
  const reduceTrigger = Number(source.reduceTrigger);
  const stopLoss = Number(source.stopLoss);
  const takeProfit = Number(source.takeProfit);
  const normalized = {
    mode:
      typeof source.mode === "string" && source.mode.trim()
        ? source.mode.trim()
        : fallback?.mode || "local-sample",
    stance:
      typeof source.stance === "string" && source.stance.trim()
        ? source.stance.trim()
        : fallback?.stance || "等待确认",
    currentPrice: Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : fallback?.currentPrice,
    entryZone: {
      low: Number.isFinite(entryLow) && entryLow > 0 ? entryLow : fallback?.entryZone?.low,
      high: Number.isFinite(entryHigh) && entryHigh > 0 ? entryHigh : fallback?.entryZone?.high,
    },
    addOnTrigger:
      Number.isFinite(addOnTrigger) && addOnTrigger > 0 ? addOnTrigger : fallback?.addOnTrigger,
    reduceTrigger:
      Number.isFinite(reduceTrigger) && reduceTrigger > 0 ? reduceTrigger : fallback?.reduceTrigger,
    stopLoss: Number.isFinite(stopLoss) && stopLoss > 0 ? stopLoss : fallback?.stopLoss,
    takeProfit: Number.isFinite(takeProfit) && takeProfit > 0 ? takeProfit : fallback?.takeProfit,
    positionSizing:
      typeof source.positionSizing === "string" && source.positionSizing.trim()
        ? source.positionSizing.trim()
        : fallback?.positionSizing || "",
    holdingHorizon:
      typeof source.holdingHorizon === "string" && source.holdingHorizon.trim()
        ? source.holdingHorizon.trim()
        : fallback?.holdingHorizon || "",
    rationale:
      typeof source.rationale === "string" && source.rationale.trim()
        ? source.rationale.trim()
        : fallback?.rationale || "",
    disclaimer:
      typeof source.disclaimer === "string" && source.disclaimer.trim()
        ? source.disclaimer.trim()
        : fallback?.disclaimer || "仅为模型参考边界，不构成投资建议或收益承诺。",
  };

  return normalized.currentPrice &&
    normalized.entryZone.low &&
    normalized.entryZone.high &&
    normalized.stopLoss &&
    normalized.takeProfit
    ? normalized
    : null;
}

function normalizeScenarioAnalysis(value = {}, fallbackStock = null) {
  const fallback = fallbackStock ? buildLocalScenarioAnalysis(fallbackStock) : null;
  const source = isPlainObject(value) ? value : {};
  const rawCases = Array.isArray(source.cases) && source.cases.length ? source.cases : fallback?.cases || [];
  const cases = rawCases
    .filter((item) => isPlainObject(item) && typeof item.label === "string" && item.label.trim())
    .map((item) => {
      const probability = Number(item.probability);
      const targetPrice = Number(item.targetPrice);
      const expectedReturnPct = Number(item.expectedReturnPct);
      return {
        key: typeof item.key === "string" && item.key.trim() ? item.key.trim() : "base",
        label: item.label.trim(),
        probability: Number.isFinite(probability) ? clamp(probability) : 0,
        targetPrice: Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : 0,
        expectedReturnPct: Number.isFinite(expectedReturnPct) ? expectedReturnPct : 0,
        summary:
          typeof item.summary === "string" && item.summary.trim()
            ? item.summary.trim()
            : "当前情景说明待补充。",
      };
    })
    .slice(0, 3);

  return cases.length
    ? {
        mode:
          typeof source.mode === "string" && source.mode.trim()
            ? source.mode.trim()
            : fallback?.mode || "local-sample",
        horizon:
          typeof source.horizon === "string" && source.horizon.trim()
            ? source.horizon.trim()
            : fallback?.horizon || "样例观察",
        cases,
        disclaimer:
          typeof source.disclaimer === "string" && source.disclaimer.trim()
            ? source.disclaimer.trim()
            : fallback?.disclaimer || "情景概率和目标价为样例模型参考，不构成收益预测或承诺。",
      }
    : null;
}

function normalizePortfolioContext(value = {}) {
  if (!isPlainObject(value)) return null;
  const filledFields = Number(value.filledFields);
  const estimatedReturnPct = Number(value.estimatedReturnPct);
  return {
    source:
      typeof value.source === "string" && value.source.trim()
        ? value.source.trim()
        : "none",
    inputCoverage:
      typeof value.inputCoverage === "string" && value.inputCoverage.trim()
        ? value.inputCoverage.trim()
        : "not_required",
    filledFields: Number.isFinite(filledFields) ? filledFields : 0,
    estimatedReturnPct: Number.isFinite(estimatedReturnPct) ? estimatedReturnPct : null,
  };
}

function normalizeInformationFlowImpact(value = {}) {
  if (!isPlainObject(value)) return null;
  const sourceCount = Number(value.sourceCount);
  const probabilityAdjustment = Number(value.probabilityAdjustment);
  const sentimentAdjustment = Number(value.sentimentAdjustment);
  const confidenceAdjustment = Number(value.confidenceAdjustment);
  const score = Number(value.score);
  return {
    score: Number.isFinite(score) ? clamp(score) : 0,
    sentimentTilt:
      typeof value.sentimentTilt === "string" && value.sentimentTilt.trim()
        ? value.sentimentTilt.trim()
        : "neutral",
    probabilityAdjustment: Number.isFinite(probabilityAdjustment) ? probabilityAdjustment : 0,
    sentimentAdjustment: Number.isFinite(sentimentAdjustment) ? sentimentAdjustment : 0,
    confidenceAdjustment: Number.isFinite(confidenceAdjustment) ? confidenceAdjustment : 0,
    sourceCount: Number.isFinite(sourceCount) ? sourceCount : 0,
    summary:
      typeof value.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : "",
  };
}

function normalizeComplianceContext(value = {}) {
  if (!isPlainObject(value)) return null;
  const latest = isPlainObject(value.latestAcknowledgement) ? value.latestAcknowledgement : null;
  return {
    status:
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim()
        : "unknown",
    required: value.required !== false,
    requiredVersion:
      typeof value.requiredVersion === "string" && value.requiredVersion.trim()
        ? value.requiredVersion.trim()
        : "",
    acknowledged: value.acknowledged === true,
    inputCoverage:
      typeof value.inputCoverage === "string" && value.inputCoverage.trim()
        ? value.inputCoverage.trim()
        : "",
    message:
      typeof value.message === "string" && value.message.trim() ? value.message.trim() : "",
    disclaimer:
      typeof value.disclaimer === "string" && value.disclaimer.trim()
        ? value.disclaimer.trim()
        : "",
    latestAcknowledgement: latest
      ? {
          id: typeof latest.id === "string" ? latest.id : "",
          version: typeof latest.version === "string" ? latest.version : "",
          acceptedAt: typeof latest.acceptedAt === "string" ? latest.acceptedAt : "",
          source: typeof latest.source === "string" ? latest.source : "",
        }
      : null,
  };
}

function renderTrend(stock) {
  const history = normalizeHistoryPoints(stock.history);
  if (history.length < 2) {
    elements.trendSummary.textContent = "走势样例不足";
    elements.trendSource.textContent = "当前股票缺少足够价格样本，暂不生成走势参考。";
    elements.trendChart.innerHTML = "";
    return;
  }

  const prices = history.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const chartWidth = 240;
  const chartHeight = 96;
  const topPadding = 10;
  const bottomPadding = 18;
  const usableHeight = chartHeight - topPadding - bottomPadding;
  const points = history
    .map((point, index) => {
      const x = history.length === 1 ? 0 : (index / (history.length - 1)) * chartWidth;
      const y = topPadding + (1 - (point.price - minPrice) / range) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const first = history[0];
  const last = history[history.length - 1];
  const changePct = first.price > 0 ? ((last.price - first.price) / first.price) * 100 : 0;
  const tone = changePct > 0 ? "上涨" : changePct < 0 ? "下跌" : "持平";
  const signedChange = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
  const source = normalizeHistorySource(stock.historySource);

  elements.trendSummary.textContent = `${first.label} 至 ${last.label} ${tone} ${signedChange}`;
  elements.trendSource.textContent = `${source.label} · ${source.frequency} · 更新 ${source.updatedAt}。样例数据不代表实时行情或收益承诺。`;
  elements.trendChart.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${escapeHtml(stock.name)} 近 6 期走势">
      <line x1="0" y1="${chartHeight - bottomPadding}" x2="${chartWidth}" y2="${chartHeight - bottomPadding}" />
      <polyline points="${points}" />
      ${history
        .map((point, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return `<circle cx="${x}" cy="${y}" r="3"><title>${escapeHtml(point.label)}：${escapeHtml(point.price)}</title></circle>`;
        })
        .join("")}
    </svg>
  `;
}

function renderScenarioAnalysis(stock) {
  const scenario = normalizeScenarioAnalysis(stock.scenarioAnalysis, stock);
  if (!scenario) {
    elements.scenarioAnalysis.innerHTML = "";
    elements.scenarioAnalysis.hidden = true;
    return;
  }

  elements.scenarioAnalysis.hidden = false;
  elements.scenarioAnalysis.innerHTML = `
    <div class="scenario-heading">
      <span>未来情景</span>
      <button class="term-button" data-term="scenarioAnalysis" type="button">?</button>
      <strong>${escapeHtml(scenario.horizon)}</strong>
    </div>
    <div class="scenario-grid">
      ${scenario.cases
        .map(
          (item) => `
            <div class="scenario-card scenario-${escapeHtml(item.key)}">
              <div>
                <small>${escapeHtml(item.label)}</small>
                <strong>${escapeHtml(String(item.probability))}%</strong>
              </div>
              <span>${escapeHtml(roundTradePrice(item.targetPrice))}</span>
              <em>${item.expectedReturnPct >= 0 ? "+" : ""}${escapeHtml(String(item.expectedReturnPct))}%</em>
              <p>${escapeHtml(item.summary)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
    <small>${escapeHtml(scenario.disclaimer)}</small>
  `;
}

function renderAnalysisBasis(stock) {
  const coverageEntries = Object.entries(stock.inputCoverage || {}).filter(
    ([key]) => inputCoverageLabels[key],
  );
  const sourceRefs = Array.isArray(stock.sourceRefs) ? stock.sourceRefs : [];
  const informationFlowImpact = stock.informationFlowImpact;
  const complianceContext = stock.complianceContext;

  if (!coverageEntries.length && !sourceRefs.length && !informationFlowImpact && !complianceContext) {
    elements.analysisBasis.innerHTML = "";
    elements.analysisBasis.hidden = true;
    return;
  }

  elements.analysisBasis.hidden = false;
  const coverageMarkup = coverageEntries.length
    ? `
      <div class="basis-group" aria-label="分析输入覆盖">
        <strong>分析输入覆盖</strong>
        <div class="basis-tags">
          ${coverageEntries
            .map(
              ([key, status]) =>
                `<span>${escapeHtml(inputCoverageLabels[key] || key)}：${escapeHtml(status)}</span>`,
            )
            .join("")}
        </div>
      </div>
    `
    : "";
  const impactMarkup = informationFlowImpact
    ? `
      <div class="basis-group" aria-label="信息流影响">
        <strong>信息流影响</strong>
        <div class="basis-tags">
          <span>方向：${escapeHtml(informationFlowImpact.sentimentTilt)}</span>
          <span>概率调整：${informationFlowImpact.probabilityAdjustment >= 0 ? "+" : ""}${escapeHtml(String(informationFlowImpact.probabilityAdjustment))}%</span>
          <span>置信调整：+${escapeHtml(String(informationFlowImpact.confidenceAdjustment))}</span>
        </div>
        ${
          informationFlowImpact.summary
            ? `<p>${escapeHtml(informationFlowImpact.summary)}</p>`
            : ""
        }
      </div>
    `
    : "";
  const complianceMarkup = complianceContext
    ? `
      <div class="basis-group" aria-label="合规确认状态">
        <strong>合规确认</strong>
        <div class="basis-tags">
          <span>${complianceContext.acknowledged ? "已确认" : "未确认"}</span>
          ${
            complianceContext.requiredVersion
              ? `<span>版本：${escapeHtml(complianceContext.requiredVersion)}</span>`
              : ""
          }
          ${
            complianceContext.latestAcknowledgement?.acceptedAt
              ? `<span>确认时间：${escapeHtml(complianceContext.latestAcknowledgement.acceptedAt)}</span>`
              : ""
          }
        </div>
        ${
          complianceContext.message
            ? `<p>${escapeHtml(complianceContext.message)}</p>`
            : ""
        }
        ${
          complianceContext.disclaimer
            ? `<p>${escapeHtml(complianceContext.disclaimer)}</p>`
            : ""
        }
      </div>
    `
    : "";
  const refsMarkup = sourceRefs.length
    ? `
      <div class="basis-group" aria-label="分析来源引用">
        <strong>本次参考来源</strong>
        <div class="basis-source-list">
          ${sourceRefs
            .map(
              (ref) => `
                <span>${escapeHtml(sourceRefTypeLabels[ref.type] || ref.type)} · ${escapeHtml(ref.title)} · 重要性 ${escapeHtml(String(ref.importanceScore))}/100 · 可信度 ${escapeHtml(String(ref.sourceCredibilityScore))}/100</span>
              `,
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  elements.analysisBasis.innerHTML = `${coverageMarkup}${complianceMarkup}${impactMarkup}${refsMarkup}`;
}

function renderFactorBreakdown(stock) {
  const factors = normalizeFactorBreakdown(stock.factorBreakdown, stock);
  if (!factors.length) {
    elements.factorBreakdown.innerHTML = "";
    elements.factorBreakdown.hidden = true;
    return;
  }

  elements.factorBreakdown.hidden = false;
  elements.factorBreakdown.innerHTML = `
    <div class="factor-heading">
      <strong>六因子拆解</strong>
      <button class="term-button" data-term="factorBreakdown" type="button">?</button>
    </div>
    <div class="factor-grid">
      ${factors
        .map(
          (factor) => `
            <div class="factor-item">
              <div class="factor-item-head">
                <span>
                  ${escapeHtml(factor.label)}
                  <button class="term-button" data-term="${escapeHtml(factor.key)}" type="button">?</button>
                </span>
                <strong>${escapeHtml(String(factor.score))}/100</strong>
              </div>
              <div class="factor-bar" aria-label="${escapeHtml(factor.label)} ${escapeHtml(String(factor.score))} 分">
                <span style="width: ${escapeHtml(String(factor.score))}%"></span>
              </div>
              <small>权重 ${escapeHtml(String(factor.weight))}%</small>
              <p>${escapeHtml(factor.summary)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTradePlan(stock) {
  const tradePlan = normalizeTradePlan(stock.tradePlan, stock);
  if (!tradePlan) {
    elements.tradePlan.innerHTML = "";
    elements.tradePlan.hidden = true;
    return;
  }

  elements.tradePlan.hidden = false;
  elements.tradePlan.innerHTML = `
    <div class="trade-plan-heading">
      <span>操作边界</span>
      <button class="term-button" data-term="tradePlan" type="button">?</button>
      <strong>${escapeHtml(tradePlan.stance)}</strong>
    </div>
    <div class="trade-plan-grid">
      <span><small>样例现价</small><strong>${escapeHtml(roundTradePrice(tradePlan.currentPrice))}</strong></span>
      <span><small>观察区间</small><strong>${escapeHtml(roundTradePrice(tradePlan.entryZone.low))}-${escapeHtml(roundTradePrice(tradePlan.entryZone.high))}</strong></span>
      <span><small>突破加仓</small><strong>${escapeHtml(roundTradePrice(tradePlan.addOnTrigger))}</strong></span>
      <span><small>减仓警戒</small><strong>${escapeHtml(roundTradePrice(tradePlan.reduceTrigger))}</strong></span>
      <span><small>止损边界</small><strong>${escapeHtml(roundTradePrice(tradePlan.stopLoss))}</strong></span>
      <span><small>止盈观察</small><strong>${escapeHtml(roundTradePrice(tradePlan.takeProfit))}</strong></span>
    </div>
    <p>${escapeHtml(tradePlan.positionSizing)}</p>
    <p>${escapeHtml(tradePlan.rationale)}</p>
    <small>${escapeHtml(tradePlan.disclaimer)}</small>
  `;
}

function normalizeAnalysisPayload(payload) {
  const fallback = getRiskAdjustedStock();
  const portfolioContext = normalizePortfolioContext(payload.portfolioContext);
  const complianceContext = normalizeComplianceContext(payload.complianceContext);
  const upside = Number.isFinite(Number(payload.upsideProbability))
    ? clamp(Number(payload.upsideProbability), 5, 95)
    : fallback.upside;
  const sentiment = Number.isFinite(Number(payload.sentimentScore))
    ? clamp(Number(payload.sentimentScore))
    : fallback.sentiment;
  const valuation = Number.isFinite(Number(payload.valuationScore))
    ? clamp(Number(payload.valuationScore))
    : fallback.valuation;
  const technical = Number.isFinite(Number(payload.technicalScore))
    ? clamp(Number(payload.technicalScore))
    : fallback.technical;
  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.filter((reason) => typeof reason === "string" && reason.trim())
    : fallback.reasons;
  const risks = Array.isArray(payload.risks)
    ? payload.risks.filter((risk) => typeof risk === "string" && risk.trim())
    : [];

  return applyPortfolioOverlay({
    ...fallback,
    upside,
    downside: Number.isFinite(Number(payload.downsideProbability))
      ? clamp(Number(payload.downsideProbability), 5, 95)
      : 100 - upside,
    sentiment,
    valuation,
    technical,
    action:
      typeof payload.actionReference === "string" && payload.actionReference.trim()
        ? payload.actionReference
        : fallback.action,
    tradePlan: normalizeTradePlan(payload.tradePlan, fallback),
    scenarioAnalysis: normalizeScenarioAnalysis(payload.scenarioAnalysis, fallback),
    reasons: reasons.length > 0 ? reasons : fallback.reasons,
    risk: risks.length > 0 ? risks.join("；") : fallback.risk,
    history: normalizeHistoryPoints(payload.history, fallback.history),
    historySource: normalizeHistorySource(payload.historySource, fallback.historySource),
    factorBreakdown: normalizeFactorBreakdown(payload.factorBreakdown, fallback),
    inputCoverage: {
      ...normalizeInputCoverage(payload.inputCoverage),
      ...(portfolioContext?.inputCoverage ? { portfolio: portfolioContext.inputCoverage } : {}),
      ...(complianceContext?.inputCoverage ? { compliance: complianceContext.inputCoverage } : {}),
    },
    sourceRefs: normalizeSourceRefs(payload.sourceRefs),
    informationFlowImpact: normalizeInformationFlowImpact(payload.informationFlowImpact),
    portfolioContext,
    complianceContext,
    source: "backend",
  });
}

function getLocalAnalysisState() {
  const prototypeAnalysisState = localStorage.getItem("prototypeAnalysisState");
  if (prototypeAnalysisState === "loading") {
    return { status: "loading", source: "local", stock: getAdjustedStock() };
  }

  if (prototypeAnalysisState === "error") {
    return {
      status: "error",
      source: "local",
      stock: getAdjustedStock(),
      message: "当前无法连接分析服务。已保留股票基础概率，请稍后重试。",
    };
  }

  if (prototypeAnalysisState === "empty") {
    return { status: "empty", source: "local", stock: getAdjustedStock() };
  }

  return { status: "ready", source: "local", stock: getAdjustedStock() };
}

function renderAnalysis(analysisState = getLocalAnalysisState()) {
  const stock = analysisState.stock || getAdjustedStock();
  state.analysisStock = stock;
  elements.selectedStockName.textContent = `${stock.name} · ${stock.code}`;
  elements.impactBadge.textContent = stock.impact;
  elements.impactBadge.className = `impact-badge ${stock.impactTone}`;
  elements.upsideRing.style.setProperty("--score", stock.upside);
  elements.upsideValue.textContent = `${stock.upside}%`;
  elements.downsideValue.textContent = `${stock.downside}%`;
  elements.sentimentScore.textContent = `${stock.sentiment}/100`;
  elements.valuationScore.textContent = `${stock.valuation}/100`;
  elements.technicalScore.textContent = `${stock.technical}/100`;
  elements.actionText.textContent = stock.action;
  renderTradePlan(stock);
  renderTrend(stock);
  renderScenarioAnalysis(stock);
  renderFactorBreakdown(stock);
  renderAnalysisBasis(stock);

  if (analysisState.status === "loading") {
    elements.analysisState.hidden = false;
    elements.reasonList.hidden = true;
    elements.factorBreakdown.hidden = true;
    elements.analysisBasis.hidden = true;
    elements.riskBox.hidden = true;
    elements.analysisState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在生成 AI 分析</strong>
        <p>${escapeHtml(analysisState.message || "正在综合新闻、估值、技术面和风险偏好。请稍候。")}</p>
      </div>
    `;
    return;
  }

  if (analysisState.status === "error") {
    elements.analysisState.hidden = false;
    elements.reasonList.hidden = true;
    elements.factorBreakdown.hidden = true;
    elements.analysisBasis.hidden = true;
    elements.riskBox.hidden = true;
    elements.analysisState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>AI 分析生成失败</strong>
        <p>${escapeHtml(analysisState.message)}</p>
        <button class="secondary-button" data-retry-analysis type="button">重新生成</button>
      </div>
    `;
    return;
  }

  if (analysisState.status === "empty") {
    elements.analysisState.hidden = false;
    elements.reasonList.hidden = true;
    elements.factorBreakdown.hidden = true;
    elements.analysisBasis.hidden = true;
    elements.riskBox.hidden = true;
    elements.analysisState.innerHTML = `
      <div class="state-panel empty-state">
        <strong>分析信号不足</strong>
        <p>当前样本数据不足以生成完整原因列表。请补充持仓信息或等待更多新闻信号。</p>
      </div>
    `;
    return;
  }

  elements.analysisState.hidden = true;
  elements.analysisState.innerHTML = "";
  elements.reasonList.hidden = false;
  renderFactorBreakdown(stock);
  renderAnalysisBasis(stock);
  elements.riskBox.hidden = false;
  elements.riskText.textContent = stock.risk;
  elements.reasonList.innerHTML = stock.reasons
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");
}

async function loadAnalysis() {
  const stock = state.selectedStock;
  const riskProfile = state.riskProfile;
  const prototypeAnalysisState = localStorage.getItem("prototypeAnalysisState");
  if (prototypeAnalysisState || !shouldUseBackendDataSource()) {
    const localState = getLocalAnalysisState();
    renderAnalysis(localState);
    renderPortfolioSummary();
    return localState;
  }

  const requestId = (activeAnalysisRequestId += 1);
  renderAnalysis({
    status: "loading",
    source: "backend",
    stock: getAdjustedStock(),
    message: "正在从后端 API 综合新闻、估值、技术面和风险偏好。",
  });

  try {
    const payload = await requestApi(
      `/api/analysis?symbol=${encodeURIComponent(stock.code)}&riskProfile=${encodeURIComponent(riskProfile)}`,
      { headers: authHeaders() },
    );
    if (
      requestId !== activeAnalysisRequestId ||
      stock.code !== state.selectedStock.code ||
      riskProfile !== state.riskProfile
    ) {
      return null;
    }

    const analysisState = {
      status: "ready",
      source: "backend",
      stock: normalizeAnalysisPayload(payload),
    };
    analysisState.stock = applyMarketDataSnapshot(
      analysisState.stock,
      await loadMarketDataSnapshot(stock),
    );
    renderAnalysis(analysisState);
    renderPortfolioSummary();
    const historyState = await saveAnalysisHistory(payload);
    if (historyState.error) {
      showStatus(`分析已生成，但历史记录同步失败：${historyState.error.message}`, "warning");
    }
    return analysisState;
  } catch (error) {
    if (
      requestId !== activeAnalysisRequestId ||
      stock.code !== state.selectedStock.code ||
      riskProfile !== state.riskProfile
    ) {
      return null;
    }

    state.apiMode = "local";
    localStorage.setItem("apiMode", "local");
    localStorage.setItem("apiHealthStatus", "failed");
    renderDataSourceState("failed", `${error.message} AI 分析接口不可用，已切回本机样例数据。`);

    const fallbackState = getLocalAnalysisState();
    renderAnalysis(fallbackState);
    renderPortfolioSummary();
    showStatus("AI 分析 API 暂时不可用，已继续使用本机模型参考分析。", "warning");
    return fallbackState;
  }
}

async function retryAnalysis() {
  localStorage.removeItem("prototypeAnalysisState");
  const analysisState = await loadAnalysis();
  if (!analysisState || analysisState.status !== "ready") return;
  showStatus(
    analysisState.source === "backend"
      ? "已从后端 API 重新生成 AI 分析。"
      : "已重新生成 AI 分析样例。真实服务接入后这里会重新请求后端。",
    "success",
  );
}

function normalizeNewsItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => isPlainObject(item) && typeof item.title === "string")
    .map((item) => ({
      title: item.title,
      source: typeof item.source === "string" ? item.source : "未知来源",
      impact:
        typeof item.impact === "string"
          ? item.impact
          : Number.isFinite(Number(item.importance))
            ? `重要性 ${Number(item.importance)}/100`
            : "重要性待确认",
    }));
}

function normalizeIntelligenceItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => isPlainObject(item) && typeof item.title === "string")
    .map((item) => {
      const source = isPlainObject(item.source) ? item.source : {};
      const importanceScore = Number(item.importanceScore);
      const sourceCredibilityScore = Number(item.sourceCredibilityScore);
      const sourceCount = Number(item.sourceCount);
      return {
        title: item.title,
        source:
          typeof source.label === "string"
            ? source.label
            : typeof item.source === "string"
              ? item.source
              : "情报来源待确认",
        impact: Number.isFinite(importanceScore)
          ? `模型重要性 ${importanceScore}/100`
          : "模型重要性待确认",
        credibility: Number.isFinite(sourceCredibilityScore)
          ? `来源可信度 ${sourceCredibilityScore}/100`
          : "来源可信度待确认",
        sourceCount: Number.isFinite(sourceCount) ? sourceCount : 1,
        scoreVersion: typeof item.importanceBreakdown?.formula === "string" ? item.importanceBreakdown.formula : "",
        kind: "intelligence",
      };
    });
}

function normalizeDisclosureItems(items, kind, fallbackSource) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => isPlainObject(item) && typeof item.title === "string")
    .map((item) => {
      const source = isPlainObject(item.source) ? item.source : {};
      const importanceScore = Number(item.importanceScore);
      const sourceCredibilityScore = Number(item.sourceCredibilityScore);
      const baseImportance = Number(item.importance);
      const label = kind === "filing" ? "公司公告" : "公开言论";
      return {
        title: item.title,
        source:
          typeof source.label === "string"
            ? source.label
            : typeof item.source === "string"
              ? item.source
              : fallbackSource,
        impact: Number.isFinite(importanceScore)
          ? `模型重要性 ${importanceScore}/100`
          : Number.isFinite(baseImportance)
            ? `重要性 ${baseImportance}/100`
            : "重要性待确认",
        credibility: Number.isFinite(sourceCredibilityScore)
          ? `来源可信度 ${sourceCredibilityScore}/100`
          : "",
        kind,
        label,
      };
    });
}

function renderNews(newsState = getNewsState(state.selectedMarket)) {
  elements.newsTitle.textContent = `${getMarketName(state.selectedMarket)}重点新闻`;

  if (newsState.status === "loading") {
    elements.newsList.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在更新财经新闻</strong>
        <p>${escapeHtml(newsState.message || "正在同步市场新闻、公告和重要言论。请稍候。")}</p>
      </div>
    `;
    return;
  }

  if (newsState.status === "error") {
    elements.newsList.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>新闻更新失败</strong>
        <p>${escapeHtml(newsState.message)}</p>
        <button class="secondary-button" data-retry-news type="button">重新加载</button>
      </div>
    `;
    return;
  }

  if (newsState.items.length === 0) {
    elements.newsList.innerHTML = `
      <div class="state-panel empty-state">
        <strong>暂未发现高重要性新闻</strong>
        <p>当前市场暂无达到筛选阈值的关键新闻。你仍可以查看自选股和模型参考分析。</p>
      </div>
    `;
    return;
  }

  elements.newsList.innerHTML = newsState.items
    .map(
      (news) => `
        <article class="news-item${news.kind === "intelligence" || news.kind === "filing" || news.kind === "statement" ? " is-intelligence" : ""}">
          <strong>${escapeHtml(news.title)}</strong>
          <div class="news-meta">
            <span>${escapeHtml(news.source)}</span>
            <span>${escapeHtml(news.impact)}</span>
            ${news.credibility ? `<span>${escapeHtml(news.credibility)}</span>` : ""}
            ${news.kind === "intelligence" ? `<span>个股情报</span>` : ""}
            ${news.label ? `<span>${escapeHtml(news.label)}</span>` : ""}
          </div>
        </article>
      `,
    )
    .join("");
}

function getNewsState(market) {
  const prototypeNewsState = localStorage.getItem("prototypeNewsState");
  if (prototypeNewsState === "loading") {
    return { status: "loading", source: "local", items: [] };
  }

  if (prototypeNewsState === "error") {
    return {
      status: "error",
      source: "local",
      items: [],
      message: "当前无法连接新闻源。请检查网络或稍后重试，已保留上一轮分析结果。",
    };
  }

  if (prototypeNewsState === "empty") {
    return { status: "ready", source: "local", items: [] };
  }

  return {
    status: "ready",
    source: "local",
    items: Array.isArray(newsByMarket[market]) ? newsByMarket[market] : [],
  };
}

async function loadNews() {
  const market = state.selectedMarket;
  const prototypeNewsState = localStorage.getItem("prototypeNewsState");
  if (prototypeNewsState || !shouldUseBackendDataSource()) {
    const localState = getNewsState(market);
    renderNews(localState);
    return localState;
  }

  const requestId = (activeNewsRequestId += 1);
  renderNews({
    status: "loading",
    source: "backend",
    items: [],
    message: "正在从后端 API 同步市场新闻、公告和重要言论。",
  });

  try {
    const selectedSymbol = state.selectedStock.code;
    const encodedMarket = encodeURIComponent(market);
    const encodedSymbol = encodeURIComponent(selectedSymbol);
    const [marketNewsResult, intelligenceResult, filingsResult, statementsResult] =
      await Promise.allSettled([
        requestApi(`/api/news?market=${encodedMarket}`),
        requestApi(
          `/api/news/intelligence?market=${encodedMarket}&symbol=${encodedSymbol}&minImportance=70`,
        ),
        requestApi(`/api/news/filings?market=${encodedMarket}&symbol=${encodedSymbol}`),
        requestApi(`/api/public-statements?market=${encodedMarket}&symbol=${encodedSymbol}`),
      ]);
    if (requestId !== activeNewsRequestId || market !== state.selectedMarket) return null;
    if (marketNewsResult.status === "rejected") throw marketNewsResult.reason;

    const payload = marketNewsResult.value;
    const intelligenceItems =
      intelligenceResult.status === "fulfilled"
        ? normalizeIntelligenceItems(intelligenceResult.value?.items)
        : [];
    const filingItems =
      filingsResult.status === "fulfilled"
        ? normalizeDisclosureItems(filingsResult.value?.items, "filing", "公告来源待确认")
        : [];
    const statementItems =
      statementsResult.status === "fulfilled"
        ? normalizeDisclosureItems(statementsResult.value?.items, "statement", "公开言论来源待确认")
        : [];
    const marketItems = normalizeNewsItems(payload.items);
    const newsState = {
      status: "ready",
      source: "backend",
      sourceStatus: payload.sourceStatus || "api",
      items: [...intelligenceItems, ...filingItems, ...statementItems, ...marketItems],
    };
    renderNews(newsState);
    if (
      intelligenceResult.status === "rejected" ||
      filingsResult.status === "rejected" ||
      statementsResult.status === "rejected"
    ) {
      showStatus("市场新闻已同步，但部分个股情报、公告或公开言论暂时不可用。", "warning");
    }
    return newsState;
  } catch (error) {
    if (requestId !== activeNewsRequestId || market !== state.selectedMarket) return null;

    state.apiMode = "local";
    localStorage.setItem("apiMode", "local");
    localStorage.setItem("apiHealthStatus", "failed");
    renderDataSourceState("failed", `${error.message} 新闻接口不可用，已切回本机样例数据。`);

    const fallbackState = getNewsState(market);
    renderNews(fallbackState);
    showStatus("新闻 API 暂时不可用，已继续使用本机样例新闻。", "warning");
    return fallbackState;
  }
}

async function retryNewsLoad() {
  localStorage.removeItem("prototypeNewsState");
  const newsState = await loadNews();
  if (!newsState || newsState.status !== "ready") return;

  showStatus(
    newsState.source === "backend"
      ? "已从后端 API 重新加载新闻。"
      : "已重新加载新闻样例数据。真实数据源接入后这里会重新请求后端。",
    "success",
  );
}

function persistNewsIntelligenceRecords(records) {
  state.newsIntelligenceRecords = sanitizeNewsIntelligenceRecords(records).slice(0, 30);
  localStorage.setItem("newsIntelligenceRecords", JSON.stringify(state.newsIntelligenceRecords));
}

function mergeNewsIntelligenceRecords(records) {
  const incoming = sanitizeNewsIntelligenceRecords(records);
  const incomingIds = new Set(incoming.map((record) => record.id).filter(Boolean));
  const existing = (state.newsIntelligenceRecords || []).filter(
    (record) => !record.id || !incomingIds.has(record.id),
  );
  persistNewsIntelligenceRecords([...incoming, ...existing]);
}

function createNewsIntelligenceQuery() {
  return `market=${encodeURIComponent(state.selectedMarket)}&symbol=${encodeURIComponent(state.selectedStock.code)}&minImportance=70`;
}

async function saveCurrentNewsIntelligence() {
  if (!shouldUseBackendDataSource()) {
    state.newsIntelligenceStatus = "error";
    state.newsIntelligenceMessage = "请先连接后端 API，再保存新闻情报记录。";
    renderDataSourceState();
    showStatus("请先连接后端 API，再保存新闻情报。", "warning");
    return;
  }

  state.newsIntelligenceStatus = "syncing";
  state.newsIntelligenceMessage = `正在保存 ${state.selectedStock.name} 的新闻情报。`;
  renderDataSourceState("connected", state.newsIntelligenceMessage);

  try {
    const payload = await requestApi(`/api/news/intelligence/persist?${createNewsIntelligenceQuery()}`, {
      method: "POST",
    });
    mergeNewsIntelligenceRecords(payload.saved || []);
    const count = Number.isFinite(Number(payload.count)) ? Number(payload.count) : 0;
    state.newsIntelligenceStatus = "synced";
    state.newsIntelligenceMessage = `已保存 ${count} 条 ${state.selectedStock.name} 新闻情报，评分版本 ${payload.processing?.importanceScoring || "未标注"}。`;
    renderDataSourceState("connected", state.newsIntelligenceMessage);
    showStatus("新闻情报已保存到后端样例仓储。", "success");
  } catch (error) {
    state.newsIntelligenceStatus = "error";
    state.newsIntelligenceMessage = `新闻情报保存失败：${error.message}`;
    renderDataSourceState("connected", state.newsIntelligenceMessage);
    showStatus("新闻情报保存失败，本机样例仍可继续使用。", "warning");
  }
}

async function refreshNewsIntelligenceHistory() {
  if (!shouldUseBackendDataSource()) {
    state.newsIntelligenceStatus = "error";
    state.newsIntelligenceMessage = "请先连接后端 API，再刷新已保存新闻情报。";
    renderDataSourceState();
    showStatus("请先连接后端 API，再刷新新闻情报历史。", "warning");
    return;
  }

  state.newsIntelligenceStatus = "syncing";
  state.newsIntelligenceMessage = `正在读取 ${state.selectedStock.name} 的已保存新闻情报。`;
  renderDataSourceState("connected", state.newsIntelligenceMessage);

  try {
    const params = `market=${encodeURIComponent(state.selectedMarket)}&symbol=${encodeURIComponent(state.selectedStock.code)}&limit=20`;
    const payload = await requestApi(`/api/news/intelligence/history?${params}`);
    persistNewsIntelligenceRecords(payload.items || []);
    state.newsIntelligenceStatus = "synced";
    state.newsIntelligenceMessage = `已刷新 ${state.newsIntelligenceRecords.length} 条已保存新闻情报记录。`;
    renderDataSourceState("connected", state.newsIntelligenceMessage);
    showStatus("已刷新新闻情报历史记录。", "success");
  } catch (error) {
    state.newsIntelligenceStatus = "error";
    state.newsIntelligenceMessage = `新闻情报历史读取失败：${error.message}`;
    renderDataSourceState("connected", state.newsIntelligenceMessage);
    showStatus("新闻情报历史读取失败。", "warning");
  }
}

function canSyncWatchlist() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

function canSyncPreferences() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

function canSyncAnalysisHistory() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

async function ensureDemoAuthToken() {
  if (state.authToken) return state.authToken;

  const payload = await requestApi("/api/auth/demo-login", { method: "POST" });
  state.authToken = payload.token || "";
  if (!state.authToken) {
    throw new Error("后端未返回登录令牌。");
  }
  localStorage.setItem("apiAuthToken", state.authToken);
  return state.authToken;
}

function authHeaders(token = state.authToken) {
  return token ? { authorization: `Bearer ${token}` } : {};
}

function clearLocalAuthSession() {
  localStorage.removeItem("prototypeAccountState");
  state.authToken = "";
  state.authUser = null;
  localStorage.removeItem("apiAuthToken");
  localStorage.removeItem("apiAuthUser");
}

async function validateSavedSession({ silent = false } = {}) {
  if (!state.authToken || !state.authUser || !shouldUseBackendDataSource()) {
    return { status: "skipped" };
  }

  try {
    const payload = await requestApi("/api/me", {
      headers: authHeaders(state.authToken),
    });
    const user = sanitizeAuthUser(payload.user);
    if (!user) throw new Error("后端未返回有效用户信息。");
    state.authUser = user;
    localStorage.setItem("apiAuthUser", JSON.stringify(user));
    renderAccountState();
    renderPortfolioSyncState();
    return { status: "valid", user };
  } catch (error) {
    clearLocalAuthSession();
    renderAccountState();
    renderPortfolioSyncState();
    if (!silent) {
      showStatus(`登录状态已失效，请重新登录。${error.message}`, "warning");
    }
    return { status: "invalid", error };
  }
}

function applyUserPreferences(preferences = {}) {
  const nextRiskProfile = sanitizeRiskProfile(preferences.riskProfile || state.riskProfile);
  const nextNotifications = sanitizeNotifications(preferences.notifications || state.notifications);

  state.riskProfile = nextRiskProfile;
  state.notifications = nextNotifications;
  elements.riskProfile.value = state.riskProfile;
  localStorage.setItem("riskProfile", state.riskProfile);
  localStorage.setItem("notifications", JSON.stringify(state.notifications));
  renderNotificationSettings();
}

async function loadUserPreferences() {
  if (!canSyncPreferences()) {
    renderNotificationSettings();
    return { status: "ready", source: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/preferences", {
      headers: authHeaders(token),
    });
    applyUserPreferences(payload.preferences);
    await loadAnalysis();
    renderPortfolioSummary();
    return { status: "ready", source: "backend" };
  } catch (error) {
    renderNotificationSettings();
    showStatus(`偏好设置后端同步暂不可用，已继续使用本机偏好。${error.message}`, "warning");
    return { status: "ready", source: "local", error };
  }
}

async function syncUserPreferences() {
  localStorage.setItem("riskProfile", state.riskProfile);
  localStorage.setItem("notifications", JSON.stringify(state.notifications));
  if (!canSyncPreferences()) {
    return { status: "ready", source: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/preferences", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        riskProfile: state.riskProfile,
        notifications: state.notifications,
      },
    });
    applyUserPreferences(payload.preferences);
    return { status: "ready", source: "backend" };
  } catch (error) {
    return { status: "ready", source: "local", error };
  }
}

async function saveAnalysisHistory(payload) {
  if (!canSyncAnalysisHistory()) {
    return { status: "ready", source: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const response = await requestApi("/api/analysis/history", {
      method: "POST",
      headers: authHeaders(token),
      body: {
        ...payload,
        source: "backend",
      },
    });
    return { status: "ready", source: "backend", saved: response.saved };
  } catch (error) {
    return { status: "ready", source: "local", error };
  }
}

function renderWatchlist() {
  const watchlistState = getWatchlistState();
  if (watchlistState.status === "loading") {
    elements.watchlistHint.hidden = true;
    elements.watchlistItems.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在同步自选股</strong>
        <p>${escapeHtml(watchlistState.message || "正在读取你的关注列表和提醒偏好。请稍候。")}</p>
      </div>
    `;
    return;
  }

  if (watchlistState.status === "error") {
    elements.watchlistHint.hidden = true;
    elements.watchlistItems.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>自选股同步失败</strong>
        <p>${escapeHtml(watchlistState.message)}</p>
        <button class="secondary-button" data-retry-watchlist type="button">重新同步</button>
      </div>
    `;
    return;
  }

  if (state.watchlist.length === 0) {
    elements.watchlistHint.hidden = true;
    elements.watchlistItems.innerHTML = `
      <div class="state-panel empty-state">
        <strong>还没有自选股</strong>
        <p>你可以先搜索股票，再点击“加入自选”。未添加自选股也可以查看基础走势参考。</p>
      </div>
    `;
    return;
  }

  elements.watchlistHint.hidden = true;
  elements.watchlistItems.innerHTML = state.watchlist
    .map((item) => {
      const stock = stocks.find((entry) => entry.code === item);
      if (!stock) return "";
      return `
        <article class="watch-item">
          <button class="watch-main" data-select-watch="${stock.code}" type="button">
            <strong>${stock.name} · ${stock.code}</strong>
            <span>查看分析</span>
          </button>
          <div class="watch-meta">
            <span>${getMarketName(stock.market)}</span>
            <span>上涨参考概率 ${stock.upside}%</span>
            <span>${stock.impact}</span>
          </div>
          <button class="text-button" data-remove-watch="${stock.code}" type="button">移除自选</button>
        </article>
      `;
    })
    .join("");
}

function getWatchlistState() {
  const prototypeWatchlistState = localStorage.getItem("prototypeWatchlistState");
  if (prototypeWatchlistState === "loading") {
    return { status: "loading" };
  }

  if (prototypeWatchlistState === "error") {
    return {
      status: "error",
      message: "当前无法读取自选股数据。本机已保存的数据不会丢失。",
    };
  }

  return { status: "ready" };
}

async function loadWatchlist() {
  const prototypeWatchlistState = localStorage.getItem("prototypeWatchlistState");
  if (prototypeWatchlistState || !canSyncWatchlist()) {
    const localState = getWatchlistState();
    renderWatchlist(localState);
    return localState;
  }

  renderWatchlist({
    status: "loading",
    message: "正在从后端 API 同步自选股。",
  });

  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/watchlist", {
      headers: authHeaders(token),
    });
    state.watchlist = normalizeWatchlistItems(payload.items);
    localStorage.setItem("watchlist", JSON.stringify(state.watchlist));
    renderWatchlist({ status: "ready" });
    return { status: "ready", source: "backend" };
  } catch (error) {
    renderWatchlist({ status: "ready" });
    showStatus(`自选股后端同步暂不可用，已继续使用本机自选股。${error.message}`, "warning");
    return { status: "ready", source: "local", error };
  }
}

async function retryWatchlistLoad() {
  localStorage.removeItem("prototypeWatchlistState");
  const watchlistState = await loadWatchlist();
  if (!watchlistState || watchlistState.status !== "ready") return;
  showStatus(
    watchlistState.source === "backend"
      ? "已从后端 API 重新同步自选股。"
      : "已重新同步自选股样例数据。真实账号接入后这里会重新请求后端。",
    "success",
  );
}

function getAccountState() {
  if (state.authToken && state.authUser) {
    return { status: "authenticated", name: state.authUser.displayName, user: state.authUser };
  }

  const prototypeAccountState = localStorage.getItem("prototypeAccountState");
  if (prototypeAccountState === "loading") {
    return { status: "loading" };
  }

  if (prototypeAccountState === "error") {
    return {
      status: "error",
      message: "当前无法连接账户服务。本机数据仍会继续保存，不会丢失。",
    };
  }

  if (prototypeAccountState === "authenticated") {
    return { status: "authenticated", name: "样例用户" };
  }

  return { status: "guest" };
}

function renderAccountState() {
  const accountState = getAccountState();
  const authService = getAuthServiceStatus();
  const authProvider = authService?.providerAdapter;
  const rolePolicy = authService?.rolePolicy;
  const formatRoles = (roles = []) =>
    roles.length ? roles.map((role) => authRoleLabels[role] || role).join(" / ") : "未分配";
  const rolePolicyText = rolePolicy
    ? `角色策略 ${rolePolicy.status} · ${rolePolicy.mode} · 生产自提权${rolePolicy.productionSelfServiceAllowed ? "允许" : "禁止"}`
    : "角色策略未返回";
  const privilegedRoleText = rolePolicy?.privilegedRoles?.length
    ? formatRoles(rolePolicy.privilegedRoles)
    : "未标注";
  const roleSourceText = rolePolicy?.roleSource || "未标注";
  const adminAssignmentText = rolePolicy?.adminAssignmentPolicy
    ? `管理员授权 ${rolePolicy.adminAssignmentPolicy.status} · 要求 ${authRoleLabels[rolePolicy.adminAssignmentPolicy.requiredRole] || rolePolicy.adminAssignmentPolicy.requiredRole} · 默认 ${rolePolicy.adminAssignmentPolicy.defaultPrivilegedRoleExpiryHours || "未标注"}h 到期 · ${rolePolicy.adminAssignmentPolicy.productionReviewRequired ? "生产需审批" : "生产审批未标注"}`
    : "管理员授权策略未返回";
  const adminRevocationText = rolePolicy?.adminRevocationPolicy
    ? `管理员撤销 ${rolePolicy.adminRevocationPolicy.status} · 可撤销 ${formatRoles(rolePolicy.adminRevocationPolicy.revocableRoles)} · ${rolePolicy.adminRevocationPolicy.preventsSelfAdminRevoke ? "禁止自撤 admin" : "自撤限制未标注"}`
    : "管理员撤销策略未返回";
  const adminRoleHistoryText = rolePolicy?.adminRoleHistoryPolicy
    ? `角色历史 ${rolePolicy.adminRoleHistoryPolicy.status} · ${rolePolicy.adminRoleHistoryPolicy.scope || "未标注范围"} · 最多 ${rolePolicy.adminRoleHistoryPolicy.maxItems || "未标注"} 条`
    : "角色历史策略未返回";
  const authProviderSummary = authProvider
    ? `认证 provider 适配器 ${authProvider.status} · ${authProvider.runtimeMode} · ${authProvider.selectedProvider || "未选择"}`
    : "认证 provider 适配器未返回";
  const authProviderContracts = authProvider?.endpointContracts?.length
    ? authProvider.endpointContracts
        .map((contract) => `${contract.method || contract.id}:${contract.status}`)
        .join(" / ")
    : "认证 provider 接口契约未返回";
  const passwordPolicy = authProvider?.passwordPolicy
    ? `密码策略 ${authProvider.passwordPolicy.status} · 最少 ${authProvider.passwordPolicy.minLength} 位 · ${authProvider.passwordPolicy.breachCheckRequired ? "泄露检查" : "泄露检查未确认"}`
    : "密码策略未返回";
  const sessionPolicy = authProvider?.sessionPolicy
    ? `会话策略 ${authProvider.sessionPolicy.status} · access ${authProvider.sessionPolicy.accessTokenMinutes}min · refresh ${authProvider.sessionPolicy.refreshTokenDays}d · ${authProvider.sessionPolicy.rotationRequired ? "令牌轮换" : "轮换未确认"} · ${authProvider.sessionPolicy.deviceBindingRequired ? "设备绑定" : "设备绑定未确认"}`
    : "会话策略未返回";
  const securityGate = authProvider?.securityGate
    ? `安全门禁 ${authProvider.securityGate.status} · production ${authProvider.securityGate.canUseProductionAuth ? "可启用" : "不可启用"}`
    : "认证安全门禁未返回";
  const securityChecks = authProvider?.securityGate?.checks?.length
    ? authProvider.securityGate.checks.map((check) => `${check.id}:${check.status}`).join(" / ")
    : "认证安全检查项未返回";
  const authProviderMissingEnv = authProvider?.missingEnvVars?.length
    ? authProvider.missingEnvVars.join(" / ")
    : "暂无认证 provider 缺失环境变量";
  const authProviderSafety = authProvider
    ? `${authProvider.safety?.noVendorNetworkCalls ? "不联网" : "可能联网"} · ${authProvider.safety?.storesPasswordHashesOnly ? "只存密码哈希" : "密码存储边界未标注"} · ${authProvider.safety?.requiresMfaPolicy ? "要求 MFA 策略" : "MFA 未标注"} · ${authProvider.canUseProductionAuth ? "可启用生产认证" : "不可启用生产认证"}`
    : "认证 provider 安全标记未返回";
  const authProviderBlockers = authProvider?.blockedReasons?.length
    ? authProvider.blockedReasons.join(" / ")
    : "暂无认证 provider 阻断项";
  const authServiceDetails = authService
    ? `
        <div class="provider-summary" aria-label="认证服务状态">
          <span>${escapeHtml(authService.name)}</span>
          <span>${escapeHtml(formatProviderMode(authService))}</span>
          <span>${escapeHtml(authService.sessionMode)}</span>
        </div>
        <div class="provider-capabilities" aria-label="认证方式">
          ${
            authService.supportedMethods.length
              ? authService.supportedMethods
                  .map((method) => `<span>${escapeHtml(authMethodLabels[method] || method)}</span>`)
                  .join("")
            : "<span>认证方式未标注</span>"
          }
        </div>
        <div class="provider-summary" aria-label="认证角色策略">
          <span>${escapeHtml(rolePolicyText)}</span>
          <span>特权角色：${escapeHtml(privilegedRoleText)}</span>
          <span>来源：${escapeHtml(roleSourceText)}</span>
          <span>${escapeHtml(adminAssignmentText)}</span>
          <span>${escapeHtml(adminRevocationText)}</span>
          <span>${escapeHtml(adminRoleHistoryText)}</span>
        </div>
        <div class="provider-summary" aria-label="认证 Provider 适配器">
          <span>${escapeHtml(authProviderSummary)}</span>
        </div>
        <div class="provider-summary" aria-label="认证 Provider 接口契约">
          <span>${escapeHtml(authProviderContracts)}</span>
        </div>
        <div class="provider-summary" aria-label="认证密码策略">
          <span>${escapeHtml(passwordPolicy)}</span>
        </div>
        <div class="provider-summary" aria-label="认证会话策略">
          <span>${escapeHtml(sessionPolicy)}</span>
        </div>
        <div class="provider-summary" aria-label="认证安全门禁">
          <span>${escapeHtml(securityGate)}</span>
        </div>
        <div class="provider-summary" aria-label="认证安全检查">
          <span>${escapeHtml(securityChecks)}</span>
        </div>
        <div class="provider-summary" aria-label="认证 Provider 缺失环境变量">
          <span>${escapeHtml(authProviderMissingEnv)}</span>
        </div>
        <div class="provider-summary" aria-label="认证 Provider 安全标记">
          <span>${escapeHtml(authProviderSafety)}</span>
        </div>
        <p class="provider-warning">认证 provider 阻断：${escapeHtml(authProviderBlockers)}。</p>
        ${
          rolePolicy?.disclaimer
            ? `<p class="provider-warning">${escapeHtml(rolePolicy.disclaimer)}</p>`
            : ""
        }
        ${
          authProvider?.disclaimer
            ? `<p class="provider-warning">${escapeHtml(authProvider.disclaimer)}</p>`
            : ""
        }
        ${
          authService.disclaimer
            ? `<p class="provider-warning">${escapeHtml(authService.disclaimer)}</p>`
            : ""
        }
      `
    : "";

  if (accountState.status === "loading") {
    elements.accountState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在连接账户服务</strong>
        <p>正在检查登录状态和同步权限。请稍候。</p>
      </div>
    `;
    return;
  }

  if (accountState.status === "error") {
    elements.accountState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>账户服务暂不可用</strong>
        <p>${accountState.message}</p>
        <button class="secondary-button" data-retry-account type="button">重试连接</button>
      </div>
    `;
    return;
  }

  if (accountState.status === "authenticated") {
    const emailText = accountState.user?.email ? `（${escapeHtml(accountState.user.email)}）` : "";
    const currentRoles = Array.isArray(accountState.user?.roles) ? accountState.user.roles : [];
    const currentRoleGrants = Array.isArray(accountState.user?.roleGrants)
      ? accountState.user.roleGrants
      : [];
    const roleGrantText = currentRoleGrants.length
      ? currentRoleGrants
          .map((grant) => {
            const roleLabel = authRoleLabels[grant.role] || grant.role;
            const expiry = grant.expiresAt ? `到期 ${formatDateTime(grant.expiresAt)}` : "长期";
            return `${roleLabel}:${grant.status === "expired" ? "已过期" : expiry}`;
          })
          .join(" / ")
      : "未返回角色有效期";
    const canManageRoles = Boolean(
      state.authToken && state.authUser?.id && state.authUser.id !== "demo-user",
    );
    const isAdmin = currentRoles.includes("admin");
    const selectedRole = currentRoles.find((role) => rolePolicy?.allowedRoles?.includes(role)) || "user";
    const roleButtons = rolePolicy?.allowedRoles?.length
      ? rolePolicy.allowedRoles
          .map(
            (role) => `
              <button
                class="secondary-button ${selectedRole === role ? "is-active" : ""}"
                data-auth-role="${escapeHtml(role)}"
                type="button"
                ${canManageRoles ? "" : "disabled"}
              >
                ${escapeHtml(authRoleLabels[role] || role)}
              </button>
            `,
          )
          .join("")
      : "";
    const roleStatusText =
      state.authRoleMessage || "可在 mock 邮箱账号中切换样例角色，验证审计下载门禁。";
    const adminRoleMessage =
      state.adminRoleMessage || "管理员可按邮箱为 mock 用户授权，生产版仍需要审批和正式身份源。";
    const adminRoleOptions = rolePolicy?.allowedRoles?.length
      ? rolePolicy.allowedRoles
          .map(
            (role) =>
              `<option value="${escapeHtml(role)}">${escapeHtml(authRoleLabels[role] || role)}</option>`,
          )
          .join("")
      : "";
    const adminRoleHistoryRows = state.adminRoleHistory.length
      ? state.adminRoleHistory
          .map((item) => {
            const metadata = item.metadata || {};
            const target =
              metadata.targetEmail || metadata.targetUserId || metadata.actorUserId || "未标注目标";
            const roles = metadata.roles || metadata.revokedRoles || metadata.remainingRoles || [];
            const action =
              item.eventType === "auth.roles.admin_revoke"
                ? "撤销"
                : item.eventType === "auth.roles.admin_assign"
                  ? "授权"
                  : "自测更新";
            return `
              <li>
                <strong>${escapeHtml(action)} · ${escapeHtml(target)}</strong>
                <span>${escapeHtml(Array.isArray(roles) ? formatRoles(roles) : String(roles || ""))}</span>
                <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
              </li>
            `;
          })
          .join("")
      : "<li><span>暂无角色变更历史</span></li>";
    const adminRoleHistoryMessage =
      state.adminRoleHistoryMessage || "可刷新查看当前管理员账号发起过的角色变更审计记录。";
    const adminRolePanel = isAdmin
      ? `
        <div class="auth-role-panel" role="group" aria-label="管理员角色授权">
          <strong>管理员角色授权</strong>
          <p>${escapeHtml(adminRoleMessage)}</p>
          <label>
            <span>目标邮箱</span>
            <input data-admin-role-email type="email" autocomplete="off" placeholder="user@example.com" />
          </label>
          <label>
            <span>授权角色</span>
            <select data-admin-role-select>${adminRoleOptions}</select>
          </label>
          <label>
            <span>有效期小时</span>
            <input data-admin-role-expiry type="number" min="1" max="8760" value="${escapeHtml(String(rolePolicy?.adminAssignmentPolicy?.defaultPrivilegedRoleExpiryHours || 720))}" />
          </label>
          <div class="auth-actions">
            <button class="secondary-button" data-admin-role-assign type="button">保存授权</button>
            <button class="secondary-button" data-admin-role-revoke type="button">撤销角色</button>
            <button class="secondary-button" data-admin-role-history type="button">刷新角色历史</button>
          </div>
          <div class="history-list" aria-label="角色变更历史">
            <p>${escapeHtml(adminRoleHistoryMessage)}</p>
            <ul>${adminRoleHistoryRows}</ul>
          </div>
        </div>
      `
      : "";
    elements.accountState.innerHTML = `
      <div class="state-panel success-state">
        <strong>已登录：${escapeHtml(accountState.name)}${emailText}</strong>
        <p>当前为样例认证状态，可验证跨接口同步流程；生产账号安全仍需后续接入正式认证服务。当前角色：${escapeHtml(formatRoles(currentRoles))}。有效期：${escapeHtml(roleGrantText)}。</p>
        ${authServiceDetails}
        <div class="auth-role-panel" role="group" aria-label="样例角色管理">
          <strong>样例角色管理</strong>
          <p>${escapeHtml(roleStatusText)}</p>
          <div class="auth-actions">${roleButtons || "<span>角色选项未返回</span>"}</div>
        </div>
        ${adminRolePanel}
        <button class="secondary-button" data-sign-out-demo type="button">退出样例登录</button>
      </div>
    `;
    return;
  }

  elements.accountState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>未登录，正在使用本机体验</strong>
      <p>你仍可以搜索股票、保存本机自选股和持仓信息。登录接入后可跨设备同步。</p>
      ${authServiceDetails}
      <div class="auth-form" data-auth-form>
        <label>
          <span>邮箱</span>
          <input data-auth-email type="email" autocomplete="email" placeholder="you@example.com" />
        </label>
        <label>
          <span>密码</span>
          <input data-auth-password type="password" autocomplete="current-password" placeholder="至少 8 位" />
        </label>
        <label>
          <span>昵称</span>
          <input data-auth-display-name type="text" autocomplete="name" placeholder="注册时可填" />
        </label>
        <div class="auth-actions">
          <button class="secondary-button" data-auth-action="login" type="button">邮箱登录</button>
          <button class="secondary-button" data-auth-action="register" type="button">注册账号</button>
        </div>
      </div>
      <button class="secondary-button" data-demo-sign-in type="button">使用样例登录</button>
    </div>
  `;
}

function retryAccountLoad() {
  localStorage.removeItem("prototypeAccountState");
  renderAccountState();
  renderPortfolioSyncState();
  showStatus("已恢复为本机体验状态。真实登录服务接入后这里会重新请求后端。", "success");
}

function formatProviderMode(provider) {
  return providerModeLabels[provider?.mode] || provider?.mode || "未标注";
}

function formatProviderCoverage(provider) {
  const coverage = Array.isArray(provider?.coverage) ? provider.coverage : [];
  if (!coverage.length) return "未标注";
  return coverage.map((market) => getMarketName(market) || market).join(" / ");
}

function renderProviderDetails(provider) {
  if (!provider) {
    return `
      <p class="provider-warning">数据源能力未返回，当前仅确认后端可连接。</p>
    `;
  }

  const capabilities = provider.capabilities.length
    ? provider.capabilities
        .map(
          (capability) =>
            `<span>${escapeHtml(providerCapabilityLabels[capability] || capability)}</span>`,
        )
        .join("")
    : "<span>能力未标注</span>";
  const integrationPlan = provider.integrationPlan;
  const integrationPlanSummary = integrationPlan
    ? `真实数据源 ${integrationPlan.status} · 必选 ${integrationPlan.configuredRequiredCount}/${integrationPlan.requiredSourceCount} · 可选 ${integrationPlan.configuredOptionalCount}`
    : "真实数据源接入计划未返回";
  const integrationSources = integrationPlan?.plannedSources?.length
    ? integrationPlan.plannedSources
        .slice(0, 4)
        .map((source) => `${source.label || source.id}:${source.configured ? "configured" : "missing"}`)
        .join(" / ")
    : "数据源分组未返回";
  const integrationChecks = integrationPlan?.complianceChecks?.length
    ? integrationPlan.complianceChecks
        .slice(0, 4)
        .map((check) => `${check.label || check.id}:${check.status}`)
        .join(" / ")
    : "授权与合规检查未返回";
  const integrationEnv = integrationPlan?.plannedSources?.length
    ? integrationPlan.plannedSources
        .flatMap((source) => source.envVars)
        .slice(0, 6)
        .map((entry) => `${entry.name}:${entry.configured ? "ok" : "missing"}`)
        .join(" / ")
    : "数据源环境变量未返回";
  const integrationBlockers = integrationPlan?.blockedReasons?.length
    ? integrationPlan.blockedReasons.join(" / ")
    : "暂无真实数据源阻断项";
  const providerRegistry = provider.providerRegistry;
  const registrySummary = providerRegistry
    ? `Provider 注册表 ${providerRegistry.status} · 运行时 ${providerRegistry.activeRuntimeProvider || "未标注"} · 必选 ${providerRegistry.readyRequiredCount}/${providerRegistry.requiredProviderCount}`
    : "Provider 注册表未返回";
  const registrySelections = providerRegistry?.selectedProviders?.length
    ? providerRegistry.selectedProviders
        .slice(0, 4)
        .map((selection) => {
          const selected = selection.selectedProvider || "未选择";
          return `${selection.label || selection.groupId}:${selected}:${selection.status}`;
        })
        .join(" / ")
    : "Provider 选择未返回";
  const registryCandidates = providerRegistry?.candidateProviders?.length
    ? providerRegistry.candidateProviders
        .slice(0, 4)
        .map((candidate) => `${candidate.label || candidate.id}:${candidate.mode || "mode 未标注"}`)
        .join(" / ")
    : "候选 provider 未返回";
  const registryMissingEnv = providerRegistry?.selectedProviders?.length
    ? providerRegistry.selectedProviders
        .flatMap((selection) => selection.missingEnvVars)
        .slice(0, 6)
        .join(" / ") || "暂无缺失 provider 环境变量"
    : "Provider 环境变量未返回";
  const registryBlockers = providerRegistry?.blockedReasons?.length
    ? providerRegistry.blockedReasons.join(" / ")
    : "暂无 provider 注册阻断项";
  const marketDataAdapter = provider.marketDataAdapter;
  const adapterSummary = marketDataAdapter
    ? `行情适配器 ${marketDataAdapter.status} · ${marketDataAdapter.runtimeMode} · ${marketDataAdapter.selectedProvider || "未选择"}`
    : "行情适配器未返回";
  const adapterContracts = marketDataAdapter?.endpointContracts?.length
    ? marketDataAdapter.endpointContracts
        .map((contract) => {
          const fixtureStatus = contract.fixtureStatus ? `:${contract.fixtureStatus}` : "";
          return `${contract.method || contract.id}:${contract.status}${fixtureStatus}`;
        })
        .join(" / ")
    : "行情接口契约未返回";
  const adapterFixture = marketDataAdapter?.fixtureReadModel
    ? `fixture ${marketDataAdapter.fixtureReadModel.status} · ${marketDataAdapter.fixtureReadModel.quoteCount} 条 · ${marketDataAdapter.fixtureReadModel.markets.map(getMarketName).join(" / ") || "市场未标注"}`
    : "fixture 读取状态未返回";
  const adapterMissingEnv = marketDataAdapter?.missingEnvVars?.length
    ? marketDataAdapter.missingEnvVars.join(" / ")
    : "暂无行情适配器缺失环境变量";
  const adapterSafety = marketDataAdapter
    ? `${marketDataAdapter.safety?.noVendorNetworkCalls ? "不联网" : "可能联网"} · ${marketDataAdapter.safety?.noTradingActions ? "不交易" : "交易风险未标注"} · ${marketDataAdapter.canFetchQuotes ? "可取真实行情" : "不可取真实行情"} · ${marketDataAdapter.canReadFixtures ? "样例读取可用" : "样例读取不可用"}`
    : "行情安全标记未返回";
  const adapterCachePolicy = marketDataAdapter?.cachePolicy
    ? `缓存 ${marketDataAdapter.cachePolicy.status} · 报价 ${marketDataAdapter.cachePolicy.quoteTtlSeconds}s · 历史 ${marketDataAdapter.cachePolicy.historyTtlSeconds}s · ${marketDataAdapter.cachePolicy.rawRedistribution || "授权边界未标注"}`
    : "行情缓存策略未返回";
  const adapterRateLimitPolicy = marketDataAdapter?.rateLimitPolicy
    ? `限流 ${marketDataAdapter.rateLimitPolicy.status} · ${marketDataAdapter.rateLimitPolicy.maxRequestsPerMinute}/min · burst ${marketDataAdapter.rateLimitPolicy.burstLimit} · 降级 ${marketDataAdapter.rateLimitPolicy.fallback || "未标注"}`
    : "行情限流策略未返回";
  const adapterAttributionPolicy = marketDataAdapter?.attributionPolicy
    ? `署名 ${marketDataAdapter.attributionPolicy.status} · ${marketDataAdapter.attributionPolicy.requiredFields?.join(" / ") || "字段未标注"} · ${marketDataAdapter.attributionPolicy.displayRequired ? "必须展示" : "展示规则未确认"}`
    : "行情来源署名策略未返回";
  const adapterPolicyGate = marketDataAdapter?.requestPolicyGate
    ? `请求门禁 ${marketDataAdapter.requestPolicyGate.status} · provider ${marketDataAdapter.requestPolicyGate.canUseProvider ? "可用" : "不可用"} · fixture ${marketDataAdapter.requestPolicyGate.canUseFixture ? "可用" : "不可用"} · fallback ${marketDataAdapter.requestPolicyGate.fallback || "未标注"}`
    : "行情请求门禁未返回";
  const adapterPolicyGateChecks = marketDataAdapter?.requestPolicyGate?.checks?.length
    ? marketDataAdapter.requestPolicyGate.checks
        .map((check) => `${check.id}:${check.status}`)
        .join(" / ")
    : "行情请求门禁检查项未返回";
  const adapterPolicyGateBlockers = marketDataAdapter?.requestPolicyGate?.blockedReasons?.length
    ? marketDataAdapter.requestPolicyGate.blockedReasons.join(" / ")
    : "暂无行情请求门禁阻断项";
  const executionPlan = marketDataAdapter?.requestExecutionPlan;
  const adapterExecutionPlan = executionPlan
    ? `执行计划 ${executionPlan.status} · ${executionPlan.mode || "mode 未标注"} · cache ${executionPlan.cache.outcome || "未标注"} · rate ${executionPlan.rateLimit.outcome || "未标注"}`
    : "行情请求执行计划未返回";
  const adapterExecutionCache = executionPlan
    ? `cache key ${executionPlan.cache.key || "未标注"} · ttl ${executionPlan.cache.ttlSeconds}s · stale ${executionPlan.cache.maxStaleSeconds}s`
    : "行情请求缓存执行未返回";
  const adapterExecutionFallback = executionPlan
    ? `fallback ${executionPlan.fallback.selected || "未标注"} · local ${executionPlan.fallback.localSampleAllowed ? "允许" : "未允许"} · audit ${executionPlan.auditDraft.eventType || "未标注"}`
    : "行情请求降级和审计计划未返回";
  const adapterBlockers = marketDataAdapter?.blockedReasons?.length
    ? marketDataAdapter.blockedReasons.join(" / ")
    : "暂无行情适配器阻断项";
  const macroDataAdapter = provider.macroDataAdapter;
  const macroAdapterSummary = macroDataAdapter
    ? `宏观数据适配器 ${macroDataAdapter.status} · ${macroDataAdapter.runtimeMode} · ${macroDataAdapter.selectedProvider || "未选择"}`
    : "宏观数据适配器未返回";
  const macroAdapterContracts = macroDataAdapter?.endpointContracts?.length
    ? macroDataAdapter.endpointContracts
        .map((contract) => {
          const fixtureStatus = contract.fixtureStatus ? `:${contract.fixtureStatus}` : "";
          return `${contract.method || contract.id}:${contract.status}${fixtureStatus}`;
        })
        .join(" / ")
    : "宏观数据接口契约未返回";
  const macroAdapterFixture = macroDataAdapter?.fixtureReadModel
    ? `fixture ${macroDataAdapter.fixtureReadModel.status} · 上下文 ${macroDataAdapter.fixtureReadModel.contextCount} · 指标 ${macroDataAdapter.fixtureReadModel.indicatorCount} · 事件 ${macroDataAdapter.fixtureReadModel.policyEventCount}`
    : "宏观数据 fixture 读取状态未返回";
  const macroAdapterProcessing = macroDataAdapter?.processing
    ? `因子联动 ${macroDataAdapter.processing.macroFactorLinking || "未标注"} · 指标 ${macroDataAdapter.processing.indicatorNormalization || "未标注"} · 政策事件 ${macroDataAdapter.processing.policyEventScoring || "未标注"}`
    : "宏观数据处理管线未返回";
  const macroAdapterMissingEnv = macroDataAdapter?.missingEnvVars?.length
    ? macroDataAdapter.missingEnvVars.join(" / ")
    : "暂无宏观数据适配器缺失环境变量";
  const macroAdapterSafety = macroDataAdapter
    ? `${macroDataAdapter.safety?.noVendorNetworkCalls ? "不联网" : "可能联网"} · ${macroDataAdapter.safety?.noTradingActions ? "不交易" : "交易风险未标注"} · ${macroDataAdapter.canFetchLiveMacro ? "可取真实宏观数据" : "不可取真实宏观数据"} · ${macroDataAdapter.canReadFixtures ? "样例读取可用" : "样例读取不可用"}`
    : "宏观数据安全标记未返回";
  const macroAdapterBlockers = macroDataAdapter?.blockedReasons?.length
    ? macroDataAdapter.blockedReasons.join(" / ")
    : "暂无宏观数据适配器阻断项";
  const marketDataRuntime = getMarketDataRuntimeStatus();
  const runtimeSummary = marketDataRuntime
    ? `运行时 ${marketDataRuntime.status} · ${marketDataRuntime.executionMode} · cache ${marketDataRuntime.cacheStore}`
    : "行情运行时状态未返回";
  const runtimeCounters = marketDataRuntime
    ? `缓存记录 ${marketDataRuntime.cacheRecordCount} · 限流窗口 ${marketDataRuntime.rateLimitWindowCount} · ${marketDataRuntime.safety?.noVendorNetworkCalls ? "不联网" : "联网状态未确认"}`
    : "行情运行时计数未返回";
  const runtimeCachePolicy = marketDataRuntime?.cachePolicy
    ? `缓存模型 ${marketDataRuntime.cachePolicy.freshnessModel || "未标注"} · 最多 ${marketDataRuntime.cachePolicy.maxRecords} 条 · stale ${marketDataRuntime.cachePolicy.staleFallback || "未标注"}`
    : "行情运行时缓存模型未返回";
  const runtimeCacheRecords = marketDataRuntime?.cacheRecords?.length
    ? marketDataRuntime.cacheRecords
        .slice(0, 3)
        .map((record) => `${record.kind || "request"}:${record.state}:${record.key}`)
        .join(" / ")
    : "暂无行情运行时缓存记录";
  const runtimeRateWindows = marketDataRuntime?.rateLimitWindows?.length
    ? marketDataRuntime.rateLimitWindows
        .slice(0, 3)
        .map((windowItem) => `${windowItem.key}:${windowItem.count}/${windowItem.limit}:剩余${windowItem.remaining}`)
        .join(" / ")
    : marketDataRuntime?.rateLimitWindowSeconds
      ? `暂无限流窗口 · 窗口 ${marketDataRuntime.rateLimitWindowSeconds}s`
      : "暂无限流窗口";
  const runtimeCircuitPolicy = marketDataRuntime?.circuitBreakerPolicy
    ? `熔断阈值 ${marketDataRuntime.circuitBreakerPolicy.failureThreshold} 次 · 冷却 ${marketDataRuntime.circuitBreakerPolicy.coolDownSeconds}s · ${marketDataRuntime.circuitBreakerPolicy.halfOpenProbe || "半开探测未标注"}`
    : "行情运行时熔断策略未返回";
  const runtimeCircuitBreakers = marketDataRuntime?.circuitBreakers?.length
    ? marketDataRuntime.circuitBreakers
        .slice(0, 3)
        .map(
          (breaker) =>
            `${breaker.key}:${breaker.state}:失败${breaker.consecutiveFailures}${breaker.reason ? `:${breaker.reason}` : ""}`,
        )
        .join(" / ")
    : "暂无行情运行时熔断记录";
  const runtimeRecent = marketDataRuntime?.recentExecutions?.length
    ? marketDataRuntime.recentExecutions
        .slice(0, 3)
        .map(
          (execution) =>
            `${execution.requestKind || "request"}:${execution.cacheState}:${execution.cacheHit ? "hit" : "miss"}${execution.refreshed ? ":refreshed" : ""}${execution.circuitState ? `:${execution.circuitState}` : ""}`,
        )
        .join(" / ")
    : "暂无最近行情运行记录";
  const runtimeCapabilities = marketDataRuntime?.capabilities?.length
    ? marketDataRuntime.capabilities
        .map((capability) => marketDataRuntimeCapabilityLabels[capability] || capability)
        .join(" / ")
    : "行情运行时能力未返回";
  const newsIngestionRuntime = getNewsIngestionRuntimeStatus();
  const newsRuntimeSummary = newsIngestionRuntime
    ? `新闻采集运行时 ${newsIngestionRuntime.status} · ${newsIngestionRuntime.executionMode} · 类型 ${newsIngestionRuntime.sourceTypes.join(" / ") || "未标注"}`
    : "新闻采集运行时状态未返回";
  const newsRuntimeCounters = newsIngestionRuntime
    ? `去重记录 ${newsIngestionRuntime.dedupeRecordCount} · 冷却窗口 ${newsIngestionRuntime.cooldownWindowSeconds}s · ${newsIngestionRuntime.safety?.noSocialScraping ? "不抓取社交网页" : "社交抓取边界未确认"}`
    : "新闻采集运行时计数未返回";
  const newsRuntimeCooldowns = newsIngestionRuntime?.sourceCooldowns?.length
    ? newsIngestionRuntime.sourceCooldowns
        .slice(0, 3)
        .map((cooldown) => `${cooldown.key}:${cooldown.status}:run${cooldown.runCount}`)
        .join(" / ")
    : "暂无新闻采集冷却记录";
  const newsRuntimeRecent = newsIngestionRuntime?.recentRuns?.length
    ? newsIngestionRuntime.recentRuns
        .slice(0, 3)
        .map(
          (run) =>
            `${run.sourceKey}:接收${run.acceptedCount}:重复${run.duplicateCount}:缺署名${run.attributionMissingCount}:阻断${run.blockedCount}`,
        )
        .join(" / ")
    : "暂无最近新闻采集记录";
  const newsRuntimeCapabilities = newsIngestionRuntime?.capabilities?.length
    ? newsIngestionRuntime.capabilities
        .map((capability) => newsIngestionRuntimeCapabilityLabels[capability] || capability)
        .join(" / ")
    : "新闻采集运行时能力未返回";
  const newsFilingsAdapter = provider.newsFilingsAdapter;
  const newsAdapterSummary = newsFilingsAdapter
    ? `新闻公告适配器 ${newsFilingsAdapter.status} · ${newsFilingsAdapter.runtimeMode} · ${newsFilingsAdapter.selectedNewsProvider || "未选择"}`
    : "新闻公告适配器未返回";
  const newsAdapterContracts = newsFilingsAdapter?.endpointContracts?.length
    ? newsFilingsAdapter.endpointContracts
        .map((contract) => {
          const fixtureStatus = contract.fixtureStatus ? `:${contract.fixtureStatus}` : "";
          return `${contract.method || contract.id}:${contract.status}${fixtureStatus}`;
        })
        .join(" / ")
    : "新闻公告接口契约未返回";
  const newsAdapterFixture = newsFilingsAdapter?.fixtureReadModel
    ? `fixture ${newsFilingsAdapter.fixtureReadModel.status} · 新闻 ${newsFilingsAdapter.fixtureReadModel.newsCount} · 公告 ${newsFilingsAdapter.fixtureReadModel.filingCount} · 言论 ${newsFilingsAdapter.fixtureReadModel.publicStatementCount}`
    : "新闻公告 fixture 读取状态未返回";
  const newsAdapterProcessing = newsFilingsAdapter?.processing
    ? `去重 ${newsFilingsAdapter.processing.deduplication || "未标注"} · 可信度 ${newsFilingsAdapter.processing.sourceCredibility || "未标注"} · 评分 ${newsFilingsAdapter.processing.importanceScoring || "未标注"} · 持久化 ${newsFilingsAdapter.processing.persistence || "未标注"}`
    : "新闻公告处理管线未返回";
  const newsAdapterMissingEnv = newsFilingsAdapter?.missingEnvVars?.length
    ? newsFilingsAdapter.missingEnvVars.join(" / ")
    : "暂无新闻公告适配器缺失环境变量";
  const newsAdapterSafety = newsFilingsAdapter
    ? `${newsFilingsAdapter.safety?.noVendorNetworkCalls ? "不联网" : "可能联网"} · ${newsFilingsAdapter.safety?.noTradingActions ? "不交易" : "交易风险未标注"} · ${newsFilingsAdapter.canFetchLiveNews ? "可取真实新闻" : "不可取真实新闻"} · ${newsFilingsAdapter.canReadFixtures ? "样例读取可用" : "样例读取不可用"}`
    : "新闻公告安全标记未返回";
  const newsAdapterBlockers = newsFilingsAdapter?.blockedReasons?.length
    ? newsFilingsAdapter.blockedReasons.join(" / ")
    : "暂无新闻公告适配器阻断项";

  return `
    <div class="provider-summary" aria-label="数据源状态">
      <span>${escapeHtml(provider.name)}</span>
      <span>${escapeHtml(formatProviderMode(provider))}</span>
      <span>${escapeHtml(formatProviderCoverage(provider))}</span>
    </div>
    <div class="provider-summary" aria-label="真实数据源接入计划">
      <span>${escapeHtml(integrationPlanSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="真实数据源分组">
      <span>${escapeHtml(integrationSources)}</span>
    </div>
    <div class="provider-summary" aria-label="真实数据源合规检查">
      <span>${escapeHtml(integrationChecks)}</span>
    </div>
    <div class="provider-summary" aria-label="真实数据源环境变量">
      <span>${escapeHtml(integrationEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="真实 Provider 注册表">
      <span>${escapeHtml(registrySummary)}</span>
    </div>
    <div class="provider-summary" aria-label="真实 Provider 选择">
      <span>${escapeHtml(registrySelections)}</span>
    </div>
    <div class="provider-summary" aria-label="真实 Provider 候选">
      <span>${escapeHtml(registryCandidates)}</span>
    </div>
    <div class="provider-summary" aria-label="真实 Provider 缺失环境变量">
      <span>${escapeHtml(registryMissingEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="行情 Provider 适配器">
      <span>${escapeHtml(adapterSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="行情 Provider 接口契约">
      <span>${escapeHtml(adapterContracts)}</span>
    </div>
    <div class="provider-summary" aria-label="行情 fixture 读取">
      <span>${escapeHtml(adapterFixture)}</span>
    </div>
    <div class="provider-summary" aria-label="行情 Provider 缺失环境变量">
      <span>${escapeHtml(adapterMissingEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="行情 Provider 安全标记">
      <span>${escapeHtml(adapterSafety)}</span>
    </div>
    <div class="provider-summary" aria-label="行情缓存策略">
      <span>${escapeHtml(adapterCachePolicy)}</span>
    </div>
    <div class="provider-summary" aria-label="行情限流策略">
      <span>${escapeHtml(adapterRateLimitPolicy)}</span>
    </div>
    <div class="provider-summary" aria-label="行情来源署名策略">
      <span>${escapeHtml(adapterAttributionPolicy)}</span>
    </div>
    <div class="provider-summary" aria-label="行情请求门禁">
      <span>${escapeHtml(adapterPolicyGate)}</span>
    </div>
    <div class="provider-summary" aria-label="行情请求门禁检查">
      <span>${escapeHtml(adapterPolicyGateChecks)}</span>
    </div>
    <div class="provider-summary" aria-label="行情请求执行计划">
      <span>${escapeHtml(adapterExecutionPlan)}</span>
    </div>
    <div class="provider-summary" aria-label="行情请求缓存执行">
      <span>${escapeHtml(adapterExecutionCache)}</span>
    </div>
    <div class="provider-summary" aria-label="行情请求降级和审计计划">
      <span>${escapeHtml(adapterExecutionFallback)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时状态">
      <span>${escapeHtml(runtimeSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时计数">
      <span>${escapeHtml(runtimeCounters)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时缓存模型">
      <span>${escapeHtml(runtimeCachePolicy)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时缓存记录">
      <span>${escapeHtml(runtimeCacheRecords)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时限流窗口">
      <span>${escapeHtml(runtimeRateWindows)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时熔断策略">
      <span>${escapeHtml(runtimeCircuitPolicy)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时熔断记录">
      <span>${escapeHtml(runtimeCircuitBreakers)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时最近请求">
      <span>${escapeHtml(runtimeRecent)}</span>
    </div>
    <div class="provider-summary" aria-label="行情运行时能力">
      <span>${escapeHtml(runtimeCapabilities)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据 Provider 适配器">
      <span>${escapeHtml(macroAdapterSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据 Provider 接口契约">
      <span>${escapeHtml(macroAdapterContracts)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据 fixture 读取">
      <span>${escapeHtml(macroAdapterFixture)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据处理管线">
      <span>${escapeHtml(macroAdapterProcessing)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据 Provider 缺失环境变量">
      <span>${escapeHtml(macroAdapterMissingEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="宏观数据 Provider 安全标记">
      <span>${escapeHtml(macroAdapterSafety)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻采集运行时状态">
      <span>${escapeHtml(newsRuntimeSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻采集运行时计数">
      <span>${escapeHtml(newsRuntimeCounters)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻采集冷却记录">
      <span>${escapeHtml(newsRuntimeCooldowns)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻采集最近运行">
      <span>${escapeHtml(newsRuntimeRecent)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻采集运行时能力">
      <span>${escapeHtml(newsRuntimeCapabilities)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻公告 Provider 适配器">
      <span>${escapeHtml(newsAdapterSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻公告 Provider 接口契约">
      <span>${escapeHtml(newsAdapterContracts)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻公告 fixture 读取">
      <span>${escapeHtml(newsAdapterFixture)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻公告处理管线">
      <span>${escapeHtml(newsAdapterProcessing)}</span>
    </div>
    ${renderNewsIntelligencePanel()}
    <div class="provider-summary" aria-label="新闻公告 Provider 缺失环境变量">
      <span>${escapeHtml(newsAdapterMissingEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻公告 Provider 安全标记">
      <span>${escapeHtml(newsAdapterSafety)}</span>
    </div>
    <div class="provider-capabilities" aria-label="数据源能力">${capabilities}</div>
    <p class="provider-warning">真实数据源阻断：${escapeHtml(integrationBlockers)}。</p>
    <p class="provider-warning">Provider 注册阻断：${escapeHtml(registryBlockers)}。</p>
    <p class="provider-warning">行情适配器阻断：${escapeHtml(adapterBlockers)}。</p>
    <p class="provider-warning">行情请求门禁阻断：${escapeHtml(adapterPolicyGateBlockers)}。</p>
    <p class="provider-warning">宏观数据适配器阻断：${escapeHtml(macroAdapterBlockers)}。</p>
    <p class="provider-warning">新闻公告适配器阻断：${escapeHtml(newsAdapterBlockers)}。</p>
    ${
      newsFilingsAdapter?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(newsFilingsAdapter.disclaimer)}</p>`
        : ""
    }
    ${
      marketDataRuntime?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(marketDataRuntime.disclaimer)}</p>`
        : ""
    }
    ${
      newsIngestionRuntime?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(newsIngestionRuntime.disclaimer)}</p>`
        : ""
    }
    ${
      marketDataAdapter?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(marketDataAdapter.disclaimer)}</p>`
        : ""
    }
    ${
      macroDataAdapter?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(macroDataAdapter.disclaimer)}</p>`
        : ""
    }
    ${
      providerRegistry?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(providerRegistry.disclaimer)}</p>`
        : ""
    }
    ${
      integrationPlan?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(integrationPlan.disclaimer)}</p>`
        : ""
    }
    ${
      provider.disclaimer
        ? `<p class="provider-warning">${escapeHtml(provider.disclaimer)}</p>`
        : ""
    }
  `;
}

function renderNewsIntelligencePanel() {
  const records = state.newsIntelligenceRecords || [];
  const matchingRecords = records.filter((record) => {
    const symbolMatches = !record.symbol || record.symbol === state.selectedStock.code;
    const marketMatches = !record.market || record.market === state.selectedMarket;
    return symbolMatches && marketMatches;
  });
  const visibleRecords = (matchingRecords.length ? matchingRecords : records).slice(0, 3);
  const summary = records.length
    ? `已保存 ${records.length} 条新闻情报记录，当前股票匹配 ${matchingRecords.length} 条`
    : "暂未保存新闻情报记录";
  const statusMessage = state.newsIntelligenceMessage || "保存后可用于后续审计、回放和生产数据库迁移验证。";
  const disabled = state.newsIntelligenceStatus === "syncing" ? " disabled" : "";
  const recordMarkup = visibleRecords.length
    ? visibleRecords
        .map(
          (record) => `
            <span>${escapeHtml(record.symbol || "未标注")} · ${escapeHtml(record.title)} · 重要性 ${escapeHtml(String(record.importanceScore))}/100 · 可信度 ${escapeHtml(String(record.sourceCredibilityScore))}/100</span>
          `,
        )
        .join("")
    : "<span>暂无可展示的已保存记录</span>";

  return `
    <div class="provider-summary" aria-label="新闻情报持久化状态">
      <span>${escapeHtml(summary)}</span>
    </div>
    <div class="provider-summary" aria-label="新闻情报持久化说明">
      <span>${escapeHtml(statusMessage)}</span>
    </div>
    <div class="provider-actions" aria-label="新闻情报持久化操作">
      <button class="secondary-button" data-save-news-intelligence type="button"${disabled}>保存当前股票新闻情报</button>
      <button class="secondary-button" data-refresh-news-intelligence type="button"${disabled}>刷新已保存记录</button>
    </div>
    <div class="provider-capabilities" aria-label="新闻情报历史记录">${recordMarkup}</div>
  `;
}

function renderAiServiceDetails(aiService) {
  if (!aiService) {
    return `
      <p class="provider-warning">AI 服务能力未返回，当前仅使用本机样例分析。</p>
    `;
  }

  const capabilities = aiService.capabilities.length
    ? aiService.capabilities
        .map(
          (capability) =>
            `<span>${escapeHtml(aiServiceCapabilityLabels[capability] || capability)}</span>`,
        )
        .join("")
    : "<span>能力未标注</span>";
  const providerAdapter = aiService.providerAdapter;
  const adapterSummary = providerAdapter
    ? `AI provider 适配器 ${providerAdapter.status} · ${providerAdapter.runtimeMode} · ${providerAdapter.selectedProvider || "未选择"} · ${providerAdapter.selectedModel || "未选择模型"}`
    : "AI provider 适配器未返回";
  const adapterContracts = providerAdapter?.endpointContracts?.length
    ? providerAdapter.endpointContracts
        .map((contract) => `${contract.method || contract.id}:${contract.status}`)
        .join(" / ")
    : "AI provider 接口契约未返回";
  const promptContract = providerAdapter?.promptContract
    ? `提示词 ${providerAdapter.promptContract.version || "未标注"} · ${providerAdapter.promptContract.outputMode || "输出未标注"} · ${providerAdapter.promptContract.probabilityLanguage || "概率语言未标注"} · ${providerAdapter.promptContract.requiresNoGuaranteeDisclaimer ? "必须免责声明" : "免责声明未确认"}`
    : "AI 提示词契约未返回";
  const responseSchema = providerAdapter?.responseSchema
    ? `响应 schema ${providerAdapter.responseSchema.status} · 必填 ${providerAdapter.responseSchema.requiredFields.length} · 禁止 ${providerAdapter.responseSchema.forbiddenFields.join(" / ") || "未标注"}`
    : "AI 响应 schema 未返回";
  const complianceGate = providerAdapter?.complianceGate
    ? `合规门禁 ${providerAdapter.complianceGate.status} · live ${providerAdapter.complianceGate.canCallLiveModel ? "可调用" : "不可调用"}`
    : "AI 合规门禁未返回";
  const complianceChecks = providerAdapter?.complianceGate?.checks?.length
    ? providerAdapter.complianceGate.checks.map((check) => `${check.id}:${check.status}`).join(" / ")
    : "AI 合规检查项未返回";
  const adapterMissingEnv = providerAdapter?.missingEnvVars?.length
    ? providerAdapter.missingEnvVars.join(" / ")
    : "暂无 AI provider 缺失环境变量";
  const adapterSafety = providerAdapter
    ? `${providerAdapter.safety?.noVendorNetworkCalls ? "不联网" : "可能联网"} · ${providerAdapter.safety?.noTradingActions ? "不交易" : "交易风险未标注"} · ${providerAdapter.safety?.forbidsGuaranteedReturns ? "禁止收益保证" : "收益保证边界未标注"} · ${providerAdapter.canCallLiveModel ? "可调用真实模型" : "不可调用真实模型"}`
    : "AI provider 安全标记未返回";
  const adapterBlockers = providerAdapter?.blockedReasons?.length
    ? providerAdapter.blockedReasons.join(" / ")
    : "暂无 AI provider 阻断项";

  return `
    <div class="provider-summary" aria-label="AI 服务状态">
      <span>${escapeHtml(aiService.name)}</span>
      <span>${escapeHtml(formatProviderMode(aiService))}</span>
      <span>${escapeHtml(aiService.model)}</span>
    </div>
    <div class="provider-summary" aria-label="AI Provider 适配器">
      <span>${escapeHtml(adapterSummary)}</span>
    </div>
    <div class="provider-summary" aria-label="AI Provider 接口契约">
      <span>${escapeHtml(adapterContracts)}</span>
    </div>
    <div class="provider-summary" aria-label="AI 提示词契约">
      <span>${escapeHtml(promptContract)}</span>
    </div>
    <div class="provider-summary" aria-label="AI 响应 Schema">
      <span>${escapeHtml(responseSchema)}</span>
    </div>
    <div class="provider-summary" aria-label="AI 合规门禁">
      <span>${escapeHtml(complianceGate)}</span>
    </div>
    <div class="provider-summary" aria-label="AI 合规检查">
      <span>${escapeHtml(complianceChecks)}</span>
    </div>
    <div class="provider-summary" aria-label="AI Provider 缺失环境变量">
      <span>${escapeHtml(adapterMissingEnv)}</span>
    </div>
    <div class="provider-summary" aria-label="AI Provider 安全标记">
      <span>${escapeHtml(adapterSafety)}</span>
    </div>
    <div class="provider-capabilities" aria-label="AI 服务能力">${capabilities}</div>
    <p class="provider-warning">AI provider 阻断：${escapeHtml(adapterBlockers)}。</p>
    ${
      providerAdapter?.disclaimer
        ? `<p class="provider-warning">${escapeHtml(providerAdapter.disclaimer)}</p>`
        : ""
    }
    ${
      aiService.disclaimer
        ? `<p class="provider-warning">${escapeHtml(aiService.disclaimer)}</p>`
        : ""
    }
  `;
}

function renderAiServiceState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const aiService = getAiServiceStatus();

  if (status === "checking") {
    elements.aiServiceState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查 AI 服务</strong>
        <p>正在读取后端分析模型状态，用于确认当前输出的来源和合规边界。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    elements.aiServiceState.innerHTML = `
      <div class="state-panel success-state">
        <strong>AI 分析服务已连接</strong>
        <p>${message || "当前分析结果会标注模型来源、样例状态和风险提示。"}</p>
        ${renderAiServiceDetails(aiService)}
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.aiServiceState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>AI 服务未连接</strong>
        <p>${message || "后端 AI 服务暂不可用，App 会继续使用本机样例分析。"}</p>
      </div>
    `;
    return;
  }

  elements.aiServiceState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机样例分析</strong>
      <p>连接后端后，这里会显示 AI 服务名称、模型版本、能力范围和合规提示。</p>
    </div>
  `;
}

function renderComplianceServiceState(
  status = localStorage.getItem("apiHealthStatus") || "idle",
  message = "",
) {
  const complianceService = getComplianceServiceStatus();

  if (status === "checking") {
    elements.complianceServiceState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查合规策略</strong>
        <p>正在读取免责声明、禁用表达、风险确认和公开发布门禁。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const capabilities = complianceService?.capabilities?.length
      ? complianceService.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(complianceCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const missingProduction = complianceService?.missingProductionCapabilities?.length
      ? complianceService.missingProductionCapabilities
          .map((capability) => complianceRequirementLabels[capability] || capability)
          .join(" / ")
      : "未标注";
    const outputPolicy = complianceService?.outputPolicy || {};
    const acknowledgementPolicy = complianceService?.acknowledgementPolicy || {};
    const gate = complianceService?.complianceGate || {};
    const checks = Array.isArray(gate.checks)
      ? gate.checks.map((check) => `${check.id}:${check.status}`).join(" / ")
      : "";
    const prohibited = complianceService?.prohibitedClaims?.length
      ? complianceService.prohibitedClaims.slice(0, 6).join(" / ")
      : "未标注";
    const outputPolicyText = [
      outputPolicy.probabilityLanguage && `概率语言 ${outputPolicy.probabilityLanguage}`,
      outputPolicy.forbidsGuaranteedReturns && "禁止收益保证",
      outputPolicy.forbidsMustBuySell && "禁止必须买卖",
      outputPolicy.requiresSourceSeparation && "区分事实/模型/观点",
      outputPolicy.requiresNearbyDisclaimer && "就近免责声明",
    ]
      .filter(Boolean)
      .join(" · ");
    const acknowledgementText = [
      acknowledgementPolicy.version || "",
      acknowledgementPolicy.requiresRiskAcknowledgement && "风险确认",
      acknowledgementPolicy.requiresOptionalPortfolioNotice && "持仓非必填说明",
      acknowledgementPolicy.recordsDisclosureVersion && "披露版本记录",
      acknowledgementPolicy.blocksPublicReleaseWithoutReview && "未复核阻断公开发布",
    ]
      .filter(Boolean)
      .join(" · ");
    const gateText = gate.status
      ? `合规门禁 ${gate.status} · ${
          gate.canReleasePublicAnalysis ? "public beta 可发布" : "public beta 不可发布"
        }`
      : "";
    const blocker = Array.isArray(gate.blockedReasons) && gate.blockedReasons.length
      ? gate.blockedReasons[0]
      : "";
    const latestAcknowledgement = (state.complianceAcknowledgements || [])[0] || null;
    const accountState = getAccountState();
    const canRecordAcknowledgement = accountState.status === "authenticated";
    const acknowledgementStatusText =
      state.complianceAcknowledgementStatus === "saving"
        ? "正在记录风险确认..."
        : latestAcknowledgement
          ? `最近确认 ${latestAcknowledgement.version || "未标注版本"} · ${latestAcknowledgement.acceptedAt || "时间未标注"}`
          : state.complianceAcknowledgementMessage || "尚未记录当前用户的风险确认。";
    const latestSuitability = (state.suitabilityQuestionnaires || [])[0] || null;
    const suitabilityStatusText =
      state.suitabilityStatus === "saving"
        ? "正在保存适当性问卷..."
        : latestSuitability
          ? `最近问卷 ${latestSuitability.version || "未标注版本"} · ${latestSuitability.levelLabel || latestSuitability.suitabilityLevel || "未评级"} · ${latestSuitability.completedAt || "时间未标注"}`
          : state.suitabilityMessage || "尚未填写当前用户的适当性问卷。";
    const selectedSuitabilityAnswers = latestSuitability?.answers || {};

    elements.complianceServiceState.innerHTML = `
      <div class="state-panel success-state">
        <strong>合规策略服务已连接</strong>
        <p>${message || "当前合规策略用于集中约束 AI 分析的表达、免责声明和公开发布边界。"}</p>
        ${
          complianceService
            ? `
              <div class="provider-summary" aria-label="合规策略服务状态">
                <span>${escapeHtml(complianceService.name)}</span>
                <span>${escapeHtml(formatProviderMode(complianceService))}</span>
                <span>${escapeHtml(complianceService.reviewMode)}</span>
              </div>
              <p class="provider-warning">必须免责声明：${escapeHtml(complianceService.requiredDisclaimer)}</p>
              <p class="provider-warning">禁用表达：${escapeHtml(prohibited)}</p>
              ${outputPolicyText ? `<p class="provider-note">${escapeHtml(outputPolicyText)}</p>` : ""}
              ${
                acknowledgementText
                  ? `<p class="provider-note">${escapeHtml(acknowledgementText)}</p>`
                  : ""
              }
              ${gateText ? `<p class="provider-note">${escapeHtml(gateText)}</p>` : ""}
              ${checks ? `<p class="provider-note">${escapeHtml(checks)}</p>` : ""}
              <div class="provider-summary" aria-label="用户风险确认记录">
                <span>风险确认记录</span>
                <span>${escapeHtml(acknowledgementStatusText)}</span>
              </div>
              <div class="settings-actions">
                <button class="secondary-button" data-save-compliance-ack type="button"${
                  canRecordAcknowledgement ? "" : " disabled"
                }>确认免责声明和市场风险</button>
                <button class="text-button" data-refresh-compliance-ack type="button"${
                  canRecordAcknowledgement ? "" : " disabled"
                }>刷新确认记录</button>
              </div>
              <div class="provider-summary" aria-label="用户适当性问卷">
                <span>适当性问卷</span>
                <span>${escapeHtml(suitabilityStatusText)}</span>
              </div>
              <div class="suitability-form" aria-label="适当性问卷样例">
                <label>
                  <span>风险承受</span>
                  <select data-suitability-risk-tolerance${canRecordAcknowledgement ? "" : " disabled"}>
                    <option value="low"${selectedSuitabilityAnswers.riskTolerance === "low" ? " selected" : ""}>低</option>
                    <option value="medium"${selectedSuitabilityAnswers.riskTolerance === "medium" || !selectedSuitabilityAnswers.riskTolerance ? " selected" : ""}>中</option>
                    <option value="high"${selectedSuitabilityAnswers.riskTolerance === "high" ? " selected" : ""}>高</option>
                  </select>
                </label>
                <label>
                  <span>投资经验</span>
                  <select data-suitability-investment-experience${canRecordAcknowledgement ? "" : " disabled"}>
                    <option value="new"${selectedSuitabilityAnswers.investmentExperience === "new" || !selectedSuitabilityAnswers.investmentExperience ? " selected" : ""}>新手</option>
                    <option value="some"${selectedSuitabilityAnswers.investmentExperience === "some" ? " selected" : ""}>有一定经验</option>
                    <option value="experienced"${selectedSuitabilityAnswers.investmentExperience === "experienced" ? " selected" : ""}>经验较多</option>
                  </select>
                </label>
                <label>
                  <span>投资期限</span>
                  <select data-suitability-investment-horizon${canRecordAcknowledgement ? "" : " disabled"}>
                    <option value="short"${selectedSuitabilityAnswers.investmentHorizon === "short" ? " selected" : ""}>短期</option>
                    <option value="medium"${selectedSuitabilityAnswers.investmentHorizon === "medium" || !selectedSuitabilityAnswers.investmentHorizon ? " selected" : ""}>中期</option>
                    <option value="long"${selectedSuitabilityAnswers.investmentHorizon === "long" ? " selected" : ""}>长期</option>
                  </select>
                </label>
                <label>
                  <span>流动性需求</span>
                  <select data-suitability-liquidity-need${canRecordAcknowledgement ? "" : " disabled"}>
                    <option value="high"${selectedSuitabilityAnswers.liquidityNeed === "high" ? " selected" : ""}>高</option>
                    <option value="medium"${selectedSuitabilityAnswers.liquidityNeed === "medium" || !selectedSuitabilityAnswers.liquidityNeed ? " selected" : ""}>中</option>
                    <option value="low"${selectedSuitabilityAnswers.liquidityNeed === "low" ? " selected" : ""}>低</option>
                  </select>
                </label>
              </div>
              <div class="settings-actions">
                <button class="secondary-button" data-save-suitability type="button"${
                  canRecordAcknowledgement ? "" : " disabled"
                }>保存适当性问卷</button>
                <button class="text-button" data-refresh-suitability type="button"${
                  canRecordAcknowledgement ? "" : " disabled"
                }>刷新问卷记录</button>
              </div>
              <div class="provider-capabilities" aria-label="合规策略能力">${capabilities}</div>
              <p class="provider-warning">上线前仍需补齐：${escapeHtml(missingProduction)}。</p>
              ${
                canRecordAcknowledgement
                  ? ""
                  : `<p class="provider-warning">请先登录后端账号，风险确认才能写入用户记录和审计日志。</p>`
              }
              ${blocker ? `<p class="provider-warning">${escapeHtml(blocker)}</p>` : ""}
              ${
                complianceService.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(complianceService.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">合规策略状态未返回，当前仍按本机免责声明样例处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.complianceServiceState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>合规策略服务未连接</strong>
        <p>${message || "后端合规策略暂不可用，App 会继续显示本机免责声明样例。"}</p>
      </div>
    `;
    return;
  }

  elements.complianceServiceState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机合规样例</strong>
      <p>连接后端后，这里会显示免责声明、禁用表达、风险确认和公开发布门禁。</p>
    </div>
  `;
}

function renderRepositoryState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const repository = getRepositoryStatus();

  if (status === "checking") {
    elements.repositoryState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查数据仓储</strong>
        <p>正在读取后端仓储模式、容量限制和持久化边界。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const capabilities = repository?.capabilities?.length
      ? repository.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(repositoryCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const limits = repository?.limits || {};
    const limitText = [
      Number.isFinite(Number(limits.analysisHistory)) && `分析历史 ${limits.analysisHistory}`,
      Number.isFinite(Number(limits.notificationOutbox)) && `通知 ${limits.notificationOutbox}`,
      Number.isFinite(Number(limits.auditLogs)) && `审计 ${limits.auditLogs}`,
      Number.isFinite(Number(limits.jobRuns)) && `任务 ${limits.jobRuns}`,
    ]
      .filter(Boolean)
      .join(" / ");

    elements.repositoryState.innerHTML = `
      <div class="state-panel success-state">
        <strong>数据仓储已连接</strong>
        <p>${message || "当前仓储用于原型同步验证，生产数据库仍需后续接入。"}</p>
        ${
          repository
            ? `
              <div class="provider-summary" aria-label="数据仓储状态">
                <span>${escapeHtml(repository.name)}</span>
                <span>${escapeHtml(formatProviderMode(repository))}</span>
                <span>${escapeHtml(repository.persistenceMode)}</span>
              </div>
              <div class="provider-capabilities" aria-label="数据仓储能力">${capabilities}</div>
              ${limitText ? `<p class="provider-warning">样例容量限制：${escapeHtml(limitText)}。</p>` : ""}
              ${
                repository.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(repository.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">仓储状态未返回，当前仍按本机样例处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.repositoryState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>数据仓储未连接</strong>
        <p>${message || "后端仓储暂不可用，本机样例数据仍可继续使用。"}</p>
      </div>
    `;
    return;
  }

  elements.repositoryState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机样例存储</strong>
      <p>连接后端后，这里会显示内存、JSON 文件桥或未来生产数据库状态。</p>
    </div>
  `;
}

function renderDatabaseState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const database = getDatabaseStatus();

  if (status === "checking") {
    elements.databaseState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查数据库服务</strong>
        <p>正在读取存储桥、计划表和生产数据库缺口。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const plannedTables = database?.plannedTables?.length
      ? database.plannedTables
          .map((table) => databaseTableLabels[table] || table)
          .join(" / ")
      : "未标注";
    const capabilities = database?.capabilities?.length
      ? database.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(databaseCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const missingProduction = database?.missingProductionCapabilities?.length
      ? database.missingProductionCapabilities
          .map((capability) => databaseRequirementLabels[capability] || capability)
          .join(" / ")
      : "未标注";
    const contractSummary = database?.repositoryContract
      ? `仓储契约 ${database.repositoryContract.status} · ${database.repositoryContract.version || "未标注版本"} · 缺失方法 ${database.repositoryContract.missingMethods.length}`
      : "仓储契约未返回";
    const migrationChecks = database?.migrationChecks?.length
      ? database.migrationChecks
          .map(
            (check) =>
              `${databaseMigrationCheckLabels[check.id] || check.label || check.id}：${check.status}`,
          )
          .join(" / ")
      : "迁移检查未返回";
    const tableMappings = database?.repositoryContract?.tableMappings?.length
      ? database.repositoryContract.tableMappings
          .slice(0, 6)
          .map((mapping) => `${mapping.domain}->${databaseTableLabels[mapping.table] || mapping.table}`)
          .join(" / ")
      : "表映射未返回";
    const productionAdapter = database?.productionAdapter;
    const adapterSummary = productionAdapter
      ? `${productionAdapter.name || "Production adapter"} · ${productionAdapter.status} · ${productionAdapter.provider || "provider 未标注"}`
      : "生产数据库适配器未返回";
    const adapterFallback = productionAdapter?.fallback?.reason || "回退原因未标注";
    const adapterPlan = Array.isArray(productionAdapter?.migrationPlan?.steps)
      ? productionAdapter.migrationPlan.steps
          .slice(0, 4)
          .map((step) => `${step.id}:${step.status}`)
          .join(" / ")
      : "迁移计划未返回";
    const dryRun = database?.migrationDryRun || productionAdapter?.migrationDryRun;
    const dryRunSummary = dryRun
      ? `迁移预演 ${dryRun.status} · ${dryRun.provider || "provider 未标注"} · ${dryRun.tableOrder.length} 张表`
      : "迁移预演未返回";
    const dryRunSteps = dryRun?.steps?.length
      ? dryRun.steps
          .slice(0, 6)
          .map((step) => `${databaseDryRunStepLabels[step.id] || step.id}:${step.status}`)
          .join(" / ")
      : "迁移预演步骤未返回";
    const dryRunTables = dryRun?.tablePlan?.length
      ? dryRun.tablePlan
          .slice(0, 8)
          .map((entry) => `${entry.order}.${databaseTableLabels[entry.table] || entry.table}`)
          .join(" / ")
      : "迁移表顺序未返回";
    const dryRunBlockers = dryRun?.blockedReasons?.length
      ? dryRun.blockedReasons.join(" / ")
      : "暂无阻断项";
    const dryRunWarnings = dryRun?.warnings?.length ? dryRun.warnings.slice(0, 2).join(" / ") : "";
    const sqlDraft = database?.migrationSqlDraft || dryRun?.migrationSqlDraft || productionAdapter?.migrationSqlDraft;
    const sqlDraftSummary = sqlDraft
      ? `SQL 草案 ${sqlDraft.status} · ${sqlDraft.dialect || "dialect 未标注"} · ${sqlDraft.statementCount} 条 · ${sqlDraft.checksum || "无校验码"}`
      : "SQL 草案未返回";
    const sqlDraftSafety = sqlDraft
      ? `${sqlDraft.destructive ? "包含破坏性语句" : "无破坏性语句"} · ${sqlDraft.reviewRequired ? "需要人工审查" : "无需人工审查"}`
      : "SQL 安全标记未返回";
    const sqlDraftPreview = sqlDraft?.preview?.length
      ? sqlDraft.preview
          .slice(0, 2)
          .map((statement) => statement.split("\n")[0])
          .join(" / ")
      : "SQL 预览未返回";
    const migrationPackage = database?.migrationPackage || productionAdapter?.migrationPackage;
    const packageSummary = migrationPackage
      ? `迁移包 ${migrationPackage.status} · ${migrationPackage.version || "未标注版本"} · ${migrationPackage.executionMode || "mode 未标注"}`
      : "迁移包未返回";
    const packageManifest = migrationPackage
      ? `manifest ${migrationPackage.manifestChecksum || "无校验码"} · ${migrationPackage.targetDialect || "dialect 未标注"} · ${migrationPackage.canExecute ? "可执行" : "不可执行"}`
      : "迁移包 manifest 未返回";
    const packagePreflight = migrationPackage?.preflightChecks?.length
      ? migrationPackage.preflightChecks
          .slice(0, 5)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "上线前检查未返回";
    const packageGates = migrationPackage?.releaseGates?.length
      ? migrationPackage.releaseGates.slice(0, 3).join(" / ")
      : "发布门禁未返回";
    const readOnlyHealth =
      database?.readOnlyConnectionHealth || productionAdapter?.readOnlyConnectionHealth;
    const readOnlySummary = readOnlyHealth
      ? `只读连接 ${readOnlyHealth.status} · ${readOnlyHealth.provider || "provider 未标注"} · ${readOnlyHealth.driver?.package || "driver 未标注"}`
      : "只读连接检查未返回";
    const readOnlySafety = readOnlyHealth
      ? `${readOnlyHealth.safety?.readOnlyOnly ? "只读" : "未标注只读"} · ${readOnlyHealth.safety?.canWrite ? "可写" : "不可写"} · ${readOnlyHealth.safety?.canMigrate ? "可迁移" : "不可迁移"}`
      : "只读安全标记未返回";
    const readOnlyChecks = readOnlyHealth?.checks?.length
      ? readOnlyHealth.checks
          .slice(0, 5)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "只读检查项未返回";
    const readOnlyBlockers = readOnlyHealth?.blockedReasons?.length
      ? readOnlyHealth.blockedReasons.join(" / ")
      : "暂无只读连接阻断项";
    const driverSetup = database?.driverSetupPlan || productionAdapter?.driverSetupPlan;
    const driverSetupSummary = driverSetup
      ? `驱动计划 ${driverSetup.status} · ${driverSetup.targetDriver || "driver 未标注"} · ${driverSetup.canInstallAutomatically ? "可自动安装" : "不可自动安装"}`
      : "驱动接入计划未返回";
    const driverSetupChecks = driverSetup?.configChecks?.length
      ? driverSetup.configChecks
          .slice(0, 5)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "驱动配置检查未返回";
    const driverSetupEnv = driverSetup?.envVars?.length
      ? driverSetup.envVars
          .slice(0, 4)
          .map((entry) => `${entry.name}:${entry.configured ? "ok" : "missing"}`)
          .join(" / ")
      : "驱动环境变量未返回";
    const driverSetupBlockers = driverSetup?.blockedReasons?.length
      ? driverSetup.blockedReasons.join(" / ")
      : "暂无驱动接入阻断项";
    const repositoryAdapterPlan =
      database?.repositoryAdapterPlan || productionAdapter?.repositoryAdapterPlan;
    const repositoryAdapterSummary = repositoryAdapterPlan
      ? `仓储切换 ${repositoryAdapterPlan.status} · ${repositoryAdapterPlan.targetAdapter || "adapter 未标注"} · ${repositoryAdapterPlan.runtimeMode || "runtime 未标注"}`
      : "仓储切换计划未返回";
    const repositoryAdapterMethods = repositoryAdapterPlan?.methodPlan
      ? `方法 ${repositoryAdapterPlan.methodPlan.requiredCount || 0} 个 · 缺失 ${repositoryAdapterPlan.methodPlan.missingCount || 0} 个 · ${repositoryAdapterPlan.mockFallbackRequired ? "需要回退" : "未标注回退"}`
      : "仓储方法计划未返回";
    const repositoryAdapterGates = repositoryAdapterPlan?.switchGates?.length
      ? repositoryAdapterPlan.switchGates
          .slice(0, 6)
          .map((gate) => `${gate.id}:${gate.status}`)
          .join(" / ")
      : "仓储切换门禁未返回";
    const repositoryAdapterDomains = repositoryAdapterPlan?.dataDomains?.length
      ? repositoryAdapterPlan.dataDomains
          .slice(0, 6)
          .map((entry) => `${entry.domain}->${databaseTableLabels[entry.table] || entry.table}`)
          .join(" / ")
      : "仓储数据域未返回";
    const repositoryAdapterBlockers = repositoryAdapterPlan?.blockedReasons?.length
      ? repositoryAdapterPlan.blockedReasons.join(" / ")
      : "暂无仓储切换阻断项";
    const repositoryRuntimeGuard =
      database?.repositoryRuntimeGuard || productionAdapter?.repositoryRuntimeGuard;
    const repositoryRuntimeSummary = repositoryRuntimeGuard
      ? `运行时保护 ${repositoryRuntimeGuard.status} · 请求 ${repositoryRuntimeGuard.requestedMode || "未标注"} · 生效 ${repositoryRuntimeGuard.effectiveMode || "未标注"}`
      : "仓储运行时保护器未返回";
    const repositoryRuntimeChecks = repositoryRuntimeGuard?.checks?.length
      ? repositoryRuntimeGuard.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "仓储运行时检查未返回";
    const repositoryRuntimeSafety = repositoryRuntimeGuard?.safety
      ? `${repositoryRuntimeGuard.safety.noAutomaticSwitch ? "禁止自动切换" : "未标注自动切换"} · ${repositoryRuntimeGuard.safety.mockFallbackRequired ? "保留 mock 回退" : "未标注回退"} · ${repositoryRuntimeGuard.safety.requiresHumanApproval ? "需人工批准" : "未标注批准"}`
      : "仓储运行时安全标记未返回";
    const repositoryRuntimeModes = repositoryRuntimeGuard?.allowedModes?.length
      ? repositoryRuntimeGuard.allowedModes.join(" / ")
      : "仓储允许模式未返回";
    const repositoryRuntimeBlockers = repositoryRuntimeGuard?.blockedReasons?.length
      ? repositoryRuntimeGuard.blockedReasons.join(" / ")
      : "暂无仓储运行时阻断项";
    const productionRepositoryAdapter =
      database?.productionRepositoryAdapter || productionAdapter?.productionRepositoryAdapter;
    const productionRepositorySummary = productionRepositoryAdapter
      ? `生产仓储 ${productionRepositoryAdapter.status} · ${productionRepositoryAdapter.name || "未命名"} · ${productionRepositoryAdapter.runtimeMode || "runtime 未标注"}`
      : "生产仓储适配器骨架未返回";
    const productionRepositoryMethods = productionRepositoryAdapter?.methodCoverage
      ? `方法 ${productionRepositoryAdapter.methodCoverage.plannedCount || 0}/${productionRepositoryAdapter.methodCoverage.requiredCount || 0} · 缺失 ${productionRepositoryAdapter.methodCoverage.missingCount || 0}`
      : "生产仓储方法覆盖未返回";
    const productionRepositoryTables = productionRepositoryAdapter?.tableCoverage?.length
      ? productionRepositoryAdapter.tableCoverage
          .slice(0, 6)
          .map((entry) => `${databaseTableLabels[entry.table] || entry.table}:${entry.operationCount}`)
          .join(" / ")
      : "生产仓储表覆盖未返回";
    const productionRepositorySafety = productionRepositoryAdapter?.safety
      ? `${productionRepositoryAdapter.safety.noNetworkCalls ? "不联网" : "未标注联网"} · ${productionRepositoryAdapter.safety.noWrites ? "不写库" : "未标注写库"} · ${productionRepositoryAdapter.safety.noRuntimeSwitch ? "不切换运行时" : "未标注切换"}`
      : "生产仓储安全标记未返回";
    const productionRepositoryBlockers = productionRepositoryAdapter?.blockedReasons?.length
      ? productionRepositoryAdapter.blockedReasons.join(" / ")
      : "暂无生产仓储适配器阻断项";
    const productionRepositorySmokeTest =
      database?.productionRepositorySmokeTest || productionAdapter?.productionRepositorySmokeTest;
    const productionSmokeSummary = productionRepositorySmokeTest
      ? `只读冒烟 ${productionRepositorySmokeTest.status} · ${productionRepositorySmokeTest.runtimeMode || "runtime 未标注"} · ${productionRepositorySmokeTest.canExecuteAutomatically ? "可自动执行" : "不可自动执行"}`
      : "生产仓储只读冒烟计划未返回";
    const productionSmokeCoverage = productionRepositorySmokeTest?.coverage
      ? `只读操作 ${productionRepositorySmokeTest.coverage.readOnlyOperationCount || 0} · 关键表 ${productionRepositorySmokeTest.coverage.criticalTableCount || 0} · 写操作 ${productionRepositorySmokeTest.coverage.writeOperationCount || 0}`
      : "生产仓储只读冒烟覆盖未返回";
    const productionSmokeChecks = productionRepositorySmokeTest?.checks?.length
      ? productionRepositorySmokeTest.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储只读冒烟检查未返回";
    const productionSmokeQueries = productionRepositorySmokeTest?.smokeQueries?.length
      ? productionRepositorySmokeTest.smokeQueries
          .slice(0, 4)
          .map((query) => `${query.id}:${query.safety || "safety 未标注"}`)
          .join(" / ")
      : "生产仓储只读冒烟 SQL 未返回";
    const productionSmokeBlockedStatements = productionRepositorySmokeTest?.blockedStatements?.length
      ? productionRepositorySmokeTest.blockedStatements.slice(0, 6).join(" / ")
      : "写入/DDL 阻断语句未返回";
    const productionSmokeBlockers = productionRepositorySmokeTest?.blockedReasons?.length
      ? productionRepositorySmokeTest.blockedReasons.join(" / ")
      : "暂无生产仓储只读冒烟阻断项";
    const productionRepositorySqlContract =
      database?.productionRepositorySqlContract ||
      productionAdapter?.productionRepositorySqlContract;
    const productionSqlSummary = productionRepositorySqlContract
      ? `SQL 契约 ${productionRepositorySqlContract.status} · ${productionRepositorySqlContract.dialect || "dialect 未标注"} · ${productionRepositorySqlContract.runtimeMode || "runtime 未标注"}`
      : "生产仓储 SQL 契约未返回";
    const productionSqlCoverage = productionRepositorySqlContract
      ? `语句 ${productionRepositorySqlContract.statementCount || 0} · 读 ${productionRepositorySqlContract.readStatementCount || 0} · 写 ${productionRepositorySqlContract.writeStatementCount || 0}`
      : "生产仓储 SQL 覆盖未返回";
    const productionSqlChecks = productionRepositorySqlContract?.checks?.length
      ? productionRepositorySqlContract.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储 SQL 检查未返回";
    const productionSqlSamples = productionRepositorySqlContract?.statements?.length
      ? productionRepositorySqlContract.statements
          .slice(0, 3)
          .map(
            (statement) =>
              `${statement.method}:${statement.parameterStyle || "参数未标注"}:${statement.status}`,
          )
          .join(" / ")
      : "生产仓储 SQL 样例未返回";
    const productionSqlSafety = productionRepositorySqlContract?.safety
      ? `${productionRepositorySqlContract.safety.noSqlExecution ? "不执行 SQL" : "未标注执行"} · ${productionRepositorySqlContract.safety.parameterizedValuesOnly ? "仅参数化值" : "未标注参数化"} · ${productionRepositorySqlContract.safety.noRuntimeSwitch ? "不切换运行时" : "未标注切换"}`
      : "生产仓储 SQL 安全标记未返回";
    const productionSqlTables = productionRepositorySqlContract?.tableWhitelist?.length
      ? productionRepositorySqlContract.tableWhitelist.slice(0, 6).join(" / ")
      : "生产仓储 SQL 表白名单未返回";
    const productionSqlBlockers = productionRepositorySqlContract?.blockedReasons?.length
      ? productionRepositorySqlContract.blockedReasons.join(" / ")
      : "暂无生产仓储 SQL 契约阻断项";
    const productionRepositoryExecutionPlan =
      database?.productionRepositoryExecutionPlan ||
      productionAdapter?.productionRepositoryExecutionPlan;
    const productionExecutionSummary = productionRepositoryExecutionPlan
      ? `执行计划 ${productionRepositoryExecutionPlan.status} · ${productionRepositoryExecutionPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryExecutionPlan.canExecuteSql ? "可执行 SQL" : "不可执行 SQL"}`
      : "生产仓储执行计划未返回";
    const productionExecutionCoverage = productionRepositoryExecutionPlan?.coverage
      ? `校验器 ${productionRepositoryExecutionPlan.coverage.validatorCount || 0} · 写事务 ${productionRepositoryExecutionPlan.coverage.transactionWrappedWriteCount || 0} · 审计写 ${productionRepositoryExecutionPlan.coverage.auditRequiredWriteCount || 0}`
      : "生产仓储执行覆盖未返回";
    const productionExecutionSteps = productionRepositoryExecutionPlan?.executionSteps?.length
      ? productionRepositoryExecutionPlan.executionSteps
          .slice(0, 6)
          .map((step) => `${step.id}:${step.status}`)
          .join(" / ")
      : "生产仓储执行步骤未返回";
    const productionExecutionValidators = productionRepositoryExecutionPlan?.parameterValidators?.length
      ? productionRepositoryExecutionPlan.parameterValidators
          .slice(0, 4)
          .map((validator) => `${validator.parameterName}:${validator.type}`)
          .join(" / ")
      : "生产仓储参数校验未返回";
    const productionExecutionTransaction = productionRepositoryExecutionPlan?.transactionWrapper
      ? `${productionRepositoryExecutionPlan.transactionWrapper.isolationLevel || "隔离级别未标注"} · ${productionRepositoryExecutionPlan.transactionWrapper.begin || "BEGIN 未标注"}/${productionRepositoryExecutionPlan.transactionWrapper.commit || "COMMIT 未标注"}/${productionRepositoryExecutionPlan.transactionWrapper.rollback || "ROLLBACK 未标注"}`
      : "生产仓储事务包装未返回";
    const productionExecutionAudit = productionRepositoryExecutionPlan?.auditWritePolicy
      ? `${productionRepositoryExecutionPlan.auditWritePolicy.eventTypePrefix || "审计前缀未标注"} · ${productionRepositoryExecutionPlan.auditWritePolicy.redactParameterValues ? "参数值脱敏" : "参数值未标注"} · ${productionRepositoryExecutionPlan.auditWritePolicy.hashChainRequired ? "Hash 链" : "Hash 链未标注"}`
      : "生产仓储执行审计策略未返回";
    const productionExecutionSafety = productionRepositoryExecutionPlan?.safety
      ? `${productionRepositoryExecutionPlan.safety.noSqlExecution ? "不执行 SQL" : "未标注执行"} · ${productionRepositoryExecutionPlan.safety.validatesBeforeExecution ? "先校验" : "未标注校验"} · ${productionRepositoryExecutionPlan.safety.auditRequiredForWrites ? "写入需审计" : "未标注审计"}`
      : "生产仓储执行安全标记未返回";
    const productionExecutionBlockers = productionRepositoryExecutionPlan?.blockedReasons?.length
      ? productionRepositoryExecutionPlan.blockedReasons.join(" / ")
      : "暂无生产仓储执行计划阻断项";
    const productionRepositoryParameterValidationPlan =
      database?.productionRepositoryParameterValidationPlan ||
      productionAdapter?.productionRepositoryParameterValidationPlan;
    const productionParameterSummary = productionRepositoryParameterValidationPlan
      ? `参数校验 ${productionRepositoryParameterValidationPlan.status} · ${productionRepositoryParameterValidationPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryParameterValidationPlan.canValidateLocally ? "可本地校验" : "不可本地校验"}`
      : "生产仓储参数校验计划未返回";
    const productionParameterCoverage = productionRepositoryParameterValidationPlan
      ? `校验器 ${productionRepositoryParameterValidationPlan.validatorCount || 0} · 类型 ${productionRepositoryParameterValidationPlan.validatorTypes?.length || 0}`
      : "生产仓储参数校验覆盖未返回";
    const productionParameterTypes = productionRepositoryParameterValidationPlan?.validatorTypes?.length
      ? productionRepositoryParameterValidationPlan.validatorTypes.slice(0, 6).join(" / ")
      : "生产仓储参数校验类型未返回";
    const productionParameterSamples =
      productionRepositoryParameterValidationPlan?.sampleValidationResults?.length
        ? productionRepositoryParameterValidationPlan.sampleValidationResults
            .slice(0, 6)
            .map((result) => `${result.id}:${result.accepted ? "通过" : "阻断"}`)
            .join(" / ")
        : "生产仓储参数校验样例未返回";
    const productionParameterChecks = productionRepositoryParameterValidationPlan?.checks?.length
      ? productionRepositoryParameterValidationPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储参数校验检查未返回";
    const productionParameterSafety = productionRepositoryParameterValidationPlan?.safety
      ? `${productionRepositoryParameterValidationPlan.safety.localOnly ? "本地校验" : "未标注本地"} · ${productionRepositoryParameterValidationPlan.safety.noSqlExecution ? "不执行 SQL" : "未标注执行"} · ${productionRepositoryParameterValidationPlan.safety.redactsSampleValues ? "样例脱敏" : "未标注脱敏"}`
      : "生产仓储参数校验安全标记未返回";
    const productionParameterBlockers =
      productionRepositoryParameterValidationPlan?.blockedReasons?.length
        ? productionRepositoryParameterValidationPlan.blockedReasons.join(" / ")
        : "暂无生产仓储参数校验阻断项";
    const productionRepositoryConnectionPoolPlan =
      database?.productionRepositoryConnectionPoolPlan ||
      productionAdapter?.productionRepositoryConnectionPoolPlan;
    const productionConnectionSummary = productionRepositoryConnectionPoolPlan
      ? `连接池 ${productionRepositoryConnectionPoolPlan.status} · ${productionRepositoryConnectionPoolPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryConnectionPoolPlan.canOpenConnection ? "可打开连接" : "不打开连接"}`
      : "生产仓储连接池计划未返回";
    const productionConnectionConfig = productionRepositoryConnectionPoolPlan?.connection
      ? `${productionRepositoryConnectionPoolPlan.connection.provider || "provider 未标注"} · ${productionRepositoryConnectionPoolPlan.connection.configured ? "连接已配置" : "连接未配置"} · ${productionRepositoryConnectionPoolPlan.connection.sslRequired ? "SSL required" : "SSL 未要求"}`
      : "生产仓储连接配置未返回";
    const productionConnectionPoolConfig = productionRepositoryConnectionPoolPlan?.poolConfig
      ? `pool ${productionRepositoryConnectionPoolPlan.poolConfig.min ?? 0}-${productionRepositoryConnectionPoolPlan.poolConfig.max ?? 0} · idle ${productionRepositoryConnectionPoolPlan.poolConfig.idleTimeoutMs ?? "未标注"}ms · stmt ${productionRepositoryConnectionPoolPlan.poolConfig.statementTimeoutMs ?? "未标注"}ms`
      : "生产仓储连接池配置未返回";
    const productionConnectionLifecycle = productionRepositoryConnectionPoolPlan?.lifecycleSteps?.length
      ? productionRepositoryConnectionPoolPlan.lifecycleSteps
          .slice(0, 7)
          .map((step) => `${step.id}:${step.status}`)
          .join(" / ")
      : "生产仓储连接生命周期未返回";
    const productionConnectionChecks = productionRepositoryConnectionPoolPlan?.checks?.length
      ? productionRepositoryConnectionPoolPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储连接检查未返回";
    const productionConnectionTransaction = productionRepositoryConnectionPoolPlan?.transactionWrapper
      ? `${productionRepositoryConnectionPoolPlan.transactionWrapper.defaultIsolationLevel || "隔离级别未标注"} · ${productionRepositoryConnectionPoolPlan.transactionWrapper.readOnlyTransactionsForReads ? "读只读事务" : "读事务未标注"} · ${productionRepositoryConnectionPoolPlan.transactionWrapper.releaseClient || "release 未标注"} release`
      : "生产仓储连接事务包装未返回";
    const productionConnectionSafety = productionRepositoryConnectionPoolPlan?.safety
      ? `${productionRepositoryConnectionPoolPlan.safety.noDatabaseConnection ? "不打开连接" : "未标注连接"} · ${productionRepositoryConnectionPoolPlan.safety.noSqlExecution ? "不执行 SQL" : "未标注执行"} · ${productionRepositoryConnectionPoolPlan.safety.releaseClientFinally ? "finally 释放" : "未标注释放"}`
      : "生产仓储连接安全标记未返回";
    const productionConnectionBlockers =
      productionRepositoryConnectionPoolPlan?.blockedReasons?.length
        ? productionRepositoryConnectionPoolPlan.blockedReasons.join(" / ")
        : "暂无生产仓储连接池阻断项";
    const productionRepositorySqlExecutorPlan =
      database?.productionRepositorySqlExecutorPlan ||
      productionAdapter?.productionRepositorySqlExecutorPlan;
    const productionExecutorSummary = productionRepositorySqlExecutorPlan
      ? `SQL 执行器 ${productionRepositorySqlExecutorPlan.status} · ${productionRepositorySqlExecutorPlan.runtimeMode || "runtime 未标注"} · ${productionRepositorySqlExecutorPlan.canExecuteSql ? "可执行 SQL" : "不可执行 SQL"}`
      : "生产仓储 SQL 执行器计划未返回";
    const productionExecutorCoverage = productionRepositorySqlExecutorPlan
      ? `语句 ${productionRepositorySqlExecutorPlan.statementCount || 0} · 绑定 ${productionRepositorySqlExecutorPlan.bindingCoverage?.boundParameterCount || 0} · 脱敏 ${productionRepositorySqlExecutorPlan.bindingCoverage?.redactedBindingCount || 0}`
      : "生产仓储 SQL 执行器覆盖未返回";
    const productionExecutorStatements = productionRepositorySqlExecutorPlan?.executableStatements?.length
      ? productionRepositorySqlExecutorPlan.executableStatements
          .slice(0, 4)
          .map(
            (statement) =>
              `${statement.method}:${statement.parameterBindingStyle || "绑定未标注"}:${statement.status}`,
          )
          .join(" / ")
      : "生产仓储 SQL 执行器语句未返回";
    const productionExecutorLifecycle = productionRepositorySqlExecutorPlan?.executorLifecycle?.length
      ? productionRepositorySqlExecutorPlan.executorLifecycle
          .slice(0, 7)
          .map((step) => `${step.id}:${step.status}`)
          .join(" / ")
      : "生产仓储 SQL 执行器生命周期未返回";
    const productionExecutorAudit = productionRepositorySqlExecutorPlan?.auditEnvelope
      ? `${productionRepositorySqlExecutorPlan.auditEnvelope.eventTypePrefix || "审计前缀未标注"} · ${productionRepositorySqlExecutorPlan.auditEnvelope.redactParameterValues ? "参数脱敏" : "参数未脱敏"} · ${productionRepositorySqlExecutorPlan.auditEnvelope.includeRowCountOnly ? "仅 row count" : "row count 未标注"}`
      : "生产仓储 SQL 执行器审计未返回";
    const productionExecutorChecks = productionRepositorySqlExecutorPlan?.checks?.length
      ? productionRepositorySqlExecutorPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储 SQL 执行器检查未返回";
    const productionExecutorSafety = productionRepositorySqlExecutorPlan?.safety
      ? `${productionRepositorySqlExecutorPlan.safety.parameterArrayOnly ? "参数数组" : "参数数组未标注"} · ${productionRepositorySqlExecutorPlan.safety.noStringInterpolationForValues ? "不拼接用户值" : "拼接规则未标注"} · ${productionRepositorySqlExecutorPlan.safety.noSqlExecution ? "不执行 SQL" : "执行规则未标注"}`
      : "生产仓储 SQL 执行器安全标记未返回";
    const productionExecutorBlockers =
      productionRepositorySqlExecutorPlan?.blockedReasons?.length
        ? productionRepositorySqlExecutorPlan.blockedReasons.join(" / ")
        : "暂无生产仓储 SQL 执行器阻断项";
    const productionRepositoryResultAuditPlan =
      database?.productionRepositoryResultAuditPlan ||
      productionAdapter?.productionRepositoryResultAuditPlan;
    const productionResultAuditSummary = productionRepositoryResultAuditPlan
      ? `结果审计 ${productionRepositoryResultAuditPlan.status} · ${productionRepositoryResultAuditPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryResultAuditPlan.canMapLiveRows ? "可映射真实行" : "不映射真实行"}`
      : "生产仓储结果审计计划未返回";
    const productionResultAuditCoverage = productionRepositoryResultAuditPlan
      ? `映射 ${productionRepositoryResultAuditPlan.mappingCount || 0} · 形状 ${productionRepositoryResultAuditPlan.resultShapes?.length || 0}`
      : "生产仓储结果审计覆盖未返回";
    const productionResultAuditShapes = productionRepositoryResultAuditPlan?.resultShapes?.length
      ? productionRepositoryResultAuditPlan.resultShapes.slice(0, 6).join(" / ")
      : "生产仓储结果形状未返回";
    const productionResultAuditMappings = productionRepositoryResultAuditPlan?.mappings?.length
      ? productionRepositoryResultAuditPlan.mappings
          .slice(0, 4)
          .map(
            (mapping) =>
              `${mapping.method}:${mapping.mappingMode || "映射未标注"}:${mapping.emptyResultPolicy || "空值未标注"}:${mapping.status}`,
          )
          .join(" / ")
      : "生产仓储结果映射样例未返回";
    const productionResultAuditFields = productionRepositoryResultAuditPlan?.auditEnvelope
      ? `允许 ${productionRepositoryResultAuditPlan.auditEnvelope.allowedFields?.length || 0} · 禁止 ${productionRepositoryResultAuditPlan.auditEnvelope.forbiddenFields?.length || 0}`
      : "生产仓储审计字段未返回";
    const productionResultAuditSamples = productionRepositoryResultAuditPlan?.auditValidationSamples?.length
      ? productionRepositoryResultAuditPlan.auditValidationSamples
          .slice(0, 4)
          .map((sample) => `${sample.id}:${sample.accepted ? "通过" : "阻断"}`)
          .join(" / ")
      : "生产仓储审计样例未返回";
    const productionResultAuditChecks = productionRepositoryResultAuditPlan?.checks?.length
      ? productionRepositoryResultAuditPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储结果审计检查未返回";
    const productionResultAuditSafety = productionRepositoryResultAuditPlan?.safety
      ? `${productionRepositoryResultAuditPlan.safety.rawRowsNeverLogged ? "不记录原始行" : "原始行规则未标注"} · ${productionRepositoryResultAuditPlan.safety.rawParameterValuesNeverLogged ? "不记录原始参数" : "参数规则未标注"} · ${productionRepositoryResultAuditPlan.safety.rowCountOnlyInAudit ? "审计仅 row count" : "row count 未标注"}`
      : "生产仓储结果审计安全标记未返回";
    const productionResultAuditBlockers =
      productionRepositoryResultAuditPlan?.blockedReasons?.length
        ? productionRepositoryResultAuditPlan.blockedReasons.join(" / ")
        : "暂无生产仓储结果审计阻断项";
    const productionRepositoryReadRehearsalPlan =
      database?.productionRepositoryReadRehearsalPlan ||
      productionAdapter?.productionRepositoryReadRehearsalPlan;
    const productionReadRehearsalSummary = productionRepositoryReadRehearsalPlan
      ? `只读查询预演 ${productionRepositoryReadRehearsalPlan.status} · ${productionRepositoryReadRehearsalPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryReadRehearsalPlan.canRunStagingReads ? "可运行 staging 读取" : "不运行真实查询"}`
      : "生产仓储只读查询预演计划未返回";
    const productionReadRehearsalCoverage = productionRepositoryReadRehearsalPlan
      ? `读语句 ${productionRepositoryReadRehearsalPlan.coverage?.readStatementCount || 0} · 样例 ${productionRepositoryReadRehearsalPlan.coverage?.sampleQueryCount || 0} · 表 ${productionRepositoryReadRehearsalPlan.coverage?.tableCount || 0}`
      : "生产仓储只读预演覆盖未返回";
    const productionReadRehearsalWindow = productionRepositoryReadRehearsalPlan?.rehearsalWindow
      ? `${productionRepositoryReadRehearsalPlan.rehearsalWindow.environment || "环境未标注"} · 每次 ${productionRepositoryReadRehearsalPlan.rehearsalWindow.maxRowsPerQuery ?? "未标注"} 行 · 超时 ${productionRepositoryReadRehearsalPlan.rehearsalWindow.statementTimeoutMs ?? "未标注"}ms`
      : "生产仓储只读预演窗口未返回";
    const productionReadRehearsalQueries = productionRepositoryReadRehearsalPlan?.sampleQueries?.length
      ? productionRepositoryReadRehearsalPlan.sampleQueries
          .slice(0, 5)
          .map(
            (query) =>
              `${query.method}:${query.resultShape || "结果未标注"}:${query.expectedMapping || "映射未标注"}:${query.status}`,
          )
          .join(" / ")
      : "生产仓储只读预演样例未返回";
    const productionReadRehearsalChecks = productionRepositoryReadRehearsalPlan?.checks?.length
      ? productionRepositoryReadRehearsalPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储只读预演检查未返回";
    const productionReadRehearsalSafety = productionRepositoryReadRehearsalPlan?.safety
      ? `${productionRepositoryReadRehearsalPlan.safety.noSqlExecution ? "不执行 SQL" : "执行规则未标注"} · ${productionRepositoryReadRehearsalPlan.safety.readOnlyTransactionsOnly ? "只读事务" : "事务规则未标注"} · ${productionRepositoryReadRehearsalPlan.safety.rowLimitRequired ? "限制行数" : "行数规则未标注"}`
      : "生产仓储只读预演安全标记未返回";
    const productionReadRehearsalBlockers =
      productionRepositoryReadRehearsalPlan?.blockedReasons?.length
        ? productionRepositoryReadRehearsalPlan.blockedReasons.join(" / ")
        : "暂无生产仓储只读查询预演阻断项";
    const productionRepositoryParityPlan =
      database?.productionRepositoryParityPlan || productionAdapter?.productionRepositoryParityPlan;
    const productionParitySummary = productionRepositoryParityPlan
      ? `双读一致性 ${productionRepositoryParityPlan.status} · ${productionRepositoryParityPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryParityPlan.canCompareAutomatically ? "可自动比较" : "不可自动比较"}`
      : "生产仓储双读一致性计划未返回";
    const productionParityWindow = productionRepositoryParityPlan?.parityWindow
      ? `样本用户 ${productionRepositoryParityPlan.parityWindow.minimumSampleUsers || 0} · 运行 ${productionRepositoryParityPlan.parityWindow.minimumRuns || 0} 次 · 差异阈值 ${productionRepositoryParityPlan.parityWindow.maxAllowedMismatchPercent ?? "未标注"}%`
      : "生产仓储双读窗口未返回";
    const productionParityChecks = productionRepositoryParityPlan?.checks?.length
      ? productionRepositoryParityPlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储双读检查未返回";
    const productionParityComparisons = productionRepositoryParityPlan?.comparisonPlan?.length
      ? productionRepositoryParityPlan.comparisonPlan
          .slice(0, 6)
          .map(
            (entry) =>
              `${entry.domain}->${databaseTableLabels[entry.table] || entry.table || "未映射"}:${entry.status}`,
          )
          .join(" / ")
      : "生产仓储双读对比域未返回";
    const productionParityIgnoredFields = productionRepositoryParityPlan?.ignoredFields?.length
      ? productionRepositoryParityPlan.ignoredFields.slice(0, 6).join(" / ")
      : "双读忽略字段未返回";
    const productionParitySafety = productionRepositoryParityPlan?.safety
      ? `${productionRepositoryParityPlan.safety.noWrites ? "不写库" : "未标注写库"} · ${productionRepositoryParityPlan.safety.noRuntimeSwitch ? "不切换运行时" : "未标注切换"} · ${productionRepositoryParityPlan.safety.mockFallbackRequired ? "保留回退" : "未标注回退"}`
      : "生产仓储双读安全标记未返回";
    const productionParityBlockers = productionRepositoryParityPlan?.blockedReasons?.length
      ? productionRepositoryParityPlan.blockedReasons.join(" / ")
      : "暂无生产仓储双读一致性阻断项";
    const productionRepositoryParityEvidencePlan =
      database?.productionRepositoryParityEvidencePlan ||
      productionAdapter?.productionRepositoryParityEvidencePlan;
    const productionParityEvidenceSummary = productionRepositoryParityEvidencePlan
      ? `双读证据 ${productionRepositoryParityEvidencePlan.status} · ${productionRepositoryParityEvidencePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryParityEvidencePlan.canCaptureEvidence ? "可采集证据" : "不采集真实证据"}`
      : "生产仓储双读证据计划未返回";
    const productionParityEvidenceCoverage = productionRepositoryParityEvidencePlan
      ? `域 ${productionRepositoryParityEvidencePlan.evidenceCoverage?.domainCount || 0} · 方法 ${productionRepositoryParityEvidencePlan.evidenceCoverage?.methodCount || 0} · 忽略字段 ${productionRepositoryParityEvidencePlan.evidenceCoverage?.ignoredFieldCount || 0}`
      : "生产仓储双读证据覆盖未返回";
    const productionParityEvidenceRecords = productionRepositoryParityEvidencePlan?.evidenceRecords?.length
      ? productionRepositoryParityEvidencePlan.evidenceRecords
          .slice(0, 5)
          .map(
            (record) =>
              `${record.domain}->${databaseTableLabels[record.table] || record.table || "未映射"}:${record.expectedOutcome || "目标未标注"}:${record.status}`,
          )
          .join(" / ")
      : "生产仓储双读证据样例未返回";
    const productionParityMismatchCategories =
      productionRepositoryParityEvidencePlan?.mismatchCategories?.length
        ? productionRepositoryParityEvidencePlan.mismatchCategories
            .slice(0, 5)
            .map((category) => `${category.id}:${category.severity}`)
            .join(" / ")
        : "生产仓储双读差异类别未返回";
    const productionParityEvidenceAudit = productionRepositoryParityEvidencePlan?.auditEnvelope
      ? `${productionRepositoryParityEvidencePlan.auditEnvelope.eventTypePrefix || "审计前缀未标注"} · 允许 ${productionRepositoryParityEvidencePlan.auditEnvelope.allowedFields?.length || 0} · 禁止 ${productionRepositoryParityEvidencePlan.auditEnvelope.forbiddenFields?.length || 0}`
      : "生产仓储双读证据审计未返回";
    const productionParityEvidenceChecks = productionRepositoryParityEvidencePlan?.checks?.length
      ? productionRepositoryParityEvidencePlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储双读证据检查未返回";
    const productionParityEvidenceSafety = productionRepositoryParityEvidencePlan?.safety
      ? `${productionRepositoryParityEvidencePlan.safety.rawRowsNeverLogged ? "不记录原始行" : "原始行规则未标注"} · ${productionRepositoryParityEvidencePlan.safety.mismatchBlocksCutover ? "差异阻断切换" : "差异规则未标注"} · ${productionRepositoryParityEvidencePlan.safety.mockFallbackRequired ? "保留回退" : "回退未标注"}`
      : "生产仓储双读证据安全标记未返回";
    const productionParityEvidenceBlockers =
      productionRepositoryParityEvidencePlan?.blockedReasons?.length
        ? productionRepositoryParityEvidencePlan.blockedReasons.join(" / ")
        : "暂无生产仓储双读证据阻断项";
    const productionRepositoryDualWritePlan =
      database?.productionRepositoryDualWritePlan ||
      productionAdapter?.productionRepositoryDualWritePlan;
    const productionDualWriteSummary = productionRepositoryDualWritePlan
      ? `双写演练 ${productionRepositoryDualWritePlan.status} · ${productionRepositoryDualWritePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryDualWritePlan.canWriteAutomatically ? "可自动写" : "不可自动写"}`
      : "生产仓储双写演练计划未返回";
    const productionDualWriteWindow = productionRepositoryDualWritePlan?.rehearsalWindow
      ? `运行 ${productionRepositoryDualWritePlan.rehearsalWindow.minimumSuccessfulRuns || 0} 次 · 写差异阈值 ${productionRepositoryDualWritePlan.rehearsalWindow.maxAllowedWriteMismatchPercent ?? "未标注"}% · ${productionRepositoryDualWritePlan.rehearsalWindow.rollbackOnFirstMismatch ? "首个差异回滚" : "回滚条件未标注"}`
      : "生产仓储双写窗口未返回";
    const productionDualWriteChecks = productionRepositoryDualWritePlan?.checks?.length
      ? productionRepositoryDualWritePlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储双写检查未返回";
    const productionDualWriteDomains = productionRepositoryDualWritePlan?.writePlan?.length
      ? productionRepositoryDualWritePlan.writePlan
          .slice(0, 6)
          .map(
            (entry) =>
              `${entry.domain}->${databaseTableLabels[entry.table] || entry.table || "未映射"}:${entry.status}`,
          )
          .join(" / ")
      : "生产仓储双写域未返回";
    const productionDualWriteSafety = productionRepositoryDualWritePlan?.safety
      ? `${productionRepositoryDualWritePlan.safety.noRuntimeSwitch ? "不切换运行时" : "未标注切换"} · ${productionRepositoryDualWritePlan.safety.mockRemainsSourceOfTruth ? "mock 仍为主源" : "主源未标注"} · ${productionRepositoryDualWritePlan.safety.productionWritesShadowOnly ? "生产仅影子写" : "影子写未标注"}`
      : "生产仓储双写安全标记未返回";
    const productionDualWriteRollback = productionRepositoryDualWritePlan?.rollbackTriggers?.length
      ? productionRepositoryDualWritePlan.rollbackTriggers.slice(0, 3).join(" / ")
      : "生产仓储双写回滚条件未返回";
    const productionDualWriteBlockers = productionRepositoryDualWritePlan?.blockedReasons?.length
      ? productionRepositoryDualWritePlan.blockedReasons.join(" / ")
      : "暂无生产仓储双写演练阻断项";
    const productionRepositoryShadowWriteEvidencePlan =
      database?.productionRepositoryShadowWriteEvidencePlan ||
      productionAdapter?.productionRepositoryShadowWriteEvidencePlan;
    const productionShadowWriteSummary = productionRepositoryShadowWriteEvidencePlan
      ? `影子写证据 ${productionRepositoryShadowWriteEvidencePlan.status} · ${productionRepositoryShadowWriteEvidencePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryShadowWriteEvidencePlan.canWriteProduction ? "可写生产" : "不写生产"}`
      : "生产仓储影子写证据计划未返回";
    const productionShadowWriteCoverage = productionRepositoryShadowWriteEvidencePlan
      ? `域 ${productionRepositoryShadowWriteEvidencePlan.evidenceCoverage?.domainCount || 0} · 方法 ${productionRepositoryShadowWriteEvidencePlan.evidenceCoverage?.methodCount || 0} · 幂等 ${productionRepositoryShadowWriteEvidencePlan.evidenceCoverage?.idempotencyKeyRequiredCount || 0}`
      : "生产仓储影子写证据覆盖未返回";
    const productionShadowWriteRecords = productionRepositoryShadowWriteEvidencePlan?.evidenceRecords?.length
      ? productionRepositoryShadowWriteEvidencePlan.evidenceRecords
          .slice(0, 5)
          .map(
            (record) =>
              `${record.domain}->${databaseTableLabels[record.table] || record.table || "未映射"}:${record.expectedOutcome || "目标未标注"}:${record.status}`,
          )
          .join(" / ")
      : "生产仓储影子写证据样例未返回";
    const productionShadowWriteIdempotency =
      productionRepositoryShadowWriteEvidencePlan?.idempotencyPolicy
        ? `${productionRepositoryShadowWriteEvidencePlan.idempotencyPolicy.requiredForEveryWrite ? "每写必需" : "规则未标注"} · ${productionRepositoryShadowWriteEvidencePlan.idempotencyPolicy.duplicateHandling || "重复处理未标注"} · TTL ${productionRepositoryShadowWriteEvidencePlan.idempotencyPolicy.ttlHours ?? "未标注"}h`
        : "生产仓储影子写幂等策略未返回";
    const productionShadowWriteAudit = productionRepositoryShadowWriteEvidencePlan?.auditEnvelope
      ? `${productionRepositoryShadowWriteEvidencePlan.auditEnvelope.eventTypePrefix || "审计前缀未标注"} · 允许 ${productionRepositoryShadowWriteEvidencePlan.auditEnvelope.allowedFields?.length || 0} · 禁止 ${productionRepositoryShadowWriteEvidencePlan.auditEnvelope.forbiddenFields?.length || 0}`
      : "生产仓储影子写审计未返回";
    const productionShadowWriteChecks = productionRepositoryShadowWriteEvidencePlan?.checks?.length
      ? productionRepositoryShadowWriteEvidencePlan.checks
          .slice(0, 6)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储影子写检查未返回";
    const productionShadowWriteSafety = productionRepositoryShadowWriteEvidencePlan?.safety
      ? `${productionRepositoryShadowWriteEvidencePlan.safety.mockRemainsSourceOfTruth ? "mock 仍主源" : "主源未标注"} · ${productionRepositoryShadowWriteEvidencePlan.safety.productionWritesShadowOnly ? "仅影子写" : "影子写未标注"} · ${productionRepositoryShadowWriteEvidencePlan.safety.rawPayloadNeverLogged ? "不记录 payload" : "payload 规则未标注"}`
      : "生产仓储影子写安全标记未返回";
    const productionShadowWriteRollback = productionRepositoryShadowWriteEvidencePlan?.rollbackTriggers?.length
      ? productionRepositoryShadowWriteEvidencePlan.rollbackTriggers.slice(0, 3).join(" / ")
      : "生产仓储影子写回滚条件未返回";
    const productionShadowWriteBlockers =
      productionRepositoryShadowWriteEvidencePlan?.blockedReasons?.length
        ? productionRepositoryShadowWriteEvidencePlan.blockedReasons.join(" / ")
        : "暂无生产仓储影子写证据阻断项";
    const productionRepositoryBackupRestoreEvidencePlan =
      database?.productionRepositoryBackupRestoreEvidencePlan ||
      productionAdapter?.productionRepositoryBackupRestoreEvidencePlan;
    const productionBackupRestoreSummary = productionRepositoryBackupRestoreEvidencePlan
      ? `备份恢复 ${productionRepositoryBackupRestoreEvidencePlan.status} · ${productionRepositoryBackupRestoreEvidencePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryBackupRestoreEvidencePlan.canRunRestore ? "可恢复" : "不执行恢复"}`
      : "生产仓储备份恢复证据计划未返回";
    const productionBackupRestoreObjectives =
      productionRepositoryBackupRestoreEvidencePlan?.recoveryObjectives
        ? `RPO ${productionRepositoryBackupRestoreEvidencePlan.recoveryObjectives.targetRpoMinutes ?? "未标注"} 分钟 · RTO ${productionRepositoryBackupRestoreEvidencePlan.recoveryObjectives.targetRtoMinutes ?? "未标注"} 分钟 · 恢复 ${productionRepositoryBackupRestoreEvidencePlan.recoveryObjectives.minimumSuccessfulRestoreRuns ?? "未标注"} 次`
        : "生产仓储备份恢复目标未返回";
    const productionBackupRestoreCoverage =
      productionRepositoryBackupRestoreEvidencePlan?.evidenceCoverage
        ? `表 ${productionRepositoryBackupRestoreEvidencePlan.evidenceCoverage.tableCount || 0} · 关键 ${productionRepositoryBackupRestoreEvidencePlan.evidenceCoverage.criticalTableCount || 0} · 校验 ${productionRepositoryBackupRestoreEvidencePlan.evidenceCoverage.checksumRequiredCount || 0}`
        : "生产仓储备份恢复覆盖未返回";
    const productionBackupRestoreArtifacts =
      productionRepositoryBackupRestoreEvidencePlan?.rehearsalArtifacts?.length
        ? productionRepositoryBackupRestoreEvidencePlan.rehearsalArtifacts
            .slice(0, 5)
            .map((artifact) => `${artifact.id}:${artifact.artifactType}:${artifact.status}`)
            .join(" / ")
        : "生产仓储备份恢复 artifact 未返回";
    const productionBackupRestoreCriticalTables =
      productionRepositoryBackupRestoreEvidencePlan?.criticalTables?.length
        ? productionRepositoryBackupRestoreEvidencePlan.criticalTables
            .slice(0, 8)
            .map((table) => databaseTableLabels[table] || table)
            .join(" / ")
        : "生产仓储备份恢复关键表未返回";
    const productionBackupRestoreChecks =
      productionRepositoryBackupRestoreEvidencePlan?.checks?.length
        ? productionRepositoryBackupRestoreEvidencePlan.checks
            .slice(0, 6)
            .map((check) => `${check.id}:${check.status}`)
            .join(" / ")
        : "生产仓储备份恢复检查未返回";
    const productionBackupRestoreSafety = productionRepositoryBackupRestoreEvidencePlan?.safety
      ? `${productionRepositoryBackupRestoreEvidencePlan.safety.encryptionRequired ? "加密备份" : "加密未标注"} · ${productionRepositoryBackupRestoreEvidencePlan.safety.checksumRequired ? "校验 checksum" : "校验未标注"} · ${productionRepositoryBackupRestoreEvidencePlan.safety.mockFallbackRequired ? "保留回退" : "回退未标注"}`
      : "生产仓储备份恢复安全标记未返回";
    const productionBackupRestoreRollback =
      productionRepositoryBackupRestoreEvidencePlan?.rollbackTriggers?.length
        ? productionRepositoryBackupRestoreEvidencePlan.rollbackTriggers.slice(0, 3).join(" / ")
        : "生产仓储备份恢复回滚条件未返回";
    const productionBackupRestoreBlockers =
      productionRepositoryBackupRestoreEvidencePlan?.blockedReasons?.length
        ? productionRepositoryBackupRestoreEvidencePlan.blockedReasons.join(" / ")
        : "暂无生产仓储备份恢复证据阻断项";
    const productionRepositoryCutoverMonitoringEvidencePlan =
      database?.productionRepositoryCutoverMonitoringEvidencePlan ||
      productionAdapter?.productionRepositoryCutoverMonitoringEvidencePlan;
    const productionCutoverMonitoringSummary = productionRepositoryCutoverMonitoringEvidencePlan
      ? `切换监控 ${productionRepositoryCutoverMonitoringEvidencePlan.status} · ${productionRepositoryCutoverMonitoringEvidencePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryCutoverMonitoringEvidencePlan.canReadProductionMetrics ? "可读生产指标" : "不读生产指标"}`
      : "生产仓储切换监控证据计划未返回";
    const productionCutoverMonitoringWindow =
      productionRepositoryCutoverMonitoringEvidencePlan?.monitoringWindow
        ? `${productionRepositoryCutoverMonitoringEvidencePlan.monitoringWindow.environment || "环境未标注"} · 预切换 ${productionRepositoryCutoverMonitoringEvidencePlan.monitoringWindow.preCutoverMinutes ?? "未标注"} 分钟 · 后切换 ${productionRepositoryCutoverMonitoringEvidencePlan.monitoringWindow.postCutoverMinutes ?? "未标注"} 分钟 · 决策 ${productionRepositoryCutoverMonitoringEvidencePlan.monitoringWindow.rollbackDecisionMinutes ?? "未标注"} 分钟`
        : "生产仓储切换监控窗口未返回";
    const productionCutoverMonitoringCoverage =
      productionRepositoryCutoverMonitoringEvidencePlan?.evidenceCoverage
        ? `指标 ${productionRepositoryCutoverMonitoringEvidencePlan.evidenceCoverage.metricCount || 0} · 表 ${productionRepositoryCutoverMonitoringEvidencePlan.evidenceCoverage.monitoredTableCount || 0} · 告警 ${productionRepositoryCutoverMonitoringEvidencePlan.evidenceCoverage.alertRouteCount || 0} · 回滚 ${productionRepositoryCutoverMonitoringEvidencePlan.evidenceCoverage.rollbackTriggerCount || 0}`
        : "生产仓储切换监控覆盖未返回";
    const productionCutoverMonitoringMetrics =
      productionRepositoryCutoverMonitoringEvidencePlan?.metricProbes?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.metricProbes
            .slice(0, 5)
            .map((probe) => `${probe.id}:${probe.threshold}:${probe.status}`)
            .join(" / ")
        : "生产仓储切换监控指标未返回";
    const productionCutoverMonitoringRoutes =
      productionRepositoryCutoverMonitoringEvidencePlan?.alertRoutes?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.alertRoutes
            .slice(0, 4)
            .map((route) => `${route.id}:${route.channel}:${route.status}`)
            .join(" / ")
        : "生产仓储切换监控告警路由未返回";
    const productionCutoverMonitoringTables =
      productionRepositoryCutoverMonitoringEvidencePlan?.monitoredTables?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.monitoredTables
            .slice(0, 8)
            .map((table) => databaseTableLabels[table] || table)
            .join(" / ")
        : "生产仓储切换监控表未返回";
    const productionCutoverMonitoringChecks =
      productionRepositoryCutoverMonitoringEvidencePlan?.checks?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.checks
            .slice(0, 6)
            .map((check) => `${check.id}:${check.status}`)
            .join(" / ")
        : "生产仓储切换监控检查未返回";
    const productionCutoverMonitoringSafety = productionRepositoryCutoverMonitoringEvidencePlan?.safety
      ? `${productionRepositoryCutoverMonitoringEvidencePlan.safety.noMetricSubscription ? "不订阅指标" : "订阅规则未标注"} · ${productionRepositoryCutoverMonitoringEvidencePlan.safety.mockFallbackRequired ? "保留回退" : "回退未标注"} · ${productionRepositoryCutoverMonitoringEvidencePlan.safety.rollbackOwnerRequired ? "需回滚负责人" : "负责人未标注"}`
      : "生产仓储切换监控安全标记未返回";
    const productionCutoverMonitoringRollback =
      productionRepositoryCutoverMonitoringEvidencePlan?.rollbackTriggers?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.rollbackTriggers.slice(0, 3).join(" / ")
        : "生产仓储切换监控回滚条件未返回";
    const productionCutoverMonitoringBlockers =
      productionRepositoryCutoverMonitoringEvidencePlan?.blockedReasons?.length
        ? productionRepositoryCutoverMonitoringEvidencePlan.blockedReasons.join(" / ")
        : "暂无生产仓储切换监控证据阻断项";
    const productionRepositoryRollbackRehearsalEvidencePlan =
      database?.productionRepositoryRollbackRehearsalEvidencePlan ||
      productionAdapter?.productionRepositoryRollbackRehearsalEvidencePlan;
    const productionRollbackRehearsalSummary = productionRepositoryRollbackRehearsalEvidencePlan
      ? `回滚演练 ${productionRepositoryRollbackRehearsalEvidencePlan.status} · ${productionRepositoryRollbackRehearsalEvidencePlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryRollbackRehearsalEvidencePlan.canRollbackRuntime ? "可回滚运行时" : "不执行回滚"}`
      : "生产仓储回滚演练证据计划未返回";
    const productionRollbackRehearsalObjectives =
      productionRepositoryRollbackRehearsalEvidencePlan?.rollbackObjectives
        ? `截止 ${productionRepositoryRollbackRehearsalEvidencePlan.rollbackObjectives.rollbackDeadlineMinutes ?? "未标注"} 分钟 · RTO ${productionRepositoryRollbackRehearsalEvidencePlan.rollbackObjectives.targetRtoMinutes ?? "未标注"} 分钟 · 演练 ${productionRepositoryRollbackRehearsalEvidencePlan.rollbackObjectives.minimumSuccessfulRollbackRuns ?? "未标注"} 次`
        : "生产仓储回滚演练目标未返回";
    const productionRollbackRehearsalCoverage =
      productionRepositoryRollbackRehearsalEvidencePlan?.evidenceCoverage
        ? `路径 ${productionRepositoryRollbackRehearsalEvidencePlan.evidenceCoverage.rollbackPathCount || 0} · 表 ${productionRepositoryRollbackRehearsalEvidencePlan.evidenceCoverage.rollbackTableCount || 0} · 审计包 ${productionRepositoryRollbackRehearsalEvidencePlan.evidenceCoverage.requiredAuditPackageCount || 0}`
        : "生产仓储回滚演练覆盖未返回";
    const productionRollbackRehearsalPaths =
      productionRepositoryRollbackRehearsalEvidencePlan?.rollbackPaths?.length
        ? productionRepositoryRollbackRehearsalEvidencePlan.rollbackPaths
            .slice(0, 5)
            .map((path) => `${path.id}:${path.expectedDurationMinutes ?? "?"}m:${path.status}`)
            .join(" / ")
        : "生产仓储回滚路径未返回";
    const productionRollbackRehearsalTables =
      productionRepositoryRollbackRehearsalEvidencePlan?.rollbackTables?.length
        ? productionRepositoryRollbackRehearsalEvidencePlan.rollbackTables
            .slice(0, 8)
            .map((table) => databaseTableLabels[table] || table)
            .join(" / ")
        : "生产仓储回滚演练表未返回";
    const productionRollbackRehearsalChecks =
      productionRepositoryRollbackRehearsalEvidencePlan?.checks?.length
        ? productionRepositoryRollbackRehearsalEvidencePlan.checks
            .slice(0, 6)
            .map((check) => `${check.id}:${check.status}`)
            .join(" / ")
        : "生产仓储回滚演练检查未返回";
    const productionRollbackRehearsalSafety = productionRepositoryRollbackRehearsalEvidencePlan?.safety
      ? `${productionRepositoryRollbackRehearsalEvidencePlan.safety.noRuntimeRollback ? "不执行回滚" : "回滚规则未标注"} · ${productionRepositoryRollbackRehearsalEvidencePlan.safety.mockFallbackRequired ? "保留回退" : "回退未标注"} · ${productionRepositoryRollbackRehearsalEvidencePlan.safety.noAuditExportExecution ? "不导出真实审计" : "审计导出未标注"}`
      : "生产仓储回滚演练安全标记未返回";
    const productionRollbackRehearsalRollback =
      productionRepositoryRollbackRehearsalEvidencePlan?.rollbackTriggers?.length
        ? productionRepositoryRollbackRehearsalEvidencePlan.rollbackTriggers.slice(0, 3).join(" / ")
        : "生产仓储回滚演练触发条件未返回";
    const productionRollbackRehearsalBlockers =
      productionRepositoryRollbackRehearsalEvidencePlan?.blockedReasons?.length
        ? productionRepositoryRollbackRehearsalEvidencePlan.blockedReasons.join(" / ")
        : "暂无生产仓储回滚演练证据阻断项";
    const productionRepositoryCutoverPlan =
      database?.productionRepositoryCutoverPlan ||
      productionAdapter?.productionRepositoryCutoverPlan;
    const productionCutoverSummary = productionRepositoryCutoverPlan
      ? `切换门禁 ${productionRepositoryCutoverPlan.status} · ${productionRepositoryCutoverPlan.runtimeMode || "runtime 未标注"} · ${productionRepositoryCutoverPlan.canSwitchAutomatically ? "可自动切换" : "不可自动切换"}`
      : "生产仓储切换门禁计划未返回";
    const productionCutoverFlag = productionRepositoryCutoverPlan?.featureFlag
      ? `${productionRepositoryCutoverPlan.featureFlag.name || "flag 未命名"}: ${productionRepositoryCutoverPlan.featureFlag.current || "current 未标注"} -> ${productionRepositoryCutoverPlan.featureFlag.target || "target 未标注"}`
      : "生产仓储切换开关未返回";
    const productionCutoverWindow = productionRepositoryCutoverPlan?.cutoverWindow
      ? `${productionRepositoryCutoverPlan.cutoverWindow.environment || "环境未标注"} · ${productionRepositoryCutoverPlan.cutoverWindow.preferredWindow || "窗口未标注"} · 回滚 ${productionRepositoryCutoverPlan.cutoverWindow.rollbackDeadlineMinutes ?? "未标注"} 分钟`
      : "生产仓储切换窗口未返回";
    const productionCutoverChecks = productionRepositoryCutoverPlan?.checks?.length
      ? productionRepositoryCutoverPlan.checks
          .slice(0, 8)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "生产仓储切换检查未返回";
    const productionCutoverSafety = productionRepositoryCutoverPlan?.safety
      ? `${productionRepositoryCutoverPlan.safety.noAutomaticSwitch ? "禁止自动切换" : "未标注自动切换"} · ${productionRepositoryCutoverPlan.safety.mockFallbackRequired ? "保留回退" : "未标注回退"} · ${productionRepositoryCutoverPlan.safety.requiresHumanApproval ? "需人工批准" : "未标注批准"}`
      : "生产仓储切换安全标记未返回";
    const productionCutoverRollback = productionRepositoryCutoverPlan?.rollbackTriggers?.length
      ? productionRepositoryCutoverPlan.rollbackTriggers.slice(0, 3).join(" / ")
      : "生产仓储切换回滚条件未返回";
    const productionCutoverBlockers = productionRepositoryCutoverPlan?.blockedReasons?.length
      ? productionRepositoryCutoverPlan.blockedReasons.join(" / ")
      : "暂无生产仓储切换门禁阻断项";

    elements.databaseState.innerHTML = `
      <div class="state-panel success-state">
        <strong>数据库服务已连接</strong>
        <p>${message || "当前数据库服务用于展示生产准备度，正式数据库仍需后续接入。"}</p>
        ${
          database
            ? `
              <div class="provider-summary" aria-label="数据库服务状态">
                <span>${escapeHtml(database.name)}</span>
                <span>${escapeHtml(formatProviderMode(database))}</span>
                <span>${escapeHtml(database.activeStorage)}</span>
                <span>${escapeHtml(database.migrationPhase)}</span>
              </div>
              <div class="provider-summary" aria-label="计划数据库表">
                <span>${escapeHtml(plannedTables)}</span>
              </div>
              <div class="provider-summary" aria-label="仓储接口契约">
                <span>${escapeHtml(contractSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="迁移检查">
                <span>${escapeHtml(migrationChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="表映射">
                <span>${escapeHtml(tableMappings)}</span>
              </div>
              <div class="provider-summary" aria-label="生产数据库适配器">
                <span>${escapeHtml(adapterSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产数据库迁移计划">
                <span>${escapeHtml(adapterPlan)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移预演">
                <span>${escapeHtml(dryRunSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移预演步骤">
                <span>${escapeHtml(dryRunSteps)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移表顺序">
                <span>${escapeHtml(dryRunTables)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库 SQL 迁移草案">
                <span>${escapeHtml(sqlDraftSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库 SQL 迁移安全标记">
                <span>${escapeHtml(sqlDraftSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库 SQL 迁移预览">
                <span>${escapeHtml(sqlDraftPreview)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移包">
                <span>${escapeHtml(packageSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移包 Manifest">
                <span>${escapeHtml(packageManifest)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移包上线前检查">
                <span>${escapeHtml(packagePreflight)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库迁移发布门禁">
                <span>${escapeHtml(packageGates)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库只读连接检查">
                <span>${escapeHtml(readOnlySummary)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库只读连接安全标记">
                <span>${escapeHtml(readOnlySafety)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库只读连接检查项">
                <span>${escapeHtml(readOnlyChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库驱动接入计划">
                <span>${escapeHtml(driverSetupSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库驱动配置检查">
                <span>${escapeHtml(driverSetupChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="数据库驱动环境变量">
                <span>${escapeHtml(driverSetupEnv)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换计划">
                <span>${escapeHtml(repositoryAdapterSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储方法计划">
                <span>${escapeHtml(repositoryAdapterMethods)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换门禁">
                <span>${escapeHtml(repositoryAdapterGates)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储数据域">
                <span>${escapeHtml(repositoryAdapterDomains)}</span>
              </div>
              <div class="provider-summary" aria-label="仓储运行时保护">
                <span>${escapeHtml(repositoryRuntimeSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="仓储运行时检查">
                <span>${escapeHtml(repositoryRuntimeChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="仓储运行时安全标记">
                <span>${escapeHtml(repositoryRuntimeSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="仓储允许运行模式">
                <span>${escapeHtml(repositoryRuntimeModes)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储适配器骨架">
                <span>${escapeHtml(productionRepositorySummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储方法覆盖">
                <span>${escapeHtml(productionRepositoryMethods)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储表覆盖">
                <span>${escapeHtml(productionRepositoryTables)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储安全标记">
                <span>${escapeHtml(productionRepositorySafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读冒烟计划">
                <span>${escapeHtml(productionSmokeSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读冒烟覆盖">
                <span>${escapeHtml(productionSmokeCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读冒烟检查">
                <span>${escapeHtml(productionSmokeChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读冒烟 SQL">
                <span>${escapeHtml(productionSmokeQueries)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读冒烟阻断语句">
                <span>${escapeHtml(productionSmokeBlockedStatements)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 契约">
                <span>${escapeHtml(productionSqlSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 覆盖">
                <span>${escapeHtml(productionSqlCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 检查">
                <span>${escapeHtml(productionSqlChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 样例">
                <span>${escapeHtml(productionSqlSamples)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 安全标记">
                <span>${escapeHtml(productionSqlSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 表白名单">
                <span>${escapeHtml(productionSqlTables)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储执行计划">
                <span>${escapeHtml(productionExecutionSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储执行覆盖">
                <span>${escapeHtml(productionExecutionCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储执行步骤">
                <span>${escapeHtml(productionExecutionSteps)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验">
                <span>${escapeHtml(productionExecutionValidators)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储事务包装">
                <span>${escapeHtml(productionExecutionTransaction)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储执行审计">
                <span>${escapeHtml(productionExecutionAudit)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储执行安全标记">
                <span>${escapeHtml(productionExecutionSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验计划">
                <span>${escapeHtml(productionParameterSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验覆盖">
                <span>${escapeHtml(productionParameterCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验类型">
                <span>${escapeHtml(productionParameterTypes)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验样例">
                <span>${escapeHtml(productionParameterSamples)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验检查">
                <span>${escapeHtml(productionParameterChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储参数校验安全标记">
                <span>${escapeHtml(productionParameterSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接池计划">
                <span>${escapeHtml(productionConnectionSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接配置">
                <span>${escapeHtml(productionConnectionConfig)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接池配置">
                <span>${escapeHtml(productionConnectionPoolConfig)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接生命周期">
                <span>${escapeHtml(productionConnectionLifecycle)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接检查">
                <span>${escapeHtml(productionConnectionChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接事务包装">
                <span>${escapeHtml(productionConnectionTransaction)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储连接安全标记">
                <span>${escapeHtml(productionConnectionSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器计划">
                <span>${escapeHtml(productionExecutorSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器覆盖">
                <span>${escapeHtml(productionExecutorCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器语句">
                <span>${escapeHtml(productionExecutorStatements)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器生命周期">
                <span>${escapeHtml(productionExecutorLifecycle)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器审计">
                <span>${escapeHtml(productionExecutorAudit)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器检查">
                <span>${escapeHtml(productionExecutorChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储 SQL 执行器安全标记">
                <span>${escapeHtml(productionExecutorSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果审计计划">
                <span>${escapeHtml(productionResultAuditSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果审计覆盖">
                <span>${escapeHtml(productionResultAuditCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果形状">
                <span>${escapeHtml(productionResultAuditShapes)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果映射样例">
                <span>${escapeHtml(productionResultAuditMappings)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储审计字段">
                <span>${escapeHtml(productionResultAuditFields)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储审计样例">
                <span>${escapeHtml(productionResultAuditSamples)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果审计检查">
                <span>${escapeHtml(productionResultAuditChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储结果审计安全标记">
                <span>${escapeHtml(productionResultAuditSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演计划">
                <span>${escapeHtml(productionReadRehearsalSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演覆盖">
                <span>${escapeHtml(productionReadRehearsalCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演窗口">
                <span>${escapeHtml(productionReadRehearsalWindow)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演样例">
                <span>${escapeHtml(productionReadRehearsalQueries)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演检查">
                <span>${escapeHtml(productionReadRehearsalChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储只读查询预演安全标记">
                <span>${escapeHtml(productionReadRehearsalSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读一致性计划">
                <span>${escapeHtml(productionParitySummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读窗口">
                <span>${escapeHtml(productionParityWindow)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读检查">
                <span>${escapeHtml(productionParityChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读对比域">
                <span>${escapeHtml(productionParityComparisons)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读忽略字段">
                <span>${escapeHtml(productionParityIgnoredFields)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读安全标记">
                <span>${escapeHtml(productionParitySafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据计划">
                <span>${escapeHtml(productionParityEvidenceSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据覆盖">
                <span>${escapeHtml(productionParityEvidenceCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据样例">
                <span>${escapeHtml(productionParityEvidenceRecords)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读差异类别">
                <span>${escapeHtml(productionParityMismatchCategories)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据审计">
                <span>${escapeHtml(productionParityEvidenceAudit)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据检查">
                <span>${escapeHtml(productionParityEvidenceChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双读证据安全标记">
                <span>${escapeHtml(productionParityEvidenceSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写演练计划">
                <span>${escapeHtml(productionDualWriteSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写窗口">
                <span>${escapeHtml(productionDualWriteWindow)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写检查">
                <span>${escapeHtml(productionDualWriteChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写域">
                <span>${escapeHtml(productionDualWriteDomains)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写安全标记">
                <span>${escapeHtml(productionDualWriteSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储双写回滚条件">
                <span>${escapeHtml(productionDualWriteRollback)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写证据计划">
                <span>${escapeHtml(productionShadowWriteSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写证据覆盖">
                <span>${escapeHtml(productionShadowWriteCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写证据样例">
                <span>${escapeHtml(productionShadowWriteRecords)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写幂等策略">
                <span>${escapeHtml(productionShadowWriteIdempotency)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写审计">
                <span>${escapeHtml(productionShadowWriteAudit)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写检查">
                <span>${escapeHtml(productionShadowWriteChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写安全标记">
                <span>${escapeHtml(productionShadowWriteSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储影子写回滚条件">
                <span>${escapeHtml(productionShadowWriteRollback)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复证据计划">
                <span>${escapeHtml(productionBackupRestoreSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复目标">
                <span>${escapeHtml(productionBackupRestoreObjectives)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复覆盖">
                <span>${escapeHtml(productionBackupRestoreCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复 artifact">
                <span>${escapeHtml(productionBackupRestoreArtifacts)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复关键表">
                <span>${escapeHtml(productionBackupRestoreCriticalTables)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复检查">
                <span>${escapeHtml(productionBackupRestoreChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复安全标记">
                <span>${escapeHtml(productionBackupRestoreSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储备份恢复回滚条件">
                <span>${escapeHtml(productionBackupRestoreRollback)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控证据计划">
                <span>${escapeHtml(productionCutoverMonitoringSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控窗口">
                <span>${escapeHtml(productionCutoverMonitoringWindow)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控覆盖">
                <span>${escapeHtml(productionCutoverMonitoringCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控指标">
                <span>${escapeHtml(productionCutoverMonitoringMetrics)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控告警路由">
                <span>${escapeHtml(productionCutoverMonitoringRoutes)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控表">
                <span>${escapeHtml(productionCutoverMonitoringTables)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控检查">
                <span>${escapeHtml(productionCutoverMonitoringChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控安全标记">
                <span>${escapeHtml(productionCutoverMonitoringSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换监控回滚条件">
                <span>${escapeHtml(productionCutoverMonitoringRollback)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练证据计划">
                <span>${escapeHtml(productionRollbackRehearsalSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练目标">
                <span>${escapeHtml(productionRollbackRehearsalObjectives)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练覆盖">
                <span>${escapeHtml(productionRollbackRehearsalCoverage)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚路径">
                <span>${escapeHtml(productionRollbackRehearsalPaths)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练表">
                <span>${escapeHtml(productionRollbackRehearsalTables)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练检查">
                <span>${escapeHtml(productionRollbackRehearsalChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练安全标记">
                <span>${escapeHtml(productionRollbackRehearsalSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储回滚演练触发条件">
                <span>${escapeHtml(productionRollbackRehearsalRollback)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换门禁计划">
                <span>${escapeHtml(productionCutoverSummary)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换开关">
                <span>${escapeHtml(productionCutoverFlag)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换窗口">
                <span>${escapeHtml(productionCutoverWindow)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换检查">
                <span>${escapeHtml(productionCutoverChecks)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换安全标记">
                <span>${escapeHtml(productionCutoverSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="生产仓储切换回滚条件">
                <span>${escapeHtml(productionCutoverRollback)}</span>
              </div>
              <div class="provider-capabilities" aria-label="数据库服务能力">${capabilities}</div>
              <p class="provider-warning">当前数据库回退：${escapeHtml(adapterFallback)}。</p>
              <p class="provider-warning">迁移预演阻断：${escapeHtml(dryRunBlockers)}。</p>
              <p class="provider-warning">只读连接阻断：${escapeHtml(readOnlyBlockers)}。</p>
              <p class="provider-warning">驱动接入阻断：${escapeHtml(driverSetupBlockers)}。</p>
              <p class="provider-warning">仓储切换阻断：${escapeHtml(repositoryAdapterBlockers)}。</p>
              <p class="provider-warning">仓储运行时阻断：${escapeHtml(repositoryRuntimeBlockers)}。</p>
              <p class="provider-warning">生产仓储适配器阻断：${escapeHtml(productionRepositoryBlockers)}。</p>
              <p class="provider-warning">生产仓储只读冒烟阻断：${escapeHtml(productionSmokeBlockers)}。</p>
              <p class="provider-warning">生产仓储 SQL 契约阻断：${escapeHtml(productionSqlBlockers)}。</p>
              <p class="provider-warning">生产仓储执行计划阻断：${escapeHtml(productionExecutionBlockers)}。</p>
              <p class="provider-warning">生产仓储参数校验阻断：${escapeHtml(productionParameterBlockers)}。</p>
              <p class="provider-warning">生产仓储连接池阻断：${escapeHtml(productionConnectionBlockers)}。</p>
              <p class="provider-warning">生产仓储 SQL 执行器阻断：${escapeHtml(productionExecutorBlockers)}。</p>
              <p class="provider-warning">生产仓储结果审计阻断：${escapeHtml(productionResultAuditBlockers)}。</p>
              <p class="provider-warning">生产仓储只读查询预演阻断：${escapeHtml(productionReadRehearsalBlockers)}。</p>
              <p class="provider-warning">生产仓储双读一致性阻断：${escapeHtml(productionParityBlockers)}。</p>
              <p class="provider-warning">生产仓储双读证据阻断：${escapeHtml(productionParityEvidenceBlockers)}。</p>
              <p class="provider-warning">生产仓储双写演练阻断：${escapeHtml(productionDualWriteBlockers)}。</p>
              <p class="provider-warning">生产仓储影子写证据阻断：${escapeHtml(productionShadowWriteBlockers)}。</p>
              <p class="provider-warning">生产仓储备份恢复证据阻断：${escapeHtml(productionBackupRestoreBlockers)}。</p>
              <p class="provider-warning">生产仓储切换监控证据阻断：${escapeHtml(productionCutoverMonitoringBlockers)}。</p>
              <p class="provider-warning">生产仓储回滚演练证据阻断：${escapeHtml(productionRollbackRehearsalBlockers)}。</p>
              <p class="provider-warning">生产仓储切换门禁阻断：${escapeHtml(productionCutoverBlockers)}。</p>
              ${dryRunWarnings ? `<p class="provider-warning">迁移预演提示：${escapeHtml(dryRunWarnings)}。</p>` : ""}
              <p class="provider-warning">上线前仍需补齐：${escapeHtml(missingProduction)}。</p>
              ${
                database.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(database.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">数据库服务状态未返回，当前仍按本机样例存储处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.databaseState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>数据库服务未连接</strong>
        <p>${message || "后端数据库服务暂不可用，本机样例存储仍可继续使用。"}</p>
      </div>
    `;
    return;
  }

  elements.databaseState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机数据库样例</strong>
      <p>连接后端后，这里会显示内存桥、JSON 文件桥、计划表和生产数据库缺口。</p>
    </div>
  `;
}

function renderAuditServiceState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const auditService = getAuditServiceStatus();

  if (status === "checking") {
    elements.auditServiceState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查审计服务</strong>
        <p>正在读取审计日志保留、脱敏策略和生产安全缺口。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const capabilities = auditService?.capabilities?.length
      ? auditService.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(auditCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const missingProduction = auditService?.missingProductionCapabilities?.length
      ? auditService.missingProductionCapabilities
          .map((capability) => auditRequirementLabels[capability] || capability)
          .join(" / ")
      : "未标注";
    const retention = auditService?.retentionPolicy || {};
    const redaction = auditService?.redactionPolicy || {};
    const signing = auditService?.signingPolicy || {};
    const downloadAuthorization = auditService?.downloadAuthorizationPolicy || {};
    const integrity = auditService?.integrity || {};
    const maintenance = auditService?.maintenancePolicy || {};
    const retentionText = [
      Number.isFinite(Number(retention.maxEvents)) && `最多 ${retention.maxEvents} 条`,
      Number.isFinite(Number(retention.windowDays)) && `${retention.windowDays} 天窗口`,
      typeof retention.enforcement === "string" && retention.enforcement,
    ]
      .filter(Boolean)
      .join(" / ");
    const redactedFields = Array.isArray(redaction.redactedFields)
      ? redaction.redactedFields.join(" / ")
      : "";
    const integrityText = auditService?.integrity
      ? [
          `Hash 链 ${integrity.status || "unknown"}`,
          Number.isFinite(Number(integrity.eventCount)) && `事件 ${integrity.eventCount}`,
          integrity.algorithm || "",
          integrity.latestHash ? `最新 ${integrity.latestHash.slice(0, 12)}` : "",
          Array.isArray(integrity.brokenEvents) && integrity.brokenEvents.length
            ? `断链 ${integrity.brokenEvents.length}`
            : "未发现断链",
        ]
          .filter(Boolean)
          .join(" / ")
      : "";
    const signingText = auditService?.signingPolicy
      ? [
          signing.status ? `状态 ${signing.status}` : "",
          signing.algorithm || "",
          signing.canonicalization || "",
          signing.signingSecretConfigured ? "签名密钥已配置" : "签名密钥未配置",
          signing.signedExportsSupported ? "导出可签名" : "导出为未签名样例",
          signing.required ? "强制签名" : "非强制",
          signing.keyId ? `Key ${signing.keyId}` : "",
        ]
          .filter(Boolean)
          .join(" / ")
      : "";
    const maintenanceText = auditService?.maintenancePolicy
      ? [
          maintenance.retentionPurgeSupported ? "支持保留清理" : "",
          maintenance.manualPurgeSupported ? "支持手动触发" : "",
          maintenance.exportPackageSupported ? "支持证据包导出" : "",
          maintenance.auditTrailRequired ? "审计记录" : "",
          maintenance.rechainAfterPurge ? "清理后重建 Hash 链" : "",
        ]
          .filter(Boolean)
          .join(" / ")
      : "";
    const downloadAuthorizationText = auditService?.downloadAuthorizationPolicy
      ? [
          `下载门禁 ${downloadAuthorization.status || "unknown"}`,
          downloadAuthorization.requiresPrivilegedRole ? "要求特权角色" : "样例免角色",
          Array.isArray(downloadAuthorization.allowedRoles) &&
          downloadAuthorization.allowedRoles.length
            ? `允许 ${downloadAuthorization.allowedRoles.join(" / ")}`
            : "",
          downloadAuthorization.enforcementEnv ? `Env ${downloadAuthorization.enforcementEnv}` : "",
        ]
          .filter(Boolean)
          .join(" / ")
      : "";
    const archiveReceipts = state.auditArchiveReceipts.length
      ? state.auditArchiveReceipts
          .slice(0, 3)
          .map((receipt) => {
            const checksum = receipt.packageChecksum ? receipt.packageChecksum.slice(0, 12) : "无";
            const reasons = receipt.reasons.length ? ` · ${receipt.reasons.join(" / ")}` : "";
            return `<li>${escapeHtml(receipt.status)} · ${escapeHtml(receipt.exportId)} · ${escapeHtml(checksum)} · ${receipt.immutable ? "不可变" : "非不可变"}${escapeHtml(reasons)}</li>`;
          })
          .join("")
      : "";

    elements.auditServiceState.innerHTML = `
      <div class="state-panel success-state">
        <strong>审计服务已连接</strong>
        <p>${message || "当前审计服务用于验证安全日志边界，生产审计能力仍需后续接入。"}</p>
        ${
          auditService
            ? `
              <div class="provider-summary" aria-label="审计服务状态">
                <span>${escapeHtml(auditService.name)}</span>
                <span>${escapeHtml(formatProviderMode(auditService))}</span>
                <span>${escapeHtml(auditService.storageMode)}</span>
              </div>
              ${retentionText ? `<p class="provider-warning">样例保留策略：${escapeHtml(retentionText)}。</p>` : ""}
              ${
                redactedFields
                  ? `<p class="provider-warning">脱敏字段：${escapeHtml(redactedFields)}。</p>`
                  : ""
              }
              ${
                integrityText
                  ? `<p class="provider-warning">完整性校验：${escapeHtml(integrityText)}。</p>`
                  : ""
              }
              ${
                signingText
                  ? `<p class="provider-warning">签名策略：${escapeHtml(signingText)}。</p>`
                  : ""
              }
              ${
                maintenanceText
                  ? `<p class="provider-warning">维护策略：${escapeHtml(maintenanceText)}。</p>`
                  : ""
              }
              ${
                downloadAuthorizationText
                  ? `<p class="provider-warning">下载授权：${escapeHtml(downloadAuthorizationText)}。</p>`
                  : ""
              }
              ${
                state.auditMaintenanceMessage
                  ? `<p class="${state.auditMaintenanceStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditMaintenanceMessage)}</p>`
                  : ""
              }
              ${
                state.auditExportMessage
                  ? `<p class="${state.auditExportStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditExportMessage)}</p>`
                  : ""
              }
              ${
                state.auditVerificationMessage
                  ? `<p class="${state.auditVerificationStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditVerificationMessage)}</p>`
                  : ""
              }
              ${
                state.auditArchiveMessage
                  ? `<p class="${state.auditArchiveStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditArchiveMessage)}</p>`
                  : ""
              }
              ${
                state.auditDownloadMessage
                  ? `<p class="${state.auditDownloadStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditDownloadMessage)}</p>`
                  : ""
              }
              ${
                state.auditReplayMessage
                  ? `<p class="${state.auditReplayStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.auditReplayMessage)}</p>`
                  : ""
              }
              ${
                archiveReceipts
                  ? `<ul class="state-list" aria-label="审计归档回执列表">${archiveReceipts}</ul>`
                  : ""
              }
              <div class="provider-actions">
                <button class="secondary-button" data-purge-audit-retention type="button">清理审计保留</button>
                <button class="secondary-button" data-export-audit-package type="button">生成审计证据包</button>
                <button class="secondary-button" data-verify-audit-package type="button">校验证据包</button>
                <button class="secondary-button" data-archive-audit-package type="button">生成归档回执</button>
                <button class="secondary-button" data-refresh-audit-archive type="button">刷新回执列表</button>
                <button class="secondary-button" data-prepare-audit-download type="button">准备下载包</button>
                <button class="secondary-button" data-preview-audit-replay type="button">预演导入</button>
              </div>
              <div class="provider-capabilities" aria-label="审计服务能力">${capabilities}</div>
              <p class="provider-warning">上线前仍需补齐：${escapeHtml(missingProduction)}。</p>
              ${
                auditService.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(auditService.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">审计服务状态未返回，当前仍按仓储审计样例处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.auditServiceState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>审计服务未连接</strong>
        <p>${message || "后端审计服务暂不可用，本机样例仍可继续运行。"}</p>
      </div>
    `;
    return;
  }

  elements.auditServiceState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机审计样例</strong>
      <p>连接后端后，这里会显示审计日志保留上限、敏感字段脱敏和生产安全缺口。</p>
    </div>
  `;
}

function renderJobRunnerState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const jobRunner = getJobRunnerStatus();

  if (status === "checking") {
    elements.jobRunnerState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查任务运行器</strong>
        <p>正在读取后端任务执行模式、支持任务和调度边界。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const supportedJobs = jobRunner?.supportedJobs?.length
      ? jobRunner.supportedJobs
          .map((job) => jobRunnerCapabilityLabels[job] || job)
          .join(" / ")
      : "未标注";
    const capabilities = jobRunner?.capabilities?.length
      ? jobRunner.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(jobRunnerCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const duplicateSuppression = jobRunner?.duplicateSuppression
      ? `重复通知窗口 ${jobRunner.duplicateSuppression.notificationWindowSeconds}s · ${jobRunner.duplicateSuppression.scope || "范围未标注"}`
      : "重复通知抑制未返回";

    elements.jobRunnerState.innerHTML = `
      <div class="state-panel success-state">
        <strong>任务运行器已连接</strong>
        <p>${message || "当前任务用于手动验证提醒评估流程，真实定时器仍需后续接入。"}</p>
        ${
          jobRunner
            ? `
              <div class="provider-summary" aria-label="任务运行器状态">
                <span>${escapeHtml(jobRunner.name)}</span>
                <span>${escapeHtml(formatProviderMode(jobRunner))}</span>
                <span>${escapeHtml(jobRunner.executionMode)}</span>
              </div>
              <div class="provider-summary" aria-label="支持任务">
                <span>${escapeHtml(supportedJobs)}</span>
              </div>
              <div class="provider-summary" aria-label="任务重复通知抑制">
                <span>${escapeHtml(duplicateSuppression)}</span>
              </div>
              <div class="provider-capabilities" aria-label="任务运行器能力">${capabilities}</div>
              ${
                jobRunner.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(jobRunner.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">任务运行器状态未返回，当前仍按手动样例任务处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.jobRunnerState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>任务运行器未连接</strong>
        <p>${message || "后端任务运行器暂不可用，提醒规则仍可保存在本机。"}</p>
      </div>
    `;
    return;
  }

  elements.jobRunnerState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机任务样例</strong>
      <p>连接后端后，这里会显示手动任务、未来定时器、支持任务和调度风险提示。</p>
    </div>
  `;
}

function renderSchedulerState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const scheduler = getSchedulerStatus();

  if (status === "checking") {
    elements.schedulerState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查调度服务</strong>
        <p>正在读取后端任务计划、执行模式和队列边界。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const scheduleText = scheduler?.schedules?.length
      ? scheduler.schedules
          .map((schedule) =>
            `${schedulerCapabilityLabels[schedule.jobType] || schedule.jobType} · ${schedule.cadence || "未标注频率"}`,
          )
          .join(" / ")
      : "未标注";
    const capabilities = scheduler?.capabilities?.length
      ? scheduler.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(schedulerCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const runSafety = scheduler?.runSafety
      ? [
          `幂等窗口 ${scheduler.runSafety.idempotencyWindowSeconds}s`,
          `冷却 ${scheduler.runSafety.cooldownSeconds}s`,
          scheduler.runSafety.idempotencyKeySupported ? "支持幂等 key" : "幂等 key 未启用",
          scheduler.runSafety.overlappingRunsBlocked ? "阻止重叠" : "重叠保护未启用",
        ].join(" · ")
      : "调度运行安全未返回";
    const deadLetterPolicy = scheduler?.deadLetterPolicy
      ? [
          `死信策略 ${scheduler.deadLetterPolicy.status}`,
          `最多 ${scheduler.deadLetterPolicy.maxAttempts} 次`,
          scheduler.deadLetterPolicy.retryBackoff
            ? `重试 ${scheduler.deadLetterPolicy.retryBackoff}`
            : "",
          scheduler.deadLetterPolicy.baseRetrySeconds
            ? `基础间隔 ${scheduler.deadLetterPolicy.baseRetrySeconds}s`
            : "",
          scheduler.deadLetterPolicy.replaySupported ? "支持重放" : "重放未启用",
          scheduler.deadLetterPolicy.requiresAuditTrail ? "审计记录" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "死信策略未返回";
    const deadLetterItems = state.deadLetterJobs.length
      ? state.deadLetterJobs
          .slice(0, 4)
          .map(
            (item) => `
              <div class="provider-summary" aria-label="死信任务 ${escapeHtml(item.id)}">
                <span>${escapeHtml(item.jobType)} · ${escapeHtml(item.status)}</span>
                <span>${escapeHtml(`${item.attempts}/${item.maxAttempts} 次`)}</span>
                <span>${escapeHtml(item.lastError?.code || "JOB_FAILED")}</span>
                ${
                  item.status !== "replayed"
                    ? `<button class="text-button" data-replay-dead-letter="${escapeHtml(item.id)}" type="button">重放</button>`
                    : ""
                }
              </div>
            `,
          )
          .join("")
      : `<p class="provider-note">暂无死信任务。</p>`;
    const workerTelemetryPolicy = scheduler?.workerTelemetryPolicy
      ? [
          `Worker 遥测 ${scheduler.workerTelemetryPolicy.status}`,
          `心跳 TTL ${scheduler.workerTelemetryPolicy.heartbeatTtlSeconds}s`,
          `延迟警戒 ${scheduler.workerTelemetryPolicy.queueLagWarningSeconds}s`,
          `严重 ${scheduler.workerTelemetryPolicy.queueLagCriticalSeconds}s`,
          `深度 ${scheduler.workerTelemetryPolicy.queueDepthWarning}/${scheduler.workerTelemetryPolicy.queueDepthCritical}`,
          scheduler.workerTelemetryPolicy.heartbeatSupported ? "支持心跳" : "",
          scheduler.workerTelemetryPolicy.queueLagMonitoringSupported ? "队列延迟" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "Worker 遥测策略未返回";
    const workerAuthPolicy = scheduler?.workerAuthPolicy
      ? [
          `Worker 凭证 ${scheduler.workerAuthPolicy.status}`,
          scheduler.workerAuthPolicy.configured ? "已配置 secret" : "样例放行",
          scheduler.workerAuthPolicy.enforcement
            ? `校验 ${scheduler.workerAuthPolicy.enforcement}`
            : "",
          scheduler.workerAuthPolicy.signatureRequired
            ? `签名 ${scheduler.workerAuthPolicy.signatureAlgorithm || "required"}`
            : "签名未强制",
          scheduler.workerAuthPolicy.timestampToleranceSeconds
            ? `时间窗 ${scheduler.workerAuthPolicy.timestampToleranceSeconds}s`
            : "",
          scheduler.workerAuthPolicy.acceptedHeader
            ? `Header ${scheduler.workerAuthPolicy.acceptedHeader}`
            : "",
          scheduler.workerAuthPolicy.acceptedSignatureHeader
            ? `签名 Header ${scheduler.workerAuthPolicy.acceptedSignatureHeader}`
            : "",
          scheduler.workerAuthPolicy.nonceRequired ? "Nonce 必填" : "Nonce 未强制",
          scheduler.workerAuthPolicy.acceptedNonceHeader
            ? `Nonce Header ${scheduler.workerAuthPolicy.acceptedNonceHeader}`
            : "",
          scheduler.workerAuthPolicy.nonceRetentionLimit
            ? `Nonce 保留 ${scheduler.workerAuthPolicy.nonceRetentionLimit}`
            : "",
          scheduler.workerAuthPolicy.nonceRetentionSeconds
            ? `Nonce 有效 ${scheduler.workerAuthPolicy.nonceRetentionSeconds}s`
            : "",
          scheduler.workerAuthPolicy.nonceCleanupSupported ? "Nonce 自动清理" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "Worker 凭证策略未返回";
    const workerNonceMaintenancePolicy = scheduler?.workerNonceMaintenancePolicy
      ? [
          `Nonce 清理 ${scheduler.workerNonceMaintenancePolicy.status}`,
          scheduler.workerNonceMaintenancePolicy.cleanupSupported ? "支持清理" : "",
          scheduler.workerNonceMaintenancePolicy.manualCleanupSupported ? "支持手动触发" : "",
          scheduler.workerNonceMaintenancePolicy.retentionSeconds
            ? `保留 ${scheduler.workerNonceMaintenancePolicy.retentionSeconds}s`
            : "",
          scheduler.workerNonceMaintenancePolicy.retentionLimit
            ? `上限 ${scheduler.workerNonceMaintenancePolicy.retentionLimit}`
            : "",
          scheduler.workerNonceMaintenancePolicy.auditTrailRequired ? "审计记录" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "Worker nonce 清理策略未返回";
    const workerHealth = state.workerHealth;
    const workerHealthSummary = workerHealth
      ? [
          `worker ${workerHealth.status}`,
          `活跃 ${workerHealth.activeWorkerCount}/${workerHealth.workerCount}`,
          `过期 ${workerHealth.staleWorkerCount}`,
          workerHealth.queue
            ? `队列 ${workerHealth.queue.status} · 待处理 ${workerHealth.queue.pendingWork} · 最大延迟 ${Math.round(workerHealth.queue.maxLagMs / 1000)}s`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "暂无 worker 健康状态";
    const workerItems = workerHealth?.workers?.length
      ? workerHealth.workers
          .slice(0, 4)
          .map(
            (worker) => `
              <div class="provider-summary" aria-label="worker ${escapeHtml(worker.workerId)}">
                <span>${escapeHtml(worker.workerId)} · ${escapeHtml(worker.status)}</span>
                <span>${escapeHtml(`深度 ${worker.queueDepth}`)}</span>
                <span>${escapeHtml(`延迟 ${Math.round(worker.queueLagMs / 1000)}s`)}</span>
              </div>
            `,
          )
          .join("")
      : `<p class="provider-note">暂无 worker 心跳记录。</p>`;
    const schedulerQueuePolicy = scheduler?.queuePolicy
      ? [
          `队列模型 ${scheduler.queuePolicy.status}`,
          scheduler.queuePolicy.enqueueSupported ? "支持入队" : "",
          scheduler.queuePolicy.retryBackoff ? `重试 ${scheduler.queuePolicy.retryBackoff}` : "",
          scheduler.queuePolicy.maxAttempts ? `最多 ${scheduler.queuePolicy.maxAttempts} 次` : "",
          scheduler.queuePolicy.deadLetterAfterMaxAttempts ? "失败转死信" : "",
          scheduler.queuePolicy.requiresIdempotencyKey ? "要求幂等" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "队列模型策略未返回";
    const schedulerQueue = state.schedulerQueueState;
    const schedulerQueueSummary = schedulerQueue
      ? [
          `队列 ${schedulerQueue.status}`,
          `总数 ${schedulerQueue.summary.total}`,
          `待执行 ${schedulerQueue.summary.queued}`,
          `重试 ${schedulerQueue.summary.retrying}`,
          `到期 ${schedulerQueue.summary.due}`,
          `失败 ${schedulerQueue.summary.failed}`,
          schedulerQueue.summary.nextDueAt ? `下次 ${schedulerQueue.summary.nextDueAt}` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "暂无队列任务状态";
    const schedulerQueueAlerts = schedulerQueue?.alerts?.length
      ? schedulerQueue.alerts
          .slice(0, 3)
          .map((alert) => `${alert.severity}:${alert.code || alert.message}`)
          .join(" / ")
      : "暂无队列告警";
    const schedulerQueueItems = schedulerQueue?.items?.length
      ? schedulerQueue.items
          .slice(0, 4)
          .map(
            (item) => `
              <div class="provider-summary" aria-label="队列任务 ${escapeHtml(item.id)}">
                <span>${escapeHtml(item.jobType)} · ${escapeHtml(item.status)}</span>
                <span>${escapeHtml(`优先级 ${item.priority}`)}</span>
                <span>${escapeHtml(`${item.attempts}/${item.maxAttempts} 次`)}</span>
              </div>
            `,
          )
          .join("")
      : `<p class="provider-note">暂无队列任务。</p>`;
    const providerAdapter = scheduler?.providerAdapter;
    const providerAdapterSummary = providerAdapter
      ? [
          `调度 provider 适配器 ${providerAdapter.status}`,
          providerAdapter.runtimeMode,
          providerAdapter.selectedProvider || "未选择 provider",
        ].join(" · ")
      : "";
    const providerContracts = providerAdapter?.endpointContracts?.length
      ? providerAdapter.endpointContracts
          .slice(0, 4)
          .map((contract) => `${contract.method}:${contract.status}`)
          .join(" / ")
      : "暂无调度 provider 接口契约";
    const scheduleContracts = providerAdapter?.scheduleContracts?.length
      ? providerAdapter.scheduleContracts
          .slice(0, 4)
          .map((schedule) => `${schedule.jobType}:${schedule.status}:${schedule.cadence}`)
          .join(" / ")
      : "暂无后台任务契约";
    const queuePolicy = providerAdapter?.queuePolicy
      ? [
          `队列策略 ${providerAdapter.queuePolicy.status}`,
          providerAdapter.queuePolicy.requiresIdempotencyKey ? "幂等 key" : "",
          providerAdapter.queuePolicy.retryBackoff
            ? `重试 ${providerAdapter.queuePolicy.retryBackoff}`
            : "",
          providerAdapter.queuePolicy.maxAttempts
            ? `最多 ${providerAdapter.queuePolicy.maxAttempts} 次`
            : "",
          providerAdapter.queuePolicy.deadLetterQueueRequired ? "死信队列" : "",
          providerAdapter.queuePolicy.workerHeartbeatSeconds
            ? `心跳 ${providerAdapter.queuePolicy.workerHeartbeatSeconds}s`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const runSafetyPolicy = providerAdapter?.runSafetyPolicy
      ? [
          `运行安全 ${providerAdapter.runSafetyPolicy.status}`,
          providerAdapter.runSafetyPolicy.requiresCronSignature ? "cron 签名" : "",
          providerAdapter.runSafetyPolicy.limitsConcurrentRuns ? "并发限制" : "",
          providerAdapter.runSafetyPolicy.recordsJobLag ? "延迟记录" : "",
          providerAdapter.runSafetyPolicy.blocksOverlappingRuns ? "阻止重叠" : "",
          providerAdapter.runSafetyPolicy.requiresAuditTrail ? "审计链" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const schedulerGate = providerAdapter?.schedulerGate
      ? `调度门禁 ${providerAdapter.schedulerGate.status} · ${
          providerAdapter.schedulerGate.canUseBackgroundWorkers ? "workers 可启用" : "workers 不可启用"
        }`
      : "";
    const schedulerChecks = providerAdapter?.schedulerGate?.checks?.length
      ? providerAdapter.schedulerGate.checks
          .slice(0, 5)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "";
    const missingEnv = providerAdapter?.missingEnvVars?.length
      ? providerAdapter.missingEnvVars.join(" / ")
      : "暂无调度 provider 缺失环境变量";
    const safety = providerAdapter?.safety
      ? Object.entries(providerAdapter.safety)
          .filter(([, enabled]) => enabled === true)
          .map(([key]) => {
            const labels = {
              noExternalWorkers: "不启动外部 worker",
              manualFallbackActive: "保留手动回退",
              requiresSignedCron: "要求 cron 签名",
              requiresIdempotency: "要求幂等",
              requiresDeadLetterQueue: "要求死信队列",
              requiresWorkerHeartbeat: "要求 worker 心跳",
              requiresAuditLog: "要求审计",
            };
            return labels[key] || key;
          })
          .join(" · ")
      : "";
    const providerBlocker = providerAdapter?.blockedReasons?.length
      ? providerAdapter.blockedReasons[0]
      : "";

    elements.schedulerState.innerHTML = `
      <div class="state-panel success-state">
        <strong>调度服务已连接</strong>
        <p>${message || "当前调度服务只支持手动到期检查，真实 cron 或队列 worker 仍需后续接入。"}</p>
        ${
          scheduler
            ? `
              <div class="provider-summary" aria-label="调度服务状态">
                <span>${escapeHtml(scheduler.name)}</span>
                <span>${escapeHtml(formatProviderMode(scheduler))}</span>
                <span>${escapeHtml(scheduler.executionMode)}</span>
                <span>${escapeHtml(scheduler.timezone)}</span>
              </div>
              <div class="provider-summary" aria-label="调度计划">
                <span>${escapeHtml(scheduleText)}</span>
              </div>
              <div class="provider-summary" aria-label="调度运行安全">
                <span>${escapeHtml(runSafety)}</span>
              </div>
              <div class="provider-summary" aria-label="死信队列策略">
                <span>${escapeHtml(deadLetterPolicy)}</span>
              </div>
              <div class="provider-summary" aria-label="worker 遥测策略">
                <span>${escapeHtml(workerTelemetryPolicy)}</span>
              </div>
              <div class="provider-summary" aria-label="worker 凭证策略">
                <span>${escapeHtml(workerAuthPolicy)}</span>
              </div>
              <div class="provider-summary" aria-label="worker nonce 清理策略">
                <span>${escapeHtml(workerNonceMaintenancePolicy)}</span>
              </div>
              <div class="provider-summary" aria-label="队列模型策略">
                <span>${escapeHtml(schedulerQueuePolicy)}</span>
              </div>
              <div class="provider-capabilities" aria-label="调度服务能力">${capabilities}</div>
              <div class="provider-actions">
                <button class="secondary-button" data-refresh-dead-letter type="button">刷新死信队列</button>
                <button class="secondary-button" data-refresh-worker-health type="button">刷新 worker 健康</button>
                <button class="secondary-button" data-record-worker-heartbeat type="button">记录样例心跳</button>
                <button class="secondary-button" data-refresh-scheduler-queue type="button">刷新队列</button>
                <button class="secondary-button" data-enqueue-sample-job type="button">创建样例任务</button>
                <button class="secondary-button" data-process-scheduler-queue type="button">处理到期任务</button>
                <button class="secondary-button" data-cleanup-worker-nonces type="button">清理过期 nonce</button>
              </div>
              ${
                state.schedulerMaintenanceMessage
                  ? `<p class="${state.schedulerMaintenanceStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.schedulerMaintenanceMessage)}</p>`
                  : ""
              }
              ${
                state.deadLetterMessage
                  ? `<p class="${state.deadLetterStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.deadLetterMessage)}</p>`
                  : ""
              }
              <div aria-label="死信任务列表">${deadLetterItems}</div>
              ${
                state.workerHealthMessage
                  ? `<p class="${state.workerHealthStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.workerHealthMessage)}</p>`
                  : ""
              }
              <div class="provider-summary" aria-label="worker 健康摘要">
                <span>${escapeHtml(workerHealthSummary)}</span>
              </div>
              <div aria-label="worker 心跳列表">${workerItems}</div>
              ${
                state.schedulerQueueMessage
                  ? `<p class="${state.schedulerQueueStatus === "error" ? "provider-warning" : "provider-note"}">${escapeHtml(state.schedulerQueueMessage)}</p>`
                  : ""
              }
              <div class="provider-summary" aria-label="队列状态摘要">
                <span>${escapeHtml(schedulerQueueSummary)}</span>
              </div>
              <p class="provider-note">${escapeHtml(schedulerQueueAlerts)}</p>
              <div aria-label="队列任务列表">${schedulerQueueItems}</div>
              ${
                providerAdapter
                  ? `
                    <div class="provider-summary" aria-label="调度 provider 适配器状态">
                      <span>${escapeHtml(providerAdapterSummary)}</span>
                    </div>
                    <div class="provider-summary" aria-label="调度 provider 接口契约">
                      <span>${escapeHtml(providerContracts)}</span>
                    </div>
                    <div class="provider-summary" aria-label="后台任务契约">
                      <span>${escapeHtml(scheduleContracts)}</span>
                    </div>
                    ${queuePolicy ? `<p class="provider-note">${escapeHtml(queuePolicy)}</p>` : ""}
                    ${
                      runSafetyPolicy
                        ? `<p class="provider-note">${escapeHtml(runSafetyPolicy)}</p>`
                        : ""
                    }
                    ${
                      schedulerGate
                        ? `<p class="provider-note">${escapeHtml(schedulerGate)}</p>`
                        : ""
                    }
                    ${
                      schedulerChecks
                        ? `<p class="provider-note">${escapeHtml(schedulerChecks)}</p>`
                        : ""
                    }
                    <p class="provider-note">${escapeHtml(missingEnv)}</p>
                    ${safety ? `<p class="provider-note">${escapeHtml(safety)}</p>` : ""}
                    ${
                      providerBlocker
                        ? `<p class="provider-warning">${escapeHtml(providerBlocker)}</p>`
                        : ""
                    }
                    ${
                      providerAdapter.disclaimer
                        ? `<p class="provider-warning">${escapeHtml(providerAdapter.disclaimer)}</p>`
                        : ""
                    }
                  `
                  : ""
              }
              ${
                scheduler.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(scheduler.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">调度服务状态未返回，当前仍按手动样例任务处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.schedulerState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>调度服务未连接</strong>
        <p>${message || "后端调度服务暂不可用，提醒规则仍可保存在本机。"}</p>
      </div>
    `;
    return;
  }

  elements.schedulerState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机调度样例</strong>
      <p>连接后端后，这里会显示任务计划、手动到期检查、未来队列 worker 和调度风险提示。</p>
    </div>
  `;
}

function renderDataSourceState(status = localStorage.getItem("apiHealthStatus") || "idle", message = "") {
  const config = getApiConfig();
  const provider = getProviderStatus();

  if (status === "checking") {
    elements.dataSourceState.innerHTML = `
      <div class="state-panel loading-state" role="status" aria-live="polite">
        <strong>正在检查后端 API</strong>
        <p>正在连接 ${config.baseUrl}。Xcode 本机版本会在连接失败时继续使用样例数据。</p>
      </div>
    `;
    return;
  }

  if (config.mode === "backend" && status === "connected") {
    elements.dataSourceState.innerHTML = `
      <div class="state-panel success-state">
        <strong>后端 API 已连接</strong>
        <p>${message || `当前后端地址：${config.baseUrl}。后续新闻、自选股和分析数据可逐步切换到接口。`}</p>
        ${renderProviderDetails(provider)}
        <button class="secondary-button" data-use-local-data type="button">改用本机样例</button>
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.dataSourceState.innerHTML = `
      <div class="state-panel error-state" role="alert">
        <strong>后端连接失败，已切回本机样例</strong>
        <p>${message || "请确认 mock 后端已启动，再重新尝试连接。Xcode 版本仍可正常浏览样例数据。"}</p>
        <button class="secondary-button" data-check-backend type="button">重新尝试后端 API</button>
      </div>
    `;
    return;
  }

  elements.dataSourceState.innerHTML = `
    <div class="state-panel empty-state">
      <strong>当前使用本机样例数据</strong>
      <p>这是最稳定的 Xcode 运行模式；后端启动后，可尝试连接 ${config.baseUrl}。</p>
      <button class="secondary-button" data-check-backend type="button">尝试后端 API</button>
    </div>
  `;
}

async function checkBackendHealth() {
  state.apiMode = "backend";
  localStorage.setItem("apiMode", "backend");
  localStorage.setItem("apiBaseUrl", state.apiBaseUrl || defaultApiBaseUrl);
  renderDataSourceState("checking");
  renderAiServiceState("checking");
  renderComplianceServiceState("checking");
  renderRepositoryState("checking");
  renderDatabaseState("checking");
  renderAuditServiceState("checking");
  renderJobRunnerState("checking");
  renderSchedulerState("checking");
  renderNotificationServiceState("checking");

  try {
    const health = await requestApi("/health");
    let provider = null;
    let marketDataRuntime = null;
    let newsIngestionRuntime = null;
    let aiService = null;
    let complianceService = null;
    let authService = null;
    let notificationService = null;
    let jobRunner = null;
    let scheduler = null;
    let repository = null;
    let database = null;
    let auditService = null;
    try {
      provider = await loadProviderStatus();
    } catch {
      provider = null;
    }
    try {
      marketDataRuntime = await loadMarketDataRuntimeStatus();
    } catch {
      marketDataRuntime = null;
    }
    try {
      newsIngestionRuntime = await loadNewsIngestionRuntimeStatus();
    } catch {
      newsIngestionRuntime = null;
    }
    try {
      aiService = await loadAiServiceStatus();
    } catch {
      aiService = null;
    }
    try {
      complianceService = await loadComplianceServiceStatus();
    } catch {
      complianceService = null;
    }
    try {
      authService = await loadAuthServiceStatus();
    } catch {
      authService = null;
    }
    try {
      notificationService = await loadNotificationServiceStatus();
    } catch {
      notificationService = null;
    }
    try {
      jobRunner = await loadJobRunnerStatus();
    } catch {
      jobRunner = null;
    }
    try {
      scheduler = await loadSchedulerStatus();
    } catch {
      scheduler = null;
    }
    try {
      repository = await loadRepositoryStatus();
    } catch {
      repository = null;
    }
    try {
      database = await loadDatabaseStatus();
    } catch {
      database = null;
    }
    try {
      auditService = await loadAuditServiceStatus();
    } catch {
      auditService = null;
    }
    localStorage.setItem("apiHealthStatus", "connected");
    await validateSavedSession({ silent: true });
    renderDataSourceState(
      "connected",
      provider
        ? `${health.service || "后端服务"} 已响应，版本 ${health.version || "未标注"}。当前数据源为 ${formatProviderMode(provider)}，行情运行时 ${marketDataRuntime?.status || "未返回"}，新闻采集运行时 ${newsIngestionRuntime?.status || "未返回"}。`
        : `${health.service || "后端服务"} 已响应，版本 ${health.version || "未标注"}。数据源能力暂未返回。`,
    );
    renderAiServiceState(
      "connected",
      aiService
        ? `当前 AI 服务为 ${aiService.name}，模型 ${aiService.model}。`
        : "后端已连接，但 AI 服务能力暂未返回。",
    );
    renderComplianceServiceState(
      "connected",
      complianceService
        ? `当前合规策略为 ${complianceService.name}，门禁状态 ${complianceService.complianceGate?.status || "未标注"}。`
        : "后端已连接，但合规策略状态暂未返回。",
    );
    renderRepositoryState(
      "connected",
      repository
        ? `当前仓储为 ${repository.name}，持久化模式 ${repository.persistenceMode}。`
        : "后端已连接，但仓储状态暂未返回。",
    );
    renderDatabaseState(
      "connected",
      database
        ? `当前数据库服务为 ${database.name}，存储桥为 ${database.activeStorage}。`
        : "后端已连接，但数据库服务状态暂未返回。",
    );
    renderAuditServiceState(
      "connected",
      auditService
        ? `当前审计服务为 ${auditService.name}，存储模式 ${auditService.storageMode}。`
        : "后端已连接，但审计服务状态暂未返回。",
    );
    renderJobRunnerState(
      "connected",
      jobRunner
        ? `当前任务运行器为 ${jobRunner.name}，执行模式 ${jobRunner.executionMode}。`
        : "后端已连接，但任务运行器状态暂未返回。",
    );
    renderSchedulerState(
      "connected",
      scheduler
        ? `当前调度服务为 ${scheduler.name}，执行模式 ${scheduler.executionMode}。`
        : "后端已连接，但调度服务状态暂未返回。",
    );
    renderNotificationServiceState(
      "connected",
      notificationService
        ? `当前通知服务为 ${notificationService.name}，投递模式 ${notificationService.deliveryMode}。`
        : "后端已连接，但通知投递能力暂未返回。",
    );
    renderNotificationSettings();
    renderAccountState();
    await loadComplianceAcknowledgements();
    await loadSuitabilityQuestionnaires();
    await loadNews();
    await loadAnalysis();
    await loadWatchlist();
    await loadReminderRules();
    await loadDeadLetterJobs();
    await loadWorkerHealth();
    await loadSchedulerQueue();
    showStatus("后端 API 连接成功。当前仍保留本机数据作为稳定回退。", "success");
  } catch (error) {
    state.apiMode = "local";
    state.providerStatus = null;
    state.marketDataRuntimeStatus = null;
    state.newsIngestionRuntimeStatus = null;
    state.aiServiceStatus = null;
    state.complianceServiceStatus = null;
    state.authServiceStatus = null;
    state.notificationServiceStatus = null;
    state.jobRunnerStatus = null;
    state.schedulerStatus = null;
    state.repositoryStatus = null;
    state.databaseStatus = null;
    state.auditServiceStatus = null;
    state.auditMaintenanceStatus = "";
    state.auditMaintenanceMessage = "";
    state.auditExportStatus = "";
    state.auditExportMessage = "";
    state.auditVerificationStatus = "";
    state.auditVerificationMessage = "";
    state.auditArchiveStatus = "";
    state.auditArchiveMessage = "";
    state.auditArchiveReceipts = [];
    state.auditDownloadStatus = "";
    state.auditDownloadMessage = "";
    state.auditReplayStatus = "";
    state.auditReplayMessage = "";
    state.lastAuditExportPackage = null;
    state.deadLetterJobs = [];
    state.deadLetterStatus = "";
    state.deadLetterMessage = "";
    state.workerHealth = null;
    state.workerHealthStatus = "";
    state.workerHealthMessage = "";
    state.schedulerQueueState = null;
    state.schedulerQueueStatus = "";
    state.schedulerQueueMessage = "";
    state.schedulerMaintenanceStatus = "";
    state.schedulerMaintenanceMessage = "";
    localStorage.setItem("apiMode", "local");
    localStorage.setItem("apiHealthStatus", "failed");
    localStorage.removeItem("apiProviderStatus");
    localStorage.removeItem("apiMarketDataRuntimeStatus");
    localStorage.removeItem("apiNewsIngestionRuntimeStatus");
    localStorage.removeItem("apiAiServiceStatus");
    localStorage.removeItem("apiComplianceServiceStatus");
    localStorage.removeItem("apiAuthServiceStatus");
    localStorage.removeItem("apiNotificationServiceStatus");
    localStorage.removeItem("apiJobRunnerStatus");
    localStorage.removeItem("apiSchedulerStatus");
    localStorage.removeItem("apiRepositoryStatus");
    localStorage.removeItem("apiDatabaseStatus");
    localStorage.removeItem("apiAuditServiceStatus");
    localStorage.removeItem("schedulerDeadLetterJobs");
    localStorage.removeItem("schedulerWorkerHealth");
    localStorage.removeItem("schedulerQueueState");
    renderDataSourceState("failed", `${error.message} 已自动切回本机样例数据。`);
    renderAiServiceState("failed", `${error.message} 已自动切回本机样例分析。`);
    renderComplianceServiceState("failed", `${error.message} 已自动切回本机合规样例。`);
    renderRepositoryState("failed", `${error.message} 已自动切回本机样例存储。`);
    renderDatabaseState("failed", `${error.message} 已自动切回本机数据库样例。`);
    renderAuditServiceState("failed", `${error.message} 已自动切回本机审计样例。`);
    renderJobRunnerState("failed", `${error.message} 已自动切回本机任务样例。`);
    renderSchedulerState("failed", `${error.message} 已自动切回本机调度样例。`);
    renderNotificationServiceState("failed", `${error.message} 已自动切回本机提醒样例。`);
    renderAccountState();
    showStatus("后端 API 暂时不可用，已继续使用本机样例数据。", "warning");
  }
}

function useLocalDataSource() {
  state.apiMode = "local";
  state.providerStatus = null;
  state.marketDataRuntimeStatus = null;
  state.newsIngestionRuntimeStatus = null;
  state.aiServiceStatus = null;
  state.complianceServiceStatus = null;
  state.authServiceStatus = null;
  state.notificationServiceStatus = null;
  state.jobRunnerStatus = null;
  state.schedulerStatus = null;
  state.repositoryStatus = null;
  state.databaseStatus = null;
  state.auditServiceStatus = null;
  state.auditMaintenanceStatus = "";
  state.auditMaintenanceMessage = "";
  state.auditExportStatus = "";
  state.auditExportMessage = "";
  state.auditVerificationStatus = "";
  state.auditVerificationMessage = "";
  state.auditArchiveStatus = "";
  state.auditArchiveMessage = "";
  state.auditArchiveReceipts = [];
  state.auditDownloadStatus = "";
  state.auditDownloadMessage = "";
  state.auditReplayStatus = "";
  state.auditReplayMessage = "";
  state.lastAuditExportPackage = null;
  state.deadLetterJobs = [];
  state.deadLetterStatus = "";
  state.deadLetterMessage = "";
  state.workerHealth = null;
  state.workerHealthStatus = "";
  state.workerHealthMessage = "";
  state.schedulerQueueState = null;
  state.schedulerQueueStatus = "";
  state.schedulerQueueMessage = "";
  state.schedulerMaintenanceStatus = "";
  state.schedulerMaintenanceMessage = "";
  localStorage.setItem("apiMode", "local");
  localStorage.removeItem("apiHealthStatus");
  localStorage.removeItem("apiProviderStatus");
  localStorage.removeItem("apiMarketDataRuntimeStatus");
  localStorage.removeItem("apiNewsIngestionRuntimeStatus");
  localStorage.removeItem("apiAiServiceStatus");
  localStorage.removeItem("apiComplianceServiceStatus");
  localStorage.removeItem("apiAuthServiceStatus");
  localStorage.removeItem("apiNotificationServiceStatus");
  localStorage.removeItem("apiJobRunnerStatus");
  localStorage.removeItem("apiSchedulerStatus");
  localStorage.removeItem("apiRepositoryStatus");
  localStorage.removeItem("apiDatabaseStatus");
  localStorage.removeItem("apiAuditServiceStatus");
  localStorage.removeItem("schedulerDeadLetterJobs");
  localStorage.removeItem("schedulerWorkerHealth");
  localStorage.removeItem("schedulerQueueState");
  renderDataSourceState("idle");
  renderAiServiceState("idle");
  renderComplianceServiceState("idle");
  renderRepositoryState("idle");
  renderDatabaseState("idle");
  renderAuditServiceState("idle");
  renderJobRunnerState("idle");
  renderSchedulerState("idle");
  renderNotificationServiceState("idle");
  renderAccountState();
  loadNews();
  loadAnalysis();
  loadWatchlist();
  loadReminderRules();
  showStatus("已切换为本机样例数据，Xcode 离线运行不受影响。", "info");
}

async function demoSignIn() {
  localStorage.setItem("prototypeAccountState", "authenticated");
  state.authRoleStatus = "";
  state.authRoleMessage = "";
  state.adminRoleStatus = "";
  state.adminRoleMessage = "";
  state.adminRoleHistoryStatus = "";
  state.adminRoleHistoryMessage = "";
  state.adminRoleHistory = [];
  renderAccountState();
  renderPortfolioSyncState();
  await loadWatchlist();
  const preferencesState = await loadUserPreferences();
  await loadPortfolio();
  await loadReminderRules();
  await loadNotifications();
  await loadComplianceAcknowledgements();
  await loadSuitabilityQuestionnaires();
  showStatus(
    preferencesState.source === "backend"
      ? "已切换为样例登录状态，并已同步自选股、提醒规则和偏好设置。"
      : canSyncWatchlist()
        ? "已切换为样例登录状态，并已准备通过后端同步自选股。"
        : "已切换为样例登录状态；后端连接后可同步自选股和偏好设置。",
    "success",
  );
}

function readAuthFormPayload(button) {
  const emailInput = elements.accountState.querySelector?.("[data-auth-email]");
  const passwordInput = elements.accountState.querySelector?.("[data-auth-password]");
  const displayNameInput = elements.accountState.querySelector?.("[data-auth-display-name]");
  return {
    email: button?.dataset?.email || emailInput?.value || "",
    password: button?.dataset?.password || passwordInput?.value || "",
    displayName: button?.dataset?.displayName || displayNameInput?.value || "",
  };
}

async function emailAuth(action, button) {
  if (!shouldUseBackendDataSource()) {
    showStatus("邮箱注册/登录需要先连接后端 API。当前 Xcode 离线样例仍可继续使用。", "warning");
    return { status: "local" };
  }

  const payload = readAuthFormPayload(button);
  if (!payload.email || !payload.password) {
    showStatus("请填写邮箱和密码。", "warning");
    return { status: "invalid" };
  }

  const path = action === "register" ? "/api/auth/register" : "/api/auth/login";
  try {
    const response = await requestApi(path, {
      method: "POST",
      body: payload,
    });
    state.authToken = response.token || "";
    state.authUser = sanitizeAuthUser(response.user);
    state.authRoleStatus = "";
    state.authRoleMessage = "";
    state.adminRoleStatus = "";
    state.adminRoleMessage = "";
    state.adminRoleHistoryStatus = "";
    state.adminRoleHistoryMessage = "";
    state.adminRoleHistory = [];
    if (!state.authToken || !state.authUser) {
      throw new Error("后端未返回完整登录信息。");
    }
    localStorage.removeItem("prototypeAccountState");
    localStorage.setItem("apiAuthToken", state.authToken);
    localStorage.setItem("apiAuthUser", JSON.stringify(state.authUser));
    renderAccountState();
    renderPortfolioSyncState();
    await loadWatchlist();
    await loadUserPreferences();
    await loadPortfolio();
    await loadReminderRules();
    await loadNotifications();
    await loadComplianceAcknowledgements();
    await loadSuitabilityQuestionnaires();
    showStatus(
      action === "register"
        ? "账号已注册并登录，后端同步流程已启用。"
        : "已通过邮箱登录，后端同步流程已启用。",
      "success",
    );
    return { status: "authenticated", source: "backend", user: state.authUser };
  } catch (error) {
    showStatus(`${action === "register" ? "注册" : "登录"}失败：${error.message}`, "warning");
    return { status: "error", error };
  }
}

async function updateAuthRole(role) {
  const rolePolicy = getAuthServiceStatus()?.rolePolicy;
  if (!rolePolicy?.allowedRoles?.includes(role)) {
    showStatus("角色选项无效，请刷新认证服务状态。", "warning");
    return { status: "invalid" };
  }

  if (!shouldUseBackendDataSource() || !state.authToken || !state.authUser) {
    showStatus("样例角色管理需要先连接后端并使用邮箱账号登录。", "warning");
    return { status: "blocked" };
  }

  try {
    state.authRoleStatus = "saving";
    state.authRoleMessage = "正在更新样例角色。";
    renderAccountState();
    const response = await requestApi("/api/auth/roles", {
      method: "POST",
      headers: authHeaders(state.authToken),
      body: { roles: [role] },
    });
    const user = sanitizeAuthUser(response.user);
    if (!user) throw new Error("后端未返回有效用户角色。");
    state.authUser = user;
    localStorage.setItem("apiAuthUser", JSON.stringify(user));
    state.authRoleStatus = "ready";
    state.authRoleMessage = `已切换为${authRoleLabels[role] || role}，可用于验证审计下载角色门禁。`;
    renderAccountState();
    renderPortfolioSyncState();
    showStatus(state.authRoleMessage, "success");
    return { status: "ready", user };
  } catch (error) {
    state.authRoleStatus = "error";
    state.authRoleMessage = `样例角色更新失败：${error.message}`;
    renderAccountState();
    showStatus(state.authRoleMessage, "warning");
    return { status: "error", error };
  }
}

async function assignAuthRoleAsAdmin(button = null) {
  const rolePolicy = getAuthServiceStatus()?.rolePolicy;
  const activeToken = state.authToken || localStorage.getItem("apiAuthToken") || "";
  const activeUser = state.authUser || readJsonStorage("apiAuthUser", null, sanitizeAuthUser);
  const email =
    button?.dataset?.email ||
    elements.accountState.querySelector?.("[data-admin-role-email]")?.value ||
    "";
  const role =
    button?.dataset?.role ||
    elements.accountState.querySelector?.("[data-admin-role-select]")?.value ||
    "user";
  const expiresInHours =
    button?.dataset?.expiresInHours ||
    elements.accountState.querySelector?.("[data-admin-role-expiry]")?.value ||
    "";

  if (!email.trim()) {
    showStatus("请填写需要授权的目标邮箱。", "warning");
    return { status: "invalid" };
  }
  if (!rolePolicy?.allowedRoles?.includes(role)) {
    showStatus("授权角色无效，请刷新认证服务状态。", "warning");
    return { status: "invalid" };
  }
  if (!activeToken) {
    showStatus("管理员角色授权需要先连接后端并使用管理员账号登录。", "warning");
    return { status: "blocked" };
  }

  try {
    state.adminRoleStatus = "saving";
    state.adminRoleMessage = "正在保存管理员角色授权。";
    renderAccountState();
    const response = await requestApi("/api/admin/auth/users/roles", {
      method: "POST",
      headers: authHeaders(activeToken),
      body: { email, roles: [role], expiresInHours },
    });
    const targetUser = sanitizeAuthUser(response.targetUser);
    if (!targetUser) throw new Error("后端未返回有效目标用户。");
    if (activeUser && targetUser.id === activeUser.id) {
      state.authUser = targetUser;
      localStorage.setItem("apiAuthUser", JSON.stringify(targetUser));
    }
    state.adminRoleStatus = "ready";
    const grant = Array.isArray(targetUser.roleGrants)
      ? targetUser.roleGrants.find((item) => item.role === role)
      : null;
    const expiryText = grant?.expiresAt ? `，到期 ${formatDateTime(grant.expiresAt)}` : "";
    state.adminRoleMessage = `已为 ${targetUser.email || targetUser.displayName} 授权 ${authRoleLabels[role] || role}${expiryText}。`;
    renderAccountState();
    showStatus(state.adminRoleMessage, "success");
    return { status: "ready", targetUser };
  } catch (error) {
    state.adminRoleStatus = "error";
    state.adminRoleMessage = `管理员授权失败：${error.message}`;
    renderAccountState();
    showStatus(state.adminRoleMessage, "warning");
    return { status: "error", error };
  }
}

async function revokeAuthRoleAsAdmin(button = null) {
  const rolePolicy = getAuthServiceStatus()?.rolePolicy;
  const activeToken = state.authToken || localStorage.getItem("apiAuthToken") || "";
  const activeUser = state.authUser || readJsonStorage("apiAuthUser", null, sanitizeAuthUser);
  const email =
    button?.dataset?.email ||
    elements.accountState.querySelector?.("[data-admin-role-email]")?.value ||
    "";
  const role =
    button?.dataset?.role ||
    elements.accountState.querySelector?.("[data-admin-role-select]")?.value ||
    "user";
  const revocableRoles = rolePolicy?.adminRevocationPolicy?.revocableRoles || [];

  if (!email.trim()) {
    showStatus("请填写需要撤销角色的目标邮箱。", "warning");
    return { status: "invalid" };
  }
  if (!revocableRoles.includes(role)) {
    showStatus("该角色不可通过管理员撤销入口撤销。", "warning");
    return { status: "invalid" };
  }
  if (!activeToken) {
    showStatus("管理员角色撤销需要先连接后端并使用管理员账号登录。", "warning");
    return { status: "blocked" };
  }

  try {
    state.adminRoleStatus = "saving";
    state.adminRoleMessage = "正在撤销用户角色。";
    renderAccountState();
    const response = await requestApi("/api/admin/auth/users/roles/revoke", {
      method: "POST",
      headers: authHeaders(activeToken),
      body: { email, roles: [role] },
    });
    const targetUser = sanitizeAuthUser(response.targetUser);
    if (!targetUser) throw new Error("后端未返回有效目标用户。");
    if (activeUser && targetUser.id === activeUser.id) {
      state.authUser = targetUser;
      localStorage.setItem("apiAuthUser", JSON.stringify(targetUser));
    }
    state.adminRoleStatus = "ready";
    state.adminRoleMessage = `已撤销 ${targetUser.email || targetUser.displayName} 的 ${authRoleLabels[role] || role} 角色。`;
    renderAccountState();
    showStatus(state.adminRoleMessage, "success");
    return { status: "ready", targetUser };
  } catch (error) {
    state.adminRoleStatus = "error";
    state.adminRoleMessage = `管理员撤销失败：${error.message}`;
    renderAccountState();
    showStatus(state.adminRoleMessage, "warning");
    return { status: "error", error };
  }
}

function sanitizeAdminRoleHistory(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => isPlainObject(item))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      eventType: typeof item.eventType === "string" ? item.eventType : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      severity: typeof item.severity === "string" ? item.severity : "info",
      message: typeof item.message === "string" ? item.message : "",
      metadata: isPlainObject(item.metadata) ? item.metadata : {},
    }))
    .filter((item) => item.id && item.eventType);
}

async function loadAdminRoleHistory() {
  const activeToken = state.authToken || localStorage.getItem("apiAuthToken") || "";
  if (!activeToken) {
    showStatus("请先使用管理员账号登录，再查看角色历史。", "warning");
    return { status: "blocked" };
  }

  try {
    state.adminRoleHistoryStatus = "loading";
    state.adminRoleHistoryMessage = "正在读取角色变更历史。";
    renderAccountState();
    const response = await requestApi("/api/admin/auth/roles/history", {
      headers: authHeaders(activeToken),
    });
    state.adminRoleHistory = sanitizeAdminRoleHistory(response.items);
    state.adminRoleHistoryStatus = "ready";
    state.adminRoleHistoryMessage = state.adminRoleHistory.length
      ? `已读取 ${state.adminRoleHistory.length} 条角色变更历史。`
      : "暂无角色变更历史。";
    renderAccountState();
    showStatus(state.adminRoleHistoryMessage, "success");
    return { status: "ready", items: state.adminRoleHistory };
  } catch (error) {
    state.adminRoleHistoryStatus = "error";
    state.adminRoleHistoryMessage = `角色历史读取失败：${error.message}`;
    renderAccountState();
    showStatus(state.adminRoleHistoryMessage, "warning");
    return { status: "error", error };
  }
}

async function demoSignOut() {
  const token = state.authToken;
  let logoutResult = { source: "local" };
  if (token && shouldUseBackendDataSource()) {
    try {
      const payload = await requestApi("/api/auth/logout", {
        method: "POST",
        headers: authHeaders(token),
      });
      logoutResult = { source: "backend", revoked: Boolean(payload.revoked) };
    } catch (error) {
      logoutResult = { source: "local", error };
    }
  }

  localStorage.removeItem("prototypeAccountState");
  state.authToken = "";
  state.authUser = null;
  state.authRoleStatus = "";
  state.authRoleMessage = "";
  state.adminRoleStatus = "";
  state.adminRoleMessage = "";
  state.adminRoleHistoryStatus = "";
  state.adminRoleHistoryMessage = "";
  state.adminRoleHistory = [];
  localStorage.removeItem("apiAuthToken");
  localStorage.removeItem("apiAuthUser");
  renderAccountState();
  renderPortfolioSyncState();
  loadWatchlist();
  loadReminderRules();
  loadNotifications();
  state.complianceAcknowledgementStatus = "local";
  state.complianceAcknowledgementMessage = "已退出登录，风险确认记录仅保留本机缓存。";
  state.suitabilityStatus = "local";
  state.suitabilityMessage = "已退出登录，适当性问卷仅保留本机缓存。";
  renderComplianceServiceState(localStorage.getItem("apiHealthStatus") || "idle");
  showStatus(
    logoutResult.source === "backend"
      ? logoutResult.revoked
        ? "已退出登录，后端会话已失效。当前数据继续保存在本机。"
        : "已退出样例登录。当前数据继续保存在本机。"
      : logoutResult.error
        ? `已清除本机登录状态，但后端退出请求失败：${logoutResult.error.message}`
        : "已退出样例登录，当前数据继续保存在本机。",
    logoutResult.error ? "warning" : "info",
  );
}

function findLocalStockByKeyword(rawKeyword) {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return null;
  return stocks.find(
    (stock) =>
      stock.name.toLowerCase().includes(keyword) ||
      stock.code.toLowerCase().includes(keyword),
  );
}

function finishStockSearch(rawKeyword, stock, source = "local") {
  const cleanKeyword = rawKeyword.trim();
  localStorage.setItem("lastSearch", cleanKeyword);
  saveRecentSearch(cleanKeyword);
  selectStock(stock);

  const sourceText =
    source === "backend"
      ? "后端 API"
      : source === "fallback"
        ? "本机样例回退"
        : "本机样例";
  showStatus(`已通过${sourceText}生成 ${stock.name} · ${stock.code} 的模型参考分析。`, "success");
  return stock;
}

function searchStockLocally(rawKeyword, options = {}) {
  const cleanKeyword = rawKeyword.trim();
  const matchedStock = findLocalStockByKeyword(cleanKeyword);

  if (!matchedStock) {
    const prefix = options.fallbackReason ? `${options.fallbackReason} ` : "";
    showStatus(`${prefix}未找到“${cleanKeyword}”，请检查股票名称或代码。`, "warning");
    return null;
  }

  return finishStockSearch(cleanKeyword, matchedStock, options.source || "local");
}

async function searchStockWithBackend(rawKeyword) {
  const cleanKeyword = rawKeyword.trim();
  showStatus(`正在通过后端 API 搜索“${cleanKeyword}”。`, "info");

  try {
    const payload = await requestApi(
      `/api/stocks/search?q=${encodeURIComponent(cleanKeyword)}`,
    );
    const result = Array.isArray(payload.results) ? payload.results[0] : null;

    if (!result) {
      showStatus(`未找到“${cleanKeyword}”，请检查股票名称或代码。`, "warning");
      return null;
    }

    const matchedStock = stocks.find(
      (stock) => stock.code.toLowerCase() === String(result.code).toLowerCase(),
    );

    if (!matchedStock) {
      showStatus(
        `后端已找到“${result.name || cleanKeyword}”，但当前原型还没有这只股票的完整分析样例。`,
        "warning",
      );
      return null;
    }

    return finishStockSearch(cleanKeyword, matchedStock, "backend");
  } catch (error) {
    state.apiMode = "local";
    localStorage.setItem("apiMode", "local");
    localStorage.setItem("apiHealthStatus", "failed");
    renderDataSourceState("failed", `${error.message} 股票搜索接口不可用，已切回本机样例数据。`);
    return searchStockLocally(cleanKeyword, {
      fallbackReason: "股票 API 暂时不可用，已切回本机样例搜索。",
      source: "fallback",
    });
  }
}

function renderMarketTabs() {
  document
    .querySelectorAll(".tab-button")
    .forEach((button) =>
      button.classList.toggle("is-active", button.dataset.market === state.selectedMarket),
    );
}

function selectStock(stock) {
  if (!stock) return;
  state.selectedStock = stock;
  state.selectedMarket = stock.market;
  persistSelection();
  renderMarketTabs();
  loadAnalysis();
  loadNews();
  renderReminderForm();
  renderPortfolioSummary();
}

async function searchStock() {
  const rawKeyword = elements.stockSearch.value.trim();
  if (!rawKeyword) {
    selectStock(stocks.find((stock) => stock.market === state.selectedMarket));
    showStatus("已显示当前市场的默认样例股票。", "info");
    return;
  }

  if (shouldUseBackendDataSource()) {
    await searchStockWithBackend(rawKeyword);
    return;
  }

  searchStockLocally(rawKeyword);
}

function saveLocalWatchlist() {
  localStorage.setItem("watchlist", JSON.stringify(state.watchlist));
}

async function syncWatchlistAdd(code) {
  const token = await ensureDemoAuthToken();
  await requestApi("/api/watchlist", {
    method: "POST",
    headers: authHeaders(token),
    body: { code },
  });
}

async function syncWatchlistRemove(code) {
  const token = await ensureDemoAuthToken();
  await requestApi(`/api/watchlist/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

async function addToWatchlist() {
  const code = state.selectedStock.code;
  if (state.watchlist.includes(code)) {
    showStatus(`${state.selectedStock.name} 已在自选股中。`, "info");
    return;
  }

  state.watchlist.push(code);
  saveLocalWatchlist();
  renderWatchlist();

  if (!canSyncWatchlist()) {
    showStatus(`已加入本机自选：${state.selectedStock.name}。登录并连接后端后可同步。`, "success");
    return;
  }

  try {
    await syncWatchlistAdd(code);
    showStatus(`已加入自选并同步到后端：${state.selectedStock.name}。`, "success");
  } catch (error) {
    showStatus(`已加入本机自选，但后端同步失败：${error.message}`, "warning");
  }
}

async function removeFromWatchlist(code) {
  const stock = stocks.find((entry) => entry.code === code);
  const wasInWatchlist = state.watchlist.includes(code);
  state.watchlist = state.watchlist.filter((item) => item !== code);
  saveLocalWatchlist();
  renderWatchlist();

  if (!wasInWatchlist) return;
  if (!canSyncWatchlist()) {
    showStatus(`已移除自选：${stock ? stock.name : code}。当前仅更新本机数据。`, "info");
    return;
  }

  try {
    await syncWatchlistRemove(code);
    showStatus(`已从自选移除并同步到后端：${stock ? stock.name : code}。`, "info");
  } catch (error) {
    showStatus(`已从本机自选移除，但后端同步失败：${error.message}`, "warning");
  }
}

function openTerm(termKey) {
  const term = terms[termKey];
  if (!term) return;
  elements.termTitle.textContent = term.title;
  elements.termBody.textContent = term.body;
  elements.termDialog.showModal();
}

function setupInstallPrompt() {
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    elements.installButton.hidden = true;
  });
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

function renderNotificationSettings() {
  reconcileNotificationPreferences();
  elements.notificationInputs.forEach((input) => {
    const availability = getNotificationChannelAvailability(input.dataset.notification);
    input.disabled = !availability.selectable;
    input.checked = availability.selectable && Boolean(state.notifications[input.dataset.notification]);
  });
  const enabledCount = Object.values(state.notifications).filter(Boolean).length;
  const ruleCount = state.reminderRules.length;
  const permissionText =
    state.notifications.inApp && "Notification" in window
      ? `系统通知权限：${window.Notification.permission}。`
      : "";
  const syncText = canSyncPreferences()
    ? "已连接样例账号，偏好会同步到后端。"
    : "本阶段规则会先保存在本机，连接后端后可同步。";
  elements.notificationStatus.textContent =
    enabledCount > 0
      ? `已保存 ${enabledCount} 种提醒偏好，${ruleCount} 条提醒规则。${permissionText}${syncText}`
      : `提醒偏好会先保存在本机，已设置 ${ruleCount} 条提醒规则。真实推送将在后端阶段接入。`;
  renderNotificationChannelState();
}

function hasConnectedNotificationService() {
  return shouldUseBackendDataSource() && Boolean(getNotificationServiceStatus());
}

function getSupportedNotificationChannels() {
  const service = getNotificationServiceStatus();
  if (!service?.supportedChannels?.length) return notificationChannelIds;
  return service.supportedChannels.filter((channel) => notificationChannelIds.includes(channel));
}

function getNotificationChannelAvailability(channel) {
  const label = getNotificationChannelName(channel);
  const connectedService = hasConnectedNotificationService();
  const supported = getSupportedNotificationChannels().includes(channel);

  if (connectedService && !supported) {
    return {
      label,
      selectable: false,
      tone: "blocked",
      status: "后端暂不支持",
      detail: "当前通知投递服务没有开放这个渠道，已避免保存为可用偏好。",
    };
  }

  if (channel === "inApp") {
    if (!("Notification" in window)) {
      return {
        label,
        selectable: true,
        tone: "local",
        status: "仅 App 内记录",
        detail: "当前运行环境不支持系统通知权限，可保存偏好，但不会弹出系统通知。",
      };
    }

    const permission = window.Notification.permission;
    if (permission === "granted") {
      return {
        label,
        selectable: true,
        tone: connectedService ? "ready" : "local",
        status: connectedService ? "系统权限已开启" : "本机权限已开启",
        detail: connectedService
          ? "触发后可进入后端 outbox，并允许系统级 App 内提醒。"
          : "系统通知权限已允许，连接后端后可进入通知 outbox。",
      };
    }

    if (permission === "denied") {
      return {
        label,
        selectable: false,
        tone: "blocked",
        status: "系统权限已拒绝",
        detail: "需要在系统设置中重新允许通知后，才能开启系统级 App 内提醒。",
      };
    }

    return {
      label,
      selectable: true,
      tone: "local",
      status: "等待系统授权",
      detail: "开启后会请求系统通知权限；拒绝时仅保留其他可用渠道。",
    };
  }

  if (connectedService && supported) {
    return {
      label,
      selectable: true,
      tone: "ready",
      status: "后端 outbox 可排队",
      detail: "当前可写入样例通知 outbox，但不代表邮件、短信、微信或 Telegram 已真实外部送达。",
    };
  }

  return {
    label,
    selectable: true,
    tone: "local",
    status: "本机保存",
    detail: "偏好会先保存在本机；登录并连接后端后，才会尝试进入通知 outbox。",
  };
}

function reconcileNotificationPreferences() {
  let changed = false;
  const nextNotifications = { ...state.notifications };

  notificationChannelIds.forEach((channel) => {
    if (typeof nextNotifications[channel] !== "boolean") return;
    const availability = getNotificationChannelAvailability(channel);
    if (!availability.selectable) {
      delete nextNotifications[channel];
      changed = true;
    }
  });

  if (!changed) return false;
  state.notifications = nextNotifications;
  localStorage.setItem("notifications", JSON.stringify(state.notifications));
  return true;
}

function renderNotificationChannelState() {
  elements.notificationChannelState.innerHTML = notificationChannelIds
    .map((channel) => {
      const availability = getNotificationChannelAvailability(channel);
      const enabled = Boolean(state.notifications[channel]) && availability.selectable;
      return `
        <article class="channel-state is-${escapeHtml(availability.tone)}">
          <strong>${escapeHtml(availability.label)} · ${enabled ? "已选择" : "未选择"}</strong>
          <span>${escapeHtml(availability.status)}</span>
          <p>${escapeHtml(availability.detail)}</p>
        </article>
      `;
    })
    .join("");
}

function renderNotificationServiceState(
  status = localStorage.getItem("apiHealthStatus") || "idle",
  message = "",
) {
  const notificationService = getNotificationServiceStatus();

  if (status === "checking") {
    elements.notificationServiceState.innerHTML = `
      <div class="state-panel loading-state compact-state" role="status" aria-live="polite">
        <strong>正在检查通知投递服务</strong>
        <p>正在读取后端通知渠道和投递模式。</p>
      </div>
    `;
    return;
  }

  if (status === "connected") {
    const channels = notificationService?.supportedChannels?.length
      ? notificationService.supportedChannels.map((channel) => getNotificationChannelName(channel)).join(" / ")
      : "未标注";
    const capabilities = notificationService?.capabilities?.length
      ? notificationService.capabilities
          .map(
            (capability) =>
              `<span>${escapeHtml(notificationServiceCapabilityLabels[capability] || capability)}</span>`,
          )
          .join("")
      : "<span>能力未标注</span>";
    const providerAdapter = notificationService?.providerAdapter;
    const providerAdapterSummary = providerAdapter
      ? [
          `通知 provider 适配器 ${providerAdapter.status}`,
          providerAdapter.runtimeMode,
          providerAdapter.selectedProvider || "未选择 provider",
        ].join(" · ")
      : "";
    const providerContracts = providerAdapter?.endpointContracts?.length
      ? providerAdapter.endpointContracts
          .slice(0, 4)
          .map((contract) => `${contract.method}:${contract.status}`)
          .join(" / ")
      : "暂无通知 provider 接口契约";
    const channelContracts = providerAdapter?.channelContracts?.length
      ? providerAdapter.channelContracts
          .slice(0, 5)
          .map((channel) => `${channel.label || channel.id}:${channel.status}`)
          .join(" / ")
      : "暂无渠道契约";
    const deliveryPolicy = providerAdapter?.deliveryPolicy
      ? [
          `投递策略 ${providerAdapter.deliveryPolicy.status}`,
          providerAdapter.deliveryPolicy.requiresIdempotencyKey ? "幂等 key" : "",
          providerAdapter.deliveryPolicy.retryBackoff
            ? `重试 ${providerAdapter.deliveryPolicy.retryBackoff}`
            : "",
          providerAdapter.deliveryPolicy.maxAttempts
            ? `最多 ${providerAdapter.deliveryPolicy.maxAttempts} 次`
            : "",
          providerAdapter.deliveryPolicy.rateLimitPerMinute
            ? `${providerAdapter.deliveryPolicy.rateLimitPerMinute}/min`
            : "",
          providerAdapter.deliveryPolicy.providerWebhookVerification ? "webhook 验签" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const consentPolicy = providerAdapter?.consentPolicy
      ? [
          `授权策略 ${providerAdapter.consentPolicy.status}`,
          providerAdapter.consentPolicy.requiresUserOptIn ? "用户授权" : "",
          providerAdapter.consentPolicy.supportsChannelOptOut ? "渠道退订" : "",
          providerAdapter.consentPolicy.recordsConsentVersion ? "授权版本" : "",
          providerAdapter.consentPolicy.blocksSilentExternalDelivery ? "禁止静默外投" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const deliveryGate = providerAdapter?.deliveryGate
      ? `投递门禁 ${providerAdapter.deliveryGate.status} · ${
          providerAdapter.deliveryGate.canUseExternalDelivery ? "external 可启用" : "external 不可启用"
        }`
      : "";
    const deliveryChecks = providerAdapter?.deliveryGate?.checks?.length
      ? providerAdapter.deliveryGate.checks
          .slice(0, 5)
          .map((check) => `${check.id}:${check.status}`)
          .join(" / ")
      : "";
    const missingEnv = providerAdapter?.missingEnvVars?.length
      ? providerAdapter.missingEnvVars.join(" / ")
      : "暂无通知 provider 缺失环境变量";
    const safety = providerAdapter?.safety
      ? Object.entries(providerAdapter.safety)
          .filter(([, enabled]) => enabled === true)
          .map(([key]) => {
            const labels = {
              noVendorNetworkCalls: "不联网",
              mockOutboxActive: "保留 mock outbox",
              requiresUserConsent: "要求用户授权",
              supportsChannelOptOut: "支持退订",
              requiresAuditLog: "要求审计",
              forbidsSilentExternalDelivery: "禁止静默外投",
              channelWebhookVerification: "webhook 验签",
            };
            return labels[key] || key;
          })
          .join(" · ")
      : "";
    const providerBlocker = providerAdapter?.blockedReasons?.length
      ? providerAdapter.blockedReasons[0]
      : "";

    elements.notificationServiceState.innerHTML = `
      <div class="state-panel success-state compact-state">
        <strong>通知投递服务已连接</strong>
        <p>${message || "当前通知会先进入后端 outbox，真实外部投递仍需后续接入。"}</p>
        ${
          notificationService
            ? `
              <div class="provider-summary" aria-label="通知投递服务状态">
                <span>${escapeHtml(notificationService.name)}</span>
                <span>${escapeHtml(formatProviderMode(notificationService))}</span>
                <span>${escapeHtml(notificationService.deliveryMode)}</span>
              </div>
              <div class="provider-summary" aria-label="支持通知渠道">
                <span>${escapeHtml(channels)}</span>
              </div>
              <div class="provider-capabilities" aria-label="通知投递能力">${capabilities}</div>
              ${
                providerAdapter
                  ? `
                    <div class="provider-summary" aria-label="通知 provider 适配器状态">
                      <span>${escapeHtml(providerAdapterSummary)}</span>
                    </div>
                    <div class="provider-summary" aria-label="通知 provider 接口契约">
                      <span>${escapeHtml(providerContracts)}</span>
                    </div>
                    <div class="provider-summary" aria-label="通知 provider 渠道契约">
                      <span>${escapeHtml(channelContracts)}</span>
                    </div>
                    ${
                      deliveryPolicy
                        ? `<p class="provider-note">${escapeHtml(deliveryPolicy)}</p>`
                        : ""
                    }
                    ${
                      consentPolicy ? `<p class="provider-note">${escapeHtml(consentPolicy)}</p>` : ""
                    }
                    ${
                      deliveryGate ? `<p class="provider-note">${escapeHtml(deliveryGate)}</p>` : ""
                    }
                    ${
                      deliveryChecks ? `<p class="provider-note">${escapeHtml(deliveryChecks)}</p>` : ""
                    }
                    <p class="provider-note">${escapeHtml(missingEnv)}</p>
                    ${safety ? `<p class="provider-note">${escapeHtml(safety)}</p>` : ""}
                    ${
                      providerBlocker
                        ? `<p class="provider-warning">${escapeHtml(providerBlocker)}</p>`
                        : ""
                    }
                    ${
                      providerAdapter.disclaimer
                        ? `<p class="provider-warning">${escapeHtml(providerAdapter.disclaimer)}</p>`
                        : ""
                    }
                  `
                  : ""
              }
              ${
                notificationService.disclaimer
                  ? `<p class="provider-warning">${escapeHtml(notificationService.disclaimer)}</p>`
                  : ""
              }
            `
            : `<p class="provider-warning">通知投递能力未返回，当前仍按本机样例提醒处理。</p>`
        }
      </div>
    `;
    return;
  }

  if (status === "failed") {
    elements.notificationServiceState.innerHTML = `
      <div class="state-panel error-state compact-state" role="alert">
        <strong>通知投递服务未连接</strong>
        <p>${message || "后端通知服务暂不可用，提醒规则会继续保存在本机。"}</p>
      </div>
    `;
    return;
  }

  elements.notificationServiceState.innerHTML = `
    <div class="state-panel empty-state compact-state">
      <strong>当前使用本机提醒样例</strong>
      <p>连接后端后，这里会显示通知投递模式、支持渠道和真实送达边界。</p>
    </div>
  `;
}

function getReminderTypeName(type) {
  return {
    priceAbove: "价格高于",
    priceBelow: "价格低于",
    importantNews: "重大新闻重要性",
  }[type] || "价格高于";
}

function renderReminderForm() {
  elements.reminderStock.innerHTML = stocks
    .map(
      (stock) =>
        `<option value="${escapeHtml(stock.code)}">${escapeHtml(stock.name)} · ${escapeHtml(stock.code)}</option>`,
    )
    .join("");
  elements.reminderStock.value = state.selectedStock.code;
}

function renderReminderRules() {
  if (state.reminderRules.length === 0) {
    elements.reminderRules.innerHTML = `
      <div class="state-panel empty-state compact-state">
        <strong>还没有提醒规则</strong>
        <p>你可以添加价格或重大新闻提醒规则。当前规则会先保存在本机，后端接入后同步。</p>
      </div>
    `;
    return;
  }

  elements.reminderRules.innerHTML = state.reminderRules
    .map((rule) => {
      const stock = stocks.find((item) => item.code === rule.code);
      return `
        <article class="reminder-rule">
          <strong>${escapeHtml(stock ? `${stock.name} · ${stock.code}` : rule.code)}</strong>
          <div class="reminder-rule-meta">
            <span>${escapeHtml(getReminderTypeName(rule.type))}</span>
            <span>${escapeHtml(rule.threshold)}</span>
            <span>${escapeHtml((rule.channels || []).map(getNotificationChannelName).join(" / ") || "未选择渠道")}</span>
            <span>${rule.source === "backend" ? "已同步" : "本机保存"}</span>
          </div>
          <button class="text-button" data-remove-reminder="${escapeHtml(rule.id)}" type="button">移除提醒</button>
        </article>
      `;
    })
    .join("");
}

function saveLocalReminderRules() {
  localStorage.setItem("reminderRules", JSON.stringify(state.reminderRules));
}

function canSyncReminderRules() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

function canSyncNotificationCenter() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

function getSelectedNotificationChannels() {
  return notificationChannelIds.filter(
    (channel) =>
      state.notifications[channel] === true && getNotificationChannelAvailability(channel).selectable,
  );
}

function getNotificationChannelName(channel) {
  return {
    inApp: "App 内",
    email: "邮件",
    sms: "短信",
    wechat: "微信",
    telegram: "Telegram",
  }[channel] || channel || "App 内";
}

function getNotificationDeliveryLabel(item) {
  if (item.deliveryStatus === "delivered") return "已送达样例 outbox";
  if (item.deliveryStatus === "failed") return "投递失败";
  return "等待投递";
}

function renderNotificationCenter(stateOverride = {}) {
  const status = stateOverride.status || "ready";
  const message = stateOverride.message || "";

  if (status === "loading") {
    elements.notificationCenter.innerHTML = `
      <div class="state-panel loading-state compact-state" role="status" aria-live="polite">
        <strong>正在读取通知</strong>
        <p>${escapeHtml(message || "正在从后端通知 outbox 同步提醒记录。")}</p>
      </div>
    `;
    return;
  }

  if (status === "error") {
    elements.notificationCenter.innerHTML = `
      <div class="state-panel error-state compact-state" role="alert">
        <strong>通知同步失败</strong>
        <p>${escapeHtml(message || "后端通知暂时不可用，本机提醒规则不会丢失。")}</p>
        <button class="secondary-button" data-retry-notifications type="button">重新同步通知</button>
      </div>
    `;
    return;
  }

  if (!canSyncNotificationCenter()) {
    elements.notificationCenter.innerHTML = `
      <div class="state-panel empty-state compact-state">
        <strong>通知中心等待连接</strong>
        <p>连接后端并登录样例账号后，这里会显示触发后的 App 内、邮件、微信等 mock 通知记录。</p>
      </div>
    `;
    return;
  }

  if (state.notificationItems.length === 0) {
    elements.notificationCenter.innerHTML = `
      <div class="state-panel empty-state compact-state">
        <strong>暂无通知</strong>
        <p>提醒规则触发后，会先进入后端通知 outbox。真实外部投递仍在后续阶段接入。</p>
      </div>
    `;
    return;
  }

  elements.notificationCenter.innerHTML = `
    <div class="notification-center-heading">
      <strong>通知中心</strong>
      <button class="text-button" data-retry-notifications type="button">刷新</button>
    </div>
    <div class="notification-list">
      ${state.notificationItems
        .map(
          (item) => `
            <article class="notification-item ${item.status === "read" ? "is-read" : ""}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.body || "提醒已触发。")}</p>
              </div>
              <div class="reminder-rule-meta">
                <span>${escapeHtml(getNotificationChannelName(item.channel))}</span>
                <span>${item.status === "read" ? "已读" : "已排队"}</span>
                <span>${escapeHtml(getNotificationDeliveryLabel(item))}</span>
                <span>尝试 ${escapeHtml(item.attemptCount)}</span>
                ${item.createdAt ? `<span>${escapeHtml(item.createdAt.slice(0, 10))}</span>` : ""}
              </div>
              ${
                item.deliveryStatus === "failed"
                  ? `<p class="provider-warning">${escapeHtml(item.deliveryError || "当前渠道投递失败，可稍后重试。")}</p>
                     <button class="text-button" data-retry-notification="${escapeHtml(item.id)}" type="button">重试投递</button>`
                  : ""
              }
              ${
                item.status === "read"
                  ? ""
                  : `<button class="text-button" data-read-notification="${escapeHtml(item.id)}" type="button">标记已读</button>`
              }
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

async function syncReminderAdd(rule) {
  const token = await ensureDemoAuthToken();
  return requestApi("/api/reminders", {
    method: "POST",
    headers: authHeaders(token),
    body: {
      code: rule.code,
      type: rule.type,
      threshold: rule.threshold,
      channels: getSelectedNotificationChannels(),
    },
  });
}

async function syncReminderRemove(id) {
  const token = await ensureDemoAuthToken();
  return requestApi(`/api/reminders/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

async function loadReminderRules() {
  if (!canSyncReminderRules()) {
    renderReminderRules();
    renderNotificationCenter();
    return { status: "ready", source: "local" };
  }

  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/reminders", {
      headers: authHeaders(token),
    });
    state.reminderRules = sanitizeReminderRules(payload.items).map((rule) => ({
      ...rule,
      source: "backend",
    }));
    saveLocalReminderRules();
    renderReminderRules();
    renderNotificationSettings();
    await loadNotifications();
    return { status: "ready", source: "backend" };
  } catch (error) {
    renderReminderRules();
    renderNotificationSettings();
    renderNotificationCenter({ status: "error", message: error.message });
    showStatus(`提醒规则后端同步暂不可用，已继续使用本机规则。${error.message}`, "warning");
    return { status: "ready", source: "local", error };
  }
}

async function loadNotifications() {
  if (!canSyncNotificationCenter()) {
    state.notificationItems = [];
    renderNotificationCenter();
    return { status: "ready", source: "local" };
  }

  renderNotificationCenter({ status: "loading" });
  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/notifications", {
      headers: authHeaders(token),
    });
    state.notificationItems = sanitizeNotificationItems(payload.items);
    renderNotificationCenter();
    return { status: "ready", source: "backend" };
  } catch (error) {
    renderNotificationCenter({ status: "error", message: error.message });
    return { status: "ready", source: "local", error };
  }
}

async function markNotificationRead(id) {
  if (!canSyncNotificationCenter()) {
    showStatus("通知中心需要连接后端并登录后才能同步已读状态。", "warning");
    return;
  }

  const existing = state.notificationItems.find((item) => item.id === id);
  if (existing) {
    existing.status = "read";
    existing.readAt = new Date().toISOString();
    renderNotificationCenter();
  }

  try {
    const token = await ensureDemoAuthToken();
    await requestApi(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: authHeaders(token),
    });
    await loadNotifications();
    showStatus("通知已标记为已读。", "success");
  } catch (error) {
    showStatus(`通知已在本机标记，但后端同步失败：${error.message}`, "warning");
  }
}

async function retryNotificationDelivery(id) {
  if (!canSyncNotificationCenter()) {
    showStatus("请先连接后端并登录账号，再重试通知投递。", "warning");
    return;
  }
  const existing = state.notificationItems.find((item) => item.id === id);
  if (existing) {
    existing.deliveryStatus = "queued";
    renderNotificationCenter();
  }

  try {
    const token = await ensureDemoAuthToken();
    await requestApi(`/api/notifications/${encodeURIComponent(id)}/retry`, {
      method: "POST",
      headers: authHeaders(token),
    });
    await loadNotifications();
    showStatus("通知投递已重新尝试，渠道状态已更新。", "success");
  } catch (error) {
    if (existing) {
      existing.deliveryStatus = "failed";
    }
    renderNotificationCenter();
    showStatus(`通知投递重试失败：${error.message}`, "warning");
  }
}

async function addReminderRule() {
  const threshold = elements.reminderThreshold.value.trim();
  if (!threshold) {
    showStatus("请填写提醒触发数值。", "warning");
    return;
  }
  const selectedChannels = getSelectedNotificationChannels();
  if (selectedChannels.length === 0) {
    showStatus("请先开启至少一种可用提醒方式，再添加提醒规则。", "warning");
    renderNotificationSettings();
    return;
  }

  const rule = {
    id: `local-${Date.now()}`,
    code: elements.reminderStock.value,
    type: validReminderTypes.includes(elements.reminderType.value)
      ? elements.reminderType.value
      : "priceAbove",
    threshold,
    channels: selectedChannels,
    source: "local",
  };
  state.reminderRules = [rule, ...state.reminderRules].slice(0, 20);
  saveLocalReminderRules();
  renderReminderRules();
  renderNotificationSettings();
  elements.reminderThreshold.value = "";

  if (!canSyncReminderRules()) {
    showStatus("提醒规则已保存在本机。登录并连接后端后可同步。", "success");
    return;
  }

  try {
    const payload = await syncReminderAdd(rule);
    const saved = payload.saved || {};
    state.reminderRules = state.reminderRules.map((item) =>
      item.id === rule.id
        ? { ...item, id: saved.id || item.id, source: "backend" }
        : item,
    );
    saveLocalReminderRules();
    renderReminderRules();
    renderNotificationSettings();
    showStatus("提醒规则已保存并同步到后端。", "success");
  } catch (error) {
    showStatus(`提醒规则已保存在本机，但后端同步失败：${error.message}`, "warning");
  }
}

async function removeReminderRule(id) {
  const rule = state.reminderRules.find((item) => item.id === id);
  state.reminderRules = state.reminderRules.filter((item) => item.id !== id);
  saveLocalReminderRules();
  renderReminderRules();
  renderNotificationSettings();

  if (!rule || !canSyncReminderRules() || rule.source !== "backend") {
    showStatus("已移除本机提醒规则。", "info");
    return;
  }

  try {
    await syncReminderRemove(id);
    showStatus("提醒规则已从后端移除。", "info");
  } catch (error) {
    showStatus(`提醒规则已从本机移除，但后端同步失败：${error.message}`, "warning");
  }
}

async function requestInAppNotificationPermission(input) {
  if (!input.checked || input.dataset.notification !== "inApp") return "skipped";

  if (!("Notification" in window)) {
    showStatus("当前运行环境暂不支持系统通知权限，本次仅保存 App 内提醒偏好。", "warning");
    return "unsupported";
  }

  const permission = await window.Notification.requestPermission();
  if (permission === "granted") {
    showStatus("App 内提醒权限已开启；真实提醒规则将在后端阶段接入。", "success");
    return "granted";
  }

  if (permission === "denied") {
    input.checked = false;
    state.notifications.inApp = false;
    localStorage.setItem("notifications", JSON.stringify(state.notifications));
    showStatus("系统通知权限已拒绝，已关闭 App 内系统提醒偏好。其他渠道仍可按授权保存。", "warning");
    return "denied";
  }

  showStatus("系统通知权限未开启，提醒偏好已保存，可稍后在系统设置中调整。", "warning");
  return "default";
}

function renderSearchAssist() {
  elements.suggestionChips.innerHTML = stocks
    .map(
      (stock) =>
        `<button class="chip-button" data-search-keyword="${stock.name}" type="button">${stock.name}</button>`,
    )
    .join("");

  elements.recentSearchBlock.hidden = state.recentSearches.length === 0;
  elements.recentSearchChips.innerHTML = state.recentSearches
    .map(
      (keyword) =>
        `<button class="chip-button" data-search-keyword="${keyword}" type="button">${keyword}</button>`,
    )
    .join("");
}

function renderPortfolioForm() {
  elements.buyPrice.value = state.portfolio.buyPrice || "";
  elements.holdingQty.value = state.portfolio.holdingQty || "";
  elements.buyDate.value = state.portfolio.buyDate || "";
  elements.targetReturn.value = state.portfolio.targetReturn || "";
  elements.maxLoss.value = state.portfolio.maxLoss || "";
}

function canSyncPortfolio() {
  return shouldUseBackendDataSource() && getAccountState().status === "authenticated";
}

function setPortfolioSyncStatus(status = "", message = "") {
  state.portfolioSyncStatus = status;
  state.portfolioSyncMessage = message;
}

function getPortfolioSyncState() {
  const prototypePortfolioSyncState = localStorage.getItem("prototypePortfolioSyncState");
  if (prototypePortfolioSyncState === "loading") {
    return { status: "loading" };
  }

  if (prototypePortfolioSyncState === "error") {
    return {
      status: "error",
      message: "当前无法同步持仓到云端。已保存在本机，可稍后重试。",
    };
  }

  if (state.portfolioSyncStatus === "syncing") {
    return {
      status: "loading",
      message: state.portfolioSyncMessage || "正在保存到账号数据空间。请稍候。",
    };
  }

  if (state.portfolioSyncStatus === "synced") {
    return {
      status: "synced",
      message: state.portfolioSyncMessage || "持仓信息已同步到后端样例账号。",
    };
  }

  if (state.portfolioSyncStatus === "sync-error") {
    return {
      status: "error",
      message: state.portfolioSyncMessage || "后端持仓同步失败。本机保存的数据不会丢失。",
    };
  }

  if (getAccountState().status === "authenticated") {
    return { status: "ready" };
  }

  return { status: "local" };
}

function renderPortfolioSyncState() {
  const syncState = getPortfolioSyncState();

  if (syncState.status === "loading") {
    elements.portfolioSyncState.innerHTML = `
      <div class="state-panel loading-state compact-state" role="status" aria-live="polite">
        <strong>正在同步持仓信息</strong>
        <p>${escapeHtml(syncState.message || "正在保存到账号数据空间。请稍候。")}</p>
      </div>
    `;
    return;
  }

  if (syncState.status === "error") {
    elements.portfolioSyncState.innerHTML = `
      <div class="state-panel error-state compact-state" role="alert">
        <strong>持仓同步失败</strong>
        <p>${escapeHtml(syncState.message)}</p>
        <button class="secondary-button" data-retry-portfolio-sync type="button">重新同步</button>
      </div>
    `;
    return;
  }

  if (syncState.status === "ready") {
    elements.portfolioSyncState.innerHTML = `
      <div class="state-panel success-state compact-state">
        <strong>已准备同步到账号</strong>
        <p>当前为样例登录状态。保存持仓后会先写入本机；连接后端后可同步到云端。</p>
      </div>
    `;
    return;
  }

  if (syncState.status === "synced") {
    elements.portfolioSyncState.innerHTML = `
      <div class="state-panel success-state compact-state">
        <strong>已同步持仓信息</strong>
        <p>${escapeHtml(syncState.message)}</p>
      </div>
    `;
    return;
  }

  elements.portfolioSyncState.innerHTML = `
    <div class="state-panel empty-state compact-state">
      <strong>当前仅保存在本机</strong>
      <p>未登录时，持仓信息不会跨设备同步；后端账号接入后可升级为云端同步。</p>
    </div>
  `;
}

function retryPortfolioSync() {
  localStorage.removeItem("prototypePortfolioSyncState");
  setPortfolioSyncStatus("");
  renderPortfolioSyncState();
  showStatus("已恢复持仓同步状态。本机持仓信息仍然保留。", "success");
}

function renderPortfolioSummary() {
  const stock = state.analysisStock || getAdjustedStock();
  const context = getPortfolioContext(stock);

  if (context.filledFields === 0) {
    elements.portfolioSummary.hidden = true;
    elements.portfolioSummary.innerHTML = "";
    return;
  }

  let riskWarning = "当前持仓风险字段不足，暂以模型下跌参考概率作为辅助风险提示。";
  if (context.hasPosition && context.maxLoss && context.estimatedReturn <= -context.maxLoss) {
    riskWarning = `样例浮动收益率 ${context.estimatedReturn.toFixed(2)}% 已低于你填写的最大可接受亏损 -${context.maxLoss}%，建议优先复核止损纪律和仓位。`;
  } else if (context.hasPosition && context.maxLoss) {
    const buffer = context.estimatedReturn + context.maxLoss;
    riskWarning = `距离你填写的最大可接受亏损线仍有约 ${buffer.toFixed(2)} 个百分点缓冲；模型下跌参考概率为 ${stock.downside}%。`;
  } else if (stock.downside > 45) {
    riskWarning = `模型下跌参考概率 ${stock.downside}% 高于中性区间，建议补充最大可接受亏损以便判断仓位边界。`;
  }

  elements.portfolioSummary.hidden = false;
  elements.portfolioSummary.innerHTML = `
    <strong>持仓分析参考</strong>
    <div class="portfolio-metrics">
      <span>已填写字段：${context.filledFields}/5</span>
      <span>样例当前价：${stock.samplePrice}</span>
      ${
        context.hasPosition
          ? `<span>成本金额：${context.cost.toFixed(2)}</span><span>样例浮动收益率：${context.estimatedReturn.toFixed(2)}%</span>`
          : "<span>填写买入价和数量后可估算样例浮动收益率。</span>"
      }
      ${context.targetReturn ? `<span>目标收益率：${context.targetReturn}%</span>` : ""}
    </div>
    <p>${riskWarning}</p>
    <small>以上基于样例价格和本机输入估算，不代表真实行情、真实盈亏或投资建议。</small>
  `;
}

function buildPortfolioPayload() {
  return {
    code: state.selectedStock.code,
    buyPrice: state.portfolio.buyPrice,
    holdingQty: state.portfolio.holdingQty,
    buyDate: state.portfolio.buyDate,
    targetReturn: state.portfolio.targetReturn,
    maxLoss: state.portfolio.maxLoss,
  };
}

function applyPortfolioEntry(entry = {}) {
  state.portfolio = sanitizePortfolio({
    buyPrice: entry.buyPrice,
    holdingQty: entry.holdingQty,
    buyDate: entry.buyDate,
    targetReturn: entry.targetReturn,
    maxLoss: entry.maxLoss,
  });
  localStorage.setItem("portfolio", JSON.stringify(state.portfolio));
  renderPortfolioForm();
  renderPortfolioSummary();
}

async function loadPortfolio() {
  if (!canSyncPortfolio()) {
    renderPortfolioForm();
    renderPortfolioSummary();
    renderPortfolioSyncState();
    return { status: "ready", source: "local" };
  }

  setPortfolioSyncStatus("syncing", "正在读取账号持仓信息。");
  renderPortfolioSyncState();

  try {
    const token = await ensureDemoAuthToken();
    const payload = await requestApi("/api/portfolio", {
      headers: authHeaders(token),
    });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const selectedEntry =
      items.find((entry) => entry.code === state.selectedStock.code) || items[0] || null;
    if (selectedEntry) {
      applyPortfolioEntry(selectedEntry);
      setPortfolioSyncStatus("synced", "已从后端样例账号读取持仓信息。");
    } else {
      setPortfolioSyncStatus("", "");
      renderPortfolioForm();
      renderPortfolioSummary();
    }
    renderPortfolioSyncState();
    return { status: "ready", source: "backend", items };
  } catch (error) {
    setPortfolioSyncStatus("sync-error", `后端持仓读取失败：${error.message} 本机数据仍然保留。`);
    renderPortfolioSyncState();
    return { status: "ready", source: "local", error };
  }
}

async function syncPortfolioToBackend() {
  const token = await ensureDemoAuthToken();
  return requestApi("/api/portfolio", {
    method: "POST",
    headers: authHeaders(token),
    body: buildPortfolioPayload(),
  });
}

async function savePortfolio() {
  state.portfolio = {
    buyPrice: elements.buyPrice.value.trim(),
    holdingQty: elements.holdingQty.value.trim(),
    buyDate: elements.buyDate.value,
    targetReturn: elements.targetReturn.value.trim(),
    maxLoss: elements.maxLoss.value.trim(),
  };
  localStorage.setItem("portfolio", JSON.stringify(state.portfolio));
  renderPortfolioSummary();

  if (!canSyncPortfolio()) {
    setPortfolioSyncStatus("");
    renderPortfolioSyncState();
    await loadAnalysis();
    showStatus("持仓信息已保存在本机。填写越完整，后续持仓分析越完整。", "success");
    return;
  }

  setPortfolioSyncStatus("syncing", "正在保存到后端样例账号，同时本机数据已保留。");
  renderPortfolioSyncState();

  try {
    const payload = await syncPortfolioToBackend();
    const summary = payload.localSummary || {};
    const message =
      summary.cost !== null && summary.cost !== undefined
        ? `已同步到后端样例账号。样例成本金额 ${Number(summary.cost).toFixed(2)}，不代表真实盈亏。`
        : "已同步到后端样例账号。";
    setPortfolioSyncStatus("synced", message);
    renderPortfolioSyncState();
    await loadAnalysis();
    showStatus("持仓信息已保存在本机并同步到后端。", "success");
  } catch (error) {
    setPortfolioSyncStatus(
      "sync-error",
      `后端持仓同步失败：${error.message} 本机保存的数据不会丢失。`,
    );
    renderPortfolioSyncState();
    await loadAnalysis();
    showStatus("持仓信息已保存在本机，但后端同步失败。", "warning");
  }
}

function bindEvents() {
  elements.riskProfile.value = state.riskProfile;
  elements.stockSearch.value = localStorage.getItem("lastSearch") || "";
  elements.searchButton.addEventListener("click", searchStock);
  document.querySelector(".search-assist").addEventListener("click", async (event) => {
    const chip = event.target.closest("[data-search-keyword]");
    if (!chip) return;
    elements.stockSearch.value = chip.dataset.searchKeyword;
    await searchStock();
  });
  elements.stockSearch.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") await searchStock();
  });
  elements.accountState.addEventListener("click", async (event) => {
    const retryButton = event.target.closest("[data-retry-account]");
    const demoSignInButton = event.target.closest("[data-demo-sign-in]");
    const demoSignOutButton = event.target.closest("[data-sign-out-demo]");
    const authActionButton = event.target.closest("[data-auth-action]");
    const authRoleButton = event.target.closest("[data-auth-role]");
    const adminRoleAssignButton = event.target.closest("[data-admin-role-assign]");
    const adminRoleRevokeButton = event.target.closest("[data-admin-role-revoke]");
    const adminRoleHistoryButton = event.target.closest("[data-admin-role-history]");
    if (retryButton) retryAccountLoad();
    if (authActionButton) await emailAuth(authActionButton.dataset.authAction, authActionButton);
    if (authRoleButton) await updateAuthRole(authRoleButton.dataset.authRole);
    if (adminRoleAssignButton) await assignAuthRoleAsAdmin(adminRoleAssignButton);
    if (adminRoleRevokeButton) await revokeAuthRoleAsAdmin(adminRoleRevokeButton);
    if (adminRoleHistoryButton) await loadAdminRoleHistory();
    if (demoSignInButton) await demoSignIn();
    if (demoSignOutButton) await demoSignOut();
  });
  elements.dataSourceState.addEventListener("click", async (event) => {
    const checkButton = event.target.closest("[data-check-backend]");
    const localButton = event.target.closest("[data-use-local-data]");
    const saveNewsIntelligenceButton = event.target.closest("[data-save-news-intelligence]");
    const refreshNewsIntelligenceButton = event.target.closest("[data-refresh-news-intelligence]");
    if (checkButton) await checkBackendHealth();
    if (localButton) useLocalDataSource();
    if (saveNewsIntelligenceButton) await saveCurrentNewsIntelligence();
    if (refreshNewsIntelligenceButton) await refreshNewsIntelligenceHistory();
  });
  elements.auditServiceState.addEventListener("click", async (event) => {
    const purgeAuditRetentionButton = event.target.closest("[data-purge-audit-retention]");
    const exportAuditPackageButton = event.target.closest("[data-export-audit-package]");
    const verifyAuditPackageButton = event.target.closest("[data-verify-audit-package]");
    const archiveAuditPackageButton = event.target.closest("[data-archive-audit-package]");
    const refreshAuditArchiveButton = event.target.closest("[data-refresh-audit-archive]");
    const prepareAuditDownloadButton = event.target.closest("[data-prepare-audit-download]");
    const previewAuditReplayButton = event.target.closest("[data-preview-audit-replay]");
    if (purgeAuditRetentionButton) await purgeAuditRetention();
    if (exportAuditPackageButton) await exportAuditPackage();
    if (verifyAuditPackageButton) await verifyLastAuditPackage();
    if (archiveAuditPackageButton) await archiveLastAuditPackage();
    if (refreshAuditArchiveButton) await loadAuditArchiveReceipts();
    if (prepareAuditDownloadButton) await prepareAuditDownload();
    if (previewAuditReplayButton) await previewAuditReplay();
  });
  elements.schedulerState.addEventListener("click", async (event) => {
    const refreshDeadLetterButton = event.target.closest("[data-refresh-dead-letter]");
    const replayDeadLetterButton = event.target.closest("[data-replay-dead-letter]");
    const refreshWorkerHealthButton = event.target.closest("[data-refresh-worker-health]");
    const recordWorkerHeartbeatButton = event.target.closest("[data-record-worker-heartbeat]");
    const refreshSchedulerQueueButton = event.target.closest("[data-refresh-scheduler-queue]");
    const enqueueSampleJobButton = event.target.closest("[data-enqueue-sample-job]");
    const processSchedulerQueueButton = event.target.closest("[data-process-scheduler-queue]");
    const cleanupWorkerNoncesButton = event.target.closest("[data-cleanup-worker-nonces]");
    if (refreshDeadLetterButton) {
      const result = await loadDeadLetterJobs({ allowDemoLogin: true });
      showStatus(
        result.source === "backend" ? "死信队列已刷新。" : "死信队列暂未从后端刷新。",
        result.error ? "warning" : "info",
      );
      return;
    }
    if (refreshWorkerHealthButton) {
      const result = await loadWorkerHealth({ allowDemoLogin: true });
      showStatus(
        result.source === "backend" ? "worker 健康状态已刷新。" : "worker 健康状态暂未从后端刷新。",
        result.error ? "warning" : "info",
      );
      return;
    }
    if (recordWorkerHeartbeatButton) {
      await recordSampleWorkerHeartbeat();
      return;
    }
    if (refreshSchedulerQueueButton) {
      const result = await loadSchedulerQueue({ allowDemoLogin: true });
      showStatus(
        result.source === "backend" ? "队列任务已刷新。" : "队列任务暂未从后端刷新。",
        result.error ? "warning" : "info",
      );
      return;
    }
    if (enqueueSampleJobButton) {
      await enqueueSampleSchedulerJob();
      return;
    }
    if (processSchedulerQueueButton) {
      await processSampleSchedulerQueue();
      return;
    }
    if (cleanupWorkerNoncesButton) {
      await cleanupWorkerNonces();
      return;
    }
    if (replayDeadLetterButton) {
      await replayDeadLetterJob(replayDeadLetterButton.dataset.replayDeadLetter);
    }
  });
  elements.complianceServiceState.addEventListener("click", async (event) => {
    const saveAcknowledgementButton = event.target.closest("[data-save-compliance-ack]");
    const refreshAcknowledgementButton = event.target.closest("[data-refresh-compliance-ack]");
    const saveSuitabilityButton = event.target.closest("[data-save-suitability]");
    const refreshSuitabilityButton = event.target.closest("[data-refresh-suitability]");
    if (saveAcknowledgementButton) await saveComplianceAcknowledgement();
    if (refreshAcknowledgementButton) {
      const result = await loadComplianceAcknowledgements();
      showStatus(
        result.source === "backend"
          ? "已刷新风险确认记录。"
          : "风险确认记录暂未从后端刷新，请确认已登录并连接后端。",
        result.status === "error" ? "warning" : "info",
      );
    }
    if (saveSuitabilityButton) await saveSuitabilityQuestionnaire();
    if (refreshSuitabilityButton) {
      const result = await loadSuitabilityQuestionnaires();
      showStatus(
        result.source === "backend"
          ? "已刷新适当性问卷记录。"
          : "适当性问卷暂未从后端刷新，请确认已登录并连接后端。",
        result.status === "error" ? "warning" : "info",
      );
    }
  });
  elements.analysisState.addEventListener("click", async (event) => {
    const retryButton = event.target.closest("[data-retry-analysis]");
    if (!retryButton) return;
    await retryAnalysis();
  });
  elements.riskProfile.addEventListener("change", async (event) => {
    state.riskProfile = sanitizeRiskProfile(event.target.value);
    elements.riskProfile.value = state.riskProfile;
    localStorage.setItem("riskProfile", state.riskProfile);
    const preferencesState = await syncUserPreferences();
    await loadAnalysis();
    renderPortfolioSummary();
    showStatus(
      preferencesState.source === "backend"
        ? "分析风格已保存并同步到后端，已联动调整概率、情绪、估值和技术面分数。"
        : preferencesState.error
          ? `分析风格已保存在本机，但后端偏好同步失败：${preferencesState.error.message}`
          : "分析风格已保存在本机，并已联动调整概率、情绪、估值和技术面分数。",
      preferencesState.error ? "warning" : "success",
    );
  });
  elements.addWatchButton.addEventListener("click", addToWatchlist);
  elements.watchlistItems.addEventListener("click", async (event) => {
    const selectButton = event.target.closest("[data-select-watch]");
    const removeButton = event.target.closest("[data-remove-watch]");
    const retryButton = event.target.closest("[data-retry-watchlist]");
    if (retryButton) {
      await retryWatchlistLoad();
      return;
    }
    if (selectButton) {
      const stock = stocks.find((entry) => entry.code === selectButton.dataset.selectWatch);
      selectStock(stock);
      if (stock) {
        showStatus(`已切换到自选股：${stock.name}。`, "success");
      }
    }
    if (removeButton) {
      await removeFromWatchlist(removeButton.dataset.removeWatch);
    }
  });
  elements.newsList.addEventListener("click", async (event) => {
    const retryButton = event.target.closest("[data-retry-news]");
    if (!retryButton) return;
    await retryNewsLoad();
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMarket = button.dataset.market;
      selectStock(stocks.find((stock) => stock.market === state.selectedMarket));
      showStatus(`已切换到${getMarketName(state.selectedMarket)}样例市场。`, "info");
    });
  });
  document.querySelectorAll(".term-button").forEach((button) => {
    button.addEventListener("click", () => openTerm(button.dataset.term));
  });
  elements.tradePlan.addEventListener("click", (event) => {
    const termButton = event.target.closest(".term-button");
    if (!termButton) return;
    openTerm(termButton.dataset.term);
  });
  elements.scenarioAnalysis.addEventListener("click", (event) => {
    const termButton = event.target.closest(".term-button");
    if (!termButton) return;
    openTerm(termButton.dataset.term);
  });
  elements.factorBreakdown.addEventListener("click", (event) => {
    const termButton = event.target.closest(".term-button");
    if (!termButton) return;
    openTerm(termButton.dataset.term);
  });
  elements.closeTermDialog.addEventListener("click", () => elements.termDialog.close());
  elements.notificationInputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (input.disabled) {
        renderNotificationSettings();
        showStatus("该提醒渠道当前不可用，未保存为推送偏好。", "warning");
        return;
      }
      state.notifications[input.dataset.notification] = input.checked;
      localStorage.setItem("notifications", JSON.stringify(state.notifications));
      const permissionResult = await requestInAppNotificationPermission(input);
      const preferencesState = await syncUserPreferences();
      renderNotificationSettings();
      if (permissionResult === "denied") {
        return;
      }
      if (input.dataset.notification !== "inApp" || !input.checked) {
        showStatus(
          preferencesState.source === "backend"
            ? "提醒偏好已保存并同步到后端；真实推送通道会按授权逐步接入。"
            : preferencesState.error
              ? `提醒偏好已保存在本机，但后端偏好同步失败：${preferencesState.error.message}`
              : "提醒偏好已保存在本机；真实推送能力将在后端阶段接入。",
          preferencesState.error ? "warning" : "success",
        );
      }
    });
  });
  elements.reminderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addReminderRule();
  });
  elements.reminderRules.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-remove-reminder]");
    if (!removeButton) return;
    await removeReminderRule(removeButton.dataset.removeReminder);
  });
  elements.notificationCenter.addEventListener("click", async (event) => {
    const retryButton = event.target.closest("[data-retry-notifications]");
    const retryDeliveryButton = event.target.closest("[data-retry-notification]");
    const readButton = event.target.closest("[data-read-notification]");
    if (retryButton) {
      const result = await loadNotifications();
      showStatus(
        result.source === "backend" ? "通知中心已同步。" : "通知中心暂时使用本机等待状态。",
        result.error ? "warning" : "success",
      );
      return;
    }
    if (retryDeliveryButton) {
      await retryNotificationDelivery(retryDeliveryButton.dataset.retryNotification);
      return;
    }
    if (readButton) {
      await markNotificationRead(readButton.dataset.readNotification);
    }
  });
  elements.portfolioForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await savePortfolio();
  });
  elements.portfolioSyncState.addEventListener("click", (event) => {
    const retryButton = event.target.closest("[data-retry-portfolio-sync]");
    if (!retryButton) return;
    retryPortfolioSync();
  });
}

bindEvents();
setupInstallPrompt();
setupServiceWorker();
renderMarketTabs();
loadAnalysis();
loadNews();
renderDataSourceState();
renderAiServiceState();
renderComplianceServiceState();
renderRepositoryState();
renderDatabaseState();
renderAuditServiceState();
renderJobRunnerState();
renderSchedulerState();
renderAccountState();
renderNotificationSettings();
renderNotificationServiceState();
renderReminderForm();
renderSearchAssist();
renderPortfolioForm();
renderPortfolioSyncState();
renderPortfolioSummary();

if (state.authToken && state.authUser && shouldUseBackendDataSource()) {
  validateSavedSession({ silent: false }).finally(() => {
    loadWatchlist();
    loadReminderRules();
    loadNotifications();
    loadComplianceAcknowledgements();
    loadSuitabilityQuestionnaires();
    loadWorkerHealth();
    loadSchedulerQueue();
  });
} else {
  loadWatchlist();
  loadReminderRules();
  loadNotifications();
}

window.financeAIAssistantApp = {
  loadAnalysis,
  loadNews,
  loadNotifications,
  loadPortfolio,
  loadReminderRules,
  loadWatchlist,
  validateSavedSession,
  searchStock,
};
