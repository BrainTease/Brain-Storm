import { SorobanRpc } from '@stellar/stellar-sdk';

/**
 * Soroban XDR Decoding Utilities
 *
 * Centralized XDR decoding logic for Soroban contract return values.
 * Prevents duplication across multiple services and simplifies contract
 * result interpretation.
 */

/**
 * Decode a bigint return value from Soroban contract simulation.
 * Used by token balance queries and other numeric return types.
 *
 * @param simResult The simulation result from SorobanRpc
 * @returns The decoded bigint as a string, or '0' if not present
 */
export function decodeBigIntValue(
  simResult: SorobanRpc.Api.SimulateTransactionSuccessResponse
): string {
  const retVal = simResult.result?.retval;
  if (!retVal) return '0';
  try {
    return BigInt(retVal.value() as unknown as bigint).toString();
  } catch (err) {
    throw new Error(`Failed to decode bigint from Soroban response: ${err.message}`);
  }
}

/**
 * Decode a string return value from Soroban contract simulation.
 *
 * @param simResult The simulation result from SorobanRpc
 * @returns The decoded string, or undefined if not present
 */
export function decodeStringValue(
  simResult: SorobanRpc.Api.SimulateTransactionSuccessResponse
): string | undefined {
  const retVal = simResult.result?.retval;
  if (!retVal) return undefined;
  try {
    return retVal.value() as any;
  } catch (err) {
    throw new Error(`Failed to decode string from Soroban response: ${err.message}`);
  }
}

/**
 * Decode a boolean return value from Soroban contract simulation.
 *
 * @param simResult The simulation result from SorobanRpc
 * @returns The decoded boolean
 */
export function decodeBooleanValue(
  simResult: SorobanRpc.Api.SimulateTransactionSuccessResponse
): boolean {
  const retVal = simResult.result?.retval;
  if (!retVal) return false;
  try {
    return Boolean(retVal.value());
  } catch (err) {
    throw new Error(`Failed to decode boolean from Soroban response: ${err.message}`);
  }
}

/**
 * Decode a raw return value without type coercion.
 * Returns the raw scVal object for custom processing.
 *
 * @param simResult The simulation result from SorobanRpc
 * @returns The raw return value, or undefined if not present
 */
export function decodeRawValue(
  simResult: SorobanRpc.Api.SimulateTransactionSuccessResponse
): any {
  return simResult.result?.retval;
}
