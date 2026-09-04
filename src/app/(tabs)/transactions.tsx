import { Link, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Atmosphere, Button, EmptyState, Icon, SampleTag, ScreenHeader, Text } from '@/components/ui';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { Breakpoints, Colors, Radius, Spacing } from '@/constants/theme';
import { useGroupedTransactions } from '@/hooks/useFinanceSelectors';
import { useTabBarBottomPadding } from '@/lib/hooks/useTabBarBottomPadding';
import { getInstitution } from '@/lib/mock/institutions';
import { SAMPLE_TRANSACTIONS } from '@/lib/mock/sampleChartData';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Account, Institution, Transaction } from '@/lib/types';
import { findCategorySuggestions, type CategorizeResult } from '@/lib/utils/categorizer';
import { daySubtotalLabel } from '@/lib/utils/currency';
import { formatDayLabel } from '@/lib/utils/date';

type Filter = 'all' | 'needs-review' | string;

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  // Budgets/Trends' wide layout pads every side of their scroll container
  // at Spacing.xl (24) -- Activity never got the same treatment and kept
  // the mobile ScreenHeader's Spacing.lg (16) + near-zero top padding
  // (insets.top is 0 on web) even on wide web, which is the exact "header
  // sits closer to the top, and content is narrower-inset, than Budgets"
  // inconsistency called out in review.
  const hPad = isWideWeb ? Spacing.xl : Spacing.lg;
  const tabBarBottomPadding = useTabBarBottomPadding();
  const { accounts, categories, institutions, transactions, categorizeTransaction, deleteTransaction } = useFinance();

  const suggestions = useMemo(() => findCategorySuggestions(transactions), [transactions]);
  const suggestionsById = useMemo(() => new Map(suggestions.map(s => [s.transaction.id, s.result])), [suggestions]);

  const accountFilterId = filter !== 'all' && filter !== 'needs-review' ? filter : undefined;
  const groups = useGroupedTransactions(query, accountFilterId);
  const visibleGroups =
    filter === 'needs-review'
      ? groups.map(g => ({ date: g.date, transactions: g.transactions.filter(t => suggestionsById.has(t.id)) })).filter(g => g.transactions.length > 0)
      : groups;

  // A single-transaction day showing its own amount twice (once as the row,
  // once as the day's "net") reads as a bug, not a feature -- the subtotal
  // only earns its place once there's more than one number to add up.
  const sections = visibleGroups.map(g => ({
    title: formatDayLabel(g.date),
    subtotal: g.transactions.length > 1 ? daySubtotalLabel(g.transactions) : null,
    data: g.transactions,
  }));
  const trulyEmpty = transactions.length === 0 && query.length === 0 && filter === 'all';

  const emptySubtitle =
    query.length > 0
      ? `Nothing matches "${query}" — try a different search term.`
      : filter === 'needs-review'
        ? 'Nothing left to review right now.'
        : 'No transactions for this account yet.';

  const handleApplySuggestion = (transactionId: string, result: CategorizeResult) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    categorizeTransaction(transactionId, result.categoryId);
  };

  const handleDelete = (tx: Transaction) => {
    Alert.alert('Delete transaction', `Remove "${tx.merchantName}" from your history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
    ]);
  };

  return (
    <View style={styles.root}>
      <Atmosphere />
      {/* Web-wide: rows were stretching across the full browser width,
          which is what actually caused the "too much space between name
          and amount" complaint -- the row layout itself was fine, the
          column it sat in was just too wide to be a comfortable list. */}
      <View style={[{ flex: 1 }, isWideWeb && styles.wideColumn]}>
      {isWideWeb ? (
        <Text variant="display" style={{ fontSize: 28, paddingHorizontal: hPad, paddingTop: Spacing.xl }}>
          Activity
        </Text>
      ) : (
        <ScreenHeader title="Activity" />
      )}
      <View style={{ paddingHorizontal: hPad, marginTop: isWideWeb ? Spacing.lg : 0, marginBottom: Spacing.sm }}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={16} color={Colors.text4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search merchants"
            placeholderTextColor={Colors.text4}
            style={styles.search}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={15} color={Colors.text4} />
            </Pressable>
          )}
        </View>
      </View>

      {!trulyEmpty && (
        <FilterChipsRow filter={filter} onChange={setFilter} accounts={accounts} institutions={institutions} needsReviewCount={suggestions.length} hPad={hPad} />
      )}

      {trulyEmpty ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}>
          <EmptyState
            icon={<Icon name="receipt" size={24} color={Colors.text3} />}
            title="No transactions yet"
            subtitle="Add one by hand, import a CSV export from your bank, or link an account to pull in real history."
            action={
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Button
                  label="Add transaction"
                  onPress={() => router.push(accounts[0] ? `/account/${accounts[0].id}` : '/link-account')}
                />
                <Button label="Link account" variant="secondary" onPress={() => router.push('/link-account')} />
              </View>
            }
          />
          <View style={{ paddingHorizontal: hPad }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text variant="micro" weight="semibold" color={Colors.text3} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Preview
              </Text>
              <SampleTag />
            </View>
            <View style={{ opacity: 0.55 }}>
              {SAMPLE_TRANSACTIONS.map(tx => (
                <TransactionRow key={tx.id} tx={tx} categories={categories} onPress={() => {}} />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : sections.length === 0 ? (
        <EmptyState icon={<Icon name="search" size={26} color={Colors.text3} />} title="No transactions found" subtitle={emptySubtitle} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: hPad, paddingBottom: tabBarBottomPadding }}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            filter === 'all' && suggestions.length > 0 ? (
              <Pressable onPress={() => router.push('/review-categories')} style={styles.reviewBanner}>
                <View style={styles.reviewDot} />
                <Text variant="body" weight="semibold" color={Colors.orange} style={{ flex: 1 }}>
                  {suggestions.length} transaction{suggestions.length === 1 ? '' : 's'} need review
                </Text>
                <Icon name="chevronRight" size={14} color={Colors.orange} />
              </Pressable>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            // Design-audit-round-3 fix: this used a flat `Colors.bg` fill so
            // the pinned/sticky header can occlude rows scrolling behind it
            // -- but `<Atmosphere />` paints a diagonal gradient plus two
            // soft radial glows across the *whole* screen behind the list,
            // so a flat opaque swatch reads as a hard-edged "hole" in that
            // ambient lighting wherever it happens to sit ("black
            // rectangle bars" in review). A blur still occludes what's
            // behind it enough to keep the header legible while pinned,
            // but it *samples* the gradient/glow instead of replacing it
            // with a flat color, so it blends instead of cutting a seam.
            <View style={styles.sectionHeaderWrap}>
              <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="caption" weight="semibold" color={Colors.text3} style={styles.sectionHeader}>
                  {section.title}
                </Text>
                {section.subtotal && (
                  <Text variant="micro" color={Colors.text4} style={styles.sectionHeader}>
                    {section.subtotal}
                  </Text>
                )}
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              categories={categories}
              suggestion={suggestionsById.get(item.id)}
              onPress={() => router.push(`/transaction/${item.id}`)}
              onApplySuggestion={result => handleApplySuggestion(item.id, result)}
              canDelete={item.entrySource === 'manual'}
              onDelete={() => handleDelete(item)}
              statusNote={item.isPending ? 'Pending' : undefined}
            />
          )}
        />
      )}
      </View>
    </View>
  );
}

function FilterChipsRow({
  filter,
  onChange,
  accounts,
  institutions,
  needsReviewCount,
  hPad,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
  accounts: Account[];
  institutions: Institution[];
  needsReviewCount: number;
  hPad: number;
}) {
  const select = (value: Filter) => {
    if (value === filter) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(value);
  };

  // Two linked institutions both call their checking account "Everyday
  // Checking" often enough (their own template, not a coincidence) that
  // the account filter chips were showing two identically-labeled chips
  // with zero way to tell which is which. Disambiguate only when a name
  // actually collides, so the common case (one bank, one "Checking") stays
  // as short as before.
  const nameCounts = new Map<string, number>();
  for (const a of accounts) nameCounts.set(a.name, (nameCounts.get(a.name) ?? 0) + 1);

  return (
    // Design-audit follow-up: this row can overflow past one screen once
    // there are a few linked accounts, and `showsHorizontalScrollIndicator=
    // {false}` (the right call on mobile, where a scrollbar looks foreign)
    // left zero hint that more chips existed -- just an abrupt edge, easy
    // to mistake for the actual end of the list. A trailing fade is the
    // same "there's more this way" cue iOS's own horizontal carousels use.
    <View style={{ position: 'relative' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsScroll}
        contentContainerStyle={{ paddingHorizontal: hPad, gap: Spacing.sm, alignItems: 'center' }}
      >
        <FilterChip label="All" active={filter === 'all'} onPress={() => select('all')} />
        {needsReviewCount > 0 && (
          <FilterChip label={`Needs review (${needsReviewCount})`} active={filter === 'needs-review'} onPress={() => select('needs-review')} />
        )}
        {accounts.map(a => {
          // Disambiguate a colliding account name with a small colored dot in
          // the institution's own color (same color `InstitutionAvatar` uses
          // for that bank everywhere else) instead of appending the full
          // institution name -- keeps the chip short even when two linked
          // banks both call their checking account "Everyday Checking."
          const isDuplicateName = (nameCounts.get(a.name) ?? 0) > 1;
          const dotColor = isDuplicateName ? getInstitution(institutions, a.institutionId).color : undefined;
          return <FilterChip key={a.id} label={a.name} dotColor={dotColor} active={filter === a.id} onPress={() => select(a.id)} />;
        })}

        {/* Deliberately styled unlike the filter chips above (ghost outline +
            icon, not the active/inactive filter pattern) -- every other chip
            in this row changes `filter` in place, this one navigates away to
            the new /recurring page, and looking identical to its siblings
            would read as "filter to recurring transactions," not "go see
            your subscriptions." */}
        <Link href="/recurring" asChild>
          <Pressable style={styles.recurringChip}>
            <Icon name="sync" size={12} color={Colors.text3} />
            <Text variant="caption" weight="semibold" color={Colors.text3}>
              Recurring
            </Text>
            <Icon name="chevronRight" size={10} color={Colors.text4} />
          </Pressable>
        </Link>
      </ScrollView>
      <LinearGradient
        colors={['transparent', Colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
        style={styles.filterChipsFade}
      />
    </View>
  );
}

function FilterChip({ label, active, onPress, dotColor }: { label: string; active: boolean; onPress: () => void; dotColor?: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      {dotColor && <View style={[styles.filterChipDot, { backgroundColor: dotColor }]} />}
      <Text variant="caption" weight="semibold" color={active ? Colors.orange : Colors.text3} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  wideColumn: { maxWidth: 760, width: '100%', alignSelf: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  search: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    color: Colors.text1,
    fontSize: 15,
  },
  filterChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 40,
    marginBottom: Spacing.sm,
  },
  filterChipsFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 28,
    height: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  filterChipActive: {
    backgroundColor: Colors.orangeSoft,
    borderColor: `${Colors.orange}55`,
  },
  filterChipDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  recurringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.orangeSoft,
    borderWidth: 1,
    borderColor: `${Colors.orange}33`,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange },
  sectionHeaderWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
