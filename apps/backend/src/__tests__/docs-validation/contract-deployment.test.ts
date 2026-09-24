import * as fs from 'fs';
import * as path from 'path';

describe('Soroban Contract Deployment Runbook', () => {
  const deploymentDocPath = path.join(process.cwd(), 'docs', 'contracts', 'deployment.md');
  const contractsDir = path.join(process.cwd(), 'contracts', 'shared', 'src');

  describe('Deployment Documentation Structure', () => {
    it('should have deployment runbook', () => {
      expect(fs.existsSync(deploymentDocPath)).toBe(true);
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/deploy.*step|step.*deploy|process/i);
      const sections = content.match(/^#{2}\s+\w+/gm) || [];
      expect(sections.length).toBeGreaterThanOrEqual(4);
    });

    it('should be linked from contract README', () => {
      const contractReadmePath = path.join(process.cwd(), 'contracts', 'shared', 'README.md');
      if (fs.existsSync(contractReadmePath)) {
        const content = fs.readFileSync(contractReadmePath, 'utf-8');
        expect(content).toMatch(/deployment|deploy/i);
      }
    });
  });

  describe('Network-Specific Documentation', () => {
    it('should document testnet and mainnet', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/testnet|soroban|futurenet/i);
      expect(content).toMatch(/mainnet|production|prod/i);
    });

    it('should include testnet configuration and IDs', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/contract.*id|id.*table|testnet.*id|futurenet/i);
      expect(content).toMatch(/endpoint|rpc|horizon|url/i);
    });
  });

  describe('Upgrade and Authorization Process', () => {
    it('should document upgrade authorization and multisig', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/upgrade|authoriz|multisig|permission|access/i);
      expect(content).toMatch(/multi-sig|signature.*require/i);
    });

    it('should include rollback and recovery procedures', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/rollback|revert|undo|restore|recovery/i);
    });

    it('should document version management and state', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/version|semantic.*version|upgrade.*path/i);
      const hasStateMigration = content.match(/state.*migrat|migrat.*state/i);
      if (hasStateMigration) {
        expect(content).toMatch(/data.*preserv|preserv.*data/i);
      }
    });
  });

  describe('Documentation Completeness', () => {
    it('should have structure and examples', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/^#{1,6}\s+\w/m);
      expect(content).toMatch(/contract.*structure|soroban|rust|wasm|binary/i);
      expect(content).toMatch(/```|code|command|stellar/i);
    });

    it('should document prerequisites and verification', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/prerequisite|require|install|setup/i);
      expect(content).toMatch(/verify|check|confirm|validate/i);
    });

    it('should reference upgrade.rs and related documentation', () => {
      const content = fs.readFileSync(deploymentDocPath, 'utf-8');
      expect(content).toMatch(/upgrade\.rs|upgrade.*module/i);
      expect(content).toMatch(/contract|soroban|stellar/i);
    });
  });

  describe('Contract Source Validation', () => {
    it('should have upgrade implementation', () => {
      const upgradePath = path.join(contractsDir, 'upgrade.rs');
      expect(fs.existsSync(upgradePath)).toBe(true);
      const content = fs.readFileSync(upgradePath, 'utf-8');
      expect(content).toMatch(/fn|upgrade|authorize/i);
    });
  });
});
