import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Breakpoints, Colors, Spacing } from '@/constants/theme';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

/**
 * Shown only on the web build (see DesktopShell) -- this target only ever
 * exists as the public, no-signup "try it in your browser" demo linked from
 * lavamoney.io, seeded with fake data by RootNavigator in app/_layout.tsx.
 * Same disclosure Tallyo's own demo uses ("data is fictional and lives in
 * your browser"), just in Ember's card language instead of a bright
 * warning-yellow strip -- this isn't actually a warning, it's context.
 *
 * Copy fix (redesign pass 2): the old "nothing is stored anywhere" line was
 * actually inaccurate -- `lib/store/persistence.ts` does write this seeded
 * data to AsyncStorage/localStorage, which is *why* reloading the demo in
 * the same browser keeps the same numbers instead of re-rolling them every
 * time. "Nothing is stored" was describing "not uploaded to a server,"
 * which is true, but read as "this won't even persist for me," which isn't.
 */
export function DemoBanner() {
  const { width } = useWindowDimensions();
  const narrow = width < Breakpoints.wide;

  return (
    <View style={[styles.root, narrow && styles.rootNarrow]}>
      {!narrow && <Icon name="info" size={14} color={Colors.text3} />}
      <Text variant="micro" color={Colors.text3} style={{ flex: 1 }} numberOfLines={narrow ? 2 : 1}>
        {narrow
          ? 'Demo mode — fake data, stored only in this browser.'
          : 'Demo mode — this data is fictional and stored only in this browser, never uploaded anywhere. It sticks around until you clear your browser data.'}
      </Text>
      <Pressable onPress={() => Linking.openURL('https://lavamoney.io')} hitSlop={8}>
        <Text variant="micro" weight="semibold" color={Colors.orange}>
          Get Lava Money →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  rootNarrow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
});
