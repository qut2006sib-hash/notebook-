const { test } = require("node:test");
const assert = require("node:assert/strict");

test("Windows builds offline x64 installer and ZIP without publishing", async () => {
  const { windowsConfig } = await import("./windows-config.mjs");
  const config = windowsConfig("0.3.1", "45.1.0");
  assert.deepEqual(config.win.target, [{ target: "nsis", arch: ["x64"] }, { target: "zip", arch: ["x64"] }]);
  assert.equal(config.electronVersion, "45.1.0");
  assert.equal(config.publish, null);
  assert.equal(config.npmRebuild, false);
  assert.ok(config.files.includes("!node_modules/**/*"));
});

test("Windows installation uses ordinary account and retains notes on uninstall", async () => {
  const { windowsConfig } = await import("./windows-config.mjs");
  const config = windowsConfig("0.3.1", "45.1.0");
  assert.equal(config.appId, "org.midad.notebook");
  assert.equal(config.productName, "Midad");
  assert.equal(config.nsis.perMachine, false);
  assert.equal(config.nsis.allowElevation, false);
  assert.equal(config.nsis.deleteAppDataOnUninstall, false);
  assert.equal(config.nsis.runAfterFinish, false);
});
