import { filings, markets, newsByMarket, publicStatements, stocks } from "../mock-data.mjs";
import { createMacroDataProviderAdapter } from "./macro-data-provider.mjs";
import { createMarketDataProviderAdapter } from "./market-data-provider.mjs";
import { createNewsFilingsProviderAdapter } from "./news-filings-provider.mjs";

const providerStatus = {
  id: "mock",
  name: "Mock Sample Provider",
  mode: "sample",
  status: "connected",
  coverage: ["a", "hk", "us"],
  capabilities: [
    "markets",
    "stockSearch",
    "marketNews",
    "analysisInputs",
    "priceHistory",
    "reminderEvaluation",
    "integrationPlan",
    "providerRegistry",
    "vendorReadinessChecklist",
    "providerSetupGuide",
    "marketDataVendorChecklist",
    "newsFilingsVendorChecklist",
    "macroDataVendorChecklist",
    "publicStatementsVendorChecklist",
    "marketDataAdapter",
    "fixtureMarketDataRead",
    "macroDataAdapter",
    "fixtureMacroDataRead",
    "newsFilingsAdapter",
    "fixtureNewsIntelligenceRead",
    "newsIngestionRuntime",
    "dataIngestionChannelStrategy",
  ],
  disclaimer: "当前为样例数据源，用于接口联调和网页原型运行，不代表实时行情或真实新闻。",
};

const sourceGroups = [
  {
    id: "marketData",
    label: "实时/延迟行情",
    markets: ["a", "hk", "us"],
    capabilities: ["quotes", "priceHistory", "tradingCalendar"],
    envVars: ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"],
    required: true,
  },
  {
    id: "marketNews",
    label: "财经新闻与公告",
    markets: ["a", "hk", "us"],
    capabilities: ["marketNews", "companyFilings", "importanceScoring"],
    envVars: ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"],
    required: true,
  },
  {
    id: "macroData",
    label: "宏观经济数据",
    markets: ["a", "hk", "us"],
    capabilities: ["rates", "fx", "inflation", "policyEvents"],
    envVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
    required: true,
  },
  {
    id: "publicStatements",
    label: "高管/政府公开言论",
    markets: ["a", "hk", "us"],
    capabilities: ["verifiedPublicStatements", "socialMonitoring", "sourceAttribution"],
    envVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
    required: false,
  },
];

const providerCandidates = [
  {
    id: "licensed-market-data",
    groupId: "marketData",
    label: "授权行情 Provider",
    mode: "delayed-or-live",
    markets: ["a", "hk", "us"],
    capabilities: ["quotes", "priceHistory", "tradingCalendar"],
    adapterModule: "backend/providers/market-data-provider.mjs",
    notes: "用于接入持牌行情、延迟行情或交易所授权数据；上线前必须确认展示和缓存许可。",
  },
  {
    id: "alpha-vantage",
    groupId: "marketData",
    label: "Alpha Vantage 行情 Provider",
    mode: "delayed",
    markets: ["a", "hk", "us"],
    capabilities: ["quotes", "globalQuote", "sourceAttribution"],
    adapterModule: "backend/providers/market-data-provider.mjs",
    notes: "第一阶段用于真实 quote smoke 和延迟行情联调；上线前仍必须确认 API key 权限、交易所授权、缓存和展示条款。",
  },
  {
    id: "twelve-data",
    groupId: "marketData",
    label: "Twelve Data 行情 Provider",
    mode: "delayed-or-live-by-entitlement",
    markets: ["us"],
    capabilities: ["quotes", "quote", "sourceAttribution", "freeTier800Daily"],
    adapterModule: "backend/providers/market-data-provider.mjs",
    notes: "免费 Basic 额度较 Alpha Vantage 更高；第一阶段用于美股 quote 接力，A 股/港股需单独确认符号映射、授权和延迟标签。",
  },
  {
    id: "multi-free",
    groupId: "marketData",
    label: "免费 API 接力 Provider",
    mode: "delayed-or-live-by-entitlement",
    markets: ["us"],
    capabilities: ["quotes", "providerRelay", "sourceAttribution", "quotaFallback"],
    adapterModule: "backend/providers/market-data-provider.mjs",
    notes: "按 Twelve Data -> Alpha Vantage 顺序接力；任一 provider 失败、限流或无数据时尝试下一家，严格真实数据模式下仍不回退样例数据。",
  },
  {
    id: "licensed-news-filings",
    groupId: "marketNews",
    label: "授权新闻/公告 Provider",
    mode: "delayed-or-live",
    markets: ["a", "hk", "us"],
    capabilities: ["marketNews", "companyFilings", "sourceAttribution"],
    adapterModule: "backend/providers/news-filings-provider.mjs",
    notes: "用于接入财经新闻、交易所公告和公司披露；必须保留来源和发布时间。",
  },
  {
    id: "alpha-vantage-news",
    groupId: "marketNews",
    label: "Alpha Vantage 新闻情绪 Provider",
    mode: "delayed",
    markets: ["us"],
    capabilities: ["marketNews", "newsSentiment", "sourceAttribution"],
    adapterModule: "backend/providers/news-filings-provider.mjs",
    notes: "第一阶段用于美股新闻与情绪联调；A 股/港股新闻覆盖、缓存、短摘录和再分发条款仍需单独确认。",
  },
  {
    id: "sec-company-submissions",
    groupId: "marketNews",
    label: "SEC EDGAR 公司公告 Provider",
    mode: "delayed",
    markets: ["us"],
    capabilities: ["companyFilings", "secSubmissions", "sourceAttribution"],
    adapterModule: "backend/providers/news-filings-provider.mjs",
    notes: "第一阶段用于美股 SEC 公司公告真实源联调；A 股/港股公告源、缓存和展示边界仍需单独接入确认。",
  },
  {
    id: "official-macro-data",
    groupId: "macroData",
    label: "官方宏观数据 Provider",
    mode: "delayed",
    markets: ["a", "hk", "us"],
    capabilities: ["rates", "fx", "inflation", "policyEvents"],
    adapterModule: "backend/providers/macro-data-provider.mjs",
    notes: "用于接入央行、统计、利率、汇率和政策日历数据；频率通常低于行情数据。",
  },
  {
    id: "world-bank-open-data",
    groupId: "macroData",
    label: "World Bank Open Data 宏观 Provider",
    mode: "annual-delayed",
    markets: ["a", "hk", "us"],
    capabilities: ["gdpGrowth", "inflation", "realInterestRate", "sourceAttribution", "annualAsOfLabels"],
    adapterModule: "backend/providers/macro-data-provider.mjs",
    notes: "第一阶段用于 A/HK/US 官方年度宏观指标联调；无需 API key，但必须显示年度、asOf 和发布滞后说明，不能当作实时政策信号。",
  },
  {
    id: "verified-public-statements",
    groupId: "publicStatements",
    label: "公开言论 Provider",
    mode: "delayed",
    markets: ["a", "hk", "us"],
    capabilities: ["verifiedPublicStatements", "socialMonitoring", "sourceAttribution"],
    adapterModule: "backend/providers/public-statements-provider.mjs",
    notes: "用于接入已验证高管、公司、监管和政府公开言论；必须保留原始链接和身份校验状态。",
  },
];

const vendorReadinessGroups = [
  {
    id: "marketData",
    label: "行情数据",
    candidateProviderIds: ["licensed-market-data", "twelve-data", "alpha-vantage", "multi-free"],
    requiredCapabilities: ["quotes", "priceHistory", "tradingCalendar", "delayLabel"],
    requiredLicensing: ["exchangeDisplayRights", "cachePermission", "redistributionBoundary"],
    costDrivers: ["symbols", "requestVolume", "realTimeVsDelayed", "redistributionRights"],
    preferredSequence: 1,
  },
  {
    id: "marketNews",
    label: "新闻与公告",
    candidateProviderIds: ["licensed-news-filings", "alpha-vantage-news"],
    requiredCapabilities: ["marketNews", "companyFilings", "sourceAttribution", "importanceScoring"],
    requiredLicensing: ["headlineSummaryRights", "shortExcerptRights", "linkOutRequirement"],
    costDrivers: ["markets", "articleVolume", "filingFeeds", "retentionDays"],
    preferredSequence: 2,
  },
  {
    id: "macroData",
    label: "宏观经济",
    candidateProviderIds: ["official-macro-data", "world-bank-open-data"],
    requiredCapabilities: ["rates", "fx", "inflation", "policyEvents", "asOfLabels"],
    requiredLicensing: ["officialSourceTerms", "timezoneNormalization", "revisionPolicy"],
    costDrivers: ["indicatorCount", "refreshFrequency", "historicalDepth"],
    preferredSequence: 3,
  },
  {
    id: "publicStatements",
    label: "高管/政府公开言论",
    candidateProviderIds: ["verified-public-statements"],
    requiredCapabilities: ["verifiedIdentity", "sourceUrl", "speakerRole", "manualReviewQueue"],
    requiredLicensing: ["platformTerms", "publicFigureVerification", "shortExcerptOnly"],
    costDrivers: ["monitoredAccounts", "jurisdictions", "reviewVolume"],
    preferredSequence: 4,
  },
];

function isConfigured(env = {}, envVars = []) {
  return envVars.every((name) => typeof env[name] === "string" && env[name].trim());
}

function hasEnvValue(env = {}, name = "") {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function hasMarketDataCredential(env = {}, selectedProvider = "") {
  if (selectedProvider === "multi-free") {
    return (
      hasEnvValue(env, "FINANCE_AI_TWELVE_DATA_API_KEY") ||
      hasEnvValue(env, "FINANCE_AI_ALPHA_VANTAGE_API_KEY") ||
      hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY")
    );
  }
  if (selectedProvider === "twelve-data") {
    return hasEnvValue(env, "FINANCE_AI_TWELVE_DATA_API_KEY") || hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY");
  }
  if (selectedProvider === "alpha-vantage") {
    return hasEnvValue(env, "FINANCE_AI_ALPHA_VANTAGE_API_KEY") || hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY");
  }
  return hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY");
}

function isWorldBankMacroProvider(selectedProvider = "") {
  return selectedProvider === "world-bank-open-data";
}

function hasMacroDataCredential(env = {}, selectedProvider = "") {
  if (isWorldBankMacroProvider(selectedProvider)) {
    return hasEnvValue(env, "FINANCE_AI_MACRO_ALLOW_NETWORK") && env.FINANCE_AI_MACRO_ALLOW_NETWORK === "true";
  }
  return hasEnvValue(env, "FINANCE_AI_MACRO_API_KEY");
}

function isSourceGroupConfigured(env = {}, group = {}) {
  if (group.id === "macroData") {
    const selectedProvider = typeof env.FINANCE_AI_MACRO_PROVIDER === "string"
      ? env.FINANCE_AI_MACRO_PROVIDER.trim()
      : "";
    return hasEnvValue(env, "FINANCE_AI_MACRO_PROVIDER") && hasMacroDataCredential(env, selectedProvider);
  }

  if (group.id !== "marketData") {
    return isConfigured(env, group.envVars);
  }

  const selectedProvider = typeof env.FINANCE_AI_MARKET_DATA_PROVIDER === "string"
    ? env.FINANCE_AI_MARKET_DATA_PROVIDER.trim()
    : "";

  return hasEnvValue(env, "FINANCE_AI_MARKET_DATA_PROVIDER") && hasMarketDataCredential(env, selectedProvider);
}

function allowMockData(env = {}) {
  return env.FINANCE_AI_ALLOW_MOCK_DATA === "true";
}

function createVendorReadinessChecklist(env = {}) {
  const integrationPlan = createDataSourceIntegrationPlan(env);
  const providerRegistry = createProviderRegistry(env);
  const marketReady = providerRegistry.selectedProviders.some(
    (provider) => provider.groupId === "marketData" && provider.status === "ready-for-adapter",
  );
  const licenseReady = env.FINANCE_AI_DATA_LICENSE_CONFIRMED === "true";
  const attributionReady = env.FINANCE_AI_SOURCE_ATTRIBUTION_READY === "true";
  const redistributionReady = env.FINANCE_AI_DATA_REDISTRIBUTION_APPROVED === "true";
  const rateLimitReady = env.FINANCE_AI_DATA_RATE_LIMIT_PLAN === "true";
  const shortlistReady = vendorReadinessGroups.every((group) => group.candidateProviderIds.length > 0);
  const coverageReady = integrationPlan.targetMarkets.length === 3 && integrationPlan.requiredSourceCount === 3;
  const checklistItems = [
    {
      id: "mvpMarketCoverage",
      label: "MVP 市场覆盖",
      status: coverageReady ? "pass" : "blocked",
      evidence: "A 股、港股、美股作为第一版必选市场。",
    },
    {
      id: "candidateShortlist",
      label: "候选供应商分组",
      status: shortlistReady ? "pass" : "blocked",
      evidence: "行情、新闻公告、宏观、公开言论均有候选 provider id。",
    },
    {
      id: "marketDataFirstSequence",
      label: "接入顺序",
      status: vendorReadinessGroups[0]?.id === "marketData" ? "pass" : "blocked",
      evidence: "先接行情，再接新闻公告、宏观和公开言论。",
    },
    {
      id: "marketDataProviderConfigured",
      label: "行情 provider 配置",
      status: marketReady ? "pass" : "blocked",
      evidence: marketReady ? "行情 provider 已选择并配置。" : "行情 provider id 或 API key 尚未配置。",
    },
    {
      id: "licenseReview",
      label: "授权审查",
      status: licenseReady ? "pass" : "blocked",
      evidence: licenseReady ? "授权环境门禁已确认。" : "展示、缓存和再分发授权仍未确认。",
    },
    {
      id: "sourceAttribution",
      label: "来源署名",
      status: attributionReady ? "pass" : "blocked",
      evidence: attributionReady ? "来源署名环境门禁已确认。" : "来源、发布时间、授权标签展示规则仍未确认。",
    },
    {
      id: "redistributionBoundary",
      label: "再分发边界",
      status: redistributionReady ? "pass" : "pending",
      evidence: redistributionReady ? "再分发边界已确认。" : "新闻摘要、短摘录、跳转链接和保留天数仍需审批。",
    },
    {
      id: "rateLimitAndCost",
      label: "限流与成本",
      status: rateLimitReady ? "pass" : "pending",
      evidence: rateLimitReady ? "限流和缓存计划已确认。" : "请求量、缓存 TTL、降级策略和成本告警仍需确认。",
    },
  ];
  const passedCount = checklistItems.filter((item) => item.status === "pass").length;
  const blockedCount = checklistItems.filter((item) => item.status === "blocked").length;
  const pendingCount = checklistItems.filter((item) => item.status === "pending").length;

  return {
    id: "real-data-vendor-readiness-checklist",
    status: blockedCount ? "blocked" : pendingCount ? "pending-approval" : "ready-for-vendor-contact",
    mode: "planning",
    preferredContactOrder: vendorReadinessGroups
      .slice()
      .sort((a, b) => a.preferredSequence - b.preferredSequence)
      .map((group) => group.id),
    targetMarkets: integrationPlan.targetMarkets,
    groups: vendorReadinessGroups,
    checklistItems,
    passedCount,
    totalCount: checklistItems.length,
    blockedCount,
    pendingCount,
    nextActions: [
      "先联系行情 provider，确认 A/HK/US 延迟数据、缓存和展示条款。",
      "第二步联系新闻/公告 provider，确认标题摘要、短摘录、原文链接和保留天数。",
      "第三步确认宏观官方数据和政策日历的 asOf、时区、修订规则。",
      "最后接入公开言论 provider，并要求身份验证、来源链接和人工复核队列。",
    ],
    disclaimer:
      "该清单用于供应商筛选和授权准备，不代表任何 provider 已签约、已付款、已接入或可用于生产投资服务。",
  };
}

function createMarketDataVendorChecklist(env = {}) {
  const providerRegistry = createProviderRegistry(env);
  const marketSelection = providerRegistry.selectedProviders.find(
    (provider) => provider.groupId === "marketData",
  );
  const providerConfigured = marketSelection?.status === "ready-for-adapter";
  const exchangeDisplayReady = env.FINANCE_AI_MARKET_DATA_DISPLAY_RIGHTS === "true";
  const cachePermissionReady = env.FINANCE_AI_MARKET_DATA_CACHE_PERMISSION === "true";
  const delayLabelReady = env.FINANCE_AI_MARKET_DATA_DELAY_LABEL_READY === "true";
  const rateLimitReady = env.FINANCE_AI_MARKET_DATA_RATE_LIMIT_READY === "true";
  const auditReady = env.FINANCE_AI_MARKET_DATA_AUDIT_READY === "true";

  const acceptanceAreas = [
    {
      id: "quoteContract",
      label: "报价接口",
      requiredFields: ["symbol", "lastPrice", "changePercent", "currency", "asOf", "delayMinutes", "source"],
      status: "defined",
    },
    {
      id: "historyContract",
      label: "历史走势",
      requiredFields: ["symbol", "period", "open", "high", "low", "close", "volume", "asOf"],
      status: "defined",
    },
    {
      id: "tradingCalendar",
      label: "交易日历",
      requiredFields: ["market", "sessionDate", "isOpen", "timezone", "holidayName"],
      status: "defined",
    },
    {
      id: "delayLabel",
      label: "延迟标签",
      requiredFields: ["realTimeOrDelayed", "delayMinutes", "displayNearPrice", "displayNearChart"],
      status: "defined",
    },
  ];
  const checklistItems = [
    {
      id: "providerCandidateKnown",
      label: "候选 provider 已知",
      status: marketSelection?.candidateIds?.includes("licensed-market-data") ? "pass" : "blocked",
      evidence: "行情候选 provider id 为 licensed-market-data。",
    },
    {
      id: "acceptanceScopeDefined",
      label: "验收范围已定义",
      status: acceptanceAreas.length >= 4 ? "pass" : "blocked",
      evidence: "报价、历史走势、交易日历和延迟标签均已列入验收。",
    },
    {
      id: "requiredFieldsDefined",
      label: "必需字段已定义",
      status: acceptanceAreas.every((area) => area.requiredFields.length >= 4) ? "pass" : "blocked",
      evidence: "每个行情能力均列出上线前必须返回和展示的字段。",
    },
    {
      id: "providerCredentials",
      label: "provider 凭证",
      status: providerConfigured ? "pass" : "blocked",
      evidence: providerConfigured ? "行情 provider 已配置。" : "仍缺 FINANCE_AI_MARKET_DATA_PROVIDER 或 API key。",
    },
    {
      id: "exchangeDisplayRights",
      label: "交易所展示授权",
      status: exchangeDisplayReady ? "pass" : "blocked",
      evidence: exchangeDisplayReady ? "展示授权已确认。" : "需确认 A/HK/US 报价、图表和延迟标签展示授权。",
    },
    {
      id: "cachePermission",
      label: "缓存权限",
      status: cachePermissionReady ? "pass" : "blocked",
      evidence: cachePermissionReady ? "缓存权限已确认。" : "需确认报价、历史走势、交易日历的缓存 TTL 和再分发边界。",
    },
    {
      id: "delayLabelDisplay",
      label: "延迟标签展示",
      status: delayLabelReady ? "pass" : "pending",
      evidence: delayLabelReady ? "延迟标签展示规则已确认。" : "需确认实时/延迟标识必须出现在价格和图表附近。",
    },
    {
      id: "rateLimitAndCostAlert",
      label: "限流与成本告警",
      status: rateLimitReady ? "pass" : "pending",
      evidence: rateLimitReady ? "限流与成本告警已确认。" : "需确认请求量、burst、降级策略和月度成本告警。",
    },
    {
      id: "auditFields",
      label: "审计字段",
      status: auditReady ? "pass" : "pending",
      evidence: auditReady ? "审计字段已确认。" : "需确认 provider request id、source、asOf、license tier 不泄露敏感字段。",
    },
  ];
  const passedCount = checklistItems.filter((item) => item.status === "pass").length;
  const blockedCount = checklistItems.filter((item) => item.status === "blocked").length;
  const pendingCount = checklistItems.filter((item) => item.status === "pending").length;

  return {
    id: "market-data-vendor-acceptance-checklist",
    status: blockedCount ? "blocked" : pendingCount ? "pending-approval" : "ready-for-provider-review",
    mode: "planning",
    targetMarkets: ["a", "hk", "us"],
    providerCandidateId: "licensed-market-data",
    acceptanceAreas,
    checklistItems,
    passedCount,
    totalCount: checklistItems.length,
    blockedCount,
    pendingCount,
    requiredQuestions: [
      "A 股、港股、美股分别支持实时还是延迟报价，延迟分钟数是多少？",
      "报价、历史走势、交易日历是否允许缓存，TTL 和最大保留天数是多少？",
      "价格、图表、AI 分析引用中必须展示哪些来源、asOf 和授权标签？",
      "免费用户、登录用户和未来付费用户是否需要不同 entitlement 或交易所协议？",
      "请求限流、burst、错误码、成本告警和降级到样例数据的边界是什么？",
    ],
    nextActions: [
      "优先拿到 A/HK/US 报价和历史走势的展示授权样例条款。",
      "把 provider 回答映射到 market-data-provider adapter 的 cache/rate-limit/attribution policy。",
      "签约前保持 runtimeMode=inactive，禁止把样例数据表述为实时或延迟行情。",
    ],
    disclaimer:
      "该行情验收清单仅用于供应商沟通和接入前评审，不代表真实行情 provider 已签约、已付款、已接入或可用于投资服务。",
  };
}

function createNewsFilingsVendorChecklist(env = {}) {
  const providerRegistry = createProviderRegistry(env);
  const newsSelection = providerRegistry.selectedProviders.find(
    (provider) => provider.groupId === "marketNews",
  );
  const providerConfigured = newsSelection?.status === "ready-for-adapter";
  const headlineRightsReady = env.FINANCE_AI_NEWS_HEADLINE_RIGHTS === "true";
  const excerptRightsReady = env.FINANCE_AI_NEWS_EXCERPT_RIGHTS === "true";
  const sourceLinkReady = env.FINANCE_AI_NEWS_SOURCE_LINK_READY === "true";
  const retentionReady = env.FINANCE_AI_NEWS_RETENTION_READY === "true";
  const paywallReady = env.FINANCE_AI_NEWS_PAYWALL_POLICY_READY === "true";
  const attributionReady = env.FINANCE_AI_NEWS_ATTRIBUTION_READY === "true";

  const acceptanceAreas = [
    {
      id: "headlineSummary",
      label: "标题摘要",
      requiredFields: ["title", "summary", "source.label", "publishedAt", "licenseTag"],
      status: "defined",
    },
    {
      id: "shortExcerpt",
      label: "短摘录",
      requiredFields: ["excerpt", "maxExcerptChars", "language", "sourceUrl", "licenseTag"],
      status: "defined",
    },
    {
      id: "sourceLink",
      label: "原文链接",
      requiredFields: ["sourceUrl", "canonicalUrl", "publisher", "publishedAt", "retrievedAt"],
      status: "defined",
    },
    {
      id: "retentionPolicy",
      label: "保留天数",
      requiredFields: ["retentionDays", "deleteAfter", "archiveAllowed", "auditEvent"],
      status: "defined",
    },
    {
      id: "paywallBoundary",
      label: "付费墙边界",
      requiredFields: ["paywallStatus", "ingestionAllowed", "excerptAllowed", "linkOnlyFallback"],
      status: "defined",
    },
  ];
  const checklistItems = [
    {
      id: "providerCandidateKnown",
      label: "候选 provider 已知",
      status: newsSelection?.candidateIds?.includes("licensed-news-filings") ? "pass" : "blocked",
      evidence: "新闻/公告候选 provider id 为 licensed-news-filings。",
    },
    {
      id: "acceptanceScopeDefined",
      label: "验收范围已定义",
      status: acceptanceAreas.length >= 5 ? "pass" : "blocked",
      evidence: "标题摘要、短摘录、原文链接、保留天数和付费墙边界均已列入验收。",
    },
    {
      id: "requiredFieldsDefined",
      label: "必需字段已定义",
      status: acceptanceAreas.every((area) => area.requiredFields.length >= 4) ? "pass" : "blocked",
      evidence: "每个新闻/公告能力均列出上线前必须返回和展示的字段。",
    },
    {
      id: "providerCredentials",
      label: "provider 凭证",
      status: providerConfigured ? "pass" : "blocked",
      evidence: providerConfigured ? "新闻/公告 provider 已配置。" : "仍缺 FINANCE_AI_NEWS_PROVIDER 或 API key。",
    },
    {
      id: "headlineRights",
      label: "标题摘要授权",
      status: headlineRightsReady ? "pass" : "blocked",
      evidence: headlineRightsReady ? "标题摘要授权已确认。" : "需确认标题、摘要和重要性评分是否允许展示。",
    },
    {
      id: "shortExcerptRights",
      label: "短摘录授权",
      status: excerptRightsReady ? "pass" : "blocked",
      evidence: excerptRightsReady ? "短摘录授权已确认。" : "需确认摘录字数、语言和原文跳转要求。",
    },
    {
      id: "sourceLinkAttribution",
      label: "来源署名与原文链接",
      status: sourceLinkReady && attributionReady ? "pass" : "blocked",
      evidence:
        sourceLinkReady && attributionReady
          ? "来源署名和原文链接已确认。"
          : "需确认 publisher、sourceUrl、publishedAt、retrievedAt 和授权标签展示规则。",
    },
    {
      id: "retentionDays",
      label: "保留天数",
      status: retentionReady ? "pass" : "pending",
      evidence: retentionReady ? "保留天数已确认。" : "需确认新闻、公告、公开言论的保留天数和删除策略。",
    },
    {
      id: "paywallBoundary",
      label: "付费墙边界",
      status: paywallReady ? "pass" : "pending",
      evidence: paywallReady ? "付费墙边界已确认。" : "需确认付费墙内容是否只能展示标题、摘要或原文链接。",
    },
  ];
  const passedCount = checklistItems.filter((item) => item.status === "pass").length;
  const blockedCount = checklistItems.filter((item) => item.status === "blocked").length;
  const pendingCount = checklistItems.filter((item) => item.status === "pending").length;

  return {
    id: "news-filings-vendor-acceptance-checklist",
    status: blockedCount ? "blocked" : pendingCount ? "pending-approval" : "ready-for-provider-review",
    mode: "planning",
    targetMarkets: ["a", "hk", "us"],
    providerCandidateId: "licensed-news-filings",
    acceptanceAreas,
    checklistItems,
    passedCount,
    totalCount: checklistItems.length,
    blockedCount,
    pendingCount,
    requiredQuestions: [
      "标题、摘要、短摘录分别允许展示多少字符，是否必须跳转原文？",
      "A 股公告、港股公告、美股 filings 的来源链接和发布时间字段是否稳定？",
      "新闻、公告、公开言论分别允许保留多少天，是否允许进入审计归档？",
      "付费墙或受限内容是否只能展示标题和来源链接，能否用于 AI 摘要？",
      "来源署名必须展示 publisher、sourceUrl、publishedAt、retrievedAt、licenseTag 中哪些字段？",
    ],
    nextActions: [
      "优先确认标题摘要、短摘录、原文链接和保留天数授权。",
      "把 provider 回答映射到 news-filings-provider adapter 的 redistribution/source-verification policy。",
      "签约前保持 runtimeMode=inactive，禁止把样例新闻表述为真实新闻或官方公告。",
    ],
    disclaimer:
      "该新闻/公告验收清单仅用于供应商沟通和接入前评审，不代表真实新闻、公告或公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
  };
}

function createMacroDataVendorChecklist(env = {}) {
  const providerRegistry = createProviderRegistry(env);
  const macroSelection = providerRegistry.selectedProviders.find(
    (provider) => provider.groupId === "macroData",
  );
  const providerConfigured = macroSelection?.status === "ready-for-adapter";
  const officialTermsReady = env.FINANCE_AI_MACRO_OFFICIAL_TERMS_READY === "true";
  const asOfLabelReady = env.FINANCE_AI_MACRO_ASOF_LABEL_READY === "true";
  const timezoneReady = env.FINANCE_AI_MACRO_TIMEZONE_READY === "true";
  const revisionPolicyReady = env.FINANCE_AI_MACRO_REVISION_POLICY_READY === "true";
  const policyCalendarReady = env.FINANCE_AI_MACRO_POLICY_CALENDAR_READY === "true";
  const auditReady = env.FINANCE_AI_MACRO_AUDIT_READY === "true";

  const acceptanceAreas = [
    {
      id: "rateIndicators",
      label: "利率指标",
      requiredFields: ["indicatorId", "value", "unit", "region", "asOf", "source.label"],
      status: "defined",
    },
    {
      id: "fxIndicators",
      label: "汇率指标",
      requiredFields: ["pair", "value", "asOf", "timezone", "source.label", "licenseTag"],
      status: "defined",
    },
    {
      id: "inflationIndicators",
      label: "通胀指标",
      requiredFields: ["indicatorId", "period", "value", "revisionId", "publishedAt", "asOf"],
      status: "defined",
    },
    {
      id: "policyEvents",
      label: "政策事件",
      requiredFields: ["eventId", "title", "jurisdiction", "scheduledAt", "timezone", "importance"],
      status: "defined",
    },
    {
      id: "revisionPolicy",
      label: "修订规则",
      requiredFields: ["revisionId", "previousValue", "revisedValue", "revisionPublishedAt", "sourceUrl"],
      status: "defined",
    },
  ];
  const checklistItems = [
    {
      id: "providerCandidateKnown",
      label: "候选 provider 已知",
      status:
        macroSelection?.candidateIds?.includes("official-macro-data") &&
        macroSelection?.candidateIds?.includes("world-bank-open-data")
          ? "pass"
          : "blocked",
      evidence: "宏观候选 provider id 包含 official-macro-data 和 world-bank-open-data。",
    },
    {
      id: "acceptanceScopeDefined",
      label: "验收范围已定义",
      status: acceptanceAreas.length >= 5 ? "pass" : "blocked",
      evidence: "利率、汇率、通胀、政策事件和修订规则均已列入验收。",
    },
    {
      id: "requiredFieldsDefined",
      label: "必需字段已定义",
      status: acceptanceAreas.every((area) => area.requiredFields.length >= 5) ? "pass" : "blocked",
      evidence: "每个宏观能力均列出上线前必须返回和展示的字段。",
    },
    {
      id: "providerCredentials",
      label: "provider 凭证",
      status: providerConfigured ? "pass" : "blocked",
      evidence: providerConfigured ? "宏观 provider 已配置。" : "仍缺 FINANCE_AI_MACRO_PROVIDER 或 API key。",
    },
    {
      id: "officialTerms",
      label: "官方来源条款",
      status: officialTermsReady ? "pass" : "blocked",
      evidence: officialTermsReady ? "官方来源使用条款已确认。" : "需确认央行、统计、利率、汇率和政策日历来源条款。",
    },
    {
      id: "asOfLabels",
      label: "asOf 标签",
      status: asOfLabelReady ? "pass" : "blocked",
      evidence: asOfLabelReady ? "asOf 标签展示已确认。" : "需确认每个宏观指标和政策事件必须展示 asOf、publishedAt 与数据新鲜度。",
    },
    {
      id: "timezoneNormalization",
      label: "时区归一",
      status: timezoneReady ? "pass" : "pending",
      evidence: timezoneReady ? "时区归一规则已确认。" : "需确认 A/HK/US 政策日历和发布时间的本地时区、UTC 与展示时区。",
    },
    {
      id: "revisionPolicy",
      label: "修订规则",
      status: revisionPolicyReady ? "pass" : "pending",
      evidence: revisionPolicyReady ? "修订规则已确认。" : "需确认历史值修订、覆盖、留痕和 AI 因子重算规则。",
    },
    {
      id: "policyCalendarVerification",
      label: "政策日历校验",
      status: policyCalendarReady ? "pass" : "pending",
      evidence: policyCalendarReady ? "政策日历校验已确认。" : "需确认官方日历来源、更新频率、取消/延期事件和人工复核边界。",
    },
    {
      id: "auditFields",
      label: "审计字段",
      status: auditReady ? "pass" : "pending",
      evidence: auditReady ? "宏观审计字段已确认。" : "需确认 provider request id、source、asOf、revisionId 不泄露原始文档或密钥。",
    },
  ];
  const passedCount = checklistItems.filter((item) => item.status === "pass").length;
  const blockedCount = checklistItems.filter((item) => item.status === "blocked").length;
  const pendingCount = checklistItems.filter((item) => item.status === "pending").length;

  return {
    id: "macro-data-vendor-acceptance-checklist",
    status: blockedCount ? "blocked" : pendingCount ? "pending-approval" : "ready-for-provider-review",
    mode: "planning",
    targetMarkets: ["a", "hk", "us"],
    providerCandidateId: "official-macro-data",
    acceptanceAreas,
    checklistItems,
    passedCount,
    totalCount: checklistItems.length,
    blockedCount,
    pendingCount,
    requiredQuestions: [
      "A 股、港股、美股分别需要哪些利率、汇率、通胀和政策事件指标？",
      "每个指标的 asOf、publishedAt、revisionId 和来源链接字段是否稳定？",
      "政策日历的时区、取消、延期、临时会议和人工复核规则是什么？",
      "历史宏观数据修订后，是否允许保留旧值、展示修订轨迹并触发 AI 因子重算？",
      "宏观数据能否用于模型参考概率，必须展示哪些官方来源和新鲜度标签？",
    ],
    nextActions: [
      "优先确认利率、汇率、通胀和政策日历的官方来源条款。",
      "把 provider 回答映射到 macro-data-provider adapter 的 freshness/revision/calendar policy。",
      "签约前保持 runtimeMode=inactive，禁止把样例宏观数据表述为实时官方宏观数据。",
    ],
    disclaimer:
      "该宏观数据验收清单仅用于供应商沟通和接入前评审，不代表真实宏观 provider 已签约、已付款、已接入或可用于投资服务。",
  };
}

function createPublicStatementsVendorChecklist(env = {}) {
  const providerRegistry = createProviderRegistry(env);
  const statementsSelection = providerRegistry.selectedProviders.find(
    (provider) => provider.groupId === "publicStatements",
  );
  const providerConfigured = statementsSelection?.status === "ready-for-adapter";
  const identityReady = env.FINANCE_AI_STATEMENT_IDENTITY_READY === "true";
  const platformTermsReady = env.FINANCE_AI_STATEMENT_PLATFORM_TERMS_READY === "true";
  const sourceLinkReady = env.FINANCE_AI_STATEMENT_SOURCE_LINK_READY === "true";
  const excerptReady = env.FINANCE_AI_STATEMENT_EXCERPT_READY === "true";
  const reviewQueueReady = env.FINANCE_AI_STATEMENT_REVIEW_QUEUE_READY === "true";
  const auditReady = env.FINANCE_AI_STATEMENT_AUDIT_READY === "true";

  const acceptanceAreas = [
    {
      id: "verifiedIdentity",
      label: "身份验证",
      requiredFields: ["speakerId", "speakerName", "speakerRole", "verificationStatus", "verifiedAt"],
      status: "defined",
    },
    {
      id: "sourceUrl",
      label: "原始链接",
      requiredFields: ["sourceUrl", "platform", "postedAt", "retrievedAt", "canonicalUrl"],
      status: "defined",
    },
    {
      id: "speakerRole",
      label: "发言人角色",
      requiredFields: ["roleType", "organization", "jurisdiction", "isMarketSensitive", "confidenceScore"],
      status: "defined",
    },
    {
      id: "platformTerms",
      label: "平台条款",
      requiredFields: ["platform", "termsStatus", "redistributionAllowed", "embeddingAllowed", "retentionDays"],
      status: "defined",
    },
    {
      id: "shortExcerptBoundary",
      label: "短摘录边界",
      requiredFields: ["excerpt", "maxExcerptChars", "language", "translationAllowed", "sourceUrl"],
      status: "defined",
    },
    {
      id: "manualReviewQueue",
      label: "人工复核队列",
      requiredFields: ["reviewStatus", "reviewReason", "priority", "reviewerRole", "slaHours"],
      status: "defined",
    },
  ];
  const checklistItems = [
    {
      id: "providerCandidateKnown",
      label: "候选 provider 已知",
      status: statementsSelection?.candidateIds?.includes("verified-public-statements") ? "pass" : "blocked",
      evidence: "公开言论候选 provider id 为 verified-public-statements。",
    },
    {
      id: "acceptanceScopeDefined",
      label: "验收范围已定义",
      status: acceptanceAreas.length >= 6 ? "pass" : "blocked",
      evidence: "身份验证、原始链接、发言人角色、平台条款、短摘录和人工复核均已列入验收。",
    },
    {
      id: "requiredFieldsDefined",
      label: "必需字段已定义",
      status: acceptanceAreas.every((area) => area.requiredFields.length >= 5) ? "pass" : "blocked",
      evidence: "每个公开言论能力均列出上线前必须返回和展示的字段。",
    },
    {
      id: "providerCredentials",
      label: "provider 凭证",
      status: providerConfigured ? "pass" : "blocked",
      evidence: providerConfigured ? "公开言论 provider 已配置。" : "仍缺 FINANCE_AI_STATEMENT_PROVIDER 或 API key。",
    },
    {
      id: "identityVerification",
      label: "身份验证规则",
      status: identityReady ? "pass" : "blocked",
      evidence: identityReady ? "身份验证规则已确认。" : "需确认 CEO、公司账号、政府高层和监管账号的身份校验信号。",
    },
    {
      id: "platformTerms",
      label: "平台条款",
      status: platformTermsReady ? "pass" : "blocked",
      evidence: platformTermsReady ? "平台条款已确认。" : "需确认社交平台、政府网站和公司 IR 页面的抓取、展示和跳转边界。",
    },
    {
      id: "sourceLinkAttribution",
      label: "来源链接与署名",
      status: sourceLinkReady ? "pass" : "blocked",
      evidence: sourceLinkReady ? "来源链接与署名已确认。" : "需确认 sourceUrl、platform、postedAt、retrievedAt 和身份标签展示规则。",
    },
    {
      id: "shortExcerptBoundary",
      label: "短摘录边界",
      status: excerptReady ? "pass" : "pending",
      evidence: excerptReady ? "短摘录边界已确认。" : "需确认摘录字符数、翻译、转述和原文跳转规则。",
    },
    {
      id: "manualReviewQueue",
      label: "人工复核队列",
      status: reviewQueueReady ? "pass" : "pending",
      evidence: reviewQueueReady ? "人工复核队列已确认。" : "需确认未验证、高影响或疑似市场敏感言论的人工复核队列。",
    },
    {
      id: "auditFields",
      label: "审计字段",
      status: auditReady ? "pass" : "pending",
      evidence: auditReady ? "公开言论审计字段已确认。" : "需确认 provider request id、sourceUrl、speakerId、reviewStatus 不记录会话 cookie 或私信内容。",
    },
  ];
  const passedCount = checklistItems.filter((item) => item.status === "pass").length;
  const blockedCount = checklistItems.filter((item) => item.status === "blocked").length;
  const pendingCount = checklistItems.filter((item) => item.status === "pending").length;

  return {
    id: "public-statements-vendor-acceptance-checklist",
    status: blockedCount ? "blocked" : pendingCount ? "pending-approval" : "ready-for-provider-review",
    mode: "planning",
    targetMarkets: ["a", "hk", "us"],
    providerCandidateId: "verified-public-statements",
    acceptanceAreas,
    checklistItems,
    passedCount,
    totalCount: checklistItems.length,
    blockedCount,
    pendingCount,
    requiredQuestions: [
      "CEO、公司账号、政府高层和监管账号分别使用哪些身份验证信号？",
      "社交平台、政府网站和公司 IR 页面是否允许抓取、短摘录、翻译和链接跳转？",
      "未验证账号、截图搬运、转述内容和疑似高影响言论如何进入人工复核队列？",
      "公开言论能否用于模型参考概率，必须展示哪些 speakerRole、sourceUrl 和 postedAt 标签？",
      "审计记录中必须避免保存哪些 cookie、私信、非公开内容或平台受限字段？",
    ],
    nextActions: [
      "优先确认已验证发言人身份、来源链接和平台条款边界。",
      "把 provider 回答映射到 news-filings-provider adapter 的 source-verification/manual-review policy。",
      "签约前保持 runtimeMode=inactive，禁止把样例公开言论表述为真实社交媒体监控。",
    ],
    disclaimer:
      "该公开言论验收清单仅用于供应商沟通和接入前评审，不代表真实公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
  };
}

function createDataSourceIntegrationPlan(env = {}) {
  const plannedSources = sourceGroups.map((group) => ({
    ...group,
    configured: isSourceGroupConfigured(env, group),
    envVars: group.envVars.map((name) => ({
      name,
      configured:
        group.id === "marketData" && name === "FINANCE_AI_MARKET_DATA_API_KEY"
          ? hasMarketDataCredential(env, env.FINANCE_AI_MARKET_DATA_PROVIDER?.trim() || "")
          : hasEnvValue(env, name),
      secret: name.endsWith("_API_KEY"),
    })),
  }));
  const requiredSources = plannedSources.filter((group) => group.required);
  const configuredRequiredCount = requiredSources.filter((group) => group.configured).length;
  const configuredOptionalCount = plannedSources.filter(
    (group) => !group.required && group.configured,
  ).length;
  const allRequiredConfigured = configuredRequiredCount === requiredSources.length;
  const blockedReasons = [];

  if (!allRequiredConfigured) {
    blockedReasons.push("实时行情、新闻/公告或宏观数据 provider 尚未完整配置。");
  }
  if (env.FINANCE_AI_DATA_LICENSE_CONFIRMED !== "true") {
    blockedReasons.push("尚未确认数据源授权、展示许可、缓存许可和再分发边界。");
  }
  if (env.FINANCE_AI_SOURCE_ATTRIBUTION_READY !== "true") {
    blockedReasons.push("尚未完成新闻、公告、社交/公开言论的来源署名规则。");
  }

  const complianceChecks = [
    {
      id: "licenseReview",
      label: "数据授权审查",
      status: env.FINANCE_AI_DATA_LICENSE_CONFIRMED === "true" ? "pass" : "blocked",
    },
    {
      id: "sourceAttribution",
      label: "来源署名",
      status: env.FINANCE_AI_SOURCE_ATTRIBUTION_READY === "true" ? "pass" : "blocked",
    },
    {
      id: "redistributionBoundary",
      label: "再分发边界",
      status: env.FINANCE_AI_DATA_REDISTRIBUTION_APPROVED === "true" ? "pass" : "pending",
    },
    {
      id: "rateLimitPlan",
      label: "限流与缓存",
      status: env.FINANCE_AI_DATA_RATE_LIMIT_PLAN === "true" ? "pass" : "pending",
    },
  ];
  const dryRunPreflightPlan = {
    id: "real-data-source-integration-dry-run-preflight",
    status: "defined",
    mode: "dry-run-no-provider-fetch",
    requiredManualApproval: true,
    canCallProviderNetwork: false,
    canPersistProviderPayload: false,
    canEnableLiveRuntime: false,
    requestEnvelope: {
      requiredFields: [
        "market",
        "providerGroup",
        "adapterModule",
        "requestedCapability",
        "sourceAttributionPolicy",
        "licenseGate",
        "rateLimitPolicy",
        "fallbackMode",
      ],
      forbiddenFields: ["apiKey", "providerSecret", "rawFullText", "rawTick", "userTradingCredentials"],
    },
    safetyChecks: [
      "manual-approval-before-provider-call",
      "license-gate-before-display",
      "source-attribution-before-ai-analysis",
      "rate-limit-and-cost-dry-run",
      "fixture-fallback-required",
      "no-network-in-preflight",
    ],
    rollback: {
      defaultRuntimeProvider: "mock",
      disableFlags: [
        "FINANCE_AI_MARKET_DATA_PROVIDER",
        "FINANCE_AI_NEWS_PROVIDER",
        "FINANCE_AI_MACRO_PROVIDER",
        "FINANCE_AI_STATEMENT_PROVIDER",
      ],
      userVisibleFallback: "显示本地样例数据，并标注非实时、非真实新闻。",
    },
    disclaimer:
      "该预检只验证真实数据源接入 envelope、授权门禁、来源署名和回退策略，不会请求真实 provider 或保存 provider 原始数据。",
  };

  return {
    id: "real-data-source-integration-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-adapter",
    mode: "planning",
    targetMarkets: ["a", "hk", "us"],
    configuredRequiredCount,
    requiredSourceCount: requiredSources.length,
    configuredOptionalCount,
    plannedSources,
    complianceChecks,
    dryRunPreflightPlan,
    blockedReasons,
    nextSteps: [
      "选择并确认 A 股、港股、美股行情和新闻 provider 的授权条款。",
      "配置行情、新闻/公告、宏观数据和公开言论 provider 的环境变量。",
      "为每条新闻、公告和言论保留来源、发布时间、抓取时间和授权边界。",
      "接入 provider adapter 前先保留 mock provider 作为网页离线回退。",
    ],
    disclaimer:
      "当前为真实数据源接入计划，不代表实时行情、真实新闻、社交媒体监控或投资建议已经接入。",
  };
}

function createActiveRuntimeProviderLabel(selectedProviders = []) {
  const activeProviders = selectedProviders
    .filter((provider) => provider.status === "ready-for-adapter" && provider.selectedProvider)
    .map((provider) => provider.selectedProvider);

  return activeProviders.length ? activeProviders.join(" + ") : "mock";
}

function createProviderRegistry(env = {}) {
  const selectedProviders = sourceGroups.map((group) => {
    const providerEnv = group.envVars[0];
    const credentialEnv = group.envVars[1];
    const selectedId = typeof env[providerEnv] === "string" ? env[providerEnv].trim() : "";
    const providerConfigured = typeof env[providerEnv] === "string" && env[providerEnv].trim().length > 0;
    const marketDataCredentialConfigured =
      group.id === "marketData" && hasMarketDataCredential(env, selectedId);
    const macroDataCredentialConfigured =
      group.id === "macroData" && hasMacroDataCredential(env, selectedId);
    const configured =
      group.id === "marketData"
        ? providerConfigured && marketDataCredentialConfigured
        : group.id === "macroData"
          ? providerConfigured && macroDataCredentialConfigured
        : isConfigured(env, group.envVars);
    const candidates = providerCandidates.filter((candidate) => candidate.groupId === group.id);
    const supported = !selectedId || candidates.some((candidate) => candidate.id === selectedId);
    const missingEnvVars = group.envVars.filter((name) => {
      if (group.id === "marketData" && name === "FINANCE_AI_MARKET_DATA_API_KEY") {
        return !marketDataCredentialConfigured;
      }
      if (group.id === "macroData" && name === "FINANCE_AI_MACRO_API_KEY") {
        return !macroDataCredentialConfigured;
      }
      return !(typeof env[name] === "string" && env[name].trim());
    });

    return {
      groupId: group.id,
      label: group.label,
      required: group.required,
      selectedProvider: selectedId,
      providerEnv,
      credentialEnv,
      configured,
      supported,
      candidateIds: candidates.map((candidate) => candidate.id),
      missingEnvVars,
      status: configured && supported ? "ready-for-adapter" : configured ? "unsupported" : "missing-config",
    };
  });
  const requiredSelections = selectedProviders.filter((provider) => provider.required);
  const readyRequiredCount = requiredSelections.filter(
    (provider) => provider.status === "ready-for-adapter",
  ).length;
  const blockedReasons = [];

  selectedProviders
    .filter((provider) => provider.required && provider.status !== "ready-for-adapter")
    .forEach((provider) => {
      blockedReasons.push(`${provider.label} 未完成可用 provider 配置。`);
    });
  selectedProviders
    .filter((provider) => provider.selectedProvider && !provider.supported)
    .forEach((provider) => {
      blockedReasons.push(`${provider.label} 选择了暂未注册的 provider：${provider.selectedProvider}。`);
    });
  const activeRuntimeProvider = createActiveRuntimeProviderLabel(selectedProviders);
  const hasRealProviderRuntime = activeRuntimeProvider !== "mock";
  const rolloutPreflightPlan = {
    id: "real-data-provider-registry-rollout-preflight",
    status: "defined",
    mode: "dry-run-no-provider-runtime",
    requiredManualApproval: true,
    canEnableLiveRuntime: false,
    activeRuntimeProvider,
    requiredProviderGroups: ["marketData", "marketNews", "macroData"],
    optionalProviderGroups: ["publicStatements"],
    adapterBoundary: {
      routeHandlersMustUseRegistry: true,
      providerModulesMustDeclareSafety: true,
      mockFallbackRequired: true,
      unsupportedProviderBlocksRuntime: true,
    },
    runtimeSwitchGate: {
      requiredChecks: [
        "provider-id-supported",
        "credential-from-secret-store",
        "license-and-redistribution-approved",
        "source-attribution-ready",
        "rate-limit-and-cost-alert-ready",
        "manual-cutover-approval",
      ],
      forbiddenBeforeApproval: ["delayed-runtime", "live-runtime", "provider-network-call"],
    },
    rollback: {
      restoreRuntimeProvider: "mock",
      clearProviderCache: true,
      keepUserFacingDisclaimer: true,
    },
    disclaimer:
      hasRealProviderRuntime
        ? "该注册表预检显示本地已有真实 provider 配置可进入 smoke/runtime 路径；仍需完成授权、限流、来源署名和人工门禁后才可视为正式上线。"
        : "该注册表预检只验证 provider 选择、adapter 边界、运行时切换门禁和回滚策略，不代表任何真实 provider 已可用。",
  };

  return {
    id: "real-data-provider-registry",
    status: blockedReasons.length ? "blocked" : "ready-for-adapter",
    activeRuntimeProvider,
    candidateProviders: providerCandidates,
    selectedProviders,
    rolloutPreflightPlan,
    readyRequiredCount,
    requiredProviderCount: requiredSelections.length,
    blockedReasons,
    nextSteps: [
      "为每个必选数据分组选择一个已注册 provider id。",
      "把 provider 凭证放入环境变量或密钥管理服务，不写入代码仓库。",
      "为选定 provider 实现对应 adapter module，并保持 mock provider 作为离线回退。",
      "完成授权、来源署名和限流缓存门禁后，才允许把运行模式标为 delayed 或 live。",
    ],
    disclaimer:
      hasRealProviderRuntime
        ? "Provider 注册表显示已配置的真实 provider 会进入本地 smoke/runtime 路径；仍有 blocked 分组时不能视为正式上线。"
        : "Provider 注册表只描述真实数据源选择和配置状态；当前运行时仍使用 mock provider，不代表真实数据已经接入。",
  };
}

function createVendorContractHandoffPackage() {
  return {
    id: "real-data-vendor-contract-handoff-package",
    status: "defined",
    mode: "dry-run-no-contract-signing",
    canSignVendorContract: false,
    canEnableProviderRuntime: false,
    requiredManualApproval: true,
    requiredArtifacts: [
      "exchange-display-rights",
      "cache-redistribution-terms",
      "headline-summary-excerpt-rights",
      "official-macro-source-terms",
      "public-statement-platform-terms",
      "source-attribution-requirements",
      "retention-and-deletion-rules",
      "cost-and-rate-limit-schedule",
    ],
    forbiddenArtifacts: ["providerApiKey", "unredactedContract", "paymentCard", "personalTradingAccount"],
    reviewRoles: ["product-owner", "data-source-reviewer", "compliance-officer"],
    releaseGate: {
      requiresSignedAgreement: true,
      requiresLegalReview: true,
      preservesMockFallback: true,
      blocksLiveRuntimeUntilApproved: true,
    },
    disclaimer:
      "该交接包只定义供应商合同、授权和成本审查所需材料，不代表任何真实数据 provider 已签约、付款、获批或可用于生产。",
  };
}

function createProviderSecretQuotaRunbook() {
  return {
    id: "real-data-provider-secret-quota-runbook",
    status: "defined",
    mode: "dry-run-no-secret-use",
    canReadProviderSecrets: false,
    canCallProviderNetwork: false,
    requiredManualApproval: true,
    secretControls: {
      requiredVaultFields: [
        "providerId",
        "credentialRef",
        "rotationOwner",
        "rotationIntervalDays",
        "lastRotatedAt",
        "emergencyDisableFlag",
      ],
      forbiddenRuntimeFields: ["apiKey", "clientSecret", "refreshToken", "sessionCookie"],
      rotationIntervalDays: 90,
    },
    quotaControls: {
      requiredLimits: ["requestsPerMinute", "requestsPerDay", "monthlyCostLimit", "burstLimit"],
      fallbackMode: "mock-provider-and-stale-cache",
      alertRoutes: ["ops", "product-owner"],
      blocksUnboundedRequests: true,
    },
    auditControls: {
      redactsSecrets: true,
      recordsProviderRequestId: true,
      recordsLicenseTier: true,
      hashChainRequired: true,
    },
    disclaimer:
      "该运行手册只定义真实 provider 密钥、额度、成本和审计边界；当前不会读取密钥、联网请求或启用真实行情/新闻 runtime。",
  };
}

function createProviderSetupGuide(env = {}) {
  const registry = createProviderRegistry(env);
  const selectionByGroup = new Map(
    registry.selectedProviders.map((provider) => [provider.groupId, provider]),
  );
  const setupGroups = [
    {
      id: "marketData",
      label: "行情 Provider",
      preferredProviderIds: ["multi-free", "twelve-data", "alpha-vantage", "licensed-market-data"],
      requiredEnvVars: [
        "FINANCE_AI_MARKET_DATA_PROVIDER",
        "FINANCE_AI_MARKET_DATA_API_KEY",
        "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
      ],
      optionalEnvVars: [
        "FINANCE_AI_MARKET_DATA_MODE",
        "FINANCE_AI_MARKET_DATA_MAX_REQUESTS_PER_MINUTE",
      ],
      smokeEndpoint: "GET /api/market-data/quote?market=us&code=IBM",
      demoKeySupported: true,
      priority: 1,
    },
    {
      id: "marketNews",
      label: "新闻情绪 Provider",
      preferredProviderIds: ["alpha-vantage-news", "licensed-news-filings"],
      requiredEnvVars: [
        "FINANCE_AI_NEWS_PROVIDER",
        "FINANCE_AI_NEWS_API_KEY",
        "FINANCE_AI_NEWS_ALLOW_NETWORK",
      ],
      optionalEnvVars: ["FINANCE_AI_NEWS_LIMIT", "FINANCE_AI_NEWS_RETENTION_DAYS"],
      smokeEndpoint: "GET /api/news/intelligence?market=us&symbol=AAPL&minImportance=70",
      demoKeySupported: true,
      priority: 2,
    },
    {
      id: "macroData",
      label: "宏观数据 Provider",
      preferredProviderIds: ["world-bank-open-data", "official-macro-data"],
      requiredEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
      optionalEnvVars: ["FINANCE_AI_MACRO_ALLOW_NETWORK", "FINANCE_AI_MACRO_CACHE_TTL_SECONDS"],
      smokeEndpoint: "GET /api/macro/context?market=us",
      demoKeySupported: false,
      priority: 3,
    },
    {
      id: "publicStatements",
      label: "公开言论 Provider",
      preferredProviderIds: ["verified-public-statements"],
      requiredEnvVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
      optionalEnvVars: ["FINANCE_AI_STATEMENT_ALLOW_NETWORK", "FINANCE_AI_STATEMENT_REVIEW_QUEUE"],
      smokeEndpoint: "GET /api/data-sources/news-filings-adapter",
      demoKeySupported: false,
      priority: 4,
    },
  ].map((group) => {
    const selection = selectionByGroup.get(group.id);
    const providerConfigured = Boolean(selection?.selectedProvider);
      const requiredEnvReady =
        group.id === "marketData"
          ? providerConfigured &&
            hasMarketDataCredential(env, selection?.selectedProvider || "") &&
            env.FINANCE_AI_MARKET_DATA_ALLOW_NETWORK === "true"
          : group.id === "macroData"
            ? providerConfigured && hasMacroDataCredential(env, selection?.selectedProvider || "")
          : group.requiredEnvVars.every((name) => hasEnvValue(env, name));
    const allowNetworkReady = group.requiredEnvVars
      .filter((name) => name.endsWith("_ALLOW_NETWORK"))
      .every((name) => env[name] === "true");
      const configuredRequiredEnvVars = group.requiredEnvVars.filter((name) => {
        if (group.id === "marketData" && name === "FINANCE_AI_MARKET_DATA_API_KEY") {
          return hasMarketDataCredential(env, selection?.selectedProvider || "");
        }
        if (group.id === "macroData" && name === "FINANCE_AI_MACRO_API_KEY") {
          return hasMacroDataCredential(env, selection?.selectedProvider || "");
        }
        return hasEnvValue(env, name);
      });
      const missingEnvVars = group.requiredEnvVars.filter((name) => {
        if (group.id === "marketData" && name === "FINANCE_AI_MARKET_DATA_API_KEY") {
          return !hasMarketDataCredential(env, selection?.selectedProvider || "");
        }
        if (group.id === "macroData" && name === "FINANCE_AI_MACRO_API_KEY") {
          return !hasMacroDataCredential(env, selection?.selectedProvider || "");
        }
        return !hasEnvValue(env, name);
      });

    return {
      ...group,
      selectedProvider: selection?.selectedProvider || "",
      status:
        providerConfigured && requiredEnvReady && (allowNetworkReady || !group.requiredEnvVars.some((name) => name.endsWith("_ALLOW_NETWORK")))
          ? "ready-for-smoke"
          : providerConfigured || requiredEnvReady
            ? "partial-config"
            : "missing-config",
      configuredRequiredEnvVars,
      missingEnvVars,
      secretHandling: "api-key-redacted-never-returned",
      forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw", "rawProviderUrl"],
    };
  });
  const readyForSmokeCount = setupGroups.filter((group) => group.status === "ready-for-smoke").length;
  const checklistItems = [
    {
      id: "setupGuideDefined",
      label: "真实 Provider 配置向导",
      status: "pass",
      evidence: "行情、新闻、宏观和公开言论 provider 分组已定义。",
    },
    {
      id: "requiredEnvVarsMapped",
      label: "环境变量映射",
      status: "pass",
      evidence: "每个 provider 分组都列出必填环境变量和 smoke endpoint。",
    },
    {
      id: "secretRedactionRulesDefined",
      label: "密钥脱敏规则",
      status: "pass",
      evidence: "配置向导只输出字段名称和状态，不输出真实密钥或 provider 原始响应。",
    },
    {
      id: "smokeOrderDefined",
      label: "Smoke 测试顺序",
      status: "pass",
      evidence: "真实 provider smoke 顺序已固定为行情、新闻、宏观、公开言论。",
    },
    {
      id: "realKeysSupplied",
      label: "真实 Key 已填写",
      status: readyForSmokeCount >= 2 ? "pass" : "blocked",
      evidence:
        readyForSmokeCount >= 2
          ? "至少行情和新闻 provider 已具备 smoke 配置。"
          : "仍需用户提供真实或 demo provider key，并显式开启网络权限。",
    },
  ];

  return {
    id: "real-provider-setup-guide",
    status: readyForSmokeCount ? "partial-provider-configuration" : "ready-for-user-configuration",
    mode: "no-secret-provider-setup-guide",
    activeRuntimeProvider: createActiveRuntimeProviderLabel(registry.selectedProviders),
    setupGroups,
    smokeOrder: ["marketDataQuote", "newsSentiment", "macroContext", "publicStatements"],
    checklistItems,
    passedCount: checklistItems.filter((item) => item.status === "pass").length,
    totalCount: checklistItems.length,
    readyForSmokeCount,
    requiredManualActions: [
      "在本地或部署环境中填写所选 provider 的环境变量。",
      "只把真实 API key 放入密钥管理或本地环境变量，不写入代码和日志。",
      "先用 demo/smoke endpoint 验证字段、署名、延迟标签和 fallback。",
      "确认授权、缓存、再分发和来源署名后，才允许开启 delayed/live runtime。",
    ],
    forbiddenAuditFields: [
      "apiKey",
      "providerSecret",
      "providerResponseRaw",
      "rawArticleBody",
      "rawProviderUrl",
      "sessionCookie",
    ],
    canReadProviderSecrets: false,
    canWriteEnvFile: false,
    canEnableLiveRuntime: false,
    nextActions: [
      "优先填写 Alpha Vantage 行情和新闻情绪 demo/真实 key，完成 quote/news smoke。",
      "再补宏观数据和公开言论 provider 的授权、身份验证和人工复核队列。",
      "所有 provider smoke 通过前，网页继续标注样例/回退数据，禁止展示为实时投资信号。",
    ],
    disclaimer:
      "该配置向导只说明真实 provider 接入步骤和安全边界；不会读取、保存、显示真实密钥，也不会自动启用 live runtime。",
  };
}

function createDataIngestionChannelStrategy({ env = {}, marketDataStatus, newsFilingsStatus }) {
  const alphaQuoteReady = marketDataStatus?.alphaVantageConnector?.canRequestProvider === true;
  const twelveQuoteReady = marketDataStatus?.twelveDataConnector?.canRequestProvider === true;
  const quoteReady = alphaQuoteReady || twelveQuoteReady;
  const alphaNewsReady = newsFilingsStatus?.alphaVantageNewsConnector?.canRequestProvider === true;
  const secFilingsReady = newsFilingsStatus?.secFilingsConnector?.canRequestProvider === true;
  const xApiConfigured =
    typeof env.FINANCE_AI_X_API_BEARER_TOKEN === "string" &&
    env.FINANCE_AI_X_API_BEARER_TOKEN.trim().length > 0 &&
    env.FINANCE_AI_X_API_ALLOW_NETWORK === "true";
  const redditApiConfigured =
    typeof env.FINANCE_AI_REDDIT_CLIENT_ID === "string" &&
    env.FINANCE_AI_REDDIT_CLIENT_ID.trim().length > 0 &&
    typeof env.FINANCE_AI_REDDIT_CLIENT_SECRET === "string" &&
    env.FINANCE_AI_REDDIT_CLIENT_SECRET.trim().length > 0 &&
    env.FINANCE_AI_REDDIT_ALLOW_NETWORK === "true";
  const channels = [
    {
      id: "officialMarketApi",
      label: "官方/授权行情 API",
      status: quoteReady ? "active-for-smoke" : "needs-provider-key",
      canAutomate: true,
      allowedUse: "通过 Twelve Data、Alpha Vantage 或持牌行情 provider 获取 quote、延迟行情和基础来源署名。",
      blockedUse: "不能把未授权实时行情、付费 App 行情或交易所受限数据直接再分发。",
      configuredProviders: [
        ...(twelveQuoteReady ? ["twelve-data-quote"] : []),
        ...(alphaQuoteReady ? ["alpha-vantage-global-quote"] : []),
        ...(twelveQuoteReady && alphaQuoteReady ? ["free-api-relay"] : []),
      ],
      requiredEnvVars: [
        "FINANCE_AI_MARKET_DATA_PROVIDER",
        "FINANCE_AI_MARKET_DATA_API_KEY",
        "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
      ],
      officialDocs: [
        "https://twelvedata.com/docs",
        "https://www.alphavantage.co/documentation/",
      ],
    },
    {
      id: "officialNewsFilingsApi",
      label: "官方新闻/公告 API",
      status: alphaNewsReady || secFilingsReady ? "partial-active-for-smoke" : "needs-provider-config",
      canAutomate: true,
      allowedUse: "通过 Alpha Vantage NEWS_SENTIMENT 与 SEC EDGAR API 获取美股新闻情绪和公司公告。",
      blockedUse: "不能抓取付费新闻全文，不能隐藏来源、发布时间、延迟和回退状态。",
      configuredProviders: [
        ...(alphaNewsReady ? ["alpha-vantage-news-sentiment"] : []),
        ...(secFilingsReady ? ["sec-company-submissions"] : []),
      ],
      requiredEnvVars: [
        "FINANCE_AI_NEWS_PROVIDER",
        "FINANCE_AI_NEWS_API_KEY",
        "FINANCE_AI_NEWS_ALLOW_NETWORK",
        "FINANCE_AI_FILINGS_PROVIDER",
        "FINANCE_AI_FILINGS_ALLOW_NETWORK",
        "FINANCE_AI_SEC_USER_AGENT",
      ],
      officialDocs: [
        "https://www.alphavantage.co/documentation/",
        "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
      ],
    },
    {
      id: "browserPublicLinkIngestion",
      label: "浏览器公开网页链接",
      status: "ready-for-manual-link-contract",
      canAutomate: false,
      allowedUse: "用户粘贴公开新闻、公告或公司页面链接后，只保存标题、来源、链接、时间和短摘要。",
      blockedUse: "不绕过登录、验证码、robots、paywall，不抓取完整付费正文，不保存 session cookie。",
      requiredEnvVars: ["FINANCE_AI_BROWSER_LINK_INGESTION_REVIEW_QUEUE"],
      officialDocs: [],
    },
    {
      id: "socialOfficialApi",
      label: "社交媒体官方 API",
      status: xApiConfigured || redditApiConfigured ? "partial-active-for-smoke" : "needs-social-api-approval",
      canAutomate: true,
      allowedUse: "通过 X API、Reddit API 或其他平台官方接口采集公开言论，并进入人工复核队列。",
      blockedUse: "不使用用户账号密码抓取，不冒充用户，不绕过平台 API 额度或访问限制。",
      configuredProviders: [
        ...(xApiConfigured ? ["x-api"] : []),
        ...(redditApiConfigured ? ["reddit-api"] : []),
      ],
      requiredEnvVars: [
        "FINANCE_AI_X_API_BEARER_TOKEN",
        "FINANCE_AI_X_API_ALLOW_NETWORK",
        "FINANCE_AI_REDDIT_CLIENT_ID",
        "FINANCE_AI_REDDIT_CLIENT_SECRET",
        "FINANCE_AI_REDDIT_ALLOW_NETWORK",
      ],
      officialDocs: [
        "https://docs.x.com/x-api/posts/search/introduction",
        "https://www.reddit.com/dev/api/",
      ],
    },
    {
      id: "mobileAppManualImport",
      label: "股票 App 手动导入",
      status: "manual-only",
      canAutomate: false,
      allowedUse: "用户从股票 App 合法导出的 CSV、截图或分享链接可作为个人参考数据导入，并标注来源。",
      blockedUse: "不逆向 App，不抓包，不读取 App 本地数据库，不自动化登录，不复制付费数据流。",
      requiredEnvVars: [],
      officialDocs: [],
    },
  ];

  const activeChannelCount = channels.filter((channel) =>
    ["active-for-smoke", "partial-active-for-smoke", "ready-for-manual-link-contract"].includes(
      channel.status,
    ),
  ).length;

  return {
    id: "real-data-ingestion-channel-strategy",
    status: activeChannelCount >= 3 ? "partial-ingestion-ready" : "needs-user-authorization",
    mode: "authorized-public-and-user-provided-data-only",
    channels,
    activeChannelCount,
    totalChannelCount: channels.length,
    firstImplementationOrder: [
      "officialMarketApi",
      "officialNewsFilingsApi",
      "browserPublicLinkIngestion",
      "socialOfficialApi",
      "mobileAppManualImport",
    ],
    safetyRules: [
      "no-paywall-bypass",
      "no-app-reverse-engineering",
      "no-session-cookie-storage",
      "source-attribution-required",
      "manual-review-for-social-statements",
      "no-fixture-fallback-in-strict-real-data-mode",
    ],
    nextActions: [
      "先用真实 Alpha Vantage key 替换 demo key，验证行情和新闻 smoke。",
      "为 SEC EDGAR 配置合规 User-Agent，验证 AAPL/IBM 公告。",
      "增加用户粘贴公开网页链接的人工导入入口，再做社交媒体官方 API。",
      "股票 App 只做用户手动导入，不做自动抓包或逆向。",
    ],
    disclaimer:
      "该策略只允许公开、授权或用户主动提供的数据进入系统；不会绕过登录、付费墙、App 限制或平台 API 条款；严格真实数据模式下无真实结果则保持空白。",
  };
}

function createActiveProviderStatus({
  marketDataStatus,
  macroDataStatus,
  newsFilingsStatus,
  dataIngestionChannelStrategy,
}) {
  const alphaQuoteReady = marketDataStatus?.alphaVantageConnector?.canRequestProvider === true;
  const twelveQuoteReady = marketDataStatus?.twelveDataConnector?.canRequestProvider === true;
  const quoteReady = alphaQuoteReady || twelveQuoteReady;
  const newsReady = newsFilingsStatus?.alphaVantageNewsConnector?.canRequestProvider === true;
  const filingsReady = newsFilingsStatus?.secFilingsConnector?.canRequestProvider === true;
  const macroReady = macroDataStatus?.canFetchLiveMacro === true;
  const socialReady = dataIngestionChannelStrategy?.channels?.some(
    (channel) => channel.id === "socialOfficialApi" && channel.status === "partial-active-for-smoke",
  );
  const activeRealChannels = [
    ...(twelveQuoteReady && alphaQuoteReady ? ["free-api-relay"] : []),
    ...(twelveQuoteReady ? ["twelve-data-quote"] : []),
    ...(alphaQuoteReady ? ["alpha-vantage-quote"] : []),
    ...(newsReady ? ["alpha-vantage-news"] : []),
    ...(filingsReady ? ["sec-filings"] : []),
    ...(macroReady ? ["world-bank-macro"] : []),
    ...(socialReady ? ["official-social-api"] : []),
  ];

  if (!activeRealChannels.length) return providerStatus;

  return {
    ...providerStatus,
    id: "hybrid-real-provider",
    name: "部分真实 Provider 接入中",
    mode: "partial-real-provider",
    status: "partial-real-provider-connected",
    capabilities: [
      ...new Set([
        ...providerStatus.capabilities,
        "realMarketDataQuote",
        "realNewsProviderPath",
        "realFilingsProviderPath",
        "authorizedPublicLinkIngestion",
        "providerFallbackDisclosure",
      ]),
    ],
    realtimeStatus: {
      marketQuote: quoteReady ? "real-provider-enabled" : "empty-until-real-provider",
      news: newsReady ? "provider-path-enabled-empty-on-error" : "empty-until-real-provider",
      filings: filingsReady ? "real-provider-enabled" : "empty-until-real-provider",
      macro: macroReady ? "real-provider-enabled" : "empty-until-real-provider",
      publicStatements: socialReady ? "official-api-path-enabled" : "empty-or-manual-review",
    },
    activeRealChannels,
    disclaimer:
      "当前不是纯样例模式：已配置的真实 provider 会优先用于 smoke/runtime；未获授权、demo key 受限、缺少 User-Agent 或 provider 失败时会显示为空，不再回退到 fixture。",
  };
}

export function createMockProvider({ env = process.env } = {}) {
  const integrationPlan = createDataSourceIntegrationPlan(env);
  const providerRegistry = createProviderRegistry(env);
  const vendorReadinessChecklist = createVendorReadinessChecklist(env);
  const vendorContractHandoffPackage = createVendorContractHandoffPackage();
  const providerSecretQuotaRunbook = createProviderSecretQuotaRunbook();
  const providerSetupGuide = createProviderSetupGuide(env);
  const marketDataVendorChecklist = createMarketDataVendorChecklist(env);
  const newsFilingsVendorChecklist = createNewsFilingsVendorChecklist(env);
  const macroDataVendorChecklist = createMacroDataVendorChecklist(env);
  const publicStatementsVendorChecklist = createPublicStatementsVendorChecklist(env);
  const mockDataAllowed = allowMockData(env);
  const runtimeStocks = mockDataAllowed ? stocks : [];
  const runtimeNewsByMarket = mockDataAllowed ? newsByMarket : {};
  const runtimeFilings = mockDataAllowed ? filings : [];
  const runtimePublicStatements = mockDataAllowed ? publicStatements : [];
  const marketDataAdapter = createMarketDataProviderAdapter({ env, fixtureStocks: runtimeStocks });
  const macroDataAdapter = createMacroDataProviderAdapter({ env });
  const newsFilingsAdapter = createNewsFilingsProviderAdapter({
    env,
    newsByMarket: runtimeNewsByMarket,
    filings: runtimeFilings,
    publicStatements: runtimePublicStatements,
  });
  const initialMarketDataStatus = marketDataAdapter.status();
  const initialMacroDataStatus = macroDataAdapter.status();
  const initialNewsFilingsStatus = newsFilingsAdapter.status();
  const dataIngestionChannelStrategy = createDataIngestionChannelStrategy({
    env,
    marketDataStatus: initialMarketDataStatus,
    newsFilingsStatus: initialNewsFilingsStatus,
  });
  const initialActiveProviderStatus = createActiveProviderStatus({
    marketDataStatus: initialMarketDataStatus,
    macroDataStatus: initialMacroDataStatus,
    newsFilingsStatus: initialNewsFilingsStatus,
    dataIngestionChannelStrategy,
  });

  function findStock(code) {
    if (!mockDataAllowed) return null;
    return stocks.find((stock) => stock.code.toLowerCase() === String(code).toLowerCase());
  }

  function getNews(market) {
    if (!mockDataAllowed) return [];
    return newsByMarket[market] || [];
  }

  return {
    id: initialActiveProviderStatus.id,
    mode: initialActiveProviderStatus.mode,
    status() {
      const marketDataStatus = marketDataAdapter.status();
      const newsFilingsStatus = newsFilingsAdapter.status();
      const activeProviderStatus = createActiveProviderStatus({
        marketDataStatus,
        newsFilingsStatus,
        dataIngestionChannelStrategy,
      });
      return {
        ...activeProviderStatus,
        mockDataAllowed,
        integrationPlan,
        providerRegistry,
        vendorReadinessChecklist,
        vendorContractHandoffPackage,
        providerSecretQuotaRunbook,
        providerSetupGuide,
        dataIngestionChannelStrategy,
        marketDataVendorChecklist,
        newsFilingsVendorChecklist,
        macroDataVendorChecklist,
        publicStatementsVendorChecklist,
        marketDataAdapter: marketDataStatus,
        macroDataAdapter: macroDataAdapter.status(),
        newsFilingsAdapter: newsFilingsStatus,
      };
    },
    integrationPlan() {
      return integrationPlan;
    },
    providerRegistry() {
      return providerRegistry;
    },
    vendorReadinessChecklist() {
      return vendorReadinessChecklist;
    },
    vendorContractHandoffPackage() {
      return vendorContractHandoffPackage;
    },
    providerSecretQuotaRunbook() {
      return providerSecretQuotaRunbook;
    },
    providerSetupGuide() {
      return providerSetupGuide;
    },
    dataIngestionChannelStrategy() {
      return dataIngestionChannelStrategy;
    },
    marketDataVendorChecklist() {
      return marketDataVendorChecklist;
    },
    newsFilingsVendorChecklist() {
      return newsFilingsVendorChecklist;
    },
    macroDataVendorChecklist() {
      return macroDataVendorChecklist;
    },
    publicStatementsVendorChecklist() {
      return publicStatementsVendorChecklist;
    },
    marketDataAdapterStatus() {
      return marketDataAdapter.status();
    },
    macroDataAdapterStatus() {
      return macroDataAdapter.status();
    },
    newsFilingsAdapterStatus() {
      return newsFilingsAdapter.status();
    },
    getMacroContext(input) {
      const macroStatus = macroDataAdapter.status();
      if (!mockDataAllowed && macroStatus.canFetchLiveMacro !== true) {
        return {
          status: "ok",
          mode: "no-real-data",
          market: input?.market || "",
          context: null,
          indicators: [],
          policyEvents: [],
          sourceStatus: "no-real-provider-data",
          disclaimer: "严格真实数据模式下没有真实宏观 provider 时保持空白，不返回样例宏观数据。",
        };
      }
      return macroDataAdapter.getMacroContext(input);
    },
    async getMarketDataQuote(input) {
      return marketDataAdapter.getQuote(input);
    },
    async getMarketDataHistory(input) {
      return marketDataAdapter.getPriceHistory(input);
    },
    getMarketDataPolicyCheck(input) {
      return marketDataAdapter.policyCheck(input);
    },
    getTradingCalendar(input) {
      return marketDataAdapter.getTradingCalendar(input);
    },
    async getImportantNews(input) {
      return newsFilingsAdapter.listImportantNews(input);
    },
    async getCompanyFilings(input) {
      return newsFilingsAdapter.listCompanyFilings(input);
    },
    getPublicStatements(input) {
      return newsFilingsAdapter.listPublicStatements(input);
    },
    listMarkets() {
      return markets.map((market) => ({ ...market }));
    },
    searchStocks(query) {
      if (!mockDataAllowed) return [];
      const normalizedQuery = String(query || "").trim().toLowerCase();
      if (!normalizedQuery) return [];
      return stocks
        .filter(
          (stock) =>
            stock.name.toLowerCase().includes(normalizedQuery) ||
            stock.code.toLowerCase().includes(normalizedQuery),
        )
        .map(({ code, name, market }) => ({ code, name, market }));
    },
    findStock,
    getNews,
    getRelatedNews(stock) {
      return getNews(stock.market).filter(
        (newsItem) =>
          Array.isArray(newsItem.relatedTickers) && newsItem.relatedTickers.includes(stock.code),
      );
    },
  };
}
