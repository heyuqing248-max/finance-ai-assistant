const requiredNewsEnvVars = ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"];
const optionalFilingsEnvVars = [
  "FINANCE_AI_FILINGS_PROVIDER",
  "FINANCE_AI_FILINGS_ALLOW_NETWORK",
  "FINANCE_AI_SEC_USER_AGENT",
];
const optionalStatementEnvVars = ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"];
const requiredOperationalEnvVars = [
  "FINANCE_AI_NEWS_SOURCE_VERIFICATION_READY",
  "FINANCE_AI_NEWS_REDISTRIBUTION_READY",
  "FINANCE_AI_NEWS_INGESTION_PRECHECK_READY",
];
const statementOperationalEnvVars = [
  "FINANCE_AI_STATEMENT_IDENTITY_READY",
  "FINANCE_AI_STATEMENT_PLATFORM_TERMS_READY",
  "FINANCE_AI_STATEMENT_REVIEW_QUEUE_READY",
];
const supportedNewsProviderIds = [
  "licensed-news-filings",
  "alpha-vantage-news",
  "yahoo-finance-rss",
  "google-news-rss",
  "gdelt-doc-news",
  "multi-free-news",
];
const supportedFilingsProviderIds = [
  "sec-company-submissions",
  "sse-company-bulletins",
  "hkex-company-announcements",
  "multi-free-filings",
];
const supportedStatementProviderIds = ["verified-public-statements"];
const alphaVantageNewsBaseUrl = "https://www.alphavantage.co/query";
const yahooFinanceRssBaseUrl = "https://feeds.finance.yahoo.com/rss/2.0/headline";
const googleNewsRssBaseUrl = "https://news.google.com/rss/search";
const gdeltDocBaseUrl = "https://api.gdeltproject.org/api/v2/doc/doc";
const secSubmissionsBaseUrl = "https://data.sec.gov/submissions";
const sseCompanyBulletinsBaseUrl = "https://query.sse.com.cn/security/stock/queryCompanyBulletin.do";
const hkexCompanyAnnouncementsBaseUrl = "https://www1.hkexnews.hk/search/titleSearchServlet.do";
const hkexStockSearchPrefixBaseUrl = "https://www1.hkexnews.hk/search/prefix.do";

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

const secTickerCikMap = {
  aapl: "0000320193",
  amzn: "0001018724",
  goog: "0001652044",
  googl: "0001652044",
  ibm: "0000051143",
  meta: "0001326801",
  msft: "0000789019",
  nvda: "0001045810",
  tsla: "0001318605",
};

const hkexStockIdMap = {
  "0700": "7609",
  "00700": "7609",
};

const sourceCredibilityScores = {
  "Yahoo Finance RSS": 82,
  "GDELT Project": 78,
  "公司公告": 90,
  "宏观政策": 88,
  "Mock 公告样例": 84,
  "Mock 披露样例": 82,
  "CEO / 公司动态": 78,
  "市场资金": 74,
  "Mock 公开言论样例": 72,
  default: 62,
};

const officialFilingCredibilityScores = {
  "SEC EDGAR": 96,
  "上海证券交易所公告": 95,
  "HKEXnews": 94,
  "HKEX 公告": 94,
  "香港交易所公告": 94,
  "公司公告": 90,
};

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function configuredEnvVars(env = {}, names = []) {
  return names.filter((name) => hasEnvValue(env, name));
}

function missingEnvVars(env = {}, names = []) {
  return names.filter((name) => !hasEnvValue(env, name));
}

function normalizeMarket(value) {
  const market = String(value || "").trim().toLowerCase();
  return ["a", "hk", "us"].includes(market) ? market : "";
}

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function readConfig(env = {}) {
  const selectedNewsProvider = hasEnvValue(env, "FINANCE_AI_NEWS_PROVIDER")
    ? env.FINANCE_AI_NEWS_PROVIDER.trim()
    : "";
  const selectedStatementProvider = hasEnvValue(env, "FINANCE_AI_STATEMENT_PROVIDER")
    ? env.FINANCE_AI_STATEMENT_PROVIDER.trim()
    : "";
  const selectedFilingsProvider = hasEnvValue(env, "FINANCE_AI_FILINGS_PROVIDER")
    ? env.FINANCE_AI_FILINGS_PROVIDER.trim()
    : "";
  const newsMissing = missingEnvVars(env, requiredNewsEnvVars);
  const newsKeyRequired = !["yahoo-finance-rss", "google-news-rss", "gdelt-doc-news", "multi-free-news"].includes(selectedNewsProvider);
  const effectiveNewsMissing = newsKeyRequired
    ? newsMissing
    : missingEnvVars(env, ["FINANCE_AI_NEWS_PROVIDER"]);
  const statementMissing = missingEnvVars(env, optionalStatementEnvVars);
  const statementConfigured = configuredEnvVars(env, optionalStatementEnvVars).length > 0;
  const filingsProviderSelected = Boolean(selectedFilingsProvider);
  const filingsMissing = filingsProviderSelected
    ? optionalFilingsEnvVars.filter((name) => !hasEnvValue(env, name))
    : [];
  const operationalMissing = missingEnvVars(env, requiredOperationalEnvVars);
  const statementOperationalMissing = missingEnvVars(env, statementOperationalEnvVars);

  return {
    selectedNewsProvider,
    selectedFilingsProvider,
    selectedStatementProvider,
    rawEnv: env,
    apiKey: hasEnvValue(env, "FINANCE_AI_NEWS_API_KEY") ? env.FINANCE_AI_NEWS_API_KEY.trim() : "",
    networkEnabled: env.FINANCE_AI_NEWS_ALLOW_NETWORK === "true",
    gdeltNetworkEnabled:
      env.FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK === "true" ||
      env.FINANCE_AI_NEWS_ALLOW_NETWORK === "true",
    yahooFinanceRssNetworkEnabled:
      env.FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK === "true" ||
      env.FINANCE_AI_NEWS_ALLOW_NETWORK === "true",
    googleNewsRssNetworkEnabled:
      env.FINANCE_AI_GOOGLE_NEWS_ALLOW_NETWORK === "true" ||
      env.FINANCE_AI_NEWS_ALLOW_NETWORK === "true",
    filingsNetworkEnabled: env.FINANCE_AI_FILINGS_ALLOW_NETWORK === "true",
    secUserAgent: hasEnvValue(env, "FINANCE_AI_SEC_USER_AGENT")
      ? env.FINANCE_AI_SEC_USER_AGENT.trim()
      : "",
    requestTimeoutMs: Math.max(1_000, Number(env.FINANCE_AI_NEWS_TIMEOUT_MS) || 8_000),
    newsLimit: Math.max(1, Math.min(50, Number(env.FINANCE_AI_NEWS_LIMIT) || 10)),
    filingsLimit: Math.max(1, Math.min(80, Number(env.FINANCE_AI_FILINGS_LIMIT) || 20)),
    newsConfigured: effectiveNewsMissing.length === 0,
    filingsConfigured:
      ["sec-company-submissions", "sse-company-bulletins", "hkex-company-announcements", "multi-free-filings"].includes(
        selectedFilingsProvider,
      ) && env.FINANCE_AI_FILINGS_ALLOW_NETWORK === "true" &&
      (selectedFilingsProvider === "sec-company-submissions" || selectedFilingsProvider === "multi-free-filings"
        ? hasEnvValue(env, "FINANCE_AI_SEC_USER_AGENT")
        : true),
    statementConfigured: statementMissing.length === 0,
    statementPartiallyConfigured: statementConfigured && statementMissing.length > 0,
    newsSupported:
      !selectedNewsProvider || supportedNewsProviderIds.includes(selectedNewsProvider),
    filingsSupported:
      !selectedFilingsProvider || supportedFilingsProviderIds.includes(selectedFilingsProvider),
    statementSupported:
      !selectedStatementProvider ||
      supportedStatementProviderIds.includes(selectedStatementProvider),
    missingEnvVars: [
      ...effectiveNewsMissing,
      ...filingsMissing,
      ...(statementConfigured ? statementMissing : []),
      ...operationalMissing,
      ...(statementConfigured ? statementOperationalMissing : []),
    ],
    licenseConfirmed: env.FINANCE_AI_DATA_LICENSE_CONFIRMED === "true",
    attributionReady: env.FINANCE_AI_SOURCE_ATTRIBUTION_READY === "true",
    rateLimitReady: env.FINANCE_AI_DATA_RATE_LIMIT_PLAN === "true",
    sourceVerificationReady: env.FINANCE_AI_NEWS_SOURCE_VERIFICATION_READY === "true",
    redistributionReady: env.FINANCE_AI_NEWS_REDISTRIBUTION_READY === "true",
    ingestionPrecheckReady: env.FINANCE_AI_NEWS_INGESTION_PRECHECK_READY === "true",
    statementIdentityReady: env.FINANCE_AI_STATEMENT_IDENTITY_READY === "true",
    statementPlatformTermsReady: env.FINANCE_AI_STATEMENT_PLATFORM_TERMS_READY === "true",
    statementReviewQueueReady: env.FINANCE_AI_STATEMENT_REVIEW_QUEUE_READY === "true",
  };
}

function mapAlphaVantageNewsTicker({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  const raw = String(ticker || symbol || code || "").trim();
  if (!raw) return "";
  if (normalizedMarket === "us") return raw.toUpperCase();
  return "";
}

const gdeltCompanyQueryMap = {
  "600519": "Kweichow Moutai OR 贵州茅台",
  "0700": "Tencent Holdings OR 腾讯控股",
  "700": "Tencent Holdings OR 腾讯控股",
  aapl: "Apple",
  amzn: "Amazon",
  goog: "Google",
  googl: "Google",
  ibm: "IBM",
  meta: "Meta",
  msft: "Microsoft",
  nvda: "NVIDIA",
  tsla: "Tesla",
};

const companyNewsAliasMap = {
  "600519": ["kweichow moutai", "moutai", "贵州茅台"],
  "600519.ss": ["kweichow moutai", "moutai", "贵州茅台"],
  "0700": ["tencent", "tencent holdings", "腾讯", "腾讯控股"],
  "0700.hk": ["tencent", "tencent holdings", "腾讯", "腾讯控股"],
  "700": ["tencent", "tencent holdings", "腾讯", "腾讯控股"],
  aapl: ["apple"],
  amzn: ["amazon"],
  goog: ["google", "alphabet"],
  googl: ["google", "alphabet"],
  ibm: ["ibm"],
  meta: ["meta", "facebook"],
  msft: ["microsoft", "msft", "azure", "openai", "copilot", "windows", "linkedin", "github", "xbox"],
  nvda: ["nvidia", "nvda"],
  tsla: ["tesla", "tsla"],
};

function getCompanyNewsAliases(input = {}) {
  const raw = String(input.ticker || input.symbol || input.code || "").trim().toLowerCase();
  if (!raw) return [];
  const compact = raw.replace(/\.(ss|sz|hk|sh)$/i, "");
  const aliases = companyNewsAliasMap[raw] || companyNewsAliasMap[compact] || [];
  return aliases.map((alias) => String(alias || "").trim().toLowerCase()).filter(Boolean);
}

function inferCompanyNewsRelevance(item = {}, input = {}) {
  const aliases = getCompanyNewsAliases(input);
  const haystack = [item.title, item.summary, item.sourceUrl, item.source?.label]
    .join(" ")
    .toLowerCase();
  const matchedAlias = aliases.find((alias) => haystack.includes(alias));
  return {
    direct: Boolean(matchedAlias),
    matchedAlias: matchedAlias || "",
    level: matchedAlias ? "company-direct" : "unmatched",
    reason: matchedAlias
      ? `标题、摘要、来源或链接命中 ${matchedAlias}。`
      : "标题、摘要、来源和链接未命中公司名、ticker 或产品别名。",
  };
}

function withCompanyNewsRelevance(item = {}, input = {}) {
  const relevance = inferCompanyNewsRelevance(item, input);
  return {
    ...item,
    providerRelevance: relevance,
    importance: relevance.direct ? item.importance : Math.min(Number(item.importance) || 0, 45),
  };
}

function filterItemsByCompanyRelevance(items = [], input = {}) {
  const aliases = getCompanyNewsAliases(input);
  if (!aliases.length) return items.map((item) => withCompanyNewsRelevance(item, input));
  return items
    .map((item) => withCompanyNewsRelevance(item, input))
    .filter((item) => item.providerRelevance?.direct);
}

function mapGdeltNewsQuery({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  const raw = String(ticker || symbol || code || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\.(SS|SZ|HK)$/i, "");
  const company = gdeltCompanyQueryMap[compact.toLowerCase()] || raw.toUpperCase();
  if (normalizedMarket === "a") return `(${company}) stock`;
  if (normalizedMarket === "hk") return `(${company}) stock Hong Kong`;
  return `${company} stock`;
}

function mapYahooFinanceSymbol({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  const raw = String(ticker || symbol || code || "").trim();
  if (!raw) return "";
  if (normalizedMarket === "hk") return raw.includes(".") ? raw.toUpperCase() : `${raw.padStart(4, "0")}.HK`;
  if (normalizedMarket === "a") {
    if (raw.includes(".")) return raw.replace(/\.(SS|SZ|SH)$/i, "").toUpperCase();
    if (/^(0|3|6)\d{5}$/.test(raw)) return raw.toUpperCase();
    return "";
  }
  return raw.toUpperCase();
}

function mapGoogleNewsQuery(input = {}) {
  const aliases = getCompanyNewsAliases(input);
  if (aliases.length) return `${aliases[0]} stock`;
  return mapGdeltNewsQuery(input);
}

function mapSseCompanyCode({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  if (normalizedMarket !== "a") return "";
  const raw = String(ticker || symbol || code || "").trim().replace(/\.(SS|SH)$/i, "");
  return /^6\d{5}$/.test(raw) ? raw : "";
}

function mapHkexCompanyCode({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  if (normalizedMarket !== "hk") return "";
  const raw = String(ticker || symbol || code || "")
    .trim()
    .replace(/\.HK$/i, "")
    .replace(/\D/g, "");
  if (!raw) return "";
  if (raw.length > 5) return "";
  return raw.padStart(5, "0");
}

function mapHkexStockId(input = {}) {
  const code = mapHkexCompanyCode(input);
  if (!code) return "";
  return hkexStockIdMap[code] || hkexStockIdMap[code.replace(/^0+/, "")] || "";
}

function parseHkexStockCodes(value) {
  return decodeXmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .split(/[\s,;/|]+/)
    .map((code) => code.trim().replace(/\D/g, ""))
    .filter(Boolean)
    .map((code) => code.padStart(5, "0"));
}

function cleanHkexText(value) {
  return decodeXmlEntities(value)
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAlphaVantageNewsTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
  if (!match) return "";
  const [, year, month, day, hour, minute, second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function readXmlTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(block || "").match(pattern);
  return match ? decodeXmlEntities(match[1]).trim() : "";
}

function parseRssPubDate(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function parseGdeltSeenDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(?:T?(\d{2})(\d{2})(\d{2})?)?$/);
  if (!match) return "";
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function parseHkexDateTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return "";
  const [, day, month, year, hour = "00", minute = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00.000+08:00`;
}

function parseJsonpPayload(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^[\w$.]+\(([\s\S]*)\);?$/);
  const jsonText = match ? match[1] : raw;
  return JSON.parse(jsonText);
}

export function parseHkexStockSearchJsonp(text, input = {}) {
  const expectedCode = mapHkexCompanyCode(input);
  let payload = null;
  try {
    payload = parseJsonpPayload(text);
  } catch {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_STOCK_SEARCH_PARSE_FAILED",
        message: "HKEXnews 股票检索返回内容无法解析。",
      },
    };
  }
  const rows = Array.isArray(payload?.stockInfo) ? payload.stockInfo : [];
  const match = rows.find((row) => String(row.code || "").trim().padStart(5, "0") === expectedCode);
  if (!match?.stockId) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_STOCK_SEARCH_EMPTY",
        message: `HKEXnews 股票检索未找到港股代码 ${expectedCode || ""}。`,
      },
    };
  }
  return {
    status: "ok",
    stockId: String(match.stockId),
    code: String(match.code || expectedCode).padStart(5, "0"),
    name: String(match.name || "").trim(),
    provider: {
      id: "hkex-stock-search-prefix",
      endpoint: "prefix",
      requestUrlRedacted: `${hkexStockSearchPrefixBaseUrl}?lang=EN&type=A&name=${encodeURIComponent(expectedCode)}&market=SEHK`,
    },
  };
}

function createAlphaVantageNewsConnectorPolicy(config) {
  const isSelected =
    config.selectedNewsProvider === "alpha-vantage-news" ||
    config.selectedNewsProvider === "multi-free-news";
  return {
    id: "alpha-vantage-news-sentiment-connector",
    status: isSelected && config.newsConfigured ? "configured" : "defined",
    providerId: "alpha-vantage-news",
    functionName: "NEWS_SENTIMENT",
    officialEndpoint: alphaVantageNewsBaseUrl,
    supportedMarkets: ["us"],
    plannedMarkets: ["a", "hk"],
    requiresApiKey: true,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.networkEnabled,
    canRequestProvider: isSelected && config.newsConfigured && Boolean(config.apiKey) && config.networkEnabled,
    requestLimit: config.newsLimit,
    forbiddenAuditFields: ["apiKey", "providerResponseRaw", "rawArticleBody"],
    requiredAttributionFields: ["title", "source.label", "sourceUrl", "publishedAt", "sentiment.label"],
    disclaimer:
      "Alpha Vantage NEWS_SENTIMENT 用于第一阶段真实美股新闻和情绪联调；A 股/港股覆盖、授权、缓存、短摘录和再分发边界仍需单独确认。",
  };
}

function createAlphaVantageNewsSmokeTestPlan(connectorPolicy) {
  return {
    id: "alpha-vantage-news-demo-smoke-test-plan",
    status: "defined",
    mode: "real-provider-demo-news-smoke",
    demoTicker: "AAPL",
    expectedFields: ["feed", "title", "url", "time_published", "overall_sentiment_score"],
    canUseDemoEndpoint: true,
    canUseProductionKey: connectorPolicy.canRequestProvider,
    blocksIfMissingAttribution: true,
    forbiddenAuditFields: ["providerResponseRaw", "apiKey", "rawArticleBody"],
  };
}

function createAlphaVantageNewsCredentialPreflight(config, connectorPolicy) {
  const apiKeyStatus = !config.apiKey
    ? "missing"
    : config.apiKey.toLowerCase() === "demo"
      ? "demo-key-limited"
      : "configured-redacted";
  const networkStatus = config.networkEnabled ? "enabled" : "disabled";
  const missingRequiredEnvVars = missingEnvVars(config.rawEnv || {}, requiredNewsEnvVars);

  return {
    id: "alpha-vantage-news-credential-preflight",
    status: connectorPolicy.canRequestProvider
      ? apiKeyStatus === "demo-key-limited"
        ? "demo-key-limited"
        : "ready-for-provider-smoke"
      : "blocked",
    mode: "no-secret-credential-preflight",
    providerId: "alpha-vantage-news",
    functionName: "NEWS_SENTIMENT",
    apiKeyStatus,
    networkStatus,
    requiredEnvVars: [
      "FINANCE_AI_NEWS_PROVIDER",
      "FINANCE_AI_NEWS_API_KEY",
      "FINANCE_AI_NEWS_ALLOW_NETWORK",
    ],
    missingRequiredEnvVars,
    canRunDemoSmoke: connectorPolicy.canRequestProvider,
    canValidateProductionKey: connectorPolicy.canRequestProvider && apiKeyStatus === "configured-redacted",
    expectedProviderErrorCodes: ["ALPHA_VANTAGE_NEWS_EMPTY"],
    forbiddenAuditFields: ["apiKey", "providerResponseRaw", "rawArticleBody"],
    nextActions:
      apiKeyStatus === "configured-redacted"
        ? ["运行 AAPL NEWS_SENTIMENT smoke，确认 sourceUrl/publishedAt/sentiment 字段完整。"]
        : [
            "申请或填写真实 Alpha Vantage API key。",
            "demo key 可能只返回免费 key 提示；系统应继续回退 fixture 并显示 providerError。",
          ],
    disclaimer:
      "该预检只记录 key 是否存在、是否为 demo key 和网络开关状态；不会输出、保存或审计真实 API key。",
  };
}

function createGdeltNewsConnectorPolicy(config) {
  const isSelected =
    config.selectedNewsProvider === "gdelt-doc-news" ||
    config.selectedNewsProvider === "multi-free-news";
  return {
    id: "gdelt-doc-news-connector",
    status: isSelected && config.gdeltNetworkEnabled ? "configured" : "defined",
    providerId: "gdelt-doc-news",
    officialEndpoint: gdeltDocBaseUrl,
    supportedMarkets: ["us"],
    plannedMarkets: ["a", "hk"],
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.gdeltNetworkEnabled,
    canRequestProvider: isSelected && config.gdeltNetworkEnabled,
    requestLimit: config.newsLimit,
    forbiddenAuditFields: ["rawArticleBody", "fullText", "cookies", "session"],
    requiredAttributionFields: ["title", "source.label", "sourceUrl", "publishedAt"],
    disclaimer:
      "GDELT DOC API 用作公开新闻补充源，只展示标题、来源、链接和时间；它不是公司公告或持牌财经新闻授权，不构成投资建议。",
  };
}

function createYahooFinanceRssConnectorPolicy(config) {
  const isSelected =
    config.selectedNewsProvider === "yahoo-finance-rss" ||
    config.selectedNewsProvider === "multi-free-news";
  return {
    id: "yahoo-finance-rss-connector",
    status: isSelected && config.yahooFinanceRssNetworkEnabled ? "configured" : "defined",
    providerId: "yahoo-finance-rss",
    officialEndpoint: yahooFinanceRssBaseUrl,
    supportedMarkets: ["us"],
    plannedMarkets: ["a", "hk"],
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.yahooFinanceRssNetworkEnabled,
    canRequestProvider: isSelected && config.yahooFinanceRssNetworkEnabled,
    requestLimit: config.newsLimit,
    forbiddenAuditFields: ["rawArticleBody", "fullText", "cookies", "session"],
    requiredAttributionFields: ["title", "source.label", "sourceUrl", "publishedAt"],
    disclaimer:
      "Yahoo Finance RSS 用作公开财经新闻标题补充源，只展示标题、来源链接和发布时间；不保存全文，不构成投资建议。",
  };
}

function createGoogleNewsRssConnectorPolicy(config) {
  const isSelected =
    config.selectedNewsProvider === "google-news-rss" ||
    config.selectedNewsProvider === "multi-free-news";
  return {
    id: "google-news-rss-connector",
    status: isSelected && config.googleNewsRssNetworkEnabled ? "configured" : "defined",
    providerId: "google-news-rss",
    officialEndpoint: googleNewsRssBaseUrl,
    supportedMarkets: ["a", "hk", "us"],
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.googleNewsRssNetworkEnabled,
    canRequestProvider: isSelected && config.googleNewsRssNetworkEnabled,
    requestLimit: config.newsLimit,
    forbiddenAuditFields: ["rawArticleBody", "fullText", "cookies", "session"],
    requiredAttributionFields: ["title", "source.label", "sourceUrl", "publishedAt"],
    disclaimer:
      "Google News RSS 仅作为本地 Demo 公开标题补充源，只展示标题、来源、链接和时间；Google feed 条款限制个人/非商业使用，不能视为正式上线授权新闻源。",
  };
}

function mapSecTickerCik({ market, code, symbol, ticker } = {}) {
  const normalizedMarket = normalizeMarket(market);
  if (normalizedMarket && normalizedMarket !== "us") return "";
  const raw = String(ticker || symbol || code || "").trim().toLowerCase();
  return secTickerCikMap[raw] || "";
}

function secTickerFromCik(cik) {
  const normalizedCik = String(cik || "").padStart(10, "0");
  return Object.entries(secTickerCikMap).find(([, value]) => value === normalizedCik)?.[0]?.toUpperCase() || "";
}

function createSecFilingsConnectorPolicy(config) {
  const isSelected =
    config.selectedFilingsProvider === "sec-company-submissions" ||
    config.selectedFilingsProvider === "multi-free-filings";
  return {
    id: "sec-company-submissions-connector",
    status: isSelected && config.filingsConfigured ? "configured" : "defined",
    providerId: "sec-company-submissions",
    officialEndpoint: secSubmissionsBaseUrl,
    supportedMarkets: ["us"],
    plannedMarkets: ["a", "hk"],
    requiresApiKey: false,
    requiresUserAgent: true,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.filingsNetworkEnabled,
    userAgentStatus: config.secUserAgent ? "configured-redacted" : "missing",
    canRequestProvider:
      isSelected &&
      config.filingsSupported &&
      config.filingsConfigured &&
      config.filingsNetworkEnabled,
    requestLimit: config.filingsLimit,
    supportedTickers: Object.keys(secTickerCikMap).map((ticker) => ticker.toUpperCase()),
    forbiddenAuditFields: ["providerResponseRaw", "rawFilingDocument", "secUserAgent"],
    requiredAttributionFields: ["filingType", "source.label", "sourceUrl", "publishedAt", "accessionNumber"],
    disclaimer:
      "SEC EDGAR submissions 用于第一阶段真实美股公告联调；需显示 SEC 来源、公告日期和原始链接，A 股/港股公告源仍需单独接入。",
  };
}

function createSecFilingsSmokeTestPlan(connectorPolicy) {
  return {
    id: "sec-company-submissions-smoke-test-plan",
    status: "defined",
    mode: "real-provider-public-filings-smoke",
    demoTicker: "AAPL",
    demoCik: secTickerCikMap.aapl,
    expectedFields: [
      "filings.recent.form",
      "filings.recent.filingDate",
      "filings.recent.accessionNumber",
      "filings.recent.primaryDocument",
    ],
    canUsePublicEndpoint: true,
    canRequestProvider: connectorPolicy.canRequestProvider,
    blocksIfMissingAttribution: true,
    forbiddenAuditFields: ["providerResponseRaw", "rawFilingDocument", "secUserAgent"],
  };
}

function createSecFilingsAccessPreflight(config, connectorPolicy) {
  return {
    id: "sec-company-submissions-access-preflight",
    status: connectorPolicy.canRequestProvider ? "ready-for-provider-smoke" : "blocked",
    mode: "no-secret-public-filings-preflight",
    providerId: "sec-company-submissions",
    networkStatus: config.filingsNetworkEnabled ? "enabled" : "disabled",
    userAgentStatus: config.secUserAgent ? "configured-redacted" : "missing",
    noApiKeyRequired: true,
    requiredEnvVars: [
      "FINANCE_AI_FILINGS_PROVIDER",
      "FINANCE_AI_FILINGS_ALLOW_NETWORK",
      "FINANCE_AI_SEC_USER_AGENT",
    ],
    missingRequiredEnvVars: config.selectedFilingsProvider
      ? optionalFilingsEnvVars.filter((name) => !hasEnvValue(config.rawEnv || {}, name))
      : ["FINANCE_AI_FILINGS_PROVIDER", "FINANCE_AI_FILINGS_ALLOW_NETWORK", "FINANCE_AI_SEC_USER_AGENT"],
    canRunPublicSmoke: connectorPolicy.canRequestProvider,
    expectedProviderErrorCodes: [
      "SEC_UNSUPPORTED_SYMBOL",
      "SEC_HTTP_ERROR",
      "SEC_EMPTY_SUBMISSIONS",
      "SEC_TIMEOUT",
    ],
    nextActions: [
      "设置 FINANCE_AI_FILINGS_PROVIDER=sec-company-submissions。",
      "设置 FINANCE_AI_FILINGS_ALLOW_NETWORK=true。",
      "设置 FINANCE_AI_SEC_USER_AGENT 为包含项目名和联系邮箱的 User-Agent。",
    ],
    disclaimer:
      "该预检不需要 API key，也不会输出 User-Agent 细节；真实请求必须遵守 SEC fair access policy 和缓存/署名规则。",
  };
}

function createHkexFilingsConnectorPolicy(config) {
  const isSelected =
    config.selectedFilingsProvider === "hkex-company-announcements" ||
    config.selectedFilingsProvider === "multi-free-filings" ||
    config.selectedFilingsProvider === "sec-company-submissions";
  return {
    id: "hkex-company-announcements-connector",
    status: isSelected && config.filingsNetworkEnabled ? "configured" : "defined",
    providerId: "hkex-company-announcements",
    officialEndpoint: hkexCompanyAnnouncementsBaseUrl,
    supportedMarkets: ["hk"],
    requiresApiKey: false,
    requiresExplicitNetworkFlag: true,
    networkEnabled: config.filingsNetworkEnabled,
    canRequestProvider:
      isSelected &&
      config.filingsSupported &&
      config.filingsNetworkEnabled,
    requestLimit: config.filingsLimit,
    supportedCodes: Object.keys(hkexStockIdMap).filter((code) => code.length === 5),
    forbiddenAuditFields: ["providerResponseRaw", "rawFilingDocument", "cookies", "session"],
    requiredAttributionFields: ["filingType", "source.label", "sourceUrl", "publishedAt", "accessionNumber"],
    disclaimer:
      "HKEXnews 公司公告用于本地 Demo 港股公告联调；只展示标题、公告日期和原始 PDF 链接，不抓取 PDF 正文，不构成投资建议。",
  };
}

function alphaVantageSentimentImportance(item, tickerSentiment) {
  const relevance = Number(tickerSentiment?.relevance_score || 0);
  const tickerScore = Math.abs(Number(tickerSentiment?.ticker_sentiment_score || 0));
  const overallScore = Math.abs(Number(item?.overall_sentiment_score || 0));
  return clampScore(45 + relevance * 35 + Math.max(tickerScore, overallScore) * 25);
}

export function parseAlphaVantageNewsSentiment(payload, input = {}) {
  if (!payload || !Array.isArray(payload.feed)) {
    const providerMessage =
      payload?.Information || payload?.Note || payload?.["Error Message"] || "Alpha Vantage 未返回新闻 feed。";
    return {
      status: "provider-error",
      error: {
        code: "ALPHA_VANTAGE_NEWS_EMPTY",
        message: redactAlphaVantageMessage(providerMessage, input),
      },
    };
  }

  const providerTicker = mapAlphaVantageNewsTicker(input);
  const market = normalizeMarket(input.market) || "us";
  const items = payload.feed.map((item, index) => {
    const tickerSentiment = Array.isArray(item.ticker_sentiment)
      ? item.ticker_sentiment.find((entry) => String(entry.ticker || "").toUpperCase() === providerTicker)
      : null;
    const publishedAt = parseAlphaVantageNewsTime(item.time_published);
    const relatedTickers = Array.isArray(item.ticker_sentiment)
      ? item.ticker_sentiment.map((entry) => entry.ticker).filter(Boolean)
      : [];
    return {
      id: `alpha-vantage-news-${item.time_published || index}-${index}`,
      market,
      code: providerTicker,
      title: String(item.title || "").trim(),
      summary: String(item.summary || "").trim(),
      sourceUrl: String(item.url || "").trim(),
      publishedAt,
      source: {
        id: "alpha-vantage-news-sentiment",
        label: String(item.source || item.source_domain || "Alpha Vantage News").trim(),
        licenseTag: "alpha-vantage-news-sentiment",
        attributionRequired: true,
      },
      relatedTickers,
      topics: Array.isArray(item.topics)
        ? item.topics.map((topic) => ({
            topic: topic.topic,
            relevanceScore: Number(topic.relevance_score || 0),
          }))
        : [],
      sentiment: {
        overallScore: Number(item.overall_sentiment_score || 0),
        label: String(item.overall_sentiment_label || "Unknown"),
        tickerScore: Number(tickerSentiment?.ticker_sentiment_score || 0),
        tickerLabel: String(tickerSentiment?.ticker_sentiment_label || ""),
        relevanceScore: Number(tickerSentiment?.relevance_score || 0),
      },
      importance: alphaVantageSentimentImportance(item, tickerSentiment),
      verified: true,
      mode: "real-provider",
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: providerTicker,
    items,
    sourceStatus: "alpha-vantage-news-sentiment",
    provider: {
      id: "alpha-vantage-news",
      endpoint: "NEWS_SENTIMENT",
      requestedTicker: providerTicker,
      requestUrlRedacted: `${alphaVantageNewsBaseUrl}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(providerTicker)}&apikey=REDACTED`,
    },
    disclaimer:
      "新闻情绪来自 Alpha Vantage NEWS_SENTIMENT API 响应；需按你的 API key 权限、新闻授权、缓存和再分发条款理解，不构成投资建议。",
  };
}

export function parseGdeltDocNews(payload, input = {}) {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  if (!articles.length) {
    return {
      status: "provider-error",
      error: {
        code: "GDELT_NEWS_EMPTY",
        message: "GDELT DOC API 未返回新闻 articles。",
      },
    };
  }

  const market = normalizeMarket(input.market) || "us";
  const rawTicker = String(input.symbol || input.code || input.ticker || "").trim().toUpperCase();
  const providerTicker = mapYahooFinanceSymbol(input) || rawTicker;
  const limit = Math.max(1, Math.min(50, Number(input.limit) || 10));
  const normalizedItems = articles.slice(0, limit).map((article, index) => {
    const sourceUrl = String(article.url || article.url_mobile || "").trim();
    const domain = String(article.domain || "").trim();
    const publishedAt = parseGdeltSeenDate(article.seendate || article.seenDate);
    return {
      id: `gdelt-doc-news-${article.urlhash || index}`,
      market,
      code: rawTicker || providerTicker,
      title: String(article.title || "").trim(),
      summary: String(article.socialimage || "").trim()
        ? "GDELT 公开新闻索引返回的相关新闻。"
        : "",
      sourceUrl,
      publishedAt,
      source: {
        id: "gdelt-doc-news",
        label: domain || "GDELT Project",
        licenseTag: "gdelt-doc-api-public-news-index",
        attributionRequired: true,
      },
      relatedTickers: Array.from(new Set([rawTicker, providerTicker].filter(Boolean))),
      importance: 68,
      verified: false,
      mode: "real-provider",
      providerMeta: {
        sourceCountry: article.sourcecountry || "",
        language: article.language || "",
      },
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);
  const items = filterItemsByCompanyRelevance(normalizedItems, input);

  if (!normalizedItems.length) {
    return {
      status: "provider-error",
      error: {
        code: "GDELT_NEWS_ATTRIBUTION_EMPTY",
        message: "GDELT DOC API 返回内容缺少标题、链接或时间字段。",
      },
    };
  }
  if (!items.length) {
    return {
      status: "provider-error",
      error: {
        code: "GDELT_NEWS_RELEVANCE_EMPTY",
        message: "GDELT DOC API 返回标题未匹配当前股票公司别名。",
      },
    };
  }

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: providerTicker,
    items,
    sourceStatus: "gdelt-doc-news",
    provider: {
      id: "gdelt-doc-news",
      endpoint: "DOC",
      requestedQuery: mapGdeltNewsQuery(input),
      requestUrlRedacted: `${gdeltDocBaseUrl}?query=${encodeURIComponent(mapGdeltNewsQuery(input))}&mode=ArtList&format=json&maxrecords=${limit}`,
    },
    disclaimer:
      "新闻来自 GDELT DOC API 公开新闻索引；仅作标题/来源链接层面的新闻补充，需按来源网站条款理解，不构成投资建议。",
  };
}

export function parseYahooFinanceRss(xml, input = {}) {
  const itemBlocks = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  if (!itemBlocks.length) {
    return {
      status: "provider-error",
      error: {
        code: "YAHOO_FINANCE_RSS_EMPTY",
        message: "Yahoo Finance RSS 未返回 item。",
      },
    };
  }

  const market = normalizeMarket(input.market) || "us";
  const rawTicker = String(input.symbol || input.code || input.ticker || "").trim().toUpperCase();
  const providerTicker = mapYahooFinanceSymbol(input) || rawTicker;
  const limit = Math.max(1, Math.min(50, Number(input.limit) || 10));
  const normalizedItems = itemBlocks.slice(0, limit).map((block, index) => {
    const title = readXmlTag(block, "title");
    const sourceUrl = readXmlTag(block, "link");
    const publishedAt = parseRssPubDate(readXmlTag(block, "pubDate"));
    return {
      id: `yahoo-finance-rss-${providerTicker || "news"}-${index}`,
      market,
      code: rawTicker || providerTicker,
      title,
      summary: "",
      sourceUrl,
      publishedAt,
      source: {
        id: "yahoo-finance-rss",
        label: "Yahoo Finance RSS",
        licenseTag: "yahoo-finance-rss-headline-link",
        attributionRequired: true,
      },
      relatedTickers: Array.from(new Set([rawTicker, providerTicker].filter(Boolean))),
      importance: 72,
      verified: false,
      mode: "real-provider",
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);
  const items = filterItemsByCompanyRelevance(normalizedItems, input);

  if (!normalizedItems.length) {
    return {
      status: "provider-error",
      error: {
        code: "YAHOO_FINANCE_RSS_ATTRIBUTION_EMPTY",
        message: "Yahoo Finance RSS 返回内容缺少标题、链接或时间字段。",
      },
    };
  }
  if (!items.length) {
    return {
      status: "provider-error",
      error: {
        code: "YAHOO_FINANCE_RSS_RELEVANCE_EMPTY",
        message: "Yahoo Finance RSS 返回标题未匹配当前股票公司别名。",
      },
    };
  }

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: providerTicker,
    items,
    sourceStatus: "yahoo-finance-rss",
    provider: {
      id: "yahoo-finance-rss",
      endpoint: "RSS",
      requestedTicker: providerTicker,
      requestUrlRedacted: `${yahooFinanceRssBaseUrl}?s=${encodeURIComponent(providerTicker)}&region=US&lang=en-US`,
    },
    disclaimer:
      "新闻来自 Yahoo Finance RSS 标题源；仅展示标题、发布时间和原文链接，不保存全文，不构成投资建议。",
  };
}

export function parseGoogleNewsRss(xml, input = {}) {
  const itemBlocks = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  if (!itemBlocks.length) {
    return {
      status: "provider-error",
      error: {
        code: "GOOGLE_NEWS_RSS_EMPTY",
        message: "Google News RSS 未返回 item。",
      },
    };
  }

  const market = normalizeMarket(input.market) || "us";
  const rawTicker = String(input.symbol || input.code || input.ticker || "").trim().toUpperCase();
  const providerQuery = mapGoogleNewsQuery(input);
  const limit = Math.max(1, Math.min(50, Number(input.limit) || 10));
  const normalizedItems = itemBlocks.slice(0, limit).map((block, index) => {
    const title = readXmlTag(block, "title");
    const sourceUrl = readXmlTag(block, "link");
    const publishedAt = parseRssPubDate(readXmlTag(block, "pubDate"));
    const sourceLabel = readXmlTag(block, "source") || "Google News RSS";
    return {
      id: `google-news-rss-${rawTicker || "news"}-${index}`,
      market,
      code: rawTicker,
      title,
      summary: "Google News RSS 公开标题源返回的相关新闻。",
      sourceUrl,
      publishedAt,
      source: {
        id: "google-news-rss",
        label: sourceLabel,
        licenseTag: "google-news-rss-personal-non-commercial-feed",
        attributionRequired: true,
      },
      relatedTickers: rawTicker ? [rawTicker] : [],
      importance: 70,
      verified: false,
      mode: "real-provider",
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);
  const items = filterItemsByCompanyRelevance(normalizedItems, input);

  if (!normalizedItems.length) {
    return {
      status: "provider-error",
      error: {
        code: "GOOGLE_NEWS_RSS_ATTRIBUTION_EMPTY",
        message: "Google News RSS 返回内容缺少标题、链接或时间字段。",
      },
    };
  }
  if (!items.length) {
    return {
      status: "provider-error",
      error: {
        code: "GOOGLE_NEWS_RSS_RELEVANCE_EMPTY",
        message: "Google News RSS 返回标题未匹配当前股票公司别名。",
      },
    };
  }

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: rawTicker,
    items,
    sourceStatus: "google-news-rss",
    provider: {
      id: "google-news-rss",
      endpoint: "RSS",
      requestedQuery: providerQuery,
      requestUrlRedacted: `${googleNewsRssBaseUrl}?q=${encodeURIComponent(providerQuery)}&hl=en-US&gl=US&ceid=US:en`,
    },
    disclaimer:
      "新闻来自 Google News RSS 公开标题源；仅展示标题、来源、发布时间和链接，不保存全文。该 feed 条款限制个人/非商业使用，不构成正式上线授权新闻源或投资建议。",
  };
}

function secFilingImportance(form) {
  const normalizedForm = String(form || "").toUpperCase();
  if (normalizedForm === "10-K" || normalizedForm === "20-F" || normalizedForm === "40-F") return 92;
  if (normalizedForm === "10-Q" || normalizedForm === "6-K") return 86;
  if (normalizedForm === "8-K") return 82;
  if (normalizedForm.includes("DEF 14A")) return 76;
  if (normalizedForm.includes("SC 13") || normalizedForm.includes("13D") || normalizedForm.includes("13G")) return 74;
  return 62;
}

export function parseSecCompanySubmissions(payload, input = {}) {
  const recent = payload?.filings?.recent;
  if (!recent || !Array.isArray(recent.form)) {
    return {
      status: "provider-error",
      error: {
        code: "SEC_EMPTY_SUBMISSIONS",
        message: "SEC submissions 未返回 recent filings。",
      },
    };
  }

  const cik = String(payload.cik || mapSecTickerCik(input) || "").padStart(10, "0");
  const ticker = String(input.ticker || input.symbol || input.code || secTickerFromCik(cik)).trim().toUpperCase();
  const market = "us";
  const limit = Math.max(1, Math.min(80, Number(input.limit) || 20));
  const itemCount = Math.min(recent.form.length, limit);
  const items = Array.from({ length: itemCount }, (_, index) => {
    const form = String(recent.form[index] || "").trim();
    const filingDate = String(recent.filingDate?.[index] || "").trim();
    const reportDate = String(recent.reportDate?.[index] || "").trim();
    const accessionNumber = String(recent.accessionNumber?.[index] || "").trim();
    const primaryDocument = String(recent.primaryDocument?.[index] || "").trim();
    const accessionPath = accessionNumber.replace(/-/g, "");
    const sourceUrl =
      cik && accessionPath && primaryDocument
        ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath}/${encodeURIComponent(primaryDocument)}`
        : "";
    return {
      id: `sec-${cik}-${accessionNumber || index}`,
      market,
      code: ticker,
      title: `${ticker || "US"} ${form || "filing"} 公告`,
      summary: reportDate
        ? `SEC ${form || "filing"}，报告期 ${reportDate}。`
        : `SEC ${form || "filing"}。`,
      sourceUrl,
      publishedAt: filingDate ? `${filingDate}T00:00:00.000Z` : "",
      filingType: form,
      accessionNumber,
      reportDate,
      source: {
        id: "sec-edgar-company-submissions",
        label: "SEC EDGAR",
        licenseTag: "sec-public-disclosure",
        attributionRequired: true,
      },
      relatedTickers: ticker ? [ticker] : [],
      importance: secFilingImportance(form),
      verified: true,
      mode: "real-provider",
    };
  }).filter((item) => item.filingType && item.publishedAt && item.sourceUrl);

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: ticker,
    items,
    sourceStatus: "sec-company-submissions",
    provider: {
      id: "sec-company-submissions",
      endpoint: "submissions",
      requestedTicker: ticker,
      requestedCik: cik,
      requestUrlRedacted: `${secSubmissionsBaseUrl}/CIK${cik}.json`,
    },
    disclaimer:
      "公告来自 SEC EDGAR submissions API；需显示来源、发布时间和原文链接，不覆盖 A 股/港股公告，不构成投资建议。",
  };
}

function sseBulletinImportance(item = {}) {
  const heading = String(item.BULLETIN_HEADING || item.BULLETIN_TYPE || "").trim();
  const title = String(item.TITLE || "").trim();
  if (/年度报告|半年度报告|季度报告|业绩|分红|利润分配/.test(title)) return 88;
  if (/董事会|股东|高管|聘任|薪酬|治理/.test(title)) return 78;
  if (/临时公告/.test(heading)) return 74;
  return 66;
}

export function parseSseCompanyBulletins(payload, input = {}) {
  const rows = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload?.pageHelp?.data)
      ? payload.pageHelp.data
      : [];
  if (!rows.length) {
    return {
      status: "provider-error",
      error: {
        code: "SSE_BULLETINS_EMPTY",
        message: "上交所公告接口未返回公告记录。",
      },
    };
  }

  const market = "a";
  const code = mapSseCompanyCode(input) || String(input.code || input.symbol || "").trim();
  const limit = Math.max(1, Math.min(80, Number(input.limit) || 20));
  const items = rows.slice(0, limit).map((row, index) => {
    const title = String(row.TITLE || "").trim();
    const date = String(row.SSEDATE || row.ADDDATE || "").trim();
    const urlPath = String(row.URL || "").trim();
    const sourceUrl = urlPath
      ? new URL(urlPath, "https://www.sse.com.cn").toString()
      : "";
    const filingType = String(row.BULLETIN_HEADING || row.BULLETIN_TYPE || "公告").trim();
    return {
      id: `sse-${code || row.SECURITY_CODE || "a"}-${date || index}-${index}`,
      market,
      code: String(row.SECURITY_CODE || code || "").trim(),
      title,
      summary: `${String(row.SECURITY_NAME || code || "A 股公司").trim()} ${filingType}。`,
      sourceUrl,
      publishedAt: date ? `${date.slice(0, 10)}T00:00:00.000Z` : "",
      filingType,
      accessionNumber: String(row.URL || "").trim(),
      reportDate: String(row.SSEDATE || "").trim(),
      source: {
        id: "sse-company-bulletins",
        label: "上海证券交易所公告",
        licenseTag: "sse-public-company-announcement",
        attributionRequired: true,
      },
      relatedTickers: code ? [code] : [],
      importance: sseBulletinImportance(row),
      verified: true,
      mode: "real-provider",
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);

  if (!items.length) {
    return {
      status: "provider-error",
      error: {
        code: "SSE_BULLETINS_ATTRIBUTION_EMPTY",
        message: "上交所公告返回内容缺少标题、链接或发布时间字段。",
      },
    };
  }

  return {
    status: "ok",
    mode: "real-provider",
    market,
    symbol: code,
    items,
    sourceStatus: "sse-company-bulletins",
    provider: {
      id: "sse-company-bulletins",
      endpoint: "queryCompanyBulletin",
      requestedSymbol: code,
      requestUrlRedacted: `${sseCompanyBulletinsBaseUrl}?isPagination=true&productId=${encodeURIComponent(code)}&pageHelp.pageSize=${limit}`,
    },
    disclaimer:
      "公告来自上海证券交易所公开公司公告接口；仅展示标题、发布时间和原文链接，不抓取 PDF 正文，不构成投资建议。",
  };
}

function hkexFilingImportance(row = {}) {
  const title = decodeXmlEntities(row.TITLE || "").toLowerCase();
  const type = decodeXmlEntities(row.LONG_TEXT || row.SHORT_TEXT || "").toLowerCase();
  if (/annual result|annual report|final result|年度|年報|业绩/.test(`${title} ${type}`)) return 88;
  if (/interim result|quarterly|monthly return|中期|季度|月報/.test(`${title} ${type}`)) return 80;
  if (/inside information|notifiable transaction|connected transaction|dividend|rights issue|placing/.test(`${title} ${type}`)) return 78;
  if (/board|director|shareholder|meeting|股東|董事/.test(`${title} ${type}`)) return 72;
  return 66;
}

export function parseHkexCompanyAnnouncements(payload, input = {}) {
  const expectedCode = mapHkexCompanyCode(input);
  let rows = [];
  if (Array.isArray(payload?.result)) {
    rows = payload.result;
  } else if (typeof payload?.result === "string" && payload.result && payload.result !== "null") {
    try {
      rows = JSON.parse(payload.result);
    } catch {
      rows = [];
    }
  }

  if (!rows.length) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_ANNOUNCEMENTS_EMPTY",
        message: "HKEXnews 公告检索未返回公告记录。",
      },
    };
  }

  const limit = Math.max(1, Math.min(80, Number(input.limit) || 20));
  const filteredRows = expectedCode
    ? rows.filter((row) => parseHkexStockCodes(row.STOCK_CODE).includes(expectedCode))
    : rows;
  if (!filteredRows.length) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_ANNOUNCEMENTS_SYMBOL_EMPTY",
        message: "HKEXnews 返回记录未匹配当前港股代码，已丢弃错配公告。",
      },
    };
  }

  const items = filteredRows.slice(0, limit).map((row, index) => {
    const rowCodes = parseHkexStockCodes(row.STOCK_CODE);
    const code = rowCodes.includes(expectedCode) ? expectedCode : (rowCodes[0] || expectedCode || "");
    const title = cleanHkexText(row.TITLE || "");
    const filingType = cleanHkexText(row.LONG_TEXT || row.SHORT_TEXT || "公告");
    const fileLink = String(row.FILE_LINK || "").trim();
    const sourceUrl = fileLink
      ? new URL(fileLink, "https://www1.hkexnews.hk").toString()
      : "";
    const publishedAt = parseHkexDateTime(row.DATE_TIME);
    const newsId = String(row.NEWS_ID || index).trim();
    return {
      id: `hkex-${code}-${newsId}`,
      market: "hk",
      code,
      title,
      summary: `${cleanHkexText(row.STOCK_NAME || code || "港股公司")} ${filingType || "公告"}。`,
      sourceUrl,
      publishedAt,
      filingType: filingType || String(row.FILE_TYPE || "公告").trim(),
      accessionNumber: newsId || fileLink,
      reportDate: publishedAt ? publishedAt.slice(0, 10) : "",
      source: {
        id: "hkex-company-announcements",
        label: "HKEXnews",
        licenseTag: "hkex-public-company-announcement",
        attributionRequired: true,
      },
      relatedTickers: code ? [code, code.replace(/^0+/, "")] : [],
      importance: hkexFilingImportance(row),
      verified: true,
      mode: "real-provider",
    };
  }).filter((item) => item.title && item.sourceUrl && item.publishedAt);

  if (!items.length) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_ANNOUNCEMENTS_ATTRIBUTION_EMPTY",
        message: "HKEXnews 公告返回内容缺少标题、链接或发布时间字段。",
      },
    };
  }

  return {
    status: "ok",
    mode: "real-provider",
    market: "hk",
    symbol: expectedCode || String(input.symbol || input.code || input.ticker || "").trim(),
    items,
    sourceStatus: "hkex-company-announcements",
    provider: {
      id: "hkex-company-announcements",
      endpoint: "titleSearchServlet",
      requestedSymbol: expectedCode,
      requestedStockId: input.hkexStockId || mapHkexStockId(input),
      requestUrlRedacted: `${hkexCompanyAnnouncementsBaseUrl}?market=SEHK&stockId=REDACTED&rowRange=${limit}&lang=EN`,
    },
    disclaimer:
      "公告来自 HKEXnews 公开公司公告检索；仅展示标题、发布时间和原始 PDF 链接，不抓取 PDF 正文，不构成投资建议。",
  };
}

async function fetchAlphaVantageNews({ config, input, fetchImpl = fetch }) {
  const providerTicker = mapAlphaVantageNewsTicker(input);
  if (!providerTicker) {
    return {
      status: "provider-error",
      error: {
        code: "ALPHA_VANTAGE_NEWS_UNSUPPORTED_SYMBOL",
        message: "Alpha Vantage NEWS_SENTIMENT 当前仅启用已验证的美股 ticker 请求。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.requestTimeoutMs)
    : null;
  try {
    const url = new URL(alphaVantageNewsBaseUrl);
    url.searchParams.set("function", "NEWS_SENTIMENT");
    url.searchParams.set("tickers", providerTicker);
    url.searchParams.set("sort", "LATEST");
    url.searchParams.set("limit", String(config.newsLimit));
    url.searchParams.set("apikey", config.apiKey);
    const response = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "ALPHA_VANTAGE_NEWS_HTTP_ERROR",
          message: `Alpha Vantage NEWS_SENTIMENT HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const payload = await response.json();
    return parseAlphaVantageNewsSentiment(payload, input);
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "ALPHA_VANTAGE_NEWS_TIMEOUT" : "ALPHA_VANTAGE_NEWS_FETCH_FAILED",
        message: error?.message || "Alpha Vantage NEWS_SENTIMENT 请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchGdeltDocNews({ config, input, fetchImpl = fetch }) {
  const query = mapGdeltNewsQuery(input);
  if (!query) {
    return {
      status: "provider-error",
      error: {
        code: "GDELT_NEWS_UNSUPPORTED_SYMBOL",
        message: "GDELT DOC API 当前仅启用已验证的美股关键词请求。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), Math.max(1_000, Number(config.requestTimeoutMs) || 8_000))
    : null;
  try {
    const url = new URL(gdeltDocBaseUrl);
    url.searchParams.set("query", query);
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", String(config.newsLimit));
    url.searchParams.set("sort", "HybridRel");
    const response = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "GDELT_NEWS_HTTP_ERROR",
          message: `GDELT DOC API HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const text = await response.text();
    if (/please limit requests|larger queries|rate limit/i.test(text)) {
      return {
        status: "provider-error",
        error: {
          code: "GDELT_NEWS_RATE_LIMIT",
          message: "GDELT DOC API 返回限频提示，请稍后重试。",
        },
      };
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        status: "provider-error",
        error: {
          code: "GDELT_NEWS_INVALID_JSON",
          message: "GDELT DOC API 未返回可解析 JSON。",
        },
      };
    }
    return parseGdeltDocNews(payload, { ...input, limit: config.newsLimit });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "GDELT_NEWS_TIMEOUT" : "GDELT_NEWS_FETCH_FAILED",
        message: error?.message || "GDELT DOC API 请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchYahooFinanceRssNews({ config, input, fetchImpl = fetch }) {
  const providerSymbol = mapYahooFinanceSymbol(input);
  if (!providerSymbol) {
    return {
      status: "provider-error",
      error: {
        code: "YAHOO_FINANCE_RSS_UNSUPPORTED_SYMBOL",
        message: "Yahoo Finance RSS 当前仅启用已验证的美股 ticker 请求。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), Math.max(1_000, Number(config.requestTimeoutMs) || 8_000))
    : null;
  try {
    const url = new URL(yahooFinanceRssBaseUrl);
    url.searchParams.set("s", providerSymbol);
    url.searchParams.set("region", "US");
    url.searchParams.set("lang", "en-US");
    const response = await fetchImpl(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "YAHOO_FINANCE_RSS_HTTP_ERROR",
          message: `Yahoo Finance RSS HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const xml = await response.text();
    if (!/<item\b/i.test(xml) && /will be right back|sad-panda|<html\b/i.test(xml)) {
      return {
        status: "provider-error",
        error: {
          code: "YAHOO_FINANCE_RSS_TEMPORARY_UNAVAILABLE",
          message: "Yahoo Finance RSS 当前返回临时错误页，请稍后重试。",
        },
      };
    }
    return parseYahooFinanceRss(xml, { ...input, limit: config.newsLimit });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "YAHOO_FINANCE_RSS_TIMEOUT" : "YAHOO_FINANCE_RSS_FETCH_FAILED",
        message: error?.message || "Yahoo Finance RSS 请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchGoogleNewsRssNews({ config, input, fetchImpl = fetch }) {
  const query = mapGoogleNewsQuery(input);
  if (!query) {
    return {
      status: "provider-error",
      error: {
        code: "GOOGLE_NEWS_RSS_UNSUPPORTED_SYMBOL",
        message: "Google News RSS 当前无法生成当前股票查询词。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), Math.max(1_000, Number(config.requestTimeoutMs) || 8_000))
    : null;
  try {
    const url = new URL(googleNewsRssBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
    const response = await fetchImpl(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "GOOGLE_NEWS_RSS_HTTP_ERROR",
          message: `Google News RSS HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const xml = await response.text();
    return parseGoogleNewsRss(xml, { ...input, limit: config.newsLimit });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "GOOGLE_NEWS_RSS_TIMEOUT" : "GOOGLE_NEWS_RSS_FETCH_FAILED",
        message: error?.message || "Google News RSS 请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchSecCompanySubmissions({ config, input, fetchImpl = fetch }) {
  const cik = mapSecTickerCik(input);
  if (!cik) {
    return {
      status: "provider-error",
      error: {
        code: "SEC_UNSUPPORTED_SYMBOL",
        message: "SEC submissions 当前仅启用已映射 CIK 的美股 ticker。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.requestTimeoutMs)
    : null;
  try {
    const response = await fetchImpl(
      `${secSubmissionsBaseUrl}/CIK${cik}.json`,
      {
        ...(controller ? { signal: controller.signal } : {}),
        headers: {
          "User-Agent": config.secUserAgent,
          Accept: "application/json",
        },
      },
    );
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "SEC_HTTP_ERROR",
          message: `SEC submissions HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const payload = await response.json();
    return parseSecCompanySubmissions(payload, {
      ...input,
      limit: config.filingsLimit,
    });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "SEC_TIMEOUT" : "SEC_FETCH_FAILED",
        message: error?.message || "SEC submissions 请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchSseCompanyBulletins({ config, input, fetchImpl = fetch }) {
  const code = mapSseCompanyCode(input);
  if (!code) {
    return {
      status: "provider-error",
      error: {
        code: "SSE_UNSUPPORTED_SYMBOL",
        message: "上交所公告当前仅启用沪市 A 股 6 位代码。",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.requestTimeoutMs)
    : null;
  try {
    const url = new URL(sseCompanyBulletinsBaseUrl);
    url.searchParams.set("isPagination", "true");
    url.searchParams.set("productId", code);
    url.searchParams.set("keyWord", "");
    url.searchParams.set("securityType", "0101,120100,020100,020200,120200");
    url.searchParams.set("reportType", "ALL");
    url.searchParams.set("beginDate", "");
    url.searchParams.set("endDate", "");
    url.searchParams.set("pageHelp.pageSize", String(config.filingsLimit));
    url.searchParams.set("pageHelp.pageNo", "1");
    url.searchParams.set("pageHelp.beginPage", "1");
    url.searchParams.set("pageHelp.cacheSize", "1");
    url.searchParams.set("pageHelp.endPage", String(config.filingsLimit));
    const response = await fetchImpl(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www.sse.com.cn/",
        "User-Agent": config.secUserAgent || "finance-ai-assistant-local-demo/0.1",
      },
    });
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "SSE_BULLETINS_HTTP_ERROR",
          message: `上交所公告 HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const payload = await response.json();
    return parseSseCompanyBulletins(payload, { ...input, limit: config.filingsLimit });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "SSE_BULLETINS_TIMEOUT" : "SSE_BULLETINS_FETCH_FAILED",
        message: error?.message || "上交所公告请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchHkexStockId({ config, input, fetchImpl = fetch }) {
  const code = mapHkexCompanyCode(input);
  if (!code) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_UNSUPPORTED_SYMBOL",
        message: "HKEXnews 股票检索当前仅启用港股数字代码。",
      },
    };
  }

  const mappedStockId = mapHkexStockId(input);
  if (mappedStockId) {
    return {
      status: "ok",
      stockId: mappedStockId,
      code,
      provider: {
        id: "hkex-stock-id-local-map",
        endpoint: "local-map",
        requestUrlRedacted: "local-map",
      },
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.requestTimeoutMs)
    : null;
  try {
    const url = new URL(hkexStockSearchPrefixBaseUrl);
    url.searchParams.set("callback", "callback");
    url.searchParams.set("lang", "EN");
    url.searchParams.set("type", "A");
    url.searchParams.set("name", code);
    url.searchParams.set("market", "SEHK");
    const response = await fetchImpl(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        Accept: "application/javascript,text/javascript,*/*",
        Referer: "https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en",
        "User-Agent": config.secUserAgent || "finance-ai-assistant-local-demo/0.1",
      },
    });
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "HKEX_STOCK_SEARCH_HTTP_ERROR",
          message: `HKEXnews 股票检索 HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const text = await response.text();
    return parseHkexStockSearchJsonp(text, { ...input, symbol: code });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "HKEX_STOCK_SEARCH_TIMEOUT" : "HKEX_STOCK_SEARCH_FETCH_FAILED",
        message: error?.message || "HKEXnews 股票检索请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchHkexCompanyAnnouncements({ config, input, fetchImpl = fetch }) {
  const code = mapHkexCompanyCode(input);
  if (!code) {
    return {
      status: "provider-error",
      error: {
        code: "HKEX_UNSUPPORTED_SYMBOL",
        message: "HKEXnews 公告当前仅启用港股数字代码。",
      },
    };
  }
  const stockSearchResult = await fetchHkexStockId({ config, input: { ...input, symbol: code }, fetchImpl });
  if (stockSearchResult.status !== "ok") return stockSearchResult;
  const stockId = stockSearchResult.stockId;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.requestTimeoutMs)
    : null;
  try {
    const now = new Date();
    const endDate = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
    const beginDate = `${now.getUTCFullYear() - 2}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
    const url = new URL(hkexCompanyAnnouncementsBaseUrl);
    url.searchParams.set("sortDir", "0");
    url.searchParams.set("sortByOptions", "DateTime");
    url.searchParams.set("category", "0");
    url.searchParams.set("market", "SEHK");
    url.searchParams.set("stockId", stockId);
    url.searchParams.set("documentType", "-1");
    url.searchParams.set("from", beginDate);
    url.searchParams.set("to", endDate);
    url.searchParams.set("title", "");
    url.searchParams.set("searchType", "0");
    url.searchParams.set("rowRange", String(config.filingsLimit));
    url.searchParams.set("lang", "EN");
    const response = await fetchImpl(url, {
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en",
        "User-Agent": config.secUserAgent || "finance-ai-assistant-local-demo/0.1",
      },
    });
    if (!response?.ok) {
      return {
        status: "provider-error",
        error: {
          code: "HKEX_ANNOUNCEMENTS_HTTP_ERROR",
          message: `HKEXnews 公告 HTTP ${response?.status || "unknown"}`,
        },
      };
    }
    const payload = await response.json();
    return parseHkexCompanyAnnouncements(payload, { ...input, hkexStockId: stockId, limit: config.filingsLimit });
  } catch (error) {
    return {
      status: "provider-error",
      error: {
        code: error?.name === "AbortError" ? "HKEX_ANNOUNCEMENTS_TIMEOUT" : "HKEX_ANNOUNCEMENTS_FETCH_FAILED",
        message: error?.message || "HKEXnews 公告请求失败。",
      },
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function createEndpointContracts() {
  return [
    {
      id: "importantNews",
      method: "listImportantNews",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "symbol", "minImportance"],
      output: ["items", "importanceScore", "source", "publishedAt"],
    },
    {
      id: "companyFilings",
      method: "listCompanyFilings",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "symbol"],
      output: ["items", "filingType", "source", "publishedAt"],
    },
    {
      id: "publicStatements",
      method: "listPublicStatements",
      status: "planned",
      fixtureStatus: "available",
      input: ["market", "symbol"],
      output: ["items", "speaker", "speakerRole", "sourceUrl", "verified"],
    },
  ];
}

function sourceForNews(item) {
  return {
    id: "local-fixture-news",
    label: item.source || "Mock 新闻样例",
    licenseTag: "sample-fixture-not-licensed-news",
    attributionRequired: true,
  };
}

function sourceLabel(item) {
  if (typeof item.source === "string" && item.source.trim()) return item.source.trim();
  if (item.source && typeof item.source.label === "string") return item.source.label;
  return "default";
}

function officialFilingCredibility(item = {}) {
  const label = sourceLabel(item);
  if (officialFilingCredibilityScores[label]) {
    return officialFilingCredibilityScores[label];
  }

  const source = item && typeof item.source === "object" && item.source ? item.source : {};
  const licenseTag = String(source.licenseTag || "").toLowerCase();
  const hasOfficialLicense =
    licenseTag.includes("sec-public-disclosure") ||
    licenseTag.includes("sse-public-company-announcement") ||
    licenseTag.includes("hkex-public-company-announcement");
  if (hasOfficialLicense) return 93;

  const hasFilingShape = Boolean(item.filingType || item.accessionNumber || item.reportDate);
  if (hasFilingShape && item.verified === true) return 90;

  return null;
}

function sourceCredibility(item) {
  const officialScore = officialFilingCredibility(item);
  if (officialScore !== null) return officialScore;

  const label = sourceLabel(item);
  return sourceCredibilityScores[label] || sourceCredibilityScores.default;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function verifiedSignal(item) {
  return item.verified === true ? 6 : 0;
}

function recencySignal(item) {
  const publishedAt = Date.parse(item.publishedAt || "");
  if (!Number.isFinite(publishedAt)) return 4;
  const reference = Date.parse("2026-06-01T00:00:00.000Z");
  const ageDays = Math.max(0, Math.round((reference - publishedAt) / 86_400_000));
  if (ageDays <= 1) return 8;
  if (ageDays <= 7) return 5;
  return 2;
}

function explainImportance(item) {
  const baseImportance = clampScore(item.importance);
  const credibility = sourceCredibility(item);
  const recency = recencySignal(item);
  const verified = verifiedSignal(item);
  const finalScore = clampScore(baseImportance * 0.72 + credibility * 0.18 + recency + verified);

  return {
    importanceScore: finalScore,
    sourceCredibilityScore: credibility,
    importanceBreakdown: {
      baseImportance,
      sourceCredibility: credibility,
      recencySignal: recency,
      verifiedSignal: verified,
      formula: "baseImportance*0.72 + sourceCredibility*0.18 + recencySignal + verifiedSignal",
    },
  };
}

function normalizeTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[·,，。！!：:\s]+/g, "");
}

function relatedTickerKey(item) {
  const tickers = Array.isArray(item.relatedTickers)
    ? item.relatedTickers
    : item.code
      ? [item.code]
      : [];
  return tickers.map((ticker) => normalizeCode(ticker)).sort().join(",");
}

function dedupeKey(item) {
  return [item.market || "", normalizeTitle(item.title), relatedTickerKey(item)].join("|");
}

function dedupeItems(items = []) {
  const groups = new Map();
  items.forEach((item) => {
    const key = dedupeKey(item);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...item,
        duplicateIds: [item.id].filter(Boolean),
        sourceCount: 1,
      });
      return;
    }

    const currentScore = explainImportance(current).importanceScore;
    const nextScore = explainImportance(item).importanceScore;
    const winner = nextScore > currentScore ? item : current;
    groups.set(key, {
      ...winner,
      duplicateIds: [
        ...new Set([
          ...(Array.isArray(current.duplicateIds) ? current.duplicateIds : [current.id]),
          item.id,
        ].filter(Boolean)),
      ],
      sourceCount: (current.sourceCount || 1) + 1,
      deduped: true,
    });
  });
  return [...groups.values()];
}

function fixtureDisclaimer() {
  return "当前为本地样例新闻/公告/公开言论读取，不代表真实新闻、交易所公告或社交媒体监控，不构成投资建议。";
}

function createSourceVerificationPolicy(config) {
  return {
    id: "news-source-verification-policy",
    status: config.sourceVerificationReady ? "ready" : "blocked",
    requiredSignals: [
      "sourceUrl",
      "publisherIdentity",
      "publishedAt",
      "speakerRole",
      "verifiedOfficialChannel",
    ],
    appliesTo: ["news", "filing", "publicStatement"],
    blocksUnverifiedPublicStatements: true,
    requiresManualReviewForSocialStatements: true,
    forbiddenAuditFields: ["rawSocialPost", "sessionCookie", "privateMessage", "personalContact"],
    disclaimer:
      "新闻、公告和公开言论必须保留来源验证信号；未经验证的社交/公开言论不得进入高置信度分析。",
  };
}

function createRedistributionPolicy(config) {
  return {
    id: "news-redistribution-policy",
    status: config.redistributionReady ? "ready" : "blocked",
    allowedContentModes: ["headline-summary", "short-excerpt", "source-link"],
    blocksFullTextStorage: true,
    blocksPaywalledContentIngestion: true,
    requiresLicenseTag: true,
    retentionDefaultDays: 30,
    disclaimer:
      "真实新闻和公告内容必须按授权限制摘要、引用、存储和再分发；不得保存或展示未授权全文。",
  };
}

function createIngestionPrecheckPolicy(config) {
  return {
    id: "news-ingestion-precheck-policy",
    status: config.ingestionPrecheckReady ? "ready" : "blocked",
    checksProviderStatus: true,
    validatesSampleSymbols: true,
    validatesRobotsAndTerms: true,
    requiresManualSmokeTest: true,
  };
}

function createPublicStatementVerificationPolicy(config) {
  return {
    id: "public-statement-verification-policy",
    status:
      config.statementIdentityReady && config.statementPlatformTermsReady ? "ready" : "blocked",
    requiredSignals: [
      "speakerId",
      "speakerName",
      "speakerRole",
      "verificationStatus",
      "sourceUrl",
      "postedAt",
      "platformTermsStatus",
    ],
    appliesTo: ["publicStatement"],
    blocksUnverifiedHighImpactStatements: true,
    requiresOfficialChannelOrManualReview: true,
    verifiedSpeakerTypes: ["companyExecutive", "companyAccount", "governmentOfficial", "regulator"],
    forbiddenAuditFields: ["sessionCookie", "privateMessage", "rawPlatformAuth", "nonPublicContent"],
    disclaimer:
      "公开言论必须先验证发言人身份、来源链接和平台条款；未验证或高影响言论不得直接进入高置信度分析。",
  };
}

function createPublicStatementManualReviewPolicy(config) {
  return {
    id: "public-statement-manual-review-policy",
    status: config.statementReviewQueueReady ? "ready" : "blocked",
    reviewTriggers: [
      "unverifiedIdentity",
      "highMarketImpact",
      "translatedOrParaphrasedStatement",
      "screenshotOrRepostOnly",
      "conflictingSourceSignals",
    ],
    queueFields: ["reviewStatus", "reviewReason", "priority", "reviewerRole", "slaHours"],
    defaultSlaHours: 24,
    reviewerRoles: ["complianceReviewer", "licensedAdviser", "dataSourceReviewer"],
    userVisibleFallback: "公开言论来源待复核，仅作为低置信度背景信息展示。",
    canPromoteAfterReview: false,
    disclaimer:
      "高影响或未验证公开言论必须进入人工复核；复核完成前不能作为强买卖信号或高置信度概率依据。",
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
      id: "sourceVerificationPolicy",
      status: status.sourceVerificationPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "redistributionPolicy",
      status: status.redistributionPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "ingestionPrecheckPolicy",
      status: status.ingestionPrecheckPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "publicStatementVerificationPolicy",
      status:
        status.publicStatementVerificationPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
    {
      id: "publicStatementManualReviewPolicy",
      status: status.publicStatementManualReviewPolicy.status === "ready" ? "pass" : "blocked",
      required: true,
    },
  ];

  return {
    id: "news-ingestion-provider-preflight-plan",
    mode: "dry-run-no-provider-fetch",
    status: checks.every((check) => check.status === "pass") ? "ready" : "blocked",
    canFetchProviderContent: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks,
    ingestionEnvelope: {
      requiredFields: ["source.label", "source.licenseTag", "publishedAt", "sourceUrl"],
      forbiddenFields: [
        "apiKey",
        "rawArticleBody",
        "rawSocialPost",
        "privateMessage",
        "sessionCookie",
        "rawPlatformAuth",
      ],
      redactBeforeAudit: true,
    },
    rollback: {
      fallbackService: "local-fixture-news-filings-statements",
      disableFlag: "FINANCE_AI_NEWS_RUNTIME=inactive",
      preserveLastGoodFixture: true,
    },
  };
}

function createStatus(config, fixtures) {
  const blockedReasons = [];
  if (!config.newsConfigured) {
    blockedReasons.push("新闻/公告 provider id 或 API key 尚未配置。");
  }
  if (!config.newsSupported) {
    blockedReasons.push(`新闻/公告 provider 未注册：${config.selectedNewsProvider}。`);
  }
  if (config.selectedFilingsProvider && !config.filingsSupported) {
    blockedReasons.push(`公告 provider 未注册：${config.selectedFilingsProvider}。`);
  }
  if (config.selectedFilingsProvider && !config.filingsConfigured) {
    blockedReasons.push("公告 provider 需要显式网络开关；SEC/multi-free 模式还需要 SEC User-Agent。");
  }
  if (config.statementPartiallyConfigured) {
    blockedReasons.push("公开言论 provider 配置不完整。");
  }
  if (!config.statementSupported) {
    blockedReasons.push(`公开言论 provider 未注册：${config.selectedStatementProvider}。`);
  }
  if (!config.licenseConfirmed) {
    blockedReasons.push("尚未确认新闻、公告和公开言论数据授权与缓存边界。");
  }
  if (!config.attributionReady) {
    blockedReasons.push("尚未完成新闻、公告和公开言论来源署名规则。");
  }
  if (!config.rateLimitReady) {
    blockedReasons.push("尚未配置新闻/公告 provider 限流、缓存和降级策略。");
  }
  const sourceVerificationPolicy = createSourceVerificationPolicy(config);
  const redistributionPolicy = createRedistributionPolicy(config);
  const ingestionPrecheckPolicy = createIngestionPrecheckPolicy(config);
  const publicStatementVerificationPolicy = createPublicStatementVerificationPolicy(config);
  const publicStatementManualReviewPolicy = createPublicStatementManualReviewPolicy(config);
  const alphaVantageNewsConnector = createAlphaVantageNewsConnectorPolicy(config);
  const alphaVantageNewsSmokeTestPlan = createAlphaVantageNewsSmokeTestPlan(
    alphaVantageNewsConnector,
  );
  const alphaVantageNewsCredentialPreflight = createAlphaVantageNewsCredentialPreflight(
    config,
    alphaVantageNewsConnector,
  );
  const yahooFinanceRssConnector = createYahooFinanceRssConnectorPolicy(config);
  const googleNewsRssConnector = createGoogleNewsRssConnectorPolicy(config);
  const gdeltNewsConnector = createGdeltNewsConnectorPolicy(config);
  const secFilingsConnector = createSecFilingsConnectorPolicy(config);
  const secFilingsSmokeTestPlan = createSecFilingsSmokeTestPlan(secFilingsConnector);
  const secFilingsAccessPreflight = createSecFilingsAccessPreflight(config, secFilingsConnector);
  const hkexFilingsConnector = createHkexFilingsConnectorPolicy(config);
  if (sourceVerificationPolicy.status !== "ready") {
    blockedReasons.push("新闻、公告和公开言论来源验证信号尚未确认。");
  }
  if (redistributionPolicy.status !== "ready") {
    blockedReasons.push("新闻/公告内容摘要、引用、存储和再分发授权边界尚未确认。");
  }
  if (ingestionPrecheckPolicy.status !== "ready") {
    blockedReasons.push("新闻 provider 状态、样例 symbol、robots/terms 和人工 smoke test 预检尚未确认。");
  }
  if (publicStatementVerificationPolicy.status !== "ready") {
    blockedReasons.push("公开言论身份验证、来源链接或平台条款尚未确认。");
  }
  if (publicStatementManualReviewPolicy.status !== "ready") {
    blockedReasons.push("公开言论高影响、未验证或转述内容的人工复核队列尚未确认。");
  }

  const status = {
    id: "news-filings-provider-adapter",
    name: "News, Filings, and Public Statements Adapter Skeleton",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    selectedNewsProvider: config.selectedNewsProvider,
    selectedFilingsProvider: config.selectedFilingsProvider,
    selectedStatementProvider: config.selectedStatementProvider,
    supportedNewsProviderIds,
    supportedFilingsProviderIds,
    supportedStatementProviderIds,
    configured: config.newsConfigured,
    filingsConfigured: config.filingsConfigured,
    statementConfigured: config.statementConfigured,
    supported: config.newsSupported && config.filingsSupported && config.statementSupported,
    canFetchLiveNews:
      alphaVantageNewsConnector.canRequestProvider ||
      yahooFinanceRssConnector.canRequestProvider ||
      googleNewsRssConnector.canRequestProvider ||
      gdeltNewsConnector.canRequestProvider,
    canFetchLiveFilings:
      secFilingsConnector.canRequestProvider ||
      hkexFilingsConnector.canRequestProvider ||
      (config.selectedFilingsProvider === "sse-company-bulletins" && config.filingsNetworkEnabled),
    canReadFixtures: true,
    processing: {
      deduplication: "normalized-title-related-tickers",
      sourceCredibility: "fixture-source-classification",
      importanceScoring: "explainable-weighted-score-v1",
      persistence: "mock-repository-on-demand",
    },
    fixtureReadModel: {
      status: "available",
      newsCount: fixtures.news.length,
      filingCount: fixtures.filings.length,
      publicStatementCount: fixtures.publicStatements.length,
      markets: [
        ...new Set([
          ...fixtures.news.map((item) => item.market),
          ...fixtures.filings.map((item) => item.market),
          ...fixtures.publicStatements.map((item) => item.market),
        ].filter(Boolean)),
      ],
      source: "local-fixture-news-filings-statements",
    },
    missingEnvVars: config.missingEnvVars,
    endpointContracts: createEndpointContracts(),
    sourceVerificationPolicy,
    redistributionPolicy,
    ingestionPrecheckPolicy,
    publicStatementVerificationPolicy,
    publicStatementManualReviewPolicy,
    alphaVantageNewsConnector,
    alphaVantageNewsSmokeTestPlan,
    alphaVantageNewsCredentialPreflight,
    yahooFinanceRssConnector,
    googleNewsRssConnector,
    gdeltNewsConnector,
    secFilingsConnector,
    secFilingsSmokeTestPlan,
    secFilingsAccessPreflight,
    hkexFilingsConnector,
    safety: {
      noVendorNetworkCalls:
        !alphaVantageNewsConnector.canRequestProvider &&
        !yahooFinanceRssConnector.canRequestProvider &&
        !googleNewsRssConnector.canRequestProvider &&
        !gdeltNewsConnector.canRequestProvider &&
        !secFilingsConnector.canRequestProvider,
      noTradingActions: true,
      requiresAttribution: true,
      requiresLicenseReview: true,
      requiresSourceVerification: true,
      requiresRedistributionReview: true,
      requiresIngestionPrecheck: true,
      requiresPublicStatementVerification: true,
      requiresPublicStatementManualReview: true,
      noSocialScraping: true,
      mockFallbackActive: true,
      alphaVantageNewsNetworkAllowed: alphaVantageNewsConnector.canRequestProvider,
      yahooFinanceRssNetworkAllowed: yahooFinanceRssConnector.canRequestProvider,
      googleNewsRssNetworkAllowed: googleNewsRssConnector.canRequestProvider,
      gdeltNewsNetworkAllowed: gdeltNewsConnector.canRequestProvider,
      secFilingsNetworkAllowed: secFilingsConnector.canRequestProvider,
    },
    blockedReasons,
    nextSteps: [
      "确认新闻、公告和公开言论 provider 的授权、缓存、展示和再分发边界。",
      "优先用 SEC EDGAR submissions 完成美股公告真实源 smoke，再补 A 股/港股公告来源。",
      "确认公开言论的身份验证信号、平台条款、人工复核队列和低置信度展示规则。",
      "实现 listImportantNews、listCompanyFilings、listPublicStatements，并保留 source/publishedAt/licenseTag/sourceUrl。",
      "增加重要性评分、重复新闻合并、来源可信度、失败降级和审计记录。",
      "通过 smoke test 后才允许把 runtimeMode 从 inactive 切换为 delayed 或 live。",
    ],
    disclaimer:
      alphaVantageNewsConnector.canRequestProvider || secFilingsConnector.canRequestProvider
        ? "当前已允许部分真实新闻/公告 provider 请求；仍必须显示来源、原文链接、发布时间、授权边界和回退状态，不构成投资建议。"
        : "当前为新闻/公告/公开言论 provider adapter 骨架。真实 provider 不会被请求；本地 fixture 仅用于接口联调。",
  };
  return {
    ...status,
    providerPreflightPlan: createProviderPreflightPlan(status),
  };
}

function flattenNews(newsByMarket = {}) {
  return Object.entries(newsByMarket).flatMap(([market, items]) =>
    (items || []).map((item) => ({ ...item, market: item.market || market })),
  );
}

function matchesSymbol(item, symbol) {
  if (!symbol) return true;
  const code = normalizeCode(symbol);
  if (normalizeCode(item.code) === code) return true;
  return Array.isArray(item.relatedTickers)
    ? item.relatedTickers.some((ticker) => normalizeCode(ticker) === code)
    : false;
}

function sortByImportance(items) {
  return [...items].sort((left, right) => {
    const importanceDiff =
      Number(right.importanceScore || right.importance || 0) -
      Number(left.importanceScore || left.importance || 0);
    if (importanceDiff !== 0) return importanceDiff;
    return String(right.publishedAt || "").localeCompare(String(left.publishedAt || ""));
  });
}

export function createNewsFilingsProviderAdapter({
  env = process.env,
  newsByMarket = {},
  filings = [],
  publicStatements = [],
  fetchImpl = fetch,
} = {}) {
  const fixtureNews = flattenNews(newsByMarket);
  const fixtures = { news: fixtureNews, filings, publicStatements };
  const config = readConfig(env);
  const status = createStatus(config, fixtures);

  function fixtureImportantNews(input = {}) {
    const market = normalizeMarket(input.market);
    const symbol = input.symbol || input.code || input.ticker;
    const minImportance = Number.isFinite(Number(input.minImportance))
      ? Number(input.minImportance)
      : 0;
    const candidates = fixtureNews
      .filter((item) => {
        const marketMatches = !market || item.market === market;
        const symbolMatches = matchesSymbol(item, symbol);
        return marketMatches && symbolMatches;
      })
      .map((item) => ({
        ...item,
        ...explainImportance(item),
      }))
      .filter((item) => Number(item.importanceScore || 0) >= minImportance);
    const dedupedItems = dedupeItems(candidates);
    const items = sortByImportance(dedupedItems).map((item) => ({
      ...item,
      source: sourceForNews(item),
      mode: "fixture",
    }));

    if (!fixtureNews.length) {
      return {
        status: "ok",
        mode: "no-real-data",
        market,
        symbol: symbol || "",
        items: [],
        processing: status.processing,
        deduplication: {
          inputCount: 0,
          outputCount: 0,
          duplicateCount: 0,
        },
        sourceStatus: "no-real-provider-data",
        disclaimer: "当前严格真实数据模式下不会返回本地样例新闻；没有真实 provider 结果时保持空白。",
      };
    }

    return {
      status: "ok",
      mode: "fixture",
      market,
      symbol: symbol || "",
      items,
      processing: status.processing,
      deduplication: {
        inputCount: candidates.length,
        outputCount: items.length,
        duplicateCount: Math.max(0, candidates.length - items.length),
      },
      sourceStatus: "sample-fixture",
      disclaimer: fixtureDisclaimer(),
    };
  }

  return {
    id: status.id,
    status() {
      return status;
    },
    async listImportantNews(input = {}) {
      const relayErrors = [];
      if (status.alphaVantageNewsConnector?.canRequestProvider) {
        const providerResult = await fetchAlphaVantageNews({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "alpha-vantage-news-sentiment-v1",
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        relayErrors.push(providerResult.error);
      }

      if (status.yahooFinanceRssConnector?.canRequestProvider) {
        const providerResult = await fetchYahooFinanceRssNews({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "yahoo-finance-rss-v1",
              relayFallbackFrom: relayErrors.length ? "alpha-vantage-news" : "",
            },
            providerRelay: {
              attemptedProviders: [
                ...(status.alphaVantageNewsConnector?.canRequestProvider ? ["alpha-vantage-news"] : []),
                "yahoo-finance-rss",
              ],
              failedProviders: relayErrors.map((error) => error?.code || "unknown"),
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        relayErrors.push(providerResult.error);
      }

      if (status.googleNewsRssConnector?.canRequestProvider) {
        const providerResult = await fetchGoogleNewsRssNews({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "google-news-rss-v1",
              relayFallbackFrom: relayErrors.length ? "alpha-vantage-news/yahoo-finance-rss" : "",
            },
            providerRelay: {
              attemptedProviders: [
                ...(status.alphaVantageNewsConnector?.canRequestProvider ? ["alpha-vantage-news"] : []),
                ...(status.yahooFinanceRssConnector?.canRequestProvider ? ["yahoo-finance-rss"] : []),
                "google-news-rss",
              ],
              failedProviders: relayErrors.map((error) => error?.code || "unknown"),
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        relayErrors.push(providerResult.error);
      }

      if (status.gdeltNewsConnector?.canRequestProvider) {
        const providerResult = await fetchGdeltDocNews({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "gdelt-doc-news-v1",
              relayFallbackFrom: relayErrors.length ? "alpha-vantage-news" : "",
            },
            providerRelay: {
              attemptedProviders: [
                ...(status.alphaVantageNewsConnector?.canRequestProvider ? ["alpha-vantage-news"] : []),
                ...(status.yahooFinanceRssConnector?.canRequestProvider ? ["yahoo-finance-rss"] : []),
                ...(status.googleNewsRssConnector?.canRequestProvider ? ["google-news-rss"] : []),
                "gdelt-doc-news",
              ],
              failedProviders: relayErrors.map((error) => error?.code || "unknown"),
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        relayErrors.push(providerResult.error);
      }

      const emptyResult = fixtureImportantNews(input);
      return {
        ...emptyResult,
        providerError: relayErrors[0],
        providerRelay: {
          attemptedProviders: [
            ...(status.alphaVantageNewsConnector?.canRequestProvider ? ["alpha-vantage-news"] : []),
            ...(status.yahooFinanceRssConnector?.canRequestProvider ? ["yahoo-finance-rss"] : []),
            ...(status.googleNewsRssConnector?.canRequestProvider ? ["google-news-rss"] : []),
            ...(status.gdeltNewsConnector?.canRequestProvider ? ["gdelt-doc-news"] : []),
          ],
          failedProviders: relayErrors.map((error) => error?.code || "unknown"),
        },
        sourceStatus:
          fixtureNews.length && !status.gdeltNewsConnector?.canRequestProvider
            ? "provider-error-fixture-fallback"
            : "provider-error-empty-no-fixture",
      };
    },
    async listCompanyFilings(input = {}) {
      const market = normalizeMarket(input.market);
      const symbol = input.symbol || input.code || input.ticker;
      const providerErrors = [];
      const fixtureCompanyFilings = () => {
        if (!filings.length) {
          return {
            status: "ok",
            mode: "no-real-data",
            market,
            symbol: symbol || "",
            items: [],
            processing: status.processing,
            sourceStatus: "no-real-provider-data",
            disclaimer: "当前严格真实数据模式下不会返回本地样例公告；没有真实 provider 结果时保持空白。",
          };
        }

        const items = sortByImportance(
          filings.filter((item) => {
            const marketMatches = !market || item.market === market;
            return marketMatches && matchesSymbol(item, symbol);
          }),
        ).map((item) => ({
          ...item,
          ...explainImportance(item),
        }));

        return {
          status: "ok",
          mode: "fixture",
          market,
          symbol: symbol || "",
          items,
          processing: status.processing,
          sourceStatus: "sample-fixture",
          disclaimer: fixtureDisclaimer(),
        };
      };

      if (market === "a" && config.filingsNetworkEnabled) {
        const providerResult = await fetchSseCompanyBulletins({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "sse-company-bulletins-v1",
            },
            providerRelay: {
              attemptedProviders: ["sse-company-bulletins"],
              failedProviders: [],
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        providerErrors.push(providerResult.error);
      }

      if (market === "hk" && status.hkexFilingsConnector?.canRequestProvider) {
        const providerResult = await fetchHkexCompanyAnnouncements({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "hkex-company-announcements-v1",
            },
            providerRelay: {
              attemptedProviders: ["hkex-company-announcements"],
              failedProviders: [],
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        providerErrors.push(providerResult.error);
      }

      if ((!market || market === "us") && status.secFilingsConnector?.canRequestProvider) {
        const providerResult = await fetchSecCompanySubmissions({ config, input, fetchImpl });
        if (providerResult.status === "ok") {
          const items = sortByImportance(
            providerResult.items.map((item) => ({
              ...item,
              ...explainImportance(item),
            })),
          );
          return {
            ...providerResult,
            items,
            processing: {
              ...status.processing,
              providerNormalization: "sec-company-submissions-v1",
            },
            deduplication: {
              inputCount: providerResult.items.length,
              outputCount: items.length,
              duplicateCount: 0,
            },
          };
        }
        providerErrors.push(providerResult.error);
        return {
          ...fixtureCompanyFilings(),
          providerError: providerErrors[0],
          providerRelay: {
            attemptedProviders: [
              ...(market === "a" && config.filingsNetworkEnabled ? ["sse-company-bulletins"] : []),
              ...(market === "hk" && status.hkexFilingsConnector?.canRequestProvider ? ["hkex-company-announcements"] : []),
              "sec-company-submissions",
            ],
            failedProviders: providerErrors.map((error) => error?.code || "unknown"),
          },
          sourceStatus: filings.length ? "provider-error-fixture-fallback" : "provider-error-empty-no-fixture",
        };
      }

      return {
        ...fixtureCompanyFilings(),
        providerError: providerErrors[0],
        providerRelay: {
          attemptedProviders: [
            ...(market === "a" && config.filingsNetworkEnabled ? ["sse-company-bulletins"] : []),
            ...(market === "hk" && status.hkexFilingsConnector?.canRequestProvider ? ["hkex-company-announcements"] : []),
          ],
          failedProviders: providerErrors.map((error) => error?.code || "unknown"),
        },
        sourceStatus: providerErrors.length
          ? (filings.length ? "provider-error-fixture-fallback" : "provider-error-empty-no-fixture")
          : (filings.length ? "sample-fixture" : "no-real-provider-data"),
      };
    },
    listPublicStatements(input = {}) {
      const market = normalizeMarket(input.market);
      const symbol = input.symbol || input.code || input.ticker;
      if (!publicStatements.length) {
        return {
          status: "ok",
          mode: "no-real-data",
          market,
          symbol: symbol || "",
          items: [],
          processing: status.processing,
          sourceStatus: "no-real-provider-data",
          disclaimer: "当前严格真实数据模式下不会返回本地样例公开言论；没有官方 API 或人工导入结果时保持空白。",
        };
      }
      const items = sortByImportance(
        publicStatements.filter((item) => {
          const marketMatches = !market || item.market === market;
          return marketMatches && matchesSymbol(item, symbol);
        }),
      ).map((item) => ({
        ...item,
        ...explainImportance(item),
        source: {
          id: "local-fixture-public-statements",
          label: "Mock 公开言论样例",
          licenseTag: "sample-fixture-not-verified-live-statement",
          attributionRequired: true,
        },
      }));

      return {
        status: "ok",
        mode: "fixture",
        market,
        symbol: symbol || "",
        items,
        processing: status.processing,
        sourceStatus: "sample-fixture",
        disclaimer: fixtureDisclaimer(),
      };
    },
  };
}
