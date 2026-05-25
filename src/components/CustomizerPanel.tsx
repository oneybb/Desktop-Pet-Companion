/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CustomAssets,
  WidgetCustomizer,
  UploadedFile,
  PetStats,
  FoodItem,
  CompanionSettings,
  ActivityRewards,
  ActivityStatBonus,
  CustomFeature,
} from '../types';
import {
  ACTIVITY_STAT_FIELDS,
  clampActivityStat,
  normalizeStatBonus,
  durationToSecondsAllowZero,
  secondsToHms,
  formatDurationSeconds,
  FOCUS_REFERENCE_MINUTES,
} from '../utils/companionSettings';
import { getFoodAssetKey } from '../defaults';
import { BUILTIN_INTERACTIONS, BUILTIN_FEATURE_UI } from '../featureCatalog';
import { 
  Upload, 
  Monitor, 
  HelpCircle, 
  Files, 
  Volume2, 
  Settings, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Trash2
} from 'lucide-react';

interface CustomizerPanelProps {
  customizer: WidgetCustomizer;
  setCustomizer: React.Dispatch<React.SetStateAction<WidgetCustomizer>>;
  assets: CustomAssets;
  setAssets: React.Dispatch<React.SetStateAction<CustomAssets>>;
  stats: PetStats;
  onResetStats: () => void;
  customDuration?: number;
  setCustomDuration?: (val: number) => void;
  onFoodAdded?: (foodId: string) => void;
  companionSettings: CompanionSettings;
  setCompanionSettings: React.Dispatch<React.SetStateAction<CompanionSettings>>;
}

export default function CustomizerPanel({
  customizer,
  setCustomizer,
  assets,
  setAssets,
  stats,
  onResetStats,
  customDuration = 5,
  setCustomDuration,
  onFoodAdded,
  companionSettings,
  setCompanionSettings,
}: CustomizerPanelProps) {
  const [activeTab, setActiveTab] = useState<'visuals' | 'features' | 'uploads' | 'foods' | 'windows'>('features');
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string | null>(null);
  const [installHint, setInstallHint] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<'auto' | 'win32' | 'darwin'>('auto');
  const [isDownloading, setIsDownloading] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodEmoji, setNewFoodEmoji] = useState('🍪');
  const [newFoodDescription, setNewFoodDescription] = useState('');

  // File loading inputs
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Dynamic Custom Feature inputs
  const [newFeatName, setNewFeatName] = useState('');
  const [newFeatDesc, setNewFeatDesc] = useState('');
  const [bonusHappiness, setBonusHappiness] = useState(15);
  const [bonusEnergy, setBonusEnergy] = useState(-5);
  const [bonusClean, setBonusClean] = useState(0);
  const [bonusWeight, setBonusWeight] = useState(0);

  const { petName, activityRewards, decayPerHour, focusRewardPer25Min, poseMediaSlideshowSeconds } =
    companionSettings;
  const slideshowHms = secondsToHms(poseMediaSlideshowSeconds);
  const [slideHours, setSlideHours] = useState(slideshowHms.hours);
  const [slideMinutes, setSlideMinutes] = useState(slideshowHms.minutes);
  const [slideSeconds, setSlideSeconds] = useState(slideshowHms.seconds);

  const applySlideshowInterval = (h: number, m: number, s: number) => {
    setCompanionSettings((prev) => ({
      ...prev,
      poseMediaSlideshowSeconds: durationToSecondsAllowZero(h, m, s),
    }));
  };

  const updateSlideshowFromInputs = (h: number, m: number, s: number) => {
    setSlideHours(h);
    setSlideMinutes(m);
    setSlideSeconds(s);
    applySlideshowInterval(h, m, s);
  };

  useEffect(() => {
    const hms = secondsToHms(poseMediaSlideshowSeconds);
    setSlideHours(hms.hours);
    setSlideMinutes(hms.minutes);
    setSlideSeconds(hms.seconds);
  }, [poseMediaSlideshowSeconds]);

  const updatePetName = (name: string) => {
    setCompanionSettings((prev) => ({
      ...prev,
      petName: name.trim().slice(0, 32) || 'Tabby',
    }));
  };

  const updateActivityReward = (
    activityId: keyof ActivityRewards,
    stat: keyof ActivityStatBonus,
    value: number
  ) => {
    setCompanionSettings((prev) => ({
      ...prev,
      activityRewards: {
        ...prev.activityRewards,
        [activityId]: {
          ...prev.activityRewards[activityId],
          [stat]: clampActivityStat(stat, value),
        },
      },
    }));
  };

  const updateCustomFeatureStats = (
    featId: string,
    stat: keyof ActivityStatBonus,
    value: number
  ) => {
    setAssets((prev) => ({
      ...prev,
      customFeatures: (prev.customFeatures || []).map((f) =>
        f.id === featId
          ? { ...f, statsBonus: { ...f.statsBonus, [stat]: clampActivityStat(stat, value) } }
          : f
      ),
    }));
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
        [key]: Math.max(-100, Math.min(100, value)),
      },
    }));
  };

  const StatBonusInputs = ({
    bonus,
    onChange,
    compact,
  }: {
    bonus: ActivityStatBonus;
    onChange: (stat: keyof ActivityStatBonus, value: number) => void;
    compact?: boolean;
  }) => (
    <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-2`}>
      {ACTIVITY_STAT_FIELDS.map(({ key, label, hint, min, max, step }) => (
        <label key={key} className="flex flex-col gap-1 text-[10px] font-bold text-slate-600">
          <span className="uppercase tracking-wide text-slate-500">{label}</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step ?? 1}
            value={bonus[key]}
            onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
            className="w-full text-center bg-white border border-slate-300 rounded-lg px-2 py-2 font-mono text-sm text-indigo-800 font-black"
          />
          <span className="text-[9px] font-normal text-slate-400">{hint}</span>
        </label>
      ))}
    </div>
  );

  const handleFileUpload = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const { saveFileToDB } = await import('../utils/db');
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const type = file.type.startsWith('video') ? 'video' : 'image';
      
      try {
        await saveFileToDB(key, id, file.name, type, file);
        const url = URL.createObjectURL(file);
        newFiles.push({
          id,
          url,
          type,
          name: file.name,
        });
      } catch (err) {
        console.error("Failed to store custom asset in IndexedDB:", err);
      }
    }
    
    if (newFiles.length > 0) {
      setAssets((prev) => {
        const existing = prev.uploadedAssets[key] || [];
        return {
          ...prev,
          uploadedAssets: {
            ...prev.uploadedAssets,
            [key]: [...existing, ...newFiles],
          },
        };
      });
    }
  };

  const handleRemoveSingleFile = async (key: string, id: string) => {
    try {
      const { deleteFileFromDB } = await import('../utils/db');
      await deleteFileFromDB(key, id);
      
      setAssets((prev) => {
        const existing = prev.uploadedAssets[key] || [];
        const fileToRemove = existing.find((f) => f.id === id);
        
        if (fileToRemove?.url.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.url);
        }
        
        const filteredList = existing.filter((f) => f.id !== id);
        const currentActiveIdx = prev.activeIndices?.[key] ?? 0;
        const nextActiveIdx = filteredList.length > 0 ? currentActiveIdx % filteredList.length : 0;
        
        return {
          ...prev,
          uploadedAssets: {
            ...prev.uploadedAssets,
            [key]: filteredList,
          },
          activeIndices: {
            ...prev.activeIndices,
            [key]: nextActiveIdx,
          },
        };
      });
    } catch (err) {
      console.error("Failed to clear single IndexedDB asset:", err);
    }
  };

  const handleAddCustomFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatName.trim()) return;
    
    const featId = 'custom_' + Date.now().toString(36);
    const newFeature = {
      id: featId,
      name: newFeatName.trim(),
      description: newFeatDesc.trim() || 'Custom Dynamic Interaction',
      statsBonus: {
        happiness: Number(bonusHappiness),
        energy: Number(bonusEnergy),
        cleanliness: Number(bonusClean),
        weight: Number(bonusWeight),
      }
    };

    setAssets((prev) => {
      const customFeatures = prev.customFeatures || [];
      const playModes = prev.playModes || {};
      return {
        ...prev,
        customFeatures: [...customFeatures, newFeature],
        uploadedAssets: {
          ...prev.uploadedAssets,
          [featId]: [],
        },
        activeIndices: {
          ...prev.activeIndices,
          [featId]: 0,
        },
        playModes: {
          ...playModes,
          [featId]: 'cycle',
        }
      };
    });

    setNewFeatName('');
    setNewFeatDesc('');
  };

  const handleDeleteCustomFeature = (featId: string) => {
    setAssets((prev) => {
      const filteredFeatures = (prev.customFeatures || []).filter(f => f.id !== featId);
      const updatedUploaded = { ...prev.uploadedAssets };
      delete updatedUploaded[featId];
      const updatedIndices = { ...prev.activeIndices };
      delete updatedIndices[featId];
      const updatedPlayModes = { ...prev.playModes };
      delete updatedPlayModes[featId];

      return {
        ...prev,
        customFeatures: filteredFeatures,
        uploadedAssets: updatedUploaded,
        activeIndices: updatedIndices,
        playModes: updatedPlayModes,
      };
    });
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName.trim()) return;

    const id = `food_${Date.now().toString(36)}`;
    const key = getFoodAssetKey(id);
    const food: FoodItem = {
      id,
      name: newFoodName.trim(),
      emoji: newFoodEmoji.trim() || '🍪',
      description: newFoodDescription.trim() || 'Custom snack',
      statsBonus: { happiness: 5, energy: 5, cleanliness: 0, weight: 0.1 },
    };

    setAssets((prev) => ({
      ...prev,
      foods: [...(prev.foods || []), food],
      uploadedAssets: {
        ...prev.uploadedAssets,
        [key]: [],
      },
      activeIndices: {
        ...prev.activeIndices,
        [key]: 0,
      },
      playModes: {
        ...prev.playModes,
        [key]: 'cycle',
      },
    }));

    onFoodAdded?.(id);

    setNewFoodName('');
    setNewFoodEmoji('🍪');
    setNewFoodDescription('');
  };

  const updateFood = (foodId: string, patch: Partial<FoodItem>) => {
    setAssets((prev) => ({
      ...prev,
      foods: (prev.foods || []).map((food) => (
        food.id === foodId ? { ...food, ...patch } : food
      )),
    }));
  };

  const updateFoodStats = (foodId: string, stat: keyof FoodItem['statsBonus'], value: number) => {
    setAssets((prev) => ({
      ...prev,
      foods: (prev.foods || []).map((food) =>
        food.id === foodId
          ? { ...food, statsBonus: { ...food.statsBonus, [stat]: clampActivityStat(stat, value) } }
          : food
      ),
    }));
  };

  const handleDeleteFood = (foodId: string) => {
    const key = getFoodAssetKey(foodId);
    setAssets((prev) => {
      const uploadedAssets = { ...prev.uploadedAssets };
      const activeIndices = { ...prev.activeIndices };
      const playModes = { ...prev.playModes };
      delete uploadedAssets[key];
      delete activeIndices[key];
      delete playModes[key];

      return {
        ...prev,
        foods: (prev.foods || []).filter((food) => food.id !== foodId),
        uploadedAssets,
        activeIndices,
        playModes,
      };
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedName(text);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const readBlobAsDataUrl = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadBuiltApp = async () => {
    if (!downloadUrl || !downloadFileName) return;

    setIsDownloading(true);
    setExportStatus(`Downloading ${downloadFileName}...`);

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error || 'Download failed.');
      }

      const expectedLength = response.headers.get('Content-Length');
      const blob = await response.blob();

      if (expectedLength) {
        const expected = Number.parseInt(expectedLength, 10);
        if (Number.isFinite(expected) && blob.size !== expected) {
          throw new Error(
            `Download incomplete (${Math.round(blob.size / 1024 / 1024)} MB of ${Math.round(expected / 1024 / 1024)} MB). Rebuild and try again.`,
          );
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setExportStatus(`Saved ${downloadFileName} (${Math.round(blob.size / 1024 / 1024)} MB).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed.';
      setExportStatus(`Download failed: ${message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportDesktopApp = async () => {
    setDownloadUrl(null);
    setDownloadFileName(null);
    setInstallHint(null);
    setExportStatus('Collecting uploaded images and settings...');

    try {
      const { getAllFilesFromDB } = await import('../utils/db');
      const dbFiles = await getAllFilesFromDB();
      const files = await Promise.all(
        dbFiles.map(async (file) => ({
          feature: file.feature,
          id: file.id,
          name: file.name,
          type: file.type,
          mimeType: file.blob.type || (file.type === 'video' ? 'video/mp4' : 'image/png'),
          dataUrl: await readBlobAsDataUrl(file.blob),
        })),
      );

      setExportStatus('Building your floating desktop app. This may take a few minutes...');

      const response = await fetch('http://localhost:5174/api/export-desktop-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          customizer,
          customDuration,
          assets,
          companionSettings,
          files,
          buildFor: exportTarget,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to build desktop app.');
      }

      setDownloadUrl(`http://localhost:5174${result.downloadUrl}`);
      setDownloadFileName(result.fileName);
      setInstallHint(result.installHint ?? null);
      const sizeMb = result.fileSize ? Math.round(result.fileSize / 1024 / 1024) : null;
      setExportStatus(
        sizeMb
          ? `Done. Built ${result.fileName} (${sizeMb} MB). Use the download button below — wait until it finishes.`
          : `Done. Built ${result.fileName}. Use the download button below.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown export error.';
      setExportStatus(`Export failed: ${message}`);
    }
  };

  const workspaceFileSpecs = BUILTIN_INTERACTIONS.map((f) => ({
    name: f.workspaceFile,
    desc: f.workspaceDesc,
  }));

  const uploadInputsSpec = BUILTIN_INTERACTIONS.map((f) => ({
    key: f.id,
    label: f.label,
  }));

  const dynamicSpecs = (assets.customFeatures || []).map((feat) => ({
    key: feat.id,
    label: feat.name,
    isCustom: true as const,
  }));

  const foodSpecs = (assets.foods || []).map((food) => ({
    key: getFoodAssetKey(food.id),
    label: `${food.emoji} ${food.name}`,
  }));

  const allSpecs = [...uploadInputsSpec, ...foodSpecs, ...dynamicSpecs];

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-slate-800 flex flex-col min-h-[min(72vh,880px)] transition-all duration-300">
      {/* Settings Header */}
      <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500 animate-spin-slow" />
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">Pet Customizer Engine</h2>
            <p className="text-[11px] text-slate-500 font-medium">Themes · media · foods · stat bonuses per feature</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 text-xs bg-slate-200/60 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
              activeTab === 'features' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Features
          </button>
          <button
            onClick={() => setActiveTab('visuals')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'visuals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visuals
          </button>
          <button
            onClick={() => setActiveTab('uploads')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'uploads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom Assets
          </button>
          <button
            onClick={() => setActiveTab('foods')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'foods' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Food
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'windows' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Windows App Guide
          </button>
        </div>
      </div>

      <div className="p-5 md:p-6 flex-1 overflow-y-auto space-y-6 text-sm min-h-[60vh]">
        {activeTab === 'features' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                Pet name (backdoor)
              </label>
              <input
                type="text"
                maxLength={32}
                value={petName}
                onChange={(e) => updatePetName(e.target.value)}
                placeholder="e.g. Mochi, Luna, Mr. Whiskers"
                className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-base font-bold text-slate-800"
              />
              <p className="text-[10px] text-amber-800/80">
                Shown on the status card, hover HUD, and idle bubble. Saved automatically.
              </p>
            </div>

            <p className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 leading-relaxed">
              Each action can change Happiness, Energy, Cleanliness (0–100 bars), and Weight on the scale (0.5–7.5&nbsp;kg,
              with 4&nbsp;kg in the middle: underweight → fattie boom boom). Use negative kg to slim down.
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {BUILTIN_FEATURE_UI.map((spec) => (
                <div
                  key={spec.id}
                  className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="text-2xl">{spec.emoji}</span>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{spec.name}</h3>
                      <p className="text-[10px] text-slate-500">{spec.hint}</p>
                    </div>
                  </div>
                  <StatBonusInputs
                    bonus={activityRewards[spec.id]}
                    onChange={(stat, val) => updateActivityReward(spec.id, stat, val)}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> Custom features
              </h3>
              {(assets.customFeatures || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No custom features yet — add one under Custom Assets.</p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {(assets.customFeatures || []).map((feat: CustomFeature) => (
                    <div key={feat.id} className="bg-violet-50/50 border border-violet-200 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-black text-violet-950 text-sm">{feat.name}</h4>
                          <p className="text-[10px] text-violet-700/80">{feat.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomFeature(feat.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                          title="Delete feature"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <StatBonusInputs
                        bonus={normalizeStatBonus(feat.statsBonus)}
                        onChange={(stat, val) => updateCustomFeatureStats(feat.id, stat, val)}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider">
                  Study reward / {FOCUS_REFERENCE_MINUTES}m
                </h3>
                <p className="text-[10px] text-slate-500">Scales with session length. Supports +/−.</p>
                {(['happiness', 'energy', 'cleanliness'] as const).map((key) => (
                  <label key={key} className="flex items-center justify-between gap-2 text-xs font-bold capitalize">
                    <span>{key}</span>
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={focusRewardPer25Min[key]}
                      onChange={(e) => updateFocusStat(key, parseInt(e.target.value) || 0)}
                      className="w-20 text-center bg-white border border-slate-300 rounded-lg py-1.5 font-mono text-indigo-700"
                    />
                  </label>
                ))}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider">Hourly decay</h3>
                <p className="text-[10px] text-slate-500">Points lost per hour from each bar.</p>
                {(['happiness', 'energy', 'cleanliness'] as const).map((key) => (
                  <label key={key} className="flex items-center justify-between gap-2 text-xs font-bold capitalize">
                    <span>{key}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={decayPerHour[key]}
                      onChange={(e) => updateDecay(key, parseFloat(e.target.value) || 0)}
                      className="w-20 text-center bg-white border border-slate-300 rounded-lg py-1.5 font-mono text-indigo-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visuals' && (
          <div className="space-y-5 animate-fade-in">
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Widget Theme Skin</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'pastel', name: 'Pastel Light', bg: 'bg-rose-50 border-rose-200' },
                  { id: 'dark', name: 'Cosmic Slate', bg: 'bg-slate-900 border-slate-700' },
                  { id: 'glass', name: 'Glassmorphic', bg: 'bg-indigo-50/50 border-indigo-200' },
                  { id: 'retro-win98', name: 'Windows 98', bg: 'bg-amber-50 border-amber-300' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCustomizer((prev) => ({ ...prev, theme: t.id as any }))}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${t.bg} ${
                      customizer.theme === t.id 
                        ? 'ring-2 ring-indigo-500 font-semibold scale-102 shadow-sm' 
                        : 'opacity-70 hover:opacity-100 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="text-[11px] font-medium mt-1 truncate">{t.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Widget Sizing Scale</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Compact (240px)', text: 'Tiny Screen' },
                  { id: 'medium', label: 'Regular (320px)', text: 'Balanced' },
                  { id: 'large', label: 'Comfortable (400px)', text: 'Full Detail' },
                ].map((scaleOpt) => (
                  <button
                    key={scaleOpt.id}
                    onClick={() => setCustomizer((prev) => ({ ...prev, scale: scaleOpt.id as any }))}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      customizer.scale === scaleOpt.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm font-semibold">{scaleOpt.id.toUpperCase()}</div>
                    <div className="text-[10px] opacity-85">{scaleOpt.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Widget Opacity & Window Border */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Background Opacity</label>
                  <span className="text-xs font-mono text-indigo-600 font-semibold">{Math.round(customizer.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={customizer.opacity}
                  onChange={(e) => setCustomizer((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">Makes pet window transparent on your screen</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Window Frame Border</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 max-h-10">
                  {(['none', 'thin', 'double', 'retro'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setCustomizer((prev) => ({ ...prev, borderStyle: b }))}
                      className={`flex-1 text-[11px] capitalize py-2 font-medium transition-all cursor-pointer ${
                        customizer.borderStyle === b 
                          ? 'bg-indigo-600 text-white font-semibold' 
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Ambient Sound Level
                </label>
                <span className="text-xs font-mono text-emerald-600 font-semibold">{Math.round(customizer.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={customizer.soundVolume}
                onChange={(e) => setCustomizer((prev) => ({ ...prev, soundVolume: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <hr className="border-slate-100" />

            {/* Danger Zone */}
            <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-rose-800 text-xs">Reset Pet Database</h4>
                <p className="text-[11px] text-rose-600">Clears focused minutes, streak records, and level progression.</p>
              </div>
              <button
                maxLength={4}
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to restore the pet back to puppy statistics? This clears focusing sessions!')) {
                    onResetStats();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-5 animate-fade-in text-[12px]">
            {/* Toggle switch */}
            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-indigo-900 text-xs">Load Assets from Project Directory</h4>
                <p className="text-[11px] text-indigo-700/80">Looks for files placed in public root e.g. /public/pet_idle.png</p>
              </div>
              <button
                onClick={() => setAssets((prev) => ({ ...prev, useWorkspace: !prev.useWorkspace }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  assets.useWorkspace ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    assets.useWorkspace ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Customizable Transient Action Pose Timer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs">⏱️ Pose duration</h4>
                  <p className="text-[10px] text-slate-500">Seconds for pet, groom, eat, dance, etc. before returning to idle.</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={customDuration}
                    onChange={(e) => {
                      if (setCustomDuration) {
                        setCustomDuration(Math.max(1, Math.min(600, parseInt(e.target.value) || 5)));
                      }
                    }}
                    className="w-12 text-center bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-black text-indigo-750 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-bold">secs</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={Math.min(120, customDuration)}
                  onChange={(e) => {
                    if (setCustomDuration) {
                      setCustomDuration(parseInt(e.target.value));
                    }
                  }}
                  className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex gap-1">
                  {[5, 10, 30].map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomDuration && setCustomDuration(s)}
                      className={`text-[9px] px-1.5 py-0.5 font-mono font-bold rounded border cursor-pointer ${
                        customDuration === s ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-3.5 space-y-2.5">
              <div>
                <h4 className="font-extrabold text-violet-900 text-xs">🖼️ Pose media slideshow</h4>
                <p className="text-[10px] text-violet-800/90 mt-0.5">
                  Auto-rotate through uploaded images for idle, study, groom, eat, sleep, and other poses (2+ uploads per pose).
                  Study timer keeps the pose until the timer ends. Set all to 0 to disable.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'hr', value: slideHours, setter: setSlideHours },
                  { label: 'min', value: slideMinutes, setter: setSlideMinutes },
                  { label: 'sec', value: slideSeconds, setter: setSlideSeconds },
                ].map((field) => (
                  <label key={field.label} className="text-center space-y-1">
                    <input
                      type="number"
                      min={0}
                      max={field.label === 'hr' ? 23 : 59}
                      value={field.value}
                      onChange={(e) => {
                        const max = field.label === 'hr' ? 23 : 59;
                        const v = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
                        updateSlideshowFromInputs(
                          field.label === 'hr' ? v : slideHours,
                          field.label === 'min' ? v : slideMinutes,
                          field.label === 'sec' ? v : slideSeconds
                        );
                      }}
                      className="w-full text-center bg-white border border-violet-300 rounded-lg px-2 py-2 text-sm font-black text-violet-800 font-mono"
                    />
                    <span className="text-[9px] font-bold text-violet-600 uppercase">{field.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Off', h: 0, m: 0, s: 0 },
                  { label: '2s', h: 0, m: 0, s: 2 },
                  { label: '5s', h: 0, m: 0, s: 5 },
                  { label: '30s', h: 0, m: 0, s: 30 },
                  { label: '1m', h: 0, m: 1, s: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateSlideshowFromInputs(preset.h, preset.m, preset.s)}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md border cursor-pointer ${
                      poseMediaSlideshowSeconds === preset.h * 3600 + preset.m * 60 + preset.s
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-violet-700 border-violet-200 hover:bg-violet-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-mono font-bold text-violet-700">
                {poseMediaSlideshowSeconds > 0
                  ? `Active: next image every ${formatDurationSeconds(poseMediaSlideshowSeconds)}`
                  : 'Slideshow off — images advance only when you trigger the action again'}
              </p>
            </div>

            {assets.useWorkspace ? (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                  <FolderOpen className="w-4 h-4" />
                  WORKSPACE ASSET MODE GUIDE
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Instructions:</strong> Simply open the left sidebar or file tree, go into the <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/public/</code> directory. Place your files there with these exact filenames:
                </p>

                <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 max-h-48 overflow-y-auto">
                  {workspaceFileSpecs.map((spec) => (
                    <div key={spec.name} className="flex justify-between p-1 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 items-center gap-2">
                      <span className="font-semibold text-emerald-600 select-all cursor-pointer flex items-center gap-1" onClick={() => handleCopy(spec.name)}>
                        {spec.name}
                        {copiedName === spec.name ? (
                          <span className="text-[9px] text-blue-500 font-sans font-normal">(Copied!)</span>
                        ) : (
                          <span className="text-[9px] text-slate-300 font-sans font-normal hover:text-slate-500">(Copy)</span>
                        )}
                      </span>
                      <span className="text-slate-400 text-right text-[9px] leading-tight max-w-[180px]">{spec.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. BUILD DYNAMIC NEW FEATURES FORM */}
                <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-indigo-900 text-xs uppercase tracking-wider">🛠️ Add custom action</h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Dynamic Generator</span>
                  </div>
                  <form onSubmit={handleAddCustomFeature} className="space-y-2 text-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Backflip, Sing"
                          value={newFeatName}
                          onChange={(e) => setNewFeatName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Description</label>
                        <input
                          type="text"
                          placeholder="What does it do?"
                          value={newFeatDesc}
                          onChange={(e) => setNewFeatDesc(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    <div className="bg-white/80 border border-slate-100 rounded-lg p-2">
                      <span className="text-[9px] font-extrabold text-indigo-600 uppercase block mb-2">
                        Stat adjustments when activated (+/−):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
                        {[
                          { label: 'Happy', val: bonusHappiness, set: setBonusHappiness, step: 1 },
                          { label: 'Energy', val: bonusEnergy, set: setBonusEnergy, step: 1 },
                          { label: 'Clean', val: bonusClean, set: setBonusClean, step: 1 },
                          { label: 'Weight kg', val: bonusWeight, set: setBonusWeight, step: 0.05 },
                        ].map((item) => (
                          <label key={item.label} className="space-y-0.5 font-bold text-slate-600">
                            <span className="text-[8px] uppercase">{item.label}</span>
                            <input
                              type="number"
                              step={item.step}
                              value={item.val}
                              onChange={(e) => item.set(Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-center font-mono text-xs"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow-md transition-all cursor-pointer text-center text-xs uppercase"
                    >
                      + Create Interaction Feature
                    </button>
                  </form>

                  {/* Registered Custom Features Deletion Manager */}
                  {assets.customFeatures && assets.customFeatures.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-indigo-150/50 space-y-2">
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase block">Registered Custom Interaction Poses:</span>
                      <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                        {assets.customFeatures.map((feat) => (
                          <div key={feat.id} className="flex justify-between items-center bg-white/85 p-2 rounded-lg border border-indigo-100 text-xs font-semibold gap-2 shadow-sm">
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-[11px] text-slate-800 font-bold truncate flex items-center gap-1">
                                <span>🎮</span> {feat.name}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate" title={feat.description}>
                                {feat.description}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the custom feature "${feat.name}" and all of its uploaded files?`)) {
                                  handleDeleteCustomFeature(feat.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg text-rose-600 transition-colors cursor-pointer shrink-0"
                              title="Delete Feature"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. UPLOADS GRID WITH LOCAL PLAY MODES IN CARDS */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                    <Upload className="w-4 h-4" />
                    Upload Assets per Action (RAM-saving browser sandbox)
                  </div>
                  <p className="text-slate-500 text-[11px] leading-tight mb-2">
                    Drag & drop or select custom pictures and videos. Each upload action has its own dedicated sequentially cycle / random pick mode rule:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {allSpecs.map((spec) => {
                      const list = assets.uploadedAssets[spec.key] || [];
                      const mode = assets.playModes?.[spec.key] || 'cycle';
                      return (
                        <div key={spec.key} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between min-h-[165px] relative">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-extrabold text-slate-800 block text-[10px] leading-snug shrink truncate max-w-[120px]" title={spec.label}>
                                {spec.label}
                              </span>
                              {'isCustom' in spec && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove custom interaction "${spec.label}" and all uploaded file references?`)) {
                                      handleDeleteCustomFeature(spec.key);
                                    }
                                  }}
                                  className="text-[8px] text-rose-500 hover:text-rose-700 font-black p-0.5 px-1 bg-rose-50 border border-rose-100 rounded cursor-pointer shrink-0 leading-none"
                                  title="Remove action"
                                >
                                  Delete Action
                                </button>
                              )}
                            </div>

                            {/* Multiple files selection rule inside specific upload button container */}
                            <div className="mt-1 flex items-center justify-between bg-slate-200/40 border border-slate-200 rounded p-1 text-[8px]">
                              <span className="text-slate-500 font-bold uppercase tracking-wider">Multi Mode:</span>
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => setAssets(prev => {
                                    const nextPlayModes = { ...(prev.playModes || {}), [spec.key]: 'cycle' };
                                    return { ...prev, playModes: nextPlayModes };
                                  })}
                                  className={`px-1 rounded-sm font-semibold transition-all cursor-pointer ${
                                    mode === 'cycle' ? 'bg-indigo-600 text-white font-extrabold' : 'text-slate-600 bg-white border border-slate-200'
                                  }`}
                                  title="Cycle sequentially when triggered"
                                >
                                  Sequence 🔄
                                </button>
                                <button
                                  onClick={() => setAssets(prev => {
                                    const nextPlayModes = { ...(prev.playModes || {}), [spec.key]: 'random' };
                                    return { ...prev, playModes: nextPlayModes };
                                  })}
                                  className={`px-1 rounded-sm font-semibold transition-all cursor-pointer ${
                                    mode === 'random' ? 'bg-indigo-600 text-white font-extrabold' : 'text-slate-600 bg-white border border-slate-200'
                                  }`}
                                  title="Pick random asset when triggered"
                                >
                                  Random 🔀
                                </button>
                              </div>
                            </div>
                            
                            <div className="mt-2 space-y-1 max-h-[75px] overflow-y-auto pr-0.5">
                              {list.length === 0 ? (
                                <span className="text-[9px] text-slate-400 block italic leading-none mt-1">Default built-in art active</span>
                              ) : (
                                list.map((file) => (
                                  <div key={file.id} className="flex justify-between items-center text-[9px] bg-white border border-slate-200 rounded px-1.5 py-1 gap-1 shadow-sm leading-none">
                                    <span className="text-slate-500 shrink-0 text-[10px]">
                                      {file.type === 'video' ? '📹' : '🖼️'}
                                    </span>
                                    <span className="text-slate-650 truncate flex-1 font-semibold" title={file.name}>
                                      {file.name}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveSingleFile(spec.key, file.id)}
                                      className="text-[8px] font-black text-rose-500 hover:text-rose-700 shrink-0 hover:scale-105"
                                      title="Delete file"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="mt-2 pt-1 border-t border-slate-200/65">
                            <label className="w-full text-center text-[10px] py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                              <Upload className="w-2.5 h-2.5" /> Direct Upload File(s)
                              <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileUpload(spec.key, e)}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'foods' && (
          <div className="space-y-5 animate-fade-in text-[12px]">
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 space-y-3">
              <h4 className="font-black text-amber-900 text-xs uppercase tracking-wider">Customize Food Tray</h4>
              <p className="text-[11px] text-slate-600">
                Each food appears as a draggable emoji in the widget. Upload media for a food to play that specific image or video when it is dropped onto the cat.
              </p>
              <form onSubmit={handleAddFood} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Emoji</label>
                  <input
                    value={newFoodEmoji}
                    onChange={(e) => setNewFoodEmoji(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Food Name</label>
                  <input
                    required
                    value={newFoodName}
                    onChange={(e) => setNewFoodName(e.target.value)}
                    placeholder="e.g. Tuna Bites"
                    className="w-full bg-white border border-amber-200 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Description</label>
                  <input
                    value={newFoodDescription}
                    onChange={(e) => setNewFoodDescription(e.target.value)}
                    placeholder="Short tray hint"
                    className="w-full bg-white border border-amber-200 rounded px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="col-span-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-lg shadow-sm transition-all cursor-pointer text-xs"
                >
                  Add Food
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(assets.foods || []).map((food) => {
                const key = getFoodAssetKey(food.id);
                const media = assets.uploadedAssets[key] || [];
                return (
                  <div key={food.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={food.emoji}
                        onChange={(e) => updateFood(food.id, { emoji: e.target.value })}
                        className="col-span-1 bg-white border border-slate-200 rounded px-2 py-1 text-center text-sm"
                      />
                      <input
                        value={food.name}
                        onChange={(e) => updateFood(food.id, { name: e.target.value })}
                        className="col-span-3 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold"
                      />
                      <input
                        value={food.description}
                        onChange={(e) => updateFood(food.id, { description: e.target.value })}
                        className="col-span-5 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                      />
                      <label className="col-span-2 text-center text-[10px] py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                        <Upload className="w-2.5 h-2.5" /> Upload Media
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(key, e)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete food "${food.name}" and its media references?`)) {
                            handleDeleteFood(food.id);
                          }
                        }}
                        className="col-span-1 p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 transition-colors cursor-pointer"
                        title="Delete food"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-amber-800 uppercase">Feed stat deltas (+/−)</span>
                      <StatBonusInputs
                        bonus={normalizeStatBonus(food.statsBonus)}
                        onChange={(stat, val) => updateFoodStats(food.id, stat, val)}
                        compact
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[9px]">
                      {media.length === 0 ? (
                        <span className="text-slate-400 italic">No custom media yet. This food uses the default eating pose.</span>
                      ) : (
                        media.map((file) => (
                          <span key={file.id} className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500 font-semibold">
                            {file.type === 'video' ? '📹' : '🖼️'} {file.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'windows' && (
          <div className="space-y-4 animate-fade-in text-[12px]">
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100/80 space-y-3">
              <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-600" />
                DOWNLOAD AS FLOATING DESKTOP WIDGET
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Bundles your current uploaded images, play modes, stats, and visual settings into an Electron desktop widget app. Keep the local export server running with <code className="bg-white px-1 py-0.5 rounded font-mono">npm run dev:export</code>.
              </p>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                Build installer for
              </label>
              <select
                value={exportTarget}
                onChange={(e) => setExportTarget(e.target.value as 'auto' | 'win32' | 'darwin')}
                className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[11px] text-slate-800"
              >
                <option value="auto">This computer (recommended)</option>
                <option value="win32">Windows 64-bit (.exe)</option>
                <option value="darwin">macOS Apple Silicon (.dmg)</option>
              </select>
              <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2 leading-relaxed">
                Windows users need a file ending in <strong>Portable.exe</strong> or <strong>Setup.exe</strong> — not a Mac .dmg or .zip. If the installer says integrity check failed, the download was incomplete: rebuild, download again, and wait for the full file size shown above.
              </p>
              <button
                type="button"
                onClick={handleExportDesktopApp}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-center text-xs uppercase"
              >
                Build Downloadable Widget App
              </button>
              {exportStatus && (
                <div className="text-[10px] text-slate-600 bg-white/80 border border-indigo-100 rounded-lg p-2 font-medium">
                  {exportStatus}
                </div>
              )}
              {downloadUrl && downloadFileName && (
                <button
                  type="button"
                  onClick={handleDownloadBuiltApp}
                  disabled={isDownloading}
                  className="block w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md transition-all text-center text-xs uppercase cursor-pointer"
                >
                  {isDownloading ? 'Downloading…' : `Download ${downloadFileName}`}
                </button>
              )}
              {installHint && (
                <p className="text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg p-2 leading-relaxed">
                  {installHint}
                </p>
              )}
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100/80 space-y-2">
              <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-600" />
                DESKTOP APP NOTES
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Choose <strong>Windows 64-bit</strong> when sharing with a PC. Mac exports produce <strong>DesktopPetCompanion-*-Portable.exe</strong> only (no NSIS Setup on Mac). For a Setup installer, build on Windows with <code className="bg-white px-1 py-0.5 rounded font-mono">npm run desktop:dist:win:setup</code>.
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                On Windows, run <strong>DesktopPetCompanion-*-Portable.exe</strong> for a single-file app, or <strong>*-Setup.exe</strong> to install. Do not unzip a Mac build or run partial downloads — that causes “searching for Desktop Pet Companion.exe” and NSIS integrity errors.
              </p>
            </div>

            <div className="space-y-1.5 text-slate-700 list-decimal pl-1">
              <div className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-all">
                <div className="font-bold text-slate-800 text-[11px]">1. Upload and configure</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Use the Custom Assets and Visuals tabs to set the pet images, play mode, theme, and size.</div>
              </div>

              <div className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-all animate-delay-1">
                <div className="font-bold text-slate-800 text-[11px]">2. Build the desktop app</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Click the build button above. The local export server writes a bundled seed file and packaged assets before running Electron Builder.</div>
              </div>

              <div className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-all animate-delay-2">
                <div className="font-bold text-slate-800 text-[11px]">3. Install and run</div>
                <div className="text-[10px] text-slate-500 mt-0.5">The generated app starts directly in transparent floating widget mode with your bundled images and interactions.</div>
              </div>
            </div>

            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-[11px] text-blue-700">
              💡 <strong>Note:</strong> The downloadable app includes Electron, so it is much larger than the web preview but works as a real floating desktop window.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
