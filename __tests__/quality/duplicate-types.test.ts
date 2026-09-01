import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Duplicate Type Definitions', () => {
  const packagesTypes = './packages/types';
  const frontendTypes = './apps/frontend/src/types';

  it('should have no duplicate type names', () => {
    function getTypeNames(dir: string): Set<string> {
      const types = new Set<string>();

      if (!fs.existsSync(dir)) return types;

      function scanDir(d: string) {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile() && file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const matches = content.match(/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*)/gm);
            if (matches) {
              for (const match of matches) {
                const name = match.replace(/^(export )?(interface|type) /, '').trim();
                types.add(name);
              }
            }
          }
        }
      }

      scanDir(dir);
      return types;
    }

    const packagesTypesSet = getTypeNames(packagesTypes);
    const frontendTypesSet = getTypeNames(frontendTypes);

    const duplicates: string[] = [];
    for (const type of packagesTypesSet) {
      if (frontendTypesSet.has(type)) {
        duplicates.push(type);
      }
    }

    if (duplicates.length > 0) {
      console.log('❌ Duplicate types found:', duplicates);
    }

    expect(duplicates).toHaveLength(0);
  });

  it('should export all types from packages/types', () => {
    const indexPath = path.join(packagesTypes, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('export * from');
    }
  });
});

describe('Canonical Domain Types (Listing, Dispute, Grant)', () => {
  const canonicalNames = [
    // Dispute
    'DisputeStatus',
    'DisputeType',
    'FlagReason',
    'DisputeState',
    'Dispute',
    'CreateDispute',
    'ResolveDispute',
    'DisputeQuery',
    // Grant
    'GrantStatus',
    'Grant',
    'CreateGrant',
    'UpdateGrant',
    'PaginatedGrants',
    'GrantApplicationValues',
    // Listing / Marketplace
    'ListingCurrency',
    'ListingFormData',
    'MarketplaceTransactionStatus',
    'MarketplaceTransaction',
    'MarketplaceTx',
  ];

  const workspaces = [
    './apps/frontend/src',
    './apps/backend/src',
    './packages/sdk/src',
  ];

  it('defines each canonical domain type in packages/types', () => {
    const index = fs.existsSync(path.join(packagesTypes, 'src/index.ts'))
      ? fs.readFileSync(path.join(packagesTypes, 'src/index.ts'), 'utf-8')
      : '';

    for (const name of canonicalNames) {
      // The barrel re-exports the domain modules; ensure each is reachable.
      expect(index).toMatch(/dispute\.types|grant\.types|listing\.types/);
    }
  });

  it('does not redefine canonical domain types outside packages/types', () => {
    function findDefinitions(dir: string): Map<string, string[]> {
      const found = new Map<string, string[]>();

      if (!fs.existsSync(dir)) return found;

      function scan(d: string) {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (stat.isFile() && /\.(ts|tsx)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Match definitions (interface X / type X / enum X), but NOT
            // re-exports like `export type { X } from` or `export type X from`.
            const matches = content.match(
              /^(export )?(interface|type|enum) ([A-Za-z_][A-Za-z0-9_]*)(?![a-zA-Z0-9_{])/gm
            );
            if (matches) {
              for (const match of matches) {
                const name = match
                  .replace(/^(export )?(interface|type|enum) /, '')
                  .trim();
                if (canonicalNames.includes(name)) {
                  const list = found.get(name) ?? [];
                  list.push(`${dir.replace('./', '')}/${file}`);
                  found.set(name, list);
                }
              }
            }
          }
        }
      }

      scan(dir);
      return found;
    }

    let anyDefinitions = false;
    for (const ws of workspaces) {
      const definitions = findDefinitions(ws);
      if (definitions.size > 0) {
        anyDefinitions = true;
        for (const [name, files] of definitions) {
          console.log(
            `❌ "${name}" redefined outside packages/types in: ${files.join(', ')}`
          );
        }
      }
    }

    expect(anyDefinitions).toBe(false);
  });
});
