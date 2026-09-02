import React from 'react';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Native vector iconography (real SF Symbols on iOS, Material Symbols on
 * Android/web via `expo-symbols`) for generic UI chrome -- chevrons, close
 * buttons, the action row on a transaction, etc. This is the "expo-symbols"
 * half of the overhaul plan's iconography item; the other half
 * (`CategoryGlyph`) hand-draws the category set instead, since Material
 * Symbols and SF Symbols don't share a naming scheme and category concepts
 * ("dining," "subscriptions") don't map cleanly to either catalog.
 *
 * Every key here is a name verified to exist in both catalogs (the tab bar
 * in `(tabs)/_layout.tsx` already relies on the same `sf`/`md` pairing
 * convention) -- add new keys by checking both spellings before using them,
 * an invalid symbol name renders blank instead of falling back.
 */
const ICONS = {
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  close: { ios: 'xmark', android: 'close' },
  plus: { ios: 'plus', android: 'add' },
  plusCircle: { ios: 'plus.circle.fill', android: 'add_circle' },
  search: { ios: 'magnifyingglass', android: 'search' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  arrowUpRight: { ios: 'arrow.up.right', android: 'north_east' },
  arrowDownRight: { ios: 'arrow.down.right', android: 'south_east' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  bank: { ios: 'building.columns.fill', android: 'account_balance' },
  trash: { ios: 'trash.fill', android: 'delete' },
  pencil: { ios: 'pencil', android: 'edit' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list' },
  export: { ios: 'square.and.arrow.up', android: 'ios_share' },
  import: { ios: 'square.and.arrow.down', android: 'download' },
  doc: { ios: 'doc.text.fill', android: 'description' },
  eye: { ios: 'eye.fill', android: 'visibility' },
  eyeOff: { ios: 'eye.slash.fill', android: 'visibility_off' },
  lock: { ios: 'lock.fill', android: 'lock' },
  card: { ios: 'creditcard.fill', android: 'credit_card' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  xCircle: { ios: 'xmark.circle.fill', android: 'cancel' },
  info: { ios: 'info.circle.fill', android: 'info' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, color = Colors.text2 }: { name: IconName; size?: number; color?: string }) {
  const spec = ICONS[name];
  return (
    <SymbolView
      name={{ ios: spec.ios, android: spec.android, web: spec.android }}
      size={size}
      tintColor={color}
      weight="medium"
      style={styles.icon}
      fallback={<FallbackDot size={size} color={color} />}
    />
  );
}

/** Only shown if a platform config is missing entirely (not for an invalid
 * name on a resolved platform) -- a small dot beats a layout-shifting gap. */
function FallbackDot({ size, color }: { size: number; color: string }) {
  return (
    <View style={[styles.icon, { width: size, height: size }]}>
      <Text style={{ color, fontSize: size * 0.6, lineHeight: size }}>·</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
