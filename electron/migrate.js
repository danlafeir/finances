const { createClient } = require("@libsql/client");
const fs = require("node:fs");
const path = require("node:path");

// Applies prisma/migrations/*/migration.sql files directly, tracked in our
// own table (not Prisma's _prisma_migrations -- this runner intentionally
// isn't CLI-compatible; see the packaging plan for why `prisma migrate
// deploy` isn't used here: it needs a per-platform native schema-engine
// binary these are plain-SQL migrations don't need).
async function migrate(dbPath, migrationsDir) {
  const client = createClient({ url: `file:${dbPath}` });
  try {
    await client.execute(
      "CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
    );

    const applied = new Set((await client.execute("SELECT name FROM _app_migrations")).rows.map((r) => r.name));

    const names = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const name of names) {
      if (applied.has(name)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
      await client.executeMultiple(sql);
      await client.execute({
        sql: "INSERT INTO _app_migrations (name, applied_at) VALUES (?, ?)",
        args: [name, new Date().toISOString()],
      });
    }
  } finally {
    client.close();
  }
}

module.exports = { migrate };
