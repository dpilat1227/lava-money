import React from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { RecurringGrid } from '@/components/insights/RecurringGrid';
import { Atmosphere, ScreenHeader, Text } from '@/components/ui';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { useRecurringInsights } from '@/hooks/useFinanceSelectors';
import { useTabBarBottomPadding } from '@/lib/hooks/useTabBarBottomPadding';

/**
 * IA restructure (design-audit-round-4): promoted from a pushed/modal
 * screen (reachable only via links buried in Activity/Home/Trends) to a
 * full bottom tab, replacing the retired "Trends" tab -- five tabs either
 * way, so the "a sixth would crowd the bar" objection that kept this off
 * the tab bar originally doesn't apply to a *swap*. Directly answers "it
 * should be way easier to find the recurring subscriptions" from review.
 * Web keeps reaching this exact same route through its sidebar's existing
 * "Recurring" nav item (see DesktopShell.tsx) -- (tabs)/_layout.tsx
 * already wraps every tab in the sidebar+content shell for web, so this
 * file only needs to handle the content, not chrome (same pattern as
 * budgets.tsx/index.tsx).
 */
export default function RecurringScreen() {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const tabBarBottomPadding = useTabBarBottomPadding();
  const insights = useRecurringInsights();

  const explainer = (
    // "What's the difference between subscriptions and recurring bills"
    // from review -- there's no data-model split, just one category
    // (`categoryId === 'subscriptions'`, see lib/utils/insights.ts) vs.
    // everything else recurring. Making that rule visible beats adding a
    // second field just to answer a question this one sentence resolves.
    <Text variant="caption" color={Colors.text4}>
      Detected automatically from your transaction history. &ldquo;Subscriptions&rdquo; are anything in your Subscriptions category; everything else recurring counts as a bill.
    </Text>
  );

  const body = (
    <View style={{ gap: Spacing.lg }}>
      {explainer}
      <RecurringGrid insights={insights} />
    </View>
  );

  if (isWideWeb) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webScroll}>
        <Text variant="display" style={{ fontSize: 28 }}>
          Recurring
        </Text>
        <View style={{ marginTop: Spacing.lg }}>{body}</View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Atmosphere />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}>
        <ScreenHeader title="Recurring" />
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>{body}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  webScroll: { padding: Spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
});
