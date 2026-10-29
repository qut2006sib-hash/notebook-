import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const destination = resolve("release/Midad-0.1.0-Ubuntu");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync("desktop", destination, { recursive: true });
cpSync("dist-local", `${destination}/app`, { recursive: true });
const runtimePackages = ["react", "react-dom", "scheduler", "use-sync-external-store", "zustand", "zod", "katex", "lucide-react", "@fontsource/ibm-plex-mono", "@fontsource/ibm-plex-sans-arabic"];
writeFileSync(`${destination}/THIRD-PARTY-NOTICES.txt`, runtimePackages.map((name) => {
  const metadata = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8"));
  return `${name} ${metadata.version}\n${readFileSync(`node_modules/${name}/LICENSE`, "utf8")}\n`;
}).join("\n\n"));
const archive = resolve("release/Midad-0.1.0-Ubuntu.tar.gz");
execFileSync("tar", ["-czf", archive, "-C", "release", "Midad-0.1.0-Ubuntu"]);
const sha = createHash("sha256").update(readFileSync(archive)).digest("hex");
writeFileSync(`${archive}.sha256`, `${sha}  Midad-0.1.0-Ubuntu.tar.gz\n`);
console.log(JSON.stringify({ archive, sha256: sha }));
