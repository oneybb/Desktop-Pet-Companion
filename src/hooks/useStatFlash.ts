/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { PetStats } from '../types';
import { FlashStatKey, StatFlashMap } from '../components/StatChangeFlash';

const STAT_KEYS: FlashStatKey[] = ['happiness', 'energy', 'cleanliness', 'weight'];
const FLASH_MS = 2000;
/** Ignore tiny passive drift (e.g. decay ticks); feature bonuses are usually ≥ 1 */
const MIN_DELTA = 1;
const MIN_WEIGHT_DELTA_KG = 0.05;

export function useStatFlash(stats: PetStats, flashDurationMs = FLASH_MS) {
  const prevStatsRef = useRef(stats);
  const skipNextRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashing, setFlashing] = useState<StatFlashMap>({});

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      prevStatsRef.current = stats;
      return;
    }

    const prev = prevStatsRef.current;
    const nextFlash: StatFlashMap = {};

    for (const key of STAT_KEYS) {
      const rawDelta = stats[key] - prev[key];
      const delta =
        key === 'weight' ? Math.round(rawDelta * 100) / 100 : Math.round(rawDelta);
      const threshold = key === 'weight' ? MIN_WEIGHT_DELTA_KG : MIN_DELTA;
      if (Math.abs(delta) >= threshold) {
        nextFlash[key] = { delta };
      }
    }

    prevStatsRef.current = stats;

    if (Object.keys(nextFlash).length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setFlashing(nextFlash);

    timerRef.current = setTimeout(() => {
      setFlashing({});
      timerRef.current = null;
    }, flashDurationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stats, flashDurationMs]);

  return flashing;
}
