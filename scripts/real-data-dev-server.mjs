import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;

function readRuntimeSecret(filePath) {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8").trim();
}

const twelveDataKey = process.env.FINANCE_AI_TWELVE_DATA_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_twelve_data_key");
const alphaVantageKey = process.env.FINANCE_AI_ALPHA_VANTAGE_API_KEY ||
  process.env.FINANCE_AI_NEWS_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_alpha_vantage_key");
const modelKey = process.env.FINANCE_AI_MODEL_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_model_key");
const modelId = process.env.FINANCE_AI_MODEL_ID ||
  readRuntimeSecret("/private/tmp/finance_ai_model_id");
const modelBaseUrl = process.env.FINANCE_AI_MODEL_BASE_URL ||
  readRuntimeSecret("/private/tmp/finance_ai_model_base_url");
const modelApiStyle = process.env.FINANCE_AI_MODEL_API_STYLE ||
  readRuntimeSecret("/private/tmp/finance_ai_model_api_style");
const fallbackModelKey = process.env.FINANCE_AI_MODEL_FALLBACK_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback_key");
const fallbackModelId = process.env.FINANCE_AI_MODEL_FALLBACK_ID ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback_id");
const fallbackModelBaseUrl = process.env.FINANCE_AI_MODEL_FALLBACK_BASE_URL ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback_base_url");
const fallbackModelApiStyle = process.env.FINANCE_AI_MODEL_FALLBACK_API_STYLE ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback_api_style");
const fallback2ModelKey = process.env.FINANCE_AI_MODEL_FALLBACK2_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_key");
const fallback2ModelId = process.env.FINANCE_AI_MODEL_FALLBACK2_ID ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_id");
const fallback2ModelBaseUrl = process.env.FINANCE_AI_MODEL_FALLBACK2_BASE_URL ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_base_url");
const fallback2ModelApiStyle = process.env.FINANCE_AI_MODEL_FALLBACK2_API_STYLE ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback2_api_style");
const fallback3ModelKey = process.env.FINANCE_AI_MODEL_FALLBACK3_API_KEY ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_key");
const fallback3ModelId = process.env.FINANCE_AI_MODEL_FALLBACK3_ID ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_id");
const fallback3ModelBaseUrl = process.env.FINANCE_AI_MODEL_FALLBACK3_BASE_URL ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_base_url");
const fallback3ModelApiStyle = process.env.FINANCE_AI_MODEL_FALLBACK3_API_STYLE ||
  readRuntimeSecret("/private/tmp/finance_ai_model_fallback3_api_style");
const primaryDefaultModelId = "gpt-5.5";
const primaryModelBaseUrl = "https://api.openai.com/v1";
const fallbackDefaultModelId = "gemini-2.5-flash";
const fallbackDefaultModelBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
const selectedModelBaseUrl = modelBaseUrl || process.env.FINANCE_AI_MODEL_BASE_URL || primaryModelBaseUrl;
const selectedModelApiStyle = modelApiStyle ||
  (selectedModelBaseUrl.replace(/\/+$/, "") === primaryModelBaseUrl ? "responses" : "chat-completions");
const selectedFallbackModelBaseUrl = fallbackModelBaseUrl ||
  process.env.FINANCE_AI_MODEL_FALLBACK_BASE_URL ||
  fallbackDefaultModelBaseUrl;
const selectedFallbackModelApiStyle = fallbackModelApiStyle ||
  (selectedFallbackModelBaseUrl.replace(/\/+$/, "") === primaryModelBaseUrl ? "responses" : "chat-completions");
const selectedFallback2ModelBaseUrl = fallback2ModelBaseUrl ||
  process.env.FINANCE_AI_MODEL_FALLBACK2_BASE_URL ||
  "https://openrouter.ai/api/v1";
const selectedFallback2ModelApiStyle = fallback2ModelApiStyle ||
  (selectedFallback2ModelBaseUrl.replace(/\/+$/, "") === primaryModelBaseUrl ? "responses" : "chat-completions");
const selectedFallback3ModelBaseUrl = fallback3ModelBaseUrl ||
  process.env.FINANCE_AI_MODEL_FALLBACK3_BASE_URL ||
  "https://api.groq.com/openai/v1";
const selectedFallback3ModelApiStyle = fallback3ModelApiStyle ||
  (selectedFallback3ModelBaseUrl.replace(/\/+$/, "") === primaryModelBaseUrl ? "responses" : "chat-completions");

const env = {
  ...process.env,
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
    process.env.FINANCE_AI_SEC_USER_AGENT || "finance-ai-assistant local-development contact-serena",
  FINANCE_AI_MACRO_PROVIDER: process.env.FINANCE_AI_MACRO_PROVIDER || "world-bank-open-data",
  FINANCE_AI_MACRO_ALLOW_NETWORK: process.env.FINANCE_AI_MACRO_ALLOW_NETWORK || "true",
  ...(modelKey
    ? {
        FINANCE_AI_MODEL_PROVIDER: process.env.FINANCE_AI_MODEL_PROVIDER || "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: modelKey,
        FINANCE_AI_MODEL_ID: modelId || process.env.FINANCE_AI_MODEL_ID || primaryDefaultModelId,
        FINANCE_AI_MODEL_BASE_URL: selectedModelBaseUrl,
        FINANCE_AI_MODEL_API_STYLE: selectedModelApiStyle,
        FINANCE_AI_MODEL_ALLOW_NETWORK: process.env.FINANCE_AI_MODEL_ALLOW_NETWORK || "true",
        FINANCE_AI_MODEL_RUNTIME: process.env.FINANCE_AI_MODEL_RUNTIME || "local-real-model-smoke",
        FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS:
          process.env.FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS || "45000",
        FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST:
          process.env.FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST || "1400",
      }
    : {}),
  ...(fallbackModelKey
    ? {
        FINANCE_AI_MODEL_FALLBACK_PROVIDER:
          process.env.FINANCE_AI_MODEL_FALLBACK_PROVIDER || "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK_API_KEY: fallbackModelKey,
        FINANCE_AI_MODEL_FALLBACK_ID:
          fallbackModelId || process.env.FINANCE_AI_MODEL_FALLBACK_ID || fallbackDefaultModelId,
        FINANCE_AI_MODEL_FALLBACK_BASE_URL: selectedFallbackModelBaseUrl,
        FINANCE_AI_MODEL_FALLBACK_API_STYLE: selectedFallbackModelApiStyle,
        FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK:
          process.env.FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK || "true",
      }
    : {}),
  ...(fallback2ModelKey
    ? {
        FINANCE_AI_MODEL_FALLBACK2_PROVIDER:
          process.env.FINANCE_AI_MODEL_FALLBACK2_PROVIDER || "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK2_API_KEY: fallback2ModelKey,
        FINANCE_AI_MODEL_FALLBACK2_ID:
          fallback2ModelId ||
          process.env.FINANCE_AI_MODEL_FALLBACK2_ID ||
          "google/gemini-2.0-flash-exp:free",
        FINANCE_AI_MODEL_FALLBACK2_BASE_URL: selectedFallback2ModelBaseUrl,
        FINANCE_AI_MODEL_FALLBACK2_API_STYLE: selectedFallback2ModelApiStyle,
        FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK:
          process.env.FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK || "true",
      }
    : {}),
  ...(fallback3ModelKey
    ? {
        FINANCE_AI_MODEL_FALLBACK3_PROVIDER:
          process.env.FINANCE_AI_MODEL_FALLBACK3_PROVIDER || "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK3_API_KEY: fallback3ModelKey,
        FINANCE_AI_MODEL_FALLBACK3_ID:
          fallback3ModelId || process.env.FINANCE_AI_MODEL_FALLBACK3_ID || "llama-3.1-8b-instant",
        FINANCE_AI_MODEL_FALLBACK3_BASE_URL: selectedFallback3ModelBaseUrl,
        FINANCE_AI_MODEL_FALLBACK3_API_STYLE: selectedFallback3ModelApiStyle,
        FINANCE_AI_MODEL_FALLBACK3_ALLOW_NETWORK:
          process.env.FINANCE_AI_MODEL_FALLBACK3_ALLOW_NETWORK || "true",
      }
    : {}),
};

console.log("Starting Finance AI real-data local stack...");
console.log("Market data: multi-free relay (Twelve Data -> Alpha Vantage -> Yahoo Chart -> Tencent Quote fallback)");
console.log("News: multi-free relay (Alpha Vantage -> Yahoo Finance RSS -> Google News RSS -> GDELT DOC fallback)");
console.log("Filings: multi-free relay (SSE A-shares -> HKEXnews HK -> SEC EDGAR US)");
console.log("Macro: World Bank Open Data annual indicators");
console.log(
  modelKey
    ? "AI model: openai-compatible runtime enabled from local secret files/env"
    : "AI model: not configured; analysis stays blank instead of using samples",
);
console.log("Secrets: read from runtime env or /private/tmp; values are not printed.");

if (!twelveDataKey) {
  console.warn("Warning: missing Twelve Data key; quote relay will skip Twelve Data.");
}
if (!alphaVantageKey) {
  console.warn("Warning: missing Alpha Vantage key; quote fallback/news will stay empty.");
}
if (modelKey && !modelId) {
  console.warn(`Warning: model key found but model id is missing; using ${primaryDefaultModelId}.`);
}

const child = spawn(nodeBin, ["scripts/full-dev-server.mjs", ...process.argv.slice(2)], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
