#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { inspectStableHostingBlueprint } from "./stable-hosting-preflight.mjs";
import { summarizePublicPreviewStatus } from "./public-preview-status.mjs";

const DEFAULT_HTML_OUTPUT = fileURLToPath(new URL("../stable-hosting-handoff.html", import.meta.url));

function normalizeUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function runtimeEnvMap(checks = []) {
  const entries = [];
  for (const check of checks) {
    if (!String(check.id || "").startsWith("env-")) continue;
    const key = String(check.id).replace(/^env-/, "");
    entries.push({
      key,
      expectedValue: check.details?.expected || "",
      configuredValue: check.details?.actual || "",
      status: check.ok ? "ready" : "needs-fix",
    });
  }
  return entries;
}

function secretEnvMap(requiredDashboardSecretKeys = []) {
  return requiredDashboardSecretKeys.map((key) => ({
    key,
    whereToSet: "Render Dashboard / Environment",
    valuePolicy: "sync:false; never commit the value",
  }));
}

function buildStandbyAccess(status = {}) {
  return (Array.isArray(status.standbyPublicUrls) ? status.standbyPublicUrls : [])
    .filter((entry) => entry?.url)
    .map((entry, index) => ({
      priority: index + 1,
      label: `备用临时入口 ${index + 1}`,
      url: normalizeUrl(entry.url),
      status: entry.status || "unknown",
      healthy: entry.status === "healthy",
      checkedAt: entry.checkedAt || "",
      healthWindowSeconds: Number(entry.healthWindowSeconds || 0),
      healthIterationCount: Number(entry.healthIterationCount || 0),
      transientFailureCount: Number(entry.transientFailureCount || 0),
      nextStep:
        entry.status === "healthy"
          ? "主入口掉线时优先复制这个备用链接继续测试。"
          : "等待 watchdog 重新检查或重建该备用入口。",
    }));
}

function buildTemporaryHealthEvidence(status = {}) {
  const healthWindowSeconds = Number(status.healthWindowSeconds || 0);
  const healthIterationCount = Number(status.healthIterationCount || 0);
  const requiredEndpoints = Array.isArray(status.healthRequiredEndpoints) ? status.healthRequiredEndpoints : [];
  const continuousHealthPassed =
    status.ok === true &&
    healthWindowSeconds >= 180 &&
    healthIterationCount > 0 &&
    !status.lastFailure;
  return {
    status: status.status || "unknown",
    publicUrl: normalizeUrl(status.publicUrl || ""),
    continuousHealthPassed,
    healthWindowSeconds,
    healthIterationCount,
    transientFailureCount: Number(status.transientFailureCount || 0),
    healthEndedAt: status.healthEndedAt || "",
    requiredEndpoints,
    guidance: status.guidance || "",
  };
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderRows(rows = [], renderRow) {
  if (!rows.length) return `<p class="muted">暂无条目 / No items.</p>`;
  return rows.map(renderRow).join("");
}

export function buildStableHostingHandoff(options = {}) {
  const blueprint = options.blueprint || inspectStableHostingBlueprint(options);
  const status = options.status || summarizePublicPreviewStatus(options.statusOptions || {});
  const stableUrl = normalizeUrl(options.stableUrl || process.env.FINANCE_AI_STABLE_PREVIEW_URL || "");
  const localFallbackUrl = normalizeUrl(status.localFallbackUrl || "http://127.0.0.1:4192");
  const temporaryUrl = normalizeUrl(status.publicUrl || "");
  const fixedUrlPlaceholder = stableUrl || "https://your-render-url.onrender.com";
  const standbyAccess = buildStandbyAccess(status);
  const temporaryHealthEvidence = buildTemporaryHealthEvidence(status);
  const blockers = [];

  if (!stableUrl) blockers.push("尚未创建或填写固定线上测试 URL。");
  if (!blueprint.ok) blockers.push("固定托管蓝图或密钥安全预检未通过。");
  blockers.push("Dashboard 密钥值无法在仓库内验证，创建服务后必须人工确认。");
  if (temporaryUrl) blockers.push("当前 lhr.life 只作为临时备用，不能替代固定托管。");

  return {
    generatedAt: new Date().toISOString(),
    status: stableUrl && blueprint.ok ? "fixed-url-ready-for-smoke" : "handoff-ready-needs-fixed-url",
    accessLevels: [
      {
        priority: 1,
        label: "固定线上测试环境",
        url: stableUrl,
        status: stableUrl ? "configured-needs-smoke" : "missing",
        purpose: "外部测试和演示首选入口。",
      },
      {
        priority: 2,
        label: "临时 lhr.life 隧道",
        url: temporaryUrl,
        status: status.ok ? "healthy-temporary" : status.status || "unknown",
        purpose: "只用于短时间测试；可能轮换或 503。",
      },
      {
        priority: 3,
        label: "本机备用地址",
        url: localFallbackUrl,
        status: status.localFallbackOk === true ? "healthy" : status.localFallbackOk === false ? "unhealthy" : "local-only",
        purpose: "只能在本机访问，用于公网隧道失败时继续排查。",
      },
    ],
    standbyAccess,
    temporaryHealthEvidence,
    renderService: {
      serviceName: blueprint.serviceName || "finance-ai-assistant-web",
      blueprintFile: "render.yaml",
      serviceType: blueprint.serviceType,
      runtime: blueprint.runtime,
      startCommand: blueprint.startCommand,
      healthCheckPath: blueprint.healthCheckPath,
      runtimeEnv: runtimeEnvMap(blueprint.checks),
      dashboardSecrets: secretEnvMap(blueprint.requiredDashboardSecretKeys),
    },
    commands: {
      localPreflight: "npm run check:stable-hosting",
      stableUrlSmoke: `FINANCE_AI_STABLE_PREVIEW_URL=${fixedUrlPlaceholder} npm run check:stable-hosting`,
      publicPreviewFallback: "npm run dev:public-preview:supervise",
      currentAccessReport: "npm run access:public-preview",
    },
    acceptanceCriteria: {
      durationSeconds: 180,
      endpoints: blueprint.requiredEndpoints,
      requirement: "固定 URL 的所有关键端点必须在 2-3 分钟窗口内持续返回 200。",
    },
    blockers,
    userSummary:
      "下一步是在 Render 创建固定 Web Service，按 dashboardSecrets 填入密钥，再用 stableUrlSmoke 命令跑 2-3 分钟连续验收。",
    englishSummary:
      "Next, create the fixed Render Web Service, enter secrets in the dashboard, then run stableUrlSmoke for a 2-3 minute continuous validation.",
  };
}

export function buildStableHostingHandoffHtml(handoff = {}) {
  const accessLevels = Array.isArray(handoff.accessLevels) ? handoff.accessLevels : [];
  const runtimeEnv = Array.isArray(handoff.renderService?.runtimeEnv) ? handoff.renderService.runtimeEnv : [];
  const dashboardSecrets = Array.isArray(handoff.renderService?.dashboardSecrets)
    ? handoff.renderService.dashboardSecrets
    : [];
  const endpoints = Array.isArray(handoff.acceptanceCriteria?.endpoints) ? handoff.acceptanceCriteria.endpoints : [];
  const standbyAccess = Array.isArray(handoff.standbyAccess) ? handoff.standbyAccess : [];
  const healthEvidence = handoff.temporaryHealthEvidence || {};
  const healthEvidenceEndpoints = Array.isArray(healthEvidence.requiredEndpoints)
    ? healthEvidence.requiredEndpoints
    : [];
  const blockers = Array.isArray(handoff.blockers) ? handoff.blockers : [];
  const commands = handoff.commands || {};
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>固定托管交接包 / Stable Hosting Handoff</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #182622;
        --muted: #60716c;
        --line: #d8e8e2;
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
        width: min(1040px, calc(100% - 32px));
        margin: 32px auto 56px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(30px, 4vw, 46px);
        letter-spacing: 0;
      }
      h2 {
        margin: 28px 0 12px;
        font-size: 22px;
      }
      p { color: var(--muted); line-height: 1.65; }
      code {
        overflow-wrap: anywhere;
        color: var(--accent);
      }
      .summary,
      .section {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        padding: 18px;
        margin-top: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .item {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 14px;
        background: #ffffff;
      }
      .item span,
      .label {
        display: block;
        color: var(--muted);
        font-size: 13px;
      }
      .item strong {
        display: block;
        margin: 4px 0 6px;
      }
      .command {
        display: block;
        padding: 12px;
        border-radius: 8px;
        background: #10231f;
        color: #e9fff8;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .warning {
        color: var(--warn);
      }
      .muted {
        color: var(--muted);
      }
      ol,
      ul {
        padding-left: 22px;
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <p>AI 财经情报助手 / AI Financial Intelligence Assistant</p>
      <h1>固定托管交接包 / Stable Hosting Handoff</h1>
      <section class="summary" aria-label="交接摘要">
        <strong>状态 / Status：${escapeHtml(handoff.status || "unknown")}</strong>
        <p>${escapeHtml(handoff.userSummary || "")}</p>
        <p>${escapeHtml(handoff.englishSummary || "")}</p>
        <p class="warning">密钥只在 Render Dashboard 手工填写；本文件不包含、不读取、不复制任何真实 API key。</p>
        <p class="warning">Enter secrets manually in Render Dashboard only. This file does not contain, read, or copy real API keys.</p>
      </section>

      <h2>访问层级 / Access Levels</h2>
      <section class="grid" aria-label="访问层级">
        ${renderRows(
          accessLevels,
          (entry) => `
            <article class="item">
              <span>${escapeHtml(`P${entry.priority || ""}`)}</span>
              <strong>${escapeHtml(entry.label || "")}</strong>
              <p><code>${escapeHtml(entry.url || "missing")}</code></p>
              <p>${escapeHtml(entry.status || "unknown")} · ${escapeHtml(entry.purpose || "")}</p>
            </article>
          `,
        )}
      </section>

      <h2>备用入口 / Standby Links</h2>
      <section class="grid" aria-label="备用入口">
        ${renderRows(
          standbyAccess,
          (entry) => `
            <article class="item">
              <span>${escapeHtml(entry.healthy ? "healthy" : entry.status || "unknown")}</span>
              <strong>${escapeHtml(entry.label || "")}</strong>
              <p><code>${escapeHtml(entry.url || "missing")}</code></p>
              <p>${escapeHtml(entry.nextStep || "")}</p>
              <p class="muted">窗口 ${escapeHtml(entry.healthWindowSeconds || 0)}s · 轮次 ${escapeHtml(entry.healthIterationCount || 0)} · 瞬断 ${escapeHtml(entry.transientFailureCount || 0)}</p>
            </article>
          `,
        )}
      </section>

      <h2>临时入口健康证据 / Temporary Health Evidence</h2>
      <section class="section" aria-label="临时入口健康证据">
        <div class="grid">
          <div class="item"><span>连续门禁 / Continuous Gate</span><strong>${escapeHtml(healthEvidence.continuousHealthPassed ? "passed" : "not-passed")}</strong></div>
          <div class="item"><span>检查窗口 / Window</span><strong>${escapeHtml(healthEvidence.healthWindowSeconds || 0)}s</strong></div>
          <div class="item"><span>检查轮次 / Iterations</span><strong>${escapeHtml(healthEvidence.healthIterationCount || 0)}</strong></div>
          <div class="item"><span>瞬断 / Transient Failures</span><strong>${escapeHtml(healthEvidence.transientFailureCount || 0)}</strong></div>
        </div>
        <p>${escapeHtml(healthEvidence.guidance || "")}</p>
        <ul>
          ${healthEvidenceEndpoints.map((endpoint) => `<li><code>${escapeHtml(endpoint)}</code></li>`).join("")}
        </ul>
      </section>

      <h2>Render 服务 / Render Service</h2>
      <section class="section" aria-label="Render 服务">
        <div class="grid">
          <div class="item"><span>服务名 / Service</span><strong>${escapeHtml(handoff.renderService?.serviceName || "")}</strong></div>
          <div class="item"><span>蓝图 / Blueprint</span><strong>${escapeHtml(handoff.renderService?.blueprintFile || "render.yaml")}</strong></div>
          <div class="item"><span>启动 / Start</span><strong>${escapeHtml(handoff.renderService?.startCommand || "")}</strong></div>
          <div class="item"><span>健康检查 / Health</span><strong>${escapeHtml(handoff.renderService?.healthCheckPath || "")}</strong></div>
        </div>
      </section>

      <h2>运行变量 / Runtime Variables</h2>
      <section class="grid" aria-label="运行变量">
        ${renderRows(
          runtimeEnv,
          (row) => `
            <article class="item">
              <span>${escapeHtml(row.status || "")}</span>
              <strong>${escapeHtml(row.key || "")}</strong>
              <p>Expected: <code>${escapeHtml(row.expectedValue || "")}</code></p>
            </article>
          `,
        )}
      </section>

      <h2>Dashboard 密钥 / Dashboard Secrets</h2>
      <section class="grid" aria-label="Dashboard 密钥">
        ${renderRows(
          dashboardSecrets,
          (row) => `
            <article class="item">
              <span>${escapeHtml(row.whereToSet || "Render Dashboard / Environment")}</span>
              <strong>${escapeHtml(row.key || "")}</strong>
              <p>${escapeHtml(row.valuePolicy || "never commit the value")}</p>
            </article>
          `,
        )}
      </section>

      <h2>执行步骤 / Steps</h2>
      <section class="section" aria-label="执行步骤">
        <ol>
          <li>在 Render 创建或打开 <code>${escapeHtml(handoff.renderService?.serviceName || "finance-ai-assistant-web")}</code> Web Service。</li>
          <li>确认服务使用 <code>${escapeHtml(handoff.renderService?.blueprintFile || "render.yaml")}</code>，启动命令为 <code>${escapeHtml(handoff.renderService?.startCommand || "npm start")}</code>。</li>
          <li>把 Dashboard 密钥逐项手工填入 Render Environment 页面，保留仓库文件为空值。</li>
          <li>部署完成后复制固定 URL，运行下面的固定 URL 连续验收命令。</li>
        </ol>
        <ol>
          <li>Create or open the Render Web Service <code>${escapeHtml(handoff.renderService?.serviceName || "finance-ai-assistant-web")}</code>.</li>
          <li>Confirm it uses <code>${escapeHtml(handoff.renderService?.blueprintFile || "render.yaml")}</code> and starts with <code>${escapeHtml(handoff.renderService?.startCommand || "npm start")}</code>.</li>
          <li>Paste dashboard secrets manually in Render Environment and keep repository files blank.</li>
          <li>After deploy, copy the fixed URL and run the fixed URL validation command below.</li>
        </ol>
      </section>

      <h2>命令 / Commands</h2>
      <section class="section" aria-label="命令">
        <p><span class="label">本地预检 / Local preflight</span><code class="command">${escapeHtml(commands.localPreflight || "")}</code></p>
        <p><span class="label">固定 URL 验收 / Fixed URL validation</span><code class="command">${escapeHtml(commands.stableUrlSmoke || "")}</code></p>
        <p><span class="label">临时公网兜底 / Temporary public fallback</span><code class="command">${escapeHtml(commands.publicPreviewFallback || "")}</code></p>
        <p><span class="label">当前入口报告 / Current access report</span><code class="command">${escapeHtml(commands.currentAccessReport || "")}</code></p>
      </section>

      <h2>验收标准 / Acceptance Criteria</h2>
      <section class="section" aria-label="验收标准">
        <p>${escapeHtml(handoff.acceptanceCriteria?.requirement || "")}</p>
        <ul>
          ${endpoints.map((endpoint) => `<li><code>${escapeHtml(endpoint)}</code></li>`).join("")}
        </ul>
      </section>

      <h2>当前阻断 / Current Blockers</h2>
      <section class="section" aria-label="当前阻断">
        <ul>
          ${blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}
        </ul>
      </section>
    </main>
  </body>
</html>
`;
}

function writeHtmlHandoff(outputPath, handoff, writeFile = writeFileSync) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFile(outputPath, buildStableHostingHandoffHtml(handoff));
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
    stableUrl: args.get("url") || env.FINANCE_AI_STABLE_PREVIEW_URL || "",
    format: args.get("format") || (args.has("html") ? "html" : "json"),
    output: args.get("output") || env.FINANCE_AI_STABLE_HOSTING_HANDOFF_HTML || DEFAULT_HTML_OUTPUT,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseCliArgs();
    const handoff = buildStableHostingHandoff(args);
    if (args.format === "html") {
      writeHtmlHandoff(args.output, handoff);
      console.log(JSON.stringify({ ok: true, output: args.output, status: handoff.status }, null, 2));
    } else {
      console.log(JSON.stringify(handoff, null, 2));
    }
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
