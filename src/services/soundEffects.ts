// Web Audio API Procedural Sound Synthesizer
// 100% Procedural Audio — Zero External MP3/WAV Dependencies

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 1. Earthquake Sub-Bass Rumble (Low-frequency noise + dual oscillator mod)
  public playEarthquakeRumble(durationSeconds = 3.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Sub-bass sine wave dropping from 65Hz to 28Hz
    const osc1 = ctx.createOscillator();
    const oscGain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(65, now);
    osc1.frequency.exponentialRampToValueAtTime(28, now + durationSeconds);

    oscGain1.gain.setValueAtTime(0.35, now);
    oscGain1.gain.exponentialRampToValueAtTime(0.01, now + durationSeconds);

    osc1.connect(oscGain1);
    oscGain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + durationSeconds);

    // Rumble Noise Buffer
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    // Brown noise filter
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass filter for deep sub-tectonic rumble
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(45, now + durationSeconds);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + durationSeconds);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSeconds);
  }

  // 2. Kiro Spectral Roar / Cosmic Laugh (Modulated formant oscillator)
  public playKiroRoar() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(90, now + 1.8);

    // LFO for creepy ghostly vibrato
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(12, now);
    lfoGain.gain.setValueAtTime(45, now);
    lfo.connect(osc.frequency);

    mainGain.gain.setValueAtTime(0.2, now);
    mainGain.gain.linearRampToValueAtTime(0.3, now + 0.4);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(mainGain);
    mainGain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 1.8);
    osc.stop(now + 1.8);
  }

  // 3. Physical Subsea/Terrestrial Fiber Cut Alarm & Cable Snap
  public playFiberCutAlert() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // High tension optical cable snap sound (sawtooth snap into filter decay)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(2400, now);
    snapOsc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(3.5, now);

    snapGain.gain.setValueAtTime(0.4, now);
    snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    snapOsc.connect(filter);
    filter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.22);

    // Follow up immediately with BGP telemetry alert
    setTimeout(() => {
      this.playBgpAlarm();
    }, 150);
  }

  // Alias for compatibility
  public playMeteorStrike() {
    this.playFiberCutAlert();
  }

  // 4. BGP Fiber Cut Alarm Klaxon
  public playBgpAlarm() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';

      const startTime = now + i * 0.22;
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.setValueAtTime(660, startTime + 0.1);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.19);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    }
  }

  // 5. Emergency Truck Radio Dispatch Chirp
  public playTruckDispatch() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    osc.frequency.setValueAtTime(1320, now + 0.16);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  // 6. Optical Ping Sonar / Telemetry Pulse
  public playPingSonar() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1650, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  }
}

export const soundFx = new SoundEffectsEngine();

