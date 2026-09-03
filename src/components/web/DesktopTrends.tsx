import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RecurringTeaserCard } from '@/components/insights/RecurringTeaserCard';
import { SpendingHeroCard } from '@/components/trends/SpendingHeroCard';
import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/**
 * Wide-web Trends -- was a 2-column row (chart left, the full
 * `RecurringInsightsCard` squeezed into a ~380px side column). That side
 * column had to hold two stat cells, a warning banner, and up to 6
 * two-line rows in less width than the mobile version gets, which is
 * exactly backwards -- and it's an information-architecture problem, not
 * a density one: recurring bills answer "what's already committed," not
 * "how did I spend over time," so it moved to its own page
 * (app/recurring.tsx). The chart gets the whole canvas, and this is just
 * the teaser pointing at the real page.
 */
export function DesktopTrends() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
      <Text variant="display" style={{ fontSize: 28 }}>
        Trends
      </Text>

      <View style={styles.hero}>
        <SpendingHeroCard chartHeight={200} />
      </View>

      <View style={styles.recurring}>
        <RecurringTeaserCard />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.xl, maxWidth: 900, width: '100%', alignSelf: 'center', paddingBottom: Spacing.xxxl },
  hero: { marginTop: Spacing.xl },
  recurring: { marginTop: Spacing.section },
});
