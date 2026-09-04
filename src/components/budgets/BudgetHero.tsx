import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { EditSavingsGoalModal } from '@/components/budgets/EditSavingsGoalModal';
import { Card, GlassSurface, Icon, ProgressBar, ProgressRing, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useSavingsGoalProgress, type BudgetProgress } from '@/hooks/useFinanceSelectors';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

/** Shared "how am I doing this month" hero -- one number that's either
 * "left to spend" or "over budget" (never a flat "total spent," which
 * doesn't answer the question a budget screen exists to answer), plus a
 * glanceable ring for "how far along am I." Same component on mobile and
 * `DesktopBudgets`, only the surrounding layout differs -- see
 * budgets.tsx / DesktopBudgets.tsx.
 *
 * Copilot-redesign pass: swapped the linear `ProgressBar` for a `ProgressRing`
 * for the category-budget ring (Copilot leads every "spent vs. total"
 * screen with exactly this shape). Kept our own remaining-budget framing
 * for the headline, though, never Copilot's flatter "$2,808 spent," since
 * that's the actual question this screen exists to answer.
 *
 * Design-audit-round-3, in two parts:
 *
 * 1. "Why $2,720? Does it account for savings goals or debt repayment?" --
 *    it didn't. Fixed by giving "left to spend" an honest denominator: a
 *    savings-or-debt-payoff goal's *full* monthly target now counts as
 *    committed from day one of the month, the same mechanism Monarch's
 *    default budgeting mode uses (subtract goal contributions before
 *    telling you what's free to spend) -- not "how much have you *already*
 *    saved" (which would let spending drift in other categories quietly
 *    erode the number without ever moving it).
 *
 * 2. Deliberately NOT a straight swap to "on track to save $X" as the
 *    hero, after actually thinking through what happens when someone
 *    opens this tab mid-decision ("can I afford this") vs. for a periodic
 *    check-in ("am I doing okay overall") -- those are different
 *    questions, and Monarch itself doesn't collapse them into one number
 *    either (their Flex Number stays the answer to the first; Goals
 *    tracking answers the second, separately). So: "left to spend" stays
 *    the hero, now honest; the goal's own progress gets equal visual
 *    weight right below it, not buried in a caption.
 */
export function BudgetHero({ progress }: { progress: BudgetProgress[] }) {
  const [showInfo, setShowInfo] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const { setSavingsGoal } = useFinance();
  const goalProgress = useSavingsGoalProgress();
  const goal = goalProgress.goal;

  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
  const totalLimit = progress.reduce((s, p) => s + p.limit, 0);

  const goalCommitment = goal?.monthlyTarget ?? 0;
  const effectiveLimit = Math.max(0, totalLimit - goalCommitment);
  const adjustedRemaining = totalLimit - totalSpent - goalCommitment;
  const overBudget = totalLimit > 0 && adjustedRemaining < 0;
  const totalPct = totalLimit === 0 ? 0 : effectiveLimit > 0 ? totalSpent / effectiveLimit : 1;

  const heroLabel = totalLimit === 0 ? 'Spent this month' : overBudget ? 'Over budget' : 'Left to spend';
  const heroValue = totalLimit === 0 ? totalSpent : overBudget ? Math.abs(adjustedRemaining) : adjustedRemaining;
  // Design-audit-round-3: un-badged -- a pill here staged the *label*
  // itself as a status pill next to a big neutral number; plain colored
  // text (still communicates over/under via color, just without the
  // bubble chrome) matches the hero-number treatment everywhere else in
  // this pass.
  const heroLabelColor = totalLimit === 0 ? Colors.text3 : overBudget ? Colors.red : Colors.green;
  const animatedHeroValue = useCountUp(heroValue);

  const now = new Date();
  const dayOfMonth = now.getDate();
  // Recurring-bill-aware projection (see projectMonthlyIncomeAndExpense's
  // doc) still needs a handful of real days on the board before it's more
  // trustworthy than noise -- same gate the old category-spend pace line
  // used, applied to the goal projection instead.
  const showGoalProjection = !!goal && dayOfMonth >= 4;
  const goalIsEarly = !!goal && dayOfMonth < 4;
  const goalPctBasis = showGoalProjection ? goalProgress.projected : goalProgress.actualSoFar;
  const goalPct = goal && goal.monthlyTarget > 0 ? goalPctBasis / goal.monthlyTarget : 0;
  const goalOnTrack = showGoalProjection && !!goal && goalProgress.projected >= goal.monthlyTarget;
  const vsLastMonthDelta = goal ? goalProgress.projected - goalProgress.lastMonthActual : 0;
  const goalVerb = goal?.type === 'debt_payoff' ? 'pay down' : 'save';
  const goalNoun = goal?.type === 'debt_payoff' ? 'paid down' : 'saved';

  return (
    <Card level="raised" style={{ gap: Spacing.lg }}>
      {/* Design-audit-round-4: "she expected to be able to click in to
          'Left to Spend' since other components at top of tabs are
          clickable" -- the only tap signifier here used to be a 13px `(i)`
          icon next to a label, easy to miss next to a hero-sized number
          that otherwise looks static. The whole row is one Pressable now,
          same "this entire hero responds to a tap" convention as every
          other hero-style card in the app. */}
      <Pressable onPress={() => setShowInfo(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="subtitle" color={heroLabelColor}>
              {heroLabel}
            </Text>
            <Icon name="info" size={13} color={Colors.text4} />
          </View>
          <Text variant="display" weight="bold" color={Colors.text1} style={{ marginTop: 4, fontSize: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
            {formatCurrency(animatedHeroValue)}
          </Text>
          <Text variant="caption" color={Colors.text3} style={{ marginTop: 8 }}>
            {totalLimit > 0
              ? `${formatCurrency(totalSpent, { compact: true })} spent of ${formatCurrency(totalLimit, { compact: true })}${
                  goal ? ` \u2014 ${formatCurrency(goalCommitment, { compact: true })} committed to ${goal.type === 'debt_payoff' ? 'debt payoff' : 'savings'}` : ''
                }`
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
      </Pressable>

      <View style={styles.goalDivider} />

      {!goal ? (
        <Pressable onPress={() => setEditingGoal(true)} style={styles.setGoalRow}>
          <Icon name="plusCircle" size={15} color={Colors.orange} />
          <Text variant="body" color={Colors.orange} weight="semibold">
            Set a savings or debt-payoff goal
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => setEditingGoal(true)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <Text
              variant="body"
              weight="semibold"
              color={!showGoalProjection ? Colors.text2 : goalOnTrack ? Colors.green : Colors.amber}
              style={{ flex: 1, marginRight: Spacing.sm }}
            >
              {!showGoalProjection
                ? `Goal: ${goalVerb} ${formatCurrency(goal.monthlyTarget, { compact: true })} this month`
                : goalOnTrack
                  ? `On track to ${goalVerb} ${formatCurrency(goalProgress.projected, { compact: true })}`
                  : `Projected to ${goalNoun} ${formatCurrency(Math.max(0, goalProgress.projected), { compact: true })} of your ${formatCurrency(goal.monthlyTarget, { compact: true })} goal`}
            </Text>
            <Icon name="chevronRight" size={12} color={Colors.text4} />
          </View>
          <ProgressBar pct={Math.min(1, Math.max(0, goalPct))} color={goalOnTrack || !showGoalProjection ? Colors.green : Colors.amber} height={6} animate={false} />
          <Text variant="caption" color={Colors.text4} style={{ marginTop: 6 }}>
            {goalIsEarly
              ? 'Just getting started this month.'
              : `${formatCurrency(goalProgress.actualSoFar, { compact: true })} ${goalNoun} so far \u00b7 ${vsLastMonthDelta >= 0 ? '+' : ''}${formatCurrency(vsLastMonthDelta, { compact: true })} vs. last month`}
          </Text>
        </Pressable>
      )}

      {showInfo && <WhatThisMeansModal onClose={() => setShowInfo(false)} />}
      {editingGoal && (
        <EditSavingsGoalModal
          currentGoal={goal}
          onClose={() => setEditingGoal(false)}
          onSave={g => {
            setSavingsGoal(g);
            setEditingGoal(false);
          }}
        />
      )}
    </Card>
  );
}

function WhatThisMeansModal({ onClose }: { onClose: () => void }) {
  useEscapeToClose(onClose);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}
        onPress={onClose}
      >
        <GlassSurface style={{ width: '100%', maxWidth: 380, padding: Spacing.xl }}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              <Text variant="title">What this number means</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="close" size={15} color={Colors.text3} />
              </Pressable>
            </View>
            <View style={{ gap: Spacing.md }}>
              <Text variant="body" color={Colors.text2}>
                Every monthly limit you've set, added up, minus what's been spent in those categories so far this month.
              </Text>
              <Text variant="body" color={Colors.text2}>
                If you've set a savings or debt-payoff goal below, its full monthly target counts as already spoken for from day one \u2014 same as a bill that hasn't posted yet still counts against what's left.
              </Text>
              <Text variant="caption" color={Colors.text4}>
                Categories without a limit \u2014 rent, anything you haven't budgeted for \u2014 still aren't counted here, even if you're already committed to spending them.
              </Text>
            </View>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  goalDivider: {
    height: 1,
    backgroundColor: Colors.border1,
  },
  setGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
});
