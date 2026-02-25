import React from 'react';
import { useDAWStore } from '../../store/useDAWStore';

export const TranscriptOverlay: React.FC = () => {
  const { view, aiAnalysis, setCurrentTime } = useDAWStore();

  if (!view.showTranscript || !aiAnalysis) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Transcript</span>
        <span style={styles.count}>
          {aiAnalysis.transcript.length} segments
        </span>
      </div>
      <div style={styles.segments}>
        {aiAnalysis.transcript.map(segment => (
          <div
            key={segment.id}
            style={{
              ...styles.segment,
              background: segment.isFiller
                ? 'rgba(255,107,107,0.08)'
                : 'transparent',
              borderLeftColor: segment.isFiller
                ? 'var(--accent-red)'
                : 'transparent',
            }}
            onClick={() => setCurrentTime(segment.startTime)}
          >
            <div style={styles.segmentHeader}>
              <span style={styles.speaker}>{segment.speaker}</span>
              <span style={styles.time}>
                {segment.startTime.toFixed(1)}s
              </span>
              {segment.isFiller && (
                <span style={styles.fillerBadge}>FILLER</span>
              )}
              <span style={styles.confidence}>
                {(segment.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{
              ...styles.text,
              color: segment.isFiller ? 'var(--accent-red)' : 'var(--text-primary)',
              textDecoration: segment.isFiller ? 'line-through' : 'none',
            }}>
              {segment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    background: 'var(--bg-dark)',
    borderTop: '1px solid var(--border-medium)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 20,
  },
  header: {
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    background: 'var(--bg-medium)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  count: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  segments: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px',
  },
  segment: {
    padding: '4px 8px',
    borderRadius: 4,
    borderLeft: '3px solid transparent',
    marginBottom: 2,
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  segmentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  speaker: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-blue)',
  },
  time: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  fillerBadge: {
    fontSize: 8,
    fontWeight: 700,
    padding: '1px 4px',
    background: 'rgba(255,107,107,0.2)',
    color: 'var(--accent-red)',
    borderRadius: 2,
  },
  confidence: {
    fontSize: 9,
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  text: {
    fontSize: 12,
    lineHeight: 1.4,
  },
};
