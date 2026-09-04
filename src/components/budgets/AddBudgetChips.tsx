import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon, Icon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/lib/types';

export function AddBudgetChips({
  title = 'Add a budget',
  categories,
  onSelect,
  onCreateNew,
}: {
  title?: string;
  categories: Category[];
  onSelect: (categoryId: string) => void;
  /** IA restructure (design-audit-round-4): "the add category feature
   * should be in Budgets, not Settings" -- a trailing chip here means
   * creating a category and giving it a budget can be one continuous
   * flow (see budgets.tsx's `handleCreateCategory`) instead of a round-
   * trip through Settings. Optional so DesktopBudgets/other callers that
   * don't wire this yet degrade to the old plain grid, not a crash. */
  onCreateNew?: () => void;
}) {
  if (categories.length === 0 && !onCreateNew) return null;

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
        {onCreateNew && (
          <Pressable onPress={onCreateNew} style={({ pressed }) => [styles.chip, styles.newChip, pressed && { opacity: 0.7 }]}>
            <Icon name="plusCircle" size={18} color={Colors.orange} />
            <Text variant="caption" weight="semibold" color={Colors.orange} numberOfLines={1}>
              New category
            </Text>
          </Pressable>
        )}
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
  // Dashed + transparent fill (vs. the solid chips above) so "create
  // something new" reads as visually distinct from "select an existing
  // category," not just a chip that happens to say different words.
  newChip: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: `${Colors.orange}55`,
  },
});
