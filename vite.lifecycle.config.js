import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: ".", // 输出到根目录（lifecycle.js 放在根目录，与 manifest 同级）
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/lifecycle.ts"),
      formats: ["es"],
      fileName: () => "lifecycle.js",
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
