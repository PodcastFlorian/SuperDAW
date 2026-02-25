import React, { useEffect, useCallback } from 'react';
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

export const App: React.FC = () => {
  const {
    project, view, addTrack, play, pause, stop,
    setCurrentTime, transportState, setZoom,
    toggleMixer, toggleAIPanel, toggleTranscript,
    setSelection, splitClip,
  } = useDAWStore();

  // Initialize with demo tracks if empty
  useEffect(() => {
    if (project.tracks.length === 0) {
      addTrack('audio', 'Host');
      addTrack('audio', 'Guest');
      addTrack('audio', 'Music/SFX');
    }
  }, []);

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
  }, [transportState, play, pause, stop, setCurrentTime, setZoom, view.zoom, toggleMixer, toggleAIPanel, toggleTranscript, setSelection]);

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
    <div style={styles.app}>
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
          <div style={styles.tracksArea}>
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
                  Click "+ Track" or drop audio files to get started
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
