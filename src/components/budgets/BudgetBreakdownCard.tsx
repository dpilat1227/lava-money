import React from 'react';
import { View } from 'react-native';

import { CategoryRankedList } from '@/components/insights/CategoryRankedList';
import { Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useSpendByPeriod } from '@/hooks/useFinanceSelectors';
import { useFinance } from '@/lib/store/FinanceContext';

/**
 * New breakdown section (redesign pass 2) -- every category with spend
 * this month, budgeted or not, so Budgets answers "what am I actually
 * spending on" as well as "how am I doing against my limits." The budget
 * list above only ever shows categories someone bothered to set a limit
 * for; this is the fuller picture next to it.
 *
 * `completeOnly` -- unlike the hero/list above (which must stay tied to the
 * real, live current month; that's the entire point of a budget), this
 * supplementary breakdown is happy to show last month's *full* picture
 * instead of two days of the new one. A "spending by category" card with
 * one $17 row on the 2nd of the month looked broken, not "early" -- this
 * always has a complete month's worth of rows to show instead, labeled with
 * the actual month so it's never mistaken for live data it isn't.
 */
export function BudgetBreakdownCard() {
  const { categories } = useFinance();
  const [period] = useSpendByPeriod('month', 1, { completeOnly: true });

  if (!period || period.total === 0) return null;

  return (
    // Design-audit-round-3: was a `Card level="flat"` -- this is a list
    // with its own title/subtitle already serving as the section label
    // (same job Settings' SectionLabel does), so the enclosing grey slab
    // added nothing but visual weight identical to every other card on
    // the screen. See the same note on BudgetList above.
    <View>
      <Text variant="subtitle" color={Colors.text2}>
        Spending by category
      </Text>
      <Text variant="caption" color={Colors.text4} style={{ marginTop: 2 }}>
        Last month ({period.label}), budgeted or not
      </Text>
      <View style={{ marginTop: Spacing.lg }}>
        {/* No limit here on purpose -- see the doc comment above, "every
            category with spend" is the entire point of this card, and
            there's nowhere else on Budgets a cut-off category would
            resurface. Naturally bounded anyway: there are only ever a
            couple dozen categories at most (built-ins + whatever custom
            ones someone's added), never an actually-long list. */}
        <CategoryRankedList items={period.byCategory} categories={categories} periodTotal={period.total} />
      </View>
    </View>
  );
}
