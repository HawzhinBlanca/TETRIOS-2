
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
        this.osc.connect(this.gain);
        this.gain.connect(this.panner);
        this.panner.connect(dest);
        this.osc.start();
        this.gain.gain.value = 0;
    }
}

// Pentatonic Minor Scale (C Minor: C, Eb, F, G, Bb)
const SCALE_BASS = [65.41, 77.78, 87.31, 98.00, 116.54]; // Low C2-Bb2
const SCALE_MELODY = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25]; // Mid C4-Eb5

class AudioManager {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public musicGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  public uiGain: GainNode | null = null;
  
  private bassGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  public lowPassFilter: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: Uint8Array | null = null;

  private sfxPool: AudioVoice[] = [];
  private uiPool: AudioVoice[] = [];
  private readonly POOL_SIZE = 16;

  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private isPlayingMusic: boolean = false;
  
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  private tempo: number = 105; // Slightly slower, groovier
  private lookahead: number = 25.0;
  private scheduleAheadTime: number = 0.1;
  private schedulerTimer: number | null = null;
  
  private intensity: number = 0;
  
  private _masterVolume: number = 0.6;
  private _musicVolume: number = 0.4; 
  private _sfxVolume: number = 0.7;
  private _uiVolume: number = 0.6;

  constructor() {}

  init(): void {
    if (this.ctx && this.ctx.state === 'running') return;
    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        return;
    }

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this._masterVolume;

        this.lowPassFilter = this.ctx.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = 20000;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.masterGain.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this._musicVolume;
        this.musicGain.connect(this.masterGain);

        this.bassGain = this.ctx.createGain();
        this.arpGain = this.ctx.createGain();
        this.droneGain = this.ctx.createGain();
        this.bassGain.connect(this.musicGain);
        this.arpGain.connect(this.musicGain);
        this.droneGain.connect(this.musicGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this._sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.uiGain = this.ctx.createGain();
        this.uiGain.gain.value = this._uiVolume;
        this.uiGain.connect(this.masterGain);

        this.initPools();
        this.startDrone();
        
        const resumeAudio = () => { if (this.ctx?.state === 'suspended') this.ctx.resume(); };
        ['click', 'touchstart', 'keydown'].forEach(evt => window.addEventListener(evt, resumeAudio, { once: true }));

    } catch (e) {
        console.error("Audio init failed:", e);
    }
  }

  updateDynamicMix(stats: { dangerLevel: number, comboCount: number, isZoneActive: boolean, isFrenzy: boolean }) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const bassVol = Math.min(0.7, stats.comboCount / 10 + 0.3);
      this.bassGain?.gain.setTargetAtTime(bassVol, t, 2);

      const arpVol = stats.isFrenzy || stats.isZoneActive ? 0.6 : 0.2;
      this.arpGain?.gain.setTargetAtTime(arpVol, t, 1);

      const droneVol = Math.max(0.05, stats.dangerLevel * 0.3);
      this.droneGain?.gain.setTargetAtTime(droneVol, t, 2);
      
      if (this.droneOsc) {
          this.droneOsc.frequency.setTargetAtTime(55 + (stats.dangerLevel * 55), t, 5);
      }

      const freq = stats.dangerLevel > 0.8 ? 1000 : 20000;
      this.lowPassFilter?.frequency.setTargetAtTime(freq, t, 0.5);
      
      this.intensity = stats.dangerLevel;
  }

  private startDrone() {
      if (!this.ctx || !this.droneGain) return;
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sine';
      this.droneOsc.frequency.value = 55;
      this.droneOsc.connect(this.droneGain);
      this.droneOsc.start();
      this.droneGain.gain.value = 0; 
  }

  private initPools() {
      if (!this.ctx || !this.sfxGain || !this.uiGain) return;
      for(let i=0; i<this.POOL_SIZE; i++) {
          this.sfxPool.push(new AudioVoice(this.ctx, this.sfxGain));
          this.uiPool.push(new AudioVoice(this.ctx, this.uiGain));
      }
  }

  private getVoice(pool: AudioVoice[]): AudioVoice | null {
      const now = this.ctx?.currentTime || 0;
      for(let i=0; i<pool.length; i++) {
          if (!pool[i].active && now > pool[i].busyUntil) {
              return pool[i];
          }
      }
      return null;
  }
  
  setMasterVolume(val: number) { this._masterVolume = val; if(this.masterGain) this.masterGain.gain.value = this.isMuted ? 0 : val; }
  setMusicVolume(val: number) { this._musicVolume = val; if(this.musicGain) this.musicGain.gain.value = val; }
  setSfxVolume(val: number) { this._sfxVolume = val; if(this.sfxGain) this.sfxGain.gain.value = val; }
  setUiVolume(val: number) { this._uiVolume = val; if(this.uiGain) this.uiGain.gain.value = val; }
  
  toggleMute() { 
      this.isMuted = !this.isMuted; 
      if(this.masterGain) {
          this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this._masterVolume, this.ctx?.currentTime || 0, 0.1);
      } 
  }
  
  setMusicEnabled(enabled: boolean) { 
      this.musicEnabled = enabled; 
      if(enabled && !this.isPlayingMusic) this.startMusic(); 
      else if(!enabled) this.stopMusic(); 
  }
  
  setLowPass(freq: number) { 
      if(this.lowPassFilter && this.ctx) {
          this.lowPassFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.5);
      } 
  }
  
  getEnergy(): number {
      const data = this.getFrequencyData();
      if (!data) return 0;
      let sum = 0;
      for(let i=0; i<10; i++) sum += data[i]; // Low freqs
      return sum / (10 * 255);
  }
  
  getFrequencyData(): Uint8Array | null { 
      if(this.analyser && this.dataArray) { 
          this.analyser.getByteFrequencyData(this.dataArray); 
          return this.dataArray; 
      } 
      return null; 
  }

  isOnBeat(): boolean { 
      if (!this.ctx) return false;
      const beatLen = 60 / this.tempo;
      const diff = (this.ctx.currentTime % beatLen);
      return diff < 0.1; 
  }
  
  getPulseFactor(): number {
      if (!this.ctx) return 0;
      const beatLen = 60 / this.tempo;
      const progress = (this.ctx.currentTime % beatLen) / beatLen;
      return Math.pow(1 - progress, 2);
  }
  
  startMusic() { 
      if (this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.isPlayingMusic = true;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }
  
  stopMusic() { this.isPlayingMusic = false; }
  
  private scheduler() { 
      if(!this.isPlayingMusic || !this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.nextNote();
      }
      this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote() {
      const secondsPerBeat = 60.0 / this.tempo;
      this.nextNoteTime += 0.25 * secondsPerBeat; 
      this.current16thNote = (this.current16thNote + 1) % 16;
  }

  private scheduleNote(beatNumber: number, time: number) {
      if (!this.ctx || !this.bassGain || !this.arpGain) return;

      // Bass - Root notes on 1, 5
      if (beatNumber === 0 || beatNumber === 8) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle'; // Warmer bass
          osc.connect(gain);
          gain.connect(this.bassGain);
          
          const note = SCALE_BASS[Math.floor(Math.random() * 3)]; // Root, 3rd, 4th
          osc.frequency.value = note;
          
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.3, time + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
          
          osc.start(time);
          osc.stop(time + 1.5);
      }

      // Melody/Arp - Random pentatonic runs
      if (beatNumber % 2 === 0 && Math.random() < 0.4) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine'; // Bell-like
          osc.connect(gain);
          gain.connect(this.arpGain);
          
          const note = SCALE_MELODY[Math.floor(Math.random() * SCALE_MELODY.length)];
          osc.frequency.value = note;
          
          gain.gain.setValueAtTime(0, time);
          gain.gain.exponentialRampToValueAtTime(0.15, time + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
          
          osc.start(time);
          osc.stop(time + 0.5);
      }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number, pan: number, pool: AudioVoice[]) {
      const voice = this.getVoice(pool);
      if (!voice || !this.ctx) return;
      
      const t = this.ctx.currentTime;
      voice.active = true;
      voice.busyUntil = t + duration + 0.1;
      
      voice.osc.type = type;
      voice.osc.frequency.setValueAtTime(freq, t);
      voice.panner.pan.setValueAtTime(pan, t);
      
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(vol, t);
      voice.gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      
      setTimeout(() => { voice.active = false; }, duration * 1000 + 100);
  }

  // Public API proxies...
  playMove(pan=0) { this.playTone(600, 'sine', 0.05, 0.05, pan, this.sfxPool); }
  playRotate(pan=0) { this.playTone(500, 'triangle', 0.08, 0.05, pan, this.sfxPool); }
  playHardDrop(pan=0) { 
      this.playTone(150, 'square', 0.1, 0.1, pan, this.sfxPool);
      this.playTone(50, 'sine', 0.3, 0.2, pan, this.sfxPool); // Kick
  }
  playLock(pan=0, type?: any) { this.playTone(200, 'sawtooth', 0.1, 0.1, pan, this.sfxPool); }
  playSoftLand(pan=0) { this.playTone(120, 'sine', 0.05, 0.1, pan, this.sfxPool); }
  
  playClear(lines: number) {
      const base = 440;
      for(let i=0; i<lines; i++) {
          setTimeout(() => this.playTone(base * (1 + i*0.25), 'triangle', 0.3, 0.2, 0, this.sfxPool), i*50);
      }
  }
  
  playUiHover() { this.playTone(800, 'sine', 0.02, 0.02, 0, this.uiPool); }
  playUiClick() { this.playTone(1200, 'triangle', 0.05, 0.05, 0, this.uiPool); }
  playUiSelect() { this.playTone(1500, 'sine', 0.1, 0.1, 0, this.uiPool); }
  playUiBack() { this.playTone(600, 'square', 0.1, 0.05, 0, this.uiPool); }
  playGameOver() { this.playTone(100, 'sawtooth', 1.0, 0.3, 0, this.sfxPool); }
  
  // Stubs for other methods to satisfy interface
  playTSpin() {}
  playFrenzyStart() {}
  playFrenzyEnd() {}
  playZoneStart() {}
  playZoneEnd() {}
  playZoneClear() {}
  playWildcardSpawn() {}
  playLaserClear() {}
  playNukeClear() {}
  playNukeSpawn() {}
  playBombBoosterActivate() {}
  playLineClearerActivate() {}
  playBlitzSpeedUp() {}
  playFlippedGravityActivate() {}
  playFlippedGravityEnd() {}
  playLevelUp() {}
  playCountdown() {}
  playPerfectDrop(pan: number) {}
}

export const audioManager = new AudioManager();
