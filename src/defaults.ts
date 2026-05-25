import { FoodItem } from './types';

export const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'fish',
    name: 'Golden Fish',
    emoji: '🐟',
    description: 'Savoury fillet',
    statsBonus: { happiness: 2, hunger: -20, energy: 15, cleanliness: 0, love: 2 },
  },
  {
    id: 'ikan_bilis',
    name: 'Ikan Bilis',
    emoji: '🐟✨',
    description: 'Dried anchovy super treat',
    statsBonus: { happiness: 5, hunger: -25, energy: 25, cleanliness: 0, love: 3 },
  },
  {
    id: 'catnip',
    name: 'Catnip Herb',
    emoji: '🍃',
    description: 'Herbal treat',
    statsBonus: { happiness: 8, hunger: -10, energy: 20, cleanliness: 0, love: 5 },
  },
  {
    id: 'cream',
    name: 'Cream Bowl',
    emoji: '🥛',
    description: 'Creamy milk treat',
    statsBonus: { happiness: 4, hunger: -15, energy: 5, cleanliness: 0, love: 1 },
  },
];

export const getFoodAssetKey = (foodId: string) => `food:${foodId}`;
