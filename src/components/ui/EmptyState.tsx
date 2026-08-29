import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji, title, subtitle, action }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={{ fontSize: 40, marginBottom: Spacing.md }}>{emoji}</Text>
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
});
