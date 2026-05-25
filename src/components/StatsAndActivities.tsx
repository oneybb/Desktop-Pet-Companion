/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PetStats, PetState, CustomAssets, CustomFeature, CompanionSettings, FoodItem } from '../types';
import { DEFAULT_FOODS, getFoodAssetKey } from '../defaults';
import {
  formatStatScore,
  formatDurationSeconds,
  durationToSeconds,
  applyActivityStatBonus,
  FOCUS_REFERENCE_MINUTES,
} from '../utils/companionSettings';
import {
  Heart,
  Sparkles,
  Utensils,
  Music,
  Moon,
  Compass,
  Smile,
  Settings2,
  Package,
  Timer,
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
  companionSettings: CompanionSettings;
  setCompanionSettings: React.Dispatch<React.SetStateAction<CompanionSettings>>;
  sleepActive: boolean;
  sleepRemaining: number;
  onStartSleep: (totalSeconds: number) => void;
  onWakeUp: () => void;
  onReturnToIdle: () => void;
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
  companionSettings,
  setCompanionSettings,
  sleepActive,
  sleepRemaining,
  onStartSleep,
  onWakeUp,
  onReturnToIdle,
}: StatsAndActivitiesProps) {
  const [selectedFood, setSelectedFood] = useState<string>('fish');
  const [showCompanionSettings, setShowCompanionSettings] = useState(false);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepSeconds, setSleepSeconds] = useState(0);

  const foods: FoodItem[] = assets?.foods || DEFAULT_FOODS;
  const { petName, snackInventory, decayPerHour, focusRewardPer25Min, activityRewards, initialSnackCounts } =
    companionSettings;

  const applyFoodBonuses = (food: FoodItem) => {
    applyActivityStatBonus(food.statsBonus, setStats);
  };

  const handlePetThePet = () => {
    applyActivityStatBonus(activityRewards.petting, setStats);
    setLaserMode(false);
    setInteractState('petting', customDuration * 1000);
  };

  const handleLickFur = () => {
    applyActivityStatBonus(activityRewards.licking, setStats);
    setLaserMode(false);
    setInteractState('licking', customDuration * 1000);
  };

  const handleFeed = () => {
    const food = foods.find((f) => f.id === selectedFood) || foods[0];
    const stock = snackInventory[food.id] ?? 0;
    if (stock < 1) return;

    setCompanionSettings((prev) => ({
      ...prev,
      snackInventory: {
        ...prev.snackInventory,
        [food.id]: stock - 1,
      },
    }));
    applyFoodBonuses(food);
    setLaserMode(false);
    setInteractState(getFoodAssetKey(food.id), customDuration * 1000);
  };

  const handleDance = () => {
    applyActivityStatBonus(activityRewards.dancing, setStats);
    setLaserMode(false);
    setInteractState('dancing', customDuration * 1000);
  };

  const handleStartNap = () => {
    setLaserMode(false);
    onStartSleep(durationToSeconds(sleepHours, sleepMinutes, sleepSeconds));
  };

  const isBusy =
    sleepActive ||
    laserMode ||
    (currentInteractState !== 'idle' && currentInteractState !== 'laser');

  const handleToggleLaser = () => {
    const nextLaser = !laserMode;
    setLaserMode(nextLaser);
    if (nextLaser) {
      applyActivityStatBonus(activityRewards.laser, setStats);
    }
    setInteractState(nextLaser ? 'laser' : 'idle');
  };

  const handlePlayCustomFeature = (feature: CustomFeature) => {
    applyActivityStatBonus(feature.statsBonus, setStats);
    setLaserMode(false);
    setInteractState(feature.id, customDuration * 1000);
  };

  const updateDecay = (key: keyof typeof decayPerHour, value: number) => {
    setCompanionSettings((prev) => ({
      ...prev,
      decayPerHour: { ...prev.decayPerHour, [key]: Math.max(0, Math.min(50, value)) },
    }));
  };

  const updateFocusStat = (key: 'happiness' | 'cleanliness' | 'energy', value: number) => {
    setCompanionSettings((prev) => ({
      ...prev,
      focusRewardPer25Min: {
        ...prev.focusRewardPer25Min,
        [key]: Math.max(0, Math.min(100, value)),
      },
    }));
  };

  const updateFocusSnackReward = (foodId: string, countPer25Min: number) => {
    setCompanionSettings((prev) => {
      const snacks = [...prev.focusRewardPer25Min.snacks];
      const idx = snacks.findIndex((s) => s.foodId === foodId);
      if (countPer25Min <= 0) {
        if (idx >= 0) snacks.splice(idx, 1);
      } else if (idx >= 0) {
        snacks[idx] = { foodId, countPer25Min };
      } else {
        snacks.push({ foodId, countPer25Min });
      }
      return {
        ...prev,
        focusRewardPer25Min: { ...prev.focusRewardPer25Min, snacks },
      };
    });
  };

  const setInitialSnackCount = (foodId: string, count: number) => {
    const n = Math.max(0, Math.min(99, count));
    setCompanionSettings((prev) => ({
      ...prev,
      initialSnackCounts: { ...prev.initialSnackCounts, [foodId]: n },
    }));
  };

  const applyInitialToInventory = (foodId: string) => {
    const n = initialSnackCounts[foodId] ?? 1;
    setCompanionSettings((prev) => ({
      ...prev,
      snackInventory: { ...prev.snackInventory, [foodId]: n },
    }));
  };

  const statTiles = [
    { label: 'Happy', emoji: '😊', value: stats.happiness, className: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    { label: 'Clean', emoji: '✨', value: stats.cleanliness, className: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
    { label: 'Energy', emoji: '⚡', value: stats.energy, className: 'bg-amber-50 border-amber-100 text-amber-700' },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-xl flex flex-col justify-between h-full text-slate-800 transition-all duration-300 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
          <div>
            <span className="text-[10px] font-black text-indigo-400 tracking-wider uppercase block">
              Current Companion Status
            </span>
            <h3 className="text-sm font-black text-indigo-900 tracking-tight flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> {petName}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {stats.completedSessions} focus sessions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
          {statTiles.map((t) => (
            <div key={t.label} className={`border rounded-xl p-2 ${t.className}`}>
              {t.emoji} {t.label}{' '}
              <span className="font-mono">{formatStatScore(t.value)}</span>
              <span className="text-slate-400 font-normal">/100</span>
            </div>
          ))}
        </div>

        {/* Snack inventory */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" /> Snack inventory
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {foods.map((food) => {
              const stock = snackInventory[food.id] ?? 0;
              return (
                <div
                  key={food.id}
                  className={`text-center py-1.5 rounded-lg border text-[10px] ${
                    stock < 1
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-white border-amber-300 text-amber-900 font-bold'
                  }`}
                  title={food.name}
                >
                  <div className="text-base">{food.emoji}</div>
                  <div className="font-mono">×{stock}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCompanionSettings(!showCompanionSettings)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 cursor-pointer transition-all"
        >
          <Settings2 className="w-3.5 h-3.5" />
          {showCompanionSettings ? 'Hide' : 'Show'} decay, focus rewards & snack stock
        </button>

        {showCompanionSettings && (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Timer className="w-3 h-3" /> Hourly decay (points lost/gained per hour)
              </span>
              {(['happiness', 'energy', 'cleanliness'] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-2 text-[10px] font-bold capitalize">
                  <span className="text-slate-600 w-24">{key}</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={decayPerHour[key]}
                    onChange={(e) => updateDecay(key, parseFloat(e.target.value) || 0)}
                    className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-mono text-indigo-700"
                  />
                  <span className="text-slate-400 text-[9px]">pts/hr</span>
                </label>
              ))}
              <p className="text-[9px] text-slate-400">All three bars decay over time while idle.</p>
            </div>

            <p className="text-[9px] text-indigo-600 font-bold border-t border-slate-200 pt-2">
              Activity stat bonuses (+/−) are configured in the Pet Customizer Engine → Features tab.
            </p>

            <div className="space-y-2 border-t border-slate-200 pt-2">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                Study reward per {FOCUS_REFERENCE_MINUTES}m (scales with session length)
              </span>
              {(['happiness', 'energy', 'cleanliness'] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-2 text-[10px] font-bold capitalize">
                  <span className="text-slate-600 w-24">+{key}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={focusRewardPer25Min[key]}
                    onChange={(e) => updateFocusStat(key, parseInt(e.target.value) || 0)}
                    className="w-16 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-mono text-indigo-700"
                  />
                  <span className="text-slate-400 text-[9px]">score</span>
                </label>
              ))}
              <p className="text-[9px] text-slate-400 font-bold">Snack rewards per {FOCUS_REFERENCE_MINUTES}m:</p>
              {foods.map((food) => {
                const entry = focusRewardPer25Min.snacks.find((s) => s.foodId === food.id);
                return (
                  <label key={food.id} className="flex items-center justify-between gap-2 text-[10px]">
                    <span>
                      {food.emoji} {food.name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={entry?.countPer25Min ?? 0}
                      onChange={(e) => updateFocusSnackReward(food.id, parseInt(e.target.value) || 0)}
                      className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 font-mono"
                    />
                  </label>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-2">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                Initial snack stock (backdoor)
              </span>
              <p className="text-[9px] text-slate-400">
                Set default count for new foods; Apply fills current inventory.
              </p>
              {foods.map((food) => (
                <div key={food.id} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-6 text-center">{food.emoji}</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={initialSnackCounts[food.id] ?? 1}
                    onChange={(e) => setInitialSnackCount(food.id, parseInt(e.target.value) || 0)}
                    className="w-10 text-center bg-white border border-slate-300 rounded font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => applyInitialToInventory(food.id)}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[9px] cursor-pointer"
                  >
                    Apply
                  </button>
                  <span className="text-slate-400 truncate flex-1">now: ×{snackInventory[food.id] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/65 rounded-xl p-2.5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
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
          <div className="flex gap-1 justify-between">
            {[5, 10, 30, 60, 300].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCustomDuration(sec)}
                className={`flex-1 py-1 text-[9px] font-mono font-extrabold rounded-md shadow-sm transition-all border cursor-pointer ${
                  customDuration === sec
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-100 my-2" />

      <div className="space-y-3 flex-1 flex flex-col justify-end">
        <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
          <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-indigo-600" /> Trigger Pose
          </label>
          <select
            value={currentInteractState}
            onChange={(e) => {
              setLaserMode(false);
              const val = e.target.value;
              const customFeat = assets?.customFeatures?.find((f) => f.id === val);
              if (customFeat) {
                handlePlayCustomFeature(customFeat);
              } else if (val === 'sleep') {
                handleStartNap();
              } else if (val === 'idle') {
                onReturnToIdle();
              } else {
                setInteractState(val, customDuration * 1000);
              }
            }}
            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 font-bold text-[11px] text-slate-700 cursor-pointer"
          >
            <option value="idle">🛋️ Idle</option>
            <option value="studying">📚 Study</option>
            <option value="sleep">😴 Sleep</option>
            <option value="focusReward">🏆 Celebrate</option>
            <option value="eating">🍕 Eat</option>
            <option value="dancing">🎵 Dance</option>
            <option value="petting">❤️ Pet</option>
            <option value="licking">✨ Groom</option>
            {assets?.customFeatures?.map((feat) => (
              <option key={feat.id} value={feat.id}>
                🎮 {feat.name}
              </option>
            ))}
          </select>
        </div>

        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Interactive Pet Activities</h4>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handlePetThePet}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-rose-600/20 text-rose-600" /> Pet
          </button>
          <button
            onClick={handleLickFur}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 p-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-600" /> Groom
          </button>
          <button
            onClick={handleDance}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition-all disabled:opacity-40 cursor-pointer col-span-2"
          >
            <Music className="w-4 h-4 text-indigo-600 animate-bounce" /> Dance
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-amber-500" /> Eat
            </span>
            <button
              onClick={handleFeed}
              disabled={isBusy || (snackInventory[selectedFood] ?? 0) < 1}
              className="px-3.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-sm text-[11px]"
            >
              Eat
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {foods.map((food) => {
              const stock = snackInventory[food.id] ?? 0;
              return (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food.id)}
                  className={`py-1.5 px-1 rounded-lg border text-base text-center transition-all cursor-pointer relative ${
                    selectedFood === food.id
                      ? 'bg-amber-100 border-amber-400 font-bold'
                      : 'bg-white border-slate-200 hover:bg-amber-50/40'
                  } ${stock < 1 ? 'opacity-50' : ''}`}
                  title={`${food.name} — ×${stock} in stock`}
                >
                  <div>{food.emoji}</div>
                  <div className="text-[8px] font-mono text-amber-700">×{stock}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1">
              <Moon className="w-3.5 h-3.5" /> Sleep
            </span>
            <span className="text-[9px] text-violet-700 font-bold text-right leading-tight">
              On start: ⚡{activityRewards.sleep.energy >= 0 ? '+' : ''}{activityRewards.sleep.energy} 😊
              {activityRewards.sleep.happiness >= 0 ? '+' : ''}
              {activityRewards.sleep.happiness}
            </span>
          </div>
          <p className="text-[9px] text-slate-500">Edit nap bonuses in Customizer Engine → Features.</p>
          {sleepActive ? (
            <div className="space-y-2">
              <p className="text-center text-sm font-black text-indigo-700 font-mono">
                Zzz… {formatDurationSeconds(sleepRemaining)} left
              </p>
              <button
                type="button"
                onClick={onWakeUp}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Wake Up
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'hr', value: sleepHours, setter: setSleepHours, max: 23 },
                  { label: 'min', value: sleepMinutes, setter: setSleepMinutes, max: 59 },
                  { label: 'sec', value: sleepSeconds, setter: setSleepSeconds, max: 59 },
                ].map((field) => (
                  <label key={field.label} className="text-center">
                    <input
                      type="number"
                      min={0}
                      max={field.max}
                      value={field.value}
                      onChange={(e) =>
                        field.setter(Math.max(0, Math.min(field.max, parseInt(e.target.value) || 0)))
                      }
                      className="w-full text-center bg-white border border-indigo-200 rounded-lg px-1 py-1.5 text-sm font-black text-indigo-700 font-mono"
                    />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{field.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleStartNap}
                disabled={isBusy}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer text-xs"
              >
                Sleep
              </button>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleToggleLaser}
            disabled={sleepActive}
            className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all font-bold cursor-pointer disabled:opacity-40 ${
              laserMode
                ? 'bg-red-600 text-white border-red-600 shadow-md animate-pulse'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            {laserMode ? 'Laser ON' : 'Laser'}
          </button>
        </div>

        {isBusy && (
          <button
            type="button"
            onClick={onReturnToIdle}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
          >
            Return to Idle
          </button>
        )}
      </div>
    </div>
  );
}
