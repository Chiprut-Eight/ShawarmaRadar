export class ShawarmaSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private slicingActive = false;

  private sliceGain: GainNode | null = null;
  private sliceOsc1: OscillatorNode | null = null;
  private sliceOsc2: OscillatorNode | null = null;
  private sliceNoise: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.setSlicing(false);
    }
  }

  public setSlicing(active: boolean): void {
    if (this.muted) active = false;
    if (active === this.slicingActive) return;
    this.slicingActive = active;

    if (active) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      try {
        this.teardownSliceNodes();

        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
        master.connect(ctx.destination);

        // Electric rotary motor hum
        const motorFilter = ctx.createBiquadFilter();
        motorFilter.type = 'lowpass';
        motorFilter.frequency.setValueAtTime(640, now);

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(116, now);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(232, now);

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(0.32, now);

        osc1.connect(motorFilter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(motorFilter);
        motorFilter.connect(master);

        // Crisp carving sizzle noise
        const sizzleFilter = ctx.createBiquadFilter();
        sizzleFilter.type = 'bandpass';
        sizzleFilter.frequency.setValueAtTime(2800, now);
        sizzleFilter.Q.setValueAtTime(1.4, now);

        const sizzleGain = ctx.createGain();
        sizzleGain.gain.setValueAtTime(0.28, now);

        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        noise.loop = true;
        noise.connect(sizzleFilter);
        sizzleFilter.connect(sizzleGain);
        sizzleGain.connect(master);

        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        this.sliceGain = master;
        this.sliceOsc1 = osc1;
        this.sliceOsc2 = osc2;
        this.sliceNoise = noise;
      } catch {
        this.teardownSliceNodes();
      }
    } else {
      const ctx = this.ctx;
      const gain = this.sliceGain;
      if (ctx && gain) {
        try {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          window.setTimeout(() => {
            if (!this.slicingActive) {
              this.teardownSliceNodes();
            }
          }, 70);
          return;
        } catch {
          // fall through
        }
      }
      this.teardownSliceNodes();
    }
  }

  private teardownSliceNodes(): void {
    const nodes: Array<OscillatorNode | AudioBufferSourceNode | null> = [
      this.sliceOsc1,
      this.sliceOsc2,
      this.sliceNoise,
    ];
    for (const node of nodes) {
      if (node) {
        try {
          node.stop();
        } catch {
          // already stopped
        }
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
    }
    if (this.sliceGain) {
      try {
        this.sliceGain.disconnect();
      } catch {
        // ignore
      }
    }
    this.sliceOsc1 = null;
    this.sliceOsc2 = null;
    this.sliceNoise = null;
    this.sliceGain = null;
  }

  public playSwitchDish(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.06);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore audio errors
    }
  }

  public playTick(urgent: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(urgent ? 920 : 640, now);

      gain.gain.setValueAtTime(urgent ? 0.045 : 0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // ignore
    }
  }

  public playFinish(overallAccuracy: number): void {
    this.setSlicing(false);
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = overallAccuracy >= 72 ? [523.25, 659.25, 783.99, 1046.5] : [440, 392];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.27);
      });
    } catch {
      // ignore
    }
  }

  public dispose(): void {
    this.slicingActive = false;
    this.teardownSliceNodes();
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }
}
