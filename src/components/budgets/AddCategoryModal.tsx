import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Button, CategoryIcon, GlassSurface, Text } from '@/components/ui';
import { Breakpoints, ChartPalette, Colors, Radius, Spacing } from '@/constants/theme';
import { useEscapeToClose } from '@/lib/hooks/useEscapeToClose';

const EMOJI_CHOICES = ['🏷️', '🐾', '👶', '🎁', '🧾', '⚽', '📚', '🚙', '✂️', '💊', '🎓', '🖥️', '🎮', '🌱', '☕', '🎵', '🛠️', '🏖️'];

/**
 * Extracted from Settings (design-audit-round-4 / IA restructure) onto
 * the shared `Button`/`GlassSurface` system every other number-entry sheet
 * in the app uses -- was hand-rolling its own `PlainButton` and modal
 * chrome, which is exactly the "doesn't follow our best design practices"
 * complaint from review. Emoji (not the hand-drawn `CategoryGlyph` SVG set
 * built-in categories get) stays the icon mechanism here on purpose --
 * that glyph set is drawn ahead of time for a fixed list of known ids,
 * there's no way to generate one on the fly for an arbitrary user-created
 * category, and emoji is the standard, expected pattern for user-authored
 * icons elsewhere too.
 *
 * Now reachable from two places with two different jobs: Settings (manage
 * -- edit or delete any existing custom category) and Budgets (create --
 * a trailing "+ New category" chip in `AddBudgetChips`, chained straight
 * into `EditBudgetModal` on save so creating a category and giving it a
 * budget is one continuous flow instead of a round-trip through Settings).
 */
export function AddCategoryModal({
  initial,
  onClose,
  onSave,
}: {
  /** Present when editing an existing custom category instead of creating
   * a new one -- pre-fills every field and swaps the heading/copy below. */
  initial?: { name: string; emoji: string; color: string };
  onClose: () => void;
  onSave: (input: { name: string; emoji: string; color: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJI_CHOICES[0]);
  const [color, setColor] = useState<string>(initial?.color ?? ChartPalette[0]);
  const isValid = name.trim().length > 0;
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= Breakpoints.wide;
  useEscapeToClose(onClose);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <GlassSurface style={styles.modalCard}>
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
                <CategoryIcon emoji={emoji} color={color} size={32} />
                <Text variant="title">{initial ? 'Edit category' : 'New category'}</Text>
              </View>

              <Text variant="caption" color={Colors.text3} style={{ marginBottom: 6 }}>
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pets"
                placeholderTextColor={Colors.text4}
                style={styles.modalInput}
                autoFocus
              />

              <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.md, marginBottom: 6 }}>
                Icon
              </Text>
              <View style={styles.chipRow}>
                {EMOJI_CHOICES.map(e => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.emojiChip, e === emoji && { borderColor: color, backgroundColor: `${color}18` }]}
                  >
                    <Text style={{ fontSize: 16 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <Text variant="caption" color={Colors.text3} style={{ marginTop: Spacing.md, marginBottom: 6 }}>
                Color
              </Text>
              <View style={styles.chipRow}>
                {ChartPalette.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorSwatch, { backgroundColor: c }, c === color && styles.colorSwatchActive]}
                  />
                ))}
              </View>

              <View style={[styles.footerRow, isWideWeb && styles.footerRowWide]}>
                <View style={!isWideWeb && { flex: 1 }}>
                  <Button label="Cancel" variant="secondary" onPress={onClose} fullWidth={!isWideWeb} />
                </View>
                <View style={!isWideWeb && { flex: 1 }}>
                  <Button label="Save" disabled={!isValid} onPress={() => onSave({ name: name.trim(), emoji, color })} fullWidth={!isWideWeb} />
                </View>
              </View>
            </Pressable>
          </GlassSurface>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: { width: '100%', maxWidth: 380, padding: Spacing.xl },
  modalInput: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text1,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: Colors.text1 },
  footerRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  footerRowWide: { justifyContent: 'flex-end' },
});
