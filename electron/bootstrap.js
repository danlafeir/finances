// Entry point for the spawned child process (plain Node via
// ELECTRON_RUN_AS_NODE, no Electron APIs available here). Runs pending
// migrations against DATABASE_URL, then starts the standalone Next server.
// Kept dependency-free of Electron so this can live entirely inside
// .next/standalone, alongside the one copy of the libsql native binding it needs.
const path = require("node:path");
const { migrate } = require("./migrate");

const dbPath = process.env.DATABASE_URL.replace(/^file:/, "");
const migrationsDir = path.join(__dirname, "migrations");

migrate(dbPath, migrationsDir)
  .then(() => require("./server.js"))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
