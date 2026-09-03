import React from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Colors, Elevation, Motion, Radius, Spacing } from '@/constants/theme';

type Level = 'flat' | 'resting' | 'raised' | 'glass';

interface Props extends ViewProps {
  /** Which rung of the Ember elevation scale this surface sits on. Most
   * cards stay at the default; reach for `raised` for the one hero surface
   * per screen (see `Elevation` in constants/theme.ts for the full rule). */
  level?: Level;
  /** Makes the card a press target with native-thread scale feedback
   * instead of wrapping it in a separate Pressable at every call site. */
  onPress?: () => void;
}

/**
 * `raised` cards get a real backdrop blur behind their tint -- ported from
 * LavaMesh's web `StatsHero`/`NetworkTopology` (`backdropFilter: blur(20px)`
 * over the atmosphere gradient). RN has no CSS backdrop-filter, so this is
 * a `BlurView` (samples whatever's on screen behind it, i.e. `Atmosphere`
 * and scrolled content) with the same translucent warm tint painted as a
 * separate layer *on top* of the blur rather than as the container's own
 * background -- otherwise the tint would get sampled into the blur along
 * with everything behind it instead of sitting cleanly over it.
 */
function RaisedBackdrop() {
  return (
    <>
      <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surfaceCardRaised }]} />
    </>
  );
}

export function Card({ style, children, level = 'resting', onPress, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const blurred = level === 'raised';
  // `backgroundColor` is dropped here since `RaisedBackdrop` paints the same tint as its own layer, on top of the blur rather than under it.
  const elevationStyle = blurred ? { ...Elevation.raised, backgroundColor: 'transparent' } : Elevation[level];
  const content = (
    <>
      {blurred && <RaisedBackdrop />}
      {children}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.base, elevationStyle, blurred && styles.clip, style]} {...rest}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated by design; this isn't React state.
        scale.value = withTiming(Motion.pressScale, { duration: Motion.duration.fast });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability -- see onPressIn above.
        scale.value = withTiming(1, { duration: Motion.duration.fast });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
    >
      <Animated.View style={[styles.base, elevationStyle, blurred && styles.clip, animatedStyle, style]} {...rest}>
        {content}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    // Copilot/Linear both settle on ~24-32px card padding; Spacing.lg (16)
    // read as cramped everywhere it showed up in review. Padding-only
    // change -- every card in the app gets more breathing room, nothing
    // gets tighter.
    padding: Spacing.xl,
  },
  clip: {
    overflow: 'hidden',
  },
});
