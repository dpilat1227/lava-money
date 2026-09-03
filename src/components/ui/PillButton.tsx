import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'danger';

const TONE_STYLE: Record<Tone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: Colors.surface2, border: Colors.border2, fg: Colors.text2 },
  accent: { bg: Colors.orangeSoft, border: `${Colors.orange}33`, fg: Colors.orange },
  danger: { bg: Colors.redSoft, border: 'rgba(248,113,113,0.25)', fg: Colors.red },
};

/**
 * The "pill action row" primitive -- Copilot puts a row of these under
 * transaction detail (and reuses the shape for budget/recurring-card
 * actions); ours is a shared component instead of a per-screen custom
 * Pressable so every action row in the app (transaction detail first,
 * more to follow) shares one touch target size and tone convention.
 */
export function PillButton({ label, icon, onPress, tone = 'neutral' }: { label: string; icon?: IconName; onPress: () => void; tone?: Tone }) {
  const t = TONE_STYLE[tone];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: t.bg, borderColor: t.border }, pressed && { opacity: 0.7 }]}>
      {icon && <Icon name={icon} size={13} color={t.fg} />}
      <Text variant="caption" weight="semibold" color={t.fg}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
