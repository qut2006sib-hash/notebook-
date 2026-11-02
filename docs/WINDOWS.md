# مداد — Windows / Midad for Windows

One x64 application package targets Windows 10, Windows 11 Home and Windows 11 Pro on Intel/AMD computers. ARM64 and 32-bit Windows are not targets of this release. Pro does not require a separate app build.

## Installation / التثبيت

Download `Midad-Desktop-0.3.1-Windows-x64-Setup.exe`, open it and follow the wizard. It installs for the current Windows user, without requesting administrator rights. Open **Midad** from the Start menu or desktop shortcut. No Node.js, Python, Docker, browser or internet connection is needed to use it.

نزّل ملف Setup.exe وافتحه واتبع خطوات التثبيت، ثم افتح مداد من قائمة ابدأ أو اختصار سطح المكتب. لا تحتاج تشغيل أوامر أو تثبيت Python أو Node.js. يعمل التطبيق محليًا دون إنترنت.

The executable is unsigned. Windows may show an unknown-publisher/SmartScreen notice. The SHA-256 companion file checks file integrity; it does not certify publisher identity. Do not disable Windows security to install it. Midad's version is shown in the app's About menu and installed-app entry.

## ZIP version / نسخة ZIP

Extract **all** of `Midad-Desktop-0.3.1-Windows-x64.zip` to a folder, then open `Midad.exe`. Keep its DLLs and `resources` directory together. This avoids installation, but saves notes under the Windows user profile, not beside the EXE or on a USB drive. Setup and ZIP share the same notes when run under the same Windows account.

فك ضغط ZIP بالكامل ثم افتح Midad.exe. لا تنقل ملف EXE وحده. الملاحظات تُحفظ ضمن حساب ويندوز، وليست داخل مجلد ZIP.

## Notes, backup and transfer / حفظ الملاحظات ونقلها

Notes save automatically after edits. Wait until the app shows **محفوظ** before closing. New pages start with a blank title and no blocks. Add paragraphs, headings, images, equations or code yourself. Open **إدارة العناصر** to move or delete a block.

Windows profile: `%APPDATA%\Midad`. The origin stays `midad://app` and snapshot format stays version 1. Reinstalling/upgrading with Setup retains this profile; uninstall is configured to retain it too. Keep an independent JSON backup before changing computers or uninstalling.

To transfer from Ubuntu or browser Midad:

1. In the source app, choose **نسخة أمان** and save the complete JSON file.
2. Transfer it to Windows.
3. In Windows Midad, choose **استعادة نسخة**, inspect the counts and confirm replacement. Restore replaces the target workspace; it does not merge notebooks.
4. Check old notes, pictures, equations and code, then wait for **محفوظ**.
5. Close and reopen, and continue editing. Keep the external backup.

لنقل بياناتك من أوبونتو: نزّل «نسخة أمان» JSON، وانقلها إلى ويندوز، ثم اختر «استعادة نسخة» وراجع الأعداد قبل تأكيد استبدال بيانات النسخة المستهدفة. لا توجد مزامنة تلقائية بين الأجهزة.

## Verification / فحص النسخة

In PowerShell, from the download folder:

```powershell
Get-FileHash .\Midad-Desktop-0.3.1-Windows-x64-Setup.exe -Algorithm SHA256
Get-Content .\Midad-Desktop-0.3.1-Windows-x64-Setup.exe.sha256
```

The hash must match. Use the corresponding ZIP filenames to check the ZIP instead.

On EACH target OS (Windows 10, Windows 11 Home, Windows 11 Pro), use disposable notes and an ordinary user account:

- Install, launch from Start, verify About shows 0.3.1, and confirm a blank workspace.
- Add an Arabic/English paragraph, custom-language code, equation and image; wait for **محفوظ**.
- Close/reopen, verify every item and edit it again. Confirm copy/paste and block movement/deletion work.
- Export JSON; restore it in a disposable workspace; compare every item and reopen again.
- Disconnect internet and repeat editing/save/reopen.
- Launch a second instance; it must focus the existing window.
- With a verified backup, uninstall/reinstall and confirm notes survive. Repeat when upgrading a later Windows version.
- For ZIP: extract the entire archive to a path with spaces/non-Latin characters; launch `Midad.exe` and repeat save/reopen.

Packaging and automated tests on Linux do not prove these Windows runtime checks. Record them separately; until then, this is a Windows candidate build.

## Developer build

Node.js 24, from the repository root:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run package:windows
```

The command downloads the Windows Electron runtime and NSIS build tools, and creates an offline installer, ZIP and SHA-256 files in `release/windows/`. It does not publish releases or change the Ubuntu package. Source provenance is recorded in `resources/app/build-info.json`; commit source changes before the final build so `dirty` is false.
