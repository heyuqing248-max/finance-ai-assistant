# AI Model Strategy / AI 模型路线

Updated: 2026-06-14

## Current Decision / 当前决策

The first usable AI analysis path should use an OpenAI-compatible hosted model through the backend adapter, with strict structured output validation, source grounding, probability language, audit logging, and investment-risk disclaimers.

第一阶段先使用 OpenAI-compatible 托管真实模型，通过后端适配器调用，并强制结构化输出校验、来源引用、概率表达、审计记录和投资风险提示。

Default local configuration:

- Provider: `openai-compatible`
- Primary model route: OpenAI API, currently configured in the UI as `gpt-5.5` with the Responses API.
- Free fallback model route: Google Gemini OpenAI-compatible API, currently `gemini-2.5-flash`.
- Primary API style: `responses`
- Primary Base URL: `https://api.openai.com/v1`
- Fallback API style: `chat-completions`
- Fallback Base URL: `https://generativelanguage.googleapis.com/v1beta/openai`
- Runtime key path: `/private/tmp/finance_ai_model_key`
- Runtime model id path: `/private/tmp/finance_ai_model_id`
- Runtime API style path: `/private/tmp/finance_ai_model_api_style`

Fallback free configuration:

- Provider: `openai-compatible`
- Model: `gemini-2.5-flash`
- API style: `chat-completions`
- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai`

Current relay slots in local/public preview:

- Primary: OpenAI `gpt-5.5`, Responses API.
- Fallback 1: Gemini `gemini-2.5-flash`, OpenAI-compatible chat completions.
- Fallback 2: OpenRouter `qwen/qwen3-next-80b-a3b-instruct:free`, OpenAI-compatible chat completions.
- Fallback 3: Groq `llama-3.1-8b-instant`, OpenAI-compatible chat completions.
- Frontend rule: if all real AI attempts fail, show "current output is rule analysis only" and keep full AI marked incomplete.

## Why This Route / 为什么这样做

Google Gemini API docs checked on 2026-06-12 show an official OpenAI-compatible endpoint that uses a Gemini API key and `https://generativelanguage.googleapis.com/v1beta/openai/`. Local smoke testing showed `gemini-2.5-flash` with thinking disabled is more reliable for the lightweight demo than `gemini-3.5-flash`, which can spend small token budgets on thinking and return no visible content. Official OpenAI API docs checked on 2026-06-12 list GPT-5.5 as the suggested starting point for complex reasoning and professional work, and current OpenAI models are available through the Responses API. The Structured Outputs docs support JSON Schema based output, which matches this project requirement: the AI analysis must return controlled fields instead of free-form trading advice. The model optimization docs also recommend a loop of evals, prompt improvement, and then fine-tuning where useful.

2026-06-12 已查看 Google Gemini API 文档：官方提供 OpenAI-compatible 接口，可用 Gemini API key 和 `https://generativelanguage.googleapis.com/v1beta/openai/`。本地 smoke test 显示 `gemini-2.5-flash` 禁用 thinking 后更适合作为免费备用；`gemini-3.5-flash` 在小 token 预算下容易把额度消耗在 thinking 中，导致没有可见正文。也已查看 OpenAI 官方 API 文档：模型页建议复杂推理和专业工作从 GPT-5.5 开始，当前 OpenAI 模型可通过 Responses API 使用；Structured Outputs 支持 JSON Schema 输出，符合本项目“不要自由发挥交易建议、必须输出受控字段”的要求；模型优化文档也强调先建立评测、优化提示词，再按需要微调。

2026-06-12 local OpenAI verification: `/v1/models` returned HTTP 200 and confirmed `gpt-5.5` is visible to the provided project key. Real Responses API smoke calls returned HTTP 429 with `insufficient_quota`, including a tiny `gpt-4o-mini` request. Therefore the app is correctly connected to OpenAI but must keep AI analysis blank until the OpenAI project has usable quota/billing or a separate fallback key is configured.

2026-06-12 本地 OpenAI 验证：`/v1/models` 返回 HTTP 200，且当前 project key 可见 `gpt-5.5`。真实 Responses API smoke 调用返回 HTTP 429 `insufficient_quota`，包括一次极小的 `gpt-4o-mini` 请求。因此当前不是代码未接通，而是 OpenAI 项目额度/账单不足；在额度可用或配置独立备用 key 前，App 必须保持 AI 分析空白。

2026-06-14 relay verification: v72 no longer treats all AI failures as the same generic quota problem. The backend returns structured `providerRelay.attempts` for every model, including final reason, call status, output status, validation status, retryability, retry time, cooldown state, safety-repair state, and next step. If a model output violates compliance wording, the backend tries one safety-repair prompt; if the repaired output is still missing required metrics or scenarios, the page downgrades to real-data rule reference and labels the failure as incomplete structured output.

2026-06-14 接力验证：v72 不再把所有 AI 失败都混成“额度问题”。后端会为每个模型返回结构化 `providerRelay.attempts`，包含最终原因、调用状态、输出状态、校验状态、是否可重试、重试时间、冷却状态、安全改写状态和下一步操作。如果模型输出触发合规禁用表达，后端会尝试一次安全改写；如果改写后仍缺少必要指标或情景分析，页面降级为真实数据规则参考，并把失败标为结构化输出不完整。

Reference URLs:

- `https://ai.google.dev/gemini-api/docs/openai`
- `https://ai.google.dev/gemini-api/docs/rate-limits`
- `https://developers.openai.com/api/docs/models`
- `https://developers.openai.com/api/docs/guides/structured-outputs`
- `https://developers.openai.com/api/docs/guides/model-optimization`

## Feasibility Scores / 可行性评分

| Route | Score | Recommendation |
| --- | ---: | --- |
| Hosted real model + retrieval + evals / 托管真实模型 + 检索 + 评测 | 85/100 | Use now for local demo once a real model key is provided. |
| Fine-tuning a hosted model / 微调托管模型 | 55/100 | Consider later after collecting labeled finance-analysis examples and eval results. |
| Training an independent base model from scratch / 从零训练独立基础模型 | 10/100 | Not recommended for MVP because data licensing, compute, evaluation, safety, and maintenance costs are too high. |

## Training Gate / 独立训练门禁

Independent training or fine-tuning should not start until all items below exist:

- At least 5,000 high-quality Chinese finance-analysis examples with licensed inputs and expected structured outputs.
- A held-out evaluation set covering A-share, HK, US, macro, filings, sentiment, valuation, and technical-analysis cases.
- Human review rules for low-confidence, source-conflict, stale-data, and high-risk advice scenarios.
- Measurable improvement over the hosted-model baseline on accuracy, citation coverage, hallucination rate, and compliance wording.
- Cost and latency budget showing the trained path is better than the hosted-model baseline.
- Legal and data-licensing review for all training material.

在满足以下条件前，不启动独立训练或微调：

- 至少 5,000 条高质量中文财经分析样本，且输入数据有授权，输出结构清晰。
- 独立评测集覆盖 A 股、港股、美股、宏观、公告、情绪、估值和技术分析。
- 对低置信度、来源冲突、数据过期、高风险建议有人工复核规则。
- 在准确率、引用覆盖、幻觉率、合规表达上明显优于托管模型基线。
- 成本和延迟证明训练路线优于托管模型基线。
- 训练材料完成法律和数据授权复核。

## Next Execution / 下一步执行

1. Add usable quota/billing to the OpenAI project or use a paid/less-limited compatible fallback for stable full AI output.
2. Tighten fallback prompts so smaller free models reliably return all required JSON fields.
3. Re-run local smoke against `GET /api/analysis` and confirm a full AI output passes schema, probability, citation, and compliance checks.
4. Build an eval dataset from real market/news/filing inputs.
5. Compare prompt-only output against future fine-tuning candidates.
6. Keep AI advice blank or clearly marked as rule reference whenever the model, data, sources, quota, or validation checks are not ready.
