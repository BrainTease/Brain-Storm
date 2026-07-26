/** Address formatting helpers, kept free of network and adapter concerns. */

/** `GABC…WXYZ` — short enough for a nav button, still recognisable. */
export function truncateAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
