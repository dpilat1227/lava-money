import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { SampleTag } from '@/components/ui/SampleTag';
import { Text } from '@/components/ui/Text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { SpendGranularity, SpendPeriod } from '@/hooks/useFinanceSelectors';
import { buildSampleSpendByPeriod } from '@/lib/mock/sampleChartData';
import { formatCurrency } from '@/lib/utils/currency';

const DEFAULT_HEIGHT = 120;
/** Budgets don't carry history (we only know today's limit, not what it
 * was 3 months ago), so the ceiling line is one flat benchmark applied
 * retroactively across every bar -- "if this were your budget, here's which
 * periods would have cleared it" -- rather than Copilot's own stepped line
 * (which tracks their budget's *actual* history, data we don't have). */
const WEEKS_PER_MONTH = 4.345;

interface Props {
  periods: SpendPeriod[];
  granularity: SpendGranularity;
  /** Total *monthly* budget across every category with a limit set, 0 if
   * none. Scaled to whatever `granularity` the chart is plotting. 0 means
   * "no budget data" -- bars fall back to a single neutral accent color
   * instead of a green/amber/red split that would have nothing real to
   * measure against. */
  monthlyCeiling: number;
  /** Set when `monthlyCeiling` is already expressed at the chart's current
   * `granularity` (e.g. a live "average of what's plotted" reference line,
   * which by definition is already weekly for a weekly chart) -- skips the
   * month<->granularity conversion below, which assumes the opposite: a
   * fixed monthly number that needs converting *to* the current view.
   * Mixing the two up quietly divides/multiplies an already-correct number
   * a second time. */
  ceilingIsPrescaled?: boolean;
  /** Caption prefix for the reference line -- defaults to "Budget" for the
   * per-category budget-ceiling case this was originally built for.
   * Callers using a non-budget reference line (see `ceilingIsPrescaled`)
   * should pass something honest instead, e.g. "Avg." */
  ceilingLabel?: string;
  /** Controlled selection -- `null`/`undefined` means "nothing tapped,"
   * every bar renders at full opacity. Lives in the parent so Home/Trends
   * can each decide what "selected" does. */
  selectedKey?: string | null;
  onSelectPeriod?: (period: SpendPeriod) => void;
  height?: number;
  sample?: boolean;
}

/**
 * Copilot's own "Monthly spending" chart, adapted: a boundary line marks
 * a reference total, bars color themselves green/amber/red by whether
 * that period cleared it -- states "am I over or under" at a glance, which
 * the category-segmented stacked bars this replaces never did (a shape
 * only answers "what did I spend on," a color answers "how am I doing").
 * "What did I spend on" still has a home -- the ranked category list this
 * chart's callers already show below it on selection.
 *
 * The reference line can mean one of two different things, and it matters
 * which: a chart scoped to a single category (this app has none today, but
 * the default props assume it -- a category's own limit and its own spend
 * are the same scope) has a real *budget* to compare against. Both of
 * today's actual callers (Home's SpendingCard, Trends' "Over time") plot
 * *total* spend across every category instead, which does not -- this
 * app's budgets are opt-in per-category, not a single household total, so
 * summing only the categories someone happened to budget and comparing
 * that against total spend (including rent, travel, everything never
 * budgeted) reads as "over budget" almost every period regardless of
 * whether the categories actually being managed are on track. Those two
 * callers pass a trailing average of total spend instead (see
 * `ceilingIsPrescaled`/`ceilingLabel`) -- an honest "vs. your typical
 * period" line rather than a fabricated "vs. your budget" one.
 */
export function SpendCeilingChart({
  periods,
  granularity,
  monthlyCeiling,
  ceilingIsPrescaled = false,
  ceilingLabel = 'Budget',
  selectedKey,
  onSelectPeriod,
  height = DEFAULT_HEIGHT,
  sample = false,
}: Props) {
  const plotPeriods = sample ? buildSampleSpendByPeriod(granularity, periods.length || 6) : periods;

  const ceiling =
    monthlyCeiling <= 0
      ? 0
      : ceilingIsPrescaled
        ? monthlyCeiling
        : granularity === 'week'
          ? monthlyCeiling / WEEKS_PER_MONTH
          : granularity === 'year'
            ? monthlyCeiling * 12
            : monthlyCeiling;

  const maxTotal = Math.max(...plotPeriods.map(p => p.total), ceiling, 1);
  const ceilingRatio = ceiling > 0 ? Math.min(1, ceiling / maxTotal) : null;

  const hasSelection = selectedKey != null;
  const labeledKey = selectedKey ?? plotPeriods[plotPeriods.length - 1]?.key;

  return (
    <View>
      {sample && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.sm }}>
          <SampleTag />
        </View>
      )}
      {/* Extra top headroom for the floating value label, same reasoning
          as the chart this replaces. */}
      <View style={{ height: height + 24 }}>
        {ceilingRatio != null && (
          // Was Colors.text3 at 0.55 opacity -- a near-invisible hairline
          // against saturated red/amber/green bars, which defeated the
          // point: the color coding says "over or under," this line is
          // supposed to show *where* the line actually is, and it needs to
          // be legible over the very bars it's judging to do that.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 24 + ceilingRatio * height,
              height: 2,
              backgroundColor: Colors.text1,
              opacity: 0.85,
            }}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 6 }}>
          {plotPeriods.map(period => {
            const isSelected = selectedKey === period.key;
            const isLabeled = period.key === labeledKey;
            const barHeight = Math.max(4, (period.total / maxTotal) * height);
            const dimmed = hasSelection && !isSelected;
            // Same near/over thresholds BudgetList/ProgressRing already use
            // for "how am I doing" color, applied here too instead of
            // inventing a second convention for the same question.
            const barColor =
              ceiling <= 0
                ? Colors.orange
                : period.total > ceiling
                  ? Colors.red
                  : period.total >= ceiling * 0.85
                    ? Colors.amber
                    : Colors.green;

            return (
              <Pressable
                key={period.key}
                disabled={!onSelectPeriod}
                onPress={() => {
                  if (!onSelectPeriod) return;
                  Haptics.selectionAsync().catch(() => {});
                  onSelectPeriod(period);
                }}
                style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                {isLabeled && period.total > 0 && (
                  <Text
                    variant="micro"
                    weight="bold"
                    color={isSelected ? Colors.orange : Colors.text2}
                    numberOfLines={1}
                    style={{ position: 'absolute', bottom: barHeight + 6, left: 0, right: 0, textAlign: 'center', fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(period.total, { compact: true })}
                  </Text>
                )}
                <View
                  style={{
                    width: '62%',
                    height: barHeight,
                    borderRadius: Radius.sm,
                    backgroundColor: barColor,
                    opacity: dimmed ? 0.35 : 1,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 6 }}>
        {plotPeriods.map(period => {
          const isSelected = selectedKey === period.key;
          return (
            <Text
              key={period.key}
              variant="micro"
              color={isSelected ? Colors.orange : Colors.text4}
              weight={isSelected ? 'bold' : 'regular'}
              style={{ flex: 1, textAlign: 'center' }}
              numberOfLines={1}
            >
              {period.label}
            </Text>
          );
        })}
      </View>
      {ceiling > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md }}>
          <View style={{ width: 14, height: 1, backgroundColor: Colors.text3, opacity: 0.55 }} />
          <Text variant="micro" color={Colors.text4}>
            {ceilingLabel}: {formatCurrency(ceiling, { compact: true })}/{granularity === 'week' ? 'wk' : granularity === 'year' ? 'yr' : 'mo'}
          </Text>
        </View>
      )}
    </View>
  );
}
