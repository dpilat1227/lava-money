import React from 'react';
import { View } from 'react-native';

import { Badge, Card, ProgressRing, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { formatCurrency } from '@/lib/utils/currency';
import type { BudgetProgress } from '@/hooks/useFinanceSelectors';

/** Shared "how am I doing this month" hero -- one number that's either
 * "left to spend" or "over budget" (never a flat "total spent," which
 * doesn't answer the question a budget screen exists to answer), plus a
 * glanceable ring for "how far along am I," and a plain-language month-end
 * pace projection. Same component on mobile and `DesktopBudgets`, only the
 * surrounding layout differs -- see budgets.tsx / DesktopBudgets.tsx.
 *
 * Copilot-redesign pass: swapped the linear `ProgressBar` for a `ProgressRing`
 * (Copilot leads every "spent vs. total" screen -- Categories, Recurrings,
 * Goals -- with exactly this shape; a ring reads "how far along" faster
 * than a bar at a glance, and pairs naturally with a number in its center).
 * Kept our own framing decision from the earlier pass, though -- the
 * headline number stays remaining-budget framing via `Badge`, never
 * Copilot's flatter "$2,808 spent," since that's the actual question this
 * screen exists to answer.
 *
 * Design-audit pass: "Free to spend" tested as genuinely ambiguous --
 * reads to a first-time user like "money I'm free to blow on whatever,"
 * not "what's left in what I already budgeted." Copilot's own dashboard
 * answers the identical question with a plain "$1,907 left" -- borrowed
 * that exact word instead of inventing a phrase that needs explaining.
 */
export function BudgetHero({ progress }: { progress: BudgetProgress[] }) {
  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
  const totalLimit = progress.reduce((s, p) => s + p.limit, 0);
  const totalPct = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const overBudget = totalLimit > 0 && totalSpent > totalLimit;

  const heroLabel = totalLimit === 0 ? 'Spent this month' : overBudget ? 'Over budget' : 'Left to spend';
  const heroValue = totalLimit === 0 ? totalSpent : overBudget ? totalSpent - totalLimit : totalLimit - totalSpent;
  const heroColor = totalLimit === 0 ? Colors.text1 : overBudget ? Colors.red : Colors.green;
  const animatedHeroValue = useCountUp(heroValue);

  // Simple linear day-of-month projection, same "no forecasting model, just
  // arithmetic on data already on hand" rule as NetWorthHero's trend caption.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedSpend = (totalSpent / dayOfMonth) * daysInMonth;
  const paceOverBudget = totalLimit > 0 && projectedSpend > totalLimit;
  const showPace = totalLimit > 0 && totalSpent > 0 && dayOfMonth >= 4;

  return (
    <Card level="raised" style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View style={{ flex: 1 }}>
          {/* Redesign-pass-2: the number itself used to be colored green/red
              at display size, which read oddly at that scale (a giant block
              of saturated color) and made this hero look unrelated to
              NetWorthHero's own treatment right above it on Dashboard. Same
              fix as that hero: keep the number neutral, move the status into
              a small colored pill instead -- and show the real number
              ("$3,400"), not a compacted "$3.4k", for the one figure this
              screen exists to answer. */}
          {totalLimit > 0 ? (
            <Badge label={heroLabel} color={heroColor} />
          ) : (
            <Text variant="caption" color={Colors.text3}>
              {heroLabel}
            </Text>
          )}
          <Text variant="display" weight="bold" color={Colors.text1} style={{ marginTop: 8, fontSize: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
            {formatCurrency(animatedHeroValue)}
          </Text>
          <Text variant="caption" color={Colors.text3} style={{ marginTop: 8 }}>
            {totalLimit > 0
              ? `${formatCurrency(totalSpent, { compact: true })} spent of ${formatCurrency(totalLimit, { compact: true })} across ${progress.length} categor${progress.length === 1 ? 'y' : 'ies'}`
              : 'No budgets set yet -- add one below.'}
          </Text>
        </View>

        {totalLimit > 0 && (
          <ProgressRing pct={totalPct} size={88} strokeWidth={9} color={Colors.green}>
            <Text variant="subtitle" weight="bold" color={overBudget ? Colors.red : Colors.text1} style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(totalPct * 100)}%
            </Text>
          </ProgressRing>
        )}
      </View>

      {showPace && (
        <Text variant="caption" color={paceOverBudget ? Colors.amber : Colors.text3}>
          On track to spend ~{formatCurrency(projectedSpend, { compact: true })} by month end
        </Text>
      )}
    </Card>
  );
}
