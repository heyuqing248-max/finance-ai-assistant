import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number.parseInt(process.env.FINANCE_AI_PUBLIC_PORT || process.env.PORT || "4174", 10);
const host = process.env.FINANCE_AI_PUBLIC_HOST || "127.0.0.1";

function readRuntimeSecret(filePath) {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8").trim();
}

function applyRealDataRuntimeEnv() {
  const twelveDataKey =
    process.env.FINANCE_AI_TWELVE_DATA_API_KEY || readRuntimeSecret("/private/tmp/finance_ai_twelve_data_key");
  const alphaVantageKey =
    process.env.FINANCE_AI_ALPHA_VANTAGE_API_KEY ||
    process.env.FINANCE_AI_NEWS_API_KEY ||
    readRuntimeSecret("/private/tmp/finance_ai_alpha_vantage_key");
  const modelKey =
    process.env.FINANCE_AI_MODEL_API_KEY || readRuntimeSecret("/private/tmp/finance_ai_model_key");
  const fallbackModelKey =
    process.env.FINANCE_AI_MODEL_FALLBACK_API_KEY ||
    readRuntimeSecret("/private/tmp/finance_ai_model_fallback_key");
  const fallback2ModelKey =
    process.env.FINANCE_AI_MODEL_FALLBACK2_API_KEY ||
    readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_key");
  const fallback3ModelKey =
    process.env.FINANCE_AI_MODEL_FALLBACK3_API_KEY ||
    readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_key");

  Object.assign(process.env, {
    FINANCE_AI_MARKET_DATA_PROVIDER: process.env.FINANCE_AI_MARKET_DATA_PROVIDER || "multi-free",
    FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: process.env.FINANCE_AI_MARKET_DATA_ALLOW_NETWORK || "true",
    FINANCE_AI_MARKET_DATA_MODE: process.env.FINANCE_AI_MARKET_DATA_MODE || "delayed",
    FINANCE_AI_TWELVE_DATA_API_KEY: twelveDataKey,
    FINANCE_AI_ALPHA_VANTAGE_API_KEY: alphaVantageKey,
    FINANCE_AI_NEWS_PROVIDER: process.env.FINANCE_AI_NEWS_PROVIDER || "multi-free-news",
    FINANCE_AI_NEWS_API_KEY: process.env.FINANCE_AI_NEWS_API_KEY || alphaVantageKey,
    FINANCE_AI_NEWS_ALLOW_NETWORK: process.env.FINANCE_AI_NEWS_ALLOW_NETWORK || "true",
    FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK: process.env.FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK || "true",
    FINANCE_AI_GOOGLE_NEWS_ALLOW_NETWORK: process.env.FINANCE_AI_GOOGLE_NEWS_ALLOW_NETWORK || "true",
    FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: process.env.FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK || "true",
    FINANCE_AI_NEWS_LIMIT: process.env.FINANCE_AI_NEWS_LIMIT || "5",
    FINANCE_AI_FILINGS_PROVIDER: process.env.FINANCE_AI_FILINGS_PROVIDER || "multi-free-filings",
    FINANCE_AI_FILINGS_ALLOW_NETWORK: process.env.FINANCE_AI_FILINGS_ALLOW_NETWORK || "true",
    FINANCE_AI_FILINGS_LIMIT: process.env.FINANCE_AI_FILINGS_LIMIT || "8",
    FINANCE_AI_SEC_USER_AGENT:
      process.env.FINANCE_AI_SEC_USER_AGENT || "finance-ai-assistant public-preview contact-serena",
    FINANCE_AI_MACRO_PROVIDER: process.env.FINANCE_AI_MACRO_PROVIDER || "world-bank-open-data",
    FINANCE_AI_MACRO_ALLOW_NETWORK: process.env.FINANCE_AI_MACRO_ALLOW_NETWORK || "true",
  });

  if (modelKey) {
    Object.assign(process.env, {
      FINANCE_AI_MODEL_PROVIDER: process.env.FINANCE_AI_MODEL_PROVIDER || "openai-compatible",
      FINANCE_AI_MODEL_API_KEY: modelKey,
      FINANCE_AI_MODEL_ID:
        process.env.FINANCE_AI_MODEL_ID || readRuntimeSecret("/private/tmp/finance_ai_model_id") || "gpt-5.5",
      FINANCE_AI_MODEL_BASE_URL:
        process.env.FINANCE_AI_MODEL_BASE_URL ||
        readRuntimeSecret("/private/tmp/finance_ai_model_base_url") ||
        "https://api.openai.com/v1",
      FINANCE_AI_MODEL_API_STYLE:
        process.env.FINANCE_AI_MODEL_API_STYLE ||
        readRuntimeSecret("/private/tmp/finance_ai_model_api_style") ||
        "responses",
      FINANCE_AI_MODEL_ALLOW_NETWORK: process.env.FINANCE_AI_MODEL_ALLOW_NETWORK || "true",
      FINANCE_AI_MODEL_RUNTIME: process.env.FINANCE_AI_MODEL_RUNTIME || "public-preview-local-runtime",
    });
  }

  if (fallbackModelKey) {
    Object.assign(process.env, {
      FINANCE_AI_MODEL_FALLBACK_PROVIDER:
        process.env.FINANCE_AI_MODEL_FALLBACK_PROVIDER || "openai-compatible",
      FINANCE_AI_MODEL_FALLBACK_API_KEY: fallbackModelKey,
      FINANCE_AI_MODEL_FALLBACK_ID:
        process.env.FINANCE_AI_MODEL_FALLBACK_ID ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback_id") ||
        "gemini-2.5-flash",
      FINANCE_AI_MODEL_FALLBACK_BASE_URL:
        process.env.FINANCE_AI_MODEL_FALLBACK_BASE_URL ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback_base_url") ||
        "https://generativelanguage.googleapis.com/v1beta/openai",
      FINANCE_AI_MODEL_FALLBACK_API_STYLE:
        process.env.FINANCE_AI_MODEL_FALLBACK_API_STYLE ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback_api_style") ||
        "chat-completions",
      FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK:
        process.env.FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK || "true",
    });
  }

  if (fallback2ModelKey) {
    Object.assign(process.env, {
      FINANCE_AI_MODEL_FALLBACK2_PROVIDER:
        process.env.FINANCE_AI_MODEL_FALLBACK2_PROVIDER || "openai-compatible",
      FINANCE_AI_MODEL_FALLBACK2_API_KEY: fallback2ModelKey,
      FINANCE_AI_MODEL_FALLBACK2_ID:
        process.env.FINANCE_AI_MODEL_FALLBACK2_ID ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_id") ||
        "google/gemini-2.0-flash-exp:free",
      FINANCE_AI_MODEL_FALLBACK2_BASE_URL:
        process.env.FINANCE_AI_MODEL_FALLBACK2_BASE_URL ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_base_url") ||
        "https://openrouter.ai/api/v1",
      FINANCE_AI_MODEL_FALLBACK2_API_STYLE:
        process.env.FINANCE_AI_MODEL_FALLBACK2_API_STYLE ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_api_style") ||
        "chat-completions",
      FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK:
        process.env.FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK || "true",
    });
  }

  if (fallback3ModelKey) {
    Object.assign(process.env, {
      FINANCE_AI_MODEL_FALLBACK3_PROVIDER:
        process.env.FINANCE_AI_MODEL_FALLBACK3_PROVIDER || "openai-compatible",
      FINANCE_AI_MODEL_FALLBACK3_API_KEY: fallback3ModelKey,
      FINANCE_AI_MODEL_FALLBACK3_ID:
        process.env.FINANCE_AI_MODEL_FALLBACK3_ID ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_id") ||
        "llama-3.1-8b-instant",
      FINANCE_AI_MODEL_FALLBACK3_BASE_URL:
        process.env.FINANCE_AI_MODEL_FALLBACK3_BASE_URL ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_base_url") ||
        "https://api.groq.com/openai/v1",
      FINANCE_AI_MODEL_FALLBACK3_API_STYLE:
        process.env.FINANCE_AI_MODEL_FALLBACK3_API_STYLE ||
        readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_api_style") ||
        "chat-completions",
      FINANCE_AI_MODEL_FALLBACK3_ALLOW_NETWORK:
        process.env.FINANCE_AI_MODEL_FALLBACK3_ALLOW_NETWORK || "true",
    });
  }
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function safeResolve(pathname = "/") {
  const decoded = decodeURIComponent(pathname.split("?")[0] || "/");
  const normalizedPath = decoded === "/" ? "/index.html" : decoded;
  const candidate = resolve(projectRoot, `.${normalizedPath}`);
  const allowedPrefix = `${projectRoot}${sep}`;
  if (candidate !== projectRoot && !candidate.startsWith(allowedPrefix)) return "";
  return candidate;
}

applyRealDataRuntimeEnv();
const { createAppServer, createMockState, loadStateFromFile } = await import("../backend/server.mjs");
const backendState = process.env.FINANCE_AI_DATA_FILE
  ? await loadStateFromFile(process.env.FINANCE_AI_DATA_FILE)
  : createMockState();
const backendServer = createAppServer({ state: backendState });

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (url.pathname === "/health" || url.pathname.startsWith("/api/")) {
    backendServer.emit("request", request, response);
    return;
  }

  const filePath = safeResolve(request.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Finance AI public preview running at http://${host}:${port}`);
  console.log("Same-origin API is available at /api/* and /health.");
  console.log("Secrets are read from runtime env or /private/tmp and are not printed.");
});
