#!/usr/bin/env node

import { execFile } from "node:child_process";

const DEFAULT_DURATION_MS = 3 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 15 * 1000;
const DEFAULT_TIMEOUT_MS = 15 * 1000;

export const defaultPublicPreviewChecks = [
  { id: "home", label: "首页", path: "/" },
  { id: "health", label: "/health", path: "/health" },
  { id: "api-health", label: "/api/health", path: "/api/health" },
  {
    id: "analysis-msft",
    label: "/api/analysis MSFT",
    path: "/api/analysis?symbol=MSFT&riskProfile=balanced",
  },
  {
    id: "stock-search-msft",
    label: "股票搜索 MSFT",
    path: "/api/stocks/search?q=Microsoft",
  },
];

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function buildUrl(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function classifyEndpointFailure(result = {}) {
  const status = Number(result.status) || 0;
  const errorText = `${result.error || ""} ${result.curlFallback?.error || ""}`.toLowerCase();
  if (status === 503) return "tunnel-503";
  if (status > 0) return "http-non-200";
  if (errorText.includes("could not resolve host") || errorText.includes("enotfound")) return "dns-resolution";
  if (errorText.includes("timeout") || errorText.includes("aborted")) return "timeout";
  if (errorText.includes("failed to connect") || errorText.includes("econnrefused")) return "connection-refused";
  if (errorText.includes("fetch failed")) return "transport";
  return "unknown";
}

function classifyIterationFailure(failed = []) {
  const failureTypes = [...new Set(failed.map(classifyEndpointFailure))];
  if (failureTypes.includes("tunnel-503")) return "tunnel-503";
  if (failureTypes.includes("dns-resolution")) return "dns-resolution";
  if (failureTypes.includes("connection-refused")) return "connection-refused";
  if (failureTypes.includes("timeout")) return "timeout";
  if (failureTypes.includes("http-non-200")) return "api-non-200";
  return failureTypes[0] || "unknown";
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const startedAt = Date.now();
    const response = await fetchImpl(url, {
      cache: "no-store",
      redirect: "follow",
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
      durationMs: 0,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function curlStatusWithTimeout(url, timeoutMs, options = {}) {
  const execFileImpl = options.execFileImpl || execFile;
  const curlBinary = options.curlBinary || "curl";
  const maxTimeSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + 1000);
  return new Promise((resolve) => {
    execFileImpl(
      curlBinary,
      ["-L", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(maxTimeSeconds), url],
      { signal: controller.signal },
      (error, stdout) => {
        clearTimeout(timeout);
        const status = Number(String(stdout || "").trim());
        if (Number.isFinite(status) && status > 0) {
          resolve({
            ok: status === 200,
            status,
            durationMs: Date.now() - startedAt,
            error: "",
            transport: "curl-fallback",
          });
          return;
        }
        resolve({
          ok: false,
          status: 0,
          durationMs: Date.now() - startedAt,
          error: error?.name === "AbortError" ? "timeout" : String(error?.message || error || "curl failed"),
          transport: "curl-fallback",
        });
      },
    );
  });
}

async function checkEndpoint({ fetchImpl, url, timeoutMs, allowCurlFallback, curlBinary, execFileImpl }) {
  const result = await fetchWithTimeout(fetchImpl, url, timeoutMs);
  if (result.ok || result.status > 0 || !allowCurlFallback) {
    return { ...result, transport: "fetch" };
  }
  const curlResult = await curlStatusWithTimeout(url, timeoutMs, { curlBinary, execFileImpl });
  return curlResult.ok ? curlResult : { ...result, curlFallback: curlResult };
}

export async function runPublicPreviewHealthCheck(options = {}) {
  const publicUrl = normalizeBaseUrl(options.publicUrl);
  if (!publicUrl) {
    throw new Error("Missing public preview URL. Pass --url or FINANCE_AI_PUBLIC_PREVIEW_URL.");
  }

  const durationMs = parseNumber(options.durationMs, DEFAULT_DURATION_MS);
  const intervalMs = parseNumber(options.intervalMs, DEFAULT_INTERVAL_MS);
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const localFallbackUrl = normalizeBaseUrl(options.localFallbackUrl || "http://127.0.0.1:4192");
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const allowCurlFallback =
    options.allowCurlFallback === undefined ? !options.fetchImpl : Boolean(options.allowCurlFallback);
  const curlBinary = options.curlBinary || "curl";
  const execFileImpl = options.execFileImpl || execFile;
  const now = options.now || (() => Date.now());
  const wait = options.sleep || sleep;
  const checks = Array.isArray(options.checks) && options.checks.length
    ? options.checks
    : defaultPublicPreviewChecks;
  const maxConsecutiveFailures = parseNumber(options.maxConsecutiveFailures, 1);
  const startedAt = now();
  const deadline = startedAt + durationMs;
  const iterations = [];
  let consecutiveFailures = 0;
  let lastFailure = null;
  const transientFailures = [];

  while (now() < deadline || iterations.length === 0) {
    const iterationStartedAt = now();
    const results = await Promise.all(
      checks.map(async (check) => {
        const url = buildUrl(publicUrl, check.path);
        const result = await checkEndpoint({
          fetchImpl,
          url,
          timeoutMs,
          allowCurlFallback,
          curlBinary,
          execFileImpl,
        });
        return { ...check, url, ...result };
      }),
    );

    const ok = results.every((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    if (ok) {
      if (lastFailure) {
        transientFailures.push({ ...lastFailure, recoveredAt: new Date(iterationStartedAt).toISOString() });
      }
      consecutiveFailures = 0;
      lastFailure = null;
    } else {
      consecutiveFailures += 1;
      const classifiedFailed = failed.map((result) => ({
        ...result,
        failureType: classifyEndpointFailure(result),
      }));
      lastFailure = {
        at: new Date(iterationStartedAt).toISOString(),
        failed: classifiedFailed,
        failureType: classifyIterationFailure(classifiedFailed),
        consecutiveFailures,
        threshold: maxConsecutiveFailures,
      };
    }

    iterations.push({
      at: new Date(iterationStartedAt).toISOString(),
      ok,
      results,
    });

    if (consecutiveFailures >= maxConsecutiveFailures) {
      break;
    }

    const remainingMs = deadline - now();
    if (remainingMs <= 0) break;
    await wait(Math.min(intervalMs, remainingMs));
  }

  let localFallback = null;
  if ((lastFailure || options.alwaysCheckLocalFallback) && localFallbackUrl) {
    localFallback = await checkEndpoint({
      fetchImpl,
      url: buildUrl(localFallbackUrl, "/health"),
      timeoutMs,
      allowCurlFallback,
      curlBinary,
      execFileImpl,
    });
  }

  const ok = !lastFailure && iterations.length > 0;
  return {
    ok,
    publicUrl,
    localFallbackUrl,
    durationMs,
    intervalMs,
    timeoutMs,
    checkedEndpoints: checks.map((check) => check.path),
    iterationCount: iterations.length,
    transientFailureCount: transientFailures.length,
    transientFailures,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(now()).toISOString(),
    lastFailure,
    localFallback,
    guidance: ok
      ? transientFailures.length
        ? `公网预览在监控窗口内未达到连续失败阈值，但记录到 ${transientFailures.length} 次已恢复的短暂失败。`
        : "公网预览在监控窗口内持续可用。"
      : [
          "公网预览不稳定或已断开。",
          "如果公网返回 503 / no tunnel here :(，请重启 localhost.run 隧道并发布新的临时链接。",
          localFallback?.ok
            ? `本机备用地址可用：${localFallbackUrl}`
            : `本机备用地址未确认可用：${localFallbackUrl}`,
          "正式演示前应使用固定线上测试环境，例如 Vercel / Render / Netlify 等托管方案。",
        ].join(" "),
    iterations,
  };
}

function parseCliArgs(argv = process.argv.slice(2), env = process.env) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const [key, inlineValue] = item.slice(2).split("=");
    const value = inlineValue !== undefined ? inlineValue : argv[index + 1];
    args.set(key, value);
    if (inlineValue === undefined) index += 1;
  }
  return {
    publicUrl: args.get("url") || env.FINANCE_AI_PUBLIC_PREVIEW_URL || "",
    localFallbackUrl:
      args.get("local-url") || env.FINANCE_AI_PUBLIC_PREVIEW_LOCAL_URL || "http://127.0.0.1:4192",
    durationMs: args.get("duration-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_DURATION_MS,
    intervalMs: args.get("interval-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_INTERVAL_MS,
    timeoutMs: args.get("timeout-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_TIMEOUT_MS,
    maxConsecutiveFailures:
      args.get("max-consecutive-failures") ||
      env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_MAX_CONSECUTIVE_FAILURES,
    allowCurlFallback:
      args.get("curl-fallback") === undefined
        ? env.FINANCE_AI_PUBLIC_PREVIEW_CURL_FALLBACK !== "false"
        : args.get("curl-fallback") !== "false",
    curlBinary: args.get("curl-binary") || env.FINANCE_AI_PUBLIC_PREVIEW_CURL_BINARY,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runPublicPreviewHealthCheck(parseCliArgs());
    const summary = {
      ok: result.ok,
      publicUrl: result.publicUrl,
      localFallbackUrl: result.localFallbackUrl,
      duration: formatDuration(result.durationMs),
      interval: formatDuration(result.intervalMs),
      checkedEndpoints: result.checkedEndpoints,
      iterationCount: result.iterationCount,
      transientFailureCount: result.transientFailureCount,
      lastFailure: result.lastFailure,
      localFallback: result.localFallback,
      guidance: result.guidance,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
