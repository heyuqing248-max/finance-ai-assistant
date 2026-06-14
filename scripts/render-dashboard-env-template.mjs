#!/usr/bin/env node

import { inspectStableHostingBlueprint, parseRenderBlueprint } from "./stable-hosting-preflight.mjs";

function isSecretEnvVar(envVar = {}) {
  return envVar.sync === "false" || /(^|_)(API_KEY|SECRET|TOKEN|PASSWORD)$/i.test(envVar.key || "");
}

function buildEnvRows(blueprint = {}) {
  return (Array.isArray(blueprint.envVars) ? blueprint.envVars : []).map((envVar) => {
    const secret = isSecretEnvVar(envVar);
    return {
      key: envVar.key,
      value: secret ? "" : envVar.value || "",
      secret,
      dashboardAction: secret ? "Paste value manually in Render Dashboard" : "Use committed blueprint value",
      renderSync: secret ? "false" : "",
      valuePolicy: secret
        ? "Leave blank in files; never commit or print the real value."
        : "Non-secret runtime setting from render.yaml.",
    };
  });
}

function toEnvExample(rows = []) {
  return rows
    .map((row) => {
      const value = row.secret ? "" : row.value;
      const comment = row.secret ? " # Render Dashboard secret; paste manually" : "";
      return `${row.key}=${value}${comment}`;
    })
    .join("\n");
}

export function buildRenderDashboardEnvTemplate(options = {}) {
  const inspection = options.inspection || inspectStableHostingBlueprint(options);
  const renderYaml = options.renderYaml;
  const parsedBlueprint = options.blueprint || (renderYaml ? parseRenderBlueprint(renderYaml) : null);
  const blueprint =
    parsedBlueprint ||
    (inspection.checks
      ? {
          envVars: [
            ...inspection.checks
              .filter((check) => String(check.id || "").startsWith("env-"))
              .map((check) => ({
                key: String(check.id).replace(/^env-/, ""),
                value: check.details?.expected || check.details?.actual || "",
                sync: "",
              })),
            ...inspection.requiredDashboardSecretKeys.map((key) => ({ key, value: "", sync: "false" })),
          ],
        }
      : { envVars: [] });
  const rows = buildEnvRows(blueprint);
  const secretCount = rows.filter((row) => row.secret).length;

  return {
    generatedAt: new Date().toISOString(),
    serviceName: inspection.serviceName || "finance-ai-assistant-web",
    blueprintReady: inspection.blueprintReady === true,
    secretsSafe: inspection.secretsSafe === true,
    rowCount: rows.length,
    secretCount,
    nonSecretCount: rows.length - secretCount,
    rows,
    envExample: toEnvExample(rows),
    warning: "Do not paste real API keys into files, chat, logs, screenshots, or git. Enter secret values only in Render Dashboard.",
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  return {
    format: args.has("--env") ? "env" : "json",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseCliArgs();
    const template = buildRenderDashboardEnvTemplate();
    if (args.format === "env") {
      console.log(template.envExample);
    } else {
      console.log(JSON.stringify(template, null, 2));
    }
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
