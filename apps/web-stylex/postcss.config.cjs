const path = require("node:path");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: ["src/**/*.{ts,tsx}", "../../packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.{ts,tsx}"],
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
