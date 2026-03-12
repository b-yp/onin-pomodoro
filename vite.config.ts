import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    cors: true,
  },
  plugins: [svelte()],
  base: "./",
});
