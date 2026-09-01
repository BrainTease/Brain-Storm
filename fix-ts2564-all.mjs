import { readFileSync, writeFileSync } from 'fs';

const files = [
  'apps/backend/src/admin/admin.dto.ts',
  'apps/backend/src/analytics/dto/instructor-analytics.dto.ts',
  'apps/backend/src/analytics/platform-analytics.controller.ts',
  'apps/backend/src/auth/auth.controller.ts',
  'apps/backend/src/bookings/bookings.controller.ts',
  'apps/backend/src/certificates/dto/issue-certificate.dto.ts',
  'apps/backend/src/cohorts/dto/session.dto.ts',
  'apps/backend/src/common/validation/validation.schemas.ts',
  'apps/backend/src/common/validation/validation.service.spec.ts',
  'apps/backend/src/coupons/dto/index.ts',
  'apps/backend/src/courses/dto/create-course.dto.ts',
  'apps/backend/src/courses/dto/create-lesson.dto.ts',
  'apps/backend/src/courses/dto/create-module.dto.ts',
  'apps/backend/src/courses/dto/create-review.dto.ts',
  'apps/backend/src/courses/dto/schedule-course.dto.ts',
  'apps/backend/src/email/email.service.ts',
  'apps/backend/src/forums/dto/create-post.dto.ts',
  'apps/backend/src/forums/dto/create-reply.dto.ts',
  'apps/backend/src/governance/dto/governance-proposal.dto.ts',
  'apps/backend/src/grants/dto/grant.dto.ts',
  'apps/backend/src/jobs/dto/index.ts',
  'apps/backend/src/jobs/job.entity.ts',
  'apps/backend/src/leaderboard/redis-leaderboard.service.ts',
  'apps/backend/src/media/media.entity.ts',
  'apps/backend/src/moderation/dto/moderation.dto.ts',
  'apps/backend/src/notifications/notifications.controller.ts',
  'apps/backend/src/notifications/notifications.gateway.ts',
  'apps/backend/src/organizations/dto/organization.dto.ts',
  'apps/backend/src/payments/payments.controller.ts',
  'apps/backend/src/progress/dto/record-progress.dto.ts',
  'apps/backend/src/search/search.controller.ts',
  'apps/backend/src/webhooks/webhooks.controller.ts',
  'apps/backend/src/ws-gateway/ws-gateway.gateway.ts',
];

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match property declarations without initializers and without ! that are in a class body
    const propMatch = line.match(/^(\s*)(\w+)(\?)?:(.*?)(?:;\s*\/\/.*|;)$/);

    if (propMatch) {
      const [, indent, propName, optional, typePart] = propMatch;

      // Skip if already has ! or ? (optional)
      if (optional || line.includes('!:')) continue;

      // Skip if it's a method (has parens) or has an initializer (=)
      if (typePart.includes('(') || typePart.includes('=') || typePart.includes('=>')) continue;

      // Skip static methods/properties, decorators
      if (line.trim().startsWith('static ') || line.trim().startsWith('@')) continue;

      // Check if we're inside a class (look backwards for class keyword)
      let inClass = false;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('class ')) {
          inClass = true;
          break;
        }
        if (lines[j].includes('interface ') || lines[j].includes('type ')) {
          break;
        }
      }

      if (!inClass) continue;

      // Add ! after property name
      lines[i] = `${indent}${propName}!:${typePart};`;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

let totalFixed = 0;
for (const file of files) {
  if (fixFile(file)) totalFixed++;
}

console.log(`Total files fixed: ${totalFixed}`);
