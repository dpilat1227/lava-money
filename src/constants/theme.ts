/**
 * Design tokens ported from LavaMesh's web app (app/globals.css) so this app
 * reads as the same brand, not a generic finance-app template. LavaMesh is
 * dark-only (no light mode toggle anywhere on the site), so this app is
 * dark-only too — deliberately, not an oversight. If light mode ever matters,
 * add a second palette object and a scheme switch; don't retrofit this one.
 */
import { Platform } from 'react-native';

export const Colors = {
  bg: '#080706',
  surface1: '#1c1916',
  surface2: '#262220',
  surface3: '#322d27',
  surface4: '#403a32',
  /** Card fill — translucent so it reads as "lifted," not pasted on top. */
  surfaceCard: 'rgba(255,130,60,0.05)',

  border1: 'rgba(255,235,215,0.07)',
  border2: 'rgba(255,235,215,0.11)',
  border3: 'rgba(255,235,215,0.18)',

  text1: '#f7f4f1',
  text2: '#d9d3cb',
  text3: '#a49b90',
  text4: '#6f665b',
  textAccent: '#5b7ca5',

  orange: '#ff7300',
  orangeDim: '#cc5c00',
  orangeCta: '#e65000',
  orangeGlow: 'rgba(255,115,0,0.25)',
  orangeSoft: 'rgba(255,115,0,0.12)',

  green: '#3ddc84',
  greenSoft: 'rgba(61,220,132,0.12)',
  red: '#f87171',
  redSoft: 'rgba(248,113,113,0.12)',
  amber: '#fbbf24',
  amberSoft: 'rgba(251,191,36,0.12)',
  purple: '#a78bfa',
  purpleSoft: 'rgba(167,139,250,0.12)',
  blue: '#60a5fa',
  blueSoft: 'rgba(96,165,250,0.12)',
  pink: '#f472b6',
  pinkSoft: 'rgba(244,114,182,0.12)',
} as const;

/** Category/chart palette — order matters, it's assigned round-robin to
 * categories so two adjacent categories in a legend don't collide. */
export const ChartPalette = [
  Colors.orange,
  Colors.blue,
  Colors.purple,
  Colors.green,
  Colors.amber,
  Colors.pink,
  Colors.red,
  Colors.textAccent,
] as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** LavaMesh's web fonts (Inter / Space Grotesk / JetBrains Mono) are loaded
 * via @expo-google-fonts/* in src/app/_layout.tsx and referenced here by the
 * family names react-native-google-fonts registers them under. Falls back to
 * the system font until the async font load resolves on first paint. */
export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  monoLoaded: 'JetBrainsMono_500Medium',
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#140800',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: '#140800',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#0f0600',
    shadowOpacity: 0.48,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
} as const;
