import { createNotificationProviderAdapter } from "./notification-provider-adapter.mjs";

const serviceStatus = {
  id: "mock-notification-delivery",
  name: "Mock 通知投递服务",
  mode: "sample",
  status: "ready",
  deliveryMode: "outbox-only",
  supportedChannels: ["inApp", "email", "sms", "wechat", "telegram"],
  capabilities: [
    "outboxQueue",
    "readReceipt",
    "multiChannelRules",
    "deliveryAttempts",
    "retryQueue",
    "channelDeliveryStatus",
  ],
  disclaimer: "当前为样例通知投递服务，只写入后端 outbox，不代表真实外部推送已送达。",
};

const channelLabels = {
  inApp: "网页内提醒",
  email: "邮件提醒",
  sms: "短信提醒",
  wechat: "微信提醒",
  telegram: "Telegram 提醒",
};

const duplicateWindowMs = 15 * 60 * 1000;

function createNotificationId() {
  return `notification-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createDeliveryAttemptId() {
  return `delivery-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeChannels(channels) {
  const source = Array.isArray(channels) ? channels : [];
  return [
    ...new Set(
      source.filter((channel) => serviceStatus.supportedChannels.includes(channel)),
    ),
  ];
}

function simulateChannelDelivery(channel) {
  if (channel === "inApp") {
    return {
      status: "delivered",
      message: "网页内提醒已写入样例通知中心。",
      errorCode: "",
    };
  }

  return {
    status: "failed",
    message: `${channelLabels[channel] || channel} 外部投递连接器尚未配置。`,
    errorCode: "CONNECTOR_NOT_CONFIGURED",
  };
}

function buildDeliveryPatch(notification, result, attemptedAt) {
  const attempts = Array.isArray(notification.deliveryAttempts)
    ? notification.deliveryAttempts
    : [];
  const attempt = {
    id: createDeliveryAttemptId(),
    channel: notification.channel,
    status: result.status,
    attemptedAt,
    message: result.message,
    errorCode: result.errorCode,
  };
  const nextRetryAt =
    result.status === "failed"
      ? new Date(Date.parse(attemptedAt) + 5 * 60 * 1000).toISOString()
      : "";

  return {
    deliveryStatus: result.status,
    attemptCount: attempts.length + 1,
    lastAttemptAt: attemptedAt,
    deliveredAt: result.status === "delivered" ? attemptedAt : notification.deliveredAt || "",
    nextRetryAt,
    deliveryError: result.status === "failed" ? result.message : "",
    deliveryAttempts: [attempt, ...attempts].slice(0, 10),
  };
}

function isRecentDuplicate(notification, { result, channel, now }) {
  if (!notification || notification.ruleId !== result.ruleId || notification.channel !== channel) {
    return false;
  }
  if (String(notification.observedValue) !== String(result.observedValue)) return false;
  if (String(notification.threshold) !== String(result.threshold)) return false;
  const createdAt = Date.parse(notification.createdAt || "");
  return Number.isFinite(createdAt) && now - createdAt < duplicateWindowMs;
}

export function createMockNotificationService({ env = process.env } = {}) {
  const providerAdapter = createNotificationProviderAdapter({ env });

  return {
    id: serviceStatus.id,

    status() {
      return {
        ...serviceStatus,
        channelLabels: { ...channelLabels },
        providerAdapter,
      };
    },

    providerAdapterStatus() {
      return providerAdapter;
    },

    attemptDelivery({ repository, user, notificationId, reason = "manual" }) {
      const notification = repository.findNotification(user.id, notificationId);
      if (!notification) return null;
      const attemptedAt = new Date().toISOString();
      const result = simulateChannelDelivery(notification.channel);
      const updated = repository.updateNotification(
        user.id,
        notificationId,
        buildDeliveryPatch(notification, result, attemptedAt),
      );
      repository.recordAudit({
        user,
        eventType: "notification.delivery.attempt",
        severity: result.status === "failed" ? "warning" : "info",
        message: "Notification delivery attempted.",
        metadata: {
          id: notificationId,
          channel: notification.channel,
          deliveryStatus: result.status,
          attemptCount: updated?.attemptCount || 0,
          reason,
          errorCode: result.errorCode,
        },
      });
      return updated;
    },

    enqueueReminderNotifications({ repository, user, result, channels }) {
      const normalizedChannels = normalizeChannels(channels);
      const queuedAt = new Date().toISOString();
      const now = Date.parse(queuedAt);
      return normalizedChannels.map((channel) => {
        const duplicate = repository
          .listNotifications(user.id, 200)
          .find((notification) => isRecentDuplicate(notification, { result, channel, now }));
        if (duplicate) {
          repository.recordAudit({
            user,
            eventType: "notification.duplicate_suppressed",
            severity: "info",
            message: "Duplicate reminder notification suppressed within the sample cooldown window.",
            metadata: {
              id: duplicate.id,
              ruleId: result.ruleId,
              channel,
              duplicateWindowSeconds: duplicateWindowMs / 1000,
            },
          });
          return {
            ...duplicate,
            duplicateSuppressed: true,
            duplicateWindowSeconds: duplicateWindowMs / 1000,
          };
        }
        const saved = repository.saveNotification({
          id: createNotificationId(),
          userId: user.id,
          ruleId: result.ruleId,
          code: result.code,
          type: result.type,
          channel,
          channelLabel: channelLabels[channel] || channel,
          deliveryServiceId: serviceStatus.id,
          deliveryMode: serviceStatus.deliveryMode,
          status: "queued",
          deliveryStatus: "queued",
          attemptCount: 0,
          deliveryAttempts: [],
          lastAttemptAt: "",
          deliveredAt: "",
          nextRetryAt: "",
          deliveryError: "",
          title: result.type === "importantNews" ? "重大新闻提醒触发" : "价格提醒触发",
          body: result.reason,
          observedValue: result.observedValue,
          threshold: result.threshold,
          createdAt: queuedAt,
        });
        return this.attemptDelivery({
          repository,
          user,
          notificationId: saved.id,
          reason: "triggered-reminder",
        });
      });
    },
  };
}
