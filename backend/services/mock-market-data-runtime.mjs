const defaultRuntimeId = "mock-market-data-runtime";
const rateLimitWindowMs = 60_000;
const circuitBreakerFailureThreshold = 5;
const circuitBreakerCoolDownMs = 60_000;

function toIso(timeMs) {
  return new Date(timeMs).toISOString();
}

function isRecordablePayload(payload) {
  return payload && typeof payload === "object" && payload.status === "ok";
}

function readExecutionPlan(payload = {}) {
  return payload.executionPlan || payload.requestExecutionPlan || null;
}

function fallbackCacheKey(kind, payload = {}) {
  const market = payload.market || payload.quote?.market || "any-market";
  const code = payload.code || payload.symbol || payload.quote?.code || "any-code";
  const range = payload.range || (kind === "history" ? "6m" : "spot");
  const interval = payload.interval || (kind === "history" ? "1mo" : "snapshot");
  return `mock:${market}:${code}:${range}:${interval}`;
}

function cacheState(record, nowMs) {
  if (!record) return "miss";
  if (nowMs <= record.freshUntilMs) return "fresh";
  if (nowMs <= record.maxStaleUntilMs) return "stale";
  return "expired";
}

function summarizeCacheRecord([key, record], nowMs) {
  return {
    key,
    kind: record.kind,
    cachedAt: toIso(record.cachedAtMs),
    freshUntil: toIso(record.freshUntilMs),
    maxStaleUntil: toIso(record.maxStaleUntilMs),
    state: cacheState(record, nowMs),
  };
}

function summarizeRateLimitWindow([key, window]) {
  return {
    key,
    count: window.count,
    limit: window.limit,
    remaining: Math.max(0, window.limit - window.count),
    windowStartedAt: toIso(window.windowStartedAtMs),
    windowEndsAt: toIso(window.windowEndsAtMs),
    checkedAt: toIso(window.checkedAtMs),
  };
}

function resolveCircuitState(breaker, nowMs) {
  if (!breaker) return "closed";
  if (breaker.state === "open" && nowMs >= breaker.coolDownUntilMs) return "half-open";
  return breaker.state || "closed";
}

function summarizeCircuitBreaker([key, breaker], nowMs) {
  return {
    key,
    state: resolveCircuitState(breaker, nowMs),
    consecutiveFailures: breaker.consecutiveFailures,
    lastFailureAt: breaker.lastFailureAtMs ? toIso(breaker.lastFailureAtMs) : "",
    coolDownUntil: breaker.coolDownUntilMs ? toIso(breaker.coolDownUntilMs) : "",
    reason: breaker.reason || "",
  };
}

export function createMockMarketDataRuntime({ now = () => Date.now() } = {}) {
  const cacheRecords = new Map();
  const rateLimitWindows = new Map();
  const circuitBreakers = new Map();
  const recentExecutions = [];

  function status() {
    const nowMs = now();
    return {
      id: defaultRuntimeId,
      name: "本地行情请求遥测运行时",
      mode: "strict-real-data-observability",
      status: "ready",
      executionMode: "no-vendor-network",
      cacheStore: "memory-telemetry",
      cachePolicy: {
        freshnessModel: "fresh-stale-expired",
        maxRecords: 200,
        staleFallback: "empty-when-no-real-data",
      },
      cacheRecordCount: cacheRecords.size,
      rateLimitWindowCount: rateLimitWindows.size,
      rateLimitWindowSeconds: rateLimitWindowMs / 1000,
      circuitBreakerPolicy: {
        failureThreshold: circuitBreakerFailureThreshold,
        coolDownSeconds: circuitBreakerCoolDownMs / 1000,
        halfOpenProbe: "next-success-closes-breaker",
      },
      cacheRecords: [...cacheRecords.entries()]
        .slice(-5)
        .reverse()
        .map((entry) => summarizeCacheRecord(entry, nowMs)),
      rateLimitWindows: [...rateLimitWindows.entries()]
        .slice(-5)
        .reverse()
        .map(summarizeRateLimitWindow),
      circuitBreakers: [...circuitBreakers.entries()]
        .slice(-5)
        .reverse()
        .map((entry) => summarizeCircuitBreaker(entry, nowMs)),
      recentExecutions: recentExecutions.slice(0, 5),
      capabilities: [
        "cacheLookupTelemetry",
        "cacheFreshnessTelemetry",
        "rateLimitTelemetry",
        "rateLimitWindowTelemetry",
        "circuitBreakerTelemetry",
        "emptyResponseTelemetry",
        "auditEventDraftExecution",
      ],
      safety: {
        noVendorNetworkCalls: true,
        noTradingActions: true,
        fixtureOnly: false,
        emptyWhenNoRealData: true,
      },
      disclaimer:
        "当前运行时只记录真实行情请求的缓存、限流、空响应和审计轨迹；没有真实 provider 数据时保持空白。",
    };
  }

  function circuitKey(provider, kind) {
    return `${provider || "mock"}:${kind || "quote"}`;
  }

  function recordProviderFailure({ provider = "mock", kind = "quote", reason = "provider-error" } = {}) {
    const nowMs = now();
    const key = circuitKey(provider, kind);
    const existing = circuitBreakers.get(key) || {
      state: "closed",
      consecutiveFailures: 0,
      coolDownUntilMs: 0,
      lastFailureAtMs: 0,
      reason: "",
    };
    const effectiveState = resolveCircuitState(existing, nowMs);
    const consecutiveFailures =
      effectiveState === "open" ? existing.consecutiveFailures : existing.consecutiveFailures + 1;
    const shouldOpen =
      consecutiveFailures >= circuitBreakerFailureThreshold && effectiveState !== "open";
    const nextBreaker = {
      state: shouldOpen ? "open" : effectiveState,
      consecutiveFailures,
      coolDownUntilMs: shouldOpen ? nowMs + circuitBreakerCoolDownMs : existing.coolDownUntilMs,
      lastFailureAtMs: nowMs,
      reason,
    };
    circuitBreakers.set(key, nextBreaker);
    return summarizeCircuitBreaker([key, nextBreaker], nowMs);
  }

  function recordProviderSuccess(provider, kind, nowMs) {
    const key = circuitKey(provider, kind);
    const existing = circuitBreakers.get(key);
    if (!existing) {
      return {
        key,
        state: "closed",
        consecutiveFailures: 0,
        lastFailureAt: "",
        coolDownUntil: "",
        reason: "",
      };
    }
    const nextBreaker = {
      state: "closed",
      consecutiveFailures: 0,
      coolDownUntilMs: 0,
      lastFailureAtMs: existing.lastFailureAtMs || 0,
      reason: "",
    };
    circuitBreakers.set(key, nextBreaker);
    return summarizeCircuitBreaker([key, nextBreaker], nowMs);
  }

  function execute({ repository, user, kind = "quote", payload } = {}) {
    if (!isRecordablePayload(payload)) return payload;

    const executedAtMs = now();
    const executedAt = toIso(executedAtMs);
    const executionPlan = readExecutionPlan(payload);
    const cacheKey = executionPlan?.cache?.key || fallbackCacheKey(kind, payload);
    const cachedRecord = cacheRecords.get(cacheKey);
    const currentCacheState = cacheState(cachedRecord, executedAtMs);
    const cacheHit = currentCacheState === "fresh" || currentCacheState === "stale";
    const ttlSeconds = Number.isFinite(Number(executionPlan?.cache?.ttlSeconds))
      ? Number(executionPlan.cache.ttlSeconds)
      : kind === "history"
        ? 3600
        : 900;
    const maxStaleSeconds = Number.isFinite(Number(executionPlan?.cache?.maxStaleSeconds))
      ? Number(executionPlan.cache.maxStaleSeconds)
      : 1800;
    const shouldRefreshCache =
      currentCacheState === "miss" || currentCacheState === "stale" || currentCacheState === "expired";

    if (shouldRefreshCache) {
      cacheRecords.set(cacheKey, {
        kind,
        cachedAtMs: executedAtMs,
        ttlSeconds,
        maxStaleSeconds,
        freshUntilMs: executedAtMs + ttlSeconds * 1000,
        maxStaleUntilMs: executedAtMs + (ttlSeconds + maxStaleSeconds) * 1000,
      });
    }
    if (cacheRecords.size > 200) {
      const oldestKey = cacheRecords.keys().next().value;
      cacheRecords.delete(oldestKey);
    }

    const provider = executionPlan?.rateLimit?.provider || "mock";
    const circuitBefore = summarizeCircuitBreaker(
      [
        circuitKey(provider, kind),
        circuitBreakers.get(circuitKey(provider, kind)) || {
          state: "closed",
          consecutiveFailures: 0,
          coolDownUntilMs: 0,
          lastFailureAtMs: 0,
          reason: "",
        },
      ],
      executedAtMs,
    );
    const circuitAfter = recordProviderSuccess(provider, kind, executedAtMs);
    const windowKey = `${provider}:${kind}`;
    const tokenCost = Number.isFinite(Number(executionPlan?.rateLimit?.tokenCost))
      ? Number(executionPlan.rateLimit.tokenCost)
      : 0;
    const maxRequestsPerMinute = Number.isFinite(Number(executionPlan?.rateLimit?.maxRequestsPerMinute))
      ? Number(executionPlan.rateLimit.maxRequestsPerMinute)
      : 60;
    const previousWindow = rateLimitWindows.get(windowKey);
    const activeWindow =
      previousWindow && executedAtMs < previousWindow.windowEndsAtMs
        ? previousWindow
        : {
            count: 0,
            limit: maxRequestsPerMinute,
            windowStartedAtMs: executedAtMs,
            windowEndsAtMs: executedAtMs + rateLimitWindowMs,
            checkedAtMs: executedAtMs,
          };
    const nextWindow = {
      ...activeWindow,
      limit: maxRequestsPerMinute,
      count: activeWindow.count + tokenCost,
      checkedAtMs: executedAtMs,
    };
    rateLimitWindows.set(windowKey, nextWindow);

    const executionSummary = {
      executedAt,
      requestKind: kind,
      cacheKey,
      cacheState: currentCacheState,
      cacheHit,
      refreshed: shouldRefreshCache,
      rateLimitKey: windowKey,
      rateLimitCount: nextWindow.count,
      fallback: executionPlan?.fallback?.selected || "fixture-or-local-sample",
      circuitState: circuitBefore.state,
    };
    recentExecutions.unshift(executionSummary);
    recentExecutions.splice(20);

    const previousWindowForAudit = previousWindow || {
      count: 0,
    };

    const auditEvent = repository?.recordAudit?.({
      user,
      eventType: "marketData.request.runtime",
      message: "Market data runtime telemetry recorded.",
      metadata: {
        requestKind: kind,
        status: payload.status,
        cacheKey,
        cacheHit,
        cacheState: currentCacheState,
        refreshed: shouldRefreshCache,
        tokenCost,
        rateLimitWindowCount: nextWindow.count,
        previousRateLimitWindowCount: previousWindowForAudit.count,
        circuitStateBefore: circuitBefore.state,
        circuitStateAfter: circuitAfter.state,
        fallback: executionPlan?.fallback?.selected || "empty-no-fixture",
        gateStatus: payload.policyGate?.status || executionPlan?.auditDraft?.metadata?.gateStatus || "",
      },
    });

    return {
      ...payload,
      runtimeTelemetry: {
        id: defaultRuntimeId,
        status: "recorded",
        mode: "no-vendor-network",
        executedAt,
        cache: {
          key: cacheKey,
          hit: cacheHit,
          state: currentCacheState,
          stored: shouldRefreshCache,
          refreshSuggested: currentCacheState === "stale" || currentCacheState === "expired",
          ttlSeconds,
          maxStaleSeconds,
          freshUntil: toIso(executedAtMs + ttlSeconds * 1000),
          maxStaleUntil: toIso(executedAtMs + (ttlSeconds + maxStaleSeconds) * 1000),
          store: "memory-telemetry",
        },
        rateLimit: {
          counterKey: windowKey,
          tokenCost,
          consumed: tokenCost > 0,
          currentWindowCount: nextWindow.count,
          maxRequestsPerMinute,
          burstLimit: executionPlan?.rateLimit?.burstLimit || 0,
          remainingWindowTokens: Math.max(0, maxRequestsPerMinute - nextWindow.count),
          windowStartedAt: toIso(nextWindow.windowStartedAtMs),
          windowEndsAt: toIso(nextWindow.windowEndsAtMs),
          allowed: true,
          mode: "dry-run-counter",
        },
        circuitBreaker: {
          key: circuitAfter.key,
          stateBefore: circuitBefore.state,
          stateAfter: circuitAfter.state,
          consecutiveFailures: circuitAfter.consecutiveFailures,
          failureThreshold: circuitBreakerFailureThreshold,
          coolDownSeconds: circuitBreakerCoolDownMs / 1000,
          coolDownUntil: circuitAfter.coolDownUntil,
        },
        fallback: {
          selected: executionPlan?.fallback?.selected || "empty-no-fixture",
          localSampleAllowed: executionPlan?.fallback?.localSampleAllowed === true,
        },
        audit: {
          recorded: Boolean(auditEvent),
          eventType: "marketData.request.runtime",
          eventId: auditEvent?.id || "",
          userScoped: Boolean(user?.id),
        },
        disclaimer:
          "该遥测仅说明真实行情请求的执行轨迹；没有真实数据时保持空白，不构成投资建议。",
      },
    };
  }

  return {
    status,
    execute,
    recordProviderFailure,
  };
}
