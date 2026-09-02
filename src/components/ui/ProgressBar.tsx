import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Colors, Motion } from '@/constants/theme';

interface Props {
  pct: number; // 0..1+
  color?: string;
  height?: number;
  /** Skip the fill-in animation -- used when a bar re-renders with the same
   * value on every keystroke (the edit-budget preview bar) so it doesn't
   * replay from zero each time. */
  animate?: boolean;
}

export function ProgressBar({ pct, color = Colors.orange, height = 8, animate = true }: Props) {
  const clamped = Math.max(0, Math.min(1, pct));
  const overBudget = pct > 1;
  const fillColor = overBudget ? Colors.red : color;
  const width = useSharedValue(animate ? 0 : clamped * 100);

  useEffect(() => {
    width.value = withTiming(clamped * 100, { duration: animate ? Motion.duration.slow : 0 });
  }, [clamped, animate, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          animatedStyle,
          {
            height: '100%',
            borderRadius: height / 2,
            backgroundColor: fillColor,
            shadowColor: fillColor,
            shadowOpacity: 0.55,
            shadowRadius: height,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.surface2,
  },
});
