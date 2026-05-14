'use client';

// Sparkline — tiny inline area chart for Zone 4 Business 360 tiles.
//
// Implementation note: this uses @visx/shape + @visx/scale + @visx/group
// directly. There is NO @visx/sparkline package on npm — that was tried in
// an earlier session and failed (404 from the registry); the foundations PR
// installed the three primitives this file actually needs.
//
// Visual contract:
//   - Fixed ~120 x 40 px, scales by props
//   - Monochrome Candy Red area + line on transparent background
//   - No axes, no grid, no tooltips — this is sparkline-as-decoration
//   - Single tone — never multi-colour (defeats Candy-Red-as-signal rule)

import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Override the colour — default is var(--cc-signal). */
  stroke?: string;
  /** Area-fill colour. Default is a 14% Candy Red wash. */
  fill?: string;
  /** Hush mode renders the line in dim-ink so inactive tiles read as quiet. */
  hush?: boolean;
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  stroke,
  fill,
  hush = false,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        aria-hidden
        role="presentation"
      />
    );
  }

  // Avoid a divide-by-zero when min === max (flatline data) by padding the
  // domain so the curve still renders centred instead of collapsing to y=NaN.
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = max === min ? Math.abs(max) * 0.1 + 1 : 0;

  const xScale = scaleLinear<number>({
    domain: [0, data.length - 1],
    range: [0, width],
  });
  const yScale = scaleLinear<number>({
    domain: [min - pad, max + pad],
    // Invert so larger values sit higher on the chart.
    range: [height - 1, 1],
  });

  const lineColor = hush ? 'var(--cc-ink-hush)' : (stroke ?? 'var(--cc-signal)');
  const areaColor = hush ? 'transparent' : (fill ?? 'var(--cc-signal-soft)');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      role="presentation"
      style={{ display: 'block' }}
    >
      <Group>
        <AreaClosed<number>
          data={data}
          x={(_, i) => xScale(i) ?? 0}
          y={(d) => yScale(d) ?? 0}
          yScale={yScale}
          stroke="transparent"
          fill={areaColor}
          curve={curveMonotoneX}
        />
        <LinePath<number>
          data={data}
          x={(_, i) => xScale(i) ?? 0}
          y={(d) => yScale(d) ?? 0}
          stroke={lineColor}
          strokeWidth={1.25}
          curve={curveMonotoneX}
        />
      </Group>
    </svg>
  );
}
