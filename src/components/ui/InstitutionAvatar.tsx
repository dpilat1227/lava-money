import React, { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { Text } from './Text';

/**
 * The institution-initial avatar (Home's account rows, account detail's
 * header, Settings' linked-account rows, the link-account institution
 * list) was four copies of the same flat tinted circle. Consolidated here
 * with the same gradient+glow treatment as `CategoryIcon`/`IconBadge` --
 * see `CategoryIcon`'s comment for why that style is duplicated rather
 * than imported, which doesn't apply here since this one *is* the shared
 * component all four call sites actually wanted.
 */
export function InstitutionAvatar({
  name,
  color,
  size = 36,
  statusColor,
  pulse = false,
}: {
  name: string;
  color: string;
  size?: number;
  statusColor?: string;
  /** See `SyncPresentation.pulse` in `lib/utils/sync.ts` -- reserved for an
   * actual live/synced connection, not just "has a status color." */
  pulse?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={[`${color}12`, `${color}30`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}40`, shadowColor: color }]}
      >
        <Text variant={size >= 40 ? 'subtitle' : 'body'} weight="bold" color={color}>
          {name.charAt(0)}
        </Text>
      </LinearGradient>
      {statusColor && <StatusDot color={statusColor} pulse={pulse} />}
    </View>
  );
}

/** A static dot for stale/error/manual states; a breathing glow ring
 * (Reanimated, matching the SVG `<animate>` pulse LavaMesh's web dashboard
 * uses on its "online" status dots) for an actual live synced connection. */
function StatusDot({ color, pulse }: { color: string; pulse: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!pulse) return;
    progress.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [pulse, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 1.1 }],
    opacity: 0.55 * (1 - progress.value),
  }));

  return (
    <View style={styles.statusWrap}>
      {pulse && <Animated.View style={[styles.statusRing, { backgroundColor: color }, ringStyle]} />}
      <View style={[styles.statusDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  statusWrap: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
});
