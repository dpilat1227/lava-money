import React from 'react';
import { GlassView, isGlassEffectAPIAvailable, type GlassStyle } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Elevation, Radius } from '@/constants/theme';

/**
 * Sheets, modals, and floating overlays should feel like they're sitting
 * *above* the screen, not just another card laid into it -- real depth
 * through translucency, not a bigger shadow. On iOS 26+ this renders
 * Apple's actual Liquid Glass material via `expo-glass-effect`; everywhere
 * else (older iOS, Android, web preview) it falls back to
 * `Elevation.glass`'s near-opaque tinted fill, which is a fine approximation
 * even if it isn't a live blur.
 */
export function GlassSurface({
  style,
  glassStyle = 'regular',
  radius = Radius.xl,
  children,
  ...rest
}: ViewProps & { glassStyle?: GlassStyle; radius?: number }) {
  const canUseGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  if (canUseGlass) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor="rgba(120,60,20,0.28)"
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallback, { borderRadius: radius }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Elevation.glass.backgroundColor,
    borderColor: Colors.border3,
    borderWidth: 1,
  },
});
