import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
    plugins: [wasm(), topLevelAwait(), sveltekit()],
    server: {
        fs: {
            allow: [".."],
        },
    },
    optimizeDeps: {
        exclude: ["@dojoengine/torii-wasm"],
    },
});
