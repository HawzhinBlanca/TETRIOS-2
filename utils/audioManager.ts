

// Procedural Audio Engine using Web Audio API
// Generates retro synth sounds without external assets

/**
 * Manages all audio playback for the game, including background music,
 * sound effects (SFX), and UI sounds, using the Web Audio API.
 * It initializes the AudioContext lazily on user interaction.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null; // Master volume control
  private sfxGain: GainNode | null = null;    // Gain for game SFX
  private uiGain: GainNode | null = null;     // Gain for UI sounds
  private musicGain: GainNode | null = null;  // Specific for music
  
  private filterNode: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  private enabled: boolean = true; // Overall audio enabled/disabled (mute)
  private musicEnabled: boolean = true; // Music specific enabled/disabled
  
  private droneOsc: OscillatorNode | null = null; // Oscillator for background music drone
  private droneGain: GainNode | null = null;
  private droneLfo: OscillatorNode | null = null; // LFO for drone filter modulation

  constructor() {
    // Initialize context lazily on first interaction
  }

  /**
   * Initializes the Web Audio API context and main gain nodes.
   * This method should be called on the first user interaction to bypass browser autoplay policies.
   */
  init(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        
        // Visualizer Analysis Node
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512; // Good balance of resolution and performance
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Master Gain (Root)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Initial master volume
        this.masterGain.connect(this.ctx.destination);

        // Music Gain (Child of Master)
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.4; // Music specific volume
        
        // Filter for reactive audio (Music only)
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 20000; // Start open
        this.filterNode.Q.value = 1;

        // Connect Music Graph: MusicGain -> Filter -> Master -> Analyser
        this.musicGain.connect(this.filterNode);
        this.filterNode.connect(this.masterGain);
        this.filterNode.connect(this.analyser); // Analyser taps music output

        // SFX Gain (Child of Master)
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.4; // SFX specific volume
        this.sfxGain.connect(this.masterGain);
        // SFX also contributes to analyser
        // this.sfxGain.connect(this.analyser); // Optional: If SFX should also drive visualizer

        // UI Gain (Child of Master)
        this.uiGain = this.ctx.createGain();
        this.uiGain.gain.value = 0.3; // UI specific volume
        this.uiGain.connect(this.masterGain);
      }
    }
    // Resume context if it was suspended (e.g., after browser tab switch)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Retrieves the current frequency data for the audio visualizer.
   * @returns {Uint8Array | null} An array of frequency data, or null if not initialized.
   */
  getFrequencyData(): Uint8Array | null {
      if (this.analyser && this.dataArray) {
          this.analyser.getByteFrequencyData(this.dataArray);
          return this.dataArray;
      }
      return null;
  }

  /**
   * Sets whether background music is globally enabled.
   * If disabled, stops any currently playing music.
   * @param {boolean} enabled True to enable, false to disable.
   */
  setMusicEnabled(enabled: boolean): void {
      this.musicEnabled = enabled;
      if (!enabled) {
          this.stopMusic();
      }
  }

  /**
   * Starts the background ambient drone music.
   * Only plays if audio is enabled and music is specifically enabled.
   */
  startMusic(): void {
      if(!this.ctx || !this.musicGain || !this.musicEnabled || this.droneOsc) return; // Prevent multiple instances
      
      const now = this.ctx.currentTime;
      
      // --- Ambient Drone (The "Music") ---
      // Osc 1: Low Bass Sawtooth
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 55; // A1 (low bass)
      
      // LFO for subtle filter frequency modulation
      this.droneLfo = this.ctx.createOscillator();
      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.value = 0.1; // Slow modulation (0.1 Hz)
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 500; // Filter cutoff modulation depth
      
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0; // Start silent for fade in
      
      // Connections
      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(this.musicGain); // Connect to music specific gain node
      
      // LFO -> Filter Freq (Subtle movement)
      if(this.filterNode) {
        this.droneLfo.connect(lfoGain);
        lfoGain.connect(this.filterNode.frequency);
      }

      this.droneOsc.start(now);
      this.droneLfo.start(now);
      
      // Fade In music
      this.droneGain.gain.linearRampToValueAtTime(0.15, now + 2.0); // Ramps to 0.15 volume over 2 seconds
  }
  
  /**
   * Stops the background ambient drone music with a fade-out.
   */
  stopMusic(): void {
      if (!this.ctx || !this.droneOsc || !this.droneGain) return;
      
      const now = this.ctx.currentTime;
      
      // Fade Out music
      this.droneGain.gain.cancelScheduledValues(now); // Cancel any pending ramps
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now); // Set current value as base
      this.droneGain.gain.linearRampToValueAtTime(0, now + 1.5); // Ramps to 0 volume over 1.5 seconds
      
      const osc = this.droneOsc;
      const lfo = this.droneLfo;
      
      // Stop oscillators after fade out completes
      osc.stop(now + 1.5);
      if (lfo) lfo.stop(now + 1.5);
      
      // Nullify references after stopping
      setTimeout(() => {
          if (this.droneOsc === osc) { 
              this.droneOsc = null;
              this.droneLfo = null;
              this.droneGain = null;
          }
      }, 1500);
  }

  /**
   * Adjusts the lowpass filter frequency based on normalized stage height.
   * Higher `normalizedHeight` (more blocks) means lower frequency (muffled sound).
   * @param {number} normalizedHeight A value between 0 (empty) and 1 (full).
   */
  setFilterFreq(normalizedHeight: number): void {
      if(!this.filterNode || !this.ctx) return;
      
      const minFreq = 200; // Minimum filter frequency (more muffled)
      const maxFreq = 10000; // Maximum filter frequency (more open)
      // Exponential ramp for a more natural muffled effect
      const target = minFreq + (maxFreq - minFreq) * Math.pow(1 - normalizedHeight, 2); // Invert height for muffling
      
      this.filterNode.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.5); // Smooth transition
  }

  /**
   * Toggles the global mute state for all audio.
   * @returns {boolean} The new enabled state.
   */
  toggleMute(): boolean {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
        const val = this.enabled ? 0.3 : 0; // Master volume 0.3 or 0
        this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1); // Smooth transition
    }
    return this.enabled;
  }

  /**
   * Plays a simple tone with specified parameters.
   * @param {number} freq Frequency in Hz.
   * @param {OscillatorType} type Oscillator waveform type ('sine', 'square', etc.).
   * @param {number} duration Duration of the tone in seconds.
   * @param {number} [startTime=0] Delay before starting the tone in seconds.
   * @param {number} [vol=1] Volume (gain) of the tone.
   * @param {GainNode | null} [output=null] Optional output gain node (defaults to SFX gain).
   */
  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1, output: GainNode | null = null): void {
    if (!this.enabled || !this.ctx) return;
    const targetNode = output || this.sfxGain;
    if (!targetNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration); // Fade out to near zero

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // --- UI SOUNDS ---
  playUiHover(): void {
      this.playTone(800, 'sine', 0.05, 0, 0.05, this.uiGain);
  }

  playUiClick(): void {
      this.playTone(1200, 'square', 0.05, 0, 0.05, this.uiGain);
      this.playTone(600, 'sawtooth', 0.05, 0.01, 0.05, this.uiGain);
  }

  playUiSelect(): void {
      this.playTone(440, 'sine', 0.1, 0, 0.1, this.uiGain);
      this.playTone(880, 'sine', 0.2, 0.05, 0.1, this.uiGain);
  }

  playUiBack(): void {
      this.playTone(400, 'triangle', 0.1, 0, 0.1, this.uiGain);
      this.playTone(300, 'triangle', 0.1, 0.05, 0.1, this.uiGain);
  }

  // --- GAME SOUNDS ---
  playMove(): void {
    this.playTone(300, 'triangle', 0.05, 0, 0.1);
  }

  playRotate(): void {
    this.playTone(400, 'sine', 0.1, 0, 0.15);
  }

  playSoftLand(): void {
    this.playTone(180, 'square', 0.08, 0, 0.1, this.sfxGain); // New sound for piece landing
  }

  playHardDrop(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime); 
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15); // Fade to near zero
    osc.connect(gain);
    gain.connect(this.sfxGain); 
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playLock(): void {
    this.playTone(200, 'square', 0.05, 0, 0.2);
  }

  playTSpin(): void {
      // Magical high-pitched chime
      this.playTone(880, 'sine', 0.3, 0, 0.3);
      this.playTone(1320, 'sine', 0.4, 0.05, 0.2);
      this.playTone(1760, 'triangle', 0.5, 0.1, 0.1);
  }

  playClear(lines: number): void {
    const base = 440; // A4
    const notes = [base, base * 1.25, base * 1.5, base * 2]; // A, C#, E, A (octave)
    for (let i = 0; i < lines; i++) {
       const noteIndex = i % notes.length;
       this.playTone(notes[noteIndex], 'triangle', 0.3, i * 0.08, 0.3);
    }
    if (lines >= 4) { // Special sound for Tetris
       setTimeout(() => this.playTone(base * 2, 'square', 0.4, 0, 0.3), 300);
    }
  }
  
  playGameOver(): void {
     this.playTone(300, 'sawtooth', 0.5, 0);
     this.playTone(250, 'sawtooth', 0.5, 0.4);
     this.playTone(200, 'sawtooth', 1.0, 0.8);
     // Drop filter to 0
     if(this.filterNode && this.ctx) {
         this.filterNode.frequency.setTargetAtTime(100, this.ctx.currentTime, 2); // Muffle sound completely
     }
     this.stopMusic();
  }

  playFrenzyStart(): void {
      this.playTone(1000, 'sine', 0.1, 0, 0.2, this.sfxGain);
      this.playTone(1500, 'sine', 0.1, 0.05, 0.2, this.sfxGain);
      this.playTone(2000, 'sine', 0.2, 0.1, 0.2, this.sfxGain);
      this.playTone(120, 'sawtooth', 0.3, 0, 0.1, this.sfxGain); // Bass pulse
  }

  playFrenzyEnd(): void {
      this.playTone(800, 'square', 0.1, 0, 0.1, this.sfxGain);
      this.playTone(400, 'square', 0.1, 0.05, 0.1, this.sfxGain);
  }

  // --- NEW POWER-UP SOUNDS ---
  playWildcardSpawn(): void {
      this.playTone(1500, 'sine', 0.1, 0, 0.1, this.sfxGain);
      this.playTone(2000, 'triangle', 0.15, 0.05, 0.1, this.sfxGain);
      this.playTone(2500, 'sine', 0.2, 0.1, 0.1, this.sfxGain);
  }

  playLaserClear(): void {
      this.playTone(1000, 'sawtooth', 0.05, 0, 0.2, this.sfxGain);
      this.playTone(800, 'sawtooth', 0.05, 0.02, 0.2, this.sfxGain);
      this.playTone(600, 'sawtooth', 0.05, 0.04, 0.2, this.sfxGain);
      this.playTone(200, 'square', 0.1, 0.03, 0.3, this.sfxGain); // Bass impact
  }

  playNukeClear(): void {
      if (!this.enabled || !this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;
      // Low frequency rumble
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(60, now);
      osc1.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 1.0);

      // High frequency explosion burst
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square'; // Changed from 'noise' to 'square'
      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.5, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now);
      osc2.stop(now + 0.3);
  }

  playBombBoosterActivate(): void {
    this.playTone(700, 'sine', 0.1, 0, 0.15, this.sfxGain);
    this.playTone(500, 'triangle', 0.15, 0.05, 0.1, this.sfxGain);
    this.playTone(300, 'square', 0.2, 0.1, 0.15, this.sfxGain);
  }

  playLineClearerActivate(): void {
    this.playTone(900, 'sine', 0.08, 0, 0.15, this.sfxGain);
    this.playTone(1100, 'triangle', 0.12, 0.03, 0.1, this.sfxGain);
    this.playTone(1300, 'square', 0.1, 0.06, 0.1, this.sfxGain);
  }

  // New: Sound for when a Nuke block spawns
  playNukeSpawn(): void {
      this.playTone(200, 'square', 0.08, 0, 0.2, this.sfxGain);
      this.playTone(100, 'sawtooth', 0.15, 0.05, 0.2, this.sfxGain);
  }

  // New: Sound for Blitz speed up
  playBlitzSpeedUp(): void {
      this.playTone(1000, 'sine', 0.1, 0, 0.2, this.sfxGain);
      this.playTone(1200, 'square', 0.1, 0.05, 0.2, this.sfxGain);
  }

  // New: Sound for Flipped Gravity booster activation
  playFlippedGravityActivate(): void {
      this.playTone(800, 'sine', 0.1, 0, 0.2, this.sfxGain);
      this.playTone(1200, 'square', 0.15, 0.05, 0.2, this.sfxGain);
      this.playTone(1600, 'triangle', 0.2, 0.1, 0.2, this.sfxGain);
  }

  // New: Sound for Flipped Gravity booster end
  playFlippedGravityEnd(): void {
      this.playTone(1600, 'sine', 0.1, 0, 0.1, this.sfxGain);
      this.playTone(1200, 'square', 0.1, 0.05, 0.1, this.sfxGain);
      this.playTone(800, 'triangle', 0.1, 0.1, 0.1, this.sfxGain);
  }
}

export const audioManager = new AudioManager();