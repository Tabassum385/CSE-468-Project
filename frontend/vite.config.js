import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "CSE-468-Project"
      base: process.env.CSE-468-Project || "/https://github.com/Tabassum385/CSE-468-Project/edit/master/frontend/vite.config.js"
    }
  }
});
