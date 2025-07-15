import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
export default defineConfig({
  server:{
    port: 3003
  },

  plugins: [
    dts({
      outDir: "dist/types",
      insertTypesEntry: true, // 生成类型文件入口
      entryRoot: "./src",
    }),
  ],
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "ShsanyCall",
      fileName: "ShsanyCall",
    },
  },
});
