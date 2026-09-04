// electron-builder's extraResources copying silently drops any nested
// node_modules directory (it applies file-matching meant for its own
// dependency graph, which .next/standalone isn't part of) -- verified by
// inspecting a packaged build where @libsql/client's node_modules simply
// wasn't there. Doing the copy here, after electron-builder is done
// packaging, bypasses that filtering entirely.
const fs = require("node:fs");
const path = require("node:path");

module.exports = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const resourcesDir =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");

  const standalone = path.join(__dirname, "..", ".next", "standalone");
  fs.cpSync(standalone, path.join(resourcesDir, "app"), { recursive: true });
};
