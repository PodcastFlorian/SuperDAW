import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDAWStore } from '../../store/useDAWStore';
import { getAudioEngine } from '../../engine/AudioEngine';

export const MixerPanel: React.FC = () => {
  const { project, updateTrack, view, transportState } = useDAWStore();
  const [meterLevels, setMeterLevels] = useState<number[]>([]);
  const [masterLevel, setMasterLevel] = useState(0);
  const rafRef = useRef<number>();

  // Real-time VU meter animation
  useEffect(() => {
    if (!view.showMixer) return;

    const engine = getAudioEngine();
    let prevLevels = new Array(project.tracks.length).fill(0);
    let prevMaster = 0;

    const update = () => {
      if (transportState === 'playing') {
        const freq = engine.getFrequencyData();
        // Calculate overall level from frequency data
        let sum = 0;
        for (let i = 0; i < freq.length; i++) {
          sum += freq[i];
        }
        const avgLevel = sum / freq.length / 255;

        // Distribute across tracks with slight variation
        const levels = project.tracks.map((track, i) => {
          if (track.muted) return 0;
          const variation = 0.8 + Math.sin(Date.now() / 200 + i * 1.7) * 0.2;
          const raw = avgLevel * track.volume * variation;
          // Smooth decay
          const smoothed = Math.max(raw, prevLevels[i] * 0.92);
          return Math.min(1, smoothed);
        });
        prevLevels = levels;
        prevMaster = Math.max(avgLevel, prevMaster * 0.92);
        setMeterLevels(levels);
        setMasterLevel(Math.min(1, prevMaster));
      } else {
        // Decay to zero when stopped
        const decayed = prevLevels.map(l => l * 0.9);
        const allZero = decayed.every(l => l < 0.001);
        if (!allZero) {
          prevLevels = decayed;
          prevMaster *= 0.9;
          setMeterLevels(decayed);
          setMasterLevel(prevMaster);
        }
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [view.showMixer, transportState, project.tracks.length]);

  // Master volume handler
  const handleMasterVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    getAudioEngine().setMasterVolume(vol);
  }, []);

  if (!view.showMixer) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Mixer</span>
      </div>
      <div style={styles.channels}>
        {project.tracks.map((track, idx) => {
          const level = meterLevels[idx] || 0;
          return (
            <div key={track.id} style={styles.channel}>
              {/* VU Meter */}
              <div style={styles.meterContainer}>
                <div
                  style={{
                    ...styles.meterFill,
                    height: `${level * 100}%`,
                    background: level > 0.9
                      ? 'var(--accent-red)'
                      : level > 0.7
                      ? 'var(--accent-yellow)'
                      : 'var(--accent-green)',
                  }}
                />
                {/* Peak indicator */}
                {level > 0.95 && (
                  <div style={styles.peakIndicator} />
                )}
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
                {track.volume === 0 ? '-inf' : `${(20 * Math.log10(track.volume)).toFixed(1)}`}
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
                title={track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}
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
          );
        })}

        {/* Master channel */}
        <div style={{ ...styles.channel, ...styles.masterChannel }}>
          <div style={styles.meterContainer}>
            <div
              style={{
                ...styles.meterFill,
                height: `${masterLevel * 100}%`,
                background: masterLevel > 0.9
                  ? 'var(--accent-red)'
                  : masterLevel > 0.7
                  ? 'var(--accent-yellow)'
                  : 'var(--accent-blue)',
              }}
            />
          </div>
          <input
            type="range" min="0" max="1" step="0.01" defaultValue="1"
            style={styles.fader}
            onChange={handleMasterVolume}
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
    position: 'relative',
  },
  meterFill: {
    width: '100%',
    borderRadius: 2,
    transition: 'height 0.05s linear',
  },
  peakIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'var(--accent-red)',
    borderRadius: 1,
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
