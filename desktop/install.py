#!/usr/bin/env python3
"""Optional per-user Ubuntu application-menu installation; no sudo."""
import pathlib
import shutil

source = pathlib.Path(__file__).resolve().parent
destination = pathlib.Path.home() / ".local/share/midad"
if source != destination:
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source / "app", destination / "app", dirs_exist_ok=True)
    for name in ("serve.py", "start.sh", "README.txt", "THIRD-PARTY-NOTICES.txt"):
        shutil.copy2(source / name, destination / name)
applications = pathlib.Path.home() / ".local/share/applications"
applications.mkdir(parents=True, exist_ok=True)
script = str(destination / "serve.py").replace("\\", "\\\\").replace('"', '\\"').replace("`", "\\`").replace("$", "\\$")
(applications / "midad.desktop").write_text(
    '[Desktop Entry]\nType=Application\nName=Midad — مداد\nComment=Personal study notebook\n'
    f'Exec=python3 "{script}"\nTerminal=true\nIcon=accessories-text-editor\nCategories=Education;Office;\n',
    encoding="utf-8",
)
print("Installed. Open Midad — مداد from your application menu. No sudo required.")
