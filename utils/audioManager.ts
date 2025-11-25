

// ... existing imports and classes

// ... AudioVoice class definition ...

// ... SCALE_BASS, SCALE_ARP constants ...

// ... start of AudioManager class ...
// (No changes until methods)

import { TetrominoType } from '../types';

class AudioVoice {
    public osc: OscillatorNode;
    public gain: GainNode;
    public panner: StereoPannerNode;
    public active: boolean = false;
    public busyUntil: number = 0;

    constructor(ctx: AudioContext, dest: AudioNode) {
        this.osc = ctx.createOscillator();
        this.gain = ctx.createGain();
        this.panner = ctx.createStereoPanner();

        // Wire up
        this.osc.connect(this.gain);
        this.gain.connect(this.panner);
        this.panner.connect(dest);

        // Start immediately, control via gain
        this.osc.start();
        this.gain.gain.value = 0;
    }
}

// Musical Scales (C Minor Pentatonic / Dorian feel)
const SCALE_BASS = [65.41, 77.78, 87.31, 98.00, 116.54]; // C2, Eb2, F2, G2, Bb2
const SCALE_ARP = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25]; // C4...

class AudioManager {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public musicGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  public uiGain: GainNode | null = null;
  
  // Reverb Nodes
  public convolver: ConvolverNode | null = null;
  public dryGain: GainNode | null = null;
  public wetGain: GainNode | null = null;

  public lowPassFilter: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: Uint8Array | null = null;
  public noiseBuffer: AudioBuffer | null = null;

  // Voice Pools
  private sfxPool: AudioVoice[] = [];
  private uiPool: AudioVoice[] = [];
  private readonly POOL_SIZE = 16;

  // Music Scheduler State
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private isPlayingMusic: boolean = false;
  
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  private tempo: number = 120;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private schedulerTimer: number | null = null;
  
  // Beat Tracking
  private lastBeatTime: number = 0;
  private beatInterval: number = 0;
  
  // Dynamic Music State
  private intensity: number = 0; // 0.0 to 1.0
  private bassNoteIndex: number = 0;

  private initializationAttempted: boolean = false;
  private isSupported: boolean = true;
  
  private _masterVolume: number = 0.6;
  private _musicVolume: number = 0.5;
  private _sfxVolume: number = 0.7;
  private _uiVolume: number = 0.6;

  constructor() {}

  init(): void {
    if (this.initializationAttempted) {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.debug("[Reliability] Audio resume prevented by policy", e));
        }
        return;
    }
    this.initializationAttempted = true;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
            console.warn("[Reliability] Web Audio API not supported.");
            this.isSupported = false;
            return;
        }

        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
        
        // Master Chain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this._masterVolume;

        this.lowPassFilter = this.ctx.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = 22000;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Reverb Chain
        this.convolver = this.ctx.createConvolver();
        this.dryGain = this.ctx.createGain();
        this.wetGain = this.ctx.createGain();
        
        // Create Impulse Response for Reverb
        this.generateImpulseResponse();

        this.dryGain.gain.value = 0.8;
        this.wetGain.gain.value = 0.3;

        // Routing: Master -> LPF -> (Split Reverb) -> Analyser -> Dest
        this.masterGain.connect(this.lowPassFilter);
        
        // Split signal after Filter
        this.lowPassFilter.connect(this.dryGain);
        this.lowPassFilter.connect(this.convolver);
        
        this.convolver.connect(this.wetGain);
        
        this.dryGain.connect(this.analyser);
        this.wetGain.connect(this.analyser);
        
        this.analyser.connect(this.ctx.destination);

        // Submixes
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this._musicVolume;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this._sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.uiGain = this.ctx.createGain();
        this.uiGain.gain.value = this._uiVolume;
        this.uiGain.connect(this.masterGain);

        // Initialize Pools
        this.createNoiseBuffer();
        this.initPools();
        
        this.setupUnlockListeners();

    } catch (e) {
        console.error("[Reliability] AudioContext Initialization Failed:", e);
        this.isSupported = false;
        this.ctx = null;
    }
  }

  private generateImpulseResponse() {
      if (!this.ctx || !this.convolver) return;
      
      const rate = this.ctx.sampleRate;
      const length = rate * 1.5; // 1.5 seconds tail
      const decay = 2.0;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
          // Simple noise with exponential decay
          const n = i / length;
          left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
          right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      }
      
      this.convolver.buffer = impulse;
  }

  // Robust unlocking strategy for modern browsers
  private setupUnlockListeners() {
      const unlock = () => {
          this.unlockAudio();
      };

      const events = ['touchstart', 'touchend', 'click', 'keydown'];
      events.forEach(evt => 
          document.addEventListener(evt, unlock, { once: true, passive: true })
      );
  }

  public unlockAudio() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
              console.log("[Audio] Context unlocked/resumed via interaction.");
          }).catch(e => console.debug("[Audio] Auto-resume failed", e));
      } else if (!this.ctx && !this.initializationAttempted) {
          this.init();
      }
  }

  private initPools() {
      if (!this.ctx || !this.sfxGain || !this.uiGain) return;
      try {
          for (let i = 0; i < this.POOL_SIZE; i++) {
              this.sfxPool.push(new AudioVoice(this.ctx, this.sfxGain));
              this.uiPool.push(new AudioVoice(this.ctx, this.uiGain));
          }
      } catch (e) { console.error("[Reliability] Voice Pool Init Failed:", e); }
  }

  private getVoice(pool: AudioVoice[]): AudioVoice | null {
      if (!this.ctx) return null;
      const now = this.ctx.currentTime;
      let voice = pool.find(v => !v.active && now > v.busyUntil);
      if (!voice) {
          if (pool.length === 0) return null;
          voice = pool.reduce((prev, curr) => (prev.busyUntil < curr.busyUntil ? prev : curr));
          try { 
              voice.gain.gain.cancelScheduledValues(now); 
              voice.gain.gain.setValueAtTime(0, now); 
          } catch(e) {}
      }
      return voice;
  }

  private createNoiseBuffer(): void {
      if (!this.ctx || this.noiseBuffer) return;
      try {
          const bufferSize = this.ctx.sampleRate * 2; 
          this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }
      } catch(e) { console.error("[Reliability] Noise Buffer Init Failed:", e); }
  }

  // --- Properties ---

  setMasterVolume(val: number) {
      this._masterVolume = val;
      if (this.masterGain && this.ctx) {
          const now = this.ctx.currentTime;
          try { 
              this.masterGain.gain.cancelScheduledValues(now);
              this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
              this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : val, now + 0.1); 
          } catch(e) {}
      }
  }

  setMusicVolume(val: number) {
      this._musicVolume = val;
      if (this.musicGain && this.ctx) {
          const now = this.ctx.currentTime;
          try { 
              this.musicGain.gain.cancelScheduledValues(now);
              this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
              this.musicGain.gain.linearRampToValueAtTime(val, now + 0.1); 
          } catch(e) {}
      }
  }

  setSfxVolume(val: number) {
      this._sfxVolume = val;
      if (this.sfxGain && this.ctx) {
          try { this.sfxGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1); } catch(e) {}
      }
  }

  setUiVolume(val: number) {
      this._uiVolume = val;
      if (this.uiGain && this.ctx) {
          try { this.uiGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1); } catch(e) {}
      }
  }

  toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.masterGain && this.ctx) {
          const now = this.ctx.currentTime;
          try { 
              this.masterGain.gain.cancelScheduledValues(now);
              this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
              this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this._masterVolume, now + 0.1); 
          } catch(e) {}
      }
  }

  setMusicEnabled(enabled: boolean) {
      this.musicEnabled = enabled;
      if (enabled && !this.isPlayingMusic) this.startMusic();
      if (!enabled && this.isPlayingMusic) this.stopMusic();
  }

  setLowPass(freq: number) {
      if (this.lowPassFilter && this.ctx) {
          try { this.lowPassFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.2); } catch(e) {}
      }
  }

  setIntensity(val: number) {
      this.intensity = Math.max(0, Math.min(1, val));
  }

  setTempo(bpm: number) {
      this.tempo = Math.max(60, Math.min(200, bpm));
  }

  getFrequencyData(): Uint8Array | null {
      if (this.analyser && this.dataArray) {
          try {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
          } catch (e) { return null; }
      }
      return null;
  }

  getEnergy(): number {
      if (!this.dataArray) return 0;
      let sum = 0;
      for(let i=0; i<8; i++) sum += this.dataArray[i];
      return sum / (8 * 255);
  }

  // --- Beat Detection API ---
  public isOnBeat(): boolean {
      if (!this.ctx || !this.isPlayingMusic) return false;
      
      // Tolerance window (e.g. +/- 100ms)
      const tolerance = 0.1; 
      const now = this.ctx.currentTime;
      
      // Check distance to closest beat
      const timeSinceLast = now - this.lastBeatTime;
      const timeToNext = (this.lastBeatTime + this.beatInterval) - now;
      
      // We are on beat if we are just after the last one, or just before the next one
      return (timeSinceLast < tolerance) || (timeToNext < tolerance);
  }
  
  public getPulseFactor(): number {
      if (!this.ctx || !this.isPlayingMusic) return 0;
      // Returns a value 0 to 1 pulsing with the beat
      const now = this.ctx.currentTime;
      const timeSinceLast = now - this.lastBeatTime;
      const progress = (timeSinceLast / this.beatInterval) % 1;
      // Triangle wave pulse
      return Math.max(0, 1 - (progress * 4)); // Quick fade out
  }

  // --- Music Sequencer ---

  startMusic() {
      if (this.isPlayingMusic || !this.isSupported || !this.musicEnabled || !this.ctx) return;
      
      if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
      
      try {
          const now = this.ctx.currentTime;
          this.musicGain?.gain.cancelScheduledValues(now);
          this.musicGain?.gain.setValueAtTime(0, now);
          this.musicGain?.gain.linearRampToValueAtTime(this._musicVolume, now + 1.0);
      } catch(e) {}

      this.isPlayingMusic = true;
      this.current16thNote = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      // Initial beat tracking setup
      this.lastBeatTime = this.nextNoteTime;
      this.beatInterval = 60.0 / this.tempo;
      
      this.scheduler();
  }

  stopMusic() {
      if (!this.ctx) {
          this.isPlayingMusic = false;
          if (this.schedulerTimer) window.clearTimeout(this.schedulerTimer);
          return;
      }

      const now = this.ctx.currentTime;
      try {
          this.musicGain?.gain.cancelScheduledValues(now);
          this.musicGain?.gain.setValueAtTime(this.musicGain.gain.value, now);
          this.musicGain?.gain.linearRampToValueAtTime(0, now + 0.5);
      } catch(e) {}

      setTimeout(() => {
          this.isPlayingMusic = false;
          if (this.schedulerTimer) {
              window.clearTimeout(this.schedulerTimer);
              this.schedulerTimer = null;
          }
      }, 500);
  }

  private scheduler() {
      if (!this.ctx || !this.isPlayingMusic) return;

      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.advanceNote();
      }
      
      this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private advanceNote() {
      const secondsPerBeat = 60.0 / this.tempo;
      // Note: beatInterval tracks Quarter Notes (4 16th notes)
      this.beatInterval = secondsPerBeat;
      
      if (this.current16thNote % 4 === 0) {
          // This is a beat (quarter note)
          this.lastBeatTime = this.nextNoteTime;
      }

      this.nextNoteTime += 0.25 * secondsPerBeat;
      this.current16thNote++;
      if (this.current16thNote === 16) {
          this.current16thNote = 0;
      }
  }

  private scheduleNote(beatNumber: number, time: number) {
      if (!this.ctx || !this.musicGain) return;

      if (this.intensity > 0.1 && beatNumber % 4 === 0) {
          this.playKick(time);
      }

      if (this.intensity > 0.3) {
          if (beatNumber % 2 === 0) {
              this.playHiHat(time, beatNumber % 4 === 2 ? 0.3 : 0.1);
          } else if (this.intensity > 0.6) {
              this.playHiHat(time, 0.05);
          }
      } else {
          if (beatNumber % 4 === 2) this.playHiHat(time, 0.1);
      }

      if (beatNumber % 4 === 2 || (this.intensity > 0.7 && beatNumber % 4 === 3)) {
          const note = SCALE_BASS[Math.floor(Math.random() * SCALE_BASS.length)];
          this.playBass(time, note, 0.3);
      }

      if (this.intensity > 0.5) {
          if (Math.random() < this.intensity * 0.7) {
              const note = SCALE_ARP[Math.floor(Math.random() * SCALE_ARP.length)];
              this.playArp(time, note, 0.1);
          }
      }
  }

  private playKick(time: number) {
      if (!this.ctx || !this.musicGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
      } catch(e) {}
  }

  private playHiHat(time: number, vol: number) {
      if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        const gain = this.ctx.createGain();
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        gain.gain.setValueAtTime(vol * (0.5 + Math.random() * 0.5), time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        src.start(time);
        src.stop(time + 0.05);
      } catch(e) {}
  }

  private playBass(time: number, freq: number, duration: number) {
      if (!this.ctx || !this.musicGain) return;
      try {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const cutoff = 200 + (this.intensity * 2000); 
        filter.frequency.setValueAtTime(cutoff, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);
        const gain = this.ctx.createGain();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      } catch(e) {}
  }

  private playArp(time: number, freq: number, duration: number) {
      if (!this.ctx || !this.musicGain) return;
      try {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const gain = this.ctx.createGain();
        const pan = this.ctx.createStereoPanner();
        pan.pan.value = (Math.random() * 2) - 1;
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(this.musicGain);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      } catch(e) {}
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number, volume: number, pool: AudioVoice[], pan: number = 0) {
      if (!this.ctx || !this.isSupported) return;
      
      // Auto-resume for robust mobile support if tone is triggered before interaction
      if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
      
      const voice = this.getVoice(pool);
      if (!voice) return;

      try {
          const safeStartTime = Math.max(this.ctx.currentTime, startTime);
          voice.active = true;
          voice.busyUntil = safeStartTime + duration + 0.05;
          voice.osc.type = type;
          voice.osc.frequency.setValueAtTime(freq, safeStartTime);
          voice.panner.pan.setValueAtTime(pan, safeStartTime);
          voice.gain.gain.cancelScheduledValues(safeStartTime);
          voice.gain.gain.setValueAtTime(0, safeStartTime);
          voice.gain.gain.linearRampToValueAtTime(volume, safeStartTime + 0.01); 
          voice.gain.gain.exponentialRampToValueAtTime(0.001, safeStartTime + duration); 
          setTimeout(() => { voice.active = false; }, duration * 1000 + 100);
      } catch (e) { voice.active = false; }
  }

  private playNoise(duration: number, startTime: number, volume: number, output: GainNode | null, pan: number = 0) {
      if (!this.ctx || !output || !this.noiseBuffer || !this.isSupported) return;
      try {
          const src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const gain = this.ctx.createGain();
          const panner = this.ctx.createStereoPanner();
          const safeStartTime = Math.max(this.ctx.currentTime, startTime);
          gain.gain.setValueAtTime(volume, safeStartTime);
          gain.gain.exponentialRampToValueAtTime(0.01, safeStartTime + duration);
          panner.pan.value = pan;
          src.connect(gain);
          gain.connect(panner);
          panner.connect(output);
          src.start(safeStartTime);
          src.stop(safeStartTime + duration);
      } catch (e) {}
  }

  stopAllSounds() {
      this.stopMusic();
      if(this.ctx) {
          try {
              this.masterGain?.gain.cancelScheduledValues(this.ctx.currentTime);
              this.masterGain?.gain.setValueAtTime(0, this.ctx.currentTime);
              setTimeout(() => {
                  if(this.masterGain && this.ctx) {
                      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this._masterVolume, this.ctx.currentTime + 0.1);
                  }
              }, 50);
          } catch(e) {}
      }
  }

  public playPerfectDrop(pan: number) {
      if (this.ctx) {
          const t = this.ctx.currentTime;
          this.playTone(880, 'sine', 0.4, t, 0.4, this.sfxPool, pan);
          this.playTone(1760, 'sine', 0.4, t + 0.05, 0.2, this.sfxPool, pan);
          // Resonant Bass Impact
          this.playTone(55, 'triangle', 0.5, t, 0.5, this.sfxPool, 0);
      }
  }

  playUiHover() { if(this.ctx) this.playTone(400, 'sine', 0.05, this.ctx.currentTime, 0.1, this.uiPool); }
  playUiClick() { if(this.ctx) this.playTone(600, 'triangle', 0.05, this.ctx.currentTime, 0.2, this.uiPool); }
  playUiSelect() { if(this.ctx) { const t = this.ctx.currentTime; this.playTone(800, 'sine', 0.1, t, 0.2, this.uiPool); this.playTone(1200, 'sine', 0.1, t+0.05, 0.1, this.uiPool); } }
  playUiBack() { if(this.ctx) this.playTone(300, 'sine', 0.1, this.ctx.currentTime, 0.2, this.uiPool); }
  playMove(pan=0) { if(this.ctx) this.playTone(300, 'square', 0.05, this.ctx.currentTime, 0.1, this.sfxPool, pan); }
  playRotate(pan=0) { if(this.ctx) this.playTone(400, 'triangle', 0.08, this.ctx.currentTime, 0.15, this.sfxPool, pan); }
  playHardDrop(pan=0) { if(this.ctx) { const t = this.ctx.currentTime; this.playTone(150, 'sawtooth', 0.1, t, 0.3, this.sfxPool, pan); this.playNoise(0.1, t, 0.2, this.sfxGain, pan); } }
  playLock(pan=0, type?: TetrominoType) { if(this.ctx) { const t = this.ctx.currentTime; this.playTone(200, 'square', 0.1, t, 0.3, this.sfxPool, pan); this.playNoise(0.05, t, 0.2, this.sfxGain, pan); } }
  playSoftLand(pan=0) { if(this.ctx) this.playTone(100, 'sine', 0.05, this.ctx.currentTime, 0.2, this.sfxPool, pan); }
  playTSpin() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(800,'sine',0.3,t,0.3,this.sfxPool); this.playTone(1200,'square',0.3,t,0.1,this.sfxPool); } }
  playClear(lines: number) { if(this.ctx) { const t=this.ctx.currentTime; const freqs=[440,554,659,880]; for(let i=0; i<lines; i++) this.playTone(freqs[i%4],'triangle',0.3,t+i*0.05,0.3+(lines*0.1),this.sfxPool); if(lines>=4) this.playNoise(0.5,t,0.3,this.sfxGain); } }
  playGameOver() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(300,'sawtooth',1.0,t,0.5,this.sfxPool); this.playTone(200,'sawtooth',1.0,t+0.5,0.5,this.sfxPool); this.playTone(100,'sawtooth',2.0,t+1.0,0.5,this.sfxPool); } }
  playFrenzyStart() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(200,'sawtooth',1.0,t,0.3,this.sfxPool); this.playTone(1000,'sine',1.0,t,0.3,this.sfxPool); } }
  playFrenzyEnd() { if(this.ctx) this.playTone(300,'sine',0.5,this.ctx.currentTime,0.3,this.sfxPool); }
  playZoneStart() { if(this.ctx) { this.setLowPass(400); const t=this.ctx.currentTime; this.playTone(50,'sawtooth',1.5,t,0.5,this.sfxPool); } }
  playZoneEnd() { if(this.ctx) { this.setLowPass(22000); const t=this.ctx.currentTime; this.playTone(800,'sine',0.5,t,0.3,this.sfxPool); } }
  playZoneClear() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(1000,'square',0.2,t,0.2,this.sfxPool); } }
  playWildcardSpawn() { if(this.ctx) this.playTone(1500,'sine',0.3,this.ctx.currentTime,0.2,this.sfxPool); }
  playLaserClear() { if(this.ctx) this.playTone(800,'sawtooth',0.3,this.ctx.currentTime,0.3,this.sfxPool); }
  playNukeClear() { if(this.ctx) this.playNoise(1.5,this.ctx.currentTime,0.8,this.sfxGain); }
  playNukeSpawn() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(400,'square',0.5,t,0.3,this.sfxPool); this.playTone(300,'square',0.5,t+0.2,0.3,this.sfxPool); } }
  playBombBoosterActivate() { if(this.ctx) this.playTone(200,'sawtooth',0.5,this.ctx.currentTime,0.3,this.sfxPool); }
  playLineClearerActivate() { if(this.ctx) this.playTone(1200,'sine',0.5,this.ctx.currentTime,0.3,this.sfxPool); }
  playBlitzSpeedUp() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(600,'sine',0.2,t,0.3,this.sfxPool); this.playTone(800,'sine',0.2,t+0.1,0.3,this.sfxPool); } }
  playFlippedGravityActivate() { if(this.ctx) this.playTone(100,'sawtooth',0.5,this.ctx.currentTime,0.3,this.sfxPool); }
  playFlippedGravityEnd() { if(this.ctx) this.playTone(600,'sawtooth',0.5,this.ctx.currentTime,0.3,this.sfxPool); }
  playLevelUp() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(440,'sine',0.1,t,0.3,this.sfxPool); this.playTone(554,'sine',0.1,t+0.1,0.3,this.sfxPool); this.playTone(659,'sine',0.3,t+0.2,0.3,this.sfxPool); } }
  playCountdown() { if(this.ctx) { const t=this.ctx.currentTime; this.playTone(660,'square',0.1,t,0.3,this.sfxPool); this.playTone(880,'sine',0.4,t,0.1,this.sfxPool); } }
}

export const audioManager = new AudioManager();
