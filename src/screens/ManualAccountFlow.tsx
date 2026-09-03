import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { AccountType } from '@/lib/types';

type Step = 'form' | 'success';

const TYPE_OPTIONS: { type: AccountType; label: string; isDebt: boolean }[] = [
  { type: 'checking', label: 'Checking', isDebt: false },
  { type: 'savings', label: 'Savings', isDebt: false },
  { type: 'cash', label: 'Cash', isDebt: false },
  { type: 'investment', label: 'Investment', isDebt: false },
  { type: 'credit_card', label: 'Credit card', isDebt: true },
  { type: 'loan', label: 'Loan', isDebt: true },
];

export interface ManualAccountDraft {
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
}

/**
 * Hand-entry counterpart to `LinkAccountFlow` -- same shape (a short form,
 * then a success beat) so the two "add an account" paths feel like siblings
 * rather than one being the polished path and one being an afterthought.
 */
export function ManualAccountFlow({
  onComplete,
  onCancel,
}: {
  onComplete: (draft: ManualAccountDraft) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<Step>('form');
  const [draft, setDraft] = useState<ManualAccountDraft | null>(null);

  return (
    <View style={{ flex: 1 }}>
      {step === 'form' && (
        <FormStep
          onCancel={onCancel}
          onSubmit={d => {
            setDraft(d);
            setStep('success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
        />
      )}
      {step === 'success' && draft && <SuccessStep draft={draft} onContinue={() => onComplete(draft)} />}
    </View>
  );
}

function FormStep({ onCancel, onSubmit }: { onCancel?: () => void; onSubmit: (draft: ManualAccountDraft) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');

  const selected = TYPE_OPTIONS.find(o => o.type === type)!;
  const balanceNumber = Number(balance.replace(/[^0-9.-]/g, ''));
  const isValid = name.trim().length > 0 && balance.trim().length > 0 && !Number.isNaN(balanceNumber);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>
      {onCancel && (
        <Pressable onPress={onCancel} hitSlop={12} style={{ marginTop: Spacing.md }}>
          <Text variant="body" color={Colors.text3}>
            Cancel
          </Text>
        </Pressable>
      )}
      <Text variant="title" style={{ marginTop: Spacing.lg }}>
        Add manually
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: 4, marginBottom: Spacing.lg }}>
        Give it a name and a starting balance. You can add transactions or import a CSV afterward.
      </Text>

      <FieldLabel text="Account name" />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Chase Checking, Cash on hand"
        placeholderTextColor={Colors.text4}
        style={styles.input}
      />

      <FieldLabel text="Type" style={{ marginTop: Spacing.lg }} />
      <View style={styles.pillRow}>
        {TYPE_OPTIONS.map(opt => (
          <Pressable
            key={opt.type}
            onPress={() => setType(opt.type)}
            style={[styles.pill, opt.type === type && styles.pillActive]}
          >
            <Text variant="caption" weight="medium" color={opt.type === type ? Colors.orange : Colors.text2}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FieldLabel text={selected.isDebt ? 'Current balance owed' : 'Current balance'} style={{ marginTop: Spacing.lg }} />
      <TextInput
        value={balance}
        onChangeText={setBalance}
        placeholder="0.00"
        placeholderTextColor={Colors.text4}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      {type === 'credit_card' && (
        <>
          <FieldLabel text="Credit limit (optional)" style={{ marginTop: Spacing.lg }} />
          <TextInput
            value={creditLimit}
            onChangeText={setCreditLimit}
            placeholder="0.00"
            placeholderTextColor={Colors.text4}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </>
      )}

      <View style={{ marginTop: Spacing.xl }}>
        <Button
          label="Add account"
          fullWidth
          disabled={!isValid}
          onPress={() => {
            const rawBalance = Math.abs(balanceNumber);
            onSubmit({
              name: name.trim(),
              type,
              balance: selected.isDebt ? rawBalance : balanceNumber,
              creditLimit: creditLimit.trim() ? Number(creditLimit.replace(/[^0-9.]/g, '')) : undefined,
            });
          }}
        />
      </View>
    </ScrollView>
  );
}

function SuccessStep({ draft, onContinue }: { draft: ManualAccountDraft; onContinue: () => void }) {
  return (
    <View style={styles.centeredFlex}>
      <View style={styles.checkCircle}>
        <Icon name="check" size={30} color={Colors.green} />
      </View>
      <Text variant="title" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
        {draft.name} added
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: 4, textAlign: 'center' }}>
        Stored only on this device.
      </Text>
      <View style={{ marginTop: Spacing.xl, width: '100%', paddingHorizontal: Spacing.xl }}>
        <Button label="Done" fullWidth onPress={onContinue} />
      </View>
    </View>
  );
}

function FieldLabel({ text, style }: { text: string; style?: object }) {
  return (
    <Text variant="caption" color={Colors.text3} style={[{ marginBottom: 6 }, style]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  pillActive: {
    backgroundColor: Colors.orangeSoft,
    borderColor: Colors.orangeGlow,
  },
  centeredFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
