
// Procedural Audio Engine using Web Audio API
// Generates retro synth sounds without external assets

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null; // For Drone path
  private sfxGain: GainNode | null = null;    // For SFX path
  private uiGain: GainNode | null = null;     // For UI sounds
  private musicGain: GainNode | null = null;  // Specific for music
  
  private filterNode: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  private enabled: boolean = true;
  private musicEnabled: boolean = true;
  
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneLfo: OscillatorNode | null = null;

  constructor() {
    // Initialize context lazily on first interaction
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        
        // Visualizer Analysis Node
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512; // Good balance of resolution and performance
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Master Gain (Root)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);

        // Music Gain (Child of Master)
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.4;
        
        // Filter for reactive audio (Music only)
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 20000; // Start open
        this.filterNode.Q.value = 1;

        // Connect Music Graph: MusicGain -> Filter -> Master -> Analyser
        this.musicGain.connect(this.filterNode);
        this.filterNode.connect(this.masterGain);
        this.filterNode.connect(this.analyser);

        // SFX Gain (Child of Master)
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.4;
        this.sfxGain.connect(this.masterGain);
        this.sfxGain.connect(this.analyser);

        // UI Gain (Child of Master)
        this.uiGain = this.ctx.createGain();
        this.uiGain.gain.value = 0.3;
        this.uiGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getFrequencyData(): Uint8Array | null {
      if (this.analyser && this.dataArray) {
          this.analyser.getByteFrequencyData(this.dataArray);
          return this.dataArray;
      }
      return null;
  }

  setMusicEnabled(enabled: boolean) {
      this.musicEnabled = enabled;
      if (!enabled) {
          this.stopMusic();
      } else {
          // If we enable music, we don't necessarily start it immediately unless logic elsewhere calls startMusic
          // But if we are currently "supposed" to be playing (managed by app state), the app should call startMusic again
      }
  }

  startMusic() {
      if(!this.ctx || !this.musicGain || !this.musicEnabled || this.droneOsc) return;
      
      const now = this.ctx.currentTime;
      
      // --- Ambient Drone (The "Music") ---
      // Osc 1: Low Bass
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 55; // A1
      
      // LFO for subtle movement
      this.droneLfo = this.ctx.createOscillator();
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.value = 0.1; // Slow modulation
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 500; // Filter cutoff modulation depth
      
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0; // Start silent for fade in
      
      // Connections
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.musicGain);
      
      // LFO -> Filter Freq (Subtle movement)
      if(this.filterNode) {
        this.droneLfo.connect(lfoGain);
        lfoGain.connect(this.filterNode.frequency);
      }

      this.droneOsc.start();
      this.droneLfo.start();
      
      // Fade In
      this.droneGain.gain.linearRampToValueAtTime(0.15, now + 2.0);
  }
  
  stopMusic() {
      if (!this.ctx || !this.droneOsc || !this.droneGain) return;
      
      const now = this.ctx.currentTime;
      
      // Fade Out
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.linearRampToValueAtTime(0, now + 1.5);
      
      const osc = this.droneOsc;
      const lfo = this.droneLfo;
      
      osc.stop(now + 1.5);
      if (lfo) lfo.stop(now + 1.5);
      
      setTimeout(() => {
          if (this.droneOsc === osc) { // Ensure we don't nullify a new drone if started quickly
              this.droneOsc = null;
              this.droneLfo = null;
              this.droneGain = null;
          }
      }, 1500);
  }

  setFilterFreq(normalizedHeight: number) {
      // normalizedHeight 0 (empty) to 1 (full)
      if(!this.filterNode || !this.ctx) return;
      
      const minFreq = 200;
      const maxFreq = 10000;
      // Exponential ramp
      const target = minFreq + (maxFreq - minFreq) * Math.pow(normalizedHeight, 2);
      
      // We use setTargetAtTime, but also need to respect LFO modulation
      // This acts as a base value modification
      this.filterNode.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.5);
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain) {
        const val = this.enabled ? 0.3 : 0;
        this.masterGain.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.1);
    }
    return this.enabled;
  }

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1, output: GainNode | null = null) {
    if (!this.enabled || !this.ctx) return;
    const targetNode = output || this.sfxGain;
    if (!targetNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // --- UI SOUNDS ---
  playUiHover() {
      this.playTone(800, 'sine', 0.05, 0, 0.05, this.uiGain);
  }

  playUiClick() {
      this.playTone(1200, 'square', 0.05, 0, 0.05, this.uiGain);
      this.playTone(600, 'sawtooth', 0.05, 0.01, 0.05, this.uiGain);
  }

  playUiSelect() {
      this.playTone(440, 'sine', 0.1, 0, 0.1, this.uiGain);
      this.playTone(880, 'sine', 0.2, 0.05, 0.1, this.uiGain);
  }

  playUiBack() {
      this.playTone(400, 'triangle', 0.1, 0, 0.1, this.uiGain);
      this.playTone(300, 'triangle', 0.1, 0.05, 0.1, this.uiGain);
  }

  // --- GAME SOUNDS ---
  playMove() {
    this.playTone(300, 'triangle', 0.05, 0, 0.1);
  }

  playRotate() {
    this.playTone(400, 'sine', 0.1, 0, 0.15);
  }

  playHardDrop() {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime); // boost volume
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain); 
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playLock() {
    this.playTone(200, 'square', 0.05, 0, 0.2);
  }

  playTSpin() {
      // Magical high-pitched chime
      this.playTone(880, 'sine', 0.3, 0, 0.3);
      this.playTone(1320, 'sine', 0.4, 0.05, 0.2);
      this.playTone(1760, 'triangle', 0.5, 0.1, 0.1);
  }

  playClear(lines: number) {
    const base = 440;
    const notes = [base, base * 1.25, base * 1.5, base * 2];
    for (let i = 0; i < lines; i++) {
       const noteIndex = i % notes.length;
       this.playTone(notes[noteIndex], 'triangle', 0.3, i * 0.08, 0.3);
    }
    if (lines >= 4) {
       setTimeout(() => this.playTone(base * 2, 'square', 0.4, 0, 0.3), 300);
    }
  }
  
  playGameOver() {
     this.playTone(300, 'sawtooth', 0.5, 0);
     this.playTone(250, 'sawtooth', 0.5, 0.4);
     this.playTone(200, 'sawtooth', 1.0, 0.8);
     // Drop filter to 0
     if(this.filterNode && this.ctx) {
         this.filterNode.frequency.setTargetAtTime(100, this.ctx.currentTime, 2);
     }
     this.stopMusic();
  }
}

export const audioManager = new AudioManager();
