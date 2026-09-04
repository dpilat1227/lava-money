import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GetStartedNudge } from '@/components/home/GetStartedNudge';
import { NeedsAttentionCard } from '@/components/home/NeedsAttentionCard';
import { NetWorthHero } from '@/components/home/NetWorthHero';
import { SpendingCard } from '@/components/home/SpendingCard';
import { Amount, Atmosphere, Icon, InstitutionAvatar, StaggerItem, Text } from '@/components/ui';
import { DesktopDashboard } from '@/components/web/DesktopDashboard';
import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { useUpcomingRecurring, useNetWorthHistory, useNetWorthSummary } from '@/hooks/useFinanceSelectors';
import { useTabBarBottomPadding } from '@/lib/hooks/useTabBarBottomPadding';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { isAssetAccount, type Account } from '@/lib/types';
import { findCategorySuggestions } from '@/lib/utils/categorizer';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = useTabBarBottomPadding();
  const { width } = useWindowDimensions();
  const { accounts, transactions, refreshAllLinked } = useFinance();
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<1 | 3 | 6 | 12>(6);

  // Weekly, not monthly -- see buildNetWorthHistory's "granularity" note.
  const chartHistory = useNetWorthHistory(range, 'week');
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

  // Wide web only (see components/web/DesktopDashboard.tsx) -- checked after
  // every hook above runs unconditionally on every render, so resizing a
  // browser window across the breakpoint never changes the hook call order.
  if (Platform.OS === 'web' && width >= Breakpoints.wide) {
    return <DesktopDashboard />;
  }

  return (
    <View style={styles.root}>
      <Atmosphere />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.orange} />}
      >
      {/* No header/greeting here on purpose -- Robinhood/Apple Card both
          drop straight into the hero number with no chrome above it, and
          that vertical space is worth more as the net-worth moment than as
          a "Good evening" label repeated on every visit. Settings already
          covers the one thing a header icon would have opened anyway. */}
      {/* Design-audit-round-3: insets.top + Spacing.md (12) read as
          "too close to the top" for the hero moment on the screen --
          bumped to Spacing.lg (16) for real breathing room below the
          status bar/Dynamic Island. */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: insets.top + Spacing.lg, gap: Spacing.lg }}>
        <NetWorthHero
          netWorth={summary.netWorth}
          change={summary.change}
          accountCount={accounts.length}
          assets={summary.assets}
          liabilities={summary.liabilities}
          history={chartHistory}
          range={range}
          onRangeChange={setRange}
          rangeOptions={RANGE_OPTIONS}
        />

        {transactions.length === 0 ? <GetStartedNudge /> : <SpendingCard />}

        <NeedsAttentionCard attentionCount={attentionCount} suggestionCount={suggestionCount} onRefreshAccounts={handleRefresh} />

        <View>
          <SectionTitle title="Accounts" />
          {/* Design-audit-round-3: was a `Card level="flat"` -- rows already
              divide themselves (see AccountRow's accountRowDivider), so the
              enclosing grey slab was pure visual weight with nothing left
              for it to actually do. */}
          <View style={{ marginTop: Spacing.sm }}>
            {assetAccounts.map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                <AccountRow account={a} balance={a.balance} first={i === 0} />
              </StaggerItem>
            ))}
            {liabilityAccounts.map((a, i) => (
              <StaggerItem key={a.id} index={assetAccounts.length + i}>
                <AccountRow account={a} balance={-a.balance} first={assetAccounts.length === 0 && i === 0} />
              </StaggerItem>
            ))}
          </View>
          <Pressable onPress={() => router.push('/link-account')} style={styles.addAccountRow}>
            <Icon name="plusCircle" size={15} color={Colors.orange} />
            <Text variant="body" color={Colors.orange} weight="semibold">
              Add account
            </Text>
          </Pressable>
        </View>

        {upcoming.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle title="Upcoming" />
              <Pressable onPress={() => router.push('/recurring')} hitSlop={8}>
                <Text variant="caption" color={Colors.orange}>
                  View all ›
                </Text>
              </Pressable>
            </View>
            <View style={{ marginTop: Spacing.sm }}>
              {upcoming.map((r, i) => (
                <StaggerItem key={r.id} index={i}>
                  <Pressable
                    onPress={() => router.push('/recurring')}
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
                  </Pressable>
                </StaggerItem>
              ))}
            </View>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="subtitle" color={Colors.text2}>
      {title}
    </Text>
  );
}

/**
 * No enclosing Card at all -- rows sit directly on the page background,
 * divided internally (see accountRowDivider below), matching Settings' and
 * Activity's own list treatment (design-audit-round-3). Was previously a
 * separate elevated `Card` *per account*, which for anyone with 3+ accounts
 * read as a stack of identical boxes ("card soup") rather than one coherent
 * list -- Robinhood/Copilot both render list rows flat, reserving a card
 * boundary for one thing at a time, not a container around routine rows.
 */
function AccountRow({ account, balance, first }: { account: Account; balance: number; first: boolean }) {
  const router = useRouter();
  const { institutions } = useFinance();
  const institution = getInstitution(institutions, account.institutionId);
  const status = presentSyncStatus(account);
  const attention = needsAttention(account);
  return (
    <Pressable
      onPress={() => router.push(`/account/${account.id}`)}
      style={({ pressed }) => [
        styles.accountRow,
        !first && styles.accountRowDivider,
        attention && { backgroundColor: `${status.color}0c` },
        pressed && { opacity: 0.7 },
      ]}
    >
      {attention && <View style={[styles.accountAccent, { backgroundColor: status.color }]} />}
      <InstitutionAvatar name={institution.name} color={institution.color} statusColor={status.color} pulse={status.pulse} />
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1}>
          {account.name}
        </Text>
        <Text
          variant="micro"
          color={attention ? status.color : Colors.text4}
          numberOfLines={2}
          style={{ marginTop: 2 }}
        >
          {/* Institution name first, not just a sync timestamp -- two
              linked banks can easily both name an account "Everyday
              Checking" (real banks do this too), and the avatar's initial
              letter is too subtle on its own to tell them apart in a list.
              Skipped for manual accounts: `subtitle` already covers it.
              Design-audit pass: this used to also append the *full*
              `status.label` ("Synced 2m ago" / "Connection issue · synced
              3d ago") and a credit-limit suffix after it -- on a real
              institution name ("Harbor Credit Union") there's only ~3
              characters of row width left after that prefix, so both
              always lost the numberOfLines={1} truncation race and
              rendered as unreadable fragments like "Syn..." or "Con...",
              with credit limit never visible at all. The pulsing green dot
              on the avatar already *is* the "all synced and connected"
              signal -- healthy rows need no status text at all now. Only
              a short word surfaces here, and only when something actually
              needs a look (paired with the accent bar + tinted row
              background above); full detail stays on the account page,
              which has a whole line to itself for it. numberOfLines={2}
              (rather than 1) is deliberate too: it only ever matters for
              this rarer attention case, since the institution-name-only
              case always fits on one line by itself -- letting the
              uncommon, more important case wrap instead of truncate beats
              forcing every row to a shared fixed height. */}
          {account.source === 'manual' ? 'Manual' : institution.name}
          {attention ? ` · ${account.syncStatus === 'error' ? 'Error' : 'Stale'}` : ''}
        </Text>
      </View>
      <Amount amount={balance} variant="subtitle" neutral />
      <Icon name="chevronRight" size={14} color={Colors.text4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  accountRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  accountAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
});
