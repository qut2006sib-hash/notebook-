import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Browser-only build: no server, account, or cloud service required. */
export default defineConfig({
  base: "./",
  resolve: { tsconfigPaths: true },
  server: { allowedHosts: ["terminal.local"] },
  plugins: [tailwindcss(), react()],
  build: { outDir: "dist-local", emptyOutDir: true },
});
