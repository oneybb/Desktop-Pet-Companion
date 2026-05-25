/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PetState = 'idle' | 'studying' | 'sleep' | 'focusReward' | 'petting' | 'licking' | 'eating' | 'dancing' | 'laser' | string;

export interface PetStats {
  happiness: number; // 0 - 100
  energy: number; // 0 - 100
  cleanliness: number; // 0 - 100
  focusMinutes: number; // total accumulated focus minutes
  completedSessions: number; // Pomodoro count
}

export type TimerMode = 'study' | 'shortBreak' | 'longBreak';

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface UploadedFile {
  id: string;
  url: string; // The URL.createObjectURL representation at runtime
  type: 'image' | 'video';
  name: string;
}

/** Per-use stat deltas for an activity (+ or −), mapped to the three bars */
export interface ActivityStatBonus {
  happiness: number;
  energy: number;
  cleanliness: number;
}

export interface CustomFeature {
  id: string; // e.g., 'backflip'
  name: string; // e.g. 'Backflip'
  description: string;
  statsBonus: ActivityStatBonus;
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  statsBonus: ActivityStatBonus;
}

export interface CustomAssets {
  useWorkspace: boolean; // if true, uses public/ assets
  workspacePaths: {
    idle: string;
    studying: string;
    shortBreak: string;
    rest: string;
    focusReward: string; //celebration key
    eating: string;
    dancing: string;
    videoPetting: string;
    videoLicking: string;
    videoEating: string;
    videoDancing: string;
  };
  uploadedAssets: Record<string, UploadedFile[]>; // flexible dynamic list map
  activeIndices: Record<string, number>; // index mapping
  playModes: Record<string, 'cycle' | 'random'>; // button-specific play modes!
  customFeatures: CustomFeature[];
  foods: FoodItem[];
}

export interface WidgetCustomizer {
  scale: 'small' | 'medium' | 'large';
  opacity: number; // 0.1 to 1.0
  theme: 'pastel' | 'dark' | 'glass' | 'retro-win98';
  borderStyle: 'none' | 'thin' | 'double' | 'retro';
  soundVolume: number; // 0 to 1
  alwaysOnTopGuide: boolean;
}

export interface StatDecayRates {
  happiness: number;
  energy: number;
  cleanliness: number;
}

export interface FocusSnackReward {
  foodId: string;
  countPer25Min: number;
}

export interface FocusRewardRates {
  happiness: number;
  cleanliness: number;
  energy: number;
  snacks: FocusSnackReward[];
}

export interface ActivityRewards {
  petting: ActivityStatBonus;
  licking: ActivityStatBonus;
  dancing: ActivityStatBonus;
  laser: ActivityStatBonus;
  sleep: ActivityStatBonus;
}

export interface CompanionSettings {
  petName: string;
  decayPerHour: StatDecayRates;
  focusRewardPer25Min: FocusRewardRates;
  activityRewards: ActivityRewards;
  snackInventory: Record<string, number>;
  initialSnackCounts: Record<string, number>;
}

export interface DesktopPetSeed {
  stats: PetStats;
  customizer: WidgetCustomizer;
  customDuration: number;
  assets: CustomAssets;
  companionSettings?: CompanionSettings;
  exportedAt: string;
}
