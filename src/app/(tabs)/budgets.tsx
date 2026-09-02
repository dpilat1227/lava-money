import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, CategoryIcon, GlassSurface, ProgressBar, ProgressRing, ScreenHeader, Text } from '@/components/ui';
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
  const totalPct = totalLimit > 0 ? totalSpent / totalLimit : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Budgets" subtitle="This month" />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        <Card level="raised" style={styles.summaryCard}>
          <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing pct={totalPct} />
            <View style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="title" weight="bold" color={totalSpent > totalLimit ? Colors.red : Colors.text1}>
                  {totalLimit > 0 ? formatPercent(totalPct) : '—'}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.lg }}>
            <Text variant="caption" color={Colors.text3}>
              Spent this month
            </Text>
            <Text variant="title" weight="bold" style={{ marginTop: 2 }}>
              {formatCurrency(totalSpent, { compact: true })}
            </Text>
            <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
              of {formatCurrency(totalLimit, { compact: true })} budgeted across {progress.length} categor{progress.length === 1 ? 'y' : 'ies'}
            </Text>
          </View>
        </Card>

        <View style={{ gap: Spacing.sm }}>
          {progress.map(p => {
            const category = findCategory(categories, p.categoryId);
            return (
              <Card key={p.categoryId} onPress={() => setEditing(p.categoryId)} style={styles.budgetRow}>
                <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={34} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text variant="body">{category.name}</Text>
                    <Text variant="caption" color={p.pct > 1 ? Colors.red : Colors.text3}>
                      {formatCurrency(p.spent, { compact: true })} / {formatCurrency(p.limit, { compact: true })}
                    </Text>
                  </View>
                  <ProgressBar pct={p.pct} color={category.color} />
                </View>
              </Card>
            );
          })}
        </View>

        {unbudgeted.length > 0 && (
          <View>
            <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.sm }}>
              Add a budget
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {unbudgeted.map(c => (
                <Pressable key={c.id} onPress={() => setEditing(c.id)} style={styles.addChip}>
                  <CategoryIcon id={c.id} emoji={c.emoji} color={c.color} size={22} />
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
          currentSpent={progress.find(p => p.categoryId === editing)?.spent ?? 0}
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
  currentSpent,
  onClose,
  onSave,
}: {
  categoryId: string;
  currentLimit: number;
  currentSpent: number;
  onClose: () => void;
  onSave: (limit: number) => void;
}) {
  const [value, setValue] = useState(String(currentLimit));
  const { categories } = useFinance();
  const category = findCategory(categories, categoryId);
  const previewLimit = Math.max(0, Number(value) || 0);
  const previewPct = previewLimit > 0 ? currentSpent / previewLimit : 0;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <GlassSurface style={styles.modalCard}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={32} />
              <Text variant="title">{category.name}</Text>
            </View>
            <Text variant="caption" color={Colors.text3} style={{ marginBottom: 6 }}>
              Monthly limit
            </Text>
            <View style={styles.amountInputRow}>
              <Text variant="title" color={Colors.text3}>
                $
              </Text>
              <TextInput value={value} onChangeText={setValue} keyboardType="numeric" autoFocus style={styles.amountInput} />
            </View>

            <View style={{ marginTop: Spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text variant="micro" color={Colors.text4}>
                  {formatCurrency(currentSpent, { compact: true })} spent so far
                </Text>
                <Text variant="micro" color={previewPct > 1 ? Colors.red : Colors.text4}>
                  {previewLimit > 0 ? formatPercent(previewPct) : '—'}
                </Text>
              </View>
              <ProgressBar pct={previewPct} color={category.color} animate={false} />
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancel" variant="secondary" onPress={onClose} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Save" onPress={() => onSave(previewLimit)} fullWidth />
              </View>
            </View>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    padding: Spacing.xl,
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
