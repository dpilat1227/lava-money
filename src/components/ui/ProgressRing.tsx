import React from 'react';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/**
 * The radial counterpart to `ProgressBar` -- reserved for the one "how am I
 * doing overall" number per screen (Budgets' month-to-date ring) rather
 * than every row, which stays linear since a column of rings is harder to
 * scan than a column of bars. Static, not Reanimated-driven -- an animated
 * `strokeDashoffset` needs `Animated.createAnimatedComponent(Circle)` from
 * react-native-svg wired through Reanimated, which is a reasonable follow-up
 * but not worth blocking the visual redesign on.
 */
export function ProgressRing({ pct, size = 84, strokeWidth = 9, color = Colors.orange }: { pct: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));
  const ringColor = pct > 1 ? Colors.red : color;

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.surface2} strokeWidth={strokeWidth} fill="none" />
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
  );
}
