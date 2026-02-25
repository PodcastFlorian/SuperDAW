import { getAudioEngine } from '../engine/AudioEngine';
import { useDAWStore } from '../store/useDAWStore';

/**
 * Import an audio file into the DAW:
 * 1. Read the file as ArrayBuffer
 * 2. Decode with Web Audio API
 * 3. Generate waveform data
 * 4. Create a track + clip with the audio
 */
export async function importAudioFile(file: File): Promise<void> {
  const engine = getAudioEngine();

  // Resume AudioContext (required after user gesture in browsers)
  await engine.resume();

  // Read file into ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Decode audio
  const bufferKey = `file-${Date.now()}-${file.name}`;
  const audioBuffer = await engine.loadAudioFromArrayBuffer(arrayBuffer.slice(0), bufferKey);

  // Generate waveform
  const waveformData = await engine.generateWaveformData(audioBuffer, 2000);

  // Create a new track
  const trackName = file.name.replace(/\.[^.]+$/, '');
  useDAWStore.getState().addTrack('audio', trackName);

  // Get the newly created track (last one added)
  const tracks = useDAWStore.getState().project.tracks;
  const newTrack = tracks[tracks.length - 1];

  // Add clip to the track
  useDAWStore.getState().addClip(newTrack.id, {
    name: trackName,
    startTime: 0,
    duration: audioBuffer.duration,
    offset: 0,
    audioBufferUrl: bufferKey,
    waveformData,
    fadeIn: 0,
    fadeOut: 0,
    gain: 1,
  });
}

/**
 * Import an audio file onto an existing track at a given time position.
 */
export async function importAudioToTrack(file: File, trackId: string, startTime: number = 0): Promise<void> {
  const engine = getAudioEngine();

  await engine.resume();

  const arrayBuffer = await file.arrayBuffer();
  const bufferKey = `file-${Date.now()}-${file.name}`;
  const audioBuffer = await engine.loadAudioFromArrayBuffer(arrayBuffer.slice(0), bufferKey);
  const waveformData = await engine.generateWaveformData(audioBuffer, 2000);

  const clipName = file.name.replace(/\.[^.]+$/, '');

  useDAWStore.getState().addClip(trackId, {
    name: clipName,
    startTime,
    duration: audioBuffer.duration,
    offset: 0,
    audioBufferUrl: bufferKey,
    waveformData,
    fadeIn: 0,
    fadeOut: 0,
    gain: 1,
  });
}
