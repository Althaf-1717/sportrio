import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import app from "./server/app.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "api-backend",
      configureServer(server) {
        server.middlewares.use(app);
      },
    },
  ],
  server: { allowedHosts: ["terminal.local"] },
});
