import { app, BrowserWindow, Tray, Menu, dialog, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import isDev from 'electron-is-dev';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a', // Matches the slate-900 background
    icon: path.join(__dirname, '../public/appicon.ico'),
    title: 'Heart App'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle close button
  mainWindow.on('close', async (event) => {
    if (!isQuitting) {
      event.preventDefault();
      
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Minimize to Tray', 'Exit'],
        title: 'Heart App',
        message: 'What would you like to do?',
        detail: 'You can keep receiving notifications by minimizing to the system tray, or exit the application completely.',
        icon: path.join(__dirname, '../public/appicon.ico'),
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        backgroundColor: '#0f172a',
        customStylesheet: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #f1f5f9;
          }
          .dialog-button {
            background: linear-gradient(to right, #ec4899, #ef4444);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          }
          .dialog-button:hover {
            opacity: 0.9;
          }
        `
      });

      if (response.response === 1) {
        isQuitting = true;
        app.quit();
      } else {
        event.preventDefault();
        mainWindow.hide();
        // Show notification when minimized to tray
        new Notification({
          title: 'Heart App',
          body: 'Running in the background. Click the heart icon to restore.',
          icon: path.join(__dirname, '../public/appicon.ico')
        }).show();
      }
    }
  });
}

function createTray() {
  // Create high-quality tray icon
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/appicon.ico'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Heart App',
      enabled: false,
      icon: icon.resize({ width: 16, height: 16 })
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: async () => {
        const response = await dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['Cancel', 'Exit'],
          title: 'Confirm Exit',
          message: 'Are you sure you want to exit?',
          detail: 'This will close the application completely.',
          icon: path.join(__dirname, '../public/appicon.ico'),
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });

        if (response.response === 1) {
          isQuitting = true;
          app.quit();
        }
      }
    }
  ]);

  tray.setToolTip('Heart App - Click to show');
  tray.setContextMenu(contextMenu);

  // Double click to show window
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

if (process.platform === 'win32') {
  app.setAppUserModelId('Heart App');
}

app.whenReady().then(() => {
  createWindow();
  createTray();

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

// Cleanup on quit
app.on('before-quit', () => {
  isQuitting = true;
});