import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, CategoryIcon, ProgressBar, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { pauseMessage, type PauseContext } from '@/lib/utils/impause';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * The "spend pause" v1.1 feature (docs/STRATEGY.md night-4 addendum) --
 * a one-time, dismissible reflection card, not a blocking gate. Shown right
 * after a manual discretionary transaction is added, or the first time a
 * not-yet-acknowledged discretionary transaction's detail page is opened.
 * See `lib/utils/impause.ts` for why it's framed as "reflect," never
 * "block" -- this app has no way to see a purchase before it happens.
 */
export function PausePrompt({ context, onDismiss }: { context: PauseContext; onDismiss: () => void }) {
  const router = useRouter();
  const { category, budgetLimit, budgetPct } = context;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <View style={{ alignItems: 'center' }}>
            <CategoryIcon emoji={category.emoji} color={category.color} size={44} />
            <Text variant="title" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
              Quick pause
            </Text>
            <Text variant="body" color={Colors.text2} style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              {pauseMessage(context)}
            </Text>
          </View>

          {budgetLimit != null && budgetPct != null && (
            <View style={{ marginTop: Spacing.lg }}>
              <ProgressBar pct={budgetPct} color={category.color} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text variant="micro" color={Colors.text4}>
                  {Math.round(budgetPct * 100)}% of budget
                </Text>
                <Text variant="micro" color={Colors.text4}>
                  {formatCurrency(budgetLimit, { compact: true })}/mo
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <Button label="Got it" fullWidth onPress={onDismiss} />
            {budgetLimit == null && (
              <Pressable
                onPress={() => {
                  onDismiss();
                  router.push('/budgets');
                }}
                style={{ alignItems: 'center', paddingVertical: 4 }}
              >
                <Text variant="caption" color={Colors.orange} weight="semibold">
                  Set a budget for {category.name}
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
});
