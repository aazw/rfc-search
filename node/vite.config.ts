import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // https://zenn.dev/onozaty/articles/docker-desktop-portforward-not-working
  server: {
    host: "127.0.0.1",
  },

  // https://zenn.dev/kanakanho/articles/3a8b313e698b7f
  base: process.env.GITHUB_PAGES ? "rfc-search" : "./",
});
