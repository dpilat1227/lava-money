import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Amount, Badge, Button, CategoryIcon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CATEGORIES, getCategory } from '@/lib/mock/categories';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatFullDate } from '@/lib/utils/date';

export default function TransactionDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, accounts, categorizeTransaction, setNote } = useFinance();
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
  const category = getCategory(tx.categoryId);
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
          <DetailRow label="Account" value={account ? `${account.name} •••• ${account.mask}` : '—'} />
          {account && <DetailRow label="Institution" value={getInstitution(account.institutionId).name} />}
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

        {pickingCategory && (
          <FlatList
            data={CATEGORIES.filter(c => c.group === 'expense')}
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
});
