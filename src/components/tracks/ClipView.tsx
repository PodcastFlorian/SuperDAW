import React, { useRef, useEffect } from 'react';
import type { Clip, ClipRegion } from '../../types';
import { useDAWStore } from '../../store/useDAWStore';

interface ClipViewProps {
  clip: Clip;
  trackColor: string;
  zoom: number;
  scrollX: number;
}

export const ClipView: React.FC<ClipViewProps> = ({ clip, trackColor, zoom, scrollX }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { aiAnalysis } = useDAWStore();

  const clipX = clip.startTime * zoom - scrollX;
  const clipWidth = clip.duration * zoom;

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip.waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Draw filler/noise regions as background highlights
    if (aiAnalysis) {
      for (const cut of aiAnalysis.suggestedCuts) {
        if (cut.applied) continue;
        const regionStart = (cut.startTime - clip.startTime) * zoom;
        const regionWidth = (cut.endTime - cut.startTime) * zoom;
        if (regionStart + regionWidth < 0 || regionStart > width) continue;

        ctx.fillStyle = cut.type === 'filler'
          ? 'rgba(255,107,107,0.15)'
          : cut.type === 'silence'
          ? 'rgba(255,212,59,0.1)'
          : 'rgba(204,93,232,0.12)';
        ctx.fillRect(
          Math.max(0, regionStart),
          0,
          regionWidth,
          height
        );
      }
    }

    // Draw waveform
    const data = clip.waveformData;
    const barWidth = width / data.length;
    const midY = height / 2;

    ctx.fillStyle = trackColor;
    ctx.globalAlpha = 0.8;

    for (let i = 0; i < data.length; i++) {
      const amp = data[i] * midY * 0.9;
      ctx.fillRect(
        i * barWidth,
        midY - amp,
        Math.max(1, barWidth - 0.5),
        amp * 2 || 1
      );
    }

    ctx.globalAlpha = 1;

    // Fade in indicator
    if (clip.fadeIn > 0) {
      const fadeWidth = clip.fadeIn * zoom;
      const grad = ctx.createLinearGradient(0, 0, fadeWidth, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fadeWidth, height);
    }

    // Fade out indicator
    if (clip.fadeOut > 0) {
      const fadeWidth = clip.fadeOut * zoom;
      const grad = ctx.createLinearGradient(width - fadeWidth, 0, width, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(width - fadeWidth, 0, fadeWidth, height);
    }
  }, [clip.waveformData, trackColor, zoom, aiAnalysis, clip.startTime, clip.fadeIn, clip.fadeOut]);

  if (clipX + clipWidth < 0) return null;

  return (
    <div
      style={{
        ...styles.container,
        left: clipX,
        width: clipWidth,
        borderColor: trackColor,
      }}
    >
      <div style={{ ...styles.header, background: trackColor + '40' }}>
        <span style={styles.clipName}>{clip.name}</span>
        {clip.gain !== 1 && (
          <span style={styles.gainBadge}>
            {clip.gain > 1 ? '+' : ''}{(20 * Math.log10(clip.gain)).toFixed(1)}dB
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={styles.waveform}
        width={Math.max(1, clipWidth)}
        height={60}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 4,
    border: '1px solid',
    background: 'var(--bg-medium)',
    overflow: 'hidden',
    cursor: 'grab',
    transition: 'box-shadow 0.12s',
  },
  header: {
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 6px',
    fontSize: 10,
  },
  clipName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  gainBadge: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-yellow)',
    flexShrink: 0,
  },
  waveform: {
    width: '100%',
    height: 'calc(100% - 18px)',
    display: 'block',
  },
};
