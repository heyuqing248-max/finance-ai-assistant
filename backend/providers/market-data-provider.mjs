const requiredEnvVars = ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"];
const requiredOperationalEnvVars = [
  "FINANCE_AI_MARKET_DATA_ENTITLEMENTS_READY",
  "FINANCE_AI_MARKET_DATA_DELAY_LABELS_READY",
  "FINANCE_AI_MARKET_DATA_PRECHECK_READY",
];
const supportedProviderIds = [
  "licensed-market-data",
  "alpha-vantage",
  "twelve-data",
  "yahoo-chart",
  "stooq-csv",
  "tencent-quote",
  "multi-free",
];
const marketCurrencies = { a: "CNY", hk: "HKD", us: "USD" };
const marketTimezones = { a: "Asia/Shanghai", hk: "Asia/Hong_Kong", us: "America/New_York" };
const alphaVantageBaseUrl = "https://www.alphavantage.co/query";
const twelveDataBaseUrl = "https://api.twelvedata.com";
const yahooChartBaseUrl = "https://query1.finance.yahoo.com/v8/finance/chart";
const stooqQuoteBaseUrl = "https://stooq.com/q/l/";
const stooqHistoryBaseUrl = "https://stooq.com/q/d/l/";
const tencentQuoteBaseUrl = "https://qt.gtimg.cn/q=";
const publicChartRequestHeaders = {
  accept: "application/json,text/plain,*/*",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) FinanceAIAssistant/1.0 Safari/537.36",
};

function redactAlphaVantageMessage(message, input = {}) {
  const raw = String(message || "");
  if (!raw) return "";
  const configuredKey = String(input.apiKey || input.apikey || "").trim();
  let redacted = raw
    .replace(/apikey[=:]\s*["']?[^"',\s&]+/gi, "apikey=REDACTED")
    .replace(/api key (?:as|is)\s+([A-Z0-9]{8,})/gi, "api key as REDACTED");
  if (configuredKey) {
    redacted = redacted.split(configuredKey).join("REDACTED");
  }
  return redacted;
}

function redactProviderMessage(message, input = {}) {
  const raw = String(message || "");
  if (!raw) return "";
  const configuredKey = String(input.apiKey || input.apikey || "").trim();
  let redacted = raw
    .replace(/apikey[=:]\s*["']?[^"',\s&]+/gi, "apikey=REDACTED")
    .replace(/api[_-]?key[=:]\s*["']?[^"',\s&]+/gi, "api_key=REDACTED")
    .replace(/api key (?:as|is)\s+([A-Z0-9]{8,})/gi, "api key as REDACTED");
  if (configuredKey) {
    redacted = redacted.split(configuredKey).join("REDACTED");
  }
  return redacted;
}

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function readMarketDataConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_MARKET_DATA_PROVIDER")
    ? env.FINANCE_AI_MARKET_DATA_PROVIDER.trim()
    : "";
  const alphaVantageApiKey = hasEnvValue(env, "FINANCE_AI_ALPHA_VANTAGE_API_KEY")
    ? env.FINANCE_AI_ALPHA_VANTAGE_API_KEY.trim()
    : hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY")
      ? env.FINANCE_AI_MARKET_DATA_API_KEY.trim()
      : "";
  const twelveDataApiKey = hasEnvValue(env, "FINANCE_AI_TWELVE_DATA_API_KEY")
    ? env.FINANCE_AI_TWELVE_DATA_API_KEY.trim()
    : hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY")
      ? env.FINANCE_AI_MARKET_DATA_API_KEY.trim()
      : "";
  const genericApiKey = hasEnvValue(env, "FINANCE_AI_MARKET_DATA_API_KEY")
    ? env.FINANCE_AI_MARKET_DATA_API_KEY.trim()
    : "";
  const hasSelectedProviderKey =
    selectedProvider === "alpha-vantage"
      ? Boolean(alphaVantageApiKey)
      : selectedProvider === "twelve-data"
        ? Boolean(twelveDataApiKey)
        : selectedProvider === "yahoo-chart"
          ? true
          : selectedProvider === "stooq-csv"
            ? true
          : selectedProvider === "multi-free"
            ? true
            : Boolean(genericApiKey);
  const missingEnvVars = requiredEnvVars.filter((name) => {
    if (name === "FINANCE_AI_MARKET_DATA_API_KEY" && hasSelectedProviderKey) return false;
    return !hasEnvValue(env, name);
  });
  const missingOperationalEnvVars = requiredOperationalEnvVars.filter((name) => !hasEnvValue(env, name));
  const configured = missingEnvVars.length === 0;
  const supported = !selectedProvider || supportedProviderIds.includes(selectedProvider);
  const licenseConfirmed = env.FINANCE_AI_DATA_LICENSE_CONFIRMED === "true";
  const attributionReady = env.FINANCE_AI_SOURCE_ATTRIBUTION_READY === "true";
  const rateLimitReady = env.FINANCE_AI_DATA_RATE_LIMIT_PLAN === "true";
  const entitlementsReady = env.FINANCE_AI_MARKET_DATA_ENTITLEMENTS_READY === "true";
  const delayLabelsReady = env.FINANCE_AI_MARKET_DATA_DELAY_LABELS_READY === "true";
  const precheckReady = env.FINANCE_AI_MARKET_DATA_PRECHECK_READY === "true";
  const requestedMode =
    env.FINANCE_AI_MARKET_DATA_MODE === "live" ? "live" : env.FINANCE_AI_MARKET_DATA_MODE === "delayed" ? "delayed" : "delayed";
  const maxRequestsPerMinute = Number(env.FINANCE_AI_MARKET_DATA_MAX_REQUESTS_PER_MINUTE);
  const networkEnabled = env.FINANCE_AI_MARKET_DATA_ALLOW_NETWORK === "true";
  const providerTimeoutMs = Number(env.FINANCE_AI_MARKET_DATA_TIMEOUT_MS);
  const apiKey = genericApiKey || (selectedProvider === "twelve-data" ? twelveDataApiKey : alphaVantageApiKey);

  return {
    selectedProvider,
    configured,
    supported,
    missingEnvVars,
    missingOperationalEnvVars,
    licenseConfirmed,
    attributionReady,
    rateLimitReady,
    entitlementsReady,
    delayLabelsReady,
    precheckReady,
    requestedMode,
    networkEnabled,
    apiKey,
    alphaVantageApiKey,
    twelveDataApiKey,
    providerTimeoutMs:
      Number.isFinite(providerTimeoutMs) && providerTimeoutMs >= 1000
        ? Math.round(providerTimeoutMs)
        : 8000,
    maxRequestsPerMinute:
      Number.isFinite(maxRequestsPerMinute) && maxRequestsPerMinute > 0
        ? Math.round(maxRequestsPerMinute)
        : 60,
  };
}

export function mapAlphaVantageSymbol({ market, code, symbol } = {}) {
  const raw = String(symbol || code || "").trim();
  const normalizedMarket = normalizeMarket(market);
  if (!raw) return "";
  if (raw.includes(".")) return raw.toUpperCase();
  if (normalizedMarket === "us") return raw.toUpperCase();
  if (normalizedMarket === "hk") return `${raw.padStart(4, "0")}.HKG`;
  if (normalizedMarket === "a") {
    const suffix = raw.startsWith("6") ? "SHH" : "SHZ";
    return `${raw}.${suffix}`;
  }
  return raw.toUpperCase();
}

export function mapTwelveDataSymbol({ market, code, symbol } = {}) {
  const raw = String(symbol || code || "").trim();
  const normalizedMarket = normalizeMarket(market);
  if (!raw) return "";
  if (raw.includes(":")) return raw.toUpperCase();
  if (normalizedMarket === "us") return raw.toUpperCase();
  return "";
}

export function mapYahooFinanceSymbol({ market, code, symbol } = {}) {
  const raw = String(symbol || code || "").trim();
  const normalizedMarket = normalizeMarket(market);
  if (!raw) return "";
  if (raw.includes(".")) return raw.toUpperCase();
  if (normalizedMarket === "us") return raw.toUpperCase();
  if (normalizedMarket === "hk") return `${raw.padStart(4, "0")}.HK`;
  if (normalizedMarket === "a") {
    const suffix = raw.startsWith("6") ? "SS" : "SZ";
    return `${raw}.${suffix}`;
  }
  return raw.toUpperCase();
}

export function mapStooqSymbol({ market, code, symbol } = {}) {
  const raw = String(symbol || code || "").trim();
  const normalizedMarket = normalizeMarket(market);
  if (!raw) return "";
  if (raw.includes(".")) return raw.toLowerCase();
  if (normalizedMarket === "us") return `${raw.toLowerCase()}.us`;
  if (normalizedMarket === "hk") return `${raw.padStart(4, "0").toLowerCase()}.hk`;
  return "";
}

export function mapTencentQuoteSymbol({ market, code, symbol } = {}) {
  const raw = String(symbol || code || "").trim();
  const normalizedMarket = normalizeMarket(market);
  if (!raw) return "";
  if (/^(?:sh|sz|hk|us)[a-z0-9.]+$/i.test(raw)) return raw.toLowerCase();
  if (normalizedMarket === "a") {
    return `${raw.startsWith("6") ? "sh" : "sz"}${raw}`;
  }
  if (normalizedMarket === "hk") return `hk${raw.padStart(5, "0")}`;
  if (normalizedMarket === "us") return `us${raw.toLowerCase()}`;
  return raw.toLowerCase();
}

function createAlphaVantageConnectorPolicy(config) {
  const isSelected = config.selectedProvider === "alpha-vantage" || config.selectedProvider === "multi-free";
  return {
    id: "alpha-vantage-quote-connector",
    status: isSelected && config.configured ? "configured" : "defined",
    providerId: "alpha-vantage",
    officialEndpoint: alphaVantageBaseUrl,
    functionName: "GLOBAL_QUOTE",
    supportedMarkets: ["a", "hk", "us"],
    symbolMapping: {
      us: "AAPL",
      hk: "0700.HKG",
      aShanghai: "600519.SHH",
      aShenzhen: "000001.SHZ",
    },
    requiresApiKey: true,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider:
      isSelected && Boolean(config.alphaVantageApiKey) && config.networkEnabled && config.supported,
    forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
    requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    disclaimer:
      "Alpha Vantage 行情连接器用于第一阶段真实 quote 接入；必须显示来源、时间戳和延迟/实时标签，不能承诺实时或交易所授权覆盖。",
  };
}

function createAlphaVantageSmokeTestPlan(connectorPolicy) {
  return {
    id: "alpha-vantage-demo-smoke-test-plan",
    status: "defined",
    mode: "real-provider-demo-key-smoke",
    demoSymbol: "IBM",
    expectedFields: [
      "01. symbol",
      "05. price",
      "06. volume",
      "07. latest trading day",
      "10. change percent",
    ],
    canUseDemoEndpoint: true,
    canUseProductionKey: connectorPolicy.canRequestProvider,
    blocksIfMissingAttribution: true,
    forbiddenAuditFields: connectorPolicy.forbiddenAuditFields,
    disclaimer:
      "Demo smoke test 只验证连接和字段解析，不代表你的个人 API key、A/HK/US 授权或实时行情权限已经完成。",
  };
}

function createAlphaVantageCredentialPreflight(config, connectorPolicy) {
  const apiKeyStatus = !config.alphaVantageApiKey
    ? "missing"
    : config.alphaVantageApiKey.toLowerCase() === "demo"
      ? "demo-key-limited"
      : "configured-redacted";
  const networkStatus = config.networkEnabled ? "enabled" : "disabled";
  const missingRequiredEnvVars = config.missingEnvVars.filter((name) =>
    ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"].includes(name),
  );

  return {
    id: "alpha-vantage-quote-credential-preflight",
    status: connectorPolicy.canRequestProvider
      ? apiKeyStatus === "demo-key-limited"
        ? "demo-key-limited"
        : "ready-for-provider-smoke"
      : "blocked",
    mode: "no-secret-credential-preflight",
    providerId: "alpha-vantage",
    functionName: "GLOBAL_QUOTE",
    apiKeyStatus,
    networkStatus,
    requiredEnvVars: [
      "FINANCE_AI_MARKET_DATA_PROVIDER",
      "FINANCE_AI_MARKET_DATA_API_KEY",
      "FINANCE_AI_ALPHA_VANTAGE_API_KEY",
      "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
    ],
    missingRequiredEnvVars,
    canRunDemoSmoke: connectorPolicy.canRequestProvider,
    canValidateProductionKey: connectorPolicy.canRequestProvider && apiKeyStatus === "configured-redacted",
    forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
    nextActions:
      apiKeyStatus === "configured-redacted"
        ? ["运行 IBM quote smoke，确认 source/asOf/dataDelay 展示完整。"]
        : [
            "申请或填写真实 Alpha Vantage API key，可使用 FINANCE_AI_ALPHA_VANTAGE_API_KEY。",
            "确认 FINANCE_AI_MARKET_DATA_ALLOW_NETWORK=true 后再运行 provider smoke。",
          ],
    disclaimer:
      "该预检只记录 key 是否存在、是否为 demo key 和网络开关状态；不会输出、保存或审计真实 API key。",
  };
}

function createTwelveDataConnectorPolicy(config) {
  const isSelected = config.selectedProvider === "twelve-data" || config.selectedProvider === "multi-free";
  const hasProviderKey = Boolean(config.twelveDataApiKey);
  const status = !isSelected
    ? "defined"
    : !hasProviderKey
      ? "missing-key"
      : !config.networkEnabled
        ? "network-disabled"
        : config.supported
          ? "configured"
          : "unsupported-provider";
  return {
    id: "twelve-data-quote-connector",
    status,
    providerId: "twelve-data",
    officialEndpoint: `${twelveDataBaseUrl}/quote`,
    functionName: "QUOTE",
    supportedMarkets: ["us"],
    plannedMarkets: ["a", "hk"],
    symbolMapping: {
      us: "AAPL",
      hk: "planned-after-symbol-entitlement-check",
      a: "planned-after-exchange-entitlement-check",
    },
    freePlanReference: {
      plan: "Basic",
      apiCreditsPerMinute: 8,
      apiCreditsPerDay: 800,
      source: "Twelve Data pricing page",
      url: "https://twelvedata.com/pricing",
    },
    requiresApiKey: true,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider:
      isSelected && hasProviderKey && config.networkEnabled && config.supported,
    forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
    requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    disclaimer:
      "Twelve Data 行情连接器用于提高免费额度并降低 Alpha Vantage 配额依赖；第一阶段仅启用美股 quote，A 股/港股需确认符号映射、授权和延迟标签后再开放。",
  };
}

function createTwelveDataSmokeTestPlan(connectorPolicy) {
  return {
    id: "twelve-data-smoke-test-plan",
    status: "defined",
    mode: "real-provider-free-tier-smoke",
    demoSymbol: "MSFT",
    expectedFields: ["symbol", "close", "previous_close", "datetime", "timestamp"],
    canUseDemoEndpoint: false,
    canUseProductionKey: connectorPolicy.canRequestProvider,
    blocksIfMissingAttribution: true,
    forbiddenAuditFields: connectorPolicy.forbiddenAuditFields,
    disclaimer:
      "Twelve Data smoke test 只验证连接和字段解析，不代表所有市场、所有字段或实时展示授权已经完成。",
  };
}

function createTwelveDataCredentialPreflight(config, connectorPolicy) {
  const apiKeyStatus = !config.twelveDataApiKey
    ? "missing"
    : config.twelveDataApiKey.toLowerCase() === "demo"
      ? "demo-key-not-supported"
      : "configured-redacted";
  const networkStatus = config.networkEnabled ? "enabled" : "disabled";
  const missingRequiredEnvVars = [
    ...config.missingEnvVars.filter((name) =>
      ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"].includes(name),
    ),
    ...(apiKeyStatus === "missing" ? ["FINANCE_AI_TWELVE_DATA_API_KEY"] : []),
  ];

  return {
    id: "twelve-data-quote-credential-preflight",
    status: connectorPolicy.canRequestProvider ? "ready-for-provider-smoke" : "blocked",
    mode: "no-secret-credential-preflight",
    providerId: "twelve-data",
    functionName: "QUOTE",
    apiKeyStatus,
    networkStatus,
    requiredEnvVars: [
      "FINANCE_AI_MARKET_DATA_PROVIDER",
      "FINANCE_AI_MARKET_DATA_API_KEY",
      "FINANCE_AI_TWELVE_DATA_API_KEY",
      "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
    ],
    missingRequiredEnvVars,
    canRunDemoSmoke: connectorPolicy.canRequestProvider,
    canValidateProductionKey: connectorPolicy.canRequestProvider && apiKeyStatus === "configured-redacted",
    forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
    nextActions:
      apiKeyStatus === "configured-redacted"
        ? ["运行 MSFT quote smoke，确认 source/asOf/dataDelay 展示完整。"]
        : [
            "申请或填写 Twelve Data API key，可使用 FINANCE_AI_TWELVE_DATA_API_KEY。",
            "确认 FINANCE_AI_MARKET_DATA_PROVIDER=twelve-data。",
            "确认 FINANCE_AI_MARKET_DATA_ALLOW_NETWORK=true 后再运行 provider smoke。",
          ],
    disclaimer:
      "该预检只记录 Twelve Data key 是否存在和网络开关状态；不会输出、保存或审计真实 API key。",
  };
}

function createYahooChartConnectorPolicy(config) {
  const isSelected = config.selectedProvider === "yahoo-chart" || config.selectedProvider === "multi-free";
  const status = !isSelected
    ? "defined"
    : !config.networkEnabled
      ? "network-disabled"
      : config.supported
        ? "configured"
        : "unsupported-provider";
  return {
    id: "yahoo-chart-quote-connector",
    status,
    providerId: "yahoo-chart",
    officialEndpoint: `${yahooChartBaseUrl}/{symbol}`,
    functionName: "CHART",
    supportedMarkets: ["a", "hk", "us"],
    symbolMapping: {
      us: "MSFT",
      hk: "0700.HK",
      aShanghai: "600519.SS",
      aShenzhen: "000001.SZ",
    },
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider: isSelected && config.networkEnabled && config.supported,
    forbiddenAuditFields: ["rawProviderUrl", "providerResponseRaw"],
    requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    disclaimer:
      "Yahoo Chart fallback 用于本地 Demo 扩展 A/HK/US 报价覆盖；它是公开端点 fallback，不代表交易所授权实时行情、持牌数据源或正式生产许可。",
  };
}

function createStooqConnectorPolicy(config) {
  const isSelected = config.selectedProvider === "stooq-csv" || config.selectedProvider === "multi-free";
  const status = !isSelected
    ? "defined"
    : !config.networkEnabled
      ? "network-disabled"
      : config.supported
        ? "configured"
        : "unsupported-provider";
  return {
    id: "stooq-csv-quote-connector",
    status,
    providerId: "stooq-csv",
    officialEndpoint: stooqQuoteBaseUrl,
    functionName: "CSV_QUOTE_AND_DAILY_HISTORY",
    supportedMarkets: ["us"],
    plannedMarkets: ["hk", "a"],
    symbolMapping: {
      us: "aapl.us",
      hk: "0700.hk",
      a: "not-enabled-until-symbol-coverage-verified",
    },
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider: isSelected && config.networkEnabled && config.supported,
    forbiddenAuditFields: ["rawProviderUrl", "providerResponseRaw"],
    requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    disclaimer:
      "Stooq CSV fallback 用于 Yahoo Chart 临时失败后的免费美股报价和日线走势兜底；它是公开 CSV 端点，不代表交易所授权实时行情或正式生产许可。",
  };
}

function createTencentQuoteConnectorPolicy(config) {
  const isSelected = config.selectedProvider === "tencent-quote" || config.selectedProvider === "multi-free";
  const status = !isSelected
    ? "defined"
    : !config.networkEnabled
      ? "network-disabled"
      : config.supported
        ? "configured"
        : "unsupported-provider";
  return {
    id: "tencent-quote-connector",
    status,
    providerId: "tencent-quote",
    officialEndpoint: `${tencentQuoteBaseUrl}{symbol}`,
    functionName: "QT_QUOTE",
    supportedMarkets: ["a", "hk", "us"],
    symbolMapping: {
      us: "usmsft",
      hk: "hk00700",
      aShanghai: "sh600519",
      aShenzhen: "sz000001",
    },
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider: isSelected && config.networkEnabled && config.supported,
    forbiddenAuditFields: ["rawProviderUrl", "providerResponseRaw"],
    requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    disclaimer:
      "Tencent Quote fallback 仅用于本地 Demo 公开行情兜底，需显示来源、时间戳和公开端点标签；不代表交易所授权实时行情、持牌数据源或正式生产许可。",
  };
}

export function parseYahooFinanceChartQuote(payload, input = {}) {
  const result = payload?.chart?.result?.[0];
  const error = payload?.chart?.error;
  if (!result || typeof result !== "object") {
    return {
      status: "unavailable",
      error: {
        code: "YAHOO_CHART_QUOTE_EMPTY",
        message: redactProviderMessage(error?.description || error?.code || "Yahoo Chart 未返回 quote result。", input),
      },
    };
  }
  const meta = result.meta || {};
  const quoteSeries = result.indicators?.quote?.[0] || {};
  const closeSeries = Array.isArray(quoteSeries.close) ? quoteSeries.close : [];
  const timestampSeries = Array.isArray(result.timestamp) ? result.timestamp : [];
  const lastClose = [...closeSeries].reverse().find((value) => Number.isFinite(Number(value)));
  const lastTimestamp = [...timestampSeries].reverse().find((value) => Number.isFinite(Number(value)));
  const price = Number(meta.regularMarketPrice ?? lastClose);
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
  const asOfSeconds = Number(meta.regularMarketTime ?? lastTimestamp);
  if (!Number.isFinite(price) || !Number.isFinite(asOfSeconds)) {
    return {
      status: "unavailable",
      error: {
        code: "YAHOO_CHART_QUOTE_INVALID",
        message: "Yahoo Chart quote 缺少价格或时间字段。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "";
  const change = Number.isFinite(previousClose) ? price - previousClose : null;
  const changePercent =
    Number.isFinite(previousClose) && previousClose !== 0 ? (change / previousClose) * 100 : null;
  return {
    status: "ok",
    mode: "real-provider",
    quote: {
      market: normalizedMarket,
      code: String(input.code || input.symbol || meta.symbol || "").trim(),
      providerSymbol: meta.symbol || mapYahooFinanceSymbol(input),
      lastPrice: price,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      change: Number.isFinite(change) ? Number(change.toFixed(4)) : null,
      changePercent: Number.isFinite(changePercent) ? Number(changePercent.toFixed(4)) : null,
      volume: Number(meta.regularMarketVolume ?? 0) || 0,
      currency: meta.currency || marketCurrencies[normalizedMarket] || "UNKNOWN",
      asOf: new Date(asOfSeconds * 1000).toISOString(),
      source: {
        id: "yahoo-finance-chart",
        label: "Yahoo Finance Chart",
        licenseTag: "public-chart-endpoint-fallback",
        attributionRequired: true,
      },
      dataDelay: "provider-reported-or-delayed",
    },
  };
}

function parseTencentTimestamp(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return "";
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function parseTencentQuoteText(text, input = {}) {
  const raw = String(text || "");
  const match = raw.match(/="([^"]*)"/);
  const fields = (match ? match[1] : raw).split("~");
  const price = Number(fields[3]);
  const previousClose = Number(fields[4]);
  const open = Number(fields[5]);
  const volume = Number(fields[6]);
  const providerTimestamp = parseTencentTimestamp(fields[30]);
  if (!Number.isFinite(price) || !providerTimestamp) {
    return {
      status: "unavailable",
      error: {
        code: "TENCENT_QUOTE_INVALID",
        message: "Tencent Quote 缺少价格或时间字段。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "";
  const change = Number.isFinite(previousClose) ? price - previousClose : null;
  const changePercent =
    Number.isFinite(previousClose) && previousClose !== 0 ? (change / previousClose) * 100 : Number(fields[32]);
  return {
    status: "ok",
    mode: "real-provider",
    quote: {
      market: normalizedMarket,
      code: String(input.code || input.symbol || fields[2] || "").trim(),
      providerSymbol: mapTencentQuoteSymbol(input),
      lastPrice: price,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      open: Number.isFinite(open) ? open : null,
      change: Number.isFinite(change) ? Number(change.toFixed(4)) : null,
      changePercent: Number.isFinite(changePercent) ? Number(changePercent.toFixed(4)) : null,
      volume: Number.isFinite(volume) ? volume : 0,
      currency: marketCurrencies[normalizedMarket] || "UNKNOWN",
      asOf: providerTimestamp,
      source: {
        id: "tencent-quote",
        label: "Tencent Quote",
        licenseTag: "public-quote-endpoint-local-demo",
        attributionRequired: true,
      },
      dataDelay: "public-endpoint-delayed-or-provider-reported",
    },
  };
}

export function parseYahooFinanceChartHistory(payload, input = {}) {
  const result = payload?.chart?.result?.[0];
  const error = payload?.chart?.error;
  if (!result || typeof result !== "object") {
    return {
      status: "unavailable",
      error: {
        code: "YAHOO_CHART_HISTORY_EMPTY",
        message: redactProviderMessage(error?.description || error?.code || "Yahoo Chart 未返回 history result。", input),
      },
    };
  }
  const meta = result.meta || {};
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quoteSeries = result.indicators?.quote?.[0] || {};
  const closeSeries = Array.isArray(quoteSeries.close) ? quoteSeries.close : [];
  const points = timestamps
    .map((timestamp, index) => {
      const close = Number(closeSeries[index]);
      const seconds = Number(timestamp);
      if (!Number.isFinite(close) || !Number.isFinite(seconds)) return null;
      const date = new Date(seconds * 1000);
      return {
        date: date.toISOString().slice(0, 10),
        label: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
        close,
        sequence: index + 1,
      };
    })
    .filter(Boolean)
    .slice(-8)
    .map((point, index) => ({ ...point, sequence: index + 1 }));

  if (points.length < 2) {
    return {
      status: "unavailable",
      error: {
        code: "YAHOO_CHART_HISTORY_INSUFFICIENT",
        message: "Yahoo Chart history 可用价格点不足。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "";
  return {
    status: "ok",
    mode: "real-provider",
    market: normalizedMarket,
    code: String(input.code || input.symbol || meta.symbol || "").trim(),
    providerSymbol: meta.symbol || mapYahooFinanceSymbol(input),
    range: input.range || "6m",
    interval: input.interval || "1d",
    currency: meta.currency || marketCurrencies[normalizedMarket] || "UNKNOWN",
    asOf: `${points.at(-1).date}T00:00:00.000Z`,
    points,
    source: {
      id: "yahoo-finance-chart",
      label: "Yahoo Finance Chart",
      licenseTag: "public-chart-endpoint-fallback",
      attributionRequired: true,
    },
    dataDelay: "provider-reported-or-delayed",
  };
}

function parseCsvRows(text) {
  return String(text || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function parseStooqDateTime(dateText, timeText = "") {
  const date = String(dateText || "").trim();
  const time = String(timeText || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const normalizedTime = /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : "00:00:00";
  const parsed = new Date(`${date}T${normalizedTime}.000Z`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function parseStooqQuoteCsv(text, input = {}) {
  const rows = parseCsvRows(text);
  const header = rows[0] || [];
  const row = rows[1] || [];
  const indexOf = (name) => header.findIndex((field) => field.toLowerCase() === name.toLowerCase());
  const symbol = row[indexOf("Symbol")] || mapStooqSymbol(input);
  const date = row[indexOf("Date")];
  const time = row[indexOf("Time")];
  const close = Number(row[indexOf("Close")]);
  const open = Number(row[indexOf("Open")]);
  const volume = Number(row[indexOf("Volume")]);
  const asOf = parseStooqDateTime(date, time);
  if (!Number.isFinite(close) || close <= 0 || !asOf || /N\/D/i.test(row.join(","))) {
    return {
      status: "unavailable",
      error: {
        code: "STOOQ_QUOTE_INVALID",
        message: "Stooq CSV quote 缺少有效价格或日期字段。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "us";
  return {
    status: "ok",
    mode: "real-provider",
    quote: {
      market: normalizedMarket,
      code: String(input.code || input.symbol || symbol || "").trim().replace(/\.us$/i, "").toUpperCase(),
      providerSymbol: symbol || mapStooqSymbol(input),
      lastPrice: close,
      previousClose: Number.isFinite(open) ? open : null,
      change: Number.isFinite(open) ? Number((close - open).toFixed(4)) : null,
      changePercent: Number.isFinite(open) && open !== 0 ? Number((((close - open) / open) * 100).toFixed(4)) : null,
      volume: Number.isFinite(volume) ? volume : 0,
      currency: marketCurrencies[normalizedMarket] || "UNKNOWN",
      asOf,
      source: {
        id: "stooq-csv",
        label: "Stooq CSV",
        licenseTag: "public-csv-endpoint-fallback",
        attributionRequired: true,
      },
      dataDelay: "public-endpoint-delayed-or-provider-reported",
    },
  };
}

export function parseStooqHistoryCsv(text, input = {}) {
  const rows = parseCsvRows(text);
  const header = rows[0] || [];
  const indexOf = (name) => header.findIndex((field) => field.toLowerCase() === name.toLowerCase());
  const points = rows
    .slice(1)
    .map((row, index) => {
      const date = row[indexOf("Date")];
      const close = Number(row[indexOf("Close")]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !Number.isFinite(close) || close <= 0) {
        return null;
      }
      const parsedDate = new Date(`${date}T00:00:00.000Z`);
      return {
        date,
        label: `${parsedDate.getUTCMonth() + 1}/${parsedDate.getUTCDate()}`,
        close,
        sequence: index + 1,
      };
    })
    .filter(Boolean)
    .slice(-8)
    .map((point, index) => ({ ...point, sequence: index + 1 }));
  if (points.length < 2) {
    return {
      status: "unavailable",
      error: {
        code: "STOOQ_HISTORY_INSUFFICIENT",
        message: "Stooq CSV history 可用价格点不足。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "us";
  return {
    status: "ok",
    mode: "real-provider",
    market: normalizedMarket,
    code: String(input.code || input.symbol || "").trim(),
    providerSymbol: mapStooqSymbol(input),
    range: input.range || "6m",
    interval: input.interval || "1d",
    currency: marketCurrencies[normalizedMarket] || "UNKNOWN",
    asOf: `${points.at(-1).date}T00:00:00.000Z`,
    points,
    source: {
      id: "stooq-csv",
      label: "Stooq CSV",
      licenseTag: "public-csv-endpoint-fallback",
      attributionRequired: true,
    },
    dataDelay: "public-endpoint-delayed-or-provider-reported",
  };
}

export function parseAlphaVantageGlobalQuote(payload, input = {}) {
  const quote = payload?.["Global Quote"];
  if (!quote || typeof quote !== "object") {
    const providerMessage =
      payload?.Information || payload?.Note || payload?.["Error Message"] || "Alpha Vantage 未返回 Global Quote。";
    return {
      status: "unavailable",
      error: {
        code: "ALPHA_VANTAGE_QUOTE_EMPTY",
        message: redactAlphaVantageMessage(providerMessage, input),
      },
    };
  }
  const price = Number(quote["05. price"]);
  const previousClose = Number(quote["08. previous close"]);
  const change = Number(quote["09. change"]);
  const changePercent = Number(String(quote["10. change percent"] || "").replace("%", ""));
  const latestTradingDay = quote["07. latest trading day"] || "";
  if (!Number.isFinite(price) || !latestTradingDay) {
    return {
      status: "unavailable",
      error: {
        code: "ALPHA_VANTAGE_QUOTE_INVALID",
        message: "Alpha Vantage quote 缺少价格或交易日字段。",
      },
    };
  }
  return {
    status: "ok",
    mode: "real-provider",
    quote: {
      market: normalizeMarket(input.market) || "",
      code: String(input.code || input.symbol || "").trim(),
      providerSymbol: quote["01. symbol"] || mapAlphaVantageSymbol(input),
      lastPrice: price,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      change: Number.isFinite(change) ? change : null,
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
      volume: Number(quote["06. volume"]) || 0,
      currency: marketCurrencies[normalizeMarket(input.market)] || "UNKNOWN",
      asOf: `${latestTradingDay}T00:00:00.000Z`,
      source: {
        id: "alpha-vantage-global-quote",
        label: "Alpha Vantage GLOBAL_QUOTE",
        licenseTag: "alpha-vantage-api",
        attributionRequired: true,
      },
      dataDelay: "provider-reported-or-delayed",
    },
  };
}

export function parseTwelveDataQuote(payload, input = {}) {
  if (!payload || typeof payload !== "object") {
    return {
      status: "unavailable",
      error: {
        code: "TWELVE_DATA_QUOTE_EMPTY",
        message: "Twelve Data 未返回 quote payload。",
      },
    };
  }
  if (payload.status === "error" || payload.code || payload.message) {
    return {
      status: "unavailable",
      error: {
        code: "TWELVE_DATA_QUOTE_ERROR",
        message: redactProviderMessage(payload.message || payload.code || "Twelve Data quote 请求失败。", input),
      },
    };
  }
  const price = Number(payload.close ?? payload.price);
  const previousClose = Number(payload.previous_close);
  const change = Number(payload.change);
  const changePercent = Number(payload.percent_change);
  const timestamp = Number(payload.timestamp);
  const datetime = String(payload.datetime || "").trim();
  if (!Number.isFinite(price) || (!datetime && !Number.isFinite(timestamp))) {
    return {
      status: "unavailable",
      error: {
        code: "TWELVE_DATA_QUOTE_INVALID",
        message: "Twelve Data quote 缺少价格或时间字段。",
      },
    };
  }
  const normalizedMarket = normalizeMarket(input.market) || "us";
  return {
    status: "ok",
    mode: "real-provider",
    quote: {
      market: normalizedMarket,
      code: String(input.code || input.symbol || payload.symbol || "").trim(),
      providerSymbol: payload.symbol || mapTwelveDataSymbol(input),
      lastPrice: price,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      change: Number.isFinite(change) ? change : null,
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
      volume: Number(payload.volume) || 0,
      currency: payload.currency || marketCurrencies[normalizedMarket] || "UNKNOWN",
      asOf: Number.isFinite(timestamp)
        ? new Date(timestamp * 1000).toISOString()
        : `${datetime}T00:00:00.000Z`,
      source: {
        id: "twelve-data-quote",
        label: "Twelve Data Quote",
        licenseTag: "twelve-data-api",
        attributionRequired: true,
      },
      dataDelay: "provider-reported-or-delayed",
    },
  };
}

async function fetchAlphaVantageQuote({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapAlphaVantageSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const url = new URL(alphaVantageBaseUrl);
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("apikey", config.alphaVantageApiKey || config.apiKey || "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "ALPHA_VANTAGE_HTTP_ERROR",
          message: `Alpha Vantage HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseAlphaVantageGlobalQuote(payload, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "alpha-vantage",
        endpoint: "GLOBAL_QUOTE",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${alphaVantageBaseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(providerSymbol)}&apikey=REDACTED`,
      },
      disclaimer:
        "该报价来自 Alpha Vantage API 响应，仍需按你的 API key 权限、交易所授权和延迟标签理解，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "ALPHA_VANTAGE_TIMEOUT" : "ALPHA_VANTAGE_FETCH_FAILED",
        message: error?.message || "Alpha Vantage 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTwelveDataQuote({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapTwelveDataSymbol(input);
  if (!providerSymbol) {
    return {
      status: "unavailable",
      error: {
        code: "TWELVE_DATA_UNSUPPORTED_MARKET",
        message: "Twelve Data 第一阶段仅启用美股 quote；A 股/港股需确认符号映射和授权后再开放。",
      },
    };
  }
  const url = new URL(`${twelveDataBaseUrl}/quote`);
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("apikey", config.twelveDataApiKey || config.apiKey || "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "TWELVE_DATA_HTTP_ERROR",
          message: `Twelve Data HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseTwelveDataQuote(payload, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "twelve-data",
        endpoint: "QUOTE",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${twelveDataBaseUrl}/quote?symbol=${encodeURIComponent(providerSymbol)}&apikey=REDACTED`,
      },
      disclaimer:
        "该报价来自 Twelve Data API 响应，仍需按你的 API key 权限、交易所授权和延迟标签理解，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "TWELVE_DATA_TIMEOUT" : "TWELVE_DATA_FETCH_FAILED",
        message: error?.message || "Twelve Data 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYahooChartQuote({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapYahooFinanceSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const url = new URL(`${yahooChartBaseUrl}/${encodeURIComponent(providerSymbol)}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "5d");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: publicChartRequestHeaders,
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "YAHOO_CHART_HTTP_ERROR",
          message: `Yahoo Chart HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseYahooFinanceChartQuote(payload, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "yahoo-chart",
        endpoint: "CHART",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${yahooChartBaseUrl}/${encodeURIComponent(providerSymbol)}?interval=1d&range=5d`,
      },
      disclaimer:
        "该报价来自 Yahoo Finance Chart 公开端点 fallback，需显示来源和延迟标签；不代表交易所授权实时行情或正式生产许可，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "YAHOO_CHART_TIMEOUT" : "YAHOO_CHART_FETCH_FAILED",
        message: error?.message || "Yahoo Chart 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStooqQuote({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapStooqSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const url = new URL(stooqQuoteBaseUrl);
  url.searchParams.set("s", providerSymbol);
  url.searchParams.set("f", "sd2t2ohlcv");
  url.searchParams.set("h", "");
  url.searchParams.set("e", "csv");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "text/csv,*/*" },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "STOOQ_QUOTE_HTTP_ERROR",
          message: `Stooq CSV quote HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseStooqQuoteCsv(text, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "stooq-csv",
        endpoint: "CSV_QUOTE",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${stooqQuoteBaseUrl}?s=${encodeURIComponent(providerSymbol)}&f=sd2t2ohlcv&h&e=csv`,
      },
      disclaimer:
        "该报价来自 Stooq CSV 公开端点 fallback，需显示来源和延迟标签；不代表交易所授权实时行情或正式生产许可，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "STOOQ_QUOTE_TIMEOUT" : "STOOQ_QUOTE_FETCH_FAILED",
        message: error?.message || "Stooq CSV quote 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTencentQuote({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapTencentQuoteSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const url = `${tencentQuoteBaseUrl}${encodeURIComponent(providerSymbol)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "text/plain,*/*" },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "TENCENT_QUOTE_HTTP_ERROR",
          message: `Tencent Quote HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseTencentQuoteText(text, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "tencent-quote",
        endpoint: "QT_QUOTE",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${tencentQuoteBaseUrl}${encodeURIComponent(providerSymbol)}`,
      },
      disclaimer:
        "该报价来自 Tencent Quote 公开端点 fallback，需显示来源和延迟标签；不代表交易所授权实时行情或正式生产许可，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "TENCENT_QUOTE_TIMEOUT" : "TENCENT_QUOTE_FETCH_FAILED",
        message: error?.message || "Tencent Quote 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYahooChartHistory({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapYahooFinanceSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const fetchWithInterval = async ({ interval, range, retriedFrom = "" } = {}) => {
    const url = new URL(`${yahooChartBaseUrl}/${encodeURIComponent(providerSymbol)}`);
    url.searchParams.set("interval", interval);
    url.searchParams.set("range", range);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: publicChartRequestHeaders,
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) {
        return {
          status: "unavailable",
          error: {
            code: "YAHOO_CHART_HISTORY_HTTP_ERROR",
            message: `Yahoo Chart history HTTP ${response.status}`,
          },
        };
      }
      const parsed = parseYahooFinanceChartHistory(payload, { ...input, interval, range });
      if (parsed.status !== "ok") return parsed;
      return {
        ...parsed,
        provider: {
          id: "yahoo-chart",
          endpoint: "CHART",
          requestedSymbol: providerSymbol,
          entitlement: config.requestedMode,
          requestUrlRedacted: `${yahooChartBaseUrl}/${encodeURIComponent(providerSymbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`,
          retriedFrom,
        },
        disclaimer:
          "该走势来自 Yahoo Finance Chart 公开端点 fallback，需显示来源和延迟标签；不代表交易所授权实时行情或正式生产许可，不构成投资建议。",
      };
    } catch (error) {
      return {
        status: "unavailable",
        error: {
          code: error?.name === "AbortError" ? "YAHOO_CHART_HISTORY_TIMEOUT" : "YAHOO_CHART_HISTORY_FETCH_FAILED",
          message: error?.message || "Yahoo Chart history 请求失败。",
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const requestedInterval = input.interval === "1mo" ? "1mo" : "1d";
  const requestedRange = input.range || "6mo";
  const firstAttempt = await fetchWithInterval({
    interval: requestedInterval,
    range: requestedRange,
  });
  if (firstAttempt.status === "ok") return firstAttempt;
  if (
    firstAttempt.error?.code !== "YAHOO_CHART_HISTORY_INSUFFICIENT" ||
    requestedInterval === "1d"
  ) {
    return firstAttempt;
  }
  const retryAttempt = await fetchWithInterval({
    interval: "1d",
    range: requestedRange === "6m" ? "6mo" : requestedRange,
    retriedFrom: `${requestedInterval}/${requestedRange}`,
  });
  if (retryAttempt.status !== "ok") return retryAttempt;
  return {
    ...retryAttempt,
    fallbackFromInterval: requestedInterval,
    fallbackReason: firstAttempt.error?.code || "",
  };
}

async function fetchStooqHistory({ config, input, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable",
      error: { code: "FETCH_UNAVAILABLE", message: "当前 Node 运行时没有可用 fetch。" },
    };
  }
  const providerSymbol = mapStooqSymbol(input);
  if (!providerSymbol) return notFoundPayload(input);
  const url = new URL(stooqHistoryBaseUrl);
  url.searchParams.set("s", providerSymbol);
  url.searchParams.set("i", "d");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.providerTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "text/csv,*/*" },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        status: "unavailable",
        error: {
          code: "STOOQ_HISTORY_HTTP_ERROR",
          message: `Stooq CSV history HTTP ${response.status}`,
        },
      };
    }
    const parsed = parseStooqHistoryCsv(text, input);
    if (parsed.status !== "ok") return parsed;
    return {
      ...parsed,
      provider: {
        id: "stooq-csv",
        endpoint: "CSV_DAILY_HISTORY",
        requestedSymbol: providerSymbol,
        entitlement: config.requestedMode,
        requestUrlRedacted: `${stooqHistoryBaseUrl}?s=${encodeURIComponent(providerSymbol)}&i=d`,
      },
      disclaimer:
        "该走势来自 Stooq CSV 公开端点 fallback，需显示来源和延迟标签；不代表交易所授权实时行情或正式生产许可，不构成投资建议。",
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: {
        code: error?.name === "AbortError" ? "STOOQ_HISTORY_TIMEOUT" : "STOOQ_HISTORY_FETCH_FAILED",
        message: error?.message || "Stooq CSV history 请求失败。",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createEndpointContracts() {
  return [
    {
      id: "quote",
      method: "getQuote",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "code"],
      output: ["lastPrice", "currency", "asOf", "source", "licenseTag"],
    },
    {
      id: "history",
      method: "getPriceHistory",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "code", "range", "interval"],
      output: ["points", "adjustment", "source", "asOf"],
    },
    {
      id: "tradingCalendar",
      method: "getTradingCalendar",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "from", "to"],
      output: ["sessions", "timezone", "source"],
    },
  ];
}

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMarket(value) {
  const market = String(value || "").trim().toLowerCase();
  return marketCurrencies[market] ? market : "";
}

function findFixtureStock(fixtureStocks, input = {}) {
  const code = normalizeCode(input.code || input.symbol || input.ticker);
  const market = normalizeMarket(input.market);
  if (!code) return null;
  return fixtureStocks.find((stock) => {
    const sameCode = normalizeCode(stock.code) === code;
    const sameMarket = !market || stock.market === market;
    return sameCode && sameMarket;
  });
}

function sourceFromStock(stock) {
  return {
    id: "local-fixture-market-data",
    label: stock.historySource?.label || "Mock 行情样例",
    licenseTag: "sample-fixture-not-real-time",
    attributionRequired: true,
  };
}

function asFixtureTimestamp(stock) {
  const updatedAt = stock.historySource?.updatedAt || "2026-06-01";
  return `${updatedAt}T00:00:00.000Z`;
}

function notFoundPayload(input = {}) {
  return {
    status: "not-found",
    error: {
      code: "MARKET_DATA_NOT_FOUND",
      message: "未找到对应股票的真实行情数据。",
    },
    query: {
      market: input.market || "",
      code: input.code || input.symbol || input.ticker || "",
    },
  };
}

function unavailableFixturePayload() {
  return {
    status: "unavailable",
    mode: "no-real-data",
    quote: null,
    points: [],
    reason: "没有可用真实行情；样例/fixture 回退已关闭。",
    disclaimer: "当前严格真实数据模式下不会返回本地样例行情。",
  };
}

function fixtureDisclaimer() {
  return "当前为本地样例行情读取，不代表实时、延迟或交易所授权行情，不可作为买卖依据。";
}

function createCachePolicy(config) {
  const liveMode = config.requestedMode === "live";
  return {
    id: "market-data-cache-policy",
    status:
      config.licenseConfirmed && config.rateLimitReady ? "ready-for-adapter" : "blocked",
    mode: config.requestedMode,
    quoteTtlSeconds: liveMode ? 15 : 900,
    historyTtlSeconds: liveMode ? 300 : 3600,
    maxStaleSeconds: liveMode ? 30 : 1800,
    cacheKeyFields: ["provider", "market", "code", "range", "interval"],
    storage: "memory-or-edge-cache-planned",
    rawRedistribution: config.licenseConfirmed ? "license-reviewed" : "blocked-until-license-review",
    noRawTickPersistence: true,
    disclaimer: "真实行情缓存必须遵守 provider 授权、展示、缓存和再分发边界。",
  };
}

function createRateLimitPolicy(config) {
  return {
    id: "market-data-rate-limit-policy",
    status: config.rateLimitReady ? "ready-for-adapter" : "blocked",
    provider: config.selectedProvider || "unselected",
    maxRequestsPerMinute: config.maxRequestsPerMinute,
    burstLimit: Math.max(1, Math.round(config.maxRequestsPerMinute / 4)),
    retryBackoffSeconds: [1, 2, 5],
    circuitBreaker: {
      failureThreshold: 5,
      coolDownSeconds: 60,
    },
    fallback: "keep-last-fixture-or-local-sample",
    disclaimer: "真实行情请求必须通过限流、重试、熔断和降级策略，避免超出 provider 授权或影响用户体验。",
  };
}

function createAttributionPolicy(config) {
  return {
    id: "market-data-attribution-policy",
    status:
      config.licenseConfirmed && config.attributionReady ? "ready-for-adapter" : "blocked",
    requiredFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
    displayRequired: true,
    blockIfMissing: true,
    timestampRequired: true,
    licenseTagRequired: true,
    disclaimer: "真实行情必须在 UI 和日志中保留来源、时间戳、延迟状态和授权标签。",
  };
}

function createEntitlementPolicy(config) {
  return {
    id: "market-data-entitlement-policy",
    status: config.entitlementsReady ? "ready" : "blocked",
    tiers: ["sample", "delayed", "live"],
    requiresUserEntitlement: true,
    requiresExchangeAgreement: true,
    blocksRedistributionWithoutLicense: true,
    forbiddenAuditFields: ["rawTick", "fullOrderBook", "providerApiKey", "exchangeUserAgreementText"],
    disclaimer: "真实行情必须按用户授权、交易所协议和 provider 许可区分 sample/delayed/live 权限。",
  };
}

function createDelayLabelPolicy(config) {
  return {
    id: "market-data-delay-label-policy",
    status: config.delayLabelsReady ? "ready" : "blocked",
    requiredLabels: ["sample-not-real-time", "delayed", "live"],
    displayNearPrice: true,
    displayNearChart: true,
    blocksLiveLabelWithoutEntitlement: true,
    defaultDelayMinutes: config.requestedMode === "live" ? 0 : 15,
    disclaimer: "行情价格和走势图必须在邻近位置显示 sample/delayed/live 状态和时间戳。",
  };
}

function readPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function createRequestPolicyGate(adapterStatus, input = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const requiredFields = adapterStatus.attributionPolicy.requiredFields || [];
  const missingAttributionFields = requiredFields.filter((field) => {
    const value = readPath(payload, field);
    return value === undefined || value === null || String(value).trim() === "";
  });
  const checks = [
    {
      id: "adapterStatus",
      status: adapterStatus.status === "ready-for-implementation" ? "pass" : "blocked",
      message:
        adapterStatus.status === "ready-for-implementation"
          ? "行情适配器配置、授权和策略门禁已通过。"
          : "行情适配器尚未通过配置、授权和策略门禁。",
    },
    {
      id: "runtimeMode",
      status: adapterStatus.runtimeMode === "inactive" ? "blocked" : "pass",
      message:
        adapterStatus.runtimeMode === "inactive"
          ? "真实 provider runtime 仍为 inactive，不能发起供应商请求。"
          : "真实 provider runtime 已启用。",
    },
    {
      id: "cachePolicy",
      status: adapterStatus.cachePolicy.status === "ready-for-adapter" ? "pass" : "blocked",
      message: "行情缓存策略必须通过授权、TTL 和再分发门禁。",
    },
    {
      id: "rateLimitPolicy",
      status: adapterStatus.rateLimitPolicy.status === "ready-for-adapter" ? "pass" : "blocked",
      message: "行情请求必须具备限流、重试、熔断和降级策略。",
    },
    {
      id: "attributionPolicy",
      status:
        adapterStatus.attributionPolicy.status === "ready-for-adapter" &&
        missingAttributionFields.length === 0
          ? "pass"
          : "blocked",
      message: missingAttributionFields.length
        ? `行情来源署名字段缺失：${missingAttributionFields.join(" / ")}。`
        : "行情来源署名字段完整。",
    },
    {
      id: "entitlementPolicy",
      status: adapterStatus.entitlementPolicy.status === "ready" ? "pass" : "blocked",
      message: "行情用户授权、交易所协议和再分发权限必须先确认。",
    },
    {
      id: "delayLabelPolicy",
      status: adapterStatus.delayLabelPolicy.status === "ready" ? "pass" : "blocked",
      message: "行情延迟/实时标签和时间戳展示规则必须先确认。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "market-data-request-policy-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-provider-request",
    requestKind: input.kind || "quote",
    requestedMode: adapterStatus.requestedMode,
    runtimeMode: adapterStatus.runtimeMode,
    selectedProvider: adapterStatus.selectedProvider || "",
    canUseProvider: blockedReasons.length === 0,
    canUseFixture: adapterStatus.canReadFixtures,
    fallback: adapterStatus.canReadFixtures ? "fixture-dev-only" : "empty-no-fixture",
    cacheKey: {
      provider: adapterStatus.selectedProvider || "mock",
      market: input.market || "",
      code: input.code || input.symbol || "",
      range: input.range || "",
      interval: input.interval || "",
    },
    requiredAttributionFields: requiredFields,
    missingAttributionFields,
    checks,
    blockedReasons,
    disclaimer:
      "真实行情请求必须先通过配置、缓存、限流、来源署名和 runtime 门禁；严格真实数据模式下未通过或 provider 失败时保持空白。",
  };
}

function createProviderPreflightPlan(adapterStatus, policyGate) {
  return {
    id: "market-data-provider-preflight-plan",
    mode: "dry-run-no-provider-request",
    status:
      policyGate.status === "ready-for-provider-request" &&
      adapterStatus.precheckPolicy.status === "ready"
        ? "ready-for-manual-smoke"
        : "blocked",
    canRequestProvider: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks: [
      ...policyGate.checks.map((check) => ({ id: check.id, status: check.status, required: true })),
      { id: "precheckPolicy", status: adapterStatus.precheckPolicy.status === "ready" ? "pass" : "blocked", required: true },
    ],
    requestEnvelope: {
      requiredFields: ["market", "code", "source.label", "source.licenseTag", "asOf", "dataDelay"],
      forbiddenFields: ["providerApiKey", "rawTick", "fullOrderBook", "tradingInstruction"],
      redactBeforeAudit: true,
    },
    rollback: {
      fallbackService: "empty-no-fixture",
      disableFlag: "FINANCE_AI_MARKET_DATA_RUNTIME=inactive",
      preserveLastGoodFixture: false,
    },
  };
}

function createFixturePolicyMetadata(adapterStatus, kind, payload = {}) {
  const policyGate = createRequestPolicyGate(adapterStatus, {
    kind,
    market: payload.market,
    code: payload.code,
    range: payload.range,
    interval: payload.interval,
    payload,
  });
  const executionPlan = createRequestExecutionPlan(adapterStatus, policyGate, {
    kind,
    mode: "fixture",
  });

  return {
    cache: {
      policyId: adapterStatus.cachePolicy.id,
      mode: "fixture-no-vendor-cache",
      ttlSeconds: kind === "history" ? adapterStatus.cachePolicy.historyTtlSeconds : adapterStatus.cachePolicy.quoteTtlSeconds,
      cacheable: true,
      disclaimer: "当前仅为本地 fixture 缓存语义，不代表真实 provider 缓存许可。",
    },
    attribution: {
      policyId: adapterStatus.attributionPolicy.id,
      requiredFields: adapterStatus.attributionPolicy.requiredFields,
      displayRequired: adapterStatus.attributionPolicy.displayRequired,
      disclaimer: "fixture 已保留来源、时间戳和授权标签；真实行情仍需 provider 授权确认。",
    },
    rateLimit: {
      policyId: adapterStatus.rateLimitPolicy.id,
      applied: false,
      reason: "fixture-no-vendor-network-call",
    },
    policyGate,
    executionPlan,
  };
}

function createRequestExecutionPlan(adapterStatus, policyGate, options = {}) {
  const kind = options.kind || policyGate.requestKind || "quote";
  const isHistory = kind === "history";
  const ttlSeconds = isHistory
    ? adapterStatus.cachePolicy.historyTtlSeconds
    : adapterStatus.cachePolicy.quoteTtlSeconds;
  const cacheKeyParts = [
    adapterStatus.selectedProvider || "mock",
    policyGate.cacheKey.market || "any-market",
    policyGate.cacheKey.code || "any-code",
    policyGate.cacheKey.range || (isHistory ? "6m" : "spot"),
    policyGate.cacheKey.interval || (isHistory ? "1mo" : "snapshot"),
  ];
  const rateLimitApplies = policyGate.canUseProvider === true;

  return {
    id: "market-data-request-execution-plan",
    status: policyGate.canUseProvider ? "ready-for-provider" : "empty-only",
    mode: options.mode || (policyGate.canUseProvider ? "provider-planned" : "empty-planned"),
    requestKind: kind,
    cache: {
      policyId: adapterStatus.cachePolicy.id,
      key: cacheKeyParts.join(":"),
      ttlSeconds,
      maxStaleSeconds: adapterStatus.cachePolicy.maxStaleSeconds,
      lookup: "planned-before-provider-request",
      write: policyGate.canUseProvider ? "planned-after-attributed-response" : "no-write-empty-response",
      outcome: policyGate.canUseProvider ? "miss-check-required" : "empty-no-fixture",
    },
    rateLimit: {
      policyId: adapterStatus.rateLimitPolicy.id,
      applies: rateLimitApplies,
      provider: adapterStatus.rateLimitPolicy.provider,
      maxRequestsPerMinute: adapterStatus.rateLimitPolicy.maxRequestsPerMinute,
      burstLimit: adapterStatus.rateLimitPolicy.burstLimit,
      tokenCost: rateLimitApplies ? 1 : 0,
      outcome: rateLimitApplies ? "would-consume-token" : "not-applied-for-empty-response",
    },
    fallback: {
      selected: policyGate.canUseProvider ? "provider-first" : "empty-no-fixture",
      reason: policyGate.blockedReasons[0] || "",
      localSampleAllowed: false,
    },
    auditDraft: {
      eventType: "marketData.request.policyGate",
      metadata: {
        requestKind: kind,
        provider: adapterStatus.selectedProvider || "mock",
        gateStatus: policyGate.status,
        cacheKey: cacheKeyParts.join(":"),
        fallback: policyGate.canUseProvider ? "provider-first" : "empty-no-fixture",
      },
    },
    disclaimer:
      "当前为请求执行计划和审计草案，不会请求真实 provider；生产接入时需由真实中间件执行缓存、限流、审计和降级。",
  };
}

function dateToYmd(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value, fallback) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return fallback;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function createTradingSessions({ market, from, to } = {}) {
  const normalizedMarket = normalizeMarket(market) || "a";
  const fallbackFrom = new Date("2026-06-01T00:00:00.000Z");
  const start = parseDateOnly(from, fallbackFrom);
  const requestedEnd = parseDateOnly(to, new Date(start.getTime() + 6 * 86_400_000));
  const maxEnd = new Date(start.getTime() + 31 * 86_400_000);
  const end = requestedEnd > maxEnd ? maxEnd : requestedEnd;
  const sessions = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    sessions.push({
      date: dateToYmd(cursor),
      isOpen: true,
      openTime: normalizedMarket === "us" ? "09:30" : "09:30",
      closeTime: normalizedMarket === "us" ? "16:00" : normalizedMarket === "hk" ? "16:00" : "15:00",
    });
  }

  return sessions;
}

function createMarketDataAdapterStatus(config, fixtureStocks = []) {
  const cachePolicy = createCachePolicy(config);
  const rateLimitPolicy = createRateLimitPolicy(config);
  const attributionPolicy = createAttributionPolicy(config);
  const entitlementPolicy = createEntitlementPolicy(config);
  const delayLabelPolicy = createDelayLabelPolicy(config);
  const precheckPolicy = {
    id: "market-data-precheck-policy",
    status: config.precheckReady ? "ready" : "blocked",
    checksProviderStatusPage: true,
    validatesSampleSymbols: true,
    requiresManualSmokeTest: true,
  };
  const alphaVantageConnector = createAlphaVantageConnectorPolicy(config);
  const alphaVantageSmokeTestPlan = createAlphaVantageSmokeTestPlan(alphaVantageConnector);
  const alphaVantageCredentialPreflight = createAlphaVantageCredentialPreflight(
    config,
    alphaVantageConnector,
  );
  const twelveDataConnector = createTwelveDataConnectorPolicy(config);
  const twelveDataSmokeTestPlan = createTwelveDataSmokeTestPlan(twelveDataConnector);
  const twelveDataCredentialPreflight = createTwelveDataCredentialPreflight(
    config,
    twelveDataConnector,
  );
  const yahooChartConnector = createYahooChartConnectorPolicy(config);
  const stooqConnector = createStooqConnectorPolicy(config);
  const tencentQuoteConnector = createTencentQuoteConnectorPolicy(config);
  const activeQuoteConnector = yahooChartConnector.canRequestProvider
    ? yahooChartConnector
    : stooqConnector.canRequestProvider
      ? stooqConnector
      : twelveDataConnector.canRequestProvider
        ? twelveDataConnector
        : alphaVantageConnector.canRequestProvider
          ? alphaVantageConnector
          : tencentQuoteConnector.canRequestProvider
            ? tencentQuoteConnector
            : null;
  const blockedReasons = [];
  if (!config.configured) {
    blockedReasons.push("行情 provider id 或 API key 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`行情 provider 未注册：${config.selectedProvider}。`);
  }
  if (!config.licenseConfirmed) {
    blockedReasons.push("尚未确认行情数据展示、缓存和再分发授权。");
  }
  if (!config.attributionReady) {
    blockedReasons.push("尚未完成行情来源署名和时间戳展示规则。");
  }
  if (!config.rateLimitReady) {
    blockedReasons.push("尚未配置行情 provider 限流、缓存和降级策略。");
  }
  if (cachePolicy.status !== "ready-for-adapter") {
    blockedReasons.push("行情缓存策略尚未通过授权和限流门禁。");
  }
  if (attributionPolicy.status !== "ready-for-adapter") {
    blockedReasons.push("行情来源署名策略尚未通过授权和展示门禁。");
  }
  if (entitlementPolicy.status !== "ready") {
    blockedReasons.push("行情用户授权、交易所协议或再分发权限尚未确认。");
  }
  if (delayLabelPolicy.status !== "ready") {
    blockedReasons.push("行情延迟/实时标签和邻近展示规则尚未确认。");
  }
  if (precheckPolicy.status !== "ready") {
    blockedReasons.push("行情 provider 状态页、样例 symbol 和人工 smoke test 预检尚未确认。");
  }

  const status = {
    id: "market-data-provider-adapter",
    name: "Market Data Provider Adapter Skeleton",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: activeQuoteConnector ? config.requestedMode : "inactive",
    requestedMode: config.requestedMode,
    selectedProvider: config.selectedProvider,
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    canFetchQuotes: Boolean(activeQuoteConnector),
    canReadFixtures: fixtureStocks.length > 0,
    fixtureReadModel: {
      status: fixtureStocks.length ? "available" : "unavailable",
      quoteCount: fixtureStocks.length,
      markets: [...new Set(fixtureStocks.map((stock) => stock.market).filter(Boolean))],
      source: "local-fixture-market-data",
    },
    missingEnvVars: [
      ...config.missingEnvVars,
      ...config.missingOperationalEnvVars,
    ],
    endpointContracts: createEndpointContracts(),
    cachePolicy,
    rateLimitPolicy,
    attributionPolicy,
    entitlementPolicy,
    delayLabelPolicy,
    precheckPolicy,
    alphaVantageConnector,
    alphaVantageSmokeTestPlan,
    alphaVantageCredentialPreflight,
    twelveDataConnector,
    twelveDataSmokeTestPlan,
    twelveDataCredentialPreflight,
    yahooChartConnector,
    stooqConnector,
    tencentQuoteConnector,
    safety: {
      noVendorNetworkCalls: !activeQuoteConnector,
      noTradingActions: true,
      requiresAttribution: true,
      requiresLicenseReview: true,
      requiresEntitlementCheck: true,
      requiresDelayLabel: true,
      requiresProviderPrecheck: true,
      mockFallbackActive: fixtureStocks.length > 0,
      alphaVantageNetworkAllowed: alphaVantageConnector.canRequestProvider,
      twelveDataNetworkAllowed: twelveDataConnector.canRequestProvider,
      yahooChartNetworkAllowed: yahooChartConnector.canRequestProvider,
      stooqNetworkAllowed: stooqConnector.canRequestProvider,
      tencentQuoteNetworkAllowed: tencentQuoteConnector.canRequestProvider,
    },
    blockedReasons,
    nextSteps: [
      "确认行情 provider 授权、缓存、展示和再分发边界。",
      "实现 getQuote、getPriceHistory、getTradingCalendar，并保留 source/asOf/licenseTag。",
      "把 cachePolicy、rateLimitPolicy、attributionPolicy 接入真实 provider 请求链路和审计记录。",
      "通过 smoke test 后才允许把 runtimeMode 从 inactive 切换为 delayed 或 live。",
    ],
    disclaimer:
      activeQuoteConnector?.providerId === "alpha-vantage"
        ? "当前已允许 Alpha Vantage quote 请求；仍必须显示来源、时间戳和延迟/实时标签，不代表所有市场已获得实时交易所授权。"
        : activeQuoteConnector?.providerId === "twelve-data"
          ? "当前已允许 Twelve Data quote 请求；第一阶段只启用美股 quote，仍必须显示来源、时间戳和延迟/实时标签。"
          : activeQuoteConnector?.providerId === "yahoo-chart"
            ? "当前已允许 Yahoo Finance Chart fallback 请求；它只用于本地 Demo 扩展覆盖，仍必须显示来源、时间戳和延迟/公开端点标签。"
            : activeQuoteConnector?.providerId === "stooq-csv"
              ? "当前已允许 Stooq CSV fallback 请求；它只用于免费美股报价和走势兜底，仍必须显示来源、时间戳和延迟/公开端点标签。"
              : "当前为行情 provider adapter 骨架。真实 provider 不会被请求；本地 fixture 仅用于接口联调，不代表实时或延迟行情已经接入。",
  };
  return {
    ...status,
    requestPolicyGate: createRequestPolicyGate(status, { kind: "status-preview" }),
    requestExecutionPlan: createRequestExecutionPlan(
      status,
      createRequestPolicyGate(status, { kind: "status-preview" }),
      { kind: "status-preview", mode: "status-preview" },
    ),
    providerPreflightPlan: createProviderPreflightPlan(
      status,
      createRequestPolicyGate(status, { kind: "status-preview" }),
    ),
  };
}

export function createMarketDataProviderAdapter({ env = process.env, fixtureStocks = [], fetchImpl = globalThis.fetch } = {}) {
  const config = readMarketDataConfig(env);
  const adapterStatus = createMarketDataAdapterStatus(config, fixtureStocks);

  return {
    id: adapterStatus.id,
    status() {
      return adapterStatus;
    },
    policyCheck(input = {}) {
      const stock = findFixtureStock(fixtureStocks, input);
      const source = stock ? sourceFromStock(stock) : {};
      return {
        status: "ok",
        mode: "policy-check",
        market: input.market || stock?.market || "",
        code: input.code || input.symbol || stock?.code || "",
        policyGate: createRequestPolicyGate(adapterStatus, {
          kind: input.kind || "quote",
          market: input.market || stock?.market || "",
          code: input.code || input.symbol || stock?.code || "",
          range: input.range || "",
          interval: input.interval || "",
          payload: {
            source,
            asOf: stock ? asFixtureTimestamp(stock) : "",
            dataDelay: stock ? "sample-not-real-time" : "",
          },
        }),
        executionPlan: createRequestExecutionPlan(
          adapterStatus,
          createRequestPolicyGate(adapterStatus, {
            kind: input.kind || "quote",
            market: input.market || stock?.market || "",
            code: input.code || input.symbol || stock?.code || "",
            range: input.range || "",
            interval: input.interval || "",
            payload: {
              source,
              asOf: stock ? asFixtureTimestamp(stock) : "",
              dataDelay: stock ? "sample-not-real-time" : "",
            },
          }),
          { kind: input.kind || "quote", mode: "policy-check" },
        ),
        disclaimer:
          "当前仅执行行情请求门禁检查，不会请求真实 provider，也不会执行交易。",
      };
    },
    async getQuote(input = {}) {
      if (config.selectedProvider === "multi-free") {
        const relayAttempts = [];
        if (adapterStatus.yahooChartConnector?.canRequestProvider) {
          const yahooPayload = await fetchYahooChartQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "yahoo-chart",
            status: yahooPayload.status,
            errorCode: yahooPayload.error?.code || "",
          });
          if (yahooPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: yahooPayload.quote.source,
                asOf: yahooPayload.quote.asOf,
                dataDelay: yahooPayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: yahooPayload.quote,
              provider: {
                ...yahooPayload.provider,
                relay: relayAttempts,
              },
              disclaimer: yahooPayload.disclaimer,
            };
          }
        }
        if (adapterStatus.stooqConnector?.canRequestProvider) {
          const stooqPayload = await fetchStooqQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "stooq-csv",
            status: stooqPayload.status,
            errorCode: stooqPayload.error?.code || "",
          });
          if (stooqPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: stooqPayload.quote.source,
                asOf: stooqPayload.quote.asOf,
                dataDelay: stooqPayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: stooqPayload.quote,
              provider: {
                ...stooqPayload.provider,
                relay: relayAttempts,
              },
              disclaimer: stooqPayload.disclaimer,
            };
          }
        }
        if (adapterStatus.twelveDataConnector?.canRequestProvider) {
          const twelvePayload = await fetchTwelveDataQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "twelve-data",
            status: twelvePayload.status,
            errorCode: twelvePayload.error?.code || "",
          });
          if (twelvePayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: twelvePayload.quote.source,
                asOf: twelvePayload.quote.asOf,
                dataDelay: twelvePayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: twelvePayload.quote,
              provider: {
                ...twelvePayload.provider,
                relay: relayAttempts,
              },
              disclaimer: twelvePayload.disclaimer,
            };
          }
        }
        if (adapterStatus.alphaVantageConnector?.canRequestProvider) {
          const alphaPayload = await fetchAlphaVantageQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "alpha-vantage",
            status: alphaPayload.status,
            errorCode: alphaPayload.error?.code || "",
          });
          if (alphaPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: alphaPayload.quote.source,
                asOf: alphaPayload.quote.asOf,
                dataDelay: alphaPayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: alphaPayload.quote,
              provider: {
                ...alphaPayload.provider,
                relay: relayAttempts,
              },
              disclaimer: alphaPayload.disclaimer,
            };
          }
        }
        if (
          adapterStatus.yahooChartConnector?.canRequestProvider &&
          !relayAttempts.some((attempt) => attempt.providerId === "yahoo-chart")
        ) {
          const yahooPayload = await fetchYahooChartQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "yahoo-chart",
            status: yahooPayload.status,
            errorCode: yahooPayload.error?.code || "",
          });
          if (yahooPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: yahooPayload.quote.source,
                asOf: yahooPayload.quote.asOf,
                dataDelay: yahooPayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: yahooPayload.quote,
              provider: {
                ...yahooPayload.provider,
                relay: relayAttempts,
              },
              disclaimer: yahooPayload.disclaimer,
            };
          }
        }
        if (adapterStatus.tencentQuoteConnector?.canRequestProvider) {
          const tencentPayload = await fetchTencentQuote({ config, input, fetchImpl });
          relayAttempts.push({
            providerId: "tencent-quote",
            status: tencentPayload.status,
            errorCode: tencentPayload.error?.code || "",
          });
          if (tencentPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "quote",
              market: input.market,
              code: input.code || input.symbol,
              payload: {
                source: tencentPayload.quote.source,
                asOf: tencentPayload.quote.asOf,
                dataDelay: tencentPayload.quote.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "quote",
                mode: "real-provider-relay",
              }),
              quote: tencentPayload.quote,
              provider: {
                ...tencentPayload.provider,
                relay: relayAttempts,
              },
              disclaimer: tencentPayload.disclaimer,
            };
          }
        }
        return {
          status: "unavailable",
          mode: "real-provider-relay",
          error: {
            code: "MARKET_DATA_RELAY_EXHAUSTED",
            message: "免费 API 接力源均未返回可用真实行情。",
          },
          relay: relayAttempts,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "Yahoo Chart / Stooq CSV / Twelve Data / Alpha Vantage / Tencent Quote 接力均失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      if (adapterStatus.alphaVantageConnector?.canRequestProvider) {
        const providerPayload = await fetchAlphaVantageQuote({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "quote",
            market: input.market,
            code: input.code || input.symbol,
            payload: {
              source: providerPayload.quote.source,
              asOf: providerPayload.quote.asOf,
              dataDelay: providerPayload.quote.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "quote",
              mode: "real-provider",
            }),
            quote: providerPayload.quote,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        return {
          ...providerPayload,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "真实行情请求失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      if (adapterStatus.twelveDataConnector?.canRequestProvider) {
        const providerPayload = await fetchTwelveDataQuote({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "quote",
            market: input.market,
            code: input.code || input.symbol,
            payload: {
              source: providerPayload.quote.source,
              asOf: providerPayload.quote.asOf,
              dataDelay: providerPayload.quote.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "quote",
              mode: "real-provider",
            }),
            quote: providerPayload.quote,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        return {
          ...providerPayload,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "真实行情请求失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      if (adapterStatus.yahooChartConnector?.canRequestProvider) {
        const providerPayload = await fetchYahooChartQuote({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "quote",
            market: input.market,
            code: input.code || input.symbol,
            payload: {
              source: providerPayload.quote.source,
              asOf: providerPayload.quote.asOf,
              dataDelay: providerPayload.quote.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "quote",
              mode: "real-provider",
            }),
            quote: providerPayload.quote,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        return {
          ...providerPayload,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "真实行情请求失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      if (adapterStatus.stooqConnector?.canRequestProvider) {
        const providerPayload = await fetchStooqQuote({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "quote",
            market: input.market,
            code: input.code || input.symbol,
            payload: {
              source: providerPayload.quote.source,
              asOf: providerPayload.quote.asOf,
              dataDelay: providerPayload.quote.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "quote",
              mode: "real-provider",
            }),
            quote: providerPayload.quote,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        return {
          ...providerPayload,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "真实行情请求失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      if (adapterStatus.tencentQuoteConnector?.canRequestProvider) {
        const providerPayload = await fetchTencentQuote({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "quote",
            market: input.market,
            code: input.code || input.symbol,
            payload: {
              source: providerPayload.quote.source,
              asOf: providerPayload.quote.asOf,
              dataDelay: providerPayload.quote.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "quote",
              mode: "real-provider",
            }),
            quote: providerPayload.quote,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        return {
          ...providerPayload,
          fallback: "empty",
          fixture: null,
          disclaimer:
            "真实行情请求失败；样例/fixture 回退已关闭，因此本次不返回行情数据。",
        };
      }
      return this.getFixtureQuote(input);
    },
    getFixtureQuote(input = {}) {
      if (!fixtureStocks.length) return unavailableFixturePayload();
      const stock = findFixtureStock(fixtureStocks, input);
      if (!stock) return notFoundPayload(input);
      const source = sourceFromStock(stock);
      const asOf = asFixtureTimestamp(stock);
      return {
        status: "ok",
        mode: "fixture",
        ...createFixturePolicyMetadata(adapterStatus, "quote", {
          market: stock.market,
          code: stock.code,
          source,
          asOf,
          dataDelay: "sample-not-real-time",
        }),
        quote: {
          market: stock.market,
          code: stock.code,
          name: stock.name,
          lastPrice: stock.samplePrice,
          currency: marketCurrencies[stock.market] || "UNKNOWN",
          asOf,
          source,
          dataDelay: "sample-not-real-time",
        },
        disclaimer: fixtureDisclaimer(),
      };
    },
    async getPriceHistory(input = {}) {
      if (adapterStatus.yahooChartConnector?.canRequestProvider) {
        const providerPayload = await fetchYahooChartHistory({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "history",
            market: input.market,
            code: input.code || input.symbol,
            range: input.range || providerPayload.range,
            interval: input.interval || providerPayload.interval,
            payload: {
              source: providerPayload.source,
              asOf: providerPayload.asOf,
              dataDelay: providerPayload.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "history",
              mode: "real-provider",
            }),
            market: providerPayload.market,
            code: providerPayload.code,
            providerSymbol: providerPayload.providerSymbol,
            range: providerPayload.range,
            interval: providerPayload.interval,
            currency: providerPayload.currency,
            asOf: providerPayload.asOf,
            points: providerPayload.points,
            source: providerPayload.source,
            provider: providerPayload.provider,
            fallbackFromInterval: providerPayload.fallbackFromInterval,
            fallbackReason: providerPayload.fallbackReason,
            disclaimer: providerPayload.disclaimer,
          };
        }
        if (adapterStatus.stooqConnector?.canRequestProvider) {
          const stooqPayload = await fetchStooqHistory({ config, input, fetchImpl });
          if (stooqPayload.status === "ok") {
            const policyGate = createRequestPolicyGate(adapterStatus, {
              kind: "history",
              market: input.market,
              code: input.code || input.symbol,
              range: input.range || stooqPayload.range,
              interval: input.interval || stooqPayload.interval,
              payload: {
                source: stooqPayload.source,
                asOf: stooqPayload.asOf,
                dataDelay: stooqPayload.dataDelay,
              },
            });
            return {
              status: "ok",
              mode: "real-provider-relay",
              policyGate,
              executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
                kind: "history",
                mode: "real-provider-relay",
              }),
              market: stooqPayload.market,
              code: stooqPayload.code,
              providerSymbol: stooqPayload.providerSymbol,
              range: stooqPayload.range,
              interval: stooqPayload.interval,
              currency: stooqPayload.currency,
              asOf: stooqPayload.asOf,
              points: stooqPayload.points,
              source: stooqPayload.source,
              provider: {
                ...stooqPayload.provider,
                fallbackFrom: providerPayload.error?.code || "yahoo-chart",
              },
              disclaimer: stooqPayload.disclaimer,
            };
          }
        }
        if (!fixtureStocks.length) {
          return {
            ...providerPayload,
            fallback: "empty",
            fixture: null,
            points: [],
            disclaimer:
              "真实历史走势请求失败；样例/fixture 回退已关闭，因此本次不返回走势图数据。",
          };
        }
      }
      if (adapterStatus.stooqConnector?.canRequestProvider) {
        const providerPayload = await fetchStooqHistory({ config, input, fetchImpl });
        if (providerPayload.status === "ok") {
          const policyGate = createRequestPolicyGate(adapterStatus, {
            kind: "history",
            market: input.market,
            code: input.code || input.symbol,
            range: input.range || providerPayload.range,
            interval: input.interval || providerPayload.interval,
            payload: {
              source: providerPayload.source,
              asOf: providerPayload.asOf,
              dataDelay: providerPayload.dataDelay,
            },
          });
          return {
            status: "ok",
            mode: "real-provider",
            policyGate,
            executionPlan: createRequestExecutionPlan(adapterStatus, policyGate, {
              kind: "history",
              mode: "real-provider",
            }),
            market: providerPayload.market,
            code: providerPayload.code,
            providerSymbol: providerPayload.providerSymbol,
            range: providerPayload.range,
            interval: providerPayload.interval,
            currency: providerPayload.currency,
            asOf: providerPayload.asOf,
            points: providerPayload.points,
            source: providerPayload.source,
            provider: providerPayload.provider,
            disclaimer: providerPayload.disclaimer,
          };
        }
        if (!fixtureStocks.length) {
          return {
            ...providerPayload,
            fallback: "empty",
            fixture: null,
            points: [],
            disclaimer:
              "真实历史走势请求失败；样例/fixture 回退已关闭，因此本次不返回走势图数据。",
          };
        }
      }
      if (!fixtureStocks.length) return unavailableFixturePayload();
      const stock = findFixtureStock(fixtureStocks, input);
      if (!stock) return notFoundPayload(input);
      const source = sourceFromStock(stock);
      const asOf = asFixtureTimestamp(stock);
      return {
        status: "ok",
        mode: "fixture",
        market: stock.market,
        code: stock.code,
        name: stock.name,
        range: input.range || "6m",
        interval: input.interval || "1mo",
        currency: marketCurrencies[stock.market] || "UNKNOWN",
        asOf,
        points: (stock.history || []).map((point, index) => ({
          label: point.label,
          close: point.price,
          sequence: index + 1,
        })),
        source,
        ...createFixturePolicyMetadata(adapterStatus, "history", {
          market: stock.market,
          code: stock.code,
          range: input.range || "6m",
          interval: input.interval || "1mo",
          source,
          asOf,
          dataDelay: "sample-not-real-time",
        }),
        disclaimer: fixtureDisclaimer(),
      };
    },
    getTradingCalendar(input = {}) {
      if (!fixtureStocks.length) return unavailableFixturePayload();
      const market = normalizeMarket(input.market) || "a";
      const source = {
        id: "local-fixture-trading-calendar",
        label: "Mock 交易日历样例",
        licenseTag: "sample-fixture-not-real-calendar",
        attributionRequired: true,
      };
      const asOf = "2026-06-01T00:00:00.000Z";
      return {
        status: "ok",
        mode: "fixture",
        market,
        timezone: marketTimezones[market],
        sessions: createTradingSessions({ ...input, market }),
        asOf,
        dataDelay: "sample-not-real-calendar",
        source,
        ...createFixturePolicyMetadata(adapterStatus, "calendar", {
          market,
          source,
          asOf,
          dataDelay: "sample-not-real-calendar",
        }),
        disclaimer: fixtureDisclaimer(),
      };
    },
  };
}
