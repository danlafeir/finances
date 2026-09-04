// Assembles .next/standalone into a fully self-contained folder for
// packaging: Next's standalone output doesn't include `public/` or
// `.next/static` (meant to be served by a CDN), and needs our migration
// runner + the migration SQL files bundled alongside server.js so the
// spawned child process (electron/bootstrap.js) can run entirely on its own.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
fs.cpSync(path.join(root, "prisma", "migrations"), path.join(standalone, "migrations"), { recursive: true });
fs.copyFileSync(path.join(__dirname, "migrate.js"), path.join(standalone, "migrate.js"));
fs.copyFileSync(path.join(__dirname, "bootstrap.js"), path.join(standalone, "bootstrap.js"));

// Next's standalone output copies the project's .env file(s) in by default
// (for parity with `next start`) -- credentials for this app come entirely
// from the per-install Settings screen, so strip these out unconditionally.
// This matters regardless of what any given developer's own .env holds.
for (const entry of fs.readdirSync(standalone)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    fs.rmSync(path.join(standalone, entry));
    console.log(`Removed ${entry} from .next/standalone`);
  }
}

console.log("Assembled .next/standalone for packaging");
