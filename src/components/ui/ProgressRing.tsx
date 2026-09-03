import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/**
 * The radial counterpart to `ProgressBar` -- reserved for the one "how am I
 * doing overall" number per screen (Budgets' hero, Recurring's hero) rather
 * than every row, which stays linear since a column of rings is harder to
 * scan than a column of bars. Static, not Reanimated-driven -- an animated
 * `strokeDashoffset` needs `Animated.createAnimatedComponent(Circle)` from
 * react-native-svg wired through Reanimated, which is a reasonable follow-up
 * but not worth blocking the visual redesign on.
 *
 * `children` renders centered inside the ring (an emoji, an icon, a short
 * number) -- every Copilot screen that uses this shape puts *something* in
 * the middle rather than leaving a hollow circle, and centering math that
 * depends on `size`/`strokeWidth` belongs here once, not re-derived at
 * every call site.
 */
export function ProgressRing({
  pct,
  size = 84,
  strokeWidth = 9,
  color = Colors.orange,
  trackColor = Colors.surface2,
  children,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  // Three-state traffic light instead of a single fixed color -- "82% of
  // budget spent, still green" was quietly useless for the one screen
  // whose entire job is warning someone before they go over.
  const ringColor = pct > 1 ? Colors.red : pct >= 0.85 ? Colors.amber : color;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children && <View style={StyleSheet.absoluteFill}>{<View style={styles.center}>{children}</View>}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
