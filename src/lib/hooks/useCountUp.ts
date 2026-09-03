import { useEffect, useState } from 'react';
import { Easing, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

/**
 * Drives a number from its previous value to `target` with a Reanimated
 * spring/timing curve, bridging the animated value back to React state so
 * plain <Text> can render it with normal currency/number formatting (Intl
 * calls aren't worklet-safe, so we don't try to format on the UI thread).
 */
export function useCountUp(target: number, duration: number = Motion.duration.slow): number {
  const shared = useSharedValue(target);
  const [display, setDisplay] = useState(target);
  const hasMounted = useSharedValue(false);

  useEffect(() => {
    if (!hasMounted.value) {
      // Animate up from zero on first mount so the hero number feels alive
      // the moment a screen appears, not just on subsequent updates.
      shared.value = 0;
      hasMounted.value = true;
    }
    shared.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useAnimatedReaction(
    () => shared.value,
    val => {
      runOnJS(setDisplay)(val);
    },
    []
  );

  return display;
}
