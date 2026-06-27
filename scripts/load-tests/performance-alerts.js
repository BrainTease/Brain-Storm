/**
 * Performance Alerts Configuration
 * Defines alert thresholds and actions for load test metrics
 */

module.exports = {
  alerts: [
    {
      name: 'High Latency P95',
      metric: 'http_req_duration',
      percentile: 'p95',
      threshold: 500,
      unit: 'ms',
      severity: 'warning',
      action: 'notify',
    },
    {
      name: 'Critical Latency P99',
      metric: 'http_req_duration',
      percentile: 'p99',
      threshold: 1000,
      unit: 'ms',
      severity: 'critical',
      action: 'notify_and_create_issue',
    },
    {
      name: 'High Error Rate',
      metric: 'http_req_failed',
      threshold: 0.01,
      unit: 'rate',
      severity: 'warning',
      action: 'notify',
    },
    {
      name: 'Critical Error Rate',
      metric: 'http_req_failed',
      threshold: 0.05,
      unit: 'rate',
      severity: 'critical',
      action: 'notify_and_create_issue',
    },
    {
      name: 'Low Throughput',
      metric: 'http_reqs',
      threshold: 200,
      unit: 'rps',
      severity: 'warning',
      action: 'notify',
      comparison: 'less_than',
    },
  ],

  notificationChannels: {
    slack: {
      enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
    },
    github: {
      enabled: true,
      createIssue: true,
      labels: ['performance', 'load-testing'],
    },
    email: {
      enabled: process.env.ALERT_EMAIL ? true : false,
      recipients: process.env.ALERT_EMAIL?.split(',') || [],
    },
  },

  escalation: {
    enabled: true,
    levels: [
      {
        severity: 'warning',
        delay: 300000, // 5 minutes
        action: 'escalate_to_critical',
      },
      {
        severity: 'critical',
        delay: 0,
        action: 'immediate_notification',
      },
    ],
  },

  thresholds: {
    regression: 0.1, // 10% regression threshold
    warning: 0.05, // 5% warning threshold
  },
};
