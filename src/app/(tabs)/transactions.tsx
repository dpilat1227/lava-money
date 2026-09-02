import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { Amount, CategoryIcon, EmptyState, Icon, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGroupedTransactions } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Category, Transaction } from '@/lib/types';
import { formatDayLabel } from '@/lib/utils/date';

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const groups = useGroupedTransactions(query);
  const router = useRouter();
  const { categories } = useFinance();

  const sections = groups.map(g => ({ title: formatDayLabel(g.date), data: g.transactions }));

  return (
    <View style={styles.root}>
      <ScreenHeader title="Activity" />
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={16} color={Colors.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search merchants"
            placeholderTextColor={Colors.text4}
            style={styles.search}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={15} color={Colors.text4} />
            </Pressable>
          )}
        </View>
      </View>

      {sections.length === 0 ? (
        <EmptyState
          icon={<Icon name="search" size={26} color={Colors.text3} />}
          title="No transactions found"
          subtitle={query ? `Nothing matches "${query}" — try a different search term.` : 'Nothing to show yet.'}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderWrap}>
              <Text variant="caption" weight="semibold" color={Colors.text3} style={styles.sectionHeader}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => <TransactionRow tx={item} categories={categories} onPress={() => router.push(`/transaction/${item.id}`)} />}
        />
      )}
    </View>
  );
}

function TransactionRow({ tx, categories, onPress }: { tx: Transaction; categories: Category[]; onPress: () => void }) {
  const category = findCategory(categories, tx.categoryId);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  search: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
  },
  sectionHeaderWrap: {
    backgroundColor: Colors.bg,
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: Radius.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  rowPressed: {
    backgroundColor: Colors.surfaceCard,
  },
});
