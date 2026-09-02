import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/**
 * Lava Money's mark — same flame silhouette as the app icon and the
 * lavamoney.io site's FlameMark (components/FlameMark.tsx there). Ported to
 * react-native-svg instead of raw <svg> since RN has no DOM. Kept as its
 * own tiny component (not inlined) because it shows up in more than one
 * place: the Home hero and, eventually, any future "brand moment" screens
 * (onboarding, empty states) that want the same mark instead of reinventing
 * an icon each time.
 */
export function FlameMark({ size = 16, color = Colors.orange }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 600 600" fill="none">
      <Path
        d="M212.5 362.5A62.5 62.5 0 0 0 275 300c0-34.5-12.5-50-25-75-26.8-53.575-5.6-101.35 50-150 12.5 62.5 50 122.5 100 162.5 50 40 75 87.5 75 137.5a175 175 0 1 1-350 0c0-28.825 10.825-57.35 25-75a62.5 62.5 0 0 0 62.5 62.5z"
        fill={color}
      />
    </Svg>
  );
}
