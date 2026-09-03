import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Icon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { isAssetAccount, type Account, type NetWorthPoint, type Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { biggestNetWorthMover, netWorthOf } from '@/lib/utils/netWorth';
import { hasEnoughHistoryForChart } from '@/lib/mock/sampleChartData';

const GLOW_SIZE = 260;

/**
 * The Home screen's hero moment. When we picked the redesign direction for
 * this screen we chose "net worth stays the hero, but gets an Apple-Card
 * style spend chart added below it" over the more extreme "Robinhood
 * minimalism" option -- so the *number* itself never actually got the full
 * Robinhood treatment. This is that pass: no card box (full-bleed against
 * the screen, not a card among cards), a bigger/plainer number, the range
 * pills directly under it instead of under the chart, and the change line
 * as plain colored text instead of a pill badge -- Robinhood's own "one
 * huge number, nothing competes with it" rule. The ambient warm glow (an
 * SVG radial gradient in the brand orange, not a generic drop shadow) and
 * the ownership line stay -- still the one sentence that differentiates
 * this app from every competitor screenshot on the App Store.
 */
interface RangeOption<M extends number> {
  label: string;
  months: M;
}

export function NetWorthHero<M extends number>({
  netWorth,
  change,
  accountCount,
  assets,
  liabilities,
  history,
  accounts,
  transactions,
  range,
  onRangeChange,
  rangeOptions,
}: {
  netWorth: number;
  change: number;
  accountCount: number;
  assets: number;
  liabilities: number;
  history: NetWorthPoint[];
  accounts: Account[];
  transactions: Transaction[];
  /** Chart time window -- lives in the parent (Home) since it drives which
   * `useNetWorthHistory(months)` query gets run, not just how this one
   * component renders. Optional so any other call site can keep passing a
   * fixed `history` without wiring a picker. */
  range?: M;
  onRangeChange?: (months: M) => void;
  rangeOptions?: readonly RangeOption<M>[];
}) {
  const trendUp = change >= 0;
  const trendColor = trendUp ? Colors.green : Colors.red;
  // `history` now plots weekly (see buildNetWorthHistory), so `history.length
  // - 1` is a week count, not a month count -- pass the actual selected
  // range down instead of re-deriving a now-wrong number from point count.
  const caption = buildTrendCaption(history, accounts, transactions, range ?? history.length - 1);
  const animatedNetWorth = useCountUp(netWorth);
  const chartIsSample = !hasEnoughHistoryForChart(history);

  return (
    <View style={{ position: 'relative' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -GLOW_SIZE * 0.4, left: -GLOW_SIZE * 0.32 }}>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="netWorthGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={Colors.orange} stopOpacity={0.24} />
              <Stop offset="1" stopColor={Colors.orange} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#netWorthGlow)" />
        </Svg>
      </View>

      <Text variant="caption" color={Colors.text3}>
        Net worth
      </Text>
      <Text variant="display" weight="bold" style={{ marginTop: 4, fontSize: 60, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
        {formatCurrency(animatedNetWorth)}
      </Text>

      <View style={[styles.changePill, { backgroundColor: trendUp ? Colors.greenSoft : Colors.redSoft }]}>
        <Icon name={trendUp ? 'arrowUpRight' : 'arrowDownRight'} size={13} color={trendColor} />
        <Text variant="body" weight="semibold" color={trendColor} style={{ fontVariant: ['tabular-nums'] }}>
          {formatCurrency(Math.abs(change), { compact: true })}
        </Text>
        <Text variant="body" color={Colors.text3}>
          this month
        </Text>
      </View>

      {rangeOptions && rangeOptions.length > 0 && (
        <View style={styles.rangeRow}>
          {rangeOptions.map(opt => (
            <Pressable
              key={opt.label}
              onPress={() => onRangeChange?.(opt.months)}
              style={[styles.rangeChip, range === opt.months && styles.rangeChipActive]}
            >
              <Text variant="caption" color={range === opt.months ? Colors.orange : Colors.text4} weight="semibold">
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ marginTop: Spacing.xl }}>
        <NetWorthChart points={history} sample={chartIsSample} />
      </View>

      {caption && (
        <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.lg }}>
          {caption}
        </Text>
      )}

      {/* Assets/Liabilities demoted from a boxed two-column mini-hero (each
          number at `title` size, its own divider) to one supporting line --
          "not sure what the value of it even is" was the actual complaint:
          it was staged like a second headline metric competing with net
          worth itself, when it's really just the two numbers net worth is
          computed from. Copilot gives this the same treatment -- a small
          bullet next to the chart, not its own section. */}
      <Text variant="micro" color={Colors.text4} style={{ marginTop: Spacing.sm }}>
        Assets {formatCurrency(assets, { compact: true })} · Liabilities {formatCurrency(liabilities, { compact: true })} · Across{' '}
        {accountCount} account{accountCount === 1 ? '' : 's'}, calculated on this device
        {/* "never uploaded" is only unconditionally true for the web demo --
            a real Plaid connection on native puts one thing on a server (an
            encrypted token, see Settings' Data & privacy explainer), so this
            line stays accurate instead of repeating a claim native can't
            fully back up. */}
        {Platform.OS === 'web' ? ', never uploaded' : ''}
      </Text>
    </View>
  );
}

/** The one Origin-adjacent idea worth shipping now (see the
 * home-dashboard-design-direction canvas): a plain-language sentence about
 * *why* net worth moved, built entirely from data already on hand -- no
 * projection, no forecast, just "here's the biggest driver." */
function buildTrendCaption(history: NetWorthPoint[], accounts: Account[], transactions: Transaction[], monthsSpan: number): string | null {
  if (history.length < 2) return null;

  const past = netWorthOf(history[0]);
  const current = netWorthOf(history[history.length - 1]);
  if (past === 0) return null;

  const pct = ((current - past) / Math.abs(past)) * 100;
  const direction = pct >= 0 ? 'Up' : 'Down';

  // Same-sign-as-`direction` mover only (see biggestNetWorthMover's doc) --
  // otherwise "mostly from X" can name an account moving the *opposite*
  // way from the headline it's supposedly explaining.
  const mover = biggestNetWorthMover(accounts, transactions, monthsSpan, direction === 'Up' ? 'up' : 'down');
  if (!mover || Math.abs(mover.delta) < 1) {
    return `${direction} ${Math.abs(pct).toFixed(0)}% over the last ${monthsSpan} months.`;
  }

  // `mover.delta` is the *net-worth-contribution* delta, not the account's
  // own balance delta -- for a liability account those are inverted (its
  // contribution is `-balance`, see netWorthContributionAsOf), so a credit
  // card whose contribution *grew* actually had its owed balance *fall*
  // (paid down). Wording this off the raw contribution sign for a liability
  // would say "Rewards Credit Card, which grew $6k" to describe debt that
  // was paid *down* -- correct account selection (fixed above), backwards
  // English. Flip the verb for liabilities so "grew/fell" always describes
  // the balance a reader actually sees on that account.
  const isAsset = isAssetAccount(mover.account.type);
  const verb = (isAsset ? mover.delta >= 0 : mover.delta < 0) ? 'grew' : 'fell';
  return `${direction} ${Math.abs(pct).toFixed(0)}% over the last ${monthsSpan} months — mostly from ${mover.account.name}, which ${verb} ${formatCurrency(Math.abs(mover.delta), { compact: true })} in that span.`;
}

const styles = {
  changePill: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    alignSelf: 'flex-start' as const,
    gap: 5,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  // No more `marginLeft: -10` optical-alignment hack -- real padding on
  // the chips themselves (14/9 instead of 10/5) gives an honest 44pt-ish
  // tap target instead of clawing back space from a too-small one.
  rangeRow: { flexDirection: 'row' as const, justifyContent: 'flex-start' as const, gap: Spacing.xs, marginTop: Spacing.lg },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
  rangeChipActive: { backgroundColor: Colors.orangeSoft },
};
