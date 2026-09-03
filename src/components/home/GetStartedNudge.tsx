import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Icon, IconBadge, Text } from '@/components/ui';
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
 */
export function GetStartedNudge() {
  const router = useRouter();
  const { accounts } = useFinance();
  const target = accounts[0];
  if (!target) return null;

  return (
    <Pressable
      onPress={() => router.push(`/account/${target.id}`)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          padding: Spacing.lg,
          borderRadius: 16,
          backgroundColor: Colors.surface1,
          borderWidth: 1,
          borderColor: Colors.border1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
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
    </Pressable>
  );
}
