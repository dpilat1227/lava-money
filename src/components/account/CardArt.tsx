import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';

const ASPECT_RATIO = 1.586; // ISO 7810 card ratio

/**
 * A rendered card graphic for `credit_card` accounts -- Brex's Wallet
 * screen shows an actual card image rather than a generic bank-tile icon,
 * and it's the single most distinctive idea from that reference. Purely
 * illustrative: a gradient built from the institution's brand color,
 * masked digits, and a generic dual-ring mark standing in for a network
 * logo -- not a recreation of any real card network's design, since this
 * is a mock institution (see lib/mock/institutions.ts), not a real bank.
 */
export function CardArt({
  institutionName,
  accountName,
  mask,
  color,
}: {
  institutionName: string;
  accountName: string;
  mask: string;
  color: string;
}) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[`${color}66`, Colors.surface1, Colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <Text variant="micro" weight="semibold" color={Colors.text2} numberOfLines={1} style={styles.issuer}>
          {institutionName.toUpperCase()}
        </Text>
        <View style={styles.chip} />
      </View>
      <Text variant="subtitle" weight="semibold" color={Colors.text1} style={styles.digits}>
        •••• •••• •••• {mask}
      </Text>
      <View style={styles.bottomRow}>
        <Text variant="caption" color={Colors.text2} numberOfLines={1} style={{ flex: 1 }}>
          {accountName}
        </Text>
        <NetworkMark color={color} />
      </View>
    </View>
  );
}

function NetworkMark({ color }: { color: string }) {
  return (
    <View style={styles.networkMark}>
      <View style={[styles.networkCircle, { backgroundColor: `${color}aa` }]} />
      <View style={[styles.networkCircle, styles.networkCircleOverlap, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    aspectRatio: ASPECT_RATIO,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 18,
    justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  issuer: { flex: 1, letterSpacing: 1.2, marginRight: 8 },
  chip: {
    width: 26,
    height: 19,
    borderRadius: 4,
    backgroundColor: 'rgba(255,224,180,0.55)',
  },
  digits: { letterSpacing: 2.5, fontVariant: ['tabular-nums'] },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  networkMark: { flexDirection: 'row', width: 30, justifyContent: 'flex-end' },
  networkCircle: { width: 18, height: 18, borderRadius: 9 },
  networkCircleOverlap: { marginLeft: -8 },
});
