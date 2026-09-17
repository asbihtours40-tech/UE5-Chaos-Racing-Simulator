class SoundFXSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private tireNoiseGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
    }
    if (this.tireNoiseGain && this.ctx) {
      this.tireNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // Engine primary oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, now);

      // Low rumble sub
      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'triangle';
      this.engineSub.frequency.setValueAtTime(25, now);

      // Lowpass filter for deep exhaust note
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, now);
      this.engineFilter.Q.setValueAtTime(3.5, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.1, now);

      this.engineOsc.connect(this.engineFilter);
      this.engineSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSub.start(now);

      // Tire screech setup
      this.setupTireNoise();

      this.isEngineRunning = true;
    } catch {
      // Audio autoplay policy catch
    }
  }

  private setupTireNoise() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 4.0;

    this.tireNoiseGain = this.ctx.createGain();
    this.tireNoiseGain.gain.value = 0;

    noise.connect(filter);
    filter.connect(this.tireNoiseGain);
    this.tireNoiseGain.connect(this.ctx.destination);
    noise.start();
  }

  public updateEngine(rpm: number, throttle: number, driftFactor: number) {
    if (!this.ctx || !this.isEngineRunning || this.isMuted) return;

    const now = this.ctx.currentTime;
    const targetFreq = 40 + (rpm / 8000) * 160;
    const filterFreq = 260 + throttle * 480 + (rpm / 8000) * 350;

    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    }
    if (this.engineSub) {
      this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);
    }
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    }

    // Tire screech
    if (this.tireNoiseGain) {
      const screech = Math.min(1.0, Math.max(0, driftFactor * 1.5));
      this.tireNoiseGain.gain.setTargetAtTime(screech * 0.18, now, 0.05);
    }
  }

  public playCrashImpact(impulseSize: number, didDetachBumper: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const intensity = Math.min(1.0, impulseSize / 120000);

      // Punchy sub boom
      const boom = this.ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(140, now);
      boom.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      const boomGain = this.ctx.createGain();
      boomGain.gain.setValueAtTime(intensity * 0.45, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      boom.connect(boomGain);
      boomGain.connect(this.ctx.destination);
      boom.start(now);
      boom.stop(now + 0.4);

      // Metallic crunch
      const crunchOsc = this.ctx.createOscillator();
      crunchOsc.type = didDetachBumper ? 'sawtooth' : 'square';
      crunchOsc.frequency.setValueAtTime(didDetachBumper ? 800 : 420, now);
      crunchOsc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(intensity * 0.35, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + (didDetachBumper ? 0.6 : 0.3));

      crunchOsc.connect(crunchGain);
      crunchGain.connect(this.ctx.destination);
      crunchOsc.start(now);
      crunchOsc.stop(now + 0.65);
    } catch {
      // Audio safety
    }
  }

  public playCheckpoint() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio safety
    }
  }

  public playLapComplete(isBest: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = isBest ? [523.25, 659.25, 783.99, 1046.50] : [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.4);
      });
    } catch {
      // Audio safety
    }
  }
}

export const SoundFX = new SoundFXSystem();
