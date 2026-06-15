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
| P0 | 稳定访问门禁仍显示未通过 | 已修复 / Fixed | v144 新增 GitHub Actions / 本地脚本连续 180 秒门禁：覆盖 `/`、`/api/health`、MSFT 分析、腾讯控股搜索、`/api/ai-services`；结果发布到 `render-health-status/render-health.json`，Render 后端读取后点亮固定网址稳定访问门禁。 |
| P0 | watchdog 显示 missing | 已修复 / Fixed | v145 在没有真实本机 watchdog 服务时，后端会使用 GitHub Actions / 本地脚本生成的 `render-health.json` 作为免费替代 watchdog；页面显示 `watchdog：脚本健康`、最近检查时间、脚本成功/失败次数和端点成功/失败次数，不再只显示 `missing`。 |
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
| P1 | 宏观更新时间缺少年份和频率 | 已修复 / Fixed | v147 宏观更新时间改用完整日期格式；World Bank Open Data 等年度宏观来源显示为 `YYYY-MM-DD · 年度宏观数据`，避免 `12/31 10:00` 这类缺少年份和频率的短格式。 |
| P1 | 日期格式不统一 | 已修复 / Fixed | v148 统一覆盖提示日期：行情、新闻、公告、公开言论显示 `YYYY-MM-DD HH:mm`；宏观继续显示 `YYYY-MM-DD · 年度/季度/月度`，不再混用 `MM/DD HH:mm`。 |
| P1 | 用户本机缓存会影响重新测试的默认股票 | 已修复 / Fixed | v149 测试链接支持 `?resetLocalState=true`，进入页面前清空 `lastSearch`、`recentSearches`、当前股票选择和搜索来源状态；默认回到 `Microsoft · MSFT`，也可用 `market=us&symbol=AAPL` 等参数指定启动股票，同时保留自选股、持仓、提醒、风险偏好等长期用户数据。 |
| P1 | 官方公告可信度被打成普通新闻默认分 | 已修复 / Fixed | v139 后端拆分普通新闻评分和官方公告评分。`SEC EDGAR`、`上海证券交易所公告`、`HKEXnews` 使用官方公告规则，回归固定为 SEC `96/100`、上交所 `95/100`、HKEX `94/100`，不再落到普通 RSS/default `62/100`。 |
| P1 | 低可信新闻进入公司直接新闻主列表 | 已修复 / Fixed | v140 普通新闻若明确可信度低于 `70/100`，默认进入折叠区 `辅助参考`，不再作为 `公司直接新闻` 首屏展示；官方公告仍按公告路径优先展示。 |
| P1 | 新闻相关性说明不够具体 | 已修复 / Fixed | v141 相关性说明改为具体命中原因：公司中文名、公司英文名、股票代码、公告接口、公开言论接口、产品关键词、供应链/监管关键词、行业关键词。 |
| P1 | AI 失败原因在首页仍偏笼统/技术化 | 已修复 / Fixed | v143 首页 AI 失败摘要固定为“完整 AI 暂不可用，当前显示规则参考。”；`主模型额度不足`、`备用模型限流`、`输出格式错误`、`安全校验失败` 等细节进入“展开技术诊断”。 |
| P1 | 新闻相关性和空状态 | 已改善，需继续抽检 / Improved, needs spot checks | 新闻先按直接相关性、重要性排序，再去重折叠；空状态显示来源、返回条数、过滤条数和更新时间。 |
| P1 | 自选股卡片状态不一致 | 已改善 / Improved | 自选股区分规则参考和完整 AI 状态，避免把规则概率误显示为“无分析”。 |
| P2 | 设置页信息太多，普通用户难读 | 已修复 / Fixed | v146 设置页默认普通模式只保留模型状态摘要、账号、提醒和持仓；watchdog、门禁、provider、审计、数据库、后台任务、通知投递与 AI 技术细节全部进入默认折叠的 `诊断模式`。 |
| P2 | 首页内部诊断信息偏多 | 已收敛 / Reduced | 普通用户只看能力摘要；门禁、provider、审计、配置细节放入折叠诊断。 |
| P2 | 加载和真实数据状态不清晰 | 已改善 / Improved | 行情、新闻、公告、宏观分别显示更新时间或待真实数据。 |
| P2 | 低可信来源说明不足 | 已改善 / Improved | 新闻显示来源、相关性和折叠原因，弱相关内容不进入首屏直接新闻。 |
| P2 | AI 输出安全修复路径 | 已实现 / Implemented | Provider 输出不合规或 JSON 结构不完整时会走紧凑 JSON 修复；失败后明确降级规则参考。 |
| P3 | 用户状态和开发诊断混在一起 | 已修复 / Fixed | v146 设置页按普通模式 / 诊断模式分层；普通模式面向日常使用，诊断模式面向排查和开发。 |
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
