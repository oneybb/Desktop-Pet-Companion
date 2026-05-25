/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PetState, CustomAssets, WidgetCustomizer, PetStats } from '../types';
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
import { isDisplayableMediaUrl } from '../utils/mediaUrl';
import { formatStatScore } from '../utils/companionSettings';

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
  setCustomDuration?: (val: number) => void;
  onFocusComplete?: (minutes: number) => void;
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
  setCustomDuration,
  onFocusComplete,
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

  const getPopupBgStyle = () => {
    switch (customizer.theme) {
      case 'retro-win98':
        return 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-slate-850 border-r-slate-850 text-slate-950 rounded-2xl shadow-2xl';
      case 'dark':
        return 'bg-slate-900/95 border border-slate-800 text-white rounded-2xl shadow-2xl';
      case 'glass':
        return 'bg-white/35 backdrop-blur-md border border-white/40 text-indigo-950 rounded-2xl shadow-2xl';
      case 'pastel':
      default:
        return 'bg-rose-50/95 border border-rose-100 text-slate-850 rounded-2xl shadow-2xl';
    }
  };

  // Hover state for showing stats HUD overlay
  const [isHovered, setIsHovered] = useState(false);

  // Laser Chase States
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [petPos, setPetPos] = useState({ x: 0, y: 0 });
  const [petAngle, setPetAngle] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const widgetResizeRef = useRef<{ startX: number; startSize: number } | null>(null);
  const interactionResizeRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null);

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
      if (currentInteractState === 'shortBreak') {
        return { type: 'image', url: assets.workspacePaths.shortBreak || petDanceImg, fromUpload: false };
      }
      if (currentInteractState === 'rest') {
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
    setFocusRemaining(totalSeconds);
    setFocusActive(true);
    setShowFocusSetup(false);
    setShowOptionsPopup(false);
    setLaserMode(false);
    setInteractState('studying');
  };

  const stopFocusTimer = () => {
    setFocusActive(false);
    setFocusRemaining(0);
    setInteractState('idle');
  };

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

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!widgetResizeRef.current) return;
      const nextSize = widgetResizeRef.current.startSize + (moveEvent.clientX - widgetResizeRef.current.startX);
      setWidgetSize(Math.max(180, Math.min(560, nextSize)));
    };

    const onPointerUp = () => {
      widgetResizeRef.current = null;
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
  const handleAction = (activeType: PetState, statsBonus: Partial<PetStats>, msg: string) => {
    setShowOptionsPopup(false);
    setLaserMode(activeType === 'laser');

    // Update stats
    setStats((prev) => ({
      ...prev,
      love: prev.love + (statsBonus.love || 0),
      happiness: Math.min(100, prev.happiness + (statsBonus.happiness || 0)),
      energy: Math.min(100, Math.max(0, prev.energy + (statsBonus.energy || 0))),
      cleanliness: Math.min(100, prev.cleanliness + (statsBonus.cleanliness || 0)),
      hunger: Math.max(0, Math.min(100, prev.hunger + (statsBonus.hunger || 0))),
    }));

    // Trigger animation states
    if (activeType !== 'idle' && activeType !== 'laser') {
      setInteractState(activeType, customDuration * 1000);
    } else {
      setInteractState(activeType);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-1 relative select-none">
      
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
              {currentInteractState === 'idle' && 'Cozy Sitting 🐾'}
              {currentInteractState === 'petting' && 'Purring Loudly... ❤'}
              {currentInteractState === 'licking' && 'Grooming Shiny Fur ✨'}
              {(currentInteractState === 'eating' || String(currentInteractState).startsWith('food:')) && 'Crunching Snacks 🍕'}
              {currentInteractState === 'dancing' && 'Grooving on Beats 🎵'}
              {currentInteractState === 'studying' && 'Focus Partner Mode 📚'}
              {currentInteractState === 'laser' && 'Active Laser Play 🔴'}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* CORE FRAMELESS PET CONTAINER - No bounding square box! */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="electron-no-drag relative flex flex-col items-center justify-center transition-all duration-300 select-none cursor-default bg-transparent"
        style={{ width: widgetSize, height: widgetSize }}
      >
        <div className="electron-drag-region absolute top-1 left-1 z-[70] bg-slate-950/70 text-white/80 border border-slate-700/60 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider backdrop-blur-sm cursor-move">
          Drag
        </div>
        <button
          type="button"
          onPointerDown={beginWidgetResize}
          onClick={(e) => e.stopPropagation()}
          className="widget-resize-handle absolute bottom-1 right-1 z-[70] bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-300/40 rounded-full w-7 h-7 text-[13px] font-black shadow-lg cursor-nwse-resize"
          title="Drag to resize widget"
        >
          ↘
        </button>
        <div className="absolute bottom-2 left-1 z-[70] bg-slate-950/60 text-white/70 border border-slate-700/50 rounded-full px-2 py-0.5 text-[8px] font-bold pointer-events-none">
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

        {/* POPUP OPTIONS MENU OVERLAY - Appappears dynamically when the user clicks the pet */}
        <AnimatePresence>
          {showOptionsPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={`electron-no-drag absolute z-40 flex flex-col items-center justify-center p-5 transition-all ${getPopupBgStyle()}`}
              style={{
                width: interactionSize.width,
                height: interactionSize.height,
                left: `calc(50% - ${interactionSize.width / 2}px)`,
                top: `calc(50% - ${interactionSize.height / 2}px)`,
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 24px)',
              }}
            >
              <button
                onClick={() => setShowOptionsPopup(false)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-1.5 mt-1 animate-pulse">
                Companion Interactions
              </div>
              <div className="text-[8px] text-slate-400 mb-2 font-bold">
                Drag ↘ to resize menu
              </div>

              {/* Scrollable Container for many actions */}
              <div className="flex-1 min-h-0 overflow-y-auto w-full px-2 pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {/* Standard grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <button
                    onClick={() => handleAction('petting', { love: 12, happiness: 15 }, 'purr')}
                    className="flex flex-col items-center justify-center p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 rounded-xl text-rose-300 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Heart className="w-4 h-4 animate-pulse fill-rose-500/20" />
                    <span className="text-[8px] font-extrabold mt-1">Pet Cat</span>
                  </button>

                  <button
                    onClick={() => handleAction('licking', { cleanliness: 25, love: 5 }, 'lick')}
                    className="flex flex-col items-center justify-center p-2 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/80 rounded-xl text-sky-300 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="text-[8px] font-extrabold mt-1">Groom Fur</span>
                  </button>

                  <button
                    onClick={() => setFeedDrawerOpen(!feedDrawerOpen)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer transform hover:scale-105 ${
                      feedDrawerOpen
                        ? 'bg-amber-800 border-amber-500 text-white animate-pulse'
                        : 'bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-305 hover:text-amber-300'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span className="text-[8px] font-extrabold mt-1">{feedDrawerOpen ? "Close Tray" : "Feed Snack"}</span>
                  </button>

                  <button
                    onClick={() => handleAction('dancing', { happiness: 25, energy: -15, love: 10 }, 'dance')}
                    className="flex flex-col items-center justify-center p-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/80 rounded-xl text-indigo-305 text-indigo-300 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Music className="w-4 h-4" />
                    <span className="text-[8px] font-extrabold mt-1">Dance Beat</span>
                  </button>

                  <button
                    onClick={() => handleAction('laser', {}, 'laser')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer transform hover:scale-105 ${
                      laserMode
                        ? 'bg-red-650 border-red-500 text-white animate-pulse'
                        : 'bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-305 hover:text-red-350'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-red-400" />
                    <span className="text-[8px] font-extrabold mt-1">Laser Play</span>
                  </button>

                  <button
                    onClick={() => handleAction('studying', { energy: 35 }, 'sleep')}
                    className="flex flex-col items-center justify-center p-2 bg-slate-950/45 hover:bg-slate-900/60 border border-slate-800 rounded-xl text-slate-350 transition-all cursor-pointer transform hover:scale-105"
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-[8px] font-extrabold mt-1">Take Nap</span>
                  </button>

                  {assets?.customFeatures?.map((feat) => (
                    <button
                      key={feat.id}
                      onClick={() => {
                        const bonuses = feat.statsBonus || {};
                        handleAction(feat.id as PetState, bonuses, feat.name);
                      }}
                      className="flex flex-col items-center justify-center p-2 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-850 rounded-xl text-indigo-200 hover:text-white transition-all cursor-pointer transform hover:scale-105"
                    >
                      <span className="text-xs">🎮</span>
                      <span className="text-[8px] font-extrabold mt-1 truncate max-w-full" title={feat.name}>
                        {feat.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Focus Timer Segment */}
                <div className="space-y-1.5 border-t border-slate-850/60 pt-2 text-left">
                  <div className="text-[7.5px] uppercase font-black text-slate-400 tracking-wider">
                    Focus Timer
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowFocusSetup(true);
                      }}
                      className="flex flex-col items-center justify-center p-1.5 bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-800/50 rounded-lg text-indigo-305 text-indigo-300 transition-all cursor-pointer transform hover:scale-105"
                    >
                      <span className="text-xs">📚</span>
                      <span className="text-[7.5px] font-bold mt-1">Focus</span>
                    </button>
                    <button
                      onClick={() => {
                        stopFocusTimer();
                        setShowOptionsPopup(false);
                      }}
                      className="flex flex-col items-center justify-center p-1.5 bg-slate-950/50 hover:bg-slate-900/70 border border-slate-800/50 rounded-lg text-slate-300 transition-all cursor-pointer transform hover:scale-105"
                    >
                      <span className="text-xs">⏹️</span>
                      <span className="text-[7.5px] font-bold mt-1">Stop</span>
                    </button>
                  </div>
                  {focusActive && (
                    <div className="text-center text-[9px] font-black text-indigo-300 bg-slate-950/70 border border-indigo-900/50 rounded-lg py-1">
                      Focus running: {formatFocusTime(focusRemaining)}
                    </div>
                  )}
                </div>

              </div>

              {/* Hot-spot custom duration timer controller */}
              <div className="flex items-center gap-1.5 mt-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 shadow-lg select-none">
                <span className="text-[8.5px] font-black uppercase text-slate-400 animate-pulse">Pose Time:</span>
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={customDuration}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(600, parseInt(e.target.value) || 5));
                    if (setCustomDuration) setCustomDuration(val);
                  }}
                  className="w-10 text-center bg-slate-950 border border-slate-750 border-slate-705 rounded px-1.5 py-0.5 text-[9px] font-black text-indigo-400 font-mono"
                />
                <span className="text-[8.5px] font-black uppercase text-slate-400">secs</span>
              </div>

              {/* Expandable Food Tray */}
              {feedDrawerOpen && (
                <div className="w-full mt-2 border-t border-slate-800/60 pt-2 animate-fade-in">
                  <div className="text-[8px] font-black uppercase tracking-wider text-amber-400 mb-1 flex justify-between items-center px-1">
                    <span>🐟 Treat Tray (Drag emoji to cat)</span>
                    <span className="text-rose-400 font-bold scale-95 uppercase">Click to pick • Drag to feed</span>
                  </div>
                  <p className="text-[8px] text-amber-200/90 text-center mb-1.5 font-bold">
                    Tap a snack — menu closes so you can drag it onto the cat
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 w-full">
                    {(assets.foods || DEFAULT_FOODS).map((food) => renderFoodDragItem(food))}
                  </div>
                </div>
              )}

              <div className="text-[8px] text-slate-400 mt-2 text-center max-w-[85%] font-medium">
                Click pet again to toggle view
              </div>
              <button
                type="button"
                onPointerDown={beginInteractionResize}
                onClick={(e) => e.stopPropagation()}
                className="interaction-resize-handle absolute bottom-2 right-2 bg-indigo-600/95 hover:bg-indigo-500 text-white border border-indigo-300/40 rounded-full w-7 h-7 text-[13px] font-black shadow-lg cursor-nwse-resize"
                title="Drag to resize interaction menu"
              >
                ↘
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFocusSetup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-5 transition-all ${getPopupBgStyle()}`}
            >
              <button
                onClick={() => setShowFocusSetup(false)}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-3">
                Start Focus Timer
              </div>
              <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-3 text-center">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Focus duration
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
                  Start Focus
                </button>
                {focusActive && (
                  <button
                    onClick={stopFocusTimer}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-[10px] uppercase"
                  >
                    Stop Current Timer
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOAT STATS HUD CARD ON HOVER - Displays real love, happiness, energy, and hunger progress */}
        <AnimatePresence>
          {isHovered && !showOptionsPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-4 shadow-2xl w-[230px] pointer-events-none select-none flex flex-col gap-2.5 md:left-full md:top-0 md:ml-4 left-1/2 -translate-x-1/2 bottom-[105%] mb-2"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Companion Stats HUD</span>
              </div>

              <div className="space-y-2 text-[10px] font-bold">
                {/* Happiness */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-emerald-300">
                    <span className="flex items-center gap-1">😊 Happiness</span>
                    <span>{formatStatScore(stats.happiness)}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${stats.happiness}%` }} />
                  </div>
                </div>

                {/* Energy */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-amber-300">
                    <span className="flex items-center gap-1">⚡ Energy</span>
                    <span>{formatStatScore(stats.energy)}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${stats.energy}%` }} />
                  </div>
                </div>

                {/* Cleanliness */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-indigo-300">
                    <span className="flex items-center gap-1">✨ Cleanliness</span>
                    <span>{formatStatScore(stats.cleanliness)}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${stats.cleanliness}%` }} />
                  </div>
                </div>
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

          {currentInteractState === 'licking' && asset.type === 'image' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Sparkles className="w-14 h-14 text-sky-450 animate-spin-slow opacity-80" />
            </div>
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
            className="absolute bottom-6 z-20 bg-slate-950/90 hover:bg-slate-950 text-white/95 border border-slate-700/80 rounded-full px-2.5 py-1 text-[9px] font-bold flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-sm shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
            title="Multiple uploads exist for this feature! Click to switch."
          >
            <RefreshCw className="w-2.5 h-2.5 text-indigo-400" />
            <span>Cycle Media ({activeIdx + 1}/{list.length})</span>
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
