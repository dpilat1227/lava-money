import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Card, Icon, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { Account, NetWorthPoint, Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { biggestNetWorthMover, netWorthOf } from '@/lib/utils/netWorth';

const GLOW_SIZE = 260;

/**
 * The Home screen's hero moment. Was previously a plain Card with a number
 * and a chart -- functional, but indistinguishable from any other finance
 * app's dashboard. Two things make this one read as "Lava Money" and not a
 * template: the ambient warm glow behind the number (an SVG radial
 * gradient in the brand orange, not a generic drop shadow), and the
 * ownership line under the change badge, which is the one sentence that
 * actually differentiates this app from every competitor screenshot on the
 * App Store -- so it earns a permanent spot on the screen users see first,
 * not a buried Settings toggle.
 */
export function NetWorthHero({
  netWorth,
  change,
  accountCount,
  history,
  accounts,
  transactions,
}: {
  netWorth: number;
  change: number;
  accountCount: number;
  history: NetWorthPoint[];
  accounts: Account[];
  transactions: Transaction[];
}) {
  const trendUp = change >= 0;
  const trendColor = trendUp ? Colors.green : Colors.red;
  const caption = buildTrendCaption(history, accounts, transactions);

  return (
    <Card level="raised" style={{ overflow: 'hidden', position: 'relative' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -GLOW_SIZE * 0.45, left: -GLOW_SIZE * 0.25 }}>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="netWorthGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={Colors.orange} stopOpacity={0.32} />
              <Stop offset="1" stopColor={Colors.orange} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#netWorthGlow)" />
        </Svg>
      </View>

      <Text variant="caption" color={Colors.text3}>
        Net worth
      </Text>
      <Text variant="display" style={{ marginTop: 4, fontSize: 40 }}>
        {formatCurrency(netWorth)}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <View style={[styles.changePill, { backgroundColor: trendUp ? Colors.greenSoft : Colors.redSoft, borderColor: `${trendColor}55` }]}>
          <Icon name={trendUp ? 'arrowUpRight' : 'arrowDownRight'} size={11} color={trendColor} />
          <Text variant="micro" weight="bold" color={trendColor}>
            {formatCurrency(Math.abs(change), { compact: true })}
          </Text>
        </View>
        <Text variant="micro" color={Colors.text4}>
          this month
        </Text>
      </View>

      <Text variant="micro" color={Colors.text4} style={{ marginTop: 10 }}>
        Across {accountCount} account{accountCount === 1 ? '' : 's'} · calculated on this device, never uploaded
      </Text>

      <View style={{ marginTop: Spacing.lg }}>
        <NetWorthChart points={history} />
      </View>

      {caption && (
        <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.md }}>
          {caption}
        </Text>
      )}
    </Card>
  );
}

/** The one Origin-adjacent idea worth shipping now (see the
 * home-dashboard-design-direction canvas): a plain-language sentence about
 * *why* net worth moved, built entirely from data already on hand -- no
 * projection, no forecast, just "here's the biggest driver." */
function buildTrendCaption(history: NetWorthPoint[], accounts: Account[], transactions: Transaction[]): string | null {
  if (history.length < 2) return null;

  const past = netWorthOf(history[0]);
  const current = netWorthOf(history[history.length - 1]);
  if (past === 0) return null;

  const pct = ((current - past) / Math.abs(past)) * 100;
  const monthsSpan = history.length - 1;
  const direction = pct >= 0 ? 'Up' : 'Down';

  const mover = biggestNetWorthMover(accounts, transactions, monthsSpan);
  if (!mover || Math.abs(mover.delta) < 1) {
    return `${direction} ${Math.abs(pct).toFixed(0)}% over the last ${monthsSpan} months.`;
  }

  const verb = mover.delta >= 0 ? 'grew' : 'fell';
  return `${direction} ${Math.abs(pct).toFixed(0)}% over the last ${monthsSpan} months — mostly from ${mover.account.name}, which ${verb} ${formatCurrency(Math.abs(mover.delta), { compact: true })} in that span.`;
}

const styles = {
  changePill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
};
