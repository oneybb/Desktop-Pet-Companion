import { FoodItem } from './types';

export const DEFAULT_PET_NAME = 'Tabby';
export const DEFAULT_PET_WEIGHT_KG = 4;

export const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'fish',
    name: 'Golden Fish',
    emoji: '🐟',
    description: 'Savoury fillet',
    statsBonus: { happiness: 4, energy: 15, cleanliness: 0, weight: 0.15 },
  },
  {
    id: 'ikan_bilis',
    name: 'Ikan Bilis',
    emoji: '🐟✨',
    description: 'Dried anchovy super treat',
    statsBonus: { happiness: 8, energy: 25, cleanliness: 0, weight: 0.08 },
  },
  {
    id: 'catnip',
    name: 'Catnip Herb',
    emoji: '🍃',
    description: 'Herbal treat',
    statsBonus: { happiness: 12, energy: 20, cleanliness: 0, weight: 0.02 },
  },
  {
    id: 'cream',
    name: 'Cream Bowl',
    emoji: '🥛',
    description: 'Creamy milk treat',
    statsBonus: { happiness: 6, energy: 8, cleanliness: 0, weight: 0.25 },
  },
];

export const getFoodAssetKey = (foodId: string) => `food:${foodId}`;
