import React from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { Text } from './Text';

/**
 * A quiet "this is illustrative, not yours" marker for charts/lists with no
 * real data yet (see lib/mock/sampleChartData.ts). Was a bordered, filled
 * `Badge` -- visually identical weight to a real status pill (the amber
 * "due soon" tag, the red "may have lapsed" tag), so a screen with three
 * empty charts showed three boxed alerts fighting for attention over
 * nothing. This is just muted caption text with a dot, sized to disappear
 * until read on purpose.
 */
export function SampleTag() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.text4 }} />
      <Text variant="micro" color={Colors.text4}>
        Sample data
      </Text>
    </View>
  );
}
