import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  toggle(name, force) {
    const shouldAdd = force ?? !this.values.has(name);
    if (shouldAdd) {
      this.values.add(name);
    } else {
      this.values.delete(name);
    }
    return shouldAdd;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(id, dataset = {}) {
    this.id = id;
    this.dataset = dataset;
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.style = {
      values: {},
      setProperty: (name, value) => {
        this.style.values[name] = value;
      },
    };
    this.checked = false;
    this.disabled = false;
    this.className = "";
    this.hidden = false;
    this.innerHTML = "";
    this.open = false;
    this.textContent = "";
    this.value = "";
    this.attributes = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  click(event = {}) {
    return this.dispatch("click", event);
  }

  dispatch(type, event = {}) {
    const handlers = this.listeners.get(type) || [];
    const baseEvent = {
      currentTarget: this,
      target: this,
      preventDefault: () => {},
      ...event,
    };
    return Promise.all(handlers.map((handler) => handler(baseEvent)));
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  remove() {}
}

function createLocalStorage(initialValues = {}) {
  const store = new Map(Object.entries(initialValues));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    snapshot: () => Object.fromEntries(store.entries()),
  };
}

function createHarness(storageSeed = {}, options = {}) {
  const ids = [
    "stockSearch",
    "searchButton",
    "overview",
    "statusMessage",
    "suggestionChips",
    "recentSearchBlock",
    "recentSearchChips",
    "clearRecentSearches",
    "recentSearchPrivacyNote",
    "riskProfile",
    "selectedStockName",
    "stockCoverageNote",
    "impactBadge",
    "upsideRing",
    "upsideValue",
    "downsideValue",
    "sentimentScore",
    "valuationScore",
    "technicalScore",
    "confidenceScore",
    "actionText",
    "tradePlan",
    "trendSummary",
    "trendSource",
    "trendChart",
    "scenarioAnalysis",
    "analysisState",
    "reasonList",
    "factorBreakdown",
    "analysisProcess",
    "analysisBasis",
    "riskBox",
    "riskText",
    "newsTitle",
    "newsList",
    "autoIngestionButton",
    "autoIngestionState",
    "addWatchButton",
    "watchlistItems",
    "watchlistHint",
    "projectProgressState",
    "settings",
    "dataSourceState",
    "aiServiceState",
    "complianceServiceState",
    "repositoryState",
    "databaseState",
    "auditServiceState",
    "jobRunnerState",
    "schedulerState",
    "accountState",
    "notificationStatus",
    "notificationChannelState",
    "notificationServiceState",
    "reminderForm",
    "reminderStock",
    "reminderType",
    "reminderThreshold",
    "reminderRules",
    "notificationCenter",
    "portfolioForm",
    "buyPrice",
    "holdingQty",
    "buyDate",
    "targetReturn",
    "maxLoss",
    "portfolioSyncState",
    "portfolioSummary",
    "termDialog",
    "termTitle",
    "termBody",
    "closeTermDialog",
    "installButton",
  ];

  const byId = new Map(ids.map((id) => [id, new FakeElement(id)]));
  byId.get("recentSearchPrivacyNote").textContent = "仅保存在本机浏览器，可随时清空。";
  const searchAssist = new FakeElement("searchAssist");
  const contentGrid = new FakeElement("contentGrid");
  const tabButtons = [
    new FakeElement("tabA", { market: "a" }),
    new FakeElement("tabHk", { market: "hk" }),
    new FakeElement("tabUs", { market: "us" }),
  ];
  const termButtons = [
    new FakeElement("termMarketSentiment", { term: "marketSentiment" }),
    new FakeElement("termValuation", { term: "valuation" }),
    new FakeElement("termTechnical", { term: "technical" }),
    new FakeElement("termConfidenceScore", { term: "confidenceScore" }),
  ];
  const notificationInputs = [
    new FakeElement("notificationInApp", { notification: "inApp" }),
    new FakeElement("notificationEmail", { notification: "email" }),
    new FakeElement("notificationSms", { notification: "sms" }),
    new FakeElement("notificationWechat", { notification: "wechat" }),
    new FakeElement("notificationTelegram", { notification: "telegram" }),
  ];

  const document = {
    body: {
      appendChild: () => {},
    },
    createElement(tagName) {
      const element = new FakeElement(tagName);
      if (tagName === "a") {
        element.click = () => {
          downloads.push({ href: element.href || "", filename: element.download || "" });
        };
      }
      return element;
    },
    querySelector(selector) {
      if (selector.startsWith("#")) return byId.get(selector.slice(1));
      if (selector === ".search-assist") return searchAssist;
      if (selector === ".content-grid") return contentGrid;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".tab-button") return tabButtons;
      if (selector === ".term-button") return termButtons;
      if (selector === "[data-notification]") return notificationInputs;
      return [];
    },
  };

  const localStorage = createLocalStorage(storageSeed);
  const downloads = [];
  const objectUrls = [];
  const windowListeners = new Map();
  const addWindowEventListener = (type, handler) => {
    const handlers = windowListeners.get(type) || [];
    handlers.push(handler);
    windowListeners.set(type, handlers);
  };
  const dispatchWindowEvent = (type, event = {}) => {
    const handlers = windowListeners.get(type) || [];
    const baseEvent = {
      preventDefault: () => {},
      ...event,
    };
    return Promise.all(handlers.map((handler) => handler(baseEvent)));
  };
  class FakeBlob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || "";
      this.size = parts.reduce((total, part) => total + (part?.length || part?.byteLength || 0), 0);
    }
  }
  const urlApi = {
    createObjectURL: (blob) => {
      const href = `blob:test-${objectUrls.length + 1}`;
      objectUrls.push({ href, blob });
      return href;
    },
    revokeObjectURL: () => {},
  };
  const context = {
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    Blob: FakeBlob,
    document,
    localStorage,
    navigator: options.navigatorImpl || {},
    URL: urlApi,
    window: {
      addEventListener: addWindowEventListener,
      atob: (value) => Buffer.from(value, "base64").toString("binary"),
      Blob: FakeBlob,
      clearTimeout: () => {},
      fetch: options.fetchImpl,
      setTimeout: options.setTimeoutImpl || (() => 1),
      URL: urlApi,
      __financeAiAnalysisTimeoutMs: options.analysisTimeoutMs,
    },
    fetch: options.fetchImpl,
  };
  if (options.webkitImpl) {
    context.window.webkit = options.webkitImpl;
  }
  if (options.notificationImpl) {
    context.window.Notification = options.notificationImpl;
  }
  context.globalThis = context;
  context.window.window = context.window;
  context.window.document = document;
  context.window.localStorage = localStorage;
  context.window.navigator = context.navigator;
  if (options.location) {
    context.window.location = options.location;
    context.location = options.location;
  }

  vm.runInNewContext(appSource, context, { filename: "app.js" });

  return {
    byId,
    context,
    dispatchWindowEvent,
    downloads,
    localStorage,
    objectUrls,
    notificationInputs,
    searchAssist,
    contentGrid,
    tabButtons,
    termButtons,
  };
}

function eventTargetFor(selector, dataset) {
  return {
    closest(query) {
      return query === selector ? { dataset } : null;
    },
  };
}

function requestedStockSearchUrl(requestedUrls, keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  return requestedUrls.some((url) => {
    const value = String(url);
    return value.includes(`/api/stocks/search?q=${encodedKeyword}`);
  });
}

function createStartupBackendFetch(requestedUrls = []) {
  return async (url) => {
    requestedUrls.push(url);
    if (url.endsWith("/health")) {
      return {
        ok: true,
        json: async () => ({
          status: "ok",
          service: "finance-ai-assistant-backend",
          version: "0.1.0",
        }),
      };
    }
    if (url.endsWith("/api/data-sources")) {
      return {
        ok: true,
        json: async () => ({
          activeProvider: {
            id: "mock",
            name: "Mock Sample Provider",
            mode: "sample",
            status: "connected",
            coverage: ["a", "hk", "us"],
            capabilities: ["markets", "stockSearch", "marketNews", "analysisInputs"],
          },
        }),
      };
    }
    if (url.endsWith("/api/project/progress")) {
      return {
        ok: true,
        json: async () => ({
          progress: {
            id: "finance-ai-project-progress",
            updatedAt: "2026-06-10",
            source: "backend-computed-readiness-strict-real-data",
            localDemoPercent: 100,
            publicLaunchPercent: 80,
            completed: ["项目进度已从后端接口提供，前端连接后端时同步显示", "后台自动连接提示不再覆盖用户刚完成的搜索反馈", "metadata-only 股票搜索结果会明确提示不代表行情、新闻或 AI 分析已接入", "股票标题区固定显示当前数据覆盖和真实数据缺口", "股票标题区数据覆盖提示已拆成股票、行情、新闻、AI 四个分项", "股票标题区数据覆盖提示新增公告、宏观分项", "每日开发日志已延续到 2026-06-10"],
            blockers: ["真实行情/新闻/公告/宏观数据源与授权"],
            readiness: [
              {
                id: "data-sources",
                label: "真实数据源接入门禁",
                percent: 100,
                status: "blocked",
                blocker: "数据授权未接入。",
                evidence: { passedChecks: 32, totalChecks: 35, blockedChecks: 3, sourceEndpoints: ["/api/data-sources", "/api/data-sources/ingestion-channels", "/api/data-sources/auto-ingestion-run", "/api/data-sources/integration-plan", "/api/data-sources/provider-registry", "/api/data-sources/vendor-readiness", "/api/data-sources/vendor-contract-handoff", "/api/data-sources/provider-secret-quota-runbook", "/api/data-sources/provider-setup-guide", "/api/data-sources/market-data-vendor-checklist", "/api/data-sources/news-filings-vendor-checklist", "/api/data-sources/macro-data-vendor-checklist", "/api/data-sources/public-statements-vendor-checklist", "/api/data-sources/market-data-adapter", "/api/market-data/quote", "/api/data-sources/news-filings-adapter", "/api/news/intelligence", "/api/news/filings"] },
              },
              {
                id: "ai-analysis",
                label: "真实 AI 分析",
                percent: 94,
                status: "blocked",
                blocker: "真实模型未接入。",
                evidence: { passedChecks: 24, totalChecks: 26, blockedChecks: 2, sourceEndpoints: ["/api/ai-services", "/api/ai-services/provider-adapter", "/api/ai-services/model-provider-setup-guide", "/api/ai-services/local-model-config", "/api/data-sources", "/api/news/intelligence", "/api/market-data/quote", "/api/analysis"] },
              },
            ],
            disclaimer: "该进度是项目管理参考。",
          },
        }),
      };
    }
    if (url.includes("/api/news?")) {
      return { ok: true, json: async () => ({ items: [] }) };
    }
    if (url.includes("/api/analysis?")) {
      return {
        ok: true,
        json: async () => ({
          upsideProbability: 66,
          downsideProbability: 34,
          reasons: ["启动时自动连接后的后端分析样例"],
          risks: ["样例后端数据仍不构成投资建议"],
        }),
      };
    }
    if (url.includes("/api/market-data/quote")) {
      return { ok: true, json: async () => ({ quote: null }) };
    }
    if (url.includes("/api/market-data/history")) {
      return { ok: true, json: async () => ({ points: [] }) };
    }
    return { ok: true, json: async () => ({}) };
  };
}

test("search preserves current stock when no result is found", () => {
  const app = createHarness({
    selectedMarket: "us",
    selectedStockCode: "AAPL",
  });

  app.byId.get("stockSearch").value = "NO_MATCH_STOCK";
  app.byId.get("searchButton").click();

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("statusMessage").textContent, /未找到/);
  assert.match(app.byId.get("statusMessage").className, /warning/);
});

test("watchlist add gives feedback and prevents duplicates", () => {
  const app = createHarness();

  app.byId.get("addWatchButton").click();
  app.byId.get("addWatchButton").click();

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["MSFT"]);
  assert.match(app.byId.get("watchlistItems").innerHTML, /Microsoft/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /规则参考 待模型/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /完整 AI 待模型/);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /上涨参考概率 待AI模型|AI 待真实模型/);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /上涨参考概率 \d+%|偏利好|偏谨慎/);
  assert.match(app.byId.get("statusMessage").textContent, /已在自选股中/);
});

test("watchlist card distinguishes rule reference from full AI pending", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "cn",
      selectedStockCode: "600519",
      watchlist: JSON.stringify(["600519"]),
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              riskProfile: "balanced",
              modelReference: true,
              analysisMode: "real-data-rule-reference",
              upsideProbability: 54,
              downsideProbability: 46,
              sentimentScore: 58,
              valuationScore: 52,
              technicalScore: 49,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["真实数据规则参考已生成。"],
              risks: ["完整 AI 模型仍待生成。"],
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
              analysisService: {
                id: "real-data-rule-reference",
                mode: "real-data-rule-reference",
                model: "deterministic-real-data-v1",
              },
              disclaimer: "真实数据规则参考仅供研究辅助。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              quote: {
                symbol: "600519",
                price: 1500,
                source: { type: "real-provider-quote", label: "Real Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  assert.match(app.byId.get("watchlistItems").innerHTML, /规则参考 待模型/);

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.match(app.byId.get("watchlistItems").innerHTML, /贵州茅台/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /规则参考 54%/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /完整 AI 待模型/);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /上涨参考概率 待AI模型|AI 待真实模型/);
});

test("watchlist card reuses current analysis by code when market metadata is absent", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
      watchlist: JSON.stringify(["600519"]),
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-provider",
              analysisService: { mode: "real-provider", id: "real-ai-analysis" },
              upsideProbability: 55,
              downsideProbability: 45,
              confidenceScore: 44,
              actionReference: "完整 AI 参考：保持观察。",
              reasons: ["完整 AI 输出已通过结构化校验。"],
              risks: ["仍需持续核对真实来源。"],
              inputCoverage: {
                marketData: "missing",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-provider",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.match(app.byId.get("watchlistItems").innerHTML, /贵州茅台/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /AI 参考 55%/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /AI 已生成/);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /规则参考 待模型|完整 AI 待模型/);
});

test("watchlist card falls back to visible current rule metrics", () => {
  const app = createHarness({
    selectedMarket: "a",
    selectedStockCode: "600519",
  });

  app.byId.get("upsideValue").textContent = "54%";
  app.byId.get("downsideValue").textContent = "46%";
  app.byId.get("impactBadge").textContent = "规则参考";
  app.byId.get("analysisState").textContent = "规则参考 已生成 完整 AI 未生成";

  app.byId.get("addWatchButton").click();

  assert.match(app.byId.get("watchlistItems").innerHTML, /贵州茅台/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /规则参考 54%/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /完整 AI 待模型/);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /规则参考 待模型|上涨参考概率 待AI模型/);
});

test("single watchlist card can reuse visible metrics when title is stale", () => {
  const app = createHarness({
    selectedMarket: "a",
    selectedStockCode: "600519",
  });

  app.byId.get("selectedStockName").textContent = "Microsoft · MSFT";
  app.byId.get("upsideValue").textContent = "54%";
  app.byId.get("impactBadge").textContent = "规则参考";
  app.byId.get("analysisState").textContent = "规则参考 已生成 完整 AI 未生成";

  app.byId.get("addWatchButton").click();

  assert.match(app.byId.get("watchlistItems").innerHTML, /贵州茅台/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /规则参考 54%/);
  assert.match(app.byId.get("watchlistItems").innerHTML, /完整 AI 待模型/);
});

test("watchlist item can be removed", () => {
  const app = createHarness();

  app.byId.get("addWatchButton").click();
  app.byId.get("watchlistItems").dispatch("click", {
    target: eventTargetFor("[data-remove-watch]", { removeWatch: "MSFT" }),
  });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist") || "[]"), []);
  assert.match(app.byId.get("watchlistItems").innerHTML, /还没有自选股/);
  assert.equal(app.byId.get("watchlistHint").hidden, true);
  assert.match(app.byId.get("statusMessage").textContent, /已移除自选/);
});

test("watchlist item selection clears stale search keyword", () => {
  const app = createHarness({
    selectedMarket: "us",
    selectedStockCode: "AAPL",
    watchlist: JSON.stringify(["AAPL"]),
  });
  app.localStorage.setItem("lastSearch", "Apple");
  assert.equal(app.localStorage.getItem("lastSearch"), "Apple");

  app.byId.get("stockSearch").value = "腾讯控股";
  app.byId.get("watchlistItems").dispatch("click", {
    target: eventTargetFor("[data-select-watch]", { selectWatch: "AAPL" }),
  });

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.equal(app.byId.get("stockSearch").value, "");
  assert.equal(app.localStorage.getItem("lastSearch"), null);
  assert.match(app.byId.get("statusMessage").textContent, /已切换到自选股：Apple/);
});

test("startup clears saved last search that does not match selected stock", () => {
  const app = createHarness({
    selectedMarket: "a",
    selectedStockCode: "600519",
    lastSearch: "Apple",
  });

  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.equal(app.byId.get("stockSearch").value, "");
  assert.equal(app.localStorage.getItem("lastSearch"), null);
});

test("startup keeps saved last search when it matches selected stock", () => {
  const app = createHarness({
    selectedMarket: "us",
    selectedStockCode: "AAPL",
    lastSearch: "Apple",
  });

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.equal(app.byId.get("stockSearch").value, "");
  assert.equal(app.localStorage.getItem("lastSearch"), null);
});

test("watchlist renders empty state by default", () => {
  const app = createHarness();

  assert.match(app.byId.get("watchlistItems").innerHTML, /还没有自选股/);
  assert.equal(app.byId.get("watchlistHint").hidden, true);
});

test("data source card shows public preview recovery access summary", () => {
  const app = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiPublicPreviewAccess: JSON.stringify({
      status: "healthy",
      currentOrigin: "https://fresh-demo.lhr.life",
      recommendedAccess: {
        mode: "public",
        url: "https://fresh-demo.lhr.life",
        label: "当前公网临时入口",
        reason: "当前页面和 watchdog 记录显示临时公网入口可用。",
      },
      accessEntries: [
        {
          id: "fixed-hosting",
          label: "固定线上测试环境",
          url: "",
          status: "missing",
          available: false,
          external: true,
          scope: "外部稳定测试",
          warning: "尚未完成固定托管和连续健康门禁。",
          nextStep: "创建 Render/Vercel/Netlify 固定服务并运行 2-3 分钟连续验收。",
        },
        {
          id: "temporary-public",
          label: "当前公网临时入口",
          url: "https://fresh-demo.lhr.life",
          status: "ready-temporary",
          available: true,
          external: true,
          scope: "短时间外部测试",
          warning: "lhr.life 是临时隧道，可能轮换或返回 503 / no tunnel here :(。",
          nextStep: "可短时间测试；正式演示前仍需连续健康检查。",
        },
        {
          id: "standby-public-1",
          label: "备用公网临时入口 1",
          url: "https://standby-demo.lhr.life",
          status: "ready-standby",
          available: true,
          external: true,
          scope: "短时间外部备用",
          warning: "备用 lhr.life 仍是临时隧道，只用于主入口掉线后的短期恢复。",
          nextStep: "主公网入口掉线时可临时切换到这个备用链接。",
        },
        {
          id: "local-fallback",
          label: "本机备用入口",
          url: "http://127.0.0.1:4192",
          status: "healthy",
          available: true,
          external: false,
          scope: "仅本机/同一台电脑",
          warning: "外部用户不能访问 127.0.0.1。",
          nextStep: "公网掉线时用于继续开发和排查。",
        },
      ],
      temporaryTunnel: {
        enabled: true,
        provider: "localhost.run lhr.life",
        warning: "这是临时隧道，可能轮换或返回 503 / no tunnel here :(。",
      },
      watchdog: {
        ok: true,
        status: "healthy",
        publicUrl: "https://fresh-demo.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
        healthCycleCount: 3,
        healthWindowSeconds: 180,
        healthIterationCount: 12,
        healthStartedAt: "2026-06-14T09:57:00.000Z",
        healthEndedAt: "2026-06-14T10:00:00.000Z",
        healthRequiredEndpoints: ["/", "/health", "/api/health", "/api/analysis?symbol=MSFT&riskProfile=balanced"],
        restartCount: 1,
        transientFailureCount: 0,
        localFallbackOk: true,
      },
      stableHosting: {
        configured: false,
        url: "",
        status: "not-configured",
        nextStep: "仍需部署 Render/Vercel/Netlify 或同类固定线上测试环境。",
      },
      stabilityGate: {
        externalUseReady: false,
        temporaryAccessReady: true,
        temporaryAccessContinuouslyReady: true,
        standbyReadyCount: 1,
        standbyConfiguredCount: 1,
        standbyRequirementPassed: true,
        stableHostedUrl: false,
        temporaryTunnel: true,
        continuousHealthPassed: true,
        requiredDurationSeconds: 180,
        blockers: ["当前公网入口仍是临时 lhr.life 隧道，可能轮换或返回 503。"],
        userMessage: "当前入口只适合短时间测试；外部稳定演示仍需固定托管和连续健康门禁。",
      },
      localFallback: {
        url: "http://127.0.0.1:4192",
        status: "healthy",
        note: "仅适用于本机或同一台电脑测试。",
      },
      healthGate: {
        durationSeconds: 180,
        intervalSeconds: 15,
        lastWindowSeconds: 180,
        lastIterationCount: 12,
        lastFailureType: "",
        requiredEndpointCoverage: true,
        standbyReadyCount: 1,
        standbyConfiguredCount: 1,
        standbyRequirementPassed: true,
        requiredEndpoints: ["/", "/health", "/api/health", "/api/analysis?symbol=MSFT&riskProfile=balanced"],
      },
    }),
  });

  const html = app.byId.get("dataSourceState").innerHTML;
  assert.match(html, /当前公网临时入口/);
  assert.match(html, /https:\/\/fresh-demo\.lhr\.life/);
  assert.match(html, /固定线上测试环境/);
  assert.match(html, /当前公网临时入口[\s\S]*可用 · 短时间外部测试/);
  assert.match(html, /备用公网临时入口 1[\s\S]*可用 · 短时间外部备用/);
  assert.match(html, /https:\/\/standby-demo\.lhr\.life/);
  assert.match(html, /本机备用入口[\s\S]*本机可用 · 仅本机\/同一台电脑/);
  assert.match(html, /外部用户不能访问 127\.0\.0\.1/);
  assert.match(html, /连续检查：180 秒 \/ 4 个端点/);
  assert.match(html, /最近监控：180 秒 \/ 12 轮/);
  assert.match(html, /最近失败：无/);
  assert.match(html, /临时入口连续健康：已通过/);
  assert.match(html, /备用入口：1 个健康 \/ 1 个已生成/);
  assert.match(html, /本机备用：http:\/\/127\.0\.0\.1:4192/);
  assert.match(html, /固定托管未配置/);
  assert.match(html, /稳定访问门禁：未通过/);
  assert.match(html, /外部稳定演示仍需固定托管和连续健康门禁/);
  assert.match(html, /no tunnel here/);
});

test("watchlist renders loading and error states with retry", async () => {
  const loadingApp = createHarness({
    prototypeWatchlistState: "loading",
  });
  assert.match(loadingApp.byId.get("watchlistItems").innerHTML, /正在同步自选股/);

  const errorApp = createHarness({
    prototypeWatchlistState: "error",
  });
  assert.match(errorApp.byId.get("watchlistItems").innerHTML, /自选股同步失败/);
  assert.match(errorApp.byId.get("watchlistItems").innerHTML, /data-retry-watchlist/);

  await errorApp.byId.get("watchlistItems").dispatch("click", {
    target: eventTargetFor("[data-retry-watchlist]", {}),
  });

  assert.equal(errorApp.localStorage.getItem("prototypeWatchlistState"), null);
  assert.match(errorApp.byId.get("watchlistItems").innerHTML, /还没有自选股/);
  assert.match(errorApp.byId.get("statusMessage").textContent, /已重新读取本机自选股/);
});

test("market tabs switch selected stock and news", () => {
  const app = createHarness();

  app.tabButtons[1].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "腾讯控股 · 0700");
  assert.equal(app.byId.get("newsTitle").textContent, "港股重点新闻");
  assert.equal(app.localStorage.getItem("selectedMarket"), "hk");
  assert.equal(app.localStorage.getItem("selectedStockCode"), "0700");

  app.tabButtons[2].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.equal(app.byId.get("newsTitle").textContent, "美股重点新闻");
});

test("market tab switch clears stale search keyword", () => {
  const app = createHarness();

  app.byId.get("stockSearch").value = "Apple";
  app.localStorage.setItem("lastSearch", "Apple");
  assert.equal(app.localStorage.getItem("lastSearch"), "Apple");

  app.tabButtons[1].click();

  assert.equal(app.byId.get("selectedStockName").textContent, "腾讯控股 · 0700");
  assert.equal(app.byId.get("stockSearch").value, "");
  assert.equal(app.localStorage.getItem("lastSearch"), null);
  assert.match(app.byId.get("statusMessage").textContent, /已切换到港股市场/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /样例市场/);
});

test("quick stock chips switch from Apple to HK or A-share without stale search state", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
      lastSearch: "Apple",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");

  await app.searchAssist.dispatch("click", {
    target: eventTargetFor("[data-search-keyword]", {
      searchKeyword: "腾讯控股",
      shortcutStockCode: "0700",
      shortcutStockMarket: "hk",
    }),
  });

  assert.equal(app.byId.get("selectedStockName").textContent, "腾讯控股 · 0700");
  assert.equal(app.byId.get("stockSearch").value, "腾讯控股");
  assert.equal(app.localStorage.getItem("lastSearch"), "腾讯控股");
  assert.match(app.byId.get("statusMessage").textContent, /已切换到 腾讯控股 · 0700/);
  assert.equal(requestedUrls.some((url) => url.includes("/api/stocks/search")), false);

  await app.searchAssist.dispatch("click", {
    target: eventTargetFor("[data-search-keyword]", {
      searchKeyword: "贵州茅台",
      shortcutStockCode: "600519",
      shortcutStockMarket: "a",
    }),
  });

  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.equal(app.byId.get("stockSearch").value, "贵州茅台");
  assert.equal(app.localStorage.getItem("lastSearch"), "贵州茅台");
});

test("backend stock search switches from stale Apple state to HK and A-share results", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
      lastSearch: "Apple",
      recentSearches: JSON.stringify(["Apple"]),
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1")) {
          return {
            ok: true,
            json: async () => ({
              query: "腾讯控股",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "0700", name: "腾讯控股", market: "hk", source: "metadata-only-catalog" }],
            }),
          };
        }
        if (url.includes("/api/stocks/search?q=%E8%B4%B5%E5%B7%9E%E8%8C%85%E5%8F%B0")) {
          return {
            ok: true,
            json: async () => ({
              query: "贵州茅台",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "600519", name: "贵州茅台", market: "a", source: "metadata-only-catalog" }],
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");

  app.byId.get("stockSearch").value = "腾讯控股";
  await app.context.window.financeAIAssistantApp.searchStock();

  assert.ok(requestedStockSearchUrl(requestedUrls, "腾讯控股"));
  assert.equal(app.byId.get("selectedStockName").textContent, "腾讯控股 · 0700");
  assert.equal(app.byId.get("stockSearch").value, "腾讯控股");
  assert.equal(app.localStorage.getItem("lastSearch"), "腾讯控股");
  assert.match(app.byId.get("statusMessage").textContent, /已通过后端 API 选择 腾讯控股 · 0700/);

  app.byId.get("stockSearch").value = "贵州茅台";
  await app.context.window.financeAIAssistantApp.searchStock();

  assert.ok(requestedStockSearchUrl(requestedUrls, "贵州茅台"));
  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.equal(app.byId.get("stockSearch").value, "贵州茅台");
  assert.equal(app.localStorage.getItem("lastSearch"), "贵州茅台");
  assert.deepEqual(JSON.parse(app.localStorage.getItem("recentSearches")), [
    "贵州茅台",
    "腾讯控股",
    "Apple",
  ]);
});

test("news section renders loading state", () => {
  const app = createHarness({
    prototypeNewsState: "loading",
  });

  assert.match(app.byId.get("newsList").innerHTML, /正在更新财经新闻/);
  assert.match(app.byId.get("newsList").innerHTML, /role="status"/);
});

test("news section renders empty state", () => {
  const app = createHarness({
    prototypeNewsState: "empty",
  });

  assert.match(app.byId.get("newsList").innerHTML, /暂未发现高重要性新闻/);
  assert.doesNotMatch(app.byId.get("newsList").innerHTML, /news-item/);
});

test("news section renders error state and retry keeps strict blank news", async () => {
  const app = createHarness({
    prototypeNewsState: "error",
  });

  assert.match(app.byId.get("newsList").innerHTML, /新闻更新失败/);
  assert.match(app.byId.get("newsList").innerHTML, /data-retry-news/);

  await app.byId.get("newsList").dispatch("click", {
    target: eventTargetFor("[data-retry-news]", {}),
  });

  assert.equal(app.localStorage.getItem("prototypeNewsState"), null);
  assert.match(app.byId.get("newsList").innerHTML, /暂未发现高重要性新闻/);
  assert.match(app.byId.get("newsList").innerHTML, /严格真实数据模式/);
  assert.match(app.byId.get("statusMessage").textContent, /当前没有真实新闻数据/);
  assert.doesNotMatch(app.byId.get("newsList").innerHTML, /政策继续强调扩大内需|news-item/);
});

test("search suggestion chips search backend and create recent search chips", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      location: { hash: "" },
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({
              query: "Microsoft",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "MSFT", name: "Microsoft", market: "us", source: "metadata-only-catalog" }],
            }),
          };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: { message: "真实 AI 分析 API 暂时不可用。" },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return { ok: true, json: async () => ({ market: "us", sourceStatus: "empty-real-data", items: [] }) };
      },
    },
  );

  await app.searchAssist.dispatch("click", {
    target: eventTargetFor("[data-search-keyword]", { searchKeyword: "Microsoft" }),
  });

  assert.ok(requestedStockSearchUrl(requestedUrls, "Microsoft"));
  assert.equal(app.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
  assert.deepEqual(JSON.parse(app.localStorage.getItem("recentSearches")), ["Microsoft"]);
  assert.equal(app.byId.get("recentSearchBlock").hidden, false);
  assert.match(app.byId.get("recentSearchChips").innerHTML, /Microsoft/);
});

test("empty search clears saved last search keyword", () => {
  const app = createHarness({
    selectedMarket: "us",
    selectedStockCode: "AAPL",
    lastSearch: "Apple",
  });

  assert.equal(app.byId.get("stockSearch").value, "");

  app.byId.get("stockSearch").value = "   ";
  app.byId.get("searchButton").click();

  assert.equal(app.localStorage.getItem("lastSearch"), null);
  assert.equal(app.byId.get("stockSearch").value, "");
  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("statusMessage").textContent, /已清空搜索框/);
});

test("recent search history can be cleared", () => {
  const app = createHarness({
    recentSearches: JSON.stringify(["Apple", "腾讯控股"]),
  });

  assert.equal(app.byId.get("recentSearchBlock").hidden, false);
  assert.match(app.byId.get("recentSearchPrivacyNote").textContent, /仅保存在本机浏览器/);
  assert.match(app.byId.get("recentSearchChips").innerHTML, /Apple/);

  app.byId.get("clearRecentSearches").click();

  assert.deepEqual(JSON.parse(app.localStorage.getItem("recentSearches")), []);
  assert.equal(app.byId.get("recentSearchBlock").hidden, true);
  assert.equal(app.byId.get("recentSearchChips").innerHTML, "");
  assert.match(app.byId.get("statusMessage").textContent, /已清空最近搜索记录/);
});

test("recent search chips escape unsafe keyword HTML", () => {
  const app = createHarness({
    recentSearches: JSON.stringify(['Apple" onclick="alert(1)', "<script>bad</script>"]),
  });

  const rendered = app.byId.get("recentSearchChips").innerHTML;

  assert.match(rendered, /Apple&quot; onclick=&quot;alert\(1\)/);
  assert.match(rendered, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(rendered, /onclick="alert\(1\)"/);
  assert.doesNotMatch(rendered, /<script>bad<\/script>/);
});

test("search chips distinguish quick suggestions from recent searches", () => {
  const app = createHarness({
    recentSearches: JSON.stringify(["腾讯控股"]),
  });

  assert.match(app.byId.get("suggestionChips").innerHTML, /常用：腾讯控股/);
  assert.match(app.byId.get("suggestionChips").innerHTML, /aria-label="常用观察：腾讯控股 0700"/);
  assert.match(app.byId.get("recentSearchChips").innerHTML, /最近：腾讯控股/);
  assert.match(app.byId.get("recentSearchChips").innerHTML, /aria-label="最近搜索：腾讯控股"/);
});

test("risk profile keeps model metrics blank in strict real-data mode and preserves portfolio summary", async () => {
  const app = createHarness();

  app.byId.get("stockSearch").value = "Apple";
  app.byId.get("searchButton").click();
  app.byId.get("buyPrice").value = "100";
  app.byId.get("holdingQty").value = "10";
  app.byId.get("targetReturn").value = "15";
  app.byId.get("portfolioForm").dispatch("submit");

  app.byId.get("riskProfile").value = "aggressive";
  await app.byId.get("riskProfile").dispatch("change", {
    target: app.byId.get("riskProfile"),
  });

  assert.equal(app.byId.get("upsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("sentimentScore").textContent, "待AI模型");
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
  assert.doesNotMatch(app.byId.get("actionText").textContent, /积极模式|目标收益率 15%/);
  assert.equal(app.byId.get("reasonList").hidden, true);
  assert.equal(app.byId.get("portfolioSummary").hidden, false);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /持仓分析参考/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /成本金额：1000.00/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /真实当前价：待真实行情/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /等待真实当前价后计算浮动收益率/);
  assert.doesNotMatch(app.byId.get("portfolioSummary").innerHTML, /样例当前价|样例浮动收益率/);
});

test("portfolio max loss boundary does not fabricate model probabilities in strict real-data mode", async () => {
  const app = createHarness({
    selectedMarket: "us",
    selectedStockCode: "AAPL",
  });

  app.byId.get("buyPrice").value = "220";
  app.byId.get("holdingQty").value = "5";
  app.byId.get("maxLoss").value = "8";
  await app.byId.get("portfolioForm").dispatch("submit");

  assert.equal(app.byId.get("upsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
  assert.equal(app.byId.get("riskBox").hidden, true);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /真实当前价：待真实行情/);
  assert.doesNotMatch(app.byId.get("portfolioSummary").innerHTML, /样例当前价|样例浮动收益率/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /最大可接受亏损 -8%/);
});

test("portfolio summary calculates floating return only after real quote coverage", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: {
                code: "REAL_AI_MODEL_NOT_CONFIGURED",
                message: "真实 AI 模型尚未配置。",
              },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider-relay",
              quote: {
                market: "us",
                code: "AAPL",
                lastPrice: 280.82,
                source: { label: "Twelve Data Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ status: "empty", points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ status: "empty", items: [] }) };
      },
    },
  );

  app.byId.get("buyPrice").value = "220";
  app.byId.get("holdingQty").value = "5";
  await app.byId.get("portfolioForm").dispatch("submit");
  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.match(app.byId.get("portfolioSummary").innerHTML, /真实当前价：280\.82/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /浮动收益率：27\.65%/);
  assert.doesNotMatch(app.byId.get("portfolioSummary").innerHTML, /样例当前价|样例浮动收益率/);
});

test("trend chart renders local history and source note", () => {
  const app = createHarness();

  assert.match(app.byId.get("trendSummary").textContent, /暂无真实走势/);
  assert.match(app.byId.get("trendSource").textContent, /严格真实数据模式/);
  assert.equal(app.byId.get("trendChart").innerHTML, "");
  assert.doesNotMatch(app.byId.get("trendSource").textContent, /本机样例行情|不代表实时行情/);
});

test("account card renders guest state and demo sign-in state", () => {
  const app = createHarness();

  assert.match(app.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
  assert.match(app.byId.get("accountState").innerHTML, /邮箱登录/);
  assert.match(app.byId.get("accountState").innerHTML, /注册账号/);
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /当前仅保存在本机/);

  app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-demo-sign-in]", {}),
  });

  assert.equal(app.localStorage.getItem("prototypeAccountState"), "authenticated");
  assert.match(app.byId.get("accountState").innerHTML, /已登录：样例用户/);
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /已准备同步到账号/);

  app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  assert.equal(app.localStorage.getItem("prototypeAccountState"), null);
  assert.match(app.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
});

test("email registration signs in and enables backend sync", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/auth/register")) {
          return {
            ok: true,
            json: async () => ({
              token: "mock-email-token",
              tokenType: "Bearer",
              user: {
                id: "user-1",
                displayName: "Serena",
                email: "serena@example.com",
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/logout")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              revoked: true,
              user: { id: "user-1", displayName: "Serena", email: "serena@example.com" },
            }),
          };
        }
        if (url.endsWith("/api/auth/sessions")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "session-current",
                  createdAt: "2026-06-05T10:00:00.000Z",
                  expiresAt: "2026-06-06T10:00:00.000Z",
                  current: true,
                  sessionMode: "email-password-session",
                },
                {
                  id: "session-old",
                  createdAt: "2026-06-05T09:00:00.000Z",
                  expiresAt: "2026-06-06T09:00:00.000Z",
                  current: false,
                  sessionMode: "email-password-session",
                },
              ],
              sessionPolicy: {
                redacted: true,
                tokenHashReturned: false,
                deviceBindingRequiredForProduction: true,
              },
            }),
          };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/portfolio")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  code: "600519",
                  buyPrice: "1600",
                  holdingQty: "2",
                  buyDate: "2026-05-01",
                  targetReturn: "10",
                  maxLoss: "6",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/preferences")) {
          return {
            ok: true,
            json: async () => ({
              preferences: {
                riskProfile: "balanced",
                notifications: { inApp: true },
              },
            }),
          };
        }
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              riskProfile: "balanced",
              upsideProbability: 64,
              downsideProbability: 36,
              sentimentScore: 72,
              valuationScore: 58,
              technicalScore: 66,
              actionReference: "邮箱账号同步后的后端分析。",
              reasons: ["邮箱账号同步测试"],
              risks: ["样例风险"],
            }),
          };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/notifications")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-action]", {
      authAction: "register",
      email: "serena@example.com",
      password: "StrongPass123",
      displayName: "Serena",
    }),
  });

  assert.equal(app.localStorage.getItem("apiAuthToken"), "mock-email-token");
  assert.equal(JSON.parse(app.localStorage.getItem("apiAuthUser")).email, "serena@example.com");
  assert.match(app.byId.get("accountState").innerHTML, /已登录：Serena/);
  assert.match(app.byId.get("accountState").innerHTML, /serena@example.com/);
  assert.match(app.byId.get("accountState").innerHTML, /登录会话/);
  assert.match(app.byId.get("accountState").innerHTML, /已读取 2 条脱敏会话摘要/);
  assert.match(app.byId.get("accountState").innerHTML, /当前会话/);
  assert.match(app.byId.get("accountState").innerHTML, /其他会话/);
  assert.match(app.byId.get("accountState").innerHTML, /tokenHash 不返回/);
  assert.equal(JSON.parse(app.localStorage.getItem("portfolio")).buyPrice, "1600");
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.match(app.byId.get("statusMessage").textContent, /账号已注册并登录/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/watchlist" &&
        request.options.headers.authorization === "Bearer mock-email-token",
    ),
  );
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/sessions" &&
        request.options.headers.authorization === "Bearer mock-email-token",
    ),
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.localStorage.getItem("apiAuthUser"), null);
  assert.match(app.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
  assert.match(app.byId.get("statusMessage").textContent, /后端会话已失效/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/logout" &&
        request.options.method === "POST" &&
        request.options.headers.authorization === "Bearer mock-email-token",
    ),
  );
});

test("authenticated account can revoke another backend session", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/auth/login")) {
          return {
            ok: true,
            json: async () => ({
              token: "mock-session-token",
              tokenType: "Bearer",
              user: {
                id: "session-user",
                displayName: "Session User",
                email: "sessions@example.com",
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/sessions") && (options.method || "GET") === "GET") {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "session-current",
                  createdAt: "2026-06-05T10:00:00.000Z",
                  expiresAt: "2026-06-06T10:00:00.000Z",
                  current: true,
                  sessionMode: "email-password-session",
                },
                {
                  id: "session-old",
                  createdAt: "2026-06-05T09:00:00.000Z",
                  expiresAt: "2026-06-06T09:00:00.000Z",
                  current: false,
                  sessionMode: "email-password-session",
                },
              ],
              sessionPolicy: {
                redacted: true,
                tokenHashReturned: false,
                deviceBindingRequiredForProduction: true,
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/sessions/session-old") && options.method === "DELETE") {
          return {
            ok: true,
            json: async () => ({
              success: true,
              revoked: 1,
              revokedSession: {
                id: "session-old",
                createdAt: "2026-06-05T09:00:00.000Z",
                expiresAt: "2026-06-06T09:00:00.000Z",
                current: false,
                sessionMode: "email-password-session",
              },
              user: {
                id: "session-user",
                displayName: "Session User",
                email: "sessions@example.com",
              },
            }),
          };
        }
        if (url.endsWith("/api/watchlist")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/preferences")) {
          return { ok: true, json: async () => ({ preferences: { riskProfile: "balanced", notifications: {} } }) };
        }
        if (url.endsWith("/api/portfolio")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/reminders")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/notifications")) return { ok: true, json: async () => ({ items: [] }) };
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-action]", {
      authAction: "login",
      email: "sessions@example.com",
      password: "StrongPass123",
    }),
  });

  assert.match(app.byId.get("accountState").innerHTML, /其他会话/);
  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-session-revoke]", { authSessionId: "session-old" }),
  });

  assert.doesNotMatch(app.byId.get("accountState").innerHTML, /其他会话 ·/);
  assert.match(app.byId.get("statusMessage").textContent, /已撤销其他会话/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/sessions/session-old" &&
        request.options.method === "DELETE" &&
        request.options.headers.authorization === "Bearer mock-session-token",
    ),
  );
});

test("authenticated account can rotate current backend session", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/auth/login")) {
          return {
            ok: true,
            json: async () => ({
              token: "mock-session-token",
              tokenType: "Bearer",
              user: {
                id: "session-user",
                displayName: "Session User",
                email: "sessions@example.com",
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/session/refresh") && options.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              token: "mock-session-token-rotated",
              tokenType: "Bearer",
              expiresInSeconds: 86400,
              expiresAt: "2026-06-06T11:00:00.000Z",
              rotated: true,
              user: {
                id: "session-user",
                displayName: "Session User",
                email: "sessions@example.com",
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/sessions") && (options.method || "GET") === "GET") {
          const token = options.headers?.authorization || "";
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: token.includes("rotated") ? "session-rotated" : "session-current",
                  createdAt: "2026-06-05T10:00:00.000Z",
                  expiresAt: "2026-06-06T10:00:00.000Z",
                  current: true,
                  sessionMode: "email-password-session",
                },
              ],
              sessionPolicy: {
                redacted: true,
                tokenHashReturned: false,
                deviceBindingRequiredForProduction: true,
              },
            }),
          };
        }
        if (url.endsWith("/api/watchlist")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/preferences")) {
          return { ok: true, json: async () => ({ preferences: { riskProfile: "balanced", notifications: {} } }) };
        }
        if (url.endsWith("/api/portfolio")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/reminders")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/notifications")) return { ok: true, json: async () => ({ items: [] }) };
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-action]", {
      authAction: "login",
      email: "sessions@example.com",
      password: "StrongPass123",
    }),
  });

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-session-rotate]", {}),
  });

  assert.equal(app.localStorage.getItem("apiAuthToken"), "mock-session-token-rotated");
  assert.match(app.byId.get("accountState").innerHTML, /当前会话已轮换，旧 token 已失效/);
  assert.match(app.byId.get("statusMessage").textContent, /当前会话已轮换，旧 token 已失效/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/session/refresh" &&
        request.options.method === "POST" &&
        request.options.headers.authorization === "Bearer mock-session-token",
    ),
  );
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/sessions" &&
        request.options.headers.authorization === "Bearer mock-session-token-rotated",
    ),
  );
});

test("authenticated account can update mock role through backend", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
        rolePolicy: {
          id: "mock-auth-role-policy",
          mode: "sample-self-service",
          status: "ready",
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authUsers.roles",
          productionSelfServiceAllowed: false,
          adminAssignmentPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            defaultPrivilegedRoleExpiryHours: 720,
            maxRoleExpiryHours: 8760,
            productionReviewRequired: true,
          },
          adminRevocationPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            revocableRoles: ["admin", "auditor", "compliance"],
            preventsSelfAdminRevoke: true,
            productionReviewRequired: true,
          },
          adminRoleHistoryPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            scope: "actor-owned-audit-events",
            eventTypes: ["auth.roleChange"],
            maxItems: 20,
            productionReviewRequired: true,
          },
          disclaimer: "生产环境必须由管理员、身份提供商或合规后台授予角色。",
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options, body: options.body || "" });
        if (url.endsWith("/api/auth/register")) {
          return {
            ok: true,
            json: async () => ({
              token: "mock-role-token",
              tokenType: "Bearer",
              user: {
                id: "user-roles",
                displayName: "Role Tester",
                email: "roles@example.com",
                roles: ["user"],
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/roles")) {
          return {
            ok: true,
            json: async () => ({
              user: {
                id: "user-roles",
                displayName: "Role Tester",
                email: "roles@example.com",
                roles: ["auditor"],
                roleGrants: [
                  {
                    role: "auditor",
                    status: "active",
                    grantedBy: "user-roles",
                    grantedAt: "2026-06-01T00:00:00.000Z",
                    expiresAt: "2026-06-03T00:00:00.000Z",
                  },
                ],
              },
            }),
          };
        }
        if (url.endsWith("/api/watchlist")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/preferences")) {
          return { ok: true, json: async () => ({ preferences: { riskProfile: "balanced", notifications: {} } }) };
        }
        if (url.endsWith("/api/portfolio")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/reminders")) return { ok: true, json: async () => ({ items: [] }) };
        if (url.endsWith("/api/notifications")) return { ok: true, json: async () => ({ items: [] }) };
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-action]", {
      authAction: "register",
      email: "roles@example.com",
      password: "StrongPass123",
      displayName: "Role Tester",
    }),
  });

  assert.match(app.byId.get("accountState").innerHTML, /当前角色：普通用户/);
  assert.match(app.byId.get("accountState").innerHTML, /样例角色管理/);
  assert.match(app.byId.get("accountState").innerHTML, /特权角色：管理员 \/ 审计员 \/ 合规员/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-role]", { authRole: "auditor" }),
  });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("apiAuthUser")).roles, ["auditor"]);
  assert.match(app.byId.get("accountState").innerHTML, /当前角色：审计员/);
  assert.match(app.byId.get("statusMessage").textContent, /已切换为审计员/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/auth/roles" &&
        request.options.method === "POST" &&
        request.options.headers.authorization === "Bearer mock-role-token" &&
        /"auditor"/.test(request.body),
    ),
  );
});

test("auth role update ignores stale response after sign out", async () => {
  let resolveRoleUpdate;
  const roleUpdateResponse = new Promise((resolve) => {
    resolveRoleUpdate = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "mock-role-token",
      apiAuthUser: JSON.stringify({
        id: "user-roles",
        displayName: "Role Tester",
        email: "roles@example.com",
        roles: ["user"],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
        rolePolicy: {
          id: "mock-auth-role-policy",
          mode: "sample-self-service",
          status: "ready",
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authUsers.roles",
          productionSelfServiceAllowed: false,
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/roles") && options.method === "POST") {
          return roleUpdateResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const updatePromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-role]", { authRole: "auditor" }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("accountState").innerHTML, /正在更新样例角色/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveRoleUpdate({
    ok: true,
    json: async () => ({
      user: {
        id: "user-roles",
        displayName: "Role Tester",
        email: "roles@example.com",
        roles: ["auditor"],
      },
    }),
  });
  await updatePromise;

  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.localStorage.getItem("apiAuthUser"), null);
  assert.match(app.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
  assert.doesNotMatch(app.byId.get("accountState").innerHTML, /当前角色：审计员/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已切换为审计员/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("admin account can assign another mock user role from account panel", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
        roleGrants: [
          {
            role: "admin",
            status: "active",
            grantedBy: "admin-user",
            grantedAt: "2026-06-01T00:00:00.000Z",
            expiresAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
        rolePolicy: {
          id: "mock-auth-role-policy",
          mode: "sample-self-service",
          status: "ready",
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authUsers.roles",
          productionSelfServiceAllowed: false,
          adminAssignmentPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            defaultPrivilegedRoleExpiryHours: 720,
            maxRoleExpiryHours: 8760,
            productionReviewRequired: true,
          },
          adminRevocationPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            revocableRoles: ["admin", "auditor", "compliance"],
            preventsSelfAdminRevoke: true,
            productionReviewRequired: true,
          },
          adminRoleHistoryPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            scope: "actor-owned-audit-events",
            eventTypes: ["auth.roleChange"],
            maxItems: 20,
            productionReviewRequired: true,
          },
          disclaimer: "生产环境必须由管理员、身份提供商或合规后台授予角色。",
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options, body: options.body || "" });
        if (url.endsWith("/api/me")) {
          return {
            ok: true,
            json: async () => ({
              user: {
                id: "admin-user",
                displayName: "Admin User",
                email: "admin@example.com",
                roles: ["admin"],
                roleGrants: [
                  {
                    role: "admin",
                    status: "active",
                    grantedBy: "admin-user",
                    grantedAt: "2026-06-01T00:00:00.000Z",
                    expiresAt: "2026-07-01T00:00:00.000Z",
                  },
                ],
              },
            }),
          };
        }
        if (url.endsWith("/api/admin/auth/users/roles")) {
          return {
            ok: true,
            json: async () => ({
              targetUser: {
                id: "target-user",
                displayName: "Target User",
                email: "target@example.com",
                roles: ["compliance"],
                roleGrants: [
                  {
                    role: "compliance",
                    status: "active",
                    grantedBy: "admin-user",
                    grantedAt: "2026-06-01T00:00:00.000Z",
                    expiresAt: "2026-06-15T00:00:00.000Z",
                  },
                ],
              },
            }),
          };
        }
        if (url.endsWith("/api/admin/auth/users/roles/revoke")) {
          return {
            ok: true,
            json: async () => ({
              targetUser: {
                id: "target-user",
                displayName: "Target User",
                email: "target@example.com",
                roles: ["user"],
                roleGrants: [{ role: "user", status: "active", grantedBy: "", grantedAt: "", expiresAt: "" }],
              },
              revokedRoles: ["compliance"],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  assert.match(app.byId.get("accountState").innerHTML, /管理员角色授权/);
  assert.match(app.byId.get("accountState").innerHTML, /管理员授权 sample-ready · 要求 管理员 · 默认 720h 到期 · 生产需审批/);
  assert.match(app.byId.get("accountState").innerHTML, /管理员撤销 sample-ready · 可撤销 管理员 \/ 审计员 \/ 合规员 · 禁止自撤 admin/);
  assert.match(app.byId.get("accountState").innerHTML, /角色历史 sample-ready · actor-owned-audit-events · 最多 20 条/);
  assert.match(app.byId.get("accountState").innerHTML, /管理员:到期 2026-07-01/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-assign]", {
      email: "target@example.com",
      role: "compliance",
      expiresInHours: "336",
    }),
  });

  assert.match(app.byId.get("statusMessage").textContent, /已为 target@example.com 授权 合规员，到期 2026-06-15/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/admin/auth/users/roles" &&
        request.options.method === "POST" &&
        request.options.headers.authorization === "Bearer admin-token" &&
        /"target@example.com"/.test(request.body) &&
        /"compliance"/.test(request.body) &&
        /"336"/.test(request.body),
    ),
  );

});

test("admin role assign ignores stale response after sign out", async () => {
  let resolveAssign;
  const assignResponse = new Promise((resolve) => {
    resolveAssign = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        rolePolicy: {
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          adminAssignmentPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            defaultPrivilegedRoleExpiryHours: 720,
            maxRoleExpiryHours: 8760,
            productionReviewRequired: true,
          },
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/admin/auth/users/roles") && options.method === "POST") {
          return assignResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const assignPromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-assign]", {
      email: "target@example.com",
      role: "compliance",
      expiresInHours: "336",
    }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("accountState").innerHTML, /正在保存管理员角色授权/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAssign({
    ok: true,
    json: async () => ({
      targetUser: {
        id: "target-user",
        displayName: "Target User",
        email: "target@example.com",
        roles: ["compliance"],
      },
    }),
  });
  await assignPromise;

  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已为 target@example.com 授权/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("admin account can revoke another mock user role from account panel", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
        roleGrants: [
          {
            role: "admin",
            status: "active",
            grantedBy: "admin-user",
            grantedAt: "2026-06-01T00:00:00.000Z",
            expiresAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
        rolePolicy: {
          id: "mock-auth-role-policy",
          mode: "sample-self-service",
          status: "ready",
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authUsers.roles",
          productionSelfServiceAllowed: false,
          adminAssignmentPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            defaultPrivilegedRoleExpiryHours: 720,
            maxRoleExpiryHours: 8760,
            productionReviewRequired: true,
          },
          adminRevocationPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            revocableRoles: ["admin", "auditor", "compliance"],
            preventsSelfAdminRevoke: true,
            productionReviewRequired: true,
          },
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options, body: options.body || "" });
        if (url.endsWith("/api/me")) {
          return {
            ok: true,
            json: async () => ({
              user: {
                id: "admin-user",
                displayName: "Admin User",
                email: "admin@example.com",
                roles: ["admin"],
              },
            }),
          };
        }
        if (url.endsWith("/api/admin/auth/users/roles/revoke")) {
          return {
            ok: true,
            json: async () => ({
              targetUser: {
                id: "target-user",
                displayName: "Target User",
                email: "target@example.com",
                roles: ["user"],
                roleGrants: [{ role: "user", status: "active", grantedBy: "", grantedAt: "", expiresAt: "" }],
              },
              revokedRoles: ["compliance"],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-revoke]", {
      email: "target@example.com",
      role: "compliance",
    }),
  });

  assert.match(app.byId.get("statusMessage").textContent, /已撤销 target@example.com 的 合规员 角色/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/admin/auth/users/roles/revoke" &&
        request.options.method === "POST" &&
        request.options.headers.authorization === "Bearer admin-token" &&
        /"target@example.com"/.test(request.body) &&
        /"compliance"/.test(request.body),
    ),
  );
});

test("admin role revoke ignores stale response after sign out", async () => {
  let resolveRevoke;
  const revokeResponse = new Promise((resolve) => {
    resolveRevoke = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        rolePolicy: {
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          adminRevocationPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            revocableRoles: ["admin", "auditor", "compliance"],
            preventsSelfAdminRevoke: true,
            productionReviewRequired: true,
          },
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/admin/auth/users/roles/revoke") && options.method === "POST") {
          return revokeResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const revokePromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-revoke]", {
      email: "target@example.com",
      role: "compliance",
    }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("accountState").innerHTML, /正在撤销用户角色/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveRevoke({
    ok: true,
    json: async () => ({
      targetUser: {
        id: "target-user",
        displayName: "Target User",
        email: "target@example.com",
        roles: ["user"],
      },
    }),
  });
  await revokePromise;

  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已撤销 target@example.com 的 合规员 角色/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("admin account can refresh role history from account panel", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
        roleGrants: [
          {
            role: "admin",
            status: "active",
            grantedBy: "admin-user",
            grantedAt: "2026-06-01T00:00:00.000Z",
            expiresAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
        rolePolicy: {
          id: "mock-auth-role-policy",
          mode: "sample-self-service",
          status: "ready",
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authUsers.roles",
          productionSelfServiceAllowed: false,
          adminAssignmentPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            defaultPrivilegedRoleExpiryHours: 720,
            maxRoleExpiryHours: 8760,
            productionReviewRequired: true,
          },
          adminRevocationPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            revocableRoles: ["admin", "auditor", "compliance"],
            preventsSelfAdminRevoke: true,
            productionReviewRequired: true,
          },
          adminRoleHistoryPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            scope: "actor-owned-audit-events",
            eventTypes: ["auth.roleChange"],
            maxItems: 20,
            productionReviewRequired: true,
          },
        },
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/me")) {
          return {
            ok: true,
            json: async () => ({
              user: {
                id: "admin-user",
                displayName: "Admin User",
                email: "admin@example.com",
                roles: ["admin"],
                roleGrants: [
                  {
                    role: "admin",
                    status: "active",
                    grantedBy: "admin-user",
                    grantedAt: "2026-06-01T00:00:00.000Z",
                    expiresAt: "2026-07-01T00:00:00.000Z",
                  },
                ],
              },
            }),
          };
        }
        if (url.endsWith("/api/admin/auth/roles/history")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "audit-role-1",
                  eventType: "auth.roleChange",
                  createdAt: "2026-06-01T00:00:00.000Z",
                  severity: "info",
                  message: "Mock admin assigned user roles.",
                  metadata: {
                    action: "adminAssign",
                    legacyEventType: "auth.roles.admin_assign",
                    targetEmail: "target@example.com",
                    roles: ["compliance"],
                  },
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-history]", {}),
  });

  assert.match(app.byId.get("accountState").innerHTML, /授权 · target@example.com/);
  assert.match(app.byId.get("accountState").innerHTML, /合规员/);
  assert.match(app.byId.get("statusMessage").textContent, /已读取 1 条角色变更历史/);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/admin/auth/roles/history" &&
        request.options.headers.authorization === "Bearer admin-token",
    ),
  );
});

test("admin role history refresh ignores stale response after sign out", async () => {
  let resolveHistory;
  const historyResponse = new Promise((resolve) => {
    resolveHistory = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "admin-token",
      apiAuthUser: JSON.stringify({
        id: "admin-user",
        displayName: "Admin User",
        email: "admin@example.com",
        roles: ["admin"],
      }),
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        rolePolicy: {
          allowedRoles: ["user", "admin", "auditor", "compliance"],
          privilegedRoles: ["admin", "auditor", "compliance"],
          adminRoleHistoryPolicy: {
            status: "sample-ready",
            requiredRole: "admin",
            scope: "actor-owned-audit-events",
            eventTypes: ["auth.roleChange"],
            maxItems: 20,
            productionReviewRequired: true,
          },
        },
      }),
    },
    {
      location: { hash: "" },
      fetchImpl: async (url) => {
        if (url.endsWith("/api/admin/auth/roles/history")) {
          return historyResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const historyPromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-admin-role-history]", {}),
  });
  await Promise.resolve();
  assert.match(app.byId.get("accountState").innerHTML, /正在读取角色变更历史/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveHistory({
    ok: true,
    json: async () => ({
      items: [
        {
          id: "audit-role-1",
          eventType: "auth.roleChange",
          createdAt: "2026-06-01T00:00:00.000Z",
          severity: "info",
          message: "Mock admin assigned user roles.",
          metadata: {
            action: "adminAssign",
            legacyEventType: "auth.roles.admin_assign",
            targetEmail: "target@example.com",
            roles: ["compliance"],
          },
        },
      ],
    }),
  });
  await historyPromise;

  assert.doesNotMatch(app.byId.get("accountState").innerHTML, /授权 · target@example.com/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已读取 1 条角色变更历史/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("saved email session is validated and cleared when backend rejects token", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiAuthToken: "stale-token",
      apiAuthUser: JSON.stringify({
        id: "user-1",
        displayName: "Expired",
        email: "expired@example.com",
      }),
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/api/me")) {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: { code: "UNAUTHORIZED", message: "请重新登录。" },
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  assert.match(app.byId.get("accountState").innerHTML, /已登录：Expired/);
  app.localStorage.setItem("apiHealthStatus", "connected");

  const result = await app.context.window.financeAIAssistantApp.validateSavedSession();

  assert.equal(result.status, "invalid");
  assert.deepEqual(requestedUrls, ["http://localhost:4180/api/me"]);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.localStorage.getItem("apiAuthUser"), null);
  assert.match(app.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /当前仅保存在本机/);
  assert.match(app.byId.get("statusMessage").textContent, /登录状态已失效/);
});

test("email login ignores stale error response after sign out", async () => {
  let resolveLogin;
  const loginResponse = new Promise((resolve) => {
    resolveLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthServiceStatus: JSON.stringify({
        id: "mock-auth",
        name: "Mock 认证服务",
        mode: "sample",
        status: "ready",
        sessionMode: "bearer-token-sample-email-password",
        supportedMethods: ["demoToken", "emailPassword"],
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/auth/login")) return loginResponse;
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const loginPromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-auth-action]", {
      authAction: "login",
      email: "stale-login@example.com",
      password: "StrongPass123",
    }),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveLogin({
    ok: false,
    status: 401,
    json: async () => ({
      error: { message: "stale email login failure" },
    }),
  });
  await loginPromise;

  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /登录失败|stale email login failure/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("saved session validation ignores stale responses after sign out", async () => {
  for (const variant of ["success", "error"]) {
    let resolveSession;
    const sessionResponse = new Promise((resolve) => {
      resolveSession = resolve;
    });
    const app = createHarness(
      {
        apiMode: "backend",
        apiHealthStatus: "connected",
        apiAuthToken: "session-token",
        apiAuthUser: JSON.stringify({
          id: "session-user",
          displayName: "Session User",
          email: "session@example.com",
        }),
      },
      {
        fetchImpl: async (url) => {
          if (url.endsWith("/api/me")) return sessionResponse;
          if (url.endsWith("/api/auth/logout")) {
            return { ok: true, json: async () => ({ revoked: true }) };
          }
          return { ok: true, json: async () => ({}) };
        },
      },
    );

    const validatePromise = app.context.window.financeAIAssistantApp.validateSavedSession();
    await Promise.resolve();

    await app.byId.get("accountState").dispatch("click", {
      target: eventTargetFor("[data-sign-out-demo]", {}),
    });

    resolveSession(
      variant === "success"
        ? {
            ok: true,
            json: async () => ({
              user: {
                id: "session-user",
                displayName: "Stale Session",
                email: "stale-session@example.com",
              },
            }),
          }
        : {
            ok: false,
            status: 401,
            json: async () => ({
              error: { message: "stale session validation failure" },
            }),
          },
    );
    const result = await validatePromise;

    assert.equal(result, null);
    assert.equal(app.localStorage.getItem("apiAuthToken"), null);
    assert.equal(app.localStorage.getItem("apiAuthUser"), null);
    assert.doesNotMatch(app.byId.get("accountState").innerHTML, /Stale Session|stale-session/);
    assert.doesNotMatch(app.byId.get("statusMessage").textContent, /登录状态已失效|stale session validation failure/);
    assert.match(app.byId.get("statusMessage").textContent, /已退出登录|后端会话已失效/);
  }
});

test("demo sign-in loads backend preferences when connected", async () => {
  const requested = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        requested.push(url);
        if (url.endsWith("/api/auth/demo-login")) {
          return { ok: true, json: async () => ({ token: "demo-token", user: {} }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/portfolio")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  code: "600519",
                  buyPrice: "1600",
                  holdingQty: "2",
                  buyDate: "2026-05-01",
                  targetReturn: "10",
                  maxLoss: "6",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/preferences")) {
          return {
            ok: true,
            json: async () => ({
              preferences: {
                riskProfile: "aggressive",
                notifications: { email: true, inApp: true },
              },
            }),
          };
        }
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              riskProfile: "aggressive",
              upsideProbability: 70,
              downsideProbability: 30,
              sentimentScore: 75,
              valuationScore: 56,
              technicalScore: 72,
              actionReference: "后端偏好联动分析。",
              reasons: ["偏好同步后的后端分析"],
              risks: ["偏好同步风险"],
            }),
          };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-demo-sign-in]", {}),
  });

  assert.ok(requested.some((url) => url.endsWith("/api/preferences")));
  assert.equal(app.byId.get("riskProfile").value, "aggressive");
  assert.equal(JSON.parse(app.localStorage.getItem("notifications")).email, true);
  assert.equal(JSON.parse(app.localStorage.getItem("portfolio")).buyPrice, "1600");
  assert.equal(app.byId.get("buyPrice").value, "1600");
  assert.match(app.byId.get("notificationStatus").textContent, /偏好会同步到后端/);
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.equal(app.byId.get("upsideValue").textContent, "70%");
  assert.match(app.byId.get("statusMessage").textContent, /偏好设置/);
});

test("demo auth token ignores stale response after sign out", async () => {
  let resolveDemoLogin;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const signInPromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-demo-sign-in]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await signInPromise;

  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.doesNotMatch(app.byId.get("accountState").innerHTML, /已登录/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已切换为样例登录状态/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("preference load ignores stale response after sign out", async () => {
  let resolvePreferences;
  const preferencesResponse = new Promise((resolve) => {
    resolvePreferences = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      riskProfile: "balanced",
      notifications: JSON.stringify({}),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/demo-login")) {
          return { ok: true, json: async () => ({ token: "demo-token", user: {} }) };
        }
        if (url.endsWith("/api/preferences") && (options.method || "GET") === "GET") {
          return preferencesResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/portfolio")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const signInPromise = app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-demo-sign-in]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolvePreferences({
    ok: true,
    json: async () => ({
      preferences: {
        riskProfile: "aggressive",
        notifications: { email: true },
      },
    }),
  });
  await signInPromise;

  assert.equal(app.byId.get("riskProfile").value, "balanced");
  assert.equal(JSON.parse(app.localStorage.getItem("notifications") || "{}").email, undefined);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("data source state starts with strict real-data progress snapshot", () => {
  const app = createHarness();

  assert.equal(app.byId.get("overview").hidden, false);
  assert.equal(app.contentGrid.hidden, false);
  assert.equal(app.byId.get("settings").hidden, true);
  assert.match(app.byId.get("projectProgressState").innerHTML, /测试版状态更新时间：2026-06-14/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /固定公开网址可用/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /真实数据规则参考可用/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /完整 AI 已验证/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /新闻已去重折叠/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /99\.9%/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /真实数据源/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /生产数据库/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /计算依据 32\/35 项通过/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /计算依据 26\/27 项通过/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /计算依据 26\/28 项通过/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /计算依据 16\/17 项通过/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /来源 \/api\/data-sources/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /下一批真实阻断/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /真实报价覆盖会点亮行情标签且不生成本地交易计划/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /project-diagnostics/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /展开开发诊断/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /本地网页 Demo/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /100%/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /面向社会正式上线/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /74\.5%/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /<details class="project-diagnostics" open/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /普通用户无需阅读/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /更多完成项已收纳在项目日志/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /本地进度快照/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /后端 mock API/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /本机样例模式/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前为严格真实数据空白模式/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /改用本机样例|当前使用本机样例数据/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实 AI 模型待连接/);
  assert.doesNotMatch(app.byId.get("aiServiceState").innerHTML, /当前使用本机样例分析/);
  assert.match(app.byId.get("repositoryState").innerHTML, /数据仓储待连接/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据库服务待连接/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计服务待连接/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /任务运行器待连接/);
  assert.match(app.byId.get("schedulerState").innerHTML, /调度服务待连接/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /通知投递服务待连接/);
  assert.doesNotMatch(
    [
      app.byId.get("repositoryState").innerHTML,
      app.byId.get("databaseState").innerHTML,
      app.byId.get("auditServiceState").innerHTML,
      app.byId.get("jobRunnerState").innerHTML,
      app.byId.get("schedulerState").innerHTML,
      app.byId.get("notificationServiceState").innerHTML,
    ].join(" "),
    /当前使用本机.*样例/,
  );
  assert.match(app.byId.get("dataSourceState").innerHTML, /data-check-backend/);
  assert.equal(app.localStorage.getItem("apiMode"), null);
});

test("settings and internal diagnostics stay off homepage until settings route is active", async () => {
  const app = createHarness(
    {},
    {
      location: { hash: "#overview" },
    },
  );

  assert.equal(app.byId.get("overview").hidden, false);
  assert.equal(app.contentGrid.hidden, false);
  assert.equal(app.byId.get("settings").hidden, true);
  assert.equal(app.byId.get("settings").getAttribute("aria-hidden"), "true");
  assert.match(app.byId.get("projectProgressState").innerHTML, /project-diagnostics/);

  app.context.window.location.hash = "#settings";
  await app.dispatchWindowEvent("hashchange");

  assert.equal(app.byId.get("overview").hidden, true);
  assert.equal(app.contentGrid.hidden, true);
  assert.equal(app.byId.get("settings").hidden, false);
  assert.equal(app.byId.get("settings").getAttribute("aria-hidden"), "false");

  app.context.window.location.hash = "#analysis";
  await app.dispatchWindowEvent("hashchange");

  assert.equal(app.byId.get("overview").hidden, false);
  assert.equal(app.contentGrid.hidden, false);
  assert.equal(app.byId.get("settings").hidden, true);
  assert.equal(app.byId.get("settings").getAttribute("aria-hidden"), "true");
});

test("refresh query clears stale backend status cache without deleting user data", () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiProviderStatus: JSON.stringify({ id: "old", name: "Old Provider", mode: "sample" }),
      apiProjectProgress: JSON.stringify({
        id: "old-progress",
        updatedAt: "2026-06-10",
        source: "old-cache",
        localDemoPercent: 40,
        publicLaunchPercent: 41,
        completed: ["旧缓存"],
        blockers: ["旧阻断"],
        readiness: [],
      }),
      watchlist: JSON.stringify([{ code: "MSFT", market: "us" }]),
      portfolio: JSON.stringify({ buyPrice: "100", holdingQty: "2" }),
      reminderRules: JSON.stringify([{ id: "rule-1", stockCode: "MSFT" }]),
    },
    {
      location: {
        hostname: "127.0.0.1",
        port: "4173",
        search: "?refresh=20260612-local-live-gate-v10",
      },
    },
  );

  assert.equal(app.localStorage.getItem("apiHealthStatus"), null);
  assert.equal(app.localStorage.getItem("apiProviderStatus"), null);
  assert.equal(app.localStorage.getItem("apiProjectProgress"), null);
  assert.match(app.localStorage.getItem("watchlist"), /MSFT/);
  assert.match(app.localStorage.getItem("portfolio"), /buyPrice/);
  assert.match(app.localStorage.getItem("reminderRules"), /rule-1/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /测试版状态更新时间：2026-06-14/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /484 条自动化回归目标/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /旧缓存|2026-06-10/);
});

test("project progress renders production database cutover evidence", () => {
  const app = createHarness();
  const progressHtml = app.byId.get("projectProgressState").innerHTML;

  assert.match(progressHtml, /面向社会正式上线/);
  assert.match(progressHtml, /面向社会正式上线[\s\S]*74\.5%/);
  assert.doesNotMatch(progressHtml, /面向社会正式上线[\s\S]{0,260}99\.9%/);
  assert.match(progressHtml, /生产数据库/);
  assert.match(progressHtml, /66%/);
  assert.match(progressHtml, /计算依据 26\/28 项通过/);
  assert.match(progressHtml, /真实数据库连接和运行时切换仍未完成/);
  assert.match(progressHtml, /\/api\/database\/production-repository-adapter/);
  assert.match(progressHtml, /484 条自动化回归/);
});

test("project progress renders deployment preflight evidence", () => {
  const app = createHarness();
  const progressHtml = app.byId.get("projectProgressState").innerHTML;

  assert.match(progressHtml, /面向社会正式上线/);
  assert.match(progressHtml, /面向社会正式上线[\s\S]*74\.5%/);
  assert.doesNotMatch(progressHtml, /面向社会正式上线[\s\S]{0,260}99\.9%/);
  assert.match(progressHtml, /部署运维/);
  assert.match(progressHtml, /64%/);
  assert.match(progressHtml, /计算依据 16\/18 项通过/);
  assert.match(progressHtml, /真实外部投递 provider 和后台 worker 仍未启用/);
  assert.match(progressHtml, /\/api\/notification-services/);
  assert.match(progressHtml, /484 条自动化回归/);
});

test("project progress renders compliance release evidence", () => {
  const app = createHarness();
  const progressHtml = app.byId.get("projectProgressState").innerHTML;

  assert.match(progressHtml, /面向社会正式上线/);
  assert.match(progressHtml, /面向社会正式上线[\s\S]*74\.5%/);
  assert.doesNotMatch(progressHtml, /面向社会正式上线[\s\S]{0,260}99\.9%/);
  assert.match(progressHtml, /合规发布/);
  assert.match(progressHtml, /77%/);
  assert.match(progressHtml, /计算依据 15\/18 项通过/);
  assert.match(progressHtml, /真实用户确认、法律复核和公开发布总门禁仍未完成/);
  assert.match(progressHtml, /\/api\/compliance\/status/);
  assert.match(progressHtml, /484 条自动化回归/);
});

test("settings keeps developer diagnostics collapsed by default", () => {
  assert.match(indexSource, /<details class="developer-settings">/);
  assert.match(indexSource, /展开开发者诊断详情/);
  assert.match(indexSource, /数据库、审计、仓储和后台任务/);
  assert.doesNotMatch(indexSource, /<details class="developer-settings"\s+open/);
});

test("project progress keeps launch gates in collapsed developer details", () => {
  const app = createHarness();
  const progressHtml = app.byId.get("projectProgressState").innerHTML;

  assert.match(progressHtml, /测试版状态更新时间/);
  assert.match(progressHtml, /普通用户项目状态摘要/);
  assert.match(progressHtml, /固定公开网址可用/);
  assert.match(progressHtml, /真实数据规则参考可用/);
  assert.match(progressHtml, /完整 AI 已验证/);
  assert.match(progressHtml, /新闻已去重折叠/);
  assert.match(progressHtml, /<details class="project-progress-details">/);
  assert.match(progressHtml, /展开开发者进度详情/);
  assert.doesNotMatch(progressHtml, /<details class="project-progress-details"\s+open/);
});

test("local development webpage auto-connects to backend on startup", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {},
    {
      fetchImpl: createStartupBackendFetch(requestedUrls),
      location: { protocol: "http:", hostname: "127.0.0.1", port: "4173" },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.ok(requestedUrls.some((url) => url.endsWith("/health")));
  assert.ok(requestedUrls.some((url) => url.endsWith("/api/data-sources")));
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Mock Sample Provider/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实 AI 模型待配置|AI 服务状态待确认/);
  assert.doesNotMatch(app.byId.get("aiServiceState").innerHTML, /当前 AI 服务为 Mock AI 分析服务/);
  assert.match(app.byId.get("statusMessage").textContent, /已自动连接本机后端 API/);
});

test("public refresh link surfaces same-origin backend auto-connect failure", async () => {
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "failed",
    },
    {
      location: {
        protocol: "https:",
        hostname: "public-demo.lhr.life",
        port: "",
        search: "?refresh=public-v100-smoke-gate",
      },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "fallback");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "failed");
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 不可用|暂时不可用|当前运行环境暂不支持网络请求/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /当前运行环境暂不支持网络请求|严格真实数据模式下不使用样例分析/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /正在检查后端 API/);
});

test("public refresh link leaves checking state when startup request hangs", async () => {
  const timeoutCallbacks = [];
  const app = createHarness(
    {},
    {
      fetchImpl: () => new Promise(() => {}),
      setTimeoutImpl: (callback) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      },
      location: {
        protocol: "https:",
        hostname: "public-demo.lhr.life",
        port: "",
        search: "?refresh=public-v102-timeout",
      },
    },
  );

  assert.match(app.byId.get("dataSourceState").innerHTML, /正在检查后端 API/);
  assert.ok(timeoutCallbacks.length > 0);
  for (const callback of timeoutCallbacks) callback();

  assert.equal(app.localStorage.getItem("apiHealthStatus"), "failed");
  assert.match(app.byId.get("dataSourceState").innerHTML, /公网同源 API 自动连接超时/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /完整 AI 状态暂未返回/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /正在检查后端 API/);
});

test("public refresh link auto-connects to same-origin backend and replaces local progress snapshot", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "failed",
      apiProjectProgress: JSON.stringify({
        id: "old-local-progress",
        updatedAt: "2026-06-01",
        source: "old-local-cache",
        localDemoPercent: 10,
        publicLaunchPercent: 11,
        completed: ["旧本地快照"],
        blockers: ["旧阻断"],
        readiness: [],
      }),
    },
    {
      fetchImpl: createStartupBackendFetch(requestedUrls),
      location: {
        protocol: "https:",
        hostname: "public-demo.lhr.life",
        port: "",
        search: "?refresh=public-v100-smoke-gate",
      },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.ok(requestedUrls.some((url) => url.endsWith("/health")));
  assert.ok(requestedUrls.some((url) => url.endsWith("/api/project/progress")));
  assert.match(app.byId.get("projectProgressState").innerHTML, /2026-06-10/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /80%/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /旧本地快照|2026-06-01|74\.5%/);
});

test("automatic backend connection keeps recent stock-search feedback visible", async () => {
  const requestedUrls = [];
  let resolveProgress;
  const progressGate = new Promise((resolve) => {
    resolveProgress = resolve;
  });
  const startupFetch = createStartupBackendFetch(requestedUrls);
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/project/progress")) {
          requestedUrls.push(url);
          return progressGate;
        }
        if (url.includes("/api/stocks/search")) {
          requestedUrls.push(url);
          return {
            ok: true,
            json: async () => ({
              query: "Apple",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "AAPL", name: "Apple", market: "us" }],
            }),
          };
        }
        return startupFetch(url);
      },
      location: { protocol: "http:", hostname: "127.0.0.1", port: "4173" },
    },
  );

  app.byId.get("stockSearch").value = "Apple";
  await app.byId.get("searchButton").click();
  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("statusMessage").textContent, /已通过后端 API 选择 Apple/);

  resolveProgress({
    ok: true,
    json: async () => ({
      progress: {
        id: "finance-ai-project-progress",
        updatedAt: "2026-06-10",
        source: "backend-computed-readiness-strict-real-data",
        localDemoPercent: 100,
        publicLaunchPercent: 80,
        completed: ["后台自动连接提示不再覆盖用户刚完成的搜索反馈", "metadata-only 股票搜索结果会明确提示不代表行情、新闻或 AI 分析已接入", "股票标题区固定显示当前数据覆盖和真实数据缺口", "股票标题区数据覆盖提示已拆成股票、行情、新闻、AI 四个分项", "股票标题区数据覆盖提示新增公告、宏观分项"],
        blockers: ["真实行情/新闻/公告/宏观数据源与授权"],
        readiness: [],
        disclaimer: "该进度是项目管理参考。",
      },
    }),
  });
  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.ok(requestedUrls.some((url) => url.endsWith("/api/project/progress")));
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已自动连接本机后端 API/);
  assert.match(app.byId.get("statusMessage").textContent, /已通过后端 API 选择 Apple/);
});

test("local development connected backend refreshes cached service status on startup", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAiServiceStatus: JSON.stringify({
        id: "mock-ai-analysis",
        name: "Mock AI 分析服务",
        mode: "sample",
        status: "ready",
        model: "old-model",
        capabilities: [],
        providerAdapter: {
          id: "ai-provider-adapter",
          status: "blocked",
          runtimeMode: "inactive",
          selectedProvider: "",
          selectedModel: "",
          canCallLiveModel: false,
          promptContract: { version: "old", outputMode: "structured-json" },
          responseSchema: { status: "draft", requiredFields: [], forbiddenFields: [] },
          complianceGate: { status: "blocked", canCallLiveModel: false, checks: [] },
          missingEnvVars: [],
          safety: { noVendorNetworkCalls: true, noTradingActions: true },
          blockedReasons: [],
        },
      }),
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/health")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              service: "finance-ai-assistant-backend",
              version: "0.1.0",
            }),
          };
        }
        if (url.endsWith("/api/ai-services")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-ai-analysis",
                name: "Mock AI 分析服务",
                mode: "sample",
                status: "ready",
                model: "rule-based-sample-v0",
                capabilities: ["quantifiedProbability"],
                providerAdapter: {
                  id: "ai-provider-adapter",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  selectedModel: "",
                  baseUrlStatus: "unconfigured",
                  apiStyle: "responses",
                  recommendedModelId: "gpt-5.5",
                  canCallLiveModel: false,
                  promptContract: {
                    version: "analysis-prompt-v0",
                    outputMode: "structured-json",
                    probabilityLanguage: "模型参考概率",
                    requiresNoGuaranteeDisclaimer: true,
                  },
                  responseSchema: {
                    status: "draft",
                    requiredFields: ["upsideProbability"],
                    forbiddenFields: ["guaranteedReturn"],
                  },
                  responseValidationPolicy: {
                    status: "blocked",
                    validationMode: "dry-run-no-user-visible-invalid-output",
                    canPublishValidatedOutput: false,
                    requiredValidators: [
                      "jsonSchema",
                      "probabilityBounds",
                      "scenarioProbabilitySum",
                      "forbiddenClaimFilter",
                      "disclaimerPresence",
                      "sourceReferencePresence",
                    ],
                    probabilityBounds: {
                      minPercent: 0,
                      maxPercent: 100,
                      maxScenarioSumDeviationPercent: 2,
                    },
                    fallbackMode: "show-insufficient-information",
                    forbiddenClaims: [
                      "guaranteedReturn",
                      "mustBuy",
                      "mustSell",
                      "riskFree",
                      "profitPromise",
                    ],
                    requiresValidationAudit: true,
                    requiresUserVisibleFallback: true,
                  },
                  auditPolicy: {
                    status: "blocked",
                    sink: "unconfigured",
                    requiredEventTypes: ["ai.model.preflight"],
                    forbiddenEnvelopeFields: ["apiKey", "rawPrompt"],
                    redactBeforeWrite: true,
                    hashChainRequired: true,
                  },
                  budgetPolicy: {
                    status: "blocked",
                    maxCallsPerMinute: 0,
                    maxTokensPerRequest: 0,
                    requiresCostAlerting: true,
                    requiresPerUserRateLimit: true,
                  },
                  secretManagementPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-model-secret-use",
                    canUseProductionSecrets: false,
                    secretManager: "unconfigured",
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
                  },
                  sourceGroundingPolicy: {
                    status: "blocked",
                    minSourceRefs: 2,
                    requiresSourceAttribution: true,
                    requiresUnknownWhenInsufficientEvidence: true,
                  },
                  promptInjectionDefensePolicy: {
                    status: "blocked",
                    mode: "dry-run-no-unsanitized-source-text",
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
                  },
                  dataMinimizationPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-personal-data-to-model",
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
                  },
                  complianceGate: {
                    status: "blocked",
                    canCallLiveModel: false,
                    checks: [
                      { id: "auditReadiness", status: "blocked" },
                      { id: "responseValidation", status: "blocked" },
                      { id: "costControls", status: "blocked" },
                      { id: "secretManagement", status: "blocked" },
                      { id: "sourceGrounding", status: "blocked" },
                      { id: "promptInjectionDefense", status: "blocked" },
                      { id: "dataMinimization", status: "blocked" },
                      { id: "citationEvidence", status: "blocked" },
                      { id: "modelEvaluation", status: "blocked" },
                      { id: "humanReview", status: "blocked" },
                      { id: "modelRelease", status: "blocked" },
                      { id: "runtimeMonitoring", status: "blocked" },
                    ],
                  },
                  modelCallPreflightPlan: {
                    status: "blocked",
                    mode: "dry-run-no-model-call",
                    canExecuteLiveCall: false,
                    providerRequestAllowed: false,
                    requiredManualApproval: true,
                  },
                  modelProviderSetupGuide: {
                    id: "ai-model-provider-setup-guide",
                    status: "ready-for-user-configuration",
                    mode: "no-secret-model-provider-setup-guide",
                    activeRuntimeMode: "inactive",
                    setupGroups: [
                      {
                        id: "modelProvider",
                        label: "模型 Provider",
                        status: "missing-config",
                        selectedProvider: "",
                        selectedModel: "",
                        requiredEnvVars: [
                          "FINANCE_AI_MODEL_PROVIDER",
                          "FINANCE_AI_MODEL_API_KEY",
                          "FINANCE_AI_MODEL_ID",
                        ],
                        missingEnvVars: [
                          "FINANCE_AI_MODEL_PROVIDER",
                          "FINANCE_AI_MODEL_API_KEY",
                          "FINANCE_AI_MODEL_ID",
                        ],
                        smokeEndpoint: "GET /api/ai-services/provider-adapter",
                        forbiddenFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText"],
                      },
                      {
                        id: "modelSafety",
                        label: "模型安全门禁",
                        status: "missing-config",
                        requiredEnvVars: [
                          "FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY",
                          "FINANCE_AI_MODEL_SOURCE_COVERAGE_READY",
                          "FINANCE_AI_MODEL_CITATION_PACKAGE_READY",
                        ],
                        missingEnvVars: ["FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY"],
                        smokeEndpoint: "GET /api/ai-services/provider-adapter",
                        forbiddenFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText"],
                      },
                      {
                        id: "modelGovernance",
                        label: "模型评测与发布",
                        status: "missing-config",
                        requiredEnvVars: [
                          "FINANCE_AI_MODEL_EVALUATION_SUITE_READY",
                          "FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY",
                          "FINANCE_AI_MODEL_RELEASE_APPROVAL_READY",
                        ],
                        missingEnvVars: ["FINANCE_AI_MODEL_EVALUATION_SUITE_READY"],
                        smokeEndpoint: "GET /api/project/progress",
                        forbiddenFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText"],
                      },
                    ],
                    smokeOrder: [
                      "providerCredentialPreflight",
                      "structuredSchemaValidation",
                      "sourceGroundingCheck",
                      "humanReviewFallback",
                      "releaseRollbackGate",
                    ],
                    checklistItems: [
                      { id: "modelProviderSetupGuideDefined", label: "模型 Provider 配置向导", status: "pass" },
                      { id: "modelProviderSmokeOrderDefined", label: "模型 smoke 顺序", status: "pass" },
                      { id: "modelProviderEnvReady", label: "模型环境变量已填写", status: "blocked" },
                    ],
                    passedCount: 2,
                    totalCount: 3,
                    forbiddenAuditFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText", "rawPortfolioNotes"],
                    canReadModelSecrets: false,
                    canWriteEnvFile: false,
                    canCallLiveModel: false,
                    canEnableLiveRuntime: false,
                    disclaimer: "该配置向导只说明真实模型 provider 接入步骤和安全边界；不会读取、保存、显示模型密钥，也不会执行真实模型调用或发布投资建议。",
                  },
                  factorInputPolicy: {
                    status: "blocked",
                    requiredFactors: [
                      "macro",
                      "industry",
                      "fundamentals",
                      "valuation",
                      "technical",
                      "sentiment",
                    ],
                    minReadyFactors: 6,
                    requiresCoverageLabels: true,
                    requiresStalenessLabels: true,
                    requiresUncertaintyWhenMissing: true,
                  },
                  factorWeightPolicy: {
                    status: "blocked",
                    version: "six-factor-weight-v1",
                    requiresVersionedWeights: true,
                    requiresManualApprovalForWeightChange: true,
                  },
                  citationEvidencePolicy: {
                    status: "blocked",
                    mode: "dry-run-no-uncited-model-output",
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
                    allowedSourceTypes: [
                      "news",
                      "filing",
                      "publicStatement",
                      "marketData",
                      "macroData",
                    ],
                    forbiddenEvidenceFields: [
                      "rawArticleText",
                      "rawSocialPost",
                      "paywalledFullText",
                      "personalData",
                    ],
                    requiresClaimCitationMap: true,
                    requiresStalenessWarning: true,
                  },
                  dataSourceEvidencePackage: {
                    id: "ai-data-source-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-live-model-grounding",
                    canPublishWithoutSourceRefs: false,
                    requiredSourceTypes: ["marketData", "news", "filing", "publicStatement", "macroData"],
                    requiredSourceFields: ["sourceId", "sourceType", "publisher", "publishedAt", "url", "providerRuntimeMode", "licenseStatus", "freshnessLabel"],
                    forbiddenSourceFields: ["rawArticleText", "paywalledFullText", "providerApiKey", "rawSocialPost"],
                    requiredManualChecks: ["providerLicenseReviewed", "sourceAttributionVisible", "stalenessLabelVisible", "fixtureFallbackDisclosed", "noRawProviderPayloadInPrompt"],
                  },
                  factorCoverageEvidencePackage: {
                    id: "ai-factor-coverage-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-factor-overconfidence",
                    canUseIncompleteFactorsForHighConfidence: false,
                    requiredFactors: ["macro", "industry", "fundamentals", "valuation", "technical", "sentiment"],
                    minReadyFactorsForActionableAnalysis: 6,
                    minReadyFactorsForEducationalAnalysis: 3,
                    requiredLabels: ["ready", "stale", "fixture", "missing", "unlicensed"],
                    fallbackRules: ["missingRequiredFactorLowersConfidence", "fixtureFactorBlocksRealTimeClaim", "unlicensedFactorBlocksPersonalizedAdvice", "staleFactorRequiresWarning"],
                  },
                  dataFreshnessFallbackEvidencePackage: {
                    id: "ai-data-freshness-fallback-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-stale-data-release",
                    canHideFallbackMode: false,
                    freshnessWindows: { marketDataMaxDelayMinutes: 20, newsMaxAgeHours: 24, filingsMaxAgeDays: 7, macroMaxAgeDays: 45 },
                    fallbackModes: ["fixture", "provider-error-fixture-fallback", "stale-cache", "insufficient-information"],
                    requiredUserVisibleFlags: ["providerRuntimeMode", "sourceStatus", "updatedAt", "delayedOrFixtureLabel", "insufficientInformationReason"],
                  },
                  modelEvaluationPolicy: {
                    status: "blocked",
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
                  },
                  modelEvaluationEvidencePackage: {
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
                  },
                  humanReviewPolicy: {
                    status: "blocked",
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
                  },
                  releasePolicy: {
                    status: "blocked",
                    releaseMode: "dry-run-no-model-release",
                    canPromoteModelVersion: false,
                    rolloutStages: ["internal", "1-percent", "10-percent", "50-percent", "100-percent"],
                    requiredVersionLocks: [
                      "modelId",
                      "promptVersion",
                      "factorWeightVersion",
                      "responseSchemaVersion",
                    ],
                    rollbackSwitch: "FINANCE_AI_MODEL_RUNTIME=inactive",
                    requiresCanaryMetrics: true,
                    requiresChangeApproval: true,
                    requiresRollbackRunbook: true,
                  },
                  modelReleaseRollbackEvidencePackage: {
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
                    releaseBlockersThatMustRemainBlocked: ["liveModelGate", "providerRuntime"],
                  },
                  modelTimeoutFallbackPolicy: {
                    status: "defined",
                    mode: "empty-no-fixture-no-advice",
                    timeoutMs: 45000,
                    errorCode: "REAL_AI_MODEL_TIMEOUT_EMPTY",
                    canShowPartialModelOutput: false,
                    canUseFixtureFallback: false,
                    canUseMockRuleFallback: false,
                    keepsUserVisibleBlankState: true,
                    requiresRetryWithBackoff: true,
                    forbiddenFallbacks: [
                      "fixture-analysis",
                      "sample-analysis",
                      "mock-rule-based-analysis",
                      "local-rule-trade-plan",
                    ],
                  },
                  runtimeMonitoringPolicy: {
                    status: "blocked",
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
                  },
                  missingEnvVars: ["FINANCE_AI_MODEL_PROVIDER"],
                  safety: {
                    noVendorNetworkCalls: true,
                    noTradingActions: true,
                    forbidsGuaranteedReturns: true,
                    requiresCostControls: true,
                    requiresSourceGrounding: true,
                  },
                  blockedReasons: ["模型调用成本预算、限流或 token 上限尚未配置。"],
                },
              },
            }),
          };
        }
        if (url.endsWith("/api/data-sources")) {
          return {
            ok: true,
            json: async () => ({
              activeProvider: {
                id: "mock",
                name: "Mock Sample Provider",
                mode: "sample",
                status: "connected",
                capabilities: [],
              },
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
      location: { protocol: "http:", hostname: "127.0.0.1", port: "4173" },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.ok(requestedUrls.some((url) => url.endsWith("/api/ai-services")));
  assert.match(app.byId.get("aiServiceState").innerHTML, /审计策略 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /输出校验 blocked · dry-run-no-user-visible-invalid-output · 校验器 6 · 不发布未确认输出 · 失败需回退/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /概率 0-100% · 情景误差 ≤2% · 禁用 guaranteedReturn \/ mustBuy \/ mustSell \/ riskFree \/ profitPromise/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /responseValidation:blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /成本限流 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /来源覆盖 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子输入 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子权重 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型评测 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /通过率 95% · 幻觉率 ≤1%/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /评测证据包 defined · dry-run-no-model-certification · 材料 8 · 不认证模型 · 不发布用户建议 · 需人工审批/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实数据证据包 defined · dry-run-no-live-model-grounding · 来源 5 类 · 字段 8 · 不无来源发布/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /禁止 rawArticleText \/ paywalledFullText \/ providerApiKey \/ rawSocialPost/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子覆盖证据包 defined · dry-run-no-factor-overconfidence · 因子 6 项 · 可操作需 6 项 · 缺失不高置信/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /fixtureFactorBlocksRealTimeClaim/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /新鲜度回退证据包 defined · dry-run-no-stale-data-release · 行情延迟≤20分钟 · 新闻≤24小时 · 不隐藏回退/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /provider-error-fixture-fallback/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型超时 defined · empty-no-fixture-no-advice · REAL_AI_MODEL_TIMEOUT_EMPTY · 45000ms · 保持空白 · 不使用 fixture\/mock/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /禁止 fixture-analysis \/ sample-analysis \/ mock-rule-based-analysis \/ local-rule-trade-plan/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /人工复核 blocked · dry-run-no-user-visible-escalation · 阈值 55% · 不升级人工 · 用户可见回退/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /low-confidence-probability \/ insufficient-source-evidence \/ prohibited-claim-detected/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /humanReview:blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型发布 blocked · dry-run-no-model-release · 阶段 5 · 不发布版本 · 发布需审批/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /发布回滚证据包 defined · dry-run-no-model-release · 材料 8 · 不发布版本 · 不启用 live runtime · 需人工审批/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /modelId \/ promptVersion \/ factorWeightVersion \/ responseSchemaVersion/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /modelRelease:blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /运行监控 blocked · dry-run-no-live-monitoring · 信号 6 · 不监控真实运行 · 需值班手册/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /幻觉率 ≤1% · schema 错误 ≤2% · P95 ≤8000ms · 来源覆盖 ≥95%/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /runtimeMonitoring:blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /调用预检 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型配置向导 ready-for-user-configuration · no-secret-model-provider-setup-guide · 分组 3 · 不读模型密钥 · 不调用真实模型/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /推荐模型 gpt-5\.5 · 接口 responses · base URL unconfigured · 待模型 key/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /\/private\/tmp\/finance_ai_model_key/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型配置分组 模型 Provider:missing-config \/ 模型安全门禁:missing-config \/ 模型评测与发布:missing-config/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型 Smoke 顺序 凭证预检 → 结构化校验 → 来源引用 → 人工回退 → 发布回滚/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型安全边界 禁止 modelApiKey \/ rawPrompt \/ rawModelResponse \/ rawSourceText \/ rawPortfolioNotes · 不写 env · 不启用 live runtime · 已过 2\/3/);
  assert.equal(JSON.parse(app.localStorage.getItem("apiAiServiceStatus")).model, "rule-based-sample-v0");
});

test("LAN webpage auto-connects to backend on the same host", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {},
    {
      fetchImpl: createStartupBackendFetch(requestedUrls),
      location: { protocol: "http:", hostname: "192.168.1.23", port: "4173" },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.equal(app.localStorage.getItem("apiBaseUrl"), "http://192.168.1.23:4180");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.ok(requestedUrls.some((url) => url === "http://192.168.1.23:4180/health"));
  assert.ok(requestedUrls.some((url) => url === "http://192.168.1.23:4180/api/data-sources"));
  assert.match(app.byId.get("dataSourceState").innerHTML, /192\.168\.1\.23:4180/);
});

test("public webpage uses same-origin backend API instead of localhost", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url === "/health") {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              service: "finance-ai-assistant-backend",
            }),
          };
        }
        if (url === "/api/data-sources") {
          return {
            ok: true,
            json: async () => ({
              activeProvider: {
                id: "public-preview",
                name: "Public Preview Provider",
                mode: "delayed",
                status: "connected",
                coverage: ["us"],
                capabilities: ["stockSearch", "analysisInputs", "fixtureMarketDataRead"],
                mockDataAllowed: false,
                realtimeStatus: {
                  marketQuote: "real-provider-enabled",
                  news: "provider-path-enabled-empty-on-error",
                },
                marketDataAdapter: {
                  status: "blocked",
                  runtimeMode: "delayed",
                  selectedProvider: "multi-free",
                  canFetchQuotes: true,
                  canReadFixtures: true,
                  endpointContracts: [{ id: "quote", method: "getQuote", status: "planned", fixtureStatus: "available" }],
                  fixtureReadModel: {
                    status: "available",
                    quoteCount: 3,
                    markets: ["us"],
                    source: "local-fixture-market-data",
                  },
                  safety: { noVendorNetworkCalls: false, noTradingActions: true },
                  requestPolicyGate: {
                    status: "blocked",
                    canUseProvider: false,
                    canUseFixture: true,
                    fallback: "fixture-or-local-sample",
                    checks: [{ id: "runtimeMode", status: "blocked" }],
                  },
                  requestExecutionPlan: {
                    status: "fallback-only",
                    mode: "status-preview",
                    cache: {
                      outcome: "fixture-fallback",
                      key: "mock:us:MSFT:spot:snapshot",
                      ttlSeconds: 15,
                      maxStaleSeconds: 300,
                    },
                    rateLimit: { outcome: "not-applied-for-fixture" },
                    fallback: { selected: "fixture-or-local-sample", localSampleAllowed: true },
                    auditDraft: { eventType: "marketData.request.policyGate" },
                  },
                  disclaimer: "当前为样例行情适配器说明，不代表真实行情。",
                },
              },
            }),
          };
        }
        if (url === "/api/project/progress") {
          return {
            ok: true,
            json: async () => ({ progress: projectProgress }),
          };
        }
        return {
          ok: true,
          json: async () => ({ status: "empty" }),
        };
      },
      location: { protocol: "https:", hostname: "finance-ai-preview.example.com", port: "" },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "connected");
  assert.ok(requestedUrls.includes("/health"));
  assert.ok(requestedUrls.includes("/api/data-sources"));
  assert.ok(!requestedUrls.some((url) => String(url).includes("localhost")));
  assert.equal(app.localStorage.getItem("apiBaseUrl"), "");
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前后端连接：同源 \/api/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /当前后端地址：。|当前后端连接：。/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /离线契约演练可用，不作为真实数据兜底/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /offline-rehearsal/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /fixture|mock|sample|样例|开发样例开关开启/i);
});

test("explicit local data-source choice skips startup backend auto-connect", async () => {
  const requestedUrls = [];
  const app = createHarness(
    { apiMode: "local" },
    {
      fetchImpl: createStartupBackendFetch(requestedUrls),
      location: { protocol: "http:", hostname: "127.0.0.1", port: "4173" },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.startupBackendConnection;

  assert.equal(result.status, "skipped");
  assert.deepEqual(requestedUrls, []);
  assert.equal(app.localStorage.getItem("apiMode"), "local");
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前为严格真实数据空白模式/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /改用本机样例|当前使用本机样例数据/);
});

test("install prompt button reports accepted and dismissed choices", async () => {
  const acceptedApp = createHarness();
  let acceptedPrompted = false;
  let acceptedPrevented = false;
  await acceptedApp.dispatchWindowEvent("beforeinstallprompt", {
    preventDefault: () => {
      acceptedPrevented = true;
    },
    prompt: async () => {
      acceptedPrompted = true;
    },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });

  assert.equal(acceptedPrevented, true);
  assert.equal(acceptedApp.byId.get("installButton").hidden, false);
  await acceptedApp.byId.get("installButton").click();
  assert.equal(acceptedPrompted, true);
  assert.equal(acceptedApp.byId.get("installButton").hidden, true);
  assert.match(acceptedApp.byId.get("statusMessage").textContent, /安装流程已启动/);

  const dismissedApp = createHarness();
  await dismissedApp.dispatchWindowEvent("beforeinstallprompt", {
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  await dismissedApp.byId.get("installButton").click();

  assert.equal(dismissedApp.byId.get("installButton").hidden, true);
  assert.match(dismissedApp.byId.get("statusMessage").textContent, /已取消安装/);
});

test("appinstalled event hides install button and confirms installation", async () => {
  const app = createHarness();
  await app.dispatchWindowEvent("beforeinstallprompt", {
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  assert.equal(app.byId.get("installButton").hidden, false);

  await app.dispatchWindowEvent("appinstalled");

  assert.equal(app.byId.get("installButton").hidden, true);
  assert.match(app.byId.get("statusMessage").textContent, /已安装到设备/);
});

test("service worker registration failure is surfaced without crashing startup", async () => {
  const app = createHarness(
    {},
    {
      navigatorImpl: {
        serviceWorker: {
          register: async () => {
            throw new Error("注册被浏览器阻止");
          },
        },
      },
    },
  );

  await Promise.resolve();
  await Promise.resolve();

  assert.match(app.byId.get("statusMessage").textContent, /离线缓存暂不可用/);
  assert.match(app.byId.get("statusMessage").textContent, /注册被浏览器阻止/);
});

test("service worker ready state reports offline cache once per version", async () => {
  const firstRun = createHarness(
    {},
    {
      navigatorImpl: {
        serviceWorker: {
          register: async () => ({ active: true }),
          ready: Promise.resolve({ active: true }),
        },
      },
    },
  );

  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }

  assert.equal(
    firstRun.localStorage.getItem("offlineCacheReadyVersion"),
    "finance-ai-assistant-v142",
  );
  assert.match(firstRun.byId.get("statusMessage").textContent, /离线缓存已准备/);
  assert.match(firstRun.byId.get("statusMessage").textContent, /finance-ai-assistant-v142/);

  const secondRun = createHarness(firstRun.localStorage.snapshot(), {
    navigatorImpl: {
      serviceWorker: {
        register: async () => ({ active: true }),
        ready: Promise.resolve({ active: true }),
      },
    },
  });

  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }

  assert.equal(
    secondRun.localStorage.getItem("offlineCacheReadyVersion"),
    "finance-ai-assistant-v142",
  );
  assert.doesNotMatch(secondRun.byId.get("statusMessage").textContent, /离线缓存已准备/);
});

test("backend health check stores connected API state", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {},
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/api/data-sources")) {
          return {
            ok: true,
            json: async () => ({
              activeProvider: {
                id: "mock",
                name: "Mock Sample Provider",
                mode: "sample",
                status: "connected",
                coverage: ["a", "hk", "us"],
                capabilities: [
                  "markets",
                  "stockSearch",
                  "marketNews",
                  "priceHistory",
                  "integrationPlan",
                  "providerRegistry",
                  "vendorReadinessChecklist",
                  "marketDataVendorChecklist",
                  "newsFilingsVendorChecklist",
                  "macroDataVendorChecklist",
                  "publicStatementsVendorChecklist",
                  "marketDataAdapter",
                  "macroDataAdapter",
                  "fixtureMacroDataRead",
                ],
                integrationPlan: {
                  id: "real-data-source-integration-plan",
                  status: "blocked",
                  mode: "planning",
                  targetMarkets: ["a", "hk", "us"],
                  configuredRequiredCount: 0,
                  requiredSourceCount: 3,
                  configuredOptionalCount: 0,
                  plannedSources: [
                    {
                      id: "marketData",
                      label: "实时/延迟行情",
                      required: true,
                      configured: false,
                      markets: ["a", "hk", "us"],
                      capabilities: ["quotes", "priceHistory"],
                      envVars: [
                        { name: "FINANCE_AI_MARKET_DATA_PROVIDER", configured: false },
                        { name: "FINANCE_AI_MARKET_DATA_API_KEY", configured: false, secret: true },
                      ],
                    },
                  ],
                  complianceChecks: [{ id: "licenseReview", label: "数据授权审查", status: "blocked" }],
                  dryRunPreflightPlan: {
                    id: "real-data-source-integration-dry-run-preflight",
                    status: "defined",
                    mode: "dry-run-no-provider-fetch",
                    requiredManualApproval: true,
                    canCallProviderNetwork: false,
                    canEnableLiveRuntime: false,
                  },
                  blockedReasons: ["实时行情、新闻/公告或宏观数据 provider 尚未完整配置。"],
                  nextSteps: ["选择并确认数据源授权条款。"],
                  disclaimer: "当前为真实数据源接入计划。",
                },
                providerRegistry: {
                  id: "real-data-provider-registry",
                  status: "blocked",
                  activeRuntimeProvider: "mock",
                  readyRequiredCount: 0,
                  requiredProviderCount: 3,
                  candidateProviders: [
                    {
                      id: "licensed-market-data",
                      groupId: "marketData",
                      label: "授权行情 Provider",
                      mode: "delayed-or-live",
                      adapterModule: "backend/providers/market-data-provider.mjs",
                    },
                  ],
                  selectedProviders: [
                    {
                      groupId: "marketData",
                      label: "实时/延迟行情",
                      required: true,
                      selectedProvider: "",
                      providerEnv: "FINANCE_AI_MARKET_DATA_PROVIDER",
                      credentialEnv: "FINANCE_AI_MARKET_DATA_API_KEY",
                      configured: false,
                      supported: true,
                      status: "missing-config",
                      candidateIds: ["licensed-market-data"],
                      missingEnvVars: [
                        "FINANCE_AI_MARKET_DATA_PROVIDER",
                        "FINANCE_AI_MARKET_DATA_API_KEY",
                      ],
                    },
                  ],
                  rolloutPreflightPlan: {
                    id: "real-data-provider-registry-rollout-preflight",
                    status: "defined",
                    mode: "dry-run-no-provider-runtime",
                    activeRuntimeProvider: "mock",
                    requiredProviderGroups: ["marketData", "marketNews", "macroData"],
                    canEnableLiveRuntime: false,
                  },
                  blockedReasons: ["实时/延迟行情 未完成可用 provider 配置。"],
                  nextSteps: ["为每个必选数据分组选择一个已注册 provider id。"],
                  disclaimer: "Provider 注册表只描述真实数据源选择和配置状态。",
                },
                vendorReadinessChecklist: {
                  id: "real-data-vendor-readiness-checklist",
                  status: "blocked",
                  mode: "planning",
                  preferredContactOrder: ["marketData", "marketNews", "macroData", "publicStatements"],
                  targetMarkets: ["a", "hk", "us"],
                  groups: [
                    {
                      id: "marketData",
                      label: "行情数据",
                      candidateProviderIds: ["licensed-market-data"],
                      requiredCapabilities: ["quotes", "priceHistory", "tradingCalendar", "delayLabel"],
                      requiredLicensing: ["exchangeDisplayRights", "cachePermission", "redistributionBoundary"],
                      costDrivers: ["symbols", "requestVolume"],
                      preferredSequence: 1,
                    },
                  ],
                  checklistItems: [
                    { id: "mvpMarketCoverage", label: "MVP 市场覆盖", status: "pass", evidence: "A/HK/US" },
                    { id: "candidateShortlist", label: "候选供应商分组", status: "pass", evidence: "provider ids" },
                    { id: "marketDataFirstSequence", label: "接入顺序", status: "pass", evidence: "market first" },
                    { id: "licenseReview", label: "授权审查", status: "blocked", evidence: "未确认" },
                  ],
                  passedCount: 3,
                  totalCount: 8,
                  blockedCount: 3,
                  pendingCount: 2,
                  nextActions: ["先联系行情 provider。", "第二步联系新闻/公告 provider。"],
                  disclaimer: "该清单用于供应商筛选和授权准备，不代表任何 provider 已签约、已付款、已接入或可用于生产投资服务。",
                },
                vendorContractHandoffPackage: {
                  id: "real-data-vendor-contract-handoff-package",
                  status: "defined",
                  mode: "dry-run-no-contract-signing",
                  canSignVendorContract: false,
                  canEnableProviderRuntime: false,
                  requiredManualApproval: true,
                  requiredArtifacts: ["exchange-display-rights", "cache-redistribution-terms"],
                  forbiddenArtifacts: ["providerApiKey", "unredactedContract"],
                  reviewRoles: ["product-owner", "data-source-reviewer", "compliance-officer"],
                  disclaimer: "该交接包只定义供应商合同、授权和成本审查所需材料，不代表任何真实数据 provider 已签约。",
                },
                providerSecretQuotaRunbook: {
                  id: "real-data-provider-secret-quota-runbook",
                  status: "defined",
                  mode: "dry-run-no-secret-use",
                  canReadProviderSecrets: false,
                  canCallProviderNetwork: false,
                  requiredManualApproval: true,
                  secretControls: {
                    requiredVaultFields: ["providerId", "credentialRef", "rotationOwner"],
                  },
                  quotaControls: {
                    requiredLimits: ["requestsPerMinute", "requestsPerDay", "monthlyCostLimit"],
                    fallbackMode: "mock-provider-and-stale-cache",
                    blocksUnboundedRequests: true,
                  },
                  auditControls: {
                    redactsSecrets: true,
                    hashChainRequired: true,
                  },
                  disclaimer: "该运行手册只定义真实 provider 密钥、额度、成本和审计边界；当前不会读取密钥、联网请求。",
                },
                providerSetupGuide: {
                  id: "real-provider-setup-guide",
                  status: "ready-for-user-configuration",
                  mode: "no-secret-provider-setup-guide",
                  activeRuntimeProvider: "mock",
                  setupGroups: [
                    {
                      id: "marketData",
                      label: "行情 Provider",
                      status: "missing-config",
                      selectedProvider: "",
                      requiredEnvVars: [
                        "FINANCE_AI_MARKET_DATA_PROVIDER",
                        "FINANCE_AI_MARKET_DATA_API_KEY",
                        "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
                      ],
                      missingEnvVars: [
                        "FINANCE_AI_MARKET_DATA_PROVIDER",
                        "FINANCE_AI_MARKET_DATA_API_KEY",
                      ],
                      smokeEndpoint: "GET /api/market-data/quote?market=us&code=IBM",
                      forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
                    },
                    {
                      id: "marketNews",
                      label: "新闻情绪 Provider",
                      status: "missing-config",
                      selectedProvider: "",
                      requiredEnvVars: [
                        "FINANCE_AI_NEWS_PROVIDER",
                        "FINANCE_AI_NEWS_API_KEY",
                        "FINANCE_AI_NEWS_ALLOW_NETWORK",
                      ],
                      missingEnvVars: ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"],
                      smokeEndpoint: "GET /api/news/intelligence?market=us&symbol=AAPL&minImportance=70",
                      forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
                    },
                    {
                      id: "macroData",
                      label: "宏观数据 Provider",
                      status: "missing-config",
                      selectedProvider: "",
                      requiredEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
                      missingEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
                      smokeEndpoint: "GET /api/data-sources/macro-data-adapter",
                      forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
                    },
                    {
                      id: "publicStatements",
                      label: "公开言论 Provider",
                      status: "missing-config",
                      selectedProvider: "",
                      requiredEnvVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
                      missingEnvVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
                      smokeEndpoint: "GET /api/data-sources/news-filings-adapter",
                      forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
                    },
                  ],
                  smokeOrder: ["marketDataQuote", "newsSentiment", "macroContext", "publicStatements"],
                  checklistItems: [
                    { id: "setupGuideDefined", label: "真实 Provider 配置向导", status: "pass" },
                    { id: "requiredEnvVarsMapped", label: "环境变量映射", status: "pass" },
                    { id: "secretRedactionRulesDefined", label: "密钥脱敏规则", status: "pass" },
                    { id: "smokeOrderDefined", label: "Smoke 测试顺序", status: "pass" },
                    { id: "realKeysSupplied", label: "真实 Key 已填写", status: "blocked" },
                  ],
                  passedCount: 4,
                  totalCount: 5,
                  readyForSmokeCount: 0,
                  forbiddenAuditFields: ["apiKey", "providerSecret", "providerResponseRaw", "rawArticleBody", "rawProviderUrl"],
                  canReadProviderSecrets: false,
                  canWriteEnvFile: false,
                  canEnableLiveRuntime: false,
                  nextActions: ["优先填写 Alpha Vantage 行情和新闻情绪 demo/真实 key，完成 quote/news smoke。"],
                  disclaimer: "该配置向导只说明真实 provider 接入步骤和安全边界；不会读取、保存、显示真实密钥，也不会自动启用 live runtime。",
                },
                marketDataVendorChecklist: {
                  id: "market-data-vendor-acceptance-checklist",
                  status: "blocked",
                  mode: "planning",
                  targetMarkets: ["a", "hk", "us"],
                  providerCandidateId: "licensed-market-data",
                  acceptanceAreas: [
                    { id: "quoteContract", label: "报价接口", requiredFields: ["symbol", "lastPrice", "asOf", "delayMinutes"], status: "defined" },
                    { id: "historyContract", label: "历史走势", requiredFields: ["open", "high", "low", "close"], status: "defined" },
                    { id: "tradingCalendar", label: "交易日历", requiredFields: ["market", "sessionDate", "timezone", "holidayName"], status: "defined" },
                    { id: "delayLabel", label: "延迟标签", requiredFields: ["realTimeOrDelayed", "delayMinutes", "displayNearPrice", "displayNearChart"], status: "defined" },
                  ],
                  checklistItems: [
                    { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "licensed-market-data" },
                    { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "quotes/history/calendar/delay" },
                    { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
                    { id: "exchangeDisplayRights", label: "交易所展示授权", status: "blocked", evidence: "未确认" },
                  ],
                  passedCount: 3,
                  totalCount: 9,
                  blockedCount: 3,
                  pendingCount: 3,
                  requiredQuestions: ["A/HK/US 分别支持实时还是延迟报价？", "缓存 TTL 是多少？"],
                  nextActions: ["优先拿到展示授权样例条款。", "映射到 adapter policy。"],
                  disclaimer: "该行情验收清单仅用于供应商沟通和接入前评审，不代表真实行情 provider 已签约、已付款、已接入或可用于投资服务。",
                },
                newsFilingsVendorChecklist: {
                  id: "news-filings-vendor-acceptance-checklist",
                  status: "blocked",
                  mode: "planning",
                  targetMarkets: ["a", "hk", "us"],
                  providerCandidateId: "licensed-news-filings",
                  acceptanceAreas: [
                    { id: "headlineSummary", label: "标题摘要", requiredFields: ["title", "summary", "source.label", "publishedAt"], status: "defined" },
                    { id: "shortExcerpt", label: "短摘录", requiredFields: ["excerpt", "maxExcerptChars", "language", "sourceUrl"], status: "defined" },
                    { id: "sourceLink", label: "原文链接", requiredFields: ["sourceUrl", "canonicalUrl", "publisher", "retrievedAt"], status: "defined" },
                    { id: "retentionPolicy", label: "保留天数", requiredFields: ["retentionDays", "deleteAfter", "archiveAllowed", "auditEvent"], status: "defined" },
                    { id: "paywallBoundary", label: "付费墙边界", requiredFields: ["paywallStatus", "ingestionAllowed", "excerptAllowed", "linkOnlyFallback"], status: "defined" },
                  ],
                  checklistItems: [
                    { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "licensed-news-filings" },
                    { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "headline/excerpt/link/retention/paywall" },
                    { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
                    { id: "headlineRights", label: "标题摘要授权", status: "blocked", evidence: "未确认" },
                  ],
                  passedCount: 3,
                  totalCount: 9,
                  blockedCount: 4,
                  pendingCount: 2,
                  requiredQuestions: ["标题、摘要、短摘录分别允许展示多少字符？", "付费墙内容是否只能展示标题和来源链接？"],
                  nextActions: ["优先确认标题摘要和短摘录授权。", "映射到 redistribution policy。"],
                  disclaimer: "该新闻/公告验收清单仅用于供应商沟通和接入前评审，不代表真实新闻、公告或公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
                },
                macroDataVendorChecklist: {
                  id: "macro-data-vendor-acceptance-checklist",
                  status: "blocked",
                  mode: "planning",
                  targetMarkets: ["a", "hk", "us"],
                  providerCandidateId: "official-macro-data",
                  acceptanceAreas: [
                    { id: "rateIndicators", label: "利率指标", requiredFields: ["indicatorId", "value", "unit", "asOf"], status: "defined" },
                    { id: "fxIndicators", label: "汇率指标", requiredFields: ["pair", "value", "asOf", "timezone"], status: "defined" },
                    { id: "inflationIndicators", label: "通胀指标", requiredFields: ["indicatorId", "period", "value", "revisionId"], status: "defined" },
                    { id: "policyEvents", label: "政策事件", requiredFields: ["eventId", "title", "jurisdiction", "timezone"], status: "defined" },
                    { id: "revisionPolicy", label: "修订规则", requiredFields: ["revisionId", "previousValue", "revisedValue", "sourceUrl"], status: "defined" },
                  ],
                  checklistItems: [
                    { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "official-macro-data" },
                    { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "rates/fx/inflation/policy/revision" },
                    { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
                    { id: "asOfLabels", label: "asOf 标签", status: "blocked", evidence: "未确认" },
                  ],
                  passedCount: 3,
                  totalCount: 10,
                  blockedCount: 3,
                  pendingCount: 4,
                  requiredQuestions: ["每个指标的 asOf、publishedAt、revisionId 字段是否稳定？", "政策日历的时区和延期规则是什么？"],
                  nextActions: ["优先确认利率、汇率、通胀和政策日历的官方来源条款。", "映射到 macro-data-provider adapter。"],
                  disclaimer: "该宏观数据验收清单仅用于供应商沟通和接入前评审，不代表真实宏观 provider 已签约、已付款、已接入或可用于投资服务。",
                },
                publicStatementsVendorChecklist: {
                  id: "public-statements-vendor-acceptance-checklist",
                  status: "blocked",
                  mode: "planning",
                  targetMarkets: ["a", "hk", "us"],
                  providerCandidateId: "verified-public-statements",
                  acceptanceAreas: [
                    { id: "verifiedIdentity", label: "身份验证", requiredFields: ["speakerId", "speakerName", "speakerRole", "verificationStatus"], status: "defined" },
                    { id: "sourceUrl", label: "原始链接", requiredFields: ["sourceUrl", "platform", "postedAt", "retrievedAt"], status: "defined" },
                    { id: "speakerRole", label: "发言人角色", requiredFields: ["roleType", "organization", "jurisdiction", "isMarketSensitive"], status: "defined" },
                    { id: "platformTerms", label: "平台条款", requiredFields: ["platform", "termsStatus", "redistributionAllowed", "retentionDays"], status: "defined" },
                    { id: "shortExcerptBoundary", label: "短摘录边界", requiredFields: ["excerpt", "maxExcerptChars", "language", "sourceUrl"], status: "defined" },
                    { id: "manualReviewQueue", label: "人工复核队列", requiredFields: ["reviewStatus", "reviewReason", "priority", "slaHours"], status: "defined" },
                  ],
                  checklistItems: [
                    { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "verified-public-statements" },
                    { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "identity/source/role/terms/excerpt/review" },
                    { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
                    { id: "identityVerification", label: "身份验证规则", status: "blocked", evidence: "未确认" },
                  ],
                  passedCount: 3,
                  totalCount: 10,
                  blockedCount: 4,
                  pendingCount: 3,
                  requiredQuestions: ["CEO、公司账号、政府高层和监管账号分别使用哪些身份验证信号？", "未验证账号和疑似高影响言论如何进入人工复核队列？"],
                  nextActions: ["优先确认已验证发言人身份、来源链接和平台条款边界。", "映射到 source-verification/manual-review policy。"],
                  disclaimer: "该公开言论验收清单仅用于供应商沟通和接入前评审，不代表真实公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
                },
                marketDataAdapter: {
                  id: "market-data-provider-adapter",
                  name: "Market Data Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  requestedMode: "delayed",
                  selectedProvider: "",
                  configured: false,
                  supported: true,
                  canFetchQuotes: false,
                  supportedProviderIds: ["licensed-market-data", "twelve-data", "alpha-vantage", "multi-free"],
                  missingEnvVars: [
                    "FINANCE_AI_MARKET_DATA_PROVIDER",
                    "FINANCE_AI_MARKET_DATA_API_KEY",
                    "FINANCE_AI_MARKET_DATA_ENTITLEMENTS_READY",
                    "FINANCE_AI_MARKET_DATA_DELAY_LABELS_READY",
                    "FINANCE_AI_MARKET_DATA_PRECHECK_READY",
                  ],
                  endpointContracts: [
                    { id: "quote", method: "getQuote", status: "planned" },
                    { id: "history", method: "getPriceHistory", status: "planned" },
                  ],
                  entitlementPolicy: {
                    status: "blocked",
                    tiers: ["sample", "delayed", "live"],
                    requiresUserEntitlement: true,
                    requiresExchangeAgreement: true,
                    blocksRedistributionWithoutLicense: true,
                    forbiddenAuditFields: ["rawTick", "fullOrderBook"],
                  },
                  delayLabelPolicy: {
                    status: "blocked",
                    requiredLabels: ["sample-not-real-time", "delayed", "live"],
                    displayNearPrice: true,
                    displayNearChart: true,
                    blocksLiveLabelWithoutEntitlement: true,
                    defaultDelayMinutes: 15,
                  },
                  providerPreflightPlan: {
                    status: "blocked",
                    mode: "dry-run-no-provider-request",
                    canRequestProvider: false,
                    providerRequestAllowed: false,
                    requiredManualApproval: true,
                  },
                  alphaVantageConnector: {
                    id: "alpha-vantage-quote-connector",
                    status: "defined",
                    providerId: "alpha-vantage",
                    functionName: "GLOBAL_QUOTE",
                    officialEndpoint: "https://www.alphavantage.co/query",
                    supportedMarkets: ["a", "hk", "us"],
                    requiresApiKey: true,
                    requiresExplicitNetworkFlag: true,
                    networkEnabled: false,
                    canRequestProvider: false,
                    forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
                  },
                  alphaVantageSmokeTestPlan: {
                    id: "alpha-vantage-demo-smoke-test-plan",
                    status: "defined",
                    mode: "real-provider-demo-key-smoke",
                    demoSymbol: "IBM",
                    expectedFields: ["01. symbol", "05. price", "06. volume", "07. latest trading day", "10. change percent"],
                    canUseDemoEndpoint: true,
                    canUseProductionKey: false,
                    blocksIfMissingAttribution: true,
                  },
                  alphaVantageCredentialPreflight: {
                    id: "alpha-vantage-quote-credential-preflight",
                    status: "blocked",
                    mode: "no-secret-credential-preflight",
                    apiKeyStatus: "missing",
                    networkStatus: "disabled",
                    missingRequiredEnvVars: ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"],
                    canRunDemoSmoke: false,
                    canValidateProductionKey: false,
                  },
                  safety: {
                    noVendorNetworkCalls: true,
                    noTradingActions: true,
                    requiresAttribution: true,
                    requiresLicenseReview: true,
                    mockFallbackActive: false,
          emptyOnModelFailure: true,
                  },
                  blockedReasons: ["行情 provider id 或 API key 尚未配置。"],
                  nextSteps: ["实现 getQuote、getPriceHistory、getTradingCalendar。"],
                  disclaimer: "当前为行情 provider adapter 骨架。",
                },
                macroDataAdapter: {
                  id: "macro-data-provider-adapter",
                  name: "Macro Data Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  configured: false,
                  supported: true,
                  canFetchLiveMacro: false,
                  canReadFixtures: true,
                  processing: {
                    macroFactorLinking: "six-factor-macro-input-v1",
                    indicatorNormalization: "fixture-indicator-score-v1",
                    policyEventScoring: "importance-score-fixture-v1",
                  },
                  fixtureReadModel: {
                    status: "available",
                    contextCount: 3,
                    indicatorCount: 10,
                    policyEventCount: 3,
                    markets: ["a", "hk", "us"],
                    source: "local-fixture-macro-data",
                  },
                  missingEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
                  endpointContracts: [
                    { id: "macroContext", method: "getMacroContext", status: "planned", fixtureStatus: "available" },
                    { id: "policyCalendar", method: "listPolicyEvents", status: "planned", fixtureStatus: "available" },
                  ],
                  safety: {
                    noVendorNetworkCalls: true,
                    noTradingActions: true,
                    requiresAttribution: true,
                    requiresLicenseReview: true,
                    mockFallbackActive: false,
          emptyOnModelFailure: true,
                  },
                  blockedReasons: ["宏观经济 provider id 或 API key 尚未配置。"],
                  disclaimer: "当前为宏观经济 provider adapter 骨架。",
                },
                disclaimer: "当前为样例数据源，不代表实时行情。",
              },
              providers: [],
            }),
          };
        }
        if (url.endsWith("/api/market-data/runtime-status")) {
          return {
            ok: true,
            json: async () => ({
              activeRuntime: {
                id: "mock-market-data-runtime",
                name: "Mock 行情请求运行时",
                mode: "sample-observability",
                status: "ready",
                executionMode: "no-vendor-network",
                cacheStore: "memory-sample",
                cachePolicy: {
                  freshnessModel: "fresh-stale-expired",
                  maxRecords: 200,
                  staleFallback: "serve-stale-then-refresh-sample",
                },
                cacheRecordCount: 2,
                rateLimitWindowCount: 1,
                rateLimitWindowSeconds: 60,
                circuitBreakerPolicy: {
                  failureThreshold: 5,
                  coolDownSeconds: 60,
                  halfOpenProbe: "next-success-closes-sample-breaker",
                },
                cacheRecords: [
                  {
                    key: "mock:a:600519:spot:snapshot",
                    kind: "quote",
                    cachedAt: "2026-06-01T00:00:00.000Z",
                    freshUntil: "2026-06-01T00:15:00.000Z",
                    maxStaleUntil: "2026-06-01T00:45:00.000Z",
                    state: "fresh",
                  },
                ],
                rateLimitWindows: [
                  {
                    key: "mock:quote",
                    count: 0,
                    limit: 60,
                    remaining: 60,
                    windowEndsAt: "2026-06-01T00:01:00.000Z",
                  },
                ],
                circuitBreakers: [
                  {
                    key: "mock:quote",
                    state: "closed",
                    consecutiveFailures: 0,
                    coolDownUntil: "",
                    reason: "",
                  },
                ],
                recentExecutions: [
                  {
                    executedAt: "2026-06-01T00:00:00.000Z",
                    requestKind: "quote",
                    cacheKey: "mock:a:600519:spot:snapshot",
                    cacheState: "fresh",
                    cacheHit: true,
                    refreshed: false,
                    rateLimitKey: "mock:quote",
                    rateLimitCount: 0,
                    fallback: "fixture-or-local-sample",
                    circuitState: "closed",
                  },
                ],
                capabilities: [
                  "cacheLookupTelemetry",
                  "cacheFreshnessTelemetry",
                  "rateLimitTelemetry",
                  "rateLimitWindowTelemetry",
                  "circuitBreakerTelemetry",
                  "fallbackTelemetry",
                  "auditEventDraftExecution",
                ],
                safety: { noVendorNetworkCalls: true, noTradingActions: true, fixtureOnly: true },
                disclaimer: "当前运行时只记录样例请求轨迹。",
              },
              runtimes: [],
            }),
          };
        }
        if (url.endsWith("/api/news/ingestion-runtime/status")) {
          return {
            ok: true,
            json: async () => ({
              activeRuntime: {
                id: "mock-news-ingestion-runtime",
                name: "Mock 新闻采集运行时",
                mode: "sample-observability",
                status: "ready",
                executionMode: "no-vendor-network",
                sourceTypes: ["news", "filing", "publicStatement"],
                cooldownWindowSeconds: 300,
                dedupeRecordCount: 1,
                sourceCooldowns: [
                  {
                    key: "news:a:600519",
                    runCount: 1,
                    cooldownUntil: "2026-06-01T00:05:00.000Z",
                    status: "cooldown-started",
                  },
                ],
                recentRuns: [
                  {
                    sourceKey: "news:a:600519",
                    sourceType: "news",
                    acceptedCount: 1,
                    duplicateCount: 0,
                    attributionMissingCount: 0,
                    blockedCount: 0,
                    cooldownStatus: "cooldown-started",
                  },
                ],
                capabilities: [
                  "sourcePollingTelemetry",
                  "deduplicationTelemetry",
                  "attributionGateTelemetry",
                  "licenseBoundaryTelemetry",
                  "publicStatementSafetyTelemetry",
                ],
                safety: {
                  noVendorNetworkCalls: true,
                  noSocialScraping: true,
                  noTradingActions: true,
                  fixtureOnly: true,
                  attributionRequired: true,
                },
                disclaimer: "当前新闻采集运行时只观察样例新闻，不抓取真实网站或社交媒体。",
              },
              runtimes: [],
            }),
          };
        }
        if (url.endsWith("/api/ai-services")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-ai-analysis",
                name: "Mock AI 分析服务",
                mode: "sample",
                status: "ready",
                model: "rule-based-sample-v0",
                capabilities: ["quantifiedProbability", "factorBreakdown", "complianceDisclaimer"],
                providerAdapter: {
                  id: "ai-provider-adapter",
                  name: "AI Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  selectedModel: "",
                  configured: false,
                  supported: true,
                  canCallLiveModel: false,
                  promptContract: {
                    version: "analysis-prompt-v0",
                    outputMode: "structured-json",
                    probabilityLanguage: "模型参考概率",
                    requiresNoGuaranteeDisclaimer: true,
                  },
                  responseSchema: {
                    status: "draft",
                    requiredFields: ["factorBreakdown", "tradePlan", "scenarioAnalysis"],
                    forbiddenFields: ["guaranteedReturn", "mustBuy", "mustSell"],
                  },
                  complianceGate: {
                    status: "blocked",
                    canCallLiveModel: false,
                    checks: [
                      { id: "providerConfig", status: "blocked" },
                      { id: "promptContract", status: "pass" },
                      { id: "responseSchema", status: "pass" },
                      { id: "auditReadiness", status: "blocked" },
                      { id: "secretManagement", status: "blocked" },
                      { id: "promptInjectionDefense", status: "blocked" },
                      { id: "dataMinimization", status: "blocked" },
                      { id: "citationEvidence", status: "blocked" },
                    ],
                    blockedReasons: ["模型请求审计、脱敏和留存规则尚未确认。"],
                  },
                  secretManagementPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-model-secret-use",
                    canUseProductionSecrets: false,
                    secretManager: "unconfigured",
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
                  },
                  promptInjectionDefensePolicy: {
                    status: "blocked",
                    mode: "dry-run-no-unsanitized-source-text",
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
                  },
                  dataMinimizationPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-personal-data-to-model",
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
                  },
                  citationEvidencePolicy: {
                    status: "blocked",
                    mode: "dry-run-no-uncited-model-output",
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
                    allowedSourceTypes: [
                      "news",
                      "filing",
                      "publicStatement",
                      "marketData",
                      "macroData",
                    ],
                    forbiddenEvidenceFields: [
                      "rawArticleText",
                      "rawSocialPost",
                      "paywalledFullText",
                      "personalData",
                    ],
                    requiresClaimCitationMap: true,
                    requiresStalenessWarning: true,
                  },
                  dataSourceEvidencePackage: {
                    id: "ai-data-source-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-live-model-grounding",
                    canPublishWithoutSourceRefs: false,
                    requiredSourceTypes: ["marketData", "news", "filing", "publicStatement", "macroData"],
                    requiredSourceFields: ["sourceId", "sourceType", "publisher", "publishedAt", "url", "providerRuntimeMode", "licenseStatus", "freshnessLabel"],
                    forbiddenSourceFields: ["rawArticleText", "paywalledFullText", "providerApiKey", "rawSocialPost"],
                    requiredManualChecks: ["providerLicenseReviewed", "sourceAttributionVisible", "stalenessLabelVisible", "fixtureFallbackDisclosed", "noRawProviderPayloadInPrompt"],
                  },
                  factorCoverageEvidencePackage: {
                    id: "ai-factor-coverage-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-factor-overconfidence",
                    canUseIncompleteFactorsForHighConfidence: false,
                    requiredFactors: ["macro", "industry", "fundamentals", "valuation", "technical", "sentiment"],
                    minReadyFactorsForActionableAnalysis: 6,
                    minReadyFactorsForEducationalAnalysis: 3,
                    requiredLabels: ["ready", "stale", "fixture", "missing", "unlicensed"],
                    fallbackRules: ["missingRequiredFactorLowersConfidence", "fixtureFactorBlocksRealTimeClaim", "unlicensedFactorBlocksPersonalizedAdvice", "staleFactorRequiresWarning"],
                  },
                  dataFreshnessFallbackEvidencePackage: {
                    id: "ai-data-freshness-fallback-evidence-package",
                    status: "defined",
                    mode: "dry-run-no-stale-data-release",
                    canHideFallbackMode: false,
                    freshnessWindows: { marketDataMaxDelayMinutes: 20, newsMaxAgeHours: 24, filingsMaxAgeDays: 7, macroMaxAgeDays: 45 },
                    fallbackModes: ["fixture", "provider-error-fixture-fallback", "stale-cache", "insufficient-information"],
                    requiredUserVisibleFlags: ["providerRuntimeMode", "sourceStatus", "updatedAt", "delayedOrFixtureLabel", "insufficientInformationReason"],
                  },
                  modelProviderSetupGuide: {
                    id: "ai-model-provider-setup-guide",
                    status: "ready-for-user-configuration",
                    mode: "no-secret-model-provider-setup-guide",
                    activeRuntimeMode: "inactive",
                    setupGroups: [
                      {
                        id: "modelProvider",
                        label: "模型 Provider",
                        requiredEnvVars: [
                          { name: "FINANCE_AI_MODEL_PROVIDER", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_API_KEY", configured: false, secret: true },
                          { name: "FINANCE_AI_MODEL_ID", configured: false, secret: false },
                        ],
                        optionalEnvVars: [
                          { name: "FINANCE_AI_MODEL_PROMPT_VERSION", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_MAX_CALLS_PER_MINUTE", configured: false, secret: false },
                        ],
                        smokeEndpoint: "GET /api/ai-services/provider-adapter",
                        forbiddenFields: ["modelApiKey", "rawPrompt", "rawModelResponse", "rawSourceText"],
                      },
                      {
                        id: "modelSafety",
                        label: "模型安全门禁",
                        requiredEnvVars: [
                          { name: "FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_SOURCE_COVERAGE_READY", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_CITATION_PACKAGE_READY", configured: false, secret: false },
                        ],
                        optionalEnvVars: [
                          { name: "FINANCE_AI_MODEL_PROMPT_INJECTION_GUARD_READY", configured: false, secret: false },
                        ],
                        smokeEndpoint: "GET /api/ai-services/provider-adapter",
                        forbiddenFields: ["unsanitizedSourceText", "paywalledFullText", "personalContact"],
                      },
                      {
                        id: "modelGovernance",
                        label: "模型评测与发布",
                        requiredEnvVars: [
                          { name: "FINANCE_AI_MODEL_EVALUATION_SUITE_READY", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY", configured: false, secret: false },
                          { name: "FINANCE_AI_MODEL_RELEASE_APPROVAL_READY", configured: false, secret: false },
                        ],
                        optionalEnvVars: [
                          { name: "FINANCE_AI_MODEL_HALLUCINATION_THRESHOLD_READY", configured: false, secret: false },
                        ],
                        smokeEndpoint: "GET /api/ai-services/provider-adapter",
                        forbiddenFields: ["unreviewedRecommendation", "guaranteedReturn", "mustBuy", "mustSell"],
                      },
                    ],
                    smokeOrder: [
                      "providerCredentialPreflight",
                      "structuredSchemaValidation",
                      "sourceGroundingCheck",
                      "humanReviewFallback",
                      "releaseRollbackGate",
                    ],
                    checklistItems: [
                      { id: "modelProviderSetupGuideDefined", label: "模型 Provider 配置向导", status: "pass" },
                      { id: "modelProviderSmokeOrderDefined", label: "模型 Provider smoke 顺序", status: "pass" },
                      { id: "modelProviderEnvReady", label: "模型 Provider 环境变量", status: "blocked" },
                    ],
                    passedCount: 2,
                    totalCount: 3,
                    requiredManualActions: [
                      "选择真实模型 provider 并确认服务条款。",
                      "在后端 Secret Manager 配置 API key。",
                    ],
                    forbiddenAuditFields: [
                      "modelApiKey",
                      "rawPrompt",
                      "rawModelResponse",
                      "rawSourceText",
                      "rawPortfolioNotes",
                    ],
                    canReadModelSecrets: false,
                    canWriteEnvFile: false,
                    canCallLiveModel: false,
                    canEnableLiveRuntime: false,
                    disclaimer: "该向导只展示配置要求，不读取、保存或显示模型密钥。",
                  },
                  endpointContracts: [
                    { id: "analysisCompletion", method: "generateStructuredAnalysis", status: "planned" },
                    { id: "termExplanation", method: "generateTermExplanation", status: "planned" },
                  ],
                  missingEnvVars: [
                    "FINANCE_AI_MODEL_PROVIDER",
                    "FINANCE_AI_MODEL_API_KEY",
                    "FINANCE_AI_MODEL_ID",
                  ],
                  safety: {
                    noVendorNetworkCalls: true,
                    noTradingActions: true,
                    forbidsGuaranteedReturns: true,
                    mockFallbackActive: false,
          emptyOnModelFailure: true,
                  },
                  blockedReasons: ["AI provider、API key 或模型 id 尚未配置。"],
                  disclaimer: "当前为 AI provider adapter 骨架，不会请求真实模型。",
                },
                disclaimer: "当前为样例 AI 服务，不代表真实投资建议。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/compliance/status")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-compliance-service",
                name: "Mock 合规策略服务",
                mode: "sample",
                status: "planning",
                reviewMode: "policy-gate",
                requiredDisclaimer:
                  "本内容由模型基于公开信息和市场数据生成，仅供学习和研究参考，不构成任何投资建议、买卖推荐或收益承诺。",
                prohibitedClaims: ["保证收益", "必须买入", "必须卖出", "无风险"],
                outputPolicy: {
                  probabilityLanguage: "模型参考概率",
                  forbidsGuaranteedReturns: true,
                  forbidsMustBuySell: true,
                  requiresSourceSeparation: true,
                  requiresNearbyDisclaimer: true,
                },
                acknowledgementPolicy: {
                  version: "compliance-ack-v0",
                  requiresRiskAcknowledgement: true,
                  requiresOptionalPortfolioNotice: true,
                  recordsDisclosureVersion: true,
                  blocksPublicReleaseWithoutReview: true,
                },
                suitabilityEnforcementPolicy: {
                  id: "suitability-enforcement-policy",
                  status: "blocked",
                  enforcementMode: "dry-run-no-personalized-restriction",
                  canRestrictAnalysisByProfile: false,
                  requiredRules: [
                    "profileRequiredForPersonalizedAnalysis",
                    "lowRiskBlocksAggressiveSignals",
                    "liquidityNeedBlocksIlliquidRisk",
                    "experienceMismatchShowsEducationOnly",
                    "missingQuestionnaireShowsGeneralEducation",
                  ],
                  fallbackMode: "general-education-no-personalized-action",
                  requiresAuditTrail: true,
                  requiresUserVisibleReason: true,
                },
                jurisdictionEnforcementPolicy: {
                  id: "jurisdiction-enforcement-policy",
                  status: "blocked",
                  enforcementMode: "dry-run-no-region-restriction",
                  canRestrictByJurisdiction: false,
                  defaultJurisdiction: "AU-QLD",
                  supportedJurisdictions: ["AU", "US", "HK", "CN"],
                  restrictedJurisdictions: ["unknown", "sanctioned", "unreviewed"],
                  requiredRules: [
                    "detectUserJurisdiction",
                    "blockRestrictedJurisdictions",
                    "localizeDisclosures",
                    "requireManualReviewForUnreviewedRegions",
                    "showEducationOnlyWhenJurisdictionUnknown",
                  ],
                  fallbackMode: "education-only-no-personalized-analysis",
                  requiresGeoConsentNotice: true,
                  requiresLegalReviewPerJurisdiction: true,
                  requiresAuditTrail: true,
                },
                disclosureVersioningPolicy: {
                  id: "disclosure-versioning-policy",
                  status: "blocked",
                  versioningMode: "dry-run-no-disclosure-version-release",
                  canReleaseDisclosureVersion: false,
                  activeVersions: {
                    disclaimer: "disclaimer-v0",
                    riskWarning: "risk-warning-v0",
                    jurisdictionDisclosure: "jurisdiction-disclosure-v0",
                    suitabilityDisclosure: "suitability-disclosure-v0",
                  },
                  requiredControls: [
                    "immutableDisclosureVersion",
                    "changeLogRequired",
                    "userReAcknowledgementOnMaterialChange",
                    "legalApprovalBeforeRelease",
                    "rollbackDisclosureVersion",
                  ],
                  materialChangeTriggers: [
                    "riskWarningTextChange",
                    "jurisdictionScopeChange",
                    "prohibitedClaimPolicyChange",
                    "suitabilityRuleChange",
                  ],
                  requiresAuditTrail: true,
                  requiresUserReAcknowledgement: true,
                },
                licensedAdviserReviewPolicy: {
                  id: "licensed-adviser-review-policy",
                  status: "blocked",
                  reviewMode: "dry-run-no-adviser-approval",
                  canApprovePersonalizedAdvice: false,
                  requiredTriggers: [
                    "strongBuySellLanguage",
                    "lowConfidenceHighImpact",
                    "complaintEscalation",
                    "unreviewedJurisdiction",
                    "complexPortfolioContext",
                  ],
                  reviewerRoles: ["licensed-adviser", "compliance-officer"],
                  maxReviewLatencyHours: 24,
                  fallbackMode: "education-only-pending-review",
                  requiresConflictDisclosure: true,
                  requiresReviewAuditTrail: true,
                  requiresUserVisiblePendingState: true,
                },
                legalReviewPreflightPlan: {
                  id: "legal-review-preflight-plan",
                  status: "defined",
                  mode: "dry-run-no-legal-approval",
                  canMarkLegalReviewed: false,
                  requiredManualApproval: true,
                  requiredReviewArtifacts: [
                    "current-disclaimer-text",
                    "prohibited-claim-policy",
                    "jurisdiction-scope-matrix",
                    "suitability-questionnaire-version",
                    "licensed-adviser-escalation-rules",
                    "public-release-blocker-list",
                  ],
                },
                publicReleaseEvidencePackage: {
                  id: "public-release-evidence-package",
                  status: "defined",
                  mode: "dry-run-no-public-release",
                  canReleasePublicAnalysis: false,
                  requiredManualApproval: true,
                  requiredSections: [
                    "risk-acknowledgement-version",
                    "legal-review-preflight-summary",
                    "jurisdiction-fallback-matrix",
                    "suitability-enforcement-dry-run",
                    "disclosure-version-change-log",
                    "licensed-adviser-review-queue-policy",
                    "rollback-and-user-notice-plan",
                  ],
                  releaseBlockersThatMustRemainBlocked: [
                    "riskAcknowledgement",
                    "legalReview",
                    "publicReleaseGate",
                  ],
                },
                complianceGate: {
                  status: "blocked",
                  canReleasePublicAnalysis: false,
                  checks: [
                    { id: "disclaimerPresence", status: "pass" },
                    { id: "probabilityLanguage", status: "pass" },
                    { id: "riskAcknowledgement", status: "blocked" },
                    { id: "suitabilityEnforcement", status: "blocked" },
                    { id: "jurisdictionEnforcement", status: "blocked" },
                    { id: "disclosureVersioning", status: "blocked" },
                    { id: "licensedAdviserReview", status: "blocked" },
                  ],
                  blockedReasons: ["用户风险确认、免责声明确认和版本记录尚未完成。"],
                },
                capabilities: [
                  "requiredDisclaimer",
                  "prohibitedClaimFilter",
                  "probabilityLabeling",
                  "riskAcknowledgement",
                  "suitabilityEnforcement",
                  "jurisdictionEnforcement",
                  "disclosureVersioning",
                  "licensedAdviserReview",
                ],
                missingProductionCapabilities: [
                  "legalReviewWorkflow",
                  "suitabilityQuestionnaire",
                  "suitabilityEnforcement",
                  "jurisdictionEnforcement",
                  "disclosureVersioning",
                ],
                disclaimer: "当前为样例合规策略服务，用于集中展示 AI 分析边界。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/auth/status")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-auth",
                name: "Mock 认证服务",
                mode: "sample",
                status: "ready",
                supportedMethods: ["demoToken", "emailPassword"],
                sessionMode: "bearer-token-sample-email-password",
                providerAdapter: {
                  id: "auth-provider-adapter",
                  name: "Auth Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  configured: false,
                  supported: true,
                  canUseProductionAuth: false,
                  passwordPolicy: {
                    status: "planned",
                    minLength: 12,
                    breachCheckRequired: true,
                  },
                  credentialStoragePolicy: {
                    status: "blocked",
                    mode: "dry-run-no-production-credential-storage",
                    canStoreProductionCredentials: false,
                    passwordHashAlgorithm: "argon2id-or-managed-provider-equivalent",
                    requiredControls: [
                      "memoryHardHashing",
                      "pepperSecretManagement",
                      "breachedPasswordScreening",
                      "passwordHistory",
                      "resetTokenHashing",
                      "credentialAuditRedaction",
                    ],
                    forbiddenStoredFields: [
                      "plainPassword",
                      "passwordResetToken",
                      "mfaSecret",
                      "rawRecoveryCode",
                    ],
                    rotationTriggers: ["pepperRotation", "hashParameterUpgrade", "providerIncident"],
                    requiresManagedSecretStore: true,
                    requiresMigrationPlan: true,
                  },
                  sessionPolicy: {
                    status: "planned",
                    accessTokenMinutes: 15,
                    refreshTokenDays: 30,
                    rotationRequired: true,
                    deviceBindingRequired: true,
                  },
                  sessionSecurityPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-session-hardening",
                    canIssueProductionSessions: false,
                    accessTokenMinutes: 15,
                    refreshTokenDays: 30,
                    requiredControls: [
                      "refreshTokenRotation",
                      "reuseDetection",
                      "deviceBinding",
                      "sessionRevocation",
                      "idleTimeout",
                      "sessionAuditTrail",
                    ],
                    revocationTriggers: [
                      "passwordChange",
                      "accountRecovery",
                      "suspiciousLogin",
                      "manualUserLogoutAllDevices",
                    ],
                    forbiddenAuditFields: ["accessToken", "refreshToken"],
                    requiresUserVisibleDeviceList: true,
                    requiresSessionExpiryNotice: true,
                  },
                  csrfProtectionPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-cross-site-mutation",
                    canAcceptCrossSiteMutations: false,
                    protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
                    requiredControls: [
                      "sameSiteStrictCookies",
                      "csrfTokenBinding",
                      "originRefererValidation",
                      "stateChangingMethodGuard",
                      "doubleSubmitOrSynchronizerToken",
                      "csrfAuditTrail",
                    ],
                    forbiddenRequestPatterns: [
                      "credentialedCrossSitePost",
                      "missingOriginHeader",
                      "untrustedReferer",
                      "csrfTokenInUrl",
                      "wildcardCorsWithCredentials",
                    ],
                    tokenTtlMinutes: 30,
                    requiresCorsAllowlist: true,
                    requiresReplayProtection: true,
                  },
                  mfaPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-production-mfa",
                    canChallengeProductionUsers: false,
                    supportedFactors: ["totp", "webauthn-passkey", "recovery-code"],
                    requiredControls: [
                      "mfaEnrollment",
                      "stepUpChallenge",
                      "backupCodeHashing",
                      "mfaRecoveryReview",
                      "trustedDeviceExpiry",
                      "mfaAuditTrail",
                    ],
                    stepUpTriggers: [
                      "newDevice",
                      "highRiskLogin",
                      "privilegedRoleAction",
                      "passwordChange",
                    ],
                    forbiddenStoredFields: [
                      "totpSecretPlaintext",
                      "recoveryCodePlaintext",
                      "webauthnPrivateKey",
                    ],
                    recoveryReviewRequired: true,
                    userVisibleFallbackRequired: true,
                  },
                  emailVerificationPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-production-email-verification",
                    canVerifyProductionEmail: false,
                    verificationTokenMinutes: 30,
                    resendCooldownSeconds: 60,
                    maxResendsPerHour: 5,
                    requiredControls: [
                      "oneTimeVerificationToken",
                      "hashedVerificationToken",
                      "resendRateLimit",
                      "emailChangeReverification",
                      "verificationAuditTrail",
                      "bounceAwareSuppression",
                    ],
                    forbiddenAuditFields: ["verificationToken", "rawEmailBody", "smtpCredential"],
                    requiresUserVisibleExpiry: true,
                    requiresEmailChangeReview: true,
                  },
                  oidcCallbackPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-oidc-callback",
                    canHandleProductionCallback: false,
                    requiredControls: [
                      "redirectUriAllowlist",
                      "stateNonceValidation",
                      "pkceVerification",
                      "callbackDomainAllowlist",
                      "sameSiteCookie",
                      "callbackAuditTrail",
                    ],
                    forbiddenCallbackInputs: [
                      "unvalidatedRedirectUri",
                      "plainClientSecret",
                      "rawAuthorizationCodeInLogs",
                      "unsignedState",
                      "thirdPartyReturnUrl",
                    ],
                    allowedCallbackSchemes: ["https"],
                    maxCallbackAgeMinutes: 10,
                    requiresReplayProtection: true,
                    requiresProviderIssuerValidation: true,
                  },
                  roleAuthorizationPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-production-role-escalation",
                    canUseProductionAdminRoles: false,
                    roleSource: "verified-idp-claims",
                    privilegedRoles: ["admin", "complianceReviewer", "supportOperator"],
                    requiredControls: [
                      "verifiedIdpRoleClaims",
                      "serverSideRoleMapping",
                      "adminApprovalWorkflow",
                      "roleExpiry",
                      "leastPrivilegeRoles",
                      "roleChangeAuditTrail",
                    ],
                    forbiddenRoleSources: [
                      "clientLocalStorage",
                      "requestBodyRole",
                      "demoLoginSelfEscalation",
                      "unsignedJwtClaim",
                      "staleCachedRole",
                    ],
                    privilegedActionTriggers: [
                      "assignRole",
                      "revokeRole",
                      "viewAuditExport",
                      "replayDeadLetterJob",
                      "downloadUserData",
                    ],
                    maxPrivilegedRoleDays: 90,
                    requiresDualApprovalForAdmin: true,
                    requiresRoleReviewRunbook: true,
                  },
                  loginRiskPolicy: {
                    status: "blocked",
                    maxFailedAttemptsPerWindow: 5,
                    lockoutWindowMinutes: 15,
                    requiredActions: ["stepUpMfa", "sessionRevocation"],
                    forbiddenAuditFields: ["password", "refreshToken"],
                  },
                  accountRecoveryPolicy: {
                    status: "blocked",
                    resetTokenMinutes: 30,
                    mfaResetRequiresManualReview: true,
                    revokeExistingSessionsOnReset: true,
                    forbiddenFlows: ["securityQuestionOnly", "silentMfaDisable"],
                  },
                  auditLoggingPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-auth-audit-release",
                    canReleaseProductionAuthEvents: false,
                    requiredEventTypes: [
                      "auth.signIn",
                      "auth.signOut",
                      "auth.sessionRefresh",
                      "auth.passwordReset",
                      "auth.mfaChallenge",
                      "auth.roleChange",
                      "auth.oidcCallback",
                    ],
                    requiredControls: [
                      "redactedMetadata",
                      "tamperEvidentHashChain",
                      "retentionClass",
                      "requestCorrelationId",
                      "privilegedActionReview",
                      "auditExportHandoff",
                    ],
                    forbiddenAuditFields: [
                      "plainPassword",
                      "passwordHash",
                      "accessToken",
                      "refreshToken",
                      "mfaSecret",
                      "rawAuthorizationCode",
                      "rawDeviceFingerprint",
                    ],
                    retentionDays: 365,
                    requiresHashChainVerification: true,
                    requiresPrivilegedExportApproval: true,
                  },
                  privacyConsentPolicy: {
                    status: "blocked",
                    mode: "dry-run-no-privacy-release",
                    canReleaseProductionPrivacyText: false,
                    requiredControls: [
                      "explicitConsentVersion",
                      "privacyNoticeVersion",
                      "dataSubjectRequestPath",
                      "consentWithdrawalPath",
                      "regionalDisclosureMapping",
                      "auditRetentionDisclosure",
                    ],
                    forbiddenBehaviors: [
                      "silentConsentUpgrade",
                      "unclearAccountDeletionPath",
                      "hiddenBrokerCredentialCollection",
                      "privacyNoticeOnlyInEnglish",
                    ],
                    consentRecordFields: ["userId", "consentVersion", "acceptedAt", "locale", "source"],
                    requiresUserVisibleNotice: true,
                    requiresLegalReviewBeforeProduction: true,
                  },
                  securityGate: {
                    status: "blocked",
                    canUseProductionAuth: false,
                    checks: [
                      { id: "providerConfig", status: "blocked" },
                      { id: "passwordPolicy", status: "pass" },
                      { id: "credentialStorage", status: "blocked" },
                      { id: "sessionPolicy", status: "pass" },
                      { id: "sessionSecurity", status: "blocked" },
                      { id: "csrfProtection", status: "blocked" },
                      { id: "mfaReadiness", status: "blocked" },
                      { id: "mfaPolicy", status: "blocked" },
                      { id: "emailVerificationPolicy", status: "blocked" },
                      { id: "oidcCallback", status: "blocked" },
                      { id: "roleAuthorization", status: "blocked" },
                      { id: "loginRiskControls", status: "blocked" },
                      { id: "accountRecovery", status: "blocked" },
                      { id: "auditLogging", status: "blocked" },
                    ],
                    blockedReasons: ["多因素认证策略尚未确认。"],
                  },
                  productionAuthPreflightPlan: {
                    status: "blocked",
                    mode: "dry-run-no-provider-call",
                    canExecuteProductionAuth: false,
                    providerRequestAllowed: false,
                    requiredManualApproval: true,
                  },
                  endpointContracts: [
                    { id: "productionSignIn", method: "signIn", status: "planned" },
                    { id: "sessionRefresh", method: "refreshSession", status: "planned" },
                  ],
                  missingEnvVars: [
                    "FINANCE_AI_AUTH_PROVIDER",
                    "FINANCE_AI_AUTH_CLIENT_ID",
                    "FINANCE_AI_AUTH_CLIENT_SECRET",
                    "FINANCE_AI_AUTH_JWT_SECRET",
                    "FINANCE_AI_AUTH_RISK_ENGINE_READY",
                    "FINANCE_AI_AUTH_ACCOUNT_RECOVERY_READY",
                    "FINANCE_AI_AUTH_CREDENTIAL_STORAGE_READY",
                    "FINANCE_AI_AUTH_MFA_POLICY_READY",
                    "FINANCE_AI_AUTH_EMAIL_VERIFICATION_POLICY_READY",
                  ],
                  safety: {
                    noVendorNetworkCalls: true,
                    storesPasswordHashesOnly: true,
                    requiresCredentialStorageHardening: true,
                    requiresMfaPolicy: true,
                  },
                  blockedReasons: ["认证 provider、client 凭证或 JWT secret 尚未配置。"],
                  disclaimer: "当前为生产认证 provider adapter 骨架，不会请求真实认证服务。",
                },
                disclaimer: "当前为样例认证服务，不代表真实账号安全方案。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/notification-services")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-notification-delivery",
                name: "Mock 通知投递服务",
                mode: "sample",
                status: "ready",
                deliveryMode: "outbox-only",
                supportedChannels: ["inApp", "email", "wechat"],
                capabilities: ["outboxQueue", "readReceipt", "multiChannelRules"],
                providerAdapter: {
                  id: "notification-provider-adapter",
                  name: "Notification Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  configured: false,
                  supported: true,
                  canUseExternalDelivery: false,
                  deliveryPolicy: {
                    status: "planned",
                    requiresIdempotencyKey: true,
                    retryBackoff: "exponential",
                    maxAttempts: 3,
                    rateLimitPerMinute: 60,
                    providerWebhookVerification: true,
                  },
                  consentPolicy: {
                    status: "planned",
                    requiresUserOptIn: true,
                    supportsChannelOptOut: true,
                    recordsConsentVersion: true,
                    blocksSilentExternalDelivery: true,
                  },
                  receiptPolicy: {
                    status: "blocked",
                    requiredEvents: ["queued", "sent", "delivered", "failed", "bounced", "unsubscribed"],
                    webhookSignatureRequired: true,
                    idempotencyWindowHours: 24,
                    forbiddenAuditFields: ["messageBody", "emailAddress"],
                  },
                  suppressionPolicy: {
                    status: "blocked",
                    suppressesUnsubscribedChannels: true,
                    suppressesHardBounces: true,
                    suppressesPrivacyErasedUsers: true,
                    requiresChannelScopedOptOut: true,
                  },
                  bounceHandlingPolicy: {
                    status: "blocked",
                    hardBounceAction: "suppress-channel-and-audit",
                    softBounceAction: "retry-with-backoff",
                    manualReviewRequiredForComplaint: true,
                  },
                  webhookReceiptVerificationPlan: {
                    status: "blocked",
                    mode: "dry-run-no-webhook-accept",
                    canAcceptProviderWebhook: false,
                    timestampToleranceSeconds: 300,
                    replayWindowHours: 24,
                    requiresProviderEventId: true,
                    checks: [
                      { id: "webhookSecret", status: "blocked" },
                      { id: "endpointRegistration", status: "blocked" },
                      { id: "signatureTimestampWindow", status: "blocked" },
                      { id: "providerEventIdempotency", status: "blocked" },
                      { id: "receiptAuditRedaction", status: "blocked" },
                    ],
                    forbiddenAuditFields: ["rawSignature", "rawPayload"],
                  },
                  deliveryGate: {
                    status: "blocked",
                    canUseExternalDelivery: false,
                    checks: [
                      { id: "providerConfig", status: "blocked" },
                      { id: "permissionConsent", status: "blocked" },
                      { id: "deliveryPolicy", status: "pass" },
                      { id: "deliveryReceipts", status: "blocked" },
                      { id: "suppressionList", status: "blocked" },
                      { id: "bounceHandling", status: "blocked" },
                    ],
                    blockedReasons: ["通知权限、渠道授权和退订规则尚未确认。"],
                  },
                  externalDeliveryPreflightPlan: {
                    status: "blocked",
                    mode: "dry-run-no-external-send",
                    canExecuteExternalDelivery: false,
                    providerRequestAllowed: false,
                    requiredManualApproval: true,
                  },
                  observabilityEvidencePackage: {
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
                  },
                  endpointContracts: [
                    { id: "sendExternalNotification", method: "sendNotification", status: "planned" },
                    { id: "retryExternalDelivery", method: "retryDelivery", status: "planned" },
                  ],
                  channelContracts: [
                    { id: "inApp", label: "网页内提醒", status: "local-ready" },
                    { id: "wechat", label: "微信提醒", status: "planned" },
                  ],
                  missingEnvVars: [
                    "FINANCE_AI_NOTIFICATION_PROVIDER",
                    "FINANCE_AI_NOTIFICATION_PROVIDER_API_KEY",
                    "FINANCE_AI_NOTIFICATION_WEBHOOK_SECRET",
                    "FINANCE_AI_NOTIFICATION_RECEIPTS_READY",
                    "FINANCE_AI_NOTIFICATION_SUPPRESSION_READY",
                    "FINANCE_AI_NOTIFICATION_BOUNCE_READY",
                    "FINANCE_AI_NOTIFICATION_WEBHOOK_ENDPOINT_READY",
                    "FINANCE_AI_NOTIFICATION_WEBHOOK_REPLAY_READY",
                    "FINANCE_AI_NOTIFICATION_RECEIPT_IDEMPOTENCY_READY",
                  ],
                  safety: {
                    noVendorNetworkCalls: true,
                    mockOutboxActive: true,
                    requiresUserConsent: true,
                    requiresSuppressionList: true,
                    requiresReceiptRedaction: true,
                    requiresWebhookReplayProtection: true,
                    requiresReceiptIdempotency: true,
                    requiresBounceHandling: true,
                    forbidsSilentExternalDelivery: true,
                  },
                  blockedReasons: ["通知 provider、API key 或 webhook secret 尚未配置。"],
                  disclaimer: "当前为生产通知 provider adapter 骨架，不会请求真实推送服务。",
                },
                disclaimer: "当前为样例通知投递服务，不代表真实外部推送已送达。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/job-services")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-reminder-job-runner",
                name: "Mock 提醒任务运行器",
                mode: "sample",
                status: "ready",
                executionMode: "manual-api",
                supportedJobs: ["reminderEvaluation"],
                duplicateSuppression: {
                  notificationWindowSeconds: 900,
                  scope: "user-rule-channel-observedValue-threshold",
                },
                capabilities: [
                  "reminderEvaluation",
                  "jobRunRecords",
                  "auditEvents",
                  "notificationOutbox",
                  "duplicateNotificationSuppression",
                ],
                disclaimer: "当前为手动触发的样例任务运行器，不代表真实后台定时任务或系统推送已经部署。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/scheduler/status")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-scheduler-service",
                name: "Mock 后台调度服务",
                mode: "sample",
                status: "ready",
                executionMode: "manual-due-check",
                timezone: "Australia/Brisbane",
                schedules: [
                  {
                    id: "schedule-reminder-evaluation",
                    jobType: "reminderEvaluation",
                    cadence: "every-15-minutes",
                    timezone: "Australia/Brisbane",
                  },
                ],
                runSafety: {
                  idempotencyWindowSeconds: 600,
                  cooldownSeconds: 60,
                  idempotencyKeySupported: true,
                  overlappingRunsBlocked: true,
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
                  "queueLagMonitoring",
                  "enqueueJob",
                  "retrySchedule",
                  "queueAlerts",
                  "processQueue",
                ],
                deadLetterPolicy: {
                  status: "sample-ready",
                  maxAttempts: 3,
                  retryBackoff: "exponential",
                  baseRetrySeconds: 60,
                  replaySupported: true,
                  requiresAuditTrail: true,
                },
                workerTelemetryPolicy: {
                  status: "sample-ready",
                  heartbeatTtlSeconds: 120,
                  queueLagWarningSeconds: 300,
                  queueLagCriticalSeconds: 900,
                  queueDepthWarning: 25,
                  queueDepthCritical: 100,
                  heartbeatSupported: true,
                  queueLagMonitoringSupported: true,
                },
                workerAuthPolicy: {
                  status: "sample-bypass",
                  configured: false,
                  enforcement: "sample-bypass",
                  signatureRequired: false,
                  nonceRequired: false,
                  signatureAlgorithm: "hmac-sha256",
                  timestampToleranceSeconds: 300,
                  acceptedHeader: "x-worker-secret",
                  acceptedSignatureHeader: "x-worker-signature",
                  acceptedTimestampHeader: "x-worker-timestamp",
                  acceptedNonceHeader: "x-worker-nonce",
                  acceptedBodyField: "workerSecret",
                  acceptedNonceBodyField: "workerNonce",
                  nonceRetentionLimit: 500,
                  nonceRetentionSeconds: 86400,
                  nonceCleanupSupported: true,
                  appliesTo: ["recordWorkerHeartbeat", "processQueuedJobs"],
                  disclaimer: "当前未配置 worker secret；网页/本机样例允许手动触发。",
                },
                workerNonceMaintenancePolicy: {
                  status: "sample-ready",
                  cleanupSupported: true,
                  retentionSeconds: 86400,
                  retentionLimit: 500,
                  auditTrailRequired: true,
                  manualCleanupSupported: true,
                  disclaimer: "当前为样例 worker nonce 清理策略。",
                },
                queuePolicy: {
                  status: "sample-ready",
                  enqueueSupported: true,
                  retryBackoff: "exponential",
                  maxAttempts: 3,
                  deadLetterAfterMaxAttempts: true,
                  requiresIdempotencyKey: true,
                },
                providerAdapter: {
                  id: "scheduler-provider-adapter",
                  name: "Scheduler Provider Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  selectedProvider: "",
                  configured: false,
                  supported: true,
                  canUseBackgroundWorkers: false,
                  queuePolicy: {
                    status: "planned",
                    requiresIdempotencyKey: true,
                    retryBackoff: "exponential",
                    maxAttempts: 3,
                    deadLetterQueueRequired: true,
                    workerHeartbeatSeconds: 60,
                  },
                  runSafetyPolicy: {
                    status: "planned",
                    requiresCronSignature: true,
                    limitsConcurrentRuns: true,
                    recordsJobLag: true,
                    blocksOverlappingRuns: true,
                    requiresAuditTrail: true,
                  },
                  backpressurePolicy: {
                    status: "blocked",
                    maxQueueDepth: 1000,
                    maxLagSeconds: 300,
                    pauseLowPriorityJobs: true,
                    alertRoutesRequired: true,
                  },
                  workerAuthPolicy: {
                    status: "blocked",
                    requiresHmacSignature: true,
                    timestampSkewSeconds: 300,
                    nonceRequired: true,
                    rotatesSecrets: true,
                    forbiddenAuditFields: ["workerSecret", "cronSigningSecret"],
                  },
                  runbookPolicy: {
                    status: "blocked",
                    requiredRunbooks: ["queue-drain", "dlq-replay", "worker-secret-rotation"],
                    manualApprovalRequiredForReplay: true,
                    rollbackToManualDueCheck: true,
                  },
                  schedulerGate: {
                    status: "blocked",
                    canUseBackgroundWorkers: false,
                    checks: [
                      { id: "providerConfig", status: "blocked" },
                      { id: "queuePolicy", status: "pass" },
                      { id: "deadLetterQueue", status: "blocked" },
                      { id: "backpressure", status: "blocked" },
                      { id: "workerAuth", status: "blocked" },
                      { id: "runbook", status: "blocked" },
                    ],
                    blockedReasons: ["死信队列、重放规则和人工处理流程尚未确认。"],
                  },
                  backgroundWorkerPreflightPlan: {
                    status: "blocked",
                    mode: "dry-run-no-worker-start",
                    canStartBackgroundWorkers: false,
                    providerRequestAllowed: false,
                    requiredManualApproval: true,
                  },
                  incidentResponseDrillPackage: {
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
                  },
                  endpointContracts: [
                    { id: "enqueueJob", method: "enqueueJob", status: "planned" },
                    { id: "workerHeartbeat", method: "recordWorkerHeartbeat", status: "planned" },
                  ],
                  scheduleContracts: [
                    {
                      id: "schedule-news-ingestion",
                      jobType: "newsIngestion",
                      cadence: "every-5-minutes",
                      status: "planned",
                    },
                    {
                      id: "schedule-reminder-evaluation",
                      jobType: "reminderEvaluation",
                      cadence: "every-15-minutes",
                      status: "sample-ready",
                    },
                  ],
                  missingEnvVars: [
                    "FINANCE_AI_SCHEDULER_PROVIDER",
                    "FINANCE_AI_QUEUE_URL",
                    "FINANCE_AI_WORKER_SECRET",
                    "FINANCE_AI_CRON_SIGNING_SECRET",
                    "FINANCE_AI_SCHEDULER_BACKPRESSURE_READY",
                    "FINANCE_AI_SCHEDULER_WORKER_AUTH_READY",
                    "FINANCE_AI_SCHEDULER_RUNBOOK_READY",
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
                  },
                  blockedReasons: [
                    "调度 provider、队列 URL、worker secret 或 cron signing secret 尚未配置。",
                  ],
                  disclaimer: "当前为生产调度 provider adapter 骨架，不会启动真实 cron、队列 worker 或后台网络任务。",
                },
                disclaimer: "当前为样例调度服务，只能手动触发 due-job 检查，不代表真实 cron、队列 worker 或外部推送已经部署。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/scheduler/dead-letter")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "dlq-ui-001",
                  userId: "demo-user",
                  scheduleId: "schedule-reminder-evaluation",
                  jobType: "reminderEvaluation",
                  status: "open",
                  attempts: 1,
                  maxAttempts: 3,
                  nextRetryAt: "2026-06-01T00:01:00.000Z",
                  lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
                  createdAt: "2026-06-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/scheduler/worker-health")) {
          return {
            ok: true,
            json: async () => ({
              status: "healthy",
              checkedAt: "2026-06-01T00:02:00.000Z",
              workerCount: 1,
              activeWorkerCount: 1,
              staleWorkerCount: 0,
              workers: [
                {
                  id: "heartbeat-ui-001",
                  workerId: "sample-reminder-worker",
                  status: "healthy",
                  jobTypes: ["reminderEvaluation"],
                  queueDepth: 0,
                  queueLagMs: 0,
                  ageMs: 1000,
                  lastSeenAt: "2026-06-01T00:02:00.000Z",
                },
              ],
              queue: {
                status: "healthy",
                totalDepth: 0,
                openDeadLetters: 0,
                pendingWork: 0,
                maxLagMs: 0,
                warningLagMs: 300000,
                criticalLagMs: 900000,
              },
              disclaimer: "当前为样例 worker 心跳与队列延迟遥测，不代表真实后台 worker 已部署。",
            }),
          };
        }
        if (url.endsWith("/api/scheduler/queue")) {
          return {
            ok: true,
            json: async () => ({
              status: "attention",
              checkedAt: "2026-06-01T00:02:30.000Z",
              summary: {
                total: 1,
                queued: 1,
                retrying: 0,
                running: 0,
                failed: 0,
                completed: 0,
                due: 1,
                nextDueAt: "2026-06-01T00:02:30.000Z",
              },
              alerts: [
                {
                  severity: "warning",
                  code: "due-jobs-without-active-worker",
                  message: "存在到期任务，但没有活跃 worker。",
                },
              ],
              items: [
                {
                  id: "queued-ui-001",
                  userId: "demo-user",
                  jobType: "reminderEvaluation",
                  status: "queued",
                  priority: 5,
                  attempts: 0,
                  maxAttempts: 3,
                  scheduledFor: "2026-06-01T00:02:30.000Z",
                  nextRetryAt: "",
                  lastError: { code: "", message: "" },
                  createdAt: "2026-06-01T00:02:30.000Z",
                },
              ],
              retryPolicy: { maxAttempts: 3, retryBackoff: "exponential" },
              disclaimer: "当前为样例队列状态，不代表真实后台 worker 已部署。",
            }),
          };
        }
        if (url.endsWith("/api/repository/status")) {
          return {
            ok: true,
            json: async () => ({
              activeRepository: {
                id: "mock-user-state-repository",
                name: "Mock 用户数据仓储",
                mode: "sample",
                status: "ready",
                persistenceMode: "memory-only",
                capabilities: ["watchlist", "preferences", "analysisHistory", "notificationOutbox"],
                limits: {
                  analysisHistory: 500,
                  notificationOutbox: 500,
                  auditLogs: 500,
                  jobRuns: 200,
                },
                disclaimer: "当前为内存样例仓储，服务重启后数据会丢失，不代表生产数据库。",
              },
              repositories: [],
            }),
          };
        }
        if (url.endsWith("/api/project/progress")) {
          return {
            ok: true,
            json: async () => ({
              progress: {
                id: "finance-ai-project-progress",
                updatedAt: "2026-06-10",
                source: "backend-computed-readiness-strict-real-data",
                localDemoPercent: 100,
                publicLaunchPercent: 80,
                completed: ["项目进度已从后端接口提供，前端连接后端时同步显示", "metadata-only 股票搜索结果会明确提示不代表行情、新闻或 AI 分析已接入", "股票标题区固定显示当前数据覆盖和真实数据缺口", "股票标题区数据覆盖提示已拆成股票、行情、新闻、AI 四个分项", "股票标题区数据覆盖提示新增公告、宏观分项", "每日开发日志已延续到 2026-06-10"],
                blockers: ["真实行情/新闻/公告/宏观数据源与授权"],
                readiness: [
                  {
                    id: "data-sources",
                    label: "真实数据源接入门禁",
                    percent: 100,
                    status: "blocked",
                    blocker: "数据授权未接入。",
                    evidence: { passedChecks: 32, totalChecks: 35, blockedChecks: 3, sourceEndpoints: ["/api/data-sources", "/api/data-sources/ingestion-channels", "/api/data-sources/auto-ingestion-run", "/api/data-sources/integration-plan", "/api/data-sources/provider-registry", "/api/data-sources/vendor-readiness", "/api/data-sources/vendor-contract-handoff", "/api/data-sources/provider-secret-quota-runbook", "/api/data-sources/provider-setup-guide", "/api/data-sources/market-data-vendor-checklist", "/api/data-sources/news-filings-vendor-checklist", "/api/data-sources/macro-data-vendor-checklist", "/api/data-sources/public-statements-vendor-checklist", "/api/data-sources/market-data-adapter", "/api/market-data/quote", "/api/data-sources/news-filings-adapter", "/api/news/intelligence", "/api/news/filings"] },
                  },
                  {
                    id: "ai-analysis",
                    label: "真实 AI 分析",
                    percent: 94,
                    status: "blocked",
                    blocker: "真实模型未接入。",
                    evidence: { passedChecks: 24, totalChecks: 26, blockedChecks: 2, sourceEndpoints: ["/api/ai-services", "/api/ai-services/provider-adapter", "/api/ai-services/model-provider-setup-guide", "/api/ai-services/local-model-config", "/api/data-sources", "/api/news/intelligence", "/api/market-data/quote", "/api/analysis"] },
                  },
                ],
                disclaimer: "该进度是项目管理参考。",
              },
            }),
          };
        }
        if (url.endsWith("/api/database/status")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-database-service",
                name: "Mock 数据库服务",
                mode: "sample",
                status: "planning",
                activeStorage: "memory-only",
                repositoryId: "mock-user-state-repository",
                migrationPhase: "pre-production",
                plannedTables: [
                  "users",
                  "auth_sessions",
                  "watchlist_items",
                  "user_preferences",
                  "portfolio_positions",
                  "audit_events",
                ],
                capabilities: [
                  "schemaPlan",
                  "repositoryBridge",
                  "repositoryContract",
                  "migrationChecks",
                  "tableMappings",
                  "productionAdapter",
                  "adapterHealth",
                  "migrationPlan",
                  "migrationDryRun",
                  "migrationSqlDraft",
                  "migrationPackage",
                  "readOnlyConnectionHealth",
                  "repositoryAdapterPlan",
                  "repositoryRuntimeGuard",
                  "productionRepositoryAdapter",
                  "productionRepositorySmokeTest",
                  "productionRepositorySqlContract",
                  "productionRepositoryExecutionPlan",
                  "productionRepositoryParameterValidationPlan",
                  "productionRepositoryConnectionPoolPlan",
                  "productionRepositorySqlExecutorPlan",
                  "productionRepositoryResultAuditPlan",
                  "productionRepositoryReadRehearsalPlan",
                  "productionRepositoryParityPlan",
                  "productionRepositoryParityEvidencePlan",
                  "productionRepositoryDualWritePlan",
                  "productionRepositoryShadowWriteEvidencePlan",
                  "productionRepositoryBackupRestoreEvidencePlan",
                  "productionRepositoryCutoverMonitoringEvidencePlan",
                  "productionRepositoryRollbackRehearsalEvidencePlan",
                  "productionRepositoryCutoverAuditTrailEvidencePlan",
                  "productionRepositoryCutoverPlan",
                  "productionDatabaseEncryptionPlan",
                  "productionDatabaseAccessControlPlan",
                  "productionDatabasePrivacyRetentionPlan",
                  "productionDatabaseResidencyTransferPlan",
                  "productionGapReport",
                ],
                repositoryContract: {
                  version: "2026-06-01.repository.v1",
                  status: "pass",
                  missingMethods: [],
                  tableMappings: [
                    { domain: "authSessions", table: "auth_sessions" },
                    { domain: "preferences", table: "user_preferences" },
                    { domain: "portfolio", table: "portfolio_positions" },
                  ],
                },
                migrationChecks: [
                  { id: "repositoryInterface", status: "pass" },
                  { id: "tableMappings", status: "pass" },
                  { id: "userScopedRecords", status: "pass" },
                ],
                productionAdapter: {
                  id: "production-database-adapter",
                  name: "Production Database Adapter Skeleton",
                  status: "not_configured",
                  provider: "postgres",
                  sslMode: "required",
                  fallback: {
                    active: true,
                    reason: "生产数据库连接配置缺失，当前仍回退到 mock repository。",
                  },
                  migrationPlan: {
                    steps: [
                      { id: "configureConnection", status: "blocked" },
                      { id: "runSchemaMigrations", status: "pending" },
                      { id: "verifyRepositoryContract", status: "pass" },
                    ],
                  },
                  migrationDryRun: {
                    id: "production-db-migration-dry-run",
                    mode: "dry-run",
                    status: "blocked",
                    provider: "postgres",
                    tableOrder: ["users", "auth_sessions", "portfolio_positions"],
                    tablePlan: [
                      { order: 1, table: "users", dependsOn: [], domains: ["authUsers"], status: "planned" },
                      {
                        order: 2,
                        table: "auth_sessions",
                        dependsOn: ["users"],
                        domains: ["authSessions"],
                        status: "planned",
                      },
                      {
                        order: 3,
                        table: "portfolio_positions",
                        dependsOn: ["users"],
                        domains: ["portfolio"],
                        status: "planned",
                      },
                    ],
                    steps: [
                      { id: "validateConnectionConfig", status: "blocked" },
                      { id: "validateRepositoryContract", status: "pass" },
                      { id: "resolveTableOrder", status: "pass" },
                    ],
                    blockedReasons: ["缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。"],
                    warnings: ["dry-run 只生成迁移顺序和检查结果，不会连接数据库。"],
                    rollbackPlan: ["迁移前保留 mock/JSON repository 作为回退路径。"],
                    migrationSqlDraft: {
                      id: "production-db-sql-draft-001",
                      dialect: "postgresql",
                      status: "generated",
                      destructive: false,
                      reviewRequired: true,
                      statementCount: 6,
                      checksum: "fnv1a-test001",
                      preview: [
                        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
                        "CREATE TABLE IF NOT EXISTS users (",
                      ],
                      warnings: ["SQL 草案仅供代码审查和迁移工具接入，不会自动执行。"],
                    },
                  },
                  productionDatabaseEncryptionPlan: {
                    id: "production-database-encryption-plan",
                    status: "blocked",
                    mode: "dry-run-no-key-usage",
                    provider: "missing",
                    keyIdConfigured: false,
                    canUseProductionKeys: false,
                    protectedDataClasses: ["email", "portfolioPosition", "notificationRecipient"],
                    forbiddenAuditFields: ["rawKmsKey", "plaintextEmail"],
                    checks: [
                      { id: "connectionConfig", status: "blocked", required: true },
                      { id: "kmsProvider", status: "blocked", required: true },
                      { id: "encryptionAtRest", status: "blocked", required: true },
                      { id: "fieldLevelEncryption", status: "blocked", required: true },
                      { id: "keyRotation", status: "blocked", required: true },
                      { id: "backupEncryption", status: "blocked", required: true },
                    ],
                    safety: {
                      noKeyMaterialInApp: true,
                      noAutomaticKeyUse: true,
                      requiresEnvelopeEncryption: true,
                      requiresRotationRunbook: true,
                      requiresEncryptedBackups: true,
                    },
                    blockedReasons: [
                      "生产数据库连接配置缺失，不能验证静态加密或字段级加密。",
                      "KMS provider 或 key id 尚未配置。",
                    ],
                  },
                  productionDatabaseAccessControlPlan: {
                    id: "production-database-access-control-plan",
                    status: "blocked",
                    mode: "dry-run-no-permission-change",
                    canApplyDatabaseRoles: false,
                    requiredRoles: ["readonly_app", "write_app", "migration_runner", "audit_reader"],
                    protectedScopes: ["user-owned-watchlist", "portfolio-positions", "audit-events"],
                    forbiddenAuditFields: ["rawSql", "rawRoleSecret"],
                    checks: [
                      { id: "connectionConfig", status: "blocked", required: true },
                      { id: "leastPrivilegeRoles", status: "blocked", required: true },
                      { id: "rowLevelSecurity", status: "blocked", required: true },
                      { id: "serviceRoleAudit", status: "blocked", required: true },
                      { id: "adminApproval", status: "blocked", required: true },
                    ],
                    safety: {
                      noPermissionMutation: true,
                      noProductionRoleCreation: true,
                      requiresRlsPolicies: true,
                      requiresLeastPrivilege: true,
                      requiresPrivilegedAudit: true,
                    },
                    blockedReasons: [
                      "生产数据库连接配置缺失，不能验证权限隔离。",
                      "只读、写入、迁移和审计角色的最小权限尚未确认。",
                    ],
                  },
                  productionDatabasePrivacyRetentionPlan: {
                    id: "production-database-privacy-retention-plan",
                    status: "blocked",
                    mode: "dry-run-no-data-erasure",
                    canEraseProductionData: false,
                    governedDataScopes: [
                      "account-profile",
                      "auth-sessions",
                      "watchlist-items",
                      "portfolio-positions",
                      "analysis-history",
                      "notification-outbox",
                      "audit-events",
                    ],
                    retentionClasses: [
                      "user-requested-delete",
                      "regulatory-retention",
                      "security-audit",
                      "legal-hold",
                    ],
                    forbiddenAuditFields: ["plaintextEmail", "rawPortfolioNotes", "rawErasurePayload"],
                    checks: [
                      { id: "connectionConfig", status: "blocked", required: true },
                      { id: "retentionPolicy", status: "blocked", required: true },
                      { id: "erasureWorkflow", status: "blocked", required: true },
                      { id: "subjectExport", status: "blocked", required: true },
                      { id: "privacyAudit", status: "blocked", required: true },
                      { id: "legalHold", status: "blocked", required: true },
                      { id: "privacyApproval", status: "blocked", required: true },
                    ],
                    safety: {
                      noAutomaticDeletion: true,
                      noHardDeleteWithoutTombstone: true,
                      requiresSubjectExport: true,
                      requiresLegalHoldCheck: true,
                      requiresPrivacyAudit: true,
                    },
                    blockedReasons: [
                      "生产数据库连接配置缺失，不能验证隐私删除和数据保留流程。",
                      "用户删除请求、级联删除、软删除和异步清理流程尚未确认。",
                    ],
                  },
                  productionDatabaseResidencyTransferPlan: {
                    id: "production-database-residency-transfer-plan",
                    status: "blocked",
                    mode: "dry-run-no-cross-border-transfer",
                    canTransferAcrossRegions: false,
                    defaultRegion: "unassigned",
                    governedRegions: [
                      "primary-region",
                      "backup-region",
                      "analytics-region",
                      "support-access-region",
                    ],
                    regulatedDataScopes: [
                      "account-profile",
                      "portfolio-positions",
                      "suitability-questionnaires",
                      "notification-recipients",
                      "audit-events",
                      "analysis-history",
                    ],
                    forbiddenAuditFields: ["rawIpAddress", "preciseLocation", "vendorAccessToken"],
                    checks: [
                      { id: "connectionConfig", status: "blocked", required: true },
                      { id: "dataResidency", status: "blocked", required: true },
                      { id: "crossBorderTransfer", status: "blocked", required: true },
                      { id: "regionalBackup", status: "blocked", required: true },
                      { id: "subprocessorReview", status: "blocked", required: true },
                      { id: "residencyApproval", status: "blocked", required: true },
                    ],
                    safety: {
                      noCrossBorderTransfer: true,
                      noRegionalReplicationChange: true,
                      requiresUserDisclosure: true,
                      requiresSubprocessorReview: true,
                      requiresRegionalBackupEvidence: true,
                    },
                    blockedReasons: [
                      "生产数据库连接配置缺失，不能验证数据驻留区域。",
                      "跨境传输依据、用户同意、监管披露和传输限制尚未确认。",
                    ],
                  },
                },
                migrationSqlDraft: {
                  id: "production-db-sql-draft-001",
                  dialect: "postgresql",
                  status: "generated",
                  destructive: false,
                  reviewRequired: true,
                  statementCount: 6,
                  checksum: "fnv1a-test001",
                  preview: [
                    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
                    "CREATE TABLE IF NOT EXISTS users (",
                  ],
                  warnings: ["SQL 草案仅供代码审查和迁移工具接入，不会自动执行。"],
                },
                migrationPackage: {
                  id: "production-db-migration-package-001",
                  version: "2026.06.01.001_initial_schema",
                  generatedAt: "2026-06-01T00:00:00+10:00",
                  status: "blocked",
                  canExecute: false,
                  executionMode: "review-only",
                  targetDialect: "postgresql",
                  manifestChecksum: "fnv1a-package001",
                  manifest: {
                    sqlDraftChecksum: "fnv1a-test001",
                    tableCount: 3,
                    statementCount: 6,
                    destructive: false,
                    reviewRequired: true,
                  },
                  preflightChecks: [
                    { id: "connectionConfig", status: "blocked", message: "缺少数据库 URL" },
                    { id: "repositoryContract", status: "pass", message: "仓储接口契约已通过" },
                    { id: "liveConnection", status: "blocked", message: "当前骨架未加载真实数据库驱动" },
                    { id: "humanApproval", status: "pending", message: "需要人工审查" },
                  ],
                  blockedReasons: ["缺少 FINANCE_AI_DATABASE_URL 或 FINANCE_AI_DB_URL。"],
                  pendingApprovals: ["humanApproval"],
                  releaseGates: ["真实数据库连接已验证", "迁移工具已接入并记录版本", "SQL 草案已人工审查批准"],
                  disclaimer: "迁移包当前仅用于审查和上线前检查；canExecute=false。",
                },
                readOnlyConnectionHealth: {
                  id: "production-db-readonly-health",
                  mode: "read-only-health",
                  status: "blocked",
                  provider: "postgres",
                  driver: { package: "pg", available: false },
                  connection: { configured: false, status: "missing-config" },
                  safety: { readOnlyOnly: true, canWrite: false, canMigrate: false },
                  checks: [
                    { id: "connectionConfig", status: "blocked" },
                    { id: "driverAvailability", status: "blocked" },
                    { id: "readOnlyGuard", status: "pass" },
                    { id: "networkProbe", status: "skipped" },
                  ],
                  blockedReasons: ["数据库驱动 pg 尚未安装或未标记可用。"],
                  warnings: ["当前只读健康检查默认不发起真实网络连接，也不会执行 SQL。"],
                  nextSteps: ["安装并锁定生产数据库驱动版本。"],
                },
                driverSetupPlan: {
                  id: "production-db-driver-setup-plan",
                  status: "blocked",
                  targetDriver: "pg",
                  packageManager: "npm-or-future-backend-package-manager",
                  installCommand: "npm install pg",
                  canInstallAutomatically: false,
                  canConnectAutomatically: false,
                  envVars: [
                    { name: "FINANCE_AI_DATABASE_URL", required: true, configured: false, secret: true },
                    { name: "FINANCE_AI_DB_SSL", required: true, configured: false, secret: false, value: "required" },
                    { name: "FINANCE_AI_DB_DRIVER", required: true, configured: true, secret: false, value: "pg" },
                    { name: "FINANCE_AI_DB_DRIVER_AVAILABLE", required: true, configured: false, secret: false, value: "false" },
                  ],
                  configChecks: [
                    { id: "databaseUrl", status: "blocked" },
                    { id: "driverReviewed", status: "blocked" },
                    { id: "readOnlyProbeOptIn", status: "pending" },
                    { id: "readOnlyHealth", status: "blocked" },
                  ],
                  smokeOrder: [
                    "configRedaction",
                    "driverAvailability",
                    "readOnlyGuard",
                    "readOnlyHealthPreflight",
                    "repositoryContract",
                    "manualCutoverGate",
                  ],
                  secretBoundary: {
                    redactsConnectionUrl: true,
                    canReadDatabaseSecrets: false,
                    canWriteEnvFile: false,
                    canPrintRawConnectionString: false,
                    forbiddenAuditFields: ["databaseUrl", "rawConnectionString", "password", "token", "sslCertificatePrivateKey"],
                  },
                  secretPolicy: ["日志和状态接口只能显示脱敏后的连接串。"],
                  blockedReasons: ["数据库驱动 pg 尚未安装或未标记可用。"],
                  nextSteps: ["安装并锁定生产数据库驱动版本。"],
                  disclaimer: "驱动接入计划只用于准备工作；当前不会安装依赖、不会联网、不会连接数据库。",
                },
                repositoryAdapterPlan: {
                  id: "production-repository-adapter-plan",
                  status: "blocked",
                  targetAdapter: "postgres-repository-adapter",
                  runtimeMode: "inactive",
                  canSwitchAutomatically: false,
                  mockFallbackRequired: true,
                  methodPlan: { requiredCount: 34, missingCount: 0 },
                  dataDomains: [
                    { domain: "authRoleGrants", table: "auth_role_grants", methods: ["updateAuthUserRoles"] },
                    { domain: "authRoleEvents", table: "auth_role_events", methods: ["recordAudit"] },
                  ],
                  switchGates: [
                    { id: "repositoryContract", status: "pass" },
                    { id: "driverSetup", status: "blocked" },
                    { id: "humanApproval", status: "pending" },
                  ],
                  blockedReasons: ["数据库驱动或只读探测配置仍未准备好。"],
                  pendingApprovals: ["humanApproval"],
                  implementationSteps: ["实现 PostgreSQL repository adapter。"],
                  rollbackPlan: ["如 smoke test 失败，保持生产适配器 inactive。"],
                  disclaimer: "仓储适配器计划只描述生产切换门禁；当前不会连接数据库。",
                },
                repositoryRuntimeGuard: {
                  id: "repository-runtime-guard",
                  status: "fallback-active",
                  requestedMode: "postgres-primary",
                  effectiveMode: "mock",
                  currentMode: "mock",
                  allowedModes: ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
                  canUseRequestedMode: false,
                  canSwitchAutomatically: false,
                  checks: [
                    { id: "requestedModeSupported", status: "pass" },
                    { id: "productionCutoverReady", status: "blocked" },
                    { id: "automaticSwitchDisabled", status: "pass" },
                    { id: "mockFallback", status: "pass" },
                  ],
                  safety: {
                    noAutomaticSwitch: true,
                    mockFallbackRequired: true,
                    requiresHumanApproval: true,
                  },
                  blockedReasons: ["生产仓储切换门禁未通过，不能把 PostgreSQL 设为主数据源。"],
                  nextSteps: ["保持 FINANCE_AI_REPOSITORY_MODE 为 mock 或 json。"],
                  disclaimer: "仓储运行时保护器只选择安全回退路径；当前不会自动切换到 PostgreSQL。",
                },
                productionRepositoryAdapter: {
                  id: "production-postgres-repository-adapter",
                  name: "Production PostgreSQL Repository Adapter Skeleton",
                  status: "blocked",
                  runtimeMode: "inactive",
                  driver: { package: "pg", available: false },
                  methodCoverage: { requiredCount: 34, plannedCount: 34, missingCount: 0 },
                  tableCoverage: [
                    { table: "auth_role_grants", operationCount: 2, writeOperationCount: 1 },
                    { table: "auth_role_events", operationCount: 2, writeOperationCount: 1 },
                  ],
                  operationContracts: [
                    {
                      method: "recordAudit",
                      table: "auth_role_events",
                      status: "planned",
                      accessPattern: "insert-or-upsert",
                      transactionRequired: true,
                    },
                  ],
                  transactionPolicy: {
                    defaultIsolation: "read committed",
                    writeTransactionsRequired: true,
                    auditWritesRequireHashChain: true,
                  },
                  safety: {
                    noNetworkCalls: true,
                    noRuntimeSwitch: true,
                    noWrites: true,
                  },
                  connectionProbeTimeoutPolicy: {
                    status: "defined",
                    mode: "read-only-timeboxed-probe-plan",
                    timeoutMs: 3000,
                    canOpenConnectionAutomatically: false,
                    canExecuteWriteProbe: false,
                    requiredProbeStatements: [
                      { id: "connectionPing", readOnly: true },
                      { id: "readOnlyTransaction", readOnly: true },
                    ],
                    failureMode: { onTimeout: "fail-closed-no-cutover" },
                    auditEnvelope: { forbiddenFields: ["rawConnectionString", "databasePassword"] },
                    safety: {
                      readOnlyOnly: true,
                      cutoverBlockedOnTimeout: true,
                      redactsConnectionString: true,
                    },
                  },
                  blockedReasons: ["数据库驱动 pg 尚未安装或未标记可用。"],
                  implementationSteps: ["实现每个 operation contract 对应的参数化 SQL。"],
                  disclaimer: "这是生产 PostgreSQL 仓储适配器骨架；当前不会写库。",
                },
                productionRepositorySmokeTest: {
                  id: "production-repository-readonly-smoke-plan",
                  mode: "read-only-smoke-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canExecuteAutomatically: false,
                  driver: { package: "pg", available: false },
                  connection: { configured: false, provider: "postgres", sslMode: "required" },
                  coverage: { readOnlyOperationCount: 12, criticalTableCount: 2, writeOperationCount: 8 },
                  smokeQueries: [
                    { id: "connectionPing", statement: "SELECT 1", safety: "read-only" },
                    { id: "transactionReadOnly", statement: "SHOW transaction_read_only", safety: "read-only" },
                    {
                      id: "tableVisible:auth_role_grants",
                      statement: "SELECT COUNT(*) FROM auth_role_grants LIMIT 1",
                      safety: "read-only",
                    },
                  ],
                  checks: [
                    { id: "connectionConfig", status: "blocked" },
                    { id: "driverAvailability", status: "blocked" },
                    { id: "readOnlyProbeOptIn", status: "pending" },
                    { id: "writeGuard", status: "planned" },
                  ],
                  criticalTables: ["auth_role_grants", "auth_role_events"],
                  blockedStatements: ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE"],
                  blockedReasons: ["只读探测开关未开启，冒烟测试必须保持跳过。"],
                  nextSteps: ["使用只读数据库账号执行连接 ping。"],
                  disclaimer: "这是生产仓储只读冒烟测试计划；当前不会执行 SQL。",
                },
                productionRepositorySqlContract: {
                  id: "production-repository-sql-contract",
                  mode: "parameterized-sql-contract",
                  status: "draft-ready",
                  runtimeMode: "inactive",
                  dialect: "postgresql",
                  statementCount: 34,
                  readStatementCount: 14,
                  writeStatementCount: 20,
                  tableWhitelist: ["users", "auth_sessions", "auth_role_events"],
                  statements: [
                    {
                      id: "find_auth_user_by_email_1",
                      method: "findAuthUserByEmail",
                      domain: "authUsers",
                      table: "users",
                      accessMode: "read",
                      accessPattern: "select-one",
                      transactionRequired: false,
                      auditRequired: false,
                      parameterStyle: "postgres-positional",
                      placeholderCount: 1,
                      statement: "SELECT * FROM users WHERE email = $1 LIMIT 1",
                      resultShape: "single-row-or-null",
                      status: "draft",
                    },
                    {
                      id: "record_audit_2",
                      method: "recordAudit",
                      domain: "auditLog",
                      table: "audit_events",
                      accessMode: "write",
                      accessPattern: "insert-or-upsert",
                      transactionRequired: true,
                      auditRequired: true,
                      parameterStyle: "postgres-positional",
                      placeholderCount: 6,
                      statement: "INSERT INTO audit_events (...) VALUES ($1, $2, $3, $4::jsonb, $5, $6)",
                      resultShape: "inserted-row",
                      status: "draft",
                    },
                  ],
                  checks: [
                    { id: "repositoryContract", status: "pass" },
                    { id: "tableWhitelist", status: "pass" },
                    { id: "parameterizedStatements", status: "pass" },
                    { id: "writeTransactions", status: "planned" },
                  ],
                  safety: {
                    noSqlExecution: true,
                    parameterizedValuesOnly: true,
                    noRuntimeSwitch: true,
                  },
                  blockedReasons: [],
                  nextSteps: ["为每个 SQL 模板补充真实列映射和输入校验。"],
                  disclaimer: "这是生产 PostgreSQL 仓储 SQL 契约草案；当前不会执行 SQL。",
                },
                productionRepositoryExecutionPlan: {
                  id: "production-repository-execution-plan",
                  mode: "transaction-audit-execution-plan",
                  status: "draft-ready",
                  runtimeMode: "inactive",
                  canExecuteSql: false,
                  canOpenConnection: false,
                  coverage: {
                    validatorCount: 42,
                    transactionWrappedWriteCount: 20,
                    auditRequiredWriteCount: 20,
                  },
                  transactionWrapper: {
                    isolationLevel: "read committed",
                    begin: "BEGIN",
                    commit: "COMMIT",
                    rollback: "ROLLBACK",
                  },
                  auditWritePolicy: {
                    eventTypePrefix: "repository.postgres",
                    redactParameterValues: true,
                    hashChainRequired: true,
                  },
                  parameterValidators: [
                    { id: "find_auth_user_by_email_1_email", method: "findAuthUserByEmail", parameterName: "email", type: "email", required: true, status: "planned" },
                    { id: "record_audit_2_metadata", method: "recordAudit", parameterName: "metadata", type: "json-object", required: true, status: "planned" },
                  ],
                  executionSteps: [
                    { id: "validateParameters", status: "planned" },
                    { id: "openConnectionFromPool", status: "blocked" },
                    { id: "executeParameterizedStatement", status: "blocked" },
                    { id: "recordAuditForWrites", status: "planned" },
                  ],
                  safety: {
                    noSqlExecution: true,
                    validatesBeforeExecution: true,
                    auditRequiredForWrites: true,
                  },
                  blockedReasons: [],
                  nextSteps: ["实现参数校验器并覆盖边界值测试。"],
                  disclaimer: "这是生产 PostgreSQL 仓储执行计划；当前不会打开数据库连接。",
                },
                productionRepositoryParameterValidationPlan: {
                  id: "production-repository-parameter-validation-plan",
                  mode: "local-parameter-validation-plan",
                  status: "draft-ready",
                  runtimeMode: "inactive",
                  canValidateLocally: true,
                  canExecuteSql: false,
                  validatorCount: 42,
                  validatorTypes: ["email", "json-object", "stable-id", "integer"],
                  validators: [
                    { id: "find_auth_user_by_email_1_email", method: "findAuthUserByEmail", parameterName: "email", type: "email", required: true, status: "planned" },
                    { id: "record_audit_2_metadata", method: "recordAudit", parameterName: "metadata", type: "json-object", required: true, status: "planned" },
                  ],
                  sampleValidationResults: [
                    { id: "validEmail", parameterName: "email", validatorType: "email", accepted: true, errorCode: "", redactedSample: "[email]" },
                    { id: "invalidEmail", parameterName: "email", validatorType: "email", accepted: false, errorCode: "INVALID_EMAIL", redactedSample: "[string]" },
                    { id: "largeLimit", parameterName: "limit", validatorType: "integer", accepted: false, errorCode: "OUT_OF_RANGE", redactedSample: "[integer]" },
                  ],
                  checks: [
                    { id: "repositoryExecutionPlan", status: "pass" },
                    { id: "validatorCoverage", status: "pass" },
                    { id: "redactionPolicy", status: "pass" },
                    { id: "sqlExecutionBlocked", status: "pass" },
                  ],
                  safety: {
                    localOnly: true,
                    noDatabaseConnection: true,
                    noSqlExecution: true,
                    redactsSampleValues: true,
                    validatesBeforeExecution: true,
                  },
                  blockedReasons: [],
                  nextSteps: ["把这些纯参数校验器接入未来 PostgreSQL 执行器入口。"],
                  disclaimer: "这是生产 PostgreSQL 仓储参数校验计划；当前只做本地规则校验。",
                },
                productionRepositoryConnectionPoolPlan: {
                  id: "production-repository-connection-pool-plan",
                  mode: "connection-pool-transaction-wrapper-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canOpenConnection: false,
                  canExecuteSql: false,
                  driver: { package: "pg", available: false },
                  connection: { configured: false, provider: "postgres", sslMode: "required", sslRequired: true },
                  poolConfig: {
                    min: 0,
                    max: 5,
                    idleTimeoutMs: 30000,
                    connectionTimeoutMs: 5000,
                    statementTimeoutMs: 10000,
                    applicationName: "finance-ai-assistant-api",
                  },
                  transactionWrapper: {
                    defaultIsolationLevel: "read committed",
                    readOnlyTransactionsForReads: true,
                    writeTransactionsRequired: true,
                    releaseClient: "finally",
                  },
                  lifecycleSteps: [
                    { id: "loadConnectionConfig", status: "blocked" },
                    { id: "validateParameters", status: "pass" },
                    { id: "createPool", status: "blocked" },
                    { id: "acquireClient", status: "blocked" },
                    { id: "releaseClient", status: "planned" },
                  ],
                  checks: [
                    { id: "connectionConfig", status: "blocked" },
                    { id: "driverAvailability", status: "blocked" },
                    { id: "parameterValidation", status: "pass" },
                    { id: "automaticConnectionDisabled", status: "pass" },
                    { id: "sqlExecutionBlocked", status: "pass" },
                  ],
                  safety: {
                    noDatabaseConnection: true,
                    noSqlExecution: true,
                    noRuntimeSwitch: true,
                    releaseClientFinally: true,
                  },
                  blockedReasons: ["缺少生产数据库连接串，不能准备连接池实现。"],
                  nextSteps: ["实现 pg Pool 工厂，但默认不在应用启动时自动打开连接。"],
                  disclaimer: "这是生产 PostgreSQL 仓储连接池与事务包装计划；当前不会创建连接池。",
                },
                productionRepositorySqlExecutorPlan: {
                  id: "production-repository-sql-executor-plan",
                  mode: "parameter-binding-result-mapping-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canExecuteSql: false,
                  canOpenConnection: false,
                  statementCount: 34,
                  writeStatementCount: 20,
                  readStatementCount: 14,
                  bindingCoverage: {
                    parameterizedStatementCount: 34,
                    boundParameterCount: 42,
                    redactedBindingCount: 42,
                  },
                  executableStatements: [
                    {
                      id: "find_auth_user_by_email_1",
                      method: "findAuthUserByEmail",
                      table: "users",
                      accessMode: "read",
                      parameterBindingStyle: "pg-parameter-array",
                      resultShape: "single-row-or-null",
                      status: "blocked",
                    },
                    {
                      id: "record_audit_2",
                      method: "recordAudit",
                      table: "audit_events",
                      accessMode: "write",
                      parameterBindingStyle: "pg-parameter-array",
                      resultShape: "inserted-row",
                      status: "blocked",
                    },
                  ],
                  executorLifecycle: [
                    { id: "validateParameters", status: "pass" },
                    { id: "bindParameterArray", status: "planned" },
                    { id: "acquireClient", status: "blocked" },
                    { id: "executeClientQuery", status: "blocked" },
                    { id: "writeAuditEnvelope", status: "planned" },
                  ],
                  auditEnvelope: {
                    eventTypePrefix: "repository.postgres.execute",
                    redactParameterValues: true,
                    includeRowCountOnly: true,
                  },
                  checks: [
                    { id: "sqlContract", status: "pass" },
                    { id: "connectionPoolPlan", status: "blocked" },
                    { id: "parameterArrayBinding", status: "pass" },
                    { id: "rawValueRedaction", status: "pass" },
                  ],
                  safety: {
                    parameterArrayOnly: true,
                    noStringInterpolationForValues: true,
                    noSqlExecution: true,
                    redactsParameterValues: true,
                  },
                  blockedReasons: ["连接池计划尚未准备好，执行器必须保持不可执行。"],
                  nextSteps: ["实现 executeRepositoryStatement(statementId, params) 的纯参数绑定入口。"],
                  disclaimer: "这是生产 PostgreSQL 仓储 SQL 执行器绑定计划；当前不会执行 SQL。",
                },
                productionRepositoryResultAuditPlan: {
                  id: "production-repository-result-audit-plan",
                  mode: "result-mapping-audit-envelope-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canMapLiveRows: false,
                  canWriteAudit: false,
                  mappingCount: 34,
                  resultShapes: ["single-row-or-null", "inserted-row", "rows"],
                  mappings: [
                    {
                      id: "find_auth_user_by_email_1_result_mapping",
                      method: "findAuthUserByEmail",
                      table: "users",
                      resultShape: "single-row-or-null",
                      mappingMode: "single-or-null",
                      emptyResultPolicy: "null",
                      rawRowsLogged: false,
                      status: "blocked",
                    },
                    {
                      id: "record_audit_2_result_mapping",
                      method: "recordAudit",
                      table: "audit_events",
                      resultShape: "inserted-row",
                      mappingMode: "single-or-null",
                      emptyResultPolicy: "null",
                      rawRowsLogged: false,
                      status: "blocked",
                    },
                  ],
                  auditEnvelope: {
                    allowedFields: ["statementId", "method", "accessMode", "parameterNames", "rowCount"],
                    forbiddenFields: ["rawParameterValues", "rawRows", "connectionString"],
                  },
                  auditValidationSamples: [
                    { id: "safeSuccessEnvelope", accepted: true, blockedFields: [] },
                    { id: "unsafeRawValueEnvelope", accepted: false, blockedFields: ["rawParameterValues"] },
                    { id: "unsafeRawRowsEnvelope", accepted: false, blockedFields: ["rawRows"] },
                  ],
                  checks: [
                    { id: "sqlExecutorPlan", status: "blocked" },
                    { id: "resultShapeCoverage", status: "pass" },
                    { id: "jsonbParsing", status: "pass" },
                    { id: "timestampNormalization", status: "pass" },
                    { id: "auditRawValueBlock", status: "pass" },
                  ],
                  safety: {
                    rawRowsNeverLogged: true,
                    rawParameterValuesNeverLogged: true,
                    rowCountOnlyInAudit: true,
                  },
                  blockedReasons: ["SQL 执行器绑定计划尚未准备好，不能确认结果映射与审计 envelope。"],
                  nextSteps: ["实现 resultShape 到 repository 返回对象的纯映射函数。"],
                  disclaimer: "这是生产 PostgreSQL 仓储结果映射与审计 envelope 计划；当前不会写审计。",
                },
                productionRepositoryReadRehearsalPlan: {
                  id: "production-repository-readonly-query-rehearsal-plan",
                  mode: "staging-readonly-query-rehearsal-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canRunStagingReads: false,
                  canRunProductionReads: false,
                  canWriteData: false,
                  readOnlyRehearsalEnabled: false,
                  coverage: {
                    readStatementCount: 14,
                    sampleQueryCount: 5,
                    tableCount: 6,
                    parameterizedReadCount: 14,
                  },
                  rehearsalWindow: {
                    environment: "staging-first",
                    maxRowsPerQuery: 25,
                    statementTimeoutMs: 10000,
                    minimumSuccessfulRuns: 3,
                  },
                  sampleQueries: [
                    {
                      id: "find_auth_user_by_email_readonly_rehearsal",
                      method: "findAuthUserByEmail",
                      table: "users",
                      resultShape: "single-row-or-null",
                      expectedMapping: "single-or-null",
                      maxRows: 1,
                      readOnlyTransaction: true,
                      status: "blocked",
                    },
                    {
                      id: "list_reminders_readonly_rehearsal",
                      method: "listReminders",
                      table: "reminder_rules",
                      resultShape: "rows",
                      expectedMapping: "rows-array",
                      maxRows: 25,
                      readOnlyTransaction: true,
                      status: "blocked",
                    },
                  ],
                  checks: [
                    { id: "readOnlySmokePlan", status: "blocked" },
                    { id: "resultAuditPlan", status: "blocked" },
                    { id: "readOnlyRehearsalOptIn", status: "pending" },
                    { id: "readStatementCoverage", status: "pass" },
                  ],
                  safety: {
                    noSqlExecution: true,
                    readOnlyTransactionsOnly: true,
                    rowLimitRequired: true,
                  },
                  blockedReasons: ["只读查询预演开关未开启，当前不能运行 staging 查询预演。"],
                  nextSteps: ["增加 FINANCE_AI_DB_READ_REHEARSAL=true 后只允许 staging 环境运行只读查询预演。"],
                  disclaimer: "这是生产 PostgreSQL 仓储只读查询预演计划；当前不会执行 SQL。",
                },
                productionRepositoryParityPlan: {
                  id: "production-repository-dual-read-parity-plan",
                  mode: "dual-read-parity-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canCompareAutomatically: false,
                  mockRepositoryRequired: true,
                  productionRepositoryRequired: true,
                  parityWindow: {
                    environment: "staging-first",
                    minimumSampleUsers: 3,
                    minimumRuns: 3,
                    maxAllowedMismatchPercent: 0,
                  },
                  comparisonPlan: [
                    {
                      domain: "authUsers",
                      table: "users",
                      methods: ["getAuthUser"],
                      keyStrategy: "user-scope-and-record-id",
                      status: "planned",
                    },
                    {
                      domain: "authSessions",
                      table: "auth_sessions",
                      methods: ["findAuthSessionByTokenHash"],
                      keyStrategy: "user-scope-and-record-id",
                      status: "planned",
                    },
                  ],
                  ignoredFields: ["createdAt", "updatedAt", "hash", "previousHash"],
                  checks: [
                    { id: "repositoryContract", status: "pass" },
                    { id: "readOnlySmoke", status: "blocked" },
                    { id: "parityOptIn", status: "pending" },
                    { id: "zeroMismatchThreshold", status: "planned" },
                  ],
                  safety: {
                    noWrites: true,
                    noRuntimeSwitch: true,
                    mockFallbackRequired: true,
                  },
                  blockedReasons: ["双读验证开关未开启，当前不能比较 mock/JSON 与生产仓储结果。"],
                  nextSteps: ["使用匿名或测试用户样本执行双读比较。"],
                  disclaimer: "这是生产仓储双读一致性验证计划；当前不会读取真实生产数据。",
                },
                productionRepositoryParityEvidencePlan: {
                  id: "production-repository-parity-evidence-plan",
                  mode: "dual-read-parity-evidence-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canCaptureEvidence: false,
                  canReadProductionData: false,
                  canWriteData: false,
                  evidenceCoverage: {
                    domainCount: 2,
                    methodCount: 2,
                    ignoredFieldCount: 4,
                    requiredSuccessfulRuns: 3,
                    maxAllowedMismatchPercent: 0,
                  },
                  evidenceRecords: [
                    {
                      id: "authUsers_parity_evidence",
                      domain: "authUsers",
                      table: "users",
                      methods: ["getAuthUser"],
                      keyStrategy: "user-scope-and-record-id",
                      sampleScope: "user-scoped-sample",
                      expectedOutcome: "zero-mismatch",
                      status: "blocked",
                    },
                  ],
                  mismatchCategories: [
                    { id: "missingRecord", severity: "blocker", action: "block-cutover" },
                    { id: "fieldValueMismatch", severity: "blocker", action: "block-cutover" },
                    { id: "ignoredTimestampOrHash", severity: "allowed", action: "normalize-and-ignore" },
                  ],
                  auditEnvelope: {
                    eventTypePrefix: "repository.postgres.parity",
                    allowedFields: ["domain", "method", "mockRowCount", "postgresRowCount", "mismatchCount"],
                    forbiddenFields: ["rawMockRows", "rawPostgresRows", "rawParameterValues"],
                  },
                  checks: [
                    { id: "readRehearsalPlan", status: "blocked" },
                    { id: "parityPlan", status: "blocked" },
                    { id: "evidenceDomainCoverage", status: "pass" },
                    { id: "rawDataRedaction", status: "pass" },
                  ],
                  safety: {
                    rawRowsNeverLogged: true,
                    mismatchBlocksCutover: true,
                    mockFallbackRequired: true,
                  },
                  blockedReasons: ["双读一致性计划尚未准备好，不能生成差异评估证据。"],
                  nextSteps: ["采集证据时只记录行数、差异类别、样本 id、耗时和状态。"],
                  disclaimer: "这是生产 PostgreSQL 仓储双读证据与差异评估计划；当前不会比较真实记录。",
                },
                productionRepositoryDualWritePlan: {
                  id: "production-repository-dual-write-rehearsal-plan",
                  mode: "dual-write-rehearsal-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canWriteAutomatically: false,
                  canSwitchAutomatically: false,
                  mockPrimaryRequired: true,
                  productionShadowWriteOnly: true,
                  rehearsalWindow: {
                    environment: "staging-first",
                    minimumSuccessfulRuns: 3,
                    maxAllowedWriteMismatchPercent: 0,
                    rollbackOnFirstMismatch: true,
                  },
                  writePlan: [
                    {
                      domain: "authUsers",
                      table: "users",
                      methods: ["createAuthUser", "updateAuthUserRoles"],
                      transactionRequired: true,
                      auditRequired: true,
                      status: "planned",
                    },
                    {
                      domain: "authSessions",
                      table: "auth_sessions",
                      methods: ["saveAuthSession"],
                      transactionRequired: true,
                      auditRequired: true,
                      status: "planned",
                    },
                  ],
                  checks: [
                    { id: "repositoryContract", status: "pass" },
                    { id: "dualReadParity", status: "blocked" },
                    { id: "dualWriteOptIn", status: "pending" },
                    { id: "idempotencyKeys", status: "planned" },
                  ],
                  safety: {
                    noRuntimeSwitch: true,
                    mockRemainsSourceOfTruth: true,
                    productionWritesShadowOnly: true,
                  },
                  blockedReasons: ["双写演练开关未开启，当前不能把写入同时发送到 mock/JSON 与生产仓储。"],
                  rollbackTriggers: ["任一写入结果不一致。", "任一幂等键重复或缺失。"],
                  nextSteps: ["mock/JSON 仓储继续作为唯一用户可见数据源。"],
                  disclaimer: "这是生产仓储双写/受控迁移演练计划；当前不会写入生产仓储。",
                },
                productionRepositoryShadowWriteEvidencePlan: {
                  id: "production-repository-shadow-write-evidence-plan",
                  mode: "shadow-write-evidence-idempotency-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canWriteProduction: false,
                  canChangeUserVisibleData: false,
                  canSwitchRuntime: false,
                  evidenceCoverage: {
                    domainCount: 2,
                    methodCount: 3,
                    idempotencyKeyRequiredCount: 2,
                    transactionRequiredCount: 2,
                    auditRequiredCount: 2,
                    requiredSuccessfulRuns: 3,
                    maxAllowedWriteMismatchPercent: 0,
                  },
                  evidenceRecords: [
                    {
                      id: "authUsers_shadow_write_evidence",
                      domain: "authUsers",
                      table: "users",
                      methods: ["createAuthUser", "updateAuthUserRoles"],
                      transactionRequired: true,
                      auditRequired: true,
                      idempotencyKeyRequired: true,
                      expectedOutcome: "mock-visible-production-shadow-only",
                      status: "blocked",
                    },
                  ],
                  idempotencyPolicy: {
                    requiredForEveryWrite: true,
                    duplicateHandling: "block-and-rollback-shadow-write",
                    ttlHours: 24,
                    rawPayloadHashOnly: true,
                  },
                  auditEnvelope: {
                    eventTypePrefix: "repository.postgres.shadow_write",
                    allowedFields: ["domain", "method", "idempotencyKeyHash", "rowCount", "status"],
                    forbiddenFields: ["rawPayload", "rawMockRecord", "rawPostgresRecord"],
                  },
                  checks: [
                    { id: "dualWriteRehearsalPlan", status: "blocked" },
                    { id: "shadowOnly", status: "pass" },
                    { id: "idempotencyKeyCoverage", status: "pass" },
                    { id: "rawPayloadRedaction", status: "pass" },
                  ],
                  safety: {
                    mockRemainsSourceOfTruth: true,
                    productionWritesShadowOnly: true,
                    rawPayloadNeverLogged: true,
                  },
                  blockedReasons: ["双写演练尚未准备好，不能生成影子写证据计划。"],
                  rollbackTriggers: ["任一幂等键重复、缺失或过期。", "任一 raw payload 或原始记录进入审计 envelope。"],
                  nextSteps: ["所有 shadow write 证据必须使用幂等键 hash、事务审计和 row count。"],
                  disclaimer: "这是生产 PostgreSQL 仓储影子写证据与幂等计划；当前不会写入生产仓储。",
                },
                productionRepositoryBackupRestoreEvidencePlan: {
                  id: "production-repository-backup-restore-evidence-plan",
                  mode: "backup-restore-rehearsal-evidence-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canRunBackup: false,
                  canRunRestore: false,
                  canTouchProductionData: false,
                  backupRestoreVerified: false,
                  recoveryObjectives: {
                    targetRpoMinutes: 15,
                    targetRtoMinutes: 30,
                    minimumSuccessfulRestoreRuns: 2,
                    maxAllowedDataLossRecords: 0,
                  },
                  evidenceCoverage: {
                    tableCount: 3,
                    criticalTableCount: 2,
                    backupArtifactCount: 4,
                    restoreRunCountRequired: 2,
                    checksumRequiredCount: 4,
                  },
                  criticalTables: ["users", "auth_sessions"],
                  rehearsalArtifacts: [
                    {
                      id: "schemaDump",
                      artifactType: "schema",
                      required: true,
                      encrypted: true,
                      checksumRequired: true,
                      status: "blocked",
                    },
                    {
                      id: "dataSnapshot",
                      artifactType: "data",
                      required: true,
                      encrypted: true,
                      checksumRequired: true,
                      status: "blocked",
                    },
                  ],
                  checks: [
                    { id: "shadowWriteEvidence", status: "blocked" },
                    { id: "backupRestoreOptIn", status: "pending" },
                    { id: "encryptedBackup", status: "planned" },
                    { id: "checksumVerification", status: "planned" },
                  ],
                  safety: {
                    encryptionRequired: true,
                    checksumRequired: true,
                    mockFallbackRequired: true,
                    cutoverBlockedUntilRestoreVerified: true,
                  },
                  blockedReasons: ["备份恢复演练验证尚未记录，不能解除生产仓储切换前的恢复门禁。"],
                  rollbackTriggers: ["任一备份 artifact 校验和不一致。", "任一关键表恢复后记录缺失或多出。"],
                  nextSteps: ["完成至少两次恢复演练，并记录 RPO、RTO、校验和与关键表记录数。"],
                  disclaimer: "这是生产 PostgreSQL 仓储备份恢复演练证据计划；当前不会执行备份或恢复。",
                },
                productionRepositoryCutoverMonitoringEvidencePlan: {
                  id: "production-repository-cutover-monitoring-evidence-plan",
                  mode: "cutover-monitoring-evidence-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canStartMonitoring: false,
                  canReadProductionMetrics: false,
                  canSwitchRuntime: false,
                  monitoringVerified: false,
                  monitoringWindow: {
                    environment: "staging-first",
                    preCutoverMinutes: 60,
                    postCutoverMinutes: 120,
                    rollbackDecisionMinutes: 15,
                    minimumHealthyWindows: 2,
                  },
                  evidenceCoverage: {
                    metricCount: 5,
                    monitoredTableCount: 2,
                    alertRouteCount: 3,
                    rollbackTriggerCount: 5,
                  },
                  monitoredTables: ["users", "audit_events"],
                  metricProbes: [
                    {
                      id: "writeFailureRate",
                      signal: "repository.write.failure_rate",
                      threshold: "<=0.1%",
                      rollbackOnBreach: true,
                      status: "blocked",
                    },
                    {
                      id: "p95WriteLatency",
                      signal: "repository.write.p95_latency_ms",
                      threshold: "<=750ms",
                      rollbackOnBreach: true,
                      status: "blocked",
                    },
                  ],
                  alertRoutes: [
                    { id: "engineeringOnCall", channel: "internal-on-call", required: true, status: "blocked" },
                    { id: "auditArchive", channel: "audit-export-package", required: true, status: "blocked" },
                  ],
                  checks: [
                    { id: "backupRestoreEvidence", status: "blocked" },
                    { id: "monitoringOptIn", status: "pending" },
                    { id: "alertRouting", status: "planned" },
                    { id: "rollbackOwner", status: "planned" },
                  ],
                  safety: {
                    noMetricSubscription: true,
                    mockFallbackRequired: true,
                    rollbackOwnerRequired: true,
                    cutoverBlockedUntilMonitoringVerified: true,
                  },
                  blockedReasons: ["切换监控验证尚未记录，不能解除生产仓储切换前的可观测性门禁。"],
                  rollbackTriggers: ["写入失败率超过 0.1%。", "P95 写入延迟超过 750ms。"],
                  nextSteps: ["记录人工回滚负责人和 15 分钟内决策窗口。"],
                  disclaimer: "这是生产 PostgreSQL 仓储切换监控证据计划；当前不会订阅真实监控。",
                },
                productionRepositoryRollbackRehearsalEvidencePlan: {
                  id: "production-repository-rollback-rehearsal-evidence-plan",
                  mode: "rollback-rehearsal-evidence-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canRollbackRuntime: false,
                  canReplayWrites: false,
                  canTouchProductionData: false,
                  rollbackVerified: false,
                  rollbackObjectives: {
                    rollbackDeadlineMinutes: 15,
                    targetRtoMinutes: 10,
                    minimumSuccessfulRollbackRuns: 2,
                    maxAllowedDataLossRecords: 0,
                  },
                  evidenceCoverage: {
                    rollbackPathCount: 5,
                    rollbackTableCount: 2,
                    requiredAuditPackageCount: 1,
                    requiredSuccessfulRuns: 2,
                  },
                  rollbackTables: ["users", "audit_events"],
                  rollbackPaths: [
                    { id: "featureFlagRevert", action: "set FINANCE_AI_REPOSITORY_MODE back to mock-or-json", expectedDurationMinutes: 2, status: "blocked" },
                    { id: "auditExport", action: "export-cutover-window-audit-package", expectedDurationMinutes: 5, status: "blocked" },
                  ],
                  checks: [
                    { id: "cutoverMonitoringEvidence", status: "blocked" },
                    { id: "rollbackRehearsalOptIn", status: "pending" },
                    { id: "featureFlagRollback", status: "planned" },
                    { id: "auditExport", status: "planned" },
                  ],
                  safety: {
                    noRuntimeRollback: true,
                    mockFallbackRequired: true,
                    noAuditExportExecution: true,
                    cutoverBlockedUntilRollbackVerified: true,
                  },
                  blockedReasons: ["回滚演练验证尚未记录，不能解除生产仓储切换前的回滚门禁。"],
                  rollbackTriggers: ["无法在 15 分钟内恢复 mock/json 为用户可见主源。", "回滚演练缺少切换窗口审计导出。"],
                  nextSteps: ["记录回滚负责人、回滚命令、写入冻结、审计导出和回退后校验步骤。"],
                  disclaimer: "这是生产 PostgreSQL 仓储回滚演练证据计划；当前不会执行运行时回滚。",
                },
                productionRepositoryCutoverAuditTrailEvidencePlan: {
                  id: "production-repository-cutover-audit-trail-evidence-plan",
                  mode: "cutover-audit-trail-evidence-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canWriteAudit: false,
                  canReadProductionAudit: false,
                  canSwitchRuntime: false,
                  auditTrailVerified: false,
                  auditObjectives: {
                    requiredHashChainContinuityPercent: 100,
                    maxAuditLagSeconds: 30,
                    minimumRetentionDays: 90,
                    requiredExportPackageCount: 1,
                  },
                  evidenceCoverage: {
                    eventTypeCount: 5,
                    auditFieldCount: 10,
                    forbiddenFieldCount: 7,
                    requiredPackageCount: 1,
                  },
                  auditEvents: [
                    { id: "cutoverRequested", eventType: "repository.cutover.requested", status: "blocked" },
                    { id: "featureFlagChanged", eventType: "repository.cutover.feature_flag_changed", status: "blocked" },
                  ],
                  auditEnvelope: {
                    allowedFields: ["eventType", "actorId", "approvalId", "repositoryMode", "previousMode", "targetMode", "durationMs", "status", "hash", "previousHash"],
                    forbiddenFields: ["rawPayload", "rawUserRecord", "rawPortfolio", "rawSql", "rawParameterValues", "accessToken", "refreshToken"],
                    hashChainRequired: true,
                    exportPackageRequired: true,
                  },
                  checks: [
                    { id: "rollbackRehearsalEvidence", status: "blocked" },
                    { id: "auditTrailOptIn", status: "pending" },
                    { id: "hashChainContinuity", status: "planned" },
                    { id: "redactionPolicy", status: "pass" },
                  ],
                  safety: {
                    noAuditWrite: true,
                    noProductionAuditRead: true,
                    noRawPayloadLogging: true,
                    cutoverBlockedUntilAuditVerified: true,
                  },
                  blockedReasons: ["切换审计链验证尚未记录，不能解除生产仓储切换前的审计门禁。"],
                  rollbackTriggers: ["审计 hash 链连续性低于 100%。", "审计事件写入延迟超过 30 秒。"],
                  nextSteps: ["审计链证据通过前，生产仓储切换门禁必须保持阻断。"],
                  disclaimer: "这是生产 PostgreSQL 仓储切换审计链证据计划；当前不会写入审计记录。",
                },
                productionRepositoryCutoverPlan: {
                  id: "production-repository-cutover-plan",
                  mode: "feature-flag-cutover-plan",
                  status: "blocked",
                  runtimeMode: "inactive",
                  canSwitchAutomatically: false,
                  canWriteAutomatically: false,
                  featureFlag: {
                    name: "FINANCE_AI_REPOSITORY_MODE",
                    current: "mock",
                    allowedValues: ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
                    target: "postgres-primary",
                    requiresManualApproval: true,
                  },
                  cutoverWindow: {
                    environment: "staging-first",
                    preferredWindow: "low-traffic-manual-window",
                    minimumSuccessfulDualWriteRuns: 3,
                    maxAllowedMismatchPercent: 0,
                    rollbackDeadlineMinutes: 15,
                  },
                  checks: [
                    { id: "repositoryContract", status: "pass" },
                    { id: "dualWriteRehearsal", status: "blocked" },
                    { id: "humanApproval", status: "pending" },
                    { id: "backupRestore", status: "blocked" },
                    { id: "monitoring", status: "blocked" },
                    { id: "rollbackPlan", status: "blocked" },
                    { id: "auditTrail", status: "blocked" },
                  ],
                  safety: {
                    noAutomaticSwitch: true,
                    mockFallbackRequired: true,
                    requiresHumanApproval: true,
                  },
                  blockedReasons: ["人工切换批准未记录，不能把生产仓储设为主数据源。"],
                  rollbackTriggers: ["切换后 15 分钟内出现任何写入失败率异常。", "任一审计事件缺失或 hash 链断裂。"],
                  rollbackPlan: ["立即将 FINANCE_AI_REPOSITORY_MODE 从 postgres-primary 切回 mock 或 json。"],
                  nextSteps: ["由管理员在低流量窗口手动批准切换。"],
                  disclaimer: "这是生产仓储 feature flag 切换计划；当前不会切换运行时仓储。",
                },
                missingProductionCapabilities: [
                  "accessControl",
                  "encryptionAtRest",
                  "backupRestore",
                  "schemaMigrations",
                ],
                disclaimer: "当前为数据库规划状态，不代表生产数据库已接入。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/audit/status")) {
          return {
            ok: true,
            json: async () => ({
              activeService: {
                id: "mock-audit-service",
                name: "Mock 审计服务",
                mode: "sample",
                status: "planning",
                storageMode: "memory-only",
                retentionPolicy: {
                  maxEvents: 500,
                  windowDays: 90,
                  enforcement: "repository-cap-and-manual-purge",
                  manualPurgeSupported: true,
                  rechainAfterPurge: true,
                },
                maintenancePolicy: {
                  retentionPurgeSupported: true,
                  manualPurgeSupported: true,
                  exportPackageSupported: true,
                  auditTrailRequired: true,
                  rechainAfterPurge: true,
                },
                automationPlan: {
                  id: "audit-retention-automation-plan",
                  status: "blocked",
                  mode: "dry-run-no-scheduler-start",
                  canStartAutomatedPurge: false,
                  schedule: {
                    timezone: "Australia/Brisbane",
                    cadence: "daily",
                    localTime: "06:00",
                    jitterMinutes: 15,
                  },
                  checks: [
                    { id: "scheduler", status: "blocked" },
                    { id: "singleFlightLock", status: "blocked" },
                    { id: "wormArchive", status: "blocked" },
                    { id: "approvalWorkflow", status: "blocked" },
                    { id: "rollbackDrill", status: "blocked" },
                  ],
                  blockedReasons: ["清理前必须先写入不可变归档或外部审计存证。"],
                  safety: {
                    noAutomaticSchedulerStart: true,
                    requiresSingleFlightLock: true,
                    requiresArchiveBeforeDelete: true,
                    requiresHumanApproval: true,
                    requiresRollbackDrill: true,
                  },
                },
                redactionPolicy: {
                  metadata: "sensitive-keys-redacted",
                  email: "masked",
                  redactedFields: ["password", "token", "authorization"],
                },
                integrity: {
                  status: "verified",
                  eventCount: 3,
                  latestHash: "abcdef1234567890",
                  algorithm: "sha256-stable-json",
                  brokenEvents: [],
                },
                capabilities: [
                  "safeMetadata",
                  "retentionLimit",
                  "retentionPurge",
                  "auditRetentionAutomationPlan",
                  "userScopedAuditLog",
                  "hashChainIntegrity",
                ],
                missingProductionCapabilities: ["externalWormArchive", "fieldLevelEncryption"],
                disclaimer: "当前为样例审计服务，支持基础元数据脱敏、数量保留和 hash chain 完整性校验。",
              },
              services: [],
            }),
          };
        }
        if (url.endsWith("/api/news?market=a")) {
          return {
            ok: true,
            json: async () => ({
              market: "a",
              sourceStatus: "sample",
              items: [
                {
                  title: "后端联动新闻样例",
                  source: "后端新闻源",
                  importance: 88,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news/intelligence?market=a&symbol=600519&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "贵州茅台渠道情报样例",
                  source: { label: "公司公告" },
                  importanceScore: 82,
                  sourceCredibilityScore: 80,
                  sourceCount: 1,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news/filings?market=a&symbol=600519")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "贵州茅台发布年度分红公告",
                  source: { label: "交易所公告" },
                  importanceScore: 84,
                  sourceCredibilityScore: 86,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/public-statements?market=a&symbol=600519")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "管理层强调渠道库存保持稳定",
                  source: { label: "Mock 公开言论样例" },
                  importanceScore: 78,
                  sourceCredibilityScore: 80,
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            status: "ok",
            service: "finance-ai-assistant-backend",
            version: "0.1.0",
          }),
        };
      },
    },
  );

  await app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-check-backend]", {}),
  });

  assert.deepEqual(requestedUrls, [
    "http://localhost:4180/health",
    "http://localhost:4180/api/data-sources",
    "http://localhost:4180/api/market-data/runtime-status",
    "http://localhost:4180/api/news/ingestion-runtime/status",
    "http://localhost:4180/api/ai-services",
    "http://localhost:4180/api/compliance/status",
    "http://localhost:4180/api/auth/status",
    "http://localhost:4180/api/notification-services",
    "http://localhost:4180/api/job-services",
    "http://localhost:4180/api/scheduler/status",
    "http://localhost:4180/api/repository/status",
    "http://localhost:4180/api/project/progress",
    "http://localhost:4180/api/public-preview/access-status",
    "http://localhost:4180/api/database/status",
    "http://localhost:4180/api/audit/status",
    "http://localhost:4180/api/news?market=us&symbol=MSFT",
    "http://localhost:4180/api/news/intelligence?market=us&symbol=MSFT&minImportance=70",
    "http://localhost:4180/api/news/filings?market=us&symbol=MSFT",
    "http://localhost:4180/api/public-statements?market=us&symbol=MSFT",
    "http://localhost:4180/api/analysis?symbol=MSFT&riskProfile=balanced",
    "http://localhost:4180/api/market-data/quote?market=us&code=MSFT",
    "http://localhost:4180/api/market-data/history?market=us&code=MSFT&range=6m&interval=1mo",
    "http://localhost:4180/api/macro/context?market=us",
  ]);
  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.equal(JSON.parse(app.localStorage.getItem("apiProviderStatus")).id, "mock");
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiProviderStatus")).integrationPlan.status,
    "blocked",
  );
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiProviderStatus")).providerRegistry.activeRuntimeProvider,
    "mock",
  );
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiMarketDataRuntimeStatus")).id,
    "mock-market-data-runtime",
  );
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiNewsIngestionRuntimeStatus")).id,
    "mock-news-ingestion-runtime",
  );
  assert.equal(JSON.parse(app.localStorage.getItem("apiAiServiceStatus")).id, "mock-ai-analysis");
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiComplianceServiceStatus")).id,
    "mock-compliance-service",
  );
  assert.equal(JSON.parse(app.localStorage.getItem("apiAuthServiceStatus")).id, "mock-auth");
  assert.equal(
    JSON.parse(app.localStorage.getItem("apiNotificationServiceStatus")).id,
    "mock-notification-delivery",
  );
  assert.equal(JSON.parse(app.localStorage.getItem("apiJobRunnerStatus")).id, "mock-reminder-job-runner");
  assert.equal(JSON.parse(app.localStorage.getItem("apiSchedulerStatus")).id, "mock-scheduler-service");
  assert.equal(JSON.parse(app.localStorage.getItem("apiRepositoryStatus")).id, "mock-user-state-repository");
  assert.equal(JSON.parse(app.localStorage.getItem("apiProjectProgress")).localDemoPercent, 100);
  assert.equal(JSON.parse(app.localStorage.getItem("apiDatabaseStatus")).id, "mock-database-service");
  assert.match(app.byId.get("projectProgressState").innerHTML, /backend-computed-readiness-strict-real-data/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /100%/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /80%/);
  assert.doesNotMatch(app.byId.get("projectProgressState").innerHTML, /99\.9%/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /真实数据源接入门禁/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /真实 AI 分析/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /数据授权未接入/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /计算依据 32\/35 项通过/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /\/api\/data-sources\/auto-ingestion-run/);
  assert.match(app.byId.get("projectProgressState").innerHTML, /来源 \/api\/data-sources/);
  assert.equal(JSON.parse(app.localStorage.getItem("apiAuditServiceStatus")).id, "mock-audit-service");
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /provider-operational-summary/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /技术详情与上线门禁/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /class="provider-advanced"/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /class="provider-advanced" open/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Mock Sample Provider/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /演练数据/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /A 股 \/ 港股 \/ 美股/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /市场新闻/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /真实数据源 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /实时\/延迟行情:missing/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /数据授权审查:blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /FINANCE_AI_MARKET_DATA_PROVIDER:missing/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Provider 注册表 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /运行时 local-rehearsal/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /授权行情 Provider:delayed-or-live/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /实时\/延迟行情:未选择:missing-config/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /供应商清单 blocked · 通过 3\/8 · 阻断 3 · 待批 2/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /marketData → marketNews → macroData → publicStatements/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情数据:licensed-market-data/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /MVP 市场覆盖:pass \/ 候选供应商分组:pass \/ 接入顺序:pass/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /合同交接包 defined · dry-run-no-contract-signing · 材料 2 · 不签约 · 不启用 runtime · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /复核角色 product-owner \/ data-source-reviewer \/ compliance-officer · 禁止材料 providerApiKey \/ unredactedContract/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /密钥额度手册 defined · dry-run-no-secret-use · vault 字段 3 · 额度 3 · 不读密钥 · 不联网/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /额度保护 阻断无限请求 · fallback local-rehearsal-provider-and-stale-cache · 密钥脱敏 · hash 链审计/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情验收清单 blocked · 通过 3\/9 · 阻断 3 · 待批 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /报价接口:symbol\/lastPrice\/asOf\/delayMinutes/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /A\/HK\/US 分别支持实时还是延迟报价/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻公告验收清单 blocked · 通过 3\/9 · 阻断 4 · 待批 2/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /标题摘要:title\/summary\/source\.label\/publishedAt/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /付费墙内容是否只能展示标题和来源链接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观数据验收清单 blocked · 通过 3\/10 · 阻断 3 · 待批 4/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /修订规则:revisionId\/previousValue\/revisedValue\/sourceUrl/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /政策日历的时区和延期规则是什么/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /公开言论验收清单 blocked · 通过 3\/10 · 阻断 4 · 待批 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /身份验证:speakerId\/speakerName\/speakerRole\/verificationStatus/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /未验证账号和疑似高影响言论如何进入人工复核队列/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Provider 注册阻断/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情适配器 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /getQuote:planned/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /授权分层 blocked · rehearsal \/ delayed \/ live · 用户授权 · 交易所协议 · 禁止审计 rawTick \/ fullOrderBook/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /延迟标签 blocked · rehearsal-not-real-time \/ delayed \/ live · 价格旁展示 · 图表旁展示 · 默认 15min/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Provider 预检 blocked · dry-run-no-provider-request · 不请求 provider · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /运行时 ready/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存查询遥测/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存模型 fresh-stale-expired/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /quote:fresh:local-rehearsal:a:600519:spot:snapshot/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /local-rehearsal:quote:0\/60:剩余60/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /熔断阈值 5 次 · 冷却 60s/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /local-rehearsal:quote:closed:失败0/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /quote:fresh:hit:closed/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观数据适配器 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /getMacroContext:planned:available/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /offline-rehearsal available · 上下文 3 · 指标 10 · 事件 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /因子联动 six-factor-macro-input-v1/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不可取真实宏观数据/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻采集运行时 ready/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /去重记录 1 · 冷却窗口 300s · 不抓取社交网页/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /news:a:600519:cooldown-started:run1/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /news:a:600519:接收1:重复0:缺署名0:阻断0/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /来源轮询遥测 \/ 去重遥测 \/ 署名门禁遥测/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不联网 · 不交易 · 不可取真实行情/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情 provider id 或 API key 尚未配置/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不代表实时行情/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实 AI 模型待配置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /未配置前不会展示样例或 mock 建议/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /量化概率/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子拆解/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /AI provider 适配器 blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /generateStructuredAnalysis:planned/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /提示词 analysis-prompt-v0 · structured-json · 模型参考概率/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /响应 schema draft · 必填 3 · 禁止 guaranteedReturn \/ mustBuy \/ mustSell/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /密钥管理 blocked · dry-run-no-model-secret-use · 不使用生产密钥 · unconfigured · 轮换 90 天/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /控制 managedSecretStore \/ serverSideOnlyAccess \/ keyRotation \/ leastPrivilegeRuntimeRole \/ secretAccessAudit \/ frontendSecretExclusion · 禁止 clientBundle \/ localStorage \/ sourceCode \/ testFixtures \/ analyticsEvents \/ auditEnvelope/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /注入防护 blocked · dry-run-no-unsanitized-source-text · 信号 5 · 不使用未净化文本 · 需隔离可疑来源/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /控制 sourceTextSanitization \/ instructionStripping \/ sourceRoleIsolation \/ quotedEvidenceOnly \/ unsafeSourceQuarantine \/ auditFlagging · 禁止 rawHtml \/ scriptContent \/ embeddedInstruction \/ trackingPixel \/ privateMessage · 需来源风险提示/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /数据最小化 blocked · dry-run-no-personal-data-to-model · 不发送个人数据 · 需同意上下文 · 需脱敏审计/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /允许 positionSide \/ costBasisBucket \/ holdingPeriodBucket \/ riskPreference \/ targetReturnRange \/ maxLossRange · 禁止 email \/ phone \/ address \/ brokerAccount \/ brokerCredentials \/ tradingPassword \/ rawPortfolioNotes \/ governmentId \/ preciseHoldingQuantity/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /fieldAllowlist \/ pseudonymousUserId \/ portfolioBucketing \/ credentialExclusion \/ preRequestRedaction \/ privacyAuditFlag/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /引用证据 blocked · dry-run-no-uncited-model-output · 每结论 1 条 · 不发布无引用分析 · 需结论-引用映射/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /字段 sourceId \/ sourceType \/ publisher \/ publishedAt \/ url \/ credibilityScore \/ importanceScore \/ linkedFactor · 来源 news \/ filing \/ publicStatement \/ marketData \/ macroData · 禁止 rawArticleText \/ rawSocialPost \/ paywalledFullText \/ personalData · 需新鲜度提示/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实数据证据包 defined · dry-run-no-live-model-grounding · 来源 5 类 · 字段 8 · 不无来源发布/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子覆盖证据包 defined · dry-run-no-factor-overconfidence · 因子 6 项 · 可操作需 6 项 · 缺失不高置信/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /新鲜度回退证据包 defined · dry-run-no-stale-data-release · 行情延迟≤20分钟 · 新闻≤24小时 · 不隐藏回退/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /合规门禁 blocked · live 不可调用/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型配置向导 ready-for-user-configuration · no-secret-model-provider-setup-guide · 分组 3 · 不读模型密钥 · 不调用真实模型/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /模型 Smoke 顺序 凭证预检 → 结构化校验 → 来源引用 → 人工回退 → 发布回滚/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /providerConfig:blocked \/ promptContract:pass/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /FINANCE_AI_MODEL_PROVIDER/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /不联网 · 不交易 · 禁止收益保证 · 不可调用真实模型/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /不代表真实投资建议/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /合规策略服务已连接/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /Mock 合规策略服务/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /policy-gate/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /不构成任何投资建议/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /保证收益 \/ 必须买入 \/ 必须卖出 \/ 无风险/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /概率语言 模型参考概率 · 禁止收益保证 · 禁止必须买卖 · 区分事实\/模型\/观点 · 就近免责声明/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /compliance-ack-v0 · 风险确认 · 持仓非必填说明 · 披露版本记录 · 未复核阻断公开发布/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /适当性执行 blocked · dry-run-no-personalized-restriction · 规则 5 · 暂不限制真实分析 · 需显示原因/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /profileRequiredForPersonalizedAnalysis \/ lowRiskBlocksAggressiveSignals/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /地区执行 blocked · dry-run-no-region-restriction · 默认 AU-QLD · 暂不限制真实地区 · 逐地区复核/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /detectUserJurisdiction \/ blockRestrictedJurisdictions \/ localizeDisclosures/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /支持 AU \/ US \/ HK \/ CN · 受限 unknown \/ sanctioned \/ unreviewed/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /披露版本 blocked · dry-run-no-disclosure-version-release · 控制 5 · 不发布披露版本 · 重大变更需重确认/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /disclaimer:disclaimer-v0 \/ riskWarning:risk-warning-v0/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /immutableDisclosureVersion \/ changeLogRequired \/ userReAcknowledgementOnMaterialChange/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /持牌复核 blocked · dry-run-no-adviser-approval · 触发 5 · 不批准个性化建议 · SLA 24h/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /strongBuySellLanguage \/ lowConfidenceHighImpact \/ complaintEscalation/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /复核角色 licensed-adviser \/ compliance-officer · 需用户可见等待态/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /法律预检 defined · dry-run-no-legal-approval · 不标记法律复核 · 需人工审批/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /current-disclaimer-text \/ prohibited-claim-policy \/ jurisdiction-scope-matrix/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /发布证据包 defined · dry-run-no-public-release · 章节 7 · 不公开发布 · 需人工审批/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /仍保持阻断 riskAcknowledgement \/ legalReview \/ publicReleaseGate/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /合规门禁 blocked · public beta 不可发布/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /disclaimerPresence:pass \/ probabilityLanguage:pass \/ riskAcknowledgement:blocked \/ suitabilityEnforcement:blocked \/ jurisdictionEnforcement:blocked \/ disclosureVersioning:blocked \/ licensedAdviserReview:blocked/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /固定免责声明/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /法律复核流程 \/ 适当性问卷/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /用户风险确认、免责声明确认和版本记录尚未完成/);
  assert.match(app.byId.get("repositoryState").innerHTML, /Mock 用户数据仓储/);
  assert.match(app.byId.get("repositoryState").innerHTML, /memory-only/);
  assert.match(app.byId.get("repositoryState").innerHTML, /自选股/);
  assert.match(app.byId.get("repositoryState").innerHTML, /通知投递箱/);
  assert.match(app.byId.get("repositoryState").innerHTML, /服务重启后数据会丢失/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据库服务已连接/);
  assert.match(app.byId.get("databaseState").innerHTML, /Mock 数据库服务/);
  assert.match(app.byId.get("databaseState").innerHTML, /memory-only/);
  assert.match(app.byId.get("databaseState").innerHTML, /pre-production/);
  assert.match(app.byId.get("databaseState").innerHTML, /用户/);
  assert.match(app.byId.get("databaseState").innerHTML, /自选股/);
  assert.match(app.byId.get("databaseState").innerHTML, /持仓/);
  assert.match(app.byId.get("databaseState").innerHTML, /表结构规划/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储接口契约/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储契约 pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /用户隔离记录：pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /authSessions-&gt;登录会话/);
  assert.match(app.byId.get("databaseState").innerHTML, /Production Database Adapter Skeleton/);
  assert.match(app.byId.get("databaseState").innerHTML, /not_configured/);
  assert.match(app.byId.get("databaseState").innerHTML, /configureConnection:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /加密门禁 blocked · dry-run-no-key-usage · missing · key id 缺失 · 不使用生产密钥/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionConfig:blocked \/ kmsProvider:blocked \/ encryptionAtRest:blocked \/ fieldLevelEncryption:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /email \/ portfolioPosition \/ notificationRecipient/);
  assert.match(app.byId.get("databaseState").innerHTML, /不进应用密钥材料 · 禁止自动用密钥 · 要求 envelope 加密/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产数据库加密阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /权限门禁 blocked · dry-run-no-permission-change · 不修改数据库权限/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionConfig:blocked \/ leastPrivilegeRoles:blocked \/ rowLevelSecurity:blocked \/ serviceRoleAudit:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /readonly_app \/ write_app \/ migration_runner \/ audit_reader/);
  assert.match(app.byId.get("databaseState").innerHTML, /user-owned-watchlist \/ portfolio-positions \/ audit-events/);
  assert.match(app.byId.get("databaseState").innerHTML, /不改权限 · 不建生产角色 · 要求 RLS · 要求最小权限/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产数据库权限阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /隐私保留 blocked · dry-run-no-data-erasure · 不删除生产数据/);
  assert.match(app.byId.get("databaseState").innerHTML, /retentionPolicy:blocked \/ erasureWorkflow:blocked \/ subjectExport:blocked \/ privacyAudit:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /account-profile \/ auth-sessions \/ watchlist-items \/ portfolio-positions \/ analysis-history/);
  assert.match(app.byId.get("databaseState").innerHTML, /user-requested-delete \/ regulatory-retention \/ security-audit \/ legal-hold/);
  assert.match(app.byId.get("databaseState").innerHTML, /不自动删除 · 要求 tombstone · 要求用户导出 · 要求 legal hold/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产数据库隐私保留阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据驻留 blocked · dry-run-no-cross-border-transfer · unassigned · 不跨区传输/);
  assert.match(app.byId.get("databaseState").innerHTML, /dataResidency:blocked \/ crossBorderTransfer:blocked \/ regionalBackup:blocked \/ subprocessorReview:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /primary-region \/ backup-region \/ analytics-region \/ support-access-region/);
  assert.match(app.byId.get("databaseState").innerHTML, /account-profile \/ portfolio-positions \/ suitability-questionnaires \/ notification-recipients/);
  assert.match(app.byId.get("databaseState").innerHTML, /不跨境传输 · 不改区域复制 · 要求用户披露 · 要求子处理方复核/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产数据库数据驻留阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /迁移预演 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /连接配置:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /1\.用户/);
  assert.match(app.byId.get("databaseState").innerHTML, /2\.登录会话/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 草案 generated/);
  assert.match(app.byId.get("databaseState").innerHTML, /postgresql/);
  assert.match(app.byId.get("databaseState").innerHTML, /fnv1a-test001/);
  assert.match(app.byId.get("databaseState").innerHTML, /无破坏性语句/);
  assert.match(app.byId.get("databaseState").innerHTML, /CREATE EXTENSION IF NOT EXISTS pgcrypto/);
  assert.match(app.byId.get("databaseState").innerHTML, /迁移包 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /2026\.06\.01\.001_initial_schema/);
  assert.match(app.byId.get("databaseState").innerHTML, /fnv1a-package001/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionConfig:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /迁移工具已接入并记录版本/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读连接 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /不可写/);
  assert.match(app.byId.get("databaseState").innerHTML, /driverAvailability:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据库驱动 pg/);
  assert.match(app.byId.get("databaseState").innerHTML, /FINANCE_AI_DATABASE_URL/);
  assert.match(app.byId.get("databaseState").innerHTML, /readOnlyHealthPreflight/);
  assert.match(app.byId.get("databaseState").innerHTML, /连接串脱敏/);
  assert.match(app.byId.get("databaseState").innerHTML, /不可读取密钥/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储切换 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /postgres-repository-adapter/);
  assert.match(app.byId.get("databaseState").innerHTML, /方法 34 个 · 缺失 0 个/);
  assert.match(app.byId.get("databaseState").innerHTML, /authRoleGrants-&gt;角色授权/);
  assert.match(app.byId.get("databaseState").innerHTML, /driverSetup:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储切换阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /运行时保护 fallback-active · 请求 postgres-primary · 生效 mock/);
  assert.match(app.byId.get("databaseState").innerHTML, /productionCutoverReady:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /禁止自动切换 · 保留 mock 回退 · 需人工批准/);
  assert.match(app.byId.get("databaseState").innerHTML, /mock \/ json \/ postgres-readonly \/ postgres-shadow \/ postgres-primary/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储运行时阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /Production PostgreSQL Repository Adapter Skeleton/);
  assert.match(app.byId.get("databaseState").innerHTML, /方法 34\/34 · 缺失 0/);
  assert.match(app.byId.get("databaseState").innerHTML, /角色授权:2/);
  assert.match(app.byId.get("databaseState").innerHTML, /不联网 · 不写库 · 不切换运行时/);
  assert.match(app.byId.get("databaseState").innerHTML, /连接探针 defined · read-only-timeboxed-probe-plan · 3000ms · 只读 · 超时阻断切换 · 连接串脱敏/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储适配器阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读冒烟 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读操作 12 · 关键表 2 · 写操作 8/);
  assert.match(app.byId.get("databaseState").innerHTML, /readOnlyProbeOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionPing:read-only/);
  assert.match(app.byId.get("databaseState").innerHTML, /INSERT \/ UPDATE \/ DELETE \/ DROP/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储只读冒烟阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 契约 draft-ready · postgresql · inactive/);
  assert.match(app.byId.get("databaseState").innerHTML, /语句 34 · 读 14 · 写 20/);
  assert.match(app.byId.get("databaseState").innerHTML, /parameterizedStatements:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /findAuthUserByEmail:postgres-positional:draft/);
  assert.match(app.byId.get("databaseState").innerHTML, /不执行 SQL · 仅参数化值 · 不切换运行时/);
  assert.match(app.byId.get("databaseState").innerHTML, /users \/ auth_sessions \/ auth_role_events/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储 SQL 契约阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /执行计划 draft-ready · inactive · 不可执行 SQL/);
  assert.match(app.byId.get("databaseState").innerHTML, /校验器 42 · 写事务 20 · 审计写 20/);
  assert.match(app.byId.get("databaseState").innerHTML, /openConnectionFromPool:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /email:email/);
  assert.match(app.byId.get("databaseState").innerHTML, /read committed · BEGIN\/COMMIT\/ROLLBACK/);
  assert.match(app.byId.get("databaseState").innerHTML, /repository\.postgres · 参数值脱敏 · Hash 链/);
  assert.match(app.byId.get("databaseState").innerHTML, /不执行 SQL · 先校验 · 写入需审计/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储执行计划阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /参数校验 draft-ready · inactive · 可本地校验/);
  assert.match(app.byId.get("databaseState").innerHTML, /校验器 42 · 类型 4/);
  assert.match(app.byId.get("databaseState").innerHTML, /email \/ json-object \/ stable-id \/ integer/);
  assert.match(app.byId.get("databaseState").innerHTML, /validEmail:通过 \/ invalidEmail:阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /redactionPolicy:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /本地校验 · 不执行 SQL · 样例脱敏/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储参数校验阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /连接池 blocked · inactive · 不打开连接/);
  assert.match(app.byId.get("databaseState").innerHTML, /postgres · 连接未配置 · SSL required/);
  assert.match(app.byId.get("databaseState").innerHTML, /pool 0-5 · idle 30000ms · stmt 10000ms/);
  assert.match(app.byId.get("databaseState").innerHTML, /validateParameters:pass \/ createPool:blocked \/ acquireClient:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /automaticConnectionDisabled:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /read committed · 读只读事务 · finally release/);
  assert.match(app.byId.get("databaseState").innerHTML, /不打开连接 · 不执行 SQL · finally 释放/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储连接池阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 执行器 blocked · inactive · 不可执行 SQL/);
  assert.match(app.byId.get("databaseState").innerHTML, /语句 34 · 绑定 42 · 脱敏 42/);
  assert.match(app.byId.get("databaseState").innerHTML, /findAuthUserByEmail:pg-parameter-array:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /bindParameterArray:planned \/ acquireClient:blocked \/ executeClientQuery:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /repository\.postgres\.execute · 参数脱敏 · 仅 row count/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionPoolPlan:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /参数数组 · 不拼接用户值 · 不执行 SQL/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储 SQL 执行器阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /结果审计 blocked · inactive · 不映射真实行/);
  assert.match(app.byId.get("databaseState").innerHTML, /映射 34 · 形状 3/);
  assert.match(app.byId.get("databaseState").innerHTML, /single-row-or-null \/ inserted-row \/ rows/);
  assert.match(app.byId.get("databaseState").innerHTML, /findAuthUserByEmail:single-or-null:null:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /允许 5 · 禁止 3/);
  assert.match(app.byId.get("databaseState").innerHTML, /safeSuccessEnvelope:通过 \/ unsafeRawValueEnvelope:阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditRawValueBlock:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /不记录原始行 · 不记录原始参数 · 审计仅 row count/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储结果审计阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读查询预演 blocked · inactive · 不运行真实查询/);
  assert.match(app.byId.get("databaseState").innerHTML, /读语句 14 · 样例 5 · 表 6/);
  assert.match(app.byId.get("databaseState").innerHTML, /staging-first · 每次 25 行 · 超时 10000ms/);
  assert.match(app.byId.get("databaseState").innerHTML, /findAuthUserByEmail:single-row-or-null:single-or-null:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /readOnlyRehearsalOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /不执行 SQL · 只读事务 · 限制行数/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储只读查询预演阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /双读一致性 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /样本用户 3 · 运行 3 次 · 差异阈值 0%/);
  assert.match(app.byId.get("databaseState").innerHTML, /parityOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /authUsers-&gt;用户:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /createdAt \/ updatedAt \/ hash/);
  assert.match(app.byId.get("databaseState").innerHTML, /不写库 · 不切换运行时 · 保留回退/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储双读一致性阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /双读证据 blocked · inactive · 不采集真实证据/);
  assert.match(app.byId.get("databaseState").innerHTML, /域 2 · 方法 2 · 忽略字段 4/);
  assert.match(app.byId.get("databaseState").innerHTML, /authUsers-&gt;用户:zero-mismatch:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /missingRecord:blocker \/ fieldValueMismatch:blocker/);
  assert.match(app.byId.get("databaseState").innerHTML, /repository\.postgres\.parity · 允许 5 · 禁止 3/);
  assert.match(app.byId.get("databaseState").innerHTML, /readRehearsalPlan:blocked \/ parityPlan:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /不记录原始行 · 差异阻断切换 · 保留回退/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储双读证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /双写演练 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /运行 3 次 · 写差异阈值 0% · 首个差异回滚/);
  assert.match(app.byId.get("databaseState").innerHTML, /dualWriteOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /authUsers-&gt;用户:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /不切换运行时 · mock 仍为主源 · 生产仅影子写/);
  assert.match(app.byId.get("databaseState").innerHTML, /任一写入结果不一致/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储双写演练阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /影子写证据 blocked · inactive · 不写生产/);
  assert.match(app.byId.get("databaseState").innerHTML, /域 2 · 方法 3 · 幂等 2/);
  assert.match(app.byId.get("databaseState").innerHTML, /authUsers-&gt;用户:mock-visible-production-shadow-only:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /每写必需 · block-and-rollback-shadow-write · TTL 24h/);
  assert.match(app.byId.get("databaseState").innerHTML, /repository\.postgres\.shadow_write · 允许 5 · 禁止 3/);
  assert.match(app.byId.get("databaseState").innerHTML, /dualWriteRehearsalPlan:blocked \/ shadowOnly:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /mock 仍主源 · 仅影子写 · 不记录 payload/);
  assert.match(app.byId.get("databaseState").innerHTML, /任一幂等键重复、缺失或过期/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储影子写证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /备份恢复 blocked · inactive · 不执行恢复/);
  assert.match(app.byId.get("databaseState").innerHTML, /RPO 15 分钟 · RTO 30 分钟 · 恢复 2 次/);
  assert.match(app.byId.get("databaseState").innerHTML, /表 3 · 关键 2 · 校验 4/);
  assert.match(app.byId.get("databaseState").innerHTML, /schemaDump:schema:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /用户 \/ 登录会话/);
  assert.match(app.byId.get("databaseState").innerHTML, /backupRestoreOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /加密备份 · 校验 checksum · 保留回退/);
  assert.match(app.byId.get("databaseState").innerHTML, /任一备份 artifact 校验和不一致/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储备份恢复证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /切换监控 blocked · inactive · 不读生产指标/);
  assert.match(app.byId.get("databaseState").innerHTML, /staging-first · 预切换 60 分钟 · 后切换 120 分钟 · 决策 15 分钟/);
  assert.match(app.byId.get("databaseState").innerHTML, /指标 5 · 表 2 · 告警 3 · 回滚 5/);
  assert.match(app.byId.get("databaseState").innerHTML, /writeFailureRate:&lt;=0.1%:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /engineeringOnCall:internal-on-call:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /用户 \/ 审计事件/);
  assert.match(app.byId.get("databaseState").innerHTML, /monitoringOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /不订阅指标 · 保留回退 · 需回滚负责人/);
  assert.match(app.byId.get("databaseState").innerHTML, /写入失败率超过 0.1%/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储切换监控证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /回滚演练 blocked · inactive · 不执行回滚/);
  assert.match(app.byId.get("databaseState").innerHTML, /截止 15 分钟 · RTO 10 分钟 · 演练 2 次/);
  assert.match(app.byId.get("databaseState").innerHTML, /路径 5 · 表 2 · 审计包 1/);
  assert.match(app.byId.get("databaseState").innerHTML, /featureFlagRevert:2m:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /用户 \/ 审计事件/);
  assert.match(app.byId.get("databaseState").innerHTML, /rollbackRehearsalOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /不执行回滚 · 保留回退 · 不导出真实审计/);
  assert.match(app.byId.get("databaseState").innerHTML, /无法在 15 分钟内恢复 mock\/json/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储回滚演练证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /审计链 blocked · inactive · 不写审计/);
  assert.match(app.byId.get("databaseState").innerHTML, /Hash 100% · 延迟 30s · 保留 90 天/);
  assert.match(app.byId.get("databaseState").innerHTML, /事件 5 · 字段 10 · 禁止 7/);
  assert.match(app.byId.get("databaseState").innerHTML, /cutoverRequested:repository.cutover.requested:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /允许 10 · 禁止 7 · Hash 链 · 导出包/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditTrailOptIn:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /不写审计 · 不读生产审计 · 不记录 payload/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储切换审计链证据阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /切换门禁 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /FINANCE_AI_REPOSITORY_MODE: mock -&gt; postgres-primary/);
  assert.match(app.byId.get("databaseState").innerHTML, /staging-first · low-traffic-manual-window · 回滚 15 分钟/);
  assert.match(app.byId.get("databaseState").innerHTML, /humanApproval:pending/);
  assert.match(app.byId.get("databaseState").innerHTML, /禁止自动切换 · 保留回退 · 需人工批准/);
  assert.match(app.byId.get("databaseState").innerHTML, /切换后 15 分钟内出现任何写入失败率异常/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储切换门禁阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产数据库连接配置缺失/);
  assert.match(app.byId.get("databaseState").innerHTML, /权限控制/);
  assert.match(app.byId.get("databaseState").innerHTML, /静态加密/);
  assert.match(app.byId.get("databaseState").innerHTML, /不代表生产数据库已接入/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计服务已连接/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Mock 审计服务/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /最多 500 条/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /repository-cap-and-manual-purge/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /敏感元数据脱敏/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /保留清理/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /自动清理计划/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /支持证据包导出/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /清理后重建 Hash 链/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /自动保留清理 blocked/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /dry-run-no-scheduler-start/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /daily 06:00 Australia\/Brisbane/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /wormArchive:blocked/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /先归档后删除/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /清理前必须先写入不可变归档/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Hash 链完整性/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Hash 链 verified \/ 事件 3 \/ sha256-stable-json \/ 最新 abcdef123456 \/ 未发现断链/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /不可变归档/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /字段级加密/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /hash chain 完整性校验/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /任务运行器已连接/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /Mock 提醒任务运行器/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /manual-api/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /提醒评估/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /任务记录/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /重复通知窗口 900s/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /重复通知抑制/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /不代表真实后台定时任务/);
  assert.match(app.byId.get("schedulerState").innerHTML, /调度服务已连接/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Mock 后台调度服务/);
  assert.match(app.byId.get("schedulerState").innerHTML, /manual-due-check/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Australia\/Brisbane/);
  assert.match(app.byId.get("schedulerState").innerHTML, /every-15-minutes/);
  assert.match(app.byId.get("schedulerState").innerHTML, /幂等窗口 600s · 冷却 60s/);
  assert.match(app.byId.get("schedulerState").innerHTML, /幂等键/);
  assert.match(app.byId.get("schedulerState").innerHTML, /冷却锁/);
  assert.match(app.byId.get("schedulerState").innerHTML, /死信策略 sample-ready · 最多 3 次 · 重试 exponential · 基础间隔 60s · 支持重放 · 审计记录/);
  assert.match(app.byId.get("schedulerState").innerHTML, /死信队列/);
  assert.match(app.byId.get("schedulerState").innerHTML, /死信重放/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 遥测 sample-ready · 心跳 TTL 120s · 延迟警戒 300s · 严重 900s · 深度 25\/100 · 支持心跳 · 队列延迟/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 凭证 sample-bypass · 样例放行 · 校验 sample-bypass · 签名未强制 · 时间窗 300s · Header x-worker-secret · 签名 Header x-worker-signature · Nonce 未强制 · Nonce Header x-worker-nonce · Nonce 保留 500 · Nonce 有效 86400s · Nonce 自动清理/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Nonce 清理 sample-ready · 支持清理 · 支持手动触发 · 保留 86400s · 上限 500 · 审计记录/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 心跳/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 凭证/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列延迟监控/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列模型 sample-ready · 支持入队 · 重试 exponential · 最多 3 次 · 失败转死信 · 要求幂等/);
  assert.match(app.byId.get("schedulerState").innerHTML, /任务入队/);
  assert.match(app.byId.get("schedulerState").innerHTML, /重试计划/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列告警/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列处理/);
  assert.match(app.byId.get("schedulerState").innerHTML, /任务运行器桥接/);
  assert.match(app.byId.get("schedulerState").innerHTML, /调度 provider 适配器 blocked · inactive · 未选择 provider/);
  assert.match(app.byId.get("schedulerState").innerHTML, /enqueueJob:planned \/ recordWorkerHeartbeat:planned/);
  assert.match(app.byId.get("schedulerState").innerHTML, /newsIngestion:planned:every-5-minutes \/ reminderEvaluation:sample-ready:every-15-minutes/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列策略 planned · 幂等 key · 重试 exponential · 最多 3 次 · 死信队列 · 心跳 60s/);
  assert.match(app.byId.get("schedulerState").innerHTML, /运行安全 planned · cron 签名 · 并发限制 · 延迟记录 · 阻止重叠 · 审计链/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列背压 blocked · 深度 1000 · 延迟 300s · 暂停低优先级 · 告警路由/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 回调认证 blocked · HMAC · 时间窗 300s · Nonce · 密钥轮换 · 禁止审计 workerSecret \/ cronSigningSecret/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Runbook blocked · 手册 3 · 重放需审批 · 可回退手动检查/);
  assert.match(app.byId.get("schedulerState").innerHTML, /调度门禁 blocked · workers 不可启用/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 预检 blocked · dry-run-no-worker-start · 不启动 worker · 需人工审批/);
  assert.match(app.byId.get("schedulerState").innerHTML, /事故演练包 defined · dry-run-no-worker-incident-cutover · 演练 8 · 材料 4 · 不启用 worker · 需人工审批/);
  assert.match(app.byId.get("schedulerState").innerHTML, /providerConfig:blocked \/ queuePolicy:pass \/ deadLetterQueue:blocked/);
  assert.match(app.byId.get("schedulerState").innerHTML, /FINANCE_AI_SCHEDULER_PROVIDER/);
  assert.match(app.byId.get("schedulerState").innerHTML, /不启动外部 worker · 保留手动回退 · 要求 cron 签名/);
  assert.match(app.byId.get("schedulerState").innerHTML, /不代表真实 cron/);
  assert.match(app.byId.get("accountState").innerHTML, /Mock 认证服务/);
  assert.match(app.byId.get("accountState").innerHTML, /样例登录/);
  assert.match(app.byId.get("accountState").innerHTML, /认证 provider 适配器 blocked/);
  assert.match(app.byId.get("accountState").innerHTML, /signIn:planned \/ refreshSession:planned/);
  assert.match(app.byId.get("accountState").innerHTML, /密码策略 planned · 最少 12 位 · 泄露检查/);
  assert.match(app.byId.get("accountState").innerHTML, /凭证存储 blocked · dry-run-no-production-credential-storage · 不存生产凭证 · argon2id-or-managed-provider-equivalent/);
  assert.match(app.byId.get("accountState").innerHTML, /memoryHardHashing \/ pepperSecretManagement \/ breachedPasswordScreening \/ passwordHistory/);
  assert.match(app.byId.get("accountState").innerHTML, /禁止存储 plainPassword \/ passwordResetToken \/ mfaSecret \/ rawRecoveryCode · 轮换 pepperRotation \/ hashParameterUpgrade \/ providerIncident · 需密钥托管 · 需迁移计划/);
  assert.match(app.byId.get("accountState").innerHTML, /会话策略 planned · access 15min · refresh 30d · 令牌轮换 · 设备绑定/);
  assert.match(app.byId.get("accountState").innerHTML, /会话安全 blocked · dry-run-no-session-hardening · 不签发生产会话 · access 15min · refresh 30d/);
  assert.match(app.byId.get("accountState").innerHTML, /refreshTokenRotation \/ reuseDetection \/ deviceBinding \/ sessionRevocation/);
  assert.match(app.byId.get("accountState").innerHTML, /吊销触发 passwordChange \/ accountRecovery \/ suspiciousLogin \/ manualUserLogoutAllDevices · 需设备列表 · 需过期提示/);
  assert.match(app.byId.get("accountState").innerHTML, /CSRF 防护 blocked · dry-run-no-cross-site-mutation · 不接受跨站修改 · token 30min · 方法 POST \/ PUT \/ PATCH \/ DELETE/);
  assert.match(app.byId.get("accountState").innerHTML, /sameSiteStrictCookies \/ csrfTokenBinding \/ originRefererValidation \/ stateChangingMethodGuard \/ doubleSubmitOrSynchronizerToken \/ csrfAuditTrail/);
  assert.match(app.byId.get("accountState").innerHTML, /禁止 credentialedCrossSitePost \/ missingOriginHeader \/ untrustedReferer \/ csrfTokenInUrl \/ wildcardCorsWithCredentials · 需 CORS 白名单 · 需重放防护/);
  assert.match(app.byId.get("accountState").innerHTML, /MFA 门禁 blocked · dry-run-no-production-mfa · 不挑战生产用户 · 因子 totp \/ webauthn-passkey \/ recovery-code/);
  assert.match(app.byId.get("accountState").innerHTML, /mfaEnrollment \/ stepUpChallenge \/ backupCodeHashing \/ mfaRecoveryReview/);
  assert.match(app.byId.get("accountState").innerHTML, /Step-up newDevice \/ highRiskLogin \/ privilegedRoleAction \/ passwordChange · 禁止存储 totpSecretPlaintext \/ recoveryCodePlaintext \/ webauthnPrivateKey · 恢复需复核 · 需用户可见回退/);
  assert.match(app.byId.get("accountState").innerHTML, /邮箱验证 blocked · dry-run-no-production-email-verification · 不验证生产邮箱 · token 30min · 重发 60s\/5h/);
  assert.match(app.byId.get("accountState").innerHTML, /oneTimeVerificationToken \/ hashedVerificationToken \/ resendRateLimit \/ emailChangeReverification/);
  assert.match(app.byId.get("accountState").innerHTML, /禁止审计 verificationToken \/ rawEmailBody \/ smtpCredential · 需过期提示 · 改邮箱需复核/);
  assert.match(app.byId.get("accountState").innerHTML, /OIDC 回调 blocked · dry-run-no-oidc-callback · 不处理生产回调 · 有效 10min · scheme https/);
  assert.match(app.byId.get("accountState").innerHTML, /redirectUriAllowlist \/ stateNonceValidation \/ pkceVerification \/ callbackDomainAllowlist \/ sameSiteCookie \/ callbackAuditTrail/);
  assert.match(app.byId.get("accountState").innerHTML, /禁止输入 unvalidatedRedirectUri \/ plainClientSecret \/ rawAuthorizationCodeInLogs \/ unsignedState \/ thirdPartyReturnUrl · 需重放防护 · 需 issuer 校验/);
  assert.match(app.byId.get("accountState").innerHTML, /角色授权 blocked · dry-run-no-production-role-escalation · 不启用生产管理员角色 · 来源 verified-idp-claims · 最长 90 天/);
  assert.match(app.byId.get("accountState").innerHTML, /verifiedIdpRoleClaims \/ serverSideRoleMapping \/ adminApprovalWorkflow \/ roleExpiry \/ leastPrivilegeRoles \/ roleChangeAuditTrail/);
  assert.match(app.byId.get("accountState").innerHTML, /特权角色 admin \/ complianceReviewer \/ supportOperator · 禁止来源 clientLocalStorage \/ requestBodyRole \/ demoLoginSelfEscalation \/ unsignedJwtClaim \/ staleCachedRole/);
  assert.match(app.byId.get("accountState").innerHTML, /登录风控 blocked · 失败 5\/15min · 动作 stepUpMfa \/ sessionRevocation/);
  assert.match(app.byId.get("accountState").innerHTML, /账号恢复 blocked · reset 30min · MFA 重置需人工复核 · 重置后吊销旧会话/);
  assert.match(app.byId.get("accountState").innerHTML, /认证审计 blocked · dry-run-no-auth-audit-release · 不发布生产认证事件 · 留存 365d/);
  assert.match(app.byId.get("accountState").innerHTML, /redactedMetadata \/ tamperEvidentHashChain \/ retentionClass \/ requestCorrelationId \/ privilegedActionReview \/ auditExportHandoff/);
  assert.match(app.byId.get("accountState").innerHTML, /事件 auth\.signIn \/ auth\.signOut \/ auth\.sessionRefresh \/ auth\.passwordReset \/ auth\.mfaChallenge \/ auth\.roleChange \/ auth\.oidcCallback · 禁止审计 plainPassword \/ passwordHash \/ accessToken \/ refreshToken \/ mfaSecret \/ rawAuthorizationCode \/ rawDeviceFingerprint · 需哈希链校验 · 导出需审批/);
  assert.match(app.byId.get("accountState").innerHTML, /隐私同意 blocked · dry-run-no-privacy-release · 不发布生产隐私文案/);
  assert.match(app.byId.get("accountState").innerHTML, /explicitConsentVersion \/ privacyNoticeVersion \/ dataSubjectRequestPath \/ consentWithdrawalPath/);
  assert.match(app.byId.get("accountState").innerHTML, /禁止 silentConsentUpgrade \/ unclearAccountDeletionPath \/ hiddenBrokerCredentialCollection \/ privacyNoticeOnlyInEnglish · 需用户可见告知 · 生产前需法务复核/);
  assert.match(app.byId.get("accountState").innerHTML, /安全门禁 blocked · production 不可启用/);
  assert.match(app.byId.get("accountState").innerHTML, /认证预检 blocked · dry-run-no-provider-call · 不执行生产认证 · 需人工审批/);
  assert.match(app.byId.get("accountState").innerHTML, /providerConfig:blocked \/ passwordPolicy:pass \/ credentialStorage:blocked \/ sessionPolicy:pass \/ sessionSecurity:blocked \/ csrfProtection:blocked \/ mfaReadiness:blocked \/ mfaPolicy:blocked \/ emailVerificationPolicy:blocked \/ oidcCallback:blocked \/ roleAuthorization:blocked \/ loginRiskControls:blocked \/ accountRecovery:blocked \/ auditLogging:blocked/);
  assert.match(app.byId.get("accountState").innerHTML, /FINANCE_AI_AUTH_PROVIDER/);
  assert.match(app.byId.get("accountState").innerHTML, /不联网 · 只存密码哈希 · 要求 MFA 策略 · 不可启用生产认证/);
  assert.match(app.byId.get("accountState").innerHTML, /不代表真实账号安全方案/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /Mock 通知投递服务/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /outbox-only/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /网页内 \/ 邮件 \/ 微信/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /投递箱排队/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /通知 provider 适配器 blocked · inactive · 未选择 provider/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /sendNotification:planned \/ retryDelivery:planned/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /网页内提醒:local-ready \/ 微信提醒:planned/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /投递策略 planned · 幂等 key · 重试 exponential · 最多 3 次 · 60\/min · webhook 验签/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /授权策略 planned · 用户授权 · 渠道退订 · 授权版本 · 禁止静默外投/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /回执策略 blocked · webhook 验签 · 24h 幂等 · 事件 6 · 禁止审计 messageBody \/ emailAddress/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /退订抑制 blocked · 退订渠道 · 硬反弹 · 隐私删除用户 · 渠道级 opt-out/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /反弹处理 blocked · hard suppress-channel-and-audit · soft retry-with-backoff · 投诉需人工复核/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /Webhook 回执预检 blocked · dry-run-no-webhook-accept · 不接收 provider webhook · 时间窗 300s · 重放窗口 24h · event id 幂等/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /webhookSecret:blocked \/ endpointRegistration:blocked \/ signatureTimestampWindow:blocked/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /投递门禁 blocked · external 不可启用/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /投递预检 blocked · dry-run-no-external-send · 不执行外部投递 · 需人工审批/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /通知可观测证据 defined · dry-run-no-observability-cutover · 信号 8 · 看板 4 · 不启用外部投递 · 需人工审批/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /providerConfig:blocked \/ permissionConsent:blocked \/ deliveryPolicy:pass/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /FINANCE_AI_NOTIFICATION_PROVIDER/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /不联网 · 保留 mock outbox · 要求用户授权 · 要求退订抑制 · 回执脱敏 · 重放防护 · 回执幂等 · 反弹处理 · 禁止静默外投/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /不代表真实外部推送已送达/);
  assert.match(app.byId.get("newsList").innerHTML, /暂未发现高重要性新闻/);
  assert.doesNotMatch(app.byId.get("newsList").innerHTML, /后端联动新闻样例|贵州茅台渠道情报样例|贵州茅台发布年度分红公告|管理层强调渠道库存保持稳定/);
  assert.match(app.byId.get("statusMessage").textContent, /后端 API 连接成功/);
});

test("connected data source renders cached provider details", () => {
  const app = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiProviderStatus: JSON.stringify({
      id: "mock",
      name: "Mock Sample Provider",
      mode: "sample",
      status: "connected",
      coverage: ["a", "us"],
      capabilities: [
        "stockSearch",
        "analysisInputs",
        "reminderEvaluation",
        "integrationPlan",
        "providerRegistry",
        "vendorReadinessChecklist",
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
      ],
      integrationPlan: {
        id: "real-data-source-integration-plan",
        status: "blocked",
        mode: "planning",
        targetMarkets: ["a", "hk", "us"],
        configuredRequiredCount: 1,
        requiredSourceCount: 3,
        configuredOptionalCount: 0,
        plannedSources: [
          {
            id: "marketData",
            label: "实时/延迟行情",
            required: true,
            configured: true,
            markets: ["a", "hk", "us"],
            capabilities: ["quotes", "priceHistory"],
            envVars: [
              { name: "FINANCE_AI_MARKET_DATA_PROVIDER", configured: true },
              { name: "FINANCE_AI_MARKET_DATA_API_KEY", configured: true, secret: true },
            ],
          },
          {
            id: "marketNews",
            label: "财经新闻与公告",
            required: true,
            configured: false,
            markets: ["a", "hk", "us"],
            capabilities: ["marketNews", "companyFilings"],
            envVars: [
              { name: "FINANCE_AI_NEWS_PROVIDER", configured: false },
              { name: "FINANCE_AI_NEWS_API_KEY", configured: false, secret: true },
            ],
          },
        ],
        complianceChecks: [
          { id: "licenseReview", label: "数据授权审查", status: "blocked" },
          { id: "sourceAttribution", label: "来源署名", status: "blocked" },
        ],
        dryRunPreflightPlan: {
          id: "real-data-source-integration-dry-run-preflight",
          status: "defined",
          mode: "dry-run-no-provider-fetch",
          requiredManualApproval: true,
          canCallProviderNetwork: false,
          canEnableLiveRuntime: false,
        },
        blockedReasons: ["尚未确认数据源授权、展示许可、缓存许可和再分发边界。"],
        nextSteps: ["选择并确认 A 股、港股、美股行情和新闻 provider 的授权条款。"],
        disclaimer: "当前为真实数据源接入计划，不代表实时行情已经接入。",
      },
      providerRegistry: {
        id: "real-data-provider-registry",
        status: "blocked",
        activeRuntimeProvider: "mock",
        readyRequiredCount: 1,
        requiredProviderCount: 3,
        candidateProviders: [
          {
            id: "licensed-market-data",
            groupId: "marketData",
            label: "授权行情 Provider",
            mode: "delayed-or-live",
            adapterModule: "backend/providers/market-data-provider.mjs",
          },
          {
            id: "licensed-news-filings",
            groupId: "marketNews",
            label: "授权新闻/公告 Provider",
            mode: "delayed-or-live",
            adapterModule: "backend/providers/news-filings-provider.mjs",
          },
        ],
        selectedProviders: [
          {
            groupId: "marketData",
            label: "实时/延迟行情",
            required: true,
            selectedProvider: "licensed-market-data",
            providerEnv: "FINANCE_AI_MARKET_DATA_PROVIDER",
            credentialEnv: "FINANCE_AI_MARKET_DATA_API_KEY",
            configured: true,
            supported: true,
            status: "ready-for-adapter",
            candidateIds: ["licensed-market-data"],
            missingEnvVars: [],
          },
          {
            groupId: "marketNews",
            label: "财经新闻与公告",
            required: true,
            selectedProvider: "",
            providerEnv: "FINANCE_AI_NEWS_PROVIDER",
            credentialEnv: "FINANCE_AI_NEWS_API_KEY",
            configured: false,
            supported: true,
            status: "missing-config",
            candidateIds: ["licensed-news-filings"],
            missingEnvVars: ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"],
          },
        ],
        rolloutPreflightPlan: {
          id: "real-data-provider-registry-rollout-preflight",
          status: "defined",
          mode: "dry-run-no-provider-runtime",
          activeRuntimeProvider: "mock",
          requiredProviderGroups: ["marketData", "marketNews", "macroData"],
          canEnableLiveRuntime: false,
        },
        blockedReasons: ["财经新闻与公告 未完成可用 provider 配置。"],
        nextSteps: ["为每个必选数据分组选择一个已注册 provider id。"],
        disclaimer: "Provider 注册表只描述真实数据源选择和配置状态。",
      },
      vendorReadinessChecklist: {
        id: "real-data-vendor-readiness-checklist",
        status: "blocked",
        mode: "planning",
        preferredContactOrder: ["marketData", "marketNews", "macroData", "publicStatements"],
        targetMarkets: ["a", "hk", "us"],
        groups: [
          {
            id: "marketData",
            label: "行情数据",
            candidateProviderIds: ["licensed-market-data"],
            requiredCapabilities: ["quotes", "priceHistory", "tradingCalendar", "delayLabel"],
            requiredLicensing: ["exchangeDisplayRights", "cachePermission", "redistributionBoundary"],
            costDrivers: ["symbols", "requestVolume", "realTimeVsDelayed"],
            preferredSequence: 1,
          },
          {
            id: "marketNews",
            label: "新闻与公告",
            candidateProviderIds: ["licensed-news-filings"],
            requiredCapabilities: ["marketNews", "companyFilings", "sourceAttribution"],
            requiredLicensing: ["headlineSummaryRights", "shortExcerptRights"],
            costDrivers: ["markets", "articleVolume"],
            preferredSequence: 2,
          },
        ],
        checklistItems: [
          { id: "mvpMarketCoverage", label: "MVP 市场覆盖", status: "pass", evidence: "A/HK/US" },
          { id: "candidateShortlist", label: "候选供应商分组", status: "pass", evidence: "provider ids" },
          { id: "marketDataFirstSequence", label: "接入顺序", status: "pass", evidence: "market first" },
          { id: "marketDataProviderConfigured", label: "行情 provider 配置", status: "pass", evidence: "configured" },
          { id: "licenseReview", label: "授权审查", status: "blocked", evidence: "未确认" },
          { id: "sourceAttribution", label: "来源署名", status: "blocked", evidence: "未确认" },
        ],
        passedCount: 4,
        totalCount: 8,
        blockedCount: 2,
        pendingCount: 2,
        nextActions: ["先联系行情 provider。", "第二步联系新闻/公告 provider。"],
        disclaimer: "该清单用于供应商筛选和授权准备，不代表任何 provider 已签约、已付款、已接入或可用于生产投资服务。",
      },
      providerSetupGuide: {
        id: "real-provider-setup-guide",
        status: "ready-for-user-configuration",
        mode: "no-secret-provider-setup-guide",
        activeRuntimeProvider: "mock",
        setupGroups: [
          {
            id: "marketData",
            label: "行情 Provider",
            status: "missing-config",
            selectedProvider: "",
            requiredEnvVars: [
              "FINANCE_AI_MARKET_DATA_PROVIDER",
              "FINANCE_AI_MARKET_DATA_API_KEY",
              "FINANCE_AI_MARKET_DATA_ALLOW_NETWORK",
            ],
            missingEnvVars: ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"],
            smokeEndpoint: "GET /api/market-data/quote?market=us&code=IBM",
            forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
          },
          {
            id: "marketNews",
            label: "新闻情绪 Provider",
            status: "missing-config",
            selectedProvider: "",
            requiredEnvVars: [
              "FINANCE_AI_NEWS_PROVIDER",
              "FINANCE_AI_NEWS_API_KEY",
              "FINANCE_AI_NEWS_ALLOW_NETWORK",
            ],
            missingEnvVars: ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"],
            smokeEndpoint: "GET /api/news/intelligence?market=us&symbol=AAPL&minImportance=70",
            forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
          },
          {
            id: "macroData",
            label: "宏观数据 Provider",
            status: "missing-config",
            selectedProvider: "",
            requiredEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
            missingEnvVars: ["FINANCE_AI_MACRO_PROVIDER", "FINANCE_AI_MACRO_API_KEY"],
            smokeEndpoint: "GET /api/data-sources/macro-data-adapter",
            forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
          },
          {
            id: "publicStatements",
            label: "公开言论 Provider",
            status: "missing-config",
            selectedProvider: "",
            requiredEnvVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
            missingEnvVars: ["FINANCE_AI_STATEMENT_PROVIDER", "FINANCE_AI_STATEMENT_API_KEY"],
            smokeEndpoint: "GET /api/data-sources/news-filings-adapter",
            forbiddenFields: ["apiKey", "providerSecret", "providerResponseRaw"],
          },
        ],
        smokeOrder: ["marketDataQuote", "newsSentiment", "macroContext", "publicStatements"],
        checklistItems: [
          { id: "setupGuideDefined", label: "真实 Provider 配置向导", status: "pass" },
          { id: "requiredEnvVarsMapped", label: "环境变量映射", status: "pass" },
          { id: "secretRedactionRulesDefined", label: "密钥脱敏规则", status: "pass" },
          { id: "smokeOrderDefined", label: "Smoke 测试顺序", status: "pass" },
          { id: "realKeysSupplied", label: "真实 Key 已填写", status: "blocked" },
        ],
        passedCount: 4,
        totalCount: 5,
        readyForSmokeCount: 0,
        forbiddenAuditFields: ["apiKey", "providerSecret", "providerResponseRaw", "rawArticleBody", "rawProviderUrl"],
        canReadProviderSecrets: false,
        canWriteEnvFile: false,
        canEnableLiveRuntime: false,
        nextActions: ["优先填写 Alpha Vantage 行情和新闻情绪 demo/真实 key，完成 quote/news smoke。"],
        disclaimer: "该配置向导只说明真实 provider 接入步骤和安全边界；不会读取、保存、显示真实密钥，也不会自动启用 live runtime。",
      },
      marketDataVendorChecklist: {
        id: "market-data-vendor-acceptance-checklist",
        status: "pending-approval",
        mode: "planning",
        targetMarkets: ["a", "hk", "us"],
        providerCandidateId: "licensed-market-data",
        acceptanceAreas: [
          { id: "quoteContract", label: "报价接口", requiredFields: ["symbol", "lastPrice", "currency", "asOf"], status: "defined" },
          { id: "historyContract", label: "历史走势", requiredFields: ["period", "open", "high", "close"], status: "defined" },
          { id: "tradingCalendar", label: "交易日历", requiredFields: ["market", "sessionDate", "isOpen", "timezone"], status: "defined" },
          { id: "delayLabel", label: "延迟标签", requiredFields: ["realTimeOrDelayed", "delayMinutes", "displayNearPrice", "displayNearChart"], status: "defined" },
        ],
        checklistItems: [
          { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "licensed-market-data" },
          { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "quotes/history/calendar/delay" },
          { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
          { id: "providerCredentials", label: "provider 凭证", status: "pass", evidence: "configured" },
          { id: "exchangeDisplayRights", label: "交易所展示授权", status: "blocked", evidence: "未确认" },
          { id: "delayLabelDisplay", label: "延迟标签展示", status: "pending", evidence: "待审批" },
        ],
        passedCount: 4,
        totalCount: 9,
        blockedCount: 1,
        pendingCount: 4,
        requiredQuestions: ["A 股、港股、美股分别支持实时还是延迟报价？", "价格和图表必须展示哪些授权标签？"],
        nextActions: ["优先拿到 A/HK/US 报价和历史走势的展示授权样例条款。", "把 provider 回答映射到 adapter policy。"],
        disclaimer: "该行情验收清单仅用于供应商沟通和接入前评审，不代表真实行情 provider 已签约、已付款、已接入或可用于投资服务。",
      },
      newsFilingsVendorChecklist: {
        id: "news-filings-vendor-acceptance-checklist",
        status: "blocked",
        mode: "planning",
        targetMarkets: ["a", "hk", "us"],
        providerCandidateId: "licensed-news-filings",
        acceptanceAreas: [
          { id: "headlineSummary", label: "标题摘要", requiredFields: ["title", "summary", "source.label", "publishedAt"], status: "defined" },
          { id: "shortExcerpt", label: "短摘录", requiredFields: ["excerpt", "maxExcerptChars", "language", "sourceUrl"], status: "defined" },
          { id: "sourceLink", label: "原文链接", requiredFields: ["sourceUrl", "canonicalUrl", "publisher", "retrievedAt"], status: "defined" },
          { id: "retentionPolicy", label: "保留天数", requiredFields: ["retentionDays", "deleteAfter", "archiveAllowed", "auditEvent"], status: "defined" },
          { id: "paywallBoundary", label: "付费墙边界", requiredFields: ["paywallStatus", "ingestionAllowed", "excerptAllowed", "linkOnlyFallback"], status: "defined" },
        ],
        checklistItems: [
          { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "licensed-news-filings" },
          { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "headline/excerpt/link/retention/paywall" },
          { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
          { id: "providerCredentials", label: "provider 凭证", status: "blocked", evidence: "missing" },
          { id: "headlineRights", label: "标题摘要授权", status: "blocked", evidence: "未确认" },
          { id: "retentionDays", label: "保留天数", status: "pending", evidence: "待审批" },
        ],
        passedCount: 3,
        totalCount: 9,
        blockedCount: 4,
        pendingCount: 2,
        requiredQuestions: ["标题、摘要、短摘录分别允许展示多少字符？", "付费墙或受限内容是否只能展示标题和来源链接？"],
        nextActions: ["优先确认标题摘要、短摘录、原文链接和保留天数授权。", "把 provider 回答映射到 news-filings-provider adapter。"],
        disclaimer: "该新闻/公告验收清单仅用于供应商沟通和接入前评审，不代表真实新闻、公告或公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
      },
      macroDataVendorChecklist: {
        id: "macro-data-vendor-acceptance-checklist",
        status: "blocked",
        mode: "planning",
        targetMarkets: ["a", "hk", "us"],
        providerCandidateId: "official-macro-data",
        acceptanceAreas: [
          { id: "rateIndicators", label: "利率指标", requiredFields: ["indicatorId", "value", "unit", "asOf"], status: "defined" },
          { id: "fxIndicators", label: "汇率指标", requiredFields: ["pair", "value", "asOf", "timezone"], status: "defined" },
          { id: "inflationIndicators", label: "通胀指标", requiredFields: ["indicatorId", "period", "value", "revisionId"], status: "defined" },
          { id: "policyEvents", label: "政策事件", requiredFields: ["eventId", "title", "jurisdiction", "timezone"], status: "defined" },
          { id: "revisionPolicy", label: "修订规则", requiredFields: ["revisionId", "previousValue", "revisedValue", "sourceUrl"], status: "defined" },
        ],
        checklistItems: [
          { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "official-macro-data" },
          { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "rates/fx/inflation/policy/revision" },
          { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
          { id: "asOfLabels", label: "asOf 标签", status: "blocked", evidence: "未确认" },
        ],
        passedCount: 3,
        totalCount: 10,
        blockedCount: 3,
        pendingCount: 4,
        requiredQuestions: ["每个指标的 asOf、publishedAt、revisionId 字段是否稳定？", "政策日历的时区和延期规则是什么？"],
        nextActions: ["优先确认利率、汇率、通胀和政策日历的官方来源条款。", "映射到 macro-data-provider adapter。"],
        disclaimer: "该宏观数据验收清单仅用于供应商沟通和接入前评审，不代表真实宏观 provider 已签约、已付款、已接入或可用于投资服务。",
      },
      publicStatementsVendorChecklist: {
        id: "public-statements-vendor-acceptance-checklist",
        status: "blocked",
        mode: "planning",
        targetMarkets: ["a", "hk", "us"],
        providerCandidateId: "verified-public-statements",
        acceptanceAreas: [
          { id: "verifiedIdentity", label: "身份验证", requiredFields: ["speakerId", "speakerName", "speakerRole", "verificationStatus"], status: "defined" },
          { id: "sourceUrl", label: "原始链接", requiredFields: ["sourceUrl", "platform", "postedAt", "retrievedAt"], status: "defined" },
          { id: "speakerRole", label: "发言人角色", requiredFields: ["roleType", "organization", "jurisdiction", "isMarketSensitive"], status: "defined" },
          { id: "platformTerms", label: "平台条款", requiredFields: ["platform", "termsStatus", "redistributionAllowed", "retentionDays"], status: "defined" },
          { id: "shortExcerptBoundary", label: "短摘录边界", requiredFields: ["excerpt", "maxExcerptChars", "language", "sourceUrl"], status: "defined" },
          { id: "manualReviewQueue", label: "人工复核队列", requiredFields: ["reviewStatus", "reviewReason", "priority", "slaHours"], status: "defined" },
        ],
        checklistItems: [
          { id: "providerCandidateKnown", label: "候选 provider 已知", status: "pass", evidence: "verified-public-statements" },
          { id: "acceptanceScopeDefined", label: "验收范围已定义", status: "pass", evidence: "identity/source/role/terms/excerpt/review" },
          { id: "requiredFieldsDefined", label: "必需字段已定义", status: "pass", evidence: "fields" },
          { id: "identityVerification", label: "身份验证规则", status: "blocked", evidence: "未确认" },
        ],
        passedCount: 3,
        totalCount: 10,
        blockedCount: 4,
        pendingCount: 3,
        requiredQuestions: ["CEO、公司账号、政府高层和监管账号分别使用哪些身份验证信号？", "未验证账号和疑似高影响言论如何进入人工复核队列？"],
        nextActions: ["优先确认已验证发言人身份、来源链接和平台条款边界。", "映射到 source-verification/manual-review policy。"],
        disclaimer: "该公开言论验收清单仅用于供应商沟通和接入前评审，不代表真实公开言论 provider 已签约、已付款、已接入或可用于投资服务。",
      },
      marketDataAdapter: {
        id: "market-data-provider-adapter",
        name: "Market Data Provider Adapter Skeleton",
        status: "ready-for-implementation",
        runtimeMode: "inactive",
        requestedMode: "live",
        selectedProvider: "licensed-market-data",
        configured: true,
        supported: true,
        canFetchQuotes: false,
        canReadFixtures: true,
        fixtureReadModel: {
          status: "available",
          quoteCount: 3,
          markets: ["a", "hk", "us"],
          source: "local-fixture-market-data",
        },
        supportedProviderIds: ["licensed-market-data", "twelve-data", "alpha-vantage", "multi-free"],
        missingEnvVars: [],
        endpointContracts: [
          { id: "quote", method: "getQuote", status: "planned", fixtureStatus: "available" },
          { id: "history", method: "getPriceHistory", status: "planned", fixtureStatus: "available" },
          {
            id: "tradingCalendar",
            method: "getTradingCalendar",
            status: "planned",
            fixtureStatus: "available",
          },
        ],
        cachePolicy: {
          id: "market-data-cache-policy",
          status: "ready-for-adapter",
          quoteTtlSeconds: 15,
          historyTtlSeconds: 300,
          rawRedistribution: "license-reviewed",
        },
        rateLimitPolicy: {
          id: "market-data-rate-limit-policy",
          status: "ready-for-adapter",
          maxRequestsPerMinute: 120,
          burstLimit: 30,
          fallback: "keep-last-fixture-or-local-sample",
        },
        attributionPolicy: {
          id: "market-data-attribution-policy",
          status: "ready-for-adapter",
          requiredFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
          displayRequired: true,
        },
        entitlementPolicy: {
          id: "market-data-entitlement-policy",
          status: "ready",
          tiers: ["sample", "delayed", "live"],
          requiresUserEntitlement: true,
          requiresExchangeAgreement: true,
          blocksRedistributionWithoutLicense: true,
          forbiddenAuditFields: ["rawTick", "fullOrderBook", "providerApiKey"],
        },
        delayLabelPolicy: {
          id: "market-data-delay-label-policy",
          status: "ready",
          requiredLabels: ["sample-not-real-time", "delayed", "live"],
          displayNearPrice: true,
          displayNearChart: true,
          blocksLiveLabelWithoutEntitlement: true,
          defaultDelayMinutes: 0,
        },
        requestPolicyGate: {
          id: "market-data-request-policy-gate",
          status: "blocked",
          requestKind: "status-preview",
          requestedMode: "live",
          runtimeMode: "inactive",
          selectedProvider: "licensed-market-data",
          canUseProvider: false,
          canUseFixture: true,
          fallback: "fixture-or-local-sample",
          requiredAttributionFields: ["source.label", "source.licenseTag", "asOf", "dataDelay"],
          missingAttributionFields: [],
          checks: [
            { id: "adapterStatus", status: "pass", message: "行情适配器配置已通过。" },
            { id: "runtimeMode", status: "blocked", message: "真实 provider runtime 仍为 inactive。" },
            { id: "cachePolicy", status: "pass", message: "缓存策略已通过。" },
            { id: "rateLimitPolicy", status: "pass", message: "限流策略已通过。" },
            { id: "attributionPolicy", status: "pass", message: "署名字段完整。" },
            { id: "entitlementPolicy", status: "pass", message: "行情授权分层已通过。" },
            { id: "delayLabelPolicy", status: "pass", message: "延迟标签规则已通过。" },
          ],
          blockedReasons: ["真实 provider runtime 仍为 inactive，不能发起供应商请求。"],
        },
        requestExecutionPlan: {
          id: "market-data-request-execution-plan",
          status: "fallback-only",
          mode: "status-preview",
          requestKind: "status-preview",
          cache: {
            key: "licensed-market-data:any-market:any-code:spot:snapshot",
            ttlSeconds: 15,
            maxStaleSeconds: 30,
            outcome: "fixture-fallback",
            lookup: "planned-before-provider-request",
            write: "fixture-response-only",
          },
          rateLimit: {
            applies: false,
            maxRequestsPerMinute: 120,
            burstLimit: 30,
            tokenCost: 0,
            outcome: "not-applied-for-fixture",
          },
          fallback: {
            selected: "fixture-or-local-sample",
            reason: "真实 provider runtime 仍为 inactive，不能发起供应商请求。",
            localSampleAllowed: true,
          },
          auditDraft: {
            eventType: "marketData.request.policyGate",
            metadata: {
              gateStatus: "blocked",
              cacheKey: "licensed-market-data:any-market:any-code:spot:snapshot",
              fallback: "fixture-or-local-sample",
            },
          },
        },
        providerPreflightPlan: {
          id: "market-data-provider-preflight-plan",
          status: "blocked",
          mode: "dry-run-no-provider-request",
          canRequestProvider: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        alphaVantageConnector: {
          id: "alpha-vantage-quote-connector",
          status: "defined",
          providerId: "alpha-vantage",
          functionName: "GLOBAL_QUOTE",
          officialEndpoint: "https://www.alphavantage.co/query",
          supportedMarkets: ["a", "hk", "us"],
          requiresApiKey: true,
          requiresExplicitNetworkFlag: true,
          networkEnabled: false,
          canRequestProvider: false,
          forbiddenAuditFields: ["apiKey", "rawProviderUrl", "providerResponseRaw"],
        },
        alphaVantageSmokeTestPlan: {
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
          canUseProductionKey: false,
          blocksIfMissingAttribution: true,
        },
        alphaVantageCredentialPreflight: {
          id: "alpha-vantage-quote-credential-preflight",
          status: "blocked",
          mode: "no-secret-credential-preflight",
          apiKeyStatus: "missing",
          networkStatus: "disabled",
          missingRequiredEnvVars: ["FINANCE_AI_MARKET_DATA_PROVIDER", "FINANCE_AI_MARKET_DATA_API_KEY"],
          canRunDemoSmoke: false,
          canValidateProductionKey: false,
        },
        safety: {
          noVendorNetworkCalls: true,
          noTradingActions: true,
          requiresAttribution: true,
          requiresLicenseReview: true,
          mockFallbackActive: false,
          emptyOnModelFailure: true,
        },
        blockedReasons: [],
        nextSteps: ["实现 getQuote、getPriceHistory、getTradingCalendar。"],
        disclaimer: "当前为行情 provider adapter 骨架，不会请求真实行情。",
      },
      macroDataAdapter: {
        id: "macro-data-provider-adapter",
        name: "Macro Data Provider Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "official-macro-data",
        configured: true,
        supported: true,
        canFetchLiveMacro: false,
        canReadFixtures: true,
        processing: {
          macroFactorLinking: "six-factor-macro-input-v1",
          indicatorNormalization: "fixture-indicator-score-v1",
          policyEventScoring: "importance-score-fixture-v1",
        },
        freshnessPolicy: {
          status: "ready",
          requiredAsOfFields: ["source.asOf", "indicator.asOf", "policyEvent.publishedAt"],
          maxIndicatorAgeDays: 7,
          maxPolicyEventAgeDays: 30,
          displayNearMacroScore: true,
          blocksStaleOfficialLabels: true,
        },
        policyCalendarVerification: {
          status: "ready",
          requiredEventFields: [
            "title",
            "publishedAt",
            "source.label",
            "source.licenseTag",
            "importanceScore",
          ],
          verifiesOfficialCalendar: true,
          requiresTimezoneNormalization: true,
          blocksUnverifiedPolicyEvents: true,
          forbiddenAuditFields: ["rawPolicyDocument", "providerApiKey"],
        },
        providerPreflightPlan: {
          status: "blocked",
          mode: "dry-run-no-provider-fetch",
          canFetchProviderMacro: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        fixtureReadModel: {
          status: "available",
          contextCount: 3,
          indicatorCount: 10,
          policyEventCount: 3,
          markets: ["a", "hk", "us"],
          source: "local-fixture-macro-data",
        },
        missingEnvVars: [],
        endpointContracts: [
          { id: "macroContext", method: "getMacroContext", status: "planned", fixtureStatus: "available" },
          { id: "macroIndicators", method: "listMacroIndicators", status: "planned", fixtureStatus: "available" },
          { id: "policyCalendar", method: "listPolicyEvents", status: "planned", fixtureStatus: "available" },
        ],
        safety: {
          noVendorNetworkCalls: true,
          noTradingActions: true,
          requiresAttribution: true,
          requiresLicenseReview: true,
          mockFallbackActive: false,
          emptyOnModelFailure: true,
        },
        blockedReasons: ["尚未确认宏观经济数据授权、缓存和展示边界。"],
        disclaimer: "当前为宏观经济 provider adapter 骨架，不会请求真实宏观数据。",
      },
      newsFilingsAdapter: {
        id: "news-filings-provider-adapter",
        name: "News, Filings, and Public Statements Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedNewsProvider: "licensed-news-filings",
        selectedStatementProvider: "verified-public-statements",
        configured: true,
        statementConfigured: true,
        supported: true,
        canFetchLiveNews: false,
        canReadFixtures: true,
        processing: {
          deduplication: "normalized-title-related-tickers",
          sourceCredibility: "fixture-source-classification",
          importanceScoring: "explainable-weighted-score-v1",
          persistence: "mock-repository-on-demand",
        },
        sourceVerificationPolicy: {
          status: "ready",
          requiredSignals: [
            "sourceUrl",
            "publisherIdentity",
            "publishedAt",
            "speakerRole",
            "verifiedOfficialChannel",
          ],
          blocksUnverifiedPublicStatements: true,
          requiresManualReviewForSocialStatements: true,
          forbiddenAuditFields: ["rawSocialPost", "sessionCookie", "privateMessage"],
        },
        publicStatementVerificationPolicy: {
          status: "ready",
          requiredSignals: [
            "speakerId",
            "speakerName",
            "speakerRole",
            "verificationStatus",
            "sourceUrl",
            "postedAt",
            "platformTermsStatus",
          ],
          blocksUnverifiedHighImpactStatements: true,
          requiresOfficialChannelOrManualReview: true,
          verifiedSpeakerTypes: ["companyExecutive", "companyAccount", "governmentOfficial", "regulator"],
          forbiddenAuditFields: ["sessionCookie", "privateMessage", "rawPlatformAuth"],
        },
        publicStatementManualReviewPolicy: {
          status: "ready",
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
        },
        redistributionPolicy: {
          status: "ready",
          allowedContentModes: ["headline-summary", "short-excerpt", "source-link"],
          blocksFullTextStorage: true,
          blocksPaywalledContentIngestion: true,
          requiresLicenseTag: true,
          retentionDefaultDays: 30,
        },
        providerPreflightPlan: {
          status: "blocked",
          mode: "dry-run-no-provider-fetch",
          canFetchProviderContent: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        alphaVantageNewsConnector: {
          id: "alpha-vantage-news-sentiment-connector",
          status: "defined",
          providerId: "alpha-vantage-news",
          functionName: "NEWS_SENTIMENT",
          supportedMarkets: ["us"],
          plannedMarkets: ["a", "hk"],
          networkEnabled: false,
          canRequestProvider: false,
          requestLimit: 10,
        },
        alphaVantageNewsSmokeTestPlan: {
          id: "alpha-vantage-news-demo-smoke-test-plan",
          status: "defined",
          mode: "real-provider-demo-news-smoke",
          demoTicker: "AAPL",
          expectedFields: ["feed", "title", "url", "time_published", "overall_sentiment_score"],
          canUseDemoEndpoint: true,
          canUseProductionKey: false,
        },
        alphaVantageNewsCredentialPreflight: {
          id: "alpha-vantage-news-credential-preflight",
          status: "blocked",
          mode: "no-secret-credential-preflight",
          apiKeyStatus: "missing",
          networkStatus: "disabled",
          missingRequiredEnvVars: ["FINANCE_AI_NEWS_PROVIDER", "FINANCE_AI_NEWS_API_KEY"],
          canRunDemoSmoke: false,
          canValidateProductionKey: false,
        },
        secFilingsConnector: {
          id: "sec-company-submissions-connector",
          status: "defined",
          providerId: "sec-company-submissions",
          supportedMarkets: ["us"],
          plannedMarkets: ["a", "hk"],
          networkEnabled: false,
          userAgentStatus: "missing",
          canRequestProvider: false,
          requestLimit: 20,
          supportedTickers: ["AAPL", "MSFT", "NVDA"],
        },
        secFilingsSmokeTestPlan: {
          id: "sec-company-submissions-smoke-test-plan",
          status: "defined",
          mode: "real-provider-public-filings-smoke",
          demoTicker: "AAPL",
          demoCik: "0000320193",
          expectedFields: [
            "filings.recent.form",
            "filings.recent.filingDate",
            "filings.recent.accessionNumber",
            "filings.recent.primaryDocument",
          ],
          canUsePublicEndpoint: true,
          canRequestProvider: false,
        },
        secFilingsAccessPreflight: {
          id: "sec-company-submissions-access-preflight",
          status: "blocked",
          mode: "no-secret-public-filings-preflight",
          networkStatus: "disabled",
          userAgentStatus: "missing",
          noApiKeyRequired: true,
          missingRequiredEnvVars: [
            "FINANCE_AI_FILINGS_PROVIDER",
            "FINANCE_AI_FILINGS_ALLOW_NETWORK",
            "FINANCE_AI_SEC_USER_AGENT",
          ],
          canRunPublicSmoke: false,
        },
        fixtureReadModel: {
          status: "available",
          newsCount: 4,
          filingCount: 3,
          publicStatementCount: 3,
          markets: ["a", "hk", "us"],
          source: "local-fixture-news-filings-statements",
        },
        missingEnvVars: [],
        endpointContracts: [
          {
            id: "importantNews",
            method: "listImportantNews",
            status: "planned",
            fixtureStatus: "available",
          },
          {
            id: "companyFilings",
            method: "listCompanyFilings",
            status: "planned",
            fixtureStatus: "available",
          },
          {
            id: "publicStatements",
            method: "listPublicStatements",
            status: "planned",
            fixtureStatus: "available",
          },
        ],
        safety: {
          noVendorNetworkCalls: true,
          noTradingActions: true,
          requiresAttribution: true,
          requiresLicenseReview: true,
          mockFallbackActive: false,
          emptyOnModelFailure: true,
        },
        blockedReasons: ["尚未配置新闻/公告 provider 限流、缓存和降级策略。"],
        disclaimer: "当前为新闻/公告/公开言论 provider adapter 骨架。",
      },
      disclaimer: "样例数据不代表真实行情。",
    }),
    apiMarketDataRuntimeStatus: JSON.stringify({
      id: "mock-market-data-runtime",
      name: "Mock 行情请求运行时",
      mode: "sample-observability",
      status: "ready",
      executionMode: "no-vendor-network",
      cacheStore: "memory-sample",
      cachePolicy: {
        freshnessModel: "fresh-stale-expired",
        maxRecords: 200,
        staleFallback: "serve-stale-then-refresh-sample",
      },
      cacheRecordCount: 4,
      rateLimitWindowCount: 2,
      rateLimitWindowSeconds: 60,
      circuitBreakerPolicy: {
        failureThreshold: 5,
        coolDownSeconds: 60,
        halfOpenProbe: "next-success-closes-sample-breaker",
      },
      cacheRecords: [
        {
          key: "licensed-market-data:any-market:any-code:spot:snapshot",
          kind: "quote",
          cachedAt: "2026-06-01T00:00:00.000Z",
          freshUntil: "2026-06-01T00:00:15.000Z",
          maxStaleUntil: "2026-06-01T00:00:45.000Z",
          state: "stale",
        },
      ],
      rateLimitWindows: [
        {
          key: "licensed-market-data:quote",
          count: 2,
          limit: 120,
          remaining: 118,
          windowEndsAt: "2026-06-01T00:01:00.000Z",
        },
      ],
      circuitBreakers: [
        {
          key: "licensed-market-data:quote",
          state: "half-open",
          consecutiveFailures: 5,
          coolDownUntil: "2026-06-01T00:01:00.000Z",
          reason: "timeout",
        },
      ],
      recentExecutions: [
        {
          executedAt: "2026-06-01T00:00:20.000Z",
          requestKind: "quote",
          cacheKey: "licensed-market-data:any-market:any-code:spot:snapshot",
          cacheState: "stale",
          cacheHit: true,
          refreshed: true,
          rateLimitKey: "licensed-market-data:quote",
          rateLimitCount: 2,
          fallback: "fixture-or-local-sample",
          circuitState: "half-open",
        },
      ],
      capabilities: [
        "cacheLookupTelemetry",
        "cacheFreshnessTelemetry",
        "rateLimitTelemetry",
        "rateLimitWindowTelemetry",
        "circuitBreakerTelemetry",
        "fallbackTelemetry",
        "auditEventDraftExecution",
      ],
      safety: { noVendorNetworkCalls: true, noTradingActions: true, fixtureOnly: true },
      disclaimer: "当前运行时只记录样例请求轨迹，不会请求真实行情 provider。",
    }),
    apiNewsIngestionRuntimeStatus: JSON.stringify({
      id: "mock-news-ingestion-runtime",
      name: "Mock 新闻采集运行时",
      mode: "sample-observability",
      status: "ready",
      executionMode: "no-vendor-network",
      sourceTypes: ["news", "filing", "publicStatement"],
      cooldownWindowSeconds: 300,
      dedupeRecordCount: 3,
      sourceCooldowns: [
        {
          key: "news:a:600519",
          runCount: 2,
          cooldownUntil: "2026-06-01T00:05:00.000Z",
          status: "cooldown-active",
        },
      ],
      recentRuns: [
        {
          sourceKey: "publicStatement:a:600519",
          sourceType: "publicStatement",
          acceptedCount: 1,
          duplicateCount: 1,
          attributionMissingCount: 0,
          blockedCount: 0,
          cooldownStatus: "cooldown-started",
        },
      ],
      capabilities: [
        "sourcePollingTelemetry",
        "deduplicationTelemetry",
        "attributionGateTelemetry",
        "licenseBoundaryTelemetry",
        "publicStatementSafetyTelemetry",
      ],
      safety: {
        noVendorNetworkCalls: true,
        noSocialScraping: true,
        noTradingActions: true,
        fixtureOnly: true,
        attributionRequired: true,
      },
      disclaimer: "当前新闻采集运行时只观察样例新闻，不抓取真实网站或社交媒体。",
    }),
    apiAiServiceStatus: JSON.stringify({
      id: "mock-ai-analysis",
      name: "Mock AI 分析服务",
      mode: "sample",
      status: "ready",
      model: "rule-based-sample-v0",
      capabilities: ["riskProfileAdjustment", "factorBreakdown"],
      providerAdapter: {
        id: "ai-provider-adapter",
        name: "AI Provider Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "hosted-llm-provider",
        selectedModel: "finance-analysis-model",
        configured: true,
        supported: true,
        canCallLiveModel: false,
        promptContract: {
          version: "analysis-prompt-v1",
          outputMode: "structured-json",
          probabilityLanguage: "模型参考概率",
          requiresNoGuaranteeDisclaimer: true,
        },
        responseSchema: {
          status: "draft",
          requiredFields: ["upsideProbability", "factorBreakdown", "tradePlan", "scenarioAnalysis"],
          forbiddenFields: ["guaranteedReturn", "mustBuy", "mustSell", "riskFree"],
        },
        complianceGate: {
          status: "blocked",
          canCallLiveModel: false,
          checks: [
            { id: "providerConfig", status: "pass" },
            { id: "auditReadiness", status: "blocked" },
            { id: "factorInputs", status: "blocked" },
            { id: "factorWeights", status: "blocked" },
            { id: "secretManagement", status: "blocked" },
            { id: "promptInjectionDefense", status: "blocked" },
            { id: "dataMinimization", status: "blocked" },
            { id: "citationEvidence", status: "blocked" },
          ],
          blockedReasons: ["模型请求审计、脱敏和留存规则尚未确认。"],
        },
        secretManagementPolicy: {
          status: "blocked",
          mode: "dry-run-no-model-secret-use",
          canUseProductionSecrets: false,
          secretManager: "unconfigured",
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
        },
        promptInjectionDefensePolicy: {
          status: "blocked",
          mode: "dry-run-no-unsanitized-source-text",
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
        },
        dataMinimizationPolicy: {
          status: "blocked",
          mode: "dry-run-no-personal-data-to-model",
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
        },
        factorInputPolicy: {
          status: "blocked",
          requiredFactors: [
            "macro",
            "industry",
            "fundamentals",
            "valuation",
            "technical",
            "sentiment",
          ],
          minReadyFactors: 6,
          requiresCoverageLabels: true,
          requiresStalenessLabels: true,
          requiresUncertaintyWhenMissing: true,
        },
        factorWeightPolicy: {
          status: "blocked",
          version: "six-factor-weight-v1",
          requiresVersionedWeights: true,
          requiresManualApprovalForWeightChange: true,
        },
        citationEvidencePolicy: {
          status: "blocked",
          mode: "dry-run-no-uncited-model-output",
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
          forbiddenEvidenceFields: [
            "rawArticleText",
            "rawSocialPost",
            "paywalledFullText",
            "personalData",
          ],
          requiresClaimCitationMap: true,
          requiresStalenessWarning: true,
        },
        endpointContracts: [
          { id: "analysisCompletion", method: "generateStructuredAnalysis", status: "planned" },
        ],
        missingEnvVars: [],
        safety: {
          noVendorNetworkCalls: true,
          noTradingActions: true,
          forbidsGuaranteedReturns: true,
        },
        blockedReasons: ["模型请求审计、脱敏和留存规则尚未确认。"],
        disclaimer: "当前为 AI provider adapter 骨架，不会请求真实模型。",
      },
      disclaimer: "样例 AI 服务，不代表真实建议。",
    }),
    apiComplianceServiceStatus: JSON.stringify({
      id: "mock-compliance-service",
      name: "Mock 合规策略服务",
      mode: "sample",
      status: "planning",
      reviewMode: "policy-gate",
      requiredDisclaimer: "本内容由模型基于公开信息和市场数据生成，仅供学习和研究参考，不构成任何投资建议。",
      prohibitedClaims: ["保证收益", "稳赚", "无风险"],
      outputPolicy: {
        probabilityLanguage: "模型参考概率",
        forbidsGuaranteedReturns: true,
        forbidsMustBuySell: true,
        requiresSourceSeparation: true,
        requiresNearbyDisclaimer: true,
      },
      acknowledgementPolicy: {
        version: "compliance-ack-v0",
        requiresRiskAcknowledgement: true,
        requiresOptionalPortfolioNotice: true,
        recordsDisclosureVersion: true,
        blocksPublicReleaseWithoutReview: true,
      },
      complianceGate: {
        status: "blocked",
        canReleasePublicAnalysis: false,
        checks: [
          { id: "disclaimerPresence", status: "pass" },
          { id: "legalReview", status: "blocked" },
          { id: "jurisdictionPolicy", status: "blocked" },
        ],
        blockedReasons: ["法律/合规复核尚未完成。"],
      },
      capabilities: ["requiredDisclaimer", "probabilityLabeling", "productionGapReport"],
      missingProductionCapabilities: ["jurisdictionPolicy", "licensedAdviserReview"],
      disclaimer: "样例合规策略服务，不代表生产合规审查完成。",
    }),
    apiAuthServiceStatus: JSON.stringify({
      id: "mock-auth",
      name: "Mock 认证服务",
      mode: "sample",
      status: "ready",
      sessionMode: "bearer-token-sample-email-password",
      supportedMethods: ["demoToken", "emailPassword"],
      providerAdapter: {
        id: "auth-provider-adapter",
        name: "Auth Provider Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "managed-auth-provider",
        configured: true,
        supported: true,
        canUseProductionAuth: false,
        passwordPolicy: {
          status: "planned",
          minLength: 12,
          breachCheckRequired: true,
        },
        credentialStoragePolicy: {
          status: "blocked",
          mode: "dry-run-no-production-credential-storage",
          canStoreProductionCredentials: false,
          passwordHashAlgorithm: "argon2id-or-managed-provider-equivalent",
          requiredControls: [
            "memoryHardHashing",
            "pepperSecretManagement",
            "breachedPasswordScreening",
            "passwordHistory",
            "resetTokenHashing",
            "credentialAuditRedaction",
          ],
          forbiddenStoredFields: [
            "plainPassword",
            "passwordResetToken",
            "mfaSecret",
            "rawRecoveryCode",
          ],
          rotationTriggers: ["pepperRotation", "hashParameterUpgrade", "providerIncident"],
          requiresManagedSecretStore: true,
          requiresMigrationPlan: true,
        },
        sessionPolicy: {
          status: "planned",
          accessTokenMinutes: 15,
          refreshTokenDays: 30,
          rotationRequired: true,
          deviceBindingRequired: true,
        },
        sessionSecurityPolicy: {
          status: "blocked",
          mode: "dry-run-no-session-hardening",
          canIssueProductionSessions: false,
          accessTokenMinutes: 15,
          refreshTokenDays: 30,
          requiredControls: [
            "refreshTokenRotation",
            "reuseDetection",
            "deviceBinding",
            "sessionRevocation",
            "idleTimeout",
            "sessionAuditTrail",
          ],
          revocationTriggers: [
            "passwordChange",
            "accountRecovery",
            "suspiciousLogin",
            "manualUserLogoutAllDevices",
          ],
          forbiddenAuditFields: ["accessToken", "refreshToken"],
          requiresUserVisibleDeviceList: true,
          requiresSessionExpiryNotice: true,
        },
        csrfProtectionPolicy: {
          status: "blocked",
          mode: "dry-run-no-cross-site-mutation",
          canAcceptCrossSiteMutations: false,
          protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
          requiredControls: [
            "sameSiteStrictCookies",
            "csrfTokenBinding",
            "originRefererValidation",
            "stateChangingMethodGuard",
            "doubleSubmitOrSynchronizerToken",
            "csrfAuditTrail",
          ],
          forbiddenRequestPatterns: [
            "credentialedCrossSitePost",
            "missingOriginHeader",
            "untrustedReferer",
            "csrfTokenInUrl",
            "wildcardCorsWithCredentials",
          ],
          tokenTtlMinutes: 30,
          requiresCorsAllowlist: true,
          requiresReplayProtection: true,
        },
        mfaPolicy: {
          status: "blocked",
          mode: "dry-run-no-production-mfa",
          canChallengeProductionUsers: false,
          supportedFactors: ["totp", "webauthn-passkey", "recovery-code"],
          requiredControls: [
            "mfaEnrollment",
            "stepUpChallenge",
            "backupCodeHashing",
            "mfaRecoveryReview",
            "trustedDeviceExpiry",
            "mfaAuditTrail",
          ],
          stepUpTriggers: [
            "newDevice",
            "highRiskLogin",
            "privilegedRoleAction",
            "passwordChange",
          ],
          forbiddenStoredFields: [
            "totpSecretPlaintext",
            "recoveryCodePlaintext",
            "webauthnPrivateKey",
          ],
          recoveryReviewRequired: true,
          userVisibleFallbackRequired: true,
        },
        emailVerificationPolicy: {
          status: "blocked",
          mode: "dry-run-no-production-email-verification",
          canVerifyProductionEmail: false,
          verificationTokenMinutes: 30,
          resendCooldownSeconds: 60,
          maxResendsPerHour: 5,
          requiredControls: [
            "oneTimeVerificationToken",
            "hashedVerificationToken",
            "resendRateLimit",
            "emailChangeReverification",
            "verificationAuditTrail",
            "bounceAwareSuppression",
          ],
          forbiddenAuditFields: ["verificationToken", "rawEmailBody", "smtpCredential"],
          requiresUserVisibleExpiry: true,
          requiresEmailChangeReview: true,
        },
        oidcCallbackPolicy: {
          status: "blocked",
          mode: "dry-run-no-oidc-callback",
          canHandleProductionCallback: false,
          requiredControls: [
            "redirectUriAllowlist",
            "stateNonceValidation",
            "pkceVerification",
            "callbackDomainAllowlist",
            "sameSiteCookie",
            "callbackAuditTrail",
          ],
          forbiddenCallbackInputs: [
            "unvalidatedRedirectUri",
            "plainClientSecret",
            "rawAuthorizationCodeInLogs",
            "unsignedState",
            "thirdPartyReturnUrl",
          ],
          allowedCallbackSchemes: ["https"],
          maxCallbackAgeMinutes: 10,
          requiresReplayProtection: true,
          requiresProviderIssuerValidation: true,
        },
        roleAuthorizationPolicy: {
          status: "blocked",
          mode: "dry-run-no-production-role-escalation",
          canUseProductionAdminRoles: false,
          roleSource: "verified-idp-claims",
          privilegedRoles: ["admin", "complianceReviewer", "supportOperator"],
          requiredControls: [
            "verifiedIdpRoleClaims",
            "serverSideRoleMapping",
            "adminApprovalWorkflow",
            "roleExpiry",
            "leastPrivilegeRoles",
            "roleChangeAuditTrail",
          ],
          forbiddenRoleSources: [
            "clientLocalStorage",
            "requestBodyRole",
            "demoLoginSelfEscalation",
            "unsignedJwtClaim",
            "staleCachedRole",
          ],
          privilegedActionTriggers: [
            "assignRole",
            "revokeRole",
            "viewAuditExport",
            "replayDeadLetterJob",
            "downloadUserData",
          ],
          maxPrivilegedRoleDays: 90,
          requiresDualApprovalForAdmin: true,
          requiresRoleReviewRunbook: true,
        },
        loginRiskPolicy: {
          status: "blocked",
          maxFailedAttemptsPerWindow: 5,
          lockoutWindowMinutes: 15,
          requiredActions: ["stepUpMfa", "sessionRevocation"],
          forbiddenAuditFields: ["password", "refreshToken"],
        },
        accountRecoveryPolicy: {
          status: "blocked",
          resetTokenMinutes: 30,
          mfaResetRequiresManualReview: true,
          revokeExistingSessionsOnReset: true,
          forbiddenFlows: ["securityQuestionOnly", "silentMfaDisable"],
        },
        auditLoggingPolicy: {
          status: "blocked",
          mode: "dry-run-no-auth-audit-release",
          canReleaseProductionAuthEvents: false,
          requiredEventTypes: [
            "auth.signIn",
            "auth.signOut",
            "auth.sessionRefresh",
            "auth.passwordReset",
            "auth.mfaChallenge",
            "auth.roleChange",
            "auth.oidcCallback",
          ],
          requiredControls: [
            "redactedMetadata",
            "tamperEvidentHashChain",
            "retentionClass",
            "requestCorrelationId",
            "privilegedActionReview",
            "auditExportHandoff",
          ],
          forbiddenAuditFields: [
            "plainPassword",
            "passwordHash",
            "accessToken",
            "refreshToken",
            "mfaSecret",
            "rawAuthorizationCode",
            "rawDeviceFingerprint",
          ],
          retentionDays: 365,
          requiresHashChainVerification: true,
          requiresPrivilegedExportApproval: true,
        },
        privacyConsentPolicy: {
          status: "blocked",
          mode: "dry-run-no-privacy-release",
          canReleaseProductionPrivacyText: false,
          requiredControls: [
            "explicitConsentVersion",
            "privacyNoticeVersion",
            "dataSubjectRequestPath",
            "consentWithdrawalPath",
            "regionalDisclosureMapping",
            "auditRetentionDisclosure",
          ],
          forbiddenBehaviors: [
            "silentConsentUpgrade",
            "unclearAccountDeletionPath",
            "hiddenBrokerCredentialCollection",
            "privacyNoticeOnlyInEnglish",
          ],
          consentRecordFields: ["userId", "consentVersion", "acceptedAt", "locale", "source"],
          requiresUserVisibleNotice: true,
          requiresLegalReviewBeforeProduction: true,
        },
        securityGate: {
          status: "blocked",
          canUseProductionAuth: false,
          checks: [
            { id: "providerConfig", status: "pass" },
            { id: "credentialStorage", status: "blocked" },
            { id: "sessionSecurity", status: "blocked" },
            { id: "csrfProtection", status: "blocked" },
            { id: "mfaReadiness", status: "blocked" },
            { id: "mfaPolicy", status: "blocked" },
            { id: "emailVerificationPolicy", status: "blocked" },
            { id: "oidcCallback", status: "blocked" },
            { id: "roleAuthorization", status: "blocked" },
            { id: "auditLogging", status: "blocked" },
            { id: "privacyReview", status: "blocked" },
            { id: "loginRiskControls", status: "blocked" },
            { id: "accountRecovery", status: "blocked" },
          ],
          blockedReasons: ["账号隐私与用户同意文案尚未复核。"],
        },
        productionAuthPreflightPlan: {
          status: "blocked",
          mode: "dry-run-no-provider-call",
          canExecuteProductionAuth: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        endpointContracts: [
          { id: "productionSignIn", method: "signIn", status: "planned" },
          { id: "sessionRevocation", method: "revokeSession", status: "planned" },
        ],
        missingEnvVars: [],
        safety: {
          noVendorNetworkCalls: true,
          storesPasswordHashesOnly: true,
          requiresMfaPolicy: true,
        },
        blockedReasons: ["账号隐私与用户同意文案尚未复核。"],
        disclaimer: "当前为生产认证 provider adapter 骨架，不会请求真实认证服务。",
      },
      disclaimer: "样例认证服务，不代表真实账号安全方案。",
    }),
    apiNotificationServiceStatus: JSON.stringify({
      id: "mock-notification-delivery",
      name: "Mock 通知投递服务",
      mode: "sample",
      status: "ready",
      deliveryMode: "outbox-only",
      supportedChannels: ["inApp", "telegram"],
      capabilities: ["outboxQueue", "multiChannelRules"],
      providerAdapter: {
        id: "notification-provider-adapter",
        name: "Notification Provider Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "managed-notification-provider",
        configured: true,
        supported: true,
        canUseExternalDelivery: false,
        deliveryPolicy: {
          status: "planned",
          requiresIdempotencyKey: true,
          retryBackoff: "exponential",
          maxAttempts: 3,
          rateLimitPerMinute: 60,
          providerWebhookVerification: true,
        },
        consentPolicy: {
          status: "planned",
          requiresUserOptIn: true,
          supportsChannelOptOut: true,
          recordsConsentVersion: true,
          blocksSilentExternalDelivery: true,
        },
        receiptPolicy: {
          status: "blocked",
          requiredEvents: ["queued", "sent", "delivered", "failed", "bounced", "unsubscribed"],
          webhookSignatureRequired: true,
          idempotencyWindowHours: 24,
          forbiddenAuditFields: ["messageBody", "emailAddress"],
        },
        suppressionPolicy: {
          status: "blocked",
          suppressesUnsubscribedChannels: true,
          suppressesHardBounces: true,
          suppressesPrivacyErasedUsers: true,
          requiresChannelScopedOptOut: true,
        },
        bounceHandlingPolicy: {
          status: "blocked",
          hardBounceAction: "suppress-channel-and-audit",
          softBounceAction: "retry-with-backoff",
          manualReviewRequiredForComplaint: true,
        },
        webhookReceiptVerificationPlan: {
          status: "blocked",
          mode: "dry-run-no-webhook-accept",
          canAcceptProviderWebhook: false,
          timestampToleranceSeconds: 300,
          replayWindowHours: 24,
          requiresProviderEventId: true,
          checks: [
            { id: "webhookSecret", status: "pass" },
            { id: "endpointRegistration", status: "blocked" },
            { id: "signatureTimestampWindow", status: "blocked" },
            { id: "providerEventIdempotency", status: "blocked" },
            { id: "receiptAuditRedaction", status: "blocked" },
          ],
          forbiddenAuditFields: ["rawSignature", "rawPayload"],
        },
        deliveryGate: {
          status: "blocked",
          canUseExternalDelivery: false,
          checks: [
            { id: "providerConfig", status: "pass" },
            { id: "permissionConsent", status: "blocked" },
            { id: "privacyReview", status: "blocked" },
            { id: "deliveryReceipts", status: "blocked" },
            { id: "suppressionList", status: "blocked" },
            { id: "bounceHandling", status: "blocked" },
          ],
          blockedReasons: ["通知隐私与用户同意文案尚未复核。"],
        },
        externalDeliveryPreflightPlan: {
          status: "blocked",
          mode: "dry-run-no-external-send",
          canExecuteExternalDelivery: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        observabilityEvidencePackage: {
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
        },
        endpointContracts: [
          { id: "sendExternalNotification", method: "sendNotification", status: "planned" },
          { id: "deliveryWebhook", method: "webhookDeliveryStatus", status: "planned" },
        ],
        channelContracts: [
          { id: "inApp", label: "网页内提醒", status: "local-ready" },
          { id: "telegram", label: "Telegram 提醒", status: "planned" },
        ],
        missingEnvVars: [],
        safety: {
          noVendorNetworkCalls: true,
          mockOutboxActive: true,
          requiresUserConsent: true,
          supportsChannelOptOut: true,
          requiresWebhookReplayProtection: true,
          requiresReceiptIdempotency: true,
        },
        blockedReasons: ["通知隐私与用户同意文案尚未复核。"],
        disclaimer: "当前为生产通知 provider adapter 骨架，不会请求真实推送服务。",
      },
      disclaimer: "样例通知服务，不代表真实外部推送。",
    }),
    apiRepositoryStatus: JSON.stringify({
      id: "mock-user-state-repository",
      name: "Mock 用户数据仓储",
      mode: "sample",
      status: "ready",
      persistenceMode: "json-file",
      capabilities: ["watchlist", "portfolio", "auditLog"],
      limits: { auditLogs: 500 },
      disclaimer: "当前为样例 JSON 文件持久化桥，不具备生产数据库能力。",
    }),
    apiDatabaseStatus: JSON.stringify({
      id: "mock-database-service",
      name: "Mock 数据库服务",
      mode: "sample",
      status: "planning",
      activeStorage: "json-file-bridge",
      repositoryId: "mock-user-state-repository",
      migrationPhase: "pre-production",
      plannedTables: ["users", "auth_sessions", "reminder_rules", "notification_outbox", "job_runs"],
      capabilities: [
        "schemaPlan",
        "repositoryContract",
        "migrationChecks",
        "tableMappings",
        "productionAdapter",
        "adapterHealth",
        "migrationPlan",
        "migrationDryRun",
        "migrationSqlDraft",
        "migrationPackage",
        "readOnlyConnectionHealth",
        "repositoryAdapterPlan",
        "repositoryRuntimeGuard",
        "productionRepositoryAdapter",
        "productionRepositorySmokeTest",
        "productionRepositorySqlContract",
        "productionRepositoryExecutionPlan",
        "productionRepositoryParameterValidationPlan",
        "productionRepositoryConnectionPoolPlan",
        "productionRepositorySqlExecutorPlan",
        "productionRepositoryResultAuditPlan",
        "productionRepositoryReadRehearsalPlan",
        "productionRepositoryParityPlan",
        "productionRepositoryParityEvidencePlan",
        "productionRepositoryDualWritePlan",
        "productionRepositoryShadowWriteEvidencePlan",
        "productionRepositoryBackupRestoreEvidencePlan",
        "productionRepositoryCutoverMonitoringEvidencePlan",
        "productionRepositoryRollbackRehearsalEvidencePlan",
        "productionRepositoryCutoverAuditTrailEvidencePlan",
        "productionRepositoryCutoverPlan",
        "jsonBridge",
        "productionGapReport",
      ],
      repositoryContract: {
        version: "2026-06-01.repository.v1",
        status: "pass",
        missingMethods: [],
        tableMappings: [
          { domain: "reminders", table: "reminder_rules" },
          { domain: "notificationOutbox", table: "notification_outbox" },
          { domain: "jobRuns", table: "job_runs" },
        ],
      },
      migrationChecks: [
        { id: "repositoryInterface", status: "pass" },
        { id: "notificationDeliveryState", status: "pass" },
      ],
      productionAdapter: {
        id: "production-database-adapter",
        name: "Production Database Adapter Skeleton",
        status: "configured",
        provider: "postgres",
        sslMode: "required",
        fallback: {
          active: true,
          reason: "真实数据库驱动尚未接入，当前仍回退到 mock repository。",
        },
        migrationPlan: {
          steps: [
            { id: "configureConnection", status: "pass" },
            { id: "runSchemaMigrations", status: "pending" },
            { id: "verifyRepositoryContract", status: "pass" },
          ],
        },
        migrationDryRun: {
          id: "production-db-migration-dry-run",
          mode: "dry-run",
          status: "ready-for-driver",
          provider: "postgres",
          tableOrder: ["users", "reminder_rules", "notification_outbox", "job_runs"],
          tablePlan: [
            { order: 1, table: "users", dependsOn: [], domains: ["authUsers"], status: "planned" },
            {
              order: 2,
              table: "reminder_rules",
              dependsOn: ["users"],
              domains: ["reminders"],
              status: "planned",
            },
            {
              order: 3,
              table: "notification_outbox",
              dependsOn: ["users", "reminder_rules"],
              domains: ["notificationOutbox"],
              status: "planned",
            },
            { order: 4, table: "job_runs", dependsOn: [], domains: ["jobRuns"], status: "planned" },
          ],
          steps: [
            { id: "validateConnectionConfig", status: "pass" },
            { id: "validateRepositoryContract", status: "pass" },
            { id: "resolveTableOrder", status: "pass" },
            { id: "previewSchemaMigrations", status: "ready" },
          ],
          blockedReasons: [],
          warnings: ["真实上线前仍需接入数据库驱动、迁移工具、备份恢复和回滚演练。"],
          rollbackPlan: ["如 smoke test 失败，保持生产适配器 inactive 并继续使用当前 repository。"],
          migrationSqlDraft: {
            id: "production-db-sql-draft-001",
            dialect: "postgresql",
            status: "generated",
            destructive: false,
            reviewRequired: true,
            statementCount: 9,
            checksum: "fnv1a-test002",
            preview: [
              "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
              "CREATE TABLE IF NOT EXISTS users (",
            ],
            warnings: ["SQL 草案仅供代码审查和迁移工具接入，不会自动执行。"],
          },
        },
      },
      migrationSqlDraft: {
        id: "production-db-sql-draft-001",
        dialect: "postgresql",
        status: "generated",
        destructive: false,
        reviewRequired: true,
        statementCount: 9,
        checksum: "fnv1a-test002",
        preview: [
          "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
          "CREATE TABLE IF NOT EXISTS users (",
        ],
        warnings: ["SQL 草案仅供代码审查和迁移工具接入，不会自动执行。"],
      },
      migrationPackage: {
        id: "production-db-migration-package-001",
        version: "2026.06.01.001_initial_schema",
        generatedAt: "2026-06-01T00:00:00+10:00",
        status: "blocked",
        canExecute: false,
        executionMode: "review-only",
        targetDialect: "postgresql",
        manifestChecksum: "fnv1a-package002",
        manifest: {
          sqlDraftChecksum: "fnv1a-test002",
          tableCount: 4,
          statementCount: 9,
          destructive: false,
          reviewRequired: true,
        },
        preflightChecks: [
          { id: "connectionConfig", status: "pass", message: "生产数据库连接配置已提供" },
          { id: "repositoryContract", status: "pass", message: "仓储接口契约已通过" },
          { id: "liveConnection", status: "blocked", message: "当前骨架未加载真实数据库驱动" },
          { id: "humanApproval", status: "pending", message: "需要人工审查" },
        ],
        blockedReasons: ["当前骨架未加载真实数据库驱动，不能验证生产连接或执行迁移。"],
        pendingApprovals: ["humanApproval"],
        releaseGates: ["真实数据库连接已验证", "迁移工具已接入并记录版本", "SQL 草案已人工审查批准"],
        disclaimer: "迁移包当前仅用于审查和上线前检查；canExecute=false。",
      },
      readOnlyConnectionHealth: {
        id: "production-db-readonly-health",
        mode: "read-only-health",
        status: "ready-for-readonly-probe",
        provider: "postgres",
        driver: { package: "pg", available: true },
        connection: { configured: true, status: "configured-unverified" },
        safety: { readOnlyOnly: true, canWrite: false, canMigrate: false },
        checks: [
          { id: "connectionConfig", status: "pass" },
          { id: "driverAvailability", status: "pass" },
          { id: "readOnlyGuard", status: "pass" },
          { id: "networkProbe", status: "ready" },
        ],
        blockedReasons: [],
        warnings: ["当前只读健康检查默认不发起真实网络连接，也不会执行 SQL。"],
        nextSteps: ["使用只读数据库账号或只读事务执行连接探测。"],
      },
      repositoryAdapterPlan: {
        id: "production-repository-adapter-plan",
        status: "implementation-required",
        targetAdapter: "postgres-repository-adapter",
        runtimeMode: "inactive",
        canSwitchAutomatically: false,
        mockFallbackRequired: true,
        methodPlan: { requiredCount: 34, missingCount: 0 },
        dataDomains: [
          { domain: "reminders", table: "reminder_rules", methods: ["listReminders"] },
          { domain: "notificationOutbox", table: "notification_outbox", methods: ["listNotifications"] },
        ],
        switchGates: [
          { id: "repositoryContract", status: "pass" },
          { id: "driverSetup", status: "pass" },
          { id: "humanApproval", status: "pending" },
        ],
        blockedReasons: [],
        pendingApprovals: ["humanApproval"],
        implementationSteps: ["实现 PostgreSQL repository adapter。"],
        rollbackPlan: ["切换后如果 smoke test 失败，立即回退。"],
        disclaimer: "仓储适配器计划只描述生产切换门禁；当前不会连接数据库。",
      },
      repositoryRuntimeGuard: {
        id: "repository-runtime-guard",
        status: "active",
        requestedMode: "json",
        effectiveMode: "json",
        currentMode: "json",
        allowedModes: ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
        canUseRequestedMode: true,
        canSwitchAutomatically: false,
        checks: [
          { id: "requestedModeSupported", status: "pass" },
          { id: "jsonPersistenceConfigured", status: "pass" },
          { id: "automaticSwitchDisabled", status: "pass" },
          { id: "mockFallback", status: "pass" },
        ],
        safety: {
          noAutomaticSwitch: true,
          mockFallbackRequired: true,
          requiresHumanApproval: true,
        },
        blockedReasons: [],
        nextSteps: ["若需要 PostgreSQL，先完成只读冒烟和切换审批。"],
        disclaimer: "仓储运行时保护器只选择安全回退路径；当前不会自动切换到 PostgreSQL。",
      },
      productionRepositoryAdapter: {
        id: "production-postgres-repository-adapter",
        name: "Production PostgreSQL Repository Adapter Skeleton",
        status: "ready-for-implementation",
        runtimeMode: "inactive",
        driver: { package: "pg", available: true },
        methodCoverage: { requiredCount: 34, plannedCount: 34, missingCount: 0 },
        tableCoverage: [
          { table: "reminder_rules", operationCount: 4, writeOperationCount: 2 },
          { table: "notification_outbox", operationCount: 5, writeOperationCount: 3 },
        ],
        operationContracts: [
          {
            method: "saveNotification",
            table: "notification_outbox",
            status: "planned",
            accessPattern: "insert-or-upsert",
            transactionRequired: true,
          },
        ],
        transactionPolicy: {
          defaultIsolation: "read committed",
          writeTransactionsRequired: true,
          auditWritesRequireHashChain: true,
        },
        safety: {
          noNetworkCalls: true,
          noRuntimeSwitch: true,
          noWrites: true,
        },
        blockedReasons: [],
        implementationSteps: ["通过 staging repository contract parity test。"],
        disclaimer: "这是生产 PostgreSQL 仓储适配器骨架；当前不会写库。",
      },
      productionRepositorySmokeTest: {
        id: "production-repository-readonly-smoke-plan",
        mode: "read-only-smoke-plan",
        status: "ready-for-readonly-smoke",
        runtimeMode: "inactive",
        canExecuteAutomatically: false,
        driver: { package: "pg", available: true },
        connection: { configured: true, provider: "postgres", sslMode: "required" },
        coverage: { readOnlyOperationCount: 14, criticalTableCount: 3, writeOperationCount: 9 },
        smokeQueries: [
          { id: "connectionPing", statement: "SELECT 1", safety: "read-only" },
          { id: "transactionReadOnly", statement: "SHOW transaction_read_only", safety: "read-only" },
          {
            id: "tableVisible:reminder_rules",
            statement: "SELECT COUNT(*) FROM reminder_rules LIMIT 1",
            safety: "read-only",
          },
        ],
        checks: [
          { id: "connectionConfig", status: "pass" },
          { id: "driverAvailability", status: "pass" },
          { id: "readOnlyProbeOptIn", status: "pass" },
          { id: "writeGuard", status: "planned" },
        ],
        criticalTables: ["reminder_rules", "notification_outbox", "audit_events"],
        blockedStatements: ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "TRUNCATE"],
        blockedReasons: [],
        nextSteps: ["抽样验证关键业务表对只读账号可见。"],
        disclaimer: "这是生产仓储只读冒烟测试计划；当前不会执行 SQL。",
      },
      productionRepositorySqlContract: {
        id: "production-repository-sql-contract",
        mode: "parameterized-sql-contract",
        status: "draft-ready",
        runtimeMode: "inactive",
        dialect: "postgresql",
        statementCount: 34,
        readStatementCount: 14,
        writeStatementCount: 20,
        tableWhitelist: ["reminder_rules", "notification_outbox", "audit_events"],
        statements: [
          {
            id: "list_reminders_1",
            method: "listReminders",
            domain: "reminders",
            table: "reminder_rules",
            accessMode: "read",
            accessPattern: "select-many",
            transactionRequired: false,
            auditRequired: false,
            parameterStyle: "postgres-positional",
            placeholderCount: 2,
            statement: "SELECT * FROM reminder_rules WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
            resultShape: "rows",
            status: "draft",
          },
          {
            id: "save_notification_2",
            method: "saveNotification",
            domain: "notificationOutbox",
            table: "notification_outbox",
            accessMode: "write",
            accessPattern: "insert-or-upsert",
            transactionRequired: true,
            auditRequired: true,
            parameterStyle: "postgres-positional",
            placeholderCount: 3,
            statement: "INSERT INTO notification_outbox (...) VALUES ($1, $2, $3::jsonb)",
            resultShape: "upserted-row",
            status: "draft",
          },
        ],
        checks: [
          { id: "repositoryContract", status: "pass" },
          { id: "tableWhitelist", status: "pass" },
          { id: "parameterizedStatements", status: "pass" },
          { id: "writeTransactions", status: "planned" },
        ],
        safety: {
          noSqlExecution: true,
          parameterizedValuesOnly: true,
          noRuntimeSwitch: true,
        },
        blockedReasons: [],
        nextSteps: ["使用 pg 参数数组执行，不允许把用户输入拼进 SQL 字符串。"],
        disclaimer: "这是生产 PostgreSQL 仓储 SQL 契约草案；当前不会执行 SQL。",
      },
      productionRepositoryExecutionPlan: {
        id: "production-repository-execution-plan",
        mode: "transaction-audit-execution-plan",
        status: "draft-ready",
        runtimeMode: "inactive",
        canExecuteSql: false,
        canOpenConnection: false,
        coverage: {
          validatorCount: 38,
          transactionWrappedWriteCount: 18,
          auditRequiredWriteCount: 18,
        },
        transactionWrapper: {
          isolationLevel: "read committed",
          begin: "BEGIN",
          commit: "COMMIT",
          rollback: "ROLLBACK",
        },
        auditWritePolicy: {
          eventTypePrefix: "repository.postgres",
          redactParameterValues: true,
          hashChainRequired: true,
        },
        parameterValidators: [
          { id: "list_reminders_1_userId", method: "listReminders", parameterName: "userId", type: "stable-id", required: true, status: "planned" },
          { id: "save_notification_2_payload", method: "saveNotification", parameterName: "payload", type: "json-object", required: true, status: "planned" },
        ],
        executionSteps: [
          { id: "validateParameters", status: "planned" },
          { id: "openConnectionFromPool", status: "blocked" },
          { id: "beginTransactionForWrites", status: "planned" },
          { id: "recordAuditForWrites", status: "planned" },
        ],
        safety: {
          noSqlExecution: true,
          validatesBeforeExecution: true,
          auditRequiredForWrites: true,
        },
        blockedReasons: [],
        nextSteps: ["实现连接池获取、事务 begin/commit/rollback 包装器。"],
        disclaimer: "这是生产 PostgreSQL 仓储执行计划；当前不会打开数据库连接。",
      },
      productionRepositoryParameterValidationPlan: {
        id: "production-repository-parameter-validation-plan",
        mode: "local-parameter-validation-plan",
        status: "draft-ready",
        runtimeMode: "inactive",
        canValidateLocally: true,
        canExecuteSql: false,
        validatorCount: 38,
        validatorTypes: ["stable-id", "json-object", "integer"],
        validators: [
          { id: "list_reminders_1_userId", method: "listReminders", parameterName: "userId", type: "stable-id", required: true, status: "planned" },
          { id: "save_notification_2_payload", method: "saveNotification", parameterName: "payload", type: "json-object", required: true, status: "planned" },
        ],
        sampleValidationResults: [
          { id: "validStableId", parameterName: "userId", validatorType: "stable-id", accepted: true, errorCode: "", redactedSample: "[stable-id]" },
          { id: "invalidStableId", parameterName: "userId", validatorType: "stable-id", accepted: false, errorCode: "UNSAFE_ID", redactedSample: "[stable-id]" },
          { id: "validJsonObject", parameterName: "payload", validatorType: "json-object", accepted: true, errorCode: "", redactedSample: "[json-object]" },
        ],
        checks: [
          { id: "repositoryExecutionPlan", status: "pass" },
          { id: "validatorCoverage", status: "pass" },
          { id: "redactionPolicy", status: "pass" },
          { id: "sqlExecutionBlocked", status: "pass" },
        ],
        safety: {
          localOnly: true,
          noDatabaseConnection: true,
          noSqlExecution: true,
          redactsSampleValues: true,
          validatesBeforeExecution: true,
        },
        blockedReasons: [],
        nextSteps: ["为每类校验器补齐边界值、空值和恶意输入测试。"],
        disclaimer: "这是生产 PostgreSQL 仓储参数校验计划；当前只做本地规则校验。",
      },
      productionRepositoryConnectionPoolPlan: {
        id: "production-repository-connection-pool-plan",
        mode: "connection-pool-transaction-wrapper-plan",
        status: "ready-for-implementation",
        runtimeMode: "inactive",
        canOpenConnection: false,
        canExecuteSql: false,
        driver: { package: "pg", available: true },
        connection: { configured: true, provider: "postgres", sslMode: "required", sslRequired: true },
        poolConfig: {
          min: 0,
          max: 5,
          idleTimeoutMs: 30000,
          connectionTimeoutMs: 5000,
          statementTimeoutMs: 10000,
          applicationName: "finance-ai-assistant-api",
        },
        transactionWrapper: {
          defaultIsolationLevel: "read committed",
          readOnlyTransactionsForReads: true,
          writeTransactionsRequired: true,
          releaseClient: "finally",
        },
        lifecycleSteps: [
          { id: "loadConnectionConfig", status: "pass" },
          { id: "validateParameters", status: "pass" },
          { id: "createPool", status: "planned" },
          { id: "acquireClient", status: "blocked" },
          { id: "releaseClient", status: "planned" },
        ],
        checks: [
          { id: "connectionConfig", status: "pass" },
          { id: "driverAvailability", status: "pass" },
          { id: "parameterValidation", status: "pass" },
          { id: "automaticConnectionDisabled", status: "pass" },
          { id: "sqlExecutionBlocked", status: "pass" },
        ],
        safety: {
          noDatabaseConnection: true,
          noSqlExecution: true,
          noRuntimeSwitch: true,
          releaseClientFinally: true,
        },
        blockedReasons: [],
        nextSteps: ["所有仓储方法必须先通过参数校验，再 acquire client。"],
        disclaimer: "这是生产 PostgreSQL 仓储连接池与事务包装计划；当前不会创建连接池。",
      },
      productionRepositorySqlExecutorPlan: {
        id: "production-repository-sql-executor-plan",
        mode: "parameter-binding-result-mapping-plan",
        status: "ready-for-implementation",
        runtimeMode: "inactive",
        canExecuteSql: false,
        canOpenConnection: false,
        statementCount: 34,
        writeStatementCount: 20,
        readStatementCount: 14,
        bindingCoverage: {
          parameterizedStatementCount: 34,
          boundParameterCount: 38,
          redactedBindingCount: 38,
        },
        executableStatements: [
          {
            id: "list_reminders_1",
            method: "listReminders",
            table: "reminder_rules",
            accessMode: "read",
            parameterBindingStyle: "pg-parameter-array",
            resultShape: "rows",
            status: "planned",
          },
          {
            id: "save_notification_2",
            method: "saveNotification",
            table: "notification_outbox",
            accessMode: "write",
            parameterBindingStyle: "pg-parameter-array",
            resultShape: "upserted-row",
            status: "planned",
          },
        ],
        executorLifecycle: [
          { id: "validateParameters", status: "pass" },
          { id: "bindParameterArray", status: "planned" },
          { id: "acquireClient", status: "planned" },
          { id: "executeClientQuery", status: "blocked" },
          { id: "writeAuditEnvelope", status: "planned" },
        ],
        auditEnvelope: {
          eventTypePrefix: "repository.postgres.execute",
          redactParameterValues: true,
          includeRowCountOnly: true,
        },
        checks: [
          { id: "sqlContract", status: "pass" },
          { id: "connectionPoolPlan", status: "pass" },
          { id: "parameterArrayBinding", status: "pass" },
          { id: "rawValueRedaction", status: "pass" },
        ],
        safety: {
          parameterArrayOnly: true,
          noStringInterpolationForValues: true,
          noSqlExecution: true,
          redactsParameterValues: true,
        },
        blockedReasons: [],
        nextSteps: ["查询结果按 resultShape 映射，审计只记录 statement id、参数名、访问模式和 row count。"],
        disclaimer: "这是生产 PostgreSQL 仓储 SQL 执行器绑定计划；当前不会执行 SQL。",
      },
      productionRepositoryResultAuditPlan: {
        id: "production-repository-result-audit-plan",
        mode: "result-mapping-audit-envelope-plan",
        status: "ready-for-implementation",
        runtimeMode: "inactive",
        canMapLiveRows: false,
        canWriteAudit: false,
        mappingCount: 34,
        resultShapes: ["rows", "upserted-row", "single-row-or-null"],
        mappings: [
          {
            id: "list_reminders_1_result_mapping",
            method: "listReminders",
            table: "reminder_rules",
            resultShape: "rows",
            mappingMode: "rows-array",
            emptyResultPolicy: "empty-array",
            rawRowsLogged: false,
            status: "planned",
          },
          {
            id: "save_notification_2_result_mapping",
            method: "saveNotification",
            table: "notification_outbox",
            resultShape: "upserted-row",
            mappingMode: "single-or-null",
            emptyResultPolicy: "null",
            rawRowsLogged: false,
            status: "planned",
          },
        ],
        auditEnvelope: {
          allowedFields: ["statementId", "method", "accessMode", "parameterNames", "rowCount"],
          forbiddenFields: ["rawParameterValues", "rawRows", "connectionString"],
        },
        auditValidationSamples: [
          { id: "safeSuccessEnvelope", accepted: true, blockedFields: [] },
          { id: "unsafeRawValueEnvelope", accepted: false, blockedFields: ["rawParameterValues"] },
          { id: "unsafeRawRowsEnvelope", accepted: false, blockedFields: ["rawRows"] },
        ],
        checks: [
          { id: "sqlExecutorPlan", status: "pass" },
          { id: "resultShapeCoverage", status: "pass" },
          { id: "jsonbParsing", status: "pass" },
          { id: "timestampNormalization", status: "pass" },
          { id: "auditRawValueBlock", status: "pass" },
        ],
        safety: {
          rawRowsNeverLogged: true,
          rawParameterValuesNeverLogged: true,
          rowCountOnlyInAudit: true,
        },
        blockedReasons: [],
        nextSteps: ["在 staging 中对照 mock/JSON 仓储验证结果映射一致性。"],
        disclaimer: "这是生产 PostgreSQL 仓储结果映射与审计 envelope 计划；当前不会写审计。",
      },
      productionRepositoryReadRehearsalPlan: {
        id: "production-repository-readonly-query-rehearsal-plan",
        mode: "staging-readonly-query-rehearsal-plan",
        status: "ready-for-staging-rehearsal",
        runtimeMode: "inactive",
        canRunStagingReads: false,
        canRunProductionReads: false,
        canWriteData: false,
        readOnlyRehearsalEnabled: true,
        coverage: {
          readStatementCount: 18,
          sampleQueryCount: 7,
          tableCount: 8,
          parameterizedReadCount: 18,
        },
        rehearsalWindow: {
          environment: "staging-first",
          maxRowsPerQuery: 25,
          statementTimeoutMs: 10000,
          minimumSuccessfulRuns: 3,
        },
        sampleQueries: [
          {
            id: "list_reminders_readonly_rehearsal",
            method: "listReminders",
            table: "reminder_rules",
            resultShape: "rows",
            expectedMapping: "rows-array",
            maxRows: 25,
            readOnlyTransaction: true,
            status: "planned",
          },
          {
            id: "get_auth_user_readonly_rehearsal",
            method: "getAuthUser",
            table: "users",
            resultShape: "single-row-or-null",
            expectedMapping: "single-or-null",
            maxRows: 1,
            readOnlyTransaction: true,
            status: "planned",
          },
        ],
        checks: [
          { id: "readOnlySmokePlan", status: "pass" },
          { id: "resultAuditPlan", status: "pass" },
          { id: "readOnlyRehearsalOptIn", status: "pass" },
          { id: "readStatementCoverage", status: "pass" },
        ],
        safety: {
          noSqlExecution: true,
          readOnlyTransactionsOnly: true,
          rowLimitRequired: true,
        },
        blockedReasons: [],
        nextSteps: ["连续通过只读查询预演后，再进入双读一致性样本比较。"],
        disclaimer: "这是生产 PostgreSQL 仓储只读查询预演计划；当前不会执行 SQL。",
      },
      productionRepositoryParityPlan: {
        id: "production-repository-dual-read-parity-plan",
        mode: "dual-read-parity-plan",
        status: "ready-for-staging-parity",
        runtimeMode: "inactive",
        canCompareAutomatically: false,
        mockRepositoryRequired: true,
        productionRepositoryRequired: true,
        parityWindow: {
          environment: "staging-first",
          minimumSampleUsers: 3,
          minimumRuns: 3,
          maxAllowedMismatchPercent: 0,
        },
        comparisonPlan: [
          {
            domain: "reminders",
            table: "reminder_rules",
            methods: ["listReminders"],
            keyStrategy: "user-scope-and-record-id",
            status: "planned",
          },
          {
            domain: "notificationOutbox",
            table: "notification_outbox",
            methods: ["listNotifications"],
            keyStrategy: "user-scope-and-record-id",
            status: "planned",
          },
        ],
        ignoredFields: ["createdAt", "updatedAt", "sentAt", "readAt"],
        checks: [
          { id: "repositoryContract", status: "pass" },
          { id: "readOnlySmoke", status: "pass" },
          { id: "parityOptIn", status: "pass" },
          { id: "zeroMismatchThreshold", status: "planned" },
        ],
        safety: {
          noWrites: true,
          noRuntimeSwitch: true,
          mockFallbackRequired: true,
        },
        blockedReasons: [],
        nextSteps: ["连续通过后再进入双写或受控迁移演练。"],
        disclaimer: "这是生产仓储双读一致性验证计划；当前不会读取真实生产数据。",
      },
      productionRepositoryParityEvidencePlan: {
        id: "production-repository-parity-evidence-plan",
        mode: "dual-read-parity-evidence-plan",
        status: "ready-for-evidence-capture",
        runtimeMode: "inactive",
        canCaptureEvidence: false,
        canReadProductionData: false,
        canWriteData: false,
        evidenceCoverage: {
          domainCount: 2,
          methodCount: 2,
          ignoredFieldCount: 4,
          requiredSuccessfulRuns: 3,
          maxAllowedMismatchPercent: 0,
        },
        evidenceRecords: [
          {
            id: "reminders_parity_evidence",
            domain: "reminders",
            table: "reminder_rules",
            methods: ["listReminders"],
            keyStrategy: "user-scope-and-record-id",
            sampleScope: "user-scoped-sample",
            expectedOutcome: "zero-mismatch",
            status: "planned",
          },
          {
            id: "notificationOutbox_parity_evidence",
            domain: "notificationOutbox",
            table: "notification_outbox",
            methods: ["listNotifications"],
            keyStrategy: "user-scope-and-record-id",
            sampleScope: "user-scoped-sample",
            expectedOutcome: "zero-mismatch",
            status: "planned",
          },
        ],
        mismatchCategories: [
          { id: "missingRecord", severity: "blocker", action: "block-cutover" },
          { id: "rowCountMismatch", severity: "blocker", action: "block-cutover" },
          { id: "orderingMismatch", severity: "review", action: "normalize-before-blocking" },
        ],
        auditEnvelope: {
          eventTypePrefix: "repository.postgres.parity",
          allowedFields: ["domain", "method", "mockRowCount", "postgresRowCount", "mismatchCount"],
          forbiddenFields: ["rawMockRows", "rawPostgresRows", "rawParameterValues"],
        },
        checks: [
          { id: "readRehearsalPlan", status: "pass" },
          { id: "parityPlan", status: "pass" },
          { id: "evidenceDomainCoverage", status: "pass" },
          { id: "zeroMismatchThreshold", status: "pass" },
        ],
        safety: {
          rawRowsNeverLogged: true,
          mismatchBlocksCutover: true,
          mockFallbackRequired: true,
        },
        blockedReasons: [],
        nextSteps: ["将 evidence package 接入审计导出和人工审批流程。"],
        disclaimer: "这是生产 PostgreSQL 仓储双读证据与差异评估计划；当前不会比较真实记录。",
      },
      productionRepositoryDualWritePlan: {
        id: "production-repository-dual-write-rehearsal-plan",
        mode: "dual-write-rehearsal-plan",
        status: "ready-for-controlled-rehearsal",
        runtimeMode: "inactive",
        canWriteAutomatically: false,
        canSwitchAutomatically: false,
        mockPrimaryRequired: true,
        productionShadowWriteOnly: true,
        rehearsalWindow: {
          environment: "staging-first",
          minimumSuccessfulRuns: 3,
          maxAllowedWriteMismatchPercent: 0,
          rollbackOnFirstMismatch: true,
        },
        writePlan: [
          {
            domain: "reminders",
            table: "reminder_rules",
            methods: ["addReminder", "removeReminder"],
            transactionRequired: true,
            auditRequired: true,
            status: "planned",
          },
          {
            domain: "notificationOutbox",
            table: "notification_outbox",
            methods: ["saveNotification", "updateNotification"],
            transactionRequired: true,
            auditRequired: true,
            status: "planned",
          },
        ],
        checks: [
          { id: "repositoryContract", status: "pass" },
          { id: "dualReadParity", status: "pass" },
          { id: "dualWriteOptIn", status: "pass" },
          { id: "idempotencyKeys", status: "planned" },
        ],
        safety: {
          noRuntimeSwitch: true,
          mockRemainsSourceOfTruth: true,
          productionWritesShadowOnly: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["任一写入结果不一致。", "任一事务审计事件缺失。"],
        nextSteps: ["连续通过后，再设计受控迁移或 feature-flag 切换方案。"],
        disclaimer: "这是生产仓储双写/受控迁移演练计划；当前不会写入生产仓储。",
      },
      productionRepositoryShadowWriteEvidencePlan: {
        id: "production-repository-shadow-write-evidence-plan",
        mode: "shadow-write-evidence-idempotency-plan",
        status: "ready-for-shadow-evidence",
        runtimeMode: "inactive",
        canWriteProduction: false,
        canChangeUserVisibleData: false,
        canSwitchRuntime: false,
        evidenceCoverage: {
          domainCount: 2,
          methodCount: 4,
          idempotencyKeyRequiredCount: 2,
          transactionRequiredCount: 2,
          auditRequiredCount: 2,
          requiredSuccessfulRuns: 3,
          maxAllowedWriteMismatchPercent: 0,
        },
        evidenceRecords: [
          {
            id: "reminders_shadow_write_evidence",
            domain: "reminders",
            table: "reminder_rules",
            methods: ["addReminder", "removeReminder"],
            transactionRequired: true,
            auditRequired: true,
            idempotencyKeyRequired: true,
            expectedOutcome: "mock-visible-production-shadow-only",
            status: "planned",
          },
          {
            id: "notificationOutbox_shadow_write_evidence",
            domain: "notificationOutbox",
            table: "notification_outbox",
            methods: ["saveNotification", "updateNotification"],
            transactionRequired: true,
            auditRequired: true,
            idempotencyKeyRequired: true,
            expectedOutcome: "mock-visible-production-shadow-only",
            status: "planned",
          },
        ],
        idempotencyPolicy: {
          requiredForEveryWrite: true,
          duplicateHandling: "block-and-rollback-shadow-write",
          ttlHours: 24,
          rawPayloadHashOnly: true,
        },
        auditEnvelope: {
          eventTypePrefix: "repository.postgres.shadow_write",
          allowedFields: ["domain", "method", "idempotencyKeyHash", "rowCount", "status"],
          forbiddenFields: ["rawPayload", "rawMockRecord", "rawPostgresRecord"],
        },
        checks: [
          { id: "dualWriteRehearsalPlan", status: "pass" },
          { id: "shadowOnly", status: "pass" },
          { id: "idempotencyKeyCoverage", status: "pass" },
          { id: "transactionAudit", status: "pass" },
        ],
        safety: {
          mockRemainsSourceOfTruth: true,
          productionWritesShadowOnly: true,
          rawPayloadNeverLogged: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["任一幂等键重复、缺失或过期。", "任一 mock 可见写入与 production shadow 写入结果不一致。"],
        nextSteps: ["将 shadow write evidence package 接入审计导出和人工审批流程。"],
        disclaimer: "这是生产 PostgreSQL 仓储影子写证据与幂等计划；当前不会写入生产仓储。",
      },
      productionRepositoryBackupRestoreEvidencePlan: {
        id: "production-repository-backup-restore-evidence-plan",
        mode: "backup-restore-rehearsal-evidence-plan",
        status: "ready-for-backup-restore-evidence",
        runtimeMode: "inactive",
        canRunBackup: false,
        canRunRestore: false,
        canTouchProductionData: false,
        backupRestoreVerified: true,
        recoveryObjectives: {
          targetRpoMinutes: 15,
          targetRtoMinutes: 30,
          minimumSuccessfulRestoreRuns: 2,
          maxAllowedDataLossRecords: 0,
        },
        evidenceCoverage: {
          tableCount: 4,
          criticalTableCount: 2,
          backupArtifactCount: 4,
          restoreRunCountRequired: 2,
          checksumRequiredCount: 4,
        },
        criticalTables: ["reminder_rules", "notification_outbox"],
        rehearsalArtifacts: [
          {
            id: "schemaDump",
            artifactType: "schema",
            required: true,
            encrypted: true,
            checksumRequired: true,
            status: "verified",
          },
          {
            id: "restoreDryRun",
            artifactType: "restore-rehearsal",
            required: true,
            encrypted: true,
            checksumRequired: true,
            status: "verified",
          },
        ],
        checks: [
          { id: "shadowWriteEvidence", status: "pass" },
          { id: "backupRestoreOptIn", status: "pass" },
          { id: "encryptedBackup", status: "pass" },
          { id: "checksumVerification", status: "pass" },
        ],
        safety: {
          encryptionRequired: true,
          checksumRequired: true,
          mockFallbackRequired: true,
          cutoverBlockedUntilRestoreVerified: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["任一恢复演练超过 RTO 目标。", "任一关键表恢复后记录缺失或多出。"],
        nextSteps: ["备份恢复证据通过前，生产仓储切换门禁必须保持阻断。"],
        disclaimer: "这是生产 PostgreSQL 仓储备份恢复演练证据计划；当前不会执行备份或恢复。",
      },
      productionRepositoryCutoverMonitoringEvidencePlan: {
        id: "production-repository-cutover-monitoring-evidence-plan",
        mode: "cutover-monitoring-evidence-plan",
        status: "ready-for-monitoring-evidence",
        runtimeMode: "inactive",
        canStartMonitoring: false,
        canReadProductionMetrics: false,
        canSwitchRuntime: false,
        monitoringVerified: true,
        monitoringWindow: {
          environment: "staging-first",
          preCutoverMinutes: 60,
          postCutoverMinutes: 120,
          rollbackDecisionMinutes: 15,
          minimumHealthyWindows: 2,
        },
        evidenceCoverage: {
          metricCount: 5,
          monitoredTableCount: 2,
          alertRouteCount: 3,
          rollbackTriggerCount: 5,
        },
        monitoredTables: ["reminder_rules", "notification_outbox"],
        metricProbes: [
          {
            id: "auditHashChainContinuity",
            signal: "audit.hash_chain.continuity",
            threshold: "100%",
            rollbackOnBreach: true,
            status: "verified",
          },
          {
            id: "readFallbackHealth",
            signal: "repository.fallback.read_success_rate",
            threshold: ">=99.9%",
            rollbackOnBreach: true,
            status: "verified",
          },
        ],
        alertRoutes: [
          { id: "engineeringOnCall", channel: "internal-on-call", required: true, status: "verified" },
          { id: "auditArchive", channel: "audit-export-package", required: true, status: "verified" },
        ],
        checks: [
          { id: "backupRestoreEvidence", status: "pass" },
          { id: "monitoringOptIn", status: "pass" },
          { id: "alertRouting", status: "pass" },
          { id: "rollbackOwner", status: "pass" },
        ],
        safety: {
          noMetricSubscription: true,
          mockFallbackRequired: true,
          rollbackOwnerRequired: true,
          cutoverBlockedUntilMonitoringVerified: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["审计 hash 链出现断裂或延迟。", "mock/json 回退读取成功率低于 99.9%。"],
        nextSteps: ["监控证据通过前，生产仓储切换门禁必须保持阻断。"],
        disclaimer: "这是生产 PostgreSQL 仓储切换监控证据计划；当前不会订阅真实监控。",
      },
      productionRepositoryRollbackRehearsalEvidencePlan: {
        id: "production-repository-rollback-rehearsal-evidence-plan",
        mode: "rollback-rehearsal-evidence-plan",
        status: "ready-for-rollback-evidence",
        runtimeMode: "inactive",
        canRollbackRuntime: false,
        canReplayWrites: false,
        canTouchProductionData: false,
        rollbackVerified: true,
        rollbackObjectives: {
          rollbackDeadlineMinutes: 15,
          targetRtoMinutes: 10,
          minimumSuccessfulRollbackRuns: 2,
          maxAllowedDataLossRecords: 0,
        },
        evidenceCoverage: {
          rollbackPathCount: 5,
          rollbackTableCount: 2,
          requiredAuditPackageCount: 1,
          requiredSuccessfulRuns: 2,
        },
        rollbackTables: ["reminder_rules", "notification_outbox"],
        rollbackPaths: [
          { id: "featureFlagRevert", action: "set FINANCE_AI_REPOSITORY_MODE back to mock-or-json", expectedDurationMinutes: 2, status: "verified" },
          { id: "auditExport", action: "export-cutover-window-audit-package", expectedDurationMinutes: 5, status: "verified" },
        ],
        checks: [
          { id: "cutoverMonitoringEvidence", status: "pass" },
          { id: "rollbackRehearsalOptIn", status: "pass" },
          { id: "featureFlagRollback", status: "pass" },
          { id: "auditExport", status: "pass" },
        ],
        safety: {
          noRuntimeRollback: true,
          mockFallbackRequired: true,
          noAuditExportExecution: true,
          cutoverBlockedUntilRollbackVerified: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["无法在 15 分钟内恢复 mock/json 为用户可见主源。", "回滚后任一用户状态、自选股、持仓或提醒规则不一致。"],
        nextSteps: ["回滚证据通过前，生产仓储切换门禁必须保持阻断。"],
        disclaimer: "这是生产 PostgreSQL 仓储回滚演练证据计划；当前不会执行运行时回滚。",
      },
      productionRepositoryCutoverAuditTrailEvidencePlan: {
        id: "production-repository-cutover-audit-trail-evidence-plan",
        mode: "cutover-audit-trail-evidence-plan",
        status: "ready-for-audit-trail-evidence",
        runtimeMode: "inactive",
        canWriteAudit: false,
        canReadProductionAudit: false,
        canSwitchRuntime: false,
        auditTrailVerified: true,
        auditObjectives: {
          requiredHashChainContinuityPercent: 100,
          maxAuditLagSeconds: 30,
          minimumRetentionDays: 90,
          requiredExportPackageCount: 1,
        },
        evidenceCoverage: {
          eventTypeCount: 5,
          auditFieldCount: 10,
          forbiddenFieldCount: 7,
          requiredPackageCount: 1,
        },
        auditEvents: [
          { id: "cutoverRequested", eventType: "repository.cutover.requested", status: "verified" },
          { id: "featureFlagChanged", eventType: "repository.cutover.feature_flag_changed", status: "verified" },
        ],
        auditEnvelope: {
          allowedFields: ["eventType", "actorId", "approvalId", "repositoryMode", "previousMode", "targetMode", "durationMs", "status", "hash", "previousHash"],
          forbiddenFields: ["rawPayload", "rawUserRecord", "rawPortfolio", "rawSql", "rawParameterValues", "accessToken", "refreshToken"],
          hashChainRequired: true,
          exportPackageRequired: true,
        },
        checks: [
          { id: "rollbackRehearsalEvidence", status: "pass" },
          { id: "auditTrailOptIn", status: "pass" },
          { id: "hashChainContinuity", status: "pass" },
          { id: "redactionPolicy", status: "pass" },
        ],
        safety: {
          noAuditWrite: true,
          noProductionAuditRead: true,
          noRawPayloadLogging: true,
          cutoverBlockedUntilAuditVerified: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["审计 hash 链连续性低于 100%。", "审计事件写入延迟超过 30 秒。"],
        nextSteps: ["审计链证据通过前，生产仓储切换门禁必须保持阻断。"],
        disclaimer: "这是生产 PostgreSQL 仓储切换审计链证据计划；当前不会写入审计记录。",
      },
      productionRepositoryCutoverPlan: {
        id: "production-repository-cutover-plan",
        mode: "feature-flag-cutover-plan",
        status: "ready-for-manual-cutover",
        runtimeMode: "inactive",
        canSwitchAutomatically: false,
        canWriteAutomatically: false,
        featureFlag: {
          name: "FINANCE_AI_REPOSITORY_MODE",
          current: "mock",
          allowedValues: ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
          target: "postgres-primary",
          requiresManualApproval: true,
        },
        cutoverWindow: {
          environment: "staging-first",
          preferredWindow: "low-traffic-manual-window",
          minimumSuccessfulDualWriteRuns: 3,
          maxAllowedMismatchPercent: 0,
          rollbackDeadlineMinutes: 15,
        },
        checks: [
          { id: "repositoryContract", status: "pass" },
          { id: "dualWriteRehearsal", status: "pass" },
          { id: "humanApproval", status: "pass" },
          { id: "backupRestore", status: "pass" },
          { id: "monitoring", status: "pass" },
          { id: "rollbackPlan", status: "pass" },
          { id: "auditTrail", status: "pass" },
        ],
        safety: {
          noAutomaticSwitch: true,
          mockFallbackRequired: true,
          requiresHumanApproval: true,
        },
        blockedReasons: [],
        rollbackTriggers: ["任一关键表读写延迟超过审批阈值。", "用户状态、持仓、自选股或提醒规则出现一致性差异。"],
        rollbackPlan: ["立即将 FINANCE_AI_REPOSITORY_MODE 从 postgres-primary 切回 mock 或 json。"],
        nextSteps: ["切换后保持 mock/json 回退路径，直到生产仓储稳定窗口通过。"],
        disclaimer: "这是生产仓储 feature flag 切换计划；当前不会切换运行时仓储。",
      },
      missingProductionCapabilities: ["backupRestore", "retentionPolicy", "auditRedaction"],
      disclaimer: "当前为样例数据库桥，不代表生产数据库。",
    }),
    apiAuditServiceStatus: JSON.stringify({
      id: "mock-audit-service",
      name: "Mock 审计服务",
      mode: "sample",
      status: "planning",
      storageMode: "json-file",
      retentionPolicy: {
        maxEvents: 500,
        windowDays: 90,
        enforcement: "repository-cap-and-manual-purge",
        manualPurgeSupported: true,
        rechainAfterPurge: true,
      },
      maintenancePolicy: {
        retentionPurgeSupported: true,
        manualPurgeSupported: true,
        exportPackageSupported: true,
        auditTrailRequired: true,
        rechainAfterPurge: true,
      },
      redactionPolicy: {
        metadata: "sensitive-keys-redacted",
        email: "masked",
        redactedFields: ["password", "passwordHash", "token"],
      },
      integrity: {
        status: "verified",
        eventCount: 8,
        latestHash: "1234567890abcdef",
        algorithm: "sha256-stable-json",
        brokenEvents: [],
      },
      capabilities: [
        "safeMetadata",
        "retentionLimit",
        "retentionPurge",
        "hashChainIntegrity",
        "productionGapReport",
      ],
      missingProductionCapabilities: ["longTermArchive", "automatedRetentionPurge"],
      disclaimer: "样例审计服务，不代表生产审计系统。",
    }),
    apiJobRunnerStatus: JSON.stringify({
      id: "mock-reminder-job-runner",
      name: "Mock 提醒任务运行器",
      mode: "sample",
      status: "ready",
      executionMode: "manual-api",
      supportedJobs: ["reminderEvaluation"],
      duplicateSuppression: {
        notificationWindowSeconds: 900,
        scope: "user-rule-channel-observedValue-threshold",
      },
      capabilities: ["reminderEvaluation", "auditEvents", "duplicateNotificationSuppression"],
      disclaimer: "样例任务运行器，不代表真实后台定时任务。",
    }),
    apiSchedulerStatus: JSON.stringify({
      id: "mock-scheduler-service",
      name: "Mock 后台调度服务",
      mode: "sample",
      status: "ready",
      executionMode: "manual-due-check",
      timezone: "Australia/Brisbane",
      schedules: [
        {
          id: "schedule-reminder-evaluation",
          jobType: "reminderEvaluation",
          cadence: "every-15-minutes",
          timezone: "Australia/Brisbane",
        },
      ],
      runSafety: {
        idempotencyWindowSeconds: 600,
        cooldownSeconds: 60,
        idempotencyKeySupported: true,
        overlappingRunsBlocked: true,
      },
      deadLetterPolicy: {
        status: "sample-ready",
        maxAttempts: 3,
        retryBackoff: "exponential",
        baseRetrySeconds: 60,
        replaySupported: true,
        requiresAuditTrail: true,
      },
      workerTelemetryPolicy: {
        status: "sample-ready",
        heartbeatTtlSeconds: 120,
        queueLagWarningSeconds: 300,
        queueLagCriticalSeconds: 900,
        queueDepthWarning: 25,
        queueDepthCritical: 100,
        heartbeatSupported: true,
        queueLagMonitoringSupported: true,
      },
      workerAuthPolicy: {
        status: "configured",
        configured: true,
        enforcement: "required",
        signatureRequired: true,
        nonceRequired: true,
        signatureAlgorithm: "hmac-sha256",
        timestampToleranceSeconds: 300,
        acceptedHeader: "x-worker-secret",
        acceptedSignatureHeader: "x-worker-signature",
        acceptedTimestampHeader: "x-worker-timestamp",
        acceptedNonceHeader: "x-worker-nonce",
        acceptedBodyField: "workerSecret",
        acceptedNonceBodyField: "workerNonce",
        nonceRetentionLimit: 500,
        nonceRetentionSeconds: 86400,
        nonceCleanupSupported: true,
        appliesTo: ["recordWorkerHeartbeat", "processQueuedJobs"],
        disclaimer: "已配置 worker secret；样例 worker 心跳和队列处理需要匹配凭证。",
      },
      workerNonceMaintenancePolicy: {
        status: "sample-ready",
        cleanupSupported: true,
        retentionSeconds: 86400,
        retentionLimit: 500,
        auditTrailRequired: true,
        manualCleanupSupported: true,
        disclaimer: "当前为样例 worker nonce 清理策略。",
      },
      queuePolicy: {
        status: "sample-ready",
        enqueueSupported: true,
        retryBackoff: "exponential",
        maxAttempts: 3,
        deadLetterAfterMaxAttempts: true,
        requiresIdempotencyKey: true,
      },
      capabilities: [
        "manualDueCheck",
        "auditEvents",
        "idempotencyKey",
        "cooldownLock",
        "deadLetterQueue",
        "deadLetterReplay",
        "workerHeartbeat",
        "queueLagMonitoring",
        "enqueueJob",
        "retrySchedule",
        "queueAlerts",
        "processQueue",
      ],
      providerAdapter: {
        id: "scheduler-provider-adapter",
        name: "Scheduler Provider Adapter Skeleton",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "managed-queue-scheduler",
        configured: true,
        supported: true,
        canUseBackgroundWorkers: false,
        queuePolicy: {
          status: "planned",
          requiresIdempotencyKey: true,
          retryBackoff: "exponential",
          maxAttempts: 3,
          deadLetterQueueRequired: true,
          workerHeartbeatSeconds: 60,
        },
        runSafetyPolicy: {
          status: "planned",
          requiresCronSignature: true,
          limitsConcurrentRuns: true,
          recordsJobLag: true,
          blocksOverlappingRuns: true,
          requiresAuditTrail: true,
        },
        backpressurePolicy: {
          status: "blocked",
          maxQueueDepth: 1000,
          maxLagSeconds: 300,
          pauseLowPriorityJobs: true,
          alertRoutesRequired: true,
        },
        workerAuthPolicy: {
          status: "blocked",
          requiresHmacSignature: true,
          timestampSkewSeconds: 300,
          nonceRequired: true,
          rotatesSecrets: true,
          forbiddenAuditFields: ["workerSecret", "cronSigningSecret"],
        },
        runbookPolicy: {
          status: "blocked",
          requiredRunbooks: ["queue-drain", "dlq-replay", "worker-secret-rotation"],
          manualApprovalRequiredForReplay: true,
          rollbackToManualDueCheck: true,
        },
        schedulerGate: {
          status: "blocked",
          canUseBackgroundWorkers: false,
          checks: [
            { id: "providerConfig", status: "pass" },
            { id: "deadLetterQueue", status: "blocked" },
            { id: "workerHealth", status: "blocked" },
            { id: "backpressure", status: "blocked" },
            { id: "workerAuth", status: "blocked" },
            { id: "runbook", status: "blocked" },
          ],
          blockedReasons: ["worker 健康检查、延迟监控和告警尚未确认。"],
        },
        backgroundWorkerPreflightPlan: {
          status: "blocked",
          mode: "dry-run-no-worker-start",
          canStartBackgroundWorkers: false,
          providerRequestAllowed: false,
          requiredManualApproval: true,
        },
        incidentResponseDrillPackage: {
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
        },
        endpointContracts: [
          { id: "enqueueJob", method: "enqueueJob", status: "planned" },
          { id: "deadLetterReplay", method: "replayDeadLetterJob", status: "planned" },
        ],
        scheduleContracts: [
          {
            id: "schedule-market-refresh",
            jobType: "marketDataRefresh",
            cadence: "market-hours-every-1-minute",
            status: "planned",
          },
          {
            id: "schedule-macro-refresh",
            jobType: "macroDataRefresh",
            cadence: "daily-06-00",
            status: "planned",
          },
        ],
        missingEnvVars: [],
        safety: {
          noExternalWorkers: true,
          manualFallbackActive: true,
          requiresSignedCron: true,
          requiresWorkerHeartbeat: true,
          requiresBackpressure: true,
          requiresWorkerCallbackAuth: true,
          requiresRunbookApproval: true,
        },
        blockedReasons: ["worker 健康检查、延迟监控和告警尚未确认。"],
        disclaimer: "当前为生产调度 provider adapter 骨架，不会启动真实 cron、队列 worker 或后台网络任务。",
      },
      disclaimer: "样例调度服务，不代表真实 cron。",
    }),
  });

  assert.match(app.byId.get("dataSourceState").innerHTML, /Mock Sample Provider/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /演练数据/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /A 股 \/ 美股/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /股票搜索/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /提醒评估/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /演练行情读取/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /演练宏观数据读取/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻公告适配器/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /演练新闻情报读取/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻采集运行时/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /真实数据源 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /必选 1\/3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /实时\/延迟行情:configured/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /财经新闻与公告:missing/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /来源署名:blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /FINANCE_AI_NEWS_PROVIDER:missing/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /接入预检 defined · dry-run-no-provider-fetch · 不请求 provider · 不启用 live runtime · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Provider 注册表 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /必选 1\/3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /实时\/延迟行情:licensed-market-data:ready-for-adapter/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /财经新闻与公告:未选择:missing-config/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /授权新闻\/公告 Provider:delayed-or-live/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /注册表预检 defined · dry-run-no-provider-runtime · 运行时 local-rehearsal · 不可切 live · 必选 marketData\/marketNews\/macroData/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情适配器 ready-for-implementation/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /供应商清单 blocked · 通过 4\/8 · 阻断 2 · 待批 2/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情数据:licensed-market-data \/ 新闻与公告:licensed-news-filings/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /该清单用于供应商筛选和授权准备，不代表任何 provider 已签约/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情验收清单 pending-approval · 通过 4\/9 · 阻断 1 · 待批 4/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /报价接口:symbol\/lastPrice\/currency\/asOf/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /价格和图表必须展示哪些授权标签/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /该行情验收清单仅用于供应商沟通和接入前评审，不代表真实行情 provider 已签约/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻公告验收清单 blocked · 通过 3\/9 · 阻断 4 · 待批 2/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /短摘录:excerpt\/maxExcerptChars\/language\/sourceUrl/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /付费墙或受限内容是否只能展示标题和来源链接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观数据验收清单 blocked · 通过 3\/10 · 阻断 3 · 待批 4/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /政策事件:eventId\/title\/jurisdiction\/timezone/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不代表真实宏观 provider 已签约/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /公开言论验收清单 blocked · 通过 3\/10 · 阻断 4 · 待批 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /人工复核队列:reviewStatus\/reviewReason\/priority\/slaHours/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不代表真实公开言论 provider 已签约/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /该新闻\/公告验收清单仅用于供应商沟通和接入前评审，不代表真实新闻、公告或公开言论 provider 已签约/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /inactive · licensed-market-data/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /getTradingCalendar:planned:available/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /offline-rehearsal available · 3 条 · A 股 \/ 港股 \/ 美股/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不联网 · 不交易 · 不可取真实行情/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存 ready-for-adapter · 报价 15s · 历史 300s/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /限流 ready-for-adapter · 120\/min · burst 30/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /署名 ready-for-adapter · source\.label \/ source\.licenseTag \/ asOf \/ dataDelay/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /授权分层 ready · rehearsal \/ delayed \/ live · 用户授权 · 交易所协议 · 禁止审计 rawTick \/ fullOrderBook \/ providerApiKey/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /延迟标签 ready · rehearsal-not-real-time \/ delayed \/ live · 价格旁展示 · 图表旁展示 · 默认 0min/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /请求门禁 blocked · provider 不可用 · offline-rehearsal 可用/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /adapterStatus:pass \/ runtimeMode:blocked \/ cachePolicy:pass/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /entitlementPolicy:pass \/ delayLabelPolicy:pass/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /行情请求门禁阻断：真实 provider runtime 仍为 inactive/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /执行计划 fallback-only · status-preview · cache offline-rehearsal-fallback/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /cache key licensed-market-data:any-market:any-code:spot:snapshot · ttl 15s/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /fallback offline-rehearsal-or-local-rehearsal · local 允许 · audit marketData\.request\.policyGate/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Provider 预检 blocked · dry-run-no-provider-request · 不请求 provider · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage defined · GLOBAL_QUOTE · 市场 A 股 \/ 港股 \/ 美股 · 网络未开启 · 不可请求真实 quote/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage smoke defined · real-provider-demo-key-smoke · demo IBM · 字段 5 · 可测 demo/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage 凭证预检 blocked · no-secret-credential-preflight · key missing · 网络 disabled · 不可验真实 key/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /配置向导 ready-for-user-configuration · no-secret-provider-setup-guide · 分组 4 · 不读密钥 · 不启用 live/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /配置分组 行情 Provider:missing-config \/ 新闻情绪 Provider:missing-config \/ 宏观数据 Provider:missing-config \/ 公开言论 Provider:missing-config/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Smoke 顺序 行情报价 → 新闻情绪 → 宏观上下文 → 公开言论/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /安全边界 禁止 apiKey \/ providerSecret \/ providerResponseRaw \/ rawArticleBody \/ rawProviderUrl · 不写 env · 已过 4\/5/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage News defined · NEWS_SENTIMENT · 已验证市场 美股 · 规划市场 A 股 \/ 港股 · 网络未开启 · 不可请求真实新闻/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage News smoke defined · real-provider-demo-news-smoke · demo AAPL · 字段 5 · 可测 demo/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /Alpha Vantage News 凭证预检 blocked · no-secret-credential-preflight · key missing · 网络 disabled · 不可验真实 key/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /SEC 公告连接器 defined · sec-company-submissions · 已验证市场 美股 · 规划市场 A 股 \/ 港股 · 网络未开启 · 不可请求真实公告/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /SEC 公告 smoke defined · real-provider-public-filings-smoke · demo AAPL · CIK 0000320193 · 字段 4 · 可测公开端点/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /SEC 公告访问预检 blocked · no-secret-public-filings-preflight · 网络 disabled · User-Agent missing · 无需 API key/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /运行时 ready · no-vendor-network · cache memory-rehearsal/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存记录 4 · 限流窗口 2 · 不联网/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存模型 fresh-stale-expired · 最多 200 条/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /quote:stale:licensed-market-data:any-market:any-code:spot:snapshot/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /licensed-market-data:quote:2\/120:剩余118/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /熔断阈值 5 次 · 冷却 60s/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /licensed-market-data:quote:half-open:失败5:timeout/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /quote:stale:hit:refreshed:half-open/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /缓存查询遥测 \/ 缓存新鲜度遥测 \/ 限流遥测 \/ 限流窗口遥测 \/ 熔断器遥测/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观数据适配器 blocked · inactive · official-macro-data/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /listPolicyEvents:planned:available/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /offline-rehearsal available · 上下文 3 · 指标 10 · 事件 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /因子联动 six-factor-macro-input-v1 · 指标 offline-rehearsal-indicator-score-v1/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新鲜度 ready · source\.asOf \/ indicator\.asOf \/ policyEvent\.publishedAt · 指标 7 天 · 事件 30 天 · 分数旁展示/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /政策日历 ready · title \/ publishedAt \/ source\.label \/ source\.licenseTag \/ importanceScore · 官方日历校验 · 时区归一/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观预检 blocked · dry-run-no-provider-fetch · 不抓取 provider · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不可取真实宏观数据/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /宏观数据适配器阻断：尚未确认宏观经济数据授权/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻采集运行时 ready · no-vendor-network/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /类型 news \/ filing \/ publicStatement/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /去重记录 3 · 冷却窗口 300s · 不抓取社交网页/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /news:a:600519:cooldown-active:run2/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /publicStatement:a:600519:接收1:重复1:缺署名0:阻断0/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /来源轮询遥测 \/ 去重遥测 \/ 署名门禁遥测 \/ 授权边界遥测/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不抓取真实网站或社交媒体/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /暂无行情适配器阻断项/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻公告适配器 blocked/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /listPublicStatements:planned:available/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /offline-rehearsal available · 新闻 4 · 公告 3 · 言论 3/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /去重 normalized-title-related-tickers/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /评分 explainable-weighted-score-v1/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /持久化 local-rehearsal-repository-on-demand/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /来源验证 ready · sourceUrl \/ publisherIdentity \/ publishedAt \/ speakerRole \/ verifiedOfficialChannel · 阻断未验证言论 · 社交言论人工复核/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /公开言论身份 ready · speakerId \/ speakerName \/ speakerRole \/ verificationStatus \/ sourceUrl \/ postedAt \/ platformTermsStatus · 阻断高影响未验证言论 · 官方渠道或人工复核/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /公开言论复核 ready · unverifiedIdentity \/ highMarketImpact \/ translatedOrParaphrasedStatement \/ screenshotOrRepostOnly \/ conflictingSourceSignals · SLA 24h · 复核后仍不作为强买卖信号/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /再分发 ready · headline-summary \/ short-excerpt \/ source-link · 不存全文 · 阻断付费墙 · 保留 30 天/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻预检 blocked · dry-run-no-provider-fetch · 不抓取 provider · 需人工审批/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /不可取真实新闻/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /新闻公告适配器阻断/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /真实 AI 模型待配置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /风险偏好调整/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子拆解/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /AI provider 适配器 blocked · inactive · hosted-llm-provider · finance-analysis-model/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /提示词 analysis-prompt-v1 · structured-json · 模型参考概率/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /响应 schema draft · 必填 4 · 禁止 guaranteedReturn \/ mustBuy \/ mustSell \/ riskFree/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子输入 blocked · macro \/ industry \/ fundamentals \/ valuation \/ technical \/ sentiment · 最少 6 项 · 缺失输出不确定/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /因子权重 blocked · six-factor-weight-v1 · 权重版本化 · 变更需审批/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /密钥管理 blocked · dry-run-no-model-secret-use · 不使用生产密钥 · unconfigured · 轮换 90 天/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /注入防护 blocked · dry-run-no-unsanitized-source-text · 信号 5 · 不使用未净化文本 · 需隔离可疑来源/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /数据最小化 blocked · dry-run-no-personal-data-to-model · 不发送个人数据 · 需同意上下文 · 需脱敏审计/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /引用证据 blocked · dry-run-no-uncited-model-output · 每结论 1 条 · 不发布无引用分析 · 需结论-引用映射/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /providerConfig:pass \/ auditReadiness:blocked/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /暂无 AI provider 缺失环境变量/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /Mock 合规策略服务/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /保证收益 \/ 稳赚 \/ 无风险/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /合规门禁 blocked · public beta 不可发布/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /disclaimerPresence:pass \/ legalReview:blocked \/ jurisdictionPolicy:blocked/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /地区展示策略 \/ 持牌资质判断/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /法律\/合规复核尚未完成/);
  assert.match(app.byId.get("repositoryState").innerHTML, /Mock 用户数据仓储/);
  assert.match(app.byId.get("repositoryState").innerHTML, /json-file/);
  assert.match(app.byId.get("repositoryState").innerHTML, /持仓记录/);
  assert.match(app.byId.get("repositoryState").innerHTML, /审计日志/);
  assert.match(app.byId.get("databaseState").innerHTML, /Mock 数据库服务/);
  assert.match(app.byId.get("databaseState").innerHTML, /json-file-bridge/);
  assert.match(app.byId.get("databaseState").innerHTML, /pre-production/);
  assert.match(app.byId.get("databaseState").innerHTML, /提醒规则/);
  assert.match(app.byId.get("databaseState").innerHTML, /通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /JSON 桥接/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储契约 pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /通知投递状态：pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /configured/);
  assert.match(app.byId.get("databaseState").innerHTML, /configureConnection:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /迁移预演 ready-for-driver/);
  assert.match(app.byId.get("databaseState").innerHTML, /结构预演:ready/);
  assert.match(app.byId.get("databaseState").innerHTML, /3\.通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 草案 generated/);
  assert.match(app.byId.get("databaseState").innerHTML, /fnv1a-test002/);
  assert.match(app.byId.get("databaseState").innerHTML, /需要人工审查/);
  assert.match(app.byId.get("databaseState").innerHTML, /迁移包 blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /review-only/);
  assert.match(app.byId.get("databaseState").innerHTML, /fnv1a-package002/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionConfig:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读连接 ready-for-readonly-probe/);
  assert.match(app.byId.get("databaseState").innerHTML, /driverAvailability:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /networkProbe:ready/);
  assert.match(app.byId.get("databaseState").innerHTML, /仓储切换 implementation-required/);
  assert.match(app.byId.get("databaseState").innerHTML, /driverSetup:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /notificationOutbox-&gt;通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无仓储切换阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /运行时保护 active · 请求 json · 生效 json/);
  assert.match(app.byId.get("databaseState").innerHTML, /jsonPersistenceConfigured:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /禁止自动切换 · 保留 mock 回退 · 需人工批准/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无仓储运行时阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /生产仓储 ready-for-implementation/);
  assert.match(app.byId.get("databaseState").innerHTML, /提醒规则:4/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储适配器阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读冒烟 ready-for-readonly-smoke/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读操作 14 · 关键表 3 · 写操作 9/);
  assert.match(app.byId.get("databaseState").innerHTML, /readOnlyProbeOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /tableVisible:reminder_rules:read-only/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储只读冒烟阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 契约 draft-ready · postgresql · inactive/);
  assert.match(app.byId.get("databaseState").innerHTML, /listReminders:postgres-positional:draft/);
  assert.match(app.byId.get("databaseState").innerHTML, /不执行 SQL · 仅参数化值 · 不切换运行时/);
  assert.match(app.byId.get("databaseState").innerHTML, /reminder_rules \/ notification_outbox \/ audit_events/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储 SQL 契约阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /执行计划 draft-ready · inactive · 不可执行 SQL/);
  assert.match(app.byId.get("databaseState").innerHTML, /校验器 38 · 写事务 18 · 审计写 18/);
  assert.match(app.byId.get("databaseState").innerHTML, /beginTransactionForWrites:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /userId:stable-id/);
  assert.match(app.byId.get("databaseState").innerHTML, /repository\.postgres · 参数值脱敏 · Hash 链/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储执行计划阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /参数校验 draft-ready · inactive · 可本地校验/);
  assert.match(app.byId.get("databaseState").innerHTML, /校验器 38 · 类型 3/);
  assert.match(app.byId.get("databaseState").innerHTML, /stable-id \/ json-object \/ integer/);
  assert.match(app.byId.get("databaseState").innerHTML, /validStableId:通过 \/ invalidStableId:阻断/);
  assert.match(app.byId.get("databaseState").innerHTML, /sqlExecutionBlocked:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /本地校验 · 不执行 SQL · 样例脱敏/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储参数校验阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /连接池 ready-for-implementation · inactive · 不打开连接/);
  assert.match(app.byId.get("databaseState").innerHTML, /postgres · 连接已配置 · SSL required/);
  assert.match(app.byId.get("databaseState").innerHTML, /loadConnectionConfig:pass \/ validateParameters:pass \/ createPool:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionConfig:pass \/ driverAvailability:pass \/ parameterValidation:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /read committed · 读只读事务 · finally release/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储连接池阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /SQL 执行器 ready-for-implementation · inactive · 不可执行 SQL/);
  assert.match(app.byId.get("databaseState").innerHTML, /语句 34 · 绑定 38 · 脱敏 38/);
  assert.match(app.byId.get("databaseState").innerHTML, /listReminders:pg-parameter-array:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /bindParameterArray:planned \/ acquireClient:planned \/ executeClientQuery:blocked/);
  assert.match(app.byId.get("databaseState").innerHTML, /connectionPoolPlan:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储 SQL 执行器阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /结果审计 ready-for-implementation · inactive · 不映射真实行/);
  assert.match(app.byId.get("databaseState").innerHTML, /rows \/ upserted-row \/ single-row-or-null/);
  assert.match(app.byId.get("databaseState").innerHTML, /listReminders:rows-array:empty-array:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /sqlExecutorPlan:pass \/ resultShapeCoverage:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储结果审计阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /只读查询预演 ready-for-staging-rehearsal · inactive · 不运行真实查询/);
  assert.match(app.byId.get("databaseState").innerHTML, /读语句 18 · 样例 7 · 表 8/);
  assert.match(app.byId.get("databaseState").innerHTML, /listReminders:rows:rows-array:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /readOnlySmokePlan:pass \/ resultAuditPlan:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储只读查询预演阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /双读一致性 ready-for-staging-parity/);
  assert.match(app.byId.get("databaseState").innerHTML, /parityOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /reminders-&gt;提醒规则:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /createdAt \/ updatedAt \/ sentAt/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储双读一致性阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /双读证据 ready-for-evidence-capture · inactive · 不采集真实证据/);
  assert.match(app.byId.get("databaseState").innerHTML, /reminders-&gt;提醒规则:zero-mismatch:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /rowCountMismatch:blocker/);
  assert.match(app.byId.get("databaseState").innerHTML, /readRehearsalPlan:pass \/ parityPlan:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储双读证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /双写演练 ready-for-controlled-rehearsal/);
  assert.match(app.byId.get("databaseState").innerHTML, /dualWriteOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /notificationOutbox-&gt;通知投递箱:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /不切换运行时 · mock 仍为主源 · 生产仅影子写/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储双写演练阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /影子写证据 ready-for-shadow-evidence · inactive · 不写生产/);
  assert.match(app.byId.get("databaseState").innerHTML, /域 2 · 方法 4 · 幂等 2/);
  assert.match(app.byId.get("databaseState").innerHTML, /reminders-&gt;提醒规则:mock-visible-production-shadow-only:planned/);
  assert.match(app.byId.get("databaseState").innerHTML, /dualWriteRehearsalPlan:pass \/ shadowOnly:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储影子写证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /备份恢复 ready-for-backup-restore-evidence · inactive · 不执行恢复/);
  assert.match(app.byId.get("databaseState").innerHTML, /RPO 15 分钟 · RTO 30 分钟 · 恢复 2 次/);
  assert.match(app.byId.get("databaseState").innerHTML, /表 4 · 关键 2 · 校验 4/);
  assert.match(app.byId.get("databaseState").innerHTML, /restoreDryRun:restore-rehearsal:verified/);
  assert.match(app.byId.get("databaseState").innerHTML, /提醒规则 \/ 通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /backupRestoreOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储备份恢复证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /切换监控 ready-for-monitoring-evidence · inactive · 不读生产指标/);
  assert.match(app.byId.get("databaseState").innerHTML, /staging-first · 预切换 60 分钟 · 后切换 120 分钟 · 决策 15 分钟/);
  assert.match(app.byId.get("databaseState").innerHTML, /指标 5 · 表 2 · 告警 3 · 回滚 5/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditHashChainContinuity:100%:verified/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditArchive:audit-export-package:verified/);
  assert.match(app.byId.get("databaseState").innerHTML, /提醒规则 \/ 通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /monitoringOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储切换监控证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /回滚演练 ready-for-rollback-evidence · inactive · 不执行回滚/);
  assert.match(app.byId.get("databaseState").innerHTML, /截止 15 分钟 · RTO 10 分钟 · 演练 2 次/);
  assert.match(app.byId.get("databaseState").innerHTML, /路径 5 · 表 2 · 审计包 1/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditExport:5m:verified/);
  assert.match(app.byId.get("databaseState").innerHTML, /提醒规则 \/ 通知投递箱/);
  assert.match(app.byId.get("databaseState").innerHTML, /rollbackRehearsalOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储回滚演练证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /审计链 ready-for-audit-trail-evidence/);
  assert.match(app.byId.get("databaseState").innerHTML, /featureFlagChanged:repository.cutover.feature_flag_changed:verified/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditTrailOptIn:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储切换审计链证据阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /切换门禁 ready-for-manual-cutover/);
  assert.match(app.byId.get("databaseState").innerHTML, /FINANCE_AI_REPOSITORY_MODE: mock -&gt; postgres-primary/);
  assert.match(app.byId.get("databaseState").innerHTML, /humanApproval:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /backupRestore:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /monitoring:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /rollbackPlan:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /auditTrail:pass/);
  assert.match(app.byId.get("databaseState").innerHTML, /禁止自动切换 · 保留回退 · 需人工批准/);
  assert.match(app.byId.get("databaseState").innerHTML, /任一关键表读写延迟超过审批阈值/);
  assert.match(app.byId.get("databaseState").innerHTML, /暂无生产仓储切换门禁阻断项/);
  assert.match(app.byId.get("databaseState").innerHTML, /真实数据库驱动尚未接入/);
  assert.match(app.byId.get("databaseState").innerHTML, /备份恢复/);
  assert.match(app.byId.get("databaseState").innerHTML, /保留策略/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Mock 审计服务/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /json-file/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /最多 500 条/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /repository-cap-and-manual-purge/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /敏感元数据脱敏/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /生产缺口报告/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /保留清理/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /支持证据包导出/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /清理后重建 Hash 链/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Hash 链完整性/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Hash 链 verified \/ 事件 8 \/ sha256-stable-json \/ 最新 1234567890ab \/ 未发现断链/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /长期归档/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /自动保留清理/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /Mock 提醒任务运行器/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /manual-api/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /提醒评估/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /审计事件/);
  assert.match(app.byId.get("jobRunnerState").innerHTML, /重复通知窗口 900s/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Mock 后台调度服务/);
  assert.match(app.byId.get("schedulerState").innerHTML, /manual-due-check/);
  assert.match(app.byId.get("schedulerState").innerHTML, /every-15-minutes/);
  assert.match(app.byId.get("schedulerState").innerHTML, /手动到期检查/);
  assert.match(app.byId.get("schedulerState").innerHTML, /幂等窗口 600s · 冷却 60s/);
  assert.match(app.byId.get("schedulerState").innerHTML, /死信策略 sample-ready · 最多 3 次 · 重试 exponential · 基础间隔 60s · 支持重放 · 审计记录/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 遥测 sample-ready · 心跳 TTL 120s · 延迟警戒 300s · 严重 900s · 深度 25\/100 · 支持心跳 · 队列延迟/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 凭证 configured · 已配置 secret · 校验 required · 签名 hmac-sha256 · 时间窗 300s · Header x-worker-secret · 签名 Header x-worker-signature · Nonce 必填 · Nonce Header x-worker-nonce · Nonce 保留 500 · Nonce 有效 86400s · Nonce 自动清理/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Nonce 清理 sample-ready · 支持清理 · 支持手动触发 · 保留 86400s · 上限 500 · 审计记录/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列模型 sample-ready · 支持入队 · 重试 exponential · 最多 3 次 · 失败转死信 · 要求幂等/);
  assert.match(app.byId.get("schedulerState").innerHTML, /调度 provider 适配器 blocked · inactive · managed-queue-scheduler/);
  assert.match(app.byId.get("schedulerState").innerHTML, /enqueueJob:planned \/ replayDeadLetterJob:planned/);
  assert.match(app.byId.get("schedulerState").innerHTML, /marketDataRefresh:planned:market-hours-every-1-minute \/ macroDataRefresh:planned:daily-06-00/);
  assert.match(app.byId.get("schedulerState").innerHTML, /队列背压 blocked · 深度 1000 · 延迟 300s/);
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker 预检 blocked · dry-run-no-worker-start · 不启动 worker · 需人工审批/);
  assert.match(app.byId.get("schedulerState").innerHTML, /事故演练包 defined · dry-run-no-worker-incident-cutover · 演练 8 · 材料 4 · 不启用 worker · 需人工审批/);
  assert.match(app.byId.get("schedulerState").innerHTML, /providerConfig:pass \/ deadLetterQueue:blocked \/ workerHealth:blocked/);
  assert.match(app.byId.get("schedulerState").innerHTML, /暂无调度 provider 缺失环境变量/);
  assert.match(app.byId.get("accountState").innerHTML, /Mock 认证服务/);
  assert.match(app.byId.get("accountState").innerHTML, /样例登录/);
  assert.match(app.byId.get("accountState").innerHTML, /认证 provider 适配器 blocked · inactive · managed-auth-provider/);
  assert.match(app.byId.get("accountState").innerHTML, /signIn:planned \/ revokeSession:planned/);
  assert.match(app.byId.get("accountState").innerHTML, /凭证存储 blocked · dry-run-no-production-credential-storage · 不存生产凭证/);
  assert.match(app.byId.get("accountState").innerHTML, /会话安全 blocked · dry-run-no-session-hardening · 不签发生产会话/);
  assert.match(app.byId.get("accountState").innerHTML, /CSRF 防护 blocked · dry-run-no-cross-site-mutation · 不接受跨站修改/);
  assert.match(app.byId.get("accountState").innerHTML, /MFA 门禁 blocked · dry-run-no-production-mfa · 不挑战生产用户/);
  assert.match(app.byId.get("accountState").innerHTML, /邮箱验证 blocked · dry-run-no-production-email-verification · 不验证生产邮箱/);
  assert.match(app.byId.get("accountState").innerHTML, /OIDC 回调 blocked · dry-run-no-oidc-callback · 不处理生产回调/);
  assert.match(app.byId.get("accountState").innerHTML, /角色授权 blocked · dry-run-no-production-role-escalation · 不启用生产管理员角色/);
  assert.match(app.byId.get("accountState").innerHTML, /登录风控 blocked · 失败 5\/15min/);
  assert.match(app.byId.get("accountState").innerHTML, /认证审计 blocked · dry-run-no-auth-audit-release · 不发布生产认证事件/);
  assert.match(app.byId.get("accountState").innerHTML, /隐私同意 blocked · dry-run-no-privacy-release · 不发布生产隐私文案/);
  assert.match(app.byId.get("accountState").innerHTML, /认证预检 blocked · dry-run-no-provider-call · 不执行生产认证 · 需人工审批/);
  assert.match(app.byId.get("accountState").innerHTML, /providerConfig:pass \/ credentialStorage:blocked \/ sessionSecurity:blocked \/ csrfProtection:blocked \/ mfaReadiness:blocked \/ mfaPolicy:blocked \/ emailVerificationPolicy:blocked \/ oidcCallback:blocked \/ roleAuthorization:blocked \/ auditLogging:blocked \/ privacyReview:blocked/);
  assert.match(app.byId.get("accountState").innerHTML, /暂无认证 provider 缺失环境变量/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /Mock 通知投递服务/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /网页内 \/ Telegram/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /多渠道规则/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /通知 provider 适配器 blocked · inactive · managed-notification-provider/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /sendNotification:planned \/ webhookDeliveryStatus:planned/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /网页内提醒:local-ready \/ Telegram 提醒:planned/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /回执策略 blocked · webhook 验签 · 24h 幂等/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /Webhook 回执预检 blocked · dry-run-no-webhook-accept · 不接收 provider webhook · 时间窗 300s · 重放窗口 24h · event id 幂等/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /webhookSecret:pass \/ endpointRegistration:blocked \/ signatureTimestampWindow:blocked/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /投递预检 blocked · dry-run-no-external-send · 不执行外部投递 · 需人工审批/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /通知可观测证据 defined · dry-run-no-observability-cutover · 信号 8 · 看板 4 · 不启用外部投递 · 需人工审批/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /providerConfig:pass \/ permissionConsent:blocked \/ privacyReview:blocked/);
  assert.match(app.byId.get("notificationServiceState").innerHTML, /暂无通知 provider 缺失环境变量/);
});

test("market data settings separates local live quote path from production gates", () => {
  const liveApp = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiProviderStatus: JSON.stringify({
      id: "real-provider-status",
      name: "Real Provider Status",
      mode: "real-provider",
      status: "connected",
      coverage: ["us"],
      capabilities: ["marketDataAdapter"],
      marketDataAdapter: {
        id: "market-data-provider-adapter",
        name: "Market Data Provider Adapter",
        status: "blocked",
        runtimeMode: "delayed",
        requestedMode: "delayed",
        selectedProvider: "multi-free",
        configured: true,
        supported: true,
        canFetchQuotes: true,
        canReadFixtures: false,
        twelveDataConnector: {
          status: "configured",
          providerId: "twelve-data",
          functionName: "QUOTE",
          supportedMarkets: ["us"],
          plannedMarkets: ["a", "hk"],
          networkEnabled: true,
          canRequestProvider: true,
        },
        twelveDataCredentialPreflight: {
          status: "ready-for-provider-smoke",
          mode: "no-secret-credential-preflight",
          apiKeyStatus: "configured-redacted",
          networkStatus: "enabled",
          canValidateProductionKey: true,
        },
        alphaVantageConnector: {
          status: "configured",
          providerId: "alpha-vantage",
          functionName: "GLOBAL_QUOTE",
          supportedMarkets: ["a", "hk", "us"],
          networkEnabled: true,
          canRequestProvider: true,
        },
        alphaVantageCredentialPreflight: {
          status: "ready-for-provider-smoke",
          mode: "no-secret-credential-preflight",
          apiKeyStatus: "configured-redacted",
          networkStatus: "enabled",
          canValidateProductionKey: true,
        },
        requestPolicyGate: {
          status: "blocked",
          canUseProvider: false,
          canUseFixture: false,
          fallback: "empty-no-fixture",
          blockedReasons: ["缓存策略未过生产门禁。", "限流策略未过生产门禁。", "授权协议未过生产门禁。"],
        },
        safety: {
          noVendorNetworkCalls: false,
          noTradingActions: true,
        },
      },
    }),
  });

  assert.match(liveApp.byId.get("dataSourceState").innerHTML, /本地真实行情：Twelve Data \/ Alpha Vantage 可请求 quote，股票页按真实行情展示/);
  assert.match(liveApp.byId.get("dataSourceState").innerHTML, /生产门禁：blocked · 3 项阻断 · 本地 smoke 不等于正式上线/);

  const missingKeyApp = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiProviderStatus: JSON.stringify({
      id: "missing-provider-status",
      name: "Missing Provider Status",
      mode: "real-provider",
      status: "connected",
      coverage: ["us"],
      capabilities: ["marketDataAdapter"],
      marketDataAdapter: {
        id: "market-data-provider-adapter",
        name: "Market Data Provider Adapter",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "multi-free",
        configured: false,
        supported: true,
        canFetchQuotes: false,
        twelveDataConnector: {
          status: "missing-key",
          providerId: "twelve-data",
          functionName: "QUOTE",
          supportedMarkets: ["us"],
          plannedMarkets: ["a", "hk"],
          networkEnabled: true,
          canRequestProvider: false,
        },
        twelveDataCredentialPreflight: {
          status: "missing-key",
          mode: "no-secret-credential-preflight",
          apiKeyStatus: "missing",
          networkStatus: "enabled",
          canValidateProductionKey: false,
        },
        requestPolicyGate: {
          status: "blocked",
          canUseProvider: false,
          canUseFixture: false,
          fallback: "empty-no-fixture",
          blockedReasons: ["缺少 Twelve Data key。"],
        },
        safety: {
          noVendorNetworkCalls: false,
          noTradingActions: true,
        },
      },
    }),
  });

  assert.match(missingKeyApp.byId.get("dataSourceState").innerHTML, /本地真实行情：key\/网络\/provider 未全部就绪，无真实结果时保持空白/);
  assert.match(missingKeyApp.byId.get("dataSourceState").innerHTML, /生产门禁：blocked · 1 项阻断 · 本地 smoke 不等于正式上线/);
});

test("scheduler dead-letter panel refreshes and replays backend jobs", async () => {
  const requests = [];
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    schedules: [
      {
        id: "schedule-reminder-evaluation",
        jobType: "reminderEvaluation",
        cadence: "every-15-minutes",
        timezone: "Australia/Brisbane",
      },
    ],
    runSafety: {
      idempotencyWindowSeconds: 600,
      cooldownSeconds: 60,
      idempotencyKeySupported: true,
      overlappingRunsBlocked: true,
    },
    deadLetterPolicy: {
      status: "sample-ready",
      maxAttempts: 3,
      retryBackoff: "exponential",
      baseRetrySeconds: 60,
      replaySupported: true,
      requiresAuditTrail: true,
    },
    capabilities: ["deadLetterQueue", "deadLetterReplay"],
    disclaimer: "样例调度服务，不代表真实 cron。",
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET" });
        if (url.endsWith("/api/scheduler/dead-letter")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "dlq-ui-001",
                  userId: "demo-user",
                  scheduleId: "schedule-reminder-evaluation",
                  jobType: "reminderEvaluation",
                  status: "open",
                  attempts: 1,
                  maxAttempts: 3,
                  lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
                  createdAt: "2026-06-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/scheduler/dead-letter/dlq-ui-001/replay")) {
          return {
            ok: true,
            json: async () => ({
              deadLetterJob: {
                id: "dlq-ui-001",
                userId: "demo-user",
                scheduleId: "schedule-reminder-evaluation",
                jobType: "reminderEvaluation",
                status: "replayed",
                attempts: 2,
                maxAttempts: 3,
                lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
                replayedAt: "2026-06-01T00:02:00.000Z",
              },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-dead-letter]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /dlq-ui-001/);
  assert.match(app.byId.get("schedulerState").innerHTML, /重放/);
  assert.equal(JSON.parse(app.localStorage.getItem("schedulerDeadLetterJobs"))[0].id, "dlq-ui-001");

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-replay-dead-letter]", { replayDeadLetter: "dlq-ui-001" }),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /replayed/);
  assert.match(app.byId.get("statusMessage").textContent, /重放成功/);
  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://localhost:4180/api/scheduler/dead-letter",
      "POST http://localhost:4180/api/scheduler/dead-letter/dlq-ui-001/replay",
    ],
  );
});

test("scheduler dead-letter refresh ignores stale response after sign out", async () => {
  let resolveDeadLetterLoad;
  const deadLetterLoadResponse = new Promise((resolve) => {
    resolveDeadLetterLoad = resolve;
  });
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    deadLetterPolicy: {
      status: "sample-ready",
      maxAttempts: 3,
      retryBackoff: "exponential",
      baseRetrySeconds: 60,
      replaySupported: true,
      requiresAuditTrail: true,
    },
    capabilities: ["deadLetterQueue", "deadLetterReplay"],
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/dead-letter")) {
          return deadLetterLoadResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const refreshPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-dead-letter]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDeadLetterLoad({
    ok: true,
    json: async () => ({
      items: [
        {
          id: "dlq-stale-001",
          userId: "demo-user",
          scheduleId: "schedule-reminder-evaluation",
          jobType: "reminderEvaluation",
          status: "open",
          attempts: 1,
          maxAttempts: 3,
          lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    }),
  });
  await refreshPromise;

  assert.equal(app.localStorage.getItem("schedulerDeadLetterJobs"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /dlq-stale-001/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /死信队列已刷新/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler dead-letter refresh stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let deadLetterRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    deadLetterPolicy: {
      status: "sample-ready",
      maxAttempts: 3,
      retryBackoff: "exponential",
      baseRetrySeconds: 60,
      replaySupported: true,
      requiresAuditTrail: true,
    },
    capabilities: ["deadLetterQueue", "deadLetterReplay"],
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/scheduler/dead-letter")) {
          deadLetterRequested = true;
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: "dlq-token-stale-001",
                  userId: "demo-user",
                  scheduleId: "schedule-reminder-evaluation",
                  jobType: "reminderEvaluation",
                  status: "open",
                  attempts: 1,
                  maxAttempts: 3,
                  lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
                  createdAt: "2026-06-01T00:00:00.000Z",
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const refreshPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-dead-letter]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await refreshPromise;

  assert.equal(deadLetterRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.localStorage.getItem("schedulerDeadLetterJobs"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /dlq-token-stale-001/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /死信队列已刷新/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler dead-letter replay ignores stale response after sign out", async () => {
  let resolveDeadLetterReplay;
  const deadLetterReplayResponse = new Promise((resolve) => {
    resolveDeadLetterReplay = resolve;
  });
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    deadLetterPolicy: {
      status: "sample-ready",
      maxAttempts: 3,
      retryBackoff: "exponential",
      baseRetrySeconds: 60,
      replaySupported: true,
      requiresAuditTrail: true,
    },
    capabilities: ["deadLetterQueue", "deadLetterReplay"],
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
      schedulerDeadLetterJobs: JSON.stringify([
        {
          id: "dlq-stale-001",
          userId: "demo-user",
          scheduleId: "schedule-reminder-evaluation",
          jobType: "reminderEvaluation",
          status: "open",
          attempts: 1,
          maxAttempts: 3,
          lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ]),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/dead-letter/dlq-stale-001/replay")) {
          return deadLetterReplayResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const replayPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-replay-dead-letter]", {
      replayDeadLetter: "dlq-stale-001",
    }),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDeadLetterReplay({
    ok: true,
    json: async () => ({
      deadLetterJob: {
        id: "dlq-stale-001",
        userId: "demo-user",
        scheduleId: "schedule-reminder-evaluation",
        jobType: "reminderEvaluation",
        status: "replayed",
        attempts: 2,
        maxAttempts: 3,
        lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
        replayedAt: "2026-06-01T00:02:00.000Z",
      },
    }),
  });
  await replayPromise;

  assert.equal(JSON.parse(app.localStorage.getItem("schedulerDeadLetterJobs"))[0].status, "open");
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /重放成功/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler worker-health panel refreshes and records rehearsal heartbeat", async () => {
  const requests = [];
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    schedules: [
      {
        id: "schedule-reminder-evaluation",
        jobType: "reminderEvaluation",
        cadence: "every-15-minutes",
        timezone: "Australia/Brisbane",
      },
    ],
    runSafety: {
      idempotencyWindowSeconds: 600,
      cooldownSeconds: 60,
      idempotencyKeySupported: true,
      overlappingRunsBlocked: true,
    },
    deadLetterPolicy: {
      status: "sample-ready",
      maxAttempts: 3,
      retryBackoff: "exponential",
      baseRetrySeconds: 60,
      replaySupported: true,
      requiresAuditTrail: true,
    },
    workerTelemetryPolicy: {
      status: "sample-ready",
      heartbeatTtlSeconds: 120,
      queueLagWarningSeconds: 300,
      queueLagCriticalSeconds: 900,
      queueDepthWarning: 25,
      queueDepthCritical: 100,
      heartbeatSupported: true,
      queueLagMonitoringSupported: true,
    },
    capabilities: ["workerHeartbeat", "queueLagMonitoring"],
    disclaimer: "样例调度服务，不代表真实 cron。",
  };
  const workerHealth = {
    status: "degraded",
    checkedAt: "2026-06-01T00:03:00.000Z",
    workerCount: 1,
    activeWorkerCount: 1,
    staleWorkerCount: 0,
    workers: [
      {
        id: "heartbeat-ui-001",
        workerId: "local-rehearsal-reminder-worker",
        status: "warning",
        jobTypes: ["reminderEvaluation"],
        queueDepth: 12,
        queueLagMs: 360000,
        ageMs: 500,
        lastSeenAt: "2026-06-01T00:03:00.000Z",
      },
    ],
    queue: {
      status: "warning",
      totalDepth: 12,
      openDeadLetters: 0,
      pendingWork: 12,
      maxLagMs: 360000,
      warningLagMs: 300000,
      criticalLagMs: 900000,
    },
    disclaimer: "当前为本机演练 worker 心跳与队列延迟遥测，不代表真实后台 worker 已部署。",
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/scheduler/worker-health")) {
          return { ok: true, json: async () => workerHealth };
        }
        if (url.endsWith("/api/scheduler/worker-heartbeat")) {
          return {
            ok: true,
            json: async () => ({
              heartbeat: workerHealth.workers[0],
              workerHealth: {
                ...workerHealth,
                status: "healthy",
                queue: { ...workerHealth.queue, status: "healthy", pendingWork: 0, totalDepth: 0, maxLagMs: 0 },
                workers: [{ ...workerHealth.workers[0], status: "healthy", queueDepth: 0, queueLagMs: 0 }],
              },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-worker-health]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /worker degraded/);
  assert.match(app.byId.get("schedulerState").innerHTML, /local-rehearsal-reminder-worker · warning/);
  assert.equal(JSON.parse(app.localStorage.getItem("schedulerWorkerHealth")).status, "degraded");

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-record-worker-heartbeat]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /worker healthy/);
  assert.match(app.byId.get("statusMessage").textContent, /本机演练 worker 心跳已记录/);
  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://localhost:4180/api/scheduler/worker-health",
      "POST http://localhost:4180/api/scheduler/worker-heartbeat",
    ],
  );
  assert.match(requests[1].body, /local-rehearsal-reminder-worker/);
});

test("scheduler worker-health refresh ignores stale response after sign out", async () => {
  let resolveWorkerHealth;
  const workerHealthResponse = new Promise((resolve) => {
    resolveWorkerHealth = resolve;
  });
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    workerTelemetryPolicy: {
      status: "sample-ready",
      heartbeatTtlSeconds: 120,
      queueLagWarningSeconds: 300,
      queueLagCriticalSeconds: 900,
      queueDepthWarning: 25,
      queueDepthCritical: 100,
      heartbeatSupported: true,
      queueLagMonitoringSupported: true,
    },
    capabilities: ["workerHeartbeat", "queueLagMonitoring"],
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/worker-health")) {
          return workerHealthResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const refreshPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-worker-health]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveWorkerHealth({
    ok: true,
    json: async () => ({
      status: "degraded",
      checkedAt: "2026-06-01T00:03:00.000Z",
      workerCount: 1,
      activeWorkerCount: 1,
      staleWorkerCount: 0,
      workers: [
        {
          id: "heartbeat-stale-001",
          workerId: "sample-reminder-worker",
          status: "warning",
          jobTypes: ["reminderEvaluation"],
          queueDepth: 12,
          queueLagMs: 360000,
          ageMs: 500,
          lastSeenAt: "2026-06-01T00:03:00.000Z",
        },
      ],
      queue: {
        status: "warning",
        totalDepth: 12,
        openDeadLetters: 0,
        pendingWork: 12,
        maxLagMs: 360000,
        warningLagMs: 300000,
        criticalLagMs: 900000,
      },
    }),
  });
  await refreshPromise;

  assert.equal(app.localStorage.getItem("schedulerWorkerHealth"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /heartbeat-stale-001/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /worker 健康状态已刷新/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler worker heartbeat ignores stale response after sign out", async () => {
  let resolveWorkerHeartbeat;
  const workerHeartbeatResponse = new Promise((resolve) => {
    resolveWorkerHeartbeat = resolve;
  });
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    workerTelemetryPolicy: {
      status: "sample-ready",
      heartbeatTtlSeconds: 120,
      queueLagWarningSeconds: 300,
      queueLagCriticalSeconds: 900,
      queueDepthWarning: 25,
      queueDepthCritical: 100,
      heartbeatSupported: true,
      queueLagMonitoringSupported: true,
    },
    capabilities: ["workerHeartbeat", "queueLagMonitoring"],
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/worker-heartbeat")) {
          return workerHeartbeatResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const heartbeatPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-record-worker-heartbeat]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveWorkerHeartbeat({
    ok: true,
    json: async () => ({
      heartbeat: {
        id: "heartbeat-stale-001",
        workerId: "local-rehearsal-reminder-worker",
        status: "healthy",
      },
      workerHealth: {
        status: "healthy",
        checkedAt: "2026-06-01T00:04:00.000Z",
        workerCount: 1,
        activeWorkerCount: 1,
        staleWorkerCount: 0,
        workers: [
          {
            id: "heartbeat-stale-001",
            workerId: "local-rehearsal-reminder-worker",
            status: "healthy",
            jobTypes: ["reminderEvaluation"],
            queueDepth: 0,
            queueLagMs: 0,
            ageMs: 0,
            lastSeenAt: "2026-06-01T00:04:00.000Z",
          },
        ],
        queue: {
          status: "healthy",
          totalDepth: 0,
          openDeadLetters: 0,
          pendingWork: 0,
          maxLagMs: 0,
          warningLagMs: 300000,
          criticalLagMs: 900000,
        },
      },
    }),
  });
  await heartbeatPromise;

  assert.equal(app.localStorage.getItem("schedulerWorkerHealth"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /heartbeat-stale-001/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /本机演练 worker 心跳已记录|样例 worker 心跳已记录/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler queue panel refreshes and enqueues rehearsal jobs", async () => {
  const requests = [];
  const schedulerStatus = {
    id: "mock-scheduler-service",
    name: "Mock 后台调度服务",
    mode: "sample",
    status: "ready",
    executionMode: "manual-due-check",
    timezone: "Australia/Brisbane",
    schedules: [
      {
        id: "schedule-reminder-evaluation",
        jobType: "reminderEvaluation",
        cadence: "every-15-minutes",
        timezone: "Australia/Brisbane",
      },
    ],
    runSafety: {
      idempotencyWindowSeconds: 600,
      cooldownSeconds: 60,
      idempotencyKeySupported: true,
      overlappingRunsBlocked: true,
    },
    queuePolicy: {
      status: "sample-ready",
      enqueueSupported: true,
      retryBackoff: "exponential",
      maxAttempts: 3,
      deadLetterAfterMaxAttempts: true,
      requiresIdempotencyKey: true,
    },
    workerNonceMaintenancePolicy: {
      status: "sample-ready",
      cleanupSupported: true,
      retentionSeconds: 86400,
      retentionLimit: 500,
      auditTrailRequired: true,
      manualCleanupSupported: true,
    },
    capabilities: ["enqueueJob", "retrySchedule", "queueAlerts", "processQueue", "workerNonceCleanup"],
    disclaimer: "样例调度服务，不代表真实 cron。",
  };
  const queueState = {
    status: "attention",
    checkedAt: "2026-06-01T00:05:00.000Z",
    summary: {
      total: 1,
      queued: 1,
      retrying: 0,
      running: 0,
      failed: 0,
      completed: 0,
      due: 1,
      nextDueAt: "2026-06-01T00:05:00.000Z",
    },
    alerts: [
      {
        severity: "warning",
        code: "due-jobs-without-active-worker",
        message: "存在到期任务，但没有活跃 worker。",
      },
    ],
    items: [
      {
        id: "queued-ui-001",
        userId: "demo-user",
        jobType: "reminderEvaluation",
        status: "queued",
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        scheduledFor: "2026-06-01T00:05:00.000Z",
        nextRetryAt: "",
        lastError: { code: "", message: "" },
        createdAt: "2026-06-01T00:05:00.000Z",
      },
    ],
    retryPolicy: { maxAttempts: 3, retryBackoff: "exponential" },
    disclaimer: "当前为样例队列状态，不代表真实后台 worker 已部署。",
  };
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify(schedulerStatus),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/scheduler/queue")) {
          return { ok: true, json: async () => queueState };
        }
        if (url.endsWith("/api/scheduler/enqueue")) {
          return {
            ok: true,
            json: async () => ({
              queuedJob: {
                ...queueState.items[0],
                id: "queued-ui-002",
                priority: 5,
                createdAt: "2026-06-01T00:06:00.000Z",
              },
              queueState: {
                ...queueState,
                summary: { ...queueState.summary, total: 2, queued: 2, due: 2 },
              },
            }),
          };
        }
        if (url.endsWith("/api/scheduler/process-queue")) {
          return {
            ok: true,
            json: async () => ({
              queueRun: {
                id: "queue-run-ui-001",
                status: "success",
                processedJobs: 1,
                completedJobs: 1,
                retryScheduledJobs: 0,
                failedJobs: 0,
              },
              processedJobs: [
                {
                  queuedJob: {
                    ...queueState.items[0],
                    id: "queued-ui-002",
                    status: "completed",
                    attempts: 1,
                  },
                  status: "completed",
                  attempt: 1,
                },
              ],
              errors: [],
              queueState: {
                ...queueState,
                status: "ready",
                summary: {
                  ...queueState.summary,
                  queued: 1,
                  completed: 1,
                  due: 0,
                },
                alerts: [],
                items: [
                  {
                    ...queueState.items[0],
                    id: "queued-ui-002",
                    status: "completed",
                    attempts: 1,
                  },
                ],
              },
            }),
          };
        }
        if (url.endsWith("/api/scheduler/worker-nonces/cleanup")) {
          return {
            ok: true,
            json: async () => ({
              cleanupRun: {
                id: "worker-nonce-cleanup-ui-001",
                status: "success",
                checkedNonces: 3,
                prunedNonces: 2,
                remainingNonces: 1,
                retentionSeconds: 86400,
                executedAt: "2026-06-01T00:10:00.000Z",
              },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-scheduler-queue]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /队列 attention/);
  assert.match(app.byId.get("schedulerState").innerHTML, /queued-ui-001/);
  assert.match(app.byId.get("schedulerState").innerHTML, /due-jobs-without-active-worker/);
  assert.equal(JSON.parse(app.localStorage.getItem("schedulerQueueState")).items[0].id, "queued-ui-001");

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-enqueue-sample-job]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /queued-ui-002/);
  assert.match(app.byId.get("statusMessage").textContent, /本机演练队列任务已创建/);
  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://localhost:4180/api/scheduler/queue",
      "POST http://localhost:4180/api/scheduler/enqueue",
    ],
  );
  assert.match(requests[1].body, /reminderEvaluation/);
  assert.match(requests[1].body, /settings-panel-rehearsal/);

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-process-scheduler-queue]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /completed/);
  assert.match(app.byId.get("schedulerState").innerHTML, /已处理 1 个队列任务/);
  assert.match(app.byId.get("statusMessage").textContent, /队列任务已处理/);
  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://localhost:4180/api/scheduler/queue",
      "POST http://localhost:4180/api/scheduler/enqueue",
      "POST http://localhost:4180/api/scheduler/process-queue",
    ],
  );
  assert.match(requests[2].body, /manual-rehearsal-worker/);

  await app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-cleanup-worker-nonces]", {}),
  });
  assert.match(app.byId.get("schedulerState").innerHTML, /Worker nonce 清理完成：检查 3，清理 2，剩余 1/);
  assert.match(app.byId.get("statusMessage").textContent, /Worker nonce 清理完成/);
  assert.deepEqual(
    requests.map((request) => `${request.method} ${request.url}`),
    [
      "GET http://localhost:4180/api/scheduler/queue",
      "POST http://localhost:4180/api/scheduler/enqueue",
      "POST http://localhost:4180/api/scheduler/process-queue",
      "POST http://localhost:4180/api/scheduler/worker-nonces/cleanup",
    ],
  );
});

test("scheduler queue refresh ignores stale response after sign out", async () => {
  let resolveQueueRefresh;
  const queueRefreshResponse = new Promise((resolve) => {
    resolveQueueRefresh = resolve;
  });
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify({
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        queuePolicy: { status: "sample-ready", enqueueSupported: true },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/queue")) {
          return queueRefreshResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const refreshPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-refresh-scheduler-queue]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveQueueRefresh({
    ok: true,
    json: async () => ({
      status: "attention",
      summary: { total: 1, queued: 1, retrying: 0, running: 0, failed: 0, completed: 0, due: 1 },
      items: [
        {
          id: "queued-stale-001",
          userId: "demo-user",
          jobType: "reminderEvaluation",
          status: "queued",
          priority: 5,
          attempts: 0,
          maxAttempts: 3,
        },
      ],
      alerts: [],
    }),
  });
  await refreshPromise;

  assert.equal(app.localStorage.getItem("schedulerQueueState"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /queued-stale-001/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /队列任务已刷新/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler queue enqueue ignores stale response after sign out", async () => {
  let resolveQueueEnqueue;
  const queueEnqueueResponse = new Promise((resolve) => {
    resolveQueueEnqueue = resolve;
  });
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify({
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        queuePolicy: { status: "sample-ready", enqueueSupported: true },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/enqueue")) {
          return queueEnqueueResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const enqueuePromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-enqueue-sample-job]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveQueueEnqueue({
    ok: true,
    json: async () => ({
      queuedJob: {
        id: "queued-stale-002",
        userId: "demo-user",
        jobType: "reminderEvaluation",
        status: "queued",
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
      },
      queueState: {
        status: "attention",
        summary: { total: 1, queued: 1, retrying: 0, running: 0, failed: 0, completed: 0, due: 1 },
        items: [],
        alerts: [],
      },
    }),
  });
  await enqueuePromise;

  assert.equal(app.localStorage.getItem("schedulerQueueState"), null);
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /queued-stale-002/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /本机演练队列任务已创建|样例队列任务已创建/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("scheduler queue process ignores stale response after sign out", async () => {
  let resolveQueueProcess;
  const queueProcessResponse = new Promise((resolve) => {
    resolveQueueProcess = resolve;
  });
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify({
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        queuePolicy: { status: "sample-ready", enqueueSupported: true },
      }),
      schedulerQueueState: JSON.stringify({
        status: "attention",
        summary: { total: 1, queued: 1, retrying: 0, running: 0, failed: 0, completed: 0, due: 1 },
        items: [
          {
            id: "queued-open-001",
            userId: "demo-user",
            jobType: "reminderEvaluation",
            status: "queued",
            priority: 5,
            attempts: 0,
            maxAttempts: 3,
          },
        ],
        alerts: [],
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/process-queue")) {
          return queueProcessResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const processPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-process-scheduler-queue]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveQueueProcess({
    ok: true,
    json: async () => ({
      queueRun: {
        id: "queue-run-stale-001",
        status: "success",
        processedJobs: 1,
        completedJobs: 1,
        retryScheduledJobs: 0,
        failedJobs: 0,
      },
      queueState: {
        status: "ready",
        summary: { total: 1, queued: 0, retrying: 0, running: 0, failed: 0, completed: 1, due: 0 },
        items: [
          {
            id: "queued-open-001",
            userId: "demo-user",
            jobType: "reminderEvaluation",
            status: "completed",
            priority: 5,
            attempts: 1,
            maxAttempts: 3,
          },
        ],
        alerts: [],
      },
    }),
  });
  await processPromise;

  assert.equal(JSON.parse(app.localStorage.getItem("schedulerQueueState")).items[0].status, "queued");
  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /completed/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /队列任务已处理/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("worker nonce cleanup ignores stale success response after sign out", async () => {
  let resolveNonceCleanup;
  const nonceCleanupResponse = new Promise((resolve) => {
    resolveNonceCleanup = resolve;
  });
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify({
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        workerAuthPolicy: {
          status: "configured",
          validationMode: "required",
          nonceCleanupSupported: true,
        },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/worker-nonces/cleanup")) {
          return nonceCleanupResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const cleanupPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-cleanup-worker-nonces]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveNonceCleanup({
    ok: true,
    json: async () => ({
      cleanupRun: {
        id: "worker-nonce-cleanup-stale-001",
        status: "success",
        checkedNonces: 5,
        prunedNonces: 4,
        remainingNonces: 1,
      },
    }),
  });
  await cleanupPromise;

  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /Worker nonce 清理完成/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /Worker nonce 清理完成/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("worker nonce cleanup ignores stale error response after sign out", async () => {
  let resolveNonceCleanup;
  const nonceCleanupResponse = new Promise((resolve) => {
    resolveNonceCleanup = resolve;
  });
  const app = createHarness(
    {
      apiMode: "local",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiSchedulerStatus: JSON.stringify({
        id: "mock-scheduler-service",
        name: "Mock 后台调度服务",
        mode: "sample",
        status: "ready",
        workerAuthPolicy: {
          status: "configured",
          validationMode: "required",
          nonceCleanupSupported: true,
        },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/scheduler/worker-nonces/cleanup")) {
          return nonceCleanupResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const cleanupPromise = app.byId.get("schedulerState").dispatch("click", {
    target: eventTargetFor("[data-cleanup-worker-nonces]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveNonceCleanup({
    ok: false,
    status: 500,
    json: async () => ({
      error: { message: "stale nonce cleanup failure" },
    }),
  });
  await cleanupPromise;

  assert.doesNotMatch(app.byId.get("schedulerState").innerHTML, /stale nonce cleanup failure/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /Worker nonce 清理失败/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("news intelligence panel saves and refreshes backend persisted records", async () => {
  const requestedUrls = [];
  const provider = {
    id: "mock",
    name: "Mock Sample Provider",
    mode: "sample",
    status: "connected",
    coverage: ["a", "hk", "us"],
    capabilities: ["newsFilingsAdapter", "fixtureNewsIntelligenceRead"],
    newsFilingsAdapter: {
      id: "news-filings-provider-adapter",
      name: "News, Filings, and Public Statements Adapter Skeleton",
      status: "blocked",
      runtimeMode: "inactive",
      selectedNewsProvider: "licensed-news-filings",
      selectedStatementProvider: "verified-public-statements",
      canFetchLiveNews: false,
      canReadFixtures: true,
      processing: {
        deduplication: "normalized-title-related-tickers",
        sourceCredibility: "fixture-source-classification",
        importanceScoring: "explainable-weighted-score-v1",
        persistence: "mock-repository-on-demand",
      },
      fixtureReadModel: {
        status: "available",
        newsCount: 4,
        filingCount: 3,
        publicStatementCount: 3,
        markets: ["a", "hk", "us"],
      },
      endpointContracts: [
        {
          id: "importantNews",
          method: "listImportantNews",
          status: "planned",
          fixtureStatus: "available",
        },
      ],
      disclaimer: "样例新闻情报读取。",
    },
  };
  const savedRecord = {
    id: "news-us-001",
    market: "us",
    symbol: "AAPL",
    title: "大型科技公司继续加码 AI 基础设施投资",
    source: { label: "CEO / 公司动态" },
    importanceScore: 80,
    sourceCredibilityScore: 78,
    scoreVersion: "explainable-weighted-score-v1",
    deduplicationVersion: "normalized-title-related-tickers",
    reviewStatus: "unreviewed",
    persistedAt: "2026-06-01T00:00:00.000Z",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiProviderStatus: JSON.stringify(provider),
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/news/intelligence/persist")) {
          return {
            ok: true,
            json: async () => ({
              count: 1,
              saved: [savedRecord],
              processing: { importanceScoring: "explainable-weighted-score-v1" },
            }),
          };
        }
        if (url.includes("/api/news/intelligence/history")) {
          return { ok: true, json: async () => ({ items: [savedRecord] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  assert.match(app.byId.get("dataSourceState").innerHTML, /保存当前股票新闻情报/);
  await app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-save-news-intelligence]", {}),
  });
  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/news/intelligence/persist?market=us&symbol=AAPL&minImportance=70",
    ),
  );
  assert.equal(JSON.parse(app.localStorage.getItem("newsIntelligenceRecords"))[0].id, "news-us-001");
  assert.match(app.byId.get("dataSourceState").innerHTML, /已保存 1 条新闻情报记录/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /重要性 80\/100/);

  await app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-refresh-news-intelligence]", {}),
  });
  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/news/intelligence/history?market=us&symbol=AAPL&limit=20",
    ),
  );
  assert.match(app.byId.get("statusMessage").textContent, /已刷新新闻情报历史记录/);
});

test("news intelligence save ignores stale response after stock switch", async () => {
  let resolvePersist;
  const persistResponse = new Promise((resolve) => {
    resolvePersist = resolve;
  });
  const savedRecord = {
    id: "news-us-stale",
    market: "us",
    symbol: "AAPL",
    title: "Apple 旧请求新闻情报",
    importanceScore: 80,
    sourceCredibilityScore: 78,
  };
  const provider = {
    id: "mock",
    name: "Mock Sample Provider",
    mode: "sample",
    status: "connected",
    coverage: ["a", "hk", "us"],
    capabilities: ["newsFilingsAdapter", "fixtureNewsIntelligenceRead"],
    newsFilingsAdapter: {
      id: "news-filings-provider-adapter",
      name: "News, Filings, and Public Statements Adapter Skeleton",
      status: "blocked",
      runtimeMode: "inactive",
      selectedNewsProvider: "licensed-news-filings",
      selectedStatementProvider: "verified-public-statements",
      canFetchLiveNews: false,
      canReadFixtures: true,
      fixtureReadModel: {
        status: "available",
        newsCount: 4,
        filingCount: 3,
        publicStatementCount: 3,
        markets: ["a", "hk", "us"],
      },
    },
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiProviderStatus: JSON.stringify(provider),
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/news/intelligence/persist")) {
          return persistResponse;
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["切换股票测试分析"],
              risks: ["样例风险"],
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/news")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const savePromise = app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-save-news-intelligence]", {}),
  });
  await Promise.resolve();
  assert.match(app.byId.get("dataSourceState").innerHTML, /正在保存 Apple 的新闻情报/);

  app.tabButtons[0].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.match(app.byId.get("dataSourceState").innerHTML, /上一轮新闻情报同步结果会被忽略/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /data-save-news-intelligence type="button">/);

  resolvePersist({
    ok: true,
    json: async () => ({
      count: 1,
      saved: [savedRecord],
      processing: { importanceScoring: "explainable-weighted-score-v1" },
    }),
  });
  await savePromise;

  assert.equal(app.localStorage.getItem("newsIntelligenceRecords"), null);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /Apple 旧请求新闻情报/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /新闻情报已保存到后端样例仓储/);
});

test("news intelligence history refresh ignores stale response after stock switch", async () => {
  let resolveHistory;
  const historyResponse = new Promise((resolve) => {
    resolveHistory = resolve;
  });
  const provider = {
    id: "mock",
    name: "Mock Sample Provider",
    mode: "sample",
    status: "connected",
    coverage: ["a", "hk", "us"],
    capabilities: ["newsFilingsAdapter", "fixtureNewsIntelligenceRead"],
    newsFilingsAdapter: {
      id: "news-filings-provider-adapter",
      name: "News, Filings, and Public Statements Adapter Skeleton",
      status: "blocked",
      runtimeMode: "inactive",
      selectedNewsProvider: "licensed-news-filings",
      selectedStatementProvider: "verified-public-statements",
      canFetchLiveNews: false,
      canReadFixtures: true,
      fixtureReadModel: {
        status: "available",
        newsCount: 4,
        filingCount: 3,
        publicStatementCount: 3,
        markets: ["a", "hk", "us"],
      },
    },
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiProviderStatus: JSON.stringify(provider),
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/news/intelligence/history")) {
          return historyResponse;
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["刷新历史切换测试分析"],
              risks: ["样例风险"],
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/news")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const refreshPromise = app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-refresh-news-intelligence]", {}),
  });
  await Promise.resolve();
  assert.match(app.byId.get("dataSourceState").innerHTML, /正在读取 Apple 的已保存新闻情报/);

  app.tabButtons[0].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");

  resolveHistory({
    ok: true,
    json: async () => ({
      items: [
        {
          id: "news-us-refresh-stale",
          market: "us",
          symbol: "AAPL",
          title: "Apple 旧刷新记录",
          importanceScore: 80,
          sourceCredibilityScore: 78,
        },
      ],
    }),
  });
  await refreshPromise;

  assert.equal(app.localStorage.getItem("newsIntelligenceRecords"), null);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /Apple 旧刷新记录/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /已刷新新闻情报历史记录/);
});

test("compliance acknowledgement control records user risk confirmation", async () => {
  const requested = [];
  const complianceService = {
    id: "mock-compliance-service",
    name: "Mock 合规策略服务",
    mode: "sample",
    status: "planning",
    reviewMode: "policy-gate",
    requiredDisclaimer: "本内容仅供学习和研究参考，不构成任何投资建议。",
    prohibitedClaims: ["保证收益", "必须买入"],
    outputPolicy: { probabilityLanguage: "模型参考概率", forbidsGuaranteedReturns: true },
    acknowledgementPolicy: {
      version: "compliance-ack-v0",
      requiresRiskAcknowledgement: true,
      requiresOptionalPortfolioNotice: true,
      recordsDisclosureVersion: true,
      blocksPublicReleaseWithoutReview: true,
    },
    suitabilityPolicy: {
      version: "suitability-v0",
      requiredFields: [
        "riskTolerance",
        "investmentExperience",
        "investmentHorizon",
        "liquidityNeed",
      ],
      scoringMode: "sample-rule-based",
      blocksPublicReleaseWithoutReview: true,
    },
    complianceGate: {
      status: "blocked",
      canReleasePublicAnalysis: false,
      checks: [
        { id: "riskAcknowledgement", status: "blocked" },
        { id: "suitabilityQuestionnaire", status: "blocked" },
      ],
      blockedReasons: ["用户风险确认、免责声明确认和版本记录尚未完成。"],
    },
    capabilities: ["requiredDisclaimer", "riskAcknowledgement", "suitabilityQuestionnaire"],
    missingProductionCapabilities: ["legalReviewWorkflow"],
    disclaimer: "当前为样例合规策略服务。",
  };
  const savedAck = {
    id: "compliance-ack-001",
    userId: "demo-user",
    version: "compliance-ack-v0",
    acceptedDisclaimer: true,
    riskAcknowledged: true,
    optionalPortfolioNoticeAcknowledged: true,
    source: "settings-panel",
    acceptedAt: "2026-06-01T00:00:00.000Z",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      prototypeAccountState: "authenticated",
      apiComplianceServiceStatus: JSON.stringify(complianceService),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requested.push({ url, options });
        if (url.endsWith("/api/compliance/acknowledgements")) {
          assert.equal(options.method, "POST");
          assert.equal(options.headers.authorization, "Bearer demo-token");
          const body = JSON.parse(options.body);
          assert.equal(body.version, "compliance-ack-v0");
          assert.equal(body.acceptedDisclaimer, true);
          assert.equal(body.riskAcknowledged, true);
          return {
            ok: true,
            json: async () => ({ saved: savedAck, latest: savedAck }),
          };
        }
        return { ok: true, json: async () => ({ items: [savedAck], latest: savedAck }) };
      },
    },
  );

  assert.match(app.byId.get("complianceServiceState").innerHTML, /确认免责声明和市场风险/);
  await app.byId.get("complianceServiceState").dispatch("click", {
    target: eventTargetFor("[data-save-compliance-ack]", {}),
  });
  assert.ok(requested.some((request) => request.url.endsWith("/api/compliance/acknowledgements")));
  assert.equal(
    JSON.parse(app.localStorage.getItem("complianceAcknowledgements"))[0].id,
    "compliance-ack-001",
  );
  assert.match(app.byId.get("complianceServiceState").innerHTML, /最近确认 compliance-ack-v0/);
  assert.match(app.byId.get("statusMessage").textContent, /风险确认已记录/);
});

test("suitability questionnaire control saves user profile and renders feedback", async () => {
  const requested = [];
  const complianceService = {
    id: "mock-compliance-service",
    name: "Mock 合规策略服务",
    mode: "sample",
    status: "planning",
    reviewMode: "policy-gate",
    requiredDisclaimer: "本内容仅供学习和研究参考，不构成任何投资建议。",
    prohibitedClaims: ["保证收益", "必须买入"],
    outputPolicy: { probabilityLanguage: "模型参考概率", forbidsGuaranteedReturns: true },
    acknowledgementPolicy: {
      version: "compliance-ack-v0",
      requiresRiskAcknowledgement: true,
      requiresOptionalPortfolioNotice: true,
      recordsDisclosureVersion: true,
      blocksPublicReleaseWithoutReview: true,
    },
    suitabilityPolicy: {
      version: "suitability-v0",
      requiredFields: [
        "riskTolerance",
        "investmentExperience",
        "investmentHorizon",
        "liquidityNeed",
      ],
      scoringMode: "sample-rule-based",
      blocksPublicReleaseWithoutReview: true,
    },
    complianceGate: {
      status: "blocked",
      canReleasePublicAnalysis: false,
      checks: [{ id: "suitabilityQuestionnaire", status: "blocked" }],
      blockedReasons: ["适当性问卷、风险画像和展示策略尚未完成。"],
    },
    capabilities: ["requiredDisclaimer", "riskAcknowledgement", "suitabilityQuestionnaire"],
    missingProductionCapabilities: ["legalReviewWorkflow"],
    disclaimer: "当前为样例合规策略服务。",
  };
  const savedQuestionnaire = {
    id: "suitability-001",
    userId: "demo-user",
    version: "suitability-v0",
    answers: {
      riskTolerance: "medium",
      investmentExperience: "new",
      investmentHorizon: "medium",
      liquidityNeed: "medium",
    },
    score: 55,
    suitabilityLevel: "balanced",
    levelLabel: "平衡型",
    completedAt: "2026-06-01T00:00:00.000Z",
    disclaimer: "适当性问卷为样例风险画像，不构成投资建议。",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      prototypeAccountState: "authenticated",
      apiComplianceServiceStatus: JSON.stringify(complianceService),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requested.push({ url, options });
        if (url.endsWith("/api/compliance/suitability") && options.method === "POST") {
          assert.equal(options.headers.authorization, "Bearer demo-token");
          const body = JSON.parse(options.body);
          assert.equal(body.version, "suitability-v0");
          assert.deepEqual(
            {
              riskTolerance: body.riskTolerance,
              investmentExperience: body.investmentExperience,
              investmentHorizon: body.investmentHorizon,
              liquidityNeed: body.liquidityNeed,
            },
            savedQuestionnaire.answers,
          );
          return {
            ok: true,
            json: async () => ({ saved: savedQuestionnaire, latest: savedQuestionnaire }),
          };
        }
        if (url.includes("/api/compliance/suitability")) {
          return {
            ok: true,
            json: async () => ({ items: [], latest: null }),
          };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  assert.match(app.byId.get("complianceServiceState").innerHTML, /适当性问卷/);
  await app.byId.get("complianceServiceState").dispatch("click", {
    target: eventTargetFor("[data-save-suitability]", {}),
  });
  assert.ok(requested.some((request) => request.url.endsWith("/api/compliance/suitability")));
  assert.equal(
    JSON.parse(app.localStorage.getItem("suitabilityQuestionnaires"))[0].id,
    "suitability-001",
  );
  assert.match(app.byId.get("complianceServiceState").innerHTML, /最近问卷 suitability-v0/);
  assert.match(app.byId.get("complianceServiceState").innerHTML, /平衡型/);
  assert.match(app.byId.get("statusMessage").textContent, /适当性问卷已保存/);
});

test("compliance acknowledgement save ignores stale response after sign out", async () => {
  let resolveSave;
  const saveResponse = new Promise((resolve) => {
    resolveSave = resolve;
  });
  const complianceService = {
    id: "mock-compliance-service",
    name: "Mock 合规策略服务",
    mode: "sample",
    status: "planning",
    reviewMode: "policy-gate",
    requiredDisclaimer: "本内容仅供学习和研究参考，不构成任何投资建议。",
    prohibitedClaims: ["保证收益"],
    outputPolicy: { probabilityLanguage: "模型参考概率", forbidsGuaranteedReturns: true },
    acknowledgementPolicy: {
      version: "compliance-ack-v0",
      requiresRiskAcknowledgement: true,
      requiresOptionalPortfolioNotice: true,
      recordsDisclosureVersion: true,
      blocksPublicReleaseWithoutReview: true,
    },
    suitabilityPolicy: { version: "suitability-v0", requiredFields: [] },
    complianceGate: { status: "blocked", canReleasePublicAnalysis: false, checks: [] },
    capabilities: ["riskAcknowledgement", "suitabilityQuestionnaire"],
  };
  const savedAck = {
    id: "compliance-ack-stale",
    userId: "demo-user",
    version: "compliance-ack-v0",
    acceptedDisclaimer: true,
    riskAcknowledged: true,
    optionalPortfolioNoticeAcknowledged: true,
    source: "settings-panel",
    acceptedAt: "2026-06-01T00:00:00.000Z",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      prototypeAccountState: "authenticated",
      apiComplianceServiceStatus: JSON.stringify(complianceService),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/compliance/acknowledgements") && options.method === "POST") {
          return saveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  const savePromise = app.byId.get("complianceServiceState").dispatch("click", {
    target: eventTargetFor("[data-save-compliance-ack]", {}),
  });
  await Promise.resolve();
  assert.match(app.byId.get("complianceServiceState").innerHTML, /正在记录风险确认/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveSave({
    ok: true,
    json: async () => ({ saved: savedAck, latest: savedAck }),
  });
  await savePromise;

  assert.equal(app.localStorage.getItem("complianceAcknowledgements"), null);
  assert.doesNotMatch(app.byId.get("complianceServiceState").innerHTML, /最近确认 compliance-ack-v0/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /风险确认已记录/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("compliance acknowledgement save stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let compliancePostRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const complianceService = {
    id: "mock-compliance-service",
    name: "Mock 合规策略服务",
    mode: "sample",
    status: "planning",
    reviewMode: "policy-gate",
    requiredDisclaimer: "本内容仅供学习和研究参考，不构成任何投资建议。",
    prohibitedClaims: ["保证收益"],
    outputPolicy: { probabilityLanguage: "模型参考概率", forbidsGuaranteedReturns: true },
    acknowledgementPolicy: {
      version: "compliance-ack-v0",
      requiresRiskAcknowledgement: true,
      requiresOptionalPortfolioNotice: true,
      recordsDisclosureVersion: true,
      blocksPublicReleaseWithoutReview: true,
    },
    suitabilityPolicy: { version: "suitability-v0", requiredFields: [] },
    complianceGate: { status: "blocked", canReleasePublicAnalysis: false, checks: [] },
    capabilities: ["riskAcknowledgement", "suitabilityQuestionnaire"],
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiComplianceServiceStatus: JSON.stringify(complianceService),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/compliance/acknowledgements") && options.method === "POST") {
          compliancePostRequested = true;
          return { ok: true, json: async () => ({ saved: { id: "late-ack" } }) };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  const savePromise = app.byId.get("complianceServiceState").dispatch("click", {
    target: eventTargetFor("[data-save-compliance-ack]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await savePromise;

  assert.equal(compliancePostRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.localStorage.getItem("complianceAcknowledgements"), null);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /风险确认已记录/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("suitability questionnaire save ignores stale response after sign out", async () => {
  let resolveSave;
  const saveResponse = new Promise((resolve) => {
    resolveSave = resolve;
  });
  const complianceService = {
    id: "mock-compliance-service",
    name: "Mock 合规策略服务",
    mode: "sample",
    status: "planning",
    reviewMode: "policy-gate",
    requiredDisclaimer: "本内容仅供学习和研究参考，不构成任何投资建议。",
    prohibitedClaims: ["保证收益"],
    outputPolicy: { probabilityLanguage: "模型参考概率", forbidsGuaranteedReturns: true },
    acknowledgementPolicy: { version: "compliance-ack-v0" },
    suitabilityPolicy: {
      version: "suitability-v0",
      requiredFields: [
        "riskTolerance",
        "investmentExperience",
        "investmentHorizon",
        "liquidityNeed",
      ],
      scoringMode: "sample-rule-based",
    },
    complianceGate: { status: "blocked", canReleasePublicAnalysis: false, checks: [] },
    capabilities: ["riskAcknowledgement", "suitabilityQuestionnaire"],
  };
  const savedQuestionnaire = {
    id: "suitability-stale",
    userId: "demo-user",
    version: "suitability-v0",
    answers: {
      riskTolerance: "medium",
      investmentExperience: "new",
      investmentHorizon: "medium",
      liquidityNeed: "medium",
    },
    score: 55,
    suitabilityLevel: "balanced",
    levelLabel: "平衡型",
    completedAt: "2026-06-01T00:00:00.000Z",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      prototypeAccountState: "authenticated",
      apiComplianceServiceStatus: JSON.stringify(complianceService),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/compliance/suitability") && options.method === "POST") {
          return saveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  const savePromise = app.byId.get("complianceServiceState").dispatch("click", {
    target: eventTargetFor("[data-save-suitability]", {}),
  });
  await Promise.resolve();
  assert.match(app.byId.get("complianceServiceState").innerHTML, /正在保存适当性问卷/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveSave({
    ok: true,
    json: async () => ({ saved: savedQuestionnaire, latest: savedQuestionnaire }),
  });
  await savePromise;

  assert.equal(app.localStorage.getItem("suitabilityQuestionnaires"), null);
  assert.doesNotMatch(app.byId.get("complianceServiceState").innerHTML, /最近问卷 suitability-v0/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /适当性问卷已保存/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("connected backend news loads through API on startup", async () => {
  const requestedUrls = [];
  const filingFixture = {
    items: [
      {
        title: "Microsoft 10-K filing",
        source: { label: "SEC EDGAR" },
        importanceScore: 81,
        sourceCredibilityScore: 86,
        publishedAt: "2026-06-12T08:00:00.000Z",
      },
    ],
  };
  const statementFixture = {
    items: [
      {
        title: "Microsoft CEO public statement",
        source: { label: "公开言论来源" },
        importanceScore: 77,
        sourceCredibilityScore: 79,
        publishedAt: "2026-06-13T09:00:00.000Z",
      },
    ],
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/api/news/intelligence?market=us&symbol=MSFT&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "Microsoft 个股情报",
                  source: { label: "Yahoo Finance RSS" },
                  importanceScore: 83,
                  sourceCredibilityScore: 84,
                  sourceCount: 1,
                  publishedAt: "2026-06-13T10:00:00.000Z",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news/filings?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => filingFixture };
        }
        if (url.endsWith("/api/public-statements?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => statementFixture };
        }
        if (url.endsWith("/api/news?market=us&symbol=MSFT")) {
          return {
            ok: true,
            json: async () => ({
              market: "us",
              sourceStatus: "real-provider",
              items: [
                {
                  title: "API 启动新闻",
                  source: "API 源",
                  importance: 91,
                  publishedAt: "2026-06-13T07:00:00.000Z",
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  assert.ok(requestedUrls.includes("http://localhost:4180/api/news?market=us&symbol=MSFT"));
  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/news/intelligence?market=us&symbol=MSFT&minImportance=70",
    ),
  );
  assert.ok(requestedUrls.includes("http://localhost:4180/api/news/filings?market=us&symbol=MSFT"));
  assert.ok(
    requestedUrls.includes("http://localhost:4180/api/public-statements?market=us&symbol=MSFT"),
  );
  assert.match(app.byId.get("newsList").innerHTML, /Microsoft 个股情报/);
  assert.match(app.byId.get("newsList").innerHTML, /来源可信度 84\/100/);
  assert.match(app.byId.get("newsList").innerHTML, /Microsoft 10-K filing/);
  assert.match(app.byId.get("newsList").innerHTML, /公司公告/);
  assert.match(app.byId.get("newsList").innerHTML, /Microsoft CEO public statement/);
  assert.match(app.byId.get("newsList").innerHTML, /公开言论/);
  assert.match(app.byId.get("newsList").innerHTML, /API 启动新闻/);
  assert.match(app.byId.get("newsList").innerHTML, /重要性 91\/100/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /新闻更新/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /公告更新/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /公开言论更新/);
});

test("connected backend news loading state explains requested sources and filtering progress", async () => {
  let resolveMarketNews;
  const marketNewsResponse = new Promise((resolve) => {
    resolveMarketNews = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news?market=us&symbol=MSFT")) {
          return marketNewsResponse;
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadNews();
  const loadingHtml = app.byId.get("newsList").innerHTML;
  assert.match(loadingHtml, /正在更新财经新闻/);
  assert.match(loadingHtml, /已请求 4 个来源：市场新闻、个股情报、公告、公开言论/);
  assert.match(loadingHtml, /当前已返回：0 条/);
  assert.match(loadingHtml, /正在过滤：等待来源返回后按公司名、ticker、产品词、公告和公开言论筛选/);
  assert.match(loadingHtml, /来源结果：市场新闻 pending · 0 条/);
  assert.doesNotMatch(loadingHtml, /暂未发现高重要性新闻/);

  resolveMarketNews({
    ok: true,
    json: async () => ({
      market: "us",
      sourceStatus: "real-provider",
      items: [],
    }),
  });
  await loadPromise;
});

test("connected backend news summarizes and collapses long news lists", async () => {
  const marketNewsItems = Array.from({ length: 8 }, (_, index) => ({
    title: `市场新闻 ${index + 1}`,
    source: "API 源",
    importance: 90 - index,
  }));
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news?market=us&symbol=MSFT")) {
          return {
            ok: true,
            json: async () => ({
              market: "us",
              sourceStatus: "real-provider",
              items: marketNewsItems,
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  const newsList = app.byId.get("newsList");
  assert.match(newsList.innerHTML, /news-summary/);
  assert.match(newsList.innerHTML, /后端真实数据通道/);
  assert.match(newsList.innerHTML, /8 条/);
  assert.match(newsList.innerHTML, /另有 8 条已折叠/);
  assert.equal((newsList.innerHTML.match(/<article class="news-item"/g) || []).length, 8);
  assert.equal((newsList.innerHTML.match(/<details class="news-more">/g) || []).length, 1);
  assert.doesNotMatch(newsList.innerHTML, /<details class="news-more" open/);
  assert.match(newsList.innerHTML, /未发现公司直接新闻；行业和市场背景已折叠/);
  assert.ok(newsList.innerHTML.indexOf("<details") < newsList.innerHTML.indexOf("市场新闻 1"));
  assert.match(newsList.innerHTML, /市场新闻 8/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /新闻\s*已连接/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /新闻\s*待真实数据/);
});

test("connected backend news prioritizes direct stock relevance and labels weak sources", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news/intelligence?market=us&symbol=MSFT&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "Microsoft Azure demand lifts cloud outlook",
                  source: { label: "低可信博客" },
                  importanceScore: 83,
                  sourceCredibilityScore: 62,
                },
                {
                  title: "Meta Platforms receives bullish analyst note",
                  source: { label: "Yahoo Finance RSS" },
                  importanceScore: 82,
                  sourceCredibilityScore: 82,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news?market=us&symbol=MSFT")) {
          return {
            ok: true,
            json: async () => ({
              market: "us",
              sourceStatus: "real-provider",
              items: [
                { title: "Ryanair says travel demand is steady", source: "API 源", importance: 92 },
                { title: "Cadence Design Systems rises after artificial intelligence chip demand", source: "API 源", importance: 92 },
                { title: "Nvidia supplier capacity tightens for AI chips", source: "API 源", importance: 91 },
                { title: "Microsoft announces new Copilot enterprise tools", source: "API 源", importance: 80 },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  const html = app.byId.get("newsList").innerHTML;
  assert.match(html, /默认只显示/);
  assert.match(html, /news-group-title/);
  assert.match(html, /公司直接新闻（1）/);
  assert.match(html, /公司直接新闻/);
  assert.match(html, /辅助参考/);
  assert.match(html, /供应链\/监管新闻/);
  assert.match(html, /行业新闻|市场相关/);
  assert.match(html, /市场相关/);
  assert.match(html, /相关性：命中公司英文名：Microsoft|来自个股情报接口；命中公司英文名：Microsoft/);
  assert.match(html, /来源可信度偏低，仅作辅助参考/);
  assert.match(html, /当前评分 62\/100 低于 70 分阈值/);
  assert.match(html, /不直接推动结论/);
  const beforeFold = html.slice(0, html.indexOf("<details"));
  assert.match(beforeFold, /Microsoft announces new Copilot/);
  assert.doesNotMatch(
    beforeFold,
    /Microsoft Azure demand|Ryanair says travel demand|Cadence Design Systems|Nvidia supplier capacity|Meta Platforms receives/,
  );
  const folded = html.slice(html.indexOf("<details"));
  assert.match(folded, /Microsoft Azure demand/);
  assert.match(folded, /辅助参考/);
  assert.match(html, /来自个股情报接口；未直接命中公司中文名、公司英文名、股票代码或产品关键词/);
  assert.match(html, /展开另外 5 条新闻/);
});

test("connected backend news explains exact relevance match type for Moutai items", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news/intelligence?market=a&symbol=600519&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "Kweichow Moutai channel inventory improves",
                  source: { label: "Yahoo Finance RSS" },
                  importanceScore: 84,
                  sourceCredibilityScore: 82,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news?market=a&symbol=600519")) {
          return {
            ok: true,
            json: async () => ({
              market: "a",
              sourceStatus: "real-provider",
              items: [
                {
                  title: "600519 distributor policy update",
                  source: "API 源",
                  importance: 78,
                  sourceCredibilityScore: 80,
                },
                {
                  title: "Premium liquor channel checks improve",
                  source: "API 源",
                  importance: 76,
                  sourceCredibilityScore: 80,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news/filings?market=a&symbol=600519")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "贵州茅台关于召开股东大会的公告",
                  source: { label: "上海证券交易所公告" },
                  importanceScore: 82,
                  sourceCredibilityScore: 95,
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  const html = app.byId.get("newsList").innerHTML;
  assert.match(html, /命中公司英文名：Kweichow Moutai/);
  assert.match(html, /命中股票代码：600519/);
  assert.match(html, /命中供应链\/监管关键词：premium liquor channel/);
  assert.match(html, /命中公告接口：来自当前股票公告接口/);
});

test("connected backend news dedupes repeated folded headlines before display", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news?market=us&symbol=MSFT")) {
          return {
            ok: true,
            json: async () => ({
              market: "us",
              sourceStatus: "real-provider",
              items: [
                { title: "Microsoft expands Azure AI capacity", source: "API 源", importance: 86 },
                { title: "Cadence Design Systems rises after artificial intelligence chip demand", source: "API 源", importance: 91 },
                { title: "Cadence Design Systems rises after artificial intelligence chip demand", source: "Google News", importance: 89 },
                { title: "Ryanair says travel demand is steady", source: "API 源", importance: 88 },
                { title: "Ryanair says travel demand is steady", source: "Yahoo Finance RSS", importance: 80 },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  const html = app.byId.get("newsList").innerHTML;
  assert.match(html, /已去重 2/);
  assert.match(html, /展开另外 2 条新闻/);
  assert.equal((html.match(/Cadence Design Systems rises/g) || []).length, 1);
  assert.equal((html.match(/Ryanair says travel demand is steady/g) || []).length, 1);
  const beforeFold = html.slice(0, html.indexOf("<details"));
  assert.match(beforeFold, /Microsoft expands Azure AI capacity/);
  assert.doesNotMatch(beforeFold, /Cadence Design Systems|Ryanair says/);
});

test("connected backend news shows provider relay failure instead of vague pending state", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news?market=us")) {
          return { ok: true, json: async () => ({ market: "us", sourceStatus: "real-provider", items: [] }) };
        }
        if (url.endsWith("/api/news/intelligence?market=us&symbol=MSFT&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "no-real-data",
              items: [],
              sourceStatus: "provider-error-empty-no-fixture",
              providerError: { code: "ALPHA_VANTAGE_NEWS_EMPTY", message: "Alpha quota limited." },
              providerRelay: {
                attemptedProviders: ["alpha-vantage-news", "gdelt-doc-news"],
                failedProviders: ["ALPHA_VANTAGE_NEWS_EMPTY", "GDELT_NEWS_TIMEOUT"],
              },
            }),
          };
        }
        if (url.endsWith("/api/news/filings?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/public-statements?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  assert.match(app.byId.get("stockCoverageNote").textContent, /新闻\s*额度\/超时/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /新闻\s*待真实数据/);
  assert.match(app.byId.get("newsList").innerHTML, /新闻额度\/超时/);
  assert.match(app.byId.get("newsList").innerHTML, /alpha-vantage-news -&gt; gdelt-doc-news/);
  assert.match(app.byId.get("newsList").innerHTML, /GDELT_NEWS_TIMEOUT/);
  assert.match(app.byId.get("newsList").innerHTML, /已请求来源：市场新闻、个股情报、公告、公开言论/);
  assert.match(app.byId.get("newsList").innerHTML, /返回条数：0/);
  assert.match(app.byId.get("newsList").innerHTML, /过滤掉：0 条/);
  assert.match(app.byId.get("newsList").innerHTML, /最后更新时间：/);
});

test("news load ignores stale response after same-market stock switch", async () => {
  let resolveAppleNews;
  const appleNewsResponse = new Promise((resolve) => {
    resolveAppleNews = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/news?market=us")) {
          return {
            ok: true,
            json: async () => ({
              market: "us",
              sourceStatus: "sample",
              items: [{ title: "美股市场新闻", source: "API 源", importance: 73 }],
            }),
          };
        }
        if (url.endsWith("/api/news/intelligence?market=us&symbol=AAPL&minImportance=70")) {
          return appleNewsResponse;
        }
        if (url.endsWith("/api/news/filings?market=us&symbol=AAPL")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/public-statements?market=us&symbol=AAPL")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/news/intelligence?market=us&symbol=MSFT&minImportance=70")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: "Microsoft 个股情报",
                  source: { label: "公司动态" },
                  importanceScore: 82,
                  sourceCredibilityScore: 80,
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/news/filings?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/public-statements?market=us&symbol=MSFT")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({
              results: [{ code: "MSFT", name: "Microsoft", market: "us" }],
            }),
          };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              upsideProbability: 60,
              downsideProbability: 40,
              sentimentScore: 68,
              valuationScore: 50,
              technicalScore: 64,
              actionReference: "Microsoft 后端分析。",
              reasons: ["Microsoft 分析原因"],
              risks: ["Microsoft 风险"],
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const staleNewsPromise = app.context.window.financeAIAssistantApp.loadNews();
  await Promise.resolve();
  app.byId.get("stockSearch").value = "MSFT";
  await app.byId.get("searchButton").dispatch("click");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(app.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
  assert.match(app.byId.get("newsList").innerHTML, /Microsoft 个股情报/);

  resolveAppleNews({
    ok: true,
    json: async () => ({
      items: [
        {
          title: "Apple 旧个股情报",
          source: { label: "公司动态" },
          importanceScore: 90,
          sourceCredibilityScore: 88,
        },
      ],
    }),
  });
  await staleNewsPromise;

  assert.match(app.byId.get("newsList").innerHTML, /Microsoft 个股情报/);
  assert.doesNotMatch(app.byId.get("newsList").innerHTML, /Apple 旧个股情报/);
});

test("connected backend news failure keeps strict real-data empty state", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async () => {
        throw new Error("新闻 API 断开");
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNews();

  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.match(app.byId.get("newsList").innerHTML, /暂未发现高重要性新闻|暂无真实新闻数据|新闻接口不可用/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("statusMessage").textContent, /新闻 API 暂时不可用/);
});

test("connected backend stock search selects API result", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({
              query: "Apple",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "AAPL", name: "Apple", market: "us" }],
            }),
          };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: { message: "真实 AI 分析 API 暂时不可用。" },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return {
          ok: true,
          json: async () => ({ market: "a", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("stockSearch").value = "Apple";
  await app.byId.get("searchButton").click();

  assert.ok(requestedStockSearchUrl(requestedUrls, "Apple"));
  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /coverage-chip/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /股票\s*代码目录识别/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情\s*待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /新闻\s*待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /公告\s*待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /宏观\s*待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情更新：待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /新闻更新：待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /公告更新：待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /宏观更新：待真实数据/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /AI\s*待配置模型/);
  assert.equal(app.localStorage.getItem("selectedMarket"), "us");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(app.byId.get("statusMessage").textContent, /代码目录/);
  assert.match(app.byId.get("statusMessage").textContent, /行情、新闻、公告、宏观和 AI 分析仍需真实数据源/);
});

test("backend stock search works before connected health state is cached", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({
              query: "NVDA",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "NVDA", name: "NVIDIA", market: "us", source: "metadata-only-catalog" }],
            }),
          };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: { message: "真实 AI 分析 API 暂时不可用。" },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "empty-real-data", items: [] }),
        };
      },
    },
  );

  app.byId.get("stockSearch").value = "NVDA";
  await app.byId.get("searchButton").click();

  assert.equal(app.localStorage.getItem("apiHealthStatus"), null);
  assert.ok(requestedStockSearchUrl(requestedUrls, "NVDA"));
  assert.equal(app.byId.get("selectedStockName").textContent, "NVIDIA · NVDA");
  assert.match(app.byId.get("statusMessage").textContent, /后端 API/);
});

test("connected backend stock search selects catalog-only result outside local samples", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({
              query: "NVDA",
              sourceStatus: "metadata-only-catalog",
              results: [{ code: "NVDA", name: "NVIDIA", market: "us", source: "metadata-only-catalog" }],
            }),
          };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: { message: "真实 AI 分析 API 暂时不可用。" },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "empty-real-data", items: [] }),
        };
      },
    },
  );

  app.byId.get("stockSearch").value = "NVDA";
  await app.byId.get("searchButton").click();

  assert.ok(requestedStockSearchUrl(requestedUrls, "NVDA"));
  assert.equal(app.byId.get("selectedStockName").textContent, "NVIDIA · NVDA");
  assert.equal(app.localStorage.getItem("selectedMarket"), "us");
  assert.match(app.localStorage.getItem("selectedStockMetadata"), /NVDA/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /股票\s*代码目录识别/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情\s*待真实数据/);
  assert.match(app.byId.get("statusMessage").textContent, /股票代码目录/);
});

test("connected backend stock search empty result preserves current stock", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/stocks/search")) {
          return {
            ok: true,
            json: async () => ({ query: "NO_MATCH", results: [] }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("stockSearch").value = "NO_MATCH";
  await app.byId.get("searchButton").click();

  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("statusMessage").textContent, /未找到/);
  assert.match(app.byId.get("statusMessage").className, /warning/);
});

test("connected backend stock search failure preserves current stock without sample fallback", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/stocks/search")) {
          throw new Error("股票搜索 API 断开");
        }
        return {
          ok: true,
          json: async () => ({ market: "a", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("stockSearch").value = "腾讯控股";
  await app.byId.get("searchButton").click();

  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.notEqual(app.byId.get("selectedStockName").textContent, "腾讯控股 · 0700");
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("statusMessage").textContent, /股票 API 暂时不可用/);
});

test("connected backend analysis loads through API", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
      riskProfile: "aggressive",
      portfolio: JSON.stringify({ buyPrice: "220", holdingQty: "1", maxLoss: "8" }),
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "aggressive",
              upsideProbability: 73,
              downsideProbability: 27,
              sentimentScore: 77,
              valuationScore: 49,
              technicalScore: 74,
              actionReference: "API 分析建议：等待突破确认后分批观察。",
              reasons: ["API 原因一", "API 原因二"],
              risks: ["API 风险提示"],
              history: [
                { label: "周一", price: 190 },
                { label: "周二", price: 196 },
                { label: "周三", price: 200 },
              ],
              historySource: {
                label: "API 真实行情",
                frequency: "日度真实历史",
                updatedAt: "2026-06-01",
                mode: "real-provider",
              },
              tradePlan: {
                mode: "model-reference",
                stance: "分批观察",
                currentPrice: 200,
                entryZone: { low: 194, high: 204 },
                addOnTrigger: 208,
                reduceTrigger: 185,
                stopLoss: 180,
                takeProfit: 236,
                positionSizing: "API 仓位提示：单次不超过计划仓位 30%。",
                holdingHorizon: "1-6 周观察",
                rationale: "API 操作边界说明。",
                disclaimer: "仅为模型参考边界，不构成投资建议或收益承诺。",
              },
              scenarioAnalysis: {
                mode: "model-reference",
                horizon: "1-6 周观察",
                cases: [
                  {
                    key: "bull",
                    label: "乐观情景",
                    probability: 54,
                    targetPrice: 226,
                    expectedReturnPct: 13,
                    summary: "API 乐观情景说明",
                  },
                  {
                    key: "base",
                    label: "基准情景",
                    probability: 26,
                    targetPrice: 205,
                    expectedReturnPct: 2.5,
                    summary: "API 基准情景说明",
                  },
                  {
                    key: "bear",
                    label: "悲观情景",
                    probability: 20,
                    targetPrice: 181,
                    expectedReturnPct: -9.5,
                    summary: "API 悲观情景说明",
                  },
                ],
                disclaimer: "情景概率和目标价为真实模型参考，不构成收益预测。",
              },
              factorBreakdown: [
                {
                  key: "macro",
                  label: "宏观经济",
                  score: 68,
                  weight: 20,
                  summary: "API 宏观样例说明",
                },
                {
                  key: "industry",
                  label: "行业分析",
                  score: 72,
                  weight: 18,
                  summary: "API 行业样例说明",
                },
                {
                  key: "fundamentals",
                  label: "公司基本盘",
                  score: 70,
                  weight: 22,
                  summary: "API 基本盘样例说明",
                },
              ],
              analysisProcess: {
                version: "multi-agent-analysis-v1",
                mode: "rule-based-reference-no-live-model",
                agents: [
                  {
                    role: "macro",
                    label: "宏观分析师",
                    status: "ready-with-sample-evidence",
                    conclusion: "API 宏观分析过程说明",
                    confidence: 68,
                    evidenceCount: 3,
                  },
                  {
                    role: "sentiment",
                    label: "情绪新闻分析师",
                    status: "ready-with-sample-evidence",
                    conclusion: "API 情绪新闻分析过程说明",
                    confidence: 77,
                    evidenceCount: 3,
                  },
                ],
                debate: {
                  bull: { label: "多头研究员", thesis: "API 多头论点", probability: 54 },
                  bear: { label: "空头研究员", thesis: "API 空头论点", probability: 20 },
                },
                synthesis: {
                  manager: "API 研究经理综合结论",
                  riskReview: "API 风控复核提示",
                  portfolioReview: "API 组合复核提示",
                },
                evidenceCoverage: {
                  readySourceCount: 3,
                  missingSourceCount: 1,
                  missingSources: ["宏观真实数据"],
                },
                confidence: 72,
                disclaimer: "多智能体分析过程仅解释模型参考。",
              },
              inputCoverage: {
                macro: "sample",
                news: "fixture-linked",
                filings: "fixture-linked",
                publicStatements: "fixture-linked",
                compliance: "acknowledged-versioned-record",
              },
              sourceRefs: [
                {
                  type: "news",
                  title: "Apple AI infrastructure",
                  sourceLabel: "公司动态",
                  importanceScore: 80,
                  sourceCredibilityScore: 78,
                },
                {
                  type: "filing",
                  title: "Apple quarterly filing",
                  sourceLabel: "交易所公告",
                  importanceScore: 84,
                  sourceCredibilityScore: 86,
                },
                {
                  type: "statement",
                  title: "CEO comments on AI privacy",
                  sourceLabel: "Mock 公开言论样例",
                  importanceScore: 77,
                  sourceCredibilityScore: 80,
                },
                {
                  type: "news",
                  title: "Apple low-credibility market blog",
                  sourceLabel: "低可信博客",
                  importanceScore: 76,
                  sourceCredibilityScore: 62,
                },
              ],
              informationFlowImpact: {
                score: 84,
                sentimentTilt: "positive",
                probabilityAdjustment: 4,
                sentimentAdjustment: 5,
                confidenceAdjustment: 4,
                sourceCount: 3,
                summary: "已关联 3 条样例信息源，整体偏正面，轻度上调模型参考概率。",
              },
              portfolioContext: {
                source: "backend-saved",
                inputCoverage: "backend-saved-position",
                filledFields: 3,
                estimatedReturnPct: -10.91,
              },
              complianceContext: {
                status: "acknowledged",
                required: true,
                requiredVersion: "compliance-ack-v0",
                acknowledged: true,
                inputCoverage: "acknowledged-versioned-record",
                message: "已记录 compliance-ack-v0 版本的免责声明和市场风险确认。",
                disclaimer: "风险确认记录不代表适当性评估或投资建议，用户仍需独立判断。",
                latestAcknowledgement: {
                  id: "compliance-ack-001",
                  version: "compliance-ack-v0",
                  acceptedAt: "2026-06-01T00:00:00.000Z",
                  source: "settings-panel",
                },
              },
              disclaimer: "模型参考，不构成投资建议或收益承诺。",
            }),
          };
        }
        if (url.includes("/api/macro/context")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider",
              region: "us",
              summary: "美国宏观数据更新。",
              factorScore: 66,
              asOf: "2026-06-12T00:00:00.000Z",
              source: { label: "FRED", asOf: "2026-06-12T00:00:00.000Z" },
              indicators: [{ indicatorId: "fed-funds", value: 5.25, asOf: "2026-06-12T00:00:00.000Z" }],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/analysis?symbol=AAPL&riskProfile=aggressive",
    ),
  );
  assert.equal(app.byId.get("upsideValue").textContent, "73%");
  assert.equal(app.byId.get("downsideValue").textContent, "27%");
  assert.equal(app.byId.get("sentimentScore").textContent, "77/100");
  assert.match(app.byId.get("stockCoverageNote").textContent, /完整 AI\s*待配置模型/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /宏观更新/);
  assert.match(app.byId.get("actionText").textContent, /API 分析建议/);
  assert.doesNotMatch(app.byId.get("actionText").textContent, /最大可接受亏损/);
  assert.equal(app.byId.get("tradePlan").hidden, false);
  assert.match(app.byId.get("tradePlan").innerHTML, /操作边界/);
  assert.match(app.byId.get("tradePlan").innerHTML, /当前参考价/);
  assert.doesNotMatch(app.byId.get("tradePlan").innerHTML, /样例现价/);
  assert.match(app.byId.get("tradePlan").innerHTML, /分批观察/);
  assert.match(app.byId.get("tradePlan").innerHTML, /194\.0-204\.0/);
  assert.match(app.byId.get("tradePlan").innerHTML, /止损边界/);
  assert.match(app.byId.get("tradePlan").innerHTML, /API 仓位提示/);
  assert.match(app.byId.get("reasonList").innerHTML, /API 原因一/);
  assert.match(app.byId.get("riskText").textContent, /API 风险提示/);
  assert.match(app.byId.get("trendSummary").textContent, /周一 至 周三 上涨 \+5.26%/);
  assert.match(app.byId.get("trendSource").textContent, /API 真实行情/);
  assert.equal(app.byId.get("scenarioAnalysis").hidden, false);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /未来情景/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /乐观情景/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /54%/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /226\.0/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /API 悲观情景说明/);
  assert.equal(app.byId.get("factorBreakdown").hidden, false);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /六因子拆解/);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /宏观经济/);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /68\/100/);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /API 基本盘样例说明/);
  assert.equal(app.byId.get("analysisProcess").hidden, false);
  assert.match(app.byId.get("analysisProcess").innerHTML, /分析过程/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /宏观分析师/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /情绪新闻分析师/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /多空辩论/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /API 多头论点/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /API 研究经理综合结论/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /API 风控复核提示/);
  assert.match(app.byId.get("analysisProcess").innerHTML, /证据覆盖：已就绪 3 类，缺失 1 类/);
  assert.equal(app.byId.get("analysisBasis").hidden, false);
  assert.match(app.byId.get("analysisBasis").innerHTML, /分析输入覆盖/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /新闻：fixture-linked/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /持仓：backend-saved-position/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /合规确认：acknowledged-versioned-record/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /合规确认/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /已确认/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /版本：compliance-ack-v0/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /不代表适当性评估/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /信息流影响/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /概率调整：\+4%/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /已关联 3 条样例信息源/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /关键新闻 · Apple AI infrastructure/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /公司公告 · Apple quarterly filing/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /公开言论 · CEO comments on AI privacy/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /可信度 78\/100/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /Apple low-credibility market blog/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /来源可信度偏低，仅作辅助参考/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /当前评分 62\/100 低于 70 分阈值/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /不直接推动结论/);
});

test("real-data rule reference analysis is not labeled as full AI generation", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              modelReference: true,
              analysisMode: "real-data-rule-reference",
              upsideProbability: 48,
              downsideProbability: 52,
              sentimentScore: 50,
              valuationScore: 56,
              technicalScore: 29,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["真实行情和公开信息输入有限，使用规则参考。"],
              risks: ["真实 AI 模型未参与本次概率计算。"],
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                history: "backend-real-provider-history",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
              analysisService: {
                id: "real-data-rule-reference",
                mode: "real-data-rule-reference",
                model: "deterministic-real-data-v1",
              },
              modelIssue: {
                code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                message: "主模型返回 429，备用模型额度也已触发，已改用真实数据规则参考概率。",
              },
              providerRelay: {
                attempted: ["gpt-5.5", "gemini-2.5-flash"],
                fallbackUsed: true,
                primaryErrorCode: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                fallbackErrorCodes: [
                  {
                    model: "gemini-2.5-flash",
                    code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                    finalReason: "额度或速率受限",
                    callStatus: "调用失败",
                    outputStatus: "无输出",
                    validationStatus: "未进入校验",
                    retryable: true,
                    retryAfterSeconds: 600,
                    retryAt: new Date(Date.now() + 600000).toISOString(),
                    nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
                  },
                ],
                attempts: [
                  {
                    role: "主模型",
                    model: "gpt-5.5",
                    code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                    finalReason: "主模型额度不足",
                    callStatus: "调用失败",
                    outputStatus: "无输出",
                    validationStatus: "未进入校验",
                    retryable: true,
                    retryAfterSeconds: 3600,
                    retryAt: new Date(Date.now() + 3600000).toISOString(),
                    nextStep: "检查主模型账户额度或账单；继续尝试备用模型。",
                  },
                  {
                    role: "备用 1",
                    model: "gemini-2.5-flash",
                    code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                    finalReason: "额度或速率受限",
                    callStatus: "调用失败",
                    outputStatus: "无输出",
                    validationStatus: "未进入校验",
                    retryable: true,
                    retryAfterSeconds: 600,
                    retryAt: new Date(Date.now() + 600000).toISOString(),
                    nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
                  },
                ],
              },
              disclaimer: "真实数据规则参考仅供研究辅助，不构成投资建议。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              quote: {
                symbol: "MSFT",
                price: 510,
                source: { type: "real-provider-quote", label: "Real Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ market: "us", sourceStatus: "no-real-data", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("upsideValue").textContent, "48%");
  assert.equal(app.byId.get("downsideValue").textContent, "52%");
  assert.match(app.byId.get("stockCoverageNote").textContent, /规则参考\s*已生成/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /完整 AI\s*未生成/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /规则参考\s*待AI模型/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /真实数据规则参考/);
  assert.equal(app.byId.get("impactBadge").textContent, "规则参考");
  assert.equal(app.byId.get("analysisState").hidden, false);
  assert.match(app.byId.get("analysisState").innerHTML, /当前仅为规则分析/);
  assert.match(app.byId.get("analysisState").innerHTML, /真实数据规则参考/);
  assert.match(app.byId.get("analysisState").innerHTML, /不是完整真实 AI 模型输出/);
  assert.match(app.byId.get("analysisState").innerHTML, /analysis-mode-tag is-rule/);
  assert.match(app.byId.get("analysisState").innerHTML, /analysis-mode-tag is-ai-pending/);
  assert.match(app.byId.get("analysisState").innerHTML, /analysis-mode-tag is-data-rule/);
  assert.match(app.byId.get("analysisState").innerHTML, /完整 AI 未生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /基于真实数据规则计算/);
  assert.match(app.byId.get("analysisState").innerHTML, /原因：主模型额度不足，备用模型限流或校验失败/);
  assert.match(app.byId.get("analysisState").innerHTML, /查看简要原因/);
  assert.match(app.byId.get("analysisState").innerHTML, /恢复提示：等待冷却结束后再检测完整 AI/);
  assert.match(app.byId.get("analysisState").innerHTML, /当前没有未冷却备用模型可立即继续检查/);
  assert.match(app.byId.get("analysisState").innerHTML, /模型接力/);
  assert.match(app.byId.get("analysisState").innerHTML, /gpt-5\.5 -&gt; gemini-2\.5-flash/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用结果/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用 1[\s\S]*gemini-2\.5-flash[\s\S]*额度或速率受限/);
  assert.match(app.byId.get("analysisState").innerHTML, /调用失败 \/ 无输出 \/ 未进入校验/);
  assert.match(app.byId.get("analysisState").innerHTML, /失败原因/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用模型限流/);
  assert.match(app.byId.get("analysisState").innerHTML, /冷却提示/);
  assert.match(app.byId.get("analysisState").innerHTML, /上次失败时间/);
  assert.match(app.byId.get("analysisState").innerHTML, /建议重试时间/);
  assert.match(app.byId.get("analysisState").innerHTML, /Provider 冷却/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用尝试/);
  assert.match(app.byId.get("analysisState").innerHTML, /未受限备用模型可立即继续检查/);
  assert.match(app.byId.get("analysisState").innerHTML, /建议等待约|建议 \d/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用槽位/);
  assert.match(app.byId.get("analysisState").innerHTML, /第一备用：gemini-2\.5-flash/);
  assert.match(app.byId.get("analysisState").innerHTML, /第二备用：OpenRouter 免费模型|第二备用：google\/gemini/);
  assert.match(app.byId.get("analysisState").innerHTML, /第三备用：Groq 免费模型|第三备用：llama/);
  assert.match(app.byId.get("analysisState").innerHTML, /剩余额度/);
  assert.match(app.byId.get("analysisState").innerHTML, /Provider 未返回剩余额度/);
  assert.match(app.byId.get("analysisState").innerHTML, /展开技术诊断/);
  assert.match(app.byId.get("analysisState").innerHTML, /REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA/);
  assert.match(app.byId.get("actionText").textContent, /真实数据规则参考/);
});

test("full real AI analysis shows generated state and safety repair success", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              modelReference: true,
              upsideProbability: 59,
              downsideProbability: 41,
              sentimentScore: 62,
              valuationScore: 55,
              technicalScore: 58,
              confidenceScore: 64,
              actionReference: "模型参考：保持观察，等待更多真实证据确认。",
              reasons: ["完整真实 AI 输出已通过结构化校验。"],
              risks: ["模型概率不代表收益保证。"],
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                news: "backend-real-provider-news",
                model: "real-provider-model",
              },
              analysisService: {
                id: "real-ai-analysis",
                mode: "real-provider",
                model: "gpt-5.5",
              },
              providerRelay: {
                attempted: ["gpt-5.5"],
                used: "gpt-5.5",
                fallbackUsed: false,
                attempts: [
                  {
                    role: "主模型",
                    model: "gpt-5.5",
                    code: "",
                    callStatus: "调用成功",
                    outputStatus: "完整 AI 输出可用",
                    validationStatus: "校验通过",
                    finalReason: "完整 AI 分析已生成",
                    retryable: false,
                    retryAfterSeconds: 0,
                    cooldownStatus: "not-required",
                    safetyRepairAttempted: true,
                    safetyRepairStatus: "repair-passed",
                    nextStep: "显示完整 AI 分析。",
                  },
                ],
              },
              factorBreakdown: [
                { key: "macro", label: "宏观经济", score: 62, weight: 15, summary: "宏观年度数据中性。" },
              ],
              scenarioAnalysis: {
                horizon: "2-8 周",
                cases: [{ key: "base", label: "基准", probability: 45, summary: "震荡。" }],
              },
              disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              quote: {
                symbol: "MSFT",
                price: 510,
                source: { type: "real-provider-quote", label: "Real Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  const html = app.byId.get("analysisState").innerHTML;
  assert.equal(app.byId.get("analysisState").hidden, false);
  assert.match(html, /完整 AI 分析已生成/);
  assert.match(html, /主模型生成成功/);
  assert.match(html, /gpt-5\.5/);
  assert.match(html, /安全改写已通过并完成二次校验/);
  assert.doesNotMatch(html, /当前仅为规则分析|完整 AI 未生成/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /规则参考\s*未单独生成/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /完整 AI\s*已生成/);
});

test("AI relay slot summary keeps safety failure distinct from provider rate limits", async () => {
  const now = Date.now();
  const attempts = [
    {
      role: "主模型",
      model: "gpt-5.5",
      code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
      finalReason: "主模型额度不足",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 30000).toISOString(),
      retryAfterSeconds: 3600,
      retryAt: new Date(now + 3600000).toISOString(),
      cooldownStatus: "cooldown-active",
      nextStep: "检查主模型账户额度或账单；继续尝试备用模型。",
    },
    {
      role: "备用 1",
      model: "gemini-2.5-flash",
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      finalReason: "额度或速率受限",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 25000).toISOString(),
      retryAfterSeconds: 600,
      retryAt: new Date(now + 600000).toISOString(),
      cooldownStatus: "cooldown-active",
      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
    },
    {
      role: "备用 2",
      model: "qwen/qwen3-next-80b-a3b-instruct:free",
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      finalReason: "额度或速率受限",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 20000).toISOString(),
      retryAfterSeconds: 600,
      retryAt: new Date(now + 600000).toISOString(),
      cooldownStatus: "cooldown-active",
      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
    },
    {
      role: "备用 3",
      model: "llama-3.1-8b-instant",
      code: "REAL_AI_MODEL_MISSING_METRICS",
      finalReason: "输出未通过安全校验",
      callStatus: "调用成功",
      outputStatus: "结构化输出不完整",
      validationStatus: "安全校验未通过",
      retryable: false,
      failedAt: new Date(now - 15000).toISOString(),
      safetyRepairAttempted: true,
      safetyRepairStatus: "repair-failed",
      metricRepairAttempted: true,
      metricRepairStatus: "repair-failed",
      nextStep: "已尝试安全改写；仍失败时降级为规则参考。",
    },
  ];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              modelReference: true,
              analysisMode: "real-data-rule-reference",
              upsideProbability: 48,
              downsideProbability: 52,
              sentimentScore: 50,
              valuationScore: 56,
              technicalScore: 29,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["真实 AI 接力未完成，当前使用规则参考。"],
              risks: ["完整 AI 模型仍待生成。"],
              inputCoverage: { marketData: "backend-real-provider-quote", model: "real-data-rule-reference" },
              modelIssue: {
                code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                message: "主模型额度不足，备用模型限流，第三备用未通过安全校验。",
              },
              providerRelay: {
                attempted: attempts.map((attempt) => attempt.model),
                fallbackUsed: true,
                primaryErrorCode: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                fallbackErrorCodes: [
                  { model: "gemini-2.5-flash", code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA" },
                  { model: "qwen/qwen3-next-80b-a3b-instruct:free", code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA" },
                  { model: "llama-3.1-8b-instant", code: "REAL_AI_MODEL_MISSING_METRICS" },
                ],
                attempts,
              },
              disclaimer: "真实数据规则参考仅供研究辅助。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: { symbol: "MSFT", price: 510, source: { type: "real-provider-quote" } } }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  const html = app.byId.get("analysisState").innerHTML;
  assert.match(html, /第三备用：llama-3\.1-8b-instant · 输出未通过安全校验/);
  assert.doesNotMatch(html, /第三备用：llama-3\.1-8b-instant · 已尝试，额度\/速率受限/);
  assert.match(html, /备用 3[\s\S]*llama-3\.1-8b-instant[\s\S]*输出未通过安全校验/);
  assert.match(html, /调用成功 \/ 结构化输出不完整 \/ 安全校验未通过/);
  assert.match(html, /安全修复:repair-failed/);
  assert.match(html, /指标修复:repair-failed/);
  assert.match(html, /上次失败[\s\S]*后重试/);
  assert.match(html, /上次失败时间/);
  assert.match(html, /建议重试时间/);
  assert.match(html, /Provider 冷却/);
  assert.match(html, /备用尝试/);
  assert.match(html, /未受限备用模型可立即继续检查/);
  assert.match(html, /已记录 3 个 provider 的失败\/冷却时间/);
  assert.doesNotMatch(html, /当前没有本机冷却计时/);
});

test("AI relay compact summary does not misread safety repair not-required as safety failure", async () => {
  const now = Date.now();
  const attempts = [
    {
      role: "主模型",
      model: "gpt-5.5",
      code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
      finalReason: "主模型额度不足",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 30000).toISOString(),
      retryAfterSeconds: 3600,
      retryAt: new Date(now + 3600000).toISOString(),
      cooldownStatus: "cooldown-active",
      safetyRepairStatus: "not-required",
      nextStep: "检查主模型账户额度或账单；继续尝试备用模型。",
    },
    {
      role: "备用 1",
      model: "gemini-2.5-flash",
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      finalReason: "额度或速率受限",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 25000).toISOString(),
      retryAfterSeconds: 600,
      retryAt: new Date(now + 600000).toISOString(),
      cooldownStatus: "cooldown-active",
      safetyRepairStatus: "not-required",
      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
    },
    {
      role: "备用 2",
      model: "qwen/qwen3-next-80b-a3b-instruct:free",
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      finalReason: "额度或速率受限",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 20000).toISOString(),
      retryAfterSeconds: 600,
      retryAt: new Date(now + 600000).toISOString(),
      cooldownStatus: "cooldown-active",
      safetyRepairStatus: "not-required",
      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
    },
    {
      role: "备用 3",
      model: "llama-3.1-8b-instant",
      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
      finalReason: "额度或速率受限",
      callStatus: "调用失败",
      outputStatus: "无输出",
      validationStatus: "未进入校验",
      retryable: true,
      failedAt: new Date(now - 15000).toISOString(),
      retryAfterSeconds: 600,
      retryAt: new Date(now + 600000).toISOString(),
      cooldownStatus: "cooldown-active",
      safetyRepairStatus: "not-required",
      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
    },
  ];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              modelReference: true,
              analysisMode: "real-data-rule-reference",
              upsideProbability: 48,
              downsideProbability: 52,
              sentimentScore: 50,
              valuationScore: 56,
              technicalScore: 29,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["真实 AI 接力未完成，当前使用规则参考。"],
              risks: ["完整 AI 模型仍待生成。"],
              inputCoverage: { marketData: "backend-real-provider-quote", model: "real-data-rule-reference" },
              modelIssue: {
                code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                message: "主模型额度不足，备用模型全部限流。",
              },
              providerRelay: {
                attempted: attempts.map((attempt) => attempt.model),
                fallbackUsed: true,
                primaryErrorCode: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                fallbackErrorCode: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                fallbackErrorCodes: attempts.slice(1).map((attempt) => ({
                  model: attempt.model,
                  code: attempt.code,
                  finalReason: attempt.finalReason,
                  callStatus: attempt.callStatus,
                  outputStatus: attempt.outputStatus,
                  validationStatus: attempt.validationStatus,
                  retryable: attempt.retryable,
                  retryAfterSeconds: attempt.retryAfterSeconds,
                  failedAt: attempt.failedAt,
                  retryAt: attempt.retryAt,
                  cooldownStatus: attempt.cooldownStatus,
                  safetyRepairStatus: attempt.safetyRepairStatus,
                  nextStep: attempt.nextStep,
                })),
                attempts,
              },
              disclaimer: "真实数据规则参考仅供研究辅助。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: { symbol: "MSFT", price: 510, source: { type: "real-provider-quote" } } }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  const html = app.byId.get("analysisState").innerHTML;
  assert.match(html, /原因：主模型额度不足，备用模型限流或校验失败/);
  assert.match(html, /恢复提示：等待冷却结束后再检测完整 AI/);
  assert.match(html, /当前没有未冷却备用模型可立即继续检查/);
  assert.match(html, /备用 3[\s\S]*llama-3\.1-8b-instant[\s\S]*额度或速率受限/);
  assert.match(html, /调用失败 \/ 无输出 \/ 未进入校验/);
  assert.match(html, /安全修复:not-required/);
  assert.match(html, /Provider 冷却/);
  assert.doesNotMatch(html, /原因：备用模型输出未通过安全校验/);
  assert.doesNotMatch(html, /llama-3\.1-8b-instant[\s\S]*输出未通过安全校验/);
});

test("AI relay slot summary honors legacy fallback error final reasons", async () => {
  const now = Date.now();
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "MSFT",
              riskProfile: "balanced",
              modelReference: true,
              analysisMode: "real-data-rule-reference",
              upsideProbability: 48,
              downsideProbability: 52,
              sentimentScore: 50,
              valuationScore: 56,
              technicalScore: 29,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["旧格式 providerRelay 未返回 attempts。"],
              risks: ["完整 AI 模型仍待生成。"],
              inputCoverage: { marketData: "backend-real-provider-quote", model: "real-data-rule-reference" },
              modelIssue: {
                code: "REAL_AI_MODEL_MISSING_METRICS",
                message: "第三备用输出未通过安全校验。",
              },
              providerRelay: {
                attempted: [
                  "gpt-5.5",
                  "gemini-2.5-flash",
                  "qwen/qwen3-next-80b-a3b-instruct:free",
                  "llama-3.1-8b-instant",
                ],
                fallbackUsed: true,
                primaryErrorCode: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                fallbackErrorCodes: [
                  {
                    model: "gemini-2.5-flash",
                    code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                    finalReason: "额度或速率受限",
                    retryable: true,
                    retryAfterSeconds: 600,
                    failedAt: new Date(now - 25000).toISOString(),
                    retryAt: new Date(now + 600000).toISOString(),
                    cooldownStatus: "cooldown-active",
                  },
                  {
                    model: "qwen/qwen3-next-80b-a3b-instruct:free",
                    code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                    finalReason: "额度或速率受限",
                    retryable: true,
                    retryAfterSeconds: 600,
                    failedAt: new Date(now - 20000).toISOString(),
                    retryAt: new Date(now + 600000).toISOString(),
                    cooldownStatus: "cooldown-active",
                  },
                  {
                    model: "llama-3.1-8b-instant",
                    code: "REAL_AI_MODEL_MISSING_METRICS",
                    callStatus: "调用成功",
                    outputStatus: "结构化输出不完整",
                    validationStatus: "安全校验未通过",
                    finalReason: "输出未通过安全校验",
                    retryable: false,
                    failedAt: new Date(now - 15000).toISOString(),
                    safetyRepairAttempted: true,
                    safetyRepairStatus: "repair-failed",
                    nextStep: "已尝试安全改写；仍失败时降级为规则参考。",
                  },
                ],
              },
              disclaimer: "真实数据规则参考仅供研究辅助。",
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: { symbol: "MSFT", price: 510, source: { type: "real-provider-quote" } } }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  const html = app.byId.get("analysisState").innerHTML;
  assert.match(html, /第三备用：llama-3\.1-8b-instant · 输出未通过安全校验/);
  assert.doesNotMatch(html, /第三备用：llama-3\.1-8b-instant · 已尝试，额度\/速率受限/);
  assert.match(html, /备用 3[\s\S]*llama-3\.1-8b-instant[\s\S]*输出未通过安全校验/);
  assert.match(html, /调用成功 \/ 结构化输出不完整 \/ 安全校验未通过/);
  assert.match(html, /安全修复:repair-failed/);
  assert.match(html, /已记录 2 个 provider 的失败\/冷却时间/);
  assert.match(html, /上次失败时间/);
  assert.match(html, /建议重试时间/);
  assert.match(html, /Provider 冷却/);
  assert.match(html, /备用尝试/);
  assert.doesNotMatch(html, /当前没有 provider 或本机冷却计时/);
});

test("backend analysis without trade plan does not fabricate local operation boundaries", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: 61,
              downsideProbability: 39,
              sentimentScore: 64,
              valuationScore: 52,
              technicalScore: 58,
              actionReference: "真实模型未返回操作边界。",
              reasons: ["真实模型原因"],
              risks: ["真实模型风险"],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [], points: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("tradePlan").hidden, true);
  assert.doesNotMatch(app.byId.get("tradePlan").innerHTML, /操作边界|当前参考价|样例现价/);
  assert.match(app.byId.get("actionText").textContent, /真实模型未返回操作边界/);
});

test("connected backend market-data quote and history refresh trend inputs", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: 58,
              downsideProbability: 42,
              sentimentScore: 66,
              valuationScore: 53,
              technicalScore: 62,
              actionReference: "API 分析建议：观察行情确认。",
              tradePlan: {
                stance: "观察",
                currentPrice: 201.35,
                entryZone: { low: 195, high: 202 },
                addOnTrigger: 206,
                reduceTrigger: 191,
                stopLoss: 188,
                takeProfit: 216,
                positionSizing: "真实模型仓位提示。",
              },
              reasons: ["API 原因"],
              risks: ["API 风险"],
              inputCoverage: {
                macro: "sample",
                news: "fixture-linked",
              },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider",
              quote: {
                market: "us",
                code: "AAPL",
                name: "Apple",
                lastPrice: 201.35,
                currency: "USD",
                asOf: "2026-06-01T00:00:00.000Z",
                source: { label: "Twelve Data Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider",
              market: "us",
              code: "AAPL",
              range: "6m",
              interval: "1mo",
              asOf: "2026-06-01T00:00:00.000Z",
              points: [
                { label: "周三", close: 190 },
                { label: "周四", close: 196 },
                { label: "周五", close: 200 },
              ],
              source: { label: "Twelve Data History" },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.ok(
    requestedUrls.includes("http://localhost:4180/api/market-data/quote?market=us&code=AAPL"),
  );
  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/market-data/history?market=us&code=AAPL&range=6m&interval=1mo",
    ),
  );
  assert.match(app.byId.get("trendSummary").textContent, /周三 至 周五 上涨 \+5\.26%/);
  assert.match(app.byId.get("trendSource").textContent, /Twelve Data History/);
  assert.match(app.byId.get("trendSource").textContent, /2026-06-01/);
  assert.match(app.byId.get("tradePlan").innerHTML, /201\.3/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /行情：backend-real-provider-quote-history/);
});

test("automatic real-data ingestion updates latest quote without sample trend wording", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/data-sources/auto-ingestion-run")) {
          return {
            ok: true,
            json: async () => ({
              status: "partial-real-data",
              mode: "automatic-real-provider-run",
              market: "us",
              symbol: "AAPL",
              realDataCount: 2,
              sourceCount: 5,
              sources: [
                { id: "marketDataQuote", label: "行情报价", status: "real-data", count: 1 },
                { id: "newsIntelligence", label: "新闻情报", status: "real-data", count: 5 },
                { id: "companyFilings", label: "公司公告", status: "empty", count: 0 },
                { id: "publicStatements", label: "公开言论", status: "empty", count: 0 },
                { id: "macroContext", label: "宏观数据", status: "empty", count: 0 },
              ],
              payloads: {
                quote: {
                  status: "ok",
                  mode: "real-provider",
                  quote: {
                    market: "us",
                    code: "AAPL",
                    lastPrice: 280.82,
                    currency: "USD",
                    asOf: "2026-06-08T00:00:00.000Z",
                    source: { label: "Alpha Vantage GLOBAL_QUOTE" },
                  },
                },
                news: { status: "ok", mode: "real-provider", items: [] },
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "no-real-data", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.runAutoIngestion();

  assert.ok(
    requestedUrls.some((url) =>
      url.includes("/api/data-sources/auto-ingestion-run?market=us&symbol=AAPL"),
    ),
  );
  assert.match(app.byId.get("autoIngestionState").innerHTML, /真实数据分组 2\/5/);
  assert.match(app.byId.get("trendSummary").textContent, /最新真实报价 280\.8/);
  assert.match(app.byId.get("trendSource").textContent, /Alpha Vantage GLOBAL_QUOTE/);
  assert.match(app.byId.get("trendSource").textContent, /真实 provider 数据/);
  assert.doesNotMatch(app.byId.get("trendSource").textContent, /样例数据不代表实时行情/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情\s*已连接/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情更新：06\/08/);
  assert.equal(app.byId.get("tradePlan").hidden, true);
  assert.doesNotMatch(app.byId.get("tradePlan").innerHTML, /操作边界/);
  assert.match(app.byId.get("analysisBasis").innerHTML, /行情：backend-real-provider-quote/);
  assert.match(app.byId.get("statusMessage").textContent, /最新报价已更新/);
});

test("automatic free-api relay quote is rendered as live provider data", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "MSFT",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/data-sources/auto-ingestion-run")) {
          return {
            ok: true,
            json: async () => ({
              status: "partial-real-data",
              mode: "automatic-real-provider-run",
              market: "us",
              symbol: "MSFT",
              realDataCount: 2,
              sourceCount: 5,
              sources: [
                { id: "marketDataQuote", label: "行情报价", status: "real-data", count: 1 },
                { id: "newsIntelligence", label: "新闻情报", status: "real-data", count: 5 },
                { id: "companyFilings", label: "公司公告", status: "empty", count: 0 },
                { id: "publicStatements", label: "公开言论", status: "empty", count: 0 },
                { id: "macroContext", label: "宏观数据", status: "empty", count: 0 },
              ],
              payloads: {
                quote: {
                  status: "ok",
                  mode: "real-provider-relay",
                  provider: { id: "twelve-data", label: "Twelve Data" },
                  quote: {
                    market: "us",
                    code: "MSFT",
                    lastPrice: 510.12,
                    currency: "USD",
                    asOf: "2026-06-12T00:00:00.000Z",
                    source: { label: "Twelve Data Quote" },
                  },
                },
                news: { status: "ok", mode: "real-provider", items: [] },
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "no-real-data", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.runAutoIngestion();

  assert.ok(
    requestedUrls.some((url) =>
      url.includes("/api/data-sources/auto-ingestion-run?market=us&symbol=MSFT"),
    ),
  );
  assert.match(app.byId.get("trendSummary").textContent, /最新真实报价 510\.1/);
  assert.match(app.byId.get("trendSource").textContent, /Twelve Data Quote/);
  assert.match(app.byId.get("trendSource").textContent, /真实 provider 数据/);
  assert.doesNotMatch(app.byId.get("trendSource").textContent, /后端报价样例|样例数据不代表实时行情/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情\s*已连接/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情更新：06\/12/);
  assert.equal(app.byId.get("tradePlan").hidden, true);
  assert.match(app.byId.get("analysisBasis").innerHTML, /行情：backend-real-provider-quote/);
});

test("automatic real-data ingestion shows provider quota limit and avoids repeat requests", async () => {
  const requestedUrls = [];
  const quotaMessage =
    "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.";
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/data-sources/auto-ingestion-run")) {
          return {
            ok: true,
            json: async () => ({
              status: "empty-no-fixture",
              mode: "automatic-real-provider-run",
              market: "us",
              symbol: "AAPL",
              realDataCount: 0,
              sourceCount: 5,
              sources: [
                { id: "marketDataQuote", label: "行情报价", status: "empty", count: 0, blocker: quotaMessage },
                { id: "newsIntelligence", label: "新闻情报", status: "empty", count: 0, blocker: quotaMessage },
                { id: "companyFilings", label: "公司公告", status: "empty", count: 0, blocker: "没有真实公告数据。" },
                { id: "publicStatements", label: "公开言论", status: "empty", count: 0, blocker: "没有真实公开言论数据。" },
                { id: "macroContext", label: "宏观数据", status: "empty", count: 0, blocker: "没有真实宏观数据。" },
              ],
              payloads: {
                quote: {
                  status: "unavailable",
                  error: { code: "ALPHA_VANTAGE_QUOTE_EMPTY", message: quotaMessage },
                  fallback: "empty",
                },
                news: { status: "ok", mode: "no-real-data", items: [] },
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "no-real-data", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.runAutoIngestion();
  await app.context.window.financeAIAssistantApp.runAutoIngestion();

  const ingestionRequests = requestedUrls.filter((url) =>
    url.includes("/api/data-sources/auto-ingestion-run"),
  );
  assert.equal(ingestionRequests.length, 1);
  assert.match(app.byId.get("stockCoverageNote").textContent, /额度限制/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /25 requests per day/);
  assert.match(app.byId.get("autoIngestionState").innerHTML, /provider-cooldown-empty/);
  assert.match(app.byId.get("statusMessage").textContent, /暂不重复请求 Alpha Vantage/);
});

test("authenticated backend analysis saves history record", async () => {
  const requested = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requested.push({ url, options });
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              modelReference: true,
              upsideProbability: 58,
              downsideProbability: 42,
              sentimentScore: 66,
              valuationScore: 53,
              technicalScore: 62,
              actionReference: "保存历史用分析。",
              reasons: ["历史原因"],
              risks: ["历史风险"],
            }),
          };
        }
        if (url.endsWith("/api/analysis/history")) {
          return {
            ok: true,
            json: async () => ({ saved: { id: "analysis-1", symbol: "AAPL" } }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  const analysisRequest = requested.find((item) => item.url.includes("/api/analysis?"));
  assert.ok(analysisRequest);
  assert.equal(analysisRequest.options.headers.authorization, "Bearer demo-token");

  const historyRequest = requested.find((item) => item.url.endsWith("/api/analysis/history"));
  assert.ok(historyRequest);
  assert.equal(historyRequest.options.method, "POST");
  assert.equal(historyRequest.options.headers.authorization, "Bearer demo-token");
  assert.equal(JSON.parse(historyRequest.options.body).symbol, "AAPL");
});

test("analysis load ignores stale account response after sign out", async () => {
  let resolveAccountAnalysis;
  const accountAnalysisResponse = new Promise((resolve) => {
    resolveAccountAnalysis = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.includes("/api/analysis?")) {
          if (options.headers?.authorization === "Bearer demo-token") {
            return accountAnalysisResponse;
          }
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: 61,
              downsideProbability: 39,
              sentimentScore: 62,
              valuationScore: 55,
              technicalScore: 60,
              actionReference: "退出后公开分析。",
              reasons: ["公开分析原因"],
              risks: ["公开分析风险"],
            }),
          };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadAnalysis();
  await Promise.resolve();
  assert.match(app.byId.get("analysisState").innerHTML, /正在请求真实数据/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAccountAnalysis({
    ok: true,
    json: async () => ({
      symbol: "AAPL",
      riskProfile: "balanced",
      upsideProbability: 88,
      downsideProbability: 12,
      sentimentScore: 91,
      valuationScore: 80,
      technicalScore: 89,
      actionReference: "旧账号分析不应显示。",
      reasons: ["旧账号原因"],
      risks: ["旧账号风险"],
    }),
  });
  await loadPromise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.doesNotMatch(app.byId.get("actionText").textContent, /旧账号分析/);
  assert.doesNotMatch(app.byId.get("reasonList").innerHTML, /旧账号原因/);
  assert.match(app.byId.get("actionText").textContent, /退出后公开分析/);
});

test("analysis history save ignores stale response after sign out", async () => {
  let resolveHistorySave;
  const historySaveResponse = new Promise((resolve) => {
    resolveHistorySave = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: options.headers?.authorization === "Bearer demo-token" ? 64 : 59,
              downsideProbability: 36,
              sentimentScore: 65,
              valuationScore: 54,
              technicalScore: 63,
              actionReference:
                options.headers?.authorization === "Bearer demo-token"
                  ? "账号分析已生成。"
                  : "退出后公开分析。",
              reasons: ["历史保存测试原因"],
              risks: ["历史保存测试风险"],
            }),
          };
        }
        if (url.endsWith("/api/analysis/history")) {
          return historySaveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return { ok: true, json: async () => ({ items: [], latest: null }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadAnalysis();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(app.byId.get("actionText").textContent, /账号分析已生成/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveHistorySave({
    ok: true,
    json: async () => ({ saved: { id: "analysis-stale", symbol: "AAPL" } }),
  });
  await loadPromise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /历史记录同步失败/);
  assert.match(app.byId.get("actionText").textContent, /退出后公开分析/);
});

test("analysis history save stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let historyRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: 64,
              downsideProbability: 36,
              sentimentScore: 65,
              valuationScore: 54,
              technicalScore: 63,
              actionReference: options.headers?.authorization
                ? "分析已生成，历史保存等待 token。"
                : "退出后公开分析。",
              reasons: ["历史 token 测试原因"],
              risks: ["历史 token 测试风险"],
            }),
          };
        }
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/analysis/history")) {
          historyRequested = true;
          return { ok: true, json: async () => ({ saved: { id: "analysis-token-stale" } }) };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadAnalysis();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(app.byId.get("actionText").textContent, /退出后公开分析/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await loadPromise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(historyRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /历史记录同步失败/);
  assert.match(app.byId.get("actionText").textContent, /退出后公开分析/);
});

test("connected backend analysis failure keeps strict real-data empty state", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      location: { hash: "" },
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/analysis")) {
          return {
            ok: false,
            status: 424,
            json: async () => ({
              error: {
                code: "REAL_AI_MODEL_NOT_CONFIGURED",
                message: "严格真实数据模式下，真实 AI 模型尚未配置；本接口保持空白，不返回样例分析。",
              },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider-relay",
              quote: {
                market: "us",
                code: "AAPL",
                lastPrice: 280.82,
                currency: "USD",
                asOf: "2026-06-12T00:00:00.000Z",
                source: { label: "Twelve Data Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return {
            ok: true,
            json: async () => ({ status: "empty", mode: "empty-no-fixture", points: [] }),
          };
        }
        if (url.includes("/api/macro/context")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider",
              market: "us",
              region: "美国",
              factorScore: 66,
              summary: "美国宏观指标来自 World Bank Open Data。",
              context: { provider: "world-bank-open-data", indicatorCount: 3 },
              indicators: [
                { id: "gdpGrowth", label: "GDP 增速", value: "2.8%", score: 61 },
                { id: "inflation", label: "通胀", value: "2.9%", score: 71 },
                { id: "realInterestRate", label: "实际利率", value: "3.1%", score: 62 },
              ],
              source: { label: "World Bank Open Data" },
              sourceStatus: "world-bank-open-data",
              asOf: "2024-12-31T00:00:00.000Z",
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.localStorage.getItem("apiMode"), "backend");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "connected");
  assert.equal(app.byId.get("selectedStockName").textContent, "Apple · AAPL");
  assert.match(app.byId.get("analysisState").innerHTML, /真实模型待配置|真实模型待启用|真实 AI 等待生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /真实 AI 模型尚未配置/);
  assert.match(app.byId.get("analysisState").innerHTML, /不展示样例建议/);
  assert.match(app.byId.get("analysisState").innerHTML, /重新检测 AI/);
  assert.match(app.byId.get("analysisState").innerHTML, /配置 AI 模型/);
  assert.equal(app.byId.get("upsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("downsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("sentimentScore").textContent, "待AI模型");
  assert.equal(app.byId.get("valuationScore").textContent, "待AI模型");
  assert.equal(app.byId.get("technicalScore").textContent, "待AI模型");
  assert.equal(app.byId.get("confidenceScore").textContent, "待AI模型");
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
  assert.doesNotMatch(app.byId.get("actionText").textContent, /谨慎持有|分批观察|加仓|积极模式/);
  assert.ok(requestedUrls.some((url) => url.includes("/api/market-data/quote?market=us&code=AAPL")));
  assert.ok(requestedUrls.some((url) => url.includes("/api/macro/context?market=us")));
  assert.match(app.byId.get("stockCoverageNote").textContent, /当前股票数据覆盖如下/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /当前股票仅由代码目录识别/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /股票\s*股票已识别/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /股票\s*代码目录识别/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情\s*已连接/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /宏观\s*已连接/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /行情更新：06\/12/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /宏观更新：/);
  assert.equal(app.byId.get("impactBadge").textContent, "已有真实数据");
  assert.doesNotMatch(app.byId.get("impactBadge").textContent, /暂无真实数据/);
  assert.match(app.byId.get("trendSummary").textContent, /最新真实报价 280\.8/);
  assert.match(app.byId.get("trendSource").textContent, /Twelve Data Quote/);
  assert.equal(app.byId.get("tradePlan").hidden, true);
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("statusMessage").textContent, /真实 AI 模型尚未配置/);
  assert.match(app.byId.get("statusMessage").textContent, /配置模型 key 和 model id/);
  await app.byId.get("analysisState").dispatch("click", {
    target: eventTargetFor("[data-open-ai-model-settings]", {}),
  });
  assert.equal(app.context.window.location.hash, "settings");
  assert.match(app.byId.get("statusMessage").textContent, /本机 AI 模型配置/);
  assert.match(app.byId.get("statusMessage").textContent, /key 只提交到本机后端/);
});

test("connected backend analysis loading hides sample metrics", () => {
  let resolveAnalysis;
  const app = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    selectedMarket: "us",
    selectedStockCode: "AAPL",
  }, {
    fetchImpl: async (url) => {
      if (url.includes("/api/analysis")) {
        return new Promise((resolve) => {
          resolveAnalysis = resolve;
        });
      }
      return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
    },
  });

  assert.equal(app.byId.get("upsideValue").textContent, "生成中");
  assert.equal(app.byId.get("downsideValue").textContent, "生成中");
  assert.equal(app.byId.get("sentimentScore").textContent, "生成中");
  assert.equal(app.byId.get("valuationScore").textContent, "生成中");
  assert.equal(app.byId.get("technicalScore").textContent, "生成中");
  assert.equal(app.byId.get("confidenceScore").textContent, "生成中");
  assert.equal(app.byId.get("actionText").textContent, "正在等待真实 AI 模型生成。");
  assert.equal(app.byId.get("trendSummary").textContent, "正在请求真实数据");
  assert.match(app.byId.get("trendSource").textContent, /真实行情回来前走势图保持空白/);
  assert.equal(app.byId.get("trendChart").innerHTML, "");
  assert.equal(app.byId.get("scenarioAnalysis").hidden, true);
  assert.equal(app.byId.get("scenarioAnalysis").innerHTML, "");
  assert.equal(app.byId.get("tradePlan").hidden, true);
  assert.doesNotMatch(app.byId.get("upsideValue").textContent, /%/);
  assert.doesNotMatch(
    [
      app.byId.get("actionText").textContent,
      app.byId.get("trendSource").textContent,
      app.byId.get("trendChart").innerHTML,
      app.byId.get("scenarioAnalysis").innerHTML,
      app.byId.get("tradePlan").innerHTML,
    ].join(" "),
    /本机样例行情|样例走势图|2-8 周样例|1-6 周样例|4-12 周样例|1418|1436|1452|1461|1474|1488|谨慎持有|分批观察|加仓|积极模式/,
  );
  resolveAnalysis({
    ok: false,
    status: 424,
    json: async () => ({ error: { code: "REAL_AI_MODEL_NOT_CONFIGURED", message: "真实 AI 模型尚未配置。" } }),
  });
});

test("partial backend AI metrics do not fall back to local default scores", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "balanced",
              upsideProbability: 62,
              actionReference: "真实模型只返回了部分指标。",
              reasons: ["只验证真实返回字段。"],
              risks: ["缺失指标保持待AI模型。"],
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("upsideValue").textContent, "62%");
  assert.equal(app.byId.get("downsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("sentimentScore").textContent, "待AI模型");
  assert.equal(app.byId.get("valuationScore").textContent, "待AI模型");
  assert.equal(app.byId.get("technicalScore").textContent, "待AI模型");
  assert.equal(app.byId.get("confidenceScore").textContent, "待AI模型");
  assert.equal(app.byId.get("downsideValue").dataset.metricState, "pending");
  assert.equal(app.byId.get("sentimentScore").dataset.metricState, "pending");
  assert.match(app.byId.get("actionText").textContent, /真实模型只返回了部分指标/);
  assert.doesNotMatch(
    [
      app.byId.get("downsideValue").textContent,
      app.byId.get("sentimentScore").textContent,
      app.byId.get("valuationScore").textContent,
      app.byId.get("technicalScore").textContent,
    ].join(" "),
    /36%|72\/100|58\/100|66\/100|--|\?/,
  );
});

test("backend rule-reference analysis syncs returned metrics into main card", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
      apiProviderStatus: JSON.stringify({
        id: "multi-free",
        name: "真实数据 Provider",
        mode: "real-provider",
        status: "connected",
        coverage: ["a", "hk", "us"],
        realtimeStatus: {
          marketQuote: "real-provider-enabled",
          news: "not-ready",
          filings: "not-ready",
          macro: "not-ready",
        },
        providerRegistry: {
          activeRuntimeProvider: "multi-free",
          readyRequiredCount: 1,
          requiredProviderCount: 3,
          selectedProviders: [
            { required: true, status: "ready-for-adapter", label: "行情 Provider" },
            { required: true, status: "missing-config", label: "财经新闻与公告" },
          ],
        },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              riskProfile: "balanced",
              analysisMode: "real-data-rule-reference",
              analysisService: { mode: "real-data-rule-reference", id: "real-data-rule-reference" },
              upsideProbability: 54,
              downsideProbability: 46,
              sentimentScore: 57,
              valuationScore: 52,
              technicalScore: 49,
              confidenceScore: 65,
              actionReference: "真实数据规则参考：保持观察，等待公告和成交量进一步确认。",
              reasons: ["后端已返回真实数据规则参考概率。"],
              risks: ["完整 AI 仍待 provider 可用。"],
              history: [],
              historySource: {
                label: "Tencent Quote",
                mode: "real-provider-quote",
                updatedAt: "2026-06-15T07:38:29.000Z",
              },
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.equal(app.byId.get("impactBadge").textContent, "规则参考");
  assert.equal(app.byId.get("upsideValue").textContent, "54%");
  assert.equal(app.byId.get("downsideValue").textContent, "46%");
  assert.equal(app.byId.get("sentimentScore").textContent, "57/100");
  assert.equal(app.byId.get("valuationScore").textContent, "52/100");
  assert.equal(app.byId.get("technicalScore").textContent, "49/100");
  assert.equal(app.byId.get("confidenceScore").textContent, "65/100");
  assert.equal(app.byId.get("upsideValue").dataset.metricState, "value");
  assert.equal(app.byId.get("confidenceScore").dataset.metricState, "value");
  assert.match(app.byId.get("actionText").textContent, /真实数据规则参考：保持观察/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /规则参考[\s\S]*已生成/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /完整 AI[\s\S]*未生成/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /行情[\s\S]*已连接 \/ 缺历史走势/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /新闻[\s\S]*已连接/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /公告[\s\S]*已连接/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /宏观[\s\S]*已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /全局 provider 配置状态/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /全局 provider 配置状态[\s\S]*新闻 待接入/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求：贵州茅台 · 600519/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求[\s\S]*真实报价 已获得/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求[\s\S]*历史走势 缺失/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求[\s\S]*新闻 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求[\s\S]*公告 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前股票本次请求[\s\S]*宏观 已连接/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /页面缓存\/展示状态/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /页面缓存\/展示状态[\s\S]*报价展示 已展示/);
  assert.match(app.byId.get("dataSourceState").innerHTML, /页面缓存\/展示状态[\s\S]*历史展示 缺失/);
  assert.match(app.byId.get("stockCoverageNote").textContent, /规则参考已生成；完整 AI 未生成/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").innerHTML, /AI[\s\S]*待AI模型|规则参考[\s\S]*待AI模型/);
  assert.doesNotMatch(app.byId.get("actionText").textContent, /暂无真实 AI 分析/);
  assert.doesNotMatch(app.byId.get("upsideValue").textContent, /待AI模型/);
  assert.match(app.byId.get("analysisState").innerHTML, /规则参考 已生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /完整 AI 未生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /当前仅为规则分析/);
});

test("analysis quote source keeps market coverage connected when quote endpoint is empty", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-data-rule-reference",
              analysisService: { mode: "real-data-rule-reference", id: "real-data-rule-reference" },
              upsideProbability: 54,
              downsideProbability: 46,
              confidenceScore: 65,
              actionReference: "真实数据规则参考：保持观察。",
              history: [],
              historySource: {
                label: "Tencent Quote",
                mode: "real-provider-quote",
                updatedAt: "2026-06-15T07:38:29.000Z",
              },
              inputCoverage: {
                marketData: "missing",
                history: "missing",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
            }),
          };
        }
        if (url.includes("/api/market-data/quote?")) {
          return {
            ok: true,
            json: async () => ({ status: "unavailable", fallback: "empty", fixture: null }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("upsideValue").textContent, "54%");
  assert.equal(app.byId.get("downsideValue").textContent, "46%");
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /行情[\s\S]*已连接 \/ 缺历史走势/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /规则参考[\s\S]*已生成/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /完整 AI[\s\S]*未生成/);
});

test("quote-only rule reference separates quote history and technical confidence", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-data-rule-reference",
              analysisService: { mode: "real-data-rule-reference", id: "real-data-rule-reference" },
              upsideProbability: 54,
              downsideProbability: 46,
              sentimentScore: 57,
              valuationScore: 52,
              technicalScore: 52,
              confidenceScore: 65,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["真实报价：已获得 1272；历史走势：缺失；技术分析：低置信。"],
              risks: ["历史走势不足。"],
              history: [],
              historySource: {
                label: "Tencent Quote",
                mode: "real-provider-quote",
                updatedAt: "2026-06-15T07:38:29.000Z",
              },
              factorBreakdown: [
                {
                  key: "technical",
                  label: "技术分析",
                  score: 52,
                  weight: 14,
                  summary: "真实报价：已获得；历史走势：缺失；技术分析：低置信。",
                },
              ],
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                history: "missing",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.match(app.byId.get("stockCoverageNote").innerHTML, /行情[\s\S]*已连接 \/ 缺历史走势/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /真实报价[\s\S]*已获得/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /历史走势[\s\S]*缺失/);
  assert.match(app.byId.get("stockCoverageNote").innerHTML, /技术分析[\s\S]*低置信/);
  assert.match(app.byId.get("reasonList").innerHTML, /真实报价：已获得 1272/);
  assert.match(app.byId.get("reasonList").innerHTML, /历史走势：缺失/);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /技术分析/);
  assert.match(app.byId.get("factorBreakdown").innerHTML, /技术分析：低置信/);
  assert.doesNotMatch(app.byId.get("reasonList").innerHTML, /暂未获得真实行情/);
  assert.doesNotMatch(app.byId.get("stockCoverageNote").textContent, /行情\s*待真实数据/);
});

test("backend analysis request waits 45 seconds before frontend timeout fallback", async () => {
  const timeoutDelays = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      setTimeoutImpl: (_handler, delay) => {
        timeoutDelays.push(delay);
        return timeoutDelays.length;
      },
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-data-rule-reference",
              analysisService: { mode: "real-data-rule-reference", id: "real-data-rule-reference" },
              upsideProbability: 54,
              downsideProbability: 46,
              confidenceScore: 65,
              actionReference: "真实数据规则参考：保持观察。",
              inputCoverage: {
                marketData: "backend-real-provider-quote",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.ok(timeoutDelays.length >= 1);
  assert.deepEqual([...new Set(timeoutDelays)], [45000]);
  assert.equal(app.byId.get("upsideValue").textContent, "54%");
  assert.equal(app.byId.get("downsideValue").textContent, "46%");
});

test("scenario analysis does not render zero target prices when current price is unavailable", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-data-rule-reference",
              analysisService: { mode: "real-data-rule-reference", id: "real-data-rule-reference" },
              upsideProbability: 54,
              downsideProbability: 46,
              confidenceScore: 65,
              actionReference: "真实数据规则参考：保持观察。",
              reasons: ["缺少可用当前价，目标价保持空白。"],
              risks: ["历史走势不足。"],
              history: [],
              historySource: { mode: "missing", label: "真实行情待返回" },
              scenarioAnalysis: {
                mode: "real-data-rule-reference",
                horizon: "2-8 周数据观察",
                cases: [
                  { key: "bull", label: "乐观情景", probability: 36, targetPrice: 0, expectedReturnPct: 6, summary: "乐观情景仍只显示收益百分比。" },
                  { key: "base", label: "基准情景", probability: 41, targetPrice: null, expectedReturnPct: 0, summary: "基准情景暂无目标价。" },
                  { key: "bear", label: "悲观情景", probability: 23, expectedReturnPct: -6, summary: "悲观情景暂无目标价。" },
                ],
                disclaimer: "情景概率为真实数据规则参考，不构成收益预测。",
              },
              inputCoverage: {
                marketData: "missing",
                history: "missing",
                news: "backend-real-provider-news",
                filings: "backend-real-provider-filings",
                macro: "backend-real-provider-macro",
                model: "real-data-rule-reference",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("scenarioAnalysis").hidden, false);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /乐观情景/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /\+6%/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /基准情景/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, />0%<\/em>/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /悲观情景/);
  assert.match(app.byId.get("scenarioAnalysis").innerHTML, /-6%/);
  assert.equal((app.byId.get("scenarioAnalysis").innerHTML.match(/目标价暂无/g) || []).length, 3);
  assert.doesNotMatch(app.byId.get("scenarioAnalysis").innerHTML, />0(?:\.0+)?<\/span>|0\.00/);
});

test("backend analysis ignores sample history and sample scenarios in strict real-data mode", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "a",
      selectedStockCode: "600519",
    },
    {
      fetchImpl: async (url) => {
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              analysisMode: "real-provider",
              analysisService: { mode: "real-provider", id: "real-ai-analysis" },
              upsideProbability: 55,
              downsideProbability: 45,
              sentimentScore: 50,
              valuationScore: 50,
              technicalScore: 50,
              confidenceScore: 40,
              actionReference: "真实模型参考：保持观察。",
              reasons: ["真实模型已返回主卡片指标。"],
              risks: ["样例历史不得用于首屏走势图。"],
              history: [
                { label: "1月", price: 1418 },
                { label: "2月", price: 1436 },
                { label: "3月", price: 1452 },
              ],
              historySource: {
                label: "Mock 行情样例",
                frequency: "月度样例",
                updatedAt: "2026-06-01",
                mode: "local-sample",
              },
              scenarioAnalysis: {
                mode: "local-sample",
                horizon: "2-8 周样例",
                cases: [
                  {
                    key: "bull",
                    label: "乐观情景",
                    probability: 54,
                    targetPrice: 1606,
                    expectedReturnPct: 8,
                    summary: "样例情景价格不应显示。",
                  },
                ],
                disclaimer: "情景概率和目标价为样例模型参考。",
              },
            }),
          };
        }
        return { ok: true, json: async () => ({ status: "empty", mode: "empty-no-fixture", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("upsideValue").textContent, "55%");
  assert.equal(app.byId.get("confidenceScore").textContent, "40/100");
  assert.equal(app.byId.get("trendSummary").textContent, "暂无真实走势");
  assert.match(app.byId.get("trendSource").textContent, /真实行情回来前走势图保持空白/);
  assert.equal(app.byId.get("trendChart").innerHTML, "");
  assert.equal(app.byId.get("scenarioAnalysis").hidden, true);
  assert.equal(app.byId.get("scenarioAnalysis").innerHTML, "");
  assert.doesNotMatch(
    [
      app.byId.get("trendSource").textContent,
      app.byId.get("trendChart").innerHTML,
      app.byId.get("scenarioAnalysis").innerHTML,
    ].join(" "),
    /Mock 行情样例|月度样例|2-8 周样例|样例情景价格|1606|1418|1436|1452/,
  );
});

test("connected backend analysis frontend timeout exits loading state without sample advice", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      analysisTimeoutMs: 0,
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/market-data/quote")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              mode: "real-provider-relay",
              quote: {
                market: "us",
                code: "AAPL",
                lastPrice: 280.82,
                source: { label: "Twelve Data Quote" },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ status: "empty", points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ status: "empty", items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(app.byId.get("upsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("downsideValue").textContent, "待AI模型");
  assert.equal(app.byId.get("sentimentScore").textContent, "待AI模型");
  assert.equal(app.byId.get("valuationScore").textContent, "待AI模型");
  assert.equal(app.byId.get("technicalScore").textContent, "待AI模型");
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
  assert.match(app.byId.get("analysisState").innerHTML, /真实 AI 请求超时/);
  assert.match(app.byId.get("analysisState").innerHTML, /不展示样例建议/);
  assert.match(app.byId.get("statusMessage").textContent, /等待超时/);
  assert.doesNotMatch(app.byId.get("actionText").textContent, /谨慎持有|分批观察|加仓|积极模式/);
  assert.equal(requestedUrls.some((url) => url.includes("/api/analysis")), false);
});

test("AI quota advisory state does not globally block retry or fallback checks", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
      aiModelCooldownUntil: String(Date.now() + 10 * 60 * 1000),
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/analysis")) {
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: {
                code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                message: "真实 AI 模型 provider 额度受限。",
                providerRelay: {
                  attempted: ["gpt-5.5", "gemini-2.5-flash"],
                  fallbackUsed: true,
                  primaryErrorCode: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                  fallbackErrorCode: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                  fallbackErrorCodes: [
                    {
                      model: "gemini-2.5-flash",
                      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                      finalReason: "额度或速率受限",
                      callStatus: "调用失败",
                      outputStatus: "无输出",
                      validationStatus: "未进入校验",
                      retryable: true,
                      retryAfterSeconds: 600,
                      retryAt: new Date(Date.now() + 600000).toISOString(),
                      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
                    },
                  ],
                  attempts: [
                    {
                      role: "主模型",
                      model: "gpt-5.5",
                      code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
                      finalReason: "主模型额度不足",
                      callStatus: "调用失败",
                      outputStatus: "无输出",
                      validationStatus: "未进入校验",
                      retryable: true,
                      retryAfterSeconds: 3600,
                      retryAt: new Date(Date.now() + 3600000).toISOString(),
                      nextStep: "检查主模型账户额度或账单；继续尝试备用模型。",
                    },
                    {
                      role: "备用 1",
                      model: "gemini-2.5-flash",
                      code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
                      finalReason: "额度或速率受限",
                      callStatus: "调用失败",
                      outputStatus: "无输出",
                      validationStatus: "未进入校验",
                      retryable: true,
                      retryAfterSeconds: 600,
                      retryAt: new Date(Date.now() + 600000).toISOString(),
                      nextStep: "等待 provider 冷却，或立即尝试下一个已配置备用模型。",
                    },
                  ],
                },
              },
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ status: "empty", quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ status: "empty", points: [] }) };
        }
        if (url.includes("/api/macro/context")) {
          return { ok: true, json: async () => ({ status: "empty", indicators: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const initialAnalysisRequests = requestedUrls.filter((url) => url.includes("/api/analysis")).length;

  await app.context.window.financeAIAssistantApp.loadAnalysis();

  assert.equal(
    requestedUrls.filter((url) => url.includes("/api/analysis")).length,
    initialAnalysisRequests + 1,
  );
  assert.match(app.byId.get("analysisState").innerHTML, /免费 AI 额度受限/);
  assert.match(app.byId.get("analysisState").innerHTML, /不会全局锁死 AI 重试/);
  assert.match(app.byId.get("analysisState").innerHTML, /重试\/检查备用模型/);
  assert.match(app.byId.get("analysisState").innerHTML, /gpt-5\.5 -&gt; gemini-2\.5-flash/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用结果/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用 1[\s\S]*gemini-2\.5-flash[\s\S]*额度或速率受限/);
  assert.match(app.byId.get("analysisState").innerHTML, /调用失败 \/ 无输出 \/ 未进入校验/);
  assert.match(app.byId.get("analysisState").innerHTML, /冷却提示/);
  assert.match(app.byId.get("analysisState").innerHTML, /上次失败时间/);
  assert.match(app.byId.get("analysisState").innerHTML, /建议重试时间/);
  assert.match(app.byId.get("analysisState").innerHTML, /Provider 冷却/);
  assert.match(app.byId.get("analysisState").innerHTML, /备用尝试/);
  assert.match(app.byId.get("analysisState").innerHTML, /展开技术诊断/);
  assert.match(app.byId.get("analysisState").innerHTML, /REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA/);
  assert.doesNotMatch(app.byId.get("analysisState").innerHTML, /冷却中/);

  await app.byId.get("analysisState").dispatch("click", {
    target: eventTargetFor("[data-retry-analysis]", {}),
  });

  assert.equal(
    requestedUrls.filter((url) => url.includes("/api/analysis")).length,
    initialAnalysisRequests + 2,
  );
});

test("risk profile change requests backend analysis when connected", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "AAPL",
              riskProfile: "aggressive",
              upsideProbability: 69,
              downsideProbability: 31,
              sentimentScore: 70,
              valuationScore: 50,
              technicalScore: 71,
              actionReference: "API 积极模式分析。",
              reasons: ["积极模式后端原因"],
              risks: ["积极模式风险"],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("riskProfile").value = "aggressive";
  await app.byId.get("riskProfile").dispatch("change", {
    target: app.byId.get("riskProfile"),
  });

  assert.ok(
    requestedUrls.includes(
      "http://localhost:4180/api/analysis?symbol=AAPL&riskProfile=aggressive",
    ),
  );
  assert.equal(app.byId.get("upsideValue").textContent, "69%");
  assert.match(app.byId.get("actionText").textContent, /API 积极模式分析/);
});

test("risk profile preference save ignores stale response after sign out", async () => {
  let resolvePreferenceSave;
  const preferenceSaveResponse = new Promise((resolve) => {
    resolvePreferenceSave = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      riskProfile: "balanced",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/preferences") && options.method === "POST") {
          return preferenceSaveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ market: "a", sourceStatus: "sample", items: [] }) };
      },
    },
  );

  app.byId.get("riskProfile").value = "aggressive";
  const changePromise = app.byId.get("riskProfile").dispatch("change", {
    target: app.byId.get("riskProfile"),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolvePreferenceSave({
    ok: true,
    json: async () => ({
      preferences: {
        riskProfile: "conservative",
        notifications: { email: true },
      },
    }),
  });
  await changePromise;

  assert.equal(app.byId.get("riskProfile").value, "aggressive");
  assert.notEqual(app.localStorage.getItem("riskProfile"), "conservative");
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("risk profile preference save stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let preferenceRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      riskProfile: "balanced",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/preferences") && options.method === "POST") {
          preferenceRequested = true;
          return {
            ok: true,
            json: async () => ({
              preferences: {
                riskProfile: "conservative",
                notifications: { email: true },
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  app.byId.get("riskProfile").value = "aggressive";
  const changePromise = app.byId.get("riskProfile").dispatch("change", {
    target: app.byId.get("riskProfile"),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await changePromise;

  assert.equal(preferenceRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.byId.get("riskProfile").value, "aggressive");
  assert.equal(app.localStorage.getItem("riskProfile"), "aggressive");
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("authenticated backend watchlist loads through API", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/api/watchlist")) {
          return {
            ok: true,
            json: async () => ({
              items: [{ code: "AAPL", name: "Apple", market: "us" }],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "a", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadWatchlist();

  assert.ok(requestedUrls.includes("http://localhost:4180/api/watchlist"));
  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["AAPL"]);
  assert.match(app.byId.get("watchlistItems").innerHTML, /Apple/);
});

test("authenticated backend watchlist add and remove sync through API", async () => {
  const requests = [];
  const backendCodes = new Set();
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/watchlist") && options.method === "POST") {
          backendCodes.add(JSON.parse(options.body).code);
          return { ok: true, json: async () => ({ added: JSON.parse(options.body).code }) };
        }
        if (url.includes("/api/watchlist/") && options.method === "DELETE") {
          backendCodes.delete(decodeURIComponent(url.split("/").pop()));
          return { ok: true, json: async () => ({ removed: url.split("/").pop() }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return {
            ok: true,
            json: async () => ({ items: [...backendCodes].map((code) => ({ code })) }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "a", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadWatchlist();
  await app.byId.get("addWatchButton").click();

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["MSFT"]);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/watchlist" &&
        request.method === "POST" &&
        request.body.includes("MSFT"),
    ),
  );
  assert.match(app.byId.get("statusMessage").textContent, /同步到后端/);

  await app.byId.get("watchlistItems").dispatch("click", {
    target: eventTargetFor("[data-remove-watch]", { removeWatch: "MSFT" }),
  });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist") || "[]"), []);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/watchlist/MSFT" &&
        request.method === "DELETE",
    ),
  );
});

test("authenticated backend watchlist failure keeps local watchlist", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      watchlist: JSON.stringify(["AAPL"]),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/watchlist")) {
          throw new Error("自选股 API 断开");
        }
        return {
          ok: true,
          json: async () => ({ market: "a", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadWatchlist();

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["AAPL"]);
  assert.match(app.byId.get("watchlistItems").innerHTML, /Apple/);
  assert.match(app.byId.get("statusMessage").textContent, /自选股后端同步暂不可用/);
});

test("watchlist load ignores stale response after sign out", async () => {
  let resolveLoad;
  const loadResponse = new Promise((resolve) => {
    resolveLoad = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/watchlist") && (options.method || "GET") === "GET") {
          return loadResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadWatchlist();
  await Promise.resolve();
  assert.match(app.byId.get("watchlistItems").innerHTML, /正在同步自选股/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveLoad({
    ok: true,
    json: async () => ({
      items: [{ code: "AAPL", name: "Apple", market: "us" }],
    }),
  });
  await loadPromise;

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist") || "[]"), []);
  assert.doesNotMatch(app.byId.get("watchlistItems").innerHTML, /Apple/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("watchlist add ignores stale response after sign out", async () => {
  let resolveAdd;
  const addResponse = new Promise((resolve) => {
    resolveAdd = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/watchlist") && options.method === "POST") {
          return addResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const addPromise = app.byId.get("addWatchButton").click();
  await Promise.resolve();
  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["MSFT"]);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAdd({
    ok: true,
      json: async () => ({ added: "MSFT" }),
  });
  await addPromise;

  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("watchlist add stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let watchlistPostRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/watchlist") && options.method === "POST") {
          watchlistPostRequested = true;
          return { ok: true, json: async () => ({ added: "MSFT" }) };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const addPromise = app.byId.get("addWatchButton").click();
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await addPromise;

  assert.equal(watchlistPostRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), ["MSFT"]);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("watchlist remove ignores stale response after sign out", async () => {
  let resolveRemove;
  const removeResponse = new Promise((resolve) => {
    resolveRemove = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      watchlist: JSON.stringify(["600519"]),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/watchlist/600519") && options.method === "DELETE") {
          return removeResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [{ code: "600519" }] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const removePromise = app.byId.get("watchlistItems").dispatch("click", {
    target: eventTargetFor("[data-remove-watch]", { removeWatch: "600519" }),
  });
  await Promise.resolve();
  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), []);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveRemove({
    ok: true,
    json: async () => ({ removed: "600519" }),
  });
  await removePromise;

  assert.deepEqual(JSON.parse(app.localStorage.getItem("watchlist")), []);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("backend health check keeps local shell blank when unavailable", async () => {
  const app = createHarness(
    {},
    {
      fetchImpl: async () => {
        throw new Error("连接被拒绝");
      },
    },
  );

  await app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-check-backend]", {}),
  });

  assert.equal(app.localStorage.getItem("apiMode"), "local");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), "failed");
  assert.match(app.byId.get("dataSourceState").innerHTML, /后端连接失败/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据库服务未连接/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计服务未连接/);
  assert.match(app.byId.get("statusMessage").textContent, /严格真实数据模式下页面保持空白/);
});

test("data source can be switched back to local sample mode", () => {
  const app = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiProviderStatus: JSON.stringify({ id: "mock", name: "Mock", mode: "sample" }),
    apiMarketDataRuntimeStatus: JSON.stringify({
      id: "mock-market-data-runtime",
      name: "Mock 行情请求运行时",
      mode: "sample-observability",
      status: "ready",
    }),
    apiNewsIngestionRuntimeStatus: JSON.stringify({
      id: "mock-news-ingestion-runtime",
      name: "Mock 新闻采集运行时",
      mode: "sample-observability",
      status: "ready",
    }),
    apiDatabaseStatus: JSON.stringify({
      id: "mock-database-service",
      name: "Mock 数据库服务",
      mode: "sample",
      status: "planning",
      activeStorage: "memory-only",
    }),
    apiAuditServiceStatus: JSON.stringify({
      id: "mock-audit-service",
      name: "Mock 审计服务",
      mode: "sample",
      status: "planning",
      storageMode: "memory-only",
    }),
  });

  assert.match(app.byId.get("dataSourceState").innerHTML, /后端 API 已连接/);
  assert.match(app.byId.get("databaseState").innerHTML, /Mock 数据库服务/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Mock 审计服务/);

  app.byId.get("dataSourceState").dispatch("click", {
    target: eventTargetFor("[data-use-local-data]", {}),
  });

  assert.equal(app.localStorage.getItem("apiMode"), "local");
  assert.equal(app.localStorage.getItem("apiHealthStatus"), null);
  assert.equal(app.localStorage.getItem("apiProviderStatus"), null);
  assert.equal(app.localStorage.getItem("apiMarketDataRuntimeStatus"), null);
  assert.equal(app.localStorage.getItem("apiNewsIngestionRuntimeStatus"), null);
  assert.equal(app.localStorage.getItem("apiDatabaseStatus"), null);
  assert.equal(app.localStorage.getItem("apiAuditServiceStatus"), null);
  assert.match(app.byId.get("dataSourceState").innerHTML, /当前为严格真实数据空白模式/);
  assert.doesNotMatch(app.byId.get("dataSourceState").innerHTML, /改用本机样例|当前使用本机样例数据/);
  assert.match(app.byId.get("databaseState").innerHTML, /数据库服务待连接/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计服务待连接/);
  assert.doesNotMatch(app.byId.get("databaseState").innerHTML, /当前使用本机数据库样例/);
  assert.doesNotMatch(app.byId.get("auditServiceState").innerHTML, /当前使用本机审计样例/);
});

test("audit retention purge action calls backend and renders result", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiAuditServiceStatus: JSON.stringify({
        id: "mock-audit-service",
        name: "Mock 审计服务",
        mode: "sample",
        status: "planning",
        storageMode: "memory-only",
        retentionPolicy: {
          maxEvents: 500,
          windowDays: 90,
          enforcement: "repository-cap-and-manual-purge",
          manualPurgeSupported: true,
          rechainAfterPurge: true,
        },
        maintenancePolicy: {
          retentionPurgeSupported: true,
          manualPurgeSupported: true,
          exportPackageSupported: true,
          auditTrailRequired: true,
          rechainAfterPurge: true,
        },
        redactionPolicy: {
          redactedFields: ["password", "token"],
        },
        signingPolicy: {
          status: "sample-unsigned",
          algorithm: "hmac-sha256",
          canonicalization: "stable-json-v1",
          signingSecretConfigured: false,
          signedExportsSupported: false,
          required: false,
          keyId: "",
        },
        downloadAuthorizationPolicy: {
          status: "sample-bypass",
          requiresPrivilegedRole: false,
          allowedRoles: ["admin", "auditor", "compliance"],
          roleSource: "authenticated-user.roles",
          enforcementEnv: "FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE",
        },
        integrity: {
          status: "verified",
          eventCount: 4,
          latestHash: "abcdef1234567890",
          algorithm: "sha256-stable-json",
          brokenEvents: [],
        },
        capabilities: [
          "safeMetadata",
          "retentionLimit",
          "retentionPurge",
          "auditExportPackage",
          "auditExportSigningPolicy",
          "auditExportVerification",
          "auditExportArchiveReceipt",
          "auditExportDownloadPackage",
          "auditExportReplayPreview",
          "hashChainIntegrity",
        ],
        missingProductionCapabilities: [
          "externalWormArchive",
          "signedAuditExports",
          "immutableArchiveWrite",
          "externalVerifierTooling",
          "auditExportDownloadWorkflow",
          "auditReplayImportWorkflow",
        ],
      }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/audit/retention/purge")) {
          return {
            ok: true,
            json: async () => ({
              purgeRun: {
                id: "audit-retention-purge-ui-001",
                status: "success",
                checkedEvents: 4,
                prunedEvents: 2,
                remainingEvents: 2,
                finalEventCount: 3,
              },
              retentionPolicy: {
                maxEvents: 500,
                windowDays: 90,
                enforcement: "repository-cap-and-manual-purge",
                manualPurgeSupported: true,
                rechainAfterPurge: true,
              },
              integrity: {
                status: "verified",
                eventCount: 3,
                latestHash: "fedcba9876543210",
                algorithm: "sha256-stable-json",
                brokenEvents: [],
              },
            }),
          };
        }
        if (url.endsWith("/api/audit/export")) {
          return {
            ok: true,
            json: async () => ({
              manifest: {
                id: "audit-export-ui-001",
                version: "audit-export-v0",
                eventCount: 3,
                integrityStatus: "verified",
                latestHash: "fedcba9876543210",
                signed: false,
              },
              integrity: {
                status: "verified",
                eventCount: 3,
                latestHash: "fedcba9876543210",
                algorithm: "sha256-stable-json",
                brokenEvents: [],
              },
              signature: {
                status: "unsigned",
                algorithm: "hmac-sha256",
                canonicalization: "stable-json-v1",
                keyId: "",
                payloadHash: "a".repeat(64),
                signature: "",
              },
              events: [],
              disclaimer: "样例审计导出证据包。",
            }),
          };
        }
        if (url.endsWith("/api/audit/export/verify")) {
          return {
            ok: true,
            json: async () => ({
              status: "unsigned",
              verified: false,
              reasons: ["export-not-signed"],
              checks: {
                manifest: "passed",
                integrity: "verified",
                signature: "unsigned",
                payloadHash: "matched",
              },
              signature: { status: "unsigned", verified: false, reason: "export-not-signed" },
              integrity: {
                status: "verified",
                eventCount: 3,
                latestHash: "fedcba9876543210",
                algorithm: "sha256-stable-json",
                brokenEvents: [],
              },
            }),
          };
        }
        if (url.endsWith("/api/audit/export/archive")) {
          if ((options.method || "GET") === "GET") {
            return {
              ok: true,
              json: async () => ({
                items: [
                  {
                    id: "audit-archive-receipt-ui-001",
                    exportId: "audit-export-ui-001",
                    status: "sample-archived",
                    accepted: true,
                    archiveMode: "sample-receipt-only",
                    immutable: false,
                    checksumAlgorithm: "sha256-stable-json",
                    packageChecksum: "b".repeat(64),
                    eventCount: 3,
                    signatureStatus: "unsigned",
                    verificationStatus: "unsigned",
                    reasons: ["export-not-signed"],
                    archivedAt: "2026-06-01T00:50:00.000Z",
                  },
                ],
                retentionLimit: 200,
                disclaimer: "样例归档回执列表。",
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              receipt: {
                id: "audit-archive-receipt-ui-001",
                exportId: "audit-export-ui-001",
                status: "sample-archived",
                accepted: true,
                archiveMode: "sample-receipt-only",
                immutable: false,
                checksumAlgorithm: "sha256-stable-json",
                packageChecksum: "b".repeat(64),
                eventCount: 3,
                signatureStatus: "unsigned",
                verificationStatus: "unsigned",
                reasons: ["export-not-signed"],
                archivedAt: "2026-06-01T00:50:00.000Z",
              },
              verification: {
                status: "unsigned",
                verified: false,
                reasons: ["export-not-signed"],
              },
              disclaimer: "样例归档回执。",
            }),
          };
        }
        if (url.endsWith("/api/audit/export/replay-preview")) {
          return {
            ok: true,
            json: async () => ({
              preview: {
                id: "audit-replay-preview-ui-001",
                exportId: "audit-export-ui-001",
                dryRun: true,
                status: "ready-with-warnings",
                accepted: true,
                totalEvents: 3,
                duplicateEvents: 1,
                wouldImportEvents: 2,
                currentAuditEvents: 4,
                eventTypeCounts: [
                  { eventType: "auth.signIn", count: 2 },
                  { eventType: "audit.export.package", count: 1 },
                ],
                warnings: ["unsigned-sample-preview", "duplicate-events-detected"],
                reasons: [],
              },
              verification: {
                status: "unsigned",
                verified: false,
                reasons: ["export-not-signed"],
              },
            }),
          };
        }
        if (url.endsWith("/api/audit/export/download")) {
          return {
            ok: true,
            json: async () => ({
              download: {
                id: "audit-export-download-ui-001",
                exportId: "audit-export-ui-001",
                status: "prepared",
                accepted: true,
                filename: "audit-export-ui-001-2026-06-01.json",
                mimeType: "application/json",
                encoding: "base64",
                contentBase64: "e30=",
                byteSize: 512,
                checksumAlgorithm: "sha256-stable-json",
                packageChecksum: "c".repeat(64),
                signatureStatus: "unsigned",
                verificationStatus: "unsigned",
                reasons: [],
                warnings: ["unsigned-sample-download"],
              },
              verification: {
                status: "unsigned",
                verified: false,
                reasons: ["export-not-signed"],
              },
            }),
          };
        }
        if (url.endsWith("/api/me")) {
          return {
            ok: true,
            json: async () => ({ user: { id: "demo-user", displayName: "样例用户" } }),
          };
        }
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              name: "贵州茅台",
              upsideProbability: 58,
              downsideProbability: 35,
              sentimentScore: 60,
              valuationScore: 55,
              technicalScore: 58,
              reasons: [],
              risks: [],
              sourceRefs: [],
            }),
          };
        }
        if (url.includes("/api/news/intelligence")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/news/filings")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/public-statements")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/news")) {
          return { ok: true, json: async () => ({ market: "a", items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  assert.match(app.byId.get("auditServiceState").innerHTML, /清理审计保留/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /签名策略/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /导出为未签名样例/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /下载授权：下载门禁 sample-bypass/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /允许 admin \/ auditor \/ compliance/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /签名审计导出/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计归档回执/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计下载交接包/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计回放预演/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /不可变归档写入/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计下载交接流程/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计回放导入流程/);
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-purge-audit-retention]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计保留清理完成：检查 4，清理 2，剩余 3/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /最新 fedcba987654/);
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/retention/purge"))
      .map((request) => `${request.method} ${request.url}`),
    ["POST http://localhost:4180/api/audit/retention/purge"],
  );

  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-export-audit-package]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计证据包已生成：事件 3，完整性 verified，签名 样例未签名/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /最新 fedcba987654/);
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-verify-audit-package]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计证据包校验：未通过，状态 unsigned/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /export-not-signed/);
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-archive-audit-package]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计归档回执：sample-archived/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /Checksum bbbbbbbbbbbb/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /样例非不可变归档/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /audit-export-ui-001/);
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-refresh-audit-archive]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /已加载 1 条审计归档回执/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /sample-archived · audit-export-ui-001 · bbbbbbbbbbbb/);
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-prepare-audit-download]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计下载交接包：prepared，文件 audit-export-ui-001-2026-06-01\.json，大小 512 bytes，Checksum cccccccccccc/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /已触发浏览器下载/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /unsigned-sample-download/);
  assert.deepEqual(app.downloads, [
    { href: "blob:test-1", filename: "audit-export-ui-001-2026-06-01.json" },
  ]);
  assert.equal(app.objectUrls[0].blob.type, "application/json");
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-preview-audit-replay]", {}),
  });
  assert.match(app.byId.get("auditServiceState").innerHTML, /审计回放预演：ready-with-warnings，总数 3，重复 1，拟导入 2/);
  assert.match(app.byId.get("auditServiceState").innerHTML, /unsigned-sample-preview/);
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export"))
      .map((request) => `${request.method} ${request.url}`),
    ["GET http://localhost:4180/api/audit/export"],
  );
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export/verify"))
      .map((request) => `${request.method} ${request.url}`),
    ["POST http://localhost:4180/api/audit/export/verify"],
  );
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export/archive"))
      .map((request) => `${request.method} ${request.url}`),
    [
      "POST http://localhost:4180/api/audit/export/archive",
      "GET http://localhost:4180/api/audit/export/archive",
    ],
  );
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export/download"))
      .map((request) => `${request.method} ${request.url}`),
    ["POST http://localhost:4180/api/audit/export/download"],
  );
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export/replay-preview"))
      .map((request) => `${request.method} ${request.url}`),
    ["POST http://localhost:4180/api/audit/export/replay-preview"],
  );
});

test("audit retention purge ignores stale success response after sign out", async () => {
  let resolveAuditPurge;
  const auditPurgeResponse = new Promise((resolve) => {
    resolveAuditPurge = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiAuditServiceStatus: JSON.stringify({
        id: "mock-audit-service",
        name: "Mock 审计服务",
        mode: "sample",
        status: "planning",
        storageMode: "memory-only",
        retentionPolicy: { maxEvents: 500, manualPurgeSupported: true },
        maintenancePolicy: { retentionPurgeSupported: true, auditTrailRequired: true },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/audit/retention/purge")) return auditPurgeResponse;
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const purgePromise = app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-purge-audit-retention]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAuditPurge({
    ok: true,
    json: async () => ({
      purgeRun: {
        id: "audit-purge-stale-001",
        status: "success",
        checkedEvents: 9,
        prunedEvents: 8,
        finalEventCount: 1,
      },
      integrity: {
        status: "verified",
        eventCount: 1,
        latestHash: "stalehash123456",
        algorithm: "sha256-stable-json",
        brokenEvents: [],
      },
    }),
  });
  await purgePromise;

  assert.doesNotMatch(app.byId.get("auditServiceState").innerHTML, /审计保留清理完成/);
  assert.doesNotMatch(app.byId.get("auditServiceState").innerHTML, /stalehash123456/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /审计保留清理完成/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("audit retention purge ignores stale error response after sign out", async () => {
  let resolveAuditPurge;
  const auditPurgeResponse = new Promise((resolve) => {
    resolveAuditPurge = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
      apiAuditServiceStatus: JSON.stringify({
        id: "mock-audit-service",
        name: "Mock 审计服务",
        mode: "sample",
        status: "planning",
        storageMode: "memory-only",
        retentionPolicy: { maxEvents: 500, manualPurgeSupported: true },
        maintenancePolicy: { retentionPurgeSupported: true, auditTrailRequired: true },
      }),
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/audit/retention/purge")) return auditPurgeResponse;
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const purgePromise = app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-purge-audit-retention]", {}),
  });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAuditPurge({
    ok: false,
    status: 500,
    json: async () => ({
      error: { message: "stale audit purge failure" },
    }),
  });
  await purgePromise;

  assert.doesNotMatch(app.byId.get("auditServiceState").innerHTML, /stale audit purge failure/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /审计保留清理失败/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("audit export chain actions ignore stale success responses after sign out", async () => {
  const baseAuditService = {
    id: "mock-audit-service",
    name: "Mock 审计服务",
    mode: "sample",
    status: "planning",
    storageMode: "memory-only",
    retentionPolicy: { maxEvents: 500, manualPurgeSupported: true },
    maintenancePolicy: {
      retentionPurgeSupported: true,
      exportPackageSupported: true,
      auditTrailRequired: true,
    },
    integrity: { status: "verified", eventCount: 1, latestHash: "basehash123456" },
  };
  const exportPackage = {
    manifest: {
      id: "audit-export-base-001",
      eventCount: 1,
      integrityStatus: "verified",
      signed: false,
    },
    integrity: { status: "verified", eventCount: 1, latestHash: "basehash123456" },
    signature: { status: "unsigned", keyId: "", payloadHash: "a".repeat(64) },
    events: [],
  };
  const cases = [
    {
      name: "export",
      selector: "[data-export-audit-package]",
      endpoint: "/api/audit/export",
      method: "GET",
      response: {
        ...exportPackage,
        manifest: { ...exportPackage.manifest, id: "audit-export-stale-001", eventCount: 9 },
        integrity: { status: "verified", eventCount: 9, latestHash: "staleexporthash" },
      },
      blockedPattern: /审计证据包已生成|staleexporthash/,
    },
    {
      name: "verify",
      selector: "[data-verify-audit-package]",
      endpoint: "/api/audit/export/verify",
      method: "POST",
      needsPackage: true,
      response: { status: "signed", verified: true, reasons: [] },
      blockedPattern: /审计证据包校验：通过|signed/,
    },
    {
      name: "archive",
      selector: "[data-archive-audit-package]",
      endpoint: "/api/audit/export/archive",
      method: "POST",
      needsPackage: true,
      response: {
        receipt: {
          id: "audit-archive-stale-001",
          exportId: "audit-export-base-001",
          status: "sample-archived",
          accepted: true,
          packageChecksum: "e".repeat(64),
        },
      },
      blockedPattern: /audit-archive-stale-001|eeeeeeeeeeee|审计归档回执：sample-archived/,
    },
    {
      name: "archive refresh",
      selector: "[data-refresh-audit-archive]",
      endpoint: "/api/audit/export/archive",
      method: "GET",
      response: {
        items: [
          {
            id: "audit-archive-stale-refresh-001",
            exportId: "audit-export-base-001",
            status: "sample-archived",
            accepted: true,
            packageChecksum: "f".repeat(64),
          },
        ],
      },
      blockedPattern: /audit-archive-stale-refresh-001|已加载 1 条审计归档回执/,
    },
    {
      name: "download",
      selector: "[data-prepare-audit-download]",
      endpoint: "/api/audit/export/download",
      method: "POST",
      needsPackage: true,
      response: {
        download: {
          accepted: true,
          status: "prepared",
          filename: "audit-export-stale-download.json",
          mimeType: "application/json",
          contentBase64: "e30=",
          byteSize: 2,
          packageChecksum: "d".repeat(64),
          warnings: [],
          reasons: [],
        },
      },
      blockedPattern: /audit-export-stale-download|审计下载交接包：prepared/,
      assertExtra: (app) => assert.deepEqual(app.downloads, []),
    },
    {
      name: "replay",
      selector: "[data-preview-audit-replay]",
      endpoint: "/api/audit/export/replay-preview",
      method: "POST",
      needsPackage: true,
      response: {
        preview: {
          id: "audit-replay-stale-001",
          accepted: true,
          status: "ready",
          totalEvents: 9,
          duplicateEvents: 0,
          wouldImportEvents: 9,
        },
      },
      blockedPattern: /audit-replay-stale-001|审计回放预演：ready/,
    },
  ];

  for (const auditCase of cases) {
    let resolveAuditAction;
    const auditActionResponse = new Promise((resolve) => {
      resolveAuditAction = resolve;
    });
    const app = createHarness(
      {
        apiMode: "backend",
        apiHealthStatus: "connected",
        apiAuthToken: "demo-token",
        apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
        apiAuditServiceStatus: JSON.stringify(baseAuditService),
      },
      {
        fetchImpl: async (url, options = {}) => {
          const method = options.method || "GET";
          if (url.endsWith(auditCase.endpoint) && method === auditCase.method) {
            return auditActionResponse;
          }
          if (url.endsWith("/api/audit/export") && method === "GET") {
            return { ok: true, json: async () => exportPackage };
          }
          if (url.endsWith("/api/auth/logout")) {
            return { ok: true, json: async () => ({ revoked: true }) };
          }
          return { ok: true, json: async () => ({}) };
        },
      },
    );

    if (auditCase.needsPackage) {
      await app.byId.get("auditServiceState").dispatch("click", {
        target: eventTargetFor("[data-export-audit-package]", {}),
      });
    }

    const actionPromise = app.byId.get("auditServiceState").dispatch("click", {
      target: eventTargetFor(auditCase.selector, {}),
    });
    await Promise.resolve();

    await app.byId.get("accountState").dispatch("click", {
      target: eventTargetFor("[data-sign-out-demo]", {}),
    });

    resolveAuditAction({ ok: true, json: async () => auditCase.response });
    await actionPromise;

    assert.doesNotMatch(
      app.byId.get("auditServiceState").innerHTML,
      auditCase.blockedPattern,
      auditCase.name,
    );
    assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
    auditCase.assertExtra?.(app);
  }
});

test("audit export chain actions ignore stale error responses after sign out", async () => {
  const baseAuditService = {
    id: "mock-audit-service",
    name: "Mock 审计服务",
    mode: "sample",
    status: "planning",
    storageMode: "memory-only",
    retentionPolicy: { maxEvents: 500, manualPurgeSupported: true },
    maintenancePolicy: {
      retentionPurgeSupported: true,
      exportPackageSupported: true,
      auditTrailRequired: true,
    },
    integrity: { status: "verified", eventCount: 1, latestHash: "basehash123456" },
  };
  const exportPackage = {
    manifest: {
      id: "audit-export-base-001",
      eventCount: 1,
      integrityStatus: "verified",
      signed: false,
    },
    integrity: { status: "verified", eventCount: 1, latestHash: "basehash123456" },
    signature: { status: "unsigned", keyId: "", payloadHash: "a".repeat(64) },
    events: [],
  };
  const cases = [
    {
      name: "export",
      selector: "[data-export-audit-package]",
      endpoint: "/api/audit/export",
      method: "GET",
      blockedPattern: /stale audit export failure|审计证据包生成失败/,
    },
    {
      name: "verify",
      selector: "[data-verify-audit-package]",
      endpoint: "/api/audit/export/verify",
      method: "POST",
      needsPackage: true,
      blockedPattern: /stale audit verify failure|审计证据包校验失败/,
    },
    {
      name: "archive",
      selector: "[data-archive-audit-package]",
      endpoint: "/api/audit/export/archive",
      method: "POST",
      needsPackage: true,
      blockedPattern: /stale audit archive failure|审计归档回执生成失败/,
    },
    {
      name: "archive refresh",
      selector: "[data-refresh-audit-archive]",
      endpoint: "/api/audit/export/archive",
      method: "GET",
      blockedPattern: /stale audit archive refresh failure|审计归档回执刷新失败/,
    },
    {
      name: "download",
      selector: "[data-prepare-audit-download]",
      endpoint: "/api/audit/export/download",
      method: "POST",
      needsPackage: true,
      blockedPattern: /stale audit download failure|审计下载交接包准备失败/,
      assertExtra: (app) => assert.deepEqual(app.downloads, []),
    },
    {
      name: "replay",
      selector: "[data-preview-audit-replay]",
      endpoint: "/api/audit/export/replay-preview",
      method: "POST",
      needsPackage: true,
      blockedPattern: /stale audit replay failure|审计回放预演失败/,
    },
  ];

  for (const auditCase of cases) {
    let resolveAuditAction;
    const auditActionResponse = new Promise((resolve) => {
      resolveAuditAction = resolve;
    });
    const app = createHarness(
      {
        apiMode: "backend",
        apiHealthStatus: "connected",
        apiAuthToken: "demo-token",
        apiAuthUser: JSON.stringify({ id: "demo-user", displayName: "样例用户" }),
        apiAuditServiceStatus: JSON.stringify(baseAuditService),
      },
      {
        fetchImpl: async (url, options = {}) => {
          const method = options.method || "GET";
          if (url.endsWith(auditCase.endpoint) && method === auditCase.method) {
            return auditActionResponse;
          }
          if (url.endsWith("/api/audit/export") && method === "GET") {
            return { ok: true, json: async () => exportPackage };
          }
          if (url.endsWith("/api/auth/logout")) {
            return { ok: true, json: async () => ({ revoked: true }) };
          }
          return { ok: true, json: async () => ({}) };
        },
      },
    );

    if (auditCase.needsPackage) {
      await app.byId.get("auditServiceState").dispatch("click", {
        target: eventTargetFor("[data-export-audit-package]", {}),
      });
    }

    const actionPromise = app.byId.get("auditServiceState").dispatch("click", {
      target: eventTargetFor(auditCase.selector, {}),
    });
    await Promise.resolve();

    await app.byId.get("accountState").dispatch("click", {
      target: eventTargetFor("[data-sign-out-demo]", {}),
    });

    resolveAuditAction({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: `stale audit ${auditCase.name} failure` },
      }),
    });
    await actionPromise;

    assert.doesNotMatch(
      app.byId.get("auditServiceState").innerHTML,
      auditCase.blockedPattern,
      auditCase.name,
    );
    assert.doesNotMatch(
      app.byId.get("statusMessage").textContent,
      auditCase.blockedPattern,
      auditCase.name,
    );
    assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
    auditCase.assertExtra?.(app);
  }
});

test("audit download handoff uses iOS native bridge when available", async () => {
  const nativeMessages = [];
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      apiAuthToken: "demo-token",
      apiAuditServiceStatus: JSON.stringify({
        id: "mock-audit-service",
        name: "Mock 审计服务",
        mode: "sample",
        status: "planning",
        storageMode: "memory-only",
        capabilities: ["auditExportPackage", "auditExportDownloadPackage"],
        missingProductionCapabilities: ["auditExportDownloadWorkflow"],
        retentionPolicy: {},
        redactionPolicy: {},
        signingPolicy: {},
        maintenancePolicy: { exportPackageSupported: true },
        integrity: { status: "verified", eventCount: 1, latestHash: "abc123" },
      }),
    },
    {
      webkitImpl: {
        messageHandlers: {
          auditDownload: {
            postMessage: (payload) => nativeMessages.push(payload),
          },
        },
      },
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET" });
        if (url.endsWith("/api/audit/export")) {
          return {
            ok: true,
            json: async () => ({
              manifest: {
                id: "audit-export-native-001",
                eventCount: 1,
                integrityStatus: "verified",
                signed: false,
              },
              integrity: { status: "verified", eventCount: 1, latestHash: "abc123" },
              signature: { status: "unsigned", keyId: "", payloadHash: "a".repeat(64) },
              events: [],
            }),
          };
        }
        if (url.endsWith("/api/audit/export/download")) {
          return {
            ok: true,
            json: async () => ({
              download: {
                accepted: true,
                status: "prepared",
                filename: "audit-export-native-001-2026-06-01.json",
                mimeType: "application/json",
                contentBase64: "e30=",
                byteSize: 2,
                packageChecksum: "d".repeat(64),
                warnings: [],
                reasons: [],
              },
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-export-audit-package]", {}),
  });
  await app.byId.get("auditServiceState").dispatch("click", {
    target: eventTargetFor("[data-prepare-audit-download]", {}),
  });

  assert.deepEqual(JSON.parse(JSON.stringify(nativeMessages)), [
    {
      filename: "audit-export-native-001-2026-06-01.json",
      mimeType: "application/json",
      contentBase64: "e30=",
      packageChecksum: "d".repeat(64),
    },
  ]);
  assert.deepEqual(app.downloads, []);
  assert.match(app.byId.get("auditServiceState").innerHTML, /已交给系统分享保存/);
  assert.deepEqual(
    requests
      .filter((request) => request.url.endsWith("/api/audit/export/download"))
      .map((request) => `${request.method} ${request.url}`),
    ["POST http://localhost:4180/api/audit/export/download"],
  );
});

test("account card renders loading and error states with retry", () => {
  const loadingApp = createHarness({
    prototypeAccountState: "loading",
  });
  assert.match(loadingApp.byId.get("accountState").innerHTML, /正在连接账户服务/);

  const errorApp = createHarness({
    prototypeAccountState: "error",
  });
  assert.match(errorApp.byId.get("accountState").innerHTML, /账户服务暂不可用/);
  assert.match(errorApp.byId.get("accountState").innerHTML, /data-retry-account/);

  errorApp.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-retry-account]", {}),
  });

  assert.equal(errorApp.localStorage.getItem("prototypeAccountState"), null);
  assert.match(errorApp.byId.get("accountState").innerHTML, /未登录，正在使用本机体验/);
  assert.match(errorApp.byId.get("statusMessage").textContent, /已恢复为本机体验状态/);
});

test("portfolio sync renders loading and error states with retry", () => {
  const loadingApp = createHarness({
    prototypePortfolioSyncState: "loading",
  });
  assert.match(loadingApp.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  const errorApp = createHarness({
    prototypePortfolioSyncState: "error",
  });
  assert.match(errorApp.byId.get("portfolioSyncState").innerHTML, /持仓同步失败/);
  assert.match(errorApp.byId.get("portfolioSyncState").innerHTML, /data-retry-portfolio-sync/);

  errorApp.byId.get("portfolioSyncState").dispatch("click", {
    target: eventTargetFor("[data-retry-portfolio-sync]", {}),
  });

  assert.equal(errorApp.localStorage.getItem("prototypePortfolioSyncState"), null);
  assert.match(errorApp.byId.get("portfolioSyncState").innerHTML, /当前仅保存在本机/);
  assert.match(errorApp.byId.get("statusMessage").textContent, /已恢复持仓同步状态/);
});

test("authenticated backend portfolio loads saved account position", async () => {
  const requestedUrls = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith("/api/portfolio")) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  code: "AAPL",
                  buyPrice: "120",
                  holdingQty: "5",
                  buyDate: "2026-05-12",
                  targetReturn: "18",
                  maxLoss: "7",
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  const result = await app.context.window.financeAIAssistantApp.loadPortfolio();

  assert.equal(result.source, "backend");
  assert.ok(requestedUrls.includes("http://localhost:4180/api/portfolio"));
  assert.deepEqual(JSON.parse(app.localStorage.getItem("portfolio")), {
    buyPrice: "120",
    holdingQty: "5",
    buyDate: "2026-05-12",
    targetReturn: "18",
    maxLoss: "7",
  });
  assert.equal(app.byId.get("buyPrice").value, "120");
  assert.match(app.byId.get("portfolioSummary").innerHTML, /成本金额：600.00/);
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
});

test("authenticated backend portfolio save syncs through API", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/portfolio")) {
          return {
            ok: true,
            json: async () => ({
              saved: JSON.parse(options.body),
              localSummary: {
                samplePrice: 196,
                cost: 1000,
                sampleMarketValue: 1960,
                sampleReturnPct: 96,
                disclaimer: "样例价格估算，不代表真实行情、真实盈亏或投资建议。",
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("buyPrice").value = "100";
  app.byId.get("holdingQty").value = "10";
  app.byId.get("targetReturn").value = "15";
  app.byId.get("maxLoss").value = "8";
  await app.byId.get("portfolioForm").dispatch("submit");

  const portfolioRequest = requests.find((request) =>
    request.url.endsWith("/api/portfolio"),
  );
  assert.equal(portfolioRequest.method, "POST");
  assert.deepEqual(JSON.parse(portfolioRequest.body), {
    code: "AAPL",
    buyPrice: "100",
    holdingQty: "10",
    buyDate: "",
    targetReturn: "15",
    maxLoss: "8",
  });
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.match(app.byId.get("portfolioSummary").innerHTML, /成本金额：1000.00/);
  assert.match(app.byId.get("statusMessage").textContent, /同步到后端/);
});

test("portfolio save ignores stale response after stock switch", async () => {
  let resolvePortfolioSave;
  const portfolioSaveResponse = new Promise((resolve) => {
    resolvePortfolioSave = resolve;
  });
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/portfolio") && options.method === "POST") {
          return portfolioSaveResponse;
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["持仓旧响应测试分析"],
              risks: ["样例风险"],
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/news")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  app.byId.get("buyPrice").value = "100";
  app.byId.get("holdingQty").value = "10";
  app.byId.get("targetReturn").value = "15";
  app.byId.get("maxLoss").value = "8";
  const savePromise = app.byId.get("portfolioForm").dispatch("submit");
  await Promise.resolve();
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  app.tabButtons[0].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  resolvePortfolioSave({
    ok: true,
    json: async () => ({
      saved: { code: "AAPL" },
      localSummary: { cost: 1000 },
    }),
  });
  await savePromise;

  const portfolioRequest = requests.find(
    (request) => request.url.endsWith("/api/portfolio") && request.method === "POST",
  );
  assert.equal(JSON.parse(portfolioRequest.body).code, "AAPL");
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
});

test("portfolio load ignores stale response after stock switch", async () => {
  let resolvePortfolioLoad;
  const portfolioLoadResponse = new Promise((resolve) => {
    resolvePortfolioLoad = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/portfolio") && !options.method) {
          return portfolioLoadResponse;
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["持仓读取旧响应测试分析"],
              risks: ["样例风险"],
            }),
          };
        }
        if (url.includes("/api/market-data/quote")) {
          return { ok: true, json: async () => ({ quote: null }) };
        }
        if (url.includes("/api/market-data/history")) {
          return { ok: true, json: async () => ({ points: [] }) };
        }
        if (url.includes("/api/news")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({}) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadPortfolio();
  await Promise.resolve();
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  app.tabButtons[0].click();
  assert.equal(app.byId.get("selectedStockName").textContent, "贵州茅台 · 600519");

  resolvePortfolioLoad({
    ok: true,
    json: async () => ({
      items: [
        {
          code: "AAPL",
          buyPrice: "120",
          holdingQty: "5",
          buyDate: "2026-05-12",
          targetReturn: "18",
          maxLoss: "7",
        },
      ],
    }),
  });
  const result = await loadPromise;

  assert.equal(result, null);
  assert.equal(app.byId.get("buyPrice").value, "");
  assert.equal(app.localStorage.getItem("portfolio"), null);
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
});

test("portfolio load ignores stale response after sign out", async () => {
  let resolvePortfolioLoad;
  const portfolioLoadResponse = new Promise((resolve) => {
    resolvePortfolioLoad = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/portfolio") && !options.method) {
          return portfolioLoadResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["退出登录后持仓读取旧响应测试"],
              risks: ["样例风险"],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadPortfolio();
  await Promise.resolve();
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolvePortfolioLoad({
    ok: true,
    json: async () => ({
      items: [
        {
          code: "AAPL",
          buyPrice: "120",
          holdingQty: "5",
          buyDate: "2026-05-12",
          targetReturn: "18",
          maxLoss: "7",
        },
      ],
    }),
  });
  const result = await loadPromise;

  assert.equal(result, null);
  assert.equal(app.byId.get("buyPrice").value, "");
  assert.equal(app.localStorage.getItem("portfolio"), null);
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("portfolio load stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let portfolioRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/portfolio")) {
          portfolioRequested = true;
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  code: "AAPL",
                  buyPrice: "120",
                  holdingQty: "5",
                  buyDate: "2026-05-12",
                  targetReturn: "18",
                  maxLoss: "7",
                },
              ],
            }),
          };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadPortfolio();
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  const result = await loadPromise;

  assert.equal(result, null);
  assert.equal(portfolioRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.equal(app.byId.get("buyPrice").value, "");
  assert.equal(app.localStorage.getItem("portfolio"), null);
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("portfolio save ignores stale response after sign out", async () => {
  let resolvePortfolioSave;
  const portfolioSaveResponse = new Promise((resolve) => {
    resolvePortfolioSave = resolve;
  });
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/portfolio") && options.method === "POST") {
          return portfolioSaveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["退出登录后持仓保存旧响应测试"],
              risks: ["样例风险"],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  app.byId.get("buyPrice").value = "100";
  app.byId.get("holdingQty").value = "10";
  app.byId.get("targetReturn").value = "15";
  app.byId.get("maxLoss").value = "8";
  const savePromise = app.byId.get("portfolioForm").dispatch("submit");
  await Promise.resolve();
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /正在同步持仓信息/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolvePortfolioSave({
    ok: true,
    json: async () => ({
      saved: { code: "AAPL" },
      localSummary: { cost: 1000 },
    }),
  });
  await savePromise;

  const portfolioRequest = requests.find(
    (request) => request.url.endsWith("/api/portfolio") && request.method === "POST",
  );
  assert.equal(JSON.parse(portfolioRequest.body).code, "AAPL");
  assert.doesNotMatch(app.byId.get("portfolioSyncState").innerHTML, /已同步持仓信息/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("authenticated backend portfolio save failure keeps local portfolio", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      selectedMarket: "us",
      selectedStockCode: "AAPL",
    },
    {
      fetchImpl: async (url) => {
        if (url.endsWith("/api/portfolio")) {
          throw new Error("持仓 API 断开");
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  app.byId.get("buyPrice").value = "100";
  app.byId.get("holdingQty").value = "10";
  await app.byId.get("portfolioForm").dispatch("submit");

  assert.deepEqual(JSON.parse(app.localStorage.getItem("portfolio")), {
    buyPrice: "100",
    holdingQty: "10",
    buyDate: "",
    targetReturn: "",
    maxLoss: "",
  });
  assert.match(app.byId.get("portfolioSyncState").innerHTML, /持仓同步失败/);
  assert.match(app.byId.get("statusMessage").textContent, /后端同步失败/);
});

test("analysis section renders loading state", () => {
  const app = createHarness({
    prototypeAnalysisState: "loading",
  });

  assert.match(app.byId.get("analysisState").innerHTML, /正在请求真实数据/);
  assert.equal(app.byId.get("analysisState").hidden, false);
  assert.equal(app.byId.get("reasonList").hidden, true);
  assert.equal(app.byId.get("riskBox").hidden, true);
});

test("analysis section renders empty state", () => {
  const app = createHarness({
    prototypeAnalysisState: "empty",
  });

  assert.match(app.byId.get("analysisState").innerHTML, /真实模型待配置|真实 AI 等待生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /不展示样例建议/);
  assert.equal(app.byId.get("reasonList").hidden, true);
  assert.equal(app.byId.get("riskBox").hidden, true);
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
});

test("analysis section renders error state and retry keeps strict blank analysis", async () => {
  const app = createHarness({
    prototypeAnalysisState: "error",
  });

  assert.match(app.byId.get("analysisState").innerHTML, /真实模型待配置|真实 AI 等待生成/);
  assert.match(app.byId.get("analysisState").innerHTML, /不展示样例建议/);
  assert.match(app.byId.get("analysisState").innerHTML, /data-retry-analysis/);

  await app.byId.get("analysisState").dispatch("click", {
    target: eventTargetFor("[data-retry-analysis]", {}),
  });

  assert.equal(app.localStorage.getItem("prototypeAnalysisState"), null);
  assert.equal(app.byId.get("analysisState").hidden, false);
  assert.equal(app.byId.get("reasonList").hidden, true);
  assert.equal(app.byId.get("riskBox").hidden, true);
  assert.equal(app.byId.get("actionText").textContent, "暂无真实 AI 分析。");
  assert.doesNotMatch(app.byId.get("reasonList").innerHTML, /消费板块情绪回暖/);
  assert.match(app.byId.get("statusMessage").textContent, /真实 AI 暂未返回可用分析/);
});

test("notification preferences persist locally", async () => {
  const app = createHarness();
  const emailInput = app.notificationInputs.find(
    (input) => input.dataset.notification === "email",
  );

  emailInput.checked = true;
  await emailInput.dispatch("change", { target: emailInput });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("notifications")), {
    email: true,
  });
  assert.match(app.byId.get("notificationStatus").textContent, /已保存 1 种提醒偏好/);
});

test("notification preference save ignores stale response after sign out", async () => {
  let resolvePreferenceSave;
  const preferenceSaveResponse = new Promise((resolve) => {
    resolvePreferenceSave = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      notifications: JSON.stringify({}),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/preferences") && options.method === "POST") {
          return preferenceSaveResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );
  const emailInput = app.notificationInputs.find(
    (input) => input.dataset.notification === "email",
  );

  emailInput.checked = true;
  const changePromise = emailInput.dispatch("change", { target: emailInput });
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolvePreferenceSave({
    ok: true,
    json: async () => ({
      preferences: {
        riskProfile: "conservative",
        notifications: { email: false, telegram: true },
      },
    }),
  });
  await changePromise;

  assert.equal(JSON.parse(app.localStorage.getItem("notifications")).email, true);
  assert.equal(JSON.parse(app.localStorage.getItem("notifications")).telegram, undefined);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("notification channel state explains local and system-permission limits", () => {
  const app = createHarness();

  assert.match(app.byId.get("notificationChannelState").innerHTML, /网页内/);
  assert.match(app.byId.get("notificationChannelState").innerHTML, /当前运行环境不支持系统通知权限/);
  assert.match(app.byId.get("notificationChannelState").innerHTML, /邮件/);
  assert.match(app.byId.get("notificationChannelState").innerHTML, /本机保存/);
});

test("connected notification service disables unsupported channels and filters saved preferences", () => {
  const app = createHarness({
    apiMode: "backend",
    apiHealthStatus: "connected",
    apiNotificationServiceStatus: JSON.stringify({
      id: "mock-notification-delivery",
      name: "Mock 通知投递服务",
      mode: "sample",
      status: "ready",
      deliveryMode: "outbox-only",
      supportedChannels: ["inApp", "telegram"],
      capabilities: ["outboxQueue"],
      disclaimer: "样例通知服务。",
    }),
    notifications: JSON.stringify({ email: true, telegram: true }),
  });
  const emailInput = app.notificationInputs.find(
    (input) => input.dataset.notification === "email",
  );
  const telegramInput = app.notificationInputs.find(
    (input) => input.dataset.notification === "telegram",
  );

  assert.equal(emailInput.disabled, true);
  assert.equal(emailInput.checked, false);
  assert.equal(telegramInput.disabled, false);
  assert.equal(telegramInput.checked, true);
  assert.deepEqual(JSON.parse(app.localStorage.getItem("notifications")), {
    telegram: true,
  });
  assert.match(app.byId.get("notificationChannelState").innerHTML, /后端暂不支持/);
  assert.match(app.byId.get("notificationChannelState").innerHTML, /后端 outbox 可排队/);
});

test("denied in-app system permission clears the in-app notification preference", async () => {
  const app = createHarness(
    {},
    {
      notificationImpl: {
        permission: "default",
        requestPermission: async () => "denied",
      },
    },
  );
  const inAppInput = app.notificationInputs.find(
    (input) => input.dataset.notification === "inApp",
  );

  inAppInput.checked = true;
  await inAppInput.dispatch("change", { target: inAppInput });

  assert.equal(inAppInput.checked, false);
  assert.deepEqual(JSON.parse(app.localStorage.getItem("notifications")), {
    inApp: false,
  });
  assert.match(app.byId.get("statusMessage").textContent, /系统通知权限已拒绝/);
});

test("authenticated notification center loads and marks notifications read", async () => {
  const requests = [];
  const notifications = [
    {
      id: "notification-1",
      ruleId: "reminder-1",
      code: "AAPL",
      type: "priceBelow",
      channel: "inApp",
      status: "queued",
      title: "价格提醒触发",
      body: "样例价格 196 已低于或等于 210。",
      deliveryStatus: "delivered",
      attemptCount: 1,
      deliveryAttempts: [
        {
          id: "delivery-1",
          status: "delivered",
          attemptedAt: "2026-06-01T00:00:10.000Z",
          message: "网页内提醒已写入样例通知中心。",
        },
      ],
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return { ok: true, json: async () => ({ items: notifications }) };
        }
        if (url.endsWith("/api/notifications/notification-1/read")) {
          notifications[0] = {
            ...notifications[0],
            status: "read",
            readAt: "2026-06-01T00:01:00.000Z",
          };
          return { ok: true, json: async () => ({ notification: notifications[0] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/analysis")) {
          return {
            ok: true,
            json: async () => ({
              symbol: "600519",
              riskProfile: "balanced",
              upsideProbability: 64,
              downsideProbability: 36,
              sentimentScore: 72,
              valuationScore: 58,
              technicalScore: 66,
              actionReference: "样例分析。",
              reasons: ["样例原因"],
              risks: ["样例风险"],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNotifications();

  assert.match(app.byId.get("notificationCenter").innerHTML, /价格提醒触发/);
  assert.match(app.byId.get("notificationCenter").innerHTML, /已排队/);
  assert.match(app.byId.get("notificationCenter").innerHTML, /已送达样例 outbox/);

  await app.byId.get("notificationCenter").dispatch("click", {
    target: eventTargetFor("[data-read-notification]", {
      readNotification: "notification-1",
    }),
  });

  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/notifications/notification-1/read" &&
        request.options.method === "POST",
    ),
  );
  assert.match(app.byId.get("notificationCenter").innerHTML, /已读/);
});

test("notification load ignores stale response after sign out", async () => {
  let resolveNotifications;
  const notificationResponse = new Promise((resolve) => {
    resolveNotifications = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return notificationResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.includes("/api/analysis?")) {
          return {
            ok: true,
            json: async () => ({
              upsideProbability: 58,
              downsideProbability: 42,
              reasons: ["通知旧响应测试分析"],
              risks: ["样例风险"],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  const loadPromise = app.context.window.financeAIAssistantApp.loadNotifications();
  await Promise.resolve();
  assert.match(app.byId.get("notificationCenter").innerHTML, /正在读取通知/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });
  assert.match(app.byId.get("notificationCenter").innerHTML, /通知中心等待连接/);

  resolveNotifications({
    ok: true,
    json: async () => ({
      items: [
        {
          id: "notification-stale",
          title: "旧账号通知",
          body: "这条通知属于已退出的账号。",
          channel: "inApp",
          status: "queued",
          deliveryStatus: "delivered",
          attemptCount: 1,
        },
      ],
    }),
  });
  const result = await loadPromise;

  assert.equal(result, null);
  assert.doesNotMatch(app.byId.get("notificationCenter").innerHTML, /旧账号通知/);
  assert.match(app.byId.get("notificationCenter").innerHTML, /通知中心等待连接/);
});

test("notification mark-read can auto-fetch demo auth token", async () => {
  const requests = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/auth/demo-login")) {
          return { ok: true, json: async () => ({ token: "fresh-demo-token" }) };
        }
        if (url.endsWith("/api/notifications/notification-auto-token/read")) {
          return { ok: true, json: async () => ({ notification: { id: "notification-auto-token" } }) };
        }
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.byId.get("notificationCenter").dispatch("click", {
    target: eventTargetFor("[data-read-notification]", {
      readNotification: "notification-auto-token",
    }),
  });

  assert.equal(app.localStorage.getItem("apiAuthToken"), "fresh-demo-token");
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/notifications/notification-auto-token/read" &&
        request.options.method === "POST",
    ),
  );
  assert.match(app.byId.get("statusMessage").textContent, /通知已标记为已读/);
});

test("notification mark-read ignores stale response after sign out", async () => {
  let resolveRead;
  const readResponse = new Promise((resolve) => {
    resolveRead = resolve;
  });
  const notification = {
    id: "notification-read-stale",
    title: "待读通知",
    body: "这条通知正在标记已读。",
    channel: "inApp",
    status: "queued",
    deliveryStatus: "delivered",
    attemptCount: 1,
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return { ok: true, json: async () => ({ items: [notification] }) };
        }
        if (url.endsWith("/api/notifications/notification-read-stale/read")) {
          return readResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNotifications();
  const readPromise = app.byId.get("notificationCenter").dispatch("click", {
    target: eventTargetFor("[data-read-notification]", {
      readNotification: "notification-read-stale",
    }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("notificationCenter").innerHTML, /已读/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });
  assert.match(app.byId.get("notificationCenter").innerHTML, /通知中心等待连接/);

  resolveRead({
    ok: true,
    json: async () => ({ notification: { ...notification, status: "read" } }),
  });
  await readPromise;

  assert.doesNotMatch(app.byId.get("notificationCenter").innerHTML, /待读通知/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /通知已标记为已读/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("failed notification delivery can be retried from notification center", async () => {
  const requests = [];
  const notifications = [
    {
      id: "notification-email",
      ruleId: "reminder-1",
      code: "AAPL",
      type: "priceBelow",
      channel: "email",
      status: "queued",
      deliveryStatus: "failed",
      attemptCount: 1,
      deliveryError: "邮件提醒外部投递连接器尚未配置。",
      deliveryAttempts: [
        {
          id: "delivery-email-1",
          status: "failed",
          attemptedAt: "2026-06-01T00:00:10.000Z",
          message: "邮件提醒外部投递连接器尚未配置。",
          errorCode: "CONNECTOR_NOT_CONFIGURED",
        },
      ],
      title: "价格提醒触发",
      body: "样例价格 196 已低于或等于 210。",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return { ok: true, json: async () => ({ items: notifications }) };
        }
        if (url.endsWith("/api/notifications/notification-email/retry")) {
          notifications[0] = {
            ...notifications[0],
            attemptCount: 2,
            nextRetryAt: "2026-06-01T00:05:10.000Z",
            deliveryAttempts: [
              {
                id: "delivery-email-2",
                status: "failed",
                attemptedAt: "2026-06-01T00:01:10.000Z",
                message: "邮件提醒外部投递连接器尚未配置。",
                errorCode: "CONNECTOR_NOT_CONFIGURED",
              },
              ...notifications[0].deliveryAttempts,
            ],
          };
          return { ok: true, json: async () => ({ notification: notifications[0] }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNotifications();
  assert.match(app.byId.get("notificationCenter").innerHTML, /投递失败/);
  assert.match(app.byId.get("notificationCenter").innerHTML, /重试投递/);

  await app.byId.get("notificationCenter").dispatch("click", {
    target: eventTargetFor("[data-retry-notification]", {
      retryNotification: "notification-email",
    }),
  });

  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/notifications/notification-email/retry" &&
        request.options.method === "POST",
    ),
  );
  assert.match(app.byId.get("notificationCenter").innerHTML, /尝试 2/);
  assert.match(app.byId.get("statusMessage").textContent, /重新尝试/);
});

test("notification retry ignores stale response after sign out", async () => {
  let resolveRetry;
  const retryResponse = new Promise((resolve) => {
    resolveRetry = resolve;
  });
  const notification = {
    id: "notification-retry-stale",
    ruleId: "reminder-1",
    code: "AAPL",
    type: "priceBelow",
    channel: "email",
    status: "queued",
    deliveryStatus: "failed",
    attemptCount: 1,
    deliveryError: "邮件提醒外部投递连接器尚未配置。",
    title: "待重试通知",
    body: "这条通知正在重试。",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/notifications") && options.method === "GET") {
          return { ok: true, json: async () => ({ items: [notification] }) };
        }
        if (url.endsWith("/api/notifications/notification-retry-stale/retry")) {
          return retryResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadNotifications();
  const retryPromise = app.byId.get("notificationCenter").dispatch("click", {
    target: eventTargetFor("[data-retry-notification]", {
      retryNotification: "notification-retry-stale",
    }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("notificationCenter").innerHTML, /等待投递/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });
  assert.match(app.byId.get("notificationCenter").innerHTML, /通知中心等待连接/);

  resolveRetry({
    ok: true,
    json: async () => ({
      notification: { ...notification, deliveryStatus: "queued", attemptCount: 2 },
    }),
  });
  await retryPromise;

  assert.doesNotMatch(app.byId.get("notificationCenter").innerHTML, /待重试通知/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /重新尝试/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("local reminder rules can be added and removed", async () => {
  const app = createHarness({
    notifications: JSON.stringify({ email: true }),
  });

  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceAbove";
  app.byId.get("reminderThreshold").value = "210";
  await app.byId.get("reminderForm").dispatch("submit");

  const savedRules = JSON.parse(app.localStorage.getItem("reminderRules"));
  assert.equal(savedRules.length, 1);
  assert.equal(savedRules[0].code, "AAPL");
  assert.equal(savedRules[0].type, "priceAbove");
  assert.equal(savedRules[0].threshold, "210");
  assert.deepEqual(savedRules[0].channels, ["email"]);
  assert.match(app.byId.get("reminderRules").innerHTML, /Apple · AAPL/);
  assert.match(app.byId.get("reminderRules").innerHTML, /价格高于/);
  assert.match(app.byId.get("reminderRules").innerHTML, /邮件/);
  assert.match(app.byId.get("notificationStatus").textContent, /1 条提醒规则/);
  assert.match(app.byId.get("statusMessage").textContent, /提醒规则已保存在本机/);

  await app.byId.get("reminderRules").dispatch("click", {
    target: eventTargetFor("[data-remove-reminder]", {
      removeReminder: savedRules[0].id,
    }),
  });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("reminderRules")), []);
  assert.match(app.byId.get("reminderRules").innerHTML, /还没有提醒规则/);
  assert.match(app.byId.get("statusMessage").textContent, /已移除本机提醒规则/);
});

test("reminder rule requires at least one available notification channel", async () => {
  const app = createHarness();

  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceAbove";
  app.byId.get("reminderThreshold").value = "210";
  await app.byId.get("reminderForm").dispatch("submit");

  assert.equal(app.localStorage.getItem("reminderRules"), null);
  assert.match(app.byId.get("statusMessage").textContent, /至少一种可用提醒方式/);
});

test("reminder rule requires a threshold", async () => {
  const app = createHarness();

  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceBelow";
  app.byId.get("reminderThreshold").value = "";
  await app.byId.get("reminderForm").dispatch("submit");

  assert.equal(app.localStorage.getItem("reminderRules"), null);
  assert.match(app.byId.get("statusMessage").textContent, /请填写提醒触发数值/);
});

test("authenticated backend reminder rules load, add, and remove through API", async () => {
  const requests = [];
  const backendRules = [];
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      notifications: JSON.stringify({ inApp: true, email: true }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET", body: options.body || "" });
        if (url.endsWith("/api/reminders") && options.method === "POST") {
          const body = JSON.parse(options.body);
          const saved = { id: "reminder-1", ...body };
          backendRules.unshift(saved);
          return { ok: true, json: async () => ({ saved }) };
        }
        if (url.includes("/api/reminders/") && options.method === "DELETE") {
          const id = decodeURIComponent(url.split("/").pop());
          const index = backendRules.findIndex((rule) => rule.id === id);
          if (index >= 0) backendRules.splice(index, 1);
          return { ok: true, json: async () => ({ removed: id, size: backendRules.length }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: backendRules }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadReminderRules();
  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceAbove";
  app.byId.get("reminderThreshold").value = "210";
  await app.byId.get("reminderForm").dispatch("submit");

  const postRequest = requests.find(
    (request) => request.url.endsWith("/api/reminders") && request.method === "POST",
  );
  assert.deepEqual(JSON.parse(postRequest.body), {
    code: "AAPL",
    type: "priceAbove",
    threshold: "210",
    channels: ["inApp", "email"],
  });
  assert.equal(JSON.parse(app.localStorage.getItem("reminderRules"))[0].id, "reminder-1");
  assert.match(app.byId.get("reminderRules").innerHTML, /已同步/);
  assert.match(app.byId.get("statusMessage").textContent, /同步到后端/);

  await app.byId.get("reminderRules").dispatch("click", {
    target: eventTargetFor("[data-remove-reminder]", {
      removeReminder: "reminder-1",
    }),
  });

  assert.deepEqual(JSON.parse(app.localStorage.getItem("reminderRules")), []);
  assert.ok(
    requests.some(
      (request) =>
        request.url === "http://localhost:4180/api/reminders/reminder-1" &&
        request.method === "DELETE",
    ),
  );
});

test("backend reminder failure keeps local reminder rule", async () => {
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      notifications: JSON.stringify({ telegram: true }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/reminders") && options.method === "POST") {
          throw new Error("提醒 API 断开");
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return {
          ok: true,
          json: async () => ({ market: "us", sourceStatus: "sample", items: [] }),
        };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadReminderRules();
  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "importantNews";
  app.byId.get("reminderThreshold").value = "80";
  await app.byId.get("reminderForm").dispatch("submit");

  const savedRules = JSON.parse(app.localStorage.getItem("reminderRules"));
  assert.equal(savedRules.length, 1);
  assert.equal(savedRules[0].source, "local");
  assert.match(app.byId.get("reminderRules").innerHTML, /本机保存/);
  assert.match(app.byId.get("statusMessage").textContent, /后端同步失败/);
});

test("reminder add ignores stale response after sign out", async () => {
  let resolveAdd;
  const addResponse = new Promise((resolve) => {
    resolveAdd = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      notifications: JSON.stringify({ email: true }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/reminders") && options.method === "POST") {
          return addResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadReminderRules();
  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceAbove";
  app.byId.get("reminderThreshold").value = "210";
  const addPromise = app.byId.get("reminderForm").dispatch("submit");
  await Promise.resolve();
  assert.match(app.byId.get("reminderRules").innerHTML, /本机保存/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveAdd({
    ok: true,
    json: async () => ({
      saved: {
        id: "reminder-stale-add",
        code: "AAPL",
        type: "priceAbove",
        threshold: "210",
        channels: ["email"],
      },
    }),
  });
  await addPromise;

  assert.doesNotMatch(app.byId.get("reminderRules").innerHTML, /已同步/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录/);
});

test("reminder add stops after stale demo auth token", async () => {
  let resolveDemoLogin;
  let reminderPostRequested = false;
  const demoLoginResponse = new Promise((resolve) => {
    resolveDemoLogin = resolve;
  });
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      notifications: JSON.stringify({ email: true }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/auth/demo-login")) return demoLoginResponse;
        if (url.endsWith("/api/reminders") && options.method === "POST") {
          reminderPostRequested = true;
          return {
            ok: true,
            json: async () => ({
              saved: {
                id: "late-reminder",
                code: "AAPL",
                type: "priceAbove",
                threshold: "210",
                channels: ["email"],
              },
            }),
          };
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  app.byId.get("reminderStock").value = "AAPL";
  app.byId.get("reminderType").value = "priceAbove";
  app.byId.get("reminderThreshold").value = "210";
  const addPromise = app.byId.get("reminderForm").dispatch("submit");
  await Promise.resolve();

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveDemoLogin({ ok: true, json: async () => ({ token: "late-demo-token" }) });
  await addPromise;

  assert.equal(reminderPostRequested, false);
  assert.equal(app.localStorage.getItem("apiAuthToken"), null);
  assert.match(app.byId.get("reminderRules").innerHTML, /本机保存/);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /同步到后端/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录|已退出样例登录/);
});

test("reminder remove ignores stale response after sign out", async () => {
  let resolveRemove;
  const removeResponse = new Promise((resolve) => {
    resolveRemove = resolve;
  });
  const backendRule = {
    id: "reminder-stale-remove",
    code: "AAPL",
    type: "priceBelow",
    threshold: "180",
    channels: ["email"],
  };
  const app = createHarness(
    {
      apiMode: "backend",
      apiHealthStatus: "connected",
      prototypeAccountState: "authenticated",
      apiAuthToken: "demo-token",
      notifications: JSON.stringify({ email: true }),
    },
    {
      fetchImpl: async (url, options = {}) => {
        if (url.endsWith("/api/reminders/reminder-stale-remove") && options.method === "DELETE") {
          return removeResponse;
        }
        if (url.endsWith("/api/auth/logout")) {
          return { ok: true, json: async () => ({ revoked: true }) };
        }
        if (url.endsWith("/api/reminders")) {
          return { ok: true, json: async () => ({ items: [backendRule] }) };
        }
        if (url.endsWith("/api/watchlist")) {
          return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      },
    },
  );

  await app.context.window.financeAIAssistantApp.loadReminderRules();
  assert.match(app.byId.get("reminderRules").innerHTML, /已同步/);
  const removePromise = app.byId.get("reminderRules").dispatch("click", {
    target: eventTargetFor("[data-remove-reminder]", {
      removeReminder: "reminder-stale-remove",
    }),
  });
  await Promise.resolve();
  assert.match(app.byId.get("reminderRules").innerHTML, /还没有提醒规则/);

  await app.byId.get("accountState").dispatch("click", {
    target: eventTargetFor("[data-sign-out-demo]", {}),
  });

  resolveRemove({
    ok: true,
    json: async () => ({ removed: "reminder-stale-remove", size: 0 }),
  });
  await removePromise;

  assert.deepEqual(JSON.parse(app.localStorage.getItem("reminderRules")), []);
  assert.doesNotMatch(app.byId.get("statusMessage").textContent, /后端移除/);
  assert.match(app.byId.get("statusMessage").textContent, /已退出登录/);
});

test("term explanation dialog opens and closes", () => {
  const app = createHarness();

  app.termButtons[0].click();
  assert.equal(app.byId.get("termDialog").open, true);
  assert.equal(app.byId.get("termTitle").textContent, "市场情绪");

  app.byId.get("closeTermDialog").click();
  assert.equal(app.byId.get("termDialog").open, false);
});

test("metric term buttons render as info controls rather than unknown values", () => {
  const app = createHarness();

  assert.equal(app.termButtons[0].textContent, "i");
  assert.equal(app.termButtons[1].textContent, "i");
  assert.equal(app.termButtons[2].textContent, "i");
  assert.equal(app.termButtons[0].title, "查看市场情绪解释");
  assert.equal(app.termButtons[1].getAttribute("aria-label"), "查看估值吸引力解释");
  assert.equal(app.termButtons[2].getAttribute("aria-label"), "查看技术面强弱解释");
  assert.notEqual(app.termButtons[0].textContent, "?");
});

test("corrupt local storage JSON is cleared instead of crashing startup", () => {
  const app = createHarness({
    notifications: "{broken",
    portfolio: "{broken",
    recentSearches: "{broken",
    watchlist: "{broken",
  });

  assert.equal(app.localStorage.getItem("notifications"), null);
  assert.equal(app.localStorage.getItem("portfolio"), null);
  assert.equal(app.localStorage.getItem("recentSearches"), null);
  assert.equal(app.localStorage.getItem("watchlist"), null);
  assert.equal(app.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
});

test("refresh startup clears stale selected A-share and opens verified MSFT real-data path", () => {
  const app = createHarness(
    {
      selectedMarket: "a",
      selectedStockCode: "600519",
      selectedStockMetadata: JSON.stringify({ code: "600519", name: "贵州茅台", market: "a" }),
    },
    {
      location: { search: "?refresh=20260612-ai-setup-v26" },
    },
  );

  assert.equal(app.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
  assert.equal(app.localStorage.getItem("selectedMarket"), "us");
  assert.equal(app.localStorage.getItem("selectedStockCode"), "MSFT");
});

test("connected AI settings render local model key setup without exposing a key", () => {
  const app = createHarness({
    apiHealthStatus: "connected",
    apiAiServiceStatus: JSON.stringify({
      id: "mock-ai-analysis",
      name: "Mock AI 分析服务",
      mode: "sample",
      status: "ready",
      model: "rule-based-sample-v0",
      capabilities: ["quantifiedProbability"],
      providerAdapter: {
        id: "ai-provider-adapter",
        status: "blocked",
        runtimeMode: "inactive",
        selectedProvider: "openai-compatible",
        selectedModel: "",
        baseUrlStatus: "unconfigured",
        apiStyle: "responses",
        recommendedModelId: "gpt-5.5",
        configured: false,
        supported: true,
        canCallLiveModel: false,
        blockedReasons: ["AI provider、API key 或模型 id 尚未配置。"],
      },
    }),
  });

  assert.match(app.byId.get("aiServiceState").innerHTML, /真实 AI 模型待配置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /完整 AI 还需要模型 key/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /严格真实数据空白模式/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /本机 AI 模型配置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /备用模型状态未返回|备用模型 未配置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /OpenAI API 主模型|Google Gemini 2\.5 Flash 免费备用/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /OpenRouter 免费模型备用/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /Groq 免费模型备用/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /保存位置/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /备用 2 OpenRouter/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /备用 3 Groq/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /gpt-5\.5/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /api\.openai\.com\/v1/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /如果 OpenAI 出现额度不足/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /不会再因为单一 provider 限流而全局锁死重试/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /保存到本机运行时/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /AI 模型路线/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /短期可行性：85\/100/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /从零训练模型：10\/100/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /当前不建议先独立训练基础模型/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /<details class="provider-advanced ai-service-advanced">/);
  assert.match(app.byId.get("aiServiceState").innerHTML, /展开 AI 技术诊断/);
  assert.doesNotMatch(app.byId.get("aiServiceState").innerHTML, /<details class="provider-advanced ai-service-advanced"\s+open/);
  assert.doesNotMatch(app.byId.get("aiServiceState").innerHTML, /AI 分析服务已连接/);
  assert.doesNotMatch(app.byId.get("aiServiceState").innerHTML, /secret-model-key/);
});

test("invalid saved local storage shapes fall back to safe defaults", () => {
  const app = createHarness({
    notifications: JSON.stringify(["email"]),
    portfolio: JSON.stringify(["bad"]),
    recentSearches: JSON.stringify({ keyword: "Apple" }),
    riskProfile: "banana",
    selectedMarket: "mars",
    watchlist: JSON.stringify({ code: "AAPL" }),
  });

  assert.equal(app.byId.get("riskProfile").value, "balanced");
  assert.equal(app.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
  assert.match(app.byId.get("watchlistItems").innerHTML, /还没有自选股/);
  assert.equal(app.byId.get("watchlistHint").hidden, true);
  assert.equal(app.byId.get("recentSearchBlock").hidden, true);
  assert.equal(app.byId.get("portfolioSummary").hidden, true);
  assert.match(app.byId.get("notificationStatus").textContent, /提醒偏好会先保存在本机/);
});

test("saved state survives a new app harness", () => {
  const firstRun = createHarness();
  firstRun.searchAssist.dispatch("click", {
    target: eventTargetFor("[data-search-keyword]", { searchKeyword: "Apple" }),
  });
  firstRun.byId.get("addWatchButton").click();
  firstRun.byId.get("buyPrice").value = "100";
  firstRun.byId.get("holdingQty").value = "5";
  firstRun.byId.get("portfolioForm").dispatch("submit");

  const secondRun = createHarness(firstRun.localStorage.snapshot());

  assert.equal(secondRun.byId.get("selectedStockName").textContent, "Microsoft · MSFT");
  assert.equal(secondRun.tabButtons[0].classList.contains("is-active"), false);
  assert.equal(secondRun.tabButtons[2].classList.contains("is-active"), true);
  assert.match(secondRun.byId.get("watchlistItems").innerHTML, /Microsoft/);
  assert.doesNotMatch(secondRun.byId.get("watchlistItems").innerHTML, /上涨参考概率 \d+%|偏利好|偏谨慎/);
  assert.match(secondRun.byId.get("portfolioSummary").innerHTML, /成本金额：500.00/);
  assert.match(secondRun.byId.get("portfolioSummary").innerHTML, /等待真实当前价后计算浮动收益率/);
  assert.doesNotMatch(secondRun.byId.get("portfolioSummary").innerHTML, /样例当前价|样例浮动收益率/);
  assert.doesNotMatch(secondRun.byId.get("recentSearchChips").innerHTML, /<script|onclick=/);
});
