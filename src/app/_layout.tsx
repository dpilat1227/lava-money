import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { FinanceProvider, useFinance } from '@/lib/store/FinanceContext';
import { OnboardingFlow } from '@/screens/OnboardingFlow';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && __DEV__) {
  // react-native-reanimated's web shim writes a raw kebab-case
  // `transform-origin` DOM style under the hood, which react-dom flags as
  // an "unknown property" dev warning. It's a known upstream quirk of the
  // web target only -- iOS/Android (what this app actually ships to) use
  // Reanimated's real native implementation and never hit this path, so we
  // just quiet the noise in the local web preview rather than chase it.
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // React logs this as a %s-templated format string with the property
    // name as a *separate* arg ("Invalid DOM property `%s`..." / "transform-origin"),
    // not inline in args[0] -- checking only args[0] never matched, which is
    // why this was still showing up despite the filter existing.
    if (args.some(a => typeof a === 'string' && a.includes('transform-origin'))) return;
    originalConsoleError(...args);
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <FinanceProvider>
          <RootNavigator />
        </FinanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Onboarding is a plain component, not a router screen -- there is nothing
 * to deep-link to before a single account exists, and it saves having to
 * coordinate a redirect race between the tab navigator mounting and the
 * "you have zero accounts" check. Once `linkInstitution` resolves, accounts
 * flips to non-empty and this same component tree swaps to the real Stack. */
function RootNavigator() {
  const { isHydrated, accounts, linkInstitution } = useFinance();
  const seeded = useRef(false);

  // Web only ever exists as the public, no-signup browser demo linked from
  // lavamoney.io (see components/web/DesktopShell.tsx's DemoBanner) -- there
  // is no one to show onboarding to, so skip straight to two "linked"
  // institutions worth of realistic mock history via the exact same
  // generator the real onboarding flow's Link flow uses. Native builds
  // never take this path and still show OnboardingFlow as before.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isHydrated || accounts.length > 0 || seeded.current) return;
    seeded.current = true;
    linkInstitution('north-star-bank');
    linkInstitution('harbor-credit-union');
  }, [isHydrated, accounts.length, linkInstitution]);

  if (!isHydrated) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  if (accounts.length === 0) {
    // Web: brief blank frame while the effect above seeds demo data, not
    // OnboardingFlow -- that screen's copy/CTAs are written for someone
    // about to link their own real accounts, which no demo visitor is doing.
    if (Platform.OS === 'web') return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
    return <OnboardingFlow />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="link-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="account/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="review-categories" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recurring" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
