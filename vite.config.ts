import preact from "@preact/preset-vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: [preact()],
  resolve: {
    alias: {
      "react-dom/client": "preact/compat/client",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
    },
  },
});
