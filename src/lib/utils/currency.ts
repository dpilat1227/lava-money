export function formatCurrency(amount: number, opts: { showSign?: boolean; compact?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const sign = opts.showSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : amount < 0 ? '-' : '';

  if (opts.compact && abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k.toFixed(k >= 10 ? 0 : 1)}k`;
  }

  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${formatted}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Shared by Activity and the account-detail transaction list -- was
 * duplicated in both call sites, which is how the "+" sign and the
 * single-transaction-day guard (see callers) drifted out of sync between
 * them. One copy now; fix it once, it's fixed everywhere.
 */
export function daySubtotalLabel(txs: { amount: number }[]): string {
  const net = txs.reduce((s, t) => s + t.amount, 0);
  return `${formatCurrency(net, { showSign: true, compact: true })} net`;
}
