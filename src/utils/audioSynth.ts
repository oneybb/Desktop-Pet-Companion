/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Audio Synthesizer using Web Audio API
// This allows continuous, infinite high-quality ambient sound generation with:
// - ZERO assets to download (0 bytes size / zero download time!)
// - Extremely low CPU and RAM footprint compared to streaming or buffering massive MP3s
// - Full offline capabilities

let audioCtx: AudioContext | null = null;

// Node tracking
interface SoundNodes {
  source: AudioNode | null;
  gainNode: GainNode | null;
  filters: AudioNode[];
  intervalId?: any;
}

const activeSounds: Record<string, SoundNodes> = {
  rain: { source: null, gainNode: null, filters: [] },
  campfire: { source: null, gainNode: null, filters: [] },
  breeze: { source: null, gainNode: null, filters: [] },
};

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper to generate a Buffer of White Noise
function createWhiteNoiseBuffer(ctx: AudioContext, seconds: number = 2): AudioBuffer {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// 1. Procedural Rain: White noise shaped with several lowpass filters to sound like soft drops
export function startRain(volume: number) {
  try {
    const ctx = getAudioContext();
    if (activeSounds.rain.source) return;

    const noise = ctx.createBufferSource();
    noise.buffer = createWhiteNoiseBuffer(ctx, 4);
    noise.loop = true;

    // Filter to make it sound like deep rain
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 450;
    bandpass.Q.value = 0.8;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    // Connect nodes
    noise.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();

    activeSounds.rain = {
      source: noise,
      gainNode,
      filters: [lowpass, bandpass],
    };
  } catch (err) {
    console.warn('Could not start synthesized rain: ', err);
  }
}

export function stopRain() {
  const rain = activeSounds.rain;
  if (rain.source) {
    try {
      (rain.source as AudioBufferSourceNode).stop();
      rain.source.disconnect();
    } catch {}
    rain.source = null;
  }
  if (rain.gainNode) {
    rain.gainNode.disconnect();
    rain.gainNode = null;
  }
  rain.filters = [];
}

// 2. Procedural Campfire: Soft deep rumble (filtered white noise) with intermittent crackling impulses
export function startCampfire(volume: number) {
  try {
    const ctx = getAudioContext();
    if (activeSounds.campfire.source) return;

    // Low rumble (represented by highly filtered noise)
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = createWhiteNoiseBuffer(ctx, 3);
    rumbleSource.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 150;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.45;

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);

    // Final mixer gain Node
    const mainGainNode = ctx.createGain();
    mainGainNode.gain.value = volume;

    rumbleGain.connect(mainGainNode);
    mainGainNode.connect(ctx.destination);
    rumbleSource.start();

    // Crackle trigger loop - triggers dry crackles periodically
    const triggerCrackles = () => {
      if (!audioCtx || audioCtx.state === 'suspended' || !activeSounds.campfire.source) return;
      
      // Schedule standard tiny pop
      const popCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < popCount; i++) {
        const delay = Math.random() * 0.4;
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(800 + Math.random() * 2000, ctx.currentTime + delay);
        
        popGain.gain.setValueAtTime(0, ctx.currentTime);
        popGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.12, ctx.currentTime + delay + 0.001);
        popGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.03);
        
        popOsc.connect(popGain);
        popGain.connect(mainGainNode);
        
        popOsc.start(ctx.currentTime + delay);
        popOsc.stop(ctx.currentTime + delay + 0.04);
      }
    };

    const intervalId = setInterval(triggerCrackles, 380);

    activeSounds.campfire = {
      source: rumbleSource,
      gainNode: mainGainNode,
      filters: [rumbleFilter],
      intervalId,
    };
  } catch (err) {
    console.warn('Could not start campfire synth: ', err);
  }
}

export function stopCampfire() {
  const campfire = activeSounds.campfire;
  if (campfire.intervalId) {
    clearInterval(campfire.intervalId);
    delete campfire.intervalId;
  }
  if (campfire.source) {
    try {
      (campfire.source as AudioBufferSourceNode).stop();
      campfire.source.disconnect();
    } catch {}
    campfire.source = null;
  }
  if (campfire.gainNode) {
    campfire.gainNode.disconnect();
    campfire.gainNode = null;
  }
  campfire.filters = [];
}

// 3. Procedural Breeze / Wind: White noise shaped with a sweeping bandpass filter and amplitude modulator
export function startBreeze(volume: number) {
  try {
    const ctx = getAudioContext();
    if (activeSounds.breeze.source) return;

    const noise = ctx.createBufferSource();
    noise.buffer = createWhiteNoiseBuffer(ctx, 4);
    noise.loop = true;

    // Sweeping resonance filter representing blowing wind air
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 350;
    windFilter.Q.value = 2.0;

    // An LFO to sweep the frequency back and forth
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08; // 12 seconds per sweep cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180; // sweep +/- 180Hz

    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    noise.connect(windFilter);
    windFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    lfo.start();

    // Keep custom sweep tracking
    activeSounds.breeze = {
      source: noise,
      gainNode,
      filters: [windFilter, lfoGain],
    };
  } catch (err) {
    console.warn('Could not start breeze synth: ', err);
  }
}

export function stopBreeze() {
  const breeze = activeSounds.breeze;
  if (breeze.source) {
    try {
      (breeze.source as AudioBufferSourceNode).stop();
      breeze.source.disconnect();
    } catch {}
    breeze.source = null;
  }
  if (breeze.gainNode) {
    breeze.gainNode.disconnect();
    breeze.gainNode = null;
  }
  breeze.filters = [];
}

// Update runtime volume for any sound source
export function updateAmbientSoundVolume(soundType: 'rain' | 'campfire' | 'breeze', volume: number) {
  const sound = activeSounds[soundType];
  if (sound && sound.gainNode) {
    sound.gainNode.gain.setValueAtTime(volume, audioCtx ? audioCtx.currentTime : 0);
  }
}

// Master stop
export function stopAllAmbient() {
  stopRain();
  stopCampfire();
  stopBreeze();
}
