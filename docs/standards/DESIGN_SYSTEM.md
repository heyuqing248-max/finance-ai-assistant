# Design System Standard / 设计规范

## Visual Direction / 视觉方向
- Chinese-first interface.
- Combine B + D style: clear market/news structure similar to Futu or Eastmoney, plus a minimal layout focused on conclusions.
- Prioritize clarity over decoration.
- Avoid dense professional-terminal complexity in MVP.

## Layout Principles / 布局原则
- Home page shows "今天最重要的事" and "我关注的股票有什么变化".
- Keep market tabs clear: A 股、港股、美股.
- Stock detail pages should prioritize conclusion, probability, risk, and key reasons.
- Cards may be used for repeated news or stock items, but avoid nested cards.
- Mobile, tablet, and desktop layouts must all remain readable.
- Desktop uses a left sidebar navigation; mobile uses a compact sticky top tab bar so the first screen can prioritize search, market tabs, and analysis results without being affected by iOS keyboard viewport changes.

## Key UI Components / 关键组件
- Market segmented control: A 股 / 港股 / 美股.
- Stock search input.
- Watchlist controls.
- Probability indicators.
- Risk badges.
- News impact labels.
- Explanation buttons for professional terms.
- User analysis-style selector: 稳健 / 平衡 / 积极.
- Notification permission controls.

## Professional Term Explanation / 专业名词解释
- Any professional term likely unfamiliar to beginners must include a small explanation button.
- The explanation should be plain Chinese, short, and practical.
- Examples: 市盈率、资金流向、技术背离、宏观流动性、估值、换手率、成交量、风险溢价。

## Tone / 文案语气
- Clear, calm, and direct.
- Avoid frightening or overconfident wording.
- Use "参考", "可能", "风险升高", "模型估计", "需要结合自身情况判断".
