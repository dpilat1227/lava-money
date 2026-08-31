import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CategoryIcon, Card, ScreenHeader, Text } from '@/components/ui';
import { ChartPalette, Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';
import { exportAllDataAsJson, exportTransactionsAsCsv } from '@/lib/utils/export';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

const EMOJI_CHOICES = ['🏷️', '🐾', '👶', '🎁', '🧾', '⚽', '📚', '🚙', '✂️', '💊', '🎓', '🖥️', '🎮', '🌱', '☕', '🎵', '🛠️', '🏖️'];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    accounts,
    transactions,
    institutions,
    recurringSeries,
    budgets,
    categories,
    customCategories,
    resetAll,
    refreshAllLinked,
    addCustomCategory,
    deleteCustomCategory,
  } = useFinance();
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);

  const linkedAccounts = accounts.filter(a => a.source === 'linked');
  const manualAccounts = accounts.filter(a => a.source === 'manual');
  const attentionCount = accounts.filter(needsAttention).length;

  const confirmReset = () => {
    Alert.alert('Reset all data', 'This clears every account and transaction on this device. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);
  };

  const runExport = async (kind: 'json' | 'csv') => {
    setExporting(kind);
    try {
      const ok =
        kind === 'json'
          ? await exportAllDataAsJson({
              institutions,
              accounts,
              transactions,
              recurringSeries,
              budgets,
              customCategories,
            })
          : await exportTransactionsAsCsv(transactions, accounts, categories);
      if (!ok) Alert.alert('Export unavailable', "Sharing isn't available on this device.");
    } catch {
      Alert.alert('Export failed', 'Something went wrong putting that file together.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Settings" />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        {linkedAccounts.length > 0 && (
          <View>
            <View style={styles.sectionLabelRow}>
              <SectionLabel text="Linked accounts" />
              <Pressable onPress={refreshAllLinked}>
                <Text variant="caption" color={attentionCount > 0 ? Colors.amber : Colors.text4} weight={attentionCount > 0 ? 'semibold' : 'medium'}>
                  {attentionCount > 0 ? `Refresh all (${attentionCount})` : 'Refresh all'}
                </Text>
              </Pressable>
            </View>
            <Card style={{ gap: Spacing.sm }}>
              {institutions
                .filter(inst => linkedAccounts.some(a => a.institutionId === inst.id))
                .map(inst => (
                  <View key={inst.id}>
                    <Text variant="caption" color={Colors.text3} style={{ marginBottom: 4 }}>
                      {inst.name}
                    </Text>
                    {linkedAccounts
                      .filter(a => a.institutionId === inst.id)
                      .map(a => {
                        const status = presentSyncStatus(a);
                        return (
                          <Pressable key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={styles.accountRow}>
                            <View style={{ flex: 1 }}>
                              <Text variant="body">{a.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                                <Text variant="micro" color={status.color}>
                                  {status.label}
                                </Text>
                              </View>
                            </View>
                            <Text variant="body" color={Colors.text3}>
                              {formatCurrency(a.balance, { compact: true })}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                ))}
            </Card>
          </View>
        )}

        {manualAccounts.length > 0 && (
          <View>
            <SectionLabel text="Manually tracked" />
            <Card style={{ gap: Spacing.sm }}>
              {manualAccounts.map(a => (
                <Pressable key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={styles.accountRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{a.name}</Text>
                    <Text variant="micro" color={Colors.text4}>
                      Manual · updated by you
                    </Text>
                  </View>
                  <Text variant="body" color={Colors.text3}>
                    {formatCurrency(a.balance, { compact: true })}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        <Pressable onPress={() => router.push('/link-account')} style={styles.linkButton}>
          <Text variant="body" color={Colors.orange} weight="semibold">
            + Add account
          </Text>
        </Pressable>

        <View>
          <SectionLabel text="Data & privacy" />
          <Card style={{ gap: Spacing.md }}>
            <Text variant="body" color={Colors.text2}>
              Everything in Lava Money — linked or manual — is stored only on this device. Nothing is uploaded
              anywhere unless you export it yourself.
            </Text>
            <View style={{ gap: Spacing.sm }}>
              <ExportRow
                label="Export all data (JSON)"
                sublabel="A full backup of every account and transaction."
                loading={exporting === 'json'}
                onPress={() => runExport('json')}
              />
              <ExportRow
                label="Export transactions (CSV)"
                sublabel="Opens in Excel, Sheets, or Numbers."
                loading={exporting === 'csv'}
                onPress={() => runExport('csv')}
              />
            </View>
          </Card>
        </View>

        <View>
          <View style={styles.sectionLabelRow}>
            <SectionLabel text="Categories" />
            <Pressable onPress={() => setAddingCategory(true)}>
              <Text variant="caption" color={Colors.orange} weight="semibold">
                + Add
              </Text>
            </Pressable>
          </View>
          <Card style={{ gap: Spacing.sm }}>
            {customCategories.length === 0 ? (
              <Text variant="body" color={Colors.text3}>
                No custom categories yet. The starter list covers most spending — add one for anything it&apos;s missing
                (Pets, Kids, Hobbies, whatever fits your life).
              </Text>
            ) : (
              customCategories.map(c => (
                <View key={c.id} style={styles.categoryRow}>
                  <CategoryIcon emoji={c.emoji} color={c.color} size={30} />
                  <Text variant="body" style={{ flex: 1, marginLeft: Spacing.md }}>
                    {c.name}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Delete category',
                        `Remove "${c.name}"? Any transactions or budgets using it move to "Other."`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteCustomCategory(c.id) },
                        ]
                      );
                    }}
                    hitSlop={8}
                  >
                    <Text variant="caption" color={Colors.text4}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>

        <View>
          <SectionLabel text="Appearance" />
          <Card>
            <Text variant="body">Dark</Text>
            <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
              Lava Money is dark-only for now, to match LavaMesh.
            </Text>
          </Card>
        </View>

        <View>
          <SectionLabel text="About" />
          <Card style={{ gap: 10 }}>
            <InfoRow label="Version" value="0.2.0" />
            <InfoRow label="Bank connections" value="Simulated demo data" />
            <InfoRow label="Manual accounts" value="Real — yours to edit" />
            <InfoRow label="Built by" value="Lava Money" />
          </Card>
        </View>

        <View>
          <SectionLabel text="Danger zone" />
          <Pressable onPress={confirmReset} style={styles.dangerRow}>
            <Text variant="body" color={Colors.red} weight="semibold">
              Reset all data
            </Text>
          </Pressable>
        </View>
      </View>

      {addingCategory && (
        <AddCategoryModal
          onClose={() => setAddingCategory(false)}
          onSave={input => {
            const id = addCustomCategory(input);
            if (!id) {
              Alert.alert('Category exists', `There's already a category named "${input.name}."`);
              return;
            }
            setAddingCategory(false);
          }}
        />
      )}
    </ScrollView>
  );
}

function AddCategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: { name: string; emoji: string; color: string }) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [color, setColor] = useState<string>(ChartPalette[0]);
  const isValid = name.trim().length > 0;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <CategoryIcon emoji={emoji} color={color} size={32} />
            <Text variant="title">New category</Text>
          </View>

          <Text variant="caption" color={Colors.text3} style={{ marginBottom: 6 }}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Pets"
            placeholderTextColor={Colors.text4}
            style={styles.modalInput}
            autoFocus
          />

          <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.md, marginBottom: 6 }}>
            Icon
          </Text>
          <View style={styles.emojiRow}>
            {EMOJI_CHOICES.map(e => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiChip, e === emoji && { borderColor: color, backgroundColor: `${color}18` }]}
              >
                <Text style={{ fontSize: 16 }}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.md, marginBottom: 6 }}>
            Color
          </Text>
          <View style={styles.emojiRow}>
            {ChartPalette.map(c => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, c === color && styles.colorSwatchActive]}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl }}>
            <View style={{ flex: 1 }}>
              <PlainButton label="Cancel" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainButton
                label="Save"
                primary
                disabled={!isValid}
                onPress={() => onSave({ name: name.trim(), emoji, color })}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Local, no-frills button -- avoids pulling in the shared `Button`
 * component's own margin/sizing assumptions for this one modal. */
function PlainButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        styles.plainButton,
        primary && { backgroundColor: Colors.orangeCta, borderColor: Colors.orangeCta },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text variant="body" weight="semibold" color={primary ? '#fff' : Colors.text2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ExportRow({ label, sublabel, loading, onPress }: { label: string; sublabel: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={styles.exportRow}>
      <View style={{ flex: 1 }}>
        <Text variant="body" color={Colors.orange} weight="semibold">
          {label}
        </Text>
        <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
          {sublabel}
        </Text>
      </View>
      {loading ? <ActivityIndicator size="small" color={Colors.orange} /> : <Text variant="body" color={Colors.text4}>›</Text>}
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text variant="subtitle" color={Colors.text2} style={{ marginBottom: Spacing.sm }}>
      {text}
    </Text>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="body" color={Colors.text3}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  linkButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  dangerRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
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
    backgroundColor: Colors.surface1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  modalInput: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: Colors.text1 },
  plainButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border2,
    backgroundColor: Colors.surface2,
  },
});
