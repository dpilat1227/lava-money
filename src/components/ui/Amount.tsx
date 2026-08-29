import React from 'react';

import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/lib/utils/currency';
import { Text } from './Text';

interface Props {
  amount: number;
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
  showSign?: boolean;
  /** When true, spend (negative) renders muted instead of red -- useful in a
   * plain transaction list where every row being red would just be noise;
   * red is reserved for places that mean "over budget" or "debt." */
  neutral?: boolean;
}

export function Amount({ amount, variant = 'body', showSign = true, neutral = false }: Props) {
  const color = neutral ? Colors.text1 : amount > 0 ? Colors.green : amount < 0 ? Colors.text1 : Colors.text3;
  return (
    <Text variant={variant} weight="semibold" color={color} style={{ fontFamily: 'Inter_600SemiBold' }}>
      {formatCurrency(amount, { showSign })}
    </Text>
  );
}
