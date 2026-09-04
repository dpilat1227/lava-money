import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, View, useWindowDimensions } from 'react-native';

import { AddBudgetChips } from '@/components/budgets/AddBudgetChips';
import { AddCategoryModal } from '@/components/budgets/AddCategoryModal';
import { BudgetBreakdownCard } from '@/components/budgets/BudgetBreakdownCard';
import { BudgetHero } from '@/components/budgets/BudgetHero';
import { BudgetList } from '@/components/budgets/BudgetList';
import { EditBudgetModal } from '@/components/budgets/EditBudgetModal';
import { SmartSetupCard } from '@/components/budgets/SmartSetupCard';
import { CashFlowCard } from '@/components/trends/CashFlowCard';
import { SpendingHeroCard } from '@/components/trends/SpendingHeroCard';
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
  const { setBudget, addCustomCategory, categories, expenseCategories } = useFinance();
  const progress = useBudgetProgress();
  const spendByCategory = useCurrentMonthSpendByCategory();
  const [editing, setEditing] = useState<string | null>(null);
  // IA restructure (design-audit-round-4): "the add category feature
  // should be in Budgets, not Settings" -- see handleCreateCategory below
  // for why this chains straight into `editing` on save instead of just
  // closing.
  const [creatingCategory, setCreatingCategory] = useState(false);
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

  // Creating a category and setting its budget used to be two separate
  // trips (Settings to create, then back to Budgets to find it in
  // `AddBudgetChips` and tap it) -- this closes AddCategoryModal and opens
  // EditBudgetModal for the brand-new id in the same gesture, so "create a
  // budget for something not on the starter list" reads as one flow.
  const handleCreateCategory = (input: { name: string; emoji: string; color: string }) => {
    const id = addCustomCategory(input);
    if (!id) {
      Alert.alert('Category exists', `There's already a category named "${input.name}."`);
      return;
    }
    setCreatingCategory(false);
    setEditing(id);
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
        creatingCategory={creatingCategory}
        onStartCreateCategory={() => setCreatingCategory(true)}
        onCancelCreateCategory={() => setCreatingCategory(false)}
        onCreateCategory={handleCreateCategory}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#080706' }}>
      <Atmosphere />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}>
        <ScreenHeader title="Budgets" subtitle="This month" />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
          {/* Design-audit-round-3: these used to be either/or -- no category
              budgets meant no BudgetHero at all, which meant no way to
              reach the new savings/debt-payoff goal either, even though a
              goal is deliberately independent of whether any category has
              a limit set. Both render now; BudgetHero already has its own
              "no budgets yet" framing (`totalLimit === 0` -> "Spent this
              month," ring hidden) for exactly this case. */}
          {progress.length === 0 && <SmartSetupCard onSmartSetup={handleSmartSetup} />}
          <BudgetHero progress={progress} />

          <BudgetList progress={progress} categories={categories} recentlyAddedIds={recentlyAddedIds} />

          <AddBudgetChips categories={unbudgeted} onSelect={setEditing} onCreateNew={() => setCreatingCategory(true)} />

          {/* No longer gated on `progress.length > 0` -- this card answers
              "what am I spending on," independent of whether anything has
              a limit set yet, and now manages its own empty/sample state
              internally (IA restructure, design-audit-round-4). */}
          <BudgetBreakdownCard />

          {/* IA restructure (design-audit-round-4): the "Trends" tab is
              retired -- its "Over time" chart and Cash flow trend are
              supporting historical context for "am I managing my budget
              well," which is what this tab is for, not a separate,
              unclearly-scoped destination. See docs/EMBER_DESIGN_SYSTEM.md
              and the plan that shipped this pass for the full reasoning. */}
          <SpendingHeroCard />
          <CashFlowCard />
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

      {creatingCategory && <AddCategoryModal onClose={() => setCreatingCategory(false)} onSave={handleCreateCategory} />}
    </View>
  );
}
