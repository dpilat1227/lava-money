import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';

/**
 * The generic-icon counterpart to `CategoryIcon`'s circle treatment --
 * a tinted circle around a vector `Icon` for list rows that aren't tied to
 * a spending category (export, sync, security, appearance, danger-zone
 * actions). Same visual language, different icon source.
 */
export function IconBadge({ name, color, size = 34 }: { name: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}1c`, borderColor: `${color}40` }]}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
