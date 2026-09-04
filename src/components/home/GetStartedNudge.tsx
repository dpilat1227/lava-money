import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Card, Icon, IconBadge, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';

/**
 * Shown only when every account exists but has zero transactions on it --
 * the state right after onboarding, before a first manual entry, import, or
 * bank-link refresh. Without this, Home just quietly shows a $0-everything
 * net worth card and an empty accounts list with no next step, which reads
 * as broken rather than "new." Same "here's exactly one thing to do next"
 * job as `NeedsAttentionCard`, reusing its row language (icon + title +
 * subtitle + chevron) so it doesn't introduce a fourth card style.
 *
 * Design-audit-round-3: this used to hand-roll a `Pressable` with its own
 * inline `surface1` fill instead of using the shared `Card` -- harmless on
 * its own, but it meant this one card wouldn't have picked up the
 * `resting` retint above for free the next time that token changes. Now it
 * does, like every other secondary card.
 */
export function GetStartedNudge() {
  const router = useRouter();
  const { accounts } = useFinance();
  const target = accounts[0];
  if (!target) return null;

  return (
    <Card level="resting" onPress={() => router.push(`/account/${target.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <IconBadge name="plusCircle" color={Colors.orange} size={38} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="semibold">
          Add your first transaction
        </Text>
        <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
          Type one in by hand, or import a CSV export from your bank.
        </Text>
      </View>
      <Icon name="chevronRight" size={14} color={Colors.text4} />
    </Card>
  );
}
