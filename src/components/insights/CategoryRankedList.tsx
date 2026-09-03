import React from 'react';
import { View } from 'react-native';

import { Amount, CategoryIcon, ProgressBar, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * The ranked-list-with-share-bar pattern first built for Dashboard's "Top
 * categories" teaser, extracted so Budgets' new breakdown section and
 * Trends' "By category" view (replacing the donut) can reuse it instead of
 * three near-identical hand-rolled copies. A list beats a donut/pie here on
 * the merits, not just for consistency -- angle/area comparisons are
 * measurably harder to read than length once there are more than a
 * handful of categories, and this never has to decode a color against a
 * legend to know what a slice was.
 */
export function CategoryRankedList({
  items,
  categories,
  periodTotal,
  limit,
  iconSize = 30,
  emptyLabel = 'No spending yet.',
}: {
  items: { categoryId: string; total: number }[];
  categories: Category[];
  /** Denominator for each row's share bar -- usually the sum of `items`,
   * passed explicitly since some callers (Dashboard) only show the top N
   * of a larger set and still want shares relative to the *whole* period. */
  periodTotal: number;
  limit?: number;
  iconSize?: number;
  emptyLabel?: string;
}) {
  const rows = limit ? items.slice(0, limit) : items;
  // `limit` is meant for callers that deliberately show a "top N" teaser
  // next to their own "View all" link (Dashboard) -- if a caller passes
  // one *without* an escape hatch elsewhere on the page, slicing the list
  // and saying nothing about the rest reads as the full picture when it
  // isn't. Surface what got cut instead of hiding it.
  const hidden = limit ? items.slice(limit) : [];

  if (rows.length === 0) {
    return (
      <Text variant="caption" color={Colors.text4}>
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View style={{ gap: Spacing.lg }}>
      {rows.map(c => {
        const category = findCategory(categories, c.categoryId);
        const share = periodTotal > 0 ? c.total / periodTotal : 0;
        return (
          <View key={c.categoryId}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={iconSize} />
              {/* Copilot-redesign pass: category-color-as-text, same
                  convention as BudgetList -- this component is shared by
                  Dashboard's "Top categories," Budgets' breakdown, and
                  Trends' "By category" view, so the change lands in all
                  three at once. */}
              <Text variant="body" weight="medium" color={category.color} style={{ flex: 1, marginLeft: Spacing.sm }} numberOfLines={1}>
                {category.name}
              </Text>
              <Amount amount={-c.total} variant="body" />
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              <ProgressBar pct={share} color={category.color} height={5} animate={false} />
            </View>
          </View>
        );
      })}
      {hidden.length > 0 && (
        <Text variant="caption" color={Colors.text4}>
          +{hidden.length} more · {formatCurrency(hidden.reduce((s, c) => s + c.total, 0), { compact: true })}
        </Text>
      )}
    </View>
  );
}
