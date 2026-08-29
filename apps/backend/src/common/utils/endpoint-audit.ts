/**
 * Endpoint Audit Utility
 *
 * This utility helps identify potentially unused endpoints by:
 * 1. Tracking endpoint usage metrics
 * 2. Logging endpoint references in codebase
 * 3. Providing analytics on endpoint utilization
 *
 * Usage:
 * - Enable audit logging in production
 * - Review metrics in admin dashboard
 * - Cross-reference with code search results
 * - Mark endpoints for deprecation
 */

export interface EndpointMetrics {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  callCount: number;
  lastCalledAt?: Date;
  uniqueCallers: Set<string>;
  avgResponseTime?: number;
}

export interface AuditResult {
  totalEndpoints: number;
  unusedEndpoints: Array<{
    path: string;
    method: string;
    reason: string;
    recommendation: string;
  }>;
  deprecatedEndpoints: EndpointMetrics[];
  lowUsageEndpoints: EndpointMetrics[];
}

/**
 * Identifies endpoints that may be unused based on:
 * - Zero or very low call counts
 * - No recent usage
 * - Limited unique callers
 */
export function identifyUnusedEndpoints(
  metrics: Map<string, EndpointMetrics>,
  options: {
    minCallThreshold?: number;
    daysInactive?: number;
    minUniqueCallers?: number;
  } = {}
): AuditResult {
  const {
    minCallThreshold = 0,
    daysInactive = 90,
    minUniqueCallers = 1,
  } = options;

  const now = new Date();
  const inactiveDays = new Date(now.getTime() - daysInactive * 24 * 60 * 60 * 1000);

  const unused: AuditResult['unusedEndpoints'] = [];
  const deprecated: EndpointMetrics[] = [];
  const lowUsage: EndpointMetrics[] = [];

  metrics.forEach((metric) => {
    const callCount = metric.callCount || 0;
    const uniqueCallers = metric.uniqueCallers?.size || 0;
    const lastUsed = metric.lastCalledAt;

    if (callCount <= minCallThreshold) {
      unused.push({
        path: metric.path,
        method: metric.method,
        reason: 'Zero or minimal call count',
        recommendation: 'Safe to remove if verified with code search',
      });
    }

    if (lastUsed && lastUsed < inactiveDays) {
      unused.push({
        path: metric.path,
        method: metric.method,
        reason: `No activity in ${daysInactive} days`,
        recommendation: 'Consider deprecation warning before removal',
      });
    }

    if (uniqueCallers < minUniqueCallers) {
      unused.push({
        path: metric.path,
        method: metric.method,
        reason: `Used by less than ${minUniqueCallers} unique caller(s)`,
        recommendation: 'Check if single caller can be updated',
      });
    }

    if (callCount > 0 && callCount < 100) {
      lowUsage.push(metric);
    }

    if (callCount > 0 && (!lastUsed || lastUsed < inactiveDays)) {
      deprecated.push(metric);
    }
  });

  return {
    totalEndpoints: metrics.size,
    unusedEndpoints: Array.from(new Map(unused.map(u => [`${u.method}:${u.path}`, u])).values()),
    deprecatedEndpoints: deprecated,
    lowUsageEndpoints: lowUsage.filter(m => !deprecated.includes(m)),
  };
}

/**
 * Generates a report of endpoint usage for review
 */
export function generateEndpointReport(audit: AuditResult): string {
  const sections: string[] = [
    `# Endpoint Audit Report`,
    `## Summary`,
    `- Total Endpoints: ${audit.totalEndpoints}`,
    `- Potentially Unused: ${audit.unusedEndpoints.length}`,
    `- Deprecated: ${audit.deprecatedEndpoints.length}`,
    `- Low Usage: ${audit.lowUsageEndpoints.length}`,
    ``,
  ];

  if (audit.unusedEndpoints.length > 0) {
    sections.push(`## Unused Endpoints (Safe for Removal)`);
    audit.unusedEndpoints.forEach(ep => {
      sections.push(`- **${ep.method} ${ep.path}**`);
      sections.push(`  - Reason: ${ep.reason}`);
      sections.push(`  - Action: ${ep.recommendation}`);
    });
    sections.push(``);
  }

  if (audit.deprecatedEndpoints.length > 0) {
    sections.push(`## Deprecated Endpoints (Consider Removal)`);
    audit.deprecatedEndpoints.forEach(ep => {
      sections.push(`- **${ep.method} ${ep.path}**`);
      sections.push(`  - Last used: ${ep.lastCalledAt?.toISOString() ?? 'Unknown'}`);
      sections.push(`  - Total calls: ${ep.callCount}`);
      sections.push(`  - Unique callers: ${ep.uniqueCallers?.size ?? 0}`);
    });
    sections.push(``);
  }

  if (audit.lowUsageEndpoints.length > 0) {
    sections.push(`## Low Usage Endpoints (Monitor)`);
    audit.lowUsageEndpoints.forEach(ep => {
      sections.push(`- **${ep.method} ${ep.path}**`);
      sections.push(`  - Total calls: ${ep.callCount}`);
      sections.push(`  - Unique callers: ${ep.uniqueCallers?.size ?? 0}`);
    });
  }

  return sections.join('\n');
}

/**
 * Checklist for endpoint removal
 */
export const ENDPOINT_REMOVAL_CHECKLIST = `
# Endpoint Removal Checklist

Before removing any endpoint, complete all items:

## Code Audit
- [ ] Grep search confirms no code references to endpoint path
- [ ] No middleware or interceptors specifically handle this endpoint
- [ ] No related entity migrations required
- [ ] No cache keys depend on this endpoint

## Testing
- [ ] All tests referencing endpoint removed
- [ ] Integration tests pass
- [ ] Contract tests updated if affected

## Dependencies
- [ ] Frontend app doesn't call endpoint
- [ ] Mobile SDK doesn't use endpoint
- [ ] Admin dashboard doesn't depend on it
- [ ] Third-party integrations don't reference it

## Documentation
- [ ] OpenAPI/Swagger definitions updated
- [ ] API documentation updated
- [ ] CHANGELOG entry added
- [ ] Migration guide created if needed

## Deployment
- [ ] Endpoint marked as deprecated in previous release
- [ ] Proper deprecation warning shown to users (if applicable)
- [ ] Client libraries updated
- [ ] Backward compatibility preserved for essential clients
`;
