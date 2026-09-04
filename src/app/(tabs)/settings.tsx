import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AddCategoryModal } from '@/components/budgets/AddCategoryModal';
import { Atmosphere, Button, CategoryIcon, GlassSurface, Icon, IconBadge, InstitutionAvatar, ScreenHeader, Text, type IconName } from '@/components/ui';
import { Breakpoints, Colors, Radius, Spacing } from '@/constants/theme';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';
import { useTabBarBottomPadding } from '@/lib/hooks/useTabBarBottomPadding';
import { findCategory } from '@/lib/mock/categories';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Category, Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { exportAllDataAsJson, exportTransactionsAsCsv } from '@/lib/utils/export';
import { needsAttention, presentSyncStatus } from '@/lib/utils/sync';

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
    updateCustomCategory,
    deleteCustomCategory,
    unhideTransaction,
  } = useFinance();
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  // Design-audit-round-4: null = closed, a Category = editing that one.
  // Reuses AddCategoryModal for both -- same fields, just pre-filled and
  // saving via updateCustomCategory instead of addCustomCategory.
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const tabBarBottomPadding = useTabBarBottomPadding();

  const linkedAccounts = accounts.filter(a => a.source === 'linked');
  const manualAccounts = accounts.filter(a => a.source === 'manual');
  const attentionCount = accounts.filter(needsAttention).length;
  // "Hide," not "delete" -- so it needs a way back. See Transaction.hidden
  // and transaction/[id].tsx's confirmHide for the other half of this.
  const hiddenTransactions = transactions.filter(t => t.hidden);

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
          : await exportTransactionsAsCsv(transactions, accounts, categories, institutions);
      if (!ok) Alert.alert('Export unavailable', "Sharing isn't available on this device.");
    } catch {
      Alert.alert('Export failed', 'Something went wrong putting that file together.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={styles.root}>
      <Atmosphere />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: tabBarBottomPadding }}>
      <ScreenHeader title="Settings" />

      {/* Design-audit-round-3: was Spacing.lg (16) -- fine when every
          section had its own grey card boundary to lean on, but once
          those went away (see the section-by-section notes below), 16px
          alone wasn't enough to keep e.g. "Manually tracked"'s last row
          from reading as part of "Add account" right under it. Sections
          now rely on real whitespace, not a box, to read as distinct. */}
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xxl }}>
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
            {/* Design-audit-round-3: was a `Card level="flat"` -- a solid grey
                slab around a list whose rows are the actual content. Rows
                sit directly on `bg` now, hairline-divided, same treatment
                Home's own Accounts list and Activity's transaction list
                already use. */}
            <View style={{ gap: Spacing.lg }}>
              {institutions
                .filter(inst => linkedAccounts.some(a => a.institutionId === inst.id))
                .map((inst, instIndex) => (
                  <View key={inst.id} style={instIndex > 0 ? styles.institutionGroupDivider : undefined}>
                    <Text variant="caption" color={Colors.text3} style={{ marginBottom: 4 }}>
                      {inst.name}
                    </Text>
                    {linkedAccounts
                      .filter(a => a.institutionId === inst.id)
                      .map((a, i) => {
                        const status = presentSyncStatus(a);
                        return (
                          <Pressable key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={[styles.accountRow, i > 0 && styles.accountRowDivider]}>
                            <InstitutionAvatar name={inst.name} color={inst.color} size={30} />
                            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
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
            </View>
          </View>
        )}

        {manualAccounts.length > 0 && (
          <View>
            <SectionLabel text="Manually tracked" />
            <View>
              {manualAccounts.map((a, i) => (
                <Pressable key={a.id} onPress={() => router.push(`/account/${a.id}`)} style={[styles.accountRow, i > 0 && styles.accountRowDivider]}>
                  <IconBadge name="card" color={Colors.text3} size={30} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
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
            </View>
          </View>
        )}

        <Pressable onPress={() => router.push('/link-account')} style={styles.linkButton}>
          <Icon name="plusCircle" size={16} color={Colors.orange} />
          <Text variant="body" color={Colors.text2} weight="semibold">
            Add account
          </Text>
        </Pressable>

        <View>
          <SectionLabel text="Data & privacy" />
          <View>
            {/* Was a static line -- the one sentence that's actually this
                app's whole reason for existing deserved to be more than a
                caption nobody taps, especially next to two rows that *are*
                tappable right below it. Opens a real explanation instead
                of just asserting it. */}
            <Pressable onPress={() => setShowDataInfo(true)} style={styles.privacyRow}>
              <IconBadge name="shield" color={Colors.green} size={30} />
              <Text variant="body" color={Colors.text2} style={{ flex: 1, marginLeft: Spacing.sm }}>
                {/* Platform-specific, not just the web claim reused everywhere --
                    a real Plaid connection on native does put one thing on a
                    server (an encrypted token, see DataInfoModal below), so
                    "never uploaded" is only unconditionally true for the
                    web demo. Overclaiming here directly under a row that then
                    explains the actual, more nuanced mechanism would read as
                    the teaser contradicting its own explanation. */}
                {Platform.OS === 'web' ? 'Stored only on this device — never uploaded.' : 'Local-first, even with linked banks — tap to see how.'}
              </Text>
              <Icon name="chevronRight" size={13} color={Colors.text4} />
            </Pressable>
            <ExportRow
              icon="doc"
              label="Export all data (JSON)"
              sublabel="Full backup"
              loading={exporting === 'json'}
              onPress={() => runExport('json')}
            />
            <ExportRow
              icon="export"
              label="Export transactions (CSV)"
              sublabel="Excel, Sheets, Numbers"
              loading={exporting === 'csv'}
              onPress={() => runExport('csv')}
              last={hiddenTransactions.length === 0}
            />
            {hiddenTransactions.length > 0 && (
              <Pressable onPress={() => setShowHidden(true)} style={styles.privacyRow}>
                <IconBadge name="eyeOff" color={Colors.text3} size={30} />
                <Text variant="body" color={Colors.text2} style={{ flex: 1, marginLeft: Spacing.sm }}>
                  Hidden transactions ({hiddenTransactions.length})
                </Text>
                <Icon name="chevronRight" size={13} color={Colors.text4} />
              </Pressable>
            )}
          </View>
        </View>

        <View>
          <View style={styles.sectionLabelRow}>
            <SectionLabel text="Categories" />
            <Pressable onPress={() => setAddingCategory(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="plus" size={13} color={Colors.orange} />
              <Text variant="caption" color={Colors.text2} weight="semibold">
                Add
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: Spacing.sm }}>
            <Text variant="micro" color={Colors.text4}>
              Custom categories show up everywhere the starter list does -- Activity and Budgets -- and can be edited or removed anytime.
            </Text>
            {customCategories.length === 0 ? (
              <Text variant="body" color={Colors.text3}>
                No custom categories yet — add one for anything the starter list is missing.
              </Text>
            ) : (
              customCategories.map(c => (
                <View key={c.id} style={styles.categoryRow}>
                  <CategoryIcon id={c.id} emoji={c.emoji} color={c.color} size={30} />
                  <Text variant="body" weight="medium" color={c.color} style={{ flex: 1, marginLeft: Spacing.md }}>
                    {c.name}
                  </Text>
                  <Pressable onPress={() => setEditingCategory(c)} hitSlop={8} style={{ marginRight: Spacing.lg }}>
                    <Text variant="caption" color={Colors.text2} weight="semibold">
                      Edit
                    </Text>
                  </Pressable>
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
          </View>
        </View>

        <View>
          <SectionLabel text="About" />
          <View>
            <InfoRow label="Version" value="0.2.0" />
            <InfoRow label="Appearance" value="Dark" />
            <InfoRow label="Bank connections" value={Platform.OS === 'web' ? 'Simulated demo data' : 'Real, via Plaid'} />
            <InfoRow label="Manual accounts" value="Real — yours to edit" last />
          </View>
        </View>

        <View>
          <SectionLabel text="Danger zone" />
          <Pressable onPress={confirmReset} style={styles.dangerRow}>
            <Icon name="trash" size={15} color={Colors.red} />
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
      {editingCategory && (
        <AddCategoryModal
          initial={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={input => {
            const ok = updateCustomCategory(editingCategory.id, input);
            if (!ok) {
              Alert.alert('Category exists', `There's already a category named "${input.name}."`);
              return;
            }
            setEditingCategory(null);
          }}
        />
      )}
      {showDataInfo && <DataInfoModal onClose={() => setShowDataInfo(false)} />}
      {showHidden && (
        <HiddenTransactionsModal
          transactions={hiddenTransactions}
          categories={categories}
          onUnhide={unhideTransaction}
          onClose={() => setShowHidden(false)}
        />
      )}
      </ScrollView>
    </View>
  );
}

/**
 * The actual substance behind "stored only on this device" -- what that
 * means for linked vs. manual accounts specifically, and what leaving the
 * device requires (an export you trigger, never anything automatic). Every
 * other privacy-forward local-first competitor asserts the slogan; this is
 * the one screen that explains the mechanism, which is the harder, more
 * trust-earning claim to actually back up.
 */
function DataInfoModal({ onClose }: { onClose: () => void }) {
  useEscapeToClose(onClose);
  const points: { icon: IconName; color: string; title: string; body: string }[] = [
    {
      icon: 'lock',
      color: Colors.green,
      title: 'Your transactions and balances live on this device',
      body:
        Platform.OS === 'web'
          ? 'Accounts, balances, transactions, budgets, and categories are all stored locally -- there is no Lava Money server holding a copy.'
          : 'Accounts, balances, transactions, budgets, and categories are all stored locally. Linking a real bank keeps one thing on our server -- a securely encrypted connection token so we can refresh your accounts. That token is the only thing that ever leaves this device; your actual transaction history never is.',
    },
    Platform.OS === 'web'
      ? {
          icon: 'bank',
          color: Colors.orange,
          title: 'Linked accounts are simulated in this demo',
          body: 'The public web demo generates realistic sample history instead of a real bank connection. Nothing is fetched from, or sent to, an actual bank. Real bank linking is available in the mobile app.',
        }
      : {
          icon: 'bank',
          color: Colors.orange,
          title: 'Real bank connections go through Plaid',
          body: 'Connecting a bank uses Plaid to securely link your account. We never see or store your bank login -- only Plaid does. Your transaction history is fetched and shown here, never kept on our server.',
        },
    {
      icon: 'pencil',
      color: Colors.textAccent,
      title: 'Manual accounts are real, and stay that way',
      body: 'Balances or CSV imports you add by hand are genuinely yours -- edited, exported, or deleted only by you, never synced anywhere automatically.',
    },
    {
      icon: 'export',
      color: Colors.amber,
      title: 'The only way data leaves is an export you trigger',
      body: 'Export all data (JSON) or Export transactions (CSV) above. Until you tap one of those, nothing here goes anywhere.',
    },
  ];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <GlassSurface style={[styles.modalCard, { maxWidth: 420 }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
              <Text variant="title">How your data works</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="close" size={15} color={Colors.text3} />
              </Pressable>
            </View>

            <View style={{ gap: Spacing.lg }}>
              {points.map(p => (
                <View key={p.title} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <IconBadge name={p.icon} color={p.color} size={32} />
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text variant="body" weight="semibold">
                      {p.title}
                    </Text>
                    <Text variant="caption" color={Colors.text3} style={{ marginTop: 2 }}>
                      {p.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ marginTop: Spacing.xl }}>
              <Button label="Got it" onPress={onClose} fullWidth />
            </View>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}

/**
 * The other half of "hide, don't delete" (see Transaction.hidden's doc) --
 * a list of exactly what's hidden with a one-tap way back for each row.
 * Deliberately minimal (no search/filter/sort) since this is meant to be
 * a rarely-visited safety net, not a second transaction browser.
 */
function HiddenTransactionsModal({
  transactions,
  categories,
  onUnhide,
  onClose,
}: {
  transactions: Transaction[];
  categories: Category[];
  onUnhide: (transactionId: string) => void;
  onClose: () => void;
}) {
  useEscapeToClose(onClose);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <GlassSurface style={[styles.modalCard, { maxWidth: 440 }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              <Text variant="title">Hidden transactions</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="close" size={15} color={Colors.text3} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {transactions.map((t, i) => {
                const category = findCategory(categories, t.categoryId);
                return (
                  <View key={t.id} style={[styles.hiddenRow, i > 0 && styles.accountRowDivider]}>
                    <CategoryIcon id={category.id} emoji={category.emoji} color={category.color} size={30} />
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text variant="body" numberOfLines={1}>
                        {t.merchantName}
                      </Text>
                      <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
                        {formatCurrency(t.amount, { showSign: true })}
                      </Text>
                    </View>
                    <Pressable onPress={() => onUnhide(t.id)} hitSlop={8}>
                      <Text variant="caption" color={Colors.orange} weight="semibold">
                        Unhide
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </GlassSurface>
      </Pressable>
    </Modal>
  );
}

function ExportRow({
  icon,
  label,
  sublabel,
  loading,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  sublabel: string;
  loading: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.exportRow, !last && styles.rowDivider]}>
      <IconBadge name={icon} color={Colors.orange} size={30} />
      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
        <Text variant="body" color={Colors.text1} weight="semibold">
          {label}
        </Text>
        <Text variant="micro" color={Colors.text4} style={{ marginTop: 2 }}>
          {sublabel}
        </Text>
      </View>
      {loading ? <ActivityIndicator size="small" color={Colors.orange} /> : <Icon name="chevronRight" size={13} color={Colors.text4} />}
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

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      style={[
        { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2 },
        !last && styles.rowDivider,
      ]}
    >
      <Text variant="body" color={Colors.text3}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  accountRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  hiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  institutionGroupDivider: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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
    padding: Spacing.xl,
  },
});
