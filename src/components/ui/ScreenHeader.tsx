import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/**
 * Every tab screen except Home renders through here, and none of them wrap
 * in a SafeAreaView (only the modal screens do -- see app/account/[id].tsx
 * etc.) -- NativeTabs is a real native tab bar controller, not a header
 * navigator, so nothing was ever pushing this content below the status
 * bar/notch on a real device. `Spacing.md` alone (12pt) reads fine in a
 * simulator's default chrome-less preview, which is how this shipped
 * without anyone noticing the title colliding with the clock on an actual
 * phone. `top` insets vary by device (Dynamic Island vs. notch vs. none),
 * so this has to come from the actual inset, not a fixed guess.
 */
export function ScreenHeader({ title, subtitle, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={{ flex: 1 }}>
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="#a49b90" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
