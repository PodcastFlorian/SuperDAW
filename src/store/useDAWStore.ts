import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  Project, Track, Clip, TransportState, ViewState, Marker,
  AIAnalysis, SuggestedCut, CustomerPreset, ProjectTemplate,
  EditingPattern, EditAction, EditContext, SidebarTab,
} from '../types';

export type ToolMode = 'select' | 'range' | 'split' | 'eraser';

interface DAWState {
  // Project
  project: Project;
  isDirty: boolean;

  // Transport
  transportState: TransportState;
  currentTime: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  metronomeEnabled: boolean;

  // View
  view: ViewState;
  markers: Marker[];

  // Tool & Selection
  activeTool: ToolMode;
  selectedClipId: string | null;
  selectedTrackId: string | null;

  // AI
  aiAnalysis: AIAnalysis | null;
  aiProcessing: boolean;
  aiProgress: number;
  editingPatterns: EditingPattern[];
  autopilotEnabled: boolean;

  // Templates & Presets
  templates: ProjectTemplate[];
  customerPresets: CustomerPreset[];

  // Actions - Project
  createProject: (name: string, template?: ProjectTemplate) => void;
  setProjectName: (name: string) => void;

  // Actions - Tracks
  addTrack: (type: Track['type'], name?: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Actions - Clips
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  splitClip: (trackId: string, clipId: string, atTime: number) => void;
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string, newStartTime: number) => void;

  // Actions - Transport
  play: () => void;
  pause: () => void;
  stop: () => void;
  record: () => void;
  setCurrentTime: (time: number) => void;
  toggleLoop: () => void;

  // Actions - View
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  setSelection: (start: number | null, end: number | null) => void;
  toggleSnap: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleTranscript: () => void;
  toggleAIPanel: () => void;
  toggleMixer: () => void;

  // Actions - Tool & Selection
  setActiveTool: (tool: ToolMode) => void;
  setSelectedClip: (clipId: string | null, trackId: string | null) => void;

  // Actions - Markers
  addMarker: (time: number, name: string, type?: Marker['type']) => void;
  removeMarker: (markerId: string) => void;

  // Actions - AI
  setAIAnalysis: (analysis: AIAnalysis) => void;
  setAIProcessing: (processing: boolean, progress?: number) => void;
  applySuggestedCut: (cutId: string) => void;
  applyAllSuggestedCuts: () => void;
  dismissSuggestedCut: (cutId: string) => void;
  toggleAutopilot: () => void;
  recordEditingPattern: (action: EditAction, context: EditContext) => void;

  // Actions - Templates & Presets
  addTemplate: (template: ProjectTemplate) => void;
  addCustomerPreset: (preset: CustomerPreset) => void;
  loadTemplate: (templateId: string) => void;
  loadCustomerPreset: (presetId: string) => void;
}

const TRACK_COLORS = [
  '#4A9EFF', '#FF6B6B', '#51CF66', '#FFD43B',
  '#CC5DE8', '#FF922B', '#20C997', '#F06595',
];

// ============================================================
// Default Templates
// ============================================================

const defaultTemplates: ProjectTemplate[] = [
  {
    id: 'tpl-solo-podcast',
    name: 'Solo Podcast',
    description: 'Single host podcast with intro/outro',
    tracks: [
      {
        id: 'tpl-track-host', name: 'Host', type: 'audio',
        color: '#4A9EFF', muted: false, solo: false, armed: false,
        volume: 0.8, pan: 0, plugins: [], automationLanes: [], height: 100,
      },
      {
        id: 'tpl-track-music', name: 'Music/SFX', type: 'audio',
        color: '#51CF66', muted: false, solo: false, armed: false,
        volume: 0.5, pan: 0, plugins: [], automationLanes: [], height: 60,
      },
      {
        id: 'tpl-track-master', name: 'Master', type: 'bus',
        color: '#FFD43B', muted: false, solo: false, armed: false,
        volume: 1.0, pan: 0, plugins: [], automationLanes: [], height: 60,
      },
    ],
    defaultPlugins: [],
    loudnessTarget: -16,
    category: 'solo',
  },
  {
    id: 'tpl-interview',
    name: 'Interview (2 Speakers)',
    description: 'Two-person interview with separate tracks',
    tracks: [
      {
        id: 'tpl-track-host2', name: 'Host', type: 'audio',
        color: '#4A9EFF', muted: false, solo: false, armed: false,
        volume: 0.8, pan: -0.2, plugins: [], automationLanes: [], height: 100,
      },
      {
        id: 'tpl-track-guest', name: 'Guest', type: 'audio',
        color: '#FF6B6B', muted: false, solo: false, armed: false,
        volume: 0.8, pan: 0.2, plugins: [], automationLanes: [], height: 100,
      },
      {
        id: 'tpl-track-music2', name: 'Music/SFX', type: 'audio',
        color: '#51CF66', muted: false, solo: false, armed: false,
        volume: 0.5, pan: 0, plugins: [], automationLanes: [], height: 60,
      },
      {
        id: 'tpl-track-master2', name: 'Master', type: 'bus',
        color: '#FFD43B', muted: false, solo: false, armed: false,
        volume: 1.0, pan: 0, plugins: [], automationLanes: [], height: 60,
      },
    ],
    defaultPlugins: [],
    loudnessTarget: -16,
    category: 'interview',
  },
  {
    id: 'tpl-panel',
    name: 'Panel Discussion',
    description: 'Multi-speaker panel with up to 4 participants',
    tracks: [
      {
        id: 'tpl-track-mod', name: 'Moderator', type: 'audio',
        color: '#4A9EFF', muted: false, solo: false, armed: false,
        volume: 0.8, pan: 0, plugins: [], automationLanes: [], height: 80,
      },
      {
        id: 'tpl-track-p1', name: 'Speaker 1', type: 'audio',
        color: '#FF6B6B', muted: false, solo: false, armed: false,
        volume: 0.8, pan: -0.3, plugins: [], automationLanes: [], height: 80,
      },
      {
        id: 'tpl-track-p2', name: 'Speaker 2', type: 'audio',
        color: '#51CF66', muted: false, solo: false, armed: false,
        volume: 0.8, pan: 0.3, plugins: [], automationLanes: [], height: 80,
      },
      {
        id: 'tpl-track-p3', name: 'Speaker 3', type: 'audio',
        color: '#CC5DE8', muted: false, solo: false, armed: false,
        volume: 0.8, pan: -0.1, plugins: [], automationLanes: [], height: 80,
      },
    ],
    defaultPlugins: [],
    loudnessTarget: -16,
    category: 'panel',
  },
];

const defaultView: ViewState = {
  zoom: 100,
  scrollX: 0,
  scrollY: 0,
  playheadPosition: 0,
  selectionStart: null,
  selectionEnd: null,
  snapEnabled: true,
  snapResolution: '0.1s',
  showTranscript: false,
  showAIPanel: true,
  showMixer: true,
  sidebarTab: 'ai',
  theme: 'dark',
};

const createDefaultProject = (name: string): Project => ({
  id: uuid(),
  name,
  sampleRate: 48000,
  bitDepth: 24,
  tempo: 120,
  tracks: [],
  createdAt: Date.now(),
  modifiedAt: Date.now(),
});

export const useDAWStore = create<DAWState>((set, get) => ({
  project: createDefaultProject('Untitled Podcast'),
  isDirty: false,
  transportState: 'stopped',
  currentTime: 0,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 0,
  metronomeEnabled: false,
  view: defaultView,
  markers: [],
  aiAnalysis: null,
  aiProcessing: false,
  aiProgress: 0,
  editingPatterns: [],
  autopilotEnabled: false,
  templates: defaultTemplates,
  customerPresets: [],
  activeTool: 'select',
  selectedClipId: null,
  selectedTrackId: null,

  // Project
  createProject: (name, template) => {
    const project = createDefaultProject(name);
    if (template) {
      project.tracks = template.tracks.map(t => ({ ...t, clips: [] }));
      project.template = template;
    }
    set({ project, isDirty: false, aiAnalysis: null });
  },

  setProjectName: (name) => set(state => ({
    project: { ...state.project, name, modifiedAt: Date.now() },
    isDirty: true,
  })),

  // Tracks
  addTrack: (type, name) => set(state => {
    const trackCount = state.project.tracks.length;
    const newTrack: Track = {
      id: uuid(),
      name: name || `Track ${trackCount + 1}`,
      type,
      color: TRACK_COLORS[trackCount % TRACK_COLORS.length],
      muted: false,
      solo: false,
      armed: false,
      volume: 0.8,
      pan: 0,
      clips: [],
      plugins: [],
      automationLanes: [],
      height: 80,
    };
    return {
      project: {
        ...state.project,
        tracks: [...state.project.tracks, newTrack],
        modifiedAt: Date.now(),
      },
      isDirty: true,
    };
  }),

  removeTrack: (trackId) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.filter(t => t.id !== trackId),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  updateTrack: (trackId, updates) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.map(t =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  reorderTracks: (fromIndex, toIndex) => set(state => {
    const tracks = [...state.project.tracks];
    const [moved] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, moved);
    return {
      project: { ...state.project, tracks, modifiedAt: Date.now() },
      isDirty: true,
    };
  }),

  // Clips
  addClip: (trackId, clipData) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: [...t.clips, { ...clipData, id: uuid(), trackId }] }
          : t
      ),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  removeClip: (trackId, clipId) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter(c => c.id !== clipId) }
          : t
      ),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  updateClip: (trackId, clipId, updates) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) }
          : t
      ),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  splitClip: (trackId, clipId, atTime) => set(state => ({
    project: {
      ...state.project,
      tracks: state.project.tracks.map(t => {
        if (t.id !== trackId) return t;
        const clip = t.clips.find(c => c.id === clipId);
        if (!clip) return t;

        const relativeTime = atTime - clip.startTime;
        if (relativeTime <= 0 || relativeTime >= clip.duration) return t;

        const leftClip: Clip = {
          ...clip,
          duration: relativeTime,
          fadeOut: 0.01,
        };
        const rightClip: Clip = {
          ...clip,
          id: uuid(),
          startTime: atTime,
          offset: clip.offset + relativeTime,
          duration: clip.duration - relativeTime,
          fadeIn: 0.01,
        };

        return {
          ...t,
          clips: t.clips.map(c => c.id === clipId ? leftClip : c).concat(rightClip),
        };
      }),
      modifiedAt: Date.now(),
    },
    isDirty: true,
  })),

  moveClip: (fromTrackId, toTrackId, clipId, newStartTime) => set(state => {
    let movedClip: Clip | null = null;
    const tracks = state.project.tracks.map(t => {
      if (t.id === fromTrackId) {
        const clip = t.clips.find(c => c.id === clipId);
        if (clip) movedClip = { ...clip, startTime: newStartTime, trackId: toTrackId };
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
      }
      return t;
    });
    if (!movedClip) return {};
    return {
      project: {
        ...state.project,
        tracks: tracks.map(t =>
          t.id === toTrackId ? { ...t, clips: [...t.clips, movedClip!] } : t
        ),
        modifiedAt: Date.now(),
      },
      isDirty: true,
    };
  }),

  // Transport
  play: () => set({ transportState: 'playing' }),
  pause: () => set(state => ({
    transportState: state.transportState === 'playing' ? 'paused' : state.transportState,
  })),
  stop: () => set({ transportState: 'stopped', currentTime: 0 }),
  record: () => set({ transportState: 'recording' }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  toggleLoop: () => set(state => ({ loopEnabled: !state.loopEnabled })),

  // View
  setZoom: (zoom) => set(state => ({
    view: { ...state.view, zoom: Math.max(10, Math.min(500, zoom)) },
  })),
  setScroll: (x, y) => set(state => ({
    view: { ...state.view, scrollX: x, scrollY: y },
  })),
  setSelection: (start, end) => set(state => ({
    view: { ...state.view, selectionStart: start, selectionEnd: end },
  })),
  toggleSnap: () => set(state => ({
    view: { ...state.view, snapEnabled: !state.view.snapEnabled },
  })),
  setSidebarTab: (tab) => set(state => ({
    view: { ...state.view, sidebarTab: tab },
  })),
  toggleTranscript: () => set(state => ({
    view: { ...state.view, showTranscript: !state.view.showTranscript },
  })),
  toggleAIPanel: () => set(state => ({
    view: { ...state.view, showAIPanel: !state.view.showAIPanel },
  })),
  toggleMixer: () => set(state => ({
    view: { ...state.view, showMixer: !state.view.showMixer },
  })),

  // Tool & Selection
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedClip: (clipId, trackId) => set({ selectedClipId: clipId, selectedTrackId: trackId }),

  // Markers
  addMarker: (time, name, type = 'marker') => set(state => ({
    markers: [...state.markers, { id: uuid(), time, name, color: '#FFD43B', type }],
  })),
  removeMarker: (markerId) => set(state => ({
    markers: state.markers.filter(m => m.id !== markerId),
  })),

  // AI
  setAIAnalysis: (analysis) => set({ aiAnalysis: analysis, aiProcessing: false, aiProgress: 100 }),
  setAIProcessing: (processing, progress = 0) => set({ aiProcessing: processing, aiProgress: progress }),
  applySuggestedCut: (cutId) => {
    const { aiAnalysis } = get();
    if (!aiAnalysis) return;
    const cut = aiAnalysis.suggestedCuts.find(c => c.id === cutId);
    if (!cut) return;
    set({
      aiAnalysis: {
        ...aiAnalysis,
        suggestedCuts: aiAnalysis.suggestedCuts.map(c =>
          c.id === cutId ? { ...c, applied: true } : c
        ),
      },
    });
  },
  applyAllSuggestedCuts: () => {
    const { aiAnalysis } = get();
    if (!aiAnalysis) return;
    set({
      aiAnalysis: {
        ...aiAnalysis,
        suggestedCuts: aiAnalysis.suggestedCuts.map(c => ({ ...c, applied: true })),
      },
    });
  },
  dismissSuggestedCut: (cutId) => {
    const { aiAnalysis } = get();
    if (!aiAnalysis) return;
    set({
      aiAnalysis: {
        ...aiAnalysis,
        suggestedCuts: aiAnalysis.suggestedCuts.filter(c => c.id !== cutId),
      },
    });
  },
  toggleAutopilot: () => set(state => ({ autopilotEnabled: !state.autopilotEnabled })),
  recordEditingPattern: (action, context) => set(state => ({
    editingPatterns: [
      ...state.editingPatterns,
      { id: uuid(), action, context, timestamp: Date.now() },
    ],
  })),

  // Templates & Presets
  addTemplate: (template) => set(state => ({
    templates: [...state.templates, template],
  })),
  addCustomerPreset: (preset) => set(state => ({
    customerPresets: [...state.customerPresets, preset],
  })),
  loadTemplate: (templateId) => {
    const template = get().templates.find(t => t.id === templateId);
    if (template) get().createProject(template.name, template);
  },
  loadCustomerPreset: (presetId) => {
    const preset = get().customerPresets.find(p => p.id === presetId);
    if (preset) get().createProject(preset.clientName, preset.template);
  },
}));
