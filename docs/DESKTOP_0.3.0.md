# Midad Desktop 0.3.0 — free composition

Requested changes: remove the floating block toolbar while typing, start new notes without a forced template, choose blocks manually, and preserve/reopen existing data.

## Behavior

- The app opens to a quiet home screen. Saved notes remain in the sidebar/recent list.
- First use installs no demo content. A page or concept starts with an empty title and zero blocks.
- Paragraph, heading, image, equation, code, table, callout and question blocks are added explicitly.
- Code language is editable, including languages outside the suggestions.
- The floating toolbar was removed. Move/delete actions are available only after explicitly opening “إدارة العناصر” beneath the page.
- Metadata and relationships/export are collapsed by default.
- Existing notes and pre-existing templates are preserved; the update does not clear them.

## Persistence and upgrade

Package name remains `midad-desktop`, profile remains `Midad`, and origin remains `midad://app`. Snapshot version remains 1. Upgrade 0.2.0 with apt; do not delete the profile.

Export a JSON backup from the installed version before upgrading, close the app, then:

```bash
cd ~/Downloads
sudo apt install ./Midad-Desktop-0.3.0-amd64.deb
```

Open **Midad Desktop / مداد سطح المكتب**. Existing notes can be reopened and edited. Cross-computer transfer uses JSON export/confirmed restore with rollback.

## Verification

Typecheck, lint and all 294 tests passed: 193 script, 59 scaffold, 34 notebook, 8 desktop shell. Four new notebook tests cover first use, blank lesson/concept creation, non-destructive loading of older data, and free-composed notes through save/reopen/JSON restore/further editing.

Browser checks confirmed blank first use/page, no move/delete overlay while typing, explicitly opened management controls, custom code language, equation rendering, and reopening saved content.

The native .deb was built and extracted; version, app sources/profile, bundled UI, sandbox helper permissions and Debian upgrade ordering were checked. Actual native-window GUI acceptance remains on the user's laptop. Test/demo browser content is not bundled.
