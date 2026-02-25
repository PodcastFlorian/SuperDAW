import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useDAWStore } from './store/useDAWStore';
import { TransportBar } from './components/transport/TransportBar';
import { Toolbar } from './components/toolbar/Toolbar';
import { Sidebar } from './components/sidebar/Sidebar';
import { TimeRuler } from './components/timeline/TimeRuler';
import { TrackHeader } from './components/tracks/TrackHeader';
import { TrackLane } from './components/tracks/TrackLane';
import { MixerPanel } from './components/mixer/MixerPanel';
import { AIPanel } from './components/ai/AIPanel';
import { TranscriptOverlay } from './components/timeline/TranscriptOverlay';
import { getAudioEngine } from './engine/AudioEngine';
import { importAudioFile } from './utils/importAudio';

export const App: React.FC = () => {
  const {
    project, view, addTrack, play, pause, stop,
    setCurrentTime, transportState, setZoom, setScroll,
    toggleMixer, toggleAIPanel, toggleTranscript,
    setSelection, splitClip, setActiveTool, setSelectedClip,
  } = useDAWStore();

  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const engineRef = useRef(getAudioEngine());
  const tracksAreaRef = useRef<HTMLDivElement>(null);

  // Wire audio engine time updates to store
  useEffect(() => {
    const engine = engineRef.current;
    engine.setOnTimeUpdate((time) => {
      useDAWStore.getState().setCurrentTime(time);
    });
    return () => engine.setOnTimeUpdate(() => {});
  }, []);

  // React to transport state changes
  useEffect(() => {
    const engine = engineRef.current;
    const state = useDAWStore.getState();
    if (transportState === 'playing') {
      // Gather all clips from all non-muted tracks
      const clips: Array<{
        id: string; bufferKey: string; startTime: number;
        offset: number; duration: number; gain: number;
        pan: number; fadeIn: number; fadeOut: number;
      }> = [];
      for (const track of state.project.tracks) {
        if (track.muted) continue;
        for (const clip of track.clips) {
          clips.push({
            id: clip.id,
            bufferKey: clip.audioBufferUrl,
            startTime: clip.startTime,
            offset: clip.offset,
            duration: clip.duration,
            gain: clip.gain * track.volume,
            pan: track.pan,
            fadeIn: clip.fadeIn,
            fadeOut: clip.fadeOut,
          });
        }
      }
      engine.play(clips, state.currentTime);
    } else if (transportState === 'paused') {
      engine.pause();
    } else if (transportState === 'stopped') {
      engine.stop();
    }
  }, [transportState]);

  // Global drag-drop for audio files (works anywhere in the app)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a|webm)$/i.test(f.name)
    );
    if (files.length === 0) return;
    // Import sequentially so tracks are created in order
    (async () => {
      for (const file of files) {
        try {
          await importAudioFile(file);
        } catch (err) {
          console.error('Failed to import:', file.name, err);
        }
      }
    })();
  }, []);

  // Scroll sync: capture scrollLeft from tracks area and update store
  const handleTracksScroll = useCallback((e: React.UIEvent) => {
    const el = e.currentTarget;
    setScroll(el.scrollLeft, el.scrollTop);
  }, [setScroll]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (transportState === 'playing') pause();
        else play();
        break;
      case 'Enter':
        e.preventDefault();
        stop();
        break;
      case 'Home':
        setCurrentTime(0);
        break;
      case 'v':
      case 'V':
        if (!e.ctrlKey && !e.metaKey) setActiveTool('select');
        break;
      case 'r':
      case 'R':
        if (!e.ctrlKey && !e.metaKey) setActiveTool('range');
        break;
      case 's':
      case 'S':
        if (!e.ctrlKey && !e.metaKey) setActiveTool('split');
        break;
      case 'e':
      case 'E':
        if (!e.ctrlKey && !e.metaKey) setActiveTool('eraser');
        break;
      case 'Delete':
      case 'Backspace': {
        const state = useDAWStore.getState();
        if (state.selectedClipId && state.selectedTrackId) {
          state.removeClip(state.selectedTrackId, state.selectedClipId);
          state.setSelectedClip(null, null);
        }
        break;
      }
      case 'm':
      case 'M':
        if (e.ctrlKey || e.metaKey) toggleMixer();
        break;
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleAIPanel();
        }
        break;
      case 't':
      case 'T':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleTranscript();
        }
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(view.zoom * 1.25);
        }
        break;
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(view.zoom * 0.8);
        }
        break;
      case 'Escape':
        setSelection(null, null);
        break;
    }
  }, [transportState, play, pause, stop, setCurrentTime, setZoom, view.zoom, toggleMixer, toggleAIPanel, toggleTranscript, setSelection, setActiveTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(view.zoom * factor);
    }
  }, [view.zoom, setZoom]);

  return (
    <div
      style={styles.app}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-screen drop overlay */}
      {dragOver && (
        <div style={styles.dropOverlay}>
          <div style={styles.dropOverlayContent}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-blue)' }}>
              Drop audio files to import
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              WAV, MP3, FLAC, AAC, OGG
            </p>
          </div>
        </div>
      )}

      {/* Top: Transport bar */}
      <TransportBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div style={styles.mainArea}>
        {/* Left sidebar */}
        <Sidebar />

        {/* Center: Timeline + Tracks */}
        <div style={styles.centerArea} onWheel={handleWheel}>
          {/* Time ruler */}
          <TimeRuler />

          {/* Tracks area */}
          <div
            ref={tracksAreaRef}
            style={styles.tracksArea}
            onScroll={handleTracksScroll}
          >

            {project.tracks.map(track => (
              <div key={track.id} style={styles.trackRow}>
                <TrackHeader track={track} />
                <TrackLane track={track} />
              </div>
            ))}

            {/* Empty state */}
            {project.tracks.length === 0 && (
              <div style={styles.emptyTracks}>
                <p style={styles.emptyText}>No tracks yet</p>
                <p style={styles.emptySubtext}>
                  Drop audio files here or click "+ Track" to get started
                </p>
              </div>
            )}

            {/* Add track area */}
            <div style={styles.addTrackArea}>
              <button
                style={styles.addTrackBtn}
                onClick={() => addTrack('audio')}
              >
                + Add Audio Track
              </button>
              <button
                style={styles.addBusBtn}
                onClick={() => addTrack('bus', 'Bus')}
              >
                + Add Bus
              </button>
            </div>
          </div>

          {/* Transcript overlay */}
          <TranscriptOverlay />
        </div>

        {/* Right: AI Panel */}
        <AIPanel />
      </div>

      {/* Bottom: Mixer */}
      <MixerPanel />

      {/* Status bar */}
      <div style={styles.statusBar}>
        <span>SuperDAW v0.1.0 - AI Podcast Studio</span>
        <div style={styles.statusRight}>
          <span style={styles.statusItem}>
            {project.tracks.length} tracks
          </span>
          <span style={styles.statusItem}>
            {project.sampleRate / 1000}kHz / {project.bitDepth}bit
          </span>
          <span style={styles.statusItem}>
            Zoom: {Math.round(view.zoom)}%
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-darkest)',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  tracksArea: {
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg-darkest)',
    position: 'relative',
  },
  dropOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13,13,15,0.85)',
    border: '3px dashed var(--accent-blue)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  dropOverlayContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  trackRow: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
  },
  emptyTracks: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptySubtext: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  addTrackArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
  },
  addTrackBtn: {
    padding: '6px 12px',
    fontSize: 11,
    color: 'var(--text-secondary)',
    background: 'var(--bg-medium)',
    borderRadius: 4,
    border: '1px dashed var(--border-medium)',
  },
  addBusBtn: {
    padding: '6px 12px',
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'transparent',
    borderRadius: 4,
    border: '1px dashed var(--border-subtle)',
  },
  statusBar: {
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    background: 'var(--bg-darker)',
    borderTop: '1px solid var(--border-subtle)',
    fontSize: 10,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  statusRight: {
    display: 'flex',
    gap: 16,
  },
  statusItem: {
    fontFamily: 'var(--font-mono)',
  },
};
