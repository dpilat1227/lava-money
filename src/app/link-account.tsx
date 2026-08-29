import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useFinance } from '@/lib/store/FinanceContext';
import { LinkAccountFlow } from '@/screens/LinkAccountFlow';

export default function LinkAccountModal() {
  const router = useRouter();
  const { linkInstitution } = useFinance();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      <LinkAccountFlow
        onCancel={() => router.back()}
        onComplete={id => {
          linkInstitution(id);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
