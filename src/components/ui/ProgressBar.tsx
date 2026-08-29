import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

interface Props {
  pct: number; // 0..1+ 
  color?: string;
  height?: number;
}

export function ProgressBar({ pct, color = Colors.orange, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(1, pct));
  const overBudget = pct > 1;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: overBudget ? Colors.red : color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
  },
});
