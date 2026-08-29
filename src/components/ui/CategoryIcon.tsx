import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

interface Props {
  emoji: string;
  color: string;
  size?: number;
}

export function CategoryIcon({ emoji, color, size = 38 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, borderColor: `${color}44` },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
