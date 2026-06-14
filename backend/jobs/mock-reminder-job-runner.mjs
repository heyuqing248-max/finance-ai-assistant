function newsImportanceValue(newsItem) {
  if (Number.isFinite(Number(newsItem.importance))) return Number(newsItem.importance);
  if (typeof newsItem.impact === "string") {
    const match = newsItem.impact.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  return 0;
}

function buildJobRun(repository, { user, type, status, startedAt, finishedAt, summary }) {
  const jobRun = {
    id: `job-${Date.now()}-${repository.listJobRuns(user?.id || "").length + 1}`,
    userId: user?.id || null,
    type,
    status,
    startedAt,
    finishedAt,
    summary,
  };
  return repository.saveJobRun(jobRun);
}

export function createMockReminderJobRunner({ dataProvider, notificationService }) {
  const supportedJobs = ["reminderEvaluation"];

  function findStock(code) {
    return dataProvider.findStock(code);
  }

  function evaluateReminderRule(rule) {
    const stock = findStock(rule.code);
    if (!stock) {
      return {
        ruleId: rule.id,
        code: rule.code,
        type: rule.type,
        triggered: false,
        reason: "股票样例不存在，无法评估。",
      };
    }

    const threshold = Number(rule.threshold);
    if (!Number.isFinite(threshold)) {
      return {
        ruleId: rule.id,
        code: stock.code,
        type: rule.type,
        triggered: false,
        reason: "触发阈值无效。",
      };
    }

    if (rule.type === "priceAbove") {
      const triggered = stock.samplePrice >= threshold;
      return {
        ruleId: rule.id,
        code: stock.code,
        type: rule.type,
        triggered,
        observedValue: stock.samplePrice,
        threshold,
        reason: triggered
          ? `样例价格 ${stock.samplePrice} 已高于或等于 ${threshold}。`
          : `样例价格 ${stock.samplePrice} 仍低于 ${threshold}。`,
      };
    }

    if (rule.type === "priceBelow") {
      const triggered = stock.samplePrice <= threshold;
      return {
        ruleId: rule.id,
        code: stock.code,
        type: rule.type,
        triggered,
        observedValue: stock.samplePrice,
        threshold,
        reason: triggered
          ? `样例价格 ${stock.samplePrice} 已低于或等于 ${threshold}。`
          : `样例价格 ${stock.samplePrice} 仍高于 ${threshold}。`,
      };
    }

    const relatedNews = dataProvider
      .getRelatedNews(stock)
      .map((newsItem) => ({ ...newsItem, importanceValue: newsImportanceValue(newsItem) }))
      .sort((first, second) => second.importanceValue - first.importanceValue);
    const topNews = relatedNews[0];
    const observedValue = topNews ? topNews.importanceValue : 0;
    const triggered = observedValue >= threshold;
    return {
      ruleId: rule.id,
      code: stock.code,
      type: rule.type,
      triggered,
      observedValue,
      threshold,
      newsTitle: topNews?.title || "",
      reason: triggered
        ? `关联新闻重要性 ${observedValue}/100 已达到 ${threshold}。`
        : `关联新闻最高重要性 ${observedValue}/100，未达到 ${threshold}。`,
    };
  }

  function evaluateReminderRulesForUser(repository, user) {
    const results = repository.listReminders(user.id).map((rule) => ({
      ...evaluateReminderRule(rule),
      channels: Array.isArray(rule.channels) ? rule.channels : [],
    }));
    const triggered = results.filter((result) => result.triggered);

    triggered.forEach((result) => {
      const channels = result.channels;
      const notifications = notificationService.enqueueReminderNotifications({
        repository,
        user,
        result,
        channels,
      });
      repository.recordAudit({
        user,
        eventType: "reminder.triggered",
        message: "Reminder rule triggered.",
        metadata: {
          ruleId: result.ruleId,
          code: result.code,
          type: result.type,
          observedValue: result.observedValue,
          threshold: result.threshold,
          notificationIds: notifications.map((notification) => notification.id),
          duplicateSuppressedCount: notifications.filter(
            (notification) => notification.duplicateSuppressed === true,
          ).length,
          deliveryServiceId: notificationService.id,
        },
      });
      result.notificationIds = notifications.map((notification) => notification.id);
      result.duplicateSuppressedCount = notifications.filter(
        (notification) => notification.duplicateSuppressed === true,
      ).length;
      result.deliveryServiceId = notificationService.id;
    });

    return {
      evaluatedAt: new Date().toISOString(),
      checked: results.length,
      triggeredCount: triggered.length,
      items: results,
    };
  }

  function runJob(repository, user, type = "reminderEvaluation") {
    if (!supportedJobs.includes(type)) {
      return {
        ok: false,
        error: {
          code: "UNSUPPORTED_JOB",
          message: "当前 mock 后端只支持提醒评估任务。",
        },
      };
    }

    const startedAt = new Date().toISOString();
    const result = evaluateReminderRulesForUser(repository, user);
    const finishedAt = new Date().toISOString();
    const jobRun = buildJobRun(repository, {
      user,
      type,
      status: "success",
      startedAt,
      finishedAt,
      summary: {
        checked: result.checked,
        triggeredCount: result.triggeredCount,
      },
    });
    repository.recordAudit({
      user,
      eventType: "job.run",
      message: "Backend job completed.",
      metadata: {
        jobRunId: jobRun.id,
        type,
        checked: result.checked,
        triggeredCount: result.triggeredCount,
      },
    });

    return { ok: true, jobRun, result };
  }

  return {
    id: "mock-reminder-job-runner",
    status() {
      return {
        id: "mock-reminder-job-runner",
        name: "Mock 提醒任务运行器",
        mode: "sample",
        status: "ready",
        executionMode: "manual-api",
        supportedJobs,
        duplicateSuppression: {
          notificationWindowSeconds: 900,
          scope: "user-rule-channel-observedValue-threshold",
        },
        capabilities: [
          "reminderEvaluation",
          "jobRunRecords",
          "auditEvents",
          "notificationOutbox",
          "duplicateNotificationSuppression",
        ],
        disclaimer:
          "当前为手动触发的样例任务运行器，不代表真实后台定时任务或系统推送已经部署。",
      };
    },
    supports(type) {
      return supportedJobs.includes(type);
    },
    evaluateReminderRule,
    evaluateReminderRulesForUser,
    runJob,
  };
}
