import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Shared HOL registry proxy — must match `npm run registry:proxy` (default :8788) */
const registryProxy = {
  "/api/registry": {
    target: "http://127.0.0.1:8788",
    changeOrigin: true,
    configure(proxy) {
      proxy.on("error", (_err, _req, res) => {
        if (res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
          res.end(
            JSON.stringify({
              error: "registry_proxy_unreachable",
              message:
                "Start the registry UI proxy: npm run registry:proxy (from repo root)"
            })
          );
        }
      });
    }
  }
};

/** Volatility API proxy — routes to backend keeper (:3000) */
const volatilityProxy = {
  "/api/volatility": {
    target: "http://127.0.0.1:3000",
    changeOrigin: true
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { ...registryProxy, ...volatilityProxy }
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
    proxy: { ...registryProxy, ...volatilityProxy }
  }
});
