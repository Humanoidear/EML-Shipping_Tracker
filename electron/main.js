const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

app.setName("EML Shipping Tracker");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "EML Shipping Tracker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "frontend", "dist", "index.html"));
  }

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`Failed to load page: ${code} ${desc}`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (err) {
    console.error("Failed to create window:", err);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try { createWindow(); } catch (err) { console.error(err); }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("app-reload", () => {
  if (mainWindow) mainWindow.webContents.reload();
});
