export const QUEUES = {
  EMAIL: 'email',
  SMS: 'sms',
  NOTIFICATION: 'notification',
  MEDIA: 'media',
  VIDEO: 'video',
  IMAGE: 'image',
  PDF: 'pdf',
  PAYMENT: 'payment',
  SEARCH: 'search',
  RECOMMENDATION: 'recommendation',
  MODERATION: 'moderation',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ─── Job type constants per queue ─────────────────────────────────────────────

export const EMAIL_JOBS = {
  SEND: 'send-email',
  SEND_BULK: 'send-bulk-email',
} as const;

export const SMS_JOBS = {
  SEND: 'send-sms',
  SEND_OTP: 'send-otp',
} as const;

export const NOTIFICATION_JOBS = {
  SEND: 'send-notification',
  SEND_PUSH: 'send-push',
} as const;

export const MEDIA_JOBS = {
  PROCESS: 'process-media',
  DELETE: 'delete-media',
  MALWARE_SCAN: 'malware-scan',
} as const;

export const VIDEO_JOBS = {
  TRANSCODE: 'transcode',
  THUMBNAIL: 'generate-thumbnail',
  METADATA: 'extract-metadata',
  MALWARE_SCAN: 'malware-scan',
} as const;

export const IMAGE_JOBS = {
  RESIZE: 'resize',
  OPTIMIZE: 'optimize',
  THUMBNAIL: 'generate-thumbnail',
  MALWARE_SCAN: 'malware-scan',
} as const;

export const PDF_JOBS = {
  GENERATE_INVOICE: 'generate-invoice',
  GENERATE_COMP_CARD: 'generate-comp-card',
} as const;

export const PAYMENT_JOBS = {
  PROCESS_WEBHOOK: 'process-webhook',
  RETRY_FAILED: 'retry-failed',
  SEND_RECEIPT: 'send-receipt',
} as const;

export const SEARCH_JOBS = {
  INDEX_CASTING: 'index-casting',
  INDEX_TALENT: 'index-talent',
  REMOVE_CASTING: 'remove-casting',
  REMOVE_TALENT: 'remove-talent',
} as const;

export const RECOMMENDATION_JOBS = {
  RECOMPUTE_FOR_TALENT: 'recompute-for-talent',
  RECOMPUTE_FOR_CASTING: 'recompute-for-casting',
} as const;

export const MODERATION_JOBS = {
  AUTO_REVIEW: 'auto-review',
  ESCALATE: 'escalate',
  NOTIFY_REPORTER: 'notify-reporter',
} as const;

export const ANALYTICS_JOBS = {
  TRACK_EVENT: 'track-event',
  AGGREGATE_DAILY: 'aggregate-daily',
} as const;
