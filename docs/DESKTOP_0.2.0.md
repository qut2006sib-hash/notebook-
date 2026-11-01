# Midad Desktop 0.2.0 — Ubuntu

This is the desktop application requested after the browser edition. It opens its own Electron window and installs an application-menu entry. No Python, npm, browser tab, or terminal launcher is needed after installation.

## Install and open

```bash
cd ~/Downloads
sudo apt install ./Midad-Desktop-0.2.0-amd64.deb
```

Open **Midad Desktop** / **مداد سطح المكتب** from the application menu. Do not run the application with sudo.

The installer bundles Electron 45.1.0 and the compiled UI. Native runtime libraries are declared as package dependencies. Its installed program is under `/opt/midad`; the menu entry has `Terminal=false`.

## Data and transfer

The desktop version uses its own persistent application profile, normally `~/.config/Midad` (or the XDG configuration directory). It does not read Firefox/Chrome storage automatically.

To transfer existing notes, export a JSON backup from the previous browser edition, open Desktop, choose **استعادة نسخة**, inspect the counts, and confirm. Regular JSON backups remain recommended. Application upgrades/removal do not contain a script that deletes the user's profile.

## Desktop behavior

- Local standard/secure `midad://app` protocol for bundled assets and persistent IndexedDB.
- Sandboxed renderer, context isolation, no Node integration and no renderer IPC.
- No local HTTP server.
- Native file chooser and save dialog for JSON/Markdown.
- Single instance: reopening focuses the existing window.
- Unsaved-close confirmation defaults to staying.
- Native edit/zoom/fullscreen menus.

The existing transactional storage, restore/rollback, reference, date and editing fixes remain in place.

## Validation and limits

Compilation, lint, all 290 tests (193 script + 59 scaffold + 30 notebook + 8 desktop-shell), and local build passed. Desktop-shell tests execute startup with mocked native Electron objects; they do not display a real native window.

The .deb was extracted and checked for matching sources, native entry, executable runtime, dependencies present in this environment, and sandbox-helper permissions. A real Ubuntu GUI installation, window display, native chooser and suspend/resume must still be accepted on the user's laptop. No APK was produced.

Rebuild with Node.js 24, `npm ci --ignore-scripts`, `node node_modules/electron/install.js`, then `npm run package:desktop`. Output is in `release/`.
