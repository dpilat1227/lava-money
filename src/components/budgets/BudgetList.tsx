import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, CategoryIcon, ProgressBar, StaggerItem, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import type { BudgetProgress } from '@/hooks/useFinanceSelectors';

export function BudgetList({
  progress,
  categories,
  onEditCategory,
}: {
  progress: BudgetProgress[];
  categories: Category[];
  onEditCategory: (categoryId: string) => void;
}) {
  if (progress.length === 0) return null;

  return (
    <Card level="flat" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
      {progress.map((p, i) => {
        const category = findCategory(categories, p.categoryId);
        const over = p.pct > 1;
        const near = !over && p.pct >= 0.85;
        const statusColor = over ? Colors.red : near ? Colors.amber : null;
        return (
          <StaggerItem key={p.categoryId} index={i}>
            <Pressable
              onPress={() => onEditCategory(p.categoryId)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.rowDivider,
                statusColor && { backgroundColor: `${statusColor}0c` },
                pressed && { opacity: 0.7 },
              ]}
            >
              {statusColor && <View style={[styles.accent, { backgroundColor: statusColor }]} />}
              <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={34} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  {/* Copilot-redesign pass: category name now renders in the
                      category's own color (status color wins when over/near
                      budget) instead of flat white/grey -- reinforces the
                      icon's color-coding at a glance instead of relying on
                      the icon alone to carry it. */}
                  <Text variant="body" weight="medium" color={statusColor ?? category.color}>
                    {category.name}
                  </Text>
                  <Text variant="caption" color={statusColor ?? Colors.text3} style={{ fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(p.spent, { compact: true })} / {formatCurrency(p.limit, { compact: true })}
                  </Text>
                </View>
                <ProgressBar pct={p.pct} color={statusColor ?? category.color} />
              </View>
            </Pressable>
          </StaggerItem>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
});
