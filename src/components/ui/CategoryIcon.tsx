import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CategoryGlyph, hasCategoryGlyph } from './CategoryGlyph';
import { Text } from './Text';

interface Props {
  emoji: string;
  color: string;
  size?: number;
  /** Category id, used to look up a hand-drawn vector glyph in
   * `CategoryGlyph`. Falls back to rendering `emoji` when the id is missing
   * or isn't one of the seeded categories (custom categories, for one). */
  id?: string;
}

/**
 * Redesign-pass-2: was a translucent gradient *circle* (12%/30% color over
 * the dark canvas) -- soft and pastel in exactly the way that read as
 * "template," per the diagnosis. Copilot's own category tiles are solid,
 * saturated, *rounded-square* fills with a white glyph on top -- crisp
 * enough to actually color-code a dense list at a glance instead of
 * fading into it. `${color}CC` (~80% alpha over the dark canvas, not
 * 100%) keeps sixteen different hues from turning a transaction list into
 * a box of crayons while still reading as a real solid fill, not a tint.
 */
export function CategoryIcon({ emoji, color, size = 32, id }: Props) {
  const useGlyph = hasCategoryGlyph(id);
  const radius = Math.round(size * 0.32);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: `${color}cc`,
          shadowColor: color,
        },
      ]}
    >
      {useGlyph ? (
        <CategoryGlyph id={id} size={size * 0.58} color="#ffffff" strokeWidth={glyphStrokeWidth(size)} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      )}
    </View>
  );
}

/** Design-audit pass: some glyphs with more internal detail (transport's
 * two wheels especially) were getting misread at a glance -- a car reduced
 * to a few thin strokes at ~17px lost its wheels entirely. The old
 * size<32 ? 1.9 : 1.7 split also had this backwards: 32 is the
 * *default*, used constantly in every dense list (Activity, Budgets,
 * Recurring, account transactions), while the thinner 1.7 stroke it got is
 * the one that most needed boldening. Only genuinely large uses (the 56px
 * transaction-detail hero) have enough room for a thinner, more elegant
 * stroke; small chip uses (~22px, suggestion/category pickers) need the
 * boldest stroke of all. */
function glyphStrokeWidth(size: number): number {
  if (size >= 48) return 1.6;
  if (size >= 28) return 1.85;
  return 2.1;
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
