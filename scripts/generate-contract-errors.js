#!/usr/bin/env node
/**
 * scripts/generate-contract-errors.js
 * 
 * Regenerates docs/contracts/errors.md from contracts/shared/src/errors.rs
 * and contract crate definitions.
 * 
 * Usage: node scripts/generate-contract-errors.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ERRORS_SOURCE_PATH = path.join(ROOT_DIR, 'contracts', 'shared', 'src', 'errors.rs');
const OUTPUT_DOCS_PATH = path.join(ROOT_DIR, 'docs', 'contracts', 'errors.md');

// Contract descriptions and domain mappings
const CONTRACT_CATALOG = [
  { name: 'analytics', description: 'Tracks student course progress, milestone completions, and aggregate platform metrics' },
  { name: 'badges', description: 'Issues and manages soulbound and transferable skill/achievement badges' },
  { name: 'buyback', description: 'Automated BST token buyback and burn/treasury mechanism using platform fees' },
  { name: 'certificate', description: 'Issues and verifies verifiable, soulbound course completion certificates' },
  { name: 'credential_metadata', description: 'Extended on-chain and off-chain metadata registry for educational credentials' },
  { name: 'dispute', description: 'Handles decentralized dispute resolution and escrow arbitration' },
  { name: 'governance', description: 'Community proposal creation, BST-weighted voting, and execution' },
  { name: 'grants', description: 'Educational grant proposal management, milestone tracking, and fund disbursement' },
  { name: 'integration', description: 'End-to-end multi-contract workflow orchestration and test harness' },
  { name: 'liquidity_pool', description: 'Automated market maker (AMM) constant-product pool for BST pairs' },
  { name: 'market', description: 'Course and asset marketplace with escrow and multi-signature settlement' },
  { name: 'nft', description: 'Non-fungible token implementation for course credentials and collectible assets' },
  { name: 'registry', description: 'Decentralized registry of verified course providers, educators, and verifiers' },
  { name: 'reputation', description: 'Tracks decentralized reputation scores for students, instructors, and reviewers' },
  { name: 'royalty_distribution', description: 'Splits and distributes secondary sale and platform royalties to creators' },
  { name: 'scholarship_fund', description: 'Manages student scholarship applications, donor funding, and disbursements' },
  { name: 'shared', description: 'RBAC, access control, reentrancy guards, emergency pause, and protocol error definitions' },
  { name: 'token', description: 'Brain-Storm Token (BST) SEP-41 standard token implementation with staking and airdrops' },
  { name: 'token_restrictions', description: 'Regulatory compliance, transfer limits, lockup schedules, and address blacklists' },
  { name: 'types', description: 'Shared cross-contract data types and interface serialization bindings' }
];

// Error definitions metadata augmenting the enum in Rust
const ERROR_METADATA = {
  1: {
    category: 'Initialization & State',
    meaning: 'Contract has not been initialized. Must call initialize(admin) before invoking other methods.',
    contracts: ['All Contracts']
  },
  2: {
    category: 'Initialization & State',
    meaning: 'Contract is already initialized. Re-initialization is strictly rejected.',
    contracts: ['All Contracts']
  },
  3: {
    category: 'Initialization & State',
    meaning: 'The contract or referenced resource is in an invalid state for this operation.',
    contracts: ['All Contracts', 'dispute', 'market', 'scholarship_fund']
  },
  11: {
    category: 'Authorization & Access Control',
    meaning: 'Caller is not authorized to execute this operation or required authentication is missing.',
    contracts: ['All Contracts']
  },
  12: {
    category: 'Authorization & Access Control',
    meaning: 'Operation restricted exclusively to the designated contract admin address.',
    contracts: ['All Contracts']
  },
  13: {
    category: 'Authorization & Access Control',
    meaning: 'Operation restricted exclusively to authorized curator or verifier accounts.',
    contracts: ['registry', 'dispute', 'certificate', 'credential_metadata']
  },
  14: {
    category: 'Authorization & Access Control',
    meaning: 'Caller lacks the required RBAC role (e.g., Instructor, Student, Admin) or invalid role supplied.',
    contracts: ['shared', 'registry', 'governance']
  },
  21: {
    category: 'Validation Errors',
    meaning: 'Provided amount is zero, negative, insufficient, or exceeds allowed maximum.',
    contracts: ['token', 'market', 'liquidity_pool', 'grants', 'scholarship_fund', 'buyback', 'royalty_distribution']
  },
  22: {
    category: 'Validation Errors',
    meaning: 'Percentage or basis point value is out of valid range (e.g. not 0-100% or > 10,000 bps).',
    contracts: ['analytics', 'royalty_distribution', 'liquidity_pool', 'governance']
  },
  23: {
    category: 'Validation Errors',
    meaning: 'Timestamp is invalid (e.g., in the past, expiration before start, or deadline elapsed).',
    contracts: ['governance', 'grants', 'token_restrictions', 'certificate', 'credential_metadata']
  },
  24: {
    category: 'Validation Errors',
    meaning: 'Required string parameter (e.g., symbol, URI, course ID, name) is empty.',
    contracts: ['analytics', 'badges', 'certificate', 'credential_metadata', 'nft', 'registry']
  },
  25: {
    category: 'Validation Errors',
    meaning: 'Credential identifier or structure is invalid or malformed.',
    contracts: ['certificate', 'credential_metadata', 'registry']
  },
  26: {
    category: 'Validation Errors',
    meaning: 'Metadata URL, payload, or schema is invalid or exceeds maximum allowable length.',
    contracts: ['certificate', 'credential_metadata', 'badges', 'nft']
  },
  41: {
    category: 'State & Data',
    meaning: 'Requested record, entity, account, listing, or proposal was not found in contract storage.',
    contracts: ['All Contracts']
  },
  42: {
    category: 'State & Data',
    meaning: 'An entity with the given identifier or parameters already exists in storage.',
    contracts: ['badges', 'registry', 'certificate', 'market', 'token_restrictions']
  },
  43: {
    category: 'State & Data',
    meaning: 'Contract or subsystem is already paused; cannot pause again.',
    contracts: ['shared', 'token', 'market', 'liquidity_pool']
  },
  44: {
    category: 'State & Data',
    meaning: 'Contract or subsystem is not currently paused; cannot unpause.',
    contracts: ['shared', 'token', 'market', 'liquidity_pool']
  },
  61: {
    category: 'Contract State',
    meaning: 'Operation rejected because the contract is currently in emergency paused state.',
    contracts: ['shared', 'token', 'market', 'liquidity_pool', 'governance']
  },
  62: {
    category: 'Contract State',
    meaning: 'Reentrant call detected. Recursive or re-entrant invocations are blocked.',
    contracts: ['shared', 'market', 'liquidity_pool', 'grants', 'royalty_distribution']
  },
  63: {
    category: 'Contract State',
    meaning: 'Operation is blocked by safety controls or security lock.',
    contracts: ['shared', 'token_restrictions', 'dispute']
  },
  71: {
    category: 'Proposals & Governance',
    meaning: 'Proposal voting or execution period has expired.',
    contracts: ['governance', 'grants']
  },
  72: {
    category: 'Proposals & Governance',
    meaning: 'Proposal has already been executed and cannot be re-executed.',
    contracts: ['governance', 'grants']
  },
  73: {
    category: 'Proposals & Governance',
    meaning: 'Insufficient votes, quorum, or multisig approvals to execute proposal.',
    contracts: ['governance', 'grants', 'shared']
  },
  74: {
    category: 'Proposals & Governance',
    meaning: 'Governance or grant proposal with the specified ID was not found.',
    contracts: ['governance', 'grants']
  },
  91: {
    category: 'Limits & Restrictions',
    meaning: 'Requested action exceeds configured limit, maximum cap, or quota.',
    contracts: ['token', 'token_restrictions', 'liquidity_pool', 'scholarship_fund']
  },
  92: {
    category: 'Limits & Restrictions',
    meaning: 'Operation rejected because target account is restricted by blacklisting.',
    contracts: ['token_restrictions', 'token']
  },
  93: {
    category: 'Limits & Restrictions',
    meaning: 'Target account is not included in the required whitelist.',
    contracts: ['token_restrictions', 'grants', 'registry']
  },
  94: {
    category: 'Limits & Restrictions',
    meaning: 'Transfer denied (e.g. soulbound token/badge, timelock active, or compliance check failed).',
    contracts: ['certificate', 'badges', 'token_restrictions', 'token']
  },
  95: {
    category: 'Limits & Restrictions',
    meaning: 'Explicit prior approval or token allowance is required before completing transfer.',
    contracts: ['token', 'market', 'liquidity_pool']
  },
  111: {
    category: 'Credential & Metadata Specific',
    meaning: 'Educational credential has passed its expiration date and is no longer valid.',
    contracts: ['certificate', 'credential_metadata']
  },
  112: {
    category: 'Credential & Metadata Specific',
    meaning: 'Credential has been revoked or failed cryptographic signature verification.',
    contracts: ['certificate', 'credential_metadata', 'registry']
  },
  113: {
    category: 'Credential & Metadata Specific',
    meaning: 'Credential type is non-renewable or renewal criteria are not satisfied.',
    contracts: ['certificate', 'credential_metadata']
  },
  114: {
    category: 'Credential & Metadata Specific',
    meaning: 'Computed cryptographic content hash does not match the registered credential hash.',
    contracts: ['credential_metadata', 'certificate', 'registry']
  },
  131: {
    category: 'NFT & Linkage',
    meaning: 'Linked NFT contract address is not configured in contract instance storage.',
    contracts: ['credential_metadata', 'certificate']
  },
  132: {
    category: 'NFT & Linkage',
    meaning: 'Cross-contract call to mint associated NFT failed or returned an error.',
    contracts: ['credential_metadata', 'certificate']
  },
  133: {
    category: 'NFT & Linkage',
    meaning: 'Linkage record between educational credential and NFT token was not found.',
    contracts: ['credential_metadata']
  },
  200: {
    category: 'General Errors',
    meaning: 'General execution failure, arithmetic overflow, or internal contract error.',
    contracts: ['All Contracts']
  }
};

function parseErrorsFromSource() {
  if (!fs.existsSync(ERRORS_SOURCE_PATH)) {
    throw new Error(`Errors source file not found at ${ERRORS_SOURCE_PATH}`);
  }

  const content = fs.readFileSync(ERRORS_SOURCE_PATH, 'utf8');
  const errorRegex = /^\s*([A-Za-z0-9_]+)\s*=\s*([0-9]+)\s*,?/gm;
  const parsedErrors = [];

  let match;
  while ((match = errorRegex.exec(content)) !== null) {
    const name = match[1];
    const code = parseInt(match[2], 10);
    const meta = ERROR_METADATA[code] || {
      category: 'General Errors',
      meaning: `Contract error variant ${name}`,
      contracts: ['All Contracts']
    };

    parsedErrors.push({
      code,
      name,
      category: meta.category,
      meaning: meta.meaning,
      contracts: meta.contracts
    });
  }

  parsedErrors.sort((a, b) => a.code - b.code);
  return parsedErrors;
}

function generateMarkdown(errors) {
  const categories = [...new Set(errors.map(e => e.category))];

  let md = `# Contract-Level Error Codes Reference

This document is the authoritative reference for all error codes emitted by the Brain-Storm Soroban smart contracts. It is consumed by \`packages/sdk\`, \`apps/backend\`, \`apps/frontend\`, and external integrations to decode on-chain contract errors into human-readable messages and actionable UI feedback.

> **Regeneration:** This document is automatically generated from \`contracts/shared/src/errors.rs\`. To update after modifying contract errors, run:
> \`\`\`bash
> node scripts/generate-contract-errors.js
> \`\`\`

---

## Table of Contents

1. [Overview & Error Decoding](#overview--error-decoding)
2. [Master Error Code Reference Table](#master-error-code-reference-table)
3. [Errors by Category](#errors-by-category)
${categories.map(c => `   - [${c}](#${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`).join('\n')}
4. [Coverage Across Contracts (All 20 Contracts)](#coverage-across-contracts-all-20-contracts)
5. [Client SDK & Backend Error Handling](#client-sdk--backend-error-handling)

---

## Overview & Error Decoding

When a Soroban contract invocation fails, the Stellar RPC node returns a transaction result containing an \`Error(Contract, #code)\` payload.

- **Contract Error Representation:** In Soroban SDK / XDR, contract errors are represented as \`u32\` error codes defined in the contract's \`SharedError\` enum.
- **Unified Error Space:** Brain-Storm uses a centralized error enum in \`contracts/shared/src/errors.rs\` (ADR-007) ensuring that error codes are unique, consistent, and predictable across all 20 contract crates.

### Decoding Formula
\`\`\`typescript
// Given a raw Soroban error code 'code':
const errorMessage = CONTRACT_ERRORS[code]?.meaning || "Unknown contract error";
\`\`\`

---

## Master Error Code Reference Table

| Code | Variant | Category | Meaning & Trigger Condition | Applicable Contracts |
|:---:|---|---|---|---|
`;

  for (const err of errors) {
    const contractsStr = err.contracts.join(', ');
    md += `| **${err.code}** | \`${err.name}\` | ${err.category} | ${err.meaning} | ${contractsStr} |\n`;
  }

  md += `\n---\n\n## Errors by Category\n\n`;

  for (const category of categories) {
    const catErrors = errors.filter(e => e.category === category);
    md += `### ${category}\n\n`;
    md += `| Code | Variant | Description | Applicable Contracts |\n`;
    md += `|:---:|---|---|---|\n`;
    for (const err of catErrors) {
      md += `| **${err.code}** | \`${err.name}\` | ${err.meaning} | ${err.contracts.join(', ')} |\n`;
    }
    md += `\n`;
  }

  md += `---

## Coverage Across Contracts (All 20 Contracts)

Every contract crate in \`contracts/*\` adheres to the standard error codes:

| # | Contract / Crate | Purpose | Primary Error Codes Used |
|---|---|---|---|
`;

  CONTRACT_CATALOG.forEach((c, idx) => {
    let applicableCodes = [];
    errors.forEach(e => {
      if (e.contracts.includes('All Contracts') || e.contracts.includes(c.name)) {
        applicableCodes.push(e.code);
      }
    });
    // Format list compactly
    const codesSummary = applicableCodes.length > 8 
      ? `${applicableCodes.slice(0, 6).join(', ')}, ... (${applicableCodes.length} total)`
      : applicableCodes.join(', ');

    md += `| ${idx + 1} | \`contracts/${c.name}\` | ${c.description} | ${codesSummary} |\n`;
  });

  md += `
---

## Client SDK & Backend Error Handling

### In \`packages/sdk\`
The SDK provides automatic translation from Soroban transaction error codes to typed SDK errors:

\`\`\`typescript
import { BrainStormError, ErrorCode } from '@brain-storm/sdk';

try {
  await client.certificates.mintCertificate({ ... });
} catch (error) {
  if (error instanceof BrainStormError) {
    console.error(\`Contract Error \${error.code}: \${error.message}\`);
    // Example: Error code 12 -> AdminOnly
    if (error.code === 12) {
      // Prompt user to switch to admin wallet
    }
  }
}
\`\`\`

### In \`apps/backend\`
The NestJS backend intercepts Soroban contract invocation failures and translates them into appropriate HTTP status codes via standard exception filters:

| Contract Error Code Range | HTTP Status | Exception Type |
|---|---|---|
| 1, 2, 3 (Initialization / State) | 400 Bad Request / 409 Conflict | \`BadRequestException\` / \`ConflictException\` |
| 11, 12, 13, 14 (Authorization / RBAC) | 401 Unauthorized / 403 Forbidden | \`UnauthorizedException\` / \`ForbiddenException\` |
| 21 - 40 (Validation) | 422 Unprocessable Entity | \`UnprocessableEntityException\` |
| 41 (NotFound) | 404 Not Found | \`NotFoundException\` |
| 42 (AlreadyExists) | 409 Conflict | \`ConflictException\` |
| 43, 44, 61, 62, 63 (Paused / Safety Guard) | 503 Service Unavailable / 429 Too Many Requests | \`ServiceUnavailableException\` |
| 71 - 90 (Governance / Proposals) | 400 Bad Request / 410 Gone | \`BadRequestException\` |
| 91 - 110 (Limits / Blacklist / Whitelist) | 403 Forbidden / 429 Too Many Requests | \`ForbiddenException\` |
| 111 - 150 (Credentials / NFT Linkage) | 400 Bad Request / 422 Unprocessable | \`BadRequestException\` |
| 200 (OperationFailed) | 500 Internal Server Error | \`InternalServerErrorException\` |
`;

  return md;
}

function main() {
  console.log(`Parsing error definitions from: ${ERRORS_SOURCE_PATH}`);
  const errors = parseErrorsFromSource();
  console.log(`Extracted ${errors.length} error variants.`);

  const md = generateMarkdown(errors);

  const outDir = path.dirname(OUTPUT_DOCS_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_DOCS_PATH, md, 'utf8');
  console.log(`Successfully generated: ${OUTPUT_DOCS_PATH}`);
}

main();
