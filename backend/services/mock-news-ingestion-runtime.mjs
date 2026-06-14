const defaultRuntimeId = "mock-news-ingestion-runtime";
const cooldownWindowMs = 300_000;

function toIso(timeMs) {
  return new Date(timeMs).toISOString();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[·,，。！!：:\s]+/g, "");
}

function normalizeSourceLabel(item = {}) {
  if (item.source && typeof item.source.label === "string" && item.source.label.trim()) {
    return item.source.label.trim();
  }
  if (typeof item.source === "string" && item.source.trim()) return item.source.trim();
  return "";
}

function normalizeLicenseTag(item = {}) {
  if (item.source && typeof item.source.licenseTag === "string" && item.source.licenseTag.trim()) {
    return item.source.licenseTag.trim();
  }
  if (typeof item.licenseTag === "string" && item.licenseTag.trim()) return item.licenseTag.trim();
  return "";
}

function dedupeKey({ sourceType, market, symbol, item }) {
  return [
    sourceType || "news",
    market || item.market || "global",
    symbol || item.symbol || item.code || "all",
    normalizeText(item.title),
    normalizeText(normalizeSourceLabel(item)),
  ].join("|");
}

function sourceKey(sourceType, market, symbol) {
  return `${sourceType || "news"}:${market || "global"}:${symbol || "all"}`;
}

function summarizeCooldown([key, cooldown]) {
  return {
    key,
    runCount: cooldown.runCount,
    lastRunAt: toIso(cooldown.lastRunAtMs),
    cooldownUntil: toIso(cooldown.cooldownUntilMs),
    status: cooldown.status,
  };
}

export function createMockNewsIngestionRuntime({ now = () => Date.now() } = {}) {
  const dedupeCache = new Map();
  const sourceCooldowns = new Map();
  const recentRuns = [];

  function status() {
    return {
      id: defaultRuntimeId,
      name: "本地新闻采集遥测运行时",
      mode: "strict-real-data-observability",
      status: "ready",
      executionMode: "no-vendor-network",
      sourceTypes: ["news", "filing", "publicStatement"],
      cooldownWindowSeconds: cooldownWindowMs / 1000,
      dedupeRecordCount: dedupeCache.size,
      sourceCooldowns: [...sourceCooldowns.entries()]
        .slice(-5)
        .reverse()
        .map(summarizeCooldown),
      recentRuns: recentRuns.slice(0, 5),
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
        fixtureOnly: false,
        emptyWhenNoRealData: true,
        attributionRequired: true,
      },
      disclaimer:
        "当前新闻采集运行时只记录真实 provider 或人工导入结果的去重、署名、授权边界与冷却窗口；没有真实数据时保持空白。",
    };
  }

  function processBatch({ sourceType = "news", market = "", symbol = "", items = [] } = {}) {
    const checkedAtMs = now();
    const key = sourceKey(sourceType, market, symbol);
    const previousCooldown = sourceCooldowns.get(key);
    const inCooldown = Boolean(previousCooldown && checkedAtMs < previousCooldown.cooldownUntilMs);
    let acceptedCount = 0;
    let duplicateCount = 0;
    let attributionMissingCount = 0;
    let blockedCount = 0;

    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item || typeof item !== "object" || !String(item.title || "").trim()) {
        blockedCount += 1;
        return;
      }

      const sourceLabel = normalizeSourceLabel(item);
      const licenseTag = normalizeLicenseTag(item);
      if (!sourceLabel || !licenseTag) {
        attributionMissingCount += 1;
        blockedCount += 1;
        return;
      }

      const keyForItem = dedupeKey({ sourceType, market, symbol, item });
      if (dedupeCache.has(keyForItem)) {
        duplicateCount += 1;
        return;
      }

      dedupeCache.set(keyForItem, {
        acceptedAt: toIso(checkedAtMs),
        sourceType,
        market: market || item.market || "",
        symbol: symbol || item.symbol || item.code || "",
        title: item.title,
        sourceLabel,
        licenseTag,
      });
      acceptedCount += 1;
    });

    const cooldown = {
      runCount: (previousCooldown?.runCount || 0) + 1,
      lastRunAtMs: checkedAtMs,
      cooldownUntilMs: checkedAtMs + cooldownWindowMs,
      status: inCooldown ? "cooldown-active" : "cooldown-started",
    };
    sourceCooldowns.set(key, cooldown);

    const run = {
      checkedAt: toIso(checkedAtMs),
      sourceKey: key,
      sourceType,
      market,
      symbol,
      inputCount: Array.isArray(items) ? items.length : 0,
      acceptedCount,
      duplicateCount,
      attributionMissingCount,
      blockedCount,
      cooldownStatus: cooldown.status,
      cooldownUntil: toIso(cooldown.cooldownUntilMs),
    };
    recentRuns.unshift(run);
    recentRuns.splice(10);

    return {
      id: defaultRuntimeId,
      status: "observed",
      sourceKey: key,
      ...run,
      dedupeRecordCount: dedupeCache.size,
      safety: status().safety,
      disclaimer: status().disclaimer,
    };
  }

  function observePayload({ sourceType = "news", market = "", symbol = "", payload } = {}) {
    if (!payload || typeof payload !== "object" || payload.status !== "ok") return payload;
    const telemetry = processBatch({
      sourceType,
      market: payload.market || market,
      symbol: payload.symbol || symbol,
      items: payload.items,
    });
    return {
      ...payload,
      ingestionTelemetry: telemetry,
    };
  }

  return {
    status,
    processBatch,
    observePayload,
  };
}
