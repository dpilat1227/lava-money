import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { Amount, Badge, Card, ScreenHeader, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useUpcomingRecurring, useNetWorthHistory, useNetWorthSummary } from '@/hooks/useFinanceSelectors';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullDate } from '@/lib/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const { accounts } = useFinance();
  const history = useNetWorthHistory(6);
  const summary = useNetWorthSummary();
  const upcoming = useUpcomingRecurring(4);

  const assetAccounts = accounts.filter(a => isAssetAccount(a.type));
  const liabilityAccounts = accounts.filter(a => !isAssetAccount(a.type));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
      <ScreenHeader title="Overview" subtitle={formatFullDate(new Date().toISOString().slice(0, 10))} />

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
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
            {assetAccounts.map(a => (
              <AccountRow key={a.id} accountId={a.id} name={a.name} mask={a.mask} balance={a.balance} institutionId={a.institutionId} />
            ))}
            {liabilityAccounts.map(a => (
              <AccountRow
                key={a.id}
                accountId={a.id}
                name={a.name}
                mask={a.mask}
                balance={-a.balance}
                institutionId={a.institutionId}
                creditLimit={a.creditLimit}
              />
            ))}
          </View>
          <Pressable onPress={() => router.push('/link-account')} style={styles.addAccountRow}>
            <Text variant="body" color={Colors.orange} weight="semibold">
              + Link another account
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

function AccountRow({
  name,
  mask,
  balance,
  institutionId,
  creditLimit,
}: {
  accountId: string;
  name: string;
  mask: string;
  balance: number;
  institutionId: string;
  creditLimit?: number;
}) {
  const institution = getInstitution(institutionId);
  return (
    <View style={styles.accountRow}>
      <View style={[styles.institutionDot, { backgroundColor: institution.color }]} />
      <View style={{ flex: 1 }}>
        <Text variant="body">{name}</Text>
        <Text variant="micro" color={Colors.text4}>
          {institution.name} •••• {mask}
          {creditLimit ? ` · ${formatCurrency(creditLimit, { compact: true })} limit` : ''}
        </Text>
      </View>
      <Amount amount={balance} variant="subtitle" neutral />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
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
  addAccountRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
