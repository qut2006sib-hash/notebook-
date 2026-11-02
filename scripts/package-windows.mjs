import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { build, Platform, Arch } from "electron-builder";
import { windowsConfig } from "../desktop-shell/windows-config.mjs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const electronVersion = lock.packages["node_modules/electron"].version;
const config = windowsConfig(version, electronVersion);
const output = resolve(config.directories.output);
rmSync(output, { recursive: true, force: true });
const stage = resolve(config.directories.app);
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const file of ["main.cjs", "policy.cjs", "icon.png"]) cpSync(`desktop-shell/${file}`, join(stage, file));
cpSync("dist-local", join(stage, "web"), { recursive: true });
cpSync("docs/WINDOWS.md", join(stage, "README-Windows.md"));
writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "midad-desktop", productName: "Midad", description: "Midad personal study notebook", author: "Midad Project", version, main: "main.cjs" }, null, 2));
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const dirty = Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim());
writeFileSync(join(stage, "build-info.json"), JSON.stringify({ version, electronVersion, sourceCommit, dirty, platform: "win32", arch: "x64", appId: config.appId, profile: "%APPDATA%\\Midad", origin: "midad://app", snapshotVersion: 1 }, null, 2));
const packages = ["react", "react-dom", "scheduler", "use-sync-external-store", "zustand", "zod", "katex", "lucide-react", "@fontsource/ibm-plex-mono", "@fontsource/ibm-plex-sans-arabic"];
writeFileSync(join(stage, "THIRD-PARTY-NOTICES.txt"), packages.map((name) => `${name}\n${readFileSync(`node_modules/${name}/LICENSE`, "utf8")}\n`).join("\n"));

// Never publish from this packaging command. NSIS includes its full payload.
await build({ targets: Platform.WINDOWS.createTarget(["nsis", "zip"], Arch.x64), config, publish: "never" });
const packagedApp = join(output, "win-unpacked/resources/app");
if (existsSync(join(packagedApp, "node_modules"))) throw new Error("Unexpected unbundled dependencies in Windows package");
const exe = readFileSync(join(output, "win-unpacked/Midad.exe"));
const pe = exe.readUInt32LE(0x3c);
if (exe.toString("ascii", 0, 2) !== "MZ" || exe.toString("ascii", pe, pe + 4) !== "PE\0\0" || exe.readUInt16LE(pe + 4) !== 0x8664) throw new Error("Windows executable is not x64 PE");
for (const file of ["main.cjs", "policy.cjs"]) {
  if (!readFileSync(join(packagedApp, file)).equals(readFileSync(`desktop-shell/${file}`))) throw new Error(`Packaged ${file} differs from source`);
}
if (JSON.parse(readFileSync(join(packagedApp, "package.json"), "utf8")).version !== version) throw new Error("Packaged version mismatch");
for (const name of readdirSync(output).filter((name) => name.startsWith(`Midad-Desktop-${version}-`) && /\.(exe|zip)$/.test(name))) {
  const file = join(output, name);
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  writeFileSync(`${file}.sha256`, `${sha256}  ${name}\n`);
  console.log(JSON.stringify({ file, bytes: statSync(file).size, sha256 }));
}
