import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Intentional Staleness Regression Test (Issue #1032)
 *
 * Verifies that the drift detection actually catches a deliberate mismatch
 * between a contract's public interface and the backend's invocation.
 */

const ROOT = path.resolve(__dirname, '../..');
const RPC_CLIENT = path.join(ROOT, 'apps/backend/src/stellar/soroban-rpc-client.service.ts');
const BACKUP_SUFFIX = '.drift-test-backup';

function backup(): string {
  const content = fs.readFileSync(RPC_CLIENT, 'utf-8');
  fs.writeFileSync(RPC_CLIENT + BACKUP_SUFFIX, content, 'utf-8');
  return content;
}

function restore(): void {
  const backupPath = RPC_CLIENT + BACKUP_SUFFIX;
  if (fs.existsSync(backupPath)) {
    const content = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(RPC_CLIENT, content, 'utf-8');
    fs.unlinkSync(backupPath);
  }
}

function injectFakeInvocation(src: string): string {
  const fakeMethod = `
  async fakeNonexistentMethod(): Promise<string> {
    return this.invokeContract(this.analyticsContractId, 'totally_fake_method_that_does_not_exist', [
      new Address('GABC123').toScVal(),
    ]);
  }
`;
  const lastBrace = src.lastIndexOf('}');
  return src.slice(0, lastBrace) + fakeMethod + src.slice(lastBrace);
}

function extractContractMethodNames(): Set<string> {
  const contractsDir = path.join(ROOT, 'contracts');
  const methods = new Set<string>();

  const dirs = fs
    .readdirSync(contractsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'target' && d.name !== 'shared');

  for (const d of dirs) {
    const libPath = path.join(contractsDir, d.name, 'src/lib.rs');
    if (!fs.existsSync(libPath)) continue;

    const src = fs.readFileSync(libPath, 'utf-8');
    const fnRegex = /pub\s+fn\s+(\w+)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = fnRegex.exec(src)) !== null) {
      methods.add(match[1]);
    }
  }

  return methods;
}

function extractInvokedMethods(content: string): string[] {
  const regex = /(?:invokeContract|simulateContract)\s*\([^,]+,\s*'(\w+)'/g;
  const methods: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  return methods;
}

describe('Intentional Staleness Regression (#1032)', () => {
  let originalContent: string;

  beforeAll(() => {
    originalContent = backup();
  });

  afterAll(() => {
    restore();
  });

  it('detects drift when a non-existent contract method is invoked', () => {
    const modified = injectFakeInvocation(originalContent);
    fs.writeFileSync(RPC_CLIENT, modified, 'utf-8');

    const invokedMethods = extractInvokedMethods(modified);
    const contractMethods = extractContractMethodNames();

    const driftMethods = invokedMethods.filter((m) => !contractMethods.has(m));

    expect(driftMethods).toContain('totally_fake_method_that_does_not_exist');
    expect(driftMethods.length).toBeGreaterThanOrEqual(1);
  });

  it('passes clean detection when no drift exists', () => {
    fs.writeFileSync(RPC_CLIENT, originalContent, 'utf-8');

    const invokedMethods = extractInvokedMethods(originalContent);
    const contractMethods = extractContractMethodNames();

    const driftMethods = invokedMethods.filter((m) => !contractMethods.has(m));

    expect(driftMethods).toHaveLength(0);
  });
});
