import { SettingsSystem } from './SettingsSystem';

type OscType = OscillatorType;

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicOscs: OscillatorNode[] = [];
let musicTimer: number | null = null;
let musicPlaying = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

// ── Utility ──────────────────────────────────────────────

function playTone(
  freq: number,
  duration: number,
  type: OscType = 'square',
  volume = 0.15,
  delay = 0
): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

function playNoise(duration: number, volume = 0.08): void {
  const ac = getCtx();
  const bufferSize = Math.round(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

// ── Music sequencer ──────────────────────────────────────

// Pentatonic notes in different octaves for calm puzzle music
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0]; // C4 D4 E4 G4 A4
const BASS = [130.81, 146.83, 164.81, 196.0]; // C3 D3 E3 G3

function startMusicLoop(): void {
  if (musicPlaying) return;
  const ac = getCtx();

  musicGain = ac.createGain();
  musicGain.gain.value = 0.06;
  musicGain.connect(ac.destination);

  musicPlaying = true;
  let step = 0;
  const bpm = 100;
  const interval = (60 / bpm) * 1000; // ms per beat

  const tick = (): void => {
    if (!musicPlaying || !musicGain) return;
    const ac2 = getCtx();
    const now = ac2.currentTime;

    // Bass: every 4 beats
    if (step % 4 === 0) {
      const osc = ac2.createOscillator();
      const g = ac2.createGain();
      osc.type = 'triangle';
      osc.frequency.value = BASS[Math.floor(step / 4) % BASS.length];
      g.gain.setValueAtTime(0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(g);
      g.connect(musicGain!);
      osc.start(now);
      osc.stop(now + 0.55);
      musicOscs.push(osc);
    }

    // Melody: every beat, pick from pentatonic scale with some rests
    if (step % 2 === 0 || Math.random() > 0.4) {
      const osc = ac2.createOscillator();
      const g = ac2.createGain();
      osc.type = 'square';
      const noteIdx = (step * 3 + Math.floor(step / 3)) % SCALE.length;
      osc.frequency.value = SCALE[noteIdx];
      const vol = 0.04 + Math.random() * 0.02;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(g);
      g.connect(musicGain!);
      osc.start(now);
      osc.stop(now + 0.3);
      musicOscs.push(osc);
    }

    step++;
    // Clean up stopped oscillators
    musicOscs = musicOscs.filter((o) => {
      try { o.frequency.value; return true; } catch { return false; }
    });
  };

  tick();
  musicTimer = window.setInterval(tick, interval);
}

function stopMusicLoop(): void {
  musicPlaying = false;
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  for (const osc of musicOscs) {
    try { osc.stop(); } catch { /* already stopped */ }
  }
  musicOscs = [];
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

// ── Public API ───────────────────────────────────────────

export class AudioSystem {
  /** Ensure AudioContext is created (call on first user gesture). */
  static unlock(): void {
    getCtx();
  }

  // ── Sound effects ──

  static bridgePlace(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(660, 0.08, 'square', 0.1);
    playNoise(0.04, 0.05);
  }

  static bridgeDouble(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(660, 0.06, 'square', 0.08);
    playTone(880, 0.08, 'square', 0.1, 0.06);
  }

  static bridgeRemove(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(440, 0.12, 'sawtooth', 0.08);
    playTone(330, 0.15, 'sawtooth', 0.06, 0.05);
  }

  static selectIsland(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(523, 0.05, 'sine', 0.08);
  }

  static error(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(200, 0.15, 'square', 0.1);
    playTone(160, 0.2, 'square', 0.08, 0.08);
  }

  static hint(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(784, 0.1, 'sine', 0.12);
    playTone(988, 0.12, 'sine', 0.1, 0.1);
    playTone(1175, 0.15, 'sine', 0.08, 0.2);
  }

  static victory(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      playTone(f, 0.2, 'square', 0.1, i * 0.12);
      playTone(f * 0.5, 0.25, 'triangle', 0.06, i * 0.12);
    });
  }

  static buttonClick(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(440, 0.04, 'sine', 0.06);
  }

  static undo(): void {
    if (!SettingsSystem.isSoundEnabled()) return;
    playTone(330, 0.08, 'triangle', 0.08);
  }

  // ── Music ──

  static startMusic(): void {
    if (!SettingsSystem.isMusicEnabled()) return;
    startMusicLoop();
  }

  static stopMusic(): void {
    stopMusicLoop();
  }

  static updateMusicState(): void {
    if (SettingsSystem.isMusicEnabled()) {
      if (!musicPlaying) startMusicLoop();
    } else {
      stopMusicLoop();
    }
  }
}
