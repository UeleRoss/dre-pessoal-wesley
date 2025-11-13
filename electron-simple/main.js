/**
 * Electron Main Process
 * App desktop simples que abre o Vite build
 */

const electron = require('electron');
console.log('electron:', typeof electron, electron ? Object.keys(electron).slice(0, 5) : 'undefined');
const { app, BrowserWindow } = electron;
console.log('app:', typeof app);
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permitir carregar CSVs locais
    },
    titleBarStyle: 'hiddenInset', // Mac native look
    title: 'DRE Pessoal',
  });

  // Em desenvolvimento, usa o Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    // mainWindow.webContents.openDevTools(); // Descomente se quiser ver o console
  } else {
    // Em produção, carrega o build do Vite
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
