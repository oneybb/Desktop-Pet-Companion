/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomAssets, PetState } from '../types';

/** Advance which uploaded file is shown for a pose (sequence or random mode). */
export function advancePoseMediaIndex(assets: CustomAssets, state: PetState | string): CustomAssets {
  const list = assets.uploadedAssets[state] || [];
  if (list.length <= 1) return assets;

  const mode = assets.playModes[state] || 'cycle';
  const indices = assets.activeIndices || {};
  const currentIdx = indices[state] ?? 0;
  let nextIdx = currentIdx;

  if (mode === 'random') {
    nextIdx = Math.floor(Math.random() * list.length);
    if (nextIdx === currentIdx && list.length > 1) {
      nextIdx = (nextIdx + 1) % list.length;
    }
  } else {
    nextIdx = (currentIdx + 1) % list.length;
  }

  return {
    ...assets,
    activeIndices: {
      ...indices,
      [state]: nextIdx,
    },
  };
}

export function getPoseMediaCount(assets: CustomAssets, state: PetState | string): number {
  return (assets.uploadedAssets[state] || []).length;
}

export function shouldRunPoseSlideshow(
  state: PetState,
  assets: CustomAssets,
  intervalSeconds: number
): boolean {
  if (intervalSeconds <= 0) return false;
  if (state === 'laser') return false;
  return getPoseMediaCount(assets, state) > 1;
}
