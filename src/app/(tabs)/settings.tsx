import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { formatCurrency } from '@/lib/utils/currency';

export default function SettingsScreen() {
  const router = useRouter();
  const { accounts, institutions, unlinkAccount, resetAll } = useFinance();

  const confirmUnlink = (accountId: string, name: string) => {
    Alert.alert('Unlink account', `Remove ${name} and its transaction history from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlink', style: 'destructive', onPress: () => unlinkAccount(accountId) },
    ]);
  };

  const confirmReset = () => {
    Alert.alert('Reset all data', 'This clears every linked account and transaction on this device. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Settings" />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        <View>
          <SectionLabel text="Linked accounts" />
          <Card style={{ gap: Spacing.sm }}>
            {institutions.map(inst => (
              <View key={inst.id}>
                <Text variant="caption" color={Colors.text3} style={{ marginBottom: 4 }}>
                  {inst.name}
                </Text>
                {accounts
                  .filter(a => a.institutionId === inst.id)
                  .map(a => (
                    <Pressable key={a.id} onPress={() => confirmUnlink(a.id, a.name)} style={styles.accountRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body">{a.name}</Text>
                        <Text variant="micro" color={Colors.text4}>
                          •••• {a.mask}
                        </Text>
                      </View>
                      <Text variant="body" color={Colors.text3}>
                        {formatCurrency(a.balance, { compact: true })}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ))}
          </Card>
          <Pressable onPress={() => router.push('/link-account')} style={styles.linkButton}>
            <Text variant="body" color={Colors.orange} weight="semibold">
              + Link another account
            </Text>
          </Pressable>
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
            <InfoRow label="Version" value="0.1.0 (MVP)" />
            <InfoRow label="Data source" value="Simulated demo data" />
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
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  linkButton: { paddingVertical: Spacing.md, alignItems: 'center' },
  dangerRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
  },
});
