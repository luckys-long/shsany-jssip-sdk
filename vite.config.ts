import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  server: {
    port: 3003,
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
      entry: resolve(__dirname, "src/index.ts"),
      name: "ShsanyJSSipSDK",
      fileName: (format) => `shsany-jssip-sdk.${format}.js`, // 修改：按格式生成文件名
      formats: ["es", "umd"], // 明确指定输出格式
    },
    rollupOptions: {
      external: ["jssip", "uuid"], // 外部化依赖
      output: {
        globals: {
          jssip: "JSSIP", // 为UMD格式提供全局变量名
          uuid: "uuid",
        },
      },
    },
  },
});
