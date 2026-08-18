import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // d3 is used by both recharts and react-globe.gl, so it gets its own chunk.
          // d3's external deps (internmap, delaunator, robust-predicates) must stay
          // with it, otherwise the chunk graph becomes circular.
          if (id.includes("node_modules/d3") || id.includes("node_modules/internmap") || id.includes("node_modules/delaunator") || id.includes("node_modules/robust-predicates")) return "d3";
          if (id.includes("node_modules/react-globe.gl") || id.includes("node_modules/globe.gl") || id.includes("node_modules/three")) return "globe";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet") || id.includes("node_modules/@react-leaflet")) return "map";
          if (id.includes("node_modules/xlsx") || id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) return "excel-pdf";
          if (id.includes("node_modules/html5-qrcode") || id.includes("node_modules/qrcode") || id.includes("node_modules/qrcode.react")) return "qr";
          return "vendor";
        },
      },
    },
  },
});
