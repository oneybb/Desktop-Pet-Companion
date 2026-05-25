/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PetState, CustomAssets, WidgetCustomizer, PetStats, ActivityRewards } from '../types';
import { DEFAULT_FOODS, getFoodAssetKey } from '../defaults';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Sparkles, 
  Music, 
  Moon, 
  Utensils, 
  Compass, 
  Eye, 
  X, 
  Clock, 
  CheckCircle2,
  Trash2,
  Lock,
  RefreshCw
} from 'lucide-react';

// Import our beautiful custom generated green-eyed tabby cat images
import petIdleImg from '../assets/images/cat_tabby_resting_exact_1779631001778.png';
import petStudyImg from '../assets/images/cat_tabby_study_1779630212670.png';
import petDanceImg from '../assets/images/cat_tabby_dance_1779630251008.png';
import petEatImg from '../assets/images/cat_tabby_eat_1779630231804.png';
import TransparentCatImage from './TransparentCatImage';
import StatChangeFlash from './StatChangeFlash';
import { useStatFlash } from '../hooks/useStatFlash';
import { isDisplayableMediaUrl } from '../utils/mediaUrl';
import {
  formatStatScore,
  formatDurationSeconds,
  durationToSeconds,
  applyActivityStatBonus,
  normalizeStatBonus,
} from '../utils/companionSettings';
import WeightScaleBar from './WeightScaleBar';

interface PetWidgetProps {
  currentInteractState: PetState;
  setInteractState: (state: PetState, durationMs?: number) => void;
  assets: CustomAssets;
  setAssets?: React.Dispatch<React.SetStateAction<CustomAssets>>;
  customizer: WidgetCustomizer;
  laserMode: boolean;
  setLaserMode: (val: boolean) => void;
  onLoveIncrease: (amt: number) => void;
  stats: PetStats;
  setStats: React.Dispatch<React.SetStateAction<PetStats>>;
  compactMode?: boolean;
  customDuration?: number;
  onFocusComplete?: (minutes: number) => void;
  sleepActive?: boolean;
  sleepRemaining?: number;
  onStartSleep?: (totalSeconds: number) => void;
  onWakeUp?: () => void;
  onReturnToIdle?: () => void;
  idleResetKey?: number;
  activityRewards?: ActivityRewards;
  petName?: string;
  poseMediaSlideshowSeconds?: number;
  snackInventory?: Record<string, number>;
  onConsumeSnack?: (foodId: string) => boolean;
}

export default function PetWidget({
  currentInteractState,
  setInteractState,
  assets,
  setAssets,
  customizer,
  laserMode,
  setLaserMode,
  onLoveIncrease,
  stats,
  setStats,
  compactMode = false,
  customDuration = 5,
  onFocusComplete,
  sleepActive = false,
  sleepRemaining = 0,
  onStartSleep,
  onWakeUp,
  onReturnToIdle,
  idleResetKey = 0,
  activityRewards,
  petName = 'Tabby',
  poseMediaSlideshowSeconds = 0,
  snackInventory = {},
  onConsumeSnack,
}: PetWidgetProps) {
  // Popup interaction state
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  const [feedDrawerOpen, setFeedDrawerOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [draggingFoodId, setDraggingFoodId] = useState<string | null>(null);
  const [compactFeedMode, setCompactFeedMode] = useState(false);
  const [customMediaError, setCustomMediaError] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showFocusSetup, setShowFocusSetup] = useState(false);
  const [showSleepSetup, setShowSleepSetup] = useState(false);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const [sleepSeconds, setSleepSeconds] = useState(0);
  const [focusHours, setFocusHours] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [focusRemaining, setFocusRemaining] = useState(0);
  const [focusActive, setFocusActive] = useState(false);
  const focusTimerRef = useRef<any>(null);
  const [widgetSize, setWidgetSize] = useState(() => {
    const saved = localStorage.getItem('desktop_pet_widget_size_px');
    if (saved) return Math.max(180, Math.min(560, parseInt(saved) || 280));
    if (customizer.scale === 'small') return 220;
    if (customizer.scale === 'large') return 380;
    return 300;
  });
  const [interactionSize, setInteractionSize] = useState(() => {
    const saved = localStorage.getItem('desktop_pet_interaction_size');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          width: Math.max(260, Math.min(560, Number(parsed.width) || 340)),
          height: Math.max(280, Math.min(620, Number(parsed.height) || 420)),
        };
      } catch {}
    }
    return { width: 340, height: 420 };
  });

  const interactionShellClass =
    'electron-no-drag absolute z-40 flex flex-col overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(76,29,149,0.45)] ring-1 ring-white/15 bg-gradient-to-br from-violet-950/98 via-slate-900/97 to-indigo-950/98 backdrop-blur-xl text-slate-100';

  const statsPanelWidth = Math.min(200, Math.max(118, Math.round(widgetSize * 0.56)));
  const statsBarHeight = Math.max(4, Math.round(widgetSize * 0.012));

  const actionTileClass = (tone: string) =>
    `flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-2xl border transition-all cursor-pointer disabled:opacity-35 disabled:pointer-events-none hover:brightness-110 active:scale-[0.97] ${tone}`;

  // Hover state for showing stats HUD overlay
  const [isHovered, setIsHovered] = useState(false);
  const [showWidgetChrome, setShowWidgetChrome] = useState(false);
  const [isWidgetResizing, setIsWidgetResizing] = useState(false);
  const widgetChromeVisible = showWidgetChrome || isWidgetResizing;

  // Laser Chase States
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [petPos, setPetPos] = useState({ x: 0, y: 0 });
  const [petAngle, setPetAngle] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const widgetResizeRef = useRef<{ startX: number; startSize: number } | null>(null);
  const interactionResizeRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null);
  const statFlash = useStatFlash(stats);

  useEffect(() => {
    setCustomMediaError(false);
  }, [currentInteractState, assets.uploadedAssets]);

  type AssetDetails = { type: 'image' | 'video'; url: string; fromUpload: boolean };

  const getAssetDetails = (): AssetDetails => {
    const resolveUploaded = (featKey: string): AssetDetails | null => {
      const list = (assets.uploadedAssets[featKey] || []).filter((file) =>
        isDisplayableMediaUrl(file.url)
      );
      if (list.length > 0) {
        const activeIdx = (assets.activeIndices?.[featKey] ?? 0) % list.length;
        const file = list[activeIdx];
        if (file?.url) {
          return { type: file.type, url: file.url, fromUpload: true };
        }
      }
      return null;
    };

    if (String(currentInteractState).startsWith('food:')) {
      const uploaded = resolveUploaded(currentInteractState);
      if (uploaded) {
        return uploaded;
      }
      return { type: 'image', url: petEatImg, fromUpload: false };
    }

    if (currentInteractState === 'laser') {
      const uploaded = resolveUploaded('laser');
      if (uploaded) {
        return uploaded;
      }
      return { type: 'image', url: petIdleImg, fromUpload: false };
    }

    // If workspace is active, use static paths
    if (assets.useWorkspace) {
      if (currentInteractState === 'petting' && assets.workspacePaths.videoPetting) {
        return { type: 'video', url: assets.workspacePaths.videoPetting, fromUpload: false };
      }
      if (currentInteractState === 'licking' && assets.workspacePaths.videoLicking) {
        return { type: 'video', url: assets.workspacePaths.videoLicking, fromUpload: false };
      }
      if (currentInteractState === 'eating' && assets.workspacePaths.videoEating) {
        return { type: 'video', url: assets.workspacePaths.videoEating, fromUpload: false };
      }
      if (currentInteractState === 'dancing' && assets.workspacePaths.videoDancing) {
        return { type: 'video', url: assets.workspacePaths.videoDancing, fromUpload: false };
      }

      if (currentInteractState === 'studying') {
        return { type: 'image', url: assets.workspacePaths.studying || petStudyImg, fromUpload: false };
      }
      if (currentInteractState === 'sleep' || currentInteractState === 'rest') {
        const sleepUploaded = resolveUploaded('sleep');
        if (sleepUploaded && currentInteractState === 'sleep') return sleepUploaded;
        return { type: 'image', url: assets.workspacePaths.rest || petIdleImg, fromUpload: false };
      }
      if (currentInteractState === 'focusReward') {
        return { type: 'image', url: assets.workspacePaths.focusReward || petStudyImg, fromUpload: false };
      }
      if (currentInteractState === 'eating') {
        return { type: 'image', url: assets.workspacePaths.eating || petEatImg, fromUpload: false };
      }
      if (currentInteractState === 'dancing') {
        return { type: 'image', url: assets.workspacePaths.dancing || petDanceImg, fromUpload: false };
      }
      return { type: 'image', url: assets.workspacePaths.idle || petIdleImg, fromUpload: false };
    }

    // Direct Browser Upload Model with loop/cycle capabilities
    const featKey = currentInteractState || 'idle';
    const uploaded = resolveUploaded(featKey);
    if (uploaded) {
      return uploaded;
    }

    // Default static image fallback files if direct array is empty
    if (currentInteractState === 'sleep') {
      const sleepUploaded = resolveUploaded('sleep');
      if (sleepUploaded) return sleepUploaded;
      const restUploaded = resolveUploaded('rest');
      if (restUploaded) return restUploaded;
      return { type: 'image', url: petIdleImg, fromUpload: false };
    }
    if (currentInteractState === 'studying') return { type: 'image', url: petStudyImg, fromUpload: false };
    if (currentInteractState === 'focusReward') return { type: 'image', url: petStudyImg, fromUpload: false };
    if (currentInteractState === 'eating') return { type: 'image', url: petEatImg, fromUpload: false };
    if (currentInteractState === 'dancing') return { type: 'image', url: petDanceImg, fromUpload: false };
    
    // For petting or licking, if no custom upload exists, fallback to idle or standard wiggle effect
    return { type: 'image', url: petIdleImg, fromUpload: false };
  };

  const asset = getAssetDetails();

  const featKey = currentInteractState || 'idle';
  const list = (assets.uploadedAssets[featKey] || []).filter((file) => isDisplayableMediaUrl(file.url));
  const activeIdx = (assets.activeIndices?.[featKey] ?? 0) % (list.length || 1);
  const showCustomMedia = asset.fromUpload && isDisplayableMediaUrl(asset.url) && !customMediaError;

  const cycleActiveIndex = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!setAssets) return;
    setAssets((prev) => {
      const currentIndices = prev.activeIndices || {};
      const keyFiles = prev.uploadedAssets[featKey] || [];
      const currentIdxValue = currentIndices[featKey] ?? 0;
      const nextIdx = keyFiles.length > 0 ? (currentIdxValue + 1) % keyFiles.length : 0;
      return {
        ...prev,
        activeIndices: {
          ...currentIndices,
          [featKey]: nextIdx,
        },
      };
    });
  };

  // Laser follow loop
  useEffect(() => {
    if (!laserPos || !laserMode) return;

    let animFrame: number;
    const followLaser = () => {
      setPetPos((prev) => {
        const dx = laserPos.x - (prev.x + 100);
        const dy = laserPos.y - (prev.y + 110);
        const distance = Math.sqrt(dx * dx + dy * dy);

        const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        setPetAngle(targetAngle * 0.12);

        if (distance < 15) {
          setLaserPos(null);
          setPetAngle(0);
          
          const newHeart = { id: Date.now(), x: prev.x + 100, y: prev.y + 100 };
          setHearts((ph) => [...ph, newHeart]);
          setTimeout(() => {
            setHearts((ph) => ph.filter((h) => h.id !== newHeart.id));
          }, 2000);

          onLoveIncrease(5);
          return prev;
        }

        const step = Math.min(distance, 4.2);
        return {
          x: prev.x + (dx / distance) * step,
          y: prev.y + (dy / distance) * step,
        };
      });

      animFrame = requestAnimationFrame(followLaser);
    };

    animFrame = requestAnimationFrame(followLaser);
    return () => cancelAnimationFrame(animFrame);
  }, [laserPos, laserMode]);

  useEffect(() => {
    if (!laserMode) {
      setLaserPos(null);
      setPetPos({ x: 0, y: 0 });
      setPetAngle(0);
    }
  }, [laserMode]);

  useEffect(() => {
    localStorage.setItem('desktop_pet_widget_size_px', String(widgetSize));
  }, [widgetSize]);

  useEffect(() => {
    localStorage.setItem('desktop_pet_interaction_size', JSON.stringify(interactionSize));
  }, [interactionSize]);

  useEffect(() => {
    if (!focusActive || focusRemaining <= 0) {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
      return;
    }

    focusTimerRef.current = setInterval(() => {
      setFocusRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(focusTimerRef.current);
          setFocusActive(false);
          setShowFocusSetup(false);
          if (!sleepActive) {
            setInteractState('idle');
          }
          onFocusComplete?.(Math.max(1, Math.ceil((focusHours * 3600 + focusMinutes * 60 + focusSeconds) / 60)));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(focusTimerRef.current);
  }, [focusActive, focusRemaining, focusHours, focusMinutes, focusSeconds, onFocusComplete]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laserMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    setLaserPos({ x: clickX, y: clickY });

    const newSpark = { id: Date.now(), x: clickX, y: clickY };
    setSparks((prev) => [...prev, newSpark]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
    }, 1200);

    onLoveIncrease(2);
  };

  // Click on the pet opens active radial popup options bubble
  const handlePetGroomClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (laserMode) return;

    // Toggle circular interactive popup overlay options!
    setShowOptionsPopup((prev) => !prev);

    // Give subtle affection hit
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    const newH = { id: Date.now(), x: touchX + 40, y: touchY + 40 };
    setHearts((prev) => [...prev, newH]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newH.id));
    }, 1200);

    onLoveIncrease(1);
  };

  const handleFeed = (foodId: string) => {
    if (onConsumeSnack && !onConsumeSnack(foodId)) return;
    const food = (assets.foods || DEFAULT_FOODS).find((item) => item.id === foodId) || DEFAULT_FOODS[0];
    const foodKey = getFoodAssetKey(food.id);
    handleAction(foodKey, food.statsBonus, 'eat');
    setSelectedFoodId(null);
    setDraggingFoodId(null);
    setFeedDrawerOpen(false);
    setCompactFeedMode(false);
  };

  const beginFeedDragMode = (foodId: string) => {
    setSelectedFoodId(foodId);
    setShowOptionsPopup(false);
    setFeedDrawerOpen(false);
    setCompactFeedMode(true);
  };

  const exitFeedDragMode = () => {
    setCompactFeedMode(false);
    setSelectedFoodId(null);
    setDraggingFoodId(null);
  };

  const renderFoodDragItem = (food: (typeof DEFAULT_FOODS)[0], large = false) => {
    const foodKey = getFoodAssetKey(food.id);
    const mediaCount = (assets.uploadedAssets[foodKey] || []).filter((f) => isDisplayableMediaUrl(f.url)).length;
    const isSelected = selectedFoodId === food.id;
    const stock = snackInventory[food.id] ?? 0;
    const outOfStock = onConsumeSnack !== undefined && stock < 1;
    return (
      <div
        key={food.id}
        draggable={!outOfStock}
        onDragStart={(e) => {
          if (outOfStock) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('text/plain', food.id);
          e.dataTransfer.setData('application/x-desktop-pet-food', food.id);
          e.dataTransfer.effectAllowed = 'copy';
          setDraggingFoodId(food.id);
          setSelectedFoodId(food.id);
        }}
        onDragEnd={() => setDraggingFoodId(null)}
        onClick={() => !outOfStock && beginFeedDragMode(food.id)}
        className={`flex flex-col items-center justify-center rounded-xl text-slate-200 transition-all text-center select-none border ${
          large ? 'p-3 min-w-[72px]' : 'p-1.5 min-w-[56px]'
        } ${
          outOfStock
            ? 'opacity-40 cursor-not-allowed bg-slate-900/50 border-slate-700'
            : isSelected
              ? 'bg-amber-500/90 border-amber-300 text-white shadow-lg scale-105 cursor-grab active:cursor-grabbing'
              : mediaCount > 0
                ? 'bg-emerald-900/70 border-emerald-500/60 hover:border-amber-300 cursor-grab active:cursor-grabbing'
                : 'bg-slate-800/80 border-slate-600 hover:border-amber-400/60 cursor-grab active:cursor-grabbing'
        }`}
        title={`${food.name} — ${outOfStock ? 'out of stock' : 'drag onto the cat'}${mediaCount > 0 ? ` (${mediaCount} custom media)` : ''}`}
      >
        <span className={large ? 'text-3xl' : 'text-xl'}>{food.emoji}</span>
        <span className={`text-[7px] font-black mt-0.5 ${stock < 2 ? 'text-rose-400' : 'text-amber-300'}`}>
          ×{stock}
        </span>
        {!large && (
          <span className="text-[7px] font-bold truncate max-w-[52px]">{food.name}</span>
        )}
      </div>
    );
  };

  const startFocusTimer = () => {
    const totalSeconds = Math.max(1, Math.min(24 * 3600, focusHours * 3600 + focusMinutes * 60 + focusSeconds));
    setFocusHours(Math.floor(totalSeconds / 3600));
    setFocusMinutes(Math.floor((totalSeconds % 3600) / 60));
    setFocusSeconds(totalSeconds % 60);
    onWakeUp?.();
    setFocusRemaining(totalSeconds);
    setFocusActive(true);
    setShowFocusSetup(false);
    setShowOptionsPopup(false);
    setShowSleepSetup(false);
    setLaserMode(false);
    setInteractState('studying');
  };

  const stopFocusTimer = () => {
    setFocusActive(false);
    setFocusRemaining(0);
    if (!sleepActive) {
      setInteractState('idle');
    }
  };

  const startSleepTimer = () => {
    const totalSeconds = durationToSeconds(sleepHours, sleepMinutes, sleepSeconds);
    setSleepHours(Math.floor(totalSeconds / 3600));
    setSleepMinutes(Math.floor((totalSeconds % 3600) / 60));
    setSleepSeconds(totalSeconds % 60);
    setLaserMode(false);
    stopFocusTimer();
    onStartSleep?.(totalSeconds);
    setShowSleepSetup(false);
    setShowOptionsPopup(false);
  };

  const isActivityBusy =
    sleepActive ||
    focusActive ||
    laserMode ||
    (currentInteractState !== 'idle' && currentInteractState !== 'laser');

  useEffect(() => {
    if (idleResetKey < 1) return;
    setFocusActive(false);
    setFocusRemaining(0);
    setShowOptionsPopup(false);
    setShowFocusSetup(false);
    setShowSleepSetup(false);
    setFeedDrawerOpen(false);
  }, [idleResetKey]);

  const formatFocusTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const beginWidgetResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    widgetResizeRef.current = { startX: event.clientX, startSize: widgetSize };
    setIsWidgetResizing(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!widgetResizeRef.current) return;
      const nextSize = widgetResizeRef.current.startSize + (moveEvent.clientX - widgetResizeRef.current.startX);
      setWidgetSize(Math.max(180, Math.min(560, nextSize)));
    };

    const onPointerUp = () => {
      widgetResizeRef.current = null;
      setIsWidgetResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const beginInteractionResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    interactionResizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      width: interactionSize.width,
      height: interactionSize.height,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!interactionResizeRef.current) return;
      setInteractionSize({
        width: Math.max(260, Math.min(560, interactionResizeRef.current.width + (moveEvent.clientX - interactionResizeRef.current.startX))),
        height: Math.max(280, Math.min(620, interactionResizeRef.current.height + (moveEvent.clientY - interactionResizeRef.current.startY))),
      });
    };

    const onPointerUp = () => {
      interactionResizeRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Embedded popup activities callbacks
  const handleAction = (activeType: PetState, statsBonus?: Partial<PetStats>, _actionLabel?: string) => {
    setShowOptionsPopup(false);
    const turningLaserOn = activeType === 'laser' && !laserMode;
    setLaserMode(activeType === 'laser');

    if (activityRewards) {
      if (activeType === 'petting') applyActivityStatBonus(activityRewards.petting, setStats);
      else if (activeType === 'licking') applyActivityStatBonus(activityRewards.licking, setStats);
      else if (activeType === 'dancing') applyActivityStatBonus(activityRewards.dancing, setStats);
      else if (turningLaserOn) applyActivityStatBonus(activityRewards.laser, setStats);
      else if (statsBonus && Object.keys(statsBonus).length > 0) {
        applyActivityStatBonus(statsBonus as import('../types').ActivityStatBonus, setStats);
      }
    } else if (statsBonus) {
      applyActivityStatBonus(normalizeStatBonus(statsBonus as import('../types').ActivityStatBonus), setStats);
    }

    if (sleepActive) return;

    // Trigger animation states
    if (activeType !== 'idle' && activeType !== 'laser') {
      setInteractState(activeType, customDuration * 1000);
    } else {
      setInteractState(activeType);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-1 relative select-none overflow-visible">
      
      {/* Floating status bubble indicating state */}
      {!compactMode && (
        <div className="absolute top-2 z-10 select-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentInteractState}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="bg-slate-900/90 text-[10px] text-indigo-300 font-bold border border-slate-800 px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {currentInteractState === 'idle' && `${petName} — Cozy 🐾`}
              {currentInteractState === 'petting' && 'Pet ❤'}
              {currentInteractState === 'licking' && 'Groom ✨'}
              {(currentInteractState === 'eating' || String(currentInteractState).startsWith('food:')) && 'Eat 🍕'}
              {currentInteractState === 'dancing' && 'Dance 🎵'}
              {currentInteractState === 'studying' && 'Study 📚'}
              {currentInteractState === 'sleep' && `Sleep ${formatDurationSeconds(sleepRemaining)}`}
              {currentInteractState === 'laser' && 'Laser 🔴'}
              {currentInteractState === 'focusReward' && 'Celebrate 🏆'}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* CORE FRAMELESS PET CONTAINER - No bounding square box! */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseEnter={() => setShowWidgetChrome(true)}
        onMouseLeave={() => {
          if (!widgetResizeRef.current) setShowWidgetChrome(false);
        }}
        className="electron-no-drag relative flex flex-col items-center justify-center transition-all duration-300 select-none cursor-default bg-transparent overflow-visible"
        style={{ width: widgetSize, height: widgetSize }}
      >
        <StatChangeFlash
          stats={stats}
          flashing={statFlash}
          petName={petName}
          side={compactMode ? 'right' : 'left'}
          placement={compactMode ? 'inset-bottom' : 'side'}
          maxWidth={statsPanelWidth}
        />
        <div
          className={`electron-drag-region absolute top-1 left-1 z-[70] bg-slate-950/70 text-white/80 border border-slate-700/60 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm cursor-move transition-opacity duration-200 ${
            widgetChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          Drag
        </div>
        <button
          type="button"
          onPointerDown={beginWidgetResize}
          onClick={(e) => e.stopPropagation()}
          className={`widget-resize-handle absolute bottom-1 right-1 z-[70] bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-300/40 rounded-full w-7 h-7 text-[13px] font-black shadow-lg cursor-nwse-resize transition-opacity duration-200 ${
            widgetChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="Drag to resize widget"
        >
          ↘
        </button>
        <div
          className={`absolute bottom-2 left-1 z-[70] bg-slate-950/60 text-white/70 border border-slate-700/50 rounded-full px-2 py-0.5 text-[8px] font-bold pointer-events-none transition-opacity duration-200 ${
            widgetChromeVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {Math.round(widgetSize)}px
        </div>
        
        {/* Dynamic laser pointer laserDot */}
        {laserMode && laserPos && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: laserPos.x - 6, top: laserPos.y - 6 }}
          >
            <span className="absolute w-3.5 h-3.5 bg-red-600 rounded-full animate-ping opacity-90" />
            <span className="absolute w-3 h-3 bg-red-500 rounded-full border border-white" />
          </div>
        )}

        {/* Floating Heart Particles */}
        {hearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 1, scale: 0.5, y: h.y }}
            animate={{ opacity: 0, scale: 1.5, y: h.y - 80 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute text-rose-500 fill-rose-500 pointer-events-none z-30"
            style={{ left: h.x - 10 }}
          >
            <Heart className="w-5 h-5 fill-current" />
          </motion.div>
        ))}

        {sparks.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 1, scale: 0.5, x: s.x, y: s.y }}
            animate={{ opacity: 0, scale: 1.6, y: s.y - 40, rotate: 90 }}
            transition={{ duration: 0.8 }}
            className="absolute text-yellow-400 pointer-events-none z-30"
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        ))}

        {/* Meow menu — opens on pet click */}
        <AnimatePresence>
          {showOptionsPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 8 }}
              className={interactionShellClass}
              style={{
                width: Math.min(interactionSize.width, widgetSize + 48),
                height: Math.min(interactionSize.height, widgetSize + 80),
                left: `calc(50% - ${Math.min(interactionSize.width, widgetSize + 48) / 2}px)`,
                top: `calc(50% - ${Math.min(interactionSize.height, widgetSize + 80) / 2}px)`,
                maxWidth: `min(calc(100vw - 16px), ${widgetSize + 48}px)`,
                maxHeight: `min(calc(100vh - 16px), ${widgetSize + 80}px)`,
              }}
            >
              <div className="shrink-0 px-4 pt-3 pb-2 bg-gradient-to-r from-violet-600/35 via-fuchsia-600/20 to-indigo-600/35 border-b border-white/10 rounded-t-[2rem]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black text-white/95 tracking-wide">Meowmeowo~ mew? 🐾</p>
                    <p className="text-[9px] font-bold text-violet-200/90 truncate max-w-[180px]">with {petName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFeedDrawerOpen(false);
                      setShowOptionsPopup(false);
                    }}
                    className="p-2 text-violet-100/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[8px] text-violet-200/70 mt-1 font-medium">Pick a thing · drag ↘ to stretch~</p>
              </div>

              <AnimatePresence>
                {feedDrawerOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 overflow-hidden border-b border-amber-400/35 bg-gradient-to-b from-amber-500/25 to-amber-950/40 shadow-[0_8px_24px_rgba(245,158,11,0.2)]"
                  >
                    <div className="px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-100">
                          Pick a snack
                        </p>
                        <button
                          type="button"
                          onClick={() => setFeedDrawerOpen(false)}
                          className="text-[8px] font-bold text-amber-200/80 hover:text-white px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-[8px] font-medium text-amber-200/80 text-center -mt-1">
                        Drag a treat onto {petName}
                      </p>
                      <div className="grid grid-cols-4 gap-1.5 w-full">
                        {(assets.foods || DEFAULT_FOODS).map((food) => renderFoodDragItem(food))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 min-h-0 overflow-y-auto w-full px-3 py-2.5 space-y-3 scrollbar-thin scrollbar-thumb-violet-800/60 scrollbar-track-transparent">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-2 space-y-2">
                  <p className="text-[7px] font-black uppercase tracking-widest text-rose-300/90 px-0.5">Care</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAction('petting')}
                      disabled={sleepActive}
                      className={actionTileClass('bg-rose-500/20 border-rose-400/35 text-rose-100')}
                    >
                      <Heart className="w-4 h-4 fill-rose-400/30" />
                      <span className="text-[8px] font-extrabold">Pet</span>
                    </button>
                    <button
                      onClick={() => handleAction('licking')}
                      disabled={sleepActive}
                      className={actionTileClass('bg-sky-500/20 border-sky-400/35 text-sky-100')}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[8px] font-extrabold">Groom</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-2 space-y-2">
                  <p className="text-[7px] font-black uppercase tracking-widest text-amber-300/90 px-0.5">Snacks & play</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (feedDrawerOpen) {
                          setFeedDrawerOpen(false);
                        } else {
                          setFeedDrawerOpen(true);
                          setShowSleepSetup(false);
                          setShowFocusSetup(false);
                        }
                      }}
                      disabled={sleepActive}
                      className={actionTileClass(
                        feedDrawerOpen
                          ? 'bg-amber-500/45 border-amber-300/60 text-white ring-2 ring-amber-300/40'
                          : 'bg-amber-500/18 border-amber-400/30 text-amber-100'
                      )}
                    >
                      <Utensils className="w-4 h-4" />
                      <span className="text-[8px] font-extrabold">Feed</span>
                    </button>
                    <button
                      onClick={() => handleAction('dancing')}
                      disabled={sleepActive}
                      className={actionTileClass('bg-fuchsia-500/20 border-fuchsia-400/35 text-fuchsia-100')}
                    >
                      <Music className="w-4 h-4" />
                      <span className="text-[8px] font-extrabold">Dance</span>
                    </button>
                    <button
                      onClick={() => handleAction('laser')}
                      disabled={sleepActive}
                      className={actionTileClass(
                        laserMode
                          ? 'bg-red-500/45 border-red-300/55 text-white ring-2 ring-red-400/50'
                          : 'bg-red-500/18 border-red-400/30 text-red-100'
                      )}
                    >
                      <Compass className="w-4 h-4" />
                      <span className="text-[8px] font-extrabold">Laser</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-2 space-y-2">
                  <p className="text-[7px] font-black uppercase tracking-widest text-indigo-300/90 px-0.5">Rest & focus</p>
                  <div className="grid grid-cols-2 gap-2">
                    {sleepActive ? (
                      <button
                        onClick={() => {
                          onWakeUp?.();
                          setShowOptionsPopup(false);
                        }}
                        className={actionTileClass('col-span-2 bg-amber-500/30 border-amber-300/45 text-amber-50')}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-[8px] font-extrabold">Wake up</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setFeedDrawerOpen(false);
                          setShowSleepSetup(true);
                        }}
                        disabled={focusActive}
                        className={actionTileClass('bg-slate-500/25 border-slate-400/30 text-slate-100')}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-[8px] font-extrabold">Nap</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setFeedDrawerOpen(false);
                        setShowFocusSetup(true);
                      }}
                      disabled={sleepActive}
                      className={actionTileClass('bg-indigo-500/25 border-indigo-400/35 text-indigo-100')}
                    >
                      <Clock className="w-4 h-4" />
                      <span className="text-[8px] font-extrabold">Study</span>
                    </button>
                    {(focusActive || sleepActive) && (
                      <button
                        onClick={() => {
                          if (focusActive) stopFocusTimer();
                          if (sleepActive) onWakeUp?.();
                          setShowOptionsPopup(false);
                        }}
                        className={actionTileClass('col-span-2 bg-slate-600/40 border-slate-400/35 text-slate-100')}
                      >
                        <span className="text-xs">⏹</span>
                        <span className="text-[8px] font-extrabold">Stop timer</span>
                      </button>
                    )}
                  </div>
                  {focusActive && (
                    <p className="text-center text-[9px] font-bold text-indigo-200/90 bg-indigo-500/15 rounded-xl py-1 border border-indigo-400/20">
                      Studying · {formatFocusTime(focusRemaining)}
                    </p>
                  )}
                  {sleepActive && (
                    <p className="text-center text-[9px] font-bold text-violet-200/90 bg-violet-500/15 rounded-xl py-1 border border-violet-400/20">
                      Sleeping · {formatDurationSeconds(sleepRemaining)}
                    </p>
                  )}
                </div>

                {assets?.customFeatures && assets.customFeatures.length > 0 && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-2 space-y-2">
                    <p className="text-[7px] font-black uppercase tracking-widest text-emerald-300/90 px-0.5">Custom</p>
                    <div className="grid grid-cols-2 gap-2">
                      {assets.customFeatures.map((feat) => (
                        <button
                          key={feat.id}
                          disabled={sleepActive}
                          onClick={() => {
                            const bonuses = feat.statsBonus || {};
                            handleAction(feat.id as PetState, bonuses, feat.name);
                          }}
                          className={actionTileClass('bg-emerald-500/15 border-emerald-400/25 text-emerald-100')}
                        >
                          <span className="text-sm leading-none">✨</span>
                          <span className="text-[8px] font-extrabold truncate max-w-full" title={feat.name}>
                            {feat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {isActivityBusy && onReturnToIdle && (
                <button
                  type="button"
                  onClick={() => {
                    onReturnToIdle();
                    setShowOptionsPopup(false);
                  }}
                  className="mx-3 mb-2 py-2 bg-white/10 hover:bg-white/18 border border-white/15 text-violet-100 font-bold rounded-2xl text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  Return to idle
                </button>
              )}

              <p className="text-[7px] text-violet-200/50 text-center pb-2 px-3 font-medium">Tap kitty again to close~</p>
              <button
                type="button"
                onPointerDown={beginInteractionResize}
                onClick={(e) => e.stopPropagation()}
                className="interaction-resize-handle absolute bottom-2.5 right-2.5 bg-violet-500/90 hover:bg-violet-400 text-white border border-violet-300/50 rounded-full w-7 h-7 text-[12px] font-black shadow-lg cursor-nwse-resize"
                title="Drag to resize menu"
              >
                ↘
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSleepSetup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={`${interactionShellClass} inset-2 z-50 flex flex-col items-center justify-center p-4`}
            >
              <button
                onClick={() => setShowSleepSetup(false)}
                className="absolute top-2.5 right-2.5 p-2 text-violet-100/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] uppercase font-black tracking-widest text-violet-200 mb-3">
                Nap timer
              </div>
              <div className="w-full bg-white/5 border border-white/12 rounded-2xl p-3 space-y-3 text-center">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Nap duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'hr', value: sleepHours, setter: setSleepHours, max: 23 },
                    { label: 'min', value: sleepMinutes, setter: setSleepMinutes, max: 59 },
                    { label: 'sec', value: sleepSeconds, setter: setSleepSeconds, max: 59 },
                  ].map((field) => (
                    <label key={field.label} className="space-y-1">
                      <input
                        type="number"
                        min="0"
                        max={field.max}
                        value={field.value}
                        onChange={(e) => field.setter(Math.max(0, Math.min(field.max, parseInt(e.target.value) || 0)))}
                        className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-lg font-black text-indigo-300 font-mono"
                      />
                      <span className="block text-[8px] uppercase font-black text-slate-500">{field.label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '15m', h: 0, m: 15, s: 0 },
                    { label: '30m', h: 0, m: 30, s: 0 },
                    { label: '1h', h: 1, m: 0, s: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setSleepHours(preset.h);
                        setSleepMinutes(preset.m);
                        setSleepSeconds(preset.s);
                      }}
                      className="py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startSleepTimer}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs uppercase"
                >
                  Sleep
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFocusSetup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={`${interactionShellClass} inset-2 z-50 flex flex-col items-center justify-center p-4`}
            >
              <button
                onClick={() => setShowFocusSetup(false)}
                className="absolute top-2.5 right-2.5 p-2 text-violet-100/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] uppercase font-black tracking-widest text-violet-200 mb-3">
                Study timer
              </div>
              <div className="w-full bg-white/5 border border-white/12 rounded-2xl p-3 space-y-3 text-center">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Study duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'hr', value: focusHours, setter: setFocusHours, max: 23 },
                    { label: 'min', value: focusMinutes, setter: setFocusMinutes, max: 59 },
                    { label: 'sec', value: focusSeconds, setter: setFocusSeconds, max: 59 },
                  ].map((field) => (
                    <label key={field.label} className="space-y-1">
                      <input
                        type="number"
                        min="0"
                        max={field.max}
                        value={field.value}
                        onChange={(e) => field.setter(Math.max(0, Math.min(field.max, parseInt(e.target.value) || 0)))}
                        className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-lg font-black text-indigo-300 font-mono"
                      />
                      <span className="block text-[8px] uppercase font-black text-slate-500">{field.label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '5m', h: 0, m: 5, s: 0 },
                    { label: '25m', h: 0, m: 25, s: 0 },
                    { label: '1h', h: 1, m: 0, s: 0 },
                    { label: '1h30', h: 1, m: 30, s: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setFocusHours(preset.h);
                        setFocusMinutes(preset.m);
                        setFocusSeconds(preset.s);
                      }}
                      className="py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startFocusTimer}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs uppercase"
                >
                  Start study
                </button>
                {focusActive && (
                  <button
                    onClick={stopFocusTimer}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-[10px] uppercase"
                  >
                    Stop
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOAT STATS HUD — scales with widget, stays inside window bounds */}
        <AnimatePresence>
          {isHovered && !showOptionsPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="absolute z-[55] left-1/2 -translate-x-1/2 top-1 pointer-events-none select-none flex flex-col gap-1.5 rounded-2xl bg-slate-950/94 backdrop-blur-md border border-violet-500/30 shadow-xl px-2.5 py-2"
              style={{ width: statsPanelWidth }}
            >
              <span className="text-[8px] font-black uppercase tracking-wider text-violet-300 truncate text-center">
                {petName}
              </span>
              {(
                [
                  { key: 'happiness', emoji: '😊', label: 'Happy', color: 'bg-emerald-400', text: 'text-emerald-300', value: stats.happiness, display: formatStatScore(stats.happiness), barPct: stats.happiness },
                  { key: 'energy', emoji: '⚡', label: 'Energy', color: 'bg-amber-400', text: 'text-amber-300', value: stats.energy, display: formatStatScore(stats.energy), barPct: stats.energy },
                  { key: 'cleanliness', emoji: '✨', label: 'Clean', color: 'bg-violet-400', text: 'text-violet-300', value: stats.cleanliness, display: formatStatScore(stats.cleanliness), barPct: stats.cleanliness },
                ] as const
              ).map((row) => (
                <div key={row.key} className="space-y-0.5">
                  <div className={`flex justify-between items-center font-bold ${row.text}`} style={{ fontSize: Math.max(8, widgetSize * 0.028) }}>
                    <span>
                      {row.emoji} {row.label}
                    </span>
                    <span className="font-mono opacity-90">{row.display}</span>
                  </div>
                  <div className="w-full bg-slate-800/90 rounded-full overflow-hidden" style={{ height: statsBarHeight }}>
                    <div className={`${row.color} h-full rounded-full transition-all duration-300`} style={{ width: `${row.barPct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 border-t border-slate-800/80">
                <WeightScaleBar weightKg={stats.weight} compact showKg />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING PET AVATAR FRAME - Simple, perfectly steady, no cursor look-at 3D distortion flipping */}
        <motion.div
          animate={{
            x: petPos.x,
            y: petPos.y,
            rotate: laserMode ? petAngle : 0,
          }}
          transition={
            laserMode 
              ? { type: 'tween', ease: 'easeOut', duration: 0.1 } 
              : { type: 'spring', stiffness: 90, damping: 15 }
          }
          onClick={handlePetGroomClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => {
            setIsDraggingOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
            const foodId =
              e.dataTransfer.getData('application/x-desktop-pet-food') ||
              e.dataTransfer.getData('text/plain');
            if (foodId) {
              handleFeed(foodId);
            }
          }}
          className={`relative max-w-[90%] max-h-[90%] flex items-center justify-center p-1.5 cursor-pointer transform hover:scale-105 transition-transform duration-300 drop-shadow-[0_10px_15px_rgba(0,0,0,0.15)] bg-transparent active:scale-98 ${
            isDraggingOver ? 'ring-4 ring-amber-400/80 rounded-2xl ring-offset-2' : ''
          }`}
          style={{ width: widgetSize * 0.78, height: widgetSize * 0.78 }}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 bg-amber-500/25 rounded-2xl flex flex-col items-center justify-center animate-pulse z-30 pointer-events-none border-2 border-dashed border-amber-400">
              <span className="text-white text-[10px] font-black tracking-wider uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">YUM SNACK Dropped! 😋</span>
            </div>
          )}
          {draggingFoodId && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl pointer-events-none z-40 animate-bounce">
              {(assets.foods || DEFAULT_FOODS).find((f) => f.id === draggingFoodId)?.emoji || '🍪'}
            </div>
          )}
          {asset.type === 'video' ? (
            <video
              key={asset.url}
              src={asset.url}
              autoPlay
              loop
              muted
              playsInline
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-full shadow-inner bg-transparent"
            />
          ) : showCustomMedia ? (
            <img
              key={`${featKey}-${asset.url.slice(0, 48)}`}
              src={asset.url}
              alt={currentInteractState === 'laser' ? 'Laser play' : 'Pet'}
              referrerPolicy="no-referrer"
              onError={() => setCustomMediaError(true)}
              className={`w-full h-full object-contain select-none bg-transparent ${
                currentInteractState === 'dancing' ? 'animate-bounce' : ''
              }`}
            />
          ) : (
            <TransparentCatImage
              src={asset.url}
              alt="Pet companion"
              className={`w-full h-full object-contain select-none bg-transparent ${
                currentInteractState === 'dancing' ? 'animate-bounce' : ''
              }`}
            />
          )}

          {/* Spark effect highlights during focus or petting */}
          {currentInteractState === 'petting' && asset.type === 'image' && (
            <div className="absolute inset-0 flex items-center justify-center bg-rose-500/10 rounded-full animate-ping pointer-events-none" />
          )}

          {(currentInteractState === 'eating' || String(currentInteractState).startsWith('food:')) && asset.type === 'image' && (
            <div className="absolute -top-1 right-0 bg-yellow-400 text-slate-900 border border-yellow-250 font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-md animate-bounce transform rotate-6">
              MUNCH CHOP! 🍪
            </div>
          )}

          {currentInteractState === 'dancing' && asset.type === 'image' && (
            <div className="absolute -top-1 left-0 bg-indigo-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-md -rotate-6 flex items-center gap-1 animate-pulse">
              <Music className="w-2.5 h-2.5" /> GROOVE!
            </div>
          )}
        </motion.div>

        {/* Floating help hint below pet */}
        {list.length > 1 && (
          <button
            onClick={cycleActiveIndex}
            className={`absolute bottom-6 z-20 bg-slate-950/90 hover:bg-slate-950 text-white/95 border border-slate-700/80 rounded-full px-2.5 py-1 text-[9px] font-bold flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
              widgetChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title={
              poseMediaSlideshowSeconds > 0
                ? `Slideshow every ${formatDurationSeconds(poseMediaSlideshowSeconds)} — click to skip ahead`
                : 'Multiple uploads — click to switch'
            }
          >
            <RefreshCw
              className={`w-2.5 h-2.5 text-indigo-400 ${poseMediaSlideshowSeconds > 0 ? 'animate-spin' : ''}`}
              style={
                poseMediaSlideshowSeconds > 0
                  ? { animationDuration: `${Math.max(0.5, poseMediaSlideshowSeconds)}s` }
                  : undefined
              }
            />
            <span>
              {poseMediaSlideshowSeconds > 0 ? 'Slideshow' : 'Cycle'} ({activeIdx + 1}/{list.length})
            </span>
          </button>
        )}

        {!compactMode && (
          <div className="absolute bottom-1 text-center text-[9px] font-bold tracking-tight px-3 py-1 bg-slate-100/40 hover:bg-slate-200/50 rounded-full cursor-pointer transition-colors opacity-70 border border-slate-205/30 text-slate-600 block" onClick={handlePetGroomClick}>
            💡 Click me to play!
          </div>
        )}
        {focusActive && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-950/85 text-indigo-200 border border-indigo-800/60 rounded-full px-3 py-1 text-[10px] font-black font-mono shadow-lg pointer-events-none">
            {formatFocusTime(focusRemaining)}
          </div>
        )}
        {sleepActive && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-950/85 text-indigo-100 border border-indigo-800/60 rounded-full px-3 py-1 text-[10px] font-black font-mono shadow-lg pointer-events-none flex items-center gap-1">
            <Moon className="w-3 h-3" />
            {formatDurationSeconds(sleepRemaining)}
          </div>
        )}
        {!compactMode && isActivityBusy && onReturnToIdle && !showOptionsPopup && (
          <button
            type="button"
            onClick={onReturnToIdle}
            className="electron-no-drag absolute -bottom-7 right-0 z-[60] bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-full px-2.5 py-1 text-[9px] font-black shadow-lg cursor-pointer"
          >
            Return to Idle
          </button>
        )}
      </div>

      {/* Treat dock below the cat — does not overlap the pet image */}
      <AnimatePresence>
        {compactFeedMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="electron-no-drag relative z-50 w-full max-w-[360px] mt-2 pointer-events-auto"
          >
            <div className="bg-slate-950/95 border border-amber-500/50 rounded-2xl shadow-2xl p-2 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 mb-2 px-1">
                <span className="text-[9px] font-black uppercase text-amber-300 tracking-wide">
                  Drag snack up onto cat ↑
                </span>
                <button
                  type="button"
                  onClick={exitFeedDragMode}
                  className="text-[8px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {(assets.foods || DEFAULT_FOODS).map((food) => renderFoodDragItem(food, selectedFoodId === food.id))}
              </div>
              {selectedFoodId && (
                <p className="text-[8px] text-center text-amber-200/80 mt-2 font-bold">
                  Hold & drag{' '}
                  {(assets.foods || DEFAULT_FOODS).find((f) => f.id === selectedFoodId)?.emoji || '🍪'}{' '}
                  onto the cat above
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
