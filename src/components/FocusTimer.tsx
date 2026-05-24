/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TimerMode, TaskItem } from '../types';
import { 
  startRain, stopRain, 
  startCampfire, stopCampfire, 
  startBreeze, stopBreeze, 
  updateAmbientSoundVolume 
} from '../utils/audioSynth';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  VolumeX, 
  Flame, 
  CloudRain, 
  Wind, 
  Plus, 
  Trash2, 
  Check, 
  Coffee, 
  BookOpen, 
  Award,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

interface FocusTimerProps {
  onFocusComplete: (minutes: number) => void;
  onAddTaskHappiness: () => void;
  timerActive: boolean;
  setTimerActive: (val: boolean) => void;
  timerMode: TimerMode;
  setTimerMode: (val: TimerMode) => void;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
}

export default function FocusTimer({
  onFocusComplete,
  onAddTaskHappiness,
  timerActive,
  setTimerActive,
  timerMode,
  setTimerMode,
  timeLeft,
  setTimeLeft,
}: FocusTimerProps) {
  // Timer States
  const [totalAccumulatedSecs, setTotalAccumulatedSecs] = useState(0);

  // Audio Machine States (individual toggle states)
  const [rainOn, setRainOn] = useState(false);
  const [campfireOn, setCampfireOn] = useState(false);
  const [breezeOn, setBreezeOn] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.4);

  // Focus Tasks
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', text: 'Structure desktop pet states', completed: true },
    { id: '2', text: 'Customize my pet background', completed: false },
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  // Pet Speeches
  const [bubbleText, setBubbleText] = useState<string>("Hello, focus explorer! Let's work together today! 🐾");
  const speeches = {
    study: [
      "Staring at code can be tough, but I am right here by your keyboard! 🐾",
      "Type type typing! You look so handsome when focusing! 💻",
      "Don't worry about bugs, they are just organic snacks! 🐛",
      "Blink those beautiful eyes of yours, and keep up the amazing work! 🌟",
      "Let's write clean code. No rushing, just cozy lines... 🍵",
      "Every small session builds your giant monument! Proud of you!"
    ],
    break: [
      "Time to stretch your back and clean your whiskers! 🐈",
      "Go drink some warm milk or delicious water! 🥛",
      "Hooray! Walk around for a minute, I'll guard your chair. 🪑",
      "Do a little dance! Or wiggle your ears with me! 🎵"
    ]
  };

  // Keep a reference to count interval
  const timerRef = useRef<any>(null);

  // Select timer configurations
  const configureTimer = (tMode: TimerMode) => {
    setTimerActive(false);
    setTimerMode(tMode);
    if (tMode === 'study') {
      setTimeLeft(25 * 60);
    } else if (tMode === 'shortBreak') {
      setTimeLeft(5 * 60);
    } else {
      setTimeLeft(15 * 60);
    }
  };

  // Timer Tick Core Logic
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerCompleted();
            return 0;
          }
          return prev - 1;
        });
        setTotalAccumulatedSecs((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  // Handle accumulation & completions
  const handleTimerCompleted = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (timerMode === 'study') {
      const minutesCompleted = 25;
      onFocusComplete(minutesCompleted);
      setBubbleText("Incredible job! Sessions finished successfully. Let's take a break! 🏆");
    } else {
      setBubbleText("Break's over! Let's get back into the focus flow zone! 🚀");
    }
  };

  // Periodically change pet bubble speeches
  useEffect(() => {
    if (timerActive) {
      const speechPool = timerMode === 'study' ? speeches.study : speeches.break;
      const speechInterval = setInterval(() => {
        const rand = speechPool[Math.floor(Math.random() * speechPool.length)];
        setBubbleText(rand);
      }, 35000); // cycle advice statements
      return () => clearInterval(speechInterval);
    }
  }, [timerActive, timerMode]);

  // Synthesis Volume Synchronizer
  useEffect(() => {
    if (rainOn) updateAmbientSoundVolume('rain', ambientVolume);
    if (campfireOn) updateAmbientSoundVolume('campfire', ambientVolume);
    if (breezeOn) updateAmbientSoundVolume('breeze', ambientVolume);
  }, [ambientVolume, rainOn, campfireOn, breezeOn]);

  const toggleRain = () => {
    if (rainOn) {
      stopRain();
      setRainOn(false);
    } else {
      startRain(ambientVolume);
      setRainOn(true);
    }
  };

  const toggleCampfire = () => {
    if (campfireOn) {
      stopCampfire();
      setCampfireOn(false);
    } else {
      startCampfire(ambientVolume);
      setCampfireOn(true);
    }
  };

  const toggleBreeze = () => {
    if (breezeOn) {
      stopBreeze();
      setBreezeOn(false);
    } else {
      startBreeze(ambientVolume);
      setBreezeOn(true);
    }
  };

  const handleMuteAll = () => {
    stopRain();
    stopCampfire();
    stopBreeze();
    setRainOn(false);
    setCampfireOn(false);
    setBreezeOn(false);
  };

  // Convert seconds to readable display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Task Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskText('');
    setBubbleText("Ooh, a new challenge! Let's conquer it together! 📝");
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            onAddTaskHappiness(); // give happiness boost 
            setBubbleText("Woohoo! Task completed, scratch that off! You're brilliant! ⭐");
          }
          return { ...t, completed: nextCompleted };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300">
      
      {/* Decorative cyber grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

      <div className="space-y-4 relative z-10">
        {/* Toggle Headings as Focus Poses */}
        <div className="text-left font-black text-[10px] text-indigo-400 uppercase tracking-widest pl-1 mb-1">
          Select Companionship Pose Timer:
        </div>
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 justify-between items-center text-xs">
          <button
            onClick={() => configureTimer('study')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timerMode === 'study' ? 'bg-indigo-600 text-white shadow-md scale-102 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Study Pose (25m)
          </button>
          <button
            onClick={() => configureTimer('shortBreak')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timerMode === 'shortBreak' ? 'bg-emerald-600 text-white shadow-md scale-102 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" /> Short Break Pose (5m)
          </button>
          <button
            onClick={() => configureTimer('longBreak')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timerMode === 'longBreak' ? 'bg-indigo-900 text-white shadow-md scale-102 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" /> Rest Pose (15m)
          </button>
        </div>

        {/* Big Countdown */}
        <div className="text-center py-4 flex flex-col justify-center items-center">
          <div className="text-5xl font-mono font-black tracking-widest text-indigo-400 select-none animate-pulse-slow">
            {formatTime(timeLeft)}
          </div>
          <div className="flex flex-col items-center gap-1 mt-2">
            <span className="text-[10px] text-slate-400 tracking-wider font-bold uppercase">
              {timerMode === 'study' ? '🔒 DEEP FOCUS STATE' : '🔓 RELAXATION PERIOD'}
            </span>
            <span className="text-[9px] bg-slate-950/90 text-indigo-300 border border-indigo-950/60 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
              <span>🔗</span> 
              <span>
                {timerActive 
                  ? `Pet Pose Auto-Linked to: ${timerMode === 'study' ? 'Studying 📚' : timerMode === 'shortBreak' ? 'Short Break ☕' : 'Rest 🛋️'}`
                  : `Start to automatically sync pet to: ${timerMode === 'study' ? 'Studying 📚' : timerMode === 'shortBreak' ? 'Short Break ☕' : 'Rest 🛋️'}`
                }
              </span>
            </span>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex gap-2 items-center justify-center">
          <button
            onClick={() => setTimerActive(!timerActive)}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-indigo-950/40 ${
              timerActive 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {timerActive ? 'Pause Session' : 'Start Timer'}
          </button>

          <button
            onClick={() => {
              setTimerActive(false);
              configureTimer(timerMode);
            }}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {timerMode === 'study' && (
            <button
              onClick={() => {
                setTimerActive(false);
                onFocusComplete(25); // Trigger instant completion reward!
                configureTimer('study');
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-xl cursor-pointer shadow-md text-xs transition-all hover:scale-105 active:scale-95 tracking-wide border border-amber-400"
              title="Instantly complete focus and earn reward!"
            >
              <Award className="w-4 h-4 animate-bounce" />
              Finish Focus
            </button>
          )}
        </div>

        {/* Live Pet Speech Advice Bubble */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex gap-3 items-start relative select-none">
          <MessageCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed font-sans italic">
            "{bubbleText}"
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Procedural Audio Generator Mixer */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zero-RAM Ambient Synthesizer</h3>
            <button
              onClick={handleMuteAll}
              className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <VolumeX className="w-3 h-3" /> Stop All Synthesizers
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={toggleRain}
              className={`py-2 px-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                rainOn 
                  ? 'bg-slate-800 border-indigo-500 text-indigo-400 scale-[1.02]' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              <span className="text-[10px] font-bold">Rain Stream</span>
            </button>

            <button
              onClick={toggleCampfire}
              className={`py-2 px-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                campfireOn 
                  ? 'bg-slate-800 border-orange-500 text-orange-400 scale-[1.02]' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span className="text-[10px] font-bold">Campfire Crackle</span>
            </button>

            <button
              onClick={toggleBreeze}
              className={`py-2 px-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-center ${
                breezeOn 
                  ? 'bg-slate-800 border-emerald-500 text-emerald-400 scale-[1.02]' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <Wind className="w-4 h-4" />
              <span className="text-[10px] font-bold">Whisper Wind</span>
            </button>
          </div>

          {/* Individual Mixer Vol Slider */}
          <div className="flex items-center gap-2 mt-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Synth Power</span>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={ambientVolume}
              onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 font-mono">{Math.round(ambientVolume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Focus Goals List */}
      <div className="space-y-2 mt-5 relative z-10 select-none">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-400" /> Focus Goals checklist
          </h3>
          <span className="text-[10px] text-slate-500">+{tasks.filter((t) => t.completed).length * 10} Love Boost</span>
        </div>

        <form onSubmit={handleAddTask} className="flex gap-1">
          <input
            type="text"
            placeholder="Add a fast focus goal..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="space-y-1.5 max-h-24 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition-all ${
                task.completed 
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-400' 
                  : 'bg-slate-950 border-slate-850 text-slate-200'
              }`}
            >
              <div 
                onClick={() => handleToggleTask(task.id)} 
                className="flex items-center gap-2 cursor-pointer flex-1 truncate select-none text-[11px]"
              >
                <div
                  className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all ${
                    task.completed 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {task.completed && <Check className="w-3 h-3 block" />}
                </div>
                <span className={task.completed ? 'line-through decoration-slate-600 text-slate-500' : ''}>
                  {task.text}
                </span>
              </div>
              <button
                maxLength={4}
                onClick={() => handleDeleteTask(task.id)}
                className="p-1 text-slate-500 hover:text-rose-450 rounded hover:bg-slate-900 transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-2 text-xs text-slate-600 italic">No remaining session goals. Yay!</div>
          )}
        </div>
      </div>
    </div>
  );
}
