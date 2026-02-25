// ============================================================
// SuperDAW URL Download Service
// Downloads audio from YouTube, SoundCloud, Spotify, and
// direct URLs using yt-dlp (Electron) or proxy (web).
// ============================================================

import type { URLDownloadRequest, URLDownloadResult, URLDownloadProgress } from '../types';

type ProgressCallback = (progress: URLDownloadProgress) => void;

export class URLDownloadService {
  private downloads: Map<string, AbortController> = new Map();

  detectSource(url: string): URLDownloadResult['source'] {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('soundcloud.com')) return 'soundcloud';
    if (u.includes('spotify.com')) return 'spotify';
    if (u.match(/\.(mp3|wav|flac|aac|ogg|m4a|webm)(\?|$)/)) return 'direct';
    return 'unknown';
  }

  extractVideoId(url: string): string | null {
    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Download audio from URL.
   * In Electron: uses yt-dlp binary via child_process.
   * In Web: uses server-side proxy or direct fetch.
   */
  async downloadFromURL(
    request: URLDownloadRequest,
    onProgress?: ProgressCallback
  ): Promise<URLDownloadResult> {
    const source = this.detectSource(request.url);
    const abortController = new AbortController();
    const downloadId = crypto.randomUUID();
    this.downloads.set(downloadId, abortController);

    onProgress?.({ percent: 0, status: 'resolving' });

    try {
      // Check if we're in Electron
      if (this.isElectron()) {
        return await this.downloadViaYtDlp(request, source, onProgress);
      }

      // Web fallback: direct URL fetch or proxy
      if (source === 'direct') {
        return await this.downloadDirect(request, onProgress, abortController.signal);
      }

      // For YouTube/SoundCloud in web mode: use backend proxy
      return await this.downloadViaProxy(request, source, onProgress, abortController.signal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      onProgress?.({ percent: 0, status: 'error' });
      return { success: false, error: message, source };
    } finally {
      this.downloads.delete(downloadId);
    }
  }

  /**
   * Electron path: spawn yt-dlp process
   */
  private async downloadViaYtDlp(
    request: URLDownloadRequest,
    source: URLDownloadResult['source'],
    onProgress?: ProgressCallback,
  ): Promise<URLDownloadResult> {
    // In production, this calls the Electron main process via IPC
    // which spawns yt-dlp with appropriate flags
    const { ipcRenderer } = (window as any).require?.('electron') || {};
    if (!ipcRenderer) {
      throw new Error('yt-dlp download requires Electron runtime');
    }

    onProgress?.({ percent: 5, status: 'resolving' });

    // Build yt-dlp command args
    const qualityMap: Record<string, string> = {
      'best': 'bestaudio',
      'good': 'bestaudio[abr<=192]',
      '128k': 'bestaudio[abr<=128]',
      '192k': 'bestaudio[abr<=192]',
      '320k': 'bestaudio[abr<=320]',
    };

    const result = await ipcRenderer.invoke('download-url', {
      url: request.url,
      format: qualityMap[request.quality] || 'bestaudio',
      outputFormat: 'wav', // Always convert to WAV for DAW use
    });

    if (result.error) {
      onProgress?.({ percent: 0, status: 'error' });
      return { success: false, error: result.error, source };
    }

    onProgress?.({ percent: 100, status: 'done' });
    return {
      success: true,
      filePath: result.filePath,
      title: result.title,
      duration: result.duration,
      thumbnail: result.thumbnail,
      source,
    };
  }

  /**
   * Direct file download (MP3, WAV links etc.)
   */
  private async downloadDirect(
    request: URLDownloadRequest,
    onProgress?: ProgressCallback,
    signal?: AbortSignal,
  ): Promise<URLDownloadResult> {
    onProgress?.({ percent: 10, status: 'downloading' });

    const response = await fetch(request.url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) {
        onProgress?.({
          percent: Math.round((received / contentLength) * 90) + 10,
          status: 'downloading',
        });
      }
    }

    onProgress?.({ percent: 100, status: 'done' });

    // Create a blob URL for the downloaded audio
    const blob = new Blob(chunks);
    const blobUrl = URL.createObjectURL(blob);
    const fileName = request.url.split('/').pop()?.split('?')[0] || 'download';

    return {
      success: true,
      filePath: blobUrl,
      title: fileName.replace(/\.[^.]+$/, ''),
      source: 'direct',
    };
  }

  /**
   * Web proxy path for YouTube/SoundCloud
   * In production: calls your backend API that runs yt-dlp
   */
  private async downloadViaProxy(
    request: URLDownloadRequest,
    source: URLDownloadResult['source'],
    onProgress?: ProgressCallback,
    signal?: AbortSignal,
  ): Promise<URLDownloadResult> {
    onProgress?.({ percent: 5, status: 'resolving' });

    // For the prototype, simulate the proxy download
    // In production, this would call: POST /api/download { url, format, quality }
    const videoId = this.extractVideoId(request.url);
    const title = videoId
      ? `YouTube Video (${videoId})`
      : `Audio from ${source}`;

    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200));
      if (signal?.aborted) throw new Error('Download cancelled');
      onProgress?.({
        percent: i,
        status: i < 80 ? 'downloading' : i < 95 ? 'converting' : 'done',
        speed: `${(Math.random() * 5 + 2).toFixed(1)} MB/s`,
        eta: `${Math.max(0, Math.ceil((100 - i) * 0.3))}s`,
      });
    }

    // In production: return actual file path from API response
    return {
      success: true,
      title,
      duration: 0, // Would come from yt-dlp metadata
      source,
      thumbnail: videoId
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : undefined,
    };
  }

  cancelDownload(downloadId: string) {
    const controller = this.downloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.downloads.delete(downloadId);
    }
  }

  cancelAll() {
    for (const controller of this.downloads.values()) {
      controller.abort();
    }
    this.downloads.clear();
  }

  private isElectron(): boolean {
    return typeof window !== 'undefined' &&
      typeof (window as any).process?.versions?.electron !== 'undefined';
  }

  /**
   * Get metadata without downloading (fast lookup)
   */
  async getMetadata(url: string): Promise<{
    title: string;
    duration: number;
    thumbnail?: string;
    source: URLDownloadResult['source'];
  } | null> {
    const source = this.detectSource(url);
    const videoId = this.extractVideoId(url);

    if (source === 'youtube' && videoId) {
      // In production: call yt-dlp --dump-json or YouTube oEmbed API
      return {
        title: `YouTube Video (${videoId})`,
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        source,
      };
    }

    return { title: url.split('/').pop() || 'Unknown', duration: 0, source };
  }
}

// Singleton
let downloadServiceInstance: URLDownloadService | null = null;

export function getURLDownloadService(): URLDownloadService {
  if (!downloadServiceInstance) {
    downloadServiceInstance = new URLDownloadService();
  }
  return downloadServiceInstance;
}
