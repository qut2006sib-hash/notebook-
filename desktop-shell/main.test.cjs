const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

async function boot(lock = true) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "midad-shell-test-"));
  fs.mkdirSync(path.join(folder, "web"));
  fs.writeFileSync(path.join(folder, "web/index.html"), "<h1>Midad</h1>");
  const calls = { windows: [], quit: 0, choice: 0 };
  const app = Object.assign(new EventEmitter(), {
    setName: () => {}, commandLine: { appendSwitch: () => {} },
    getPath: () => folder, setPath: (key, value) => { calls[key] = value; },
    requestSingleInstanceLock: () => lock, quit: () => { calls.quit++; },
    whenReady: () => Promise.resolve(), getVersion: () => "0.2.0",
  });
  class Window extends EventEmitter {
    constructor(options) { super(); this.options = options; calls.windows.push(this); this.webContents = Object.assign(new EventEmitter(), { setWindowOpenHandler: (fn) => { this.openHandler = fn; } }); }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    show() { this.shown = true; } isMinimized() { return true; }
    restore() { this.restored = true; } focus() { this.focused = true; }
    static getAllWindows() { return calls.windows; }
  }
  const session = Object.assign(new EventEmitter(), {
    setPermissionRequestHandler: (fn) => { calls.permissionRequest = fn; },
    setPermissionCheckHandler: (fn) => { calls.permissionCheck = fn; },
  });
  const electron = { app, BrowserWindow: Window, session: { defaultSession: session },
    protocol: { registerSchemesAsPrivileged: (rules) => { calls.rules = rules; }, handle: (_scheme, fn) => { calls.handler = fn; } },
    Menu: { buildFromTemplate: (template) => template, setApplicationMenu: () => {} },
    dialog: { showMessageBoxSync: () => calls.choice, showErrorBox: () => {}, showMessageBox: () => {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"main.cjs"),"utf8"), {
    require: (name) => name === "electron" ? electron : require(name),
    __dirname: folder, Response,
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { app, session, calls, folder };
}

test("desktop startup uses a persistent app profile and sandboxed local window", async () => {
  const { calls, folder } = await boot();
  assert.equal(calls.userData, path.join(folder,"Midad"));
  assert.equal(calls.windows.length,1);
  assert.equal(calls.windows[0].options.webPreferences.sandbox,true);
  assert.equal(calls.windows[0].url,"midad://app/index.html");
  assert.equal(calls.rules[0].privileges.standard,true);
  calls.windows[0].emit("ready-to-show");assert.equal(calls.windows[0].shown,true);
  const page = await calls.handler({url:"midad://app/index.html",method:"GET"});
  assert.equal(page.status,200);assert.equal(await page.text(),"<h1>Midad</h1>");
  assert.ok(page.headers.get("Content-Security-Policy").includes("script-src 'self'"));
  assert.equal((await calls.handler({url:"file:///etc/passwd",method:"GET"})).status,404);
});
test("new windows and remote navigation are blocked and permissions denied", async () => {
  const { calls } = await boot();const win=calls.windows[0];
  assert.equal(win.openHandler().action,"deny");
  let blocked=false;win.webContents.emit("will-navigate",{preventDefault(){blocked=true;}},"https://example.com");assert.equal(blocked,true);
  assert.equal(calls.permissionCheck(),false);
  let allowed=true;calls.permissionRequest(null,"camera",(result)=>{allowed=result;});assert.equal(allowed,false);
});
test("unsaved close defaults to staying and requires an explicit discard choice", async () => {
  const { calls }=await boot();const win=calls.windows[0];let discarded=false;
  win.webContents.emit("will-prevent-unload",{preventDefault(){discarded=true;}});assert.equal(discarded,false);
  calls.choice=1;win.webContents.emit("will-prevent-unload",{preventDefault(){discarded=true;}});assert.equal(discarded,true);
});
test("second launch focuses the existing instance and a rejected lock quits", async () => {
  const {calls,app}=await boot();app.emit("second-instance");assert.equal(calls.windows[0].focused,true);
  const other=await boot(false);assert.equal(other.calls.quit,1);assert.equal(other.calls.windows.length,0);
});
