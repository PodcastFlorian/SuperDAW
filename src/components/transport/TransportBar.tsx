import React from 'react';
import { useDAWStore } from '../../store/useDAWStore';

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

export const TransportBar: React.FC = () => {
  const {
    transportState, currentTime, loopEnabled,
    play, pause, stop, record, toggleLoop, setCurrentTime,
    project, view,
  } = useDAWStore();

  const isPlaying = transportState === 'playing';
  const isRecording = transportState === 'recording';

  return (
    <div style={styles.container}>
      {/* Left: Project info */}
      <div style={styles.left}>
        <span style={styles.projectName}>{project.name}</span>
        <span style={styles.sampleRate}>{project.sampleRate / 1000}kHz / {project.bitDepth}bit</span>
      </div>

      {/* Center: Transport controls */}
      <div style={styles.center}>
        <button
          style={styles.transportBtn}
          onClick={() => setCurrentTime(0)}
          title="Go to start"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          style={styles.transportBtn}
          onClick={stop}
          title="Stop"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
        </button>

        <button
          style={{
            ...styles.playBtn,
            background: isPlaying ? 'var(--accent-blue)' : 'var(--accent-green)',
          }}
          onClick={isPlaying ? pause : play}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1"/>
              <rect x="14" y="5" width="4" height="14" rx="1"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          style={{
            ...styles.transportBtn,
            color: isRecording ? 'var(--accent-red)' : undefined,
            background: isRecording ? 'rgba(255,107,107,0.15)' : undefined,
          }}
          onClick={record}
          title="Record"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="7"/>
          </svg>
        </button>

        <button
          style={{
            ...styles.transportBtn,
            color: loopEnabled ? 'var(--accent-yellow)' : undefined,
            background: loopEnabled ? 'rgba(255,212,59,0.15)' : undefined,
          }}
          onClick={toggleLoop}
          title="Loop"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
      </div>

      {/* Right: Time display */}
      <div style={styles.right}>
        <div style={styles.timeDisplay}>
          <span style={styles.timeLabel}>Position</span>
          <span style={styles.timeValue}>{formatTime(currentTime)}</span>
        </div>
        {view.selectionStart !== null && view.selectionEnd !== null && (
          <div style={styles.timeDisplay}>
            <span style={styles.timeLabel}>Selection</span>
            <span style={styles.timeValue}>
              {formatTime(view.selectionEnd - view.selectionStart)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: 'var(--transport-height)',
    minHeight: 56,
    background: 'var(--bg-darker)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    gap: 16,
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 140,
  },
  projectName: {
    fontWeight: 600,
    fontSize: 13,
  },
  sampleRate: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  transportBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
  playBtn: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: 'white',
    transition: 'all 0.15s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  right: {
    display: 'flex',
    gap: 16,
    minWidth: 140,
    justifyContent: 'flex-end',
  },
  timeDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
  },
  timeLabel: {
    fontSize: 9,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  timeValue: {
    fontSize: 16,
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    color: 'var(--text-bright)',
    letterSpacing: '0.5px',
  },
};
