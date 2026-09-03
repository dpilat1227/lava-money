import React from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';

import { RecurringTeaserCard } from '@/components/insights/RecurringTeaserCard';
import { CashFlowCard } from '@/components/trends/CashFlowCard';
import { SpendingHeroCard } from '@/components/trends/SpendingHeroCard';
import { Atmosphere, ScreenHeader } from '@/components/ui';
import { DesktopTrends } from '@/components/web/DesktopTrends';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';

export default function TrendsScreen() {
  const { width } = useWindowDimensions();

  if (Platform.OS === 'web' && width >= Breakpoints.wide) {
    return <DesktopTrends />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Atmosphere />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
        <ScreenHeader title="Trends" />

        {/* More vertical breathing room than the old two-stacked-cards
            layout (Spacing.xl, not Spacing.lg) -- the original "everything
            packed in tight" complaint was as much about density between
            sections as within any one of them. Recurring & subscriptions
            moved to its own page (app/recurring.tsx) -- this is just the
            teaser pointing at it now, not the full card. */}
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl }}>
          <SpendingHeroCard />
          <CashFlowCard />
          <RecurringTeaserCard />
        </View>
      </ScrollView>
    </View>
  );
}
