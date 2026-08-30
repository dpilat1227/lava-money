import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { CATEGORIES, findCategory } from '@/lib/mock/categories';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { Text } from '@/components/ui/Text';

const SIZE = 148;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  data: { categoryId: string; total: number }[];
  centerLabel?: string;
  /** Merged fixed+custom category list, from `useFinance()`. Defaults to
   * the fixed list so existing call sites without custom categories keep
   * working unchanged. */
  categories?: Category[];
}

export function CategoryDonut({ data, centerLabel, categories = CATEGORIES }: Props) {
  const total = data.reduce((s, d) => s + d.total, 0);

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text variant="body" color={Colors.text3}>
          No spend recorded yet.
        </Text>
      </View>
    );
  }

  const segments = data.reduce<{ categoryId: string; total: number; dashLength: number; offset: number; color: string }[]>(
    (acc, d) => {
      const previous = acc[acc.length - 1];
      const offset = previous ? previous.offset + previous.dashLength : 0;
      const dashLength = (d.total / total) * CIRCUMFERENCE;
      return [...acc, { ...d, dashLength, offset, color: findCategory(categories, d.categoryId).color }];
    },
    []
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={Colors.surface2} strokeWidth={STROKE} fill="none" />
            {segments.map((s, i) => (
              <Circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={s.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${s.dashLength} ${CIRCUMFERENCE - s.dashLength}`}
                strokeDashoffset={-s.offset}
                strokeLinecap={segments.length > 1 ? 'butt' : 'round'}
              />
            ))}
          </G>
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" color={Colors.text3}>
            {centerLabel ?? 'Total'}
          </Text>
          <Text variant="title" weight="bold">
            {formatCurrency(total, { compact: true })}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, gap: 10 }}>
        {segments.slice(0, 5).map(s => (
          <View key={s.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
            <Text variant="caption" color={Colors.text2} style={{ flex: 1 }} numberOfLines={1}>
              {findCategory(categories, s.categoryId).name}
            </Text>
            <Text variant="caption" weight="semibold">
              {formatCurrency(s.total, { compact: true })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
