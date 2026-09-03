import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle, Line } from 'react-native-svg';

import { SampleTag } from '@/components/ui/SampleTag';
import { Colors } from '@/constants/theme';
import { buildSampleNetWorthHistory } from '@/lib/mock/sampleChartData';
import type { NetWorthPoint } from '@/lib/types';
import { netWorthOf } from '@/lib/utils/netWorth';
import { formatMonthLabel, monthKey } from '@/lib/utils/date';
import { Text } from '@/components/ui/Text';

const HEIGHT = 160;
const PADDING = 12;

/** `sample` swaps in an illustrative curve (see `sampleChartData.ts`) when
 * the caller has determined real history is too flat/short to plot -- the
 * "Sample data" tag is load-bearing, not decorative, since this is the one
 * chart in the app allowed to show numbers that aren't the user's own. */
export function NetWorthChart({ points, sample = false }: { points: NetWorthPoint[]; sample?: boolean }) {
  const [width, setWidth] = useState(0);
  const plotPoints = sample ? buildSampleNetWorthHistory() : points;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (plotPoints.length < 2 || width === 0) {
    return <View style={{ height: HEIGHT }} onLayout={onLayout} />;
  }

  const values = plotPoints.map(netWorthOf);
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
      {sample && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
          <SampleTag />
        </View>
      )}
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={sample ? 0.16 : 0.28} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={HEIGHT - PADDING} x2={width} y2={HEIGHT - PADDING} stroke={Colors.border1} strokeWidth={1} />
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path
          d={linePath}
          stroke={lineColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={sample ? 0.45 : 1}
          strokeDasharray={sample ? '6 5' : undefined}
        />
        {!sample &&
          coords.map((c, i) =>
            i === coords.length - 1 ? <Circle key={i} cx={c.x} cy={c.y} r={4.5} fill={lineColor} stroke={Colors.bg} strokeWidth={2} /> : null
          )}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING, marginTop: 2 }}>
        {/* Weekly-granularity history (see buildNetWorthHistory) means many
            points share a month -- labeling every single one would overlap
            into an unreadable repeated "Mar Mar Mar Apr Apr..." row. Only
            the first point of each new month gets a label, same convention
            a stock chart's x-axis uses; the empty Text keeps this point's
            slot in the space-between row so real labels stay aligned under
            their actual point. */}
        {plotPoints.map((p, i) => {
          const showLabel = i === 0 || monthKey(p.date) !== monthKey(plotPoints[i - 1].date);
          return (
            <Text key={i} variant="micro" color={Colors.text4}>
              {showLabel ? formatMonthLabel(p.date) : ''}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
