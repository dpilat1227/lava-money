import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/lib/types';

export function AddBudgetChips({
  title = 'Add a budget',
  categories,
  onSelect,
}: {
  title?: string;
  categories: Category[];
  onSelect: (categoryId: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <View>
      <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.sm }}>
        {title}
      </Text>
      <View style={styles.grid}>
        {categories.map(c => (
          <Pressable key={c.id} onPress={() => onSelect(c.id)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
            <CategoryIcon id={c.id} emoji={c.emoji} color={c.color} size={22} />
            <Text variant="caption" weight="semibold" color={c.color} numberOfLines={1}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
});
