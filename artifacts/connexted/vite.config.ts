import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT and BASE_PATH are only needed for the dev server (vite dev / Replit).
// During a production build (vite build on Vercel) these are not used,
// so we fall back to safe defaults instead of throwing.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

// Strip "use client" directives — these are Next.js-only; Vite treats them as
// unknown directives and can't resolve sourcemaps for the affected lines.
const stripUseClient = {
  name: 'strip-use-client',
  transform(code: string, id: string) {
    if (id.includes('/components/ui/') && code.startsWith('"use client"')) {
      return { code: code.replace(/^"use client";\n?/, ''), map: null };
    }
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    stripUseClient,
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    // Allow any host in Replit (uses random subdomains); restrict elsewhere
    allowedHosts: process.env.REPL_ID ? true : ['localhost', '127.0.0.1'],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: process.env.REPL_ID ? true : ['localhost', '127.0.0.1'],
  },
});
