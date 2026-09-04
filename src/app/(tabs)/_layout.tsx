import { Slot } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { DesktopShell } from '@/components/web/DesktopShell';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  // Web only ever renders as the public browser demo (see app/_layout.tsx's
  // auto-seed) -- NativeTabs' web fallback looks/behaves wrong (see
  // docs/HANDOFF.md's notes on the floating-overlay quirk), so web gets its
  // own chrome entirely instead of trying to reuse the native tab bar.
  // Native (iOS/Android, what actually ships) never takes this branch.
  if (Platform.OS === 'web') {
    return (
      <DesktopShell>
        <Slot />
      </DesktopShell>
    );
  }

  return (
    <NativeTabs
      backgroundColor={Colors.surface1}
      iconColor={{ default: Colors.text4, selected: Colors.orange }}
      labelStyle={{ default: { color: Colors.text4 }, selected: { color: Colors.orange } }}
      indicatorColor={Colors.orangeSoft}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle.fill" md="receipt_long" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="budgets">
        <NativeTabs.Trigger.Label>Budgets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.pie.fill" md="pie_chart" />
      </NativeTabs.Trigger>

      {/* IA restructure (design-audit-round-4): "Trends" retired -- its
          content (spending-over-time chart, cash-flow trend) moved into
          Budgets as supporting context; this slot is now the promoted
          Recurring tab (was a pushed/modal screen, buried behind links --
          "way easier to find" from review). Still five tabs either way. */}
      <NativeTabs.Trigger name="recurring">
        <NativeTabs.Trigger.Label>Recurring</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.triangle.2.circlepath" md="autorenew" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
