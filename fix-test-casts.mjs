import { readFileSync, writeFileSync } from 'fs';

const filePath =
  '/Users/admin/Desktop/WAVE 7/YATCHAM/Brain-Storm/apps/backend/src/users/users.service.integration-spec.ts';
let content = readFileSync(filePath, 'utf8');

// Add as TestUserInput to all service.create({ ... }) calls
content = content.replace(/await service\.create\(\{([\s\S]*?)\}\);/g, (match, p1) => {
  // Check if already has as TestUserInput
  if (match.includes('as TestUserInput')) return match;
  return match.replace('})', '} as TestUserInput)');
});

writeFileSync(filePath, content);
console.log('Fixed all service.create calls');
