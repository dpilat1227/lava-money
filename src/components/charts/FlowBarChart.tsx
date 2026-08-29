import React from 'react';
import { View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import type { MonthlyFlow } from '@/hooks/useFinanceSelectors';
import { formatMonthLabel } from '@/lib/utils/date';
import { Text } from '@/components/ui/Text';

const HEIGHT = 120;

export function FlowBarChart({ data }: { data: MonthlyFlow[] }) {
  const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: HEIGHT, gap: 10 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, flexDirection: 'row', justifyContent: 'center' }}>
            <View
              style={{
                width: 8,
                borderRadius: 4,
                height: Math.max(3, (d.income / max) * HEIGHT),
                backgroundColor: Colors.green,
              }}
            />
            <View
              style={{
                width: 8,
                borderRadius: 4,
                height: Math.max(3, (d.expense / max) * HEIGHT),
                backgroundColor: Colors.orange,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 10 }}>
        {data.map((d, i) => (
          <Text key={i} variant="micro" color={Colors.text4} style={{ flex: 1, textAlign: 'center' }}>
            {formatMonthLabel(d.month + '-01')}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: Spacing.md, justifyContent: 'center' }}>
        <Legend color={Colors.green} label="Income" />
        <Legend color={Colors.orange} label="Expense" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="micro" color={Colors.text3}>
        {label}
      </Text>
    </View>
  );
}
