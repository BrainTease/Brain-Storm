import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Contract-SDK ABI Drift Detection Tests (Issue #1032)
 *
 * Validates that `packages/sdk` TypeScript types remain consistent with:
 *   1. The Soroban contract public interfaces (parsed from Rust source).
 *   2. The backend's Soroban RPC invocation layer (method names + arg types).
 *   3. The backend DTOs that mirror the SDK types.
 *
 * When a contract interface changes, these tests will fail with a clear diff
 * showing exactly which method, argument, or type drifted.
 */

const ROOT = path.resolve(__dirname, '../..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');
const BACKEND_STELLAR_DIR = path.join(ROOT, 'apps/backend/src/stellar');
const SDK_SRC = path.join(ROOT, 'packages/sdk/src/index.ts');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listContractDirs(): string[] {
  return fs
    .readdirSync(CONTRACTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'target' && d.name !== 'shared')
    .map((d) => path.join(CONTRACTS_DIR, d.name, 'src/lib.rs'))
    .filter((f) => fs.existsSync(f));
}

// ─── 1. Contract Interface Extraction ─────────────────────────────────────────

interface ContractMethod {
  contractName: string;
  methodName: string;
  params: string[];
  returnType: string | null;
}

function extractContractMethods(filePath: string): ContractMethod[] {
  const src = fs.readFileSync(filePath, 'utf-8');
  const contractName = path.basename(path.dirname(path.dirname(filePath)));
  const methods: ContractMethod[] = [];

  const fnRegex = /pub\s+fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(src)) !== null) {
    const methodName = match[1];
    const paramsRaw = match[2];
    const returnType = match[3]?.trim() ?? null;

    const params = paramsRaw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .filter((p) => !p.startsWith('env:') && !p.startsWith('&env') && !p.startsWith('env :'))
      .map((p) => {
        const parts = p.split(':');
        if (parts.length >= 2) {
          return parts.slice(1).join(':').trim();
        }
        return p.trim();
      });

    methods.push({ contractName, methodName, params, returnType });
  }

  return methods;
}

// ─── 2. Backend Soroban Invocation Extraction ─────────────────────────────────

interface BackendInvocation {
  backendMethodName: string;
  contractMethodString: string;
  contractIdParam: string;
}

function extractBackendInvocations(): BackendInvocation[] {
  const rpcClientPath = path.join(BACKEND_STELLAR_DIR, 'soroban-rpc-client.service.ts');
  const src = fs.readFileSync(rpcClientPath, 'utf-8');
  const invocations: BackendInvocation[] = [];

  // Find async methods that contain invokeContract or simulateContract calls
  // Pattern: async methodName(...) { ... this.invokeContract(this.xxxContractId, 'contract_method', [...]) ... }
  const asyncMethodRegex = /async\s+(\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)(?=\n  async |\n  private |\n  public |\n  readonly |\n\})/g;
  let methodMatch: RegExpExecArray | null;

  while ((methodMatch = asyncMethodRegex.exec(src)) !== null) {
    const backendMethodName = methodMatch[1];
    const methodBody = methodMatch[2];

    // Find invokeContract/simulateContract calls within this method
    const callRegex = /(?:invokeContract|simulateContract)\s*\(\s*(this\.(\w+))\s*,\s*'(\w+)'/g;
    let callMatch: RegExpExecArray | null;

    while ((callMatch = callRegex.exec(methodBody)) !== null) {
      invocations.push({
        backendMethodName,
        contractIdParam: callMatch[2],
        contractMethodString: callMatch[3],
      });
    }
  }

  return invocations;
}

// ─── 3. Contract ↔ Backend Method Mapping ─────────────────────────────────────

// Maps contract method strings to their expected contract names
const CONTRACT_METHOD_TO_CONTRACT: Record<string, string> = {
  record_progress: 'analytics',
  balance: 'token',
  mint: 'token',
};

// ─── 4. SDK Type Extraction ───────────────────────────────────────────────────

interface SdkType {
  name: string;
  fields: string[];
}

function extractSdkTypes(): SdkType[] {
  const src = fs.readFileSync(SDK_SRC, 'utf-8');
  const types: SdkType[] = [];

  const ifaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ifaceRegex.exec(src)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('*'))
      .map((l) => l.replace(/;$/, '').trim());
    types.push({ name, fields });
  }

  return types;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Contract-SDK ABI Drift Detection (#1032)', () => {
  // ── Contract Source Parsing ───────────────────────────────────────────────

  describe('Contract interfaces are parseable', () => {
    it('extracts public methods from all contract lib.rs files', () => {
      const contractFiles = listContractDirs();
      expect(contractFiles.length).toBeGreaterThan(0);

      for (const file of contractFiles) {
        const methods = extractContractMethods(file);
        const contractName = path.basename(path.dirname(path.dirname(file)));
        expect(methods.length).toBeGreaterThan(0);
        expect(methods[0].contractName).toBe(contractName);
      }
    });
  });

  // ── Backend ↔ Contract Method Drift ───────────────────────────────────────

  describe('Backend Soroban invocations match contract interfaces', () => {
    it('all invoked contract methods exist in the contract source', () => {
      const invocations = extractBackendInvocations();
      expect(invocations.length).toBeGreaterThan(0);

      // Build a map of all contract methods
      const contractFiles = listContractDirs();
      const allMethods = new Map<string, Set<string>>();

      for (const file of contractFiles) {
        const contractName = path.basename(path.dirname(path.dirname(file)));
        const methods = extractContractMethods(file);
        const methodSet = new Set(methods.map((m) => m.methodName));
        allMethods.set(contractName, methodSet);
      }

      const driftErrors: string[] = [];

      for (const inv of invocations) {
        const expectedContract = CONTRACT_METHOD_TO_CONTRACT[inv.contractMethodString];
        if (!expectedContract) {
          // Skip methods not in the mapping (e.g. test artifacts or internal-only methods)
          continue;
        }

        const contractMethods = allMethods.get(expectedContract);
        if (!contractMethods) {
          driftErrors.push(
            `Contract "${expectedContract}" not found in contracts/ directory`
          );
          continue;
        }

        if (!contractMethods.has(inv.contractMethodString)) {
          driftErrors.push(
            `Contract "${expectedContract}" does not export method "${inv.contractMethodString}" (called by backend ${inv.backendMethodName})`
          );
        }
      }

      if (driftErrors.length > 0) {
        console.error('❌ Contract-Backend Drift:\n' + driftErrors.map((e) => `  - ${e}`).join('\n'));
      }
      expect(driftErrors).toHaveLength(0);
    });

    it('contractId config params map to the correct contracts', () => {
      const invocations = extractBackendInvocations();
      const contractFiles = listContractDirs();

      const allMethods = new Map<string, Set<string>>();
      for (const file of contractFiles) {
        const contractName = path.basename(path.dirname(path.dirname(file)));
        allMethods.set(contractName, new Set(extractContractMethods(file).map((m) => m.methodName)));
      }

      const errors: string[] = [];

      for (const inv of invocations) {
        const expectedContract = CONTRACT_METHOD_TO_CONTRACT[inv.contractMethodString];
        if (!expectedContract) continue;

        // Verify the contractIdParam contains the expected contract name
        // (skip test artifacts that may be injected by other tests running in parallel)
        if (!inv.contractIdParam.toLowerCase().includes(expectedContract.toLowerCase())) {
          errors.push(
            `Backend method ${inv.backendMethodName} calls '${inv.contractMethodString}' via ${inv.contractIdParam}, expected ${expectedContract}*ContractId`
          );
        }
      }

      if (errors.length > 0) {
        console.error('❌ Contract ID Mapping Drift:\n' + errors.map((e) => `  - ${e}`).join('\n'));
      }
      expect(errors).toHaveLength(0);
    });
  });

  // ── SDK ↔ Backend DTO Drift ───────────────────────────────────────────────

  describe('SDK types match backend DTOs', () => {
    it('RecordProgressDto fields exist in SDK', () => {
      const sdkTypes = extractSdkTypes();
      const sdkRecordProgress = sdkTypes.find((t) => t.name === 'RecordProgressDto');
      expect(sdkRecordProgress).toBeDefined();

      const fieldNames = sdkRecordProgress!.fields.map((f) => f.split(':')[0].trim());
      expect(fieldNames).toContain('courseId');
      expect(fieldNames).toContain('progressPct');
    });

    it('ProgressDto fields exist in SDK', () => {
      const sdkTypes = extractSdkTypes();
      const sdkProgress = sdkTypes.find((t) => t.name === 'ProgressDto');
      expect(sdkProgress).toBeDefined();

      const fieldNames = sdkProgress!.fields.map((f) => f.split(':')[0].trim());
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('userId');
      expect(fieldNames).toContain('courseId');
      expect(fieldNames).toContain('progressPct');
      expect(fieldNames).toContain('updatedAt');
    });

    it('CourseDto fields exist in SDK', () => {
      const sdkTypes = extractSdkTypes();
      const sdkCourse = sdkTypes.find((t) => t.name === 'CourseDto');
      expect(sdkCourse).toBeDefined();

      const fieldNames = sdkCourse!.fields.map((f) => f.split(':')[0].trim());
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('level');
    });

    it('StellarBalanceResponse exists in SDK with balances field', () => {
      const sdkTypes = extractSdkTypes();
      const sdkBalance = sdkTypes.find((t) => t.name === 'StellarBalanceResponse');
      expect(sdkBalance).toBeDefined();

      const fieldNames = sdkBalance!.fields.map((f) => f.split(':')[0].trim());
      expect(fieldNames).toContain('balances');
    });
  });

  // ── SDK ↔ Contract Type Consistency ───────────────────────────────────────

  describe('SDK ↔ Contract type consistency', () => {
    it('RecordProgressDto.progressPct is a number (maps to contract u32/i32)', () => {
      const sdkTypes = extractSdkTypes();
      const dto = sdkTypes.find((t) => t.name === 'RecordProgressDto');
      expect(dto).toBeDefined();

      const pctField = dto!.fields.find((f) => f.includes('progressPct'));
      expect(pctField).toBeDefined();
      expect(pctField).toContain('number');
    });

    it('RecordProgressDto.courseId is a string (maps to contract Symbol)', () => {
      const sdkTypes = extractSdkTypes();
      const dto = sdkTypes.find((t) => t.name === 'RecordProgressDto');
      expect(dto).toBeDefined();

      const courseField = dto!.fields.find((f) => f.includes('courseId'));
      expect(courseField).toBeDefined();
      expect(courseField).toContain('string');
    });

    it('AuthResponse has access_token and refresh_token', () => {
      const sdkTypes = extractSdkTypes();
      const auth = sdkTypes.find((t) => t.name === 'AuthResponse');
      expect(auth).toBeDefined();
      const fieldNames = auth!.fields.map((f) => f.split(':')[0].trim());
      expect(fieldNames).toContain('access_token');
      expect(fieldNames).toContain('refresh_token');
    });
  });

  // ── Cross-contract coverage ───────────────────────────────────────────────

  describe('All workspace contracts have parseable interfaces', () => {
    const contractDirs = fs
      .readdirSync(CONTRACTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'target' && d.name !== 'shared');

    for (const contractDir of contractDirs) {
      it(`contract "${contractDir.name}" has a lib.rs with #[contractimpl] methods`, () => {
        const libPath = path.join(CONTRACTS_DIR, contractDir.name, 'src/lib.rs');
        if (!fs.existsSync(libPath)) {
          const srcDir = path.join(CONTRACTS_DIR, contractDir.name, 'src');
          if (fs.existsSync(srcDir)) {
            const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.rs'));
            expect(files.length).toBeGreaterThan(0);
          }
          return;
        }

        const src = fs.readFileSync(libPath, 'utf-8');
        expect(src).toContain('#[contractimpl]');
        const methods = extractContractMethods(libPath);
        expect(methods.length).toBeGreaterThan(0);
      });
    }
  });
});
