import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { Amount, CategoryIcon, EmptyState, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGroupedTransactions } from '@/hooks/useFinanceSelectors';
import { getCategory } from '@/lib/mock/categories';
import type { Transaction } from '@/lib/types';
import { formatDayLabel } from '@/lib/utils/date';

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const groups = useGroupedTransactions(query);
  const router = useRouter();

  const sections = groups.map(g => ({ title: formatDayLabel(g.date), data: g.transactions }));

  return (
    <View style={styles.root}>
      <ScreenHeader title="Activity" />
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchants"
          placeholderTextColor={Colors.text4}
          style={styles.search}
        />
      </View>

      {sections.length === 0 ? (
        <EmptyState emoji="🔍" title="No transactions found" subtitle="Try a different search term." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="caption" color={Colors.text3} style={styles.sectionHeader}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => <TransactionRow tx={item} onPress={() => router.push(`/transaction/${item.id}`)} />}
        />
      )}
    </View>
  );
}

function TransactionRow({ tx, onPress }: { tx: Transaction; onPress: () => void }) {
  const category = getCategory(tx.categoryId);
  return (
    <Pressable style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <CategoryIcon emoji={category.emoji} color={category.color} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text variant="body" numberOfLines={1}>
          {tx.merchantName}
        </Text>
        <Text variant="micro" color={Colors.text4}>
          {category.name}
          {tx.isPending ? ' · Pending' : ''}
        </Text>
      </View>
      <Amount amount={tx.amount} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  search: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
});
