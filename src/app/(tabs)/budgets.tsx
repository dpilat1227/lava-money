import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';

import { AddBudgetChips } from '@/components/budgets/AddBudgetChips';
import { BudgetBreakdownCard } from '@/components/budgets/BudgetBreakdownCard';
import { BudgetHero } from '@/components/budgets/BudgetHero';
import { BudgetList } from '@/components/budgets/BudgetList';
import { EditBudgetModal } from '@/components/budgets/EditBudgetModal';
import { SmartSetupCard } from '@/components/budgets/SmartSetupCard';
import { Atmosphere, ScreenHeader } from '@/components/ui';
import { DesktopBudgets } from '@/components/web/DesktopBudgets';
import { Breakpoints, Spacing } from '@/constants/theme';
import { useBudgetProgress, useCurrentMonthSpendByCategory } from '@/hooks/useFinanceSelectors';
import { useTabBarBottomPadding } from '@/lib/hooks/useTabBarBottomPadding';
import { useFinance } from '@/lib/store/FinanceContext';
import { computeSmartBudgets, SUGGESTED_DEFAULTS } from '@/lib/utils/budgetSetup';

export default function BudgetsScreen() {
  const { width } = useWindowDimensions();
  const tabBarBottomPadding = useTabBarBottomPadding();
  const { setBudget, categories, expenseCategories } = useFinance();
  const progress = useBudgetProgress();
  const spendByCategory = useCurrentMonthSpendByCategory();
  const [editing, setEditing] = useState<string | null>(null);
  // Design-audit-round-3: session-local, not persisted -- "just added"
  // only needs to hold for as long as someone's still looking at the
  // screen where they added it. See BudgetList's `recentlyAddedIds` doc.
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());

  const budgetedIds = new Set(progress.map(p => p.categoryId));
  const unbudgeted = expenseCategories.filter(c => !budgetedIds.has(c.id));

  const handleSmartSetup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    for (const { categoryId, limit } of computeSmartBudgets(expenseCategories, spendByCategory)) {
      setBudget(categoryId, limit);
    }
  };

  if (Platform.OS === 'web' && width >= Breakpoints.wide) {
    return (
      <DesktopBudgets
        progress={progress}
        categories={categories}
        unbudgeted={unbudgeted}
        editing={editing}
        onEdit={setEditing}
        onSmartSetup={handleSmartSetup}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#080706' }}>
      <Atmosphere />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}>
        <ScreenHeader title="Budgets" subtitle="This month" />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
          {progress.length === 0 ? <SmartSetupCard onSmartSetup={handleSmartSetup} /> : <BudgetHero progress={progress} />}

          <BudgetList progress={progress} categories={categories} recentlyAddedIds={recentlyAddedIds} />

          <AddBudgetChips categories={unbudgeted} onSelect={setEditing} />

          {progress.length > 0 && <BudgetBreakdownCard />}
        </View>
      </ScrollView>

      {editing && (
        <EditBudgetModal
          categoryId={editing}
          currentLimit={progress.find(p => p.categoryId === editing)?.limit ?? SUGGESTED_DEFAULTS[editing] ?? 100}
          currentSpent={progress.find(p => p.categoryId === editing)?.spent ?? 0}
          onClose={() => setEditing(null)}
          onSave={limit => {
            // Only a genuinely new budget (wasn't in budgetedIds before this
            // save) earns the "New" tag -- editing an existing category's
            // limit shouldn't relabel a category that's been budgeted for
            // months just because someone tapped it to adjust the number.
            if (!budgetedIds.has(editing)) {
              setRecentlyAddedIds(prev => new Set(prev).add(editing));
            }
            setBudget(editing, limit);
            setEditing(null);
          }}
        />
      )}
    </View>
  );
}
