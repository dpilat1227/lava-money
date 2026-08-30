import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { AddAccountChooser } from '@/screens/AddAccountChooser';
import { LinkAccountFlow } from '@/screens/LinkAccountFlow';
import { ManualAccountFlow } from '@/screens/ManualAccountFlow';

type Step = 'choose' | 'link' | 'manual';

export default function LinkAccountModal() {
  const router = useRouter();
  const { linkInstitution, addManualAccount } = useFinance();
  const [step, setStep] = useState<Step>('choose');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      {step === 'choose' && (
        <AddAccountChooser
          onChooseLink={() => setStep('link')}
          onChooseManual={() => setStep('manual')}
          onCancel={() => router.back()}
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
    </SafeAreaView>
  );
}
