import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Button, GlassSurface, Icon, Text } from '@/components/ui';
import { Breakpoints, Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount, type SavingsGoal, type SavingsGoalType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';

const PRESET_AMOUNTS = [200, 500, 1000, 2000];

/**
 * New in the design-audit-round-3 pass -- mirrors EditBudgetModal's visual
 * language deliberately closely (same amount-input treatment, same preset
 * chips, same footer) so this reads as the same app's *other* number-entry
 * sheet, not a new pattern. One addition EditBudgetModal doesn't need: a
 * type picker, since a goal can be "save" or "pay down debt" -- see
 * SavingsGoal's doc in lib/types.ts for why both exist as equals rather
 * than debt payoff being a variant of savings.
 */
export function EditSavingsGoalModal({
  currentGoal,
  onClose,
  onSave,
}: {
  currentGoal: SavingsGoal | null;
  onClose: () => void;
  onSave: (goal: SavingsGoal) => void;
}) {
  const { accounts } = useFinance();
  const liabilityAccounts = accounts.filter(a => !isAssetAccount(a.type));

  const [type, setType] = useState<SavingsGoalType>(currentGoal?.type ?? 'save');
  const [value, setValue] = useState(currentGoal ? String(currentGoal.monthlyTarget) : '');
  const [debtAccountId, setDebtAccountId] = useState<string | undefined>(currentGoal?.debtAccountId ?? liabilityAccounts[0]?.id);

  const previewTarget = Math.max(0, Number(value) || 0);
  const isValid = previewTarget > 0 && (type === 'save' || !!debtAccountId);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      {/* Same keyboard-avoidance fix as EditBudgetModal -- built in from the
          start here rather than found later, now that it's a known class
          of bug for this app's numeric-entry modals. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <GlassSurface style={styles.modalCard}>
            <Pressable onPress={e => e.stopPropagation()}>
              <Text variant="title" style={{ marginBottom: 4 }}>
                Set a monthly goal
              </Text>
              <Text variant="caption" color={Colors.text3} style={{ marginBottom: Spacing.lg }}>
                Counted as committed before "left to spend" -- same idea as a bill that hasn't posted yet.
              </Text>

              <View style={styles.typeRow}>
                <Pressable onPress={() => setType('save')} style={[styles.typeChip, type === 'save' && styles.typeChipActive]}>
                  <Icon name="trendingUp" size={16} color={type === 'save' ? Colors.orange : Colors.text3} />
                  <Text variant="body" weight="semibold" color={type === 'save' ? Colors.text1 : Colors.text3}>
                    Save
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setType('debt_payoff');
                    if (!debtAccountId) setDebtAccountId(liabilityAccounts[0]?.id);
                  }}
                  disabled={liabilityAccounts.length === 0}
                  style={[styles.typeChip, type === 'debt_payoff' && styles.typeChipActive, liabilityAccounts.length === 0 && { opacity: 0.4 }]}
                >
                  <Icon name="arrowDownRight" size={16} color={type === 'debt_payoff' ? Colors.orange : Colors.text3} />
                  <Text variant="body" weight="semibold" color={type === 'debt_payoff' ? Colors.text1 : Colors.text3}>
                    Pay down debt
                  </Text>
                </Pressable>
              </View>

              {type === 'debt_payoff' && liabilityAccounts.length > 0 && (
                <View style={{ marginTop: Spacing.md }}>
                  <Text variant="caption" color={Colors.text3} style={{ marginBottom: 6 }}>
                    Which balance
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {liabilityAccounts.map(a => (
                      <Pressable
                        key={a.id}
                        onPress={() => setDebtAccountId(a.id)}
                        style={[styles.accountChip, debtAccountId === a.id && styles.accountChipActive]}
                      >
                        <Text variant="caption" weight="semibold" color={debtAccountId === a.id ? Colors.orange : Colors.text3}>
                          {a.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.lg, marginBottom: 6 }}>
                {type === 'save' ? 'Save per month' : 'Pay down extra per month'}
              </Text>
              <View style={styles.amountInputRow}>
                <Text variant="title" color={Colors.text3}>
                  $
                </Text>
                <TextInput value={value} onChangeText={setValue} keyboardType="numeric" autoFocus style={styles.amountInput} placeholder="0" placeholderTextColor={Colors.text4} />
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                {PRESET_AMOUNTS.map(amount => (
                  <Pressable
                    key={amount}
                    onPress={() => setValue(String(amount))}
                    style={[styles.presetChip, Number(value) === amount && styles.presetChipActive]}
                  >
                    <Text variant="caption" weight="semibold" color={Number(value) === amount ? Colors.orange : Colors.text3}>
                      {formatCurrency(amount, { compact: true })}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.footerRow, isWideWeb && styles.footerRowWide]}>
                <View style={!isWideWeb && { flex: 1 }}>
                  <Button label="Cancel" variant="secondary" onPress={onClose} fullWidth={!isWideWeb} />
                </View>
                <View style={!isWideWeb && { flex: 1 }}>
                  <Button
                    label="Save"
                    disabled={!isValid}
                    onPress={() => isValid && onSave({ type, monthlyTarget: previewTarget, debtAccountId: type === 'debt_payoff' ? debtAccountId : undefined })}
                    fullWidth={!isWideWeb}
                  />
                </View>
              </View>
            </Pressable>
          </GlassSurface>
        </Pressable>
      </KeyboardAvoidingView>
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
    maxWidth: 380,
    padding: Spacing.xl,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  typeChipActive: {
    backgroundColor: Colors.orangeSoft,
    borderColor: `${Colors.orange}55`,
  },
  accountChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  accountChipActive: {
    backgroundColor: Colors.orangeSoft,
    borderColor: `${Colors.orange}55`,
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
