// ============================================================
// SuperDAW Core Types
// ============================================================

export interface Project {
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: number;
  tempo: number;
  tracks: Track[];
  template?: ProjectTemplate;
  createdAt: number;
  modifiedAt: number;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  volume: number;       // 0-1
  pan: number;          // -1 to 1
  clips: Clip[];
  plugins: PluginInstance[];
  automationLanes: AutomationLane[];
  height: number;       // px
}

export type TrackType = 'audio' | 'bus' | 'master';

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;    // seconds
  duration: number;     // seconds
  offset: number;       // source offset in seconds
  audioBufferUrl: string;
  waveformData?: Float32Array;
  fadeIn: number;
  fadeOut: number;
  gain: number;
  regions?: ClipRegion[];
}

export interface ClipRegion {
  id: string;
  type: 'filler' | 'silence' | 'speech' | 'music' | 'noise' | 'breath' | 'stutter';
  startTime: number;
  endTime: number;
  confidence: number;
  label?: string;
}

export interface PluginInstance {
  id: string;
  name: string;
  type: PluginType;
  format: PluginFormat;
  enabled: boolean;
  parameters: Record<string, number>;
  presetName?: string;
}

export type PluginType = 'effect' | 'instrument' | 'analyzer' | 'ara';
export type PluginFormat = 'vst3' | 'vst2' | 'au' | 'ara' | 'builtin';

export interface AutomationLane {
  id: string;
  parameter: string;
  points: AutomationPoint[];
  visible: boolean;
}

export interface AutomationPoint {
  time: number;
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic' | 'step';
}

// ============================================================
// AI Types
// ============================================================

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence: number;
  isFiller: boolean;
  fillerType?: FillerType;
}

export type FillerType = 'um' | 'uh' | 'ah' | 'like' | 'you-know' | 'so' | 'basically' | 'actually' | 'right' | 'pause';

export interface AIAnalysis {
  transcript: TranscriptSegment[];
  fillerWords: TranscriptSegment[];
  silences: ClipRegion[];
  noiseRegions: ClipRegion[];
  breathRegions: ClipRegion[];
  loudnessProfile: LoudnessProfile;
  suggestedCuts: SuggestedCut[];
  speakers: SpeakerProfile[];
  chapters: ChapterMarker[];
  summary: ContentSummary | null;
  sentimentTimeline: SentimentPoint[];
  repetitions: RepetitionRegion[];
}

export interface LoudnessProfile {
  integrated: number;    // LUFS
  shortTerm: number[];
  momentary: number[];
  truePeak: number;
  range: number;
}

export interface SuggestedCut {
  id: string;
  startTime: number;
  endTime: number;
  reason: string;
  type: 'filler' | 'silence' | 'noise' | 'repetition' | 'breath' | 'stutter';
  confidence: number;
  applied: boolean;
}

export interface EditingPattern {
  id: string;
  action: EditAction;
  context: EditContext;
  timestamp: number;
}

export type EditAction =
  | { type: 'cut'; startTime: number; endTime: number }
  | { type: 'trim'; clipId: string; side: 'start' | 'end'; amount: number }
  | { type: 'gain'; clipId: string; value: number }
  | { type: 'delete'; clipId: string }
  | { type: 'crossfade'; clipAId: string; clipBId: string; duration: number }
  | { type: 'apply-effect'; pluginName: string };

export interface EditContext {
  regionType: string;
  surroundingContent: string;
  audioLevel: number;
  silenceBefore: number;
  silenceAfter: number;
}

// ============================================================
// Template & Preset Types
// ============================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tracks: Omit<Track, 'clips'>[];
  introClipUrl?: string;
  outroClipUrl?: string;
  defaultPlugins: PluginInstance[];
  loudnessTarget: number; // LUFS
  category: 'podcast' | 'interview' | 'solo' | 'panel' | 'narrative';
}

export interface CustomerPreset {
  id: string;
  clientName: string;
  template: ProjectTemplate;
  introAudioUrl?: string;
  outroAudioUrl?: string;
  brandColors: string[];
  loudnessTarget: number;
  deliveryFormat: DeliveryFormat;
  notes: string;
}

export interface DeliveryFormat {
  format: 'wav' | 'mp3' | 'flac' | 'aac';
  sampleRate: number;
  bitRate?: number;
  channels: 1 | 2;
  loudnessStandard: 'podcast' | 'broadcast' | 'streaming';
}

// ============================================================
// UI State Types
// ============================================================

export interface ViewState {
  zoom: number;           // pixels per second
  scrollX: number;        // horizontal scroll position
  scrollY: number;        // vertical scroll position
  playheadPosition: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  snapEnabled: boolean;
  snapResolution: SnapResolution;
  showTranscript: boolean;
  showAIPanel: boolean;
  showMixer: boolean;
  sidebarTab: SidebarTab;
  theme: 'dark' | 'light';
}

export type SnapResolution = 'off' | 'bar' | 'beat' | '0.1s' | '0.5s' | '1s';
export type SidebarTab = 'files' | 'ai' | 'plugins' | 'templates' | 'presets';

export type TransportState = 'stopped' | 'playing' | 'recording' | 'paused';

export interface Marker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'marker' | 'loop-start' | 'loop-end' | 'chapter';
}

// ============================================================
// Speaker Diarization
// ============================================================

export interface SpeakerProfile {
  id: string;
  label: string;
  color: string;
  totalSpeakingTime: number;
  segments: SpeakerSegment[];
  voiceProfile: VoiceProfile;
}

export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface VoiceProfile {
  pitchMean: number;       // Hz
  pitchRange: number;      // Hz
  energyMean: number;      // dB
  suggestedEQ: EQPreset;
}

export interface EQPreset {
  name: string;
  bands: Array<{
    frequency: number;
    gain: number;
    q: number;
    type: 'lowshelf' | 'highshelf' | 'peaking' | 'highpass' | 'lowpass';
  }>;
}

// ============================================================
// Smart Chapters
// ============================================================

export interface ChapterMarker {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  summary: string;
  keywords: string[];
  confidence: number;
}

// ============================================================
// Content Summary & Show Notes
// ============================================================

export interface ContentSummary {
  title: string;
  shortSummary: string;
  longSummary: string;
  showNotes: string;
  keyTopics: string[];
  mentions: ContentMention[];
  suggestedTags: string[];
}

export interface ContentMention {
  text: string;
  type: 'person' | 'product' | 'company' | 'place' | 'concept';
  firstMentionTime: number;
}

// ============================================================
// Sentiment & Energy Analysis
// ============================================================

export interface SentimentPoint {
  time: number;
  sentiment: number;       // -1 to 1
  energy: number;          // 0 to 1
  label?: string;
}

// ============================================================
// Repetition / Stutter Detection
// ============================================================

export interface RepetitionRegion {
  id: string;
  startTime: number;
  endTime: number;
  type: 'stutter' | 'word-repeat' | 'phrase-repeat' | 'false-start';
  text: string;
  confidence: number;
}

// ============================================================
// URL Audio Download
// ============================================================

export interface URLDownloadRequest {
  url: string;
  format: 'audio' | 'video';
  quality: 'best' | 'good' | '128k' | '192k' | '320k';
}

export interface URLDownloadResult {
  success: boolean;
  filePath?: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  error?: string;
  source: 'youtube' | 'soundcloud' | 'spotify' | 'direct' | 'unknown';
}

export interface URLDownloadProgress {
  percent: number;
  speed?: string;
  eta?: string;
  status: 'resolving' | 'downloading' | 'converting' | 'done' | 'error';
}
