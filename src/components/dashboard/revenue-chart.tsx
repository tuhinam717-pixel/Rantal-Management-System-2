"use client";

import { useId, useState } from "react";

import { formatCurrency } from "@/lib/utils";

export interface RevenuePoint {
  key: string;
  label: string;
  total: number;
  orders: number;
}

const HEIGHT = 220;
const PAD_LEFT = 56;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;

/** Rounds the axis top to a clean number so gridline labels read well. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function compact(value: number): string {
  if (value >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}k`;
  return String(Math.round(value));
}

/**
 * Monthly rental revenue.
 *
 * A single series, so there is no legend — the heading names it. Hover is the
 * default interaction rather than labelling all twelve bars, which would bury
 * the shape under numbers.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const peak = Math.max(0, ...data.map((d) => d.total));
  const top = niceCeiling(peak);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const width = 720;
  const plotWidth = width - PAD_LEFT - 8;
  const slot = plotWidth / Math.max(1, data.length);
  // 2px of surface between bars, per the mark spec.
  const barWidth = Math.max(6, slot - 10);

  const gridlines = [0, 0.25, 0.5, 0.75, 1];
  const maxIndex = data.findIndex((d) => d.total === peak);
  const point = active === null ? null : data[active];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Monthly rental revenue over the last twelve months"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" />
            <stop offset="100%" stopColor="var(--color-brand-600)" />
          </linearGradient>
        </defs>

        {/* Recessive grid: present enough to read a value, quiet enough to ignore. */}
        {gridlines.map((fraction) => {
          const y = PAD_TOP + plotHeight * (1 - fraction);
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={width - 8}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-ink-400 text-[10px] tabular-nums"
              >
                {compact(top * fraction)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barHeight = top === 0 ? 0 : (d.total / top) * plotHeight;
          const x = PAD_LEFT + i * slot + (slot - barWidth) / 2;
          const y = PAD_TOP + plotHeight - barHeight;
          const isActive = active === i;

          return (
            <g key={d.key}>
              {/* Full-column hit target: easier to hover than a thin bar. */}
              <rect
                x={PAD_LEFT + i * slot}
                y={PAD_TOP}
                width={slot}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className="cursor-pointer"
              />

              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, d.total > 0 ? 2 : 0)}
                rx={4}
                fill={`url(#${gradientId})`}
                opacity={active === null || isActive ? 1 : 0.45}
                className="pointer-events-none transition-opacity"
              />

              <text
                x={PAD_LEFT + i * slot + slot / 2}
                y={HEIGHT - 8}
                textAnchor="middle"
                className={
                  isActive
                    ? "pointer-events-none fill-ink-900 text-[10px] font-medium"
                    : "pointer-events-none fill-ink-500 text-[10px]"
                }
              >
                {d.label}
              </text>

              {/* Only the peak is labelled directly; the rest are on hover. */}
              {i === maxIndex && peak > 0 && active === null && (
                <text
                  x={PAD_LEFT + i * slot + slot / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="pointer-events-none fill-ink-700 text-[10px] font-semibold tabular-nums"
                >
                  {compact(d.total)}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={PAD_LEFT}
          x2={width - 8}
          y1={PAD_TOP + plotHeight}
          y2={PAD_TOP + plotHeight}
          stroke="var(--color-ink-400)"
          strokeWidth={1}
        />
      </svg>

      {point && (
        <div
          className="pointer-events-none absolute top-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lift"
          style={{
            left: `${((PAD_LEFT + (active! + 0.5) * slot) / width) * 100}%`,
            transform: "translateX(-50%)",
          }}
          role="status"
        >
          <p className="text-xs font-medium text-ink-900">{point.label}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink-900">
            {formatCurrency(point.total)}
          </p>
          <p className="text-xs text-ink-500">
            {point.orders} {point.orders === 1 ? "rental" : "rentals"}
          </p>
        </div>
      )}
    </div>
  );
}
