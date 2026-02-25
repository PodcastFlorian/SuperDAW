const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'SuperDAW - AI Podcast Studio',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// IPC: Open file dialog for audio import
ipcMain.handle('open-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg', 'aiff'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.filePaths;
});

// IPC: Save file dialog for export
ipcMain.handle('save-audio-file', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'WAV', extensions: ['wav'] },
      { name: 'MP3', extensions: ['mp3'] },
      { name: 'FLAC', extensions: ['flac'] },
      { name: 'AAC', extensions: ['m4a'] },
    ],
  });
  return result.filePath;
});

// IPC: Download audio from URL via yt-dlp
ipcMain.handle('download-url', async (event, { url, format, outputFormat }) => {
  const { execFile } = require('child_process');
  const os = require('os');
  const fs = require('fs');

  const outputDir = path.join(app.getPath('userData'), 'downloads');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');

  return new Promise((resolve) => {
    // Try yt-dlp first, fallback to youtube-dl
    const ytdlp = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

    const args = [
      url,
      '-f', format || 'bestaudio',
      '--extract-audio',
      '--audio-format', outputFormat || 'wav',
      '--audio-quality', '0',
      '-o', outputTemplate,
      '--no-playlist',
      '--print-json',
    ];

    execFile(ytdlp, args, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ error: `yt-dlp failed: ${error.message}. Make sure yt-dlp is installed.` });
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const ext = outputFormat || 'wav';
        const filePath = path.join(outputDir, `${info.title}.${ext}`);

        resolve({
          filePath,
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
        });
      } catch (parseErr) {
        resolve({ error: `Failed to parse yt-dlp output` });
      }
    });
  });
});

// IPC: Plugin scan paths
ipcMain.handle('get-plugin-paths', () => {
  if (process.platform === 'darwin') {
    return {
      vst3: ['/Library/Audio/Plug-Ins/VST3', path.join(app.getPath('home'), 'Library/Audio/Plug-Ins/VST3')],
      au: ['/Library/Audio/Plug-Ins/Components', path.join(app.getPath('home'), 'Library/Audio/Plug-Ins/Components')],
      vst2: ['/Library/Audio/Plug-Ins/VST'],
    };
  } else if (process.platform === 'win32') {
    return {
      vst3: ['C:\\Program Files\\Common Files\\VST3'],
      vst2: ['C:\\Program Files\\VSTPlugins', 'C:\\Program Files (x86)\\VSTPlugins'],
      au: [],
    };
  }
  return { vst3: [], vst2: [], au: [] };
});
