import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Atmosphere, GlassSurface } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';

/**
 * Wide-web-only centered dialog -- for screens that are "one item's detail"
 * (a transaction, a review queue) rather than a real section of the app.
 * These routes (transaction/[id], review-categories) are sibling
 * `Stack.Screen`s outside the `(tabs)` group (see app/_layout.tsx), so they
 * never pass through `DesktopShell` and previously just stretched their
 * full-screen mobile layout edge-to-edge in the browser. This wraps that
 * same content in a constrained, centered card instead -- modeled on the
 * LavaMesh popup reference (rounded card, "Close" text top-right) with more
 * internal breathing room, Linear-dialog-style, since ours needs to fit a
 * few more rows and CTAs than that one did.
 *
 * There's no real page underneath to blur (the previous route unmounts on
 * web navigation, unlike a true DOM overlay), so the backdrop is the same
 * `Atmosphere` gradient every screen uses rather than a blur-over-content
 * effect that would have nothing behind it to sample.
 */
export function Dialog({
  onClose,
  maxWidth = 520,
  children,
}: {
  onClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  useEscapeToClose(onClose);

  return (
    <View style={styles.root}>
      <Atmosphere />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.centerWrap}>
        <GlassSurface radius={Radius.xl} style={[styles.panel, { maxWidth, maxHeight: Math.min(760, height - Spacing.xxxl * 2) }]}>
          {/* Swallows the tap so it doesn't fall through to the backdrop's onClose. */}
          <Pressable onPress={e => e.stopPropagation()} style={styles.panelInner}>
            {children}
          </Pressable>
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  centerWrap: { width: '100%', maxWidth: 640, alignItems: 'center' },
  panel: { width: '100%', padding: 0, overflow: 'hidden' },
  panelInner: { flex: 1 },
});
