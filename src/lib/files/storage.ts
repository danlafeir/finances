import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

// Files live in a `files/` folder next to the database, so moving the data
// folder (Settings) carries them along with finances.db.
export function filesRoot(): string {
  const dbPath = process.env.DATABASE_URL!.replace(/^file:/, "");
  return path.join(path.dirname(path.resolve(dbPath)), "files");
}

export function slug(text: string): string {
  const s = text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  return s || "unnamed";
}

function safeFileName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/")).replace(/[^\w.\- ]/g, "_");
  const trimmed = base.replace(/^\.+/, "").trim();
  return trimmed || "file";
}

function resolveInside(relPath: string): string {
  const root = filesRoot();
  const full = path.resolve(root, relPath);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("Invalid file path.");
  }
  return full;
}

// Writes with the `wx` flag so an existing file is never overwritten; on a
// name clash it tries "-2", "-3", ... Returns the path relative to filesRoot().
export async function saveFile(dir: string, fileName: string, data: Buffer): Promise<string> {
  const safeDir = dir.split("/").map(slug).join("/");
  const parsed = path.parse(safeFileName(fileName));

  await fs.mkdir(resolveInside(safeDir), { recursive: true });

  for (let attempt = 1; attempt <= 100; attempt++) {
    const name = attempt === 1 ? parsed.base : `${parsed.name}-${attempt}${parsed.ext}`;
    const relPath = `${safeDir}/${name}`;
    try {
      await fs.writeFile(resolveInside(relPath), data, { flag: "wx" });
      return relPath;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  throw new Error("Couldn't find a free file name.");
}

export async function readStoredFile(relPath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(resolveInside(relPath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function deleteStoredFile(relPath: string): Promise<void> {
  await fs.rm(resolveInside(relPath), { force: true });
}
