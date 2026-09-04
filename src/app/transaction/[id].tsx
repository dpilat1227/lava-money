import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PausePrompt } from '@/components/impause/PausePrompt';
import { Amount, Badge, CategoryIcon, Icon, InstitutionAvatar, PillButton, Text } from '@/components/ui';
import { Dialog } from '@/components/web/Dialog';
import { Breakpoints, Colors, Radius, Spacing } from '@/constants/theme';
import { findCategory } from '@/lib/mock/categories';
import { getInstitution } from '@/lib/mock/institutions';
import { useFinance } from '@/lib/store/FinanceContext';
import { categorizeMerchant } from '@/lib/utils/categorizer';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullDate, formatWeekLabel } from '@/lib/utils/date';
import { buildPauseContext, shouldShowRetroactivePause } from '@/lib/utils/impause';

const ENTRY_SOURCE_LABEL: Record<string, string> = {
  manual: 'Added by hand',
  import: 'Imported from CSV',
  linked: 'From bank connection',
};

/**
 * Copilot's own transaction detail anatomy, adapted: icon/name/amount,
 * an always-visible inline note, one category pill, an account mini-card,
 * and a single row of pill actions -- replacing the old boxed
 * label/value "detail card" (Date/Account/Institution/Source stacked as
 * rows) this screen used to lead with. That card answered questions
 * nobody was asking on a transaction they just tapped into; the date is
 * now a caption under the amount, and institution/source fold into the
 * account mini-card, which is also now a real link to that account.
 */
export default function TransactionDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    transactions,
    accounts,
    institutions,
    categories,
    expenseCategories,
    budgets,
    acknowledgedPauseIds,
    categorizeTransaction,
    setNote,
    deleteTransaction,
    hideTransaction,
    acknowledgePause,
  } = useFinance();
  const [pickingCategory, setPickingCategory] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const tx = transactions.find(t => t.id === id);
  if (!tx) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text variant="body" color={Colors.text3}>
            Transaction not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const account = accounts.find(a => a.id === tx.accountId);
  const institution = account ? getInstitution(institutions, account.institutionId) : null;
  const category = findCategory(categories, tx.categoryId);
  const note = noteDraft ?? tx.notes ?? '';

  // Same "other" bucket findCategorySuggestions() re-checks (see
  // lib/utils/categorizer.ts) surfaced directly on the one transaction
  // being looked at, so the quick-apply chip is available here too, not
  // only via a swipe gesture on the list or the review-categories queue.
  const quickSuggestion =
    tx.categoryId === 'other' && tx.entrySource !== 'linked' ? categorizeMerchant(tx.merchantName, tx.amount, tx.rawDescription) : null;
  const suggestedCategory =
    quickSuggestion && quickSuggestion.categoryId !== 'other' ? findCategory(categories, quickSuggestion.categoryId) : null;

  // Copilot's own transaction detail leads with exactly this -- "how often
  // do I actually come here, and how much do I usually spend" -- and it's
  // free: every field it needs is already in `transactions`, no new data
  // source. Doubles as the fix for this screen reading as broken/unfinished
  // on native, where a short detail view left the bottom half of the screen
  // solid black with nothing in it.
  const merchantHistory = transactions
    .filter(t => t.id !== tx.id && t.merchantName === tx.merchantName)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const merchantHistoryPreview = merchantHistory.slice(0, 5);
  const merchantAverage = merchantHistory.length > 0 ? merchantHistory.reduce((s, t) => s + t.amount, 0) / merchantHistory.length : 0;

  const close = () => router.back();

  // Design-audit-round-4: "instead of 'deleting' a transaction, you can
  // 'hide' it so if you ever need to see it again it's still there" --
  // also the semantically honest action for anything bank-linked (the
  // bank still has the real record; this app never actually held the
  // authoritative copy to delete). Manual entries are the one case where
  // the user really is the sole author, so hard delete stays available
  // there specifically -- same `entrySource === 'manual'` gate Activity's
  // swipe-to-delete already uses.
  const isManual = tx.entrySource === 'manual';

  const confirmDelete = () => {
    Alert.alert('Delete transaction', `Remove "${tx.merchantName}" from your history? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(tx.id);
          close();
        },
      },
    ]);
  };

  const confirmHide = () => {
    Alert.alert('Hide transaction', `"${tx.merchantName}" won't show in Activity or count toward budgets. Unhide it anytime from Settings.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide',
        onPress: () => {
          hideTransaction(tx.id);
          close();
        },
      },
    ]);
  };

  const body = (
    <>
      <View style={styles.centered}>
        <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={56} />
        <Text variant="title" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
          {tx.merchantName}
        </Text>
        <View style={{ marginTop: 6 }}>
          <Amount amount={tx.amount} variant="title" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 }}>
          <Text variant="caption" color={Colors.text3}>
            {formatFullDate(tx.date)}
          </Text>
          {tx.isPending && <Badge label="Pending" color={Colors.amber} />}
        </View>
      </View>

      {/* Inline note -- no boxed container, just an underline field, so it
          reads as "annotate this" rather than another data-entry form. */}
      <TextInput
        value={note}
        onChangeText={setNoteDraft}
        onEndEditing={() => setNote(tx.id, note)}
        placeholder="Add a note…"
        placeholderTextColor={Colors.text4}
        style={styles.noteInput}
      />

      <View style={styles.pillRow}>
        <Badge label={category.name} color={category.color} />
      </View>

      {suggestedCategory && (
        <Pressable onPress={() => categorizeTransaction(tx.id, suggestedCategory.id)} style={styles.suggestionChip}>
          <CategoryIcon id={suggestedCategory.id} emoji={suggestedCategory.emoji} color={suggestedCategory.color} size={22} />
          <Text variant="caption" color={Colors.text2} style={{ flex: 1, marginLeft: Spacing.sm }}>
            Looks like{' '}
            <Text variant="caption" weight="semibold" color={Colors.text1}>
              {suggestedCategory.name}
            </Text>
          </Text>
          <Text variant="caption" weight="semibold" color={Colors.orange}>
            Apply
          </Text>
        </Pressable>
      )}

      {tx.categoryGuess && (
        <Text variant="micro" color={Colors.text4} style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
          Auto-categorized: {tx.categoryGuess.reason}
          {tx.categoryGuess.confidence === 'low' ? ' — low confidence, worth double-checking' : ''}
        </Text>
      )}

      {account && (
        // Design-audit-round-4 nav fix: `replace`, not `push` -- transaction
        // and account detail are the two ends of a loop someone can bounce
        // between indefinitely (transaction -> account -> a different
        // transaction -> that one's account -> ...); `push`ing every hop
        // grew the stack unbounded, so "Close" only ever dismissed one
        // level and got called "an infinite loop of popups" in review.
        // `replace` swaps this modal frame for the next one instead of
        // stacking on top of it -- Close from anywhere in the loop always
        // takes you directly back to wherever you started (Activity, or
        // whatever list you drilled in from), in exactly one tap, no
        // matter how many times you bounced between the two screens.
        <Pressable onPress={() => router.replace(`/account/${account.id}`)} style={styles.accountCard}>
          <InstitutionAvatar name={institution?.name ?? account.name} color={institution?.color ?? Colors.text3} size={38} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text variant="body" weight="medium" numberOfLines={1}>
              {account.name}
              {account.source !== 'manual' ? ` •••• ${account.mask}` : ''}
            </Text>
            <Text variant="micro" color={Colors.text4} numberOfLines={1} style={{ marginTop: 2 }}>
              {institution?.name}
              {tx.entrySource ? ` · ${ENTRY_SOURCE_LABEL[tx.entrySource] ?? tx.entrySource}` : ''}
            </Text>
          </View>
          <Icon name="chevronRight" size={13} color={Colors.text4} />
        </Pressable>
      )}

      <View style={styles.actionRow}>
        <PillButton label="Change category" icon="pencil" tone={pickingCategory ? 'accent' : 'neutral'} onPress={() => setPickingCategory(v => !v)} />
        {/* Same `replace` reasoning as the account card above. */}
        {account && <PillButton label="View account" icon="card" onPress={() => router.replace(`/account/${account.id}`)} />}
        {isManual ? (
          <PillButton label="Delete" icon="trash" tone="danger" onPress={confirmDelete} />
        ) : (
          <PillButton label="Hide" icon="eyeOff" tone="neutral" onPress={confirmHide} />
        )}
      </View>

      {pickingCategory && (
        <FlatList
          data={expenseCategories}
          keyExtractor={c => c.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: Spacing.sm }}
          contentContainerStyle={{ gap: Spacing.sm, marginTop: Spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.categoryOption, item.id === tx.categoryId && { borderColor: item.color }]}
              onPress={() => {
                categorizeTransaction(tx.id, item.id);
                setPickingCategory(false);
              }}
            >
              <CategoryIcon id={item.id} emoji={item.emoji} color={item.color} size={22} />
              <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      )}

      {merchantHistoryPreview.length > 0 && (
        <View style={{ marginTop: Spacing.xl }}>
          <View style={styles.merchantHistoryHeader}>
            <Text variant="caption" color={Colors.text3}>
              More from {tx.merchantName}
            </Text>
            <Text variant="micro" color={Colors.text4}>
              {merchantHistory.length}× · avg {formatCurrency(Math.abs(merchantAverage), { compact: true })}
            </Text>
          </View>
          <View style={styles.merchantHistoryCard}>
            {merchantHistoryPreview.map((t, i) => (
              <View key={t.id} style={[styles.merchantHistoryRow, i > 0 && styles.merchantHistoryDivider]}>
                <Text variant="caption" color={Colors.text2}>
                  {formatWeekLabel(t.date)}
                </Text>
                <Amount amount={t.amount} variant="caption" neutral />
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );

  const pausePrompt = shouldShowRetroactivePause(tx, acknowledgedPauseIds) ? (
    <PausePrompt context={buildPauseContext(tx, transactions, budgets, category)} onDismiss={() => acknowledgePause(tx.id)} />
  ) : null;

  // Wide web only: this route is a sibling Stack.Screen outside the
  // `(tabs)` group (see app/_layout.tsx), so it never gets DesktopShell's
  // chrome and used to just stretch its full-screen mobile layout
  // edge-to-edge. A centered Dialog (see components/web/Dialog.tsx) reads
  // as an intentional popover instead, closer to the LavaMesh reference.
  if (Platform.OS === 'web' && width >= Breakpoints.wide) {
    return (
      <Dialog onClose={close} maxWidth={440}>
        <View style={styles.dialogHeader}>
          <Text variant="subtitle" weight="semibold">
            Transaction
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Icon name="close" size={15} color={Colors.text3} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.dialogScrollContent}>{body}</ScrollView>
        {pausePrompt}
      </Dialog>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={close} hitSlop={12}>
          <Text variant="body" color={Colors.text3}>
            Close
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}>{body}</ScrollView>

      {pausePrompt}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  dialogScrollContent: { padding: Spacing.xl },
  centered: { alignItems: 'center', marginBottom: Spacing.lg },
  pillRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.orangeSoft,
    borderWidth: 1,
    borderColor: `${Colors.orange}33`,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  merchantHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.sm },
  merchantHistoryCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
    paddingHorizontal: Spacing.md,
  },
  merchantHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm + 2 },
  merchantHistoryDivider: { borderTopWidth: 1, borderTopColor: Colors.border1 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xl, justifyContent: 'center' },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: Colors.surface2,
  },
  noteInput: {
    marginTop: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border2,
    paddingVertical: Spacing.sm,
    color: Colors.text1,
    fontSize: 14,
    textAlign: 'center',
  },
});
