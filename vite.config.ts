import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
export default defineConfig({
  plugins: [
    dts({
      outDir: "dist",
      insertTypesEntry: true, // 生成类型文件入口
      entryRoot: "./src",

    }),
  ],
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "index",
      fileName: "index",
    },
  },
});
