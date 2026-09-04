import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AddBudgetChips } from '@/components/budgets/AddBudgetChips';
import { BudgetBreakdownCard } from '@/components/budgets/BudgetBreakdownCard';
import { BudgetHero } from '@/components/budgets/BudgetHero';
import { BudgetList } from '@/components/budgets/BudgetList';
import { EditBudgetModal } from '@/components/budgets/EditBudgetModal';
import { SmartSetupCard } from '@/components/budgets/SmartSetupCard';
import { Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { BudgetProgress } from '@/hooks/useFinanceSelectors';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Category } from '@/lib/types';
import { SUGGESTED_DEFAULTS } from '@/lib/utils/budgetSetup';

/**
 * Wide-web Budgets -- a real two-column layout (hero + list on the left,
 * "add a budget" on the right) instead of the mobile single stacked
 * column just centered in a wider frame. Shares every actual budget
 * component with the mobile screen (see components/budgets/) -- only the
 * arrangement differs.
 */
export function DesktopBudgets({
  progress,
  categories,
  unbudgeted,
  editing,
  onEdit,
  onSmartSetup,
}: {
  progress: BudgetProgress[];
  categories: Category[];
  unbudgeted: Category[];
  editing: string | null;
  onEdit: (categoryId: string | null) => void;
  onSmartSetup: () => void;
}) {
  const { setBudget } = useFinance();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
      <Text variant="display" style={{ fontSize: 28 }}>
        Budgets
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: 2 }}>
        This month
      </Text>

      {/* Design-audit-round-3: these used to be either/or (SmartSetupCard
          alone, centered, when there were no category budgets yet; the
          full two-column layout only once there were) -- which meant no
          way to reach the new savings/debt-payoff goal at all until
          someone had already set up a category budget, even though a
          goal is deliberately independent of that. The two-column layout
          always renders now; SmartSetupCard becomes an *additional*
          prompt at the top of the main column rather than a replacement
          for it. BudgetList/BudgetBreakdownCard already return null on
          their own when there's nothing to show them for. */}
      <View style={styles.row}>
        <View style={styles.mainCol}>
          {progress.length === 0 && (
            <View style={{ marginBottom: Spacing.lg }}>
              <SmartSetupCard onSmartSetup={onSmartSetup} />
            </View>
          )}
          <BudgetHero progress={progress} />
          <View style={{ marginTop: Spacing.lg }}>
            <BudgetList progress={progress} categories={categories} />
          </View>
        </View>
        <View style={styles.sideCol}>
          <AddBudgetChips categories={unbudgeted} onSelect={onEdit} />
          <View style={{ marginTop: Spacing.xl }}>
            <BudgetBreakdownCard />
          </View>
        </View>
      </View>

      {editing && (
        <EditBudgetModal
          categoryId={editing}
          currentLimit={progress.find(p => p.categoryId === editing)?.limit ?? SUGGESTED_DEFAULTS[editing] ?? 100}
          currentSpent={progress.find(p => p.categoryId === editing)?.spent ?? 0}
          onClose={() => onEdit(null)}
          onSave={limit => {
            setBudget(editing, limit);
            onEdit(null);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.xl, maxWidth: 1040, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
  row: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.xl, alignItems: 'flex-start' },
  mainCol: { flex: 1.6, minWidth: 320 },
  sideCol: { flex: 1, minWidth: 240 },
});
