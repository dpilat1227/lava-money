import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface NetFlowPeriod {
  key: string;
  label: string;
  /** Signed -- positive means saved (income > spending) that period,
   * negative means a deficit. */
  value: number;
}

/** Fraction of the chart's height reserved for positive bars, growing up
 * from the zero line; the remainder is reserved for negative bars,
 * growing down from it. Fixed rather than computed from the actual
 * data's positive/negative mix -- most months are expected to be
 * positive (income > spending) with occasional dips, and letting the
 * split itself move around per-render would make the zero line jump
 * vertically between one render and the next, which reads as jittery
 * more than it reads as "more precise." */
const TOP_RATIO = 0.72;

/**
 * Design-audit-round-3: replaces the single-month, two-number "Income vs.
 * spending" comparison on Trends -- "is there a better visualization?"
 * Copilot's own Cash Flow chart answers this by plotting *net savings per
 * month* as a trend (green above the line, red below it for deficit
 * months) instead of one static snapshot, which is the strongest idea
 * from the reference set for this specific question: a single month's
 * income/spending tells you if that one month went well, a trend tells
 * you whether saving is a *pattern* or a fluke. `SpendCeilingChart` can't
 * do this -- it only knows how to grow bars up from a shared zero
 * baseline for all-positive values, so this is a small dedicated
 * primitive instead of overloading that one with a sign it was never
 * built to carry.
 */
export function NetFlowChart({ periods, height = 100 }: { periods: NetFlowPeriod[]; height?: number }) {
  const maxPositive = Math.max(1, ...periods.map(p => Math.max(0, p.value)));
  const maxNegative = Math.max(1, ...periods.map(p => Math.max(0, -p.value)));
  const topHeight = height * TOP_RATIO;
  const bottomHeight = height - topHeight;

  return (
    <View>
      <View style={{ height }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: bottomHeight, height: 1, backgroundColor: Colors.border2 }} />
        <View style={{ flexDirection: 'row', height: '100%', gap: 6 }}>
          {periods.map(p => {
            const isPositive = p.value >= 0;
            const barHeight = isPositive
              ? Math.max(3, (p.value / maxPositive) * topHeight)
              : Math.max(3, (-p.value / maxNegative) * bottomHeight);
            return (
              <View key={p.key} style={{ flex: 1, height: '100%' }}>
                <View
                  style={{
                    position: 'absolute',
                    left: '19%',
                    right: '19%',
                    bottom: isPositive ? bottomHeight : bottomHeight - barHeight,
                    height: barHeight,
                    borderRadius: Radius.sm,
                    backgroundColor: isPositive ? Colors.green : Colors.red,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 6 }}>
        {periods.map(p => (
          <Text key={p.key} variant="micro" color={Colors.text4} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
