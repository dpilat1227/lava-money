import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  label: string;
  color?: string;
  soft?: string;
}

export function Badge({ label, color = Colors.orange, soft }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ?? `${color}20`, borderColor: `${color}33` }]}>
      <Text variant="micro" weight="semibold" color={color}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
