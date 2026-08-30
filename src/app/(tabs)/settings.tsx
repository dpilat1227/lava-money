import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';
import { exportAllDataAsJson, exportTransactionsAsCsv } from '@/lib/utils/export';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

export default function SettingsScreen() {
  const router = useRouter();
  const { accounts, transactions, institutions, recurringSeries, budgets, resetAll, refreshAllLinked } = useFinance();
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

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
            })
          : await exportTransactionsAsCsv(transactions, accounts);
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
              Everything in Lava Finance — linked or manual — is stored only on this device. Nothing is uploaded
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
          <SectionLabel text="Appearance" />
          <Card>
            <Text variant="body">Dark</Text>
            <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
              Lava Finance is dark-only for now, to match LavaMesh.
            </Text>
          </Card>
        </View>

        <View>
          <SectionLabel text="About" />
          <Card style={{ gap: 10 }}>
            <InfoRow label="Version" value="0.2.0" />
            <InfoRow label="Bank connections" value="Simulated demo data" />
            <InfoRow label="Manual accounts" value="Real — yours to edit" />
            <InfoRow label="Built by" value="Lava Finance" />
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
    </ScrollView>
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
});
