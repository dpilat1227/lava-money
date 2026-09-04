import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Icon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCountUp } from '@/lib/hooks/useCountUp';
import type { NetWorthPoint } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
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
 *
 * Design-audit-round-3: dropped the plain-language "mostly from X, which
 * grew Y" trend caption and the assets/liabilities *text line* entirely --
 * both were flagged as unreadable at `micro`/`text3-4` size, and "no one's
 * gonna read either of those" is a presentation problem a smaller caption
 * can't out-shrink its way out of. The assets/liabilities breakdown moved
 * to two proper stat tiles below the chart instead of a run-on sentence;
 * the "why" narrative is dropped from this default view rather than
 * further-shrunk (it's the one line that was actually the hardest to make
 * work at hero scale -- revisit as a tap-to-reveal detail if it's missed).
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

      {/* Design-audit-round-3: "Net worth" was `caption` (13px) sitting at
          the very top edge of the screen -- read as an afterthought label,
          not the header for the single biggest number on the app. One
          step up (`subtitle`, still muted) without going as large as
          Robinhood's own "Investing" label, which is a full section
          header on a page with more going on below it than this one. */}
      <Text variant="subtitle" color={Colors.text3}>
        Net worth
      </Text>
      {/* 60 -> 48: "a little too big" in review -- still the loudest thing
          on the screen by a wide margin, just not swallowing the range
          pills and chart below it on smaller phones. */}
      <Text variant="display" weight="bold" style={{ marginTop: 4, fontSize: 48, letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
        {formatCurrency(animatedNetWorth)}
      </Text>

      {/* Design-audit-round-3: dropped the green/red pill background --
          Robinhood's own reference screenshot ("+$922.47 (12.76%) All
          time") is plain colored text with an icon, no bubble. A pill
          badges the *label* itself as a status; this is supporting detail
          under a hero number that's already unambiguous at a glance. */}
      <View style={styles.changeRow}>
        <Icon name={trendUp ? 'arrowUpRight' : 'arrowDownRight'} size={14} color={trendColor} />
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

      {/* Design-audit-round-3: replaces the old single `micro`/`text4`
          run-on sentence ("Assets $52K - Liabilities $9K - Across 3
          accounts...") -- "no one is gonna read either of those" was the
          actual complaint, and a smaller/denser version of the same
          sentence wouldn't have fixed that. Two stat tiles (same
          label-over-value-with-a-divider language `CashFlowCard` already
          uses for Income/Spending) give each number its own legible
          space instead of packing both into one clause. */}
      <View style={styles.statTilesRow}>
        <View style={styles.statTile}>
          <Text variant="micro" color={Colors.text4} style={styles.statLabel}>
            Assets
          </Text>
          <Text variant="subtitle" weight="semibold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatCurrency(assets, { compact: true })}
          </Text>
        </View>
        <View style={styles.statTileDivider} />
        <View style={styles.statTile}>
          <Text variant="micro" color={Colors.text4} style={styles.statLabel}>
            Liabilities
          </Text>
          <Text variant="subtitle" weight="semibold" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatCurrency(liabilities, { compact: true })}
          </Text>
        </View>
      </View>

      <Text variant="micro" color={Colors.text4} style={{ marginTop: Spacing.md }}>
        Across {accountCount} account{accountCount === 1 ? '' : 's'}, calculated on this device
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

const styles = {
  changeRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 5,
    marginTop: Spacing.md,
  },
  // No more `marginLeft: -10` optical-alignment hack -- real padding on
  // the chips themselves (14/9 instead of 10/5) gives an honest 44pt-ish
  // tap target instead of clawing back space from a too-small one.
  rangeRow: { flexDirection: 'row' as const, justifyContent: 'flex-start' as const, gap: Spacing.xs, marginTop: Spacing.lg },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
  rangeChipActive: { backgroundColor: Colors.orangeSoft },
  // Design-audit-round-4: "the second section is assets and liabilities...
  // it's neither in a card or centered or anything else" -- the hero
  // number+chart above is deliberately full-bleed (Ember tenet 4's one
  // exception per screen), but everything *below* it on Home alternates
  // between bare and boxed with no stated reason. A soft contained
  // background (the same `surfaceSubtle` "barely-there" fill `resting`
  // cards use, not a hard card border) gives this its own visual unit
  // without competing with the hero number two lines above it.
  statTilesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statTile: { flex: 1 },
  statTileDivider: { width: 1, height: 28, backgroundColor: Colors.border1, marginHorizontal: Spacing.lg },
  statLabel: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};
