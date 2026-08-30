import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Amount, Badge, Card, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useUpcomingRecurring, useNetWorthHistory, useNetWorthSummary } from '@/hooks/useFinanceSelectors';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount, type Account } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullDate } from '@/lib/utils/date';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

export default function HomeScreen() {
  const router = useRouter();
  const { accounts, refreshAllLinked } = useFinance();
  const history = useNetWorthHistory(6);
  const summary = useNetWorthSummary();
  const upcoming = useUpcomingRecurring(4);

  const assetAccounts = accounts.filter(a => isAssetAccount(a.type));
  const liabilityAccounts = accounts.filter(a => !isAssetAccount(a.type));
  const attentionCount = accounts.filter(needsAttention).length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Overview" subtitle={formatFullDate(new Date().toISOString().slice(0, 10))} />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        {attentionCount > 0 && (
          <Pressable onPress={refreshAllLinked} style={styles.attentionBanner}>
            <Text variant="body" weight="semibold" color={Colors.amber}>
              {attentionCount === 1 ? '1 account needs' : `${attentionCount} accounts need`} attention
            </Text>
            <Text variant="caption" color={Colors.text3} style={{ marginTop: 2 }}>
              Balances may be out of date. Tap to refresh all connections.
            </Text>
          </Pressable>
        )}

        <Card>
          <Text variant="caption" color={Colors.text3}>
            Net worth
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            {formatCurrency(summary.netWorth)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Badge
              label={`${summary.change >= 0 ? '+' : ''}${formatCurrency(summary.change, { compact: true })} this month`}
              color={summary.change >= 0 ? Colors.green : Colors.red}
            />
          </View>
          <View style={{ marginTop: Spacing.lg }}>
            <NetWorthChart points={history} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" color={Colors.text3}>
              Assets
            </Text>
            <Text variant="title" weight="bold" color={Colors.green} style={{ marginTop: 4 }}>
              {formatCurrency(summary.assets, { compact: true })}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text variant="caption" color={Colors.text3}>
              Liabilities
            </Text>
            <Text variant="title" weight="bold" color={summary.liabilities > 0 ? Colors.red : Colors.text1} style={{ marginTop: 4 }}>
              {formatCurrency(summary.liabilities, { compact: true })}
            </Text>
          </Card>
        </View>

        <View>
          <SectionTitle title="Accounts" />
          <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
            {assetAccounts.map(a => <AccountRow key={a.id} account={a} balance={a.balance} />)}
            {liabilityAccounts.map(a => <AccountRow key={a.id} account={a} balance={-a.balance} />)}
          </View>
          <Pressable onPress={() => router.push('/link-account')} style={styles.addAccountRow}>
            <Text variant="body" color={Colors.orange} weight="semibold">
              + Add account
            </Text>
          </Pressable>
        </View>

        {upcoming.length > 0 && (
          <View>
            <SectionTitle title="Upcoming" />
            <Card style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
              {upcoming.map((r, i) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 6,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: Colors.border1,
                  }}
                >
                  <View>
                    <Text variant="body">{r.merchantName}</Text>
                    <Text variant="micro" color={Colors.text4}>
                      {new Date(r.nextExpectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Amount amount={r.averageAmount} variant="body" />
                </View>
              ))}
            </Card>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="subtitle" color={Colors.text2}>
      {title}
    </Text>
  );
}

function AccountRow({ account, balance }: { account: Account; balance: number }) {
  const router = useRouter();
  const institution = getInstitution(account.institutionId);
  const status = presentSyncStatus(account);
  return (
    <Pressable style={({ pressed }) => [styles.accountRow, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push(`/account/${account.id}`)}>
      <View style={[styles.institutionDot, { backgroundColor: institution.color }]} />
      <View style={{ flex: 1 }}>
        <Text variant="body">{account.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text variant="micro" color={Colors.text4} numberOfLines={1}>
            {status.label}
            {account.creditLimit ? ` · ${formatCurrency(account.creditLimit, { compact: true })} limit` : ''}
          </Text>
        </View>
      </View>
      <Amount amount={balance} variant="subtitle" neutral />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  attentionBanner: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.amberSoft,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  institutionDot: { width: 10, height: 10, borderRadius: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  addAccountRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
