
// Procedural Audio Engine using Web Audio API
// Generates retro synth sounds without external assets

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null; // For Drone path
  private sfxGain: GainNode | null = null;    // For SFX path
  private filterNode: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private enabled: boolean = true;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

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

        // Master Gain (Drone/Music)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;

        // SFX Gain (Sound Effects)
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.3;
        
        // Filter for reactive audio (Drone only)
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 20000; // Start open
        this.filterNode.Q.value = 1;

        // Connect Graph 1: Drone -> MasterGain -> Filter -> Destination & Analyser
        this.masterGain.connect(this.filterNode);
        this.filterNode.connect(this.ctx.destination);
        this.filterNode.connect(this.analyser);

        // Connect Graph 2: SFX -> SfxGain -> Destination & Analyser
        // SFX bypass the filter to stay crisp, but are still visualized
        this.sfxGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.analyser);

        this.startDrone();
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

  startDrone() {
      if(!this.ctx || !this.masterGain) return;
      // Background ambience
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 50; // Low bass
      
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.05;
      
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.masterGain); // Connect to master chain
      this.droneOsc.start();
  }

  setFilterFreq(normalizedHeight: number) {
      // normalizedHeight 0 (empty) to 1 (full)
      if(!this.filterNode || !this.ctx) return;
      
      const minFreq = 200;
      const maxFreq = 8000;
      // Exponential ramp
      const target = minFreq + (maxFreq - minFreq) * Math.pow(normalizedHeight, 2);
      
      this.filterNode.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.5);
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? 0.3 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.enabled ? 0.3 : 0;
    return this.enabled;
  }

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1) {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain); // Route to SFX bus

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // SFX Definitions
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
    gain.connect(this.sfxGain); // Route to SFX bus
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playLock() {
    this.playTone(200, 'square', 0.05, 0, 0.2);
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
  }
}

export const audioManager = new AudioManager();
