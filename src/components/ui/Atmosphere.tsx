import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/**
 * Ported from LavaMesh's web `--atmosphere` CSS variable (`app/globals.css`
 * on the marketing/dashboard site): a diagonal near-black base with two
 * soft radial glows -- warm orange top-right, ember-red bottom-left -- that
 * makes every screen feel "lit" instead of pasted on flat black. Every tab
 * screen renders this once, absolutely positioned behind its ScrollView,
 * instead of a solid `Colors.bg` fill.
 *
 * `expo-linear-gradient` only draws linear gradients, so the diagonal base
 * uses that; the two radial glows are drawn with `react-native-svg`
 * (already a dependency, same technique `NetWorthHero`'s ambient glow
 * uses) since RN has no native radial-gradient view.
 */
export function Atmosphere() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#0c0603', '#060302', '#030202']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="atmosphereOrange" cx="90%" cy="-8%" r="70%">
            <Stop offset="0" stopColor={Colors.orange} stopOpacity={0.22} />
            <Stop offset="1" stopColor={Colors.orange} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="atmosphereRed" cx="-8%" cy="106%" r="65%">
            <Stop offset="0" stopColor="#d62040" stopOpacity={0.15} />
            <Stop offset="1" stopColor="#d62040" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#atmosphereOrange)" />
        <Rect width={width} height={height} fill="url(#atmosphereRed)" />
      </Svg>
    </View>
  );
}
