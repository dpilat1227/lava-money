import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { FinanceProvider, useFinance } from '@/lib/store/FinanceContext';
import { OnboardingFlow } from '@/screens/OnboardingFlow';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <FinanceProvider>
        <RootNavigator />
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

/** Onboarding is a plain component, not a router screen -- there is nothing
 * to deep-link to before a single account exists, and it saves having to
 * coordinate a redirect race between the tab navigator mounting and the
 * "you have zero accounts" check. Once `linkInstitution` resolves, accounts
 * flips to non-empty and this same component tree swaps to the real Stack. */
function RootNavigator() {
  const { isHydrated, accounts } = useFinance();

  if (!isHydrated) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  if (accounts.length === 0) {
    return <OnboardingFlow />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="link-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
