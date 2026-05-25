/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_PET_WEIGHT_KG } from '../defaults';

/** Visual scale: underweight ← 4 kg (center) → fattie boom boom */
export const WEIGHT_SCALE_CENTER_KG = DEFAULT_PET_WEIGHT_KG;
export const WEIGHT_SCALE_MIN_KG = 0.5;
export const WEIGHT_SCALE_MAX_KG = 7.5;

export const WEIGHT_KG_MIN = WEIGHT_SCALE_MIN_KG;
export const WEIGHT_KG_MAX = WEIGHT_SCALE_MAX_KG;

export function clampPetWeightKg(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Math.max(WEIGHT_KG_MIN, Math.min(WEIGHT_KG_MAX, rounded));
}

const SCALE_SPAN = WEIGHT_SCALE_MAX_KG - WEIGHT_SCALE_MIN_KG;

export type WeightScaleTier = {
  minPercent: number;
  label: string;
  emoji: string;
};

/** Ordered low → high; 50% ≈ 4 kg (center of scale). */
export const WEIGHT_SCALE_TIERS: WeightScaleTier[] = [
  { minPercent: 0, label: 'Underweight', emoji: '😿' },
  { minPercent: 14, label: 'Skinny', emoji: '🐾' },
  { minPercent: 28, label: 'Lean', emoji: '🐈' },
  { minPercent: 42, label: 'Almost there', emoji: '✨' },
  { minPercent: 48, label: 'Just right', emoji: '💚' },
  { minPercent: 58, label: 'Chonky', emoji: '🍩' },
  { minPercent: 72, label: 'Hefty', emoji: '🫠' },
  { minPercent: 86, label: 'Fattie boom boom', emoji: '🎉' },
];

export function weightToScalePercent(kg: number): number {
  const w = clampPetWeightKg(kg);
  const raw = ((w - WEIGHT_SCALE_MIN_KG) / SCALE_SPAN) * 100;
  return Math.max(0, Math.min(100, raw));
}

export function getWeightScaleTier(kg: number): WeightScaleTier {
  const pct = weightToScalePercent(kg);
  let tier = WEIGHT_SCALE_TIERS[0];
  for (const t of WEIGHT_SCALE_TIERS) {
    if (pct >= t.minPercent) tier = t;
  }
  return tier;
}

export function formatWeightKg(value: number): string {
  const clamped = clampPetWeightKg(value);
  return `${clamped.toFixed(1)} kg`;
}

/** e.g. "Just right · 4.0 kg" */
export function formatWeightScaleLabel(kg: number): string {
  const tier = getWeightScaleTier(kg);
  return `${tier.label} · ${formatWeightKg(kg)}`;
}

export function formatWeightScaleShort(kg: number): string {
  const tier = getWeightScaleTier(kg);
  return `${tier.emoji} ${tier.label}`;
}
