// ============================================================
// SuperDAW AI Service
// Handles transcription, filler word detection, noise detection,
// loudness analysis, and learning from editing patterns.
// ============================================================

import { v4 as uuid } from 'uuid';
import type {
  AIAnalysis, TranscriptSegment, ClipRegion, LoudnessProfile,
  SuggestedCut, EditingPattern, FillerType,
} from '../types';
import { getAudioEngine } from '../engine/AudioEngine';

// Filler word patterns for detection (multi-language)
const FILLER_PATTERNS: Record<string, FillerType> = {
  'um': 'um', 'umm': 'um', 'ähm': 'um', 'ähh': 'um',
  'uh': 'uh', 'uhh': 'uh',
  'ah': 'ah', 'ahh': 'ah',
  'like': 'like',
  'you know': 'you-know', 'weißt du': 'you-know',
  'so': 'so', 'also': 'so',
  'basically': 'basically', 'eigentlich': 'basically',
  'actually': 'actually',
  'right': 'right', 'oder': 'right', 'ne': 'right',
};

export class AIService {
  private editPatterns: EditingPattern[] = [];
  private modelConfidence = 0;

  async analyzeAudio(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number, status: string) => void
  ): Promise<AIAnalysis> {
    onProgress?.(5, 'Analyzing audio levels...');

    // Step 1: Loudness analysis
    const loudnessProfile = await this.analyzeLoudness(audioBuffer);
    onProgress?.(20, 'Detecting silence regions...');

    // Step 2: Silence detection
    const engine = getAudioEngine();
    const silenceRaw = await engine.detectSilence(audioBuffer, -40, 0.3);
    const silences: ClipRegion[] = silenceRaw.map(s => ({
      id: uuid(),
      type: 'silence',
      startTime: s.start,
      endTime: s.end,
      confidence: 0.95,
    }));
    onProgress?.(40, 'Transcribing audio...');

    // Step 3: Transcription (simulated - in production use Whisper API)
    const transcript = await this.transcribeAudio(audioBuffer);
    onProgress?.(70, 'Detecting filler words...');

    // Step 4: Filler word detection
    const fillerWords = this.detectFillerWords(transcript);
    onProgress?.(85, 'Detecting noise regions...');

    // Step 5: Noise detection
    const noiseRegions = await this.detectNoise(audioBuffer);
    onProgress?.(95, 'Generating edit suggestions...');

    // Step 6: Generate suggested cuts
    const suggestedCuts = this.generateSuggestedCuts(
      fillerWords, silences, noiseRegions
    );
    onProgress?.(100, 'Analysis complete!');

    return {
      transcript,
      fillerWords,
      silences,
      noiseRegions,
      loudnessProfile,
      suggestedCuts,
    };
  }

  private async analyzeLoudness(buffer: AudioBuffer): Promise<LoudnessProfile> {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.4); // 400ms for short-term
    const momentaryWindow = Math.floor(sampleRate * 0.1); // 100ms

    let totalRms = 0;
    let peak = 0;
    const shortTerm: number[] = [];
    const momentary: number[] = [];

    // Integrated & peak
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
      totalRms += channelData[i] * channelData[i];
    }
    const integrated = -0.691 + 10 * Math.log10(totalRms / channelData.length + 1e-10);

    // Short-term loudness
    for (let i = 0; i < channelData.length; i += windowSize) {
      let sum = 0;
      const end = Math.min(i + windowSize, channelData.length);
      for (let j = i; j < end; j++) sum += channelData[j] * channelData[j];
      shortTerm.push(-0.691 + 10 * Math.log10(sum / (end - i) + 1e-10));
    }

    // Momentary loudness
    for (let i = 0; i < channelData.length; i += momentaryWindow) {
      let sum = 0;
      const end = Math.min(i + momentaryWindow, channelData.length);
      for (let j = i; j < end; j++) sum += channelData[j] * channelData[j];
      momentary.push(-0.691 + 10 * Math.log10(sum / (end - i) + 1e-10));
    }

    const range = Math.max(...shortTerm) - Math.min(...shortTerm.filter(v => v > -70));

    return {
      integrated,
      shortTerm,
      momentary,
      truePeak: 20 * Math.log10(peak + 1e-10),
      range: isFinite(range) ? range : 0,
    };
  }

  private async transcribeAudio(buffer: AudioBuffer): Promise<TranscriptSegment[]> {
    // In production, this would call Whisper API or use @xenova/transformers
    // For the prototype, we generate demo transcript segments
    const duration = buffer.duration;
    const segments: TranscriptSegment[] = [];
    const samplePhrases = [
      'Welcome to the podcast.',
      'Today we are going to talk about',
      'um',
      'artificial intelligence and its impact on',
      'uh',
      'creative workflows.',
      'So basically what we want to cover is',
      'how AI can help with podcast production.',
      'You know,',
      'it is really fascinating how',
      'like',
      'the technology has evolved.',
      'Actually, let me give you an example.',
      'Right, so',
      'when you look at the editing process,',
      'um',
      'there are so many repetitive tasks.',
      'And that is where automation comes in.',
    ];

    let currentTime = 0.5;
    for (let i = 0; i < Math.min(samplePhrases.length, Math.floor(duration / 2)); i++) {
      const text = samplePhrases[i % samplePhrases.length];
      const segDuration = 0.5 + text.length * 0.06;
      const isFiller = Object.keys(FILLER_PATTERNS).some(
        p => text.toLowerCase().trim() === p
      );

      segments.push({
        id: uuid(),
        text,
        startTime: currentTime,
        endTime: currentTime + segDuration,
        speaker: 'Speaker 1',
        confidence: 0.85 + Math.random() * 0.14,
        isFiller,
        fillerType: isFiller
          ? FILLER_PATTERNS[text.toLowerCase().trim()]
          : undefined,
      });

      currentTime += segDuration + 0.1 + Math.random() * 0.3;
      if (currentTime >= duration - 1) break;
    }

    return segments;
  }

  private detectFillerWords(transcript: TranscriptSegment[]): TranscriptSegment[] {
    return transcript.filter(seg => {
      if (seg.isFiller) return true;
      const lower = seg.text.toLowerCase().trim();
      for (const pattern of Object.keys(FILLER_PATTERNS)) {
        if (lower === pattern || lower.startsWith(pattern + ' ') || lower.startsWith(pattern + ',')) {
          seg.isFiller = true;
          seg.fillerType = FILLER_PATTERNS[pattern];
          return true;
        }
      }
      return false;
    });
  }

  private async detectNoise(buffer: AudioBuffer): Promise<ClipRegion[]> {
    // Simplified noise detection using spectral analysis
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const frameSize = Math.floor(sampleRate * 0.05); // 50ms frames
    const noiseRegions: ClipRegion[] = [];
    let noiseStart: number | null = null;

    for (let i = 0; i < channelData.length; i += frameSize) {
      const end = Math.min(i + frameSize, channelData.length);
      let sum = 0;
      let zeroCrossings = 0;

      for (let j = i; j < end - 1; j++) {
        sum += Math.abs(channelData[j]);
        if ((channelData[j] > 0) !== (channelData[j + 1] > 0)) {
          zeroCrossings++;
        }
      }

      const avgAmplitude = sum / (end - i);
      const zcRate = zeroCrossings / ((end - i) / sampleRate);

      // High zero-crossing rate + low amplitude = likely noise
      const isNoise = zcRate > 3000 && avgAmplitude < 0.02 && avgAmplitude > 0.001;

      if (isNoise) {
        if (noiseStart === null) noiseStart = i;
      } else if (noiseStart !== null) {
        const duration = (i - noiseStart) / sampleRate;
        if (duration > 0.3) {
          noiseRegions.push({
            id: uuid(),
            type: 'noise',
            startTime: noiseStart / sampleRate,
            endTime: i / sampleRate,
            confidence: 0.75,
          });
        }
        noiseStart = null;
      }
    }

    return noiseRegions;
  }

  private generateSuggestedCuts(
    fillerWords: TranscriptSegment[],
    silences: ClipRegion[],
    noiseRegions: ClipRegion[],
  ): SuggestedCut[] {
    const cuts: SuggestedCut[] = [];

    // Suggest cutting filler words
    for (const filler of fillerWords) {
      cuts.push({
        id: uuid(),
        startTime: filler.startTime,
        endTime: filler.endTime,
        reason: `Filler word: "${filler.text}"`,
        type: 'filler',
        confidence: filler.confidence,
        applied: false,
      });
    }

    // Suggest trimming long silences (keep 0.3s)
    for (const silence of silences) {
      const silenceDuration = silence.endTime - silence.startTime;
      if (silenceDuration > 1.0) {
        cuts.push({
          id: uuid(),
          startTime: silence.startTime + 0.15,
          endTime: silence.endTime - 0.15,
          reason: `Long silence (${silenceDuration.toFixed(1)}s)`,
          type: 'silence',
          confidence: 0.9,
          applied: false,
        });
      }
    }

    // Suggest removing noise
    for (const noise of noiseRegions) {
      cuts.push({
        id: uuid(),
        startTime: noise.startTime,
        endTime: noise.endTime,
        reason: 'Background noise detected',
        type: 'noise',
        confidence: noise.confidence,
        applied: false,
      });
    }

    return cuts.sort((a, b) => a.startTime - b.startTime);
  }

  // ============================================================
  // Bot Learning System
  // ============================================================

  recordPattern(pattern: EditingPattern) {
    this.editPatterns.push(pattern);
    this.updateModel();
  }

  private updateModel() {
    // In production: train a lightweight model on editing patterns.
    // For prototype: track pattern frequency and build heuristics.
    this.modelConfidence = Math.min(
      0.95,
      this.editPatterns.length / 100
    );
  }

  getAutopilotConfidence(): number {
    return this.modelConfidence;
  }

  getPatternCount(): number {
    return this.editPatterns.length;
  }

  async generateAutopilotSuggestions(
    analysis: AIAnalysis
  ): Promise<SuggestedCut[]> {
    // Use learned patterns to refine suggestions
    const baseSuggestions = analysis.suggestedCuts.filter(c => !c.applied);

    if (this.editPatterns.length < 10) {
      return baseSuggestions;
    }

    // Analyze which types of cuts the user usually accepts
    const acceptedTypes = new Map<string, number>();
    const rejectedTypes = new Map<string, number>();

    for (const pattern of this.editPatterns) {
      const key = pattern.action.type;
      if (pattern.action.type === 'cut') {
        acceptedTypes.set(key, (acceptedTypes.get(key) || 0) + 1);
      }
    }

    // Adjust confidence based on learned preferences
    return baseSuggestions.map(cut => ({
      ...cut,
      confidence: cut.confidence * (1 + this.modelConfidence * 0.2),
    }));
  }

  exportPatterns(): string {
    return JSON.stringify(this.editPatterns, null, 2);
  }

  importPatterns(json: string) {
    try {
      this.editPatterns = JSON.parse(json);
      this.updateModel();
    } catch (e) {
      console.error('Failed to import patterns:', e);
    }
  }
}

// Singleton
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
