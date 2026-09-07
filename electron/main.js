const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const settingsStore = require("./settingsStore");

let serverProcess = null;
let mainWindow = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(url, { retries = 50, delayMs = 100 } = {}) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      fetch(url)
        .then(() => resolve())
        .catch((err) => {
          if (remaining <= 0) return reject(err);
          setTimeout(() => attempt(remaining - 1), delayMs);
        });
    };
    attempt(retries);
  });
}

// bootstrap.js runs migrations then starts server.js -- both live inside
// .next/standalone (copied there by electron/copy-assets.js) so the spawned
// child needs nothing outside that one self-contained folder.
function standaloneEntryPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app", "bootstrap.js")
    : path.join(__dirname, "..", ".next", "standalone", "bootstrap.js");
}

async function startEmbeddedServer(dbPath, settings) {
  const port = await getFreePort();

  serverProcess = spawn(process.execPath, [standaloneEntryPath()], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: `file:${dbPath}`,
      ENCRYPTION_KEY: settings.encryptionKey,
      PLAID_CLIENT_ID: settings.plaid?.clientId ?? "",
      PLAID_SECRET: settings.plaid?.secret ?? "",
      PLAID_ENV: settings.plaid?.env ?? "sandbox",
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });

  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (code !== null && code !== 0) {
      dialog.showErrorBox("Server stopped unexpectedly", `The embedded server exited with code ${code}.`);
    }
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function stopEmbeddedServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function createWindow() {
  let url = process.env.ELECTRON_START_URL;

  if (!url) {
    const dbPath = path.join(app.getPath("userData"), "finances.db");

    let settings;
    try {
      settings = settingsStore.load();
    } catch (err) {
      if (err.name === "SettingsUnlockError") {
        dialog.showErrorBox("Couldn't unlock settings", err.message);
        app.quit();
        return;
      }
      throw err;
    }

    url = await startEmbeddedServer(dbPath, settings);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(url);
}

ipcMain.handle("settings:get-config", () => {
  const settings = settingsStore.load();
  return { mode: settings.mode, plaid: settings.plaid };
});

ipcMain.handle("settings:set-config", (_event, config) => {
  settingsStore.saveConfig(config);
  stopEmbeddedServer();
  app.relaunch();
  app.exit(0);
});

app.whenReady().then(createWindow);

app.on("before-quit", stopEmbeddedServer);

app.on("window-all-closed", () => {
  stopEmbeddedServer();
  app.quit();
});
