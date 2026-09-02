import React from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Elevation, Motion, Radius, Spacing } from '@/constants/theme';

type Level = 'resting' | 'raised' | 'glass';

interface Props extends ViewProps {
  /** Which rung of the Ember elevation scale this surface sits on. Most
   * cards stay at the default; reach for `raised` for the one hero surface
   * per screen (see `Elevation` in constants/theme.ts for the full rule). */
  level?: Level;
  /** Makes the card a press target with native-thread scale feedback
   * instead of wrapping it in a separate Pressable at every call site. */
  onPress?: () => void;
}

export function Card({ style, children, level = 'resting', onPress, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!onPress) {
    return (
      <View style={[styles.base, Elevation[level], style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(Motion.pressScale, { duration: Motion.duration.fast });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: Motion.duration.fast });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
    >
      <Animated.View style={[styles.base, Elevation[level], animatedStyle, style]} {...rest}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
});
