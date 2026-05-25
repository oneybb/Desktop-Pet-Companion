/**
 * Built-in interactions exposed in the app (upload slots + labels use one word each).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const BUILTIN_INTERACTIONS = [
  { id: 'idle', label: 'Idle', workspaceFile: 'pet_idle.png', workspaceDesc: 'Default standing pose' },
  { id: 'studying', label: 'Study', workspaceFile: 'pet_studying.png', workspaceDesc: 'During focus timer' },
  { id: 'sleep', label: 'Sleep', workspaceFile: 'pet_rest.png', workspaceDesc: 'During nap / sleep timer' },
  { id: 'focusReward', label: 'Celebrate', workspaceFile: 'pet_celebrate.png', workspaceDesc: 'After focus session completes' },
  { id: 'eating', label: 'Eat', workspaceFile: 'pet_eating.png', workspaceDesc: 'Default eat pose (snacks use per-food slots)' },
  { id: 'dancing', label: 'Dance', workspaceFile: 'pet_dancing.png', workspaceDesc: 'Dance action' },
  { id: 'petting', label: 'Pet', workspaceFile: 'pet_petted.mp4', workspaceDesc: 'Pet interaction (video)' },
  { id: 'licking', label: 'Groom', workspaceFile: 'pet_fur.mp4', workspaceDesc: 'Groom interaction (video)' },
  { id: 'laser', label: 'Laser', workspaceFile: 'pet_laser.png', workspaceDesc: 'Laser play mode' },
] as const;

export type BuiltinInteractionId = (typeof BUILTIN_INTERACTIONS)[number]['id'];

export const BUILTIN_INTERACTION_IDS = new Set<string>(BUILTIN_INTERACTIONS.map((f) => f.id));

export const BUILTIN_FEATURE_UI = [
  { id: 'petting' as const, name: 'Pet', emoji: '❤️', hint: 'Each pet action' },
  { id: 'licking' as const, name: 'Groom', emoji: '✨', hint: 'Each groom action' },
  { id: 'dancing' as const, name: 'Dance', emoji: '🎵', hint: 'When dance starts' },
  { id: 'laser' as const, name: 'Laser', emoji: '🔴', hint: 'When laser turns on' },
  { id: 'sleep' as const, name: 'Sleep', emoji: '😴', hint: 'When nap starts' },
];

export function getBuiltinInteractionLabel(id: string): string {
  const found = BUILTIN_INTERACTIONS.find((f) => f.id === id);
  if (found) return found.label;
  if (id === 'studying') return 'Study';
  if (String(id).startsWith('food:')) return 'Eat';
  return id;
}
