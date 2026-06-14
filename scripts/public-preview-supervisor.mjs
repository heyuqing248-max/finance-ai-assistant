#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runPublicPreviewHealthCheck } from "./public-preview-health-check.mjs";
import { runPublicPreviewWatchdog } from "./public-preview-watchdog.mjs";

const DEFAULT_LOCAL_PORT = 4192;
const DEFAULT_LOCAL_HOST = "127.0.0.1";
const DEFAULT_LOCAL_HEALTH_TIMEOUT_MS = 20 * 1000;
const DEFAULT_LOCAL_HEALTH_INTERVAL_MS = 500;
const DEFAULT_RESTART_BACKOFF_MS = 1500;
const DEFAULT_STANDBY_TUNNEL_COUNT = 2;

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(now = Date.now) {
  return new Date(now()).toISOString();
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildLocalFallbackUrl(options = {}) {
  const port = parseNumber(options.localPort, DEFAULT_LOCAL_PORT);
  const host = options.localHost || DEFAULT_LOCAL_HOST;
  return normalizeBaseUrl(options.localFallbackUrl || `http://${host}:${port}`);
}

function appendPath(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchLocalHealth(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = parseNumber(options.timeoutMs, 3000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(appendPath(options.localFallbackUrl, "/health"), {
      cache: "no-store",
      signal: controller.signal,
    });
    return {
      ok: response.status === 200,
      status: response.status,
      durationMs: Date.now() - startedAt,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForLocalHealth(options = {}) {
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_LOCAL_HEALTH_TIMEOUT_MS);
  const intervalMs = parseNumber(options.intervalMs, DEFAULT_LOCAL_HEALTH_INTERVAL_MS);
  const now = options.now || Date.now;
  const wait = options.sleep || sleep;
  const deadline = now() + timeoutMs;
  let lastResult = null;
  while (now() < deadline) {
    lastResult = await fetchLocalHealth(options);
    if (lastResult.ok) return lastResult;
    await wait(Math.min(intervalMs, Math.max(0, deadline - now())));
  }
  return lastResult || { ok: false, status: 0, durationMs: 0, error: "local health timeout" };
}

function startLocalPreviewServer(options = {}) {
  const spawnImpl = options.spawnImpl || spawn;
  const nodeBinary = options.nodeBinary || process.execPath;
  const serverScript =
    options.serverScript ||
    fileURLToPath(new URL("./public-preview-server.mjs", import.meta.url));
  const localPort = String(parseNumber(options.localPort, DEFAULT_LOCAL_PORT));
  const localHost = options.localHost || DEFAULT_LOCAL_HOST;
  return spawnImpl(nodeBinary, [serverScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      FINANCE_AI_PUBLIC_PORT: localPort,
      FINANCE_AI_PUBLIC_HOST: localHost,
    },
  });
}

function stopProcess(child) {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // Cleanup is best effort; health checks decide the real state.
  }
}

export async function runPublicPreviewSupervisor(options = {}) {
  const localPort = parseNumber(options.localPort, DEFAULT_LOCAL_PORT);
  const localHost = options.localHost || DEFAULT_LOCAL_HOST;
  const localFallbackUrl = buildLocalFallbackUrl({ ...options, localPort, localHost });
  const manageLocalServer = options.manageLocalServer !== false;
  const restartBackoffMs = parseNumber(options.restartBackoffMs, DEFAULT_RESTART_BACKOFF_MS);
  const standbyTunnelCount = parseNonNegativeInteger(
    options.standbyTunnelCount,
    DEFAULT_STANDBY_TUNNEL_COUNT,
  );
  const wait = options.sleep || sleep;
  const now = options.now || Date.now;
  const onEvent = options.onEvent || (() => {});
  const watchdog = options.watchdog || runPublicPreviewWatchdog;
  const publicHealthCheck = options.publicHealthCheck || runPublicPreviewHealthCheck;
  const startLocalServer = options.startLocalServer || startLocalPreviewServer;
  const events = [];
  let localServer = null;
  let localRestartCount = 0;

  const emit = (event) => {
    const payload = { at: nowIso(now), ...event };
    events.push(payload);
    onEvent(payload);
    return payload;
  };

  async function ensureLocalServer(reason = "startup") {
    const existingHealth = await fetchLocalHealth({
      localFallbackUrl,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.localHealthRequestTimeoutMs,
    });
    if (existingHealth.ok) {
      emit({ type: "local-health-ok", reason, localFallbackUrl });
      return existingHealth;
    }
    if (!manageLocalServer) {
      emit({ type: "local-health-failed", reason, localFallbackUrl, error: existingHealth.error });
      return existingHealth;
    }
    if (localServer) {
      stopProcess(localServer);
      await wait(restartBackoffMs);
    }
    localRestartCount += 1;
    emit({ type: "local-server-starting", reason, localFallbackUrl, localRestartCount });
    localServer = startLocalServer({
      localPort,
      localHost,
      spawnImpl: options.spawnImpl,
      nodeBinary: options.nodeBinary,
      serverScript: options.serverScript,
    });
    const startedHealth = await waitForLocalHealth({
      localFallbackUrl,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.localHealthTimeoutMs,
      intervalMs: options.localHealthIntervalMs,
      sleep: wait,
      now,
    });
    emit({
      type: startedHealth.ok ? "local-server-ready" : "local-server-unhealthy",
      reason,
      localFallbackUrl,
      localRestartCount,
      error: startedHealth.error,
    });
    return startedHealth;
  }

  const startupHealth = await ensureLocalServer("startup");
  if (!startupHealth.ok) {
    if (options.once && localServer && !options.keepLocalServerOnExit) stopProcess(localServer);
    return {
      ok: false,
      publicUrl: "",
      localFallbackUrl,
      localRestartCount,
      watchdogResult: null,
      events,
      guidance: "本机公开预览服务未能启动，公网隧道不会可靠工作。",
    };
  }

  const watchdogResult = await watchdog({
    ...options,
    localPort,
    localFallbackUrl,
    standbyTunnelCount,
    healthCheck: async (healthOptions = {}) => {
      await ensureLocalServer("before-public-health-check");
      const result = await publicHealthCheck(healthOptions);
      if (!result.ok && result.localFallback && !result.localFallback.ok) {
        await ensureLocalServer("after-public-health-failure");
      }
      return result;
    },
  });

  if (options.once && localServer && !options.keepLocalServerOnExit) {
    stopProcess(localServer);
  }

  return {
    ...watchdogResult,
    localFallbackUrl,
    localRestartCount,
    watchdogResult,
    events: [...events, ...(Array.isArray(watchdogResult?.events) ? watchdogResult.events : [])],
  };
}

function parseCliArgs(argv = process.argv.slice(2), env = process.env) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const [key, inlineValue] = item.slice(2).split("=");
    const hasSeparateValue = inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith("--");
    const value = inlineValue !== undefined ? inlineValue : hasSeparateValue ? argv[index + 1] : "true";
    args.set(key, value);
    if (hasSeparateValue) index += 1;
  }
  return {
    localPort: args.get("local-port") || env.FINANCE_AI_PUBLIC_PORT || DEFAULT_LOCAL_PORT,
    localHost: args.get("local-host") || env.FINANCE_AI_PUBLIC_HOST || DEFAULT_LOCAL_HOST,
    localFallbackUrl: args.get("local-url") || env.FINANCE_AI_PUBLIC_PREVIEW_LOCAL_URL,
    localHealthTimeoutMs:
      args.get("local-health-timeout-ms") || env.FINANCE_AI_PUBLIC_LOCAL_HEALTH_TIMEOUT_MS,
    localHealthIntervalMs:
      args.get("local-health-interval-ms") || env.FINANCE_AI_PUBLIC_LOCAL_HEALTH_INTERVAL_MS,
    restartBackoffMs: args.get("restart-backoff-ms") || env.FINANCE_AI_PUBLIC_TUNNEL_RESTART_BACKOFF_MS,
    standbyTunnelCount:
      args.get("standby-count") ||
      args.get("standby-tunnel-count") ||
      env.FINANCE_AI_PUBLIC_PREVIEW_STANDBY_COUNT ||
      DEFAULT_STANDBY_TUNNEL_COUNT,
    once: args.has("once") || env.FINANCE_AI_PUBLIC_TUNNEL_ONCE === "true",
    keepLocalServerOnExit:
      args.has("keep-local-server") || env.FINANCE_AI_PUBLIC_KEEP_LOCAL_SERVER === "true",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runPublicPreviewSupervisor({
    ...parseCliArgs(),
    onEvent(event) {
      const important = [
        "local-server-starting",
        "local-server-ready",
        "local-server-unhealthy",
        "local-health-failed",
      ].includes(event.type);
      if (important) console.log(JSON.stringify(event));
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        publicUrl: result.publicUrl,
        localFallbackUrl: result.localFallbackUrl,
        localRestartCount: result.localRestartCount,
        restartCount: result.restartCount,
        healthCycleCount: result.healthCycleCount,
        guidance: result.guidance || result.lastHealthResult?.guidance || "",
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
