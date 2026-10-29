const path = require("node:path");

const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";

function isAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "midad:" && url.hostname === "app" && !url.port && !url.username && !url.password;
  } catch { return false; }
}

function appFile(root, value) {
  if (!isAppUrl(value)) return null;
  let name;
  try { name = decodeURIComponent(new URL(value).pathname); } catch { return null; }
  if (name.includes("\0") || name.includes("\\")) return null;
  const target = path.resolve(root, `.${name === "/" ? "/index.html" : name}`);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

function windowOptions(icon) {
  return {
    title: "مداد — Midad", width: 1360, height: 900, minWidth: 720, minHeight: 540,
    backgroundColor: "#f3eee6", show: false, icon,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: false },
  };
}

module.exports = { CSP, isAppUrl, appFile, windowOptions };
