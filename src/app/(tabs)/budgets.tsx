import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, CategoryIcon, ProgressBar, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useBudgetProgress } from '@/hooks/useFinanceSelectors';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency, formatPercent } from '@/lib/utils/currency';

export default function BudgetsScreen() {
  const { setBudget, categories, expenseCategories } = useFinance();
  const progress = useBudgetProgress();
  const [editing, setEditing] = useState<string | null>(null);

  const budgetedIds = new Set(progress.map(p => p.categoryId));
  const unbudgeted = expenseCategories.filter(c => !budgetedIds.has(c.id));

  const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
  const totalLimit = progress.reduce((s, p) => s + p.limit, 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Budgets" subtitle="This month" />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        <View style={styles.summaryRow}>
          <Text variant="body" color={Colors.text3}>
            {formatCurrency(totalSpent, { compact: true })} of {formatCurrency(totalLimit, { compact: true })}
          </Text>
          <Text variant="body" weight="semibold" color={totalSpent > totalLimit ? Colors.red : Colors.text2}>
            {totalLimit > 0 ? formatPercent(totalSpent / totalLimit) : '—'}
          </Text>
        </View>
        <ProgressBar pct={totalLimit > 0 ? totalSpent / totalLimit : 0} height={10} />

        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          {progress.map(p => (
            <Pressable key={p.categoryId} onPress={() => setEditing(p.categoryId)} style={styles.budgetRow}>
              <CategoryIcon emoji={findCategory(categories, p.categoryId).emoji} color={findCategory(categories, p.categoryId).color} size={34} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text variant="body">{findCategory(categories, p.categoryId).name}</Text>
                  <Text variant="caption" color={p.pct > 1 ? Colors.red : Colors.text3}>
                    {formatCurrency(p.spent, { compact: true })} / {formatCurrency(p.limit, { compact: true })}
                  </Text>
                </View>
                <ProgressBar pct={p.pct} color={findCategory(categories, p.categoryId).color} />
              </View>
            </Pressable>
          ))}
        </View>

        {unbudgeted.length > 0 && (
          <View style={{ marginTop: Spacing.lg }}>
            <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.sm }}>
              Add a budget
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {unbudgeted.map(c => (
                <Pressable key={c.id} onPress={() => setEditing(c.id)} style={styles.addChip}>
                  <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                  <Text variant="caption" color={Colors.text2}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {editing && (
        <EditBudgetModal
          categoryId={editing}
          currentLimit={progress.find(p => p.categoryId === editing)?.limit ?? 100}
          onClose={() => setEditing(null)}
          onSave={limit => {
            setBudget(editing, limit);
            setEditing(null);
          }}
        />
      )}
    </ScrollView>
  );
}

function EditBudgetModal({
  categoryId,
  currentLimit,
  onClose,
  onSave,
}: {
  categoryId: string;
  currentLimit: number;
  onClose: () => void;
  onSave: (limit: number) => void;
}) {
  const [value, setValue] = useState(String(currentLimit));
  const { categories } = useFinance();
  const category = findCategory(categories, categoryId);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <CategoryIcon emoji={category.emoji} color={category.color} size={32} />
            <Text variant="title">{category.name}</Text>
          </View>
          <Text variant="caption" color={Colors.text3} style={{ marginBottom: 6 }}>
            Monthly limit
          </Text>
          <View style={styles.amountInputRow}>
            <Text variant="title" color={Colors.text3}>
              $
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              autoFocus
              style={styles.amountInput}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" onPress={onClose} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save" onPress={() => onSave(Math.max(0, Number(value) || 0))} fullWidth />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border2,
    paddingBottom: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    color: Colors.text1,
    fontFamily: 'SpaceGrotesk_700Bold',
    padding: 0,
  },
});
