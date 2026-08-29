import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', loading, fullWidth, onPress, disabled, ...rest }: Props) {
  const bg = variant === 'primary' ? Colors.orangeCta : variant === 'secondary' ? Colors.surface3 : 'transparent';
  const textColor = variant === 'ghost' ? Colors.orange : Colors.text1;

  return (
    <Pressable
      onPress={e => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.8 : disabled ? 0.5 : 1, width: fullWidth ? '100%' : undefined },
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text variant="subtitle" weight="semibold" color={textColor}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
