import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { CodeInspectorPlugin } from "@rdservices/aime-code-inspector";

export default defineConfig({
  base: './',
  plugins: [
    CodeInspectorPlugin({
      bundler: "vite",
    }),
    react(),
    // IMPORTANT: DO NOT REMOVE THIS!
  ],
  server: {
    host: "0.0.0.0",
    port: 5174,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
