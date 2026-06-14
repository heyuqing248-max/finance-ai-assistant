import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createMockReminderJobRunner } from "./jobs/mock-reminder-job-runner.mjs";
import { createMockSchedulerService } from "./jobs/mock-scheduler-service.mjs";
import { createMockProvider } from "./providers/mock-provider.mjs";
import { createMockRepository } from "./repositories/mock-repository.mjs";
import {
  createMockState,
  loadStateFromFile,
  persistAndReturn,
  persistState,
} from "./repositories/mock-state-store.mjs";
import { createMockAiService } from "./services/mock-ai-service.mjs";
import { createMockAuditService } from "./services/mock-audit-service.mjs";
import { createMockAuthService } from "./services/mock-auth-service.mjs";
import { createComplianceService } from "./services/compliance-service.mjs";
import { createMockDatabaseService } from "./services/mock-database-service.mjs";
import { createMockMarketDataRuntime } from "./services/mock-market-data-runtime.mjs";
import { createMockNewsIngestionRuntime } from "./services/mock-news-ingestion-runtime.mjs";
import { createMockNotificationService } from "./services/mock-notification-service.mjs";
import { stocks as stockCatalog } from "./mock-data.mjs";

const validReminderTypes = new Set(["priceAbove", "priceBelow", "importantNews"]);
const validRiskProfiles = new Set(["balanced", "conservative", "aggressive"]);
const validNotificationChannels = new Set(["inApp", "email", "sms", "wechat", "telegram"]);
const suitabilityVersion = "suitability-v0";
const validSuitabilityAnswers = {
  riskTolerance: new Set(["low", "medium", "high"]),
  investmentExperience: new Set(["new", "some", "experienced"]),
  investmentHorizon: new Set(["short", "medium", "long"]),
  liquidityNeed: new Set(["high", "medium", "low"]),
};
const dataProvider = createMockProvider();
const aiService = createMockAiService();
const auditService = createMockAuditService();
const authService = createMockAuthService();
const complianceService = createComplianceService();
const databaseService = createMockDatabaseService();
const marketDataRuntime = createMockMarketDataRuntime();
const newsIngestionRuntime = createMockNewsIngestionRuntime();
const notificationService = createMockNotificationService();
const reminderJobRunner = createMockReminderJobRunner({ dataProvider, notificationService });
const schedulerService = createMockSchedulerService({ jobRunner: reminderJobRunner });
const defaultModelKeyPath = "/private/tmp/finance_ai_model_key";
const defaultModelIdPath = "/private/tmp/finance_ai_model_id";
const defaultModelBaseUrlPath = "/private/tmp/finance_ai_model_base_url";
const defaultModelApiStylePath = "/private/tmp/finance_ai_model_api_style";
const defaultModelFallbackKeyPath = "/private/tmp/finance_ai_model_fallback_key";
const defaultModelFallbackIdPath = "/private/tmp/finance_ai_model_fallback_id";
const defaultModelFallbackBaseUrlPath = "/private/tmp/finance_ai_model_fallback_base_url";
const defaultModelFallbackApiStylePath = "/private/tmp/finance_ai_model_fallback_api_style";
const defaultModelFallback2KeyPath = "/private/tmp/finance_ai_model_fallback2_key";
const defaultModelFallback2IdPath = "/private/tmp/finance_ai_model_fallback2_id";
const defaultModelFallback2BaseUrlPath = "/private/tmp/finance_ai_model_fallback2_base_url";
const defaultModelFallback2ApiStylePath = "/private/tmp/finance_ai_model_fallback2_api_style";
const defaultModelFallback3KeyPath = "/private/tmp/finance_ai_model_fallback3_key";
const defaultModelFallback3IdPath = "/private/tmp/finance_ai_model_fallback3_id";
const defaultModelFallback3BaseUrlPath = "/private/tmp/finance_ai_model_fallback3_base_url";
const defaultModelFallback3ApiStylePath = "/private/tmp/finance_ai_model_fallback3_api_style";
const defaultPublicPreviewStatusPath = "/private/tmp/finance_ai_public_preview_status.json";
const defaultReliableModelId = "gpt-5.5";
const defaultFreeModelBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
const securityMasterCatalog = [
  { code: "NVDA", name: "NVIDIA", market: "us" },
  { code: "MSFT", name: "Microsoft", market: "us" },
  { code: "AAPL", name: "Apple", market: "us" },
  { code: "TSLA", name: "Tesla", market: "us" },
  { code: "GOOGL", name: "Alphabet", market: "us" },
  { code: "AMZN", name: "Amazon", market: "us" },
  { code: "META", name: "Meta Platforms", market: "us" },
  { code: "AMD", name: "Advanced Micro Devices", market: "us" },
  { code: "NFLX", name: "Netflix", market: "us" },
  { code: "ORCL", name: "Oracle", market: "us" },
  { code: "IBM", name: "IBM", market: "us" },
  { code: "BABA", name: "Alibaba", market: "us" },
  { code: "9988", name: "阿里巴巴-W", market: "hk" },
  { code: "3690", name: "美团-W", market: "hk" },
  { code: "9618", name: "京东集团-SW", market: "hk" },
  { code: "0005", name: "汇丰控股", market: "hk" },
  { code: "000001", name: "平安银行", market: "a" },
  { code: "300750", name: "宁德时代", market: "a" },
  { code: "000858", name: "五粮液", market: "a" },
  { code: "601318", name: "中国平安", market: "a" },
].map((stock) => ({ ...stock, source: "metadata-only-security-master" }));
const projectProgress = {
  id: "finance-ai-project-progress",
  updatedAt: "2026-06-14",
  source: "backend-computed-readiness-strict-real-data",
  localDemoPercent: 100,
  publicLaunchPercent: 74.5,
  completed: [
    "PWA 网页骨架、中文极简 UI、A/HK/US 市场导航",
    "严格真实数据模式、自选股、持仓、提醒、会话管理和审计链路",
    "后端 API、生产门禁规划、454 条自动化回归目标",
    "项目进度已从后端接口提供，前端连接后端时同步显示",
    "多智能体分析过程已进入本地 Demo：分析师分工、多空辩论、研究经理和风控复核可见",
    "严格真实数据模式下股票搜索已恢复 metadata-only 目录，不恢复样例行情、新闻或走势",
    "后台自动连接提示不再覆盖用户刚完成的搜索反馈",
    "metadata-only 股票搜索结果会明确提示不代表行情、新闻或 AI 分析已接入",
    "股票标题区固定显示当前数据覆盖和真实数据缺口",
    "股票标题区数据覆盖提示已拆成股票、行情、新闻、AI 四个分项",
    "股票标题区数据覆盖提示新增公告、宏观分项",
    "后端目录搜索结果可直接进入真实数据空状态",
    "metadata-only 证券主数据目录扩展到更多常见股票",
    "进度面板移除 mock/样例模式误导文案",
    "真实报价覆盖会点亮行情标签且不生成本地交易计划",
    "自动抓取真实数据增加源级超时空白保护",
    "真实 AI 模型超时保持空白策略已定义",
    "正式上线进度改为生产门禁口径：存在阻断项时最高显示 80%",
    "真实数据源限额会在网页显示并进入短冷却，避免重复消耗额度",
    "Twelve Data 免费行情 provider 已接入，可与 Alpha Vantage 组成免费 API 接力",
    "Twelve Data 缺 key 时会明确显示 missing-key，不再误标为 configured",
    "Yahoo Chart fallback 已加入免费行情接力，用于扩展 A 股/港股/美股本地 Demo 报价覆盖",
    "Yahoo Chart history fallback 已接入真实走势图，用于减少只有真实报价没有真实走势的空白",
    "A 股新闻已扩展到 GDELT 公开新闻 fallback，A 股公告已接入上交所公开公告源",
    "个股新闻增加公司别名相关性过滤，避免真实 RSS 混入明显无关标题",
    "新闻接力能识别 Yahoo 临时错误页和 GDELT 限频提示，错误说明更准确",
    "Google News RSS 已作为本地 Demo 公开新闻标题 fallback 接入并保留非商业限制说明",
    "Tencent Quote 已作为 Yahoo 限流后的公开行情兜底接入，A 股本地 Demo 不再因 Yahoo 429 直接空白",
    "新闻卡片保留来源授权标签，外部浏览器刷新后可区分公开 RSS、本地 Demo 和官方公告",
    "新闻默认展示按公司直接、供应链/监管、行业和市场泛新闻分组，弱相关内容折叠",
    "AI 空状态新增直达本机模型配置入口，用户可从首页跳到设置页填写模型 key",
    "设置页 AI 服务状态不再把 mock contract 误显示为真实 AI 已连接",
    "设置页新增 AI 模型路线和独立训练可行性评估，明确先接真实模型再积累评测数据",
    "AI 模型策略已改为 OpenAI API 主模型 + Gemini 2.5 Flash 免费备用",
    "Gemini 2.5 Flash 备用模型已通过最小真实请求验证，禁用样例分析兜底",
    "AI 模型额度/限流保护已改为提示型，避免单一 provider 限流锁死页面",
    "OpenAI Responses 完整 AI 输出安全校验失败后会自动合规改写并二次校验",
    "公网预览守护进程会生成本地最新地址卡片，旧临时链接 503 时可快速找到主入口、备用入口和本机入口",
    "固定托管交接包可生成 HTML 页面，按 Render 服务、Dashboard 密钥和 180 秒验收步骤推进稳定环境",
    "分析依据中的低可信来源会显示辅助参考提示，避免弱证据直接推动结论",
    "AI 接力简要原因不再把安全修复 not-required 误判为安全校验失败",
    "项目进度 AI readiness 会以真实模型可调用状态为准，不再误报 runtime inactive",
    "完整 AI 输出 smoke 未通过前，AI readiness 不会误显示为 100%",
    "公网 refresh 链接会强制同源 API 自动连接并显式暴露失败原因",
    "公网启动状态请求增加超时保护，避免页面长期停在正在检查",
    "公网 refresh 页面级超时会把长期 checking 改成明确失败态",
    "4174 本地页面已自动连接后端并显示 OpenAI 主模型 + Gemini 备用模型真实状态",
    "数据源面板已移除本机样例切换文案，断开后端时保持严格真实数据空白模式",
    "设置页基础设施空状态已从本机样例改为生产待连接语义",
    "后端健康检查刷新后不再把 Mock AI 服务文案带回设置页",
    "设置页已拆分本地真实行情状态和生产上线门禁，避免把 smoke 成功误读为正式上线",
    "设置页新增本机 AI 模型 key 配置入口，密钥只提交到本机后端并以脱敏状态回显",
    "AI 免费模型限流已改为提示型状态，不再全局冷却阻断重试，并新增 OpenRouter/Groq 免费备用入口",
    "AI 模型接力扩展为主模型 + 三个备用槽位，Gemini、OpenRouter、Groq 可分别保存并按顺序尝试",
    "公网 watchdog 和 supervisor 默认创建 2 个备用临时入口，允许显式设为 0 关闭备用入口",
    "固定托管交接页新增备用入口和临时公网连续健康证据区块，主入口掉线时更容易切换",
    "AI provider 接力新增后端本机冷却跳过策略，避免重复请求仍在 429 冷却中的模型",
    "AI provider 对缺少核心量化指标的真实模型输出新增一次结构化补齐重试",
    "公网访问状态新增连续健康和备用入口严格证据，AI 诊断显示安全/指标修复路径",
    "AI 备用模型可在主模型缺 key 时独立进入真实模型接力，避免主模型未配置阻断 Gemini/OpenRouter/Groq",
    "固定 Render 网址新增线上状态检查，可核对版本、接口、AI 接力和完整 AI 输出状态",
    "AI 备用模型诊断会显示每个槽位缺少的 Render Dashboard 变量",
    "新闻第一屏只展示公司直接/公告/公开言论，行业和市场背景默认折叠",
    "每日开发日志已延续到 2026-06-14",
  ],
  blockers: [
    "真实行情/新闻/公告/宏观数据源与授权",
    "完整真实 AI 成功输出仍受 provider 额度/限流影响，需继续扩展可用模型与冷却策略",
    "生产数据库、生产认证、部署监控、合规法务审核",
  ],
  readiness: [
    {
      id: "data-sources",
      label: "真实数据源接入门禁",
      percent: 80,
      status: "blocked",
      blocker: "严格真实数据模式已关闭样例兜底；行情已支持 Twelve Data/Alpha Vantage 接力，但新闻、公告、宏观、社交数据授权和生产门禁仍未完整完成。",
    },
    {
      id: "ai-analysis",
      label: "真实 AI 分析",
      percent: 80,
      status: "blocked",
      blocker: "OpenAI/Gemini/OpenRouter/Groq 接力链路已接入并可真实请求；完整 AI 成功输出仍受 provider 额度、速率限制和结构化安全校验稳定性影响。",
    },
    {
      id: "production-database",
      label: "生产数据库",
      percent: 66,
      status: "blocked",
      blocker: "真实数据库连接和运行时切换仍未完成。",
    },
    {
      id: "auth-security",
      label: "生产认证",
      percent: 80,
      status: "blocked",
      blocker: "仍需生产 IdP、真实 MFA/邮箱验证执行和隐私法务复核落地。",
    },
    {
      id: "compliance-release",
      label: "合规发布",
      percent: 77,
      status: "blocked",
      blocker: "仍需真实法务复核、地区确认、用户确认记录和持牌复核执行。",
    },
    {
      id: "deployment-ops",
      label: "部署运维",
      percent: 64,
      status: "blocked",
      blocker: "仍需真实外部投递 provider、后台 worker、托管环境和监控告警落地。",
    },
  ],
  disclaimer:
    "该进度是项目管理参考，不代表投资服务、真实生产可用性或公开上线承诺。",
};

export { createAutoIngestionTimeoutPayload, createMockState, loadStateFromFile };

function readinessCheck(id, status, message) {
  return {
    id,
    status: status === "pass" ? "pass" : status === "pending" ? "pending" : "blocked",
    message,
  };
}

function summarizeReadinessChecks(checks) {
  const totalChecks = checks.length;
  const passedChecks = checks.filter((check) => check.status === "pass").length;
  const blockedChecks = checks.filter((check) => check.status === "blocked").length;
  const pendingChecks = checks.filter((check) => check.status === "pending").length;
  return { totalChecks, passedChecks, blockedChecks, pendingChecks };
}

function firstBlockedMessage(checks, fallback) {
  return checks.find((check) => check.status === "blocked")?.message || fallback;
}

function readinessPercent(basePercent, pointsPerPass, checks) {
  const { passedChecks } = summarizeReadinessChecks(checks);
  return Math.max(0, Math.min(100, Number((basePercent + passedChecks * pointsPerPass).toFixed(1))));
}

function readinessStatus(percent, checks) {
  const { blockedChecks, pendingChecks } = summarizeReadinessChecks(checks);
  if (blockedChecks > 0) return "blocked";
  if (pendingChecks > 0) return "pending";
  return percent >= 80 ? "ready-for-review" : "in-progress";
}

function createReadinessItem({ id, label, basePercent, pointsPerPass, checks, fallbackBlocker, sourceEndpoints }) {
  const evidence = summarizeReadinessChecks(checks);
  const rawPercent = readinessPercent(basePercent, pointsPerPass, checks);
  const percent = evidence.blockedChecks > 0 ? Math.min(80, rawPercent) : rawPercent;
  return {
    id,
    label,
    percent,
    status: readinessStatus(percent, checks),
    blocker: firstBlockedMessage(checks, fallbackBlocker),
    evidence: {
      ...evidence,
      rawPercent,
      cappedAt: evidence.blockedChecks > 0 ? 80 : 100,
      capApplied: percent !== rawPercent,
      sourceEndpoints,
      checks,
    },
  };
}

function complianceCheckStatus(checks, id) {
  return checks.find((check) => check.id === id)?.status || "blocked";
}

function computedProjectReadiness(repository) {
  const dataStatus = dataProvider.status();
  const vendorChecklist = dataProvider.vendorReadinessChecklist();
  const vendorContractHandoffPackage = dataProvider.vendorContractHandoffPackage();
  const providerSecretQuotaRunbook = dataProvider.providerSecretQuotaRunbook();
  const providerSetupGuide = dataProvider.providerSetupGuide();
  const dataIngestionChannelStrategy = dataProvider.dataIngestionChannelStrategy();
  const marketDataVendorChecklist = dataProvider.marketDataVendorChecklist();
  const newsFilingsVendorChecklist = dataProvider.newsFilingsVendorChecklist();
  const macroDataVendorChecklist = dataProvider.macroDataVendorChecklist();
  const publicStatementsVendorChecklist = dataProvider.publicStatementsVendorChecklist();
  const aiStatus = aiService.status();
  const aiAdapter = aiStatus.providerAdapter || {};
  const aiGate = aiAdapter.complianceGate || {};
  const authStatus = authService.status();
  const authAdapter = authStatus.providerAdapter || {};
  const authGate = authAdapter.securityGate || {};
  const databaseStatus = databaseService.status(repository.status(), repository);
  const complianceStatus = complianceService.status();
  const complianceGate = complianceStatus.complianceGate || {};
  const notificationStatus = notificationService.status();
  const schedulerStatus = schedulerService.status();
  const jobRunnerStatus = reminderJobRunner.status();
  const auditStatus = auditService.status(repository.status());

  return [
    createReadinessItem({
      id: "data-sources",
      label: "真实数据源接入门禁",
      basePercent: 15,
      pointsPerPass: 3,
      sourceEndpoints: [
        "/api/data-sources",
        "/api/data-sources/ingestion-channels",
        "/api/data-sources/auto-ingestion-run",
        "/api/data-sources/vendor-readiness",
        "/api/data-sources/market-data-vendor-checklist",
        "/api/data-sources/news-filings-vendor-checklist",
        "/api/data-sources/macro-data-vendor-checklist",
        "/api/data-sources/public-statements-vendor-checklist",
        "/api/data-sources/integration-plan",
        "/api/data-sources/provider-registry",
        "/api/data-sources/vendor-contract-handoff",
        "/api/data-sources/provider-secret-quota-runbook",
        "/api/data-sources/provider-setup-guide",
        "/api/data-sources/market-data-adapter",
        "/api/market-data/quote",
        "/api/data-sources/macro-data-adapter",
        "/api/data-sources/news-filings-adapter",
        "/api/news/intelligence",
        "/api/news/filings",
      ],
      fallbackBlocker:
        "严格真实数据模式已关闭样例兜底；仍需真实行情、新闻、公告、宏观和社交数据授权。",
      checks: [
        readinessCheck(
          "integrationPlan",
          dataStatus.integrationPlan?.status === "ready-for-adapter" ? "pass" : "blocked",
          "真实行情、新闻、公告和宏观数据授权/provider 尚未完整配置。",
        ),
        readinessCheck(
          "providerRegistry",
          dataStatus.providerRegistry?.status === "ready" ? "pass" : "blocked",
          "真实 provider 注册表仍有缺失或未支持的供应商配置。",
        ),
        readinessCheck(
          "integrationDryRunPreflightDefined",
          dataStatus.integrationPlan?.dryRunPreflightPlan?.mode === "dry-run-no-provider-fetch" &&
            dataStatus.integrationPlan.dryRunPreflightPlan.requestEnvelope?.requiredFields?.length >= 8 &&
            dataStatus.integrationPlan.dryRunPreflightPlan.requestEnvelope?.forbiddenFields?.includes("apiKey") &&
            dataStatus.integrationPlan.dryRunPreflightPlan.canCallProviderNetwork === false &&
            dataStatus.integrationPlan.dryRunPreflightPlan.canEnableLiveRuntime === false
            ? "pass"
            : "blocked",
          "真实数据源 dry-run 预检 envelope、禁止联网或 live runtime 门禁尚未完整定义。",
        ),
        readinessCheck(
          "providerRegistryPreflightDefined",
          dataStatus.providerRegistry?.rolloutPreflightPlan?.mode === "dry-run-no-provider-runtime" &&
            dataStatus.providerRegistry.rolloutPreflightPlan.adapterBoundary?.routeHandlersMustUseRegistry &&
            dataStatus.providerRegistry.rolloutPreflightPlan.runtimeSwitchGate?.requiredChecks?.length >= 6 &&
            dataStatus.providerRegistry.rolloutPreflightPlan.canEnableLiveRuntime === false
            ? "pass"
            : "blocked",
          "Provider 注册表 dry-run rollout、adapter 边界、运行时切换门禁或回滚策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageProviderRegistered",
          dataStatus.providerRegistry?.candidateProviders?.some(
            (provider) => provider.id === "alpha-vantage" && provider.groupId === "marketData",
          )
            ? "pass"
            : "blocked",
          "Alpha Vantage 尚未作为行情 provider 候选项接入真实数据源注册表。",
        ),
        readinessCheck(
          "marketNoFixtureFallback",
          dataStatus.marketDataAdapter?.canReadFixtures === false ? "pass" : "blocked",
          "严格真实数据模式要求行情无真实 provider 结果时保持空白，不能启用样例行情兜底。",
        ),
        readinessCheck(
          "macroNoRuntimeFixtureFallback",
          dataStatus.mockDataAllowed === false ? "pass" : "blocked",
          "严格真实数据模式要求宏观数据无真实 provider 结果时保持空白，不能启用样例宏观兜底。",
        ),
        readinessCheck(
          "newsNoFixtureFallback",
          dataStatus.newsFilingsAdapter?.canReadFixtures === false ? "pass" : "blocked",
          "严格真实数据模式要求新闻、公告和公开言论无真实 provider 结果时保持空白，不能启用样例兜底。",
        ),
        readinessCheck(
          "vendorReadinessChecklist",
          vendorChecklist.passedCount >= 3 ? "pass" : "blocked",
          "真实数据源供应商筛选清单尚未达到基础可执行状态。",
        ),
        readinessCheck(
          "vendorContactOrder",
          vendorChecklist.preferredContactOrder?.[0] === "marketData" ? "pass" : "blocked",
          "真实数据源接入顺序尚未确认。",
        ),
        readinessCheck(
          "vendorContractHandoffPackageDefined",
          vendorContractHandoffPackage?.mode === "dry-run-no-contract-signing" &&
            vendorContractHandoffPackage?.requiredArtifacts?.length >= 8 &&
            vendorContractHandoffPackage?.forbiddenArtifacts?.includes("providerApiKey") &&
            vendorContractHandoffPackage?.canEnableProviderRuntime === false
            ? "pass"
            : "blocked",
          "供应商合同、授权、成本和交接证据包尚未完整定义。",
        ),
        readinessCheck(
          "providerSecretQuotaRunbookDefined",
          providerSecretQuotaRunbook?.mode === "dry-run-no-secret-use" &&
            providerSecretQuotaRunbook?.secretControls?.requiredVaultFields?.length >= 6 &&
            providerSecretQuotaRunbook?.quotaControls?.blocksUnboundedRequests &&
            providerSecretQuotaRunbook?.canCallProviderNetwork === false
            ? "pass"
            : "blocked",
          "真实 provider 密钥、额度、成本和审计运行手册尚未完整定义。",
        ),
        readinessCheck(
          "providerSetupGuideDefined",
          providerSetupGuide?.mode === "no-secret-provider-setup-guide" &&
            providerSetupGuide?.setupGroups?.length >= 4 &&
            providerSetupGuide?.forbiddenAuditFields?.includes("apiKey") &&
            providerSetupGuide?.canReadProviderSecrets === false
            ? "pass"
            : "blocked",
          "真实 Provider 配置向导、环境变量映射或禁止输出密钥策略尚未完整定义。",
        ),
        readinessCheck(
          "providerSetupSmokeOrderDefined",
          providerSetupGuide?.smokeOrder?.includes("marketDataQuote") &&
            providerSetupGuide?.smokeOrder?.includes("newsSentiment") &&
            providerSetupGuide?.smokeOrder?.length >= 4 &&
            providerSetupGuide?.canEnableLiveRuntime === false
            ? "pass"
            : "blocked",
          "真实 Provider smoke 顺序或禁止自动启用 live runtime 的门禁尚未完整定义。",
        ),
        readinessCheck(
          "dataIngestionChannelStrategyDefined",
          dataIngestionChannelStrategy?.mode === "authorized-public-and-user-provided-data-only" &&
            dataIngestionChannelStrategy?.channels?.length >= 5 &&
            dataIngestionChannelStrategy?.safetyRules?.includes(
              "no-fixture-fallback-in-strict-real-data-mode",
            )
            ? "pass"
            : "blocked",
          "浏览器、社交媒体和股票 App 数据接入必须先定义授权边界、公开链接导入、人工登录和禁用样例兜底规则。",
        ),
        readinessCheck(
          "dataIngestionChannelOrderDefined",
          dataIngestionChannelStrategy?.firstImplementationOrder?.includes(
            "browserPublicLinkIngestion",
          ) &&
            dataIngestionChannelStrategy?.firstImplementationOrder?.includes(
              "mobileAppManualImport",
            )
            ? "pass"
            : "blocked",
          "数据接入顺序必须覆盖真实 API、浏览器公开链接、社交官方 API 和股票 App 手动导入。",
        ),
        readinessCheck(
          "automaticRealDataRunEndpointDefined",
          "pass",
          "自动抓取真实数据接口必须可由前端触发，并在无真实结果时返回空状态和阻断原因。",
        ),
        readinessCheck(
          "marketDataVendorChecklist",
          marketDataVendorChecklist.passedCount >= 3 ? "pass" : "blocked",
          "行情供应商验收表尚未达到基础可执行状态。",
        ),
        readinessCheck(
          "marketDataAcceptanceScope",
          marketDataVendorChecklist.acceptanceAreas?.length >= 4 ? "pass" : "blocked",
          "行情报价、历史走势、交易日历和延迟标签验收范围尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageQuoteConnectorDefined",
          dataStatus.marketDataAdapter?.alphaVantageConnector?.providerId === "alpha-vantage" &&
            dataStatus.marketDataAdapter.alphaVantageConnector?.functionName === "GLOBAL_QUOTE" &&
            dataStatus.marketDataAdapter.alphaVantageConnector?.supportedMarkets?.length >= 3 &&
            dataStatus.marketDataAdapter.alphaVantageConnector?.forbiddenAuditFields?.includes("apiKey")
            ? "pass"
            : "blocked",
          "Alpha Vantage 真实 quote 连接器、市场映射或敏感字段脱敏策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageDemoSmokePlanDefined",
          dataStatus.marketDataAdapter?.alphaVantageSmokeTestPlan?.mode === "real-provider-demo-key-smoke" &&
            dataStatus.marketDataAdapter.alphaVantageSmokeTestPlan?.demoSymbol === "IBM" &&
            dataStatus.marketDataAdapter.alphaVantageSmokeTestPlan?.expectedFields?.includes("05. price") &&
            dataStatus.marketDataAdapter.alphaVantageSmokeTestPlan?.forbiddenAuditFields?.includes("providerResponseRaw")
            ? "pass"
            : "blocked",
          "Alpha Vantage demo smoke test 计划、字段验收或禁止原始 provider 响应审计策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageQuoteCredentialPreflightDefined",
          dataStatus.marketDataAdapter?.alphaVantageCredentialPreflight?.mode === "no-secret-credential-preflight" &&
            dataStatus.marketDataAdapter.alphaVantageCredentialPreflight?.providerId === "alpha-vantage" &&
            dataStatus.marketDataAdapter.alphaVantageCredentialPreflight?.apiKeyStatus &&
            dataStatus.marketDataAdapter.alphaVantageCredentialPreflight?.requiredEnvVars?.includes("FINANCE_AI_MARKET_DATA_API_KEY") &&
            dataStatus.marketDataAdapter.alphaVantageCredentialPreflight?.forbiddenAuditFields?.includes("apiKey")
            ? "pass"
            : "blocked",
          "Alpha Vantage quote 凭证预检、demo key 识别或禁止审计真实 key 策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageNewsConnectorDefined",
          dataStatus.newsFilingsAdapter?.alphaVantageNewsConnector?.providerId === "alpha-vantage-news" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsConnector?.functionName === "NEWS_SENTIMENT" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsConnector?.supportedMarkets?.includes("us") &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsConnector?.forbiddenAuditFields?.includes("rawArticleBody")
            ? "pass"
            : "blocked",
          "Alpha Vantage 新闻情绪连接器、来源署名或敏感字段脱敏策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageNewsSmokePlanDefined",
          dataStatus.newsFilingsAdapter?.alphaVantageNewsSmokeTestPlan?.mode === "real-provider-demo-news-smoke" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsSmokeTestPlan?.demoTicker === "AAPL" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsSmokeTestPlan?.expectedFields?.includes("feed") &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsSmokeTestPlan?.forbiddenAuditFields?.includes("providerResponseRaw")
            ? "pass"
            : "blocked",
          "Alpha Vantage 新闻情绪 demo smoke test 计划、字段验收或禁止原始 provider 响应审计策略尚未完整定义。",
        ),
        readinessCheck(
          "alphaVantageNewsCredentialPreflightDefined",
          dataStatus.newsFilingsAdapter?.alphaVantageNewsCredentialPreflight?.mode === "no-secret-credential-preflight" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsCredentialPreflight?.providerId === "alpha-vantage-news" &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsCredentialPreflight?.apiKeyStatus &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsCredentialPreflight?.requiredEnvVars?.includes("FINANCE_AI_NEWS_API_KEY") &&
            dataStatus.newsFilingsAdapter.alphaVantageNewsCredentialPreflight?.forbiddenAuditFields?.includes("apiKey")
            ? "pass"
            : "blocked",
          "Alpha Vantage NEWS_SENTIMENT 凭证预检、demo key 识别或禁止审计真实 key 策略尚未完整定义。",
        ),
        readinessCheck(
          "secCompanyFilingsConnectorDefined",
          dataStatus.newsFilingsAdapter?.secFilingsConnector?.providerId === "sec-company-submissions" &&
            dataStatus.newsFilingsAdapter.secFilingsConnector?.supportedMarkets?.includes("us") &&
            dataStatus.newsFilingsAdapter.secFilingsConnector?.requiresApiKey === false &&
            dataStatus.newsFilingsAdapter.secFilingsConnector?.forbiddenAuditFields?.includes("rawFilingDocument")
            ? "pass"
            : "blocked",
          "SEC EDGAR 公司公告连接器、无 key 边界或禁止原始公告审计策略尚未完整定义。",
        ),
        readinessCheck(
          "secCompanyFilingsAccessPreflightDefined",
          dataStatus.newsFilingsAdapter?.secFilingsAccessPreflight?.mode === "no-secret-public-filings-preflight" &&
            dataStatus.newsFilingsAdapter.secFilingsAccessPreflight?.noApiKeyRequired &&
            dataStatus.newsFilingsAdapter.secFilingsAccessPreflight?.requiredEnvVars?.includes("FINANCE_AI_SEC_USER_AGENT") &&
            dataStatus.newsFilingsAdapter.secFilingsSmokeTestPlan?.demoTicker === "AAPL"
            ? "pass"
            : "blocked",
          "SEC EDGAR 公告访问预检、User-Agent 要求或 AAPL smoke 计划尚未完整定义。",
        ),
        readinessCheck(
          "newsFilingsVendorChecklist",
          newsFilingsVendorChecklist.passedCount >= 3 ? "pass" : "blocked",
          "新闻/公告供应商验收表尚未达到基础可执行状态。",
        ),
        readinessCheck(
          "newsFilingsAcceptanceScope",
          newsFilingsVendorChecklist.acceptanceAreas?.length >= 5 ? "pass" : "blocked",
          "新闻标题摘要、短摘录、原文链接、保留天数和付费墙边界验收范围尚未完整定义。",
        ),
        readinessCheck(
          "macroDataVendorChecklist",
          macroDataVendorChecklist.passedCount >= 3 ? "pass" : "blocked",
          "宏观数据供应商验收表尚未达到基础可执行状态。",
        ),
        readinessCheck(
          "macroDataAcceptanceScope",
          macroDataVendorChecklist.acceptanceAreas?.length >= 5 ? "pass" : "blocked",
          "宏观利率、汇率、通胀、政策事件和修订规则验收范围尚未完整定义。",
        ),
        readinessCheck(
          "publicStatementsVendorChecklist",
          publicStatementsVendorChecklist.passedCount >= 3 ? "pass" : "blocked",
          "公开言论供应商验收表尚未达到基础可执行状态。",
        ),
        readinessCheck(
          "publicStatementsAcceptanceScope",
          publicStatementsVendorChecklist.acceptanceAreas?.length >= 6 ? "pass" : "blocked",
          "公开言论身份验证、来源链接、发言人角色、平台条款、短摘录和人工复核范围尚未完整定义。",
        ),
        readinessCheck(
          "publicStatementVerificationPolicy",
          dataStatus.newsFilingsAdapter?.publicStatementVerificationPolicy?.requiredSignals?.length >= 7 &&
            dataStatus.newsFilingsAdapter.publicStatementVerificationPolicy.blocksUnverifiedHighImpactStatements
            ? "pass"
            : "blocked",
          "公开言论身份验证策略尚未接入新闻公告适配器。",
        ),
        readinessCheck(
          "publicStatementManualReviewPolicy",
          dataStatus.newsFilingsAdapter?.publicStatementManualReviewPolicy?.reviewTriggers?.length >= 5 &&
            dataStatus.newsFilingsAdapter.publicStatementManualReviewPolicy.queueFields?.includes("reviewStatus")
            ? "pass"
            : "blocked",
          "公开言论人工复核策略尚未接入新闻公告适配器。",
        ),
      ],
    }),
    createReadinessItem({
      id: "ai-analysis",
      label: "真实 AI 分析",
      basePercent: 22,
      pointsPerPass: 3,
      sourceEndpoints: [
        "/api/ai-services",
        "/api/ai-services/provider-adapter",
        "/api/ai-services/model-provider-setup-guide",
        "/api/ai-services/local-model-config",
        "/api/data-sources",
        "/api/news/intelligence",
        "/api/market-data/quote",
        "/api/analysis",
      ],
      fallbackBlocker: "仍需真实模型调用、引用证据、成本限流、输出校验和人工复核。",
      checks: [
        readinessCheck(
          "realProviderConfig",
          aiAdapter.configured && aiAdapter.supported ? "pass" : "blocked",
          "真实 AI provider、API key 或模型 id 尚未配置。",
        ),
        readinessCheck("promptContract", aiAdapter.promptContract ? "pass" : "blocked", "结构化提示词契约缺失。"),
        readinessCheck("responseSchema", aiAdapter.responseSchema ? "pass" : "blocked", "AI 输出 schema 缺失。"),
        readinessCheck(
          "factorBreakdown",
          aiStatus.capabilities?.includes("factorBreakdown") ? "pass" : "blocked",
          "六因子拆解能力缺失。",
        ),
        readinessCheck(
          "multiAgentContractDefined",
          aiStatus.capabilities?.includes("multiAgentAnalysisProcess") &&
            aiAdapter.responseSchema?.requiredFields?.includes("analysisProcess")
            ? "pass"
            : "blocked",
          "多智能体分析 contract、角色输出或响应 schema 尚未完整定义。",
        ),
        readinessCheck(
          "userVisibleAnalysisProcessDefined",
          aiStatus.capabilities?.includes("multiAgentAnalysisProcess") &&
            aiAdapter.endpointContracts?.some((contract) => contract.output?.includes("analysisProcess"))
            ? "pass"
            : "blocked",
          "前端可见的分析过程输出 contract 尚未完整定义。",
        ),
        readinessCheck(
          "responseValidationPolicyDefined",
          aiAdapter.responseValidationPolicy?.requiredValidators?.length >= 6 &&
            aiAdapter.responseValidationPolicy?.fallbackMode === "show-insufficient-information"
            ? "pass"
            : "blocked",
          "AI 输出校验 schema、概率边界、禁用承诺和失败回退策略尚未完整定义。",
        ),
        readinessCheck(
          "citationEvidencePolicyDefined",
          aiAdapter.citationEvidencePolicy?.requiredCitationFields?.length >= 8 &&
            aiAdapter.citationEvidencePolicy?.requiresClaimCitationMap
            ? "pass"
            : "blocked",
          "AI 引用证据包、结论-引用映射和来源字段策略尚未完整定义。",
        ),
        readinessCheck(
          "humanReviewPolicyDefined",
          aiAdapter.humanReviewPolicy?.triggerRules?.length >= 5 &&
            aiAdapter.humanReviewPolicy?.requiresUserVisibleFallback
            ? "pass"
            : "blocked",
          "AI 低置信、证据不足和禁用表达的人工复核策略尚未完整定义。",
        ),
        readinessCheck(
          "auditPolicyDefined",
          aiAdapter.auditPolicy?.allowedEnvelopeFields?.length >= 10 &&
            aiAdapter.auditPolicy?.forbiddenEnvelopeFields?.includes("rawPrompt") &&
            aiAdapter.auditPolicy?.hashChainRequired
            ? "pass"
            : "blocked",
          "AI 模型请求审计 envelope、脱敏字段和 hash 链策略尚未完整定义。",
        ),
        readinessCheck(
          "budgetPolicyDefined",
          aiAdapter.budgetPolicy?.requiresCostAlerting &&
            aiAdapter.budgetPolicy?.requiresPerUserRateLimit
            ? "pass"
            : "blocked",
          "AI 成本告警、每用户限流和 token 上限策略尚未完整定义。",
        ),
        readinessCheck(
          "secretManagementPolicyDefined",
          aiAdapter.secretManagementPolicy?.requiredControls?.length >= 6 &&
            aiAdapter.secretManagementPolicy?.forbiddenSecretLocations?.includes("clientBundle")
            ? "pass"
            : "blocked",
          "AI provider 密钥管理、轮换和前端排除策略尚未完整定义。",
        ),
        readinessCheck(
          "providerRegistryDefined",
          aiAdapter.supportedProviderIds?.includes("hosted-llm-provider") &&
            aiAdapter.endpointContracts?.some((contract) => contract.method === "generateStructuredAnalysis")
            ? "pass"
            : "blocked",
          "AI provider 注册表、模型生成接口契约或结构化分析方法尚未完整定义。",
        ),
        readinessCheck(
          "modelRequestEnvelopeDefined",
          aiAdapter.modelCallPreflightPlan?.requestEnvelope?.requiredFields?.includes("promptVersion") &&
            aiAdapter.modelCallPreflightPlan.requestEnvelope.requiredFields.includes("citationPackage") &&
            aiAdapter.modelCallPreflightPlan.requestEnvelope.forbiddenFields?.includes("modelApiKey")
            ? "pass"
            : "blocked",
          "AI 模型调用 request envelope、必填字段和禁止密钥字段尚未完整定义。",
        ),
        readinessCheck(
          "manualPreflightApprovalDefined",
          aiAdapter.modelCallPreflightPlan?.requiredManualApproval &&
            aiAdapter.modelCallPreflightPlan?.mode === "dry-run-no-model-call" &&
            aiAdapter.modelCallPreflightPlan?.canExecuteLiveCall === false
            ? "pass"
            : "blocked",
          "AI 模型调用人工审批、dry-run 预检和禁止真实执行策略尚未完整定义。",
        ),
        readinessCheck(
          "modelEvaluationEvidencePackageDefined",
          aiAdapter.modelEvaluationEvidencePackage?.mode === "dry-run-no-model-certification" &&
            aiAdapter.modelEvaluationEvidencePackage?.requiredArtifacts?.length >= 8 &&
            aiAdapter.modelEvaluationEvidencePackage?.acceptanceThresholds?.minimumPassRatePercent >= 95 &&
            aiAdapter.modelEvaluationEvidencePackage?.canPublishUserVisibleAdvice === false
            ? "pass"
            : "blocked",
          "AI 模型评测证据包、阈值或禁止发布策略尚未完整定义。",
        ),
        readinessCheck(
          "modelReleaseRollbackEvidencePackageDefined",
          aiAdapter.modelReleaseRollbackEvidencePackage?.mode === "dry-run-no-model-release" &&
            aiAdapter.modelReleaseRollbackEvidencePackage?.requiredArtifacts?.length >= 8 &&
            aiAdapter.modelReleaseRollbackEvidencePackage?.releaseBlockersThatMustRemainBlocked?.includes("liveModelGate") &&
            aiAdapter.modelReleaseRollbackEvidencePackage?.canEnableLiveRuntime === false
            ? "pass"
            : "blocked",
          "AI 模型发布回滚证据包、版本锁或保持 live runtime 阻断策略尚未完整定义。",
        ),
        readinessCheck(
          "modelProviderSetupGuideDefined",
          aiAdapter.modelProviderSetupGuide?.mode === "no-secret-model-provider-setup-guide" &&
            aiAdapter.modelProviderSetupGuide?.setupGroups?.length >= 3 &&
            aiAdapter.modelProviderSetupGuide?.forbiddenAuditFields?.includes("modelApiKey") &&
            aiAdapter.modelProviderSetupGuide?.canReadModelSecrets === false
            ? "pass"
            : "blocked",
          "AI 模型 Provider 配置向导、环境变量分组或禁止输出模型密钥策略尚未完整定义。",
        ),
        readinessCheck(
          "localModelConfigEndpointDefined",
          aiAdapter.recommendedModelId &&
            aiAdapter.apiStyle &&
            aiAdapter.baseUrlStatus !== undefined
            ? "pass"
            : "blocked",
          "本机模型 key 配置入口、推荐模型或脱敏状态尚未完整定义。",
        ),
        readinessCheck(
          "freeGeminiProviderPresetDefined",
            aiAdapter.freeModelProviderPreset?.id === "gemini-free" &&
            aiAdapter.freeModelProviderPreset?.provider === "openai-compatible" &&
            aiAdapter.freeModelProviderPreset?.modelId === "gemini-2.5-flash" &&
            aiAdapter.freeModelProviderPreset?.apiStyle === "chat-completions"
            ? "pass"
            : "blocked",
          "免费 Gemini OpenAI-compatible 模型预设尚未完整定义。",
        ),
        readinessCheck(
          "modelProviderSmokeOrderDefined",
          aiAdapter.modelProviderSetupGuide?.smokeOrder?.includes("structuredSchemaValidation") &&
            aiAdapter.modelProviderSetupGuide?.smokeOrder?.includes("sourceGroundingCheck") &&
            aiAdapter.modelProviderSetupGuide?.smokeOrder?.includes("releaseRollbackGate")
            ? "pass"
            : "blocked",
          "AI 模型 Provider smoke 顺序、来源引用检查或禁止真实模型调用门禁尚未完整定义。",
        ),
        readinessCheck(
          "dataSourceEvidencePackageDefined",
          aiAdapter.dataSourceEvidencePackage?.mode === "dry-run-no-live-model-grounding" &&
            aiAdapter.dataSourceEvidencePackage?.requiredSourceTypes?.length >= 5 &&
            aiAdapter.dataSourceEvidencePackage?.forbiddenSourceFields?.includes("providerApiKey") &&
            aiAdapter.dataSourceEvidencePackage?.canPublishWithoutSourceRefs === false
            ? "pass"
            : "blocked",
          "AI 真实数据来源证据包、授权字段或禁止无来源发布策略尚未完整定义。",
        ),
        readinessCheck(
          "factorCoverageEvidencePackageDefined",
          aiAdapter.factorCoverageEvidencePackage?.requiredFactors?.length >= 6 &&
            aiAdapter.factorCoverageEvidencePackage?.minReadyFactorsForActionableAnalysis >= 6 &&
            aiAdapter.factorCoverageEvidencePackage?.fallbackRules?.includes("fixtureFactorBlocksRealTimeClaim") &&
            aiAdapter.factorCoverageEvidencePackage?.canUseIncompleteFactorsForHighConfidence === false
            ? "pass"
            : "blocked",
          "AI 六因子覆盖证据包、缺失项降置信或 fixture 阻断实时结论策略尚未完整定义。",
        ),
        readinessCheck(
          "dataFreshnessFallbackEvidencePackageDefined",
          aiAdapter.dataFreshnessFallbackEvidencePackage?.freshnessWindows?.marketDataMaxDelayMinutes <= 20 &&
            aiAdapter.dataFreshnessFallbackEvidencePackage?.fallbackModes?.includes("provider-error-fixture-fallback") &&
            aiAdapter.dataFreshnessFallbackEvidencePackage?.requiredUserVisibleFlags?.includes("delayedOrFixtureLabel") &&
            aiAdapter.dataFreshnessFallbackEvidencePackage?.canHideFallbackMode === false
            ? "pass"
            : "blocked",
          "AI 数据新鲜度、provider 错误回退或用户可见 fixture/delay 标签策略尚未完整定义。",
        ),
        readinessCheck(
          "modelTimeoutFallbackPolicyDefined",
          aiAdapter.modelTimeoutFallbackPolicy?.mode === "empty-no-fixture-no-advice" &&
            aiAdapter.modelTimeoutFallbackPolicy?.errorCode === "REAL_AI_MODEL_TIMEOUT_EMPTY" &&
            aiAdapter.modelTimeoutFallbackPolicy?.canUseFixtureFallback === false &&
            aiAdapter.modelTimeoutFallbackPolicy?.canShowPartialModelOutput === false &&
            aiAdapter.modelTimeoutFallbackPolicy?.keepsUserVisibleBlankState === true
            ? "pass"
            : "blocked",
          "AI 模型超时、失败或不完整输出的空白无兜底策略尚未完整定义。",
        ),
        readinessCheck(
          "liveModelGate",
          aiGate.status === "pass" || aiAdapter.canCallLiveModel ? "pass" : "blocked",
          "真实模型 provider、引用证据、成本限流、输出校验或人工复核仍未通过。",
        ),
        readinessCheck(
          "providerRuntime",
          aiAdapter.canCallLiveModel || aiAdapter.runtimeMode === "live" ? "pass" : "blocked",
          "AI provider runtime 可调用性按 canCallLiveModel 校验；未通过时保持阻断。",
        ),
        readinessCheck(
          "fullAiOutputSmoke",
          process.env.FINANCE_AI_FULL_AI_SMOKE_PASSED === "true" ? "pass" : "blocked",
          "完整真实 AI 输出尚未完成 200、结构化 JSON 和安全校验 smoke；当前可能降级为规则参考。",
        ),
      ],
    }),
    createReadinessItem({
      id: "production-database",
      label: "生产数据库",
      basePercent: 14,
      pointsPerPass: 2,
      sourceEndpoints: [
        "/api/database/status",
        "/api/repository/status",
        "/api/database/production-repository-adapter",
        "/api/database/production-repository-smoke-test",
        "/api/database/production-repository-cutover-plan",
        "/api/database/read-only-health",
        "/api/database/driver-setup-plan",
      ],
      fallbackBlocker: "仍需真实 PostgreSQL 连接、迁移执行、备份恢复、RLS 和切换演练。",
      checks: [
        readinessCheck(
          "repositoryContract",
          databaseStatus.repositoryContract?.status === "pass" ? "pass" : "blocked",
          "Repository contract 尚未通过。",
        ),
        readinessCheck(
          "plannedTables",
          databaseStatus.plannedTables?.length >= 15 ? "pass" : "blocked",
          "生产数据库表规划不完整。",
        ),
        readinessCheck(
          "sqlDraft",
          databaseStatus.productionAdapter?.migrationDryRun?.migrationSqlDraft?.status === "generated" ? "pass" : "blocked",
          "PostgreSQL SQL 草案尚未生成。",
        ),
        readinessCheck(
          "mockFallback",
          databaseStatus.productionAdapter?.migrationDryRun?.steps?.some(
            (step) => step.id === "keepMockFallbackActive" && step.status === "ready",
          )
            ? "pass"
            : "blocked",
          "mock/JSON 回退路径未确认。",
        ),
        readinessCheck(
          "repositoryAdapterSkeletonDefined",
          databaseStatus.productionRepositoryAdapter?.methodCoverage?.missingCount === 0 &&
            databaseStatus.productionRepositoryAdapter?.safety?.noWrites
            ? "pass"
            : "blocked",
          "生产 PostgreSQL 仓储 adapter 骨架、方法覆盖或禁止写入策略尚未完整定义。",
        ),
        readinessCheck(
          "readOnlySmokePlanDefined",
          databaseStatus.productionRepositorySmokeTest?.coverage?.readOnlyOperationCount > 0 &&
            databaseStatus.productionRepositorySmokeTest?.blockedStatements?.includes("DROP")
            ? "pass"
            : "blocked",
          "生产仓储只读冒烟计划、关键表覆盖或写语句阻断清单尚未完整定义。",
        ),
        readinessCheck(
          "sqlContractDefined",
          databaseStatus.productionRepositorySqlContract?.status === "draft-ready" &&
            databaseStatus.productionRepositorySqlContract?.safety?.parameterizedValuesOnly
            ? "pass"
            : "blocked",
          "生产仓储参数化 SQL 契约或禁止字符串拼接策略尚未完整定义。",
        ),
        readinessCheck(
          "executionPlanDefined",
          databaseStatus.productionRepositoryExecutionPlan?.status === "draft-ready" &&
            databaseStatus.productionRepositoryExecutionPlan?.auditWritePolicy?.hashChainRequired
            ? "pass"
            : "blocked",
          "生产仓储执行计划、事务包装或 hash 链审计策略尚未完整定义。",
        ),
        readinessCheck(
          "parameterValidationDefined",
          databaseStatus.productionRepositoryParameterValidationPlan?.canValidateLocally &&
            databaseStatus.productionRepositoryParameterValidationPlan?.safety?.redactsSampleValues
            ? "pass"
            : "blocked",
          "生产仓储本地参数校验或样例脱敏策略尚未完整定义。",
        ),
        readinessCheck(
          "connectionPoolPlanDefined",
          databaseStatus.productionRepositoryConnectionPoolPlan?.poolConfig?.max > 0 &&
            databaseStatus.productionRepositoryConnectionPoolPlan?.safety?.releaseClientFinally
            ? "pass"
            : "blocked",
          "生产仓储连接池、事务释放或 finally release 策略尚未完整定义。",
        ),
        readinessCheck(
          "connectionProbeTimeoutPolicyDefined",
          databaseStatus.productionRepositoryAdapter?.connectionProbeTimeoutPolicy?.timeoutMs <= 5000 &&
            databaseStatus.productionRepositoryAdapter?.connectionProbeTimeoutPolicy?.safety?.readOnlyOnly &&
            databaseStatus.productionRepositoryAdapter?.connectionProbeTimeoutPolicy?.safety?.cutoverBlockedOnTimeout &&
            databaseStatus.productionRepositoryAdapter?.connectionProbeTimeoutPolicy?.auditEnvelope?.forbiddenFields?.includes("rawConnectionString")
            ? "pass"
            : "blocked",
          "生产仓储连接探针超时、只读探测或连接串脱敏策略尚未完整定义。",
        ),
        readinessCheck(
          "sqlExecutorPlanDefined",
          databaseStatus.productionRepositorySqlExecutorPlan?.bindingCoverage?.parameterizedStatementCount > 0 &&
            databaseStatus.productionRepositorySqlExecutorPlan?.safety?.parameterArrayOnly
            ? "pass"
            : "blocked",
          "生产仓储 SQL 执行器绑定或参数数组策略尚未完整定义。",
        ),
        readinessCheck(
          "resultAuditPlanDefined",
          databaseStatus.productionRepositoryResultAuditPlan?.mappingCount > 0 &&
            databaseStatus.productionRepositoryResultAuditPlan?.safety?.rawRowsNeverLogged
            ? "pass"
            : "blocked",
          "生产仓储结果映射、审计 envelope 或禁止记录原始行策略尚未完整定义。",
        ),
        readinessCheck(
          "readRehearsalPlanDefined",
          databaseStatus.productionRepositoryReadRehearsalPlan?.coverage?.readStatementCount > 0 &&
            databaseStatus.productionRepositoryReadRehearsalPlan?.safety?.noWrites
            ? "pass"
            : "blocked",
          "生产仓储只读查询预演或禁止写入策略尚未完整定义。",
        ),
        readinessCheck(
          "parityPlanDefined",
          databaseStatus.productionRepositoryParityPlan?.parityWindow?.maxAllowedMismatchPercent === 0 &&
            databaseStatus.productionRepositoryParityPlan?.safety?.mockFallbackRequired
            ? "pass"
            : "blocked",
          "生产仓储双读一致性计划、零差异阈值或 mock 回退策略尚未完整定义。",
        ),
        readinessCheck(
          "parityEvidencePlanDefined",
          databaseStatus.productionRepositoryParityEvidencePlan?.evidenceCoverage?.requiredSuccessfulRuns >= 3 &&
            databaseStatus.productionRepositoryParityEvidencePlan?.safety?.mismatchBlocksCutover
            ? "pass"
            : "blocked",
          "生产仓储双读证据、差异分类或差异阻断切换策略尚未完整定义。",
        ),
        readinessCheck(
          "dualWritePlanDefined",
          databaseStatus.productionRepositoryDualWritePlan?.mockPrimaryRequired &&
            databaseStatus.productionRepositoryDualWritePlan?.productionShadowWriteOnly
            ? "pass"
            : "blocked",
          "生产仓储双写演练、mock 主源或 production shadow-only 策略尚未完整定义。",
        ),
        readinessCheck(
          "shadowWriteEvidencePlanDefined",
          databaseStatus.productionRepositoryShadowWriteEvidencePlan?.safety?.idempotencyKeysRequired &&
            databaseStatus.productionRepositoryShadowWriteEvidencePlan?.safety?.rawPayloadNeverLogged
            ? "pass"
            : "blocked",
          "生产仓储影子写证据、幂等键或禁止原始 payload 审计策略尚未完整定义。",
        ),
        readinessCheck(
          "backupRestoreEvidencePlanDefined",
          databaseStatus.productionRepositoryBackupRestoreEvidencePlan?.evidenceCoverage?.restoreRunCountRequired >= 2 &&
            databaseStatus.productionRepositoryBackupRestoreEvidencePlan?.recoveryObjectives?.targetRpoMinutes <= 15 &&
            databaseStatus.productionRepositoryBackupRestoreEvidencePlan?.recoveryObjectives?.targetRtoMinutes <= 30 &&
            databaseStatus.productionRepositoryBackupRestoreEvidencePlan?.safety?.cutoverBlockedUntilRestoreVerified
            ? "pass"
            : "blocked",
          "生产仓储备份恢复证据、恢复次数或恢复验证前阻断切换策略尚未完整定义。",
        ),
        readinessCheck(
          "cutoverMonitoringEvidencePlanDefined",
          databaseStatus.productionRepositoryCutoverMonitoringEvidencePlan?.metricProbes?.some(
            (probe) => probe.rollbackOnBreach,
          ) && databaseStatus.productionRepositoryCutoverMonitoringEvidencePlan?.safety?.cutoverBlockedUntilMonitoringVerified
            ? "pass"
            : "blocked",
          "生产仓储切换监控、回滚指标或监控验证前阻断切换策略尚未完整定义。",
        ),
        readinessCheck(
          "rollbackRehearsalEvidencePlanDefined",
          databaseStatus.productionRepositoryRollbackRehearsalEvidencePlan?.rollbackObjectives?.minimumSuccessfulRollbackRuns >= 2 &&
            databaseStatus.productionRepositoryRollbackRehearsalEvidencePlan?.safety?.cutoverBlockedUntilRollbackVerified
            ? "pass"
            : "blocked",
          "生产仓储回滚演练证据、成功演练次数或回滚验证前阻断切换策略尚未完整定义。",
        ),
        readinessCheck(
          "cutoverAuditTrailEvidencePlanDefined",
          databaseStatus.productionRepositoryCutoverAuditTrailEvidencePlan?.auditEnvelope?.hashChainRequired &&
            databaseStatus.productionRepositoryCutoverAuditTrailEvidencePlan?.safety?.cutoverBlockedUntilAuditVerified
            ? "pass"
            : "blocked",
          "生产仓储切换审计链、hash 链或审计验证前阻断切换策略尚未完整定义。",
        ),
        readinessCheck(
          "manualCutoverPlanDefined",
          databaseStatus.productionRepositoryCutoverPlan?.featureFlag?.requiresManualApproval &&
            databaseStatus.productionRepositoryCutoverPlan?.safety?.noAutomaticSwitch
            ? "pass"
            : "blocked",
          "生产仓储 feature flag 切换、人工审批或禁止自动切换策略尚未完整定义。",
        ),
        readinessCheck(
          "driverSetupGuideDefined",
          databaseStatus.productionAdapter?.driverSetupPlan?.targetDriver === "pg" &&
            databaseStatus.productionAdapter?.driverSetupPlan?.canInstallAutomatically === false
            ? "pass"
            : "blocked",
          "生产数据库驱动接入计划、目标驱动或禁止自动安装策略尚未完整定义。",
        ),
        readinessCheck(
          "driverSmokeOrderDefined",
          databaseStatus.productionAdapter?.driverSetupPlan?.smokeOrder?.includes("readOnlyHealthPreflight") &&
            databaseStatus.productionAdapter?.driverSetupPlan?.smokeOrder?.includes("manualCutoverGate")
            ? "pass"
            : "blocked",
          "生产数据库驱动 smoke 顺序、只读探测或人工切换门禁尚未完整定义。",
        ),
        readinessCheck(
          "driverSecretBoundaryDefined",
          databaseStatus.productionAdapter?.driverSetupPlan?.secretBoundary?.redactsConnectionUrl &&
            databaseStatus.productionAdapter?.driverSetupPlan?.secretBoundary?.canReadDatabaseSecrets === false &&
            databaseStatus.productionAdapter?.driverSetupPlan?.secretBoundary?.forbiddenAuditFields?.includes("rawConnectionString")
            ? "pass"
            : "blocked",
          "生产数据库驱动密钥边界、连接串脱敏或禁止审计原始连接串策略尚未完整定义。",
        ),
        readinessCheck(
          "productionConnection",
          databaseStatus.productionAdapter?.connection?.configured ? "pass" : "blocked",
          "真实 PostgreSQL 连接配置仍缺失。",
        ),
        readinessCheck(
          "runtimeCutover",
          databaseStatus.repositoryRuntimeGuard?.canUseRequestedMode &&
            databaseStatus.productionRepositoryCutoverPlan?.status === "ready-for-manual-cutover"
            ? "pass"
            : "blocked",
          "真实 PostgreSQL 运行时切换仍未启用，生产仓储不能作为主数据源。",
        ),
      ],
    }),
    createReadinessItem({
      id: "auth-security",
      label: "生产认证",
      basePercent: 21,
      pointsPerPass: 5,
      sourceEndpoints: ["/api/auth/status", "/api/auth/provider-adapter"],
      fallbackBlocker: "仍需生产 IdP、MFA、邮箱验证、会话安全和凭证存储门禁落地。",
      checks: [
        readinessCheck("sampleAuthService", authStatus.status === "ready" ? "pass" : "blocked", "样例认证服务不可用。"),
        readinessCheck(
          "emailPasswordSample",
          authStatus.supportedMethods?.includes("emailPassword") ? "pass" : "blocked",
          "邮箱密码样例登录不可用。",
        ),
        readinessCheck(
          "passwordPolicy",
          complianceCheckStatus(authGate.checks || [], "passwordPolicy") === "pass" ? "pass" : "blocked",
          "生产密码策略尚未通过。",
        ),
        readinessCheck(
          "sessionPolicy",
          complianceCheckStatus(authGate.checks || [], "sessionPolicy") === "pass" ? "pass" : "blocked",
          "生产会话策略尚未通过。",
        ),
        readinessCheck(
          "credentialStoragePolicyDefined",
          authAdapter.credentialStoragePolicy?.requiredControls?.length >= 6 &&
            authAdapter.credentialStoragePolicy?.forbiddenStoredFields?.includes("plainPassword") &&
            authAdapter.credentialStoragePolicy?.requiresManagedSecretStore
            ? "pass"
            : "blocked",
          "生产凭证哈希、pepper、重置 token 哈希和禁止明文存储策略尚未完整定义。",
        ),
        readinessCheck(
          "sessionSecurityPolicyDefined",
          authAdapter.sessionSecurityPolicy?.requiredControls?.includes("refreshTokenRotation") &&
            authAdapter.sessionSecurityPolicy?.requiredControls?.includes("sessionRevocation") &&
            authAdapter.sessionSecurityPolicy?.forbiddenAuditFields?.includes("refreshToken")
            ? "pass"
            : "blocked",
          "生产会话轮换、复用检测、吊销和禁止 token 审计字段策略尚未完整定义。",
        ),
        readinessCheck(
          "csrfProtectionPolicyDefined",
          authAdapter.csrfProtectionPolicy?.requiredControls?.includes("csrfTokenBinding") &&
            authAdapter.csrfProtectionPolicy?.forbiddenRequestPatterns?.includes("wildcardCorsWithCredentials") &&
            authAdapter.csrfProtectionPolicy?.requiresReplayProtection
            ? "pass"
            : "blocked",
          "CSRF token、Origin/Referer 校验、CORS 白名单和重放防护策略尚未完整定义。",
        ),
        readinessCheck(
          "mfaPolicyDefined",
          authAdapter.mfaPolicy?.requiredControls?.includes("backupCodeHashing") &&
            authAdapter.mfaPolicy?.stepUpTriggers?.includes("highRiskLogin") &&
            authAdapter.mfaPolicy?.forbiddenStoredFields?.includes("totpSecretPlaintext")
            ? "pass"
            : "blocked",
          "MFA 注册、step-up、备用码哈希、恢复复核和禁止明文密钥策略尚未完整定义。",
        ),
        readinessCheck(
          "emailVerificationPolicyDefined",
          authAdapter.emailVerificationPolicy?.requiredControls?.includes("oneTimeVerificationToken") &&
            authAdapter.emailVerificationPolicy?.requiredControls?.includes("resendRateLimit") &&
            authAdapter.emailVerificationPolicy?.forbiddenAuditFields?.includes("verificationToken")
            ? "pass"
            : "blocked",
          "邮箱验证一次性 token、重发限流、邮箱变更复核和禁止 token 审计策略尚未完整定义。",
        ),
        readinessCheck(
          "oidcCallbackPolicyDefined",
          authAdapter.oidcCallbackPolicy?.requiredControls?.includes("pkceVerification") &&
            authAdapter.oidcCallbackPolicy?.forbiddenCallbackInputs?.includes("unvalidatedRedirectUri") &&
            authAdapter.oidcCallbackPolicy?.requiresProviderIssuerValidation
            ? "pass"
            : "blocked",
          "OIDC/OAuth 回调 redirect 白名单、state/nonce、PKCE、issuer 校验和重放防护策略尚未完整定义。",
        ),
        readinessCheck(
          "roleAuthorizationPolicyDefined",
          authAdapter.roleAuthorizationPolicy?.requiredControls?.includes("adminApprovalWorkflow") &&
            authAdapter.roleAuthorizationPolicy?.forbiddenRoleSources?.includes("demoLoginSelfEscalation") &&
            authAdapter.roleAuthorizationPolicy?.requiresDualApprovalForAdmin
            ? "pass"
            : "blocked",
          "生产角色 claims、服务端映射、管理员审批、角色过期和禁止客户端提权策略尚未完整定义。",
        ),
        readinessCheck(
          "loginRiskPolicyDefined",
          authAdapter.loginRiskPolicy?.requiredActions?.includes("stepUpMfa") &&
            authAdapter.loginRiskPolicy?.forbiddenAuditFields?.includes("password") &&
            authAdapter.loginRiskPolicy?.riskEngineRequired
            ? "pass"
            : "blocked",
          "异常登录风控、失败次数限制、step-up MFA 和禁止敏感字段审计策略尚未完整定义。",
        ),
        readinessCheck(
          "accountRecoveryPolicyDefined",
          authAdapter.accountRecoveryPolicy?.allowedFlows?.includes("verifiedEmailReset") &&
            authAdapter.accountRecoveryPolicy?.mfaResetRequiresManualReview &&
            authAdapter.accountRecoveryPolicy?.forbiddenFlows?.includes("silentMfaDisable")
            ? "pass"
            : "blocked",
          "账号恢复、密码重置、MFA 重置人工复核和禁止不安全恢复流程策略尚未完整定义。",
        ),
        readinessCheck(
          "auditLoggingPolicyDefined",
          authAdapter.auditLoggingPolicy?.requiredEventTypes?.includes("auth.mfaChallenge") &&
            authAdapter.auditLoggingPolicy?.requiredControls?.includes("tamperEvidentHashChain") &&
            authAdapter.auditLoggingPolicy?.forbiddenAuditFields?.includes("refreshToken") &&
            authAdapter.auditLoggingPolicy?.requiresPrivilegedExportApproval
            ? "pass"
            : "blocked",
          "认证审计事件、脱敏、哈希链、留存和导出审批策略尚未完整定义。",
        ),
        readinessCheck(
          "privacyConsentPolicyDefined",
          authAdapter.privacyConsentPolicy?.requiredControls?.includes("explicitConsentVersion") &&
            authAdapter.privacyConsentPolicy?.requiredControls?.includes("consentWithdrawalPath") &&
            authAdapter.privacyConsentPolicy?.forbiddenBehaviors?.includes("silentConsentUpgrade") &&
            authAdapter.privacyConsentPolicy?.requiresLegalReviewBeforeProduction
            ? "pass"
            : "blocked",
          "账号隐私、用户同意、地区披露和撤回路径策略尚未完整定义。",
        ),
        readinessCheck("rolePolicy", authStatus.rolePolicy?.status === "ready" ? "pass" : "blocked", "角色策略样例不可用。"),
        readinessCheck(
          "productionProvider",
          authAdapter.canUseProductionAuth ? "pass" : "blocked",
          "生产认证 provider、MFA、邮箱验证、CSRF、OIDC 或审计门禁仍未通过。",
        ),
      ],
    }),
    createReadinessItem({
      id: "compliance-release",
      label: "合规发布",
      basePercent: 17,
      pointsPerPass: 4,
      sourceEndpoints: ["/api/compliance/status"],
      fallbackBlocker: "仍需地区合规、披露版本、适当性执行和持牌复核确认。",
      checks: [
        readinessCheck(
          "disclaimerPresence",
          complianceCheckStatus(complianceGate.checks || [], "disclaimerPresence") === "pass" ? "pass" : "blocked",
          "免责声明展示规则尚未通过。",
        ),
        readinessCheck(
          "probabilityLanguage",
          complianceCheckStatus(complianceGate.checks || [], "probabilityLanguage") === "pass" ? "pass" : "blocked",
          "模型参考概率表达规则尚未通过。",
        ),
        readinessCheck(
          "prohibitedClaims",
          complianceCheckStatus(complianceGate.checks || [], "prohibitedClaims") === "pass" ? "pass" : "blocked",
          "禁止收益承诺表达规则尚未通过。",
        ),
        readinessCheck(
          "requiredDisclaimerPolicyDefined",
          typeof complianceStatus.requiredDisclaimer === "string" &&
            complianceStatus.requiredDisclaimer.includes("不构成任何投资建议") &&
            complianceStatus.capabilities?.includes("requiredDisclaimer")
            ? "pass"
            : "blocked",
          "固定免责声明文本或合规能力声明尚未完整定义。",
        ),
        readinessCheck(
          "suitabilityQuestionnairePolicyDefined",
          complianceStatus.suitabilityPolicy?.version === suitabilityVersion &&
            complianceStatus.suitabilityPolicy?.requiredFields?.includes("liquidityNeed") &&
            complianceStatus.suitabilityPolicy?.blocksPublicReleaseWithoutReview
            ? "pass"
            : "blocked",
          "适当性问卷版本、风险画像字段和发布前复核策略尚未完整定义。",
        ),
        readinessCheck(
          "riskAcknowledgementPolicyDefined",
          complianceStatus.acknowledgementPolicy?.version === "compliance-ack-v0" &&
            complianceStatus.acknowledgementPolicy?.recordsDisclosureVersion &&
            complianceStatus.acknowledgementPolicy?.requiresRiskAcknowledgement
            ? "pass"
            : "blocked",
          "风险确认版本、披露版本记录或必填确认策略尚未完整定义。",
        ),
        readinessCheck(
          "suitabilityEnforcementPolicyDefined",
          complianceStatus.suitabilityEnforcementPolicy?.requiredRules?.includes("lowRiskBlocksAggressiveSignals") &&
            complianceStatus.suitabilityEnforcementPolicy?.fallbackMode === "general-education-no-personalized-action" &&
            complianceStatus.suitabilityEnforcementPolicy?.requiresUserVisibleReason
            ? "pass"
            : "blocked",
          "适当性执行规则、教育模式回退或用户可见原因策略尚未完整定义。",
        ),
        readinessCheck(
          "jurisdictionEnforcementPolicyDefined",
          complianceStatus.jurisdictionEnforcementPolicy?.requiredRules?.includes("detectUserJurisdiction") &&
            complianceStatus.jurisdictionEnforcementPolicy?.restrictedJurisdictions?.includes("unknown") &&
            complianceStatus.jurisdictionEnforcementPolicy?.requiresLegalReviewPerJurisdiction
            ? "pass"
            : "blocked",
          "地区识别、受限地区回退、本地化披露和逐地区法律复核策略尚未完整定义。",
        ),
        readinessCheck(
          "jurisdictionFallbackPolicyDefined",
          complianceStatus.jurisdictionEnforcementPolicy?.fallbackMode === "education-only-no-personalized-analysis" &&
            complianceStatus.jurisdictionEnforcementPolicy?.requiresGeoConsentNotice &&
            complianceStatus.jurisdictionEnforcementPolicy?.supportedJurisdictions?.includes("AU")
            ? "pass"
            : "blocked",
          "地区未知回退、地理同意提示或支持地区策略尚未完整定义。",
        ),
        readinessCheck(
          "disclosureVersioningPolicyDefined",
          complianceStatus.disclosureVersioningPolicy?.requiredControls?.includes("immutableDisclosureVersion") &&
            complianceStatus.disclosureVersioningPolicy?.requiredControls?.includes("legalApprovalBeforeRelease") &&
            complianceStatus.disclosureVersioningPolicy?.requiresUserReAcknowledgement
            ? "pass"
            : "blocked",
          "披露版本、变更记录、法律批准、回滚和用户重新确认策略尚未完整定义。",
        ),
        readinessCheck(
          "disclosureChangeControlDefined",
          complianceStatus.disclosureVersioningPolicy?.materialChangeTriggers?.includes("riskWarningTextChange") &&
            complianceStatus.disclosureVersioningPolicy?.requiredControls?.includes("rollbackDisclosureVersion") &&
            complianceStatus.disclosureVersioningPolicy?.requiresAuditTrail
            ? "pass"
            : "blocked",
          "披露重大变更触发、回滚版本或审计链策略尚未完整定义。",
        ),
        readinessCheck(
          "licensedAdviserReviewPolicyDefined",
          complianceStatus.licensedAdviserReviewPolicy?.requiredTriggers?.includes("strongBuySellLanguage") &&
            complianceStatus.licensedAdviserReviewPolicy?.reviewerRoles?.includes("licensed-adviser") &&
            complianceStatus.licensedAdviserReviewPolicy?.requiresUserVisiblePendingState
            ? "pass"
            : "blocked",
          "持牌复核触发条件、复核角色、SLA、利益冲突披露和等待态策略尚未完整定义。",
        ),
        readinessCheck(
          "licensedAdviserEscalationPolicyDefined",
          complianceStatus.licensedAdviserReviewPolicy?.requiredTriggers?.includes("lowConfidenceHighImpact") &&
            complianceStatus.licensedAdviserReviewPolicy?.requiresConflictDisclosure &&
            complianceStatus.licensedAdviserReviewPolicy?.requiresReviewAuditTrail
            ? "pass"
            : "blocked",
          "持牌复核升级、利益冲突披露或复核审计策略尚未完整定义。",
        ),
        readinessCheck(
          "legalReviewPreflightPlanDefined",
          complianceStatus.legalReviewPreflightPlan?.mode === "dry-run-no-legal-approval" &&
            complianceStatus.legalReviewPreflightPlan?.evidenceEnvelope?.requiredFields?.length >= 8 &&
            complianceStatus.legalReviewPreflightPlan?.evidenceEnvelope?.forbiddenFields?.includes("modelApiKey") &&
            complianceStatus.legalReviewPreflightPlan?.canMarkLegalReviewed === false
            ? "pass"
            : "blocked",
          "法律复核预检证据 envelope、禁止敏感字段或禁止标记真实复核策略尚未完整定义。",
        ),
        readinessCheck(
          "publicReleaseEvidencePackageDefined",
          complianceStatus.publicReleaseEvidencePackage?.mode === "dry-run-no-public-release" &&
            complianceStatus.publicReleaseEvidencePackage?.requiredSections?.length >= 7 &&
            complianceStatus.publicReleaseEvidencePackage?.releaseBlockersThatMustRemainBlocked?.includes("publicReleaseGate") &&
            complianceStatus.publicReleaseEvidencePackage?.canReleasePublicAnalysis === false
            ? "pass"
            : "blocked",
          "公开发布证据包、必备章节或保持公开发布阻断策略尚未完整定义。",
        ),
        readinessCheck(
          "riskAcknowledgement",
          complianceCheckStatus(complianceGate.checks || [], "riskAcknowledgement") === "pass" ? "pass" : "blocked",
          "用户风险确认和披露版本记录尚未完成。",
        ),
        readinessCheck(
          "legalReview",
          complianceCheckStatus(complianceGate.checks || [], "legalReview") === "pass" ? "pass" : "blocked",
          "真实法律/合规复核尚未完成。",
        ),
        readinessCheck(
          "publicReleaseGate",
          complianceGate.canReleasePublicAnalysis ? "pass" : "blocked",
          "公开发布总门禁仍未通过，不能向社会发布真实个性化分析。",
        ),
      ],
    }),
    createReadinessItem({
      id: "deployment-ops",
      label: "部署运维",
      basePercent: 16,
      pointsPerPass: 3,
      sourceEndpoints: ["/api/job-services", "/api/scheduler/status", "/api/notification-services", "/api/audit/status"],
      fallbackBlocker: "仍需托管环境、监控告警、日志留存、密钥管理和发布回滚流程。",
      checks: [
        readinessCheck("jobRunner", jobRunnerStatus.status === "ready" ? "pass" : "blocked", "任务运行器样例不可用。"),
        readinessCheck("scheduler", schedulerStatus.status === "ready" ? "pass" : "blocked", "调度器样例不可用。"),
        readinessCheck(
          "notificationOutbox",
          notificationStatus.status === "ready" ? "pass" : "blocked",
          "通知 outbox 样例不可用。",
        ),
        readinessCheck(
          "auditIntegrity",
          auditStatus.capabilities?.includes("hashChainIntegrity") ? "pass" : "blocked",
          "审计 hash 链能力不可用。",
        ),
        readinessCheck(
          "notificationReceiptPolicyDefined",
          notificationStatus.providerAdapter?.receiptPolicy?.requiredEvents?.includes("delivered") &&
            notificationStatus.providerAdapter?.receiptPolicy?.webhookSignatureRequired &&
            notificationStatus.providerAdapter?.receiptPolicy?.forbiddenAuditFields?.includes("emailAddress")
            ? "pass"
            : "blocked",
          "通知投递回执、webhook 验签和脱敏审计字段策略尚未完整定义。",
        ),
        readinessCheck(
          "notificationSuppressionPolicyDefined",
          notificationStatus.providerAdapter?.suppressionPolicy?.suppressesUnsubscribedChannels &&
            notificationStatus.providerAdapter?.suppressionPolicy?.suppressesPrivacyErasedUsers &&
            notificationStatus.providerAdapter?.suppressionPolicy?.requiresChannelScopedOptOut
            ? "pass"
            : "blocked",
          "通知退订、硬反弹、隐私删除用户和渠道级 opt-out 抑制策略尚未完整定义。",
        ),
        readinessCheck(
          "notificationBounceHandlingPolicyDefined",
          notificationStatus.providerAdapter?.bounceHandlingPolicy?.hardBounceAction === "suppress-channel-and-audit" &&
            notificationStatus.providerAdapter?.bounceHandlingPolicy?.complaintAction === "suppress-all-external-and-audit" &&
            notificationStatus.providerAdapter?.bounceHandlingPolicy?.manualReviewRequiredForComplaint
            ? "pass"
            : "blocked",
          "通知硬反弹、软反弹、投诉处理和人工复核策略尚未完整定义。",
        ),
        readinessCheck(
          "notificationWebhookPreflightDefined",
          notificationStatus.providerAdapter?.webhookReceiptVerificationPlan?.timestampToleranceSeconds === 300 &&
            notificationStatus.providerAdapter?.webhookReceiptVerificationPlan?.requiresProviderEventId &&
            notificationStatus.providerAdapter?.webhookReceiptVerificationPlan?.forbiddenAuditFields?.includes("rawPayload")
            ? "pass"
            : "blocked",
          "通知回执 webhook 时间窗、重放防护、provider event id 幂等和禁止原始载荷审计策略尚未完整定义。",
        ),
        readinessCheck(
          "externalDeliveryPreflightDefined",
          notificationStatus.providerAdapter?.externalDeliveryPreflightPlan?.mode === "dry-run-no-external-send" &&
            notificationStatus.providerAdapter?.externalDeliveryPreflightPlan?.requestEnvelope?.requiredFields?.includes("idempotencyKey") &&
            notificationStatus.providerAdapter?.externalDeliveryPreflightPlan?.requestEnvelope?.forbiddenFields?.includes("rawMessageBody") &&
            notificationStatus.providerAdapter?.externalDeliveryPreflightPlan?.rollback?.fallbackService === "mock-notification-outbox"
            ? "pass"
            : "blocked",
          "外部通知投递人工预检、请求 envelope、敏感字段排除或 mock outbox 回退策略尚未完整定义。",
        ),
        readinessCheck(
          "schedulerQueuePolicyDefined",
          schedulerStatus.providerAdapter?.queuePolicy?.requiresIdempotencyKey &&
            schedulerStatus.providerAdapter?.queuePolicy?.deadLetterQueueRequired &&
            schedulerStatus.providerAdapter?.queuePolicy?.maxAttempts >= 3
            ? "pass"
            : "blocked",
          "调度队列幂等 key、重试退避、死信队列和最大尝试次数策略尚未完整定义。",
        ),
        readinessCheck(
          "schedulerRunSafetyPolicyDefined",
          schedulerStatus.providerAdapter?.runSafetyPolicy?.requiresCronSignature &&
            schedulerStatus.providerAdapter?.runSafetyPolicy?.blocksOverlappingRuns &&
            schedulerStatus.providerAdapter?.runSafetyPolicy?.requiresAuditTrail
            ? "pass"
            : "blocked",
          "调度 cron 签名、并发限制、阻止重叠运行和审计链策略尚未完整定义。",
        ),
        readinessCheck(
          "schedulerBackpressurePolicyDefined",
          schedulerStatus.providerAdapter?.backpressurePolicy?.maxQueueDepth >= 1000 &&
            schedulerStatus.providerAdapter?.backpressurePolicy?.pauseLowPriorityJobs &&
            schedulerStatus.providerAdapter?.backpressurePolicy?.alertRoutesRequired
            ? "pass"
            : "blocked",
          "调度队列深度、延迟阈值、低优先级暂停和告警路由策略尚未完整定义。",
        ),
        readinessCheck(
          "schedulerWorkerAuthRunbookDefined",
          schedulerStatus.providerAdapter?.workerAuthPolicy?.requiresHmacSignature &&
            schedulerStatus.providerAdapter?.workerAuthPolicy?.nonceRequired &&
            schedulerStatus.providerAdapter?.workerAuthPolicy?.rotatesSecrets &&
            schedulerStatus.providerAdapter?.runbookPolicy?.requiredRunbooks?.includes("dlq-replay") &&
            schedulerStatus.providerAdapter?.runbookPolicy?.manualApprovalRequiredForReplay
            ? "pass"
            : "blocked",
          "调度 worker HMAC、nonce、防重放、密钥轮换和 runbook 审批策略尚未完整定义。",
        ),
        readinessCheck(
          "backgroundWorkerPreflightDefined",
          schedulerStatus.providerAdapter?.backgroundWorkerPreflightPlan?.mode === "dry-run-no-worker-start" &&
            schedulerStatus.providerAdapter?.backgroundWorkerPreflightPlan?.requestEnvelope?.requiredFields?.includes("signature") &&
            schedulerStatus.providerAdapter?.backgroundWorkerPreflightPlan?.requestEnvelope?.forbiddenFields?.includes("workerSecret") &&
            schedulerStatus.providerAdapter?.backgroundWorkerPreflightPlan?.rollback?.fallbackService === "manual-due-job-check"
            ? "pass"
            : "blocked",
          "后台 worker 人工预检、签名 envelope、敏感字段排除或手动任务回退策略尚未完整定义。",
        ),
        readinessCheck(
          "notificationObservabilityEvidenceDefined",
          notificationStatus.providerAdapter?.observabilityEvidencePackage?.mode === "dry-run-no-observability-cutover" &&
            notificationStatus.providerAdapter?.observabilityEvidencePackage?.requiredSignals?.length >= 8 &&
            notificationStatus.providerAdapter?.observabilityEvidencePackage?.forbiddenAlertFields?.includes("rawMessageBody") &&
            notificationStatus.providerAdapter?.observabilityEvidencePackage?.canEnableExternalDelivery === false
            ? "pass"
            : "blocked",
          "通知投递可观测性证据包、告警阈值或保持外部投递阻断策略尚未完整定义。",
        ),
        readinessCheck(
          "schedulerIncidentResponseDrillDefined",
          schedulerStatus.providerAdapter?.incidentResponseDrillPackage?.mode === "dry-run-no-worker-incident-cutover" &&
            schedulerStatus.providerAdapter?.incidentResponseDrillPackage?.requiredDrills?.length >= 8 &&
            schedulerStatus.providerAdapter?.incidentResponseDrillPackage?.releaseBlockersThatMustRemainBlocked?.includes("backgroundWorkers") &&
            schedulerStatus.providerAdapter?.incidentResponseDrillPackage?.canEnableBackgroundWorkers === false
            ? "pass"
            : "blocked",
          "调度事故响应演练包、回滚控制或保持后台 worker 阻断策略尚未完整定义。",
        ),
        readinessCheck(
          "externalDelivery",
          notificationStatus.providerAdapter?.canUseExternalDelivery ? "pass" : "blocked",
          "真实外部推送、邮件、短信、微信或 Telegram delivery provider 仍未启用。",
        ),
        readinessCheck(
          "backgroundWorkers",
          schedulerStatus.providerAdapter?.canUseBackgroundWorkers ? "pass" : "blocked",
          "真实后台 worker、托管环境、监控告警和回滚流程仍未启用。",
        ),
      ],
    }),
  ];
}

function computedProjectProgress(repository) {
  const readiness = computedProjectReadiness(repository);
  const readinessAverage = readiness.length
    ? readiness.reduce((sum, item) => sum + item.percent, 0) / readiness.length
    : 0;
  const launchFoundationCredit = 0;
  const uncappedPublicLaunchPercent = Number((readinessAverage + launchFoundationCredit).toFixed(1));
  const hasReleaseBlockers = readiness.some((item) => item.status !== "ready");
  const publicLaunchPercent = hasReleaseBlockers
    ? Math.min(80, uncappedPublicLaunchPercent)
    : Math.min(100, uncappedPublicLaunchPercent);
  return {
    ...projectProgress,
    publicLaunchPercent,
    readiness,
    readinessEvidence: {
      mode: "computed-from-backend-status",
      readinessAverage: Number(readinessAverage.toFixed(1)),
      launchFoundationCredit,
      uncappedPublicLaunchPercent,
      capApplied: publicLaunchPercent !== uncappedPublicLaunchPercent,
      cappedAt: hasReleaseBlockers ? 80 : 100,
      capReason: hasReleaseBlockers
        ? "正式上线仍有 blocked 分项，公开上线进度最高显示 80%。"
        : "",
      formula: "publicLaunchPercent = min(cap, average(readiness.percent) + launchFoundationCredit)",
      sourceEndpoints: [...new Set(readiness.flatMap((item) => item.evidence.sourceEndpoints))],
    },
  };
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, x-worker-secret, x-worker-signature, x-worker-timestamp, x-worker-nonce",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function errorResponse(response, statusCode, code, message) {
  jsonResponse(response, statusCode, { error: { code, message } });
}

function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function safeParseUrlHostname(value = "") {
  try {
    return new URL(value || "http://localhost").hostname;
  } catch {
    return "";
  }
}

function readPublicPreviewRuntimeStatus(env = process.env, now = Date.now) {
  const statusFile = env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE || defaultPublicPreviewStatusPath;
  const staleAfterMs = Number(env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_STALE_AFTER_MS) || 5 * 60 * 1000;
  try {
    const payload = JSON.parse(readFileSync(statusFile, "utf8"));
    const updatedAtMs = Date.parse(payload.updatedAt || "");
    const ageMs = Number.isFinite(updatedAtMs) ? Math.max(0, now() - updatedAtMs) : Infinity;
    const stale = !Number.isFinite(ageMs) || ageMs > staleAfterMs;
    const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl : "";
    const localFallbackUrl =
      typeof payload.localFallbackUrl === "string" ? payload.localFallbackUrl : "http://127.0.0.1:4192";
    const carriesRecentHealthyEvidence =
      payload.status === "checking" &&
      Number(payload.healthWindowMs) >= 180000 &&
      Number(payload.healthIterationCount) > 0 &&
      Boolean(payload.healthEndedAt) &&
      !payload.lastFailure;
    return {
      ok:
        ((payload.status === "healthy" && Boolean(publicUrl)) ||
          (carriesRecentHealthyEvidence && Boolean(publicUrl))) &&
        !stale,
      status: typeof payload.status === "string" ? payload.status : "unknown",
      publicUrl,
      localFallbackUrl,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : "",
      stale,
      ageSeconds: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
      healthCycleCount: Number(payload.healthCycleCount) || 0,
      healthMaxConsecutiveFailures: Number(payload.healthMaxConsecutiveFailures) || 2,
      healthWindowSeconds: Number(payload.healthWindowMs) ? Math.round(Number(payload.healthWindowMs) / 1000) : 0,
      healthIntervalSeconds: Number(payload.healthIntervalMs) ? Math.round(Number(payload.healthIntervalMs) / 1000) : 0,
      healthTimeoutSeconds: Number(payload.healthTimeoutMs) ? Math.round(Number(payload.healthTimeoutMs) / 1000) : 0,
      healthRequiredEndpoints: Array.isArray(payload.healthRequiredEndpoints)
        ? payload.healthRequiredEndpoints.filter((item) => typeof item === "string")
        : [],
      healthIterationCount: Number(payload.healthIterationCount) || 0,
      healthStartedAt: typeof payload.healthStartedAt === "string" ? payload.healthStartedAt : "",
      healthEndedAt: typeof payload.healthEndedAt === "string" ? payload.healthEndedAt : "",
      restartCount: Number(payload.restartCount) || 0,
      standbyPromotionCount: Number(payload.standbyPromotionCount) || 0,
      standbyPublicUrls: Array.isArray(payload.standbyPublicUrls)
        ? payload.standbyPublicUrls
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              url: typeof item.url === "string" ? item.url : "",
              status: typeof item.status === "string" ? item.status : "unknown",
              role: typeof item.role === "string" ? item.role : "standby",
              checkedAt: typeof item.checkedAt === "string" ? item.checkedAt : "",
              healthWindowSeconds: Number(item.healthWindowMs) ? Math.round(Number(item.healthWindowMs) / 1000) : 0,
              healthIterationCount: Number(item.healthIterationCount) || 0,
              transientFailureCount: Number(item.transientFailureCount) || 0,
              lastFailure: item.lastFailure || null,
              localFallbackOk:
                item.localFallbackOk === undefined || item.localFallbackOk === null
                  ? null
                  : Boolean(item.localFallbackOk),
              guidance: typeof item.guidance === "string" ? item.guidance : "",
            }))
            .slice(0, 3)
        : [],
      transientFailureCount: Number(payload.transientFailureCount) || 0,
      lastFailure: payload.lastFailure || null,
      localFallbackOk:
        payload.localFallbackOk === undefined || payload.localFallbackOk === null
          ? null
          : Boolean(payload.localFallbackOk),
      guidance:
        typeof payload.guidance === "string" && payload.guidance.trim()
          ? payload.guidance.trim()
          : payload.status === "healthy" && !stale
            ? "当前临时公网入口健康。"
            : "公网入口状态未确认，请使用本机备用或重启 supervisor。",
    };
  } catch (error) {
    return {
      ok: false,
      status: "missing",
      publicUrl: "",
      localFallbackUrl: env.FINANCE_AI_PUBLIC_PREVIEW_LOCAL_URL || "http://127.0.0.1:4192",
      updatedAt: "",
      stale: true,
      ageSeconds: null,
      healthCycleCount: 0,
      healthMaxConsecutiveFailures: 2,
      healthWindowSeconds: 0,
      healthIntervalSeconds: 0,
      healthTimeoutSeconds: 0,
      healthRequiredEndpoints: [],
      healthIterationCount: 0,
      healthStartedAt: "",
      healthEndedAt: "",
      restartCount: 0,
      standbyPromotionCount: 0,
      standbyPublicUrls: [],
      transientFailureCount: 0,
      lastFailure: null,
      localFallbackOk: null,
      guidance: `未找到公网 watchdog 状态：${error?.message || error}。`,
    };
  }
}

function publicPreviewAccessStatus(request, env = process.env) {
  const status = readPublicPreviewRuntimeStatus(env);
  const host = String(headerValue(request.headers, "host") || "");
  const forwardedProto = String(headerValue(request.headers, "x-forwarded-proto") || "");
  const proto = forwardedProto || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  const currentOrigin = host ? `${proto}://${host}` : "";
  const fixedHostingUrl = env.FINANCE_AI_STABLE_PUBLIC_URL || env.FINANCE_AI_FIXED_PUBLIC_URL || "";
  const fixedHealthGatePassedAt = env.FINANCE_AI_STABLE_HEALTH_GATE_PASSED_AT || "";
  const fixedHealthGatePassed =
    env.FINANCE_AI_STABLE_HEALTH_GATE_PASSED === "true" || Boolean(fixedHealthGatePassedAt);
  const currentHostname = safeParseUrlHostname(currentOrigin);
  const statusHostname = safeParseUrlHostname(status.publicUrl);
  const isTemporaryTunnel = [currentHostname, statusHostname].some((hostname) => /\.lhr\.life$/i.test(hostname));
  const currentPublicOrigin = Boolean(
    currentOrigin &&
      currentHostname &&
      !["localhost", "127.0.0.1", "::1"].includes(currentHostname) &&
      !currentHostname.endsWith(".local"),
  );
  const publicReachable = status.ok || currentPublicOrigin;
  const publicAccessUrl = status.publicUrl || (currentPublicOrigin ? currentOrigin : "");
  const healthRequiredEndpoints = Array.isArray(status.healthRequiredEndpoints) ? status.healthRequiredEndpoints : [];
  const requiredEndpoints = [
    "/",
    "/health",
    "/api/health",
    "/api/analysis?symbol=MSFT&riskProfile=balanced",
    "/api/stocks/search?q=Microsoft",
  ];
  const requiredEndpointCoverage = requiredEndpoints.every((path) => healthRequiredEndpoints.includes(path));
  const monitorWindowSeconds = Number(status.healthWindowSeconds || 0);
  const monitorIterationCount = Number(status.healthIterationCount || 0);
  const standbyReadyCount = status.standbyPublicUrls.filter((entry) => entry.status === "healthy").length;
  const standbyConfiguredCount = status.standbyPublicUrls.filter((entry) => entry.url).length;
  const standbyRequirementPassed = standbyReadyCount >= 1;
  const continuousHealthPassed =
    status.ok &&
    monitorWindowSeconds >= 180 &&
    monitorIterationCount > 0 &&
    requiredEndpointCoverage &&
    !status.lastFailure;
  const temporaryAccessContinuouslyReady = publicReachable && continuousHealthPassed && standbyRequirementPassed;
  const stableHostingConfigured = Boolean(fixedHostingUrl);
  const stableExternalReady = Boolean(fixedHostingUrl && fixedHealthGatePassed);
  const recommendedAccess = publicReachable
    ? {
        mode: "public",
        url: publicAccessUrl,
        label: status.ok ? "当前公网临时入口" : "当前公网入口可达",
        reason: status.ok
          ? "当前页面和 watchdog 记录显示临时公网入口可用。"
          : "当前页面已通过公网入口访问到后端；watchdog 连续健康确认仍在等待。",
      }
    : {
        mode: "local-fallback",
        url: status.localFallbackUrl,
        label: "本机备用入口",
        reason: "临时公网入口未确认健康，请优先使用本机备用或重启 supervisor 获取新链接。",
      };
  const accessEntries = [
    {
      id: "fixed-hosting",
      label: "固定线上测试环境",
      url: fixedHostingUrl,
      status: stableExternalReady ? "ready" : stableHostingConfigured ? "needs-health-gate" : "missing",
      available: stableExternalReady,
      external: true,
      scope: "外部稳定测试",
      warning: stableExternalReady ? "" : "尚未完成固定托管和连续健康门禁。",
      nextStep: stableExternalReady
        ? "可作为外部稳定测试入口，仍需定期复测。"
        : "创建 Render/Vercel/Netlify 固定服务并运行 2-3 分钟连续验收。",
    },
    {
      id: "temporary-public",
      label: "当前公网临时入口",
      url: publicAccessUrl,
      status: publicReachable
        ? continuousHealthPassed
            ? "ready-temporary"
            : status.status === "checking"
              ? "checking"
            : "reachable-unverified"
        : "unhealthy",
      available: publicReachable,
      external: true,
      scope: "短时间外部测试",
      warning: isTemporaryTunnel ? "lhr.life 是临时隧道，可能轮换或返回 503 / no tunnel here :(。" : "",
      nextStep: publicReachable
        ? continuousHealthPassed
          ? "已通过上一轮连续健康检查；watchdog 会继续监控，主入口掉线时使用备用链接。"
          : status.status === "checking"
          ? "正在进行连续健康检查；完成前只适合短时间测试。"
          : "可短时间测试；正式演示前仍需连续健康检查。"
        : "重启 public-preview supervisor 获取新的临时公网链接。",
    },
    ...status.standbyPublicUrls
      .filter((entry) => entry.url)
      .map((entry, index) => ({
        id: `standby-public-${index + 1}`,
        label: `备用公网临时入口 ${index + 1}`,
        url: entry.url,
        status: entry.status === "healthy" ? "ready-standby" : entry.status || "unknown",
        available: entry.status === "healthy",
        external: true,
        scope: "短时间外部备用",
        warning: "备用 lhr.life 仍是临时隧道，只用于主入口掉线后的短期恢复。",
        nextStep:
          entry.status === "healthy"
            ? "主公网入口掉线时可临时切换到这个备用链接。"
            : "等待 standby watchdog 重新检查或重建备用链接。",
      })),
    {
      id: "local-fallback",
      label: "本机备用入口",
      url: status.localFallbackUrl,
      status:
        status.localFallbackOk === true
          ? "healthy"
          : status.localFallbackOk === false
            ? "unhealthy"
            : "unknown",
      available: status.localFallbackOk === true,
      external: false,
      scope: "仅本机/同一台电脑",
      warning: "外部用户不能访问 127.0.0.1。",
      nextStep:
        status.localFallbackOk === true
          ? "公网掉线时用于继续开发和排查。"
          : status.localFallbackOk === false
            ? "先启动本机 public preview 服务，确认 /health 返回 200。"
            : "等待 watchdog 完成本机备用健康检查。",
    },
  ];

  return {
    status: status.ok ? "healthy" : status.status === "checking" ? "checking" : currentPublicOrigin ? "reachable-unverified" : "degraded",
    currentOrigin,
    recommendedAccess,
    accessEntries,
    temporaryTunnel: {
      enabled: isTemporaryTunnel,
      provider: isTemporaryTunnel ? "localhost.run lhr.life" : "",
      warning: isTemporaryTunnel
        ? "这是临时隧道，可能轮换或返回 503 / no tunnel here :(。"
        : "",
    },
    watchdog: status,
    stableHosting: {
      configured: stableHostingConfigured,
      url: fixedHostingUrl,
      status: fixedHostingUrl ? "configured" : "not-configured",
      nextStep: fixedHostingUrl
        ? fixedHealthGatePassed
          ? "固定网址已标记通过连续健康检查；仍需定期复测。"
          : "正式演示前对固定网址运行 2-3 分钟连续健康检查。"
        : "仍需部署 Render/Vercel/Netlify 或同类固定线上测试环境。",
      healthGatePassed: fixedHealthGatePassed,
      healthGatePassedAt: fixedHealthGatePassedAt,
      releaseReady: stableExternalReady,
    },
    localFallback: {
      url: status.localFallbackUrl,
      status: status.localFallbackOk === true ? "healthy" : status.localFallbackOk === false ? "unhealthy" : "unknown",
      note: "仅适用于本机或同一台电脑测试，外部用户不能直接访问 127.0.0.1。",
    },
    healthGate: {
      durationSeconds: 180,
      intervalSeconds: 15,
      lastWindowSeconds: monitorWindowSeconds,
      lastIterationCount: monitorIterationCount,
      lastStartedAt: status.healthStartedAt,
      lastEndedAt: status.healthEndedAt,
      lastFailureType: status.lastFailure?.failureType || "",
      requiredEndpointCoverage,
      requiredEndpoints,
      standbyReadyCount,
      standbyConfiguredCount,
      standbyRequirementPassed,
      requirement: "正式演示前关键端点需在 2-3 分钟窗口内持续 200。",
    },
    stabilityGate: {
      externalUseReady: stableExternalReady,
      temporaryAccessReady: publicReachable,
      temporaryAccessContinuouslyReady,
      standbyReadyCount,
      standbyConfiguredCount,
      standbyRequirementPassed,
      stableHostedUrl: Boolean(fixedHostingUrl),
      temporaryTunnel: isTemporaryTunnel,
      continuousHealthPassed,
      requiredDurationSeconds: 180,
      monitorWindowSeconds,
      monitorIterationCount,
      requiredEndpointCoverage,
      lastFailureType: status.lastFailure?.failureType || "",
      blockers: [
        ...(isTemporaryTunnel ? ["当前入口仍是临时 lhr.life 隧道，可能轮换或返回 503。"] : []),
        ...(fixedHostingUrl ? [] : ["尚未配置固定线上测试环境。"]),
        ...(continuousHealthPassed ? [] : ["临时公网入口尚未完成覆盖关键端点的 2-3 分钟连续健康检查。"]),
        ...(standbyRequirementPassed ? [] : ["备用临时入口尚未确认至少 1 个健康链接。"]),
        ...(status.lastFailure?.failureType ? [`最近公网失败类型：${status.lastFailure.failureType}。`] : []),
        ...(fixedHealthGatePassed ? [] : ["固定网址尚未通过 2-3 分钟连续健康检查。"]),
      ],
      userMessage: fixedHostingUrl && fixedHealthGatePassed
        ? "固定线上入口已通过稳定访问门禁。"
        : "当前只能作为临时测试入口；稳定外部演示仍需固定托管和连续健康门禁。",
    },
    nextSteps: publicReachable
      ? [
      "短时间测试可使用当前公网入口。",
          continuousHealthPassed
            ? "watchdog 已确认连续健康；正式演示前仍建议再跑 2-3 分钟健康检查。"
            : "watchdog 连续健康确认仍在等待；正式演示前先跑 2-3 分钟健康检查。",
          "发布给外部用户前仍应迁移到固定托管。",
          "若看到 503 / no tunnel here :(，请使用最新状态入口或重启 supervisor。",
        ]
      : [
          "使用本机备用入口继续排查。",
          "重启 public-preview supervisor 获取新的 lhr.life 链接。",
          "部署固定线上测试环境解决临时隧道掉线问题。",
        ],
  };
}

function isLocalAiConfigRequest(request = {}) {
  const explicitTestHeader = headerValue(request.headers, "x-local-ai-config");
  if (explicitTestHeader === "allow") return true;
  const host = String(headerValue(request.headers, "host") || "").toLowerCase();
  return (
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1:") ||
    host === "127.0.0.1" ||
    host.startsWith("[::1]:") ||
    host === "::1"
  );
}

function cleanModelConfigValue(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeModelSlot(value) {
  const slot = cleanModelConfigValue(value, "primary");
  return ["primary", "fallback", "fallback2", "fallback3"].includes(slot) ? slot : "primary";
}

function modelSlotRuntimeEnv(slot, { provider, apiKey, modelId, baseUrl, apiStyle }) {
  if (slot === "fallback") {
    return {
      FINANCE_AI_MODEL_FALLBACK_PROVIDER: provider,
      FINANCE_AI_MODEL_FALLBACK_API_KEY: apiKey,
      FINANCE_AI_MODEL_FALLBACK_ID: modelId,
      FINANCE_AI_MODEL_FALLBACK_BASE_URL: baseUrl,
      FINANCE_AI_MODEL_FALLBACK_API_STYLE: apiStyle,
      FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK: "true",
    };
  }
  if (slot === "fallback2" || slot === "fallback3") {
    const prefix = slot === "fallback2" ? "FINANCE_AI_MODEL_FALLBACK2" : "FINANCE_AI_MODEL_FALLBACK3";
    return {
      [`${prefix}_PROVIDER`]: provider,
      [`${prefix}_API_KEY`]: apiKey,
      [`${prefix}_ID`]: modelId,
      [`${prefix}_BASE_URL`]: baseUrl,
      [`${prefix}_API_STYLE`]: apiStyle,
      [`${prefix}_ALLOW_NETWORK`]: "true",
    };
  }
  return {
    FINANCE_AI_MODEL_PROVIDER: provider,
    FINANCE_AI_MODEL_API_KEY: apiKey,
    FINANCE_AI_MODEL_ID: modelId,
    FINANCE_AI_MODEL_BASE_URL: baseUrl,
    FINANCE_AI_MODEL_API_STYLE: apiStyle,
  };
}

function modelSlotPaths(slot) {
  if (slot === "fallback") {
    return {
      keyPath: cleanModelConfigValue(
        process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_FALLBACK_KEY_PATH,
        defaultModelFallbackKeyPath,
      ),
      modelIdPath: cleanModelConfigValue(
        process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_FALLBACK_MODEL_ID_PATH,
        defaultModelFallbackIdPath,
      ),
      baseUrlPath: cleanModelConfigValue(
        process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_FALLBACK_BASE_URL_PATH,
        defaultModelFallbackBaseUrlPath,
      ),
      apiStylePath: cleanModelConfigValue(
        process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_FALLBACK_API_STYLE_PATH,
        defaultModelFallbackApiStylePath,
      ),
    };
  }
  if (slot === "fallback2") {
    return {
      keyPath: defaultModelFallback2KeyPath,
      modelIdPath: defaultModelFallback2IdPath,
      baseUrlPath: defaultModelFallback2BaseUrlPath,
      apiStylePath: defaultModelFallback2ApiStylePath,
    };
  }
  if (slot === "fallback3") {
    return {
      keyPath: defaultModelFallback3KeyPath,
      modelIdPath: defaultModelFallback3IdPath,
      baseUrlPath: defaultModelFallback3BaseUrlPath,
      apiStylePath: defaultModelFallback3ApiStylePath,
    };
  }
  return {
    keyPath: cleanModelConfigValue(
      process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_KEY_PATH,
      defaultModelKeyPath,
    ),
    modelIdPath: cleanModelConfigValue(
      process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_MODEL_ID_PATH,
      defaultModelIdPath,
    ),
    baseUrlPath: cleanModelConfigValue(
      process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_BASE_URL_PATH,
      defaultModelBaseUrlPath,
    ),
    apiStylePath: cleanModelConfigValue(
      process.env.FINANCE_AI_MODEL_LOCAL_CONFIG_API_STYLE_PATH,
      defaultModelApiStylePath,
    ),
  };
}

async function saveLocalModelConfig(payload = {}) {
  const apiKey = cleanModelConfigValue(payload.apiKey);
  if (apiKey.length < 12) {
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_MODEL_API_KEY",
          message: "模型 API key 为空或过短；请粘贴完整 key。",
        },
      },
    };
  }

  const modelId = cleanModelConfigValue(payload.modelId, defaultReliableModelId);
  const provider = cleanModelConfigValue(payload.provider, "openai-compatible");
  const baseUrl = cleanModelConfigValue(payload.baseUrl, defaultFreeModelBaseUrl).replace(/\/+$/, "");
  const slot = normalizeModelSlot(payload.slot);
  const apiStyle = cleanModelConfigValue(
    payload.apiStyle,
    baseUrl === "https://api.openai.com/v1" ? "responses" : "chat-completions",
  );
  const slotPaths = modelSlotPaths(slot);
  const nextEnv = {
    ...process.env,
    ...modelSlotRuntimeEnv(slot, { provider, apiKey, modelId, baseUrl, apiStyle }),
    FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
    FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
    FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS:
      process.env.FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS || "45000",
    FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST:
      process.env.FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST || "1400",
  };
  const dryRun = payload.dryRun === true;

  let providerAdapter;
  if (dryRun) {
    providerAdapter = createMockAiService({ env: nextEnv }).providerAdapterStatus();
  } else {
    await writeFile(slotPaths.keyPath, apiKey, { mode: 0o600 });
    await writeFile(slotPaths.modelIdPath, modelId, { mode: 0o600 });
    await writeFile(slotPaths.baseUrlPath, baseUrl, { mode: 0o600 });
    await writeFile(slotPaths.apiStylePath, apiStyle, { mode: 0o600 });
    Object.assign(process.env, nextEnv);
    providerAdapter = aiService.reloadProviderAdapter(process.env);
  }

  return {
    status: 200,
    body: {
      status: "configured-redacted",
      configured: true,
      provider,
      modelId,
      apiStyle,
      slot,
      baseUrlStatus: "configured-redacted",
      keyPath: slotPaths.keyPath,
      modelIdPath: slotPaths.modelIdPath,
      nextStep: "点击重新检测 AI，验证真实模型结构化输出；接口不会回显 API key。",
      dryRun,
      providerAdapter,
    },
  };
}

function findStock(code) {
  const normalizedCode = String(code || "").toLowerCase();
  return (
    dataProvider.findStock(code) ||
    stockCatalog.find((stock) => stock.code.toLowerCase() === normalizedCode) ||
    securityMasterCatalog.find((stock) => stock.code.toLowerCase() === normalizedCode)
  );
}

function searchStockCatalog(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return [];
  const combinedCatalog = [...stockCatalog, ...securityMasterCatalog];
  const seenCodes = new Set();
  return combinedCatalog
    .filter(
      (stock) =>
        stock.name.toLowerCase().includes(normalizedQuery) ||
        stock.code.toLowerCase().includes(normalizedQuery),
    )
    .filter((stock) => {
      const key = `${stock.market}:${stock.code.toLowerCase()}`;
      if (seenCodes.has(key)) return false;
      seenCodes.add(key);
      return true;
    })
    .map(({ code, name, market }) => ({ code, name, market, source: "metadata-only-catalog" }));
}

function authUserFromHeaders(headers = {}, repository) {
  return authService.authenticateHeaders(headers, repository);
}

function createRequestCorrelationId(prefix = "req") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function recordAuthAudit(repository, { user, eventType, action, legacyEventType, message, metadata = {} }) {
  return repository.recordAudit({
    user,
    eventType,
    message,
    metadata: {
      authEventVersion: "auth-audit-v1",
      action,
      legacyEventType,
      retentionClass: "auth-security-365d",
      requestCorrelationId: createRequestCorrelationId("auth"),
      hashChainRequired: true,
      privilegedReviewRequired: action?.includes("admin") || action === "roleSelfUpdate",
      ...metadata,
    },
  });
}

function headerValue(headers = {}, name) {
  const lowerName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return match ? match[1] : "";
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

function sanitizeReminderChannels(channels = []) {
  if (!Array.isArray(channels)) return [];
  return [
    ...new Set(
      channels.filter(
        (channel) => typeof channel === "string" && validNotificationChannels.has(channel),
      ),
    ),
  ];
}

function sanitizeAnalysisRecord(input = {}, user) {
  const stock = findStock(input.symbol || input.code);
  if (!stock) return null;
  const riskProfile = validRiskProfiles.has(input.riskProfile) ? input.riskProfile : "balanced";
  const upsideProbability = Math.max(0, Math.min(100, Number(input.upsideProbability) || 0));
  const downsideProbability = Math.max(
    0,
    Math.min(100, Number(input.downsideProbability) || 100 - upsideProbability),
  );

  return {
    id: `analysis-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user.id,
    symbol: stock.code,
    name: stock.name,
    market: stock.market,
    riskProfile,
    upsideProbability,
    downsideProbability,
    sentimentScore: Math.max(0, Math.min(100, Number(input.sentimentScore) || 0)),
    valuationScore: Math.max(0, Math.min(100, Number(input.valuationScore) || 0)),
    technicalScore: Math.max(0, Math.min(100, Number(input.technicalScore) || 0)),
    actionReference:
      typeof input.actionReference === "string" && input.actionReference.trim()
        ? input.actionReference.trim()
        : "",
    modelReference: input.modelReference !== false,
    source: typeof input.source === "string" && input.source.trim() ? input.source.trim() : "backend",
    generatedAt:
      typeof input.generatedAt === "string" && input.generatedAt.trim()
        ? input.generatedAt.trim()
        : new Date().toISOString(),
    savedAt: new Date().toISOString(),
    disclaimer: "历史记录仅用于回看模型参考输出，不构成投资建议或收益承诺。",
  };
}

function sanitizeComplianceAcknowledgement(input = {}, user, complianceStatus = {}) {
  if (input.acceptedDisclaimer !== true || input.riskAcknowledged !== true) {
    return null;
  }
  const acknowledgementPolicy = complianceStatus.acknowledgementPolicy || {};
  const requiredDisclaimer = complianceStatus.requiredDisclaimer || "";
  const version =
    typeof input.version === "string" && input.version.trim()
      ? input.version.trim()
      : acknowledgementPolicy.version || "compliance-ack-v0";

  return {
    id: `compliance-ack-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user.id,
    version,
    acceptedDisclaimer: true,
    riskAcknowledged: true,
    optionalPortfolioNoticeAcknowledged: input.optionalPortfolioNoticeAcknowledged !== false,
    source:
      typeof input.source === "string" && input.source.trim()
        ? input.source.trim()
        : "settings-panel",
    disclosureText:
      typeof input.disclosureText === "string" && input.disclosureText.trim()
        ? input.disclosureText.trim()
        : requiredDisclaimer,
    acceptedAt: new Date().toISOString(),
    disclaimer: "风险确认记录仅证明用户看过样例免责声明和风险提示，不代表适当性评估或投资建议。",
  };
}

function createAnalysisComplianceContext({ user, repository, complianceStatus }) {
  const acknowledgementPolicy = complianceStatus.acknowledgementPolicy || {};
  const requiredVersion = acknowledgementPolicy.version || "compliance-ack-v0";
  const requiredDisclaimer = complianceStatus.requiredDisclaimer || "";
  const required = acknowledgementPolicy.requiresRiskAcknowledgement !== false;

  if (!user) {
    return {
      status: "guest-basic-analysis",
      required,
      requiredVersion,
      acknowledged: false,
      latestAcknowledgement: null,
      inputCoverage: "guest-basic-no-user-record",
      message: "当前为未登录基础分析，未读取用户风险确认记录。",
      requiredDisclaimer,
      disclaimer: "访客模式不会保存用户风险确认；分析仍仅供学习和研究参考，不构成投资建议。",
    };
  }

  const latest = repository.latestComplianceAcknowledgement(user.id, requiredVersion);
  if (latest) {
    return {
      status: "acknowledged",
      required,
      requiredVersion,
      acknowledged: true,
      latestAcknowledgement: {
        id: latest.id,
        version: latest.version,
        acceptedAt: latest.acceptedAt,
        source: latest.source,
      },
      inputCoverage: "acknowledged-versioned-record",
      message: `已记录 ${requiredVersion} 版本的免责声明和市场风险确认。`,
      requiredDisclaimer,
      disclaimer: "风险确认记录不代表适当性评估或投资建议，用户仍需独立判断。",
    };
  }

  return {
    status: "acknowledgement-required",
    required,
    requiredVersion,
    acknowledged: false,
    latestAcknowledgement: null,
    inputCoverage: "missing-required-acknowledgement",
    message: `尚未记录 ${requiredVersion} 版本的免责声明和市场风险确认。`,
    requiredDisclaimer,
    disclaimer: "记录风险确认前，只能视为样例分析参考，不构成投资建议或收益承诺。",
  };
}

function normalizeSuitabilityAnswer(input = {}, key, fallback = "") {
  const value = typeof input[key] === "string" ? input[key].trim() : "";
  return validSuitabilityAnswers[key]?.has(value) ? value : fallback;
}

function scoreSuitabilityAnswers(answers) {
  const scoreMap = {
    riskTolerance: { low: 10, medium: 20, high: 30 },
    investmentExperience: { new: 5, some: 15, experienced: 25 },
    investmentHorizon: { short: 5, medium: 15, long: 25 },
    liquidityNeed: { high: 5, medium: 15, low: 20 },
  };
  const score = Object.entries(answers).reduce(
    (total, [key, value]) => total + (scoreMap[key]?.[value] || 0),
    0,
  );
  const suitabilityLevel = score >= 75 ? "growth" : score >= 45 ? "balanced" : "cautious";
  const levelLabel =
    suitabilityLevel === "growth"
      ? "成长型"
      : suitabilityLevel === "balanced"
        ? "平衡型"
        : "谨慎型";
  return { score, suitabilityLevel, levelLabel };
}

function sanitizeSuitabilityQuestionnaire(input = {}, user) {
  const source =
    input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)
      ? input.answers
      : input;
  const answers = {
    riskTolerance: normalizeSuitabilityAnswer(source, "riskTolerance", ""),
    investmentExperience: normalizeSuitabilityAnswer(source, "investmentExperience", ""),
    investmentHorizon: normalizeSuitabilityAnswer(source, "investmentHorizon", ""),
    liquidityNeed: normalizeSuitabilityAnswer(source, "liquidityNeed", ""),
  };
  if (Object.values(answers).some((value) => !value)) return null;

  const scoring = scoreSuitabilityAnswers(answers);
  return {
    id: `suitability-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user.id,
    version:
      typeof input.version === "string" && input.version.trim()
        ? input.version.trim()
        : suitabilityVersion,
    answers,
    ...scoring,
    completedAt: new Date().toISOString(),
    disclaimer:
      "适当性问卷为样例风险画像准备数据，不代表完整适当性评估、投资建议或收益承诺。",
  };
}

function normalizeNewsKey(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function sanitizeNewsIntelligenceRecord(item = {}, context = {}) {
  const source =
    item.source && typeof item.source === "object" && !Array.isArray(item.source)
      ? item.source
      : {};
  const relatedTickers = Array.isArray(item.relatedTickers)
    ? [...new Set(item.relatedTickers.filter((ticker) => typeof ticker === "string" && ticker.trim()))]
    : [];
  const symbol = context.symbol || relatedTickers[0] || "";
  const market = item.market || context.market || "";
  const duplicateGroupKey = [
    market,
    normalizeNewsKey(item.title),
    relatedTickers.slice().sort().join(","),
  ]
    .filter(Boolean)
    .join("|");
  const persistedAt = new Date().toISOString();

  return {
    id: `news-${market || "global"}-${item.id || duplicateGroupKey}`,
    market,
    symbol,
    code: symbol,
    title: typeof item.title === "string" ? item.title : "",
    summary: typeof item.summary === "string" ? item.summary : "",
    sentiment: typeof item.sentiment === "string" ? item.sentiment : "neutral",
    source: {
      id: typeof source.id === "string" ? source.id : "unknown-source",
      label:
        typeof source.label === "string"
          ? source.label
          : typeof item.source === "string"
            ? item.source
            : "未知来源",
      licenseTag: typeof source.licenseTag === "string" ? source.licenseTag : "",
      attributionRequired: source.attributionRequired === true,
    },
    sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
    relatedTickers,
    importanceScore: Math.max(0, Math.min(100, Number(item.importanceScore) || 0)),
    sourceCredibilityScore: Math.max(0, Math.min(100, Number(item.sourceCredibilityScore) || 0)),
    importanceBreakdown:
      item.importanceBreakdown &&
      typeof item.importanceBreakdown === "object" &&
      !Array.isArray(item.importanceBreakdown)
        ? item.importanceBreakdown
        : {},
    duplicateGroupKey,
    duplicateIds: Array.isArray(item.duplicateIds)
      ? item.duplicateIds.filter((id) => typeof id === "string")
      : item.id
        ? [item.id]
        : [],
    sourceCount: Number.isInteger(item.sourceCount) ? item.sourceCount : 1,
    rawSourceRefs: [
      {
        fixtureId: typeof item.id === "string" ? item.id : "",
        sourceId: typeof source.id === "string" ? source.id : "unknown-source",
        licenseTag: typeof source.licenseTag === "string" ? source.licenseTag : "",
        publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
      },
    ],
    scoreVersion: context.scoreVersion || "",
    deduplicationVersion: context.deduplicationVersion || "",
    reviewStatus: "unreviewed",
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
    persistedAt,
    disclaimer: "新闻情报记录仅用于产品功能验证和审计链路，不构成投资建议或收益承诺。",
  };
}

async function createAnalysisSourceRefs(stock) {
  const importantNews = await dataProvider.getImportantNews({
    market: stock.market,
    symbol: stock.code,
    minImportance: 70,
  });
  const filings = await dataProvider.getCompanyFilings({
    market: stock.market,
    symbol: stock.code,
  });
  const statements = dataProvider.getPublicStatements({
    market: stock.market,
    symbol: stock.code,
  });

  const createRef = (item, type) => {
    const source = item.source && typeof item.source === "object" ? item.source : {};
    return {
      id: typeof item.id === "string" ? item.id : `${type}-${item.title || ""}`,
      type,
      title: typeof item.title === "string" ? item.title : "",
      sourceLabel:
        typeof source.label === "string"
          ? source.label
          : typeof item.source === "string"
            ? item.source
            : "来源待确认",
      importanceScore: Number.isFinite(Number(item.importanceScore))
        ? Number(item.importanceScore)
        : Number(item.importance) || 0,
      sourceCredibilityScore: Number.isFinite(Number(item.sourceCredibilityScore))
        ? Number(item.sourceCredibilityScore)
        : Number(item.importanceBreakdown?.sourceCredibility) || 0,
      sentiment: typeof item.sentiment === "string" ? item.sentiment : "neutral",
    };
  };

  const sourceRefs = [
    ...(importantNews.items || []).slice(0, 2).map((item) => createRef(item, "news")),
    ...(filings.items || []).slice(0, 2).map((item) => createRef(item, "filing")),
    ...(statements.items || []).slice(0, 2).map((item) => createRef(item, "statement")),
  ].filter((ref) => ref.title);
  const coverageLabel = (payload, realLabel, sampleLabel) => {
    const hasItems = Array.isArray(payload.items) && payload.items.length > 0;
    if (!hasItems) return dataProvider.mode === "sample" ? "sample-empty" : "empty";
    return payload.mode === "real-provider" || payload.mode === "real-provider-relay"
      ? realLabel
      : sampleLabel;
  };

  return {
    sourceRefs,
    inputCoveragePatch: {
      news: coverageLabel(importantNews, "backend-real-provider-news", "fixture-linked"),
      filings: coverageLabel(filings, "backend-real-provider-filings", "fixture-linked"),
      publicStatements: coverageLabel(statements, "backend-real-provider-statements", "fixture-linked"),
    },
  };
}

function clampReferenceScore(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(number)));
}

function isRealProviderPayload(payload = {}) {
  return payload?.status === "ok" && ["real-provider", "real-provider-relay"].includes(payload.mode);
}

function sourceSentimentDirection(value = "") {
  if (/positive|bull|利好|正面/i.test(String(value))) return 1;
  if (/negative|bear|利空|负面/i.test(String(value))) return -1;
  return 0;
}

function buildRealInformationFlowImpact(sourceRefs = []) {
  const refs = Array.isArray(sourceRefs) ? sourceRefs : [];
  if (!refs.length) {
    return {
      score: 50,
      sentimentTilt: "neutral",
      probabilityAdjustment: 0,
      sentimentAdjustment: 0,
      confidenceAdjustment: 0,
      sourceCount: 0,
      summary: "暂无可纳入概率计算的真实新闻、公告或公开言论。",
      formula: "no real source refs = neutral",
    };
  }

  const weighted = refs.map((ref) => {
    const importance = clampReferenceScore(ref.importanceScore);
    const credibility = clampReferenceScore(ref.sourceCredibilityScore);
    return {
      direction: sourceSentimentDirection(ref.sentiment),
      weight: Math.max(1, Math.round(importance * 0.6 + credibility * 0.4)),
    };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
  const directional = weighted.reduce((sum, item) => sum + item.direction * item.weight, 0) / totalWeight;
  const score = clampReferenceScore(50 + directional * 45);
  const probabilityAdjustment = clampReferenceScore(directional * 8, -8, 8);
  const sentimentTilt = directional > 0.15 ? "positive" : directional < -0.15 ? "negative" : "neutral";

  return {
    score,
    sentimentTilt,
    probabilityAdjustment,
    sentimentAdjustment: clampReferenceScore(directional * 10, -10, 10),
    confidenceAdjustment: Math.min(8, Math.max(2, Math.round(refs.length * 1.5))),
    sourceCount: refs.length,
    summary:
      sentimentTilt === "positive"
        ? `已纳入 ${refs.length} 条真实信息源，整体偏正面。`
        : sentimentTilt === "negative"
          ? `已纳入 ${refs.length} 条真实信息源，整体偏负面。`
          : `已纳入 ${refs.length} 条真实信息源，方向中性。`,
    formula: "weightedSentiment(importance, sourceCredibility)",
  };
}

function quotePrice(quotePayload = {}) {
  const value = Number(quotePayload?.quote?.lastPrice);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function historyCloses(historyPayload = {}) {
  if (!isRealProviderPayload(historyPayload) || !Array.isArray(historyPayload.points)) return [];
  return historyPayload.points
    .map((point) => ({
      label: point.label || point.date || point.timestamp || "",
      price: Number(point.close || point.price),
    }))
    .filter((point) => Number.isFinite(point.price) && point.price > 0);
}

function buildRealTradePlan({ currentPrice, upsideProbability, technicalScore, riskProfile }) {
  if (!currentPrice) return null;
  const riskConfig = {
    conservative: { low: 0.975, high: 1.0, add: 1.025, reduce: 0.955, stop: 0.94, take: 1.075 },
    balanced: { low: 0.97, high: 1.01, add: 1.035, reduce: 0.94, stop: 0.925, take: 1.11 },
    aggressive: { low: 0.965, high: 1.02, add: 1.045, reduce: 0.925, stop: 0.9, take: 1.16 },
  };
  const config = riskConfig[riskProfile] || riskConfig.balanced;
  const roundPrice = (value) => Number(value.toFixed(currentPrice >= 100 ? 2 : 3));
  return {
    mode: "real-data-rule-reference",
    stance:
      upsideProbability >= 62 && technicalScore >= 55
        ? "分批观察"
        : upsideProbability <= 45
          ? "控制风险"
          : "等待确认",
    currentPrice: roundPrice(currentPrice),
    entryZone: {
      low: roundPrice(currentPrice * config.low),
      high: roundPrice(currentPrice * config.high),
    },
    addOnTrigger: roundPrice(currentPrice * config.add),
    reduceTrigger: roundPrice(currentPrice * config.reduce),
    stopLoss: roundPrice(currentPrice * config.stop),
    takeProfit: roundPrice(currentPrice * config.take),
    positionSizing: "真实数据规则参考：单次仓位仍建议分批，需结合你的风险承受能力。",
    holdingHorizon: "2-8 周数据观察",
    rationale: `基于真实当前价、${upsideProbability}% 上涨参考概率和技术面 ${technicalScore}/100 生成观察边界。`,
    disclaimer: "仅为真实数据规则参考边界，不构成买入、卖出、加仓、减仓或收益承诺。",
  };
}

function buildRealDataReferenceAnalysis({
  stock,
  riskProfile = "balanced",
  sourceContext,
  macroContext,
  quotePayload,
  historyPayload,
  portfolioEntry,
  modelIssue = null,
}) {
  const currentPrice = quotePrice(quotePayload);
  const closes = historyCloses(historyPayload);
  const realSourceRefs = Array.isArray(sourceContext?.sourceRefs) ? sourceContext.sourceRefs : [];
  const hasRealQuote = isRealProviderPayload(quotePayload) && Boolean(currentPrice);
  const hasRealHistory = closes.length >= 2;
  const hasRealMacro = macroContext?.status === "ok" && macroContext?.mode === "real-provider";
  const hasRealSources = realSourceRefs.length > 0;
  if (!hasRealQuote && !hasRealHistory && !hasRealMacro && !hasRealSources) return null;

  const riskAdjustment = riskProfile === "aggressive" ? 3 : riskProfile === "conservative" ? -3 : 0;
  const firstClose = closes[0]?.price;
  const lastClose = closes.at(-1)?.price || currentPrice || firstClose;
  const trendPct = firstClose && lastClose ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const technicalScore = hasRealHistory
    ? clampReferenceScore(50 + trendPct * 2.4, 25, 75)
    : hasRealQuote
      ? 52
      : 50;
  const macroScore = hasRealMacro ? clampReferenceScore(macroContext.factorScore, 20, 80) : 50;
  const informationFlowImpact = buildRealInformationFlowImpact(realSourceRefs);
  const sentimentScore = hasRealSources
    ? clampReferenceScore(informationFlowImpact.score, 20, 80)
    : clampReferenceScore((macroScore + technicalScore) / 2, 30, 70);
  const valuationScore = clampReferenceScore(
    hasRealMacro ? 50 + (macroScore - 50) * 0.35 - Math.max(0, trendPct) * 0.4 : 50,
    30,
    70,
  );
  const portfolioAdjustment = portfolioEntry?.maxLoss ? -1 : 0;
  const upsideProbability = clampReferenceScore(
    50 +
      (technicalScore - 50) * 0.32 +
      (sentimentScore - 50) * 0.24 +
      (macroScore - 50) * 0.22 +
      (valuationScore - 50) * 0.12 +
      informationFlowImpact.probabilityAdjustment +
      riskAdjustment +
      portfolioAdjustment,
    25,
    75,
  );
  const downsideProbability = clampReferenceScore(100 - upsideProbability, 25, 75);
  const confidenceScore = clampReferenceScore(
    35 +
      (hasRealQuote ? 12 : 0) +
      (hasRealHistory ? 14 : 0) +
      (hasRealMacro ? 10 : 0) +
      Math.min(12, realSourceRefs.length * 2),
    20,
    78,
  );
  const factorBreakdown = [
    {
      key: "macro",
      label: "宏观经济",
      score: macroScore,
      weight: 20,
      summary: hasRealMacro
        ? `${macroContext.summary} 来源：${macroContext.source?.label || macroContext.sourceStatus || "真实宏观数据"}。`
        : "宏观真实数据暂缺，按中性值处理并降低置信度。",
    },
    {
      key: "industry",
      label: "行业分析",
      score: clampReferenceScore((sentimentScore + macroScore) / 2, 25, 75),
      weight: 18,
      summary: hasRealSources
        ? "行业热度由真实新闻、公告或公开言论相关度间接估算。"
        : "行业景气度真实数据暂缺，按中性值处理。",
    },
    {
      key: "fundamentals",
      label: "公司基本盘",
      score: clampReferenceScore((valuationScore + macroScore) / 2, 25, 75),
      weight: 22,
      summary: hasRealSources ? "公司基本面只引用已接入公告/新闻线索，不使用样例财务数据。" : "财报/估值明细暂缺，保持中性。",
    },
    {
      key: "valuation",
      label: "估值分析",
      score: valuationScore,
      weight: 16,
      summary: "暂未接入完整估值倍数，估值吸引力由宏观与趋势压力保守估算。",
    },
    {
      key: "technical",
      label: "技术分析",
      score: technicalScore,
      weight: 14,
      summary: hasRealHistory
        ? `真实走势区间涨跌约 ${trendPct.toFixed(2)}%，用于估算技术强弱。`
        : "只有真实报价、缺少真实历史走势，技术面置信度较低。",
    },
    {
      key: "sentiment",
      label: "市场情绪",
      score: sentimentScore,
      weight: 10,
      summary: informationFlowImpact.summary,
    },
  ];
  const bullProbability = clampReferenceScore(upsideProbability * 0.52 + confidenceScore * 0.12, 10, 55);
  const bearProbability = clampReferenceScore(downsideProbability * 0.5, 10, 55);
  const baseProbability = Math.max(0, 100 - bullProbability - bearProbability);
  const priceBase = currentPrice || lastClose || 0;
  const target = (multiplier) => (priceBase ? Number((priceBase * multiplier).toFixed(priceBase >= 100 ? 2 : 3)) : null);
  const inputCoverage = {
    marketData: hasRealQuote ? "backend-real-provider-quote" : "missing",
    history: hasRealHistory ? "backend-real-provider-history" : "missing",
    macro: hasRealMacro ? "backend-real-provider-macro" : "missing",
    model: "real-data-rule-reference",
    portfolio: portfolioEntry ? "backend-saved-position-or-partial" : "not_required",
  };
  const readySources = [hasRealQuote || hasRealHistory, hasRealMacro, hasRealSources].filter(Boolean).length;
  const missingSources = [
    hasRealQuote || hasRealHistory ? "" : "行情/走势",
    hasRealMacro ? "" : "宏观",
    hasRealSources ? "" : "新闻/公告/公开言论",
    "完整估值倍数",
    "真实 AI 模型",
  ].filter(Boolean);

  return {
    symbol: stock.code,
    name: stock.name,
    market: stock.market,
    riskProfile,
    modelReference: true,
    analysisMode: "real-data-rule-reference",
    upsideProbability,
    downsideProbability,
    sentimentScore,
    valuationScore,
    technicalScore,
    confidenceScore,
    actionReference:
      upsideProbability >= 62
        ? "真实数据规则参考：偏积极，但需等待更多基本面和估值证据确认。"
        : upsideProbability <= 45
          ? "真实数据规则参考：偏谨慎，优先控制仓位和回撤风险。"
          : "真实数据规则参考：保持观察，等待更多真实数据确认方向。",
    reasons: [
      hasRealHistory
        ? `真实走势区间涨跌约 ${trendPct.toFixed(2)}%，技术面分数 ${technicalScore}/100。`
        : hasRealQuote
          ? `已获得真实报价 ${currentPrice}，但历史走势不足，技术面置信度较低。`
          : "暂未获得真实行情，概率置信度受限。",
      hasRealMacro ? `宏观分数 ${macroScore}/100：${macroContext.summary}` : "宏观真实数据暂缺，按中性处理。",
      informationFlowImpact.summary,
    ],
    risks: [
      "这是基于真实数据的规则参考，不是完整 AI 深度研究结论。",
      "估值倍数、财报预测和资金流数据仍未完整接入，概率可能随新数据明显变化。",
      modelIssue?.message ? `真实 AI 暂不可用：${modelIssue.message}` : "真实 AI 模型未参与本次概率计算。",
    ],
    history: closes.map((point) => ({ label: point.label, price: point.price })),
    historySource: {
      label: historyPayload?.source?.label || quotePayload?.quote?.source?.label || "真实数据 provider",
      frequency: historyPayload?.interval || quotePayload?.quote?.dataDelay || "真实数据",
      updatedAt: historyPayload?.asOf || quotePayload?.quote?.asOf || new Date().toISOString(),
      mode: hasRealHistory ? "real-provider" : hasRealQuote ? "real-provider-quote" : "missing",
    },
    factorBreakdown,
    scenarioAnalysis: {
      mode: "real-data-rule-reference",
      horizon: "2-8 周数据观察",
      cases: [
        { key: "bull", label: "乐观情景", probability: bullProbability, targetPrice: target(1.06), expectedReturnPct: 6, summary: "真实数据继续改善，价格测试上方观察区间。" },
        { key: "base", label: "基准情景", probability: baseProbability, targetPrice: target(1), expectedReturnPct: 0, summary: "缺少新催化时维持震荡，等待更多真实输入。" },
        { key: "bear", label: "悲观情景", probability: bearProbability, targetPrice: target(0.94), expectedReturnPct: -6, summary: "风险偏好下降或真实数据转弱，价格回落到风控区间。" },
      ],
      disclaimer: "情景概率为真实数据规则参考，不构成收益预测、买卖建议或承诺。",
    },
    tradePlan: buildRealTradePlan({ currentPrice: priceBase, upsideProbability, technicalScore, riskProfile }),
    analysisProcess: {
      version: "real-data-rule-analysis-v1",
      mode: "real-data-rule-reference",
      agents: factorBreakdown.map((factor) => ({
        role: factor.key,
        label: `${factor.label}规则检查`,
        status: factor.score === 50 ? "limited-evidence" : "ready-with-real-data",
        conclusion: factor.summary,
        confidence: factor.score,
        evidenceCount: factor.key === "technical" ? closes.length : factor.key === "sentiment" ? realSourceRefs.length : hasRealMacro ? 1 : 0,
      })),
      debate: {
        bull: { label: "多头规则", thesis: "若真实趋势、情绪和宏观继续改善，上行概率会提高。", probability: bullProbability },
        bear: { label: "空头规则", thesis: "若估值/财报/资金流继续缺失或风险偏好下降，下行风险会提高。", probability: bearProbability },
      },
      synthesis: {
        manager: `规则模型综合 ${readySources} 类真实输入，当前置信度 ${confidenceScore}/100。`,
        riskReview: `下跌风险概率 ${downsideProbability}%，必须结合止损和仓位管理理解。`,
        portfolioReview: portfolioEntry ? "已读取持仓字段，但持仓数据为用户自填，仍需自行确认准确性。" : "未填写持仓时仅输出通用风险参考。",
      },
      evidenceCoverage: {
        readySourceCount: readySources,
        missingSourceCount: missingSources.length,
        missingSources,
      },
      confidence: confidenceScore,
      disclaimer: "规则分析过程仅解释真实数据参考概率，不构成投资建议、交易指令或收益承诺。",
    },
    inputCoverage,
    sourceRefs: realSourceRefs,
    informationFlowImpact,
    analysisService: {
      id: "real-data-rule-reference",
      mode: "real-data-rule-reference",
      model: "deterministic-real-data-v1",
    },
    warnings: [
      "真实 AI 不可用时启用规则参考概率；置信度低于完整 AI 分析。",
      "未使用样例行情、样例新闻或本地默认概率。",
    ],
    generatedAt: new Date().toISOString(),
    disclaimer: "真实数据规则参考仅供研究辅助，不构成投资建议、交易指令或收益承诺。",
  };
}

function createAutoIngestionTimeoutPayload(sourceId, timeoutMs, emptyPayload = {}) {
  return {
    status: "error",
    mode: "provider-timeout-empty-no-fixture",
    sourceId,
    items: [],
    error: {
      code: "AUTO_INGESTION_SOURCE_TIMEOUT",
      message: `真实 provider ${sourceId} 超过 ${timeoutMs}ms 未返回；该分组保持空白。`,
    },
    ...emptyPayload,
  };
}

async function runAutomaticRealDataIngestion({ market = "", symbol = "" } = {}) {
  const requestedMarket = market || "";
  const requestedSymbol = symbol || "";
  const autoIngestionTimeoutMs = Math.max(
    1_000,
    Number(process.env.FINANCE_AI_AUTO_INGESTION_SOURCE_TIMEOUT_MS) || 6_000,
  );
  const withSourceTimeout = (sourceId, promise, emptyPayload = {}) =>
    Promise.race([
      Promise.resolve(promise),
      new Promise((resolve) => {
        setTimeout(
          () => resolve(createAutoIngestionTimeoutPayload(sourceId, autoIngestionTimeoutMs, emptyPayload)),
          autoIngestionTimeoutMs,
        );
      }),
    ]);
  const [quoteResult, newsResult, filingsResult, statementsResult, macroResult] =
    await Promise.allSettled([
      withSourceTimeout(
        "marketDataQuote",
        dataProvider.getMarketDataQuote({ market: requestedMarket, code: requestedSymbol }),
        { quote: null },
      ),
      withSourceTimeout(
        "newsIntelligence",
        dataProvider.getImportantNews({
          market: requestedMarket,
          symbol: requestedSymbol,
          minImportance: 70,
        }),
        { items: [] },
      ),
      withSourceTimeout(
        "companyFilings",
        dataProvider.getCompanyFilings({ market: requestedMarket, symbol: requestedSymbol }),
        { items: [] },
      ),
      withSourceTimeout(
        "publicStatements",
        dataProvider.getPublicStatements({ market: requestedMarket, symbol: requestedSymbol }),
        { items: [] },
      ),
      withSourceTimeout(
        "macroContext",
        dataProvider.getMacroContext({ market: requestedMarket }),
        { indicators: [], policyEvents: [] },
      ),
    ]);

  const normalizeSettled = (result, emptyPayload = {}) =>
    result.status === "fulfilled"
      ? result.value
      : {
          status: "error",
          mode: "provider-error-empty-no-fixture",
          items: [],
          error: {
            code: "AUTO_INGESTION_PROVIDER_ERROR",
            message: result.reason?.message || "真实 provider 请求失败。",
          },
          ...emptyPayload,
        };

  const quote = normalizeSettled(quoteResult, { quote: null });
  const news = normalizeSettled(newsResult, { items: [] });
  const filingsPayload = normalizeSettled(filingsResult, { items: [] });
  const statementsPayload = normalizeSettled(statementsResult, { items: [] });
  const macroPayload = normalizeSettled(macroResult, { indicators: [], policyEvents: [] });
  const sources = [
    {
      id: "marketDataQuote",
      label: "行情报价",
      mode: quote.mode || "unknown",
      status: quote.status === "ok" && quote.quote ? "real-data" : "empty",
      count: quote.quote ? 1 : 0,
      provider: quote.provider?.id || quote.quote?.source?.label || "",
      blocker: quote.quote ? "" : quote.reason || quote.error?.message || "没有真实行情数据。",
    },
    {
      id: "newsIntelligence",
      label: "新闻情报",
      mode: news.mode || "unknown",
      status: Array.isArray(news.items) && news.items.length ? "real-data" : "empty",
      count: Array.isArray(news.items) ? news.items.length : 0,
      provider: news.provider?.id || news.sourceStatus || "",
      blocker:
        Array.isArray(news.items) && news.items.length
          ? ""
          : news.providerError?.message || news.error?.message || "没有真实新闻数据。",
    },
    {
      id: "companyFilings",
      label: "公司公告",
      mode: filingsPayload.mode || "unknown",
      status:
        Array.isArray(filingsPayload.items) && filingsPayload.items.length ? "real-data" : "empty",
      count: Array.isArray(filingsPayload.items) ? filingsPayload.items.length : 0,
      provider: filingsPayload.provider?.id || filingsPayload.sourceStatus || "",
      blocker:
        Array.isArray(filingsPayload.items) && filingsPayload.items.length
          ? ""
          : filingsPayload.providerError?.message || filingsPayload.error?.message || "没有真实公告数据。",
    },
    {
      id: "publicStatements",
      label: "公开言论",
      mode: statementsPayload.mode || "unknown",
      status:
        Array.isArray(statementsPayload.items) && statementsPayload.items.length
          ? "real-data"
          : "empty",
      count: Array.isArray(statementsPayload.items) ? statementsPayload.items.length : 0,
      provider: statementsPayload.provider?.id || statementsPayload.sourceStatus || "",
      blocker:
        Array.isArray(statementsPayload.items) && statementsPayload.items.length
          ? ""
          : statementsPayload.providerError?.message ||
            statementsPayload.error?.message ||
            "没有真实公开言论数据。",
    },
    {
      id: "macroContext",
      label: "宏观数据",
      mode: macroPayload.mode || "unknown",
      status:
        (Array.isArray(macroPayload.indicators) && macroPayload.indicators.length) ||
        macroPayload.context
          ? "real-data"
          : "empty",
      count: Array.isArray(macroPayload.indicators) ? macroPayload.indicators.length : 0,
      provider: macroPayload.provider?.id || macroPayload.sourceStatus || "",
      blocker:
        (Array.isArray(macroPayload.indicators) && macroPayload.indicators.length) ||
        macroPayload.context
          ? ""
          : macroPayload.reason || macroPayload.error?.message || "没有真实宏观数据。",
    },
  ];
  const realDataCount = sources.filter((source) => source.status === "real-data").length;

  return {
    id: `auto-ingestion-${Date.now()}`,
    status: realDataCount ? "partial-real-data" : "empty-no-fixture",
    mode: "automatic-real-provider-run",
    market: requestedMarket,
    symbol: requestedSymbol,
    ranAt: new Date().toISOString(),
    realDataCount,
    sourceCount: sources.length,
    sources,
    payloads: {
      quote,
      news,
      filings: filingsPayload,
      publicStatements: statementsPayload,
      macro: macroPayload,
    },
    nextActions: sources
      .filter((source) => source.status !== "real-data")
      .map((source) => `${source.label}: ${source.blocker}`),
    disclaimer:
      "自动抓取只调用已配置的真实 provider 或官方公开接口；没有真实数据时保持空白，不使用 mock/fixture/sample 兜底。",
  };
}

export async function handleMockRequest(request, state = createMockState()) {
  const repository = createMockRepository(state);
  const method = request.method || "GET";
  if (method === "OPTIONS") {
    return { status: 204, body: {} };
  }

  const url = new URL(request.url || "/", "http://localhost");
  const pathname = url.pathname;

  if (method === "GET" && ["/health", "/api/health"].includes(pathname)) {
    return {
      status: 200,
      body: {
        status: "ok",
        service: "finance-ai-assistant-backend",
        version: "0.1.0",
      },
    };
  }

  if (method === "GET" && pathname === "/api/public-preview/access-status") {
    return {
      status: 200,
      body: {
        publicPreviewAccess: publicPreviewAccessStatus(request),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources") {
    const activeProvider = dataProvider.status();
    return {
      status: 200,
      body: {
        activeProvider,
        providers: [activeProvider],
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/integration-plan") {
    return {
      status: 200,
      body: {
        integrationPlan: dataProvider.integrationPlan(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/provider-registry") {
    return {
      status: 200,
      body: {
        providerRegistry: dataProvider.providerRegistry(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/vendor-readiness") {
    return {
      status: 200,
      body: {
        vendorReadinessChecklist: dataProvider.vendorReadinessChecklist(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/vendor-contract-handoff") {
    return {
      status: 200,
      body: {
        vendorContractHandoffPackage: dataProvider.vendorContractHandoffPackage(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/provider-secret-quota-runbook") {
    return {
      status: 200,
      body: {
        providerSecretQuotaRunbook: dataProvider.providerSecretQuotaRunbook(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/provider-setup-guide") {
    return {
      status: 200,
      body: {
        providerSetupGuide: dataProvider.providerSetupGuide(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/ingestion-channels") {
    return {
      status: 200,
      body: {
        dataIngestionChannelStrategy: dataProvider.dataIngestionChannelStrategy(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/auto-ingestion-run") {
    const run = await runAutomaticRealDataIngestion({
      market: url.searchParams.get("market") || "",
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code") || "",
    });
    return {
      status: 200,
      body: run,
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/market-data-vendor-checklist") {
    return {
      status: 200,
      body: {
        marketDataVendorChecklist: dataProvider.marketDataVendorChecklist(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/news-filings-vendor-checklist") {
    return {
      status: 200,
      body: {
        newsFilingsVendorChecklist: dataProvider.newsFilingsVendorChecklist(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/macro-data-vendor-checklist") {
    return {
      status: 200,
      body: {
        macroDataVendorChecklist: dataProvider.macroDataVendorChecklist(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/public-statements-vendor-checklist") {
    return {
      status: 200,
      body: {
        publicStatementsVendorChecklist: dataProvider.publicStatementsVendorChecklist(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/market-data-adapter") {
    return {
      status: 200,
      body: {
        marketDataAdapter: dataProvider.marketDataAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/macro-data-adapter") {
    return {
      status: 200,
      body: {
        macroDataAdapter: dataProvider.macroDataAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/data-sources/news-filings-adapter") {
    return {
      status: 200,
      body: {
        newsFilingsAdapter: dataProvider.newsFilingsAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/market-data/quote") {
    const payload = await dataProvider.getMarketDataQuote({
      market: url.searchParams.get("market"),
      code: url.searchParams.get("code") || url.searchParams.get("symbol"),
    });
    if (payload.status === "not-found") return { status: 404, body: payload };
    return persistAndReturn(state, {
      status: 200,
      body: marketDataRuntime.execute({
        repository,
        user: authUserFromHeaders(request.headers, repository),
        kind: "quote",
        payload,
      }),
    });
  }

  if (method === "GET" && pathname === "/api/market-data/history") {
    const payload = await dataProvider.getMarketDataHistory({
      market: url.searchParams.get("market"),
      code: url.searchParams.get("code") || url.searchParams.get("symbol"),
      range: url.searchParams.get("range"),
      interval: url.searchParams.get("interval"),
    });
    if (payload.status === "not-found") return { status: 404, body: payload };
    return persistAndReturn(state, {
      status: 200,
      body: marketDataRuntime.execute({
        repository,
        user: authUserFromHeaders(request.headers, repository),
        kind: "history",
        payload,
      }),
    });
  }

  if (method === "GET" && pathname === "/api/market-data/policy-check") {
    const payload = dataProvider.getMarketDataPolicyCheck({
      market: url.searchParams.get("market"),
      code: url.searchParams.get("code") || url.searchParams.get("symbol"),
      range: url.searchParams.get("range"),
      interval: url.searchParams.get("interval"),
      kind: url.searchParams.get("kind"),
    });
    return persistAndReturn(state, {
      status: 200,
      body: marketDataRuntime.execute({
        repository,
        user: authUserFromHeaders(request.headers, repository),
        kind: url.searchParams.get("kind") || "policy-check",
        payload,
      }),
    });
  }

  if (method === "GET" && pathname === "/api/market-data/runtime-status") {
    const activeRuntime = marketDataRuntime.status();
    return {
      status: 200,
      body: {
        activeRuntime,
        runtimes: [activeRuntime],
      },
    };
  }

  if (method === "GET" && pathname === "/api/news/ingestion-runtime/status") {
    const activeRuntime = newsIngestionRuntime.status();
    return {
      status: 200,
      body: {
        activeRuntime,
        runtimes: [activeRuntime],
      },
    };
  }

  if (method === "GET" && pathname === "/api/market-data/trading-calendar") {
    const payload = dataProvider.getTradingCalendar({
      market: url.searchParams.get("market"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return persistAndReturn(state, {
      status: 200,
      body: marketDataRuntime.execute({
        repository,
        user: authUserFromHeaders(request.headers, repository),
        kind: "trading-calendar",
        payload,
      }),
    });
  }

  if (method === "GET" && pathname === "/api/ai-services") {
    const activeService = aiService.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/ai-services/provider-adapter") {
    return {
      status: 200,
      body: {
        providerAdapter: aiService.providerAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/ai-services/model-provider-setup-guide") {
    return {
      status: 200,
      body: {
        modelProviderSetupGuide: aiService.providerAdapterStatus().modelProviderSetupGuide,
      },
    };
  }

  if (method === "POST" && pathname === "/api/ai-services/local-model-config") {
    if (!isLocalAiConfigRequest(request)) {
      return {
        status: 403,
        body: {
          error: {
            code: "LOCAL_AI_CONFIG_ONLY",
            message: "模型 key 配置入口仅允许本机 localhost 开发环境使用。",
          },
        },
      };
    }
    return saveLocalModelConfig(request.body || {});
  }

  if (method === "GET" && pathname === "/api/auth/status") {
    const activeService = authService.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/auth/provider-adapter") {
    return {
      status: 200,
      body: {
        providerAdapter: authService.providerAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/audit/status") {
    const activeService = auditService.status(repository.status());
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "POST" && pathname === "/api/audit/retention/purge") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后清理审计保留记录。" } },
      };
    }

    const result = auditService.purgeRetention(repository, user, {
      requestedBy: "api",
    });
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "GET" && pathname === "/api/audit/export") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后导出审计证据包。" } },
      };
    }

    return persistAndReturn(state, {
      status: 200,
      body: auditService.exportPackage(repository, user, {
        requestedBy: "api",
        limit: 100,
      }),
    });
  }

  if (method === "POST" && pathname === "/api/audit/export/verify") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后校验审计证据包。" } },
      };
    }

    const payload = request.body && typeof request.body === "object" ? request.body : {};
    const exportPackage = payload.exportPackage || payload.package || payload;
    return persistAndReturn(state, {
      status: 200,
      body: auditService.verifyExportPackage(repository, user, exportPackage, {
        requestedBy: "api",
      }),
    });
  }

  if (method === "POST" && pathname === "/api/audit/export/archive") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后归档审计证据包。" } },
      };
    }

    const payload = request.body && typeof request.body === "object" ? request.body : {};
    const exportPackage = payload.exportPackage || payload.package || payload;
    return persistAndReturn(state, {
      status: 200,
      body: auditService.archiveExportPackage(repository, user, exportPackage, {
        requestedBy: "api",
      }),
    });
  }

  if (method === "POST" && pathname === "/api/audit/export/download") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后准备审计下载包。" } },
      };
    }

    const payload = request.body && typeof request.body === "object" ? request.body : {};
    const exportPackage = payload.exportPackage || payload.package || payload;
    return persistAndReturn(state, {
      status: 200,
      body: auditService.prepareDownload(repository, user, exportPackage, {
        requestedBy: "api",
      }),
    });
  }

  if (method === "GET" && pathname === "/api/audit/export/archive") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看审计归档回执。" } },
      };
    }

    return {
      status: 200,
      body: auditService.listArchiveReceipts(repository, user, {
        limit: 50,
      }),
    };
  }

  if (method === "POST" && pathname === "/api/audit/export/replay-preview") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后预演审计证据包导入。" } },
      };
    }

    const payload = request.body && typeof request.body === "object" ? request.body : {};
    const exportPackage = payload.exportPackage || payload.package || payload;
    return persistAndReturn(state, {
      status: 200,
      body: auditService.replayPreview(repository, user, exportPackage, {
        requestedBy: "api",
      }),
    });
  }

  if (method === "GET" && pathname === "/api/compliance/status") {
    const activeService = complianceService.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (pathname === "/api/compliance/acknowledgements") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后记录风险确认。" } },
      };
    }

    if (method === "GET") {
      const version = url.searchParams.get("version") || "";
      const items = repository.listComplianceAcknowledgements(user.id);
      return {
        status: 200,
        body: {
          items,
          latest: repository.latestComplianceAcknowledgement(user.id, version),
          acknowledgementPolicy: complianceService.status().acknowledgementPolicy,
          disclaimer: "当前读取的是样例风险确认记录，生产环境仍需要版本化披露、地区策略和合规复核。",
        },
      };
    }

    if (method === "POST") {
      const activeService = complianceService.status();
      const record = sanitizeComplianceAcknowledgement(request.body || {}, user, activeService);
      if (!record) {
        return {
          status: 400,
          body: {
            error: {
              code: "INVALID_COMPLIANCE_ACKNOWLEDGEMENT",
              message: "必须同时确认免责声明和市场风险后，才能记录风险确认。",
            },
          },
        };
      }

      const saved = repository.saveComplianceAcknowledgement(record);
      repository.recordAudit({
        user,
        eventType: "compliance.acknowledgement.save",
        message: "User compliance acknowledgement recorded.",
        metadata: {
          version: saved.version,
          source: saved.source,
          acceptedDisclaimer: saved.acceptedDisclaimer,
          riskAcknowledged: saved.riskAcknowledged,
          optionalPortfolioNoticeAcknowledged: saved.optionalPortfolioNoticeAcknowledged,
        },
      });
      return persistAndReturn(state, {
        status: 200,
        body: {
          saved,
          latest: saved,
          disclaimer: "风险确认记录不代表投资适当性结论，也不构成投资建议。",
        },
      });
    }
  }

  if (pathname === "/api/compliance/suitability") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后填写适当性问卷。" } },
      };
    }

    if (method === "GET") {
      const version = url.searchParams.get("version") || suitabilityVersion;
      return {
        status: 200,
        body: {
          items: repository.listSuitabilityQuestionnaires(user.id),
          latest: repository.latestSuitabilityQuestionnaire(user.id, version),
          questionnaire: {
            version: suitabilityVersion,
            requiredFields: [
              "riskTolerance",
              "investmentExperience",
              "investmentHorizon",
              "liquidityNeed",
            ],
            scoring: "sample-rule-based",
          },
          disclaimer: "当前读取的是样例适当性问卷记录，生产环境仍需要法律复核、地区策略和持牌资质判断。",
        },
      };
    }

    if (method === "POST") {
      const record = sanitizeSuitabilityQuestionnaire(request.body || {}, user);
      if (!record) {
        return {
          status: 400,
          body: {
            error: {
              code: "INVALID_SUITABILITY_QUESTIONNAIRE",
              message: "请完整选择风险承受、投资经验、投资期限和流动性需求。",
            },
          },
        };
      }

      const saved = repository.saveSuitabilityQuestionnaire(record);
      repository.recordAudit({
        user,
        eventType: "compliance.suitability.save",
        message: "User suitability questionnaire saved.",
        metadata: {
          version: saved.version,
          score: saved.score,
          suitabilityLevel: saved.suitabilityLevel,
          answeredFields: Object.keys(saved.answers),
        },
      });
      return persistAndReturn(state, {
        status: 200,
        body: {
          saved,
          latest: saved,
          disclaimer: "适当性问卷记录不代表完整适当性评估，也不构成投资建议。",
        },
      });
    }
  }

  if (method === "GET" && pathname === "/api/notification-services") {
    const activeService = notificationService.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/notification-services/provider-adapter") {
    return {
      status: 200,
      body: {
        providerAdapter: notificationService.providerAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/repository/status") {
    const activeRepository = repository.status();
    return {
      status: 200,
      body: {
        activeRepository,
        repositories: [activeRepository],
      },
    };
  }

  if (method === "GET" && pathname === "/api/project/progress") {
    return {
      status: 200,
      body: {
        progress: computedProjectProgress(repository),
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/status") {
    const activeService = databaseService.status(repository.status(), repository);
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/migration-dry-run") {
    const dryRun = databaseService.migrationDryRun(repository.status(), repository);
    return {
      status: 200,
      body: {
        dryRun,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/migration-sql-draft") {
    const draft = databaseService.migrationSqlDraft(repository.status(), repository);
    return {
      status: 200,
      body: {
        draft,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/migration-package") {
    const migrationPackage = databaseService.migrationPackage(repository.status(), repository);
    return {
      status: 200,
      body: {
        migrationPackage,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/read-only-health") {
    const readOnlyHealth = databaseService.readOnlyConnectionHealth(repository.status(), repository);
    return {
      status: 200,
      body: {
        readOnlyHealth,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/driver-setup-plan") {
    const driverSetupPlan = databaseService.driverSetupPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        driverSetupPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/repository-adapter-plan") {
    const repositoryAdapterPlan = databaseService.repositoryAdapterPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        repositoryAdapterPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/repository-runtime-guard") {
    const repositoryRuntimeGuard = databaseService.repositoryRuntimeGuard(repository.status(), repository);
    return {
      status: 200,
      body: {
        repositoryRuntimeGuard,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-adapter") {
    const productionRepositoryAdapter = databaseService.productionRepositoryAdapter(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryAdapter,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-smoke-test") {
    const productionRepositorySmokeTest = databaseService.productionRepositorySmokeTest(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositorySmokeTest,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-sql-contract") {
    const productionRepositorySqlContract = databaseService.productionRepositorySqlContract(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositorySqlContract,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-execution-plan") {
    const productionRepositoryExecutionPlan = databaseService.productionRepositoryExecutionPlan(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositoryExecutionPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-parameter-validation-plan") {
    const productionRepositoryParameterValidationPlan =
      databaseService.productionRepositoryParameterValidationPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryParameterValidationPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-connection-pool-plan") {
    const productionRepositoryConnectionPoolPlan =
      databaseService.productionRepositoryConnectionPoolPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryConnectionPoolPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-sql-executor-plan") {
    const productionRepositorySqlExecutorPlan =
      databaseService.productionRepositorySqlExecutorPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositorySqlExecutorPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-result-audit-plan") {
    const productionRepositoryResultAuditPlan =
      databaseService.productionRepositoryResultAuditPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryResultAuditPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-read-rehearsal-plan") {
    const productionRepositoryReadRehearsalPlan =
      databaseService.productionRepositoryReadRehearsalPlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryReadRehearsalPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-parity-plan") {
    const productionRepositoryParityPlan = databaseService.productionRepositoryParityPlan(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositoryParityPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-parity-evidence-plan") {
    const productionRepositoryParityEvidencePlan =
      databaseService.productionRepositoryParityEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryParityEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-dual-write-plan") {
    const productionRepositoryDualWritePlan = databaseService.productionRepositoryDualWritePlan(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositoryDualWritePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-shadow-write-evidence-plan") {
    const productionRepositoryShadowWriteEvidencePlan =
      databaseService.productionRepositoryShadowWriteEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryShadowWriteEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-backup-restore-evidence-plan") {
    const productionRepositoryBackupRestoreEvidencePlan =
      databaseService.productionRepositoryBackupRestoreEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryBackupRestoreEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-cutover-monitoring-evidence-plan") {
    const productionRepositoryCutoverMonitoringEvidencePlan =
      databaseService.productionRepositoryCutoverMonitoringEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryCutoverMonitoringEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-rollback-rehearsal-evidence-plan") {
    const productionRepositoryRollbackRehearsalEvidencePlan =
      databaseService.productionRepositoryRollbackRehearsalEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryRollbackRehearsalEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-cutover-audit-trail-evidence-plan") {
    const productionRepositoryCutoverAuditTrailEvidencePlan =
      databaseService.productionRepositoryCutoverAuditTrailEvidencePlan(repository.status(), repository);
    return {
      status: 200,
      body: {
        productionRepositoryCutoverAuditTrailEvidencePlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/database/production-repository-cutover-plan") {
    const productionRepositoryCutoverPlan = databaseService.productionRepositoryCutoverPlan(
      repository.status(),
      repository,
    );
    return {
      status: 200,
      body: {
        productionRepositoryCutoverPlan,
      },
    };
  }

  if (method === "GET" && pathname === "/api/job-services") {
    const activeService = reminderJobRunner.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/scheduler/status") {
    const activeService = schedulerService.status();
    return {
      status: 200,
      body: {
        activeService,
        services: [activeService],
      },
    };
  }

  if (method === "GET" && pathname === "/api/scheduler/provider-adapter") {
    return {
      status: 200,
      body: {
        providerAdapter: schedulerService.providerAdapterStatus(),
      },
    };
  }

  if (method === "GET" && pathname === "/api/markets") {
    return { status: 200, body: { markets: dataProvider.listMarkets(), provider: dataProvider.id } };
  }

  if (method === "GET" && pathname === "/api/stocks/search") {
    const query = (url.searchParams.get("q") || "").trim();
    const providerResults = dataProvider.searchStocks(query);
    const results = providerResults.length ? providerResults : searchStockCatalog(query);
    return {
      status: 200,
      body: {
        query,
        provider: dataProvider.id,
        sourceStatus: providerResults.length ? dataProvider.mode : "metadata-only-catalog",
        results,
      },
    };
  }

  if (method === "GET" && pathname === "/api/news") {
    const market = url.searchParams.get("market") || "a";
    const items = dataProvider.getNews(market);
    return {
      status: 200,
      body: {
        market,
        sourceStatus: items.length ? dataProvider.mode : "no-real-data",
        provider: dataProvider.id,
        items,
        disclaimer: items.length
          ? "当前返回已授权或已启用的数据。"
          : "严格真实数据模式下没有真实市场新闻时保持空白，不返回样例新闻。",
      },
    };
  }

  if (method === "GET" && pathname === "/api/news/intelligence") {
    const payload = await dataProvider.getImportantNews({
      market: url.searchParams.get("market"),
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
      minImportance: url.searchParams.get("minImportance"),
    });
    return {
      status: 200,
      body: newsIngestionRuntime.observePayload({
        sourceType: "news",
        market: url.searchParams.get("market"),
        symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
        payload,
      }),
    };
  }

  if (method === "GET" && pathname === "/api/news/intelligence/history") {
    return {
      status: 200,
      body: {
        items: repository.listNewsIntelligenceRecords({
          market: url.searchParams.get("market") || "",
          symbol: url.searchParams.get("symbol") || url.searchParams.get("code") || "",
          limit: Number(url.searchParams.get("limit")) || 50,
        }),
        repository: repository.status().id,
        disclaimer: "当前读取的是样例新闻情报持久化记录，不代表真实新闻库或投资建议。",
      },
    };
  }

  if (method === "POST" && pathname === "/api/news/intelligence/persist") {
    const payload = await dataProvider.getImportantNews({
      market: url.searchParams.get("market"),
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
      minImportance: url.searchParams.get("minImportance"),
    });
    const context = {
      market: payload.market,
      symbol: payload.symbol,
      scoreVersion: payload.processing?.importanceScoring || "",
      deduplicationVersion: payload.processing?.deduplication || "",
    };
    const saved = payload.items.map((item) =>
      repository.saveNewsIntelligenceRecord(sanitizeNewsIntelligenceRecord(item, context)),
    );
    repository.recordAudit({
      user: authUserFromHeaders(request.headers, repository),
      eventType: "news.intelligence.persist",
      message: "Processed news intelligence records persisted.",
      metadata: {
        market: payload.market,
        symbol: payload.symbol,
        savedCount: saved.length,
        scoreVersion: context.scoreVersion,
        deduplicationVersion: context.deduplicationVersion,
      },
    });
    return persistAndReturn(state, {
      status: 200,
      body: {
        saved,
        count: saved.length,
        processing: {
          ...payload.processing,
          persistence: "mock-repository",
        },
        deduplication: payload.deduplication,
        repository: repository.status().id,
        disclaimer: "当前仅保存样例新闻情报处理结果，不能作为真实新闻来源或投资建议。",
      },
    });
  }

  if (method === "GET" && pathname === "/api/news/filings") {
    const payload = await dataProvider.getCompanyFilings({
      market: url.searchParams.get("market"),
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
    });
    return {
      status: 200,
      body: newsIngestionRuntime.observePayload({
        sourceType: "filing",
        market: url.searchParams.get("market"),
        symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
        payload,
      }),
    };
  }

  if (method === "GET" && pathname === "/api/public-statements") {
    const payload = dataProvider.getPublicStatements({
      market: url.searchParams.get("market"),
      symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
    });
    return {
      status: 200,
      body: newsIngestionRuntime.observePayload({
        sourceType: "publicStatement",
        market: url.searchParams.get("market"),
        symbol: url.searchParams.get("symbol") || url.searchParams.get("code"),
        payload,
      }),
    };
  }

  if (method === "GET" && pathname === "/api/macro/context") {
    const payload = await dataProvider.getMacroContext({
      market: url.searchParams.get("market"),
    });
    return {
      status: payload.status === "not-found" ? 404 : 200,
      body: payload,
    };
  }

  if (method === "GET" && pathname === "/api/analysis") {
    const symbol = url.searchParams.get("symbol");
    const stock = findStock(symbol);
    if (!stock) {
      return { status: 404, body: { error: { code: "STOCK_NOT_FOUND", message: "未找到对应股票。" } } };
    }
    const user = authUserFromHeaders(request.headers, repository);
    const portfolioEntry = user
      ? repository.listPortfolioEntries(user.id).find((entry) => entry.code === stock.code)
      : null;
    const riskProfile = url.searchParams.get("riskProfile") || "balanced";
    const sourceContext = await createAnalysisSourceRefs(stock);
    const [quotePayload, historyPayload] = await Promise.all([
      dataProvider.getMarketDataQuote({ market: stock.market, code: stock.code }),
      dataProvider.getMarketDataHistory({
        market: stock.market,
        code: stock.code,
        range: "6m",
        interval: "1mo",
      }),
    ]);
    const macroContext = await dataProvider.getMacroContext({ market: stock.market });
    const complianceContext = createAnalysisComplianceContext({
      user,
      repository,
      complianceStatus: complianceService.status(),
    });
    const realDataFallback = (modelIssue = null) =>
      buildRealDataReferenceAnalysis({
        stock,
        riskProfile,
        sourceContext,
        macroContext,
        quotePayload,
        historyPayload,
        portfolioEntry,
        modelIssue,
      });
    if (dataProvider.mode !== "sample" && !aiService.providerAdapterStatus().canCallLiveModel) {
      const fallbackAnalysis = realDataFallback({
        code: "REAL_AI_MODEL_NOT_CONFIGURED",
        message: "真实 AI 模型尚未配置，已改用真实数据规则参考概率。",
      });
      if (fallbackAnalysis) {
        return {
          status: 200,
          body: {
            ...fallbackAnalysis,
            sourceRefs: sourceContext.sourceRefs,
            inputCoverage: {
              ...fallbackAnalysis.inputCoverage,
              ...sourceContext.inputCoveragePatch,
              compliance: complianceContext.inputCoverage,
            },
            complianceContext,
            modelIssue: {
              code: "REAL_AI_MODEL_NOT_CONFIGURED",
              message: "真实 AI 模型尚未配置，已改用真实数据规则参考概率。",
            },
            providerAdapter: aiService.providerAdapterStatus(),
          },
        };
      }
      return {
        status: 424,
        body: {
          error: {
            code: "REAL_AI_MODEL_NOT_CONFIGURED",
            message: "真实 AI 模型尚未配置，且当前没有足够真实行情、新闻、公告或宏观数据生成规则参考概率；本次保持空白。",
          },
          providerAdapter: aiService.providerAdapterStatus(),
        },
      };
    }
    let analysis;
    try {
      analysis =
        dataProvider.mode !== "sample"
          ? await aiService.generateLiveAnalysis({
              stock,
              riskProfile,
              sourceContext,
              macroContext,
              portfolioEntry,
            })
          : aiService.generateAnalysis({
              stock,
              riskProfile,
              sourceContext,
              macroContext,
              portfolioEntry,
            });
    } catch (error) {
      const fallbackAnalysis =
        dataProvider.mode !== "sample"
          ? realDataFallback({
              code: error.code || "REAL_AI_MODEL_EMPTY",
              message: error.message || "真实 AI 模型未返回可展示分析，已改用真实数据规则参考概率。",
            })
          : null;
      if (fallbackAnalysis) {
        return {
          status: 200,
          body: {
            ...fallbackAnalysis,
            sourceRefs: sourceContext.sourceRefs,
            inputCoverage: {
              ...fallbackAnalysis.inputCoverage,
              ...sourceContext.inputCoveragePatch,
              compliance: complianceContext.inputCoverage,
            },
            complianceContext,
            modelIssue: {
              code: error.code || "REAL_AI_MODEL_EMPTY",
              message: error.message || "真实 AI 模型未返回可展示分析，已改用真实数据规则参考概率。",
            },
            providerRelay: error.providerRelay || null,
            providerAdapter: aiService.providerAdapterStatus(),
          },
        };
      }
      return {
        status: 424,
        body: {
          error: {
            code: error.code || "REAL_AI_MODEL_EMPTY",
            message: error.message || "真实 AI 模型未返回可展示分析；本次保持空白。",
          },
          providerRelay: error.providerRelay || null,
          providerAdapter: aiService.providerAdapterStatus(),
        },
      };
    }
    return {
      status: 200,
      body: {
        ...analysis,
        sourceRefs: sourceContext.sourceRefs,
        inputCoverage: {
          ...analysis.inputCoverage,
          ...sourceContext.inputCoveragePatch,
          compliance: complianceContext.inputCoverage,
        },
        complianceContext,
      },
    };
  }

  if (pathname === "/api/analysis/history") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步分析历史。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: {
          items: repository.listAnalysisHistory(user.id),
        },
      };
    }

    if (method === "POST") {
      const record = sanitizeAnalysisRecord(request.body || {}, user);
      if (!record) {
        return {
          status: 400,
          body: { error: { code: "INVALID_ANALYSIS_RECORD", message: "分析历史记录无效。" } },
        };
      }

      repository.saveAnalysisHistory(record);
      repository.recordAudit({
        user,
        eventType: "analysis.history.save",
        message: "Analysis history record saved.",
        metadata: {
          symbol: record.symbol,
          market: record.market,
          riskProfile: record.riskProfile,
          upsideProbability: record.upsideProbability,
        },
      });
      return persistAndReturn(state, {
        status: 200,
        body: { saved: record },
      });
    }
  }

  if (method === "POST" && pathname === "/api/auth/demo-login") {
    const login = authService.demoLogin();
    recordAuthAudit(repository, {
      user: login.user,
      eventType: "auth.signIn",
      action: "demoSignIn",
      legacyEventType: "auth.demo_login",
      message: "Demo user signed in.",
      metadata: {
        method: "demoToken",
        sessionMode: "demo-token",
        roleCount: login.user.roles?.length || 0,
      },
    });
    await persistState(state);
    return { status: 200, body: login };
  }

  if (pathname === "/api/auth/roles") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后管理样例角色。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: {
          user,
          rolePolicy: authService.rolePolicy(),
        },
      };
    }

    if (method === "POST") {
      try {
        const payload = await readBody(request);
        const result = authService.updateRoles(payload, repository, user);
        recordAuthAudit(repository, {
          user: result.user,
          eventType: "auth.roleChange",
          action: "roleSelfUpdate",
          legacyEventType: "auth.roles.update",
          message: "Mock user roles updated.",
          metadata: {
            roles: result.user.roles,
            rolePolicy: result.rolePolicy.id,
            mode: result.rolePolicy.mode,
          },
        });
        await persistState(state);
        return { status: 200, body: result };
      } catch (error) {
        return {
          status: error.status || 400,
          body: {
            error: {
              code: error.code || "AUTH_ROLE_UPDATE_FAILED",
              message: error.message || "角色更新失败。",
            },
          },
        };
      }
    }
  }

  if (method === "POST" && pathname === "/api/admin/auth/users/roles") {
    const actor = authUserFromHeaders(request.headers, repository);
    if (!actor) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后执行管理员角色授权。" } },
      };
    }

    try {
      const payload = await readBody(request);
      const result = authService.assignRoles(payload, repository, actor);
      recordAuthAudit(repository, {
        user: result.actor,
        eventType: "auth.roleChange",
        action: "adminAssign",
        legacyEventType: "auth.roles.admin_assign",
        message: "Mock admin assigned user roles.",
        metadata: {
          actorUserId: result.actor.id,
          targetUserId: result.targetUser.id,
          targetEmail: result.targetUser.email || "",
          roles: result.targetUser.roles,
          roleExpiresAt: result.roleGrant?.expiresAt || "",
          rolePolicy: result.rolePolicy.id,
          mode: result.rolePolicy.mode,
        },
      });
      await persistState(state);
      return { status: 200, body: result };
    } catch (error) {
      return {
        status: error.status || 400,
        body: {
          error: {
            code: error.code || "AUTH_ADMIN_ROLE_ASSIGN_FAILED",
            message: error.message || "管理员角色授权失败。",
          },
        },
      };
    }
  }

  if (method === "POST" && pathname === "/api/admin/auth/users/roles/revoke") {
    const actor = authUserFromHeaders(request.headers, repository);
    if (!actor) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后执行管理员角色撤销。" } },
      };
    }

    try {
      const payload = await readBody(request);
      const result = authService.revokeRoles(payload, repository, actor);
      recordAuthAudit(repository, {
        user: result.actor,
        eventType: "auth.roleChange",
        action: "adminRevoke",
        legacyEventType: "auth.roles.admin_revoke",
        message: "Mock admin revoked user roles.",
        metadata: {
          actorUserId: result.actor.id,
          targetUserId: result.targetUser.id,
          targetEmail: result.targetUser.email || "",
          revokedRoles: result.revokedRoles,
          remainingRoles: result.targetUser.roles,
          rolePolicy: result.rolePolicy.id,
          mode: result.rolePolicy.mode,
        },
      });
      await persistState(state);
      return { status: 200, body: result };
    } catch (error) {
      return {
        status: error.status || 400,
        body: {
          error: {
            code: error.code || "AUTH_ADMIN_ROLE_REVOKE_FAILED",
            message: error.message || "管理员角色撤销失败。",
          },
        },
      };
    }
  }

  if (method === "GET" && pathname === "/api/admin/auth/roles/history") {
    const actor = authUserFromHeaders(request.headers, repository);
    if (!actor) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看角色历史。" } },
      };
    }
    if (!Array.isArray(actor.roles) || !actor.roles.includes("admin")) {
      return {
        status: 403,
        body: { error: { code: "ADMIN_ROLE_REQUIRED", message: "需要管理员角色才能查看角色历史。" } },
      };
    }

    const rolePolicy = authService.rolePolicy();
    const eventTypes = new Set(rolePolicy.adminRoleHistoryPolicy.eventTypes);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit")) || rolePolicy.adminRoleHistoryPolicy.maxItems));
    const items = repository
      .listAuditEvents(actor.id, 200)
      .filter((event) => eventTypes.has(event.eventType))
      .slice(0, limit)
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        createdAt: event.createdAt,
        severity: event.severity,
        message: event.message,
        metadata: event.metadata,
      }));

    return {
      status: 200,
      body: {
        items,
        policy: rolePolicy.adminRoleHistoryPolicy,
        disclaimer:
          "当前仅返回本管理员账号发起的 mock 角色变更历史；生产版需要独立审计查询权限、筛选和不可篡改存储。",
      },
    };
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    try {
      const payload = await readBody(request);
      const registration = authService.register(payload, repository);
      recordAuthAudit(repository, {
        user: registration.user,
        eventType: "auth.signUp",
        action: "emailPasswordSignUp",
        legacyEventType: "auth.register",
        message: "Mock email user registered.",
        metadata: {
          method: "emailPassword",
          sessionMode: "email-password-session",
          roleCount: registration.user.roles?.length || 0,
        },
      });
      await persistState(state);
      return { status: 201, body: registration };
    } catch (error) {
      return {
        status: error.status || 400,
        body: {
          error: {
            code: error.code || "AUTH_REGISTER_FAILED",
            message: error.message || "注册失败。",
          },
        },
      };
    }
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    try {
      const payload = await readBody(request);
      const login = authService.login(payload, repository);
      recordAuthAudit(repository, {
        user: login.user,
        eventType: "auth.signIn",
        action: "emailPasswordSignIn",
        legacyEventType: "auth.login",
        message: "Mock email user signed in.",
        metadata: {
          method: "emailPassword",
          sessionMode: "email-password-session",
          roleCount: login.user.roles?.length || 0,
        },
      });
      await persistState(state);
      return { status: 200, body: login };
    } catch (error) {
      return {
        status: error.status || 401,
        body: {
          error: {
            code: error.code || "AUTH_LOGIN_FAILED",
            message: error.message || "登录失败。",
          },
        },
      };
    }
  }

  if (method === "POST" && pathname === "/api/auth/session/refresh") {
    const refresh = authService.refreshSession(request.headers, repository);
    if (!refresh?.user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后刷新会话。" } },
      };
    }

    recordAuthAudit(repository, {
      user: refresh.user,
      eventType: "auth.sessionRefresh",
      action: "sessionRefresh",
      legacyEventType: "auth.session.refresh",
      message: "Mock auth session refreshed.",
      metadata: {
        rotated: refresh.rotated,
        sessionMode: refresh.sessionMode,
        roleCount: refresh.user.roles?.length || 0,
      },
    });
    await persistState(state);
    return {
      status: 200,
      body: {
        token: refresh.token,
        tokenType: refresh.tokenType,
        expiresInSeconds: refresh.expiresInSeconds,
        expiresAt: refresh.expiresAt,
        user: refresh.user,
        rotated: refresh.rotated,
        disclaimer:
          "当前为样例会话刷新；生产环境还需要刷新令牌族、设备绑定、复用检测和风险控制。",
      },
    };
  }

  if (method === "GET" && pathname === "/api/auth/sessions") {
    const sessionList = authService.listSessions(request.headers, repository);
    if (!sessionList?.user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看会话列表。" } },
      };
    }

    recordAuthAudit(repository, {
      user: sessionList.user,
      eventType: "auth.sessionList",
      action: "sessionList",
      legacyEventType: "auth.sessions.list",
      message: "Mock auth sessions listed.",
      metadata: {
        sessionCount: sessionList.items.length,
        sensitiveSessionFieldsReturned: false,
        sessionModes: [...new Set(sessionList.items.map((session) => session.sessionMode))],
      },
    });
    await persistState(state);
    return {
      status: 200,
      body: sessionList,
    };
  }

  const revokeSessionMatch = pathname.match(/^\/api\/auth\/sessions\/([^/]+)$/);
  if (method === "DELETE" && revokeSessionMatch) {
    let revoke;
    try {
      revoke = authService.revokeSession(
        request.headers,
        repository,
        decodeURIComponent(revokeSessionMatch[1]),
      );
    } catch (error) {
      return {
        status: error.status || 400,
        body: {
          error: {
            code: error.code || "AUTH_SESSION_REVOKE_FAILED",
            message: error.message || "会话撤销失败。",
          },
        },
      };
    }
    if (!revoke?.user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后撤销会话。" } },
      };
    }

    recordAuthAudit(repository, {
      user: revoke.user,
      eventType: "auth.sessionRevoke",
      action: "sessionRevoke",
      legacyEventType: "auth.sessions.revoke",
      message: "Mock auth session revoked.",
      metadata: {
        revoked: revoke.revoked,
        revokedSessionId: revoke.revokedSession.id,
        revokedCurrentSession: false,
        sensitiveSessionFieldsReturned: false,
        sessionMode: revoke.sessionMode,
      },
    });
    await persistState(state);
    return {
      status: 200,
      body: {
        success: true,
        revoked: revoke.revoked,
        revokedSession: revoke.revokedSession,
        user: revoke.user,
        disclaimer: revoke.disclaimer,
      },
    };
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const logout = authService.logout(request.headers, repository);
    if (!logout?.user) {
      return { status: 401, body: { error: { code: "UNAUTHORIZED", message: "请先登录后退出。" } } };
    }

    recordAuthAudit(repository, {
      user: logout.user,
      eventType: "auth.signOut",
      action: "sessionSignOut",
      legacyEventType: "auth.logout",
      message: "User signed out.",
      metadata: { revoked: logout.revoked, sessionMode: logout.sessionMode },
    });
    await persistState(state);
    return {
      status: 200,
      body: {
        success: true,
        revoked: logout.revoked,
        user: logout.user,
        disclaimer: "当前为样例退出登录；生产环境还需要刷新令牌、设备列表和风险控制。",
      },
    };
  }

  if (method === "GET" && pathname === "/api/me") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return { status: 401, body: { error: { code: "UNAUTHORIZED", message: "请先登录。" } } };
    }
    return { status: 200, body: { user } };
  }

  if (pathname === "/api/preferences") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步偏好设置。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: {
          preferences: repository.getPreferences(user.id, sanitizePreferences()),
        },
      };
    }

    if (method === "POST") {
      const current = repository.getPreferences(user.id, sanitizePreferences());
      const saved = {
        ...sanitizePreferences(request.body || {}, current),
        updatedAt: new Date().toISOString(),
      };
      repository.savePreferences(user.id, saved);
      repository.recordAudit({
        user,
        eventType: "preferences.save",
        message: "User preferences saved.",
        metadata: {
          riskProfile: saved.riskProfile,
          notificationChannels: Object.entries(saved.notifications)
            .filter(([, enabled]) => enabled)
            .map(([channel]) => channel),
        },
      });
      return persistAndReturn(state, {
        status: 200,
        body: { preferences: saved },
      });
    }
  }

  if (pathname === "/api/watchlist") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步自选股。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: { items: repository.listWatchlistCodes(user.id).map((code) => findStock(code)).filter(Boolean) },
      };
    }

    if (method === "POST") {
      const body = request.body || {};
      const stock = findStock(body.code);
      if (!stock) {
        return { status: 404, body: { error: { code: "STOCK_NOT_FOUND", message: "未找到对应股票。" } } };
      }
      const size = repository.addWatchlistCode(user.id, stock.code);
      repository.recordAudit({
        user,
        eventType: "watchlist.add",
        message: "Watchlist item added.",
        metadata: { code: stock.code, market: stock.market },
      });
      return persistAndReturn(state, {
        status: 200,
        body: { added: stock.code, size },
      });
    }
  }

  if (method === "DELETE" && pathname.startsWith("/api/watchlist/")) {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步自选股。" } },
      };
    }

    const code = decodeURIComponent(pathname.split("/").pop());
    const size = repository.removeWatchlistCode(user.id, code);
    repository.recordAudit({
      user,
      eventType: "watchlist.remove",
      message: "Watchlist item removed.",
      metadata: { code },
    });
    return persistAndReturn(state, {
      status: 200,
      body: { removed: code, size },
    });
  }

  if (pathname === "/api/reminders") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步提醒规则。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: { items: repository.listReminders(user.id) },
      };
    }

    if (method === "POST") {
      const body = request.body || {};
      const stock = findStock(body.code);
      const threshold = String(body.threshold || "").trim();
      if (!stock) {
        return { status: 404, body: { error: { code: "STOCK_NOT_FOUND", message: "未找到对应股票。" } } };
      }
      if (!validReminderTypes.has(body.type) || !threshold) {
        return {
          status: 400,
          body: { error: { code: "INVALID_REMINDER_RULE", message: "提醒规则类型或触发数值无效。" } },
        };
      }
      const channels = sanitizeReminderChannels(body.channels);
      if (channels.length === 0) {
        return {
          status: 400,
          body: {
            error: {
              code: "INVALID_REMINDER_CHANNELS",
              message: "请至少选择一种可用提醒方式后，再保存提醒规则。",
            },
          },
        };
      }

      const rule = {
        id: repository.nextReminderId(),
        userId: user.id,
        code: stock.code,
        type: body.type,
        threshold,
        channels,
        createdAt: new Date().toISOString(),
      };
      repository.addReminder(rule);
      repository.recordAudit({
        user,
        eventType: "reminder.add",
        message: "Reminder rule added.",
        metadata: { code: stock.code, type: rule.type, channels: rule.channels },
      });
      return persistAndReturn(state, { status: 200, body: { saved: rule } });
    }
  }

  if (method === "DELETE" && pathname.startsWith("/api/reminders/")) {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步提醒规则。" } },
      };
    }

    const id = decodeURIComponent(pathname.split("/").pop());
    const size = repository.removeReminder(user.id, id);
    repository.recordAudit({
      user,
      eventType: "reminder.remove",
      message: "Reminder rule removed.",
      metadata: { id },
    });
    return persistAndReturn(state, {
      status: 200,
      body: { removed: id, size },
    });
  }

  if (method === "POST" && pathname === "/api/reminders/evaluate") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后评估提醒规则。" } },
      };
    }

    const result = reminderJobRunner.evaluateReminderRulesForUser(repository, user);
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "POST" && pathname === "/api/jobs/run") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后运行后端任务。" } },
      };
    }

    const body = request.body || {};
    const type = body.type || "reminderEvaluation";
    const job = reminderJobRunner.runJob(repository, user, type);
    if (!job.ok) {
      return {
        status: 400,
        body: { error: job.error },
      };
    }

    return persistAndReturn(state, {
      status: 200,
      body: { jobRun: job.jobRun, result: job.result },
    });
  }

  if (method === "POST" && pathname === "/api/scheduler/run-due") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后运行调度任务。" } },
      };
    }

    const body = request.body || {};
    const result = schedulerService.runDueJobs(repository, user, {
      requestedBy: "api",
      idempotencyKey: body.idempotencyKey,
    });
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "GET" && pathname === "/api/scheduler/dead-letter") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看死信任务。" } },
      };
    }

    return {
      status: 200,
      body: {
        items: repository.listDeadLetterJobs(user.id),
        policy: schedulerService.status().deadLetterPolicy,
        disclaimer: "死信任务仅用于排查样例后台任务失败，不代表真实生产队列已接入。",
      },
    };
  }

  if (method === "GET" && pathname === "/api/scheduler/worker-health") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看 worker 健康状态。" } },
      };
    }

    return {
      status: 200,
      body: schedulerService.workerHealth(repository, user),
    };
  }

  if (method === "POST" && pathname === "/api/scheduler/worker-heartbeat") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后记录 worker 心跳。" } },
      };
    }

    const result = schedulerService.recordWorkerHeartbeat(repository, user, {
      ...(request.body || {}),
      workerSecret: request.body?.workerSecret || headerValue(request.headers, "x-worker-secret"),
      workerSignature:
        request.body?.workerSignature || headerValue(request.headers, "x-worker-signature"),
      workerTimestamp:
        request.body?.workerTimestamp || headerValue(request.headers, "x-worker-timestamp"),
      workerNonce:
        request.body?.workerNonce || headerValue(request.headers, "x-worker-nonce"),
    });
    if (result.ok === false) {
      return {
        status: 403,
        body: { error: result.error, workerAuth: result.workerAuth },
      };
    }
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "GET" && pathname === "/api/scheduler/queue") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看队列任务。" } },
      };
    }

    return {
      status: 200,
      body: {
        ...schedulerService.queueState(repository, user),
        items: repository.listQueuedJobs(user.id),
      },
    };
  }

  if (method === "POST" && pathname === "/api/scheduler/enqueue") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后创建演练队列任务。" } },
      };
    }

    const result = schedulerService.enqueueJob(repository, user, request.body || {});
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "POST" && pathname === "/api/scheduler/worker-nonces/cleanup") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后清理 worker nonce。" } },
      };
    }

    const result = schedulerService.cleanupWorkerRequestNonces(repository, user, {
      requestedBy: "api",
    });
    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "POST" && pathname === "/api/scheduler/process-queue") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后处理演练队列任务。" } },
      };
    }

    const result = schedulerService.processQueuedJobs(repository, user, {
      requestedBy: "api",
      workerId: request.body?.workerId,
      limit: request.body?.limit,
      workerSecret: request.body?.workerSecret || headerValue(request.headers, "x-worker-secret"),
      workerSignature:
        request.body?.workerSignature || headerValue(request.headers, "x-worker-signature"),
      workerTimestamp:
        request.body?.workerTimestamp || headerValue(request.headers, "x-worker-timestamp"),
      workerNonce:
        request.body?.workerNonce || headerValue(request.headers, "x-worker-nonce"),
    });
    if (result.ok === false) {
      return {
        status: 403,
        body: { error: result.error, workerAuth: result.workerAuth },
      };
    }
    return persistAndReturn(state, {
      status: 200,
      body: {
        ...result,
        queueState: {
          ...result.queueState,
          items: repository.listQueuedJobs(user.id),
        },
      },
    });
  }

  const deadLetterReplayMatch = pathname.match(/^\/api\/scheduler\/dead-letter\/([^/]+)\/replay$/);
  if (method === "POST" && deadLetterReplayMatch) {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后重放死信任务。" } },
      };
    }

    const result = schedulerService.replayDeadLetterJob(
      repository,
      user,
      decodeURIComponent(deadLetterReplayMatch[1]),
    );
    if (!result.ok) {
      const status = result.error?.code === "DEAD_LETTER_NOT_FOUND" ? 404 : 400;
      return persistAndReturn(state, {
        status,
        body: result,
      });
    }

    return persistAndReturn(state, {
      status: 200,
      body: result,
    });
  }

  if (method === "GET" && pathname === "/api/notifications") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看通知。" } },
      };
    }

    return {
      status: 200,
      body: {
        items: repository.listNotifications(user.id),
      },
    };
  }

  if (method === "POST" && pathname.startsWith("/api/notifications/") && pathname.endsWith("/read")) {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后更新通知。" } },
      };
    }

    const id = decodeURIComponent(pathname.split("/").at(-2));
    const notification = repository.markNotificationRead(user.id, id);
    if (!notification) {
      return {
        status: 404,
        body: { error: { code: "NOTIFICATION_NOT_FOUND", message: "未找到对应通知。" } },
      };
    }
    repository.recordAudit({
      user,
      eventType: "notification.read",
      message: "Notification marked as read.",
      metadata: { id },
    });
    return persistAndReturn(state, {
      status: 200,
      body: { notification },
    });
  }

  if (method === "POST" && pathname.startsWith("/api/notifications/") && pathname.endsWith("/retry")) {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后重试通知投递。" } },
      };
    }

    const id = decodeURIComponent(pathname.split("/").at(-2));
    const notification = notificationService.attemptDelivery({
      repository,
      user,
      notificationId: id,
      reason: "manual-retry",
    });
    if (!notification) {
      return {
        status: 404,
        body: { error: { code: "NOTIFICATION_NOT_FOUND", message: "未找到对应通知。" } },
      };
    }
    return persistAndReturn(state, {
      status: 200,
      body: { notification },
    });
  }

  if (method === "GET" && pathname === "/api/jobs") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看任务记录。" } },
      };
    }

    return {
        status: 200,
        body: {
        items: repository.listJobRuns(user.id),
      },
    };
  }

  if (pathname === "/api/portfolio") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后同步持仓。" } },
      };
    }

    if (method === "GET") {
      return {
        status: 200,
        body: {
          items: repository.listPortfolioEntries(user.id),
        },
      };
    }

    if (method !== "POST") {
      return { status: 405, body: { error: { code: "METHOD_NOT_ALLOWED", message: "请求方法不支持。" } } };
    }

    const body = request.body || {};
    const stock = findStock(body.code);
    if (!stock) {
      return { status: 404, body: { error: { code: "STOCK_NOT_FOUND", message: "未找到对应股票。" } } };
    }

    const buyPrice = Number(body.buyPrice);
    const holdingQty = Number(body.holdingQty);
    const hasPositionValue = buyPrice > 0 && holdingQty > 0;
    const cost = hasPositionValue ? buyPrice * holdingQty : null;
    const sampleMarketValue = hasPositionValue ? stock.samplePrice * holdingQty : null;
    const sampleReturnPct =
      hasPositionValue && cost > 0 ? ((sampleMarketValue - cost) / cost) * 100 : null;
    const saved = {
      userId: user.id,
      code: stock.code,
      buyPrice: body.buyPrice || "",
      holdingQty: body.holdingQty || "",
      buyDate: body.buyDate || "",
      targetReturn: body.targetReturn || "",
      maxLoss: body.maxLoss || "",
      savedAt: new Date().toISOString(),
    };
    const savedEntry = repository.savePortfolioEntry(saved);
    repository.recordAudit({
      user,
      eventType: "portfolio.upsert",
      message: "Portfolio fields saved or updated.",
      metadata: {
        code: stock.code,
        filledFields: ["buyPrice", "holdingQty", "buyDate", "targetReturn", "maxLoss"].filter((key) =>
          Boolean(savedEntry[key]),
        ).length,
      },
    });
    return persistAndReturn(state, {
      status: 200,
      body: {
        saved: savedEntry,
        localSummary: {
          samplePrice: stock.samplePrice,
          cost,
          sampleMarketValue,
          sampleReturnPct,
          disclaimer: "样例价格估算，不代表真实行情、真实盈亏或投资建议。",
        },
      },
    });
  }

  if (method === "GET" && pathname === "/api/audit-log") {
    const user = authUserFromHeaders(request.headers, repository);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: "UNAUTHORIZED", message: "请先登录后查看审计事件。" } },
      };
    }

    return {
        status: 200,
        body: {
        items: repository.listAuditEvents(user.id),
      },
    };
  }

  return { status: 404, body: { error: { code: "NOT_FOUND", message: "接口不存在。" } } };
}

async function routeRequest(request, response, state) {
  const body = ["POST", "PUT", "PATCH"].includes(request.method) ? await readBody(request) : undefined;
  const result = await handleMockRequest(
    {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
    },
    state,
  );
  jsonResponse(response, result.status, result.body);
}

export function createAppServer(options = {}) {
  const state = options.state || createMockState();
  return createServer((request, response) => {
    routeRequest(request, response, state).catch((error) => {
      errorResponse(response, 400, "BAD_REQUEST", error.message);
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4180);
  const state = process.env.FINANCE_AI_DATA_FILE
    ? await loadStateFromFile(process.env.FINANCE_AI_DATA_FILE)
    : createMockState();
  const server = createAppServer({ state });
  server.listen(port, () => {
    console.log(`finance-ai-assistant backend listening on http://localhost:${port}`);
  });
}
