import { defineConfig } from "astro/config";
import tailwind from "@tailwindcss/vite";
import rehypeSlug from "rehype-slug";

export default defineConfig({
  output: "static",
  markdown: {
    rehypePlugins: [rehypeSlug]
  },
  vite: {
    plugins: [tailwind()]
  }
});
