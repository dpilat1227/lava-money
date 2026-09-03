import React from 'react';
import type { TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/lib/utils/currency';
import { Text } from './Text';

interface Props {
  amount: number;
  variant?: 'display' | 'title' | 'subtitle' | 'body' | 'caption';
  showSign?: boolean;
  /** When true, spend (negative) renders muted instead of red -- useful in a
   * plain transaction list where every row being red would just be noise;
   * red is reserved for places that mean "over budget" or "debt." */
  neutral?: boolean;
  /** Escape hatch for the rare hero-sized usage (an account balance hero,
   * e.g.) that needs a bigger number than any fixed `variant` gives --
   * merged after the variant/color/tabular-nums base style, same pattern
   * NetWorthHero's raw `Text` usage already relies on. */
  style?: TextStyle;
}

export function Amount({ amount, variant = 'body', showSign = true, neutral = false, style }: Props) {
  const color = neutral ? Colors.text1 : amount > 0 ? Colors.green : amount < 0 ? Colors.text1 : Colors.text3;
  return (
    <Text
      variant={variant}
      weight="semibold"
      color={color}
      style={[{ fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }, style]}
    >
      {formatCurrency(amount, { showSign })}
    </Text>
  );
}
