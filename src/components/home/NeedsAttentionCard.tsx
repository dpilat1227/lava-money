import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

interface AttentionItem {
  key: string;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

/**
 * Was two separately-styled colored banners stacked on top of each other
 * (an amber one for stale accounts, an orange one for category
 * suggestions) -- each individually fine, but together reading as
 * uncoordinated alert spam rather than one deliberate "here's what needs a
 * look" surface. Same information, one card, one header, rows instead of
 * duplicate banner chrome.
 */
export function NeedsAttentionCard({ attentionCount, suggestionCount, onRefreshAccounts }: { attentionCount: number; suggestionCount: number; onRefreshAccounts: () => void }) {
  const router = useRouter();

  const items: AttentionItem[] = [];
  if (attentionCount > 0) {
    items.push({
      key: 'attention',
      color: Colors.amber,
      title: `${attentionCount === 1 ? '1 account needs' : `${attentionCount} accounts need`} attention`,
      subtitle: 'Balances may be out of date. Tap to refresh all connections.',
      onPress: onRefreshAccounts,
    });
  }
  if (suggestionCount > 0) {
    items.push({
      key: 'suggestions',
      color: Colors.orange,
      title: `${suggestionCount} category suggestion${suggestionCount === 1 ? '' : 's'} to review`,
      subtitle: 'A few transactions look like they match a category rule.',
      onPress: () => router.push('/review-categories'),
    });
  }

  if (items.length === 0) return null;

  return (
    // Design-audit-round-3: secondary single-purpose card -- `resting`,
    // same reclassification as CashFlowCard/RecurringTeaserCard.
    <Card level="resting" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <Text variant="micro" weight="semibold" color={Colors.text3} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Needs a look
        </Text>
      </View>
      {items.map((item, i) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
              borderTopWidth: i === 0 ? 1 : 0,
              borderTopColor: Colors.border1,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="semibold" color={item.color}>
              {item.title}
            </Text>
            <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
              {item.subtitle}
            </Text>
          </View>
          <Text variant="body" color={item.color} weight="semibold">
            ›
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}
