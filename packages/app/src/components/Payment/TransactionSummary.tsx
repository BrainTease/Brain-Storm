'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  parseTransactionXDR,
  buildTransactionSummary,
  validateTransaction,
  detectTamperedTransaction,
  formatAmountHumanReadable,
  ParsedTransaction,
  ValidationResult,
} from '../../lib/transactions';

interface TransactionSummaryProps {
  xdr: string;
  expectedContractId?: string;
  onValid?: () => void;
  onInvalid?: (errors: string[]) => void;
}

export function TransactionSummary({
  xdr,
  expectedContractId,
  onValid,
  onInvalid,
}: TransactionSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);

  useEffect(() => {
    try {
      const parsedTx = parseTransactionXDR(xdr);
      setParsed(parsedTx);
      setParseError(null);

      const result = validateTransaction(xdr, expectedContractId);
      setValidation(result);

      if (result.valid) {
        onValid?.();
      } else {
        onInvalid?.(result.errors);
      }
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : 'Failed to parse transaction'
      );
      setParsed(null);
      setValidation(null);
    }
  }, [xdr, expectedContractId, onValid, onInvalid]);

  const summaryText = useMemo(
    () => (parsed ? buildTransactionSummary(parsed) : ''),
    [parsed]
  );

  if (parseError) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="text-red-500 mt-0.5" aria-hidden="true">
            ⚠
          </span>
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Invalid Transaction
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {parseError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validation && !validation.valid && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3"
          role="alert"
        >
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Validation Errors
          </h3>
          <ul className="mt-1 space-y-1">
            {validation.errors.map((err, i) => (
              <li
                key={i}
                className="text-sm text-red-600 dark:text-red-300 flex items-start gap-2"
              >
                <span aria-hidden="true">•</span>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation && validation.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Warnings
          </h3>
          <ul className="mt-1 space-y-1">
            {validation.warnings.map((warn, i) => (
              <li
                key={i}
                className="text-sm text-amber-600 dark:text-amber-300 flex items-start gap-2"
              >
                <span aria-hidden="true">•</span>
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation && validation.valid && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-200">
            ✓ Transaction validated successfully
          </p>
        </div>
      )}

      {parsed && parsed.operations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Transaction Summary
          </h3>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {parsed.operations.map((op, i) => (
              <div
                key={i}
                className="p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getOperationTitle(op)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {getOperationDescription(op)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      getOperationTypeColor(op.type)
                    }`}
                  >
                    {op.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed && (
        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>
            Network: <span className="font-mono">{parsed.network}</span>
          </p>
          <p>
            Fee: {parsed.fee} stroops
          </p>
          {parsed.memo && (
            <p>
              Memo ({parsed.memoType}):{' '}
              <span className="font-mono">{parsed.memo}</span>
            </p>
          )}
          <p className="font-mono text-[10px] break-all">
            Source: {parsed.source}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide details' : 'Show full transaction details'}
          </button>

          {expanded && (
            <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] overflow-x-auto">
              <code>{summaryText}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function getOperationTitle(op: { type: string; details: Record<string, string> }): string {
  const { type, details } = op;
  switch (type) {
    case 'payment':
      return `Send ${formatAmountHumanReadable(details.amount, details.asset)} to ${truncateAddress(details.destination)}`;
    case 'createAccount':
      return `Create account ${truncateAddress(details.destination)}`;
    case 'manageSellOffer':
      return `Place sell offer: ${details.amount} ${details.selling}`;
    case 'manageBuyOffer':
      return `Place buy offer: ${details.amount} ${details.buying}`;
    case 'pathPaymentStrictReceive':
      return `Send ${details.sendMax} ${details.sendAsset} to ${truncateAddress(details.destination)}`;
    case 'pathPaymentStrictSend':
      return `Send ${details.sendAmount} ${details.sendAsset} to ${truncateAddress(details.destination)}`;
    case 'setTrustline':
      return `Add trustline for ${details.asset}`;
    case 'manageData':
      return `Set data: ${details.name}`;
    case 'accountMerge':
      return `Merge account into ${truncateAddress(details.destination)}`;
    case 'invokeHostFunction':
      return `Contract interaction: ${truncateAddress(details.contractId)}`;
    case 'bumpSequence':
      return `Bump sequence`;
    default:
      return type;
  }
}

function getOperationDescription(op: { type: string; details: Record<string, string> }): string {
  const { type, details } = op;
  switch (type) {
    case 'payment':
      return `You are sending ${formatAmountHumanReadable(details.amount, details.asset)}`;
    case 'createAccount':
      return `Starting balance: ${details.startingBalance} XLM`;
    case 'manageSellOffer':
      return `Buying ${details.buying} at ${details.price} per unit`;
    case 'manageBuyOffer':
      return `Buying with ${details.selling} at ${details.price} per unit`;
    case 'invokeHostFunction':
      return details.function || 'Smart contract function call';
    default:
      return 'Review details before signing';
  }
}

function getOperationTypeColor(type: string): string {
  switch (type) {
    case 'payment':
    case 'createAccount':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'manageSellOffer':
    case 'manageBuyOffer':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'invokeHostFunction':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'setTrustline':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || 'unknown';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
