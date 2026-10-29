const { app, BrowserWindow, protocol, session, Menu, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { mkdirSync } = require("node:fs");
const { CSP, appFile, isAppUrl, windowOptions } = require("./policy.cjs");

app.setName("Midad");
app.commandLine.appendSwitch("class", "Midad");
const profile = path.join(app.getPath("appData"), "Midad");
mkdirSync(profile, { recursive: true });
app.setPath("userData", profile);
protocol.registerSchemesAsPrivileged([{ scheme: "midad", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

let window;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) { if (window.isMinimized()) window.restore(); window.focus(); }
  });
  app.whenReady().then(async () => {
    const root = path.join(__dirname, "web");
    const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json" };
    protocol.handle("midad", async (request) => {
      const file = appFile(root, request.url);
      if (!file || request.method !== "GET") return new Response("Not found", { status: 404 });
      try {
        const real = await fs.realpath(file);
        const relative = path.relative(root, real);
        if (relative.startsWith("..") || path.isAbsolute(relative)) return new Response("Not found", { status: 404 });
        const body = await fs.readFile(real);
        return new Response(body, { headers: { "Content-Type": mime[path.extname(real)] || "application/octet-stream", "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff" } });
      } catch { return new Response("Not found", { status: 404 }); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on("will-download", (_event, item) => {
      item.setSaveDialogOptions({ title: "حفظ نسخة من مداد", defaultPath: path.join(app.getPath("downloads"), path.basename(item.getFilename())), properties: ["showOverwriteConfirmation"] });
      item.once("done", (_event, state) => {
        if (state === "interrupted") dialog.showErrorBox("تعذر حفظ الملف", "حاول تنزيل النسخة مرة أخرى إلى مجلد متاح للكتابة.");
      });
    });
    const createWindow = () => {
      window = new BrowserWindow(windowOptions(path.join(__dirname, "icon.png")));
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event, url) => { if (!isAppUrl(url)) event.preventDefault(); });
      window.webContents.on("will-prevent-unload", (event) => {
        const choice = dialog.showMessageBoxSync(window, { type: "warning", title: "تعديلات لم تُحفظ", message: "توجد تعديلات لم يكتمل حفظها.", detail: "ابقَ في مداد للحفظ أو تنزيل نسخة قبل الإغلاق.", buttons: ["البقاء", "إغلاق دون حفظ"], defaultId: 0, cancelId: 0, noLink: true });
        if (choice === 1) event.preventDefault();
      });
      window.once("ready-to-show", () => window.show());
      window.on("closed", () => { window = null; });
      void window.loadURL("midad://app/index.html").catch((error) => { dialog.showErrorBox("تعذر فتح مداد", error.message); app.quit(); });
    };
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: "مداد", submenu: [{ label: "حول مداد", click: () => dialog.showMessageBox(window, { title: "مداد", message: `مداد ${app.getVersion()}`, detail: "دفتر دراسة شخصي يعمل محلياً.\nللنقل من المتصفح: صدّر نسخة JSON ثم استعدها هنا.\nالبيانات: " + profile }) }, { type: "separator" }, { role: "quit", label: "خروج" }] },
      { label: "تحرير", submenu: [{ role: "undo", label: "تراجع" }, { role: "redo", label: "إعادة" }, { type: "separator" }, { role: "cut", label: "قص" }, { role: "copy", label: "نسخ" }, { role: "paste", label: "لصق" }, { role: "selectAll", label: "تحديد الكل" }] },
      { label: "عرض", submenu: [{ role: "resetZoom", label: "الحجم الأصلي" }, { role: "zoomIn", label: "تكبير" }, { role: "zoomOut", label: "تصغير" }, { role: "togglefullscreen", label: "ملء الشاشة" }] },
    ]));
    createWindow();
    app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  }).catch((error) => { dialog.showErrorBox("تعذر تشغيل مداد", error.message); app.quit(); });
  app.on("window-all-closed", () => { app.quit(); });
}
