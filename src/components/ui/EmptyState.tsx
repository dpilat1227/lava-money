import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  /** Legacy path -- a raw emoji, rendered plain. Prefer `icon` for new call
   * sites; kept so nothing currently passing `emoji` breaks. */
  emoji?: string;
  /** A vector icon (usually `<Icon .../>`), shown inside a soft glow badge
   * instead of a bare emoji glyph -- matches the rest of the Ember system's
   * "nothing is a raw system-font glyph floating on black" rule. */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji, icon, title, subtitle, action }: Props) {
  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={styles.iconBadge}>{icon}</View>
      ) : emoji ? (
        <Text style={{ fontSize: 40, marginBottom: Spacing.md }}>{emoji}</Text>
      ) : null}
      <Text variant="title" style={{ textAlign: 'center', marginBottom: subtitle ? 6 : 0 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color={Colors.text3} style={{ textAlign: 'center', maxWidth: 280 }}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: Spacing.xl }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceCardRaised,
    borderWidth: 1,
    borderColor: Colors.border2,
    marginBottom: Spacing.md,
  },
});
