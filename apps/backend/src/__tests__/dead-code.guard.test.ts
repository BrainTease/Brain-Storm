import * as fs from 'fs';
import * as path from 'path';

/**
 * Regression guard for issue #1486.
 *
 * `src/common/utils/endpoint-audit.ts` was dead code: never imported anywhere
 * and not re-exported from the utils barrel. These assertions keep it from
 * creeping back in.
 */
describe('Dead-code removal guard (#1486)', () => {
  const utilsDir = path.resolve(__dirname, '..', 'common', 'utils');

  it('does not ship the removed endpoint-audit utility', () => {
    const removed = path.join(utilsDir, 'endpoint-audit.ts');
    expect(fs.existsSync(removed)).toBe(false);
  });

  it('does not re-export the removed utility from the utils barrel', () => {
    const barrel = fs.readFileSync(path.join(utilsDir, 'index.ts'), 'utf-8');
    expect(barrel).not.toMatch(/endpoint-audit/);
  });
});
