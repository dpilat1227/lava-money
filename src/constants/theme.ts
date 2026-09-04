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
  /** Card fill — translucent so it reads as "lifted," not pasted on top.
   * Used only for momentary press feedback (`TransactionRow`'s
   * `rowPressed`) -- NOT a general-purpose card background; see
   * `surfaceSubtle` for that. */
  surfaceCard: 'rgba(255,130,60,0.05)',
  /** Design-audit-round-3 fix: this used to be `rgba(255,140,60,0.16)` --
   * translucent *orange* -- which is exactly the "gross dull orange fill"
   * flagged on Budgets/Trends/Recurring's hero cards, and a direct
   * contradiction of `AccentUsage`'s own rule below ("not allowed: default/
   * resting states of things that aren't selected or primary"). A hero
   * card being the most important thing on screen doesn't make it
   * "selected" -- orange was leaking in as ambient color instead of a
   * deliberate accent. Neutral warm-dark instead: paired with the same
   * blur layer (see Card.tsx's RaisedBackdrop) this still reads as a
   * distinct, premium "frosted glass" surface -- just tinted dark, not
   * orange. Orange stays reserved for what's *inside* these cards (a ring
   * stroke, a hairline, the hero number itself when status-relevant). */
  surfaceCardRaised: 'rgba(19,16,14,0.6)',
  /** Design-audit-round-3: the tier below raised (`Elevation.resting`) used
   * to be a solid `surface2` fill -- fine as one card among cards, but
   * once every settings row, accounts list, and secondary info card
   * *also* used the identical solid-grey treatment, the whole app read as
   * "flat grey slabs stacked on top of each other" with nothing to tell a
   * hero moment from a settings row. List-shaped groupings (Settings'
   * sections, Home's Accounts/Upcoming, BudgetList) now skip a card
   * background entirely -- rows sit directly on `bg`, separated by
   * `border1` hairlines, the same treatment Activity's transaction list
   * already had. This is what's left for the handful of *secondary*
   * single-purpose cards that aren't a list and aren't the one hero on
   * screen (`SpendingCard`, `CashFlowCard`, `NeedsAttentionCard`,
   * `GetStartedNudge`) -- present enough to read as
   * "grouped," not present enough to compete with the actual hero card. */
  surfaceSubtle: 'rgba(255,241,225,0.035)',
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

  // Added in the design-audit pass -- CATEGORIES in lib/mock/categories.ts
  // had grown to 11 non-reserved expense categories while ChartPalette
  // only had 8 entries, so several were silently cycling onto the same
  // color (dining == entertainment, transport == personal_care, groceries
  // == travel, plus shopping landing on the same red as Fees & Interest).
  // These give each category room for its own unique, distinct hue.
  yellow: '#facc15',
  yellowSoft: 'rgba(250,204,21,0.12)',
  lime: '#a3e635',
  limeSoft: 'rgba(163,230,53,0.12)',
  teal: '#2dd4bf',
  tealSoft: 'rgba(45,212,191,0.12)',
  cyan: '#22d3ee',
  cyanSoft: 'rgba(34,211,238,0.12)',
  sky: '#38bdf8',
  skySoft: 'rgba(56,189,248,0.12)',
  indigo: '#818cf8',
  indigoSoft: 'rgba(129,140,248,0.12)',
  fuchsia: '#e879f9',
  fuchsiaSoft: 'rgba(232,121,249,0.12)',

  // Design-audit pass round 2 -- swatch-testing the round-1 palette above
  // surfaced two more collisions once actually rendered as filled circles
  // (hue-degree math said these were "far enough apart," but perceived
  // similarity doesn't track hue degrees linearly): subscriptions'
  // `yellow` sat next to utilities' `amber` closely enough to read as the
  // same gold at a glance, and entertainment's `indigo` clustered with
  // transport's `blue` and travel's `sky` into one indistinct blue-purple
  // blob. `brown` gives subscriptions its own lane; `rose` gives
  // entertainment one too, chosen specifically far from `red` (subscriptions
  // and entertainment are both routine, non-alarming spend -- a rose that
  // reads as "a shade of red" would wrongly borrow this app's fee/overspend
  // signal color). `pink` (`institutions.ts`, `ChartPalette`) is a
  // different, lighter hue and stays as-is -- this is deliberately a
  // separate token, not a rename.
  brown: '#b8763e',
  brownSoft: 'rgba(184,118,62,0.12)',
  rose: '#ec4899',
  roseSoft: 'rgba(236,72,153,0.12)',
} as const;

/** General-purpose chart/series palette (institution color-hashing for
 * Plaid, any future multi-series chart) -- NOT what categories use for
 * their own color anymore (see CATEGORIES in lib/mock/categories.ts,
 * which assigns each an explicit, non-repeating color instead of cycling
 * this list, specifically to keep green/red reserved for this app's
 * "good/bad" semantics -- income, positive change, under-budget vs. fees,
 * negative change, over-budget). Fine for this list to include green/red;
 * an institution or arbitrary series has no such semantic conflict. */
export const ChartPalette = [
  Colors.orange,
  Colors.blue,
  Colors.purple,
  Colors.green,
  Colors.amber,
  Colors.pink,
  Colors.red,
  Colors.teal,
  Colors.indigo,
  Colors.lime,
  Colors.cyan,
  Colors.sky,
  Colors.fuchsia,
  Colors.yellow,
  Colors.brown,
  Colors.rose,
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
  /** Gap between *major* blocks on a screen -- the hero and the card row
   * below it, one card section and the next. Not used for anything inside
   * a single card/row; this is section-level rhythm (Robinhood/Copilot
   * both run 64-96px between blocks, not the 24-32px this app used to cap
   * out at everywhere, which is why dense screens read as one undifferentiated
   * wall instead of a sequence of distinct moments). */
  section: 64,
} as const;

/** LavaMesh's web fonts (Inter / JetBrains Mono) are loaded via
 * @expo-google-fonts/* in src/app/_layout.tsx and referenced here by the
 * family names react-native-google-fonts registers them under. Falls back to
 * the system font until the async font load resolves on first paint.
 *
 * Used to pair Inter (body) with Space Grotesk (display) -- two distinct
 * grotesk families with different personalities is exactly the "generic
 * template" tell (see the redesign-pass-2 diagnosis): Mercury/Linear/Ramp
 * all run one family end-to-end and get hierarchy from weight/size alone.
 * `display`/`displayBold` are now just heavier Inter cuts, not a second
 * typeface -- page titles and hero numbers finally read as the same app. */
export const Fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  display: 'Inter_800ExtraBold',
  displayBold: 'Inter_900Black',
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
 * - `flat` — kept for call sites that still want a solid, opaque grouping
 *   box (e.g. the desktop-web dashboard's grid cards, out of scope for the
 *   design-audit-round-3 pass below). Mobile list *containers* (an
 *   accounts list, a settings section) no longer use this at all -- see
 *   `resting`'s doc for why.
 * - `resting` — the default. Single-purpose *cards* (one stat pair, one
 *   banner) that aren't a list and aren't the hero -- `SpendingCard`,
 *   `CashFlowCard`, `NeedsAttentionCard`, `GetStartedNudge`.
 *   Design-audit-round-3: switched from a solid
 *   `surface2` fill to `surfaceSubtle` (barely-there) with no shadow -- a
 *   drop shadow under a near-transparent fill read as a box floating above
 *   the screen for no reason. Multi-row list *containers* (an accounts
 *   list, a settings section, `BudgetList`) don't use a `Card` at all
 *   anymore: the rows are the content, separated by `border1` hairlines
 *   directly on `bg`, the same treatment Activity's transaction list
 *   already had -- a container that's mostly hairlines-between-rows read
 *   as "boxy" the moment more than one of them was stacked down a screen,
 *   and there was no reason for every single one of them to also compete
 *   for attention as its own surface.
 * - `raised` — the one hero surface per screen that should read as more
 *   present (net worth, a budget total, a spend total). Design-audit-
 *   round-3: the tint went from translucent orange to neutral dark -- see
 *   `surfaceCardRaised`'s doc in `Colors` above.
 * - `glass` — sheets, modals, popovers: things floating *above* the screen
 *   rather than laid out within it. Pair with `GlassSurface` so iOS gets a
 *   real Liquid Glass material and Android/web get this fill as a fallback.
 */
export const Elevation = {
  // Copilot-redesign pass: flat/resting used to share the exact same
  // translucent 5%-orange-over-black tint (`surfaceCard`), which meant a
  // card's visible contrast depended on whatever happened to be behind it
  // (the Atmosphere gradient, scrolled content) rather than the card itself
  // -- the opposite of Copilot's own cards, which read as solidly "there"
  // against pure black regardless of context. Solid warm-neutral fills
  // (`surface1`/`surface2`, already-defined Lava tones, not Copilot's navy)
  // fix that while keeping flat < resting < raised as three genuinely
  // different weights instead of two identical fills plus a shadow.
  flat: {
    backgroundColor: Colors.surface1,
    borderColor: Colors.border1,
    borderWidth: 1,
  },
  resting: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.border1,
    borderWidth: 1,
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

/**
 * Web-only layout breakpoints (see components/web/DesktopShell.tsx). The
 * native app is always "narrow" -- these only matter for the browser demo,
 * where the same route tree renders inside a sidebar+grid shell above
 * `wide` and a phone-shaped single column below it.
 */
export const Breakpoints = {
  /** Below this, the web build looks/behaves like the phone app (single
   * column, bottom tab bar) so a browser window resized narrow -- or an
   * actual mobile browser -- doesn't get a half-broken sidebar. */
  wide: 900,
  /** Above this, the dashboard grid gets a third column instead of two. */
  xwide: 1280,
} as const;
