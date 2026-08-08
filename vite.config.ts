import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy /go-api/* → http://localhost:8080/v1/* during local dev.
      // This avoids browser CORS errors when calling the Go service.
      // In production, VITE_BACKEND_API is set to the real Go service base URL
      // (e.g. https://api.inlane.in/v1) so the proxy is not used.
      "/go-api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/go-api/, "/v1"),
      },
    },
  },
});
