import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Package Boundaries ADR', () => {
  const adrDir = path.join(process.cwd(), 'docs', 'adr');
  const rootReadmePath = path.join(process.cwd(), 'README.md');
  const packages = [
    'packages/api',
    'packages/app',
    'packages/sdk',
    'packages/types',
    'packages/mobile',
    'packages/mobile-app',
  ];

  const getAdrContent = (): string => {
    const files = fs.readdirSync(adrDir);
    const pattern = /package|monorepo|boundary|architecture/i;
    const boundariesAdr = files.find((f) => pattern.test(f) && f.endsWith('.md'));
    return fs.readFileSync(path.join(adrDir, boundariesAdr || ''), 'utf-8');
  };

  describe('ADR File Existence', () => {
    it('should have adr directory and document', () => {
      expect(fs.existsSync(adrDir)).toBe(true);
      const files = fs.readdirSync(adrDir);
      const pattern = /package|monorepo|boundary|architecture/i;
      expect(files.some((f) => pattern.test(f) && f.endsWith('.md'))).toBe(true);
    });

    it('should be linked from root README', () => {
      const content = fs.readFileSync(rootReadmePath, 'utf-8');
      expect(content).toMatch(/adr|architecture|decision/i);
    });
  });

  describe('ADR Content', () => {
    let adrContent: string;

    beforeAll(() => {
      adrContent = getAdrContent();
    });

    it('should follow ADR format with status and context', () => {
      expect(adrContent).toMatch(/status|accepted|proposed/i);
      expect(adrContent).toMatch(/context|decision|rationale/i);
    });

    it('should describe package responsibilities', () => {
      packages.forEach((pkg) => {
        const pkgName = pkg.split('/')[1];
        expect(adrContent).toMatch(new RegExp(pkgName, 'i'));
      });
    });

    it('should define import rules and consolidation', () => {
      expect(adrContent).toMatch(/import.*rule|boundary|constraint|depend/i);
      expect(adrContent).toMatch(/deprecat|merge|consolidat|mobile-app/i);
    });

    it('should document consequences and structure', () => {
      expect(adrContent).toMatch(/consequence|tradeoff|implication/i);
      const sections = adrContent.match(/^#{2}\s+\w+/gm) || [];
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Package Structure and Lint Config', () => {
    it('should have all packages with package.json', () => {
      packages.forEach((pkg) => {
        const pkgPath = path.join(process.cwd(), pkg);
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        expect(fs.existsSync(pkgJsonPath)).toBe(true);
      });
    });

    it('should have boundary enforcement configured', () => {
      const eslintPath = path.join(process.cwd(), '.eslintrc.json');
      const nxPath = path.join(process.cwd(), 'nx.json');
      const exists = fs.existsSync(eslintPath) || fs.existsSync(nxPath);
      expect(exists).toBe(true);
      if (fs.existsSync(eslintPath)) {
        const config = fs.readFileSync(eslintPath, 'utf-8');
        expect(config).toMatch(/boundary|import.*constraint/i);
      }
    });
  });
});
