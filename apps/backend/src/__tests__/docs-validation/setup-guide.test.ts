import * as fs from 'fs';
import * as path from 'path';

describe('Setup Guide Documentation', () => {
  const setupGuidePath = path.join(process.cwd(), 'docs', 'contributing', 'setup.md');
  const contributingPath = path.join(process.cwd(), 'CONTRIBUTING.md');

  describe('File Existence', () => {
    it('should have setup guide at docs/contributing/setup.md', () => {
      expect(fs.existsSync(setupGuidePath)).toBe(true);
    });

    it('should be linked from CONTRIBUTING.md', () => {
      const contributingContent = fs.readFileSync(contributingPath, 'utf-8');
      expect(contributingContent).toContain('setup.md');
    });
  });

  describe('Setup Guide Content', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(setupGuidePath, 'utf-8');
    });

    it('should document frontend setup', () => {
      expect(content).toMatch(/frontend|apps\/app|node.*packages/i);
    });

    it('should document backend setup', () => {
      expect(content).toMatch(/backend|apps\/backend|nest|node.*engine/i);
    });

    it('should document contracts setup', () => {
      expect(content).toMatch(/contracts|soroban|rust.*toolchain|cargo/i);
    });

    it('should document docker services setup', () => {
      expect(content).toMatch(/docker|docker-compose|services/i);
    });

    it('should document required environment variables', () => {
      expect(content).toMatch(/env(ironment)?\s*(variables|vars)|\.env/i);
    });

    it('should include troubleshooting section', () => {
      expect(content).toMatch(/troubleshoot|common.*issues|faq/i);
    });

    it('should document Node engine requirements', () => {
      expect(content).toMatch(/node.*version|nodejs|engine/i);
    });

    it('should document Rust toolchain requirements', () => {
      expect(content).toMatch(/rust|rustup|toolchain/i);
    });
  });

  describe('Documentation Structure', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(setupGuidePath, 'utf-8');
    });

    it('should have markdown headings for organization', () => {
      expect(content).toMatch(/^#{1,6}\s+\w/m);
    });

    it('should have clear sections', () => {
      const sections = content.match(/^#{2}\s+\w+/gm);
      expect(sections?.length ?? 0).toBeGreaterThanOrEqual(3);
    });
  });
});
