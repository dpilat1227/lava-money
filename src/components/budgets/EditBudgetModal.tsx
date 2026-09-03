import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Button, CategoryIcon, GlassSurface, ProgressBar, Text } from '@/components/ui';
import { Breakpoints, Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency, formatPercent } from '@/lib/utils/currency';

const PRESET_AMOUNTS = [50, 100, 200, 500];

export function EditBudgetModal({
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
  // Same near/over thresholds as BudgetList/SpendCeilingChart -- the
  // preview bar is answering the exact same "how am I doing" question,
  // so it should traffic-light the same way instead of staying a flat
  // category color regardless of whether the typed-in limit would put
  // this category over budget.
  const previewOver = previewLimit > 0 && previewPct > 1;
  const previewNear = !previewOver && previewPct >= 0.85;
  const previewColor = previewOver ? Colors.red : previewNear ? Colors.amber : category.color;
  const { width } = useWindowDimensions();
  // A mouse-and-pointer surface doesn't need two thumb-width 50/50 buttons
  // stretched across a 360px card -- Linear's convention (right-aligned,
  // auto-width footer actions) reads as more deliberate at this width.
  // Mobile/narrow-web keeps the full-width symmetric pair, which is the
  // right call for touch.
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <GlassSurface style={styles.modalCard}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={32} />
              <Text variant="title" color={category.color}>
                {category.name}
              </Text>
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

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              {PRESET_AMOUNTS.map(amount => (
                <Pressable
                  key={amount}
                  onPress={() => setValue(String(amount))}
                  style={[styles.presetChip, Number(value) === amount && styles.presetChipActive]}
                >
                  <Text variant="caption" weight="semibold" color={Number(value) === amount ? Colors.orange : Colors.text3}>
                    ${amount}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: Spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text variant="micro" color={Colors.text4}>
                  {formatCurrency(currentSpent, { compact: true })} spent so far
                </Text>
                <Text variant="micro" color={previewOver ? Colors.red : previewNear ? Colors.amber : Colors.text4}>
                  {previewLimit > 0 ? formatPercent(previewPct) : '—'}
                </Text>
              </View>
              <ProgressBar pct={previewPct} color={previewColor} animate={false} />
            </View>

            <View style={[styles.footerRow, isWideWeb && styles.footerRowWide]}>
              <View style={!isWideWeb && { flex: 1 }}>
                <Button label="Cancel" variant="secondary" onPress={onClose} fullWidth={!isWideWeb} />
              </View>
              <View style={!isWideWeb && { flex: 1 }}>
                <Button label="Save" onPress={() => onSave(previewLimit)} fullWidth={!isWideWeb} />
              </View>
            </View>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: Fonts.displayBold,
    padding: 0,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  presetChipActive: {
    backgroundColor: Colors.orangeSoft,
    borderColor: `${Colors.orange}55`,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  footerRowWide: { justifyContent: 'flex-end' },
});
