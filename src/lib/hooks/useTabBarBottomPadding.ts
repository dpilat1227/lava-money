import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Design-audit-round-3 fix: every tab screen's `ScrollView`/`SectionList`
 * used a flat `paddingBottom: Spacing.xxxl` (48) with no awareness of the
 * tab bar sitting on top of it -- "can't scroll all the way down" on every
 * tab. The tabs are `NativeTabs` ((tabs)/_layout.tsx), i.e. a *real* native
 * `UITabBar`/`BottomNavigationView`, not a JS tab navigator that would
 * have injected this padding automatically. iOS's tab bar is a fixed 49pt
 * of content *on top of* the home-indicator safe-area inset (already
 * available via `useSafeAreaInsets().bottom`, 0-34pt depending on device)
 * -- 48px alone was short by as much as 35px on notched/Dynamic-Island
 * phones. Android's Material bottom nav defaults to 56dp; kept as a
 * reasonable estimate since `NativeTabs` doesn't expose its rendered
 * height directly.
 *
 * Web never takes this path (`DesktopShell`'s own chrome has no bottom tab
 * bar), so callers should only reach for this on the five native tab
 * screens -- the extra padding would just be dead space anywhere else.
 */
const IOS_TAB_BAR_CONTENT_HEIGHT = 49;
const ANDROID_TAB_BAR_HEIGHT_ESTIMATE = 56;

export function useTabBarBottomPadding(extra: number = Spacing.xxxl): number {
  const insets = useSafeAreaInsets();
  // Settings renders on web too (inside DesktopShell's sidebar layout, no
  // desktop-specific variant) -- DesktopShell has no bottom tab bar at
  // all, so web gets plain `extra` here, same as every other web screen.
  if (Platform.OS === 'web') return extra;
  const tabBarHeight = Platform.OS === 'ios' ? IOS_TAB_BAR_CONTENT_HEIGHT + insets.bottom : ANDROID_TAB_BAR_HEIGHT_ESTIMATE;
  return tabBarHeight + extra;
}
