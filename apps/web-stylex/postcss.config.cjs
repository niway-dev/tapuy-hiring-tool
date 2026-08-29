const path = require("node:path");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"],
      /* fast-glob's `ignore` never matches a "../../…" relative include
         pattern — confirmed by reproduction, not assumption. The exclude
         globs must be absolute (or repo-root-relative without "..") to
         actually apply to files reached through the cross-package include. */
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        path.resolve(__dirname, "**/*.test.{ts,tsx}"),
        path.resolve(__dirname, "../../packages/*/src/**/*.test.{ts,tsx}"),
      ],
      babelConfig: {
        babelrc: false,
        presets: [["@babel/preset-typescript"]],
        plugins: [
          "@babel/plugin-syntax-jsx",
          [
            "@stylexjs/babel-plugin",
            {
              dev: process.env.NODE_ENV !== "production",
              runtimeInjection: false,
              unstable_moduleResolution: {
                type: "commonJS",
                rootDir: path.resolve(__dirname, "../.."),
              },
            },
          ],
        ],
      },
    },
  },
};
