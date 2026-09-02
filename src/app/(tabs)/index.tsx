import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { InsightChips } from '@/components/home/InsightChips';
import { NeedsAttentionCard } from '@/components/home/NeedsAttentionCard';
import { NetWorthHero } from '@/components/home/NetWorthHero';
import { Amount, Card, FlameMark, Icon, Text } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useUpcomingRecurring, useNetWorthHistory, useNetWorthSummary } from '@/hooks/useFinanceSelectors';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount, type Account } from '@/lib/types';
import { findCategorySuggestions } from '@/lib/utils/categorizer';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullDate, greetingForHour } from '@/lib/utils/date';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

export default function HomeScreen() {
  const router = useRouter();
  const { accounts, transactions, refreshAllLinked } = useFinance();
  const [refreshing, setRefreshing] = useState(false);

  const history = useNetWorthHistory(6);
  const summary = useNetWorthSummary();
  const upcoming = useUpcomingRecurring(4);

  const assetAccounts = accounts.filter(a => isAssetAccount(a.type));
  const liabilityAccounts = accounts.filter(a => !isAssetAccount(a.type));
  const attentionCount = accounts.filter(needsAttention).length;
  const suggestionCount = findCategorySuggestions(transactions).length;

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    refreshAllLinked();
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshAllLinked]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.orange} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="display">{greetingForHour()}</Text>
          <Text variant="body" color={Colors.text3} style={{ marginTop: 4 }}>
            {formatFullDate(new Date().toISOString().slice(0, 10))}
          </Text>
        </View>
        <View style={styles.flameBadge}>
          <FlameMark size={18} />
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
        <NeedsAttentionCard attentionCount={attentionCount} suggestionCount={suggestionCount} onRefreshAccounts={handleRefresh} />

        <NetWorthHero
          netWorth={summary.netWorth}
          change={summary.change}
          accountCount={accounts.length}
          history={history}
          accounts={accounts}
          transactions={transactions}
        />

        <InsightChips />

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
    <Card onPress={() => router.push(`/account/${account.id}`)} style={styles.accountRow}>
      <View style={styles.avatarWrap}>
        <View style={[styles.institutionAvatar, { backgroundColor: `${institution.color}22`, borderColor: `${institution.color}44` }]}>
          <Text variant="body" weight="bold" color={institution.color}>
            {institution.name.charAt(0)}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body">{account.name}</Text>
        <Text variant="micro" color={Colors.text4} numberOfLines={1} style={{ marginTop: 2 }}>
          {status.label}
          {account.creditLimit ? ` · ${formatCurrency(account.creditLimit, { compact: true })} limit` : ''}
        </Text>
      </View>
      <Amount amount={balance} variant="subtitle" neutral />
      <Icon name="chevronRight" size={14} color={Colors.text4} />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  flameBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1006',
    borderWidth: 1,
    borderColor: 'rgba(255,115,0,0.35)',
    ...Shadow.sm,
    shadowColor: Colors.orange,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  avatarWrap: { width: 36, height: 36 },
  institutionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  addAccountRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
