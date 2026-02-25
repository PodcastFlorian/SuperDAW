// ============================================================
// SuperDAW Audio Engine
// Built on Web Audio API with support for real-time playback,
// recording, effects processing, and waveform analysis.
// ============================================================

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private analyser: AnalyserNode;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private panNodes: Map<string, StereoPannerNode> = new Map();
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private onTimeUpdate?: (time: number) => void;
  private animationFrame?: number;

  constructor() {
    this.context = new AudioContext({ sampleRate: 48000 });
    this.masterGain = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  get sampleRate(): number {
    return this.context.sampleRate;
  }

  get currentTime(): number {
    if (!this.isPlaying) return this.pauseOffset;
    return this.context.currentTime - this.startTime + this.pauseOffset;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  setOnTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdate = callback;
  }

  async loadAudioFile(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!;
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadAudioFromArrayBuffer(arrayBuffer: ArrayBuffer, key: string): Promise<AudioBuffer> {
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.bufferCache.set(key, audioBuffer);
    return audioBuffer;
  }

  getBuffer(key: string): AudioBuffer | undefined {
    return this.bufferCache.get(key);
  }

  play(
    clips: Array<{
      id: string;
      bufferKey: string;
      startTime: number;
      offset: number;
      duration: number;
      gain: number;
      pan: number;
      fadeIn: number;
      fadeOut: number;
    }>,
    fromTime: number = 0
  ) {
    this.stopAll();
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    this.isPlaying = true;
    this.startTime = this.context.currentTime;
    this.pauseOffset = fromTime;

    for (const clip of clips) {
      const buffer = this.bufferCache.get(clip.bufferKey);
      if (!buffer) continue;

      const source = this.context.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.context.createGain();
      gainNode.gain.value = clip.gain;

      const panNode = this.context.createStereoPanner();
      panNode.pan.value = clip.pan;

      // Fade in
      if (clip.fadeIn > 0) {
        const fadeStart = Math.max(0, clip.startTime - fromTime);
        gainNode.gain.setValueAtTime(0, this.context.currentTime + fadeStart);
        gainNode.gain.linearRampToValueAtTime(
          clip.gain,
          this.context.currentTime + fadeStart + clip.fadeIn
        );
      }

      // Fade out
      if (clip.fadeOut > 0) {
        const fadeOutStart = clip.startTime + clip.duration - clip.fadeOut - fromTime;
        if (fadeOutStart > 0) {
          gainNode.gain.setValueAtTime(clip.gain, this.context.currentTime + fadeOutStart);
          gainNode.gain.linearRampToValueAtTime(
            0,
            this.context.currentTime + fadeOutStart + clip.fadeOut
          );
        }
      }

      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.masterGain);

      const clipOffset = Math.max(0, fromTime - clip.startTime);
      const when = Math.max(0, clip.startTime - fromTime);
      const playDuration = clip.duration - clipOffset;

      if (playDuration > 0) {
        source.start(
          this.context.currentTime + when,
          clip.offset + clipOffset,
          playDuration
        );
      }

      this.sources.set(clip.id, source);
      this.gainNodes.set(clip.id, gainNode);
      this.panNodes.set(clip.id, panNode);
    }

    this.startTimeUpdateLoop();
  }

  pause() {
    this.pauseOffset = this.currentTime;
    this.stopAll();
  }

  stop() {
    this.pauseOffset = 0;
    this.stopAll();
  }

  private stopAll() {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    for (const source of this.sources.values()) {
      try { source.stop(); } catch {}
    }
    this.sources.clear();
    this.gainNodes.clear();
    this.panNodes.clear();
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.01);
  }

  setClipGain(clipId: string, gain: number) {
    const node = this.gainNodes.get(clipId);
    if (node) node.gain.setTargetAtTime(gain, this.context.currentTime, 0.01);
  }

  setClipPan(clipId: string, pan: number) {
    const node = this.panNodes.get(clipId);
    if (node) node.pan.setTargetAtTime(pan, this.context.currentTime, 0.01);
  }

  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  async generateWaveformData(buffer: AudioBuffer, numSamples: number = 1000): Promise<Float32Array> {
    const channelData = buffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / numSamples);
    const waveform = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      let max = 0;
      const start = i * samplesPerPixel;
      for (let j = 0; j < samplesPerPixel; j++) {
        const abs = Math.abs(channelData[start + j] || 0);
        if (abs > max) max = abs;
      }
      waveform[i] = max;
    }

    return waveform;
  }

  async detectSilence(
    buffer: AudioBuffer,
    thresholdDb: number = -40,
    minDurationSec: number = 0.5
  ): Promise<Array<{ start: number; end: number }>> {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const threshold = Math.pow(10, thresholdDb / 20);
    const minSamples = minDurationSec * sampleRate;
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms windows

    const silences: Array<{ start: number; end: number }> = [];
    let silenceStart: number | null = null;

    for (let i = 0; i < channelData.length; i += windowSize) {
      let rms = 0;
      const end = Math.min(i + windowSize, channelData.length);
      for (let j = i; j < end; j++) {
        rms += channelData[j] * channelData[j];
      }
      rms = Math.sqrt(rms / (end - i));

      if (rms < threshold) {
        if (silenceStart === null) silenceStart = i;
      } else {
        if (silenceStart !== null) {
          const duration = i - silenceStart;
          if (duration >= minSamples) {
            silences.push({
              start: silenceStart / sampleRate,
              end: i / sampleRate,
            });
          }
          silenceStart = null;
        }
      }
    }

    return silences;
  }

  async measureLoudness(buffer: AudioBuffer): Promise<{
    integrated: number;
    peak: number;
    rms: number;
  }> {
    const channelData = buffer.getChannelData(0);
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
      sumSquares += channelData[i] * channelData[i];
    }

    const rms = Math.sqrt(sumSquares / channelData.length);
    const integrated = 20 * Math.log10(rms + 1e-10);

    return { integrated, peak, rms };
  }

  private startTimeUpdateLoop() {
    const update = () => {
      if (!this.isPlaying) return;
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime);
      }
      this.animationFrame = requestAnimationFrame(update);
    };
    update();
  }

  async startRecording(): Promise<MediaRecorder> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    return recorder;
  }

  destroy() {
    this.stopAll();
    this.context.close();
    this.bufferCache.clear();
  }
}

// Singleton
let engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
