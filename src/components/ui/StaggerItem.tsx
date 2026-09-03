import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

interface Props {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Caps the compounding per-item delay -- important for long or virtualized
   * lists, where a raw `index * staggerStep` would leave far-down rows
   * waiting over a second to appear. */
  maxDelay?: number;
}

export function StaggerItem({ index, children, style, maxDelay = 240 }: Props) {
  const delay = Math.min(index * Motion.staggerStep, maxDelay);

  // react-native-reanimated's web layout-animation shim writes a raw
  // kebab-case `transform-origin` DOM style, which React logs as an
  // "invalid DOM property" dev warning -- harmless, but noisy in the web
  // preview. iOS/Android (the actual ship targets) use the real native
  // implementation and never hit this path, so we just skip the entrance
  // animation on web rather than fight the shim.
  if (Platform.OS === 'web') {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(Motion.duration.base).springify().damping(20).mass(0.7)} style={style}>
      {children}
    </Animated.View>
  );
}
