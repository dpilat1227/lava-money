import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Amount } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { NetWorthPoint } from '@/lib/types';
import { hasEnoughHistoryForChart } from '@/lib/mock/sampleChartData';

const GLOW_SIZE = 220;

/**
 * Non-credit-card account analog of Home's `NetWorthHero` -- same "number
 * floats directly on the background, chart bleeds full-width behind/below
 * it, no card box" treatment (Brex's Banking screen), scoped to one
 * account instead of the whole net worth. Credit cards get `CardArt`
 * instead (an actual card graphic makes more sense there than a chart of
 * one card's balance); this is for checking/savings/investment/loan/cash.
 * Skips the chart entirely rather than fabricating sample data when there
 * isn't enough real history yet -- unlike the flagship Home hero, showing
 * a "Sample data" chart on one specific real account would read as
 * confusing rather than illustrative.
 */
export function AccountBalanceHero({
  balance,
  color,
  history,
}: {
  balance: number;
  color: string;
  history: NetWorthPoint[];
}) {
  const showChart = hasEnoughHistoryForChart(history);

  return (
    <View style={{ position: 'relative', alignItems: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -GLOW_SIZE * 0.42, left: '50%', marginLeft: -GLOW_SIZE / 2 }}>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="accountGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#accountGlow)" />
        </Svg>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Amount amount={balance} variant="display" neutral style={{ fontSize: 46, letterSpacing: -0.5 }} />
      </View>

      {showChart && (
        <View style={{ width: '100%', marginTop: Spacing.lg }}>
          <NetWorthChart points={history} />
        </View>
      )}
    </View>
  );
}
