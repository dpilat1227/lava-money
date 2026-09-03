import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const HEIGHT = 56;

/**
 * Small inline trend line for a dashboard card's number (see
 * DesktopDashboard's "Monthly spending" card) -- deliberately no axes/labels,
 * this is a shape ("going up/down"), not a chart to be read precisely. For
 * that, NetWorthChart/CategoryStackedBarChart already exist.
 */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (values.length < 2 || width === 0) {
    return <View style={{ height: HEIGHT }} onLayout={onLayout} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: HEIGHT - 4 - ((v - min) / span) * (HEIGHT - 8),
  }));
  const linePath = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${HEIGHT} L ${coords[0].x} ${HEIGHT} Z`;

  return (
    <View onLayout={onLayout}>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#sparkFill)" />
        <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
