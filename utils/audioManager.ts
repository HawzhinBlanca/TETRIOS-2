
import { TetrominoType } from '../types';

// ... existing AudioVoice class ...
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

const SCALE_BASS = [65.41, 77.78, 87.31, 98.00, 116.54];
const SCALE_ARP = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];

class AudioManager {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public musicGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  public uiGain: GainNode | null = null;
  
  // Layer Gains for Adaptive Mixing
  private bassGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  public lowPassFilter: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: Uint8Array | null = null;
  public noiseBuffer: AudioBuffer | null = null;

  private sfxPool: AudioVoice[] = [];
  private uiPool: AudioVoice[] = [];
  private readonly POOL_SIZE = 16;

  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private isPlayingMusic: boolean = false;
  
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  private tempo: number = 120;
  private lookahead: number = 25.0;
  private scheduleAheadTime: number = 0.1;
  private schedulerTimer: number | null = null;
  
  private lastBeatTime: number = 0;
  private beatInterval: number = 0;
  
  private intensity: number = 0;
  private initializationAttempted: boolean = false;
  private isSupported: boolean = true;
  
  private _masterVolume: number = 0.6;
  private _musicVolume: number = 0.5;
  private _sfxVolume: number = 0.7;
  private _uiVolume: number = 0.6;

  constructor() {}

  init(): void {
    if (this.initializationAttempted) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{});
        return;
    }
    this.initializationAttempted = true;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
            this.isSupported = false;
            return;
        }

        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this._masterVolume;

        this.lowPassFilter = this.ctx.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = 22000;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.masterGain.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this._musicVolume;
        this.musicGain.connect(this.masterGain);

        // Setup Adaptive Layers
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

        this.createNoiseBuffer();
        this.initPools();
        this.startDrone();
        
        this.setupUnlockListeners();

    } catch (e) {
        this.isSupported = false;
        this.ctx = null;
    }
  }

  // Adaptive Mixing Method
  updateDynamicMix(stats: { dangerLevel: number, comboCount: number, isZoneActive: boolean, isFrenzy: boolean }) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Bass kicks in with Combo
      const bassVol = Math.min(1, stats.comboCount / 3);
      this.bassGain?.gain.setTargetAtTime(bassVol, t, 2);

      // Arp kicks in with Frenzy or Zone
      const arpVol = stats.isFrenzy || stats.isZoneActive ? 0.8 : 0.3;
      this.arpGain?.gain.setTargetAtTime(arpVol, t, 1);

      // Drone gets louder and higher pitched with Danger
      // Fix: Ensure drone is silent (0) when danger is low to prevent constant tone
      let droneVol = 0;
      if (stats.dangerLevel > 0.1) {
          droneVol = Math.max(0.1, stats.dangerLevel * 0.3);
      }
      this.droneGain?.gain.setTargetAtTime(droneVol, t, 2);
      
      if (this.droneOsc) {
          this.droneOsc.frequency.setTargetAtTime(55 + (stats.dangerLevel * 55), t, 5);
      }

      // Filter closes slightly when in high danger to "muffle" clarity
      const freq = stats.dangerLevel > 0.8 ? 800 : 22000;
      this.lowPassFilter?.frequency.setTargetAtTime(freq, t, 0.5);
      
      this.intensity = stats.dangerLevel;
  }

  private startDrone() {
      if (!this.ctx || !this.droneGain) return;
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 55;
      this.droneOsc.connect(this.droneGain);
      this.droneOsc.start();
      // Fix: Start at 0 volume
      this.droneGain.gain.value = 0; 
  }

  private setupUnlockListeners() {
      const unlock = () => {
          this.unlockAudio();
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock);
      window.addEventListener('keydown', unlock);
      window.addEventListener('touchstart', unlock);
  }

  public unlockAudio() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
      }
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
      // Find free voice
      for(let i=0; i<pool.length; i++) {
          if (!pool[i].active && now > pool[i].busyUntil) {
              return pool[i];
          }
      }
      // Steal oldest? For now just return null if all busy (unlikely with 16)
      return null;
  }

  private createNoiseBuffer() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
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
  
  setIntensity(val: number) { this.intensity = val; }
  setTempo(bpm: number) { this.tempo = bpm; }
  
  getFrequencyData(): Uint8Array | null { 
      if(this.analyser && this.dataArray) { 
          this.analyser.getByteFrequencyData(this.dataArray); 
          return this.dataArray; 
      } 
      return null; 
  }
  
  getEnergy(): number {
      const data = this.getFrequencyData();
      if (!data) return 0;
      let sum = 0;
      // Focus on bass frequencies
      for(let i=0; i<20; i++) sum += data[i];
      return sum / (20 * 255);
  }

  isOnBeat(): boolean { 
      // Simple beat detection simulation based on time
      // A real implementation uses spectral flux, but time-based is sufficient for game feel
      if (!this.ctx) return false;
      const time = this.ctx.currentTime;
      const beatLen = 60 / this.tempo;
      const diff = (time % beatLen);
      return diff < 0.1; // 100ms window
  }
  
  getPulseFactor(): number {
      if (!this.ctx) return 0;
      const beatLen = 60 / this.tempo;
      const progress = (this.ctx.currentTime % beatLen) / beatLen;
      // Sawtooth pulse
      return Math.pow(1 - progress, 2);
  }
  
  startMusic() { 
      if (this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;
      this.isPlayingMusic = true;
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
  }
  
  stopMusic() { this.isPlayingMusic = false; }
  
  private scheduler() { 
      if(!this.isPlayingMusic || !this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
          this.scheduleNote(this.current16thNote, this.nextNoteTime);
          this.nextNote(1); // Advance 16th note
      }
      this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote(step: number) {
      const secondsPerBeat = 60.0 / this.tempo;
      this.nextNoteTime += 0.25 * secondsPerBeat; 
      this.current16thNote = (this.current16thNote + 1) % 16;
  }

  private scheduleNote(beatNumber: number, time: number) {
      if (!this.ctx || !this.bassGain || !this.arpGain) return;

      // Bass (Quarter notes)
      if (beatNumber % 4 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.bassGain);
          
          const note = SCALE_BASS[Math.floor(Math.random() * SCALE_BASS.length)];
          osc.frequency.value = note;
          
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
          
          osc.start(time);
          osc.stop(time + 0.5);
      }

      // Arp (16th notes) - density depends on intensity
      if (Math.random() < (0.2 + this.intensity * 0.5)) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(this.arpGain);
          
          const note = SCALE_ARP[Math.floor(Math.random() * SCALE_ARP.length)];
          osc.frequency.value = note;
          
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          
          osc.start(time);
          osc.stop(time + 0.1);
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

  // --- SFX API ---
  public playPerfectDrop(pan: number) { 
      this.playTone(880, 'sine', 0.4, 0.3, pan, this.sfxPool);
      this.playTone(1760, 'triangle', 0.2, 0.1, pan, this.sfxPool);
  }
  
  playUiHover() { this.playTone(400, 'sine', 0.05, 0.05, 0, this.uiPool); }
  playUiClick() { this.playTone(600, 'triangle', 0.05, 0.1, 0, this.uiPool); }
  playUiSelect() { this.playTone(800, 'sine', 0.1, 0.1, 0, this.uiPool); }
  playUiBack() { this.playTone(300, 'square', 0.1, 0.05, 0, this.uiPool); }
  
  playMove(pan=0) { this.playTone(300, 'triangle', 0.05, 0.1, pan, this.sfxPool); }
  playRotate(pan=0) { this.playTone(450, 'sine', 0.08, 0.1, pan, this.sfxPool); }
  playHardDrop(pan=0) { 
      this.playTone(150, 'square', 0.15, 0.2, pan, this.sfxPool);
      this.playTone(100, 'sawtooth', 0.2, 0.2, pan, this.sfxPool);
  }
  playLock(pan=0, type?: TetrominoType) { this.playTone(220, 'triangle', 0.1, 0.3, pan, this.sfxPool); }
  playSoftLand(pan=0) { this.playTone(200, 'sine', 0.1, 0.1, pan, this.sfxPool); }
  
  playTSpin() {
      this.playTone(600, 'square', 0.2, 0.2, 0, this.sfxPool);
      setTimeout(() => this.playTone(800, 'square', 0.3, 0.2, 0, this.sfxPool), 100);
  }
  
  playClear(lines: number) {
      const base = 440 + (lines * 100);
      this.playTone(base, 'sine', 0.3, 0.3, 0, this.sfxPool);
      this.playTone(base * 1.5, 'triangle', 0.4, 0.2, 0, this.sfxPool);
      if (lines >= 4) {
          setTimeout(() => this.playTone(base * 2, 'sawtooth', 0.5, 0.3, 0, this.sfxPool), 100);
      }
  }
  
  playGameOver() {
      this.playTone(100, 'sawtooth', 1.0, 0.5, 0, this.sfxPool);
      this.playTone(80, 'square', 1.5, 0.5, 0, this.sfxPool);
  }
  
  playFrenzyStart() { this.playTone(880, 'sawtooth', 0.5, 0.3, 0, this.sfxPool); }
  playFrenzyEnd() { this.playTone(440, 'sine', 0.5, 0.2, 0, this.sfxPool); }
  playZoneStart() { this.playTone(1200, 'sine', 1.0, 0.4, 0, this.sfxPool); }
  playZoneEnd() { this.playTone(300, 'sine', 0.5, 0.4, 0, this.sfxPool); }
  playZoneClear() { this.playTone(600, 'triangle', 0.1, 0.2, 0, this.sfxPool); }
  playWildcardSpawn() { this.playTone(700, 'sine', 0.3, 0.3, 0, this.sfxPool); }
  playLaserClear() { this.playTone(1500, 'sawtooth', 0.3, 0.3, 0, this.sfxPool); }
  playNukeClear() { this.playTone(100, 'square', 1.0, 0.5, 0, this.sfxPool); }
  playNukeSpawn() { this.playTone(200, 'sawtooth', 0.5, 0.3, 0, this.sfxPool); }
  playBombBoosterActivate() { this.playTone(300, 'square', 0.3, 0.3, 0, this.sfxPool); }
  playLineClearerActivate() { this.playTone(1200, 'sine', 0.3, 0.3, 0, this.sfxPool); }
  playBlitzSpeedUp() { this.playTone(1000, 'triangle', 0.5, 0.3, 0, this.sfxPool); }
  playFlippedGravityActivate() { this.playTone(200, 'sine', 1.0, 0.4, 0, this.sfxPool); }
  playFlippedGravityEnd() { this.playTone(600, 'sine', 0.5, 0.3, 0, this.sfxPool); }
  playLevelUp() { 
      this.playTone(523.25, 'triangle', 0.2, 0.3, 0, this.sfxPool);
      setTimeout(() => this.playTone(659.25, 'triangle', 0.2, 0.3, 0, this.sfxPool), 100);
      setTimeout(() => this.playTone(783.99, 'triangle', 0.4, 0.3, 0, this.sfxPool), 200);
  }
  playCountdown() { this.playTone(440, 'sine', 0.1, 0.3, 0, this.uiPool); }
}

export const audioManager = new AudioManager();
