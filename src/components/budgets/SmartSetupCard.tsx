import React from 'react';
import { View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Replaces the old "here are 12 empty rows, go fill them in" empty state --
 * the exact "too much work" complaint the redesign plan calls out. One tap
 * proposes a real limit for every category with actual spend (see
 * `computeSmartBudgets` in lib/utils/budgetSetup.ts), so the *first* thing
 * a new user sees on this screen is a finished budget, not a form.
 */
export function SmartSetupCard({ onSmartSetup }: { onSmartSetup: () => void }) {
  return (
    <Card level="raised" style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.orangeSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="pieChart" size={22} color={Colors.orange} />
      </View>
      <Text variant="title" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
        No budgets yet
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: Spacing.sm, textAlign: 'center', maxWidth: 320 }}>
        Set up a budget for every category you actually spend on, sized to what you&rsquo;ve spent this month -- one tap, nothing to type.
      </Text>
      <View style={{ marginTop: Spacing.lg, width: '100%', maxWidth: 280 }}>
        <Button label="Set up budgets automatically" fullWidth onPress={onSmartSetup} />
      </View>
      <Text variant="micro" color={Colors.text4} style={{ marginTop: Spacing.md, textAlign: 'center' }}>
        Or add one category at a time below
      </Text>
    </Card>
  );
}
