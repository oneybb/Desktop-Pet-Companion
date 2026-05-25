/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetStats } from '../types';
import { formatStatScore } from '../utils/companionSettings';
import { formatWeightKg, formatWeightScaleShort, weightToScalePercent } from '../utils/weightScale';

export type FlashStatKey = 'happiness' | 'energy' | 'cleanliness' | 'weight';

export type StatFlashMap = Partial<Record<FlashStatKey, { delta: number }>>;

const STAT_ROWS: {
  key: FlashStatKey;
  label: string;
  emoji: string;
  text: string;
  bar: string;
  ring: string;
  isWeight?: boolean;
}[] = [
  { key: 'happiness', label: 'Happy', emoji: '😊', text: 'text-emerald-300', bar: 'bg-emerald-400', ring: 'ring-emerald-400/70' },
  { key: 'energy', label: 'Energy', emoji: '⚡', text: 'text-amber-300', bar: 'bg-amber-400', ring: 'ring-amber-400/70' },
  { key: 'cleanliness', label: 'Clean', emoji: '✨', text: 'text-indigo-300', bar: 'bg-indigo-400', ring: 'ring-indigo-400/70' },
  { key: 'weight', label: 'Weight', emoji: '⚖️', text: 'text-rose-300', bar: 'bg-rose-400', ring: 'ring-rose-400/70', isWeight: true },
];

function barWidthPercent(key: FlashStatKey, value: number): number {
  if (key === 'weight') {
    return weightToScalePercent(value);
  }
  return Math.min(100, Math.max(0, value));
}

function formatDelta(key: FlashStatKey, delta: number): string {
  if (key === 'weight') {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}`;
  }
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function formatValueLabel(key: FlashStatKey, value: number): string {
  if (key === 'weight') {
    return `${formatWeightScaleShort(value)} · ${formatWeightKg(value)}`;
  }
  return `${formatStatScore(value)}/100`;
}

interface StatChangeFlashProps {
  stats: PetStats;
  flashing: StatFlashMap;
  petName?: string;
  side?: 'left' | 'right';
  /** Keeps flash inside small widget windows (avoids clipping outside Electron bounds). */
  placement?: 'side' | 'inset-bottom';
  maxWidth?: number;
}

export default function StatChangeFlash({
  stats,
  flashing,
  petName,
  side = 'left',
  placement = 'side',
  maxWidth = 168,
}: StatChangeFlashProps) {
  const activeKeys = STAT_ROWS.filter((row) => flashing[row.key] !== undefined);
  const visible = activeKeys.length > 0;

  const positionClass =
    placement === 'inset-bottom'
      ? 'bottom-2 left-1/2 -translate-x-1/2'
      : side === 'left'
        ? 'right-full mr-2 top-1/2 -translate-y-1/2'
        : 'left-full ml-2 top-1/2 -translate-y-1/2';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: placement === 'inset-bottom' ? 6 : 0, x: placement === 'inset-bottom' ? 0 : side === 'left' ? 8 : -8 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: placement === 'inset-bottom' ? 6 : 0, x: placement === 'inset-bottom' ? 0 : side === 'left' ? 8 : -8 }}
          transition={{ duration: 0.2 }}
          className={`absolute z-[45] pointer-events-none select-none ${positionClass}`}
          style={{ width: maxWidth, maxWidth: '92%' }}
        >
          <div className="bg-slate-950/92 backdrop-blur-md border border-violet-500/25 rounded-2xl p-2.5 shadow-xl animate-pulse">
            <div className="text-[8px] font-black uppercase tracking-wider text-indigo-400 mb-2 truncate">
              {petName ? `${petName} · ` : ''}Stat change
            </div>
            <div className="space-y-2">
              {activeKeys.map((row) => {
                const delta = flashing[row.key]!.delta;
                const value = stats[row.key];
                const positive = delta > 0;
                const prevValue = row.isWeight ? value - delta : value - delta;
                return (
                  <div
                    key={row.key}
                    className={`rounded-lg px-1.5 py-1 ring-2 ${row.ring} bg-slate-900/80`}
                  >
                    <div className={`flex justify-between items-center text-[9px] font-bold ${row.text}`}>
                      <span>
                        {row.emoji} {row.label}
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          positive ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {formatDelta(row.key, delta)}
                        {row.isWeight ? ' kg' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                      <motion.div
                        className={`h-full rounded-full ${row.bar}`}
                        initial={{ width: `${barWidthPercent(row.key, prevValue)}%` }}
                        animate={{ width: `${barWidthPercent(row.key, value)}%` }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      />
                    </div>
                    <div className={`text-[8px] font-mono mt-0.5 ${row.text} opacity-80`}>
                      {formatValueLabel(row.key, value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
