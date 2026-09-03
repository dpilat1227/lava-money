import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Icon, type IconName } from './Icon';

/**
 * The generic-icon counterpart to `CategoryIcon`'s circle treatment --
 * a diagonal-gradient, glow-shadowed circle around a vector `Icon` for list
 * rows that aren't tied to a spending category (export, sync, security,
 * appearance, danger-zone actions). Same visual language, different icon
 * source -- see `CategoryIcon`'s comment for why the gradient+glow style
 * is duplicated rather than shared.
 */
export function IconBadge({ name, color, size = 34 }: { name: IconName; color: string; size?: number }) {
  return (
    <LinearGradient
      colors={[`${color}12`, `${color}30`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}40`, shadowColor: color }]}
    >
      <Icon name={name} size={size * 0.5} color={color} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
