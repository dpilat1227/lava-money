import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Card, GlassSurface, Icon, ProgressRing, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useCountUp } from '@/lib/hooks/useCountUp';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';
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
 * headline number stays remaining-budget framing, never Copilot's flatter
 * "$2,808 spent," since that's the actual question this screen exists to
 * answer.
 *
 * Design-audit pass: "Free to spend" tested as genuinely ambiguous --
 * reads to a first-time user like "money I'm free to blow on whatever,"
 * not "what's left in what I already budgeted." Copilot's own dashboard
 * answers the identical question with a plain "$1,907 left" -- borrowed
 * that exact word instead of inventing a phrase that needs explaining.
 *
 * Design-audit-round-3: "why $2720? Does it account for savings goals or
 * debt repayment?" -- it doesn't, and this app has no concept of either
 * today (no savings-goal or required-payment data model at all), so
 * actually answering "what should I have left after savings and debt" is
 * a real product decision, not a UI fix on top of this hero. What ships
 * now instead: an honest tap-to-reveal explainer (same pattern as
 * Settings' "Local-first, tap to see how") stating plainly what this
 * number does and doesn't include, rather than a number that looks
 * authoritative with no explanation behind it.
 */
export function BudgetHero({ progress }: { progress: BudgetProgress[] }) {
  const [showInfo, setShowInfo] = useState(false);
  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
  const totalLimit = progress.reduce((s, p) => s + p.limit, 0);
  const totalPct = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const overBudget = totalLimit > 0 && totalSpent > totalLimit;

  const heroLabel = totalLimit === 0 ? 'Spent this month' : overBudget ? 'Over budget' : 'Left to spend';
  const heroValue = totalLimit === 0 ? totalSpent : overBudget ? totalSpent - totalLimit : totalLimit - totalSpent;
  // Design-audit-round-3: was `heroColor`, applied to a `Badge` wrapping
  // the label -- now applied directly to the (un-badged) label text
  // itself, so the zero-budget case gets the neutral `text3` a plain
  // informational label wants, not the `text1` white that made sense for
  // a big number but reads oddly on a small caption-sized label.
  const heroLabelColor = totalLimit === 0 ? Colors.text3 : overBudget ? Colors.red : Colors.green;
  const animatedHeroValue = useCountUp(heroValue);

  // Simple linear day-of-month projection, same "no forecasting model, just
  // arithmetic on data already on hand" rule as NetWorthHero's trend caption.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedSpend = (totalSpent / dayOfMonth) * daysInMonth;
  const paceOverBudget = totalLimit > 0 && projectedSpend > totalLimit;
  const showPace = totalLimit > 0 && totalSpent > 0 && dayOfMonth >= 4;
  // Design-audit-round-3: "nothing actually changes on the budget screen"
  // after adding a fresh category was largely a data-timing artifact, not
  // a calculation bug -- spend is computed generically from transactions
  // (see useCurrentMonthSpendByCategory), so every category genuinely
  // shows $0 a few days into a new month, not just a newly-added one. The
  // fix is context, not a data change: say *why* it's $0 instead of
  // leaving a static ring that looks identical to "broken."
  const isEarlyMonth = totalLimit > 0 && totalSpent === 0 && dayOfMonth < 5;

  return (
    <Card level="raised" style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View style={{ flex: 1 }}>
          {/* Design-audit-round-3: un-badged -- same fix as NetWorthHero's
              change line. A pill here staged the *label* itself as a
              status pill next to a big neutral number; plain colored text
              (still communicates over/under via color, just without the
              bubble chrome) matches the hero-number treatment everywhere
              else in this pass. */}
          <Pressable onPress={() => setShowInfo(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
            <Text variant="subtitle" color={heroLabelColor}>
              {heroLabel}
            </Text>
            <Icon name="info" size={13} color={Colors.text4} />
          </Pressable>
          <Text variant="display" weight="bold" color={Colors.text1} style={{ marginTop: 4, fontSize: 40, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>
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

      {showPace ? (
        <Text variant="caption" color={paceOverBudget ? Colors.amber : Colors.text3}>
          On track to spend ~{formatCurrency(projectedSpend, { compact: true })} by month end
        </Text>
      ) : isEarlyMonth ? (
        <Text variant="caption" color={Colors.text3}>
          Just getting started this month -- nothing spent yet.
        </Text>
      ) : null}

      {showInfo && <WhatThisMeansModal onClose={() => setShowInfo(false)} />}
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
                Categories without a limit -- rent, debt payments, anything you haven't budgeted for -- aren't counted, even if you're already committed to spending them.
              </Text>
              <Text variant="caption" color={Colors.text4}>
                Savings goals and required payments aren't factored in yet -- for now, this is purely "budgeted minus spent."
              </Text>
            </View>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}
