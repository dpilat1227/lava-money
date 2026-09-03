import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecurringGrid } from '@/components/insights/RecurringGrid';
import { Atmosphere, Text } from '@/components/ui';
import { WebPageShell } from '@/components/web/DesktopShell';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { useRecurringInsights } from '@/hooks/useFinanceSelectors';

/**
 * Redesign-pass-2: "Recurring & subscriptions" moved off Trends into its
 * own page -- Copilot gives this a dedicated top-level tab for the same
 * reason (it answers a different question than a spending-over-time
 * chart: "what's already committed," not "what did I spend"). Not a new
 * bottom tab on native -- five tabs already fit the bar comfortably and a
 * sixth would crowd it, and mobile nav stays bottom-tabs per the redesign
 * brief -- so this is a pushed screen (same non-tab pattern as
 * review-categories.tsx), reachable from Activity's filter row, Dashboard's
 * Upcoming card, and a slim teaser on Trends. Web's sidebar has the room
 * for a persistent nav item, so it gets one (see DesktopShell.tsx).
 */
export default function RecurringScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  const insights = useRecurringInsights();

  const body = <RecurringGrid insights={insights} />;

  if (isWideWeb) {
    return (
      <WebPageShell>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webScroll}>
          <Text variant="display" style={{ fontSize: 28 }}>
            Recurring
          </Text>
          <Text variant="body" color={Colors.text3} style={{ marginTop: 2, marginBottom: Spacing.xl }}>
            Subscriptions and bills detected from your transaction history.
          </Text>
          {body}
        </ScrollView>
      </WebPageShell>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Atmosphere />
      <View style={styles.header}>
        <Text variant="title">Recurring</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>{body}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  webScroll: { padding: Spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
});
