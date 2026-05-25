/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  WEIGHT_SCALE_CENTER_KG,
  WEIGHT_SCALE_MIN_KG,
  WEIGHT_SCALE_MAX_KG,
  formatWeightKg,
  formatWeightScaleShort,
  weightToScalePercent,
} from '../utils/weightScale';

interface WeightScaleBarProps {
  weightKg: number;
  /** Smaller text and track for widget hover HUD */
  compact?: boolean;
  /** Show numeric kg under the mood label */
  showKg?: boolean;
  className?: string;
}

export default function WeightScaleBar({
  weightKg,
  compact = false,
  showKg = true,
  className = '',
}: WeightScaleBarProps) {
  const pct = weightToScalePercent(weightKg);
  const mood = formatWeightScaleShort(weightKg);

  const trackH = compact ? 6 : 8;
  const markerSize = compact ? 10 : 12;
  const labelSize = compact ? 7 : 8;
  const moodSize = compact ? 9 : 10;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-end gap-1" style={{ fontSize: labelSize }}>
        <span className="font-bold text-sky-300/90 uppercase tracking-wide leading-none">Underweight</span>
        <span className="font-bold text-rose-300/90 uppercase tracking-wide leading-none text-right">
          Fattie boom boom
        </span>
      </div>

      <div className="relative" style={{ paddingTop: markerSize / 2 + 2, paddingBottom: 2 }}>
        <div
          className="relative w-full rounded-full overflow-hidden border border-slate-700/80"
          style={{ height: trackH }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-sky-600/70 via-emerald-500/60 to-rose-500/80"
            aria-hidden
          />
          {/* Center tick = 4 kg */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/50 z-[1]"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
            title={`${WEIGHT_SCALE_CENTER_KG} kg`}
          />
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-[6px] font-mono font-bold text-emerald-300/80 whitespace-nowrap pointer-events-none"
            style={{ display: compact ? 'none' : 'block' }}
          >
            {WEIGHT_SCALE_CENTER_KG}kg
          </div>
        </div>

        <div
          className="absolute z-[2] rounded-full border-2 border-white shadow-md bg-rose-400"
          style={{
            width: markerSize,
            height: markerSize,
            left: `${pct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.35s ease-out',
          }}
          title={formatWeightKg(weightKg)}
        />
      </div>

      <div
        className="flex justify-between font-mono text-slate-500/90"
        style={{ fontSize: compact ? 6 : 7 }}
      >
        <span>{WEIGHT_SCALE_MIN_KG}</span>
        <span>{WEIGHT_SCALE_MAX_KG} kg</span>
      </div>

      <p
        className="font-bold text-rose-200 text-center leading-tight"
        style={{ fontSize: moodSize }}
      >
        {mood}
        {showKg && (
          <span className="font-mono font-normal text-slate-400/90 block" style={{ fontSize: labelSize }}>
            {formatWeightKg(weightKg)}
          </span>
        )}
      </p>
    </div>
  );
}
