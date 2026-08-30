import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
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

function FlameMark({ size = 64 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.orange,
          opacity: 0.16,
        }}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          backgroundColor: Colors.orangeCta,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.16,
          backgroundColor: Colors.amber,
        }}
      />
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl }}>
      <FlameMark size={72} />
      <Text variant="display" style={{ marginTop: Spacing.xl, textAlign: 'center' }}>
        Lava Finance
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
