import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';

/**
 * First screen of the "add an account" flow, everywhere it appears
 * (onboarding and the link-account modal both delegate here). The two
 * options are deliberately presented as equals, not "connect a bank, or
 * failing that, do it the hard way" -- manual entry is a first-class path
 * in this app, not a fallback.
 */
export function AddAccountChooser({
  onChooseLink,
  onChooseManual,
  onCancel,
}: {
  onChooseLink: () => void;
  onChooseManual: () => void;
  onCancel?: () => void;
}) {
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
          Connect a bank for automatic tracking, or add one by hand — your data never has to leave this device.
        </Text>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        <ChoiceCard
          emoji="🏦"
          title="Connect a bank"
          subtitle="Demo linking flow — generates realistic sample accounts and transaction history."
          onPress={onChooseLink}
        />
        <ChoiceCard
          emoji="✍️"
          title="Add manually"
          subtitle="Type in a balance yourself, or import transactions from a CSV file. No bank connection required."
          onPress={onChooseManual}
          highlight
        />
      </View>
    </View>
  );
}

function ChoiceCard({
  emoji,
  title,
  subtitle,
  onPress,
  highlight,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.cardHighlight,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text variant="subtitle" weight="semibold">
          {title}
        </Text>
        <Text variant="caption" color={Colors.text3} style={{ marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      <Text variant="body" color={Colors.text4}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  cardHighlight: {
    borderColor: Colors.orangeGlow,
    backgroundColor: Colors.orangeSoft,
  },
});
