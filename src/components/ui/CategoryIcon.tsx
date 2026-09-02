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

export function CategoryIcon({ emoji, color, size = 38, id }: Props) {
  const useGlyph = hasCategoryGlyph(id);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}1c`, borderColor: `${color}40` },
      ]}
    >
      {useGlyph ? (
        <CategoryGlyph id={id} size={size * 0.5} color={color} strokeWidth={size < 32 ? 1.9 : 1.7} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
