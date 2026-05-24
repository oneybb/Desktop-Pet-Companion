import { FoodItem } from './types';

export const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'fish',
    name: 'Golden Fish',
    emoji: '🐟',
    description: 'Savoury fillet',
    statsBonus: { happiness: 0, hunger: -30, energy: 15, cleanliness: 0, love: 6 },
  },
  {
    id: 'ikan_bilis',
    name: 'Ikan Bilis',
    emoji: '🐟✨',
    description: 'Dried anchovy super treat',
    statsBonus: { happiness: 5, hunger: -45, energy: 25, cleanliness: 0, love: 15 },
  },
  {
    id: 'catnip',
    name: 'Catnip Herb',
    emoji: '🍃',
    description: 'Herbal treat',
    statsBonus: { happiness: 8, hunger: -15, energy: 20, cleanliness: 0, love: 6 },
  },
  {
    id: 'cream',
    name: 'Cream Bowl',
    emoji: '🥛',
    description: 'Creamy milk treat',
    statsBonus: { happiness: 4, hunger: -20, energy: 5, cleanliness: 0, love: 6 },
  },
];

export const getFoodAssetKey = (foodId: string) => `food:${foodId}`;
