import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, Motion, Radius, Spacing } from '@/constants/theme';
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animatedStyle, { width: fullWidth ? '100%' : undefined }]}>
      <Pressable
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design; this isn't React state.
          scale.value = withTiming(Motion.pressScale, { duration: Motion.duration.fast });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- see onPressIn above.
          scale.value = withTiming(1, { duration: Motion.duration.fast });
        }}
        onPress={e => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.(e);
        }}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: bg, opacity: pressed ? 0.9 : disabled ? 0.5 : 1, width: fullWidth ? '100%' : undefined },
        ]}
        {...rest}
      >
        {loading ? <ActivityIndicator color={textColor} /> : <Text variant="subtitle" weight="semibold" color={textColor}>{label}</Text>}
      </Pressable>
    </Animated.View>
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
