import { FoodItem, PetStats, CompanionSettings, ActivityStatBonus, ActivityRewards } from '../types';
import { DEFAULT_FOODS, DEFAULT_PET_NAME } from '../defaults';
import { clampPetWeightKg, WEIGHT_KG_MIN, WEIGHT_KG_MAX } from './weightScale';

export { clampPetWeightKg, WEIGHT_KG_MIN, WEIGHT_KG_MAX };
export { formatWeightKg, formatWeightScaleLabel, formatWeightScaleShort, weightToScalePercent, getWeightScaleTier } from './weightScale';

export const FOCUS_REFERENCE_MINUTES = 25;

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  petName: DEFAULT_PET_NAME,
  decayPerHour: {
    happiness: 5,
    energy: 5,
    cleanliness: 5,
  },
  focusRewardPer25Min: {
    happiness: 35,
    cleanliness: 10,
    energy: 10,
    snacks: [],
  },
  activityRewards: {
    petting: { happiness: 15, energy: 0, cleanliness: 0, weight: 0 },
    licking: { happiness: 0, energy: 0, cleanliness: 25, weight: 0 },
    dancing: { happiness: 25, energy: -15, cleanliness: 0, weight: -0.05 },
    laser: { happiness: 5, energy: -5, cleanliness: 0, weight: 0 },
    sleep: { happiness: 0, energy: 45, cleanliness: 0, weight: 0 },
  },
  poseMediaSlideshowSeconds: 0,
  snackInventory: Object.fromEntries(DEFAULT_FOODS.map((f) => [f.id, 1])),
  initialSnackCounts: Object.fromEntries(DEFAULT_FOODS.map((f) => [f.id, 1])),
};

export const ACTIVITY_STAT_FIELDS: {
  key: keyof ActivityStatBonus;
  label: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: 'happiness', label: 'Happiness', hint: '0–100 bar', min: -100, max: 100 },
  { key: 'energy', label: 'Energy', hint: '0–100 bar', min: -100, max: 100 },
  { key: 'cleanliness', label: 'Cleanliness', hint: '0–100 bar', min: -100, max: 100 },
  { key: 'weight', label: 'Weight', hint: 'kg on scale (+/−)', min: -2, max: 2, step: 0.05 },
];

export function normalizeStatBonus(raw?: Partial<ActivityStatBonus> | null): ActivityStatBonus {
  return {
    happiness: raw?.happiness ?? 0,
    energy: raw?.energy ?? 0,
    cleanliness: raw?.cleanliness ?? 0,
    weight: raw?.weight ?? 0,
  };
}

function mergeActivityRewards(
  parsed?: Partial<ActivityRewards>,
  legacySleep?: Partial<ActivityStatBonus> | null
): ActivityRewards {
  const base = DEFAULT_COMPANION_SETTINGS.activityRewards;
  const keys = Object.keys(base) as (keyof ActivityRewards)[];
  const merged = { ...base };
  for (const key of keys) {
    const raw = {
      ...parsed?.[key],
      ...(key === 'sleep' ? legacySleep : undefined),
    };
    merged[key] = normalizeStatBonus(raw);
  }
  return merged;
}

export function normalizeCompanionSettings(
  parsed?: Partial<CompanionSettings> & { sleepReward?: Partial<ActivityStatBonus> } | null
): CompanionSettings {
  if (!parsed) {
    return { ...DEFAULT_COMPANION_SETTINGS };
  }

  const legacyDecay = parsed.decayPerHour as Partial<CompanionSettings['decayPerHour']> & {
    hunger?: number;
  } | undefined;

  return {
    ...DEFAULT_COMPANION_SETTINGS,
    ...parsed,
    petName:
      typeof parsed.petName === 'string' && parsed.petName.trim()
        ? parsed.petName.trim().slice(0, 32)
        : DEFAULT_PET_NAME,
    decayPerHour: {
      happiness: legacyDecay?.happiness ?? DEFAULT_COMPANION_SETTINGS.decayPerHour.happiness,
      energy: legacyDecay?.energy ?? DEFAULT_COMPANION_SETTINGS.decayPerHour.energy,
      cleanliness: legacyDecay?.cleanliness ?? DEFAULT_COMPANION_SETTINGS.decayPerHour.cleanliness,
    },
    focusRewardPer25Min: {
      ...DEFAULT_COMPANION_SETTINGS.focusRewardPer25Min,
      ...parsed.focusRewardPer25Min,
      snacks: parsed.focusRewardPer25Min?.snacks ?? DEFAULT_COMPANION_SETTINGS.focusRewardPer25Min.snacks,
    },
    activityRewards: mergeActivityRewards(parsed.activityRewards, parsed.sleepReward),
    poseMediaSlideshowSeconds: Math.max(
      0,
      Math.min(24 * 3600, parsed.poseMediaSlideshowSeconds ?? DEFAULT_COMPANION_SETTINGS.poseMediaSlideshowSeconds)
    ),
    snackInventory: { ...DEFAULT_COMPANION_SETTINGS.snackInventory, ...parsed.snackInventory },
    initialSnackCounts: {
      ...DEFAULT_COMPANION_SETTINGS.initialSnackCounts,
      ...parsed.initialSnackCounts,
    },
  };
}

export function loadCompanionSettings(): CompanionSettings {
  const saved = localStorage.getItem('desktop_pet_companion_settings');
  if (saved) {
    try {
      return normalizeCompanionSettings(
        JSON.parse(saved) as Partial<CompanionSettings> & { sleepReward?: Partial<ActivityStatBonus> }
      );
    } catch {
      /* fall through */
    }
  }
  return { ...DEFAULT_COMPANION_SETTINGS };
}

/** Snapshot before React effects run — used to avoid re-applying bundled export seed every launch. */
export function hadPersistedCompanionSettingsOnLaunch(): boolean {
  try {
    return localStorage.getItem('desktop_pet_companion_settings') != null;
  } catch {
    return false;
  }
}

/** Ensure every known food has an inventory slot; new foods get initialSnackCounts or 1 */
export function syncSnackInventory(
  inventory: Record<string, number>,
  foods: FoodItem[],
  initialCounts: Record<string, number>
): Record<string, number> {
  const next = { ...inventory };
  for (const food of foods) {
    if (next[food.id] === undefined) {
      next[food.id] = initialCounts[food.id] ?? 1;
    }
  }
  return next;
}

export function addFoodToInventory(
  inventory: Record<string, number>,
  foodId: string,
  initialCounts: Record<string, number>
): Record<string, number> {
  if (inventory[foodId] !== undefined) return inventory;
  return {
    ...inventory,
    [foodId]: initialCounts[foodId] ?? 1,
  };
}

export function consumeSnack(
  inventory: Record<string, number>,
  foodId: string
): { inventory: Record<string, number>; ok: boolean } {
  const count = inventory[foodId] ?? 0;
  if (count < 1) return { inventory, ok: false };
  return {
    inventory: { ...inventory, [foodId]: count - 1 },
    ok: true,
  };
}

export function applyFocusSessionRewards(
  minutes: number,
  settings: CompanionSettings,
  setStats: (fn: (prev: PetStats) => PetStats) => void,
  setSettings: (fn: (prev: CompanionSettings) => CompanionSettings) => void
): { statGains: { happiness: number; cleanliness: number; energy: number }; snacksGranted: Record<string, number> } {
  const scale = minutes / FOCUS_REFERENCE_MINUTES;
  const rates = settings.focusRewardPer25Min;
  const happinessGain = Math.round(rates.happiness * scale);
  const cleanlinessGain = Math.round(rates.cleanliness * scale);
  const energyGain = Math.round(rates.energy * scale);

  setStats((prev) => ({
    ...prev,
    focusMinutes: prev.focusMinutes + minutes,
    completedSessions: prev.completedSessions + 1,
    happiness: Math.min(100, prev.happiness + happinessGain),
    cleanliness: Math.min(100, prev.cleanliness + cleanlinessGain),
    energy: Math.min(100, prev.energy + energyGain),
  }));

  const snacksGranted: Record<string, number> = {};
  if (rates.snacks.length > 0) {
    setSettings((prev) => {
      const inv = { ...prev.snackInventory };
      for (const { foodId, countPer25Min } of rates.snacks) {
        const grant = Math.max(0, Math.round(countPer25Min * scale));
        if (grant > 0) {
          inv[foodId] = (inv[foodId] ?? 0) + grant;
          snacksGranted[foodId] = grant;
        }
      }
      return { ...prev, snackInventory: inv };
    });
  }

  return {
    statGains: { happiness: happinessGain, cleanliness: cleanlinessGain, energy: energyGain },
    snacksGranted,
  };
}

export function clampActivityStat(key: keyof ActivityStatBonus, value: number): number {
  const field = ACTIVITY_STAT_FIELDS.find((f) => f.key === key);
  if (!field) return value;
  return Math.max(field.min, Math.min(field.max, value));
}

export function applyActivityStatBonus(
  bonus: ActivityStatBonus,
  setStats: (fn: (prev: PetStats) => PetStats) => void
): void {
  const b = normalizeStatBonus(bonus);
  setStats((prev) => ({
    ...prev,
    happiness: Math.min(100, Math.max(0, prev.happiness + b.happiness)),
    energy: Math.min(100, Math.max(0, prev.energy + b.energy)),
    cleanliness: Math.min(100, Math.max(0, prev.cleanliness + b.cleanliness)),
    weight: clampPetWeightKg(prev.weight + b.weight),
  }));
}

export function formatStatScore(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}`;
}

export function formatDurationSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function durationToSeconds(hours: number, minutes: number, seconds: number): number {
  return Math.max(1, Math.min(24 * 3600, hours * 3600 + minutes * 60 + seconds));
}

export function durationToSecondsAllowZero(hours: number, minutes: number, seconds: number): number {
  return Math.max(0, Math.min(24 * 3600, hours * 3600 + minutes * 60 + seconds));
}

export function secondsToHms(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const capped = Math.max(0, Math.min(24 * 3600, totalSeconds));
  return {
    hours: Math.floor(capped / 3600),
    minutes: Math.floor((capped % 3600) / 60),
    seconds: capped % 60,
  };
}
