export function windowsConfig(version, electronVersion) {
  return {
    appId: "org.midad.notebook",
    productName: "Midad",
    electronVersion,
    directories: { app: `release/midad-windows-${version}-app`, output: "release/windows" },
    // The renderer is bundled; including root node_modules would ship Linux
    // native modules and unused server/development dependencies.
    files: ["**/*", "!node_modules/**/*"],
    asar: false,
    npmRebuild: false,
    publish: null,
    win: {
      target: [{ target: "nsis", arch: ["x64"] }, { target: "zip", arch: ["x64"] }],
      executableName: "Midad",
      icon: "desktop-shell/icon.ico",
      signExecutable: false,
      artifactName: `Midad-Desktop-${version}-Windows-x64.${"${ext}"}`,
    },
    nsis: {
      artifactName: `Midad-Desktop-${version}-Windows-x64-Setup.exe`,
      oneClick: false,
      perMachine: false,
      allowElevation: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: "Midad",
      deleteAppDataOnUninstall: false,
      runAfterFinish: false,
    },
  };
}
