import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount, Badge, Button, CategoryIcon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatFullDate } from '@/lib/utils/date';

const ENTRY_SOURCE_LABEL: Record<string, string> = {
  manual: 'Added by hand',
  import: 'Imported from CSV',
  linked: 'From bank connection',
};

export default function TransactionDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, accounts, categories, expenseCategories, categorizeTransaction, setNote, deleteTransaction } = useFinance();
  const [pickingCategory, setPickingCategory] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const tx = transactions.find(t => t.id === id);
  if (!tx) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text variant="body" color={Colors.text3}>
            Transaction not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const account = accounts.find(a => a.id === tx.accountId);
  const category = findCategory(categories, tx.categoryId);
  const note = noteDraft ?? tx.notes ?? '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>
        <View style={styles.centered}>
          <CategoryIcon emoji={category.emoji} color={category.color} size={56} />
          <Text variant="title" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            {tx.merchantName}
          </Text>
          <View style={{ marginTop: 6 }}>
            <Amount amount={tx.amount} variant="title" />
          </View>
          {tx.isPending && (
            <View style={{ marginTop: Spacing.sm }}>
              <Badge label="Pending" color={Colors.amber} />
            </View>
          )}
        </View>

        <View style={styles.detailCard}>
          <DetailRow label="Date" value={formatFullDate(tx.date)} />
          <DetailRow label="Account" value={account ? `${account.name}${account.source === 'manual' ? '' : ` •••• ${account.mask}`}` : '—'} />
          {account && <DetailRow label="Institution" value={getInstitution(account.institutionId).name} />}
          {tx.entrySource && <DetailRow label="Source" value={ENTRY_SOURCE_LABEL[tx.entrySource] ?? tx.entrySource} />}
        </View>

        <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          Category
        </Text>
        <Pressable onPress={() => setPickingCategory(v => !v)} style={styles.categoryRow}>
          <CategoryIcon emoji={category.emoji} color={category.color} size={30} />
          <Text variant="body" style={{ marginLeft: Spacing.md, flex: 1 }}>
            {category.name}
          </Text>
          <Text variant="body" color={Colors.text4}>
            {pickingCategory ? '▲' : 'Change ›'}
          </Text>
        </Pressable>

        {tx.categoryGuess && (
          <View style={styles.guessNote}>
            <Text variant="micro" color={Colors.text4}>
              Auto-categorized: {tx.categoryGuess.reason}
              {tx.categoryGuess.confidence === 'low' ? ' — low confidence, worth double-checking' : ''}
            </Text>
          </View>
        )}

        {pickingCategory && (
          <FlatList
            data={expenseCategories}
            keyExtractor={c => c.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: Spacing.sm }}
            contentContainerStyle={{ gap: Spacing.sm, marginTop: Spacing.sm }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.categoryOption, item.id === tx.categoryId && { borderColor: item.color }]}
                onPress={() => {
                  categorizeTransaction(tx.id, item.id);
                  setPickingCategory(false);
                }}
              >
                <Text style={{ fontSize: 15 }}>{item.emoji}</Text>
                <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        )}

        <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          Note
        </Text>
        <TextInput
          value={note}
          onChangeText={setNoteDraft}
          onEndEditing={() => setNote(tx.id, note)}
          placeholder="Add a note…"
          placeholderTextColor={Colors.text4}
          style={styles.noteInput}
          multiline
        />

        <View style={{ marginTop: Spacing.xl }}>
          <Button label="Done" fullWidth onPress={() => router.back()} />
        </View>

        <Pressable
          onPress={() => {
            Alert.alert('Delete transaction', `Remove "${tx.merchantName}" from your history?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  deleteTransaction(tx.id);
                  router.back();
                },
              },
            ]);
          }}
          style={styles.deleteRow}
        >
          <Text variant="body" color={Colors.red} weight="semibold">
            Delete transaction
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="body" color={Colors.text3}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  centered: { alignItems: 'center', marginBottom: Spacing.lg },
  detailCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  guessNote: { paddingHorizontal: Spacing.md, paddingTop: 6 },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: Colors.surface2,
  },
  noteInput: {
    minHeight: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
    padding: Spacing.md,
    color: Colors.text1,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  deleteRow: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
  },
});
