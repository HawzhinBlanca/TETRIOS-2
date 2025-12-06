
import { TetrominoType } from '../types';
import { MUSICAL_SCALES, CHORD_PROGRESSIONS } from '../constants';
import { telemetry } from './TelemetryManager';

// --- AUDIO HELPERS ---

const safeParam = (param: AudioParam, value: number, time: number, method: 'set' | 'linear' | 'exponential') => {
    if (Number.isFinite(value) && Number.isFinite(time)) {
        try {
            if (method === 'set') param.setValueAtTime(value, time);
            else if (method === 'linear') param.linearRampToValueAtTime(value, time);
            else if (method === 'exponential') {
                const safeVal = Math.max(0.0001, value);
                param.exponentialRampToValueAtTime(safeVal, time);
            }
        } catch (e) {
            // Silently fail scheduling errors
        }
    }
};

const mtof = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// --- INSTRUMENT BASE CLASS ---

abstract class SynthVoice {
    protected ctx: AudioContext;
    protected output: GainNode;

    constructor(ctx: AudioContext, destination: AudioNode) {
        this.ctx = ctx;
        this.output = ctx.createGain();
        this.output.connect(destination);
    }

    public setVolume(val: number) {
        safeParam(this.output.gain, val, this.ctx.currentTime, 'set');
    }

    protected createEnvelope(param: AudioParam, time: number, velocity: number, attack: number, decay: number, sustain: number = 0.001) {
        safeParam(param, 0, time, 'set');
        safeParam(param, velocity, time + attack, 'linear');
        safeParam(param, sustain, time + attack + decay, 'exponential');
    }

    protected scheduleCleanup(nodes: AudioNode[], delay: number) {
        setTimeout(() => {
            nodes.forEach(node => {
                try { node.disconnect(); } catch(e) {}
            });
        }, delay * 1000);
    }

    abstract trigger(freq: number, time: number, velocity: number): void;
}

// --- SPECIFIC INSTRUMENTS ---

class StandardSynth extends SynthVoice {
    constructor(ctx: AudioContext, destination: AudioNode, private type: OscillatorType, private filterFreq: number = 2000) {
        super(ctx, destination);
    }

    trigger(freq: number, time: number, velocity: number) {
        const t = time;
        const osc = this.ctx.createOscillator();
        osc.type = this.type;
        osc.frequency.value = freq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 2;

        const amp = this.ctx.createGain();

        osc.connect(filter);
        filter.connect(amp);
        amp.connect(this.output);

        // Envelope
        const peakGain = this.type === 'triangle' ? 0.3 * velocity : 0.1 * velocity;
        this.createEnvelope(amp.gain, t, peakGain, 0.01, 0.3);
        
        // Filter Envelope
        safeParam(filter.frequency, this.filterFreq, t, 'set');
        safeParam(filter.frequency, 100, t + 0.2, 'exponential');

        osc.start(t);
        osc.stop(t + 0.4);
        
        this.scheduleCleanup([osc, filter, amp], 0.45);
    }
}

class BassSynth extends SynthVoice {
    trigger(freq: number, time: number, velocity: number) {
        // FM Synthesis: Modulator -> Carrier
        const t = time;
        const osc1 = this.ctx.createOscillator(); // Carrier
        const osc2 = this.ctx.createOscillator(); // Modulator
        const modGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const amp = this.ctx.createGain();

        // Routing
        osc2.connect(modGain);
        modGain.connect(osc1.frequency);
        osc1.connect(filter);
        filter.connect(amp);
        amp.connect(this.output);

        // Settings
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        osc2.type = 'sine';
        osc2.frequency.value = freq * 0.5; // Sub-octave

        filter.type = 'lowpass';
        filter.Q.value = 5;

        // Envelopes
        this.createEnvelope(amp.gain, t, velocity, 0.02, 0.4);
        
        // FM Amount
        safeParam(modGain.gain, freq * 2, t, 'set');
        safeParam(modGain.gain, 0, t + 0.3, 'exponential');

        // Filter Pluck
        safeParam(filter.frequency, 800, t, 'set');
        safeParam(filter.frequency, 100, t + 0.4, 'exponential');

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.5);
        osc2.stop(t + 0.5);
        
        this.scheduleCleanup([osc1, osc2, modGain, filter, amp], 0.6);
    }
}

class PadSynth extends SynthVoice {
    trigger(freq: number, time: number, velocity: number) {
        const t = time;
        const duration = 4.0; 

        const createVoice = (detune: number) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = detune;
            
            const vGain = this.ctx.createGain();
            osc.connect(vGain);
            vGain.connect(this.output);
            
            safeParam(vGain.gain, 0, t, 'set');
            safeParam(vGain.gain, 0.08 * velocity, t + 1.5, 'linear');
            safeParam(vGain.gain, 0, t + duration, 'linear');

            osc.start(t);
            osc.stop(t + duration + 0.5);
            return { osc, vGain };
        };

        const voices = [createVoice(0), createVoice(-12), createVoice(12)];
        const cleanupNodes = voices.flatMap(v => [v.osc, v.vGain]);
        
        this.scheduleCleanup(cleanupNodes, duration + 1);
    }
}

class DrumSynth {
    private ctx: AudioContext;
    private output: GainNode;
    private noiseBuffer: AudioBuffer | null = null;

    constructor(ctx: AudioContext, destination: AudioNode) {
        this.ctx = ctx;
        this.output = ctx.createGain();
        this.output.connect(destination);
        this.createNoiseBuffer();
    }

    private createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    public playKick(time: number, velocity: number) {
        const t = time;
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();

        osc.connect(amp);
        amp.connect(this.output);

        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);

        safeParam(amp.gain, velocity, t, 'set');
        safeParam(amp.gain, 0.001, t + 0.5, 'exponential');

        osc.start(t);
        osc.stop(t + 0.55);
        setTimeout(() => { osc.disconnect(); amp.disconnect(); }, 600);
    }

    public playHiHat(time: number, velocity: number) {
        if (!this.noiseBuffer) return;
        const t = time;
        
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        const amp = this.ctx.createGain();

        source.connect(filter);
        filter.connect(amp);
        amp.connect(this.output);

        safeParam(amp.gain, velocity * 0.6, t, 'set');
        safeParam(amp.gain, 0.001, t + 0.05, 'exponential');

        source.start(t);
        source.stop(t + 0.1);
        setTimeout(() => { source.disconnect(); filter.disconnect(); amp.disconnect(); }, 200);
    }
}

// --- MAIN MANAGER ---

export class AudioManager {
    public ctx: AudioContext | null = null;
    
    // Buses
    public masterGain: GainNode | null = null;
    public musicGain: GainNode | null = null;
    public sfxGain: GainNode | null = null;
    public compressor: DynamicsCompressorNode | null = null;
    
    // Analysis
    public analyser: AnalyserNode | null = null;
    private analyserBuffer: Uint8Array | null = null;
    
    // Effects
    private reverb: ConvolverNode | null = null;
    private lowPassFilter: BiquadFilterNode | null = null;

    // Instruments
    private bass: BassSynth | null = null;
    private pad: PadSynth | null = null;
    private arp: StandardSynth | null = null;
    private pluck: StandardSynth | null = null;
    private drums: DrumSynth | null = null;

    // State
    private isMuted: boolean = false;
    private musicEnabled: boolean = true;
    private isPlayingMusic: boolean = false;
    private initialized: boolean = false;

    // Sequencer
    private tempo: number = 110;
    private nextNoteTime: number = 0;
    private current16th: number = 0;
    private currentMeasure: number = 0;
    private chordIndex: number = 0;
    
    // Game State Hooks
    private intensity: number = 0; // 0-1 Danger
    private combo: number = 0;
    private isZone: boolean = false;
    private isFrenzy: boolean = false;

    // Lookahead
    private scheduleAheadTime: number = 0.1;
    private lookahead: number = 25.0;
    private schedulerTimer: number | null = null;

    constructor() {}

    public init() {
        if (this.initialized && this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(err => {
                    telemetry.log('WARN', 'Audio Resume Failed', { error: String(err) });
                });
            }
            return;
        }

        try {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AC({ latencyHint: 'interactive' });
            
            // 1. Master Chain
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.ratio.value = 8;
            this.compressor.connect(this.ctx.destination);
            
            // Analyser
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256; 
            this.analyserBuffer = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.connect(this.compressor);

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.6;
            this.masterGain.connect(this.analyser);

            // 2. Sub-Buses
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.5;
            
            this.lowPassFilter = this.ctx.createBiquadFilter();
            this.lowPassFilter.type = 'lowpass';
            this.lowPassFilter.frequency.value = 20000;
            this.lowPassFilter.Q.value = 1;
            
            this.musicGain.connect(this.lowPassFilter);
            this.lowPassFilter.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.7;
            this.sfxGain.connect(this.masterGain);

            // 3. Reverb Send
            this.reverb = this.ctx.createConvolver();
            this.reverb.buffer = this.createImpulseResponse(2.5, 2.0);
            const revGain = this.ctx.createGain();
            revGain.gain.value = 0.3;
            this.reverb.connect(revGain);
            revGain.connect(this.masterGain);
            this.musicGain.connect(this.reverb);

            // 4. Instantiate Instruments
            this.bass = new BassSynth(this.ctx, this.musicGain);
            this.pad = new PadSynth(this.ctx, this.musicGain);
            this.arp = new StandardSynth(this.ctx, this.musicGain, 'square', 3000);
            this.pluck = new StandardSynth(this.ctx, this.musicGain, 'triangle', 20000); 
            this.drums = new DrumSynth(this.ctx, this.sfxGain);

            this.initialized = true;
            telemetry.log('INFO', 'Audio System Initialized', { sampleRate: this.ctx.sampleRate, state: this.ctx.state });

            // Global resume handler for mobile
            const resume = () => { 
                if(this.ctx?.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        console.log("Audio Context Resumed");
                    });
                }
            };
            ['click','touchstart','keydown', 'pointerdown'].forEach(e => window.addEventListener(e, resume, {once:true}));

        } catch(e) {
            telemetry.log('ERROR', 'Audio Init Failed', { error: String(e) });
        }
    }

    public startMusic() {
        if (!this.initialized || !this.ctx) this.init();
        if (this.isPlayingMusic || !this.musicEnabled || !this.ctx) return;

        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        this.isPlayingMusic = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    public stopMusic() {
        this.isPlayingMusic = false;
        if (this.schedulerTimer) {
            clearTimeout(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    private scheduler() {
        if (!this.isPlayingMusic || !this.ctx) return;
        
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.current16th, this.nextNoteTime);
            this.advanceStep();
        }
        
        this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
    }

    private advanceStep() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        
        this.current16th++;
        if (this.current16th === 16) {
            this.current16th = 0;
            this.currentMeasure++;
            if (this.currentMeasure % 4 === 0) {
                this.chordIndex = (this.chordIndex + 1) % CHORD_PROGRESSIONS[0].length;
            }
        }
    }

    private scheduleStep(step: number, time: number) {
        if (!this.bass || !this.pad || !this.arp || !this.drums) return;

        const progression = CHORD_PROGRESSIONS[0];
        const currentChordDegrees = progression[this.chordIndex % progression.length];
        const root = 36; // C2

        if (step % 4 === 0) {
            this.drums.playKick(time, 0.8);
        }

        if (step === 0 || (this.intensity > 0.5 && step === 10)) {
            const note = root + currentChordDegrees[0] - 12; 
            this.bass.trigger(mtof(note), time, 0.7);
        }

        if (step === 0 && this.currentMeasure % 2 === 0) {
            const note = root + currentChordDegrees[0];
            this.pad.trigger(mtof(note), time, 0.4);
        }

        if (this.intensity > 0.2) {
            if (step % 2 === 0) { 
                const vel = (step % 4 === 2) ? 0.3 : 0.1;
                this.drums.playHiHat(time, vel);
            }
            if (this.intensity > 0.8 && step % 2 !== 0) {
                this.drums.playHiHat(time, 0.05);
            }
        }

        if (this.combo > 2 || this.intensity > 0.4 || this.isFrenzy) {
            const is16th = this.isFrenzy || this.intensity > 0.9;
            if (is16th || step % 2 === 0) {
                const degree = currentChordDegrees[Math.floor(Math.random() * currentChordDegrees.length)];
                const octave = Math.random() > 0.5 ? 12 : 24;
                const note = root + degree + octave;
                this.arp.trigger(mtof(note), time, 0.2);
            }
        }
    }

    public updateDynamicMix(stats: { dangerLevel: number, comboCount: number, isZoneActive: boolean, isFrenzy: boolean }) {
        if (!this.ctx || !this.lowPassFilter) return;

        this.intensity = stats.dangerLevel;
        this.combo = stats.comboCount;
        this.isZone = stats.isZoneActive;
        this.isFrenzy = stats.isFrenzy;

        let targetFreq = 800 + (Math.pow(this.intensity, 2) * 10000);
        if (this.isZone) targetFreq = 400; 
        if (this.isFrenzy) targetFreq = 20000; 

        safeParam(this.lowPassFilter.frequency, targetFreq, this.ctx.currentTime + 1.0, 'linear');

        const targetTempo = 110 + (this.intensity * 30) + (this.isFrenzy ? 20 : 0);
        this.tempo = this.tempo * 0.95 + targetTempo * 0.05;
    }

    public setLowPass(freq: number) {
        if (this.ctx && this.lowPassFilter) {
            safeParam(this.lowPassFilter.frequency, freq, this.ctx.currentTime + 0.2, 'linear');
        }
    }

    // --- GAMEPLAY SFX API ---

    private createSimpleOscillator(type: OscillatorType, freqStart: number, freqEnd: number | null, volStart: number, duration: number, targetNode: AudioNode) {
        if (!this.ctx || !targetNode) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        
        if (freqEnd !== null) {
            osc.frequency.setValueAtTime(freqStart, t);
            osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
        } else {
            osc.frequency.value = freqStart;
        }
        
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(volStart, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        osc.connect(g);
        g.connect(targetNode);
        
        osc.start(t);
        osc.stop(t + duration);
        setTimeout(() => { osc.disconnect(); g.disconnect(); }, duration * 1000 + 100);
    }

    public playMove(colIndex: number) {
        if (!this.ctx || !this.pluck) return;
        const scale = MUSICAL_SCALES.MINOR_PENTATONIC;
        const degree = scale[colIndex % scale.length];
        const note = 60 + degree;
        this.pluck.trigger(mtof(note), this.ctx.currentTime, 0.4);
    }

    public playRotate(pan: number = 0) {
        if (this.sfxGain) this.createSimpleOscillator('triangle', 800, 100, 0.1, 0.05, this.sfxGain);
    }

    public playHardDrop(pan: number) {
        if (!this.ctx || !this.drums) return;
        this.drums.playKick(this.ctx.currentTime, 1.0);
        
        if (this.musicGain) {
            const t = this.ctx.currentTime;
            this.musicGain.gain.cancelScheduledValues(t);
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
            this.musicGain.gain.linearRampToValueAtTime(0.1, t + 0.05);
            this.musicGain.gain.exponentialRampToValueAtTime(0.5, t + 0.5);
        }
    }

    public playLock(pan: number, type?: any) {
        if (this.sfxGain) this.createSimpleOscillator('square', 200, null, 0.2, 0.1, this.sfxGain);
    }

    public playClear(count: number, combo: number = 0, isB2B: boolean = false) {
        if (!this.ctx || !this.pluck) return;
        const t = this.ctx.currentTime;
        const baseNote = 60 + (combo * 2);
        const notes = [0, 4, 7, 12];
        const countToPlay = Math.min(count, 4);
        
        for (let i = 0; i < countToPlay; i++) {
            const note = baseNote + notes[i];
            this.pluck.trigger(mtof(note), t + (i * 0.05), 0.5);
        }
        
        if (isB2B) this.pluck.trigger(mtof(baseNote + 24), t + 0.2, 0.4);
    }

    public playSoftLand(pan: number = 0) {} 
    public playTSpin() { this.playRotate(); } 
    public playGameOver() { this.stopMusic(); }
    
    public playUiHover() { this.playClickRaw(800, 0.05); }
    public playUiClick() { this.playClickRaw(1200, 0.1); }
    public playUiSelect() { this.playClickRaw(1500, 0.15); }
    public playUiBack() { this.playClickRaw(600, 0.1); }
    
    public playFrenzyStart() {}
    public playFrenzyEnd() {}
    public playZoneStart() {}
    public playZoneEnd() {}
    public playZoneClear() {}
    public playWildcardSpawn() {}
    public playLaserClear() {}
    public playNukeClear() {}
    public playNukeSpawn() {}
    public playBombBoosterActivate() {}
    public playLineClearerActivate() {}
    public playBlitzSpeedUp() {}
    public playFlippedGravityActivate() {}
    public playFlippedGravityEnd() {}
    public playLevelUp() {}
    public playCountdown() { this.playClickRaw(440, 0.2); }
    public playHeartbeat() { this.drums?.playKick(this.ctx?.currentTime || 0, 0.5); }
    public playChainReaction() {}
    public playOverdriveStart() {}
    public playOverdriveEnd() {}
    public playFuseDetonate() { this.playHardDrop(0); }
    
    public playPerfectDrop(multiplier: number) {
        if (this.sfxGain) this.createSimpleOscillator('sine', 800, 2000, 0.3, 0.1, this.sfxGain);
    }

    private playClickRaw(freq: number, vol: number) {
        if (this.sfxGain) this.createSimpleOscillator('triangle', freq, null, vol * 0.5, 0.05, this.sfxGain);
    }

    private createImpulseResponse(duration: number, decay: number) {
        if (!this.ctx) return null;
        const length = this.ctx.sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let i = 0; i < length; i++) {
            const n = i < length ? Math.random() * 2 - 1 : 0;
            impulse.getChannelData(0)[i] = n * Math.pow(1 - i / length, decay);
            impulse.getChannelData(1)[i] = n * Math.pow(1 - i / length, decay);
        }
        return impulse;
    }

    // --- Volume Control ---
    setMasterVolume(v: number) { if (this.masterGain) safeParam(this.masterGain.gain, v, 0, 'set'); }
    setMusicVolume(v: number) { if (this.musicGain) safeParam(this.musicGain.gain, v, 0, 'set'); }
    setSfxVolume(v: number) { if (this.sfxGain) safeParam(this.sfxGain.gain, v, 0, 'set'); }
    setUiVolume(v: number) {} 
    
    setBassVolume(v: number) { if(this.bass) this.bass.setVolume(v); }
    setDrumVolume(v: number) {} 
    setPadVolume(v: number) { if(this.pad) this.pad.setVolume(v); }
    setArpVolume(v: number) { if(this.arp) this.arp.setVolume(v); }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            safeParam(this.masterGain.gain, this.isMuted ? 0 : 0.6, this.ctx.currentTime, 'linear');
        }
    }

    setMusicEnabled(v: boolean) {
        this.musicEnabled = v;
        if (v) this.startMusic(); else this.stopMusic();
    }

    getEnergy() { return 0.5; }
    
    getFrequencyData() {
        if (this.analyser && this.analyserBuffer) {
            this.analyser.getByteFrequencyData(this.analyserBuffer);
            return this.analyserBuffer;
        }
        return null; 
    }
    
    getPulseFactor() { 
        if(!this.ctx) return 0;
        const beatLen = 60 / this.tempo;
        const progress = (this.ctx.currentTime % beatLen) / beatLen;
        return 1 - progress; 
    }
}

export const audioManager = new AudioManager();
