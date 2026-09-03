import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card, Icon, IconBadge, Text, type IconName } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

/**
 * First screen of the "add an account" flow, everywhere it appears
 * (onboarding and the link-account modal both delegate here). Manual entry
 * is a first-class path in this app, not a fallback -- always presented as
 * an equal option, never "connect a bank, or failing that, do it the hard
 * way."
 *
 * `onChooseRealBank` is native-only (see docs/PLAID_SETUP.md -- real Plaid
 * linking isn't available on the web build). When present, it becomes the
 * highlighted default choice and the fictional-institution flow
 * (`onChooseLink`) is relabeled "Try with sample data" rather than
 * removed -- still useful for a quick full-featured look at the app, or
 * for App Store review, without spending one of Plaid's Trial-plan Items
 * or requiring a real account.
 */
export function AddAccountChooser({
  onChooseLink,
  onChooseRealBank,
  onChooseManual,
  onCancel,
  linkingRealBank,
}: {
  onChooseLink: () => void;
  onChooseRealBank?: () => void;
  onChooseManual: () => void;
  onCancel?: () => void;
  /** True while a real Plaid Link session is being created/opened -- see
   * `usePlaidLink()`'s `linking` flag. Disables the choice cards so a
   * second tap can't fire a second `linkBank()` call while the first is
   * still in flight. */
  linkingRealBank?: boolean;
}) {
  const hasRealBank = Boolean(onChooseRealBank);

  return (
    <View style={{ flex: 1, paddingTop: Spacing.md }}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        {onCancel && (
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text variant="body" color={Colors.text3}>
              Cancel
            </Text>
          </Pressable>
        )}
        <Text variant="title" style={{ marginTop: Spacing.lg }}>
          Add an account
        </Text>
        <Text variant="body" color={Colors.text3} style={{ marginTop: 4, marginBottom: Spacing.lg }}>
          {/* Same overclaim as OnboardingFlow's welcome text -- "Connect a
              bank" right below this promises a real Plaid link sends an
              encrypted token to our server, so "your data never has to
              leave" isn't accurate exactly where it'd first get tested.
              Narrowed to "transaction history" when a real-bank option is
              actually on offer; the web/demo-only case has no backend at
              all, so the stronger original claim stays true there. */}
          {hasRealBank
            ? 'Connect a bank for automatic tracking, or add one by hand — your transaction history stays on this device either way.'
            : 'Connect a bank for automatic tracking, or add one by hand — your data never has to leave this device.'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        {onChooseRealBank && (
          <ChoiceCard
            icon="bank"
            title="Connect a bank"
            subtitle="Securely link a real account via Plaid. Your transactions stay on this device -- see Settings for exactly what that means."
            onPress={onChooseRealBank}
            highlight
            disabled={linkingRealBank}
            loading={linkingRealBank}
          />
        )}
        <ChoiceCard
          icon={hasRealBank ? 'sync' : 'bank'}
          title={hasRealBank ? 'Try with sample data' : 'Connect a bank'}
          subtitle={
            hasRealBank
              ? 'See the full app with realistic demo data instead -- no real bank required.'
              : 'Demo linking flow — generates realistic sample accounts and transaction history.'
          }
          onPress={onChooseLink}
          highlight={!hasRealBank}
          disabled={linkingRealBank}
        />
        <ChoiceCard
          icon="pencil"
          title="Add manually"
          subtitle="Type in a balance yourself, or import transactions from a CSV file. No bank connection required."
          onPress={onChooseManual}
          highlight={false}
          disabled={linkingRealBank}
        />
      </View>
    </View>
  );
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  onPress,
  highlight,
  disabled,
  loading,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  highlight?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Card
      level={highlight ? 'raised' : 'resting'}
      onPress={disabled ? undefined : onPress}
      style={{ flexDirection: 'row', alignItems: 'center', borderColor: highlight ? Colors.orangeGlow : undefined, opacity: disabled ? 0.6 : 1 }}
    >
      <IconBadge name={icon} color={highlight ? Colors.orange : Colors.text2} size={44} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text variant="subtitle" weight="semibold">
          {title}
        </Text>
        <Text variant="caption" color={Colors.text3} style={{ marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      {loading ? <ActivityIndicator size="small" color={Colors.orange} /> : <Icon name="chevronRight" size={14} color={Colors.text4} />}
    </Card>
  );
}
