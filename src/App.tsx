/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { PetState, PetStats, CustomAssets, WidgetCustomizer, UploadedFile, TimerMode } from './types';
import PetWidget from './components/PetWidget';
import FocusTimer from './components/FocusTimer';
import StatsAndActivities from './components/StatsAndActivities';
import CustomizerPanel from './components/CustomizerPanel';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Settings, 
  Sparkles, 
  RotateCcw, 
  HelpCircle,
  Clock,
  Zap,
  Grid,
  Award
} from 'lucide-react';

export default function App() {
  // 1. Initialize statistics from localStorage or use defaults
  const [stats, setStats] = useState<PetStats>(() => {
    const saved = localStorage.getItem('desktop_pet_stats_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse pet level dataset, resetting...');
      }
    }
    return {
      happiness: 85,
      hunger: 10,
      energy: 90,
      cleanliness: 95,
      love: 45, // starts with some love
      focusMinutes: 0,
      completedSessions: 0,
    };
  });

  // 2. Load custom file loader assets state
  const [assets, setAssets] = useState<CustomAssets>(() => {
    const saved = localStorage.getItem('desktop_pet_custom_assets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure standard keys exist
        if (parsed) {
          if (!parsed.uploadedAssets) parsed.uploadedAssets = {};
          if (!parsed.activeIndices) parsed.activeIndices = {};
          if (!parsed.playModes) {
            parsed.playModes = {};
            const keys = ['idle', 'studying', 'shortBreak', 'rest', 'focusReward', 'eating', 'dancing', 'petting', 'licking'];
            keys.forEach(k => {
              parsed.playModes[k] = parsed.playMode || 'cycle';
            });
          }
          if (!parsed.uploadedAssets.shortBreak) parsed.uploadedAssets.shortBreak = [];
          if (!parsed.uploadedAssets.rest) parsed.uploadedAssets.rest = [];
          
          if (parsed.activeIndices.shortBreak === undefined) parsed.activeIndices.shortBreak = 0;
          if (parsed.activeIndices.rest === undefined) parsed.activeIndices.rest = 0;

          if (!parsed.playModes.shortBreak) parsed.playModes.shortBreak = 'cycle';
          if (!parsed.playModes.rest) parsed.playModes.rest = 'cycle';

          if (!parsed.customFeatures) parsed.customFeatures = [];
          if (!parsed.workspacePaths) {
            parsed.workspacePaths = {
              idle: '/pet_idle.png',
              studying: '/pet_studying.png',
              shortBreak: '/pet_short_break.png',
              rest: '/pet_rest.png',
              focusReward: '/pet_celebrate.png',
              eating: '/pet_eating.png',
              dancing: '/pet_dancing.png',
              videoPetting: '/pet_petted.mp4',
              videoLicking: '/pet_fur.mp4',
              videoEating: '/pet_feed.mp4',
              videoDancing: '/pet_dance.mp4',
            };
          } else {
            if (!parsed.workspacePaths.shortBreak) parsed.workspacePaths.shortBreak = '/pet_short_break.png';
            if (!parsed.workspacePaths.rest) parsed.workspacePaths.rest = '/pet_rest.png';
            if (!parsed.workspacePaths.focusReward) parsed.workspacePaths.focusReward = '/pet_celebrate.png';
          }
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse asset data, using default...');
      }
    }
    return {
      useWorkspace: false, // defaulted to browser uploads inside sandbox
      workspacePaths: {
        idle: '/pet_idle.png',
        studying: '/pet_studying.png',
        shortBreak: '/pet_short_break.png',
        rest: '/pet_rest.png',
        focusReward: '/pet_celebrate.png',
        eating: '/pet_eating.png',
        dancing: '/pet_dancing.png',
        videoPetting: '/pet_petted.mp4',
        videoLicking: '/pet_fur.mp4',
        videoEating: '/pet_feed.mp4',
        videoDancing: '/pet_dance.mp4',
      },
      uploadedAssets: {
        idle: [],
        studying: [],
        shortBreak: [],
        rest: [],
        focusReward: [],
        eating: [],
        dancing: [],
        petting: [],
        licking: [],
      },
      activeIndices: {
        idle: 0,
        studying: 0,
        shortBreak: 0,
        rest: 0,
        focusReward: 0,
        eating: 0,
        dancing: 0,
        petting: 0,
        licking: 0,
      },
      playModes: {
        idle: 'cycle',
        studying: 'cycle',
        shortBreak: 'cycle',
        rest: 'cycle',
        focusReward: 'cycle',
        eating: 'cycle',
        dancing: 'cycle',
        petting: 'cycle',
        licking: 'cycle',
      },
      customFeatures: [],
    };
  });

  // Load custom assets from IndexedDB on startup
  useEffect(() => {
    const loadDBAssets = async () => {
      try {
        const { getAllFilesFromDB } = await import('./utils/db');
        const dbRecords = await getAllFilesFromDB();
        
        if (dbRecords.length > 0) {
          const loadedMap: Record<string, UploadedFile[]> = {};
          
          dbRecords.forEach((rec) => {
            if (!loadedMap[rec.feature]) {
              loadedMap[rec.feature] = [];
            }
            const url = URL.createObjectURL(rec.blob);
            loadedMap[rec.feature].push({
              id: rec.id,
              url,
              type: rec.type,
              name: rec.name,
            });
          });
          
          setAssets((prev) => {
            const updatedUploaded = { ...prev.uploadedAssets };
            Object.keys(loadedMap).forEach((key) => {
              updatedUploaded[key] = loadedMap[key];
            });
            return {
              ...prev,
              uploadedAssets: updatedUploaded,
            };
          });
        }
      } catch (err) {
        console.error("Failed to load local IndexedDB assets:", err);
      }
    };
    loadDBAssets();
  }, []);

  // 3. Load widget customzer settings state
  const [customizer, setCustomizer] = useState<WidgetCustomizer>(() => {
    const saved = localStorage.getItem('desktop_pet_widget_customizer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      scale: 'medium',
      opacity: 0.95,
      theme: 'pastel',
      borderStyle: 'thin',
      soundVolume: 0.4,
      alwaysOnTopGuide: false,
    };
  });

  // Core Interact State tracking (switches active images & renders videos)
  const [interactState, setInteractState] = useState<PetState>('idle');
  const [laserMode, setLaserMode] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [compactWidgetMode, setCompactWidgetMode] = useState(false);
  const [isWidgetHovered, setIsWidgetHovered] = useState(false);
  const resetTimeoutRef = useRef<any>(null);
  const [showFocusRewardModal, setShowFocusRewardModal] = useState(false);

  // Shared Customize Durations (in seconds)
  const [customDuration, setCustomDuration] = useState<number>(() => {
    const saved = localStorage.getItem('desktop_pet_custom_duration_secs');
    return saved ? Math.max(1, Math.min(600, parseInt(saved) || 5)) : 5;
  });

  // Shared Pomodoro Timer States across Widget and sidebar!
  const [timerMode, setTimerMode] = useState<TimerMode>('study');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Persist customized timer default duration
  useEffect(() => {
    localStorage.setItem('desktop_pet_custom_duration_secs', String(customDuration));
  }, [customDuration]);

  // Sync state mutations to localStorage
  useEffect(() => {
    localStorage.setItem('desktop_pet_stats_data', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('desktop_pet_custom_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('desktop_pet_widget_customizer', JSON.stringify(customizer));
  }, [customizer]);

  // STATS DECAY LOGIC - 5% per hour (approx. 5 points per hour)
  useEffect(() => {
    const now = Date.now();
    const savedLastDecay = localStorage.getItem('desktop_pet_last_decay_time');
    
    if (savedLastDecay) {
      const elapsedSecs = (now - Number(savedLastDecay)) / 1000;
      if (elapsedSecs > 0) {
        // Limit retroactive offline decay to 24 hours to protect the pet's levels
        const capSecs = Math.min(24 * 3600, elapsedSecs);
        const decayPoints = (capSecs / 3600) * 5;
        if (decayPoints > 0) {
          setStats((prev) => ({
            ...prev,
            happiness: Math.max(0, prev.happiness - decayPoints),
            hunger: Math.min(100, prev.hunger + decayPoints), // hunger increases over time
            energy: Math.max(0, prev.energy - decayPoints),
            cleanliness: Math.max(0, prev.cleanliness - decayPoints),
          }));
        }
      }
    }
    localStorage.setItem('desktop_pet_last_decay_time', String(now));

    // Continuous 30-sec active decay ticks for robust real-time tracking
    let lastTickTime = Date.now();
    const tickInterval = setInterval(() => {
      const currentTick = Date.now();
      const deltaSecs = (currentTick - lastTickTime) / 1000;
      lastTickTime = currentTick;
      localStorage.setItem('desktop_pet_last_decay_time', String(currentTick));

      const tickDecay = (deltaSecs / 3600) * 5;
      setStats((prev) => ({
        ...prev,
        happiness: Math.max(0, prev.happiness - tickDecay),
        hunger: Math.min(100, prev.hunger + tickDecay),
        energy: Math.max(0, prev.energy - tickDecay),
        cleanliness: Math.max(0, prev.cleanliness - tickDecay),
      }));
    }, 30000);

    return () => clearInterval(tickInterval);
  }, []);

  // Synchronize Active Timer states (studying, shortBreak, rest) to pet representation when running
  useEffect(() => {
    if (timerActive) {
      if (timerMode === 'study') {
        setInteractState('studying');
      } else if (timerMode === 'shortBreak') {
        setInteractState('shortBreak');
      } else if (timerMode === 'longBreak') {
        setInteractState('rest');
      }
    } else {
      // If timer paused or completed, return to idle (if pet is studying/shortBreak/rest)
      if (interactState === 'studying' || interactState === 'shortBreak' || interactState === 'rest') {
        setInteractState('idle');
      }
    }
  }, [timerActive, timerMode]);

  // Set transient pet states with helper reset timers
  const triggerInteractState = (state: PetState, durationMs: number = 3000) => {
    // Choose active asset index depending on the target button's specific playMode
    const list = assets.uploadedAssets[state] || [];
    const mode = assets.playModes[state] || 'cycle';
    
    if (list.length > 0) {
      setAssets((prev) => {
        const indices = prev.activeIndices || {};
        const currentIdx = indices[state] ?? 0;
        let nextIdx = currentIdx;
        
        if (mode === 'random' && list.length > 1) {
          nextIdx = Math.floor(Math.random() * list.length);
          // ensure it picks a different one if possible
          if (nextIdx === currentIdx) {
            nextIdx = (nextIdx + 1) % list.length;
          }
        } else if (list.length > 1) {
          nextIdx = (currentIdx + 1) % list.length;
        }
        
        return {
          ...prev,
          activeIndices: {
            ...indices,
            [state]: nextIdx,
          },
        };
      });
    }

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    setInteractState(state);
    if (state !== 'idle' && state !== 'laser') {
      resetTimeoutRef.current = setTimeout(() => {
        setInteractState(laserMode ? 'laser' : 'idle');
        resetTimeoutRef.current = null;
      }, durationMs);
    }
  };

  const handleLoveIncrease = (amount: number) => {
    setStats((prev) => ({
      ...prev,
      love: prev.love + amount,
      happiness: Math.min(100, prev.happiness + Math.ceil(amount / 2)),
    }));
  };

  // Timer Focus Completed handler
  const handleFocusCompleted = (minutes: number) => {
    setStats((prev) => ({
      ...prev,
      focusMinutes: prev.focusMinutes + minutes,
      completedSessions: prev.completedSessions + 1,
      love: prev.love + 50, // major award!
      happiness: Math.min(100, prev.happiness + 35),
      energy: Math.max(10, prev.energy - 20), // studying drains physical energy
    }));
    
    setShowFocusRewardModal(true);
    triggerInteractState('focusReward', 10000); // Trigger Focus celebration pose for 10 seconds
  };

  const handleAddTaskHappiness = () => {
    setStats((prev) => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 10),
      love: prev.love + 10,
    }));
  };

  const handleResetStats = () => {
    setStats({
      happiness: 85,
      hunger: 10,
      energy: 90,
      cleanliness: 95,
      love: 45,
      focusMinutes: 0,
      completedSessions: 0,
    });
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans select-none overflow-x-hidden antialiased text-slate-800 ${
      compactWidgetMode 
        ? 'bg-transparent justify-center items-center' 
        : 'bg-gradient-to-br from-indigo-50/75 via-slate-50 to-blue-50/75'
    }`}>
      
      {/* Upper Navigation Header */}
      {!compactWidgetMode && (
        <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 p-4 shrink-0 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-rose-500 p-2 rounded-2xl shadow-indigo-200 shadow-md">
                <Heart className="w-6 h-6 text-white fill-white/10 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  Desktop Pet & Focus Companion
                </h1>
                <p className="text-[11px] font-medium text-slate-500">
                  Minimal windows footprint • Procedural audio synthesizers • Built-in custom launcher assets 
                </p>
              </div>
            </div>

            {/* Quick dashboard badges */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Checked Study: {stats.focusMinutes}m
              </div>
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Sessions: {stats.completedSessions}
              </div>
              <button
                onClick={() => setCompactWidgetMode(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700 font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm"
              >
                🖥️ Widget ONLY Mode
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Grid container / Specialized Windows Mini Widget Frame Mode */}
      {compactWidgetMode ? (
        <div 
          onMouseEnter={() => setIsWidgetHovered(true)}
          onMouseLeave={() => setIsWidgetHovered(false)}
          className="fixed inset-0 flex flex-col items-center justify-center select-none overflow-hidden bg-transparent p-4 h-full w-full"
        >
          {/* Floating Hover Controls Banner - Fades in automatically on mouse over */}
          <div 
            className={`absolute top-4 bg-slate-900/90 text-white border border-slate-800 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3.5 backdrop-blur-md transition-all duration-300 z-50 ${
              isWidgetHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-300">
              🐱 Tabby Companion Widget Mode
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={() => setCompactWidgetMode(false)}
              className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-all cursor-pointer"
            >
              Exit Widget Mode ⚙️
            </button>
          </div>

          <PetWidget
            currentInteractState={interactState}
            setInteractState={triggerInteractState}
            assets={assets}
            customizer={customizer}
            laserMode={laserMode}
            setLaserMode={setLaserMode}
            onLoveIncrease={handleLoveIncrease}
            stats={stats}
            setStats={setStats}
            compactMode={true}
            timerActive={timerActive}
            setTimerActive={setTimerActive}
            timerMode={timerMode}
            setTimerMode={setTimerMode}
            customDuration={customDuration}
            setCustomDuration={setCustomDuration}
          />

          {/* Hidden Double-click instructional overlay hint - fades out very cleanly */}
          <div 
            className={`absolute bottom-4 text-[10px] font-medium text-slate-400/80 bg-slate-900/40 px-3 py-1 rounded-full pointer-events-none transition-all duration-300 ${
              isWidgetHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hover near cat to exit widget mode
          </div>
        </div>
      ) : (
        /* Multi-Pane Full Companion Workspace */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full self-center">
          <>
            {/* Visualizer and Customizer controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/95 border border-slate-200 rounded-3xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Virtual Companion view</h3>
                  {interactState !== 'idle' && (
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-bold px-2 py-0.5 rounded-full animate-pulse capitalize">
                      {interactState} Active
                    </span>
                  )}
                </div>
                 <PetWidget
                  currentInteractState={interactState}
                  setInteractState={triggerInteractState}
                  assets={assets}
                  customizer={customizer}
                  laserMode={laserMode}
                  setLaserMode={setLaserMode}
                  onLoveIncrease={handleLoveIncrease}
                  stats={stats}
                  setStats={setStats}
                  timerActive={timerActive}
                  setTimerActive={setTimerActive}
                  timerMode={timerMode}
                  setTimerMode={setTimerMode}
                  customDuration={customDuration}
                  setCustomDuration={setCustomDuration}
                />
              </div>

              {/* Toggle configuration panel drawer */}
              <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-3 px-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs text-left">Custom Assets Configurer</h4>
                  <p className="text-[10px] text-slate-500">Inject custom pictures & videos</p>
                </div>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  {showConfig ? 'Hide Settings 🔒' : 'Show Settings 🛠️'}
                </button>
              </div>

              {showConfig && (
                <CustomizerPanel
                  customizer={customizer}
                  setCustomizer={setCustomizer}
                  assets={assets}
                  setAssets={setAssets}
                  onResetStats={handleResetStats}
                  customDuration={customDuration}
                  setCustomDuration={setCustomDuration}
                />
              )}
            </div>

            {/* Central Work Focus Station with Pomodoro and synthesizer noise */}
            <div className="lg:col-span-4 h-full">
              <FocusTimer
                onFocusComplete={handleFocusCompleted}
                onAddTaskHappiness={handleAddTaskHappiness}
                timerActive={timerActive}
                setTimerActive={setTimerActive}
                timerMode={timerMode}
                setTimerMode={setTimerMode}
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
              />
            </div>

            {/* Stats list and Interactive play controllers */}
            <div className="lg:col-span-4 h-full">
              <StatsAndActivities
                stats={stats}
                setStats={setStats}
                currentInteractState={interactState}
                setInteractState={triggerInteractState}
                laserMode={laserMode}
                setLaserMode={setLaserMode}
                assets={assets}
                customDuration={customDuration}
                setCustomDuration={setCustomDuration}
              />
            </div>
          </>
        </main>
      )}

      {/* Humble Footer containing info */}
      {!compactWidgetMode && (
        <footer className="p-4 border-t border-indigo-50/70 text-center select-none shrink-0 text-[10px] text-slate-400 font-medium">
          Desktop Pet Platform widget companion • Install as Edge/Chrome PWA for zero desktop overhead on Windows
        </footer>
      )}

      {/* FOCUS CELEBRATION / FINISH FOCUS REWARD MODAL */}
      <AnimatePresence>
        {showFocusRewardModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white rounded-2xl border border-indigo-100 shadow-2xl max-w-md w-full p-6 text-center select-none overflow-hidden space-y-4"
            >
              <div className="flex justify-center">
                <div className="bg-amber-100 p-3 rounded-full text-amber-500 animate-bounce">
                  <Award className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">🎉 Session Unlocked! 🎉</span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Focus Reward Achieved</h3>
                <p className="text-slate-500 text-[11px] max-w-[90%] mx-auto leading-relaxed">
                  Outstanding study session completed! Your cyber companion is ecstatic and wants to celebrate your deep focus milestones!
                </p>
              </div>

              {/* RENDER DYNAMIC REWARD ART MEDIA (focusReward pose!) */}
              <div className="p-2 border border-slate-200 bg-slate-50/50 rounded-xl max-h-[190px] overflow-hidden flex items-center justify-center">
                {(() => {
                  const list = assets.uploadedAssets.focusReward || [];
                  if (list.length > 0) {
                    const activeIdx = (assets.activeIndices.focusReward ?? 0) % list.length;
                    const file = list[activeIdx];
                    if (file) {
                      if (file.type === 'video') {
                        return (
                          <video
                            src={file.url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            referrerPolicy="no-referrer"
                            className="max-h-[170px] w-auto rounded-lg object-contain shadow"
                          />
                        );
                      } else {
                        return (
                          <img
                            src={file.url}
                            referrerPolicy="no-referrer"
                            className="max-h-[170px] w-auto rounded-lg object-contain shadow"
                          />
                        );
                      }
                    }
                  }
                  
                  // fallback to public or default state celebrate image
                  return (
                    <img
                      src={assets.useWorkspace ? (assets.workspacePaths.focusReward || "/pet_celebrate.png") : "/pet_celebrate.png"}
                      onError={(e) => {
                        // secondary ultimate hardcoded cat celebratory emoji or default state
                        e.currentTarget.src = "/pet_study.png";
                      }}
                      referrerPolicy="no-referrer"
                      className="max-h-[170px] w-auto rounded-lg object-contain shadow animate-pulse"
                    />
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 flex flex-col justify-center items-center">
                  <span className="text-[9px] text-rose-500 uppercase font-black tracking-wider">Affection Gain</span>
                  <span className="text-sm font-extrabold">+50 Love XP 💖</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-750 flex flex-col justify-center items-center">
                  <span className="text-[9px] text-emerald-500 uppercase font-black tracking-wider">Happiness Bonus</span>
                  <span className="text-sm font-extrabold">+35 Happiness 😊</span>
                </div>
              </div>

              <button
                onClick={() => setShowFocusRewardModal(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white border border-indigo-700 font-extrabold rounded-xl transition-all shadow-md cursor-pointer uppercase text-xs tracking-wider"
              >
                Claim Focus Reward Pose ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
