import React, { useState } from 'react';
import { getURLDownloadService } from '../../engine/URLDownloadService';
import { useDAWStore } from '../../store/useDAWStore';
import type { URLDownloadProgress } from '../../types';

export const URLDownloadPanel: React.FC = () => {
  const [url, setUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<URLDownloadProgress | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const { addTrack } = useDAWStore();

  const service = getURLDownloadService();

  const handleDownload = async () => {
    if (!url.trim() || downloading) return;

    setDownloading(true);
    setLastResult(null);

    // Try to get metadata first
    const meta = await service.getMetadata(url);
    if (meta?.thumbnail) setThumbnail(meta.thumbnail);

    const result = await service.downloadFromURL(
      { url: url.trim(), format: 'audio', quality: 'best' },
      (p) => setProgress(p),
    );

    setDownloading(false);
    setProgress(null);

    if (result.success) {
      const title = result.title || meta?.title || 'Downloaded Audio';
      setLastResult(`Downloaded: ${title}`);
      addTrack('audio', title);
      setUrl('');
      setThumbnail(null);
    } else {
      setLastResult(`Error: ${result.error}`);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http')) setUrl(text);
    } catch {}
  };

  const source = url ? service.detectSource(url) : null;

  const sourceLabels: Record<string, { label: string; color: string }> = {
    youtube: { label: 'YouTube', color: '#FF0000' },
    soundcloud: { label: 'SoundCloud', color: '#FF5500' },
    spotify: { label: 'Spotify', color: '#1DB954' },
    direct: { label: 'Direct Link', color: 'var(--accent-blue)' },
    unknown: { label: 'URL', color: 'var(--text-muted)' },
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Import from URL</h4>

      {/* URL Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.urlInput}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleDownload()}
          placeholder="Paste YouTube, SoundCloud, or audio URL..."
        />
        <button style={styles.pasteBtn} onClick={handlePaste} title="Paste from clipboard">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>

      {/* Source badge */}
      {source && url.length > 5 && (
        <div style={styles.sourceRow}>
          <div style={{
            ...styles.sourceBadge,
            background: sourceLabels[source]?.color + '20',
            color: sourceLabels[source]?.color,
          }}>
            {sourceLabels[source]?.label || source}
          </div>
          {source === 'youtube' && thumbnail && (
            <div style={styles.thumbnailPreview}>
              <img src={thumbnail} alt="" style={styles.thumbnail} />
            </div>
          )}
        </div>
      )}

      {/* Download button */}
      <button
        style={{
          ...styles.downloadBtn,
          opacity: !url.trim() || downloading ? 0.5 : 1,
        }}
        onClick={handleDownload}
        disabled={!url.trim() || downloading}
      >
        {downloading ? (
          <span>
            {progress?.status === 'resolving' && 'Resolving...'}
            {progress?.status === 'downloading' && `Downloading ${progress.percent}%`}
            {progress?.status === 'converting' && 'Converting to audio...'}
          </span>
        ) : (
          <span>Download & Import to Timeline</span>
        )}
      </button>

      {/* Progress */}
      {downloading && progress && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress.percent}%` }} />
          </div>
          <div style={styles.progressDetails}>
            {progress.speed && <span>{progress.speed}</span>}
            {progress.eta && <span>ETA: {progress.eta}</span>}
          </div>
        </div>
      )}

      {/* Result */}
      {lastResult && (
        <div style={{
          ...styles.result,
          color: lastResult.startsWith('Error')
            ? 'var(--accent-red)' : 'var(--accent-green)',
          background: lastResult.startsWith('Error')
            ? 'rgba(255,107,107,0.1)' : 'rgba(81,207,102,0.1)',
        }}>
          {lastResult}
        </div>
      )}

      {/* Supported sources */}
      <div style={styles.supportedRow}>
        <span style={styles.supportedLabel}>Supported:</span>
        {['YouTube', 'SoundCloud', 'MP3/WAV/FLAC'].map(s => (
          <span key={s} style={styles.supportedBadge}>{s}</span>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '8px',
    background: 'var(--bg-medium)',
    borderRadius: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  inputRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 6,
  },
  urlInput: {
    flex: 1,
    padding: '8px 10px',
    background: 'var(--bg-darkest)',
    border: '1px solid var(--border-medium)',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontSize: 11,
  },
  pasteBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-lighter)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  sourceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sourceBadge: {
    padding: '2px 8px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
  },
  thumbnailPreview: {
    width: 60,
    height: 34,
    borderRadius: 3,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  downloadBtn: {
    width: '100%',
    padding: '8px 12px',
    background: 'linear-gradient(135deg, #FF6B6B, #FF922B)',
    color: 'white',
    fontWeight: 600,
    fontSize: 11,
    borderRadius: 4,
    transition: 'opacity 0.15s',
    marginBottom: 6,
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    background: 'var(--bg-darkest)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 3,
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent-orange)',
    borderRadius: 2,
    transition: 'width 0.2s',
  },
  progressDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  result: {
    padding: '6px 8px',
    borderRadius: 4,
    fontSize: 10,
    marginBottom: 6,
  },
  supportedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  supportedLabel: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  supportedBadge: {
    padding: '1px 5px',
    background: 'var(--bg-lighter)',
    borderRadius: 2,
    fontSize: 8,
    color: 'var(--text-muted)',
  },
};
