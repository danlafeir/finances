// Dev loop for iterating on the Electron shell: runs `next dev` and points
// Electron at it directly (ELECTRON_START_URL), skipping the standalone
// build + migration runner entirely -- see electron/main.js's dev-mode
// escape hatch. No extra devDependencies (concurrently/wait-on) needed.
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

const next = spawn(npxBin, ["next", "dev"], { stdio: "inherit", cwd: root });

function waitForNext(remaining) {
  fetch("http://localhost:3000")
    .then(launchElectron)
    .catch(() => {
      if (remaining <= 0) {
        console.error("Timed out waiting for `next dev` to start");
        next.kill();
        process.exit(1);
      }
      setTimeout(() => waitForNext(remaining - 1), 300);
    });
}

function launchElectron() {
  const electronBin = require("electron");
  const electron = spawn(electronBin, ["."], {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ELECTRON_START_URL: "http://localhost:3000" },
  });
  electron.on("exit", (code) => {
    next.kill();
    process.exit(code ?? 0);
  });
}

waitForNext(100);
