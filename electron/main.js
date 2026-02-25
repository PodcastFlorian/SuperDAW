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
