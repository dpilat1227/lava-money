import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button, CategoryIcon, FlameMark, Text } from '@/components/ui';
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

const GLOW_SIZE = 340;
const BADGE_SIZE = 72;

/**
 * First screen anyone sees, so it's the one place worth spending extra
 * polish -- everywhere else optimizes for information density, this one
 * screen optimizes for "does this feel like a real, considered product."
 * Same "ambient warm glow, not a generic drop shadow" language as
 * `NetWorthHero`, but bigger and slowly breathing (a subtle scale/opacity
 * loop) since there's no data to anchor attention to yet -- the glow *is*
 * the moment.
 */
function WelcomeStep({ onNext }: { onNext: () => void }) {
  // A plain useState (never set again) instead of useRef -- same reasoning
  // as LinkAccountFlow's spin value: reading `.current` off a ref during
  // render trips the stricter react-hooks lint rules that ship with React
  // 19's compiler, even though the value itself never changes identity.
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <View style={{ flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.heroWrap}>
          <View pointerEvents="none" style={styles.ambientGlow}>
            <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
              <Defs>
                <RadialGradient id="ambient" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={Colors.orange} stopOpacity={0.28} />
                  <Stop offset="0.55" stopColor={Colors.orangeCta} stopOpacity={0.09} />
                  <Stop offset="1" stopColor={Colors.orange} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#ambient)" />
            </Svg>
          </View>
          <Animated.View style={[styles.flameBadge, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}>
            <FlameMark size={40} />
          </Animated.View>
        </View>

        <Text variant="display" style={styles.wordmark}>
          Lava Money
        </Text>
        <View style={styles.betaPill}>
          <Text variant="micro" weight="semibold" color={Colors.orange}>
            BETA
          </Text>
        </View>

        <Text variant="body" color={Colors.text3} style={{ marginTop: Spacing.md, textAlign: 'center', maxWidth: 300 }}>
          All your money, one clear picture — bank-linked or not. Your data stays on this device either way.
        </Text>

        <View style={{ marginTop: Spacing.xxl, gap: Spacing.lg, width: '100%' }}>
          <FeatureRow emoji="💰" color={Colors.orange} text="Net worth, budgets, and spending trends in one place" />
          <FeatureRow emoji="✍️" color={Colors.amber} text="Connect a bank, or add accounts by hand — your choice" />
          <FeatureRow emoji="🔒" color={Colors.textAccent} text="Nothing leaves this device unless you export it yourself" />
        </View>
      </View>

      <View style={styles.ctaGlow}>
        <Button label="Get started" fullWidth onPress={onNext} />
      </View>
    </View>
  );
}

function FeatureRow({ emoji, color, text }: { emoji: string; color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <CategoryIcon emoji={emoji} color={color} size={36} />
      <Text variant="body" color={Colors.text2} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    position: 'relative',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: -(GLOW_SIZE - BADGE_SIZE) / 2,
    left: -(GLOW_SIZE - BADGE_SIZE) / 2,
  },
  flameBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1006',
    borderWidth: 1,
    borderColor: 'rgba(255,115,0,0.35)',
    ...Shadow.md,
    shadowColor: Colors.orange,
  },
  wordmark: {
    marginTop: Spacing.xl,
    textAlign: 'center',
    textShadowColor: 'rgba(255,115,0,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  betaPill: {
    marginTop: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orangeSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,115,0,0.3)',
  },
  ctaGlow: {
    borderRadius: Radius.lg,
    ...Shadow.md,
    shadowColor: Colors.orange,
    shadowOpacity: 0.5,
  },
});
