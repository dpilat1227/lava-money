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
  /** One step up from surfaceCard — for the single hero surface on a screen
   * (net-worth card, an in-focus row) that should read as more present than
   * its neighbors without becoming a different component. See `Elevation`. */
  surfaceCardRaised: 'rgba(255,140,60,0.09)',
  /** Sheet/modal fill — deliberately closer to opaque than any card tint,
   * since sheets sit *above* the whole screen, not beside other cards. Used
   * as the fallback fill when `expo-glass-effect`'s native material isn't
   * available (Android/web); on iOS the glass view supplies its own material
   * and this only shows through at the edges. */
  surfaceGlass: 'rgba(24,19,16,0.82)',

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

/**
 * "Ember" elevation scale — every surface in the app picks one of these
 * instead of hand-rolling a fill/border/shadow combo. Before this, `Card`
 * and every ad-hoc row/tile used the exact same flat tint
 * (`surfaceCard` + `border1` + no shadow), so a net-worth hero, a settings
 * row, and a budget tile were visually indistinguishable — nothing on
 * screen could out-rank anything else. Three levels, not five: more than
 * three and the eye stops being able to tell them apart anyway.
 *
 * - `resting` — the default. Most cards, most of the time.
 * - `raised` — the one hero surface per screen that should read as more
 *   present (net worth, an expanded row, a selected chip).
 * - `glass` — sheets, modals, popovers: things floating *above* the screen
 *   rather than laid out within it. Pair with `GlassSurface` so iOS gets a
 *   real Liquid Glass material and Android/web get this fill as a fallback.
 */
export const Elevation = {
  resting: {
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.border1,
    borderWidth: 1,
    ...Shadow.sm,
  },
  raised: {
    backgroundColor: Colors.surfaceCardRaised,
    borderColor: Colors.border2,
    borderWidth: 1,
    ...Shadow.md,
  },
  glass: {
    backgroundColor: Colors.surfaceGlass,
    borderColor: Colors.border3,
    borderWidth: 1,
    ...Shadow.lg,
  },
} as const;

/**
 * The accent budget — where `Colors.orange` (and its variants) is and isn't
 * allowed to appear. This is a convention, not something TypeScript can
 * enforce, but naming it here means every screen redesign in this overhaul
 * can point back to one rule instead of re-deriving it: orange is *earned*
 * by being the most important thing on the screen, not sprinkled evenly.
 *
 * Allowed:
 *  - the brand mark / flame glow
 *  - exactly one hero number or primary metric per screen
 *  - the single primary action (Button's default variant)
 *  - active/selected state on tabs, chips, and toggles
 *  - direct correctness signals (an over-budget bar, a warning row)
 *
 * Not allowed:
 *  - decorative icon tinting when a category already has its own color
 *  - more than one "loudest" element competing for attention on one screen
 *  - default/resting states of things that aren't selected or primary
 */
export const AccentUsage = {
  brandMark: Colors.orange,
  heroMetric: Colors.orange,
  primaryAction: Colors.orangeCta,
  selected: Colors.orange,
  warning: Colors.amber,
  danger: Colors.red,
} as const;

/**
 * Motion tokens for the Reanimated pass — spring configs tuned for "warm,"
 * not "bouncy." A flame doesn't overshoot and wobble; it settles. Every
 * press/entrance animation in the overhaul should reference one of these
 * instead of a bespoke `withSpring` call so the whole app moves with one
 * consistent hand instead of a different feel per screen.
 */
export const Motion = {
  spring: {
    /** Press feedback, toggles — fast settle, minimal overshoot. */
    snappy: { damping: 18, stiffness: 260, mass: 0.7 },
    /** List entrances, sheet presentation — a touch softer, still quick. */
    gentle: { damping: 16, stiffness: 160, mass: 0.9 },
    /** Number count-ups, hero-value changes — slow enough to read as a
     * value actually *changing*, not just re-rendering. */
    settle: { damping: 20, stiffness: 90, mass: 1 },
  },
  duration: {
    fast: 120,
    base: 220,
    slow: 360,
  },
  /** Scale applied on press-in across buttons, cards, and rows so touch
   * feedback is consistent everywhere it appears. */
  pressScale: 0.97,
  /** Per-item delay step for staggered list entrances. */
  staggerStep: 32,
} as const;
