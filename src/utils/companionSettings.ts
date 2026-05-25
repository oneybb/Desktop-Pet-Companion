import { FoodItem, PetStats, CompanionSettings } from '../types';
import { DEFAULT_FOODS } from '../defaults';

export const FOCUS_REFERENCE_MINUTES = 25;

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  decayPerHour: {
    happiness: 5,
    hunger: 5,
    energy: 5,
    cleanliness: 5,
  },
  focusRewardPer25Min: {
    happiness: 35,
    cleanliness: 10,
    energy: 10,
    snacks: [],
  },
  snackInventory: Object.fromEntries(DEFAULT_FOODS.map((f) => [f.id, 1])),
  initialSnackCounts: Object.fromEntries(DEFAULT_FOODS.map((f) => [f.id, 1])),
};

export function loadCompanionSettings(): CompanionSettings {
  const saved = localStorage.getItem('desktop_pet_companion_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<CompanionSettings>;
      return {
        ...DEFAULT_COMPANION_SETTINGS,
        ...parsed,
        decayPerHour: { ...DEFAULT_COMPANION_SETTINGS.decayPerHour, ...parsed.decayPerHour },
        focusRewardPer25Min: {
          ...DEFAULT_COMPANION_SETTINGS.focusRewardPer25Min,
          ...parsed.focusRewardPer25Min,
          snacks: parsed.focusRewardPer25Min?.snacks ?? DEFAULT_COMPANION_SETTINGS.focusRewardPer25Min.snacks,
        },
        snackInventory: { ...DEFAULT_COMPANION_SETTINGS.snackInventory, ...parsed.snackInventory },
        initialSnackCounts: {
          ...DEFAULT_COMPANION_SETTINGS.initialSnackCounts,
          ...parsed.initialSnackCounts,
        },
      };
    } catch {
      /* fall through */
    }
  }
  return { ...DEFAULT_COMPANION_SETTINGS };
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

export function formatStatScore(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}`;
}
