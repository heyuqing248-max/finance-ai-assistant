import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { networkInterfaces } from "node:os";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const args = process.argv.slice(2);
const lanMode = args.includes("--lan");
const backendPort = process.env.FINANCE_AI_API_PORT || process.env.PORT || "4180";
const webPort = process.env.FINANCE_AI_WEB_PORT || "4173";
const webHost = process.env.FINANCE_AI_WEB_HOST || (lanMode ? "0.0.0.0" : "127.0.0.1");

const children = [];
let shuttingDown = false;

function prefixLines(prefix, stream) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  });
}

function startProcess(label, args, env) {
  const child = spawn(nodeBin, args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  prefixLines(`[${label}]`, child.stdout);
  prefixLines(`[${label}]`, child.stderr);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${label} exited with ${signal || `code ${code}`}. Stopping all services.`);
    stopAll(code || 1);
  });
  return child;
}

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 200);
}

function getLanUrls() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${webPort}`);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

console.log("Starting Finance AI local webpage stack...");
console.log(`Web:     http://${webHost === "0.0.0.0" ? "127.0.0.1" : webHost}:${webPort}`);
if (webHost === "0.0.0.0") {
  const lanUrls = getLanUrls();
  if (lanUrls.length > 0) {
    console.log(`LAN:     ${lanUrls.join("  ")}`);
  } else {
    console.log("LAN:     No non-internal IPv4 address detected.");
  }
}
console.log(`Backend: http://localhost:${backendPort}`);
console.log("Press Ctrl+C to stop both services.");

startProcess("backend", ["backend/server.mjs"], { PORT: backendPort });
startProcess("web", ["scripts/web-dev-server.mjs"], {
  FINANCE_AI_WEB_PORT: webPort,
  FINANCE_AI_WEB_HOST: webHost,
});
