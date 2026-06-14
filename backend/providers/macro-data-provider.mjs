const requiredEnvVars = ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"];
const worldBankRequiredEnvVars = ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_ALLOW_NETWORK"];
const requiredOperationalEnvVars = [
  "FINANCE_AI_MACRO_FRESHNESS_READY",
  "FINANCE_AI_MACRO_POLICY_CALENDAR_READY",
  "FINANCE_AI_MACRO_PRECHECK_READY",
];
const supportedProviderIds = ["official-macro-data", "world-bank-open-data"];
const worldBankBaseUrl = "https://api.worldbank.org/v2";
const worldBankIndicators = [
  { id: "gdpGrowth", code: "NY.GDP.MKTP.KD.ZG", label: "GDP 增速", unit: "%", type: "growth" },
  { id: "inflation", code: "FP.CPI.TOTL.ZG", label: "通胀", unit: "%", type: "inflation" },
  { id: "realInterestRate", code: "FR.INR.RINR", label: "实际利率", unit: "%", type: "rate" },
];
const worldBankCountryByMarket = {
  a: { code: "CN", region: "中国内地" },
  hk: { code: "HK", region: "中国香港" },
  us: { code: "US", region: "美国" },
};

const defaultMacroFixtures = [
  {
    market: "a",
    region: "中国内地",
    factorScore: 68,
    summary: "政策稳增长与消费修复提供支撑，但地产和外需仍是样例风险变量。",
    indicators: [
      { id: "policyTone", label: "政策基调", value: "稳增长", impact: "supportive", score: 72 },
      { id: "liquidity", label: "流动性", value: "合理充裕", impact: "supportive", score: 70 },
      { id: "inflation", label: "通胀", value: "温和", impact: "neutral", score: 64 },
      { id: "fx", label: "汇率", value: "双向波动", impact: "watch", score: 62 },
    ],
    policyEvents: [
      {
        id: "a-policy-001",
        title: "样例政策会议继续强调扩大内需和稳定市场预期",
        importanceScore: 82,
        publishedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
  {
    market: "hk",
    region: "中国香港",
    factorScore: 64,
    summary: "港股样例宏观环境受美元利率、南向资金和人民币预期共同影响。",
    indicators: [
      { id: "rates", label: "美元利率", value: "高位观察", impact: "watch", score: 58 },
      { id: "southbound", label: "南向资金", value: "持续流入", impact: "supportive", score: 72 },
      { id: "fx", label: "港元流动性", value: "稳定", impact: "neutral", score: 64 },
    ],
    policyEvents: [
      {
        id: "hk-policy-001",
        title: "样例跨境资金流动数据维持稳健",
        importanceScore: 76,
        publishedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
  {
    market: "us",
    region: "美国",
    factorScore: 70,
    summary: "美股样例宏观环境受利率路径、AI 投资周期和通胀回落速度影响。",
    indicators: [
      { id: "rates", label: "利率路径", value: "降息预期摇摆", impact: "watch", score: 62 },
      { id: "inflation", label: "通胀趋势", value: "缓慢回落", impact: "neutral", score: 66 },
      { id: "capex", label: "科技资本开支", value: "偏强", impact: "supportive", score: 78 },
    ],
    policyEvents: [
      {
        id: "us-policy-001",
        title: "样例美联储表述强调继续依赖数据判断利率路径",
        importanceScore: 80,
        publishedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  },
];

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function readConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_MACRO_PROVIDER")
    ? env.FINANCE_AI_MACRO_PROVIDER.trim()
    : "";
  const providerRequiredEnvVars =
    selectedProvider === "world-bank-open-data" ? worldBankRequiredEnvVars : requiredEnvVars;
  const missingEnvVars = providerRequiredEnvVars.filter((name) => !hasEnvValue(env, name));
  const missingOperationalEnvVars = requiredOperationalEnvVars.filter((name) => !hasEnvValue(env, name));
  return {
    selectedProvider,
    configured: missingEnvVars.length === 0,
    supported: !selectedProvider || supportedProviderIds.includes(selectedProvider),
    networkEnabled: env.FINANCE_AI_MACRO_ALLOW_NETWORK === "true",
    missingEnvVars: [...missingEnvVars, ...missingOperationalEnvVars],
    licenseConfirmed: env.FINANCE_AI_DATA_LICENSE_CONFIRMED === "true",
    attributionReady: env.FINANCE_AI_SOURCE_ATTRIBUTION_READY === "true",
    rateLimitReady: env.FINANCE_AI_DATA_RATE_LIMIT_PLAN === "true",
    freshnessReady: env.FINANCE_AI_MACRO_FRESHNESS_READY === "true",
    policyCalendarReady: env.FINANCE_AI_MACRO_POLICY_CALENDAR_READY === "true",
    precheckReady: env.FINANCE_AI_MACRO_PRECHECK_READY === "true",
  };
}

function normalizeMarket(value) {
  const market = String(value || "").trim().toLowerCase();
  return ["a", "hk", "us"].includes(market) ? market : "";
}

function source() {
  return {
    id: "local-fixture-macro-data",
    label: "Mock 宏观数据样例",
    licenseTag: "sample-fixture-not-official-macro-data",
    attributionRequired: true,
  };
}

function worldBankSource() {
  return {
    id: "world-bank-open-data",
    label: "World Bank Open Data",
    licenseTag: "world-bank-open-data-api",
    attributionRequired: true,
  };
}

function createEndpointContracts() {
  return [
    {
      id: "macroContext",
      method: "getMacroContext",
      status: "planned",
      fixtureStatus: "available",
      input: ["market"],
      output: ["factorScore", "indicators", "policyEvents", "source", "asOf"],
    },
    {
      id: "macroIndicators",
      method: "listMacroIndicators",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "indicatorIds"],
      output: ["rate", "inflation", "fx", "liquidity", "policyTone"],
    },
    {
      id: "policyCalendar",
      method: "listPolicyEvents",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "from", "to"],
      output: ["events", "importanceScore", "publishedAt", "source"],
    },
  ];
}

function scoreWorldBankIndicator(indicator, value) {
  if (!Number.isFinite(value)) return 50;
  if (indicator.type === "growth") {
    return Math.max(25, Math.min(85, Math.round(50 + value * 4)));
  }
  if (indicator.type === "inflation") {
    const distanceFromTarget = Math.abs(value - 2);
    return Math.max(25, Math.min(82, Math.round(78 - distanceFromTarget * 8)));
  }
  if (indicator.type === "rate") {
    return Math.max(25, Math.min(78, Math.round(68 - Math.max(0, value - 2) * 5)));
  }
  return 50;
}

function impactFromScore(score) {
  if (score >= 68) return "supportive";
  if (score >= 52) return "neutral";
  return "watch";
}

function latestWorldBankValue(payload) {
  const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
  const validRows = rows.filter((item) => Number.isFinite(Number(item?.value)));
  const row = validRows.find((item) => Math.abs(Number(item.value)) > 0.000001) || validRows[0];
  if (!row) return null;
  return {
    value: Number(row.value),
    date: String(row.date || ""),
  };
}

function normalizeWorldBankPayloads(payloads, market) {
  const country = worldBankCountryByMarket[market] || worldBankCountryByMarket.us;
  const indicators = worldBankIndicators
    .map((indicator, index) => {
      const latest = latestWorldBankValue(payloads[index]);
      if (!latest) return null;
      const roundedValue = Math.round(latest.value * 100) / 100;
      const score = scoreWorldBankIndicator(indicator, roundedValue);
      return {
        id: indicator.id,
        label: indicator.label,
        value: `${roundedValue}${indicator.unit}`,
        rawValue: roundedValue,
        unit: indicator.unit,
        impact: impactFromScore(score),
        score,
        asOf: latest.date ? `${latest.date}-12-31T00:00:00.000Z` : "",
        source: worldBankSource(),
      };
    })
    .filter(Boolean);

  if (!indicators.length) {
    return {
      status: "provider-error",
      error: {
        code: "WORLD_BANK_EMPTY",
        message: "World Bank Open Data 未返回可用宏观指标。",
      },
    };
  }

  const factorScore = Math.round(
    indicators.reduce((total, indicator) => total + indicator.score, 0) / indicators.length,
  );
  const asOfYear = indicators
    .map((indicator) => Number(String(indicator.asOf).slice(0, 4)))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return {
    status: "ok",
    mode: "real-provider",
    market,
    region: country.region,
    factorScore,
    summary: `${country.region}宏观指标来自 World Bank Open Data，当前为年度数据，用于判断增长、通胀和实际利率背景。`,
    context: {
      provider: "world-bank-open-data",
      indicatorCount: indicators.length,
      frequency: "annual",
    },
    indicators,
    policyEvents: [],
    processing: {
      macroFactorLinking: "six-factor-macro-input-v1",
      indicatorNormalization: "world-bank-annual-indicator-score-v1",
      policyEventScoring: "not-available",
    },
    source: worldBankSource(),
    provider: {
      id: "world-bank-open-data",
      endpoint: "country-indicators",
      requestedCountry: country.code,
      requestedIndicators: worldBankIndicators.map((indicator) => indicator.code),
      requestUrlRedacted: `${worldBankBaseUrl}/country/${country.code}/indicator/{indicator}?format=json&per_page=5`,
    },
    sourceStatus: "world-bank-open-data",
    asOf: asOfYear ? `${asOfYear}-12-31T00:00:00.000Z` : "",
    disclaimer:
      "宏观指标来自 World Bank Open Data 年度数据，存在发布滞后；用于宏观背景参考，不构成投资建议或实时政策信号。",
  };
}

async function fetchWorldBankMacroContext({ config, input, fetchImpl = fetch }) {
  const market = normalizeMarket(input.market) || "us";
  const country = worldBankCountryByMarket[market] || worldBankCountryByMarket.us;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), Math.max(1_000, Number(config.requestTimeoutMs) || 8_000))
    : null;
  try {
    const payloads = await Promise.all(
      worldBankIndicators.map(async (indicator) => {
        const url = new URL(`${worldBankBaseUrl}/country/${country.code}/indicator/${indicator.code}`);
        url.searchParams.set("format", "json");
        url.searchParams.set("per_page", "5");
        const response = await fetchImpl(url, {
          ...(controller ? { signal: controller.signal } : {}),
          headers: { Accept: "application/json" },
        });
        if (!response?.ok) {
          throw new Error(`World Bank HTTP ${response?.status || "unknown"}`);
        }
        return response.json();
      }),
    );
    return normalizeWorldBankPayloads(payloads, market);
  } catch (error) {
    return {
      status: "provider-error",
      mode: "provider-error-empty-no-fixture",
      market,
      context: null,
      indicators: [],
      policyEvents: [],
      error: {
        code: error?.name === "AbortError" ? "WORLD_BANK_TIMEOUT" : "WORLD_BANK_FETCH_FAILED",
        message: error?.message || "World Bank Open Data 请求失败。",
      },
      sourceStatus: "provider-error-empty-no-fixture",
      disclaimer: "World Bank 宏观数据暂时不可用；严格真实数据模式下保持空白，不返回样例宏观数据。",
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function createFreshnessPolicy(config) {
  return {
    id: "macro-data-freshness-policy",
    status: config.freshnessReady ? "ready" : "blocked",
    requiredAsOfFields: ["source.asOf", "indicator.asOf", "policyEvent.publishedAt"],
    maxIndicatorAgeDays: 7,
    maxPolicyEventAgeDays: 30,
    displayNearMacroScore: true,
    blocksStaleOfficialLabels: true,
    disclaimer:
      "真实宏观指标必须显示 asOf 和新鲜度；过期数据不能标注为当前官方宏观环境。",
  };
}

function createPolicyCalendarVerification(config) {
  return {
    id: "macro-policy-calendar-verification-policy",
    status: config.policyCalendarReady ? "ready" : "blocked",
    requiredEventFields: ["title", "publishedAt", "source.label", "source.licenseTag", "importanceScore"],
    verifiesOfficialCalendar: true,
    requiresTimezoneNormalization: true,
    blocksUnverifiedPolicyEvents: true,
    forbiddenAuditFields: ["rawPolicyDocument", "providerApiKey", "calendarSessionCookie"],
    disclaimer:
      "政策事件和官方日历必须校验来源、时区、发布时间和授权标签，未经验证不得进入高置信度宏观因子。",
  };
}

function createProviderPreflightPlan(status) {
  const checks = [
    {
      id: "adapterStatus",
      status: status.status === "ready-for-implementation" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "runtimeMode",
      status: status.runtimeMode === "inactive" ? "blocked" : "pass",
      required: true,
    },
    {
      id: "freshnessPolicy",
      status: status.freshnessPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "policyCalendarVerification",
      status: status.policyCalendarVerification.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "providerPrecheck",
      status: status.precheckPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
  ];

  return {
    id: "macro-data-provider-preflight-plan",
    mode: "dry-run-no-provider-fetch",
    status: checks.every((check) => check.status === "pass") ? "ready" : "blocked",
    canFetchProviderMacro: status.canFetchLiveMacro === true,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks,
    requestEnvelope: {
      requiredFields: ["market", "source.label", "source.licenseTag", "asOf", "indicatorIds"],
      forbiddenFields: ["providerApiKey", "rawPolicyDocument", "calendarSessionCookie", "tradingInstruction"],
      redactBeforeAudit: true,
    },
    rollback: {
      fallbackService: "local-fixture-macro-data",
      disableFlag: "FINANCE_AI_MACRO_RUNTIME=inactive",
      preserveLastGoodFixture: true,
    },
  };
}

function createStatus(config, fixtures) {
  const blockedReasons = [];
  const isWorldBankProvider = config.selectedProvider === "world-bank-open-data";
  const canFetchLiveMacro = isWorldBankProvider && config.configured && config.supported && config.networkEnabled;
  if (!config.configured) {
    blockedReasons.push("宏观经济 provider id 或 API key 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`宏观经济 provider 未注册：${config.selectedProvider}。`);
  }
  if (!config.licenseConfirmed) {
    blockedReasons.push("尚未确认宏观经济数据授权、缓存和展示边界。");
  }
  if (!config.attributionReady) {
    blockedReasons.push("尚未完成宏观经济数据来源署名规则。");
  }
  if (!config.rateLimitReady) {
    blockedReasons.push("尚未配置宏观经济 provider 限流、缓存和降级策略。");
  }
  const freshnessPolicy = createFreshnessPolicy(config);
  const policyCalendarVerification = createPolicyCalendarVerification(config);
  const precheckPolicy = {
    id: "macro-data-provider-precheck-policy",
    status: config.precheckReady ? "ready" : "blocked",
    checksProviderStatus: true,
    validatesSampleMarkets: true,
    requiresManualSmokeTest: true,
  };
  if (freshnessPolicy.status !== "ready") {
    blockedReasons.push("宏观指标 asOf、新鲜度和过期标签规则尚未确认。");
  }
  if (policyCalendarVerification.status !== "ready") {
    blockedReasons.push("政策日历来源、时区和授权验证规则尚未确认。");
  }
  if (precheckPolicy.status !== "ready") {
    blockedReasons.push("宏观 provider 状态页、样例市场和人工 smoke test 预检尚未确认。");
  }

  const status = {
    id: "macro-data-provider-adapter",
    name: canFetchLiveMacro ? "Macro Data Provider Adapter" : "Macro Data Provider Adapter Skeleton",
    status: canFetchLiveMacro ? "ready-for-provider-smoke" : blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: canFetchLiveMacro ? "delayed" : "inactive",
    selectedProvider: config.selectedProvider,
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    networkEnabled: config.networkEnabled,
    canFetchLiveMacro,
    canReadFixtures: true,
    processing: {
      macroFactorLinking: "six-factor-macro-input-v1",
      indicatorNormalization: canFetchLiveMacro
        ? "world-bank-annual-indicator-score-v1"
        : "fixture-indicator-score-v1",
      policyEventScoring: canFetchLiveMacro ? "not-available" : "importance-score-fixture-v1",
    },
    worldBankConnector: {
      id: "world-bank-open-data-connector",
      status: isWorldBankProvider && config.configured ? "configured" : "defined",
      providerId: "world-bank-open-data",
      officialEndpoint: worldBankBaseUrl,
      supportedMarkets: ["a", "hk", "us"],
      supportedCountries: Object.values(worldBankCountryByMarket).map((country) => country.code),
      requiresApiKey: false,
      requiresExplicitNetworkFlag: true,
      networkEnabled: config.networkEnabled,
      canRequestProvider: canFetchLiveMacro,
      indicators: worldBankIndicators.map((indicator) => indicator.code),
      disclaimer:
        "World Bank Open Data 用于第一阶段真实宏观年度指标联调；数据存在发布滞后，不能标注为实时宏观信号。",
    },
    fixtureReadModel: {
      status: "available",
      contextCount: fixtures.length,
      indicatorCount: fixtures.reduce((total, item) => total + item.indicators.length, 0),
      policyEventCount: fixtures.reduce((total, item) => total + item.policyEvents.length, 0),
      markets: fixtures.map((item) => item.market),
      source: source().id,
    },
    missingEnvVars: config.missingEnvVars,
    endpointContracts: createEndpointContracts(),
    freshnessPolicy,
    policyCalendarVerification,
    precheckPolicy,
    safety: {
      noVendorNetworkCalls: !canFetchLiveMacro,
      noTradingActions: true,
      requiresAttribution: true,
      requiresLicenseReview: true,
      requiresFreshnessLabel: true,
      requiresPolicyCalendarVerification: true,
      requiresProviderPrecheck: true,
      mockFallbackActive: true,
    },
    blockedReasons,
    nextSteps: [
      "选择授权宏观经济数据 provider，并确认利率、汇率、通胀和政策事件的展示授权。",
      "实现 getMacroContext、listMacroIndicators、listPolicyEvents，并保留 source、asOf 和 licenseTag。",
      "把宏观因子接入 AI 分析输入覆盖和六因子权重，不允许把样例数据描述为实时官方数据。",
    ],
    disclaimer:
      canFetchLiveMacro
        ? "当前已启用 World Bank Open Data 宏观年度指标；无真实结果时保持空白，不回退样例宏观数据。"
        : "当前为宏观经济 provider adapter 骨架。真实 provider 不会被请求；本地 fixture 仅用于接口联调和分析链路验证。",
  };
  return {
    ...status,
    providerPreflightPlan: createProviderPreflightPlan(status),
  };
}

export function createMacroDataProviderAdapter({
  env = process.env,
  fixtures = defaultMacroFixtures,
} = {}) {
  const normalizedFixtures = fixtures.map((fixture) => ({
    ...fixture,
    source: source(),
    asOf: "2026-06-01T00:00:00.000Z",
  }));
  const config = readConfig(env);
  const status = createStatus(config, normalizedFixtures);

  return {
    id: status.id,
    status() {
      return status;
    },
    getMacroContext(input = {}) {
      if (status.canFetchLiveMacro) {
        return fetchWorldBankMacroContext({ config, input, fetchImpl: input.fetchImpl || fetch });
      }
      const market = normalizeMarket(input.market) || "a";
      const fixture = normalizedFixtures.find((item) => item.market === market);
      if (!fixture) {
        return {
          status: "not-found",
          mode: "fixture",
          market,
          error: {
            code: "MACRO_CONTEXT_NOT_FOUND",
            message: "未找到对应市场的样例宏观经济数据。",
          },
          disclaimer: "当前仅查询本地样例宏观数据，不代表真实宏观经济数据库。",
        };
      }

      return {
        status: "ok",
        mode: "fixture",
        market,
        region: fixture.region,
        factorScore: fixture.factorScore,
        summary: fixture.summary,
        indicators: fixture.indicators.map((indicator) => ({ ...indicator })),
        policyEvents: fixture.policyEvents.map((event) => ({
          ...event,
          source: source(),
        })),
        processing: status.processing,
        source: source(),
        sourceStatus: "sample-fixture",
        asOf: fixture.asOf,
        disclaimer:
          "当前为本地样例宏观经济数据读取，不代表真实官方宏观数据、利率、汇率或政策日历，不构成投资建议。",
      };
    },
  };
}
