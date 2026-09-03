import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Dialog } from '@/components/web/Dialog';
import { Breakpoints, Colors } from '@/constants/theme';
import { usePlaidLink } from '@/lib/hooks/usePlaidLink';
import { useFinance } from '@/lib/store/FinanceContext';
import { AddAccountChooser } from '@/screens/AddAccountChooser';
import { LinkAccountFlow } from '@/screens/LinkAccountFlow';
import { ManualAccountFlow } from '@/screens/ManualAccountFlow';

type Step = 'choose' | 'link' | 'manual';

export default function LinkAccountModal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { linkInstitution, addManualAccount } = useFinance();
  const [step, setStep] = useState<Step>('choose');
  const { linkBank, linking } = usePlaidLink();

  const handleConnectRealBank = async () => {
    const outcome = await linkBank();
    if (outcome.ok) {
      router.back();
    } else if (!outcome.cancelled) {
      Alert.alert('Could not link that account', outcome.error ?? 'Please try again.');
    }
  };

  const body = (
    <>
      {step === 'choose' && (
        <AddAccountChooser
          onChooseLink={() => setStep('link')}
          onChooseRealBank={Platform.OS !== 'web' ? handleConnectRealBank : undefined}
          onChooseManual={() => setStep('manual')}
          onCancel={() => router.back()}
          linkingRealBank={linking}
        />
      )}
      {step === 'link' && (
        <LinkAccountFlow
          onCancel={() => setStep('choose')}
          onComplete={id => {
            linkInstitution(id);
            router.back();
          }}
        />
      )}
      {step === 'manual' && (
        <ManualAccountFlow
          onCancel={() => setStep('choose')}
          onComplete={draft => {
            const accountId = addManualAccount(draft);
            router.replace(`/account/${accountId}`);
          }}
        />
      )}
    </>
  );

  // Wide web only: same fix as transaction/[id].tsx and account/[id].tsx --
  // this route is a sibling Stack.Screen outside the `(tabs)` group, so it
  // never got DesktopShell's chrome and used to just stretch the mobile
  // layout's buttons/text to 100% width across the whole browser window.
  // The existing "Cancel" text + step title each screen already renders
  // inline (see AddAccountChooser / LinkAccountFlow / ManualAccountFlow) is
  // reused as-is here rather than adding a second, redundant Dialog header
  // -- it's the same affordance either way, just inside a centered card now.
  if (Platform.OS === 'web' && width >= Breakpoints.wide) {
    return (
      <Dialog onClose={() => router.back()} maxWidth={440}>
        {body}
      </Dialog>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      {body}
    </SafeAreaView>
  );
}
