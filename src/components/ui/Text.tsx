import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'micro' | 'mono';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const SIZE: Record<Variant, number> = {
  display: 34,
  title: 20,
  subtitle: 16,
  body: 15,
  caption: 13,
  micro: 11,
  mono: 14,
};

const FAMILY: Record<Variant, string | undefined> = {
  display: Fonts.displayBold,
  title: Fonts.sansSemibold,
  subtitle: Fonts.sansMedium,
  body: Fonts.sans,
  caption: Fonts.sans,
  micro: Fonts.sansMedium,
  mono: Fonts.monoLoaded,
};

const WEIGHT_FAMILY: Record<string, string> = {
  regular: Fonts.sans,
  medium: Fonts.sansMedium,
  semibold: Fonts.sansSemibold,
  bold: Fonts.sansBold,
};

export function Text({ variant = 'body', color, weight, style, ...rest }: Props) {
  const fontFamily = weight ? WEIGHT_FAMILY[weight] : FAMILY[variant];
  return (
    <RNText
      style={[
        {
          fontSize: SIZE[variant],
          color: color ?? Colors.text1,
          fontFamily,
        },
        style,
      ]}
      {...rest}
    />
  );
}
