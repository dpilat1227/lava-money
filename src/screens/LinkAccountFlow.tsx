import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import type { Institution } from '@/lib/types';

type Step = 'choose' | 'linking' | 'success';

const LINK_STAGES = ['Connecting securely…', 'Verifying credentials…', 'Importing accounts…', 'Fetching transaction history…'];

/**
 * Shared institution-picker -> fake-linking -> success sequence, used both
 * for first-run onboarding and for "link another account" from Settings.
 * Kept as one component so the two entry points can't drift into two
 * different-feeling linking experiences.
 */
export function LinkAccountFlow({ onComplete, onCancel }: { onComplete: (institutionId: string) => void; onCancel?: () => void }) {
  const { institutionOptions } = useFinance();
  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Institution | null>(null);

  const startLink = (institution: Institution) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelected(institution);
    setStep('linking');
  };

  return (
    <View style={{ flex: 1 }}>
      {step === 'choose' && (
        <ChooseInstitutionStep institutions={institutionOptions} onSelect={startLink} onCancel={onCancel} />
      )}
      {step === 'linking' && selected && <LinkingStep institution={selected} onDone={() => setStep('success')} />}
      {step === 'success' && selected && (
        <SuccessStep institution={selected} onContinue={() => onComplete(selected.id)} />
      )}
    </View>
  );
}

function ChooseInstitutionStep({
  institutions,
  onSelect,
  onCancel,
}: {
  institutions: Institution[];
  onSelect: (i: Institution) => void;
  onCancel?: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingTop: Spacing.md }}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        {onCancel && (
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text variant="body" color={Colors.text3}>
              Cancel
            </Text>
          </Pressable>
        )}
        <Text variant="title" style={{ marginTop: Spacing.lg }}>
          Link an account
        </Text>
        <Text variant="body" color={Colors.text3} style={{ marginTop: 4, marginBottom: Spacing.lg }}>
          This is a demo — pick any institution to generate realistic sample data.
        </Text>
      </View>

      <FlatList
        data={institutions}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.institutionRow, { opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.institutionDot, { backgroundColor: item.color }]} />
            <Text variant="subtitle" style={{ flex: 1 }}>
              {item.name}
            </Text>
            <Text variant="body" color={Colors.text4}>
              ›
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function LinkingStep({ institution, onDone }: { institution: Institution; onDone: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  // A plain useState (never set again) instead of useRef -- it needs to be a
  // stable Animated.Value across renders without itself triggering one, but
  // reading `.current` off a ref during render trips the stricter
  // react-hooks lint rules that ship with React 19's compiler.
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (stageIndex >= LINK_STAGES.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStageIndex(i => i + 1), 650);
    return () => clearTimeout(t);
  }, [stageIndex, onDone]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.centeredFlex}>
      <Animated.View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 3,
          borderColor: Colors.surface3,
          borderTopColor: institution.color,
          transform: [{ rotate }],
        }}
      />
      <Text variant="title" style={{ marginTop: Spacing.xl }}>
        {institution.name}
      </Text>
      <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        {LINK_STAGES.map((stage, i) => (
          <Text
            key={stage}
            variant="body"
            color={i < stageIndex ? Colors.green : i === stageIndex ? Colors.text1 : Colors.text4}
            style={{ textAlign: 'center' }}
          >
            {i < stageIndex ? '✓ ' : ''}
            {stage}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SuccessStep({ institution, onContinue }: { institution: Institution; onContinue: () => void }) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(onContinue, 900);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <View style={styles.centeredFlex}>
      <View style={styles.checkCircle}>
        <Text style={{ fontSize: 32 }}>✓</Text>
      </View>
      <Text variant="title" style={{ marginTop: Spacing.lg }}>
        {institution.name} linked
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: 4 }}>
        Setting up your dashboard…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  institutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  institutionDot: { width: 12, height: 12, borderRadius: 6 },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
