/**
 * Ember rule (see docs/EMBER_DESIGN_SYSTEM.md, "numbers are typography
 * too"): every number on screen is one of three tiers, not a per-call-site
 * judgment call --
 *   - hero numbers & individual transaction amounts: full precision, cents
 *     always (`cents`, the default -- unchanged from before this option
 *     existed, so every existing call site keeps its exact behavior).
 *   - secondary stats & chart labels large enough to abbreviate: `compact`
 *     (`$4.4k`) once `abs >= 1000`.
 *   - derived aggregates under $1,000 (averages, rates) that don't warrant
 *     cent-level precision but also aren't "big" enough for `compact` to
 *     apply on its own (that flag is a no-op below $1,000 -- there was no
 *     way to ask for "round to a whole dollar" before this, which is
 *     exactly how Category Detail's "$2.3k Total spent" ended up next to
 *     "$254.12 Average per month" as *peer* numbers in one design-audit
 *     round): `precision: 'whole'`.
 */
export function formatCurrency(
  amount: number,
  opts: { showSign?: boolean; compact?: boolean; precision?: 'cents' | 'whole' } = {}
): string {
  const abs = Math.abs(amount);
  const sign = opts.showSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : amount < 0 ? '-' : '';

  if (opts.compact && abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k.toFixed(k >= 10 ? 0 : 1)}k`;
  }

  if (opts.precision === 'whole') {
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
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
