const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ignore iOS/macOS framework files (fixes ENOENT on Windows)
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /.*\.xcframework\/.*/,
];

const uniwindConfig = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;