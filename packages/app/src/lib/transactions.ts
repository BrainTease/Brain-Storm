import {
  Transaction,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  xdr,
} from '@stellar/stellar-sdk';
import type {
  ParsedTransaction,
  ParsedOperation,
  ValidationResult,
} from '@brain-storm/types';

// Re-export so existing consumers of this module keep working without changes.
export type { ParsedTransaction, ParsedOperation, ValidationResult } from '@brain-storm/types';

const EXPECTED_NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as string) || 'testnet';

const NETWORK_PASSPHRASES: Record<string, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
};

const BST_CONTRACT_ID = process.env.NEXT_PUBLIC_BST_CONTRACT_ID || '';

export function parseTransactionXDR(xdr: string): ParsedTransaction {
  const tx = new Transaction(xdr, NETWORK_PASSPHRASES[EXPECTED_NETWORK]);

  const source = tx.source;
  const fee = tx.fee.toString();
  const sequence = tx.sequence;
  const memo = tx.memo?.value?.toString() || null;
  const memoType = tx.memo?.type?.toString() || null;
  const network = tx.networkPassphrase;
  const timeBounds = tx.timeBounds
    ? {
        minTime: tx.timeBounds.minTime,
        maxTime: tx.timeBounds.maxTime,
      }
    : null;

  const operations: ParsedOperation[] = tx.operations.map(
    (op: Operation) => parseOperation(op)
  );

  return {
    source,
    fee,
    sequence,
    memo,
    memoType,
    network,
    operations,
    timeBounds,
  };
}

function parseOperation(op: Operation): ParsedOperation {
  const type = op.type;
  const details: Record<string, string> = {};

  switch (op.type) {
    case 'payment': {
      const payment = op as Operation.Payment;
      details.destination = payment.destination;
      details.asset = payment.asset.code || 'XLM';
      details.issuer = payment.asset.issuer || '';
      details.amount = payment.amount;
      break;
    }
    case 'createAccount': {
      const create = op as Operation.CreateAccount;
      details.destination = create.destination;
      details.startingBalance = create.startingBalance;
      break;
    }
    case 'manageSellOffer': {
      const offer = op as Operation.ManageSellOffer;
      details.selling = offer.selling.code || 'XLM';
      details.buying = offer.buying.code || 'XLM';
      details.amount = offer.amount;
      details.price = offer.price.toString();
      break;
    }
    case 'manageBuyOffer': {
      const offer = op as Operation.ManageBuyOffer;
      details.selling = offer.selling.code || 'XLM';
      details.buying = offer.buying.code || 'XLM';
      details.amount = offer.amount;
      details.price = offer.price.toString();
      break;
    }
    case 'pathPaymentStrictReceive': {
      const path = op as Operation.PathPaymentStrictReceive;
      details.destination = path.destination;
      details.sendAsset = path.sendAsset.code || 'XLM';
      details.sendMax = path.sendMax;
      details.destAsset = path.destAsset.code || 'XLM';
      details.destAmount = path.destAmount;
      break;
    }
    case 'pathPaymentStrictSend': {
      const path = op as Operation.PathPaymentStrictSend;
      details.destination = path.destination;
      details.sendAsset = path.sendAsset.code || 'XLM';
      details.sendAmount = path.sendAmount;
      details.destAsset = path.destAsset.code || 'XLM';
      details.destMin = path.destMin;
      break;
    }
    case 'setTrustline': {
      const trust = op as Operation.ChangeTrust;
      details.asset = trust.line.code || 'XLM';
      details.issuer = trust.line.issuer || '';
      details.limit = trust.limit;
      break;
    }
    case 'manageData': {
      const data = op as Operation.ManageData;
      details.name = data.name;
      details.value = data.value || '';
      break;
    }
    case 'accountMerge': {
      const merge = op as Operation.AccountMerge;
      details.destination = merge.destination;
      break;
    }
    case 'invokeHostFunction': {
      const invoke = op as Operation.InvokeHostFunction;
      details.function = invoke.func.toString();
      details.parameters = JSON.stringify(invoke.parameters);
      details.contractId = invoke.contractId || invoke.func.contractId?.toString() || '';
      break;
    }
    case 'bumpSequence': {
      const bump = op as Operation.BumpSequence;
      details.bumpTo = bump.bumpTo;
      break;
    }
    default: {
      details.note = `Unsupported operation type: ${op.type}`;
    }
  }

  return { type, details };
}

export function buildTransactionSummary(tx: ParsedTransaction): string {
  const lines: string[] = [];
  lines.push(`Network: ${EXPECTED_NETWORK}`);
  lines.push(`Source: ${tx.source}`);
  lines.push(`Fee: ${tx.fee} stroops`);
  lines.push(`Sequence: ${tx.sequence}`);

  if (tx.memo) {
    lines.push(`Memo (${tx.memoType}): ${tx.memo}`);
  }

  if (tx.operations.length === 0) {
    lines.push('No operations in this transaction');
  } else {
    lines.push(`Operations (${tx.operations.length}):`);
    tx.operations.forEach((op, i) => {
      lines.push(`  ${i + 1}. ${formatOperationSummary(op)}`);
    });
  }

  return lines.join('\n');
}

function formatOperationSummary(op: ParsedOperation): string {
  const { type, details } = op;

  switch (type) {
    case 'payment':
      return `Send ${details.amount} ${details.asset} to ${details.destination}`;
    case 'createAccount':
      return `Create account ${details.destination} with ${details.startingBalance} XLM`;
    case 'manageSellOffer':
      return `Sell ${details.amount} ${details.selling} for ${details.buying} at ${details.price}`;
    case 'manageBuyOffer':
      return `Buy ${details.amount} ${details.buying} with ${details.selling} at ${details.price}`;
    case 'pathPaymentStrictReceive':
      return `Send up to ${details.sendMax} ${details.sendAsset} to ${details.destination} for at least ${details.destAmount} ${details.destAsset}`;
    case 'pathPaymentStrictSend':
      return `Send exactly ${details.sendAmount} ${details.sendAsset} to ${details.destination} for at least ${details.destMin} ${details.destAsset}`;
    case 'setTrustline':
      return `Set trustline for ${details.asset} (limit: ${details.limit})`;
    case 'manageData':
      return `Set data entry "${details.name}"`;
    case 'accountMerge':
      return `Merge account into ${details.destination}`;
    case 'invokeHostFunction':
      return `Invoke contract ${details.contractId || 'unknown'}`;
    case 'bumpSequence':
      return `Bump sequence to ${details.bumpTo}`;
    default:
      return `${type}: ${JSON.stringify(details)}`;
  }
}

export function validateTransaction(
  xdr: string,
  expectedContractId?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const tx = new Transaction(xdr, NETWORK_PASSPHRASES[EXPECTED_NETWORK]);

    const expectedPassphrase = NETWORK_PASSPHRASES[EXPECTED_NETWORK];
    if (tx.networkPassphrase !== expectedPassphrase) {
      errors.push(
        `Network mismatch: transaction is for "${tx.networkPassphrase}", expected "${expectedPassphrase}"`
      );
    }

    if (tx.operations.length === 0) {
      errors.push('Transaction contains no operations');
    }

    tx.operations.forEach((op: Operation, i: number) => {
      validateOperation(op, i, errors, warnings, expectedContractId);
    });

    if (tx.timeBounds) {
      const now = Math.floor(Date.now() / 1000);
      if (tx.timeBounds.minTime && Number(tx.timeBounds.minTime) > now) {
        warnings.push(
          `Transaction cannot be submitted until ${new Date(
            Number(tx.timeBounds.minTime) * 1000
          ).toISOString()}`
        );
      }
      if (tx.timeBounds.maxTime && Number(tx.timeBounds.maxTime) < now) {
        errors.push('Transaction time bounds have expired');
      }
    }

    if (tx.source.startsWith('G') && tx.source.length !== 56) {
      errors.push('Invalid source account address format');
    }
  } catch (e) {
    errors.push(
      `Failed to parse transaction: ${e instanceof Error ? e.message : 'Invalid XDR'}`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateOperation(
  op: Operation,
  index: number,
  errors: string[],
  warnings: string[],
  expectedContractId?: string
): void {
  const prefix = `Operation #${index + 1}`;

  switch (op.type) {
    case 'payment': {
      const payment = op as Operation.Payment;
      const amount = parseFloat(payment.amount);

      if (amount <= 0) {
        errors.push(`${prefix}: Payment amount must be greater than 0`);
      }
      if (!isFinite(amount)) {
        errors.push(`${prefix}: Payment amount is not a finite number`);
      }
      if (amount > 1_000_000_000) {
        warnings.push(`${prefix}: Large payment amount (${payment.amount}) — please verify`);
      }

      const decimals = getDecimalPlaces(payment.amount);
      if (decimals > 7) {
        errors.push(
          `${prefix}: Amount has ${decimals} decimal places (max 7 for Stellar assets)`
        );
      }

      if (!isValidStellarAddress(payment.destination)) {
        errors.push(`${prefix}: Invalid destination address "${payment.destination}"`);
      }

      if (payment.asset.issuer && !isValidStellarAddress(payment.asset.issuer)) {
        errors.push(`${prefix}: Invalid asset issuer address "${payment.asset.issuer}"`);
      }
      break;
    }

    case 'createAccount': {
      const create = op as Operation.CreateAccount;
      if (!isValidStellarAddress(create.destination)) {
        errors.push(`${prefix}: Invalid destination address "${create.destination}"`);
      }
      if (parseFloat(create.startingBalance) <= 0) {
        errors.push(`${prefix}: Starting balance must be greater than 0`);
      }
      break;
    }

    case 'invokeHostFunction': {
      const invoke = op as Operation.InvokeHostFunction;
      const contractId = invoke.contractId?.toString() || '';

      if (expectedContractId && contractId !== expectedContractId) {
        errors.push(
          `${prefix}: Contract ID mismatch — expected "${expectedContractId}", got "${contractId}"`
        );
      }

      if (contractId && !isValidContractId(contractId)) {
        errors.push(`${prefix}: Invalid contract ID format "${contractId}"`);
      }
      break;
    }

    case 'manageSellOffer':
    case 'manageBuyOffer': {
      const offer = op as Operation.ManageSellOffer;
      if (parseFloat(offer.amount) <= 0) {
        errors.push(`${prefix}: Offer amount must be greater than 0`);
      }
      if (parseFloat(offer.price) <= 0) {
        errors.push(`${prefix}: Offer price must be greater than 0`);
      }
      break;
    }

    case 'setTrustline': {
      const trust = op as Operation.ChangeTrust;
      const limit = trust.limit;
      if (limit !== '' && limit !== '0' && parseFloat(limit) < 0) {
        errors.push(`${prefix}: Trustline limit cannot be negative`);
      }
      break;
    }
  }
}

export function detectTamperedTransaction(
  originalXdr: string,
  modifiedXdr: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const original = new Transaction(
      originalXdr,
      NETWORK_PASSPHRASES[EXPECTED_NETWORK]
    );
    const modified = new Transaction(
      modifiedXdr,
      NETWORK_PASSPHRASES[EXPECTED_NETWORK]
    );

    if (original.source !== modified.source) {
      errors.push('Transaction source account has been tampered with');
    }

    if (original.sequence !== modified.sequence) {
      warnings.push('Transaction sequence number has changed');
    }

    const origOps = original.operations;
    const modOps = modified.operations;

    if (origOps.length !== modOps.length) {
      errors.push(
        `Operation count mismatch: original ${origOps.length}, modified ${modOps.length}`
      );
    } else {
      for (let i = 0; i < origOps.length; i++) {
        const origOp = origOps[i];
        const modOp = modOps[i];

        if (origOp.type !== modOp.type) {
          errors.push(
            `Operation #${i + 1} type changed from "${origOp.type}" to "${modOp.type}"`
          );
          continue;
        }

        const opErrors = compareOperations(origOp, modOp, i);
        errors.push(...opErrors);
      }
    }

    if (original.memo?.value?.toString() !== modified.memo?.value?.toString()) {
      warnings.push('Transaction memo has been modified');
    }

    if (original.fee !== modified.fee) {
      warnings.push(
        `Transaction fee changed from ${original.fee} to ${modified.fee}`
      );
    }
  } catch (e) {
    errors.push(
      `Failed to compare transactions: ${e instanceof Error ? e.message : 'Invalid XDR'}`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

function compareOperations(
  orig: Operation,
  mod: Operation,
  index: number
): string[] {
  const errors: string[] = [];
  const prefix = `Operation #${index + 1}`;

  switch (orig.type) {
    case 'payment': {
      const o = orig as Operation.Payment;
      const m = mod as Operation.Payment;
      if (o.destination !== m.destination)
        errors.push(`${prefix}: Destination changed from "${o.destination}" to "${m.destination}"`);
      if (o.amount !== m.amount)
        errors.push(`${prefix}: Amount changed from "${o.amount}" to "${m.amount}"`);
      if (o.asset.code !== m.asset.code)
        errors.push(`${prefix}: Asset code changed from "${o.asset.code}" to "${m.asset.code}"`);
      if (o.asset.issuer !== m.asset.issuer)
        errors.push(`${prefix}: Asset issuer changed from "${o.asset.issuer}" to "${m.asset.issuer}"`);
      break;
    }
    case 'createAccount': {
      const o = orig as Operation.CreateAccount;
      const m = mod as Operation.CreateAccount;
      if (o.destination !== m.destination)
        errors.push(`${prefix}: Destination changed from "${o.destination}" to "${m.destination}"`);
      if (o.startingBalance !== m.startingBalance)
        errors.push(`${prefix}: Starting balance changed from "${o.startingBalance}" to "${m.startingBalance}"`);
      break;
    }
    case 'invokeHostFunction': {
      const o = orig as Operation.InvokeHostFunction;
      const m = mod as Operation.InvokeHostFunction;
      const origContractId = o.contractId?.toString() || '';
      const modContractId = m.contractId?.toString() || '';
      if (origContractId !== modContractId)
        errors.push(`${prefix}: Contract ID changed from "${origContractId}" to "${modContractId}"`);
      break;
    }
    case 'manageSellOffer':
    case 'manageBuyOffer': {
      const o = orig as Operation.ManageSellOffer;
      const m = mod as Operation.ManageSellOffer;
      if (o.amount !== m.amount)
        errors.push(`${prefix}: Offer amount changed from "${o.amount}" to "${m.amount}"`);
      if (o.price.toString() !== m.price.toString())
        errors.push(`${prefix}: Offer price changed from "${o.price}" to "${m.price}"`);
      if ((o.selling.code || 'XLM') !== (m.selling.code || 'XLM'))
        errors.push(`${prefix}: Selling asset changed from "${o.selling.code}" to "${m.selling.code}"`);
      if ((o.buying.code || 'XLM') !== (m.buying.code || 'XLM'))
        errors.push(`${prefix}: Buying asset changed from "${o.buying.code}" to "${m.buying.code}"`);
      break;
    }
    case 'setTrustline': {
      const o = orig as Operation.ChangeTrust;
      const m = mod as Operation.ChangeTrust;
      if (o.line.code !== m.line.code)
        errors.push(`${prefix}: Trustline asset changed from "${o.line.code}" to "${m.line.code}"`);
      if (o.limit !== m.limit)
        errors.push(`${prefix}: Trustline limit changed from "${o.limit}" to "${m.limit}"`);
      break;
    }
    case 'accountMerge': {
      const o = orig as Operation.AccountMerge;
      const m = mod as Operation.AccountMerge;
      if (o.destination !== m.destination)
        errors.push(`${prefix}: Merge destination changed from "${o.destination}" to "${m.destination}"`);
      break;
    }
  }

  return errors;
}

function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

function isValidContractId(id: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(id) || /^[a-f0-9]{64}$/i.test(id);
}

function getDecimalPlaces(amount: string): number {
  const parts = amount.split('.');
  return parts.length === 2 ? parts[1].length : 0;
}

export function formatAmountHumanReadable(
  amount: string,
  asset: string
): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${asset}`;

  if (asset === 'XLM') {
    return `${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    })} XLM`;
  }

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M ${asset}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K ${asset}`;
  }

  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} ${asset}`;
}
