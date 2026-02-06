import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { redwood } from "rwsdk/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Tailwind CSS v4 plugin (CSS-first configuration)
    tailwindcss(),

    // RedwoodSDK plugin - handles React, Cloudflare, and RSC integration
    // This automatically includes React and Cloudflare plugins
    redwood(),
  ],

  // Path alias resolution (matches tsconfig.json)
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  // Define global constants available in the app
  define: {
    // Build-time constants for /health endpoint
    // ⚠️  These placeholder constants (__BUILD_TIME__, __GIT_SHA__) are automatically
    //     populated during build. DO NOT manually edit the constant names.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA || "unknown"),
  },
});
