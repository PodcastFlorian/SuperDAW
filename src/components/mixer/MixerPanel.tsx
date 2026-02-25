import React from 'react';
import { useDAWStore } from '../../store/useDAWStore';

export const MixerPanel: React.FC = () => {
  const { project, updateTrack, view } = useDAWStore();

  if (!view.showMixer) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Mixer</span>
      </div>
      <div style={styles.channels}>
        {project.tracks.map(track => (
          <div key={track.id} style={styles.channel}>
            {/* VU Meter placeholder */}
            <div style={styles.meterContainer}>
              <div
                style={{
                  ...styles.meterFill,
                  height: `${track.volume * 80}%`,
                  background: track.volume > 0.9
                    ? 'var(--accent-red)'
                    : track.volume > 0.7
                    ? 'var(--accent-yellow)'
                    : 'var(--accent-green)',
                }}
              />
            </div>

            {/* Fader */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={e => updateTrack(track.id, { volume: parseFloat(e.target.value) })}
              style={styles.fader}
              title={`${Math.round(track.volume * 100)}%`}
            />

            {/* dB display */}
            <span style={styles.dbValue}>
              {track.volume === 0 ? '-∞' : `${(20 * Math.log10(track.volume)).toFixed(1)}`}
            </span>

            {/* Pan */}
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={track.pan}
              onChange={e => updateTrack(track.id, { pan: parseFloat(e.target.value) })}
              style={styles.pan}
            />

            {/* Buttons */}
            <div style={styles.channelButtons}>
              <button
                style={{
                  ...styles.chBtn,
                  background: track.muted ? 'var(--accent-red)' : 'var(--bg-lighter)',
                  color: track.muted ? 'white' : 'var(--text-muted)',
                }}
                onClick={() => updateTrack(track.id, { muted: !track.muted })}
              >
                M
              </button>
              <button
                style={{
                  ...styles.chBtn,
                  background: track.solo ? 'var(--accent-yellow)' : 'var(--bg-lighter)',
                  color: track.solo ? 'var(--bg-darkest)' : 'var(--text-muted)',
                }}
                onClick={() => updateTrack(track.id, { solo: !track.solo })}
              >
                S
              </button>
            </div>

            {/* Name */}
            <div style={{ ...styles.channelName, borderTopColor: track.color }}>
              {track.name}
            </div>
          </div>
        ))}

        {/* Master channel */}
        <div style={{ ...styles.channel, ...styles.masterChannel }}>
          <div style={styles.meterContainer}>
            <div style={{ ...styles.meterFill, height: '60%', background: 'var(--accent-blue)' }} />
          </div>
          <input
            type="range" min="0" max="1" step="0.01" defaultValue="1"
            style={styles.fader}
          />
          <span style={styles.dbValue}>0.0</span>
          <div style={{ ...styles.channelName, borderTopColor: 'var(--accent-yellow)' }}>
            Master
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: 'var(--mixer-height)',
    minHeight: 200,
    background: 'var(--bg-dark)',
    borderTop: '1px solid var(--border-medium)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: 24,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    background: 'var(--bg-medium)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  channels: {
    display: 'flex',
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    gap: 4,
  },
  channel: {
    width: 60,
    minWidth: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '4px',
    background: 'var(--bg-darker)',
    borderRadius: 4,
  },
  masterChannel: {
    background: 'var(--bg-medium)',
    borderLeft: '2px solid var(--accent-yellow)',
    marginLeft: 8,
  },
  meterContainer: {
    width: 10,
    height: 60,
    background: 'var(--bg-darkest)',
    borderRadius: 2,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  meterFill: {
    width: '100%',
    borderRadius: 2,
    transition: 'height 0.1s',
  },
  fader: {
    writingMode: 'vertical-lr' as const,
    direction: 'rtl' as const,
    height: 60,
    width: 20,
    accentColor: 'var(--accent-blue)',
    cursor: 'pointer',
  },
  dbValue: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  pan: {
    width: 40,
    height: 4,
    accentColor: 'var(--accent-orange)',
  },
  channelButtons: {
    display: 'flex',
    gap: 2,
  },
  chBtn: {
    width: 22,
    height: 16,
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderTop: '2px solid',
    paddingTop: 3,
  },
};
