# 目标修复证据表 / Remediation Evidence Matrix

更新时间：2026-06-15  
Updated: 2026-06-15

## 当前固定网址 / Current Fixed URL

- 固定公开测试网址：`https://finance-ai-assistant-web.onrender.com`
- 临时 `lhr.life` 链接只作为短时备用，不再作为稳定公开入口。
- Fixed public test URL: `https://finance-ai-assistant-web.onrender.com`
- Temporary `lhr.life` links are short-lived backups only, not the stable public entry.

## Render AI Key 左列填写 / Render AI Key Left Column

如果用户已经按 OpenAI、Gemini、OpenRouter、Groq 的顺序重新创建并复制 key，Render Environment Variables 左列应填写：

| 顺序 | 左列变量名 | 右侧 Value 对应来源 |
| --- | --- | --- |
| 1 | `FINANCE_AI_MODEL_API_KEY` | OpenAI 主模型 key |
| 2 | `FINANCE_AI_MODEL_FALLBACK_API_KEY` | Gemini 备用模型 key |
| 3 | `FINANCE_AI_MODEL_FALLBACK2_API_KEY` | OpenRouter 备用模型 key |
| 4 | `FINANCE_AI_MODEL_FALLBACK3_API_KEY` | Groq 备用模型 key |

If the user recreated and copied keys in the order OpenAI, Gemini, OpenRouter, and Groq, the Render Environment Variables left column should be:

| Order | Left-column variable name | Right-side Value source |
| --- | --- | --- |
| 1 | `FINANCE_AI_MODEL_API_KEY` | OpenAI primary model key |
| 2 | `FINANCE_AI_MODEL_FALLBACK_API_KEY` | Gemini fallback model key |
| 3 | `FINANCE_AI_MODEL_FALLBACK2_API_KEY` | OpenRouter fallback model key |
| 4 | `FINANCE_AI_MODEL_FALLBACK3_API_KEY` | Groq fallback model key |

注意：真实 key 只能保存在 Render Dashboard 的 Value 字段，不写入仓库、文档、聊天记录或截图。  
Note: real keys must only be stored in Render Dashboard Value fields, not in the repo, docs, chat, or screenshots.

## 修复状态 / Fix Status

| 优先级 | 目标问题 | 当前状态 | 证据 |
| --- | --- | --- | --- |
| P0 | 固定公开网址稳定可用 | 已验证 / Verified | `https://finance-ai-assistant-web.onrender.com` 通过 180 秒稳定门禁；`externalUseReady=true`、`continuousHealthPassed=true`、`lastFailure=null`。 |
| P0 | 临时链接失效后的备用访问 | 已建立 / Established | 固定 Render 为主入口；`lhr.life` 和本机地址只作为备用说明。 |
| P1 | 完整真实 AI 输出 | 已跑通但需持续监控 / Proven but not continuously guaranteed | v123 线上 MSFT 曾返回 `analysisMode=real-provider`；Render key redeploy 后，`600519` 也返回 `HTTP 200` 且成功模型为 `openai/gpt-oss-120b`。连续调用仍可能因 provider 额度/冷却降级规则参考。 |
| P1 | 完整真实 AI 稳定性验收 | 新增门禁 / Gate added | `npm run gate:full-ai -- --attempts 3 --interval-ms 10000 --analysis-timeout-ms 60000` 会连续检查完整 AI；任一轮降级规则参考即失败。 |
| P1 | Responses API 非 JSON 修复 | 已增强 / Improved | Responses API 路径现在和 chat 路径一样，遇到不可解析 JSON 会使用 compact、ultra-compact 结构化提示重试。 |
| P1 | 完整真实 AI 因 JSON/合规过滤未生成 | 已增强 / Improved | v142 保留免费 JSON 修复重试，并新增 provider 合规过滤安全改写重试：触发 `content_filter/safety/blocked/refusal/policy` 后自动要求无收益承诺、无买卖指令版本；仍失败则继续免费备用模型接力，全部失败保持规则参考。 |
| P1 | 429/额度不足时自动接力 | 已实现 / Implemented | AI relay 会按主模型、Gemini、OpenRouter、Groq、额外 OpenRouter/Groq 兼容模型尝试，并记录失败类型、冷却和下一步。 |
| P1 | 首页主卡片同步后端分析结果 | 已修复 / Fixed | v124 前端把后端 `upsideProbability`、`downsideProbability`、`confidenceScore` 和 `actionReference` 写入主卡片；回归覆盖 `600519` 返回 `54%` / `65/100` 后不再显示 `待AI模型`。 |
| P1 | 首屏加载短暂显示样例行情/样例情景 | 已修复 / Fixed | v125 加载中统一显示 `正在请求真实数据`，清空走势图、交易计划和情景价格；回归覆盖本地目录样例历史和后端误带 `local-sample` 情景时均不渲染。 |
| P1 | 规则参考被误归为待 AI 模型 | 已修复 / Fixed | v136 主卡片和自选股卡片均拆分 `规则参考` 与 `完整 AI`；自选股按股票代码复用当前分析结果，并在分析渲染末尾再次刷新，必要时读取主卡片可见百分比和当前股票标题；如果只有一只自选股，即使标题状态滞后也可复用可见指标。规则参考显示 `规则参考 xx%`，完整 AI 显示 `AI 参考 xx% / AI 已生成`，未生成时单独显示 `完整 AI 待模型`；规则概率不再回退为 `待AI模型`；分析接口有真实报价来源时，行情显示 `已连接 / 缺历史走势`；前端真实分析等待时间提升到 `45000ms`。 |
| P1 | 缺少历史走势时未来情景目标价显示 0.00 | 已修复 / Fixed | v136 情景卡片保留 `+6% / 0% / -6%` 等收益百分比，但 `targetPrice` 为 `0/null/缺失` 时显示 `目标价暂无`，不再渲染 `0.00`。 |
| P1 | 有真实报价但仍提示暂未获得真实行情 | 已修复 / Fixed | v137 前后端统一拆分 `真实报价 / 历史走势 / 技术分析`。报价-only 场景显示 `真实报价：已获得 ...；历史走势：缺失；技术分析：低置信。`，并有回归禁止 `暂未获得真实行情` 误判。 |
| P1 | 设置页数据源状态和首页状态不一致 | 已修复 / Fixed | v138 设置页拆成三层：`全局 provider 配置状态`、`当前股票本次请求状态`、`页面缓存/展示状态`。全局配置可继续显示待接入，但当前股票若已有真实报价、新闻、公告或宏观，会在本次请求层明确显示已连接/已获得。 |
| P1 | 官方公告可信度被打成普通新闻默认分 | 已修复 / Fixed | v139 后端拆分普通新闻评分和官方公告评分。`SEC EDGAR`、`上海证券交易所公告`、`HKEXnews` 使用官方公告规则，回归固定为 SEC `96/100`、上交所 `95/100`、HKEX `94/100`，不再落到普通 RSS/default `62/100`。 |
| P1 | 低可信新闻进入公司直接新闻主列表 | 已修复 / Fixed | v140 普通新闻若明确可信度低于 `70/100`，默认进入折叠区 `辅助参考`，不再作为 `公司直接新闻` 首屏展示；官方公告仍按公告路径优先展示。 |
| P1 | 新闻相关性说明不够具体 | 已修复 / Fixed | v141 相关性说明改为具体命中原因：公司中文名、公司英文名、股票代码、公告接口、公开言论接口、产品关键词、供应链/监管关键词、行业关键词。 |
| P1 | AI 失败信息过技术化 | 已改善 / Improved | 首页显示用户语言；技术码折叠到诊断详情。 |
| P1 | 新闻相关性和空状态 | 已改善，需继续抽检 / Improved, needs spot checks | 新闻先按直接相关性、重要性排序，再去重折叠；空状态显示来源、返回条数、过滤条数和更新时间。 |
| P1 | 自选股卡片状态不一致 | 已改善 / Improved | 自选股区分规则参考和完整 AI 状态，避免把规则概率误显示为“无分析”。 |
| P2 | 首页内部诊断信息偏多 | 已收敛 / Reduced | 普通用户只看能力摘要；门禁、provider、审计、配置细节放入折叠诊断。 |
| P2 | 加载和真实数据状态不清晰 | 已改善 / Improved | 行情、新闻、公告、宏观分别显示更新时间或待真实数据。 |
| P2 | 低可信来源说明不足 | 已改善 / Improved | 新闻显示来源、相关性和折叠原因，弱相关内容不进入首屏直接新闻。 |
| P2 | AI 输出安全修复路径 | 已实现 / Implemented | Provider 输出不合规或 JSON 结构不完整时会走紧凑 JSON 修复；失败后明确降级规则参考。 |
| P3 | 用户状态和开发诊断混在一起 | 已改善 / Improved | 普通文案与技术诊断分层显示。 |
| P3 | 规则参考和完整 AI 区分 | 已实现 / Implemented | 页面明确显示“当前仅为规则分析”或“完整 AI 输出可用”。 |

## 仍需注意 / Remaining Caveats

- 完整 AI 已经在固定线上环境成功输出，但免费或低额度 provider 可能随时触发额度、限流或冷却；因此不能承诺每一次请求都有完整 AI。
- 如果以后面向更多外部用户，还需要继续完善生产数据库、登录权限、监控告警、数据授权和投资合规审查。
- 任何 API key 都不能写入项目文件。

- Full AI has successfully produced output on the fixed hosted environment, but free or low-quota providers can still hit quota, rate limits, or cooldowns; the app must not promise full AI on every request.
- Before broader external use, production database, auth, monitoring, data licensing, and investment-compliance review still need more work.
- API keys must never be written into project files.

## 关键验收命令 / Key Verification Commands

```bash
node scripts/render-live-status.mjs --analysis-timeout-ms 60000
npm run gate:full-ai -- --attempts 3 --interval-ms 10000 --analysis-timeout-ms 60000
node scripts/stable-hosting-preflight.mjs --url https://finance-ai-assistant-web.onrender.com --duration-ms 180000 --interval-ms 30000 --timeout-ms 25000
node --test tests/ai-provider-adapter.test.mjs
node --test tests/stable-hosting-preflight.test.mjs tests/render-live-status.test.mjs
```
