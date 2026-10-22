import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Package Boundaries ADR', () => {
  // The repository root is five levels above apps/backend/src/__tests__/docs-validation;
  // resolving it from the test file keeps the assertions independent of the directory
  // jest is run from.
  const repoRoot = path.resolve(__dirname, '../../../../..');
  const adrDir = path.join(repoRoot, 'docs', 'adr');
  const rootReadmePath = path.join(repoRoot, 'README.md');
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
    // Prefer the monorepo (npm package) boundaries ADR; fall back to any match.
    const boundariesAdr =
      files.find((f) => /monorepo.*package|package.*boundar/i.test(f)) ||
      files.find((f) => pattern.test(f) && f.endsWith('.md'));
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
        const pkgPath = path.join(repoRoot, pkg);
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        expect(fs.existsSync(pkgJsonPath)).toBe(true);
      });
    });

    it('should have boundary enforcement configured', () => {
      const eslintPaths = [
        path.join(repoRoot, '.eslintrc.json'),
        path.join(repoRoot, '.eslintrc.js'),
        path.join(repoRoot, '.eslintrc.cjs'),
      ];
      const nxPath = path.join(repoRoot, 'nx.json');
      const eslintPath = eslintPaths.find((p) => fs.existsSync(p));
      const exists = Boolean(eslintPath) || fs.existsSync(nxPath);
      expect(exists).toBe(true);
      if (eslintPath) {
        const config = fs.readFileSync(eslintPath, 'utf-8');
        expect(config).toMatch(/boundary|import.*constraint/i);
      }
    });
  });
});
