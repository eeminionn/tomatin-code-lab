import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  base: "/tomatin-code-lab/beta/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../dist-beta", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          data: ["@supabase/supabase-js", "@tanstack/react-query"],
          editor: ["@monaco-editor/react", "monaco-editor"],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
});
