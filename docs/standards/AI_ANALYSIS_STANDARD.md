# AI Analysis Standard / AI 分析规范

## Core Rule / 核心规则
AI output must be a reference, not a guarantee. Do not state or imply guaranteed profit, certain prediction, or mandatory buy/sell instructions.

AI 输出只能作为参考，不能表达为收益保证、确定性预测或必须买卖。

## Required Dimensions / 必须考虑的维度
- 新闻影响
- 宏观经济
- 行业趋势
- 公司基本面
- 估值水平
- 技术走势
- 市场情绪
- 资金流向 when data is available

## Quantified Output / 量化输出
Use model-reference wording:
- 短期上涨参考概率
- 短期下跌风险概率
- 市场情绪分数
- 估值吸引力分数
- 技术面强弱分数
- 综合参考信号

Do not present percentages as objective certainty. Every percentage must be labeled as model-estimated or reference-only.

## Real-Data Rule Reference Fallback / 真实数据规则参考兜底
When the hosted AI model is unavailable, rate-limited, or not configured, the app may still show usable probability metrics only if it has real provider inputs. Valid inputs include real market quote/history, real news, real filings, real public statements, and real macro data.

AI 模型不可用、限流或未配置时，应用可以显示可用概率指标，但前提是已经取得真实 provider 输入。有效输入包括真实行情/历史走势、真实新闻、真实公告、真实公开言论和真实宏观数据。

The output must be labeled as `真实数据规则参考` or equivalent. It must not be labeled as a full AI model result, and it must not use mock, sample, fixture, catalog-only, or default stock data to fill probabilities.

输出必须标注为 `真实数据规则参考` 或同等含义。不得把它标成完整 AI 模型结果，也不得使用 mock、sample、fixture、仅股票目录或默认股票数据补齐概率。

Frontend coverage labels must distinguish this mode. Use labels such as `AI 规则参考` for rule-reference output, and reserve `AI 已生成` for completed real model output.

前端覆盖标签必须区分该模式。规则参考输出使用 `AI 规则参考` 等标签；`AI 已生成` 只保留给完整真实模型输出。

If no real provider input exists, probability metrics must remain blank or show `待AI模型` / `待真实数据`; do not fabricate values.

如果没有真实 provider 输入，概率指标必须保持空白，或显示 `待AI模型` / `待真实数据`；不得伪造数值。

## Suggested Action Language / 操作参考语言
Allowed:
- 继续观察
- 谨慎持有
- 风险升高
- 偏多信号
- 偏空信号
- 可考虑分批降低仓位
- 可关注回调后的机会

Avoid:
- 必须买入
- 必须卖出
- 保证上涨
- 稳赚
- 无风险
- 明天一定涨

## Explanation Structure / 分析结构
Each analysis should include:
- Summary conclusion
- Quantified model references
- Key positive factors
- Key negative factors
- Time horizon
- Main risks
- Disclaimer

## Risk Preferences / 风险偏好
- 稳健型：更重视风险和回撤。
- 平衡型：机会和风险并重。
- 积极型：更重视机会，但必须提示高风险。
