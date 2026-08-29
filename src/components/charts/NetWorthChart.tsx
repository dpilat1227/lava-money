import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle, Line } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import type { NetWorthPoint } from '@/lib/types';
import { netWorthOf } from '@/lib/utils/netWorth';
import { formatMonthLabel } from '@/lib/utils/date';
import { Text } from '@/components/ui/Text';

const HEIGHT = 160;
const PADDING = 12;

export function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length < 2 || width === 0) {
    return <View style={{ height: HEIGHT }} onLayout={onLayout} />;
  }

  const values = points.map(netWorthOf);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;

  const usableW = width - PADDING * 2;
  const usableH = HEIGHT - PADDING * 2;

  const coords = values.map((v, i) => {
    const x = PADDING + (i / (values.length - 1)) * usableW;
    const y = PADDING + usableH - ((v - min) / span) * usableH;
    return { x, y };
  });

  const linePath = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${HEIGHT} L ${coords[0].x} ${HEIGHT} Z`;

  const trendUp = values[values.length - 1] >= values[0];
  const lineColor = trendUp ? Colors.green : Colors.red;

  return (
    <View onLayout={onLayout}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.28} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={HEIGHT - PADDING} x2={width} y2={HEIGHT - PADDING} stroke={Colors.border1} strokeWidth={1} />
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) =>
          i === coords.length - 1 ? (
            <Circle key={i} cx={c.x} cy={c.y} r={4.5} fill={lineColor} stroke={Colors.bg} strokeWidth={2} />
          ) : null
        )}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING, marginTop: 2 }}>
        {points.map((p, i) => (
          <Text key={i} variant="micro" color={Colors.text4}>
            {formatMonthLabel(p.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}
