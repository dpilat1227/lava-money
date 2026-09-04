import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, CategoryIcon, Icon, ProgressBar, StaggerItem, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import type { Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import type { BudgetProgress } from '@/hooks/useFinanceSelectors';

type SortMode = 'spent' | 'pct' | 'recent';
/** Cycle order for the tap-to-change sort control below. */
const SORT_CYCLE: SortMode[] = ['spent', 'pct', 'recent'];
const SORT_LABELS: Record<SortMode, string> = { spent: 'Spent', pct: 'Closest to limit', recent: 'Recently added' };

export function BudgetList({
  progress,
  categories,
  recentlyAddedIds,
}: {
  progress: BudgetProgress[];
  categories: Category[];
  /** Session-local set of categories budgeted for the first time since
   * this screen mounted (see budgets.tsx) -- lets a just-added row say so
   * instead of rendering identically to a category that's been budgeted
   * for months (design-audit-round-3: "no indication it was just
   * created"). Optional/undefined outside Budgets' own mobile screen. */
  recentlyAddedIds?: Set<string>;
}) {
  const router = useRouter();
  // Design-audit-round-3: was always creation order (whatever `budgets`
  // happened to append in) -- "the budget categories should be sorted...
  // ideally user can toggle which view." Default to spent-descending
  // (Copilot's own default too -- it answers "where is my money actually
  // going" at a glance, which creation order never did).
  const [sortMode, setSortMode] = useState<SortMode>('spent');

  const sorted = useMemo(() => {
    // Carry the original index through the sort so "recent" has something
    // to sort *by* -- `useBudgetProgress` preserves the underlying
    // `budgets` array's order, and `SET_BUDGET` always appends a genuinely
    // new category to the end of that array (see FinanceContext's
    // reducer), so index order *is* creation order without needing a
    // dedicated `createdAt` field on `Budget`.
    const withIndex = progress.map((p, i) => ({ p, i }));
    switch (sortMode) {
      case 'pct':
        withIndex.sort((a, b) => b.p.pct - a.p.pct);
        break;
      case 'recent':
        withIndex.sort((a, b) => b.i - a.i);
        break;
      case 'spent':
      default:
        withIndex.sort((a, b) => b.p.spent - a.p.spent);
        break;
    }
    return withIndex.map(({ p }) => p);
  }, [progress, sortMode]);

  if (progress.length === 0) return null;

  const cycleSortMode = () => {
    Haptics.selectionAsync().catch(() => {});
    setSortMode(prev => SORT_CYCLE[(SORT_CYCLE.indexOf(prev) + 1) % SORT_CYCLE.length]);
  };

  return (
    // Design-audit-round-3: was a `Card level="flat"` -- see the same note
    // on Home's Accounts list (app/(tabs)/index.tsx). Rows already carry
    // their own `rowDivider`/`accent` styling below.
    <View>
      <View style={styles.headerRow}>
        <Pressable onPress={cycleSortMode} style={styles.sortButton} hitSlop={8}>
          <Text variant="micro" weight="semibold" color={Colors.text3}>
            Sorted by {SORT_LABELS[sortMode]}
          </Text>
          <Icon name="chevronDown" size={11} color={Colors.text4} />
        </Pressable>
        {/* Design-audit-round-3: Copilot shows "SPENT"/"BUDGET" as column
            headers once instead of every row spelling out what its own
            numbers are -- our rows keep the compact "$X / $Y" shorthand
            (not a full 3-column table, see the plan's design choice), but
            this still states once, up front, which number is which. */}
        <Text variant="micro" color={Colors.text4}>
          Spent / Budget
        </Text>
      </View>
      {sorted.map((p, i) => {
        const category = findCategory(categories, p.categoryId);
        const over = p.pct > 1;
        const near = !over && p.pct >= 0.85;
        const statusColor = over ? Colors.red : near ? Colors.amber : null;
        const isNew = recentlyAddedIds?.has(p.categoryId) ?? false;
        return (
          <StaggerItem key={p.categoryId} index={i}>
            {/* Design-audit-round-3: used to open EditBudgetModal directly
                -- Copilot lets you click into a category for its monthly
                history/yearly metrics/recurring/transactions, and tapping
                straight to a numeric-entry sheet had no equivalent at all.
                Editing the limit itself now happens *from* the category
                screen (see category/[id].tsx's "Edit budget" action);
                adding a brand-new budget (AddBudgetChips, below) still
                goes straight to the modal, since there's no history to
                show yet for a category that isn't budgeted. */}
            <Pressable
              onPress={() => router.push(`/category/${p.categoryId}`)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: Spacing.sm }}>
                    {/* Copilot-redesign pass: category name now renders in the
                        category's own color (status color wins when over/near
                        budget) instead of flat white/grey -- reinforces the
                        icon's color-coding at a glance instead of relying on
                        the icon alone to carry it. */}
                    <Text variant="body" weight="medium" color={statusColor ?? category.color} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {category.name}
                    </Text>
                    {isNew && <Badge label="New" color={Colors.orange} />}
                  </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
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
