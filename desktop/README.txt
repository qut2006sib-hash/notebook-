مداد — Midad 0.1.0 — Ubuntu local browser edition

Requirements: Python 3.10+ and a current Firefox/Chromium browser.
No Node.js, npm, account, cloud service, or GPU is needed to run this package.

1. Extract the complete archive.
2. Open a terminal in this folder and run:
   bash start.sh
3. Your browser opens http://127.0.0.1:8765/
   If it does not, paste that address into your usual browser.
4. Keep the terminal open. Stop the server using Ctrl+C after notes say محفوظ.

Optional application-menu installation, without sudo:
   python3 install.py
Then open Midad — مداد from your application menu. It starts a terminal and browser.

Your notes are in IndexedDB in YOUR BROWSER PROFILE for http://127.0.0.1:8765/.
Always use that exact address and the same browser profile. Do not use private mode.
Deleting browser site data deletes notes. Back up regularly with نسخة أمان.
Moving or updating this app folder does not move notes to a different browser.
To transfer notes between browsers/computers, export a full JSON backup and restore it.

If you already used the online/preview app, export its backup there first, then
restore it in the local app. Different addresses have separate browser storage.

Restore shows notebook/page counts before replacement and preserves one rollback
snapshot. الرجوع إلى ما قبل الاستعادة swaps the current and previous snapshots.
Deletion undo covers one action until the next content edit or reload; it is not a permanent trash.
If another tab saved first, this tab stops writing and offers export/reload.

All bundled fonts, scripts, styles, math, and demo images are local. The application
does not synchronize or call an AI provider. External images explicitly included
in an imported backup may still require the network. This is not an Android APK.

To uninstall the optional menu install, close the app and remove only:
  ~/.local/share/applications/midad.desktop
  ~/.local/share/midad
Browser notes are separate and remain until you explicitly remove site data.
