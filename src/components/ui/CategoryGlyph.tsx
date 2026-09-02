import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Hand-drawn stroke icons for the fixed seed categories -- see the "Ember"
 * overhaul plan's iconography note: raw color emoji was the fastest tell
 * that this app was a template, and none of Copilot/YNAB/Monarch/Origin use
 * it. One consistent visual language (24x24 grid, rounded strokes, no
 * fill) instead of borrowing a system emoji font per category.
 *
 * Deliberately scoped to the 13 seeded categories, not user-created custom
 * categories -- those still pick from `EMOJI_CHOICES` in Settings, which is
 * a reasonable long tail to leave as emoji rather than hand-draw 18 more
 * glyphs for a feature most people never touch. `CategoryIcon` falls back
 * to the emoji it's given whenever `id` isn't in `GLYPHS`.
 */

type GlyphProps = { size: number; color: string; strokeWidth: number };

const commonProps = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const GLYPHS: Record<string, React.ComponentType<GlyphProps>> = {
  income: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3v13" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Polyline points="6.5 11 12 16.5 17.5 11" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="5" y1="20.5" x2="19" y2="20.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  transfer: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 8h14.5M14.5 4l3.5 4-3.5 4" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M20.5 16H6M9.5 12l-3.5 4 3.5 4" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  groceries: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 4h2l1.6 11.2a1.6 1.6 0 0 0 1.6 1.4h8.3a1.6 1.6 0 0 0 1.58-1.35L20 8H6" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Circle cx="9.5" cy="20" r="1.15" fill={color} stroke="none" />
      <Circle cx="16.5" cy="20" r="1.15" fill={color} stroke="none" />
    </Svg>
  ),
  dining: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 3v6a2 2 0 1 1-4 0V3M5 9v12" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M17 3c-1.7 0-3 1.9-3 5s1.3 5 3 5v8" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  transport: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 16 5.8 9.7A2.5 2.5 0 0 1 8.25 7.75h7.5A2.5 2.5 0 0 1 18.2 9.7L19.5 16" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M3.5 16h17v3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Circle cx="7.5" cy="16" r="1.15" fill={color} stroke="none" />
      <Circle cx="16.5" cy="16" r="1.15" fill={color} stroke="none" />
    </Svg>
  ),
  housing: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 11.5 12 4l8 7.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M10 20.5v-5.5h4v5.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  utilities: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12.5 2 5 13.5h5.5L9 22l9-12h-6z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  subscriptions: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Polyline points="17.5 3 17.5 6.8 13.7 6.8" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Polyline points="6.5 21 6.5 17.2 10.3 17.2" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  shopping: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 8.5H17l1 12a1 1 0 0 1-1 1.1H7a1 1 0 0 1-1-1.1z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M8.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  health: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20s-7.8-4.6-9.5-9.6C1.6 7 3.7 4.2 7 4.2c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.4 2.8 4.5 6.2C19.8 15.4 12 20 12 20z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...commonProps}
      />
      <Polyline points="6 12 9 12 10.5 9.5 13 14.5 14.5 12 18 12" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  travel: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 3 3 10.2l7 2.3 2.2 7L21 3z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M12.2 12.5 21 3" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  entertainment: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M10 8.3v7.4l6.2-3.7z" fill={color} stroke="none" />
    </Svg>
  ),
  personal_care: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9.5 2.5h5v3.3l2 2.3v12a1.4 1.4 0 0 1-1.4 1.4h-6.2a1.4 1.4 0 0 1-1.4-1.4v-12l2-2.3z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="9" y1="12.5" x2="15" y2="12.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  fees: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 9.5 12 4l8.5 5.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="4" y1="9.5" x2="20" y2="9.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="6.5" y1="9.5" x2="6.5" y2="18" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="11.5" y1="9.5" x2="11.5" y2="18" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="16.5" y1="9.5" x2="16.5" y2="18" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Line x1="4" y1="20.5" x2="20" y2="20.5" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  other: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 20.5 7.8v8.4L12 21 3.5 16.2V7.8z" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
      <Path d="M3.5 7.8 12 12.5l8.5-4.7M12 12.5V21" stroke={color} strokeWidth={strokeWidth} {...commonProps} />
    </Svg>
  ),
  savings: ({ size, color, strokeWidth }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 13c0-3.6 3.1-6.5 7.3-6.5 2.6 0 4.4 1 5.7 2.3h2L20 11l-1.2 1.6v2.4l-1.8 1.5v2h-2v-1.5H9.5V19h-2v-2.3C5.7 15.9 4 14.7 4 13z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...commonProps}
      />
      <Circle cx="14" cy="10.5" r="0.9" fill={color} stroke="none" />
    </Svg>
  ),
};

export type CategoryGlyphKey = keyof typeof GLYPHS;

export function hasCategoryGlyph(id: string | undefined): id is CategoryGlyphKey {
  return !!id && id in GLYPHS;
}

export function CategoryGlyph({ id, size = 18, color, strokeWidth = 1.7 }: { id: string; size?: number; color: string; strokeWidth?: number }) {
  const Glyph = GLYPHS[id];
  if (!Glyph) return null;
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
