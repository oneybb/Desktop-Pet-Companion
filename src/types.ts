/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PetState = 'idle' | 'studying' | 'focusReward' | 'petting' | 'licking' | 'eating' | 'dancing' | 'laser' | string;

export interface PetStats {
  happiness: number; // 0 - 100
  hunger: number; // 0 - 100 (0 means full, 100 means starving)
  energy: number; // 0 - 100
  cleanliness: number; // 0 - 100
  love: number; // 0 - 1000 (total affection)
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

export interface CustomFeature {
  id: string; // e.g., 'backflip'
  name: string; // e.g. 'Backflip'
  description: string;
  statsBonus: {
    happiness: number;
    hunger: number;
    energy: number;
    cleanliness: number;
    love: number;
  };
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  statsBonus: {
    happiness: number;
    hunger: number;
    energy: number;
    cleanliness: number;
    love: number;
  };
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

export interface DesktopPetSeed {
  stats: PetStats;
  customizer: WidgetCustomizer;
  customDuration: number;
  assets: CustomAssets;
  exportedAt: string;
}
