import { Link, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Atmosphere, FlameMark, Icon, InstitutionAvatar, Text, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing, Breakpoints } from '@/constants/theme';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Account, AccountType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { DemoBanner } from './DemoBanner';

/**
 * Web-only chrome (see (tabs)/_layout.tsx -- native never renders this).
 * Above `Breakpoints.wide` this is the Copilot-style persistent sidebar
 * (nav + grouped accounts); below it, the same route content gets a plain
 * bottom bar so a narrow browser window or an actual phone browser doesn't
 * get a half-width sidebar squeezed in. Either way, screen content itself
 * (passed as `children`, i.e. expo-router's `<Slot/>`) is untouched -- this
 * is purely chrome around it.
 */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWide = width >= Breakpoints.wide;

  return (
    <View style={styles.root}>
      <Atmosphere />
      <DemoBanner />
      <View style={styles.body}>
        {isWide && <Sidebar />}
        <View style={styles.content}>{children}</View>
        {!isWide && <NarrowTabBar />}
      </View>
    </View>
  );
}

/**
 * Same chrome as `DesktopShell`, under a name that makes sense at call
 * sites that aren't the tabs group's `<Slot/>` -- account/[id].tsx (a
 * sibling `Stack.Screen`, see app/_layout.tsx) renders this directly on
 * web-wide so the sidebar stays visible and the account page reads as a
 * real section of the app instead of a chrome-less full-screen overlay.
 * Deliberately just an alias, not a duplicate implementation: both call
 * sites want the exact same sidebar/nav/breakpoint behavior, so there's
 * only one to keep in sync.
 */
export const WebPageShell = DesktopShell;

// Label is "Activity" everywhere else (native tab bar + mobile
// ScreenHeader, see (tabs)/_layout.tsx and (tabs)/transactions.tsx) -- this
// used to be the one surface that disagreed with itself.
//
// "Recurring" isn't a native tab (five already fill the bottom bar
// comfortably; see recurring.tsx's comment for why it's a pushed screen
// there instead) -- but the sidebar has the vertical room a bottom bar
// doesn't, and Copilot's own sidebar lists it directly, so it gets a
// permanent nav item here even though native reaches it via links only.
const NAV_ITEMS: { href: '/' | '/transactions' | '/budgets' | '/trends' | '/recurring'; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/transactions', label: 'Activity', icon: 'receipt' },
  { href: '/budgets', label: 'Budgets', icon: 'pieChart' },
  { href: '/trends', label: 'Trends', icon: 'trendingUp' },
  { href: '/recurring', label: 'Recurring', icon: 'sync' },
];

const GROUPS: { title: string; types: AccountType[] }[] = [
  { title: 'Credit cards', types: ['credit_card'] },
  { title: 'Banking', types: ['checking', 'savings', 'cash'] },
  { title: 'Investments', types: ['investment'] },
  { title: 'Loans', types: ['loan'] },
];

function Sidebar() {
  const pathname = usePathname();
  const { accounts } = useFinance();

  return (
    <View style={styles.sidebar}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <FlameMark size={16} />
          </View>
          <Text variant="subtitle" weight="bold">
            Lava Money
          </Text>
        </View>

        <View style={{ marginTop: Spacing.xl, gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            // expo-router's <Link asChild> clones this Pressable and merges
            // its own `style` in -- an array `style` prop here trips a
            // (real, if noisy) dev warning asking for a flattened object.
            const rowStyle = StyleSheet.flatten([styles.navRow, active && styles.navRowActive]);
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={rowStyle}>
                  <Icon name={item.icon} size={17} color={active ? Colors.orange : Colors.text3} />
                  <Text variant="body" weight={active ? 'semibold' : 'regular'} color={active ? Colors.text1 : Colors.text3}>
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <View style={styles.divider} />

        {GROUPS.map(group => {
          const groupAccounts = accounts.filter(a => group.types.includes(a.type));
          if (groupAccounts.length === 0) return null;
          return (
            <View key={group.title} style={{ marginBottom: Spacing.xl }}>
              <Text variant="micro" weight="semibold" color={Colors.text4} style={styles.groupTitle}>
                {group.title.toUpperCase()}
              </Text>
              <View style={{ gap: 2, marginTop: Spacing.sm }}>
                {groupAccounts.map(account => (
                  <AccountLink key={account.id} account={account} />
                ))}
              </View>
            </View>
          );
        })}

        <Link href="/link-account" asChild>
          <Pressable style={styles.navRow}>
            <Icon name="plusCircle" size={17} color={Colors.text3} />
            <Text variant="body" color={Colors.text3}>
              Add account
            </Text>
          </Pressable>
        </Link>
      </ScrollView>

      <View style={styles.sidebarFooter}>
        <Link href="/settings" asChild>
          <Pressable style={styles.navRow}>
            <Icon name="gear" size={17} color={Colors.text3} />
            <Text variant="body" color={Colors.text3}>
              Settings
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function AccountLink({ account }: { account: Account }) {
  const { institutions } = useFinance();
  const institution = getInstitution(institutions, account.institutionId);
  const signedBalance = account.type === 'credit_card' || account.type === 'loan' ? -account.balance : account.balance;
  return (
    <Link href={`/account/${account.id}`} asChild>
      <Pressable style={styles.accountRow}>
        <InstitutionAvatar name={institution.name} color={institution.color} size={24} />
        <Text variant="body" color={Colors.text2} numberOfLines={1} style={{ flex: 1 }}>
          {account.name}
        </Text>
        <Text variant="body" weight="semibold" color={Colors.text2} style={{ fontVariant: ['tabular-nums'] }}>
          {formatCurrency(signedBalance, { compact: true, showSign: false })}
        </Text>
      </Pressable>
    </Link>
  );
}

function NarrowTabBar() {
  const pathname = usePathname();
  const items: { href: '/' | '/transactions' | '/budgets' | '/trends' | '/settings'; icon: IconName }[] = [
    { href: '/', icon: 'home' },
    { href: '/transactions', icon: 'receipt' },
    { href: '/budgets', icon: 'pieChart' },
    { href: '/trends', icon: 'trendingUp' },
    { href: '/settings', icon: 'gear' },
  ];
  return (
    <View style={styles.narrowBar}>
      {items.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={styles.narrowBarItem}>
              <Icon name={item.icon} size={20} color={active ? Colors.orange : Colors.text4} />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, minWidth: 0 },
  sidebar: {
    // 240 (design-audit follow-up: was truncating essentially every
    // account name -- "Everyday Checking," "High-Yield Savings," "Rewards
    // Credit Card" -- mid-word against the balance column next to it, not
    // just unusually long ones. Sized to comfortably fit the longest of
    // the mock generator's fixed account-name templates (`lib/mock/
    // generator.ts`) alongside a signed, compact balance; a genuinely long
    // real/custom account name will still ellipsis gracefully, same as
    // any fixed-width label eventually would).
    width: 300,
    borderRightWidth: 1,
    borderRightColor: Colors.border1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1006',
    borderWidth: 1,
    borderColor: 'rgba(255,115,0,0.35)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  navRowActive: { backgroundColor: Colors.orangeSoft },
  divider: { height: 1, backgroundColor: Colors.border1, marginVertical: Spacing.xl },
  groupTitle: { paddingHorizontal: Spacing.sm, letterSpacing: 0.4 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  sidebarFooter: { borderTopWidth: 1, borderTopColor: Colors.border1, paddingVertical: Spacing.sm },
  narrowBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: Colors.surface1,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    paddingVertical: Spacing.sm,
  },
  narrowBarItem: { flex: 1, alignItems: 'center' },
});
