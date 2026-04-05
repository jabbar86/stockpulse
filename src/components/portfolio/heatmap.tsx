'use client';

import type { HoldingWithMetrics } from '@/types';
import { useState } from 'react';

interface HeatmapProps {
  holdings: HoldingWithMetrics[];
}

function getPnlColor(pnlPercent: number): string {
  if (pnlPercent >= 10) return 'bg-green-600';
  if (pnlPercent >= 5) return 'bg-green-500';
  if (pnlPercent >= 2) return 'bg-green-400';
  if (pnlPercent >= 0) return 'bg-green-300';
  if (pnlPercent >= -2) return 'bg-red-300';
  if (pnlPercent >= -5) return 'bg-red-400';
  if (pnlPercent >= -10) return 'bg-red-500';
  return 'bg-red-600';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface TreemapNode {
  holding: HoldingWithMetrics;
  x: number;
  y: number;
  width: number;
  height: number;
}

function squarify(
  holdings: HoldingWithMetrics[],
  containerWidth: number,
  containerHeight: number
): TreemapNode[] {
  if (holdings.length === 0) return [];

  const totalValue = holdings.reduce((sum, h) => sum + Math.abs(h.current_value), 0);
  if (totalValue === 0) return [];

  const sorted = [...holdings].sort((a, b) => Math.abs(b.current_value) - Math.abs(a.current_value));

  const nodes: TreemapNode[] = [];
  let x = 0;
  let y = 0;
  let remainingWidth = containerWidth;
  let remainingHeight = containerHeight;
  let remainingValue = totalValue;
  let i = 0;

  while (i < sorted.length) {
    const isHorizontal = remainingWidth >= remainingHeight;
    const side = isHorizontal ? remainingHeight : remainingWidth;

    // Find the best row
    const row: HoldingWithMetrics[] = [];
    let rowValue = 0;

    while (i < sorted.length) {
      const val = Math.abs(sorted[i].current_value);
      row.push(sorted[i]);
      rowValue += val;

      // Check if adding next item would make the aspect ratio worse
      if (i + 1 < sorted.length && row.length > 0) {
        const rowFraction = rowValue / remainingValue;
        const rowSize = isHorizontal
          ? remainingWidth * rowFraction
          : remainingHeight * rowFraction;

        const nextVal = Math.abs(sorted[i + 1].current_value);
        const futureRowValue = rowValue + nextVal;
        const futureRowFraction = futureRowValue / remainingValue;
        const futureRowSize = isHorizontal
          ? remainingWidth * futureRowFraction
          : remainingHeight * futureRowFraction;

        // Current worst aspect ratio
        const currentWorst = row.reduce((worst, h) => {
          const cellSize = (Math.abs(h.current_value) / rowValue) * side;
          const ratio = Math.max(rowSize / cellSize, cellSize / rowSize);
          return Math.max(worst, ratio);
        }, 0);

        // Future worst aspect ratio
        const futureRow = [...row, sorted[i + 1]];
        const futureWorst = futureRow.reduce((worst, h) => {
          const cellSize = (Math.abs(h.current_value) / futureRowValue) * side;
          const ratio = Math.max(futureRowSize / cellSize, cellSize / futureRowSize);
          return Math.max(worst, ratio);
        }, 0);

        if (futureWorst > currentWorst && row.length >= 1) {
          i++;
          break;
        }
      }
      i++;
    }

    // Layout the row
    const rowFraction = rowValue / remainingValue;
    const rowSize = isHorizontal
      ? remainingWidth * rowFraction
      : remainingHeight * rowFraction;

    let offset = 0;
    for (const holding of row) {
      const cellFraction = Math.abs(holding.current_value) / rowValue;
      const cellSize = side * cellFraction;

      if (isHorizontal) {
        nodes.push({
          holding,
          x: x,
          y: y + offset,
          width: rowSize,
          height: cellSize,
        });
      } else {
        nodes.push({
          holding,
          x: x + offset,
          y: y,
          width: cellSize,
          height: rowSize,
        });
      }
      offset += cellSize;
    }

    if (isHorizontal) {
      x += rowSize;
      remainingWidth -= rowSize;
    } else {
      y += rowSize;
      remainingHeight -= rowSize;
    }
    remainingValue -= rowValue;
  }

  return nodes;
}

export default function PortfolioHeatmap({ holdings }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    holding: HoldingWithMetrics;
    x: number;
    y: number;
  } | null>(null);

  if (holdings.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        Add holdings to see your portfolio heatmap.
      </div>
    );
  }

  const WIDTH = 600;
  const HEIGHT = 300;
  const GAP = 2;

  const nodes = squarify(holdings, WIDTH, HEIGHT);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-lg overflow-hidden"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        onMouseLeave={() => setTooltip(null)}
      >
        {nodes.map((node) => {
          const color = getPnlColor(node.holding.pnl_percent);
          const showLabel = node.width > 45 && node.height > 35;
          const showPercent = node.width > 35 && node.height > 25;

          return (
            <g
              key={node.holding.id}
              className="heatmap-cell cursor-pointer"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.closest('svg')!.getBoundingClientRect();
                setTooltip({
                  holding: node.holding,
                  x: ((node.x + node.width / 2) / WIDTH) * rect.width,
                  y: ((node.y + node.height / 2) / HEIGHT) * rect.height,
                });
              }}
            >
              <rect
                x={node.x + GAP / 2}
                y={node.y + GAP / 2}
                width={Math.max(0, node.width - GAP)}
                height={Math.max(0, node.height - GAP)}
                rx={4}
                className={color}
                fill="currentColor"
              />
              {showLabel && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 - (showPercent ? 6 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white font-semibold"
                  style={{ fontSize: Math.min(14, node.width / 6) }}
                >
                  {node.holding.symbol}
                </text>
              )}
              {showPercent && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white/80"
                  style={{ fontSize: Math.min(11, node.width / 7) }}
                >
                  {node.holding.pnl_percent >= 0 ? '+' : ''}
                  {node.holding.pnl_percent.toFixed(1)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-lg border bg-popover p-2.5 shadow-lg text-popover-foreground"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <p className="font-semibold text-xs">{tooltip.holding.symbol}</p>
          <p className="text-[10px] text-muted-foreground">{tooltip.holding.name}</p>
          <div className="flex gap-3 mt-1">
            <div>
              <p className="text-[9px] text-muted-foreground">Value</p>
              <p className="text-[11px] font-medium tabular-nums">
                {formatCurrency(tooltip.holding.current_value)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">P&L</p>
              <p
                className={`text-[11px] font-medium tabular-nums ${
                  tooltip.holding.pnl >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {tooltip.holding.pnl_percent >= 0 ? '+' : ''}
                {tooltip.holding.pnl_percent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[9px] text-muted-foreground">Loss</span>
        <div className="flex gap-0.5">
          <div className="size-2.5 rounded-sm bg-red-600" />
          <div className="size-2.5 rounded-sm bg-red-400" />
          <div className="size-2.5 rounded-sm bg-red-300" />
          <div className="size-2.5 rounded-sm bg-green-300" />
          <div className="size-2.5 rounded-sm bg-green-400" />
          <div className="size-2.5 rounded-sm bg-green-600" />
        </div>
        <span className="text-[9px] text-muted-foreground">Profit</span>
      </div>
    </div>
  );
}
