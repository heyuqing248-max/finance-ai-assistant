import { createAiProviderAdapter } from "./ai-provider-adapter.mjs";

const serviceStatus = {
  id: "mock-ai-analysis",
  name: "Mock AI 分析服务",
  mode: "sample",
  status: "ready",
  model: "rule-based-sample-v0",
  capabilities: [
    "riskProfileAdjustment",
    "quantifiedProbability",
    "factorBreakdown",
    "multiAgentAnalysisProcess",
    "sourceLinkedAnalysis",
    "quantifiedTradeBoundaries",
    "scenarioAnalysis",
    "complianceDisclaimer",
  ],
  disclaimer: "当前规则样例仅用于验证 AI contract；严格真实数据模式不会把它展示为个股 AI 分析，不代表真实 AI 投资建议。",
};

const riskAdjustments = {
  conservative: { upside: -6, sentiment: -6, valuation: 4, technical: -3 },
  aggressive: { upside: 6, sentiment: 5, valuation: -2, technical: 5 },
  balanced: { upside: 0, sentiment: 0, valuation: 0, technical: 0 },
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeRiskProfile(riskProfile) {
  return Object.hasOwn(riskAdjustments, riskProfile) ? riskProfile : "balanced";
}

function sentimentDirection(value) {
  if (value === "positive") return 1;
  if (value === "negative") return -1;
  return 0;
}

function buildInformationFlowImpact(sourceContext = {}) {
  const sourceRefs = Array.isArray(sourceContext.sourceRefs) ? sourceContext.sourceRefs : [];
  if (!sourceRefs.length) {
    return {
      score: 0,
      sentimentTilt: "neutral",
      probabilityAdjustment: 0,
      sentimentAdjustment: 0,
      confidenceAdjustment: 0,
      sourceCount: 0,
      summary: "当前未获得可关联到本次分析的新闻、公告或公开言论。",
      formula:
        "sourceImpact = weighted(sentiment * importance * sourceCredibility); no linked sources = 0",
    };
  }

  const weightedSignals = sourceRefs.map((ref) => {
    const importance = clamp(Number(ref.importanceScore) || 0);
    const credibility = clamp(Number(ref.sourceCredibilityScore) || 0);
    const signalStrength = Math.round((importance * 0.65 + credibility * 0.35) || 0);
    return {
      direction: sentimentDirection(ref.sentiment),
      signalStrength,
    };
  });
  const totalStrength = weightedSignals.reduce((total, item) => total + item.signalStrength, 0) || 1;
  const directionalScore =
    weightedSignals.reduce((total, item) => total + item.direction * item.signalStrength, 0) /
    totalStrength;
  const averageStrength = totalStrength / weightedSignals.length;
  const probabilityAdjustment = Math.round(directionalScore * 6);
  const sentimentAdjustment = Math.round(directionalScore * 8);
  const confidenceAdjustment = Math.max(0, Math.min(5, Math.round(averageStrength / 20)));
  const sentimentTilt =
    directionalScore > 0.15 ? "positive" : directionalScore < -0.15 ? "negative" : "neutral";
  const score = clamp(Math.round(50 + directionalScore * 50));

  return {
    score,
    sentimentTilt,
    probabilityAdjustment,
    sentimentAdjustment,
    confidenceAdjustment,
    sourceCount: sourceRefs.length,
    summary:
      sentimentTilt === "positive"
        ? `已关联 ${sourceRefs.length} 条样例信息源，整体偏正面，轻度上调模型参考概率。`
        : sentimentTilt === "negative"
          ? `已关联 ${sourceRefs.length} 条样例信息源，整体偏负面，轻度下调模型参考概率。`
          : `已关联 ${sourceRefs.length} 条样例信息源，方向中性，主要提高置信参考。`,
    formula:
      "probabilityAdjustment = round(weightedSentiment(importance, sourceCredibility) * 6)",
  };
}

function roundPrice(value) {
  const number = Number(value) || 0;
  if (number >= 1000) return Math.round(number);
  if (number >= 100) return Number(number.toFixed(1));
  return Number(number.toFixed(2));
}

function currentPriceFor(stock) {
  const samplePrice = Number(stock.samplePrice);
  if (Number.isFinite(samplePrice) && samplePrice > 0) return samplePrice;
  const history = Array.isArray(stock.history) ? stock.history : [];
  const lastPoint = history.at(-1);
  const historyPrice = Number(lastPoint?.price);
  return Number.isFinite(historyPrice) && historyPrice > 0 ? historyPrice : 0;
}

function buildTradePlan({ stock, riskProfile, upsideProbability, scores }) {
  const currentPrice = currentPriceFor(stock);
  const configByRisk = {
    conservative: {
      entryLow: 0.96,
      entryHigh: 0.99,
      addOn: 1.025,
      reduce: 0.955,
      stopLoss: 0.94,
      takeProfit: 1.08,
      positionSizing: "稳健模式：单次不超过计划仓位 20%-30%，等待回撤或确认后分批。",
      horizon: "4-12 周样例观察",
    },
    balanced: {
      entryLow: 0.97,
      entryHigh: 1.005,
      addOn: 1.035,
      reduce: 0.94,
      stopLoss: 0.925,
      takeProfit: 1.12,
      positionSizing: "平衡模式：单次不超过计划仓位 30%-40%，保留现金应对波动。",
      horizon: "2-8 周样例观察",
    },
    aggressive: {
      entryLow: 0.98,
      entryHigh: 1.02,
      addOn: 1.04,
      reduce: 0.925,
      stopLoss: 0.9,
      takeProfit: 1.18,
      positionSizing: "积极模式：仍建议分批，不用单一信号一次性满仓。",
      horizon: "1-6 周样例观察",
    },
  };
  const config = configByRisk[riskProfile] || configByRisk.balanced;
  const entryHighFactor = upsideProbability >= 62 ? config.entryHigh : Math.min(config.entryHigh, 0.98);
  const stance =
    upsideProbability >= 65
      ? "分批观察"
      : upsideProbability >= 52
        ? "等待确认"
        : "降低追高";

  return {
    mode: "model-reference",
    stance,
    currentPrice: roundPrice(currentPrice),
    entryZone: {
      low: roundPrice(currentPrice * config.entryLow),
      high: roundPrice(currentPrice * entryHighFactor),
    },
    addOnTrigger: roundPrice(currentPrice * config.addOn),
    reduceTrigger: roundPrice(currentPrice * config.reduce),
    stopLoss: roundPrice(currentPrice * config.stopLoss),
    takeProfit: roundPrice(currentPrice * config.takeProfit),
    positionSizing: config.positionSizing,
    holdingHorizon: config.horizon,
    rationale: `基于样例现价、${upsideProbability}% 上涨参考概率、情绪 ${scores.sentimentScore}/100、估值 ${scores.valuationScore}/100 和技术 ${scores.technicalScore}/100 生成操作边界。`,
    disclaimer: "仅为模型参考边界，不构成买入、卖出、加仓、减仓或收益承诺。",
  };
}

function buildScenarioAnalysis({ stock, riskProfile, upsideProbability, confidenceScore }) {
  const currentPrice = currentPriceFor(stock);
  const riskMultiplier =
    riskProfile === "aggressive" ? 1.18 : riskProfile === "conservative" ? 0.82 : 1;
  const bullProbability = clamp(Math.round(upsideProbability * 0.62 + confidenceScore * 0.18));
  const bearProbability = clamp(Math.round((100 - upsideProbability) * 0.72));
  const baseProbability = Math.max(0, 100 - bullProbability - bearProbability);
  const bullReturn = (0.08 + upsideProbability / 500) * riskMultiplier;
  const baseReturn = ((upsideProbability - 50) / 350) * riskMultiplier;
  const bearReturn = -(0.06 + (100 - upsideProbability) / 550) * riskMultiplier;

  const buildCase = (key, label, probability, expectedReturn, summary) => ({
    key,
    label,
    probability,
    targetPrice: roundPrice(currentPrice * (1 + expectedReturn)),
    expectedReturnPct: Number((expectedReturn * 100).toFixed(1)),
    summary,
  });

  return {
    mode: "model-reference",
    horizon: riskProfile === "aggressive" ? "1-6 周样例" : riskProfile === "conservative" ? "4-12 周样例" : "2-8 周样例",
    cases: [
      buildCase(
        "bull",
        "乐观情景",
        bullProbability,
        bullReturn,
        "新闻和技术面继续改善，估值压力可控，价格向上测试高位区间。",
      ),
      buildCase(
        "base",
        "基准情景",
        baseProbability,
        baseReturn,
        "主要信息已被部分计入，价格围绕当前区间震荡并等待新催化。",
      ),
      buildCase(
        "bear",
        "悲观情景",
        bearProbability,
        bearReturn,
        "风险偏好下降或基本面催化不足，价格回落到风险控制区间。",
      ),
    ],
    disclaimer: "情景概率和目标价为样例模型参考，不构成收益预测、买卖建议或承诺。",
  };
}

function buildPortfolioContext(stock, portfolioEntry) {
  if (!portfolioEntry || typeof portfolioEntry !== "object") {
    return {
      source: "none",
      inputCoverage: "not_required",
      upsideAdjustment: 0,
      sentimentAdjustment: 0,
      technicalAdjustment: 0,
      actionNotes: [],
      reasons: [],
      risks: [],
    };
  }

  const buyPrice = parsePositiveNumber(portfolioEntry.buyPrice);
  const holdingQty = parsePositiveNumber(portfolioEntry.holdingQty);
  const targetReturn = parsePositiveNumber(portfolioEntry.targetReturn);
  const maxLoss = parsePositiveNumber(portfolioEntry.maxLoss);
  const filledFields = ["buyPrice", "holdingQty", "buyDate", "targetReturn", "maxLoss"].filter(
    (key) => Boolean(portfolioEntry[key]),
  ).length;
  const currentPrice = currentPriceFor(stock);
  const hasPosition = Boolean(buyPrice && holdingQty && currentPrice);
  const cost = hasPosition ? buyPrice * holdingQty : null;
  const sampleMarketValue = hasPosition ? currentPrice * holdingQty : null;
  const estimatedReturnPct = hasPosition && cost > 0 ? ((sampleMarketValue - cost) / cost) * 100 : null;
  const context = {
    source: "backend-saved",
    inputCoverage: hasPosition ? "backend-saved-position" : "backend-saved-partial",
    filledFields,
    buyPrice,
    holdingQty,
    targetReturn,
    maxLoss,
    currentPrice: roundPrice(currentPrice),
    estimatedReturnPct:
      Number.isFinite(estimatedReturnPct) ? Number(estimatedReturnPct.toFixed(2)) : null,
    upsideAdjustment: 0,
    sentimentAdjustment: 0,
    technicalAdjustment: 0,
    actionNotes: [],
    reasons: [],
    risks: [],
  };

  if (!hasPosition) {
    context.reasons.push(
      `后端持仓联动：已读取 ${filledFields}/5 项持仓字段；补充买入价和数量后，可估算样例盈亏与风险边界。`,
    );
    return context;
  }

  const returnText = `${context.estimatedReturnPct >= 0 ? "+" : ""}${context.estimatedReturnPct.toFixed(2)}%`;
  context.reasons.push(
    `后端持仓联动：按样例现价 ${context.currentPrice} 测算，当前持仓相对买入价的样例浮动收益率为 ${returnText}。`,
  );

  if (targetReturn) {
    const remainingToTarget = targetReturn - context.estimatedReturnPct;
    if (context.estimatedReturnPct >= targetReturn) {
      context.upsideAdjustment -= 4;
      context.technicalAdjustment -= 1;
      context.actionNotes.push(
        `已达到你保存的目标收益率 ${targetReturn}%，更适合分批止盈或抬高保护位，而不是盲目加仓。`,
      );
      context.risks.push("目标收益已达成时，继续持有的核心风险是回撤吞噬已获得收益。");
    } else {
      context.reasons.push(
        `距离你保存的目标收益率 ${targetReturn}% 还差约 ${remainingToTarget.toFixed(2)} 个百分点。`,
      );
    }
  }

  if (maxLoss) {
    const stopLossLine = -maxLoss;
    if (context.estimatedReturnPct <= stopLossLine) {
      context.upsideAdjustment -= 6;
      context.sentimentAdjustment -= 2;
      context.technicalAdjustment -= 3;
      context.actionNotes.push(
        `样例浮动收益率已低于你保存的最大可接受亏损 -${maxLoss}%，建议优先复核止损纪律和仓位。`,
      );
      context.risks.push("当前样例亏损已触及你保存的风险边界，继续持有需要更强的基本面或趋势证据支撑。");
    } else {
      const lossBuffer = context.estimatedReturnPct + maxLoss;
      context.reasons.push(`距离你保存的最大可接受亏损线仍有约 ${lossBuffer.toFixed(2)} 个百分点缓冲。`);
    }
  }

  return context;
}

function normalizeMacroContext(macroContext) {
  if (!macroContext || macroContext.status !== "ok") return null;
  return {
    market: macroContext.market || "",
    region: macroContext.region || "",
    factorScore: clamp(Math.round(Number(macroContext.factorScore) || 0)),
    summary: macroContext.summary || "",
    indicatorCount: Array.isArray(macroContext.indicators) ? macroContext.indicators.length : 0,
    policyEventCount: Array.isArray(macroContext.policyEvents) ? macroContext.policyEvents.length : 0,
    sourceLabel: macroContext.source?.label || "",
    sourceStatus: macroContext.sourceStatus || "",
    asOf: macroContext.asOf || "",
    disclaimer: macroContext.disclaimer || "",
  };
}

function buildFactorBreakdown(stock, scores, macroContext) {
  const normalizedMacro = normalizeMacroContext(macroContext);
  return [
    {
      key: "macro",
      label: "宏观经济",
      score:
        normalizedMacro?.factorScore ||
        clamp(Math.round((scores.sentimentScore + scores.valuationScore) / 2)),
      weight: 20,
      summary: normalizedMacro
        ? `${normalizedMacro.summary} 来源：${normalizedMacro.sourceLabel || "样例宏观数据"}。`
        : "当前使用样例宏观与市场流动性输入，真实版本会接入利率、汇率、政策和经济数据。",
    },
    {
      key: "industry",
      label: "行业分析",
      score: clamp(Math.round((stock.sentiment + scores.technicalScore) / 2)),
      weight: 18,
      summary: "当前使用样例行业热度和相关新闻强度，真实版本会接入行业景气度与竞争格局数据。",
    },
    {
      key: "fundamentals",
      label: "公司基本盘",
      score: clamp(Math.round((stock.valuation + scores.sentimentScore) / 2)),
      weight: 22,
      summary: "当前使用样例公司质量输入，真实版本会接入财报、现金流、盈利预测和公告。",
    },
    {
      key: "valuation",
      label: "估值分析",
      score: scores.valuationScore,
      weight: 16,
      summary: "当前使用样例估值分，真实版本会接入 PE、PB、PS、股息率和行业分位数。",
    },
    {
      key: "technical",
      label: "技术分析",
      score: scores.technicalScore,
      weight: 14,
      summary: "当前使用样例走势，真实版本会接入均线、成交量、波动率和趋势强度。",
    },
    {
      key: "sentiment",
      label: "市场情绪",
      score: scores.sentimentScore,
      weight: 10,
      summary:
        "当前使用样例新闻情绪，并融合已关联新闻、公告和公开言论的信息流影响；真实版本会接入授权新闻、社交媒体和资金情绪。",
    },
  ];
}

function buildAnalysisProcess({ stock, scores, factorBreakdown, scenarioAnalysis, informationFlowImpact, portfolioContext, sourceContext, macroContext, confidenceScore }) {
  const sourceRefs = Array.isArray(sourceContext?.sourceRefs) ? sourceContext.sourceRefs : [];
  const normalizedMacro = normalizeMacroContext(macroContext);
  const sourceTypes = new Set(sourceRefs.map((ref) => ref.type).filter(Boolean));
  const missingSources = [
    normalizedMacro ? "" : "宏观数据",
    sourceTypes.has("news") ? "" : "新闻",
    sourceTypes.has("filing") ? "" : "公告",
    sourceTypes.has("statement") ? "" : "公开言论",
  ].filter(Boolean);
  const factorByKey = Object.fromEntries(factorBreakdown.map((factor) => [factor.key, factor]));
  const evidenceCount = Math.max(0, sourceRefs.length);
  const agent = (role, label, factorKey, conclusion) => ({
    role,
    label,
    status: factorByKey[factorKey] ? "ready-with-sample-evidence" : "missing-factor",
    conclusion,
    confidence: factorByKey[factorKey]?.score || 0,
    evidenceCount:
      factorKey === "macro"
        ? normalizedMacro?.indicatorCount || 0
        : factorKey === "sentiment"
          ? evidenceCount
          : Math.max(1, Math.round(evidenceCount / 2)),
  });
  const bullCase = scenarioAnalysis.cases.find((item) => item.key === "bull");
  const bearCase = scenarioAnalysis.cases.find((item) => item.key === "bear");

  return {
    version: "multi-agent-analysis-v1",
    mode: "rule-based-reference-no-live-model",
    agents: [
      agent(
        "macro",
        "宏观分析师",
        "macro",
        normalizedMacro
          ? `宏观输入显示 ${normalizedMacro.summary}`
          : "宏观真实 provider 未接入，当前只保留低置信参考。",
      ),
      agent(
        "industry",
        "行业分析师",
        "industry",
        `行业与信息热度综合分为 ${factorByKey.industry?.score || 0}/100，仍需真实行业景气度确认。`,
      ),
      agent(
        "fundamentals",
        "基本面分析师",
        "fundamentals",
        `公司基本盘参考分为 ${factorByKey.fundamentals?.score || 0}/100，真实版本需接入财报和公告。`,
      ),
      agent(
        "technical",
        "技术分析师",
        "technical",
        `技术面参考分为 ${scores.technicalScore}/100，需结合真实行情走势和成交量验证。`,
      ),
      agent(
        "sentiment",
        "情绪新闻分析师",
        "sentiment",
        informationFlowImpact.sourceCount > 0
          ? informationFlowImpact.summary
          : "尚未获得可关联的真实新闻、公告或公开言论，情绪结论保持中性。",
      ),
    ],
    debate: {
      bull: {
        label: "多头研究员",
        thesis: bullCase?.summary || "上行情景需要更多真实催化验证。",
        probability: bullCase?.probability || 0,
      },
      bear: {
        label: "空头研究员",
        thesis: bearCase?.summary || "下行情景主要来自数据缺失、催化不足和风险偏好回落。",
        probability: bearCase?.probability || 0,
      },
    },
    synthesis: {
      manager: `研究经理综合 ${factorBreakdown.length} 个因子，当前总体置信度 ${confidenceScore}/100。`,
      riskReview:
        stock.downside >= 45
          ? `风控复核提示下跌参考概率 ${stock.downside}%，应优先控制仓位和止损纪律。`
          : "风控复核认为仍需保留止损边界，不能把模型概率理解成收益保证。",
      portfolioReview:
        portfolioContext.source === "backend-saved"
          ? `组合复核已读取 ${portfolioContext.filledFields}/5 项持仓字段，并纳入风险边界。`
          : "未提供持仓时，只输出通用风险提示；填写买入价、数量和最大亏损后可增强复核。",
    },
    evidenceCoverage: {
      readySourceCount: [
        normalizedMacro,
        sourceTypes.has("news"),
        sourceTypes.has("filing"),
        sourceTypes.has("statement"),
      ].filter(Boolean).length,
      missingSourceCount: missingSources.length,
      missingSources,
    },
    confidence: confidenceScore,
    disclaimer: "多智能体分析过程仅解释模型参考概率，不构成投资建议、交易指令或收益承诺。",
  };
}

function buildInputCoverage(macroContext) {
  return {
    macro: macroContext?.status === "ok" ? "fixture-linked" : "sample",
    industry: "sample",
    fundamentals: "sample",
    valuation: "sample",
    technical: "sample",
    sentiment: "sample",
    news: "sample",
    portfolio: "not_required",
  };
}

export function createMockAiService({ env = process.env } = {}) {
  let aiProviderAdapter = createAiProviderAdapter({ env });

  return {
    id: serviceStatus.id,

    status() {
      if (aiProviderAdapter.canCallLiveModel) {
        return {
          ...serviceStatus,
          id: "real-ai-analysis",
          name: "真实 AI 模型服务",
          mode: "real-provider",
          status: "ready-for-local-smoke",
          model: aiProviderAdapter.selectedModel,
          providerAdapter: aiProviderAdapter,
          disclaimer:
            "当前已配置本机真实 AI 模型 runtime；输出只作为模型参考概率和研究辅助，不构成投资建议、交易指令或收益承诺。",
        };
      }
      return {
        ...serviceStatus,
        providerAdapter: aiProviderAdapter,
      };
    },

    providerAdapterStatus() {
      return aiProviderAdapter;
    },

    reloadProviderAdapter(nextEnv = process.env) {
      aiProviderAdapter = createAiProviderAdapter({ env: nextEnv });
      return aiProviderAdapter;
    },

    async generateLiveAnalysis({ stock, riskProfile, sourceContext, macroContext, portfolioEntry }) {
      const result = await aiProviderAdapter.generateStructuredAnalysis({
        stock,
        riskProfile: normalizeRiskProfile(riskProfile),
        sourceContext,
        macroContext,
        portfolioEntry,
      });
      if (result.status !== "ok") {
        const error = new Error(result.error?.message || "真实 AI 模型未返回可展示分析。");
        error.code = result.error?.code || "REAL_AI_MODEL_EMPTY";
        error.providerRelay = result.providerRelay || null;
        throw error;
      }
      return {
        ...result.analysis,
        providerRelay: result.providerRelay || null,
      };
    },

    generateAnalysis({ stock, riskProfile, sourceContext, macroContext, portfolioEntry }) {
      const normalizedRiskProfile = normalizeRiskProfile(riskProfile);
      const adjustment = riskAdjustments[normalizedRiskProfile];
      const informationFlowImpact = buildInformationFlowImpact(sourceContext);
      const portfolioContext = buildPortfolioContext(stock, portfolioEntry);
      const upsideProbability = clamp(
        stock.upside +
          adjustment.upside +
          informationFlowImpact.probabilityAdjustment +
          portfolioContext.upsideAdjustment,
      );
      const scores = {
        sentimentScore: clamp(
          stock.sentiment +
            adjustment.sentiment +
            informationFlowImpact.sentimentAdjustment +
            portfolioContext.sentimentAdjustment,
        ),
        valuationScore: clamp(stock.valuation + adjustment.valuation),
        technicalScore: clamp(stock.technical + adjustment.technical + portfolioContext.technicalAdjustment),
      };
      const factorBreakdown = buildFactorBreakdown(stock, scores, macroContext);
      const confidenceScore = clamp(
        Math.round(
          factorBreakdown.reduce((total, factor) => total + factor.score * (factor.weight / 100), 0),
        ) + informationFlowImpact.confidenceAdjustment,
      );
      const scenarioAnalysis = buildScenarioAnalysis({
        stock,
        riskProfile: normalizedRiskProfile,
        upsideProbability,
        confidenceScore,
      });
      const analysisProcess = buildAnalysisProcess({
        stock,
        scores,
        factorBreakdown,
        scenarioAnalysis,
        informationFlowImpact,
        portfolioContext,
        sourceContext,
        macroContext,
        confidenceScore,
      });

      return {
        symbol: stock.code,
        name: stock.name,
        market: stock.market,
        riskProfile: normalizedRiskProfile,
        modelReference: true,
        upsideProbability,
        downsideProbability: 100 - upsideProbability,
        sentimentScore: scores.sentimentScore,
        valuationScore: scores.valuationScore,
        technicalScore: scores.technicalScore,
        confidenceScore,
        scenarioAnalysis,
        actionReference: [stock.action, ...portfolioContext.actionNotes].filter(Boolean).join(" "),
        tradePlan: buildTradePlan({
          stock,
          riskProfile: normalizedRiskProfile,
          upsideProbability,
          scores,
        }),
        reasons:
          [
            ...(informationFlowImpact.sourceCount > 0 ? [informationFlowImpact.summary] : []),
            ...portfolioContext.reasons,
            ...stock.reasons,
          ],
        risks: [...stock.risks, ...portfolioContext.risks],
        history: stock.history,
        historySource: stock.historySource,
        factorBreakdown,
        analysisProcess,
        inputCoverage: {
          ...buildInputCoverage(macroContext),
          portfolio: portfolioContext.inputCoverage,
        },
        informationFlowImpact,
        macroContext: normalizeMacroContext(macroContext),
        portfolioContext,
        analysisService: {
          id: serviceStatus.id,
          mode: serviceStatus.mode,
          model: serviceStatus.model,
        },
        warnings: [
          "当前为样例规则模型，概率仅用于产品流程验证。",
          "宏观经济输入来自样例 fixture，仅用于验证利率、汇率、通胀和政策事件的分析链路。",
          "信息流影响来自样例来源，仅用于验证来源归因和解释链路。",
          "真实版本需要接入实时行情、新闻、公告、财报、宏观和情绪数据后再生成分析。",
        ],
        generatedAt: new Date().toISOString(),
        disclaimer: "模型参考，不构成投资建议或收益承诺。",
      };
    },
  };
}
