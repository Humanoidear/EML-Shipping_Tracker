const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow = null;
let flaskProcess = null;

function startFlask() {
  const pythonPath = path.join(__dirname, "..", "backend", ".venv", "bin", "python");
  const flaskPath = path.join(__dirname, "..", "backend", "run_prod.py");

  flaskProcess = spawn(pythonPath, [flaskPath], {
    env: { ...process.env },
    stdio: "pipe",
  });

  flaskProcess.stdout.on("data", (data) => {
    console.log(`Flask: ${data}`);
  });

  flaskProcess.stderr.on("data", (data) => {
    console.log(`Flask: ${data}`);
  });

  flaskProcess.on("error", (err) => {
    console.error("Failed to start Flask:", err);
  });

  flaskProcess.on("close", (code) => {
    console.log(`Flask exited with code ${code}`);
    flaskProcess = null;
  });
}

function stopFlask() {
  if (flaskProcess) {
    flaskProcess.kill();
    flaskProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "EML Shipping Tracker",
    icon: path.join(__dirname, "..", "frontend", "public", "img", "logo.svg"),
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startFlask();

  setTimeout(createWindow, 2000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopFlask();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopFlask();
});
