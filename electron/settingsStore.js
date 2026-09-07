const { app, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function encryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

function seal(plaintext) {
  if (encryptionAvailable()) return safeStorage.encryptString(plaintext).toString("base64");
  return Buffer.from(plaintext, "utf8").toString("base64");
}

function unseal(sealed, wasEncrypted) {
  const buf = Buffer.from(sealed, "base64");
  if (wasEncrypted) return safeStorage.decryptString(buf);
  return buf.toString("utf8");
}

// Reads settings.json, generating a fresh ENCRYPTION_KEY on first run.
// Never mints a new key if the file exists but can't be decrypted (e.g. the
// OS keychain entry changed) -- that would permanently strand any stored
// Plaid access tokens. Throws SettingsUnlockError in that case instead.
function load() {
  const file = settingsPath();

  if (!fs.existsSync(file)) {
    const record = {
      version: 1,
      encrypted: encryptionAvailable(),
      encryptionKeyEnc: seal(crypto.randomBytes(32).toString("base64")),
      mode: null,
      plaid: null,
    };
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
    return toRuntime(record);
  }

  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  try {
    return toRuntime(record);
  } catch (err) {
    const wrapped = new Error(
      "Couldn't unlock stored settings. This usually means the OS keychain entry changed " +
        "(new OS user, restored from a different machine). Existing Plaid connections can't " +
        `be decrypted until this is resolved. To start over, quit and delete:\n${file}`
    );
    wrapped.name = "SettingsUnlockError";
    wrapped.cause = err;
    throw wrapped;
  }
}

function toRuntime(record) {
  const encryptionKey = unseal(record.encryptionKeyEnc, record.encrypted);
  const plaid = record.plaid
    ? {
        clientId: unseal(record.plaid.clientIdEnc, record.encrypted),
        secret: unseal(record.plaid.secretEnc, record.encrypted),
        env: record.plaid.env,
      }
    : null;
  return { encryptionKey, mode: record.mode ?? null, plaid, encryptionAvailable: record.encrypted };
}

// config is either { mode: "offline" } or { mode: "online", clientId, secret, env }.
// Switching to offline always clears any stored Plaid credentials, since
// offline means no bank connection should be active.
function saveConfig(config) {
  const file = settingsPath();
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  record.mode = config.mode;
  record.plaid =
    config.mode === "online"
      ? { clientIdEnc: seal(config.clientId), secretEnc: seal(config.secret), env: config.env }
      : null;
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
}

module.exports = { load, saveConfig };
