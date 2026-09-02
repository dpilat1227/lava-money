import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, FlameMark, Text } from '@/components/ui';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { AddAccountChooser } from '@/screens/AddAccountChooser';
import { LinkAccountFlow } from '@/screens/LinkAccountFlow';
import { ManualAccountFlow } from '@/screens/ManualAccountFlow';

type Step = 'welcome' | 'choose' | 'link' | 'manual';

export function OnboardingFlow() {
  const { linkInstitution, addManualAccount } = useFinance();
  const [step, setStep] = useState<Step>('welcome');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      {step === 'welcome' && <WelcomeStep onNext={() => setStep('choose')} />}
      {step === 'choose' && (
        <AddAccountChooser
          onChooseLink={() => setStep('link')}
          onChooseManual={() => setStep('manual')}
          onCancel={() => setStep('welcome')}
        />
      )}
      {step === 'link' && <LinkAccountFlow onCancel={() => setStep('choose')} onComplete={linkInstitution} />}
      {step === 'manual' && (
        <ManualAccountFlow onCancel={() => setStep('choose')} onComplete={draft => addManualAccount(draft)} />
      )}
    </SafeAreaView>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
      <View style={styles.flameGlow}>
        <FlameMark size={40} />
      </View>
      <Text variant="display" style={{ marginTop: Spacing.xl, textAlign: 'center' }}>
        Lava Money
      </Text>
      <Text variant="body" color={Colors.text3} style={{ marginTop: Spacing.sm, textAlign: 'center', maxWidth: 300 }}>
        All your money, one clear picture — bank-linked or not. Your data stays on this device either way.
      </Text>

      <View style={{ marginTop: Spacing.xxl, gap: Spacing.md, width: '100%', paddingHorizontal: Spacing.xl }}>
        <FeatureRow emoji="💰" text="Net worth, budgets, and spending trends in one place" />
        <FeatureRow emoji="✍️" text="Connect a bank, or add accounts by hand — your choice" />
        <FeatureRow emoji="🔒" text="Nothing leaves this device unless you export it yourself" />
      </View>

      <View style={{ position: 'absolute', bottom: Spacing.xxl, left: Spacing.xl, right: Spacing.xl }}>
        <Button label="Get started" fullWidth onPress={onNext} />
      </View>
    </View>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text variant="body" color={Colors.text2} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flameGlow: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1006',
    borderWidth: 1,
    borderColor: 'rgba(255,115,0,0.35)',
    ...Shadow.md,
    shadowColor: Colors.orange,
  },
});
