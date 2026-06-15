#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runPublicPreviewHealthCheck } from "./public-preview-health-check.mjs";

const DEFAULT_LOCAL_PORT = 4192;
const DEFAULT_TUNNEL_TIMEOUT_MS = 45 * 1000;
const DEFAULT_HEALTH_WINDOW_MS = 3 * 60 * 1000;
const DEFAULT_HEALTH_INTERVAL_MS = 15 * 1000;
const DEFAULT_HEALTH_TIMEOUT_MS = 15 * 1000;
const DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES = 2;
const DEFAULT_STANDBY_TUNNEL_COUNT = 2;
const DEFAULT_RESTART_BACKOFF_MS = 5 * 1000;
const DEFAULT_STATUS_FILE = "/private/tmp/finance_ai_public_preview_status.json";
const DEFAULT_ACCESS_CARD_FILE = fileURLToPath(new URL("../public-preview-latest.html", import.meta.url));

const LOCALHOST_RUN_URL_PATTERN = /https:\/\/[a-z0-9-]+\.lhr\.life/i;

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(now = Date.now) {
  return new Date(now()).toISOString();
}

function normalizePublicUrl(value) {
  const raw = String(value || "").trim();
  return raw.replace(/\/+$/, "");
}

export function parsePublicPreviewTunnelUrl(text) {
  return String(text || "").match(LOCALHOST_RUN_URL_PATTERN)?.[0] || "";
}

function buildTunnelArgs(options = {}) {
  const localPort = parseNumber(options.localPort, DEFAULT_LOCAL_PORT);
  return [
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "ServerAliveInterval=60",
    "-o",
    "ExitOnForwardFailure=yes",
    "-R",
    `80:127.0.0.1:${localPort}`,
    options.remote || "nokey@localhost.run",
  ];
}

function startLocalhostRunTunnel(options = {}) {
  const spawnImpl = options.spawnImpl || spawn;
  return spawnImpl(options.sshBinary || "ssh", buildTunnelArgs(options), {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeStatusFile(statusFile, payload, writeFile = writeFileSync) {
  if (!statusFile) return;
  mkdirSync(dirname(statusFile), { recursive: true });
  writeFile(statusFile, `${JSON.stringify(payload, null, 2)}\n`);
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function accessEntry(label, url, status, note = "") {
  const safeUrl = normalizePublicUrl(url);
  return `
    <article class="access-entry ${safeUrl ? "" : "is-missing"}">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(status || (safeUrl ? "可尝试访问" : "未配置"))}</strong>
        ${note ? `<p>${escapeHtml(note)}</p>` : ""}
      </div>
      ${
        safeUrl
          ? `<a href="${escapeHtml(safeUrl)}" rel="noreferrer">打开 / Open</a>`
          : `<em>暂无链接 / No link</em>`
      }
    </article>
  `;
}

export function buildPublicPreviewAccessCardHtml(payload = {}) {
  const standbyEntries = sanitizeStandbyEntries(payload.standbyPublicUrls || []);
  const publicUrl = normalizePublicUrl(payload.publicUrl || "");
  const localFallbackUrl = normalizePublicUrl(payload.localFallbackUrl || `http://127.0.0.1:${DEFAULT_LOCAL_PORT}`);
  const status = payload.status || "unknown";
  const updatedAt = payload.updatedAt || nowIso();
  const guidance =
    payload.guidance ||
    "临时公网入口可能会掉线；如果旧链接显示 no tunnel here，请回到本页获取最新入口。";
  const standbyMarkup = standbyEntries.length
    ? standbyEntries
        .map((entry, index) =>
          accessEntry(
            `备用临时入口 ${index + 1} / Standby ${index + 1}`,
            entry.url,
            entry.status || "standby",
            entry.guidance || "主入口掉线时可尝试备用入口。",
          ),
        )
        .join("")
    : accessEntry("备用临时入口 / Standby", "", "未创建", `默认会创建 ${DEFAULT_STANDBY_TUNNEL_COUNT} 个备用入口；如被关闭，请重启 watchdog。`);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="30" />
    <title>财经情报助手当前访问入口</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #162522;
        --muted: #5e716c;
        --line: #d6e8e1;
        --panel: #f7fbf9;
        --accent: #0f6b5f;
        --warn: #8a5a0a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: #ffffff;
      }
      main {
        width: min(920px, calc(100% - 32px));
        margin: 32px auto;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 4vw, 42px);
        letter-spacing: 0;
      }
      p { color: var(--muted); line-height: 1.65; }
      .summary {
        margin: 24px 0;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
      }
      .access-list {
        display: grid;
        gap: 12px;
      }
      .access-entry {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      .access-entry span,
      .meta span {
        display: block;
        color: var(--muted);
        font-size: 13px;
      }
      .access-entry strong {
        display: block;
        margin-top: 4px;
      }
      .access-entry a {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        padding: 0 14px;
        border-radius: 8px;
        color: #ffffff;
        background: var(--accent);
        text-decoration: none;
        white-space: nowrap;
      }
      .access-entry em {
        color: var(--warn);
        font-style: normal;
      }
      .meta {
        margin-top: 20px;
        display: grid;
        gap: 8px;
      }
      code {
        overflow-wrap: anywhere;
        color: var(--accent);
      }
      @media (max-width: 620px) {
        .access-entry {
          grid-template-columns: 1fr;
        }
        .access-entry a {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <p>AI 财经情报助手 / AI Financial Intelligence Assistant</p>
      <h1>当前访问入口 / Current Access Links</h1>
      <section class="summary" aria-label="访问状态">
        <strong>状态 / Status：${escapeHtml(status)}</strong>
        <p>${escapeHtml(guidance)}</p>
        <p>这个文件每 30 秒自动刷新。旧公网链接如果显示 <code>no tunnel here :(</code>，请使用下面的当前入口或本机入口。</p>
        <p>This file refreshes every 30 seconds. If an old public link shows <code>no tunnel here :(</code>, use the current link or local fallback below.</p>
      </section>
      <section class="access-list" aria-label="访问入口">
        ${accessEntry(
          "当前临时公网入口 / Current temporary public link",
          publicUrl,
          publicUrl ? (status === "healthy" ? "健康" : status) : "未生成",
          "短时间测试可用；不等于固定线上测试环境。",
        )}
        ${standbyMarkup}
        ${accessEntry(
          "本机备用入口 / Local fallback",
          localFallbackUrl,
          "本机可用",
          "公网隧道不可用时，先用本机入口继续开发和排查。",
        )}
      </section>
      <section class="meta" aria-label="状态元数据">
        <div><span>更新时间 / Updated</span><strong>${escapeHtml(updatedAt)}</strong></div>
        <div><span>连续检查 / Health gate</span><strong>${escapeHtml(String(Math.round(Number(payload.healthWindowMs || 0) / 1000 || 0)))} 秒 · ${escapeHtml(String(payload.healthIterationCount || 0))} 轮</strong></div>
        <div><span>自动换链 / Promotions</span><strong>${escapeHtml(String(payload.standbyPromotionCount || 0))}</strong></div>
      </section>
    </main>
  </body>
</html>
`;
}

function writeAccessCardFile(accessCardFile, payload, writeFile = writeFileSync) {
  if (!accessCardFile) return;
  mkdirSync(dirname(accessCardFile), { recursive: true });
  writeFile(accessCardFile, buildPublicPreviewAccessCardHtml(payload));
}

function watchStream(stream, onText) {
  if (!stream?.on) return () => {};
  const handler = (chunk) => onText(String(chunk || ""));
  stream.on("data", handler);
  return () => stream.off?.("data", handler);
}

async function waitForTunnelUrl(tunnel, options = {}) {
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TUNNEL_TIMEOUT_MS);
  const now = options.now || Date.now;
  const startedAt = now();
  let bufferedText = "";
  let settled = false;
  let cleanup = () => {};

  return new Promise((resolve, reject) => {
    const finish = (error, publicUrl = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (error) reject(error);
      else resolve(publicUrl);
    };

    const onText = (text) => {
      bufferedText += text;
      options.onTunnelOutput?.(text);
      const publicUrl = parsePublicPreviewTunnelUrl(bufferedText);
      if (publicUrl) finish(null, publicUrl);
    };

    const removeStdout = watchStream(tunnel.stdout, onText);
    const removeStderr = watchStream(tunnel.stderr, onText);
    const onExit = (code, signal) => {
      finish(
        new Error(
          `Tunnel exited before public URL was announced. code=${code ?? ""} signal=${signal ?? ""}`.trim(),
        ),
      );
    };
    tunnel.once?.("exit", onExit);
    tunnel.once?.("error", (error) => finish(error));
    cleanup = () => {
      removeStdout();
      removeStderr();
      tunnel.off?.("exit", onExit);
    };

    const timer = setTimeout(() => {
      finish(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for localhost.run URL. Started at ${nowIso(() => startedAt)}.`,
        ),
      );
    }, timeoutMs);
  });
}

function stopTunnel(tunnel) {
  if (!tunnel || tunnel.killed) return;
  try {
    tunnel.kill("SIGTERM");
  } catch {
    // Ignore cleanup failures; the next health check will prove the new state.
  }
}

function sanitizeStandbyEntries(entries = []) {
  return entries.map((entry) => ({
    url: entry.url || entry.publicUrl || "",
    status: entry.status || "unknown",
    role: entry.role || "standby",
    checkedAt: entry.checkedAt || "",
    healthWindowMs: Number(entry.healthWindowMs) || 0,
    healthIterationCount: Number(entry.healthIterationCount) || 0,
    transientFailureCount: Number(entry.transientFailureCount) || 0,
    lastFailure: entry.lastFailure || null,
    localFallbackOk: entry.localFallbackOk === undefined ? null : Boolean(entry.localFallbackOk),
    guidance: entry.guidance || "",
  }));
}

function buildStatusPayload(base, standbyEntries = []) {
  return {
    ...base,
    standbyPublicUrls: sanitizeStandbyEntries(standbyEntries),
  };
}

async function startStandbyTunnels({
  count,
  localPort,
  sshBinary,
  remote,
  spawnImpl,
  startTunnel,
  tunnelTimeoutMs,
  now,
  onTunnelOutput,
  emit,
}) {
  const standbyTunnels = [];
  for (let index = 0; index < count; index += 1) {
    const standbyIndex = index + 1;
    emit({ type: "standby-tunnel-starting", standbyIndex });
    const tunnel = startTunnel({
      localPort,
      sshBinary,
      remote,
      spawnImpl,
    });
    try {
      const url = await waitForTunnelUrl(tunnel, {
        timeoutMs: tunnelTimeoutMs,
        now,
        onTunnelOutput,
      });
      const standby = { tunnel, url, status: "ready", role: "standby", standbyIndex };
      standbyTunnels.push(standby);
      emit({ type: "standby-tunnel-ready", standbyIndex, publicUrl: url });
    } catch (error) {
      stopTunnel(tunnel);
      standbyTunnels.push({
        tunnel: null,
        url: "",
        status: "failed",
        role: "standby",
        standbyIndex,
        guidance: error?.message || String(error),
      });
      emit({
        type: "standby-tunnel-failed",
        standbyIndex,
        error: error?.message || String(error),
      });
    }
  }
  return standbyTunnels;
}

function stopStandbyTunnels(standbyTunnels = []) {
  for (const standby of standbyTunnels) {
    stopTunnel(standby.tunnel);
  }
}

async function checkStandbyTunnels({ standbyTunnels, healthCheck, localFallbackUrl, healthWindowMs, healthIntervalMs, healthTimeoutMs, healthMaxConsecutiveFailures }) {
  const summaries = [];
  for (const standby of standbyTunnels) {
    if (!standby?.url) {
      summaries.push({
        url: "",
        status: standby?.status || "missing",
        role: "standby",
        guidance: standby?.guidance || "备用临时公网入口未创建。",
      });
      continue;
    }
    const result = await healthCheck({
      publicUrl: standby.url,
      localFallbackUrl,
      durationMs: healthWindowMs,
      intervalMs: healthIntervalMs,
      timeoutMs: healthTimeoutMs,
      maxConsecutiveFailures: healthMaxConsecutiveFailures,
      alwaysCheckLocalFallback: true,
    });
    summaries.push({
      ...standby,
      status: result.ok ? "healthy" : "unhealthy",
      role: "standby",
      checkedAt: result.endedAt || "",
      healthWindowMs,
      healthIterationCount: result.iterationCount || 0,
      transientFailureCount: result.transientFailureCount || 0,
      lastFailure: result.lastFailure,
      localFallbackOk: result.localFallback?.ok === undefined ? null : Boolean(result.localFallback.ok),
      guidance: result.guidance,
      healthResult: result,
    });
  }
  return summaries;
}

export async function runPublicPreviewWatchdog(options = {}) {
  const localPort = parseNumber(options.localPort, DEFAULT_LOCAL_PORT);
  const localFallbackUrl = normalizePublicUrl(options.localFallbackUrl || `http://127.0.0.1:${localPort}`);
  const tunnelTimeoutMs = parseNumber(options.tunnelTimeoutMs, DEFAULT_TUNNEL_TIMEOUT_MS);
  const healthWindowMs = parseNumber(options.healthWindowMs, DEFAULT_HEALTH_WINDOW_MS);
  const healthIntervalMs = parseNumber(options.healthIntervalMs, DEFAULT_HEALTH_INTERVAL_MS);
  const healthTimeoutMs = parseNumber(options.healthTimeoutMs, DEFAULT_HEALTH_TIMEOUT_MS);
  const standbyTunnelCount = Math.max(
    0,
    Math.floor(
      Number(
        options.standbyTunnelCount === undefined
          ? DEFAULT_STANDBY_TUNNEL_COUNT
          : options.standbyTunnelCount,
      ),
    ),
  );
  const standbyHealthWindowMs = parseNumber(
    options.standbyHealthWindowMs,
    Math.min(healthWindowMs, healthIntervalMs),
  );
  const healthMaxConsecutiveFailures = parseNumber(
    options.healthMaxConsecutiveFailures,
    DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES,
  );
  const restartBackoffMs = parseNumber(options.restartBackoffMs, DEFAULT_RESTART_BACKOFF_MS);
  const maxRestarts = options.maxRestarts === undefined ? Number.POSITIVE_INFINITY : Number(options.maxRestarts);
  const maxHealthCycles = options.maxHealthCycles === undefined ? Number.POSITIVE_INFINITY : Number(options.maxHealthCycles);
  const once = Boolean(options.once);
  const statusFile = options.statusFile === undefined ? DEFAULT_STATUS_FILE : options.statusFile;
  const accessCardFile = options.accessCardFile || "";
  const startTunnel = options.startTunnel || startLocalhostRunTunnel;
  const healthCheck = options.healthCheck || runPublicPreviewHealthCheck;
  const wait = options.sleep || sleep;
  const now = options.now || Date.now;
  const writeFile = options.writeFile || writeFileSync;
  const writeAccessCard = options.writeAccessCardFile || writeFileSync;
  const onEvent = options.onEvent || (() => {});
  const events = [];
  let restartCount = 0;
  let healthCycleCount = 0;
  let currentTunnel = null;
  let currentPublicUrl = "";
  let lastHealthResult = null;
  let standbyTunnels = [];
  let standbyHealthSummaries = [];
  let standbyPromotionCount = 0;

  const emit = (event) => {
    const payload = { at: nowIso(now), ...event };
    events.push(payload);
    onEvent(payload);
    return payload;
  };

  const persistStatus = (payload) => {
    writeStatusFile(statusFile, payload, writeFile);
    writeAccessCardFile(accessCardFile, payload, writeAccessCard);
  };

  while (restartCount <= maxRestarts) {
    emit({ type: "tunnel-starting", restartCount, localFallbackUrl });
    currentTunnel = startTunnel({
      localPort,
      sshBinary: options.sshBinary,
      remote: options.remote,
      spawnImpl: options.spawnImpl,
    });

    try {
      currentPublicUrl = await waitForTunnelUrl(currentTunnel, {
        timeoutMs: tunnelTimeoutMs,
        now,
        onTunnelOutput: options.onTunnelOutput,
      });
    } catch (error) {
      emit({
        type: "tunnel-url-timeout",
        restartCount,
        error: error?.message || String(error),
        localFallbackUrl,
      });
      stopTunnel(currentTunnel);
      restartCount += 1;
      if (restartCount > maxRestarts) break;
      await wait(restartBackoffMs);
      continue;
    }

    emit({ type: "tunnel-ready", publicUrl: currentPublicUrl, localFallbackUrl, restartCount });
    if (standbyTunnelCount > 0) {
      stopStandbyTunnels(standbyTunnels);
      standbyTunnels = await startStandbyTunnels({
        count: standbyTunnelCount,
        localPort,
        sshBinary: options.sshBinary,
        remote: options.remote,
        spawnImpl: options.spawnImpl,
        startTunnel,
        tunnelTimeoutMs,
        now,
        onTunnelOutput: options.onTunnelOutput,
        emit,
      });
    }
    persistStatus(
      buildStatusPayload(
        {
          status: "ready",
          publicUrl: currentPublicUrl,
          localFallbackUrl,
          restartCount,
          standbyPromotionCount,
          healthMaxConsecutiveFailures,
          updatedAt: nowIso(now),
        },
        standbyTunnels,
      ),
    );

    while (healthCycleCount < maxHealthCycles) {
      healthCycleCount += 1;
      const previousHealthyResult = lastHealthResult?.ok ? lastHealthResult : null;
      persistStatus(
        buildStatusPayload(
          {
            status: "checking",
            publicUrl: currentPublicUrl,
            localFallbackUrl,
            restartCount,
            standbyPromotionCount,
            healthCycleCount,
            healthMaxConsecutiveFailures,
            healthWindowMs,
            standbyHealthWindowMs,
            healthIntervalMs,
            healthTimeoutMs,
            healthRequiredEndpoints: previousHealthyResult?.checkedEndpoints || [
              "/",
              "/api/health",
              "/api/analysis?symbol=MSFT&riskProfile=balanced",
              "/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
              "/api/ai-services",
            ],
            healthIterationCount: previousHealthyResult?.iterationCount || 0,
            healthStartedAt: previousHealthyResult?.startedAt || nowIso(now),
            healthEndedAt: previousHealthyResult?.endedAt || "",
            activeHealthStartedAt: nowIso(now),
            updatedAt: nowIso(now),
            lastFailure: null,
            transientFailureCount: previousHealthyResult?.transientFailureCount || 0,
            transientFailures: previousHealthyResult?.transientFailures || [],
            localFallbackOk:
              previousHealthyResult?.localFallback?.ok === undefined
                ? null
                : Boolean(previousHealthyResult.localFallback.ok),
            guidance: previousHealthyResult
              ? "上一轮公网入口连续健康检查已通过；正在进行下一轮监控。"
              : "正在进行公网入口连续健康检查；正式演示前需 2-3 分钟内关键端点持续返回 200。",
          },
          standbyTunnels,
        ),
      );
      lastHealthResult = await healthCheck({
        publicUrl: currentPublicUrl,
        localFallbackUrl,
        durationMs: healthWindowMs,
        intervalMs: healthIntervalMs,
        timeoutMs: healthTimeoutMs,
        maxConsecutiveFailures: healthMaxConsecutiveFailures,
        alwaysCheckLocalFallback: true,
      });
      standbyHealthSummaries = standbyTunnelCount
        ? await checkStandbyTunnels({
            standbyTunnels,
            healthCheck,
            localFallbackUrl,
            healthWindowMs: standbyHealthWindowMs,
            healthIntervalMs,
            healthTimeoutMs,
            healthMaxConsecutiveFailures,
          })
        : [];
      if (lastHealthResult.ok && standbyTunnelCount > 0) {
        const healthyStandbys = standbyHealthSummaries.filter((entry) => entry.status === "healthy" && entry.tunnel);
        const unhealthyStandbys = standbyHealthSummaries.filter((entry) => entry.status !== "healthy");
        for (const standby of unhealthyStandbys) {
          stopTunnel(standby.tunnel);
        }
        standbyTunnels = healthyStandbys;
        const replacementCount = Math.max(0, standbyTunnelCount - standbyTunnels.length);
        if (replacementCount > 0) {
          emit({
            type: "standby-replacing",
            replacementCount,
            unhealthyCount: unhealthyStandbys.length,
          });
          standbyTunnels.push(
            ...(await startStandbyTunnels({
              count: replacementCount,
              localPort,
              sshBinary: options.sshBinary,
              remote: options.remote,
              spawnImpl: options.spawnImpl,
              startTunnel,
              tunnelTimeoutMs,
              now,
              onTunnelOutput: options.onTunnelOutput,
              emit,
            })),
          );
        }
        standbyHealthSummaries = [
          ...healthyStandbys,
          ...standbyTunnels.filter(
            (standby) => !healthyStandbys.some((healthyStandby) => healthyStandby.url === standby.url),
          ),
        ];
      }

      persistStatus(
        buildStatusPayload(
          {
          status: lastHealthResult.ok ? "healthy" : "unhealthy",
          publicUrl: currentPublicUrl,
          localFallbackUrl,
          restartCount,
          standbyPromotionCount,
          healthCycleCount,
          healthMaxConsecutiveFailures,
          healthWindowMs,
          standbyHealthWindowMs,
          healthIntervalMs,
          healthTimeoutMs,
          healthRequiredEndpoints: lastHealthResult.checkedEndpoints || [],
          healthIterationCount: lastHealthResult.iterationCount || 0,
          healthStartedAt: lastHealthResult.startedAt || "",
          healthEndedAt: lastHealthResult.endedAt || "",
          updatedAt: nowIso(now),
          lastFailure: lastHealthResult.lastFailure,
          transientFailureCount: lastHealthResult.transientFailureCount || 0,
          transientFailures: lastHealthResult.transientFailures || [],
          localFallbackOk:
            lastHealthResult.localFallback?.ok === undefined
              ? null
              : Boolean(lastHealthResult.localFallback.ok),
          guidance: lastHealthResult.guidance,
          },
          standbyHealthSummaries,
        ),
      );

      if (lastHealthResult.ok) {
        emit({
          type: "health-ok",
          publicUrl: currentPublicUrl,
          healthCycleCount,
          iterationCount: lastHealthResult.iterationCount,
          transientFailureCount: lastHealthResult.transientFailureCount || 0,
        });
        if (once) {
          if (!options.keepTunnelOnSuccess) stopTunnel(currentTunnel);
          return {
            ok: true,
            publicUrl: currentPublicUrl,
            localFallbackUrl,
            restartCount,
            healthCycleCount,
            healthMaxConsecutiveFailures,
            lastHealthResult,
            standbyPublicUrls: sanitizeStandbyEntries(standbyHealthSummaries),
            standbyPromotionCount,
            events,
          };
        }
        continue;
      }

      const promotableStandby = standbyHealthSummaries.find((entry) => entry.status === "healthy" && entry.tunnel);
      if (promotableStandby) {
        const failedPrimaryUrl = currentPublicUrl;
        stopTunnel(currentTunnel);
        standbyPromotionCount += 1;
        currentTunnel = promotableStandby.tunnel;
        currentPublicUrl = promotableStandby.url;
        standbyTunnels = standbyTunnels.filter((entry) => entry.url !== promotableStandby.url);
        emit({
          type: "standby-promoted",
          previousPublicUrl: failedPrimaryUrl,
          publicUrl: currentPublicUrl,
          standbyPromotionCount,
        });
        const replacementCount = Math.max(0, standbyTunnelCount - standbyTunnels.filter((entry) => entry.url).length);
        if (replacementCount > 0) {
          standbyTunnels.push(
            ...(await startStandbyTunnels({
              count: replacementCount,
              localPort,
              sshBinary: options.sshBinary,
              remote: options.remote,
              spawnImpl: options.spawnImpl,
              startTunnel,
              tunnelTimeoutMs,
              now,
              onTunnelOutput: options.onTunnelOutput,
              emit,
            })),
          );
        }
        persistStatus(
          buildStatusPayload(
            {
              status: "healthy",
              publicUrl: currentPublicUrl,
              localFallbackUrl,
              restartCount,
              standbyPromotionCount,
              healthCycleCount,
              healthMaxConsecutiveFailures,
              healthWindowMs: standbyHealthWindowMs,
              standbyHealthWindowMs,
              healthIntervalMs,
              healthTimeoutMs,
              healthRequiredEndpoints: promotableStandby.healthResult?.checkedEndpoints || lastHealthResult.checkedEndpoints || [],
              healthIterationCount: promotableStandby.healthIterationCount || 0,
              healthStartedAt: promotableStandby.healthResult?.startedAt || "",
              healthEndedAt: promotableStandby.healthResult?.endedAt || "",
              updatedAt: nowIso(now),
              lastFailure: lastHealthResult.lastFailure,
              transientFailureCount: promotableStandby.transientFailureCount || 0,
              transientFailures: promotableStandby.healthResult?.transientFailures || [],
              localFallbackOk: promotableStandby.localFallbackOk,
              guidance: `主临时公网入口失败，已自动提升备用入口：${currentPublicUrl}`,
            },
            standbyTunnels,
          ),
        );
        if (once) {
          if (!options.keepTunnelOnSuccess) {
            stopTunnel(currentTunnel);
            stopStandbyTunnels(standbyTunnels);
          }
          return {
            ok: true,
            publicUrl: currentPublicUrl,
            localFallbackUrl,
            restartCount,
            healthCycleCount,
            healthMaxConsecutiveFailures,
            lastHealthResult: promotableStandby.healthResult || lastHealthResult,
            standbyPublicUrls: sanitizeStandbyEntries(standbyTunnels),
            standbyPromotionCount,
            events,
          };
        }
        continue;
      }

      emit({
        type: "health-failed",
        publicUrl: currentPublicUrl,
        healthCycleCount,
        guidance: lastHealthResult.guidance,
        lastFailure: lastHealthResult.lastFailure,
        transientFailureCount: lastHealthResult.transientFailureCount || 0,
      });
      stopTunnel(currentTunnel);
      restartCount += 1;
      if (restartCount > maxRestarts) {
        return {
          ok: false,
          publicUrl: currentPublicUrl,
          localFallbackUrl,
          restartCount,
          healthCycleCount,
          healthMaxConsecutiveFailures,
          lastHealthResult,
          standbyPublicUrls: sanitizeStandbyEntries(standbyHealthSummaries),
          standbyPromotionCount,
          events,
        };
      }
      await wait(restartBackoffMs);
      break;
    }

    if (healthCycleCount >= maxHealthCycles) {
      return {
        ok: true,
        publicUrl: currentPublicUrl,
        localFallbackUrl,
        restartCount,
        healthCycleCount,
        healthMaxConsecutiveFailures,
        lastHealthResult,
        standbyPublicUrls: sanitizeStandbyEntries(standbyHealthSummaries),
        standbyPromotionCount,
        events,
      };
    }
  }

  return {
    ok: false,
    publicUrl: currentPublicUrl,
    localFallbackUrl,
    restartCount,
    healthCycleCount,
    healthMaxConsecutiveFailures,
    lastHealthResult,
    standbyPublicUrls: sanitizeStandbyEntries(standbyHealthSummaries),
    standbyPromotionCount,
    events,
  };
}

export function parsePublicPreviewWatchdogCliArgs(argv = process.argv.slice(2), env = process.env) {
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
    localFallbackUrl: args.get("local-url") || env.FINANCE_AI_PUBLIC_PREVIEW_LOCAL_URL,
    tunnelTimeoutMs: args.get("tunnel-timeout-ms") || env.FINANCE_AI_PUBLIC_TUNNEL_TIMEOUT_MS,
    healthWindowMs: args.get("health-window-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_DURATION_MS,
    healthIntervalMs: args.get("health-interval-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_INTERVAL_MS,
    healthTimeoutMs: args.get("health-timeout-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_TIMEOUT_MS,
    standbyTunnelCount:
      args.get("standby-count") ||
      args.get("standby-tunnel-count") ||
      env.FINANCE_AI_PUBLIC_PREVIEW_STANDBY_COUNT ||
      DEFAULT_STANDBY_TUNNEL_COUNT,
    standbyHealthWindowMs:
      args.get("standby-health-window-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_STANDBY_HEALTH_WINDOW_MS,
    healthMaxConsecutiveFailures:
      args.get("health-max-consecutive-failures") ||
      env.FINANCE_AI_PUBLIC_PREVIEW_MONITOR_MAX_CONSECUTIVE_FAILURES ||
      DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES,
    restartBackoffMs: args.get("restart-backoff-ms") || env.FINANCE_AI_PUBLIC_TUNNEL_RESTART_BACKOFF_MS,
    maxRestarts: args.get("max-restarts") || env.FINANCE_AI_PUBLIC_TUNNEL_MAX_RESTARTS,
    maxHealthCycles: args.get("max-health-cycles") || env.FINANCE_AI_PUBLIC_TUNNEL_MAX_HEALTH_CYCLES,
    sshBinary: args.get("ssh-binary") || env.FINANCE_AI_PUBLIC_TUNNEL_SSH_BINARY,
    remote: args.get("remote") || env.FINANCE_AI_PUBLIC_TUNNEL_REMOTE,
    statusFile: args.get("status-file") || env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE || DEFAULT_STATUS_FILE,
    accessCardFile:
      args.get("access-card-file") ||
      env.FINANCE_AI_PUBLIC_PREVIEW_ACCESS_CARD_FILE ||
      DEFAULT_ACCESS_CARD_FILE,
    once: args.has("once") || env.FINANCE_AI_PUBLIC_TUNNEL_ONCE === "true",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cliArgs = parsePublicPreviewWatchdogCliArgs();
  const result = await runPublicPreviewWatchdog({
    ...cliArgs,
    onEvent(event) {
      const important = [
        "tunnel-ready",
        "standby-tunnel-ready",
        "standby-promoted",
        "health-ok",
        "health-failed",
        "tunnel-url-timeout",
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
        restartCount: result.restartCount,
        healthCycleCount: result.healthCycleCount,
        healthMaxConsecutiveFailures: result.healthMaxConsecutiveFailures || cliArgs.healthMaxConsecutiveFailures,
        standbyPublicUrls: result.standbyPublicUrls || [],
        standbyPromotionCount: result.standbyPromotionCount || 0,
        lastGuidance: result.lastHealthResult?.guidance || "",
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
