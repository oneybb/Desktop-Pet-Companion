/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PetStats, PetState, CustomAssets, CustomFeature } from '../types';
import { 
  Heart, 
  Sparkles, 
  Utensils, 
  Music, 
  Moon, 
  Compass, 
  Smile, 
  TrendingUp, 
  Dribbble,
  Volume2
} from 'lucide-react';

interface StatsAndActivitiesProps {
  stats: PetStats;
  setStats: React.Dispatch<React.SetStateAction<PetStats>>;
  currentInteractState: PetState;
  setInteractState: (state: PetState, durationMs?: number) => void;
  laserMode: boolean;
  setLaserMode: (val: boolean) => void;
  assets?: CustomAssets;
  customDuration: number;
  setCustomDuration: (val: number) => void;
}

export default function StatsAndActivities({
  stats,
  setStats,
  currentInteractState,
  setInteractState,
  laserMode,
  setLaserMode,
  assets,
  customDuration,
  setCustomDuration,
}: StatsAndActivitiesProps) {
  const [selectedFood, setSelectedFood] = useState<string>('fish');
  
  // Calculate Pet Level based on accumulated affection (Love)
  const petLevel = Math.max(1, Math.floor(Math.sqrt(stats.love / 15)) + 1);
  const nextLevelLoveProgress = Math.pow(petLevel, 2) * 15;
  const prevLevelLoveProgress = Math.pow(petLevel - 1, 2) * 15;
  const levelProgressPct = Math.min(
    150,
    Math.max(0, ((stats.love - prevLevelLoveProgress) / (nextLevelLoveProgress - prevLevelLoveProgress)) * 100)
  );

  const foods = [
    { id: 'fish', name: 'Golden Fish', emoji: '🐟', satiety: 30, energy: 10, desc: 'Cat absolute special treat' },
    { id: 'ikan_bilis', name: 'Ikan Bilis', emoji: '🐟✨', satiety: 35, energy: 25, desc: 'Dried small premium anchovy treat' },
    { id: 'catnip', name: 'Fresh Catnip', emoji: '🍃', satiety: 15, energy: 20, desc: 'Increases agility and focus' },
    { id: 'cream', name: 'Fresh Cream', emoji: '🥛', satiety: 20, energy: 5, desc: 'Creamy milk dessert bowl' },
  ];

  // Action Core Triggers
  const handlePetThePet = () => {
    // Increment Love & Happiness
    setStats((prev) => ({
      ...prev,
      love: prev.love + 8,
      happiness: Math.min(100, prev.happiness + 15),
    }));
    setLaserMode(false);
    setInteractState('petting', customDuration * 1000); // customized duration
  };

  const handleLickFur = () => {
    setStats((prev) => ({
      ...prev,
      cleanliness: Math.min(100, prev.cleanliness + 25),
      love: prev.love + 4,
    }));
    setLaserMode(false);
    setInteractState('licking', customDuration * 1000);
  };

  const handleFeed = () => {
    const food = foods.find((f) => f.id === selectedFood) || foods[0];
    
    // Decrease hunger (satiation reduces starvation factor)
    setStats((prev) => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - food.satiety),
      energy: Math.min(100, prev.energy + food.energy),
      love: prev.love + 5,
    }));
    setLaserMode(false);
    setInteractState('eating', customDuration * 1000);
  };

  const handleDance = () => {
    setStats((prev) => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 25),
      energy: Math.max(15, prev.energy - 15), // taxes energy a bit
      love: prev.love + 10,
    }));
    setLaserMode(false);
    setInteractState('dancing', customDuration * 1000);
  };

  const handleNap = () => {
    setStats((prev) => ({
      ...prev,
      energy: Math.min(100, prev.energy + 45),
      hunger: Math.min(100, prev.hunger + 15), // getting hungry after sleeping
    }));
    setLaserMode(false);
    setInteractState('studying', customDuration * 1000); // reuse focusing state to sleeping pose for a while
  };

  // Turn on/off laser chase cursor play
  const handleToggleLaser = () => {
    const nextLaser = !laserMode;
    setLaserMode(nextLaser);
    if (nextLaser) {
      setInteractState('laser');
    } else {
      setInteractState('idle');
    }
  };

  // Play custom dynamic interactions
  const handlePlayCustomFeature = (feature: CustomFeature) => {
    const bonuses = feature.statsBonus;
    setStats((prev) => ({
      ...prev,
      happiness: Math.min(100, Math.max(0, prev.happiness + (bonuses.happiness || 0))),
      hunger: Math.min(100, Math.max(0, prev.hunger + (bonuses.hunger || 0))),
      energy: Math.min(100, Math.max(0, prev.energy + (bonuses.energy || 0))),
      cleanliness: Math.min(100, Math.max(0, prev.cleanliness + (bonuses.cleanliness || 0))),
      love: prev.love + (bonuses.love || 10),
    }));
    setLaserMode(false);
    setInteractState(feature.id, customDuration * 1000); // triggers pose for customized time
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-xl flex flex-col justify-between h-full text-slate-800 transition-all duration-300">
      
      {/* Level and Title banner */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-indigo-50/60 p-3 rounded-xl border border-indigo-150">
          <div>
            <span className="text-[10px] font-black text-indigo-400 tracking-wider uppercase block">Current Companion Level</span>
            <h3 className="text-sm font-black text-indigo-900 tracking-tight flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" /> Level {petLevel} Cyber-Cat
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold text-slate-500">{Number(stats.love).toFixed(2)} / {nextLevelLoveProgress} Affection XP</span>
          </div>
        </div>

        {/* Level Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${levelProgressPct}%` }}
          />
        </div>

        {/* Action State Duration Controller */}
        <div className="bg-slate-50 border border-slate-200/65 rounded-xl p-2.5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              ⏱️ Action Duration Timer
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="600"
                value={customDuration}
                onChange={(e) => setCustomDuration(Math.max(1, Math.min(600, parseInt(e.target.value) || 5)))}
                className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-black text-indigo-700 font-mono"
              />
              <span className="text-[10px] font-bold text-slate-500">seconds</span>
            </div>
          </div>
          
          {/* Quick preset buttons */}
          <div className="flex gap-1 justify-between">
            {[5, 10, 30, 60, 300].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCustomDuration(sec)}
                className={`flex-1 py-1 text-[9px] font-mono font-extrabold rounded-md shadow-sm transition-all border cursor-pointer ${
                  customDuration === sec
                    ? 'bg-indigo-600 text-white border-indigo-700 font-extrabold'
                    : 'bg-white hover:bg-slate-150 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>

      </div>

      <hr className="border-slate-100 my-1" />

      {/* Interact Section */}
      <div className="space-y-3 flex-1 flex flex-col justify-end">
        
        {/* Universal Poses Selector Dropdown */}
        <div className="p-2.5 bg-indigo-50/50 border border-indigo-150/80 rounded-xl space-y-1">
          <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Trigger Pose/Interaction (Dropdown)
          </label>
          <select
            value={currentInteractState}
            onChange={(e) => {
              setLaserMode(false);
              const val = e.target.value;
              const customFeat = assets?.customFeatures?.find(f => f.id === val);
              if (customFeat) {
                handlePlayCustomFeature(customFeat);
              } else {
                setInteractState(val, val === 'idle' ? 999999 : customDuration * 1000);
              }
            }}
            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 font-bold text-[11px] text-slate-705 cursor-pointer"
          >
            <option value="idle">🛋️ Idle (Resting / Default)</option>
            <option value="studying">📚 Studying (Focus Companion)</option>
            <option value="focusReward">🏆 Finish Focus (Reward Celebrate)</option>
            <option value="eating">🍕 Eating (Munching)</option>
            <option value="dancing">🎵 Dancing (Beat Wiggle)</option>
            <option value="petting">❤️ Petting Affection</option>
            <option value="licking">✨ Grooming licks</option>
            {assets?.customFeatures?.map((feat) => (
              <option key={feat.id} value={feat.id}>
                🎮 Custom Pose: {feat.name}
              </option>
            ))}
          </select>
        </div>

        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Interactive Pet Activities</h4>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Pet activity */}
          <button
            onClick={handlePetThePet}
            disabled={currentInteractState !== 'idle' && currentInteractState !== 'laser'}
            className="flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Heart className="w-4.5 h-4.5 fill-rose-600/20 text-rose-600 animate-pulse" /> Pet Cat 🐾
          </button>

          {/* Clean Fur */}
          <button
            onClick={handleLickFur}
            disabled={currentInteractState !== 'idle' && currentInteractState !== 'laser'}
            className="flex items-center justify-center gap-2 p-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5 text-sky-600" /> Groom Fur ✨
          </button>

          {/* Dance */}
          <button
            onClick={handleDance}
            disabled={currentInteractState !== 'idle' && currentInteractState !== 'laser'}
            className="flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer col-span-2"
          >
            <Music className="w-4.5 h-4.5 text-indigo-600 animate-bounce" /> Dance Beats 🎵
          </button>
        </div>

        {/* Feeding Station */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-amber-500" /> Feeding station
            </span>
            <button
              onClick={handleFeed}
              disabled={currentInteractState !== 'idle' && currentInteractState !== 'laser'}
              className="px-3.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-sm text-[11px]"
            >
              Feed Snack 🍕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {foods.map((food) => (
              <button
                key={food.id}
                onClick={() => setSelectedFood(food.id)}
                className={`py-1.5 px-1 rounded-lg border text-base text-center transition-all cursor-pointer ${
                  selectedFood === food.id
                    ? 'bg-amber-100 border-amber-400 font-bold scale-102 font-bold'
                    : 'bg-white border-slate-200 hover:bg-amber-50/40'
                }`}
                title={`${food.name} (Satiety: +${food.satiety}, Energy: +${food.energy})`}
              >
                <div>{food.emoji}</div>
                <div className="text-[9px] text-slate-500 truncate leading-tight mt-0.5">{food.name.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic laser pointer game and Sleep controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleToggleLaser}
            className={`flex items-center justify-center gap-1.5 p-2 px-3.5 rounded-xl border transition-all font-bold cursor-pointer ${
              laserMode
                ? 'bg-red-600 text-white border-red-600 shadow-md animate-pulse'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            {laserMode ? 'Laser Target: ON' : 'Laser Chase Pointer'}
          </button>

          <button
            onClick={handleNap}
            className="flex items-center justify-center gap-1.5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all cursor-pointer"
          >
            <Moon className="w-4 h-4 text-indigo-500" /> Need Nap Zzz
          </button>
        </div>
      </div>
    </div>
  );
}
